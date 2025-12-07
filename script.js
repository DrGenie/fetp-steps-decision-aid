/* ===================================================
   STEPS FETP India Decision Aid
   Script with interactive DCE sensitivity and Copilot helper
   (upgraded, wired to results, sensitivity and Copilot tabs)
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

/* ===========================
   Cost templates (fallback)
   =========================== */

const COST_TEMPLATES = {
  frontline: {
    who: {
      id: "who",
      label: "Frontline - WHO style template",
      description:
        "Illustrative costing template for Frontline FETP with staff, travel, supervision and management costs.",
      oppRate: 0.15,
      components: [
        { id: "staff", label: "Staff and tutors", directShare: 0.40 },
        {
          id: "travel",
          label: "Trainee travel and field work",
          directShare: 0.20
        },
        {
          id: "materials",
          label: "Training materials and supplies",
          directShare: 0.15
        },
        {
          id: "supervision",
          label: "Supervision and mentoring costs",
          directShare: 0.15
        },
        { id: "overheads", label: "Management and overheads", directShare: 0.10 }
      ]
    }
  },
  intermediate: {
    who: {
      id: "who",
      label: "Intermediate - WHO style template",
      description:
        "Illustrative costing template for Intermediate FETP with a mix of direct training and supervision costs.",
      oppRate: 0.20,
      components: [
        { id: "staff", label: "Staff and tutors", directShare: 0.38 },
        {
          id: "travel",
          label: "Trainee travel and field work",
          directShare: 0.18
        },
        {
          id: "materials",
          label: "Training materials and supplies",
          directShare: 0.14
        },
        {
          id: "supervision",
          label: "Supervision and mentoring costs",
          directShare: 0.18
        },
        {
          id: "overheads",
          label: "Management and overheads",
          directShare: 0.12
        }
      ]
    }
  },
  advanced: {
    nie: {
      id: "nie",
      label: "Advanced - NIE style template",
      description:
        "Illustrative costing template for Advanced FETP with intensive staff time and supervision.",
      oppRate: 0.25,
      components: [
        { id: "staff", label: "Staff and tutors", directShare: 0.45 },
        {
          id: "travel",
          label: "Trainee travel and field work",
          directShare: 0.18
        },
        {
          id: "materials",
          label: "Training materials and supplies",
          directShare: 0.10
        },
        {
          id: "supervision",
          label: "Supervision and mentoring costs",
          directShare: 0.17
        },
        {
          id: "overheads",
          label: "Management and overheads",
          directShare: 0.10
        }
      ]
    }
  }
};

/* External JSON driven configuration (if present) */
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
      gradShare: 0.9,
      outbreaksPerCohortPerYear: 0.3,
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
      outbreaksPerCohortPerYear: 0.8,
      valuePerGraduate: 1200000,
      valuePerOutbreak: 40000000
    }
  }
};

/* Response time multipliers for outbreak benefits */

const RESPONSE_TIME_MULTIPLIERS = {
  "30": 1.0,
  "15": 1.2,
  "7": 1.5
};

/* ===========================
   Copilot interpretation prompt
   =========================== */

const COPILOT_INTERPRETATION_PROMPT = `
STEPS Tool Copilot Interpretation Prompt

Act as a senior health economist advising the Ministry of Health and Family Welfare in India on the national scale up of Field Epidemiology Training Programs. You are working with outputs from the STEPS FETP India Decision Aid. The scenario JSON you will receive summarises the configuration selected by the user, including programme tier, career pathway, mentorship intensity, delivery mode, outbreak response time, cost per trainee per month, number of cohorts and all model based outputs. Latent class results have been removed and should not be discussed. All other model components remain valid and must be interpreted.

Use the JSON provided to reconstruct the scenario in clear plain language. Describe the configuration by stating which FETP tier is being scaled, the intake size, the main design elements related to careers, mentorship, delivery and response time, and the implied cost per trainee and the total economic cost across all cohorts. Present this description with precision so that senior decision makers can immediately understand what the configuration represents and the resources it requires.

Explain the discrete choice experiment endorsement results in intuitive terms and state what proportion of key stakeholders are predicted to support the configuration. Clarify whether support appears low, moderate or strong in the context of national scale up decisions in India. If there are any differences in endorsement associated with faster response time or stronger mentorship, articulate these clearly for policy makers.

Interpret the willingness to pay estimates as monetary summaries of how strongly stakeholders value the configuration. Make clear that willingness to pay is considered a benefit measure because it reflects the maximum monetary amount that informed stakeholders would hypothetically exchange to secure improvements in epidemiological training, mentoring, outbreak response and system capacity relative to the status quo. State that willingness to pay captures perceived programme value in financial units, allowing direct comparison with the economic costs of scale up and enabling the economic case to be assessed in terms of whether the perceived value generated by the programme exceeds its cost. Explain how total willingness to pay across all cohorts compares with total economic cost. Indicate whether stakeholders appear willing to pay more, about the same or less than the programme would cost to implement. Discuss the implications of this relationship for political feasibility, acceptability to partners and the strength of the economic case from a preference based perspective. If there are separate elements of willingness to pay related to response time, explain how much additional value stakeholders attach to faster detection and earlier control of outbreaks.

Summarise the epidemiological outputs by describing the expected number of graduates, the number of outbreak responses supported per year and the approximate monetary value of these epidemiological benefits. Clarify what these figures imply for India’s surveillance and response capacity and how the selected tier contributes to detecting events at the front line, analysing and interpreting surveillance data at the intermediate level or providing advanced leadership for complex responses. State whether the combined costs and epidemiological benefits yield a benefit cost ratio that is clearly above one, close to one or below one and interpret what that means for value for money in the Indian context.

Bring the results together in a concise policy interpretation suitable for a cabinet note or a national steering committee briefing. Make an explicit judgement about whether the scenario appears highly attractive, promising but in need of refinement or weak from a value for money perspective. Refer directly to endorsement, willingness to pay, epidemiological benefits, total economic cost, benefit cost ratio and net benefits when forming this judgement. Where useful, highlight trade offs between the selected tier and other tiers. Comment on affordability and fiscal space by situating the total economic cost against the likely scale up budget envelope for FETP within the health system.

Provide a short set of policy recommendations. Indicate whether the scenario is suitable for national scale up, targeted scale up in selected states, further piloting or redesign. Suggest practical adjustments that could improve feasibility or value. Present the final output as a polished policy brief with clear section headings and well structured paragraphs. Include a results table that summarises the configuration, endorsement, willingness to pay results, epidemiological benefits, total economic costs, benefit cost ratio and net benefit.
`;

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
    natEpi: null
  },
  tour: {
    active: false,
    stepIndex: 0,
    steps: []
  }
};

/* ===========================
   Utility helpers
   =========================== */

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return "-";
  const pct = value * 100;
  return pct.toFixed(decimals) + " %";
}

function formatCurrencyInr(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return "₹ " + Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

function formatCurrency(valueInInr, currency = "INR", decimalsInr = 0) {
  if (valueInInr === null || valueInInr === undefined || isNaN(valueInInr)) {
    return "-";
  }
  if (currency === "USD") {
    const rate = state.epiSettings.general.inrPerUsd || 83;
    const valueUsd = valueInInr / rate;
    return "US$ " + valueUsd.toLocaleString("en-US", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1
    });
  }
  return formatCurrencyInr(valueInInr, decimalsInr);
}

function logistic(x) {
  if (x > 50) return 1;
  if (x < -50) return 0;
  return 1 / (1 + Math.exp(-x));
}

function setTextIfExists(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  }
}

function setTextMulti(ids, text) {
  ids.forEach(id => setTextIfExists(id, text));
}

/* ===========================
   Configuration reading
   =========================== */

