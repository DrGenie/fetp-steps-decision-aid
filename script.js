/* global Chart, jspdf, XLSX */

(() => {
    const { jsPDF } = window.jspdf || {};

    // Core constants

    let INR_PER_USD_DEFAULT = 89.5;
    let INR_PER_USD = INR_PER_USD_DEFAULT;

    const PROGRAM_META = {
        frontline: { label: "Frontline (3 months)", months: 3 },
        intermediate: { label: "Intermediate (12 months)", months: 12 },
        advanced: { label: "Advanced (24 months)", months: 24 }
    };

    // Final mixed logit and latent class parameters

    const PREFERENCE_MODELS = {
        mxl: {
            key: "mxl",
            label: "Average mixed logit",
            asc_a: 0.168,
            asc_optout: -0.601,
            beta: {
                intermediate: 0.220,
                advanced: 0.487,
                uniqual: 0.017,
                career_path: -0.122,
                mentor_medium: 0.453,
                mentor_high: 0.640,
                inperson: -0.232,
                online: -1.073,
                resp15: 0.546,
                resp7: 0.610
            },
            beta_cost: -0.005
        },
        lc2: {
            key: "lc2",
            label: "Supportive latent class (Class 2)",
            asc_a: 0.098,
            asc_optout: -2.543,
            beta: {
                intermediate: 0.087,
                advanced: 0.422,
                uniqual: -0.024,
                career_path: -0.123,
                mentor_medium: 0.342,
                mentor_high: 0.486,
                inperson: -0.017,
                online: -0.700,
                resp15: 0.317,
                resp7: 0.504
            },
            beta_cost: -0.001
        }
    };

    // WTP (INR per trainee per month)

    const WTP_TABLE = {
        mxl: {
            intermediate: 47060,
            advanced: 103990,
            uniqual: 3690,
            career_path: -26170,
            mentor_medium: 96870,
            mentor_high: 136790,
            inperson: -49560,
            online: -229330,
            resp15: 116700,
            resp7: 130460
        },
        lc2: {
            intermediate: 87000,
            advanced: 422000,
            uniqual: -24000,
            career_path: -123000,
            mentor_medium: 342000,
            mentor_high: 486000,
            inperson: -17000,
            online: -700000,
            resp15: 317000,
            resp7: 504000
        }
    };

    // Default epidemiological multipliers

    const DEFAULT_EPI_MULTIPLIERS = {
        frontline: {
            gradsPerCohort: 0.9,
            outbreaksPerCohortPerYear: 2,
            valuePerGraduate: 200000,
            valuePerOutbreak: 3000000
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

    let epiConfig = JSON.parse(JSON.stringify(DEFAULT_EPI_MULTIPLIERS));
    const EPI_CONFIG_URL = "epi_config.json";

    // Cost templates (separate for each tier and source)

    const COST_TEMPLATES = {
        frontline: {
            WHO: {
                label: "Frontline - WHO template (6 cohorts)",
                source: "WHO",
                total: 104482758,
                components: [
                    { key: "In country programme staff (salary and benefits)", amount: 10694704 },
                    { key: "Office equipment (staff and faculty)", amount: 200000 },
                    { key: "Office software (staff and faculty)", amount: 20000 },
                    { key: "Rent and utilities (staff and faculty)", amount: 1200000 },
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
                label: "Intermediate - WHO template",
                source: "WHO",
                total: 70300369,
                components: [
                    { key: "In country programme staff (salary and benefits)", amount: 6571500 },
                    { key: "Office equipment (staff and faculty)", amount: 200000 },
                    { key: "Office software (staff and faculty)", amount: 20000 },
                    { key: "Rent and utilities (staff and faculty)", amount: 600000 },
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
                label: "Intermediate - NIE template",
                source: "NIE",
                total: 208739950,
                components: [
                    { key: "In country programme staff (salary and benefits)", amount: 18180000 },
                    { key: "Office equipment (staff and faculty)", amount: 1520000 },
                    { key: "Office software (staff and faculty)", amount: 7110000 },
                    { key: "Rent and utilities (staff and faculty)", amount: 3995000 },
                    { key: "Workshops and seminars", amount: 4119950 },
                    { key: "In country travel", amount: 138998875 },
                    { key: "International travel", amount: 34816125 }
                ]
            },
            NCDC: {
                label: "Intermediate - NCDC template",
                source: "NCDC",
                total: 9000000,
                components: [
                    { key: "Other programme staff (consultants and advisors)", amount: 100000 },
                    { key: "Office software (staff and faculty)", amount: 100000 },
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
                label: "Advanced - NIE template",
                source: "NIE",
                total: 254539700,
                components: [
                    { key: "In country programme staff (salary and benefits)", amount: 15660000 },
                    { key: "Office equipment (staff and faculty)", amount: 1020000 },
                    { key: "Office software (staff and faculty)", amount: 4310000 },
                    { key: "Rent and utilities (staff and faculty)", amount: 6375000 },
                    { key: "Workshops and seminars", amount: 2441200 },
                    { key: "In country travel", amount: 97499500 },
                    { key: "International travel", amount: 83300000 },
                    { key: "Other direct costs", amount: 731000 }
                ]
            },
            NCDC: {
                label: "Advanced - NCDC template",
                source: "NCDC",
                total: 73600000,
                components: [
                    { key: "In country programme staff (salary and benefits)", amount: 12000000 },
                    { key: "Office equipment (staff and faculty)", amount: 2000000 },
                    { key: "Office software (staff and faculty)", amount: 1000000 },
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

    // State

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

    let toastTimeout = null;

    // Utility helpers

    function formatCurrencyINR(value) {
        if (!Number.isFinite(value)) return "-";
        return "INR " + Math.round(value).toLocaleString("en-US");
    }

    function formatCurrencyDisplay(valueINR, currency) {
        if (!Number.isFinite(valueINR)) return "-";
        if (currency === "USD") {
            const usd = valueINR / INR_PER_USD;
            return "USD " + usd.toFixed(1).toLocaleString("en-US");
        }
        return formatCurrencyINR(valueINR);
    }

    function formatPercent(p) {
        if (!Number.isFinite(p)) return "-";
        return (p * 100).toFixed(1) + "%";
    }

    function logistic(x) {
        if (x > 30) return 1;
        if (x < -30) return 0;
        return 1 / (1 + Math.exp(-x));
    }

    function capitalize(x) {
        return x.charAt(0).toUpperCase() + x.slice(1);
    }

    function formatCareerTrack(val) {
        if (val === "uniqual") return "University qualification";
        if (val === "career_path") return "Government career pathway";
        return "Government and partner certificate";
    }

    function formatDelivery(val) {
        if (val === "inperson") return "Fully in person";
        if (val === "online") return "Fully online";
        return "Blended";
    }

    function getActiveCostTemplate() {
        const tierTemplates = COST_TEMPLATES[state.programTier] || {};
        return tierTemplates[state.costSourceKey] || Object.values(tierTemplates)[0];
    }

    function splitCostTemplate(template, programmeCostExOpp) {
        if (!template) {
            return {
                programmeCostExOpp,
                opportunityCost: 0,
                totalEconomic: programmeCostExOpp,
                components: []
            };
        }

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
        const meta = epiConfig[state.programTier];
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

    // UI updates

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

    function updateConfigEndorsement(outputs) {
        const span = document.getElementById("config-endorsement-value");
        if (!span) return;
        if (!outputs) {
            span.textContent = "Apply configuration";
        } else {
            span.textContent = formatPercent(outputs.endorse);
        }
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
                "Consider moving towards Intermediate or Advanced with stronger mentorship or reducing costs before scaling up.";
        } else if (bcr < 1 && endorse >= 0.5) {
            el.textContent =
                "Stakeholders are supportive, but the benefit cost ratio is below one. " +
                "Test lower costs or incremental changes in mentorship and response time to improve value.";
        } else if (bcr >= 1 && endorse < 0.5) {
            el.textContent =
                "The configuration offers good value in monetary terms, but endorsement is limited. " +
                "Consider adjusting programme tier or career incentives to align more closely with stakeholder preferences.";
        } else {
            el.textContent =
                "This configuration looks attractive, with strong endorsement and a benefit cost ratio above one. " +
                "It is a strong candidate for priority scale up, subject to budget and implementation feasibility.";
        }
    }

    function updateResultCards(outputs) {
        if (!outputs) return;

        document.getElementById("endorsement-rate").textContent = formatPercent(outputs.endorse);
        document.getElementById("optout-rate").textContent = formatPercent(outputs.optout);
        document.getElementById("total-cost").textContent = formatCurrencyDisplay(outputs.totalEconomic, state.currency);
        document.getElementById("net-benefit").textContent = formatCurrencyDisplay(outputs.netBenefit, state.currency);
        document.getElementById("bcr").textContent = Number.isFinite(outputs.bcr) ? outputs.bcr.toFixed(2) : "-";
        document.getElementById("epi-graduates").textContent = outputs.epi.graduates.toFixed(0);
        document.getElementById("epi-outbreaks").textContent = outputs.epi.outbreaksPerYear.toFixed(1);
        document.getElementById("epi-benefit").textContent = formatCurrencyDisplay(outputs.epi.epiBenefitPerCohort, state.currency);
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
                labels: ["Endorse FETP", "Opt out"],
                datasets: [{
                    data: [outputs.endorse * 100, outputs.optout * 100]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
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
                labels: ["Benefit cost ratio"],
                datasets: [{
                    data: [outputs.bcr || 0]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true }
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
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function updateNationalSimulation(outputs) {
        const natTotalCostEl = document.getElementById("nat-total-cost");
        const natTotalBenefitEl = document.getElementById("nat-total-benefit");
        const natNetBenefitEl = document.getElementById("nat-net-benefit");
        const natBcrEl = document.getElementById("nat-bcr");
        const natGradsEl = document.getElementById("nat-graduates");
        const natOutbreaksEl = document.getElementById("nat-outbreaks");

        if (!outputs || !natTotalCostEl) return;

        const totalCostNational = outputs.totalEconomic * state.cohorts;
        const totalBenefitNational = outputs.benefitPerCohort * state.cohorts;
        const netNational = totalBenefitNational - totalCostNational;
        const bcrNat = totalCostNational > 0 ? totalBenefitNational / totalCostNational : null;

        natTotalCostEl.textContent = formatCurrencyDisplay(totalCostNational, state.currency);
        natTotalBenefitEl.textContent = formatCurrencyDisplay(totalBenefitNational, state.currency);
        natNetBenefitEl.textContent = formatCurrencyDisplay(netNational, state.currency);
        natBcrEl.textContent = Number.isFinite(bcrNat) ? bcrNat.toFixed(2) : "-";

        natGradsEl.textContent = outputs.epi.graduates.toFixed(0);
        natOutbreaksEl.textContent = outputs.epi.outbreaksPerYear.toFixed(1);
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
                <strong>Career incentive:</strong> ${formatCareerTrack(state.careerTrack)};
                <strong>Mentorship:</strong> ${capitalize(state.mentorship)};
                <strong>Delivery:</strong> ${formatDelivery(state.delivery)};
                <strong>Response time:</strong> within ${state.response} days.
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
                <strong>Graduates across all cohorts:</strong> ${outputs.epi.graduates.toFixed(0)};
                <strong>Outbreak responses per year:</strong> ${outputs.epi.outbreaksPerYear.toFixed(1)};
                <strong>Indicative benefit per cohort:</strong> ${formatCurrencyDisplay(outputs.epi.epiBenefitPerCohort, state.currency)}.
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
                <td>${Number.isFinite(s.bcr) ? s.bcr.toFixed(2) : "-"}</td>
                <td>${formatCurrencyDisplay(s.netBenefit, s.currency)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function showToast(message) {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove("hidden");
        toast.classList.add("visible");
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove("visible");
            toast.classList.add("hidden");
        }, 3000);
    }

    // Export helpers

    function exportScenariosToExcel() {
        if (state.savedScenarios.length === 0) {
            showToast("Save at least one scenario before exporting.");
            return;
        }

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
        showToast("Excel file downloaded.");
    }

    function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach(line => {
            if (y > 280) {
                doc.addPage();
                y = 20;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
            }
            doc.text(line, x, y);
            y += lineHeight;
        });
        return y;
    }

    function exportPolicyBriefPDF() {
        if (!jsPDF || state.savedScenarios.length === 0) {
            showToast("Save at least one scenario before downloading the PDF.");
            return;
        }

        const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("STEPS FETP scale up brief for India", 20, 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        let y = 28;

        y = addWrappedText(
            doc,
            "This brief summarises Field Epidemiology Training Programme configurations evaluated with STEPS. " +
            "Results link discrete choice experiment evidence on stakeholder preferences with costing assumptions " +
            "and simple epidemiological multipliers.",
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
                `Programme tier: ${s.programme}; mentorship: ${s.mentorship}; response time: ${s.response}.\n` +
                `Cohorts: ${s.cohorts}; trainees per cohort: ${s.trainees}; ` +
                `cost per trainee per month (INR): ${Math.round(s.costPerTraineeMonthINR).toLocaleString("en-US")}.\n` +
                `Endorsement: ${(s.endorsement * 100).toFixed(1)} percent; benefit cost ratio: ` +
                `${Number.isFinite(s.bcr) ? s.bcr.toFixed(2) : "not defined"}; ` +
                `net benefit per cohort (INR): ${Math.round(s.netBenefit).toLocaleString("en-US")}.\n` +
                `Scenario notes: ${s.notes || "None."}`;

            y = addWrappedText(doc, scenarioText, 20, y, 170, 5);
        });

        doc.save("STEPS_FETP_policy_brief.pdf");
        showToast("Policy brief PDF downloaded.");
    }

    // Technical appendix

    function initTechnicalPreview() {
        const preview = document.getElementById("technical-preview");
        if (!preview) return;
        preview.innerHTML =
            "<p>This appendix sets out the mixed logit and latent class models, the cost templates and the " +
            "epidemiological multipliers used in STEPS. Worked examples show how endorsement, costs, benefits " +
            "and national scale up results are calculated.</p>";
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

    // Advanced settings

    function populateAdvancedSettingsForm() {
        document.getElementById("adv-inr-per-usd").value = INR_PER_USD.toFixed(1);

        document.getElementById("adv-frontline-grads").value = epiConfig.frontline.gradsPerCohort;
        document.getElementById("adv-frontline-outbreaks").value = epiConfig.frontline.outbreaksPerCohortPerYear;
        document.getElementById("adv-frontline-vgrad").value = epiConfig.frontline.valuePerGraduate;
        document.getElementById("adv-frontline-voutbreak").value = epiConfig.frontline.valuePerOutbreak;

        document.getElementById("adv-intermediate-grads").value = epiConfig.intermediate.gradsPerCohort;
        document.getElementById("adv-intermediate-outbreaks").value = epiConfig.intermediate.outbreaksPerCohortPerYear;
        document.getElementById("adv-intermediate-vgrad").value = epiConfig.intermediate.valuePerGraduate;
        document.getElementById("adv-intermediate-voutbreak").value = epiConfig.intermediate.valuePerOutbreak;

        document.getElementById("adv-advanced-grads").value = epiConfig.advanced.gradsPerCohort;
        document.getElementById("adv-advanced-outbreaks").value = epiConfig.advanced.outbreaksPerCohortPerYear;
        document.getElementById("adv-advanced-vgrad").value = epiConfig.advanced.valuePerGraduate;
        document.getElementById("adv-advanced-voutbreak").value = epiConfig.advanced.valuePerOutbreak;
    }

    function applyAdvancedSettings() {
        const inrPerUsd = parseFloat(document.getElementById("adv-inr-per-usd").value);
        if (Number.isFinite(inrPerUsd) && inrPerUsd > 0) {
            INR_PER_USD = inrPerUsd;
        }

        const readTier = (tierKey, fieldKey) => {
            const id = `adv-${tierKey}-${fieldKey}`;
            const val = parseFloat(document.getElementById(id).value);
            return Number.isFinite(val) ? val : epiConfig[tierKey][fieldKey];
        };

        epiConfig.frontline.gradsPerCohort = readTier("frontline", "grads");
        epiConfig.frontline.outbreaksPerCohortPerYear = readTier("frontline", "outbreaks");
        epiConfig.frontline.valuePerGraduate = readTier("frontline", "vgrad");
        epiConfig.frontline.valuePerOutbreak = readTier("frontline", "voutbreak");

        epiConfig.intermediate.gradsPerCohort = readTier("intermediate", "grads");
        epiConfig.intermediate.outbreaksPerCohortPerYear = readTier("intermediate", "outbreaks");
        epiConfig.intermediate.valuePerGraduate = readTier("intermediate", "vgrad");
        epiConfig.intermediate.valuePerOutbreak = readTier("intermediate", "voutbreak");

        epiConfig.advanced.gradsPerCohort = readTier("advanced", "grads");
        epiConfig.advanced.outbreaksPerCohortPerYear = readTier("advanced", "outbreaks");
        epiConfig.advanced.valuePerGraduate = readTier("advanced", "vgrad");
        epiConfig.advanced.valuePerOutbreak = readTier("advanced", "voutbreak");

        rerun();
        showToast("Advanced settings applied.");
    }

    function resetAdvancedSettings() {
        INR_PER_USD = INR_PER_USD_DEFAULT;
        epiConfig = JSON.parse(JSON.stringify(DEFAULT_EPI_MULTIPLIERS));
        populateAdvancedSettingsForm();
        rerun();
        showToast("Advanced settings reset to defaults.");
    }

    function loadExternalEpiConfig() {
        fetch(EPI_CONFIG_URL)
            .then(resp => {
                if (!resp.ok) throw new Error("No external epi config");
                return resp.json();
            })
            .then(json => {
                epiConfig = Object.assign({}, epiConfig, json);
                populateAdvancedSettingsForm();
                rerun();
                showToast("External epidemiological configuration loaded.");
            })
            .catch(() => {
                populateAdvancedSettingsForm();
                rerun();
            });
    }

    // Events

    function updateCostDisplay() {
        const label = document.getElementById("cost-display");
        if (!label) return;
        label.textContent = formatCurrencyDisplay(state.costPerTraineeMonthINR, state.currency);
    }

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

        // Config inputs
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

        // Opportunity cost
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

        // Main buttons
        document.getElementById("update-results").addEventListener("click", () => {
            rerun();
            showToast("Configuration applied. Open View results or go to the Results tab.");
        });

        document.getElementById("open-snapshot").addEventListener("click", () => {
            if (state.latestOutputs) {
                openSnapshotModal(state.latestOutputs);
                document.querySelectorAll(".tab-link").forEach(b => b.classList.remove("active"));
                document.querySelector('[data-tab="results"]').classList.add("active");
                document.querySelectorAll(".tab-panel").forEach(panel => {
                    panel.classList.toggle("active", panel.id === "tab-results");
                });
            } else {
                showToast("Apply a configuration first.");
            }
        });

        document.getElementById("save-scenario").addEventListener("click", () => {
            if (state.latestOutputs) {
                saveScenario(state.latestOutputs);
                openSnapshotModal(state.latestOutputs);
                showToast("Scenario saved for comparison and reporting.");
            } else {
                showToast("Apply a configuration first.");
            }
        });

        document.getElementById("export-excel").addEventListener("click", exportScenariosToExcel);
        document.getElementById("export-pdf").addEventListener("click", exportPolicyBriefPDF);

        document.getElementById("close-modal").addEventListener("click", closeSnapshotModal);
        document.getElementById("results-modal").addEventListener("click", e => {
            if (e.target.id === "results-modal") closeSnapshotModal();
        });

        document.getElementById("open-technical-window").addEventListener("click", openTechnicalWindow);

        document.getElementById("advanced-apply").addEventListener("click", e => {
            e.preventDefault();
            applyAdvancedSettings();
        });

        document.getElementById("advanced-reset").addEventListener("click", e => {
            e.preventDefault();
            resetAdvancedSettings();
        });
    }

    // Main rerun

    function rerun() {
        const outputs = computeOutputs();
        state.latestOutputs = outputs;
        updateConfigSummary();
        updateConfigEndorsement(outputs);
        updateCostBreakdown(outputs);
        updateResultCards(outputs);
        updateCharts(outputs);
        updateHeadline(outputs);
        updateNationalSimulation(outputs);
    }

    function init() {
        updateCostSourceOptions();
        updateCostDisplay();
        updateConfigSummary();
        initTechnicalPreview();
        loadExternalEpiConfig();
    }

    document.addEventListener("DOMContentLoaded", () => {
        attachEvents();
        init();
    });
})();
