/* ===================================================
   STEPS FETP India Decision Aid
   Premium, production ready script
   =================================================== */

/* ===========================
   Global model coefficients
   =========================== */

const MXL_COEFS = {
    ascProgram: 0.168,
    ascOptOut: -0.601,
    tier: {
        frontline: 0.0,
        intermediate: 0.220,
        advanced: 0.487
    },
    career: {
        certificate: 0.0,
        uniqual: 0.017,
        career_path: -0.122
    },
    mentorship: {
        low: 0.0,
        medium: 0.453,
        high: 0.640
    },
    delivery: {
        blended: 0.0,
        inperson: -0.232,
        online: -1.073
    },
    response: {
        30: 0.0,
        15: 0.546,
        7: 0.610
    },
    costPerThousand: -0.005
};

const LC2_COEFS = {
    ascProgram: 0.098,
    ascOptOut: -2.543,
    tier: {
        frontline: 0.0,
        intermediate: 0.0,
        advanced: 0.422
    },
    career: {
        certificate: 0.0,
        uniqual: 0.0,
        career_path: 0.0
    },
    mentorship: {
        low: 0.0,
        medium: 0.342,
        high: 0.486
    },
    delivery: {
        blended: 0.0,
        inperson: 0.0,
        online: 0.0
    },
    response: {
        30: 0.0,
        15: 0.317,
        7: 0.504
    },
    costPerThousand: -0.001
};

/* ===========================
   Cost templates
   =========================== */

/*
   Templates use:
   - directShare: shares sum to 1 across named components
   - oppRate: opportunity cost as a share of direct programme cost
*/

const COST_TEMPLATES = {
    frontline: {
        who: {
            id: "who",
            label: "Frontline - WHO template (6 cohorts)",
            description: "WHO costing template for Frontline FETP with six cohorts. Includes staff, travel, supervision and management costs.",
            oppRate: 0.15,
            components: [
                { id: "staff", label: "Staff and tutors", directShare: 0.40 },
                { id: "travel", label: "Trainee travel and field work", directShare: 0.20 },
                { id: "materials", label: "Training materials and supplies", directShare: 0.15 },
                { id: "supervision", label: "Supervision and mentoring costs", directShare: 0.15 },
                { id: "overheads", label: "Management and overheads", directShare: 0.10 }
            ]
        }
    },
    intermediate: {
        who: {
            id: "who",
            label: "Intermediate - WHO template",
            description: "WHO costing template for Intermediate FETP. Reflects a mix of direct training and supervision costs.",
            oppRate: 0.20,
            components: [
                { id: "staff", label: "Staff and tutors", directShare: 0.38 },
                { id: "travel", label: "Trainee travel and field work", directShare: 0.18 },
                { id: "materials", label: "Training materials and supplies", directShare: 0.14 },
                { id: "supervision", label: "Supervision and mentoring costs", directShare: 0.18 },
                { id: "overheads", label: "Management and overheads", directShare: 0.12 }
            ]
        },
        nie: {
            id: "nie",
            label: "Intermediate - NIE template",
            description: "NIE budget template for Intermediate FETP. Slightly higher supervision share.",
            oppRate: 0.22,
            components: [
                { id: "staff", label: "Staff and tutors", directShare: 0.36 },
                { id: "travel", label: "Trainee travel and field work", directShare: 0.18 },
                { id: "materials", label: "Training materials and supplies", directShare: 0.12 },
                { id: "supervision", label: "Supervision and mentoring costs", directShare: 0.22 },
                { id: "overheads", label: "Management and overheads", directShare: 0.12 }
            ]
        },
        ncdc: {
            id: "ncdc",
            label: "Intermediate - NCDC template",
            description: "NCDC costing assumptions for Intermediate FETP. Higher management share.",
            oppRate: 0.18,
            components: [
                { id: "staff", label: "Staff and tutors", directShare: 0.35 },
                { id: "travel", label: "Trainee travel and field work", directShare: 0.17 },
                { id: "materials", label: "Training materials and supplies", directShare: 0.13 },
                { id: "supervision", label: "Supervision and mentoring costs", directShare: 0.20 },
                { id: "overheads", label: "Management and overheads", directShare: 0.15 }
            ]
        }
    },
    advanced: {
        nie: {
            id: "nie",
            label: "Advanced - NIE template",
            description: "NIE budget template for Advanced FETP. Reflects intensive staff time and supervision.",
            oppRate: 0.25,
            components: [
                { id: "staff", label: "Staff and tutors", directShare: 0.45 },
                { id: "travel", label: "Trainee travel and field work", directShare: 0.18 },
                { id: "materials", label: "Training materials and supplies", directShare: 0.10 },
                { id: "supervision", label: "Supervision and mentoring costs", directShare: 0.17 },
                { id: "overheads", label: "Management and overheads", directShare: 0.10 }
            ]
        },
        ncdc: {
            id: "ncdc",
            label: "Advanced - NCDC template",
            description: "NCDC costing assumptions for Advanced FETP. Slightly higher overhead share.",
            oppRate: 0.23,
            components: [
                { id: "staff", label: "Staff and tutors", directShare: 0.42 },
                { id: "travel", label: "Trainee travel and field work", directShare: 0.19 },
                { id: "materials", label: "Training materials and supplies", directShare: 0.11 },
                { id: "supervision", label: "Supervision and mentoring costs", directShare: 0.16 },
                { id: "overheads", label: "Management and overheads", directShare: 0.12 }
            ]
        }
    }
};

/* External JSON driven cost configuration (full templates) */
let COST_CONFIG = null;

/* ===========================
   Epidemiological settings
   =========================== */

const DEFAULT_EPI_SETTINGS = {
    general: {
        planningHorizonYears: 5,
        inrPerUsd: 83
    },
    tiers: {
        frontline: {
            gradShare: 0.90,
            outbreaksPerCohortPerYear: 0.30,
            valuePerGraduate: 800000,
            valuePerOutbreak: 30000000
        },
        intermediate: {
            gradShare: 0.92,
            outbreaksPerCohortPerYear: 0.45,
            valuePerGraduate: 1000000,
            valuePerOutbreak: 35000000
        },
        advanced: {
            gradShare: 0.95,
            outbreaksPerCohortPerYear: 0.80,
            valuePerGraduate: 1200000,
            valuePerOutbreak: 40000000
        }
    }
};

/* ===========================
   Global state
   =========================== */

const state = {
    model: "mxl",
    currency: "INR",
    includeOpportunityCost: true,
    epiSettings: JSON.parse(JSON.stringify(DEFAULT_EPI_SETTINGS)),
    currentTier: "frontline",
    currentCostSourceId: null,
    lastResults: null,
    scenarios: [],
    charts: {
        uptake: null,
        bcr: null,
        epi: null,
        natCostBenefit: null,
        natGradOutbreak: null,
        natBcr: null
    },
    tour: {
        seen: false,
        active: false,
        stepIndex: 0
    }
};

/* ===========================
   Utility helpers
   =========================== */

function formatNumber(value, decimals = 0) {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return value.toLocaleString("en-IN", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals
    });
}

function formatPercent(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return `${value.toFixed(decimals)} %`;
}

function formatCurrencyInr(value, decimals = 0) {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return `INR ${value.toLocaleString("en-IN", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals
    })}`;
}

function formatCurrency(valueInInr, currency = "INR", decimalsInr = 0) {
    if (valueInInr === null || valueInInr === undefined || isNaN(valueInInr)) return "-";
    if (currency === "USD") {
        const rate = state.epiSettings.general.inrPerUsd || 83;
        const valueUsd = valueInInr / rate;
        return `USD ${valueUsd.toLocaleString("en-US", {
            maximumFractionDigits: 1,
            minimumFractionDigits: 1
        })}`;
    }
    return formatCurrencyInr(valueInInr, decimalsInr);
}

function logistic(x) {
    if (x > 50) return 1;
    if (x < -50) return 0;
    return 1 / (1 + Math.exp(-x));
}

function computeNonCostUtility(cfg, coefs) {
    const uAsc = typeof coefs.ascProgram === "number" ? coefs.ascProgram : 1;
    const uTier = coefs.tier[cfg.tier] || 0;
    const uCareer = coefs.career[cfg.career] || 0;
    const uMentor = coefs.mentorship[cfg.mentorship] || 0;
    const uDelivery = coefs.delivery[cfg.delivery] || 0;
    const uResponse = coefs.response[cfg.response] || 0;
    return uAsc + uTier + uCareer + uMentor + uDelivery + uResponse;
}

function getModelCoefs(modelId) {
    return modelId === "lc2" ? LC2_COEFS : MXL_COEFS;
}

/* ===========================
   Configuration reading
   =========================== */

function readConfigurationFromInputs() {
    const tier = document.getElementById("program-tier").value;
    const career = document.getElementById("career-track").value;
    const mentorship = document.getElementById("mentorship").value;
    const delivery = document.getElementById("delivery").value;
    const response = document.getElementById("response").value;

    const costSlider = document.getElementById("cost-slider");
    const traineesInput = document.getElementById("trainees");
    const cohortsInput = document.getElementById("cohorts");

    const costPerTraineePerMonth = parseFloat(costSlider.value) || 0;
    const traineesPerCohort = parseInt(traineesInput.value, 10) || 0;
    const numberOfCohorts = parseInt(cohortsInput.value, 10) || 0;

    const scenarioNameInput = document.getElementById("scenario-name");
    const scenarioNotesInput = document.getElementById("scenario-notes");

    return {
        tier,
        career,
        mentorship,
        delivery,
        response,
        costPerTraineePerMonth,
        traineesPerCohort,
        numberOfCohorts,
        scenarioName: scenarioNameInput ? scenarioNameInput.value.trim() : "",
        scenarioNotes: scenarioNotesInput ? scenarioNotesInput.value.trim() : ""
    };
}