function readConfigurationFromInputs() {
  const tierEl = document.getElementById("program-tier");
  const careerEl = document.getElementById("career-track");
  const mentorshipEl = document.getElementById("mentorship");
  const deliveryEl = document.getElementById("delivery");
  const responseEl = document.getElementById("response");

  const tier = tierEl ? tierEl.value : "frontline";
  const career = careerEl ? careerEl.value : "certificate";
  const mentorship = mentorshipEl ? mentorshipEl.value : "low";
  const delivery = deliveryEl ? deliveryEl.value : "blended";
  const response = responseEl ? responseEl.value : "30";

  const costSlider = document.getElementById("cost-slider");
  const traineesInput = document.getElementById("trainees");
  const cohortsInput = document.getElementById("cohorts");

  const costPerTraineePerMonth = parseFloat(costSlider && costSlider.value) || 0;
  const traineesPerCohort = parseInt(traineesInput && traineesInput.value, 10) || 0;
  const numberOfCohorts = parseInt(cohortsInput && cohortsInput.value, 10) || 0;

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

function computeNonCostUtility(cfg, coefs) {
  const uTier = coefs.tier[cfg.tier] || 0;
  const uCareer = coefs.career[cfg.career] || 0;
  const uMentor = coefs.mentorship[cfg.mentorship] || 0;
  const uDelivery = coefs.delivery[cfg.delivery] || 0;
  const uResponse = coefs.response[cfg.response] || 0;
  return uTier + uCareer + uMentor + uDelivery + uResponse;
}

/*
  Compute WTP components (INR per trainee per month) using:
  WTP_k (thousand INR per trainee per month) = -beta_k / beta_cost
  Multiply by 1000 to express in INR per trainee per month.
*/
function computeWtpComponents(cfg, coefs) {
  const betaCost = coefs.costPerThousand || 0;
  if (!betaCost) {
    return {
      totalPerTraineePerMonth: null,
      components: null
    };
  }

  const betaTier = coefs.tier[cfg.tier] || 0;
  const betaCareer = coefs.career[cfg.career] || 0;
  const betaMentor = coefs.mentorship[cfg.mentorship] || 0;
  const betaDelivery = coefs.delivery[cfg.delivery] || 0;
  const betaResponse = coefs.response[cfg.response] || 0;

  const tierWtp = (-1000 * betaTier) / betaCost;
  const careerWtp = (-1000 * betaCareer) / betaCost;
  const mentorshipWtp = (-1000 * betaMentor) / betaCost;
  const deliveryWtp = (-1000 * betaDelivery) / betaCost;
  const responseWtp = (-1000 * betaResponse) / betaCost;

  const total =
    tierWtp + careerWtp + mentorshipWtp + deliveryWtp + responseWtp;

  return {
    totalPerTraineePerMonth: total,
    components: {
      tier: tierWtp,
      career: careerWtp,
      mentorship: mentorshipWtp,
      delivery: deliveryWtp,
      response: responseWtp
    }
  };
}

/*
  Compute endorsement probabilities and WTP for the mixed logit model.
*/
function computeEndorsementAndWtp(cfg) {
  const coefs = MXL_COEFS;

  const designUtility = computeNonCostUtility(cfg, coefs);
  const uAsc = typeof coefs.ascProgram === "number" ? coefs.ascProgram : 1.0;
  const nonCostUtilityWithAsc = uAsc + designUtility;

  const costThousands = cfg.costPerTraineePerMonth / 1000;
  const costUtil = (coefs.costPerThousand || 0) * costThousands;
  const ascOptOut = coefs.ascOptOut || 0;

  const deltaV = -ascOptOut + nonCostUtilityWithAsc + costUtil;
  const endorseProb = logistic(deltaV);
  const optOutProb = 1 - endorseProb;

  const betaCost = coefs.costPerThousand || 0;

  let wtpConfig = null;
  let wtpComponents = null;

  if (betaCost !== 0) {
    const wtp = computeWtpComponents(cfg, coefs);
    wtpConfig = wtp.totalPerTraineePerMonth;
    wtpComponents = wtp.components;
  }

  return {
    designUtility,
    nonCostUtilityWithAsc,
    costUtil,
    deltaV,
    endorseProb,
    optOutProb,
    wtpConfig,
    wtpComponents
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

function getCurrentCostTemplate(tier) {
  const configForTier =
    COST_CONFIG && COST_CONFIG[tier] ? COST_CONFIG[tier] : null;

  let chosenId = state.currentCostSourceId || null;

  if (configForTier) {
    const ids = Object.keys(configForTier);
    if (ids.length) {
      if (!chosenId || !configForTier[chosenId]) {
        chosenId = ids[0];
        state.currentCostSourceId = chosenId;
      }
      const src = configForTier[chosenId];
      const allComponents = src.components || [];
      const nonOpp = allComponents.filter(c => !c.isOpportunityCost);
      const opp = allComponents.filter(c => c.isOpportunityCost);
      const totalNonOpp = nonOpp.reduce(
        (sum, c) => sum + (c.amountTotal || 0),
        0
      );
      const totalOpp = opp.reduce(
        (sum, c) => sum + (c.amountTotal || 0),
        0
      );
      const oppRate = totalNonOpp > 0 ? totalOpp / totalNonOpp : 0;

      const components = nonOpp.map((c, idx) => {
        const share =
          totalNonOpp > 0 ? (c.amountTotal || 0) / totalNonOpp : 0;

        const labelParts = [];
        if (c.major) labelParts.push(c.major);
        if (c.category) labelParts.push(c.category);
        if (c.subCategory) labelParts.push(c.subCategory);
        const labelBase = labelParts.length
          ? labelParts.join(" / ")
          : "Cost component " + (idx + 1);
        const label = c.label || labelBase;

        return {
          id: c.id || "comp_" + idx,
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

  const templatesForTier = COST_TEMPLATES[tier] || {};
  const availableIds = Object.keys(templatesForTier);
  if (!availableIds.length) return null;

  if (!chosenId || !templatesForTier[chosenId]) {
    chosenId = availableIds[0];
    state.currentCostSourceId = chosenId;
  }

  return templatesForTier[chosenId];
}

/*
  Compute direct programme cost, opportunity cost and total economic cost.
  Costs are per cohort.
*/
function computeCosts(cfg) {
  const durationMonths = getProgrammeDurationMonths(cfg.tier);
  const programmeCostPerCohort =
    cfg.costPerTraineePerMonth * cfg.traineesPerCohort * durationMonths;

  const template = getCurrentCostTemplate(cfg.tier);

  if (!template) {
    const opportunityCostPerCohort = 0;
    const totalEconomicCostPerCohort = programmeCostPerCohort;
    return {
      durationMonths,
      programmeCostPerCohort,
      opportunityCostPerCohort,
      totalEconomicCostPerCohort,
      components: [],
      templateLabel: ""
    };
  }

  const oppRate = template.oppRate || 0;
  const directCostPerCohort = programmeCostPerCohort;
  const opportunityCostPerCohort = state.includeOpportunityCost
    ? directCostPerCohort * oppRate
    : 0;
  const totalEconomicCostPerCohort =
    directCostPerCohort + opportunityCostPerCohort;

  const components = (template.components || []).map(comp => {
    const compAmountPerCohort =
      directCostPerCohort * (comp.directShare || 0);
    const amountPerTraineePerMonth =
      durationMonths > 0 && cfg.traineesPerCohort > 0
        ? compAmountPerCohort /
          (durationMonths * cfg.traineesPerCohort)
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
    components,
    templateLabel: template.label || ""
  };
}

/* ===========================
   Epidemiological calculations
   =========================== */

function getResponseTimeMultiplier(responseValue) {
  const key = String(responseValue);
  if (Object.prototype.hasOwnProperty.call(RESPONSE_TIME_MULTIPLIERS, key)) {
    return RESPONSE_TIME_MULTIPLIERS[key];
  }
  return 1.0;
}

/*
  Compute epidemiological outputs and outbreak benefits for all cohorts.
*/
function computeEpi(cfg, endorseProb) {
  const tierConfig = state.epiSettings.tiers[cfg.tier];
  if (!tierConfig) {
    return {
      graduatesAllCohorts: 0,
      outbreaksPerYearAllCohorts: 0,
      benefitGraduatesAllCohorts: 0,
      benefitOutbreaksAllCohorts: 0,
      totalBenefitAllCohorts: 0,
      benefitPerCohort: 0
    };
  }

  const horizon = state.epiSettings.general.planningHorizonYears || 5;
  const gradShare = tierConfig.gradShare || 0;
  const outbreaksPerCohortYear =
    tierConfig.outbreaksPerCohortPerYear || 0;
  const valuePerGrad = tierConfig.valuePerGraduate || 0;
  const valuePerOutbreak = tierConfig.valuePerOutbreak || 0;

  const totalTrainees = cfg.traineesPerCohort * cfg.numberOfCohorts;

  const graduatesAllCohorts = totalTrainees * gradShare * endorseProb;
  const outbreaksPerYearAllCohorts =
    cfg.numberOfCohorts * outbreaksPerCohortYear * endorseProb;

  const responseMultiplier = getResponseTimeMultiplier(cfg.response);

  const benefitGraduatesAllCohorts =
    graduatesAllCohorts * valuePerGrad;

  const benefitOutbreaksAllCohortsBase =
    outbreaksPerYearAllCohorts * horizon * valuePerOutbreak;

  const benefitOutbreaksAllCohorts =
    benefitOutbreaksAllCohortsBase * responseMultiplier;

  const totalBenefitAllCohorts =
    benefitGraduatesAllCohorts + benefitOutbreaksAllCohorts;

  const benefitPerCohort =
    cfg.numberOfCohorts > 0
      ? totalBenefitAllCohorts / cfg.numberOfCohorts
      : 0;

  return {
    graduatesAllCohorts,
    outbreaksPerYearAllCohorts,
    benefitGraduatesAllCohorts,
    benefitOutbreaksAllCohorts,
    totalBenefitAllCohorts,
    benefitPerCohort
  };
}

/* ===========================
   DCE benefits and sensitivity
   =========================== */

function getEndorsementRateForSensitivity(defaultRate) {
  let rate = defaultRate;

  const input = document.getElementById("endorsement-override");

  if (input) {
    const raw = parseFloat(input.value);
    if (!isNaN(raw) && raw >= 0) {
      // If user types e.g. 75, treat as percent
      rate = raw > 1.5 ? raw / 100 : raw;
    }
  }

  if (!isFinite(rate) || isNaN(rate)) rate = 0;
  if (rate < 0) rate = 0;
  if (rate > 1) rate = 1;

  return rate;
}

function isSensitivityEpiIncluded() {
  const btn = document.getElementById("sensitivity-epi-toggle");
  if (!btn) return true;
  return btn.classList.contains("on");
}

/*
  Compute DCE based WTP benefits and CBA profile for a single scenario.
*/
function computeDceCbaProfile(cfg, costs, epi, options) {
  const opts = options || {};
  const benefitDefinition = opts.benefitDefinition || "wtp_only";
  const includeEpi = !!opts.includeEpi;
  const useOverride = !!opts.useOverride;

  const util = computeEndorsementAndWtp(cfg);

  const durationMonths = costs.durationMonths || 0;
  const trainees = cfg.traineesPerCohort || 0;
  const cohorts = cfg.numberOfCohorts || 0;

  const totalCostAllCohorts =
    costs.totalEconomicCostPerCohort * cohorts;

  const wtpPerTraineePerMonth = util.wtpConfig;
  const components = util.wtpComponents || {};
  const wtpRespPerTraineePerMonth =
    typeof components.response === "number" ? components.response : null;

  const hasWtp =
    typeof wtpPerTraineePerMonth === "number" &&
    isFinite(wtpPerTraineePerMonth);

  const wtpPerCohort = hasWtp
    ? wtpPerTraineePerMonth * trainees * durationMonths
    : null;
  const wtpRespPerCohort =
    hasWtp && typeof wtpRespPerTraineePerMonth === "number"
      ? wtpRespPerTraineePerMonth * trainees * durationMonths
      : null;

  const wtpAllCohorts =
    wtpPerCohort !== null ? wtpPerCohort * cohorts : null;
  const wtpRespAllCohorts =
    wtpRespPerCohort !== null ? wtpRespPerCohort * cohorts : null;

  const epiOutbreakAllCohortsBase =
    epi.benefitOutbreaksAllCohorts || 0;
  const epiOutbreakAllCohorts =
    includeEpi ? epiOutbreakAllCohortsBase : 0;

  const endorsementBase = util.endorseProb || 0;
  const endorsementUsed = useOverride
    ? getEndorsementRateForSensitivity(endorsementBase)
    : endorsementBase;

  let bcrDce = null;
  let npvDce = null;
  let bcrCombined = null;
  let npvCombined = null;
  let effectiveWtpAll = null;
  let effectiveCombinedAll = null;

  if (wtpAllCohorts !== null && totalCostAllCohorts > 0) {
    const combinedRaw = wtpAllCohorts + epiOutbreakAllCohorts;
    const rawBcrDce = wtpAllCohorts / totalCostAllCohorts;
    const rawNpvDce = wtpAllCohorts - totalCostAllCohorts;
    const rawBcrCombined = combinedRaw / totalCostAllCohorts;
    const rawNpvCombined = combinedRaw - totalCostAllCohorts;

    effectiveWtpAll = wtpAllCohorts * endorsementUsed;
    effectiveCombinedAll = combinedRaw * endorsementUsed;

    if (benefitDefinition === "endorsement_adjusted") {
      bcrDce =
        effectiveWtpAll !== null && totalCostAllCohorts > 0
          ? effectiveWtpAll / totalCostAllCohorts
          : null;
      npvDce =
        effectiveWtpAll !== null
          ? effectiveWtpAll - totalCostAllCohorts
          : null;
      bcrCombined =
        effectiveCombinedAll !== null && totalCostAllCohorts > 0
          ? effectiveCombinedAll / totalCostAllCohorts
          : null;
      npvCombined =
        effectiveCombinedAll !== null
          ? effectiveCombinedAll - totalCostAllCohorts
          : null;
    } else {
      bcrDce = rawBcrDce;
      npvDce = rawNpvDce;
      bcrCombined = rawBcrCombined;
      npvCombined = rawNpvCombined;

      if (benefitDefinition === "wtp_plus_epi") {
        effectiveWtpAll = effectiveCombinedAll;
      }
    }
  }

  return {
    modelLabel: "MXL overall",
    endorsementBase,
    endorsementUsed,
    costPerCohort: costs.totalEconomicCostPerCohort,
    totalCostAllCohorts,
    wtpPerTraineePerMonth,
    wtpAllCohorts,
    wtpRespAllCohorts,
    epiOutbreakAllCohorts: includeEpi ? epiOutbreakAllCohortsBase : 0,
    effectiveWtpAll,
    effectiveCombinedAll,
    bcrDce,
    npvDce,
    bcrCombined,
    npvCombined
  };
}

/* ===========================
   Scenario level calculations
   =========================== */

function computeScenarioResults(cfg, overrideCostSourceId) {
  const originalCostSourceId = state.currentCostSourceId;
  if (overrideCostSourceId) {
    state.currentCostSourceId = overrideCostSourceId;
  }

  const util = computeEndorsementAndWtp(cfg);
  const costs = computeCosts(cfg);
  const epi = computeEpi(cfg, util.endorseProb);

  if (overrideCostSourceId) {
    state.currentCostSourceId = originalCostSourceId;
  }

  const durationMonths = costs.durationMonths || 0;
  const trainees = cfg.traineesPerCohort || 0;
  const cohorts = cfg.numberOfCohorts || 0;

  const wtpPerTraineePerMonth = util.wtpConfig;
  const wtpPerCohort =
    typeof wtpPerTraineePerMonth === "number"
      ? wtpPerTraineePerMonth * trainees * durationMonths
      : null;
  const wtpAllCohorts =
    wtpPerCohort !== null ? wtpPerCohort * cohorts : null;

  const totalCostAllCohorts =
    costs.totalEconomicCostPerCohort * cohorts;

  const netBenefitPerCohort =
    epi.benefitPerCohort - costs.totalEconomicCostPerCohort;

  const bcrPerCohort =
    costs.totalEconomicCostPerCohort > 0
      ? epi.benefitPerCohort /
        costs.totalEconomicCostPerCohort
      : null;

  const natNetBenefit =
    epi.totalBenefitAllCohorts - totalCostAllCohorts;

  const natBcr =
    totalCostAllCohorts > 0
      ? epi.totalBenefitAllCohorts / totalCostAllCohorts
      : null;

  return {
    config: cfg,
    util,
    costs,
    epi,
    durationMonths,
    wtpPerTraineePerMonth,
    wtpPerCohort,
    wtpAllCohorts,
    totalCostAllCohorts,
    netBenefitPerCohort,
    bcrPerCohort,
    natNetBenefit,
    natBcr,
    costSourceId: state.currentCostSourceId
  };
}

/* ===========================
   UI helpers
   =========================== */

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

function setActiveTab(tabId) {
  const tabLinks = document.querySelectorAll(".tab-link");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabLinks.forEach(btn => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  tabPanels.forEach(panel => {
    if (panel.id === "tab-" + tabId) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });
}

/* Live preview for configuration inputs (cost slider, trainees, cohorts) */

function updateCostSliderDisplay() {
  const slider = document.getElementById("cost-slider");
  if (!slider) return;
  const value = parseFloat(slider.value || "0") || 0;
  const txt = formatCurrency(value, state.currency);
  setTextMulti(
    ["cost-slider-display", "cost-slider-value", "cost-per-trainee-display"],
    txt
  );
}

function updateTraineeCohortDisplay() {
  const traineesInput = document.getElementById("trainees");
  const cohortsInput = document.getElementById("cohorts");
  const traineesVal = traineesInput ? parseInt(traineesInput.value, 10) || 0 : 0;
  const cohortsVal = cohortsInput ? parseInt(cohortsInput.value, 10) || 0 : 0;

  setTextMulti(
    ["trainees-display", "trainees-count"],
    formatNumber(traineesVal, 0)
  );
  setTextMulti(
    ["cohorts-display", "cohorts-count"],
    formatNumber(cohortsVal, 0)
  );
}

function setupConfigurationInputsUi() {
  const slider = document.getElementById("cost-slider");
  if (slider) {
    slider.addEventListener("input", updateCostSliderDisplay);
  }

  const traineesInput = document.getElementById("trainees");
  if (traineesInput) {
    traineesInput.addEventListener("input", updateTraineeCohortDisplay);
  }

  const cohortsInput = document.getElementById("cohorts");
  if (cohortsInput) {
    cohortsInput.addEventListener("input", updateTraineeCohortDisplay);
  }

  // Initial sync
  updateCostSliderDisplay();
  updateTraineeCohortDisplay();
}

/* ===========================
   Charts
   =========================== */

function destroyChart(chartKey) {
  if (state.charts[chartKey]) {
    state.charts[chartKey].destroy();
    state.charts[chartKey] = null;
  }
}

function updateUptakeChart(results) {
  const canvas = document.getElementById("chart-uptake");
  if (!canvas || typeof Chart === "undefined") return;

  const endorsePct = (results.util.endorseProb || 0) * 100;
  const optOutPct = (results.util.optOutProb || 0) * 100;

  destroyChart("uptake");

  const ctx = canvas.getContext("2d");
  state.charts.uptake = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Endorse FETP option", "Choose opt out"],
      datasets: [
        {
          label: "Share of stakeholders",
          data: [endorsePct, optOutPct]
        }
      ]
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
          max: 100,
          ticks: {
            callback: value => value + " %"
          }
        }
      }
    }
  });
}

function updateBcrChart(results) {
  const canvas = document.getElementById("chart-bcr");
  if (!canvas || typeof Chart === "undefined") return;

  destroyChart("bcr");

  const ctx = canvas.getContext("2d");
  const cost = results.costs.totalEconomicCostPerCohort || 0;
  const benefit = results.epi.benefitPerCohort || 0;

  state.charts.bcr = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Cost per cohort", "Indicative benefit per cohort"],
      datasets: [
        {
          label: "INR",
          data: [cost, benefit]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctxData =>
              formatCurrencyInr(ctxData.parsed.y || 0)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => formatNumber(value)
          }
        }
      }
    }
  });
}

function updateEpiChart(results) {
  const canvas = document.getElementById("chart-epi");
  if (!canvas || typeof Chart === "undefined") return;

  destroyChart("epi");

  const graduates = results.epi.graduatesAllCohorts || 0;
  const outbreaks = results.epi.outbreaksPerYearAllCohorts || 0;

  const ctx = canvas.getContext("2d");
  state.charts.epi = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Graduates (all cohorts)", "Outbreak responses per year"],
      datasets: [
        {
          label: "Epidemiological outputs",
          data: [graduates, outbreaks]
        }
      ]
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
            callback: value => formatNumber(value)
          }
        }
      }
    }
  });
}

