/* global Chart, jspdf, XLSX */

(() => {
    const { jsPDF } = window.jspdf || {};

    // --- CORE CONSTANTS ----------------------------------------------------

    const INR_PER_USD = 89.5; // Approximate late 2025 rate, for display only

    const PROGRAM_META = {
        frontline: { label: "Frontline (3 months)", months: 3 },
        intermediate: { label: "Intermediate (12 months)", months: 12 },
        advanced: { label: "Advanced (24 months)", months: 24 }
    };

    // Mixed logit and latent class coefficient structures.
    // IMPORTANT: replace these default values with the final estimates from the DCE.
    const PREFERENCE_MODELS = {
        mxl: {
            key: "mxl",
            label: "Average mixed logit",
            // Approximate structure; values are placeholders to be replaced.
            asc_optout: -0.60,
            beta: {
                intermediate: 0.20,
                advanced: 0.50,
                uniqual: 0.25,
                career_path: 0.30,
                mentor_medium: 0.40,
                mentor_high: 0.70,
                inperson: -0.10,
                online: -0.90,
                resp15: 0.45,
                resp7: 0.55
            },
            beta_cost: -0.005 // per 1,000 INR per trainee per month
        },
        lc2: {
            key: "lc2",
            label: "Supportive latent class",
            // Structure ready for final Class 2 parameters.
            asc_optout: -2.50,
            beta: {
                intermediate: 0.25,
                advanced: 0.80,
                uniqual: 0.35,
                career_path: 0.55,
                mentor_medium: 0.85,
                mentor_high: 1.25,
                inperson: 0.00,
                online: -0.60,
                resp15: 0.80,
                resp7: 1.10
            },
            beta_cost: -0.002 // per 1,000 INR per trainee per month
        }
    };

    // WTP values in INR per trainee per month for each attribute level, relative to baseline.
    // Replace with final WTP values from the empirical analysis for production use.
    const WTP_TABLE = {
        mxl: {
            intermediate: 47000,
            advanced: 104000,
            uniqual: 40000,
            career_path: 60000,
            mentor_medium: 97000,
            mentor_high: 137000,
            inperson: -50000,
            online: -230000,
            resp15: 117000,
            resp7: 130000
        },
        lc2: {
            intermediate: 65000,
            advanced: 210000,
            uniqual: 80000,
            career_path: 120000,
            mentor_medium: 140000,
            mentor_high: 220000,
            inperson: 0,
            online: -150000,
            resp15: 150000,
            resp7: 210000
        }
    };

    // Epidemiological multipliers and valuations (stylised, adjustable)
    const EPI_MULTIPLIERS = {
        frontline: {
            gradsPerCohort: 0.9,               // fraction of trainees who complete
            outbreaksPerCohortPerYear: 2,      // investigations supported per cohort
            valuePerGraduate: 200000,          // INR
            valuePerOutbreak: 3000000          // INR
        },
        intermediate: {
            gradsPerCohort: 0.9,
            outbreaksPerCohortPerYear: 3,
            valuePerGraduate: 250000,
            valuePerOutbreak: 3500000
        },
        advanced: {
            gradsPerCohort: 0.95,
            outbreaksPerCohortPerYear: 5,
            valuePerGraduate: 400000,
            valuePerOutbreak: 4000000
        }
    };

    // Cost templates: all figures in INR, as provided.
    // Frontline: WHO only
    const COST_TEMPLATES = {
        frontline: {
            WHO: {
                label: "Frontline – WHO template (6 cohorts)",
                source: "WHO",
                total: 104482758,
                components: [
                    { key: "In-country programme staff (salary and benefits)", amount: 10694704 },
                    { key: "Office equipment (staff/faculty)", amount: 200000 },
                    { key: "Office software (staff/faculty)", amount: 20000 },
                    { key: "Rent and utilities (staff/faculty)", amount: 1200000 },
                    { key: "Training materials", amount: 30000 },
                    { key: "Workshops and seminars", amount: 5340700 },
                    { key: "In country travel", amount: 32462500 },
                    { key: "Management and oversight", amount: 7821360 },
                    { key: "Office maintenance", amount: 480000 },
                    { key: "In kind salary (trainers and support staff)", amount: 2494704 },
                    { key: "Facility upgrades", amount: 400000 },
                    { key: "Equipment depreciation", amount: 200000 },
                    { key: "Shared utilities and services", amount: 1000000 },
                    { key: "Staff development (non trainees)", amount: 100000 },
                    { key: "Opportunity cost of trainee time", amount: 42038790, isOpportunity: true }
                ]
            }
        },
        intermediate: {
            WHO: {
                label: "Intermediate – WHO template",
                source: "WHO",
                total: 70300369,
                components: [
                    { key: "In-country programme staff (salary and benefits)", amount: 6571500 },
                    { key: "Office equipment (staff/faculty)", amount: 200000 },
                    { key: "Office software (staff/faculty)", amount: 20000 },
                    { key: "Rent and utilities (staff/faculty)", amount: 600000 },
                    { key: "Training materials", amount: 45000 },
                    { key: "Workshops and seminars", amount: 2280000 },
                    { key: "In country travel", amount: 11758000 },
                    { key: "Other direct costs", amount: 34782000 },
                    { key: "Management and oversight", amount: 4396344 },
                    { key: "Office maintenance", amount: 240000 },
                    { key: "In kind salary (trainers and support staff)", amount: 2500000 },
                    { key: "Facility upgrades", amount: 500000 },
                    { key: "Equipment depreciation", amount: 100000 },
                    { key: "Shared utilities and services", amount: 500000 },
                    { key: "Staff development (non trainees)", amount: 100000 },
                    { key: "Opportunity cost of trainee time", amount: 5707525, isOpportunity: true }
                ]
            },
            NIE: {
                label: "Intermediate – NIE template",
                source: "NIE",
                total: 208739950,
                components: [
                    { key: "In-country programme staff (salary and benefits)", amount: 18180000 },
                    { key: "Office equipment (staff/faculty)", amount: 1520000 },
                    { key: "Office software (staff/faculty)", amount: 7110000 },
                    { key: "Rent and utilities (staff/faculty)", amount: 3995000 },
                    { key: "Workshops and seminars", amount: 4119950 },
                    { key: "In country travel", amount: 138998875 },
                    { key: "International travel", amount: 34816125 }
                ]
            },
            NCDC: {
                label: "Intermediate – NCDC template",
                source: "NCDC",
                total: 9000000,
                components: [
                    { key: "Other programme staff (consultants, advisors)", amount: 100000 },
                    { key: "Office software (staff/faculty)", amount: 100000 },
                    { key: "Training materials", amount: 100000 },
                    { key: "Workshops and seminars", amount: 500000 },
                    { key: "In country travel", amount: 2000000 },
                    { key: "Other direct costs", amount: 100000 },
                    { key: "Management and oversight", amount: 6000000 },
                    { key: "Staff development (non trainees)", amount: 100000 }
                ]
            }
        },
        advanced: {
            NIE: {
                label: "Advanced – NIE template",
                source: "NIE",
                total: 254539700,
                components: [
                    { key: "In-country programme staff (salary and benefits)", amount: 15660000 },
                    { key: "Office equipment (staff/faculty)", amount: 1020000 },
                    { key: "Office software (staff/faculty)", amount: 4310000 },
                    { key: "Rent and utilities (staff/faculty)", amount: 6375000 },
                    { key: "Workshops and seminars", amount: 2441200 },
                    { key: "In country travel", amount: 97499500 },
                    { key: "International travel", amount: 83300000 },
                    { key: "Other direct costs", amount: 731000 }
                ]
            },
            NCDC: {
                label: "Advanced – NCDC template",
                source: "NCDC",
                total: 73600000,
                components: [
                    { key: "In-country programme staff (salary and benefits)", amount: 12000000 },
                    { key: "Office equipment (staff/faculty)", amount: 2000000 },
                    { key: "Office software (staff/faculty)", amount: 1000000 },
                    { key: "Trainee allowances", amount: 25000000 },
                    { key: "Trainee equipment", amount: 1000000 },
                    { key: "Trainee software", amount: 500000 },
                    { key: "Training materials", amount: 500000 },
                    { key: "Workshops and seminars", amount: 3000000 },
                    { key: "In country travel", amount: 10000000 },
                    { key: "Other direct costs", amount: 500000 },
                    { key: "Management and oversight", amount: 20000000 },
                    { key: "Equipment depreciation", amount: 1000000 },
                    { key: "Shared utilities and services", amount: 1000000 },
                    { key: "Staff development (non trainees)", amount: 200000 }
                ]
            }
        }
    };

    // --- STATE -------------------------------------------------------------

    const state = {
        tab: "intro",
        programTier: "frontline",
        careerTrack: "certificate",
        mentorship: "low",
        delivery: "blended",
        response: "30",
        costPerTraineeMonthINR: 250000,
        trainees: 20,
        cohorts: 10,
        modelKey: "mxl",
        currency: "INR",
        includeOppCost: true,
        costSourceKey: "WHO",
        scenarioName: "",
        scenarioNotes: "",
        latestOutputs: null,
        savedScenarios: [],
        charts: {
            uptake: null,
            bcr: null,
            epi: null
        }
    };

    // --- UTILITY FUNCTIONS -------------------------------------------------

    function formatCurrencyINR(value) {
        if (!Number.isFinite(value)) return "–";
        return "INR " + Math.round(value).toLocaleString("en-US");
    }

    function formatCurrencyDisplay(valueINR, currency) {
        if (!Number.isFinite(valueINR)) return "–";
        if (currency === "USD") {
            const usd = valueINR / INR_PER_USD;
            return "USD " + usd.toFixed(1).toLocaleString("en-US");
        }
        return formatCurrencyINR(valueINR);
    }

    function formatPercent(p) {
        if (!Number.isFinite(p)) return "–";
        return (p * 100).toFixed(1) + "%";
    }

    function logistic(x) {
        if (x > 30) return 1;
        if (x < -30) return 0;
        return 1 / (1 + Math.exp(-x));
    }

    function getActiveCostTemplate() {
        const tier = state.programTier;
        const tierTemplates = COST_TEMPLATES[tier] || {};
        return tierTemplates[state.costSourceKey] || Object.values(tierTemplates)[0];
    }

    function splitCostTemplate(template, programmeCostExOpp) {
        if (!template) return {
            programmeCostExOpp,
            opportunityCost: 0,
            totalEconomic: programmeCostExOpp,
            components: []
        };

        const total = template.total || 1;
        const nonOppComponents = template.components.filter(c => !c.isOpportunity);
        const oppComponent = template.components.find(c => c.isOpportunity);
        const totalOpp = oppComponent ? oppComponent.amount : 0;
        const totalNonOpp = total - totalOpp;

        const nonOppShares = nonOppComponents.map(c => ({
            key: c.key,
            share: totalNonOpp > 0 ? c.amount / totalNonOpp : 0
        }));

        const oppShare = total > 0 ? totalOpp / total : 0;
        const nonOppShareTotal = 1 - oppShare;

        const components = [];
        let opportunityCostValue = 0;
        let totalEconomic = programmeCostExOpp;

        nonOppShares.forEach(entry => {
            const compValue = programmeCostExOpp * entry.share;
            components.push({
                label: entry.key,
                value: compValue
            });
        });

        if (state.includeOppCost && oppComponent && nonOppShareTotal > 0) {
            opportunityCostValue = programmeCostExOpp * (oppShare / nonOppShareTotal);
            totalEconomic = programmeCostExOpp + opportunityCostValue;
            components.push({
                label: "Opportunity cost of trainee time",
                value: opportunityCostValue
            });
        }

        return {
            programmeCostExOpp,
            opportunityCost: opportunityCostValue,
            totalEconomic,
            components
        };
    }

    function computeDeltaVAndEndorsement() {
        const model = PREFERENCE_MODELS[state.modelKey];
        const beta = model.beta;
        const betaCost = model.beta_cost;

        let attrSum = 0;

        if (state.programTier === "intermediate") attrSum += beta.intermediate;
        if (state.programTier === "advanced") attrSum += beta.advanced;

        if (state.careerTrack === "uniqual") attrSum += beta.uniqual;
        if (state.careerTrack === "career_path") attrSum += beta.career_path;

        if (state.mentorship === "medium") attrSum += beta.mentor_medium;
        if (state.mentorship === "high") attrSum += beta.mentor_high;

        if (state.delivery === "inperson") attrSum += beta.inperson;
        if (state.delivery === "online") attrSum += beta.online;

        if (state.response === "15") attrSum += beta.resp15;
        if (state.response === "7") attrSum += beta.resp7;

        const costThousands = state.costPerTraineeMonthINR / 1000;
        const costTerm = betaCost * costThousands;

        const baseline = -model.asc_optout;

        const deltaV = baseline + attrSum + costTerm;
        const endorse = logistic(deltaV);
        const optout = 1 - endorse;

        return { deltaV, endorse, optout };
    }

    function computeWTPBenefitPerTraineeMonth() {
        const wtp = WTP_TABLE[state.modelKey];
        if (!wtp) return 0;

        let benefit = 0;

        if (state.programTier === "intermediate") benefit += wtp.intermediate;
        if (state.programTier === "advanced") benefit += wtp.advanced;

        if (state.careerTrack === "uniqual") benefit += wtp.uniqual;
        if (state.careerTrack === "career_path") benefit += wtp.career_path;

        if (state.mentorship === "medium") benefit += wtp.mentor_medium;
        if (state.mentorship === "high") benefit += wtp.mentor_high;

        if (state.delivery === "inperson") benefit += wtp.inperson;
        if (state.delivery === "online") benefit += wtp.online;

        if (state.response === "15") benefit += wtp.resp15;
        if (state.response === "7") benefit += wtp.resp7;

        return Math.max(0, benefit);
    }

    function computeEpiOutputs(endorse) {
        const meta = EPI_MULTIPLIERS[state.programTier];
        if (!meta) {
            return {
                graduates: 0,
                outbreaksPerYear: 0,
                epiBenefitPerCohort: 0
            };
        }

        const effectiveTrainees = state.trainees * meta.gradsPerCohort * endorse;
        const graduatesTotal = effectiveTrainees * state.cohorts;

        const outbreaksPerCohortPerYear = meta.outbreaksPerCohortPerYear * endorse;
        const outbreaksSupportedPerYear = outbreaksPerCohortPerYear * state.cohorts;

        const epiBenefitPerCohort =
            effectiveTrainees * meta.valuePerGraduate +
            outbreaksPerCohortPerYear * meta.valuePerOutbreak;

        return {
            graduates: graduatesTotal,
            outbreaksPerYear: outbreaksSupportedPerYear,
            epiBenefitPerCohort
        };
    }

    function computeOutputs() {
        const { endorse, optout } = computeDeltaVAndEndorsement();

        const months = PROGRAM_META[state.programTier].months;
        const programmeCostPerCohortExOpp = state.costPerTraineeMonthINR * state.trainees * months;

        const template = getActiveCostTemplate();
        const split = splitCostTemplate(template, programmeCostPerCohortExOpp);

        const benefitPerTraineeMonth = computeWTPBenefitPerTraineeMonth();
        const benefitPerCohort =
            benefitPerTraineeMonth * state.trainees * months;

        const totalEconomic = split.totalEconomic;
        const netBenefit = benefitPerCohort - totalEconomic;
        const bcr = totalEconomic > 0 ? benefitPerCohort / totalEconomic : null;

        const epi = computeEpiOutputs(endorse);

        return {
            endorse,
            optout,
            programmeCostExOpp: split.programmeCostExOpp,
            opportunityCost: split.opportunityCost,
            totalEconomic,
            benefitPerCohort,
            netBenefit,
            bcr,
            epi,
            costComponents: split.components
        };
    }

    function updateConfigSummary() {
        const el = document.getElementById("config-summary");
        if (!el) return;

        const modelLabel = PREFERENCE_MODELS[state.modelKey].label;
        const meta = PROGRAM_META[state.programTier];

        el.innerHTML = `
            <div><span>Programme tier</span><br><strong>${meta.label}</strong></div>
            <div><span>Career incentive</span><br><strong>${formatCareerTrack(state.careerTrack)}</strong></div>
            <div><span>Mentorship</span><br><strong>${capitalize(state.mentorship)}</strong></div>
            <div><span>Delivery mode</span><br><strong>${formatDelivery(state.delivery)}</strong></div>
            <div><span>Response time</span><br><strong>Within ${state.response} days</strong></div>
            <div><span>Preference model</span><br><strong>${modelLabel}</strong></div>
            <div><span>Trainees per cohort</span><br><strong>${state.trainees}</strong></div>
            <div><span>Number of cohorts</span><br><strong>${state.cohorts}</strong></div>
            <div><span>Cost per trainee per month</span><br><strong>${formatCurrencyDisplay(state.costPerTraineeMonthINR, state.currency)}</strong></div>
            <div><span>Cost template</span><br><strong>${getActiveCostTemplate()?.label || "Not available"}</strong></div>
        `;
    }

    function formatCareerTrack(val) {
        if (val === "uniqual") return "University qualification";
        if (val === "career_path") return "Government career pathway";
        return "Government and partner certificate";
    }

    function formatDelivery(val) {
        if (val === "inperson") return "In person";
        if (val === "online") return "Fully online";
        return "Blended";
    }

    function capitalize(x) {
        return x.charAt(0).toUpperCase() + x.slice(1);
    }

    function updateCostSourceOptions() {
        const select = document.getElementById("cost-source");
        const tierTemplates = COST_TEMPLATES[state.programTier] || {};

        const keys = Object.keys(tierTemplates);
        if (keys.length === 0) {
            select.innerHTML = `<option value="">No template available</option>`;
            state.costSourceKey = "";
            return;
        }

        if (!keys.includes(state.costSourceKey)) {
            state.costSourceKey = keys[0];
        }

        select.innerHTML = keys.map(k => {
            const tpl = tierTemplates[k];
            const selected = k === state.costSourceKey ? "selected" : "";
            return `<option value="${k}" ${selected}>${tpl.label}</option>`;
        }).join("");
    }

    function updateCostBreakdown(outputs) {
        const summary = document.getElementById("cost-breakdown-summary");
        const list = document.getElementById("cost-components-list");
        if (!summary || !list) return;

        const programmeDisplay = formatCurrencyDisplay(outputs.programmeCostExOpp, state.currency);
        const oppDisplay = outputs.opportunityCost > 0
            ? formatCurrencyDisplay(outputs.opportunityCost, state.currency)
            : "Not included";
        const totalDisplay = formatCurrencyDisplay(outputs.totalEconomic, state.currency);

        summary.innerHTML = `
            <div class="cost-summary-row">
                <span class="cost-summary-label">Programme cost (excluding opportunity cost)</span>
                <span class="cost-summary-value">${programmeDisplay}</span>
            </div>
            <div class="cost-summary-row">
                <span class="cost-summary-label">Opportunity cost</span>
                <span class="cost-summary-value">${oppDisplay}</span>
            </div>
            <div class="cost-summary-row">
                <span class="cost-summary-label">Total economic cost per cohort</span>
                <span class="cost-summary-value">${totalDisplay}</span>
            </div>
        `;

        list.innerHTML = "";
        outputs.costComponents.forEach(c => {
            const row = document.createElement("div");
            row.className = "cost-row";
            row.innerHTML = `
                <span class="cost-row-label">${c.label}</span>
                <span class="cost-row-value">${formatCurrencyDisplay(c.value, state.currency)}</span>
            `;
            list.appendChild(row);
        });
    }

    function updateHeadline(outputs) {
        const el = document.getElementById("headline-recommendation");
        if (!el || !outputs) return;

        const endorse = outputs.endorse;
        const bcr = outputs.bcr;

        if (!Number.isFinite(bcr)) {
            el.textContent = "Adjust cost or configuration to see a clear recommendation.";
            return;
        }

        if (bcr < 1 && endorse < 0.5) {
            el.textContent =
                "At current cost and design, both net benefits and endorsement are modest. " +
                "Consider shifting towards intermediate or advanced training with higher mentorship " +
                "or lowering programme costs before scaling up.";
        } else if (bcr < 1 && endorse >= 0.5) {
            el.textContent =
                "Stakeholders are reasonably supportive of this configuration, but the benefit cost ratio " +
                "is below one. Use STEPS to test modest cost reductions or incremental changes in mentorship " +
                "and response time to improve value.";
        } else if (bcr >= 1 && endorse < 0.5) {
            el.textContent =
                "The configuration offers good value in monetary terms but endorsement is limited. " +
                "Consider adjusting programme tier or career incentives to move closer to what decision makers prefer.";
        } else {
            el.textContent =
                "This configuration appears attractive: endorsement is strong and the benefit cost ratio is above one. " +
                "It is a strong candidate for priority scale up, subject to budget feasibility and implementation capacity.";
        }
    }

    function updateResultCards(outputs) {
        if (!outputs) return;

        const endorseEl = document.getElementById("endorsement-rate");
        const optoutEl = document.getElementById("optout-rate");
        const totalCostEl = document.getElementById("total-cost");
        const netBenefitEl = document.getElementById("net-benefit");
        const bcrEl = document.getElementById("bcr");
        const epiGradEl = document.getElementById("epi-graduates");
        const epiOutEl = document.getElementById("epi-outbreaks");
        const epiBenEl = document.getElementById("epi-benefit");

        endorseEl.textContent = formatPercent(outputs.endorse);
        optoutEl.textContent = formatPercent(outputs.optout);
        totalCostEl.textContent = formatCurrencyDisplay(outputs.totalEconomic, state.currency);
        netBenefitEl.textContent = formatCurrencyDisplay(outputs.netBenefit, state.currency);
        bcrEl.textContent = Number.isFinite(outputs.bcr) ? outputs.bcr.toFixed(2) : "–";
        epiGradEl.textContent = outputs.epi.graduates.toFixed(0);
        epiOutEl.textContent = outputs.epi.outbreaksPerYear.toFixed(1);
        epiBenEl.textContent = formatCurrencyDisplay(outputs.epi.epiBenefitPerCohort, state.currency);
    }

    function updateCharts(outputs) {
        const uptakeCtx = document.getElementById("chart-uptake").getContext("2d");
        const bcrCtx = document.getElementById("chart-bcr").getContext("2d");
        const epiCtx = document.getElementById("chart-epi").getContext("2d");

        if (state.charts.uptake) state.charts.uptake.destroy();
        if (state.charts.bcr) state.charts.bcr.destroy();
        if (state.charts.epi) state.charts.epi.destroy();

        state.charts.uptake = new Chart(uptakeCtx, {
            type: "bar",
            data: {
                labels: ["Endorse FETP", "Choose opt out"],
                datasets: [{
                    data: [outputs.endorse * 100, outputs.optout * 100]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: v => v + "%" }
                    }
                }
            }
        });

        state.charts.bcr = new Chart(bcrCtx, {
            type: "bar",
            data: {
                labels: ["BCR"],
                datasets: [{
                    data: [outputs.bcr || 0]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        state.charts.epi = new Chart(epiCtx, {
            type: "bar",
            data: {
                labels: ["Graduates", "Outbreak responses per year"],
                datasets: [{
                    data: [outputs.epi.graduates, outputs.epi.outbreaksPerYear]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function openSnapshotModal(outputs) {
        const modal = document.getElementById("results-modal");
        const body = document.getElementById("modal-body");
        if (!modal || !body || !outputs) return;

        const meta = PROGRAM_META[state.programTier];

        body.innerHTML = `
            <p><strong>Scenario:</strong> ${state.scenarioName || "Untitled scenario"}</p>
            <p>
                <strong>Programme tier:</strong> ${meta.label}; 
                <strong>Mentorship:</strong> ${capitalize(state.mentorship)}; 
                <strong>Delivery:</strong> ${formatDelivery(state.delivery)}; 
                <strong>Response:</strong> within ${state.response} days.
            </p>
            <p>
                <strong>Cohorts:</strong> ${state.cohorts}; 
                <strong>Trainees per cohort:</strong> ${state.trainees}; 
                <strong>Cost per trainee per month:</strong> ${formatCurrencyDisplay(state.costPerTraineeMonthINR, state.currency)}.
            </p>
            <p>
                <strong>Endorsement:</strong> ${formatPercent(outputs.endorse)}; 
                <strong>Benefit cost ratio:</strong> ${Number.isFinite(outputs.bcr) ? outputs.bcr.toFixed(2) : "not defined"}; 
                <strong>Net benefit per cohort:</strong> ${formatCurrencyDisplay(outputs.netBenefit, state.currency)}.
            </p>
            <p>
                <strong>Graduates supported:</strong> ${outputs.epi.graduates.toFixed(0)} across all cohorts; 
                <strong>Outbreak responses per year:</strong> ${outputs.epi.outbreaksPerYear.toFixed(1)}.
            </p>
            <p><strong>Scenario notes:</strong> ${state.scenarioNotes || "None"}</p>
        `;

        modal.classList.remove("hidden");
    }

    function closeSnapshotModal() {
        const modal = document.getElementById("results-modal");
        if (modal) modal.classList.add("hidden");
    }

    function saveScenario(outputs) {
        if (!outputs) return;

        const meta = PROGRAM_META[state.programTier];

        const row = {
            name: state.scenarioName || `Scenario ${state.savedScenarios.length + 1}`,
            programme: meta.label,
            mentorship: capitalize(state.mentorship),
            response: `Within ${state.response} days`,
            cohorts: state.cohorts,
            trainees: state.trainees,
            costPerTraineeMonthINR: state.costPerTraineeMonthINR,
            modelLabel: PREFERENCE_MODELS[state.modelKey].label,
            endorsement: outputs.endorse,
            bcr: outputs.bcr,
            netBenefit: outputs.netBenefit,
            currency: state.currency,
            notes: state.scenarioNotes || ""
        };

        state.savedScenarios.push(row);
        renderScenarioTable();
    }

    function renderScenarioTable() {
        const tbody = document.querySelector("#scenario-table tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        state.savedScenarios.forEach(s => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${s.name}</td>
                <td>${s.programme}</td>
                <td>${s.mentorship}</td>
                <td>${s.response}</td>
                <td>${s.cohorts}</td>
                <td>${s.trainees}</td>
                <td>${formatCurrencyDisplay(s.costPerTraineeMonthINR, s.currency)}</td>
                <td>${s.modelLabel}</td>
                <td>${formatPercent(s.endorsement)}</td>
                <td>${Number.isFinite(s.bcr) ? s.bcr.toFixed(2) : "–"}</td>
                <td>${formatCurrencyDisplay(s.netBenefit, s.currency)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Export functions

    function exportScenariosToExcel() {
        if (state.savedScenarios.length === 0) return;

        const sheetData = [
            [
                "Name", "Programme tier", "Mentorship", "Response time",
                "Cohorts", "Trainees per cohort", "Cost per trainee per month (INR)",
                "Preference model", "Endorsement", "Benefit cost ratio", "Net benefit (INR)",
                "Notes"
            ]
        ];

        state.savedScenarios.forEach(s => {
            sheetData.push([
                s.name,
                s.programme,
                s.mentorship,
                s.response,
                s.cohorts,
                s.trainees,
                s.costPerTraineeMonthINR,
                s.modelLabel,
                s.endorsement,
                s.bcr,
                s.netBenefit,
                s.notes
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "STEPS scenarios");
        XLSX.writeFile(wb, "STEPS_FETP_scenarios.xlsx");
    }

    function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach(line => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            doc.text(line, x, y);
            y += lineHeight;
        });
        return y;
    }

    function exportPolicyBriefPDF() {
        if (!jsPDF || state.savedScenarios.length === 0) return;

        const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("STEPS FETP scale up brief – India", 20, 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        let y = 28;

        y = addWrappedText(
            doc,
            "This brief summarises key Field Epidemiology Training Programme (FETP) configurations evaluated with STEPS. " +
            "Results combine discrete choice experiment evidence on stakeholder preferences with costing assumptions for each scenario.",
            20, y, 170, 5
        );

        y += 3;
        doc.setFont("helvetica", "italic");
        y = addWrappedText(
            doc,
            "Prepared by Mesfin Genie, PhD, Newcastle Business School, The University of Newcastle, Australia. " +
            "Contact: mesfin.genie@newcastle.edu.au.",
            20, y, 170, 5
        );
        doc.setFont("helvetica", "normal");

        state.savedScenarios.forEach((s, idx) => {
            y += 6;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            doc.text(`Scenario ${idx + 1}: ${s.name}`, 20, y);
            y += 5;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);

            const scenarioText =
                `Programme tier: ${s.programme}; mentorship: ${s.mentorship}; delivery and response time as configured in STEPS.\n` +
                `Cohorts: ${s.cohorts}; trainees per cohort: ${s.trainees}; ` +
                `cost per trainee per month (INR): ${Math.round(s.costPerTraineeMonthINR).toLocaleString("en-US")}.\n` +
                `Endorsement: ${(s.endorsement * 100).toFixed(1)} percent; benefit cost ratio: ` +
                `${Number.isFinite(s.bcr) ? s.bcr.toFixed(2) : "not defined"}; ` +
                `net benefit per cohort (INR): ${Math.round(s.netBenefit).toLocaleString("en-US")}.\n` +
                `Scenario notes: ${s.notes || "None."}`;

            y = addWrappedText(doc, scenarioText, 20, y, 170, 5);
        });

        doc.save("STEPS_FETP_policy_brief.pdf");
    }

    // Technical appendix window

    function initTechnicalPreview() {
        const preview = document.getElementById("technical-preview");
        if (!preview) return;
        preview.innerHTML =
            "<p>This appendix explains the mixed logit and latent class models, cost templates, " +
            "and epidemiological multipliers used in STEPS. Use the button above to open the full " +
            "technical document in a separate window for printing or detailed review.</p>";
    }

    function openTechnicalWindow() {
        const tpl = document.getElementById("technical-appendix-template");
        if (!tpl) return;
        const html = tpl.textContent || tpl.innerText;
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
    }

    // --- EVENT HANDLERS ----------------------------------------------------

    function attachEvents() {
        // Tabs
        document.querySelectorAll(".tab-link").forEach(btn => {
            btn.addEventListener("click", () => {
                const tab = btn.getAttribute("data-tab");
                if (!tab) return;
                state.tab = tab;
                document.querySelectorAll(".tab-link").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                document.querySelectorAll(".tab-panel").forEach(panel => {
                    panel.classList.toggle("active", panel.id === "tab-" + tab);
                });
            });
        });

        // Configuration inputs
        document.getElementById("program-tier").addEventListener("change", e => {
            state.programTier = e.target.value;
            updateCostSourceOptions();
            rerun();
        });

        document.getElementById("career-track").addEventListener("change", e => {
            state.careerTrack = e.target.value;
            rerun();
        });

        document.getElementById("mentorship").addEventListener("change", e => {
            state.mentorship = e.target.value;
            rerun();
        });

        document.getElementById("delivery").addEventListener("change", e => {
            state.delivery = e.target.value;
            rerun();
        });

        document.getElementById("response").addEventListener("change", e => {
            state.response = e.target.value;
            rerun();
        });

        document.getElementById("cost-slider").addEventListener("input", e => {
            state.costPerTraineeMonthINR = Number(e.target.value);
            updateCostDisplay();
            rerun();
        });

        document.getElementById("trainees").addEventListener("input", e => {
            state.trainees = Math.max(1, Number(e.target.value) || 0);
            rerun();
        });

        document.getElementById("cohorts").addEventListener("input", e => {
            state.cohorts = Math.max(1, Number(e.target.value) || 0);
            rerun();
        });

        document.getElementById("scenario-name").addEventListener("input", e => {
            state.scenarioName = e.target.value;
        });

        document.getElementById("scenario-notes").addEventListener("input", e => {
            state.scenarioNotes = e.target.value;
        });

        // Model toggle
        document.querySelectorAll(".pill-toggle[data-model]").forEach(btn => {
            btn.addEventListener("click", () => {
                const modelKey = btn.getAttribute("data-model");
                state.modelKey = modelKey;
                document.querySelectorAll(".pill-toggle[data-model]").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                rerun();
            });
        });

        // Currency toggle
        document.querySelectorAll(".pill-toggle[data-currency]").forEach(btn => {
            btn.addEventListener("click", () => {
                const currency = btn.getAttribute("data-currency");
                state.currency = currency;
                document.querySelectorAll(".pill-toggle[data-currency]").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                document.getElementById("currency-label").textContent = currency;
                updateCostDisplay();
                rerun();
            });
        });

        // Opportunity cost switch
        document.getElementById("opp-toggle").addEventListener("click", e => {
            state.includeOppCost = !state.includeOppCost;
            const btn = e.currentTarget;
            btn.classList.toggle("on", state.includeOppCost);
            const label = btn.querySelector(".switch-label");
            if (label) {
                label.textContent = state.includeOppCost
                    ? "Opportunity cost included"
                    : "Opportunity cost excluded";
            }
            rerun();
        });

        // Cost source
        document.getElementById("cost-source").addEventListener("change", e => {
            state.costSourceKey = e.target.value;
            rerun();
        });

        // Buttons
        document.getElementById("update-results").addEventListener("click", () => rerun());
        document.getElementById("open-snapshot").addEventListener("click", () => {
            if (state.latestOutputs) openSnapshotModal(state.latestOutputs);
        });
        document.getElementById("save-scenario").addEventListener("click", () => {
            if (state.latestOutputs) {
                saveScenario(state.latestOutputs);
                openSnapshotModal(state.latestOutputs);
            }
        });

        document.getElementById("export-excel").addEventListener("click", exportScenariosToExcel);
        document.getElementById("export-pdf").addEventListener("click", exportPolicyBriefPDF);

        document.getElementById("close-modal").addEventListener("click", closeSnapshotModal);
        document.getElementById("results-modal").addEventListener("click", e => {
            if (e.target.id === "results-modal") closeSnapshotModal();
        });

        document.getElementById("open-technical-window").addEventListener("click", openTechnicalWindow);
    }

    function updateCostDisplay() {
        const label = document.getElementById("cost-display");
        if (!label) return;
        label.textContent = formatCurrencyDisplay(state.costPerTraineeMonthINR, state.currency);
    }

    function rerun() {
        updateConfigSummary();
        const outputs = computeOutputs();
        state.latestOutputs = outputs;
        updateCostBreakdown(outputs);
        updateResultCards(outputs);
        updateCharts(outputs);
        updateHeadline(outputs);
    }

    function init() {
        updateCostSourceOptions();
        updateCostDisplay();
        updateConfigSummary();
        initTechnicalPreview();
        rerun();
    }

    document.addEventListener("DOMContentLoaded", () => {
        attachEvents();
        init();
    });
})();