/* ===========================
   Utility and endorsement
   =========================== */

function computeEndorsementAndWtp(cfg, modelId) {
    const coefs = getModelCoefs(modelId);
    const nonCostUtility = computeNonCostUtility(cfg, coefs);
    const costThousands = cfg.costPerTraineePerMonth / 1000;
    const costUtil = (coefs.costPerThousand || 0) * costThousands;

    const ascOptOut = coefs.ascOptOut || 0;
    const deltaV = -ascOptOut + nonCostUtility + costUtil;

    const endorseProb = logistic(deltaV);
    const optOutProb = 1 - endorseProb;

    const betaCost = coefs.costPerThousand || 0;
    let wtpConfig = null;
    if (betaCost !== 0) {
        wtpConfig = -1000 * nonCostUtility / betaCost;
    }

    return {
        nonCostUtility,
        costUtil,
        deltaV,
        endorseProb,
        optOutProb,
        wtpConfig
    };
}

/* ===========================
   Cost calculations
   =========================== */

function getProgrammeDurationMonths(tier) {
    if (tier === "intermediate") return 12;
    if (tier === "advanced") return 24;
    return 3;
}

/**
 * Prefer external cost_config.json if present.
 * If available, derive direct shares and opportunity cost rate
 * from absolute component amounts.
 */
function getCurrentCostTemplate(tier) {
    let chosenId = state.currentCostSourceId || null;

    // Prefer external JSON configuration
    if (COST_CONFIG && COST_CONFIG[tier]) {
        const tierConfig = COST_CONFIG[tier];
        const ids = Object.keys(tierConfig);
        if (ids.length) {
            if (!chosenId || !tierConfig[chosenId]) {
                chosenId = ids[0];
                state.currentCostSourceId = chosenId;
            }
            const src = tierConfig[chosenId];

            const allComponents = src.components || [];
            const nonOpp = allComponents.filter(c => !c.isOpportunityCost);
            const opp = allComponents.filter(c => c.isOpportunityCost);

            const totalNonOpp = nonOpp.reduce((sum, c) => sum + (c.amountTotal || 0), 0);
            const totalOpp = opp.reduce((sum, c) => sum + (c.amountTotal || 0), 0);

            const oppRate = totalNonOpp > 0 ? totalOpp / totalNonOpp : 0;

            const components = nonOpp.map((c, idx) => {
                const share = totalNonOpp > 0 ? (c.amountTotal || 0) / totalNonOpp : 0;
                const labelParts = [];
                if (c.major) labelParts.push(c.major);
                if (c.category) labelParts.push(c.category);
                if (c.subCategory) labelParts.push(c.subCategory);
                const labelBase = labelParts.length ? labelParts.join(" / ") : `Cost component ${idx + 1}`;
                const label = c.label || labelBase;
                return {
                    id: c.id || `comp_${idx}`,
                    label,
                    directShare: share,
                    major: c.major || "",
                    category: c.category || "",
                    subCategory: c.subCategory || "",
                    description: c.description || ""
                };
            });

            return {
                id: src.id || chosenId,
                label: src.label || chosenId,
                description: src.description || "",
                oppRate,
                components
            };
        }
    }

    // Fallback: legacy stylised templates
    const templatesForTier = COST_TEMPLATES[tier] || {};
    const availableIds = Object.keys(templatesForTier);
    if (!availableIds.length) return null;

    if (!chosenId || !templatesForTier[chosenId]) {
        chosenId = availableIds[0];
        state.currentCostSourceId = chosenId;
    }
    return templatesForTier[chosenId];
}

function computeCosts(cfg) {
    const durationMonths = getProgrammeDurationMonths(cfg.tier);
    const programmeCostPerCohort = cfg.costPerTraineePerMonth * cfg.traineesPerCohort * durationMonths;

    const template = getCurrentCostTemplate(cfg.tier);
    if (!template) {
        const opportunityCostPerCohort = 0;
        const totalEconomicCostPerCohort = programmeCostPerCohort;
        return {
            durationMonths,
            programmeCostPerCohort,
            opportunityCostPerCohort,
            totalEconomicCostPerCohort,
            components: []
        };
    }

    const oppRate = template.oppRate || 0;
    const directCostPerCohort = programmeCostPerCohort;
    const opportunityCostPerCohort = state.includeOpportunityCost ? directCostPerCohort * oppRate : 0;
    const totalEconomicCostPerCohort = directCostPerCohort + opportunityCostPerCohort;

    const components = (template.components || []).map(comp => {
        const compAmountPerCohort = directCostPerCohort * (comp.directShare || 0);
        const amountPerTraineePerMonth = durationMonths > 0 && cfg.traineesPerCohort > 0
            ? compAmountPerCohort / (durationMonths * cfg.traineesPerCohort)
            : 0;
        return {
            id: comp.id,
            label: comp.label,
            share: comp.directShare || 0,
            amountPerCohort: compAmountPerCohort,
            amountPerTraineePerMonth,
            major: comp.major || "",
            category: comp.category || "",
            subCategory: comp.subCategory || "",
            description: comp.description || ""
        };
    });

    return {
        durationMonths,
        programmeCostPerCohort: directCostPerCohort,
        opportunityCostPerCohort,
        totalEconomicCostPerCohort,
        components
    };
}

/* ===========================
   Epidemiological calculations
   =========================== */

function computeEpi(cfg, endorseProb) {
    const tierConfig = state.epiSettings.tiers[cfg.tier];
    if (!tierConfig) {
        return {
            graduatesAllCohorts: 0,
            outbreaksPerYearAllCohorts: 0,
            totalBenefitAllCohorts: 0,
            benefitPerCohort: 0
        };
    }

    const horizon = state.epiSettings.general.planningHorizonYears || 5;
    const gradShare = tierConfig.gradShare || 0;
    const outbreaksPerCohortYear = tierConfig.outbreaksPerCohortPerYear || 0;
    const valuePerGrad = tierConfig.valuePerGraduate || 0;
    const valuePerOutbreak = tierConfig.valuePerOutbreak || 0;

    const totalTrainees = cfg.traineesPerCohort * cfg.numberOfCohorts;

    const graduatesAllCohorts = totalTrainees * gradShare * endorseProb;
    const outbreaksPerYearAllCohorts = cfg.numberOfCohorts * outbreaksPerCohortYear * endorseProb;

    const benefitGraduates = graduatesAllCohorts * valuePerGrad;
    const benefitOutbreaks = outbreaksPerYearAllCohorts * horizon * valuePerOutbreak;
    const totalBenefitAllCohorts = benefitGraduates + benefitOutbreaks;

    const benefitPerCohort = cfg.numberOfCohorts > 0
        ? totalBenefitAllCohorts / cfg.numberOfCohorts
        : 0;

    return {
        graduatesAllCohorts,
        outbreaksPerYearAllCohorts,
        totalBenefitAllCohorts,
        benefitPerCohort
    };
}

/* ===========================
   Combined results
   =========================== */

function computeFullResults(cfg) {
    const util = computeEndorsementAndWtp(cfg, state.model);
    const costs = computeCosts(cfg);
    const epi = computeEpi(cfg, util.endorseProb);

    const totalCostAllCohorts = costs.totalEconomicCostPerCohort * cfg.numberOfCohorts;
    const totalBenefitAllCohorts = epi.totalBenefitAllCohorts;
    const netBenefitAllCohorts = totalBenefitAllCohorts - totalCostAllCohorts;

    const bcr = totalCostAllCohorts > 0 ? totalBenefitAllCohorts / totalCostAllCohorts : null;

    return {
        cfg,
        util,
        costs,
        epi,
        totalCostAllCohorts,
        totalBenefitAllCohorts,
        netBenefitAllCohorts,
        bcr
    };
}

/* ===========================
   DOM helpers
   =========================== */

function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
}

function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;

    toast.classList.remove("toast-success", "toast-warning", "toast-error", "hidden");
    if (type === "success") toast.classList.add("toast-success");
    if (type === "warning") toast.classList.add("toast-warning");
    if (type === "error") toast.classList.add("toast-error");

    toast.classList.add("show");

    if (showToast._timeoutId) {
        clearTimeout(showToast._timeoutId);
    }

    showToast._timeoutId = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

/* ===========================
   Tabs
   =========================== */

function setupTabs() {
    const tabLinks = document.querySelectorAll(".tab-link");
    tabLinks.forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.getAttribute("data-tab");
            if (!tab) return;
            tabLinks.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".tab-panel").forEach(panel => {
                panel.classList.remove("active");
            });
            const panel = document.getElementById(`tab-${tab}`);
            if (panel) panel.classList.add("active");
        });
    });
}

/* ===========================
   Info tooltips
   =========================== */

let activeTooltip = null;
let activeTooltipIcon = null;

function hideTooltip() {
    if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
        activeTooltipIcon = null;
    }
}