function updateNationalCharts(results) {
  const costCanvas = document.getElementById("chart-nat-cost-benefit");
  const epiCanvas = document.getElementById("chart-nat-epi");

  const natCost = results.totalCostAllCohorts || 0;
  const natBenefit = results.epi.totalBenefitAllCohorts || 0;
  const natGraduates = results.epi.graduatesAllCohorts || 0;
  const natOutbreaks =
    results.epi.outbreaksPerYearAllCohorts || 0;

  if (costCanvas && typeof Chart !== "undefined") {
    destroyChart("natCostBenefit");
    const ctxCost = costCanvas.getContext("2d");
    state.charts.natCostBenefit = new Chart(ctxCost, {
      type: "bar",
      data: {
        labels: ["Total economic cost", "Total epidemiological benefit"],
        datasets: [
          {
            label: "INR (all cohorts)",
            data: [natCost, natBenefit]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctxData =>
                formatCurrencyInr(ctxData.parsed.y || 0)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => formatNumber(value)
            }
          }
        }
      }
    });
  }

  if (epiCanvas && typeof Chart !== "undefined") {
    destroyChart("natEpi");
    const ctxEpi = epiCanvas.getContext("2d");
    state.charts.natEpi = new Chart(ctxEpi, {
      type: "bar",
      data: {
        labels: ["Total graduates", "Outbreak responses per year"],
        datasets: [
          {
            label: "National outputs",
            data: [natGraduates, natOutbreaks]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => formatNumber(value)
            }
          }
        }
      }
    });
  }
}

/* ===========================
   Costing UI
   =========================== */

function populateCostSourceOptions(tier) {
  const select = document.getElementById("cost-source");
  if (!select) return;

  const prevValue = state.currentCostSourceId;

  while (select.firstChild) select.removeChild(select.firstChild);

  let sources = null;

  if (COST_CONFIG && COST_CONFIG[tier]) {
    sources = COST_CONFIG[tier];
  } else if (COST_TEMPLATES[tier]) {
    sources = COST_TEMPLATES[tier];
  }

  if (!sources) {
    state.currentCostSourceId = null;
    return;
  }

  const ids = Object.keys(sources);
  if (!ids.length) {
    state.currentCostSourceId = null;
    return;
  }

  let chosenId = prevValue && sources[prevValue] ? prevValue : ids[0];
  state.currentCostSourceId = chosenId;

  ids.forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = sources[id].label || id;
    select.appendChild(opt);
  });

  select.value = chosenId;

  select.addEventListener("change", () => {
    state.currentCostSourceId = select.value || chosenId;
    if (state.lastResults) {
      applyConfiguration(false);
    }
  });
}

function updateCostBreakdown(results) {
  const summary = document.getElementById("cost-breakdown-summary");
  const tbody = document.getElementById("cost-components-list");
  if (!summary || !tbody) return;

  const costs = results.costs;

  summary.innerHTML = "";
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

  const programmeCost = costs.programmeCostPerCohort || 0;
  const opportunityCost = costs.opportunityCostPerCohort || 0;
  const totalEconomic = costs.totalEconomicCostPerCohort || 0;

  const lines = [];

  lines.push(
    "Programme cost per cohort (budgetary) is " +
      formatCurrency(programmeCost, state.currency) +
      "."
  );
  if (state.includeOpportunityCost && opportunityCost > 0) {
    lines.push(
      " Opportunity cost of trainee time adds " +
        formatCurrency(opportunityCost, state.currency) +
        " per cohort, giving a total economic cost of " +
        formatCurrency(totalEconomic, state.currency) +
        "."
    );
  } else {
    lines.push(
      " Total economic cost per cohort is " +
        formatCurrency(totalEconomic, state.currency) +
        "."
    );
  }

  if (costs.templateLabel) {
    lines.push(" Template used: " + costs.templateLabel + ".");
  }

  summary.textContent = lines.join(" ");

  (costs.components || []).forEach(comp => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = comp.label || "";
    tr.appendChild(tdName);

    const tdShare = document.createElement("td");
    tdShare.textContent = formatPercent((comp.share || 0), 1);
    tr.appendChild(tdShare);

    const tdAmountCohort = document.createElement("td");
    tdAmountCohort.textContent = formatCurrency(
      comp.amountPerCohort || 0,
      state.currency
    );
    tr.appendChild(tdAmountCohort);

    const tdAmountPerTrainee = document.createElement("td");
    tdAmountPerTrainee.textContent = formatCurrency(
      comp.amountPerTraineePerMonth || 0,
      state.currency
    );
    tr.appendChild(tdAmountPerTrainee);

    const tdNotes = document.createElement("td");
    const parts = [];
    if (comp.major) parts.push(comp.major);
    if (comp.category) parts.push(comp.category);
    if (comp.subCategory) parts.push(comp.subCategory);
    if (comp.description) parts.push(comp.description);
    tdNotes.textContent = parts.join(" / ");
    tr.appendChild(tdNotes);

    tbody.appendChild(tr);
  });
}

/* ===========================
   Config summary and headline
   =========================== */

function buildConfigSummaryText(cfg, costs) {
  const tierLabel =
    cfg.tier === "advanced"
      ? "Advanced"
      : cfg.tier === "intermediate"
      ? "Intermediate"
      : "Frontline";

  const responseLabel =
    cfg.response === "7"
      ? "within 7 days"
      : cfg.response === "15"
      ? "within 15 days"
      : "within 30 days";

  const parts = [];

  parts.push(
    tierLabel +
      " FETP with " +
      cfg.traineesPerCohort +
      " trainees per cohort and " +
      cfg.numberOfCohorts +
      " planned cohorts."
  );
  parts.push(
    " Career incentive: " +
      (cfg.career === "career_path"
        ? "government career pathway"
        : cfg.career === "uniqual"
        ? "university qualification"
        : "government and partner certificate") +
      "."
  );
  parts.push(
    " Mentorship: " +
      (cfg.mentorship === "high"
        ? "high intensity"
        : cfg.mentorship === "medium"
        ? "medium intensity"
        : "low intensity") +
      "."
  );
  parts.push(
    " Delivery mode: " +
      (cfg.delivery === "online"
        ? "fully online"
        : cfg.delivery === "inperson"
        ? "fully in person"
        : "blended") +
      "."
  );
  parts.push(
    " Expected response time for outbreaks: detect and respond " +
      responseLabel +
      "."
  );

  parts.push(
    " Cost per trainee per month is " +
      formatCurrency(cfg.costPerTraineePerMonth, state.currency) +
      " with a programme duration of " +
      costs.durationMonths +
      " months for this tier."
  );

  return parts.join(" ");
}

function classifyHeadline(results) {
  const endorse = results.util.endorseProb || 0;
  const bcr = results.bcrPerCohort;
  const net = results.netBenefitPerCohort;

  let status = "neutral";
  let tagText = "No assessment yet";
  let text = "";

  if (
    bcr === null ||
    !isFinite(bcr) ||
    results.costs.totalEconomicCostPerCohort <= 0
  ) {
    status = "neutral";
    tagText = "Needs configuration";
    text =
      "Apply a configuration with non zero cost to see a combined recommendation on endorsement, willingness to pay, costs and indicative epidemiological benefits.";
    return { status, tagText, text };
  }

  if (bcr > 1.3 && endorse >= 0.6 && net > 0) {
    status = "good";
    tagText = "Appears attractive";
    text =
      "This configuration appears attractive. Stakeholder endorsement is strong and indicative epidemiological benefits per cohort are clearly above total economic cost, suggesting good value for money on the current assumptions.";
  } else if (bcr >= 1 && net >= 0) {
    status = "watch";
    tagText = "Promising with caveats";
    text =
      "This configuration looks promising. Benefits are broadly in line with total economic cost and endorsement is adequate, but it may be useful to test alternative mentorship, response time or cost settings to strengthen the case.";
  } else {
    status = "poor";
    tagText = "Weak value for money";
    text =
      "This configuration appears weak from a value for money perspective. Indicative benefits are not clearly above economic costs and endorsement is modest. Consider adjusting programme tier, mentorship intensity, cost or cohort scale before recommending scale up.";
  }

  return { status, tagText, text };
}

function buildHeadlineBriefing(results) {
  const cfg = results.config;
  const endorsePct = (results.util.endorseProb || 0) * 100;
  const wtpPerTrainee = results.wtpPerTraineePerMonth;
  const wtpAll = results.wtpAllCohorts;
  const costAll = results.totalCostAllCohorts;
  const epiAll = results.epi.totalBenefitAllCohorts;
  const natBcr = results.natBcr;

  const tierLabel =
    cfg.tier === "advanced"
      ? "Advanced"
      : cfg.tier === "intermediate"
      ? "Intermediate"
      : "Frontline";

  const paragraphs = [];

  paragraphs.push(
    tierLabel +
      " FETP with " +
      cfg.traineesPerCohort +
      " trainees in each of " +
      cfg.numberOfCohorts +
      " cohorts is predicted to attract endorsement from about " +
      endorsePct.toFixed(1) +
      " % of stakeholders in the discrete choice experiment."
  );

  if (typeof wtpPerTrainee === "number" && isFinite(wtpPerTrainee)) {
    paragraphs.push(
      "The preference model implies an indicative willingness to pay of around " +
        formatCurrencyInr(wtpPerTrainee, 0) +
        " per trainee per month relative to the baseline design. Aggregated across all cohorts this corresponds to a total willingness to pay of approximately " +
        formatCurrencyInr(wtpAll || 0, 0) +
        "."
    );
  }

  paragraphs.push(
    "Total economic cost across all cohorts is around " +
      formatCurrency(costAll || 0, state.currency) +
      ", while the simple epidemiological module suggests total benefits of roughly " +
      formatCurrency(epiAll || 0, state.currency) +
      " over the chosen planning horizon."
  );

  if (natBcr !== null && isFinite(natBcr)) {
    paragraphs.push(
      "This implies a national benefit cost ratio of about " +
        natBcr.toFixed(2) +
        ". Values above one indicate that, under the current assumptions, estimated epidemiological benefits exceed economic costs."
    );
  }

  paragraphs.push(
    "These figures provide a concise summary for cabinet notes and steering committee discussions and can be combined with the detailed sensitivity table and Copilot interpretation to refine the final recommendation."
  );

  return paragraphs.join(" ");
}

/* ===========================
   Result cards (summary KPIs)
   =========================== */

function updateResultCards(results) {
  if (!results) return;

  const endorse = results.util.endorseProb || 0;
  const optOut = results.util.optOutProb || 0;
  const endorsePct = endorse * 100;
  const optOutPct = optOut * 100;

  const costPerCohort = results.costs.totalEconomicCostPerCohort || 0;
  const totalCostAllCohorts = results.totalCostAllCohorts || 0;

  const wtpPerTrainee = results.wtpPerTraineePerMonth;
  const wtpAll = results.wtpAllCohorts;

  const bcrPerCohort = results.bcrPerCohort;
  const netBenefitPerCohort = results.netBenefitPerCohort;

  const natBcr = results.natBcr;
  const natNet = results.natNetBenefit;

  const gradsAll = results.epi.graduatesAllCohorts || 0;
  const outbreaksPerYear = results.epi.outbreaksPerYearAllCohorts || 0;
  const epiBenefitAll = results.epi.totalBenefitAllCohorts || 0;

  setTextMulti(
    ["result-endorsement-rate", "kpi-endorsement-rate"],
    endorsePct.toFixed(1) + " %"
  );
  setTextMulti(
    ["result-optout-rate", "kpi-optout-rate"],
    optOutPct.toFixed(1) + " %"
  );

  setTextMulti(
    ["result-cost-cohort", "kpi-cost-per-cohort"],
    formatCurrency(costPerCohort, state.currency)
  );
  setTextMulti(
    ["result-cost-all-cohorts", "kpi-cost-all-cohorts"],
    formatCurrency(totalCostAllCohorts, state.currency)
  );

  setTextMulti(
    ["result-wtp-per-trainee", "kpi-wtp-per-trainee"],
    typeof wtpPerTrainee === "number" && isFinite(wtpPerTrainee)
      ? formatCurrencyInr(wtpPerTrainee, 0)
      : "-"
  );
  setTextMulti(
    ["result-wtp-all-cohorts", "kpi-wtp-all-cohorts"],
    wtpAll !== null && wtpAll !== undefined
      ? formatCurrency(wtpAll, state.currency)
      : "-"
  );

  setTextMulti(
    ["result-bcr-cohort", "kpi-bcr-cohort"],
    bcrPerCohort !== null && isFinite(bcrPerCohort)
      ? bcrPerCohort.toFixed(2)
      : "-"
  );
  setTextMulti(
    ["result-net-benefit-cohort", "kpi-net-benefit-cohort"],
    netBenefitPerCohort !== null && isFinite(netBenefitPerCohort)
      ? formatCurrency(netBenefitPerCohort, state.currency)
      : "-"
  );

  setTextMulti(
    ["result-nat-bcr", "kpi-nat-bcr"],
    natBcr !== null && isFinite(natBcr) ? natBcr.toFixed(2) : "-"
  );
  setTextMulti(
    ["result-nat-net-benefit", "kpi-nat-net-benefit"],
    natNet !== null && isFinite(natNet)
      ? formatCurrency(natNet, state.currency)
      : "-"
  );

  setTextMulti(
    ["result-graduates-total", "kpi-graduates-total"],
    formatNumber(gradsAll, 0)
  );
  setTextMulti(
    ["result-outbreaks-per-year", "kpi-outbreaks-per-year"],
    formatNumber(outbreaksPerYear, 1)
  );
  setTextMulti(
    ["result-epi-benefit-total", "kpi-epi-benefit-total"],
    formatCurrency(epiBenefitAll, state.currency)
  );
}