function showTooltipForIcon(icon) {
    if (!icon) return;
    const text = icon.dataset.tooltip || icon.getAttribute("aria-label") || "";
    if (!text) return;

    hideTooltip();

    const bubble = document.createElement("div");
    bubble.className = "tooltip-bubble";
    bubble.innerHTML = `<p>${text}</p>`;
    document.body.appendChild(bubble);

    const rect = icon.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);

    if (left < 8) left = 8;
    if (left + bubbleRect.width > window.innerWidth - 8) {
        left = window.innerWidth - bubbleRect.width - 8;
    }

    if (top + bubbleRect.height > window.innerHeight - 8) {
        top = rect.top - bubbleRect.height - 8;
    }

    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;

    const arrow = document.createElement("div");
    arrow.className = "tooltip-arrow";
    arrow.style.bottom = "-4px";
    arrow.style.left = "calc(50% - 4px)";
    bubble.appendChild(arrow);

    activeTooltip = bubble;
    activeTooltipIcon = icon;
}

function setupInfoTooltips() {
    const icons = document.querySelectorAll(".info-icon");
    icons.forEach(icon => {
        const title = icon.getAttribute("title");
        if (title) {
            icon.dataset.tooltip = title;
            icon.removeAttribute("title");
        }
        icon.setAttribute("tabindex", "0");
        icon.setAttribute("role", "button");
        icon.setAttribute("aria-label", icon.dataset.tooltip || "More information");

        icon.addEventListener("mouseenter", () => showTooltipForIcon(icon));
        icon.addEventListener("mouseleave", () => hideTooltip());
        icon.addEventListener("focus", () => showTooltipForIcon(icon));
        icon.addEventListener("blur", () => hideTooltip());
        icon.addEventListener("click", (e) => {
            e.stopPropagation();
            if (activeTooltipIcon === icon) {
                hideTooltip();
            } else {
                showTooltipForIcon(icon);
            }
        });
        icon.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (activeTooltipIcon === icon) {
                    hideTooltip();
                } else {
                    showTooltipForIcon(icon);
                }
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (activeTooltip && !e.target.closest(".info-icon")) {
            hideTooltip();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            hideTooltip();
        }
    });
}

/* ===========================
   Cost template UI
   =========================== */

function populateCostSourceOptions(tier) {
    const select = document.getElementById("cost-source");
    if (!select) return;

    let sourcesForTier = null;

    if (COST_CONFIG && COST_CONFIG[tier]) {
        sourcesForTier = COST_CONFIG[tier];
    } else {
        sourcesForTier = COST_TEMPLATES[tier] || {};
    }

    const ids = Object.keys(sourcesForTier);

    select.innerHTML = "";

    if (!ids.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No templates available";
        select.appendChild(opt);
        state.currentCostSourceId = null;
        return;
    }

    if (!state.currentCostSourceId || !sourcesForTier[state.currentCostSourceId]) {
        state.currentCostSourceId = ids[0];
    }

    ids.forEach(id => {
        const tpl = sourcesForTier[id];
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = tpl.label || id;
        select.appendChild(opt);
    });

    select.value = state.currentCostSourceId;

    if (!select.dataset.bound) {
        select.addEventListener("change", () => {
            state.currentCostSourceId = select.value;
            const cfg = readConfigurationFromInputs();
            const results = computeFullResults(cfg);
            state.lastResults = results;
            updateCostingTab(results);
            updateResultsTab(results);
            updateNationalSimulation(results);
            updateConfigSummary(results);
        });
        select.dataset.bound = "1";
    }
}

/* ===========================
   Results and summaries
   =========================== */

function updateConfigSummary(results) {
    const container = document.getElementById("config-summary");
    if (!container) return;
    const { cfg, util } = results;
    const endorsementPercent = util.endorseProb * 100;

    const tierLabelMap = {
        frontline: "Frontline (3 months)",
        intermediate: "Intermediate (12 months)",
        advanced: "Advanced (24 months)"
    };

    const careerLabelMap = {
        certificate: "Government and partner certificate",
        uniqual: "University qualification",
        career_path: "Government career pathway"
    };

    const mentorshipLabelMap = {
        low: "Low mentorship",
        medium: "Medium mentorship",
        high: "High mentorship"
    };

    const deliveryLabelMap = {
        blended: "Blended delivery",
        inperson: "Fully in person delivery",
        online: "Fully online delivery"
    };

    const responseLabelMap = {
        30: "Detect and respond within 30 days",
        15: "Detect and respond within 15 days",
        7: "Detect and respond within 7 days"
    };

    const modelLabel = state.model === "lc2"
        ? "Supportive group (latent class)"
        : "Average mixed logit";

    const tierLabel = tierLabelMap[cfg.tier] || cfg.tier;
    const careerLabel = careerLabelMap[cfg.career] || cfg.career;
    const mentorLabel = mentorshipLabelMap[cfg.mentorship] || cfg.mentorship;
    const deliveryLabel = deliveryLabelMap[cfg.delivery] || cfg.delivery;
    const responseLabel = responseLabelMap[cfg.response] || `${cfg.response} days`;

    const template = getCurrentCostTemplate(cfg.tier);
    const templateLabel = template ? template.label : "No template selected";

    const lines = [
        {
            label: "Programme tier",
            value: tierLabel
        },
        {
            label: "Career incentive",
            value: careerLabel
        },
        {
            label: "Mentorship intensity",
            value: mentorLabel
        },
        {
            label: "Delivery mode",
            value: deliveryLabel
        },
        {
            label: "Expected response time for events",
            value: responseLabel
        },
        {
            label: "Preference model",
            value: modelLabel
        },
        {
            label: "Trainees per cohort",
            value: formatNumber(cfg.traineesPerCohort, 0)
        },
        {
            label: "Number of cohorts",
            value: formatNumber(cfg.numberOfCohorts, 0)
        },
        {
            label: "Cost per trainee per month",
            value: formatCurrency(cfg.costPerTraineePerMonth, state.currency)
        },
        {
            label: "Cost template",
            value: templateLabel
        }
    ];

    container.innerHTML = lines.map(row => `
        <div class="config-summary-row">
            <div class="config-summary-label">${row.label}</div>
            <div class="config-summary-value">${row.value}</div>
        </div>
    `).join("");

    const endorsementValueEl = document.getElementById("config-endorsement-value");
    if (endorsementValueEl) {
        endorsementValueEl.textContent = formatPercent(endorsementPercent, 1);
    }

    // FIX: support either headline-status-pill or headline-status-tag
    const headlineStatusEl =
        document.getElementById("headline-status-pill") ||
        document.getElementById("headline-status-tag");
    const headlineTextEl = document.getElementById("headline-recommendation");
    const briefingEl = document.getElementById("headline-briefing-text");

    const resultsForHeadline = buildHeadlineText(results);

    if (headlineStatusEl) {
        headlineStatusEl.className = "status-pill " + resultsForHeadline.statusClass;
        headlineStatusEl.textContent = resultsForHeadline.statusLabel;
    }
    if (headlineTextEl) {
        headlineTextEl.textContent = resultsForHeadline.headline;
    }
    if (briefingEl) {
        briefingEl.textContent = resultsForHeadline.briefing;
    }
}

function buildHeadlineText(results) {
    const { cfg, util, bcr, epi, totalCostAllCohorts, totalBenefitAllCohorts } = results;
    const endorsement = util.endorseProb * 100;

    let statusClass = "status-neutral";
    let statusLabel = "Scenario not yet classified";
    let headline = "Apply a configuration to see an interpreted recommendation.";
    let briefing = "Once you apply a configuration, this box will summarise endorsement, costs and benefits in plain language for use in business case documents.";

    if (totalCostAllCohorts <= 0 || !isFinite(totalCostAllCohorts)) {
        return { statusClass, statusLabel, headline, briefing };
    }

    const bcrValue = bcr !== null && isFinite(bcr) ? bcr : 0;

    if (bcrValue >= 1.2 && endorsement >= 70) {
        statusClass = "status-good";
        statusLabel = "High impact and good value";
        headline = "This configuration appears attractive, combining strong endorsement with a benefit cost ratio above one.";
        briefing = "Estimated endorsement is around " +
            formatPercent(endorsement, 1) +
            " and the benefit cost ratio is " +
            (bcrValue ? bcrValue.toFixed(2) : "N/A") +
            ". National scale up is likely to deliver positive net benefits, subject to budget and implementation feasibility.";
    } else if (bcrValue >= 1 && endorsement >= 50) {
        statusClass = "status-warning";
        statusLabel = "Moderate impact and acceptable value";
        headline = "This configuration has positive net benefits and moderate endorsement.";
        briefing = "Estimated endorsement is around " +
            formatPercent(endorsement, 1) +
            " and the benefit cost ratio is close to one. It may be suitable for targeted scale up or as part of a mixed portfolio, especially if budgets are constrained.";
    } else if (bcrValue >= 1 && endorsement < 50) {
        statusClass = "status-warning";
        statusLabel = "Positive value but limited support";
        headline = "Net benefits are positive but endorsement is limited.";
        briefing = "The benefit cost ratio is above one but only about " +
            formatPercent(endorsement, 1) +
            " of stakeholders are predicted to endorse this option. Consider adjustments to career incentives, mentorship or cost before committing to large scale implementation.";
    } else if (bcrValue < 1) {
        statusClass = "status-poor";
        statusLabel = "Low value for money";
        headline = "This configuration does not appear cost effective under current assumptions.";
        briefing = "The benefit cost ratio is below one and net benefits are negative. Before moving forward, consider options to reduce costs or redesign the programme. It may be better used as a comparator or for local pilots rather than national scale up.";
    }

    const graduatesText = formatNumber(epi.graduatesAllCohorts, 0);
    const outbreaksText = formatNumber(epi.outbreaksPerYearAllCohorts, 1);
    const totalCostText = formatCurrency(totalCostAllCohorts, state.currency);
    const totalBenefitText = formatCurrency(totalBenefitAllCohorts, state.currency);

    briefing += " Under these assumptions, the configuration would generate roughly " +
        graduatesText + " graduates, support about " + outbreaksText +
        " outbreak responses per year over the planning horizon, and involve total economic costs of " +
        totalCostText + " for indicative benefits of " + totalBenefitText + ".";

    return { statusClass, statusLabel, headline, briefing };
}