/* ===========================
   National simulation summary
   =========================== */

function buildNationalSummaryText(results) {
  const cfg = results.config;
  const grads = results.epi.graduatesAllCohorts || 0;
  const outbreaks = results.epi.outbreaksPerYearAllCohorts || 0;
  const natCost = results.totalCostAllCohorts || 0;
  const natBenefit = results.epi.totalBenefitAllCohorts || 0;
  const natBcr = results.natBcr;

  const parts = [];

  parts.push(
    "Under this configuration, scaling to " +
      cfg.numberOfCohorts +
      " cohorts with " +
      cfg.traineesPerCohort +
      " trainees each would produce around " +
      formatNumber(grads, 0) +
      " graduates once all cohorts complete."
  );
  parts.push(
    " Graduates are expected to support roughly " +
      formatNumber(outbreaks, 1) +
      " outbreak responses per year in total once the system is fully staffed."
  );
  parts.push(
    " Total economic cost of this scale up is approximately " +
      formatCurrency(natCost, state.currency) +
      ", while total indicative epidemiological benefits over the planning horizon are around " +
      formatCurrency(natBenefit, state.currency) +
      "."
  );
  if (natBcr !== null && isFinite(natBcr)) {
    parts.push(
      " This corresponds to a national benefit cost ratio of about " +
        natBcr.toFixed(2) +
        ", which can be compared with alternative configurations in the sensitivity tables."
    );
  }

  return parts.join(" ");
}

/* ===========================
   Advanced settings and log
   =========================== */

function populateAdvancedSettingsForm() {
  const s = state.epiSettings;

  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (el && typeof value === "number") {
      el.value = value;
    }
  };

  setVal("adv-inr-per-usd", s.general.inrPerUsd);

  setVal("adv-frontline-grads", s.tiers.frontline.gradShare);
  setVal(
    "adv-frontline-outbreaks",
    s.tiers.frontline.outbreaksPerCohortPerYear
  );
  setVal("adv-frontline-vgrad", s.tiers.frontline.valuePerGraduate);
  setVal(
    "adv-frontline-voutbreak",
    s.tiers.frontline.valuePerOutbreak
  );

  setVal("adv-intermediate-grads", s.tiers.intermediate.gradShare);
  setVal(
    "adv-intermediate-outbreaks",
    s.tiers.intermediate.outbreaksPerCohortPerYear
  );
  setVal(
    "adv-intermediate-vgrad",
    s.tiers.intermediate.valuePerGraduate
  );
  setVal(
    "adv-intermediate-voutbreak",
    s.tiers.intermediate.valuePerOutbreak
  );

  setVal("adv-advanced-grads", s.tiers.advanced.gradShare);
  setVal(
    "adv-advanced-outbreaks",
    s.tiers.advanced.outbreaksPerCohortPerYear
  );
  setVal("adv-advanced-vgrad", s.tiers.advanced.valuePerGraduate);
  setVal(
    "adv-advanced-voutbreak",
    s.tiers.advanced.valuePerOutbreak
  );
}

function applyAdvancedSettings() {
  const getNum = (id, fallback) => {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const v = parseFloat(el.value);
    return isNaN(v) ? fallback : v;
  };

  const s = state.epiSettings;

  s.general.inrPerUsd = getNum(
    "adv-inr-per-usd",
    DEFAULT_EPI_SETTINGS.general.inrPerUsd
  );

  s.tiers.frontline.gradShare = getNum(
    "adv-frontline-grads",
    DEFAULT_EPI_SETTINGS.tiers.frontline.gradShare
  );
  s.tiers.frontline.outbreaksPerCohortPerYear = getNum(
    "adv-frontline-outbreaks",
    DEFAULT_EPI_SETTINGS.tiers.frontline.outbreaksPerCohortPerYear
  );
  s.tiers.frontline.valuePerGraduate = getNum(
    "adv-frontline-vgrad",
    DEFAULT_EPI_SETTINGS.tiers.frontline.valuePerGraduate
  );
  s.tiers.frontline.valuePerOutbreak = getNum(
    "adv-frontline-voutbreak",
    DEFAULT_EPI_SETTINGS.tiers.frontline.valuePerOutbreak
  );

  s.tiers.intermediate.gradShare = getNum(
    "adv-intermediate-grads",
    DEFAULT_EPI_SETTINGS.tiers.intermediate.gradShare
  );
  s.tiers.intermediate.outbreaksPerCohortPerYear = getNum(
    "adv-intermediate-outbreaks",
    DEFAULT_EPI_SETTINGS.tiers.intermediate.outbreaksPerCohortPerYear
  );
  s.tiers.intermediate.valuePerGraduate = getNum(
    "adv-intermediate-vgrad",
    DEFAULT_EPI_SETTINGS.tiers.intermediate.valuePerGraduate
  );
  s.tiers.intermediate.valuePerOutbreak = getNum(
    "adv-intermediate-voutbreak",
    DEFAULT_EPI_SETTINGS.tiers.intermediate.valuePerOutbreak
  );

  s.tiers.advanced.gradShare = getNum(
    "adv-advanced-grads",
    DEFAULT_EPI_SETTINGS.tiers.advanced.gradShare
  );
  s.tiers.advanced.outbreaksPerCohortPerYear = getNum(
    "adv-advanced-outbreaks",
    DEFAULT_EPI_SETTINGS.tiers.advanced.outbreaksPerCohortPerYear
  );
  s.tiers.advanced.valuePerGraduate = getNum(
    "adv-advanced-vgrad",
    DEFAULT_EPI_SETTINGS.tiers.advanced.valuePerGraduate
  );
  s.tiers.advanced.valuePerOutbreak = getNum(
    "adv-advanced-voutbreak",
    DEFAULT_EPI_SETTINGS.tiers.advanced.valuePerOutbreak
  );

  showToast("Advanced settings applied for this session.");
  if (state.lastResults) {
    applyConfiguration(false);
  }
}

function resetAdvancedSettings() {
  state.epiSettings = JSON.parse(
    JSON.stringify(DEFAULT_EPI_SETTINGS)
  );
  populateAdvancedSettingsForm();
  showToast("Advanced settings reset to defaults.");
  if (state.lastResults) {
    applyConfiguration(false);
  }
}

function updateAssumptionLog(results) {
  const pre = document.getElementById("assumption-log-text");
  if (!pre) return;

  const s = state.epiSettings;
  const cfg = results.config;

  const tierLabel =
    cfg.tier === "advanced"
      ? "Advanced"
      : cfg.tier === "intermediate"
      ? "Intermediate"
      : "Frontline";

  const lines = [];

  lines.push("STEPS assumption log");
  lines.push("--------------------");
  lines.push("Configuration tier: " + tierLabel);
  lines.push(
    "Trainees per cohort: " +
      cfg.traineesPerCohort +
      ", number of cohorts: " +
      cfg.numberOfCohorts +
      "."
  );
  lines.push(
    "Cost per trainee per month (input): " +
      formatCurrencyInr(cfg.costPerTraineePerMonth, 0) +
      "."
  );
  lines.push("");
  lines.push(
    "Planning horizon for outbreak benefits: " +
      s.general.planningHorizonYears +
      " years."
  );
  lines.push(
    "Display exchange rate: " +
      s.general.inrPerUsd +
      " INR per USD."
  );
  lines.push("");
  ["frontline", "intermediate", "advanced"].forEach(tier => {
    const t = s.tiers[tier];
    lines.push(
      tier.toUpperCase() +
        " parameters: graduation share " +
        t.gradShare +
        ", outbreak responses per cohort per year " +
        t.outbreaksPerCohortPerYear +
        ", value per graduate " +
        formatCurrencyInr(t.valuePerGraduate, 0) +
        ", value per outbreak " +
        formatCurrencyInr(t.valuePerOutbreak, 0) +
        "."
    );
  });

  lines.push("");
  lines.push(
    "Opportunity cost included: " +
      (state.includeOpportunityCost ? "yes" : "no") +
      "."
  );

  pre.textContent = lines.join("\n");
}

/* ===========================
   Copilot helper
   =========================== */