function updateResultsTab(results) {
    const { util, costs, epi, totalCostAllCohorts, netBenefitAllCohorts, bcr } = results;
    const endorsePercent = util.endorseProb * 100;
    const optOutPercent = util.optOutProb * 100;

    setText("endorsement-rate", formatPercent(endorsePercent, 1));
    setText("optout-rate", formatPercent(optOutPercent, 1));

    setText("total-cost", formatCurrency(costs.totalEconomicCostPerCohort, state.currency));
    setText("net-benefit", formatCurrency(netBenefitAllCohorts / (results.cfg.numberOfCohorts || 1), state.currency));
    setText("bcr", (bcr !== null && isFinite(bcr)) ? bcr.toFixed(2) : "-");

    setText("epi-graduates", formatNumber(epi.graduatesAllCohorts, 0));
    setText("epi-outbreaks", formatNumber(epi.outbreaksPerYearAllCohorts, 1));
    setText("epi-benefit", formatCurrency(epi.benefitPerCohort, state.currency));

    if (document.getElementById("wtp-config")) {
        const wtp = util.wtpConfig;
        setText("wtp-config", wtp !== null && isFinite(wtp)
            ? formatCurrency(wtp, state.currency)
            : "-");
    }

    updateResultCharts(results);
}

function updateCostingTab(results) {
    const { cfg, costs } = results;
    const template = getCurrentCostTemplate(cfg.tier);

    const summary = document.getElementById("cost-breakdown-summary");
    const list = document.getElementById("cost-components-list");
    const templateDescrEl = document.getElementById("cost-template-description");

    if (!summary || !list) return;

    const economicCost = costs.totalEconomicCostPerCohort;
    const oppCost = costs.opportunityCostPerCohort;
    const directCost = costs.programmeCostPerCohort;

    summary.innerHTML = `
        <div class="cost-summary-card">
            <div class="cost-summary-label">Programme cost per cohort</div>
            <div class="cost-summary-value">${formatCurrency(directCost, state.currency)}</div>
        </div>
        <div class="cost-summary-card">
            <div class="cost-summary-label">Opportunity cost per cohort</div>
            <div class="cost-summary-value">${formatCurrency(oppCost, state.currency)}</div>
        </div>
        <div class="cost-summary-card">
            <div class="cost-summary-label">Total economic cost per cohort</div>
            <div class="cost-summary-value">${formatCurrency(economicCost, state.currency)}</div>
        </div>
    `;

    if (templateDescrEl) {
        templateDescrEl.textContent = template && template.description ? template.description : "";
    }

    const componentsRows = (costs.components || []).map(comp => {
        const sharePercent = comp.share * 100;

        const metaParts = [];
        if (comp.major) metaParts.push(comp.major);
        if (comp.category) metaParts.push(comp.category);
        if (comp.subCategory) metaParts.push(comp.subCategory);
        const metaText = metaParts.join(" / ");
        const metaBlock = metaText ? `<div class="cost-component-meta">${metaText}</div>` : "";

        const notesText = comp.description || "";

        return `
            <tr>
                <td>
                    <div class="cost-component-name">${comp.label}</div>
                    ${metaBlock}
                </td>
                <td>${sharePercent.toFixed(1)} %</td>
                <td>${formatCurrency(comp.amountPerCohort, state.currency)}</td>
                <td>${formatCurrency(comp.amountPerTraineePerMonth, state.currency)}</td>
                <td>${notesText}</td>
            </tr>
        `;
    }).join("");

    const oppRow = `
        <tr>
            <td>Opportunity cost of trainee time</td>
            <td>${template && typeof template.oppRate === "number"
                ? (template.oppRate * 100).toFixed(1) + " %"
                : "-"}</td>
            <td>${formatCurrency(oppCost, state.currency)}</td>
            <td>-</td>
            <td>Included when the opportunity cost toggle is on.</td>
        </tr>
    `;

    list.innerHTML = componentsRows + oppRow;
}

function updateNationalSimulation(results) {
    const { epi, totalCostAllCohorts, totalBenefitAllCohorts, netBenefitAllCohorts, bcr } = results;

    setText("nat-total-cost", formatCurrency(totalCostAllCohorts, state.currency));
    setText("nat-total-benefit", formatCurrency(totalBenefitAllCohorts, state.currency));
    setText("nat-net-benefit", formatCurrency(netBenefitAllCohorts, state.currency));
    setText("nat-bcr", (bcr !== null && isFinite(bcr)) ? bcr.toFixed(2) : "-");

    setText("nat-graduates", formatNumber(epi.graduatesAllCohorts, 0));
    setText("nat-outbreaks", formatNumber(epi.outbreaksPerYearAllCohorts, 1));

    updateNationalCharts(results);
}

/* ===========================
   Charts with Chart.js
   =========================== */

function safeDestroyChart(chart) {
    if (chart && typeof chart.destroy === "function") {
        chart.destroy();
    }
}

function updateResultCharts(results) {
    const { util, costs, epi } = results;
    const endorsePercent = util.endorseProb * 100;
    const optPercent = util.optOutProb * 100;

    if (window.Chart) {
        const uptakeCtx = document.getElementById("chart-uptake");
        if (uptakeCtx) {
            safeDestroyChart(state.charts.uptake);
            state.charts.uptake = new Chart(uptakeCtx, {
                type: "doughnut",
                data: {
                    labels: ["Endorse FETP option", "Choose opt out"],
                    datasets: [{
                        data: [endorsePercent, optPercent],
                        backgroundColor: ["#1D4F91", "#9CA3AF"]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: "bottom" },
                        tooltip: { enabled: true }
                    },
                    cutout: "55%"
                }
            });
        }

        const bcrCtx = document.getElementById("chart-bcr");
        if (bcrCtx) {
            safeDestroyChart(state.charts.bcr);
            const economicCost = costs.totalEconomicCostPerCohort;
            const epiBenefit = epi.benefitPerCohort;
            state.charts.bcr = new Chart(bcrCtx, {
                type: "bar",
                data: {
                    labels: ["Per cohort"],
                    datasets: [
                        {
                            label: "Economic cost",
                            data: [economicCost],
                            backgroundColor: "#1D4F91"
                        },
                        {
                            label: "Indicative benefit",
                            data: [epiBenefit],
                            backgroundColor: "#0F766E"
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: "bottom" },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    return `${ctx.dataset.label}: ${formatCurrencyInr(ctx.parsed.y, 0)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => formatCurrencyInr(value, 0)
                            }
                        }
                    }
                }
            });
        }

        const epiCtx = document.getElementById("chart-epi");
        if (epiCtx) {
            safeDestroyChart(state.charts.epi);
            state.charts.epi = new Chart(epiCtx, {
                type: "bar",
                data: {
                    labels: ["Graduates", "Outbreak responses per year"],
                    datasets: [{
                        label: "Epidemiological outputs",
                        data: [epi.graduatesAllCohorts, epi.outbreaksPerYearAllCohorts],
                        backgroundColor: ["#1D4F91", "#0F766E"]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => formatNumber(value, 0)
                            }
                        }
                    }
                }
            });
        }
    }
}

function updateNationalCharts(currentResults) {
    if (!window.Chart) return;

    const scenarios = state.scenarios || [];
    const allScenarios = [];

    const currentLabel = currentResults.cfg.scenarioName || "Current configuration";
    allScenarios.push({
        label: currentLabel,
        totalCost: currentResults.totalCostAllCohorts,
        totalBenefit: currentResults.totalBenefitAllCohorts,
        graduates: currentResults.epi.graduatesAllCohorts,
        outbreaks: currentResults.epi.outbreaksPerYearAllCohorts,
        bcr: currentResults.bcr
    });

    scenarios.forEach(s => {
        allScenarios.push({
            label: s.name || `Scenario ${s.id}`,
            totalCost: s.totalCostAllCohorts,
            totalBenefit: s.totalBenefitAllCohorts,
            graduates: s.graduatesAllCohorts,
            outbreaks: s.outbreaksPerYearAllCohorts,
            bcr: s.bcr
        });
    });

    const labels = allScenarios.map(s => s.label);
    const costs = allScenarios.map(s => s.totalCost);
    const benefits = allScenarios.map(s => s.totalBenefit);
    const grads = allScenarios.map(s => s.graduates);
    const outbreaks = allScenarios.map(s => s.outbreaks);
    const bcrs = allScenarios.map(s => (s.bcr !== null && isFinite(s.bcr)) ? s.bcr : 0);

    const natCostCtx = document.getElementById("chart-nat-cost-benefit");
    if (natCostCtx) {
        safeDestroyChart(state.charts.natCostBenefit);
        state.charts.natCostBenefit = new Chart(natCostCtx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Total economic cost (all cohorts)",
                        data: costs,
                        backgroundColor: "#1D4F91"
                    },
                    {
                        label: "Total indicative benefit (all cohorts)",
                        data: benefits,
                        backgroundColor: "#0F766E"
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                return `${ctx.dataset.label}: ${formatCurrencyInr(ctx.parsed.y, 0)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrencyInr(value, 0)
                        }
                    }
                }
            }
        });
    }

    const natGradCtx = document.getElementById("chart-nat-grad-outbreak");
    if (natGradCtx) {
        safeDestroyChart(state.charts.natGradOutbreak);
        state.charts.natGradOutbreak = new Chart(natGradCtx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Total FETP graduates",
                        data: grads,
                        backgroundColor: "#1D4F91"
                    },
                    {
                        label: "Outbreak responses supported per year",
                        data: outbreaks,
                        backgroundColor: "#0F766E"
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y, 0)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatNumber(value, 0)
                        }
                    }
                }
            }
        });
    }

    const natBcrCtx = document.getElementById("chart-nat-bcr");
    if (natBcrCtx) {
        safeDestroyChart(state.charts.natBcr);
        state.charts.natBcr = new Chart(natBcrCtx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Benefit cost ratio",
                    data: bcrs,
                    backgroundColor: "#1D4F91"
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

/* ===========================
   Advanced settings and assumption log
   =========================== */

function loadEpiConfigIfPresent() {
    fetch("epi_config.json")
        .then(resp => {
            if (!resp.ok) throw new Error("No external epi_config.json");
            return resp.json();
        })
        .then(json => {
            state.epiSettings = json;
            populateAdvancedSettingsInputs();
            updateAssumptionLog(readConfigurationFromInputs());
        })
        .catch(() => {
            state.epiSettings = JSON.parse(JSON.stringify(DEFAULT_EPI_SETTINGS));
            populateAdvancedSettingsInputs();
            updateAssumptionLog(readConfigurationFromInputs());
        });
}

/**
 * Load full cost templates from cost_config.json if present.
 */
function loadCostConfigIfPresent() {
    fetch("cost_config.json")
        .then(resp => {
            if (!resp.ok) throw new Error("No external cost_config.json");
            return resp.json();
        })
        .then(json => {
            COST_CONFIG = json;
            const cfg = readConfigurationFromInputs();
            populateCostSourceOptions(cfg.tier);
            const results = computeFullResults(cfg);
            state.lastResults = results;
            updateConfigSummary(results);
            updateResultsTab(results);
            updateCostingTab(results);
            updateNationalSimulation(results);
        })
        .catch(() => {
            COST_CONFIG = null;
        });
}

function populateAdvancedSettingsInputs() {
    const s = state.epiSettings;

    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el && typeof value !== "undefined") el.value = value;
    };

    setVal("adv-inr-per-usd", s.general.inrPerUsd);

    setVal("adv-frontline-grads", s.tiers.frontline.gradShare);
    setVal("adv-frontline-outbreaks", s.tiers.frontline.outbreaksPerCohortPerYear);
    setVal("adv-frontline-vgrad", s.tiers.frontline.valuePerGraduate);
    setVal("adv-frontline-voutbreak", s.tiers.frontline.valuePerOutbreak);

    setVal("adv-intermediate-grads", s.tiers.intermediate.gradShare);
    setVal("adv-intermediate-outbreaks", s.tiers.intermediate.outbreaksPerCohortPerYear);
    setVal("adv-intermediate-vgrad", s.tiers.intermediate.valuePerGraduate);
    setVal("adv-intermediate-voutbreak", s.tiers.intermediate.valuePerOutbreak);

    setVal("adv-advanced-grads", s.tiers.advanced.gradShare);
    setVal("adv-advanced-outbreaks", s.tiers.advanced.outbreaksPerCohortPerYear);
    setVal("adv-advanced-vgrad", s.tiers.advanced.valuePerGraduate);
    setVal("adv-advanced-voutbreak", s.tiers.advanced.valuePerOutbreak);
}

function applyAdvancedSettings() {
    const getNum = (id, fallback) => {
        const el = document.getElementById(id);
        if (!el) return fallback;
        const v = parseFloat(el.value);
        return isNaN(v) ? fallback : v;
    };

    const s = state.epiSettings;

    s.general.inrPerUsd = getNum("adv-inr-per-usd", s.general.inrPerUsd);

    s.tiers.frontline.gradShare = getNum("adv-frontline-grads", s.tiers.frontline.gradShare);
    s.tiers.frontline.outbreaksPerCohortPerYear = getNum("adv-frontline-outbreaks", s.tiers.frontline.outbreaksPerCohortPerYear);
    s.tiers.frontline.valuePerGraduate = getNum("adv-frontline-vgrad", s.tiers.frontline.valuePerGraduate);
    s.tiers.frontline.valuePerOutbreak = getNum("adv-frontline-voutbreak", s.tiers.frontline.valuePerOutbreak);

    s.tiers.intermediate.gradShare = getNum("adv-intermediate-grads", s.tiers.intermediate.gradShare);
    s.tiers.intermediate.outbreaksPerCohortPerYear = getNum("adv-intermediate-outbreaks", s.tiers.intermediate.outbreaksPerCohortPerYear);
    s.tiers.intermediate.valuePerGraduate = getNum("adv-intermediate-vgrad", s.tiers.intermediate.valuePerGraduate);
    s.tiers.intermediate.valuePerOutbreak = getNum("adv-intermediate-voutbreak", s.tiers.intermediate.valuePerOutbreak);

    s.tiers.advanced.gradShare = getNum("adv-advanced-grads", s.tiers.advanced.gradShare);
    s.tiers.advanced.outbreaksPerCohortPerYear = getNum("adv-advanced-outbreaks", s.tiers.advanced.outbreaksPerCohortPerYear);
    s.tiers.advanced.valuePerGraduate = getNum("adv-advanced-vgrad", s.tiers.advanced.valuePerGraduate);
    s.tiers.advanced.valuePerOutbreak = getNum("adv-advanced-voutbreak", s.tiers.advanced.valuePerOutbreak);

    const cfg = readConfigurationFromInputs();
    const results = computeFullResults(cfg);
    state.lastResults = results;
    updateConfigSummary(results);
    updateResultsTab(results);
    updateCostingTab(results);
    updateNationalSimulation(results);
    updateAssumptionLog(cfg);
    showToast("Advanced settings applied to current calculations.", "success");
}

function resetAdvancedSettings() {
    state.epiSettings = JSON.parse(JSON.stringify(DEFAULT_EPI_SETTINGS));
    populateAdvancedSettingsInputs();
    const cfg = readConfigurationFromInputs();
    const results = computeFullResults(cfg);
    state.lastResults = results;
    updateConfigSummary(results);
    updateResultsTab(results);
    updateCostingTab(results);
    updateNationalSimulation(results);
    updateAssumptionLog(cfg);
    showToast("Advanced settings reset to default values.", "success");
}

function updateAssumptionLog(cfg) {
    const el = document.getElementById("assumption-log-text");
    if (!el) return;

    const s = state.epiSettings;
    const nowIso = new Date().toISOString();

    const logLines = [
        `STEPS assumption log - ${nowIso}`,
        "",
        `Planning horizon (years): ${s.general.planningHorizonYears}`,
        "",
        "Outbreak responses per graduate per year by tier:",
        `  Frontline:     ${s.tiers.frontline.outbreaksPerCohortPerYear}`,
        `  Intermediate:  ${s.tiers.intermediate.outbreaksPerCohortPerYear}`,
        `  Advanced:      ${s.tiers.advanced.outbreaksPerCohortPerYear}`,
        "",
        "Graduates per cohort as share of trainees by tier:",
        `  Frontline:     ${s.tiers.frontline.gradShare}`,
        `  Intermediate:  ${s.tiers.intermediate.gradShare}`,
        `  Advanced:      ${s.tiers.advanced.gradShare}`,
        "",
        "Indicative monetary values (INR):",
        `  Frontline graduate:      ${s.tiers.frontline.valuePerGraduate}`,
        `  Frontline outbreak:      ${s.tiers.frontline.valuePerOutbreak}`,
        `  Intermediate graduate:   ${s.tiers.intermediate.valuePerGraduate}`,
        `  Intermediate outbreak:   ${s.tiers.intermediate.valuePerOutbreak}`,
        `  Advanced graduate:       ${s.tiers.advanced.valuePerGraduate}`,
        `  Advanced outbreak:       ${s.tiers.advanced.valuePerOutbreak}`,
        "",
        `Exchange rate (INR per USD): ${s.general.inrPerUsd}`,
        "",
        "Current configuration snapshot:",
        `  Programme tier:           ${cfg.tier}`,
        `  Mentorship intensity:     ${cfg.mentorship}`,
        `  Delivery mode:            ${cfg.delivery}`,
        `  Response time:            ${cfg.response} days`,
        `  Trainees per cohort:      ${cfg.traineesPerCohort}`,
        `  Number of cohorts:        ${cfg.numberOfCohorts}`,
        `  Cost per trainee per month: ${cfg.costPerTraineePerMonth}`,
        `  Preference model:         ${state.model}`
    ];

    el.textContent = logLines.join("\n");
}

/* ===========================
   Scenario saving and table
   =========================== */