function buildCopilotScenarioJson(results) {
  if (!results) return null;

  const cfg = results.config;

  const obj = {
    tool: "STEPS FETP India Decision Aid",
    model: "Mixed logit overall sample",
    configuration: {
      programme_tier: cfg.tier,
      career_incentive: cfg.career,
      mentorship_intensity: cfg.mentorship,
      delivery_mode: cfg.delivery,
      response_time_days: parseInt(cfg.response, 10),
      cost_per_trainee_per_month_inr: cfg.costPerTraineePerMonth,
      trainees_per_cohort: cfg.traineesPerCohort,
      number_of_cohorts: cfg.numberOfCohorts,
      scenario_name: cfg.scenarioName || "",
      scenario_notes: cfg.scenarioNotes || ""
    },
    endorsement_and_wtp: {
      endorsement_rate: results.util.endorseProb,
      opt_out_rate: results.util.optOutProb,
      wtp_per_trainee_per_month_inr: results.wtpPerTraineePerMonth,
      total_wtp_all_cohorts_inr: results.wtpAllCohorts
    },
    costs: {
      programme_cost_per_cohort_inr:
        results.costs.programmeCostPerCohort,
      opportunity_cost_per_cohort_inr:
        results.costs.opportunityCostPerCohort,
      total_economic_cost_per_cohort_inr:
        results.costs.totalEconomicCostPerCohort,
      total_economic_cost_all_cohorts_inr:
        results.totalCostAllCohorts
    },
    epidemiological_outputs: {
      graduates_all_cohorts:
        results.epi.graduatesAllCohorts,
      outbreak_responses_per_year_all_cohorts:
        results.epi.outbreaksPerYearAllCohorts,
      total_epidemiological_benefit_all_cohorts_inr:
        results.epi.totalBenefitAllCohorts,
      benefit_per_cohort_inr:
        results.epi.benefitPerCohort
    },
    economic_summary: {
      benefit_cost_ratio_per_cohort: results.bcrPerCohort,
      net_benefit_per_cohort_inr:
        results.netBenefitPerCohort,
      national_benefit_cost_ratio: results.natBcr,
      national_net_benefit_inr: results.natNetBenefit
    }
  };

  return obj;
}

function updateCopilotPreparedText() {
  const textarea = document.getElementById(
    "copilot-prepared-text"
  );
  if (!textarea) return;

  if (!state.lastResults) {
    textarea.value =
      "Apply a configuration and update the results in STEPS to generate the full Copilot prompt and scenario JSON here. The prepared text will include the STEPS Copilot Interpretation Prompt followed by a JSON block that summarises your current scenario.";
    return;
  }

  const scenarioJson = buildCopilotScenarioJson(state.lastResults);
  const jsonText = JSON.stringify(scenarioJson, null, 2);

  const combined = [
    COPILOT_INTERPRETATION_PROMPT.trim(),
    "",
    "STEPS scenario JSON",
    "-------------------",
    jsonText
  ].join("\n");

  textarea.value = combined;
}

function setupCopilotCopyButton() {
  const btn = document.getElementById("copilot-copy-button");
  const textarea = document.getElementById(
    "copilot-prepared-text"
  );
  if (!btn || !textarea) return;

  btn.addEventListener("click", () => {
    if (!state.lastResults) {
      showToast(
        "Run an analysis first so the Copilot text can be prepared."
      );
      updateCopilotPreparedText();
    }

    const text = textarea.value || "";
    if (!text.trim()) {
      showToast(
        "There is no prepared text yet. Apply a configuration first."
      );
      return;
    }

    const copyPromise =
      navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(text)
        : new Promise((resolve, reject) => {
            textarea.select();
            const ok = document.execCommand("copy");
            if (ok) resolve();
            else reject();
          });

    copyPromise
      .then(() => {
        showToast("Prepared prompt copied. A new Copilot tab is opening.");
      })
      .catch(() => {
        showToast(
          "Could not copy automatically. Use the box below to copy the text manually."
        );
      })
      .finally(() => {
        window.open("https://copilot.microsoft.com/", "_blank", "noopener");
      });
  });
}

/* ===========================
   DCE sensitivity tables
   =========================== */

function buildSensitivityScenarioList() {
  const list = [];

  if (state.lastResults) {
    list.push({
      kind: "current",
      label:
        state.lastResults.config.scenarioName ||
        "Current configuration",
      config: state.lastResults.config,
      costSourceId: state.lastResults.costSourceId
    });
  }

  state.scenarios.forEach((sc, idx) => {
    list.push({
      kind: "saved",
      label: sc.name || "Saved scenario " + (idx + 1),
      config: sc.config,
      costSourceId: sc.costSourceId
    });
  });

  return list;
}

function refreshSensitivityTables(showToastFlag) {
  const benefitDefSelect = document.getElementById(
    "benefit-definition-select"
  );
  const benefitDefinition = benefitDefSelect
    ? benefitDefSelect.value
    : "wtp_only";
  const includeEpi = isSensitivityEpiIncluded();
  const dceTbody = document.getElementById(
    "dce-benefits-table-body"
  );
  const sensTbody = document.getElementById(
    "sensitivity-table-body"
  );

  if (!dceTbody || !sensTbody) return;

  while (dceTbody.firstChild) dceTbody.removeChild(dceTbody.firstChild);
  while (sensTbody.firstChild) sensTbody.removeChild(sensTbody.firstChild);

  const scenarios = buildSensitivityScenarioList();
  if (!scenarios.length) {
    if (showToastFlag) {
      showToast(
        "Apply a configuration or save scenarios before updating the sensitivity table."
      );
    }
    return;
  }

  scenarios.forEach(item => {
    const res = computeScenarioResults(
      item.config,
      item.costSourceId
    );
    const profile = computeDceCbaProfile(
      item.config,
      res.costs,
      res.epi,
      {
        benefitDefinition,
        includeEpi,
        useOverride: true
      }
    );
    const scenLabel = item.label;

    const trHead = document.createElement("tr");

    const costAll = profile.totalCostAllCohorts;
    const wtpAll = profile.wtpAllCohorts;
    const wtpRespAll = profile.wtpRespAllCohorts;
    const epiOutbreakAll = profile.epiOutbreakAllCohorts;
    const endorseUsedPct = profile.endorsementUsed * 100;
    const effectiveWtp = profile.effectiveWtpAll;
    const bcrDce = profile.bcrDce;
    const npvDce = profile.npvDce;
    const bcrCombined = profile.bcrCombined;
    const npvCombined = profile.npvCombined;

    const cellsHead = [
      scenLabel,
      formatCurrency(costAll || 0, state.currency),
      formatCurrency(wtpAll || 0, state.currency),
      formatCurrency(wtpRespAll || 0, state.currency),
      formatCurrency(epiOutbreakAll || 0, state.currency),
      endorseUsedPct.toFixed(1) + " %",
      effectiveWtp !== null
        ? formatCurrency(effectiveWtp, state.currency)
        : "-",
      bcrDce !== null && isFinite(bcrDce)
        ? bcrDce.toFixed(2)
        : "-",
      npvDce !== null
        ? formatCurrency(npvDce, state.currency)
        : "-",
      bcrCombined !== null && isFinite(bcrCombined)
        ? bcrCombined.toFixed(2)
        : "-",
      npvCombined !== null
        ? formatCurrency(npvCombined, state.currency)
        : "-"
    ];

    cellsHead.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      trHead.appendChild(td);
    });

    dceTbody.appendChild(trHead);

    const trDet = document.createElement("tr");
    const resModel = "MXL overall";

    const detCells = [
      scenLabel,
      resModel,
      formatPercent(res.util.endorseProb || 0, 1),
      formatCurrency(
        res.costs.totalEconomicCostPerCohort || 0,
        state.currency
      ),
      formatCurrency(
        profile.wtpAllCohorts || 0,
        state.currency
      ),
      formatCurrency(
        profile.wtpRespAllCohorts || 0,
        state.currency
      ),
      formatCurrency(
        profile.epiOutbreakAllCohorts || 0,
        state.currency
      ),
      bcrDce !== null && isFinite(bcrDce)
        ? bcrDce.toFixed(2)
        : "-",
      npvDce !== null
        ? formatCurrency(npvDce, state.currency)
        : "-",
      bcrCombined !== null && isFinite(bcrCombined)
        ? bcrCombined.toFixed(2)
        : "-",
      npvCombined !== null
        ? formatCurrency(npvCombined, state.currency)
        : "-",
      profile.effectiveWtpAll !== null
        ? formatCurrency(
            profile.effectiveWtpAll,
            state.currency
          )
        : "-",
      profile.effectiveCombinedAll !== null
        ? formatCurrency(
            profile.effectiveCombinedAll,
            state.currency
          )
        : "-"
    ];

    detCells.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      trDet.appendChild(td);
    });

    sensTbody.appendChild(trDet);
  });

  if (showToastFlag) {
    showToast("Sensitivity summary updated.");
  }
}

function setupSensitivityControls() {
  const epiToggle = document.getElementById("sensitivity-epi-toggle");
  if (epiToggle) {
    epiToggle.addEventListener("click", () => {
      epiToggle.classList.toggle("on");
      refreshSensitivityTables(false);
    });
  }

  const benefitSelect = document.getElementById("benefit-definition-select");
  if (benefitSelect) {
    benefitSelect.addEventListener("change", () => {
      refreshSensitivityTables(false);
    });
  }

  const overrideInput = document.getElementById("endorsement-override");
  if (overrideInput) {
    const handler = () => refreshSensitivityTables(false);
    overrideInput.addEventListener("change", handler);
    overrideInput.addEventListener("keyup", e => {
      if (e.key === "Enter") handler();
    });
  }
}

/* ===========================
   Sensitivity exports
   =========================== */