function saveScenarioFromCurrentResults() {
    if (!state.lastResults) {
        const cfg = readConfigurationFromInputs();
        state.lastResults = computeFullResults(cfg);
    }

    const r = state.lastResults;
    const cfg = r.cfg;

    const id = Date.now();
    const name = cfg.scenarioName || `Scenario ${state.scenarios.length + 1}`;
    const notes = cfg.scenarioNotes || "";

    const scenario = {
        id,
        name,
        notes,
        tier: cfg.tier,
        career: cfg.career,
        mentorship: cfg.mentorship,
        delivery: cfg.delivery,
        response: cfg.response,
        costPerTraineePerMonth: cfg.costPerTraineePerMonth,
        traineesPerCohort: cfg.traineesPerCohort,
        numberOfCohorts: cfg.numberOfCohorts,
        model: state.model,
        endorsementRate: r.util.endorseProb * 100,
        optOutRate: r.util.optOutProb * 100,
        wtpConfig: r.util.wtpConfig,
        perCohortEconomicCost: r.costs.totalEconomicCostPerCohort,
        perCohortBenefit: r.epi.benefitPerCohort,
        bcr: r.bcr,
        perCohortNetBenefit: r.netBenefitAllCohorts / (cfg.numberOfCohorts || 1),
        graduatesAllCohorts: r.epi.graduatesAllCohorts,
        outbreaksPerYearAllCohorts: r.epi.outbreaksPerYearAllCohorts,
        totalCostAllCohorts: r.totalCostAllCohorts,
        totalBenefitAllCohorts: r.totalBenefitAllCohorts,
        totalNetBenefitAllCohorts: r.netBenefitAllCohorts
    };

    // If a scenario with the same name exists, update it; otherwise add a new one
    const existingIndex = state.scenarios.findIndex(s => s.name === name);
    if (existingIndex !== -1) {
        state.scenarios[existingIndex] = scenario;
    } else {
        state.scenarios.push(scenario);
    }

    try {
        window.localStorage.setItem("stepsScenarios", JSON.stringify(state.scenarios));
    } catch (e) {
        // ignore
    }

    renderScenarioTable();
    showToast("Scenario saved to portfolio.", "success");
    updateNationalCharts(state.lastResults);
}