function exportSensitivityToExcel() {
  if (typeof XLSX === "undefined") {
    showToast("Excel export library not available.");
    return;
  }

  const benefitDefSelect = document.getElementById(
    "benefit-definition-select"
  );
  const benefitDefinition = benefitDefSelect
    ? benefitDefSelect.value
    : "wtp_only";
  const includeEpi = isSensitivityEpiIncluded();

  const scenarios = buildSensitivityScenarioList();
  if (!scenarios.length) {
    showToast("No scenarios available for export.");
    return;
  }

  const rows = [];

  scenarios.forEach(item => {
    const res = computeScenarioResults(
      item.config,
      item.costSourceId
    );
    const profile = computeDceCbaProfile(
      item.config,
      res.costs,
      res.epi,
      {
        benefitDefinition,
        includeEpi,
        useOverride: true
      }
    );
    rows.push({
      Scenario: item.label,
      Model: "MXL overall",
      "Endorsement rate used": profile.endorsementUsed,
      "Cost all cohorts (INR)": profile.totalCostAllCohorts,
      "Total WTP benefit (INR)": profile.wtpAllCohorts,
      "WTP from response capacity (INR)":
        profile.wtpRespAllCohorts,
      "Epi based outbreak benefit (INR)":
        profile.epiOutbreakAllCohorts,
      "Effective WTP benefit (INR)":
        profile.effectiveWtpAll,
      "Effective combined benefit (INR)":
        profile.effectiveCombinedAll,
      "BCR DCE": profile.bcrDce,
      "NPV DCE (INR)": profile.npvDce,
      "BCR DCE plus epi": profile.bcrCombined,
      "NPV DCE plus epi (INR)": profile.npvCombined
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sensitivity");
  XLSX.writeFile(wb, "STEPS_sensitivity_table.xlsx");
  showToast("Sensitivity table exported to Excel.");
}

function exportSensitivityToPdf() {
  const jspdf = window.jspdf;
  if (!jspdf || !jspdf.jsPDF) {
    showToast("PDF export library not available.");
    return;
  }
  const { jsPDF } = jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const benefitDefSelect = document.getElementById(
    "benefit-definition-select"
  );
  const benefitDefinition = benefitDefSelect
    ? benefitDefSelect.value
    : "wtp_only";
  const includeEpi = isSensitivityEpiIncluded();

  const scenarios = buildSensitivityScenarioList();
  if (!scenarios.length) {
    showToast("No scenarios available for export.");
    return;
  }

  doc.setFontSize(14);
  doc.text(
    "STEPS FETP India Decision Aid - Sensitivity table",
    40,
    40
  );
  doc.setFontSize(9);
  doc.text(
    "Benefit definition view: " +
      benefitDefinition +
      ", outbreak benefits included: " +
      (includeEpi ? "yes" : "no") +
      ".",
    40,
    60
  );

  let y = 80;

  scenarios.forEach((item, idx) => {
    const res = computeScenarioResults(
      item.config,
      item.costSourceId
    );
    const profile = computeDceCbaProfile(
      item.config,
      res.costs,
      res.epi,
      {
        benefitDefinition,
        includeEpi,
        useOverride: true
      }
    );

    if (y > 760) {
      doc.addPage();
      y = 50;
    }

    doc.setFontSize(11);
    doc.text((idx + 1) + ". " + item.label, 40, y);
    y += 14;

    doc.setFontSize(9);
    doc.text(
      "Endorsement used: " +
        (profile.endorsementUsed * 100).toFixed(1) +
        " %, cost (all cohorts): " +
        formatCurrencyInr(profile.totalCostAllCohorts || 0, 0) +
        ".",
      40,
      y
    );
    y += 11;

    doc.text(
      "Total WTP: " +
        formatCurrencyInr(profile.wtpAllCohorts || 0, 0) +
        ", WTP from response: " +
        formatCurrencyInr(profile.wtpRespAllCohorts || 0, 0) +
        ", epi outbreak benefit: " +
        formatCurrencyInr(profile.epiOutbreakAllCohorts || 0, 0) +
        ".",
      40,
      y
    );
    y += 11;

    doc.text(
      "BCR (DCE): " +
        (profile.bcrDce !== null && isFinite(profile.bcrDce)
          ? profile.bcrDce.toFixed(2)
          : "-") +
        ", NPV (DCE): " +
        (profile.npvDce !== null
          ? formatCurrencyInr(profile.npvDce, 0)
          : "-") +
        ".",
      40,
      y
    );
    y += 11;

    doc.text(
      "BCR (DCE plus epi): " +
        (profile.bcrCombined !== null &&
        isFinite(profile.bcrCombined)
          ? profile.bcrCombined.toFixed(2)
          : "-") +
        ", NPV (DCE plus epi): " +
        (profile.npvCombined !== null
          ? formatCurrencyInr(profile.npvCombined, 0)
          : "-") +
        ".",
      40,
      y
    );
    y += 16;
  });

  doc.save("STEPS_sensitivity_table.pdf");
  showToast("Sensitivity table exported to PDF.");
}

/* ===========================
   Scenario table and exports
   =========================== */

function renderScenarioTable() {
  let tbody = document.querySelector("#scenario-table tbody");
  if (!tbody) {
    tbody = document.getElementById("scenario-table-body");
  }
  if (!tbody) return;

  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

  state.scenarios.forEach((sc, idx) => {
    const tr = document.createElement("tr");

    const tdShort = document.createElement("td");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = !!sc.shortlisted;
    chk.addEventListener("change", () => {
      sc.shortlisted = chk.checked;
    });
    tdShort.appendChild(chk);
    tr.appendChild(tdShort);

    const cells = [
      sc.name || "Scenario " + (idx + 1),
      sc.tags || "",
      sc.config.tier,
      sc.config.career,
      sc.config.mentorship,
      sc.config.delivery,
      sc.config.response,
      sc.config.numberOfCohorts,
      sc.config.traineesPerCohort,
      formatCurrency(
        sc.config.costPerTraineePerMonth,
        state.currency
      ),
      sc.modelLabel || "MXL overall",
      formatPercent(sc.endorsementRate || 0, 1),
      sc.wtpPerTraineePerMonth !== null &&
      typeof sc.wtpPerTraineePerMonth === "number"
        ? formatCurrencyInr(
            sc.wtpPerTraineePerMonth,
            0
          )
        : "-",
      sc.totalWtpAllCohorts !== null
        ? formatCurrency(
            sc.totalWtpAllCohorts,
            state.currency
          )
        : "-",
      sc.bcr !== null && isFinite(sc.bcr)
        ? sc.bcr.toFixed(2)
        : "-",
      formatCurrency(
        sc.totalCostAllCohorts || 0,
        state.currency
      ),
      formatCurrency(
        sc.totalEpiBenefitAllCohorts || 0,
        state.currency
      ),
      formatCurrency(
        sc.netEpiBenefitAllCohorts || 0,
        state.currency
      ),
      formatNumber(
        sc.outbreakResponsesPerYear || 0,
        1
      ),
      sc.notes || ""
    ];

    cells.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function saveCurrentScenario() {
  if (!state.lastResults) {
    showToast("Apply a configuration before saving a scenario.");
    return;
  }

  const res = state.lastResults;
  const cfg = res.config;

  const scenario = {
    id: Date.now(),
    name:
      cfg.scenarioName ||
      "Scenario " + (state.scenarios.length + 1),
    tags: "",
    config: { ...cfg },
    modelLabel: "MXL overall",
    endorsementRate: res.util.endorseProb || 0,
    wtpPerTraineePerMonth: res.wtpPerTraineePerMonth,
    totalWtpAllCohorts: res.wtpAllCohorts,
    bcr: res.natBcr,
    totalCostAllCohorts: res.totalCostAllCohorts,
    totalEpiBenefitAllCohorts:
      res.epi.totalBenefitAllCohorts,
    netEpiBenefitAllCohorts: res.natNetBenefit,
    outbreakResponsesPerYear:
      res.epi.outbreaksPerYearAllCohorts,
    notes: cfg.scenarioNotes || "",
    costSourceId: res.costSourceId || null,
    shortlisted: false
  };

  state.scenarios.push(scenario);
  renderScenarioTable();
  refreshSensitivityTables(false);
  showToast("Scenario saved.");
}

function exportScenariosToExcel() {
  if (typeof XLSX === "undefined") {
    showToast("Excel export library not available.");
    return;
  }

  if (!state.scenarios.length && !state.lastResults) {
    showToast("No scenarios available for export.");
    return;
  }

  const rows = [];

  state.scenarios.forEach(sc => {
    rows.push({
      Shortlisted: sc.shortlisted ? "Yes" : "No",
      Name: sc.name,
      Tier: sc.config.tier,
      Career: sc.config.career,
      Mentorship: sc.config.mentorship,
      Delivery: sc.config.delivery,
      Response_days: sc.config.response,
      Cohorts: sc.config.numberOfCohorts,
      Trainees_per_cohort: sc.config.traineesPerCohort,
      Cost_per_trainee_per_month_inr:
        sc.config.costPerTraineePerMonth,
      Model: sc.modelLabel,
      Endorsement_rate: sc.endorsementRate,
      WTP_per_trainee_per_month_inr:
        sc.wtpPerTraineePerMonth,
      Total_WTP_all_cohorts_inr: sc.totalWtpAllCohorts,
      BCR: sc.bcr,
      Total_economic_cost_all_cohorts_inr:
        sc.totalCostAllCohorts,
      Total_epi_benefit_all_cohorts_inr:
        sc.totalEpiBenefitAllCohorts,
      Net_epi_benefit_all_cohorts_inr:
        sc.netEpiBenefitAllCohorts,
      Outbreak_responses_per_year:
        sc.outbreakResponsesPerYear,
      Notes: sc.notes
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Scenarios");
  XLSX.writeFile(wb, "STEPS_saved_scenarios.xlsx");
  showToast("Saved scenarios exported to Excel.");
}

function exportScenariosToPdf() {
  const jspdf = window.jspdf;
  if (!jspdf || !jspdf.jsPDF) {
    showToast("PDF export library not available.");
    return;
  }
  const { jsPDF } = jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  if (!state.scenarios.length && !state.lastResults) {
    showToast("No scenarios available for export.");
    return;
  }

  doc.setFontSize(14);
  doc.text(
    "STEPS FETP India Decision Aid - Saved scenarios",
    40,
    40
  );
  let y = 60;

  state.scenarios.forEach((sc, idx) => {
    if (y > 760) {
      doc.addPage();
      y = 50;
    }

    doc.setFontSize(11);
    doc.text((idx + 1) + ". " + sc.name, 40, y);
    y += 14;

    doc.setFontSize(9);
    doc.text(
      "Tier: " +
        sc.config.tier +
        ", mentorship: " +
        sc.config.mentorship +
        ", delivery: " +
        sc.config.delivery +
        ", response: " +
        sc.config.response +
        " days.",
      40,
      y
    );
    y += 11;

    doc.text(
      "Cohorts: " +
        sc.config.numberOfCohorts +
        ", trainees per cohort: " +
        sc.config.traineesPerCohort +
        ", cost per trainee per month: " +
        formatCurrencyInr(
          sc.config.costPerTraineePerMonth,
          0
        ) +
        ".",
      40,
      y
    );
    y += 11;

    doc.text(
      "Endorsement rate: " +
        formatPercent(sc.endorsementRate || 0, 1) +
        ", total cost: " +
        formatCurrencyInr(
          sc.totalCostAllCohorts || 0,
          0
        ) +
        ", total epidemiological benefit: " +
        formatCurrencyInr(
          sc.totalEpiBenefitAllCohorts || 0,
          0
        ) +
        ".",
      40,
      y
    );
    y += 11;

    doc.text(
      "Net epidemiological benefit: " +
        formatCurrencyInr(
          sc.netEpiBenefitAllCohorts || 0,
          0
        ) +
        ", benefit cost ratio: " +
        (sc.bcr !== null && isFinite(sc.bcr)
          ? sc.bcr.toFixed(2)
          : "-") +
        ".",
      40,
      y
    );
    y += 11;

    if (sc.notes) {
      doc.text("Notes: " + sc.notes, 40, y);
      y += 11;
    }

    y += 8;
  });

  doc.save("STEPS_saved_scenarios.pdf");
  showToast("Saved scenarios exported to PDF.");
}

/* ===========================
   Save and load project JSON
   =========================== */

function buildProjectObject() {
  return {
    version: "1.0",
    currency: state.currency,
    includeOpportunityCost: state.includeOpportunityCost,
    epiSettings: state.epiSettings,
    scenarios: state.scenarios,
    lastConfig: state.lastResults ? state.lastResults.config : null,
    lastCostSourceId: state.currentCostSourceId
  };
}

function saveProjectJson() {
  const dataStr = JSON.stringify(buildProjectObject(), null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "STEPS_project.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Project JSON saved.");
}

function applyConfigToInputs(cfg) {
  if (!cfg) return;
  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
      el.value = value;
    }
  };

  setVal("program-tier", cfg.tier);
  setVal("career-track", cfg.career);
  setVal("mentorship", cfg.mentorship);
  setVal("delivery", cfg.delivery);
  setVal("response", cfg.response);
  setVal("cost-slider", cfg.costPerTraineePerMonth);
  setVal("trainees", cfg.traineesPerCohort);
  setVal("cohorts", cfg.numberOfCohorts);
  setVal("scenario-name", cfg.scenarioName || "");
  setVal("scenario-notes", cfg.scenarioNotes || "");

  updateCostSliderDisplay();
  updateTraineeCohortDisplay();
}

function loadProjectObject(obj) {
  if (!obj || typeof obj !== "object") {
    showToast("Invalid project file.");
    return;
  }

  if (obj.epiSettings) {
    state.epiSettings = obj.epiSettings;
  } else {
    state.epiSettings = JSON.parse(JSON.stringify(DEFAULT_EPI_SETTINGS));
  }

  state.currency = obj.currency || "INR";
  state.includeOpportunityCost =
    typeof obj.includeOpportunityCost === "boolean"
      ? obj.includeOpportunityCost
      : true;

  state.scenarios = Array.isArray(obj.scenarios)
    ? obj.scenarios
    : [];

  state.currentCostSourceId = obj.lastCostSourceId || null;

  renderScenarioTable();
  populateAdvancedSettingsForm();

  if (obj.lastConfig) {
    applyConfigToInputs(obj.lastConfig);
    applyConfiguration(false);
  }

  showToast("Project JSON loaded.");
}

function setupProjectSaveLoad() {
  const saveBtnIds = ["saveProject", "btn-save-project"];
  const loadBtnIds = ["loadProject", "btn-load-project"];
  const fileInputIds = ["loadFile", "project-file-input"];

  let saveBtn = null;
  let loadBtn = null;
  let fileInput = null;

  saveBtnIds.forEach(id => {
    if (!saveBtn) {
      const el = document.getElementById(id);
      if (el) saveBtn = el;
    }
  });
  loadBtnIds.forEach(id => {
    if (!loadBtn) {
      const el = document.getElementById(id);
      if (el) loadBtn = el;
    }
  });
  fileInputIds.forEach(id => {
    if (!fileInput) {
      const el = document.getElementById(id);
      if (el) fileInput = el;
    }
  });

  if (saveBtn) {
    saveBtn.addEventListener("click", saveProjectJson);
  }

  if (loadBtn && fileInput) {
    loadBtn.addEventListener("click", () => {
      fileInput.value = "";
      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const obj = JSON.parse(evt.target.result);
          loadProjectObject(obj);
        } catch (e) {
          showToast("Could not read project JSON.");
        }
      };
      reader.readAsText(file);
    });
  }
}

/* ===========================
   Main apply configuration
   =========================== */

function updateHeadlineUi(results) {
  const cfgSummaryEl = document.getElementById("config-summary-text");
  const headTagEl = document.getElementById("headline-tag");
  const headTextEl = document.getElementById("headline-text");
  const headBriefEl = document.getElementById("headline-briefing-text");
  const natSummaryEl = document.getElementById("national-summary-text");

  if (cfgSummaryEl) {
    cfgSummaryEl.textContent = buildConfigSummaryText(
      results.config,
      results.costs
    );
  }

  const head = classifyHeadline(results);
  if (headTagEl) {
    headTagEl.textContent = head.tagText;
    headTagEl.classList.remove(
      "headline-status-good",
      "headline-status-watch",
      "headline-status-poor",
      "headline-status-neutral"
    );
    const cls =
      head.status === "good"
        ? "headline-status-good"
        : head.status === "watch"
        ? "headline-status-watch"
        : head.status === "poor"
        ? "headline-status-poor"
        : "headline-status-neutral";
    headTagEl.classList.add(cls);
  }
  if (headTextEl) {
    headTextEl.textContent = head.text;
  }
  if (headBriefEl) {
    headBriefEl.textContent = buildHeadlineBriefing(results);
  }
  if (natSummaryEl) {
    natSummaryEl.textContent = buildNationalSummaryText(results);
  }
}

function applyConfiguration(switchToResultsTab) {
  const cfg = readConfigurationFromInputs();

  if (
    cfg.traineesPerCohort <= 0 ||
    cfg.numberOfCohorts <= 0 ||
    cfg.costPerTraineePerMonth <= 0
  ) {
    showToast(
      "Please set trainees, cohorts and cost per trainee per month to values above zero."
    );
    return;
  }

  state.currentTier = cfg.tier;

  populateCostSourceOptions(cfg.tier);

  const results = computeScenarioResults(cfg);
  state.lastResults = results;

  updateCostBreakdown(results);
  updateUptakeChart(results);
  updateBcrChart(results);
  updateEpiChart(results);
  updateNationalCharts(results);
  updateAssumptionLog(results);
  updateHeadlineUi(results);
  updateResultCards(results);
  updateCopilotPreparedText();
  refreshSensitivityTables(false);

  if (switchToResultsTab) {
    setActiveTab("results");
  }

  showToast("Configuration applied and results updated.");
}

/* ===========================
   Initialisation
   =========================== */

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-link");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      if (tabId) {
        setActiveTab(tabId);
      }
    });
  });
}

function setupCoreButtons() {
  const applyIds = ["apply-config", "apply-configuration", "btn-apply-config"];
  const viewResultsIds = ["view-results-summary", "btn-view-results"];
  const saveScenarioIds = ["save-scenario", "btn-save-scenario"];
  const exportScenExcelIds = ["export-scenarios-excel"];
  const exportScenPdfIds = ["export-scenarios-pdf"];
  const exportSensExcelIds = ["export-sensitivity-excel"];
  const exportSensPdfIds = ["export-sensitivity-pdf"];
  const updateSensIds = ["update-sensitivity", "btn-update-sensitivity"];

  const attachClick = (ids, handler) => {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", handler);
      }
    });
  };

  attachClick(applyIds, () => applyConfiguration(true));
  attachClick(viewResultsIds, () => setActiveTab("results"));
  attachClick(saveScenarioIds, saveCurrentScenario);
  attachClick(exportScenExcelIds, exportScenariosToExcel);
  attachClick(exportScenPdfIds, exportScenariosToPdf);
  attachClick(exportSensExcelIds, exportSensitivityToExcel);
  attachClick(exportSensPdfIds, exportSensitivityToPdf);
  attachClick(updateSensIds, () => refreshSensitivityTables(true));
}