function renderScenarioTable() {
    const tbody = document.querySelector("#scenario-table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    state.scenarios.forEach(s => {
        const tr = document.createElement("tr");

        const programmeTierLabel = {
            frontline: "Frontline (3 months)",
            intermediate: "Intermediate (12 months)",
            advanced: "Advanced (24 months)"
        }[s.tier] || s.tier;

        const mentorshipLabel = {
            low: "Low mentorship",
            medium: "Medium mentorship",
            high: "High mentorship"
        }[s.mentorship] || s.mentorship;

        const responseLabel = {
            30: "Within 30 days",
            15: "Within 15 days",
            7: "Within 7 days"
        }[s.response] || `${s.response} days`;

        const modelLabel = s.model === "lc2"
            ? "Supportive group (latent class)"
            : "Average mixed logit";

        const endorsementStr = s.endorsementRate !== null && isFinite(s.endorsementRate)
            ? formatPercent(s.endorsementRate, 1)
            : "-";

        tr.innerHTML = `
            <td>${s.name}</td>
            <td>${programmeTierLabel}</td>
            <td>${mentorshipLabel}</td>
            <td>${responseLabel}</td>
            <td>${formatNumber(s.numberOfCohorts, 0)}</td>
            <td>${formatNumber(s.traineesPerCohort, 0)}</td>
            <td>${formatCurrency(s.costPerTraineePerMonth, state.currency)}</td>
            <td>${modelLabel}</td>
            <td>${endorsementStr}</td>
            <td>${(s.bcr !== null && isFinite(s.bcr)) ? s.bcr.toFixed(2) : "-"}</td>
            <td>${formatCurrency(s.totalNetBenefitAllCohorts, state.currency)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function loadSavedScenarios() {
    try {
        const raw = window.localStorage.getItem("stepsScenarios");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                state.scenarios = parsed;
            }
        }
    } catch (e) {
        state.scenarios = [];
    }
    renderScenarioTable();
}

/* ===========================
   Excel and PDF export
   =========================== */

function exportScenariosToExcel() {
    if (!window.XLSX) {
        showToast("Excel export library not available.", "error");
        return;
    }

    if (!state.scenarios.length) {
        showToast("No scenarios saved yet.", "warning");
        return;
    }

    const header = [
        "Scenario name",
        "Programme tier",
        "Career incentive",
        "Mentorship intensity",
        "Delivery mode",
        "Response time",
        "Cost per trainee per month (INR)",
        "Trainees per cohort",
        "Number of cohorts",
        "Preference model",
        "Endorsement rate (%)",
        "Opt out rate (%)",
        "WTP per trainee per month (INR)",
        "Economic cost per cohort (INR)",
        "Benefit per cohort (INR)",
        "Benefit cost ratio",
        "Net benefit per cohort (INR)",
        "Total economic cost all cohorts (INR)",
        "Total benefit all cohorts (INR)",
        "Total net benefit all cohorts (INR)",
        "Graduates all cohorts",
        "Outbreak responses per year",
        "Notes"
    ];

    const rows = state.scenarios.map(s => {
        const tierLabel = {
            frontline: "Frontline (3 months)",
            intermediate: "Intermediate (12 months)",
            advanced: "Advanced (24 months)"
        }[s.tier] || s.tier;

        const careerLabel = {
            certificate: "Government and partner certificate",
            uniqual: "University qualification",
            career_path: "Government career pathway"
        }[s.career] || s.career;

        const mentorshipLabel = {
            low: "Low mentorship",
            medium: "Medium mentorship",
            high: "High mentorship"
        }[s.mentorship] || s.mentorship;

        const deliveryLabel = {
            blended: "Blended delivery",
            inperson: "Fully in person delivery",
            online: "Fully online delivery"
        }[s.delivery] || s.delivery;

        const responseLabel = {
            30: "Within 30 days",
            15: "Within 15 days",
            7: "Within 7 days"
        }[s.response] || `${s.response} days`;

        const modelLabel = s.model === "lc2"
            ? "Supportive group (latent class)"
            : "Average mixed logit";

        return [
            s.name,
            tierLabel,
            careerLabel,
            mentorshipLabel,
            deliveryLabel,
            responseLabel,
            s.costPerTraineePerMonth,
            s.traineesPerCohort,
            s.numberOfCohorts,
            modelLabel,
            s.endorsementRate,
            s.optOutRate,
            s.wtpConfig,
            s.perCohortEconomicCost,
            s.perCohortBenefit,
            s.bcr,
            s.perCohortNetBenefit,
            s.totalCostAllCohorts,
            s.totalBenefitAllCohorts,
            s.totalNetBenefitAllCohorts,
            s.graduatesAllCohorts,
            s.outbreaksPerYearAllCohorts,
            s.notes || ""
        ];
    });

    const data = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "STEPS scenarios");
    XLSX.writeFile(wb, "steps_fetp_scenarios.xlsx");
    showToast("Excel file downloaded.", "success");
}

function exportPolicyBriefPdf() {
    const jspdf = window.jspdf;
    if (!jspdf) {
        showToast("PDF export library not available.", "error");
        return;
    }

    if (!state.lastResults) {
        showToast("Apply a configuration before exporting a policy brief.", "warning");
        return;
    }

    const doc = new jspdf.jsPDF();

    const r = state.lastResults;
    const cfg = r.cfg;
    const epi = r.epi;

    const heading = "STEPS FETP India - Policy Brief";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(heading, 14, 16);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const scenarioTitle = cfg.scenarioName || "Current configuration";
    doc.text(`Scenario: ${scenarioTitle}`, 14, 26);

    const tierLabel = {
        frontline: "Frontline (3 months)",
        intermediate: "Intermediate (12 months)",
        advanced: "Advanced (24 months)"
    }[cfg.tier] || cfg.tier;

    const careerLabel = {
        certificate: "Government and partner certificate",
        uniqual: "University qualification",
        career_path: "Government career pathway"
    }[cfg.career] || cfg.career;

    const mentorshipLabel = {
        low: "Low mentorship",
        medium: "Medium mentorship",
        high: "High mentorship"
    }[cfg.mentorship] || cfg.mentorship;

    const deliveryLabel = {
        blended: "Blended delivery",
        inperson: "Fully in person delivery",
        online: "Fully online delivery"
    }[cfg.delivery] || cfg.delivery;

    const responseLabel = {
        30: "Detect and respond within 30 days",
        15: "Detect and respond within 15 days",
        7: "Detect and respond within 7 days"
    }[cfg.response] || `${cfg.response} days`;

    let y = 34;
    const lineGap = 6;

    const lines = [
        `Programme tier: ${tierLabel}`,
        `Career incentive: ${careerLabel}`,
        `Mentorship intensity: ${mentorshipLabel}`,
        `Delivery mode: ${deliveryLabel}`,
        `Expected response time: ${responseLabel}`,
        `Trainees per cohort: ${cfg.traineesPerCohort}`,
        `Number of cohorts: ${cfg.numberOfCohorts}`,
        `Cost per trainee per month: ${formatCurrencyInr(cfg.costPerTraineePerMonth, 0)}`
    ];

    lines.forEach(text => {
        doc.text(text, 14, y);
        y += lineGap;
    });

    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Endorsement and economic value", 14, y);
    doc.setFont("helvetica", "normal");
    y += lineGap;

    const endorsePercent = r.util.endorseProb * 100;
    const optPercent = r.util.optOutProb * 100;

    const bcrText = r.bcr !== null && isFinite(r.bcr) ? r.bcr.toFixed(2) : "N/A";

    const econLines = [
        `Estimated endorsement: ${endorsePercent.toFixed(1)} percent of stakeholders would endorse this option.`,
        `Estimated opt out: ${optPercent.toFixed(1)} percent would prefer not to invest in this option.`,
        `Economic cost per cohort: ${formatCurrencyInr(r.costs.totalEconomicCostPerCohort, 0)}.`,
        `Total economic cost (all cohorts): ${formatCurrencyInr(r.totalCostAllCohorts, 0)}.`,
        `Total indicative benefit (all cohorts): ${formatCurrencyInr(r.totalBenefitAllCohorts, 0)}.`,
        `Net benefit (all cohorts): ${formatCurrencyInr(r.netBenefitAllCohorts, 0)}.`,
        `Benefit cost ratio: ${bcrText}.`
    ];

    econLines.forEach(text => {
        doc.text(text, 14, y);
        y += lineGap;
    });

    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Epidemiological implications", 14, y);
    doc.setFont("helvetica", "normal");
    y += lineGap;

    const epiLines = [
        `Total FETP graduates: ${formatNumber(epi.graduatesAllCohorts, 0)} over all cohorts.`,
        `Outbreak responses supported per year: ${formatNumber(epi.outbreaksPerYearAllCohorts, 1)}.`,
        `Planning horizon: ${state.epiSettings.general.planningHorizonYears} years.`
    ];

    epiLines.forEach(text => {
        doc.text(text, 14, y);
        y += lineGap;
    });

    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Assumptions and methods (short summary)", 14, y);
    doc.setFont("helvetica", "normal");
    y += lineGap;

    const methodLines = [
        "Preferences are based on a discrete choice experiment estimated using a mixed logit and a two class latent class model.",
        "Endorsement probabilities compare the utility of any FETP option with the opt out alternative.",
        "Cost estimates use cost per trainee per month combined with cohort size, programme duration and cost templates.",
        "Monetary benefits reflect indicative values for additional graduates and outbreak responses over the planning horizon.",
        "Full technical details are available in the STEPS Technical Appendix."
    ];

    methodLines.forEach(text => {
        const wrapped = doc.splitTextToSize(text, 180);
        wrapped.forEach(line => {
            doc.text(line, 14, y);
            y += 4.5;
        });
    });

    doc.save("steps_fetp_policy_brief.pdf");
    showToast("Policy brief PDF downloaded.", "success");
}

/* ===========================
   Modal snapshot
   =========================== */

function openResultsModal(results) {
    const modal = document.getElementById("results-modal");
    const body = document.getElementById("modal-body");
    if (!modal || !body) return;

    const r = results;
    const cfg = r.cfg;

    const tierLabel = {
        frontline: "Frontline (3 months)",
        intermediate: "Intermediate (12 months)",
        advanced: "Advanced (24 months)"
    }[cfg.tier] || cfg.tier;

    const careerLabel = {
        certificate: "Government and partner certificate",
        uniqual: "University qualification",
        career_path: "Government career pathway"
    }[cfg.career] || cfg.career;

    const mentorshipLabel = {
        low: "Low mentorship",
        medium: "Medium mentorship",
        high: "High mentorship"
    }[cfg.mentorship] || cfg.mentorship;

    const deliveryLabel = {
        blended: "Blended delivery",
        inperson: "Fully in person delivery",
        online: "Fully online delivery"
    }[cfg.delivery] || cfg.delivery;

    const responseLabel = {
        30: "Detect and respond within 30 days",
        15: "Detect and respond within 15 days",
        7: "Detect and respond within 7 days"
    }[cfg.response] || `${cfg.response} days`;

    const endorsePercent = r.util.endorseProb * 100;
    const bcrText = r.bcr !== null && isFinite(r.bcr) ? r.bcr.toFixed(2) : "N/A";

    body.innerHTML = `
        <div class="card config-summary-card">
            <h3>Configuration</h3>
            <div class="config-summary">
                <div class="config-summary-row">
                    <div class="config-summary-label">Programme tier</div>
                    <div class="config-summary-value">${tierLabel}</div>
                </div>
                <div class="config-summary-row">
                    <div class="config-summary-label">Career incentive</div>
                    <div class="config-summary-value">${careerLabel}</div>
                </div>
                <div class="config-summary-row">
                    <div class="config-summary-label">Mentorship intensity</div>
                    <div class="config-summary-value">${mentorshipLabel}</div>
                </div>
                <div class="config-summary-row">
                    <div class="config-summary-label">Delivery mode</div>
                    <div class="config-summary-value">${deliveryLabel}</div>
                </div>
                <div class="config-summary-row">
                    <div class="config-summary-label">Response time</div>
                    <div class="config-summary-value">${responseLabel}</div>
                </div>
                <div class="config-summary-row">
                    <div class="config-summary-label">Cost per trainee per month</div>
                    <div class="config-summary-value">${formatCurrency(cfg.costPerTraineePerMonth, state.currency)}</div>
                </div>
                <div class="config-summary-row">
                    <div class="config-summary-label">Trainees per cohort</div>
                    <div class="config-summary-value">${formatNumber(cfg.traineesPerCohort, 0)}</div>
                </div>
                <div class="config-summary-row">
                    <div class="config-summary-label">Number of cohorts</div>
                    <div class="config-summary-value">${formatNumber(cfg.numberOfCohorts, 0)}</div>
                </div>
            </div>
        </div>
        <hr class="divider">
        <div class="grid-two">
            <div>
                <h3>Endorsement summary</h3>
                <p>Estimated endorsement is ${formatPercent(endorsePercent, 1)} of stakeholders, with ${formatPercent(100 - endorsePercent, 1)} choosing the opt out option instead of this configuration.</p>
                <p>This reflects how attractive the programme design is relative to the no investment alternative, based on the discrete choice experiment estimates.</p>
            </div>
            <div>
                <h3>Economic and epidemiological results</h3>
                <p>Total economic cost across all cohorts is ${formatCurrency(r.totalCostAllCohorts, state.currency)}, with indicative total benefits of ${formatCurrency(r.totalBenefitAllCohorts, state.currency)}.</p>
                <p>The net benefit is ${formatCurrency(r.netBenefitAllCohorts, state.currency)} and the benefit cost ratio is ${bcrText}.</p>
                <p>The configuration yields about ${formatNumber(r.epi.graduatesAllCohorts, 0)} graduates and supports roughly ${formatNumber(r.epi.outbreaksPerYearAllCohorts, 1)} outbreak responses per year across all cohorts.</p>
            </div>
        </div>
    `;

    modal.classList.remove("hidden");
}

function setupModal() {
    const modal = document.getElementById("results-modal");
    const closeBtn = document.getElementById("close-modal");
    if (!modal || !closeBtn) return;

    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            modal.classList.add("hidden");
        }
    });
}

/* ===========================
   Guided tour
   =========================== */

function ensureTourElements() {
    let overlay = document.getElementById("tour-overlay");
    let popover = document.getElementById("tour-popover");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "tour-overlay";
        overlay.className = "tour-overlay hidden";
        document.body.appendChild(overlay);
    }

    if (!popover) {
        popover = document.createElement("div");
        popover.id = "tour-popover";
        popover.className = "tour-popover hidden";
        popover.innerHTML = `
            <div class="tour-popover-header">
                <h3 id="tour-title"></h3>
                <button class="tour-close-btn" id="tour-close-btn" aria-label="Close tour">×</button>
            </div>
            <div class="tour-popover-body" id="tour-body"></div>
            <div class="tour-popover-footer">
                <span class="tour-step-indicator" id="tour-step-indicator"></span>
                <div class="tour-buttons">
                    <button class="btn-ghost-small" id="tour-prev">Back</button>
                    <button class="btn-primary-small" id="tour-next">Next</button>
                </div>
            </div>
        `;
        document.body.appendChild(popover);
    }

    let trigger = document.getElementById("tour-trigger-floating");
    if (!trigger) {
        trigger = document.createElement("button");
        trigger.id = "tour-trigger-floating";
        trigger.className = "btn-ghost-small";
        trigger.style.position = "fixed";
        trigger.style.left = "14px";
        trigger.style.bottom = "18px";
        trigger.style.zIndex = "65";
        trigger.innerHTML = `<span class="tour-icon">?</span><span> Quick tour</span>`;
        document.body.appendChild(trigger);
    }

    trigger.addEventListener("click", () => startTour(true));
}

const TOUR_STEPS = [
    {
        tab: "intro",
        selector: "#tab-intro .card:first-child",
        title: "Welcome to STEPS",
        text: "This panel explains what STEPS does and how it links preferences, costs and simple epidemiological outputs. Use it as a quick orientation when introducing the tool to policy colleagues."
    },
    {
        tab: "config",
        selector: "#tab-config .card:first-child",
        title: "Configure an FETP scale up option",
        text: "Here you select programme tier, career incentives, mentorship intensity, delivery mode, response time, cohort size and the number of cohorts. These choices drive endorsement, costs and benefits."
    },
    {
        tab: "config",
        selector: "#config-summary-card",
        title: "Configuration at a glance",
        text: "This summary card translates the current configuration into a simple snapshot, including endorsement and a headline recommendation for use in business cases."
    },
    {
        tab: "results",
        selector: "#tab-results .card:first-child",
        title: "Endorsement and opt out",
        text: "The Results tab shows predicted endorsement from the discrete choice experiment and how many stakeholders would prefer to opt out under the current design."
    },
    {
        tab: "results",
        selector: "#tab-results .card:nth-child(2)",
        title: "Costs and economic value",
        text: "This card summarises economic costs and indicative benefits per cohort, together with the benefit cost ratio and net benefit for the current configuration."
    },
    {
        tab: "costing",
        selector: "#tab-costing .card:nth-child(2)",
        title: "Costing details",
        text: "Costing details break the programme budget into staff, travel, materials, supervision and overheads. Switching templates helps compare WHO, NIE and NCDC assumptions."
    },
    {
        tab: "natsim",
        selector: "#tab-natsim .card",
        title: "National simulation",
        text: "The national simulation scales costs, benefits, graduates and outbreak responses by the number of cohorts, helping you discuss country level implications quickly."
    },
    {
        tab: "technical",
        selector: "#tab-technical .card:first-child",
        title: "Advanced settings and assumptions",
        text: "Technical users can adjust epidemiological multipliers and display exchange rates here during workshops, without editing the code."
    },
    {
        tab: "technical",
        selector: "#tab-technical .card:nth-child(2)",
        title: "Technical appendix",
        text: "For detailed methods, including worked numerical examples, use the Technical Appendix. It is written for policy audiences and can be opened in a separate window."
    }
];

function showTabFromTour(tabId) {
    const btn = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
    const panel = document.getElementById(`tab-${tabId}`);
    if (btn && panel) {
        document.querySelectorAll(".tab-link").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        panel.classList.add("active");
    }
}

function renderTourStep() {
    const overlay = document.getElementById("tour-overlay");
    const popover = document.getElementById("tour-popover");
    if (!overlay || !popover) return;

    const step = TOUR_STEPS[state.tour.stepIndex];
    if (!step) {
        endTour();
        return;
    }

    showTabFromTour(step.tab);

    const target = document.querySelector(step.selector);
    const titleEl = document.getElementById("tour-title");
    const bodyEl = document.getElementById("tour-body");
    const indicatorEl = document.getElementById("tour-step-indicator");
    const prevBtn = document.getElementById("tour-prev");
    const nextBtn = document.getElementById("tour-next");

    titleEl.textContent = step.title;
    bodyEl.textContent = step.text;
    indicatorEl.textContent = `Step ${state.tour.stepIndex + 1} of ${TOUR_STEPS.length}`;

    prevBtn.disabled = state.tour.stepIndex === 0;
    nextBtn.textContent = state.tour.stepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next";

    overlay.classList.remove("hidden");
    popover.classList.remove("hidden");

    let top = 100;
    let left = 60;

    if (target) {
        const rect = target.getBoundingClientRect();
        const width = 320;
        const height = 160;
        top = Math.max(20, rect.top + window.scrollY + rect.height + 8);
        if (top + height > window.scrollY + window.innerHeight - 20) {
            top = Math.max(20, rect.top + window.scrollY - height - 8);
        }
        left = Math.max(20, rect.left + window.scrollX);
        if (left + width > window.scrollX + window.innerWidth - 20) {
            left = window.scrollX + window.innerWidth - width - 20;
        }
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
}

function startTour(forceRestart) {
    if (!forceRestart && state.tour.seen) return;
    state.tour.active = true;
    state.tour.stepIndex = 0;
    state.tour.seen = true;
    try {
        window.localStorage.setItem("stepsTourSeen_v2", "1");
    } catch (e) {
        // ignore
    }
    renderTourStep();
}

function endTour() {
    const overlay = document.getElementById("tour-overlay");
    const popover = document.getElementById("tour-popover");
    if (overlay) overlay.classList.add("hidden");
    if (popover) popover.classList.add("hidden");
    state.tour.active = false;
}

function setupTour() {
    ensureTourElements();

    try {
        state.tour.seen = window.localStorage.getItem("stepsTourSeen_v2") === "1";
    } catch (e) {
        state.tour.seen = false;
    }

    const overlay = document.getElementById("tour-overlay");
    const prevBtn = document.getElementById("tour-prev");
    const nextBtn = document.getElementById("tour-next");
    const closeBtn = document.getElementById("tour-close-btn");

    // NEW: wire the existing header Quick tour button
    const headerTrigger = document.getElementById("btn-start-tour");
    if (headerTrigger && !headerTrigger.dataset.tourBound) {
        headerTrigger.addEventListener("click", () => startTour(true));
        headerTrigger.dataset.tourBound = "1";
    }

    if (overlay) {
        overlay.addEventListener("click", () => endTour());
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (state.tour.stepIndex > 0) {
                state.tour.stepIndex -= 1;
                renderTourStep();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (state.tour.stepIndex < TOUR_STEPS.length - 1) {
                state.tour.stepIndex += 1;
                renderTourStep();
            } else {
                endTour();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", () => endTour());
    }

    document.addEventListener("keydown", (e) => {
        if (!state.tour.active) return;
        if (e.key === "Escape") endTour();
        if (e.key === "ArrowRight") {
            if (state.tour.stepIndex < TOUR_STEPS.length - 1) {
                state.tour.stepIndex += 1;
                renderTourStep();
            }
        }
        if (e.key === "ArrowLeft") {
            if (state.tour.stepIndex > 0) {
                state.tour.stepIndex -= 1;
                renderTourStep();
            }
        }
    });

    if (!state.tour.seen) {
        startTour(false);
    }
}

/* ===========================
   Technical appendix preview
   =========================== */

function setupTechnicalAppendix() {
    const button = document.getElementById("open-technical-window");
    if (button) {
        button.addEventListener("click", () => {
            window.open("technical-appendix.html", "_blank", "noopener");
        });
    }

    const preview = document.getElementById("technical-preview");
    if (preview) {
        preview.innerHTML = "The technical appendix summarises the discrete choice experiment models, cost templates and epidemiological multipliers used in STEPS. It includes step by step numerical examples that match the scenarios shown in this tool, such as Advanced programmes with high mentorship and rapid response times.";
    }
}

/* ===========================
   Configuration and event wiring
   =========================== */

function applyConfiguration(silent) {
    const cfg = readConfigurationFromInputs();
    state.currentTier = cfg.tier;

    const costDisplay = document.getElementById("cost-display");
    if (costDisplay) {
        costDisplay.textContent = formatCurrency(cfg.costPerTraineePerMonth, state.currency);
    }

    populateCostSourceOptions(cfg.tier);

    const results = computeFullResults(cfg);
    state.lastResults = results;

    updateConfigSummary(results);
    updateResultsTab(results);
    updateCostingTab(results);
    updateNationalSimulation(results);
    updateAssumptionLog(cfg);

    if (!silent) {
        showToast("Configuration applied. Results updated.", "success");
    }
}

function setupCoreInteractions() {
    const costSlider = document.getElementById("cost-slider");
    const costDisplay = document.getElementById("cost-display");
    if (costSlider && costDisplay) {
        costSlider.addEventListener("input", () => {
            const value = parseFloat(costSlider.value) || 0;
            costDisplay.textContent = formatCurrency(value, state.currency);
        });
    }

    const tierSelect = document.getElementById("program-tier");
    if (tierSelect) {
        tierSelect.addEventListener("change", () => {
            state.currentTier = tierSelect.value;
            populateCostSourceOptions(state.currentTier);
        });
    }

    const modelButtons = document.querySelectorAll(".pill-toggle[data-model]");
    modelButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            modelButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.model = btn.dataset.model || "mxl";
        });
    });

    const currencyButtons = document.querySelectorAll(".pill-toggle[data-currency]");
    currencyButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            currencyButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.currency = btn.dataset.currency || "INR";
            if (state.lastResults) {
                updateConfigSummary(state.lastResults);
                updateResultsTab(state.lastResults);
                updateCostingTab(state.lastResults);
                updateNationalSimulation(state.lastResults);
            }
        });
    });

    const oppToggle = document.getElementById("opp-toggle");
    if (oppToggle) {
        oppToggle.addEventListener("click", () => {
            state.includeOpportunityCost = !state.includeOpportunityCost;
            oppToggle.classList.toggle("on", state.includeOpportunityCost);
            const labelEl = oppToggle.querySelector(".switch-label");
            if (labelEl) {
                labelEl.textContent = state.includeOpportunityCost
                    ? "Opportunity cost included"
                    : "Opportunity cost excluded";
            }
            if (state.lastResults) {
                const cfg = state.lastResults.cfg;
                const results = computeFullResults(cfg);
                state.lastResults = results;
                updateConfigSummary(results);
                updateResultsTab(results);
                updateCostingTab(results);
                updateNationalSimulation(results);
            }
        });
    }

    const applyBtn = document.getElementById("update-results");
    if (applyBtn) {
        applyBtn.addEventListener("click", () => {
            applyConfiguration(false);
        });
    }

    const snapshotBtn = document.getElementById("open-snapshot");
    if (snapshotBtn) {
        snapshotBtn.addEventListener("click", () => {
            if (!state.lastResults) {
                applyConfiguration(true);
            }
            if (state.lastResults) {
                openResultsModal(state.lastResults);
                showToast("Snapshot opened. Review scenario summary and recommendation.", "info");
            }
        });
    }

    const saveBtn = document.getElementById("save-scenario");
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            if (!state.lastResults) {
                applyConfiguration(true);
            }
            saveScenarioFromCurrentResults();
        });
    }

    const advApply = document.getElementById("advanced-apply");
    if (advApply) {
        advApply.addEventListener("click", () => applyAdvancedSettings());
    }
    const advReset = document.getElementById("advanced-reset");
    if (advReset) {
        advReset.addEventListener("click", () => resetAdvancedSettings());
    }

    const exportExcelBtn = document.getElementById("export-excel");
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener("click", () => exportScenariosToExcel());
    }
    const exportPdfBtn = document.getElementById("export-pdf");
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", () => exportPolicyBriefPdf());
    }
}

/* ===========================
   Initialisation
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
    setupTabs();
    setupInfoTooltips();
    setupModal();
    setupCoreInteractions();
    setupTechnicalAppendix();

    // Ensure advanced settings and assumption log show defaults on first load
    populateAdvancedSettingsInputs();
    updateAssumptionLog(readConfigurationFromInputs());

    // Optionally override defaults from external JSONs if present
    loadEpiConfigIfPresent();
    loadCostConfigIfPresent();

    loadSavedScenarios();
    setupTour();

    // Compute initial results and update all tabs without a toast
    applyConfiguration(true);
});