function setupCurrencyAndOppToggles() {
  const currencySelect =
    document.getElementById("currency-select") ||
    document.getElementById("currency");
  if (currencySelect) {
    currencySelect.addEventListener("change", () => {
      const val = currencySelect.value === "USD" ? "USD" : "INR";
      state.currency = val;
      if (state.lastResults) {
        applyConfiguration(false);
      } else {
        updateCostSliderDisplay();
      }
    });
  }

  const oppToggleIds = ["opp-cost-toggle", "toggle-opportunity-cost"];
  oppToggleIds.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      btn.classList.toggle("on");
      state.includeOpportunityCost = btn.classList.contains("on");
      if (state.lastResults) {
        applyConfiguration(false);
      }
    });
  });
}

function setupAdvancedButtons() {
  const advApplyIds = ["advanced-apply", "btn-advanced-apply"];
  const advResetIds = ["advanced-reset", "btn-advanced-reset"];

  advApplyIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", applyAdvancedSettings);
    }
  });

  advResetIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", resetAdvancedSettings);
    }
  });
}

function loadCostConfigJson() {
  if (typeof fetch === "undefined") return;

  fetch("cost_config.json")
    .then(resp => (resp && resp.ok ? resp.json() : null))
    .then(data => {
      if (data) {
        COST_CONFIG = data;
        populateCostSourceOptions(state.currentTier);
        if (state.lastResults) {
          applyConfiguration(false);
        }
      }
    })
    .catch(() => {
      // Fallback to hard coded templates
    });
}

document.addEventListener("DOMContentLoaded", () => {
  setActiveTab("configuration");
  populateCostSourceOptions(state.currentTier);
  populateAdvancedSettingsForm();
  setupTabs();
  setupCoreButtons();
  setupCurrencyAndOppToggles();
  setupAdvancedButtons();
  setupCopilotCopyButton();
  setupProjectSaveLoad();
  setupSensitivityControls();
  setupConfigurationInputsUi();
  loadCostConfigJson();
  updateCopilotPreparedText();
});
