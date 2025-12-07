/* ===================================================
   STEPS FETP India Decision Aid
   Script with interactive DCE sensitivity / benefits tab
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
   Cost templates (combined, all institutions)
   Uses the harmonised table supplied in the prompt
   =========================== */

/*
The following templates use the total programme costs across all institutions
for each tier and the total cohort size provided.

For costing, STEPS treats:
- Programme cost per cohort (budgetary) as driven by the cost slider
- The shares below determine how that programme cost is split across components
- Opportunity cost is derived from the ratio of indirect costs to direct costs
*/

const COST_TEMPLATES = {
  frontline: {
    combined: {
      id: "frontline_combined",
      label: "Frontline combined template (all institutions)",
      description:
        "Combined frontline cost structure across all institutions using harmonised components and indirect costs including opportunity cost.",
      // indirect / direct = 9,089,142 / 8,324,651 ≈ 1.09
      oppRate: 1.09,
      // Shares are fractions of direct programme cost (excluding opportunity cost)
      components: [
        {
          id: "staff_core",
          label: "In country programme staff salaries and benefits",
          directShare: 0.214
        },
        {
          id: "office_equipment",
          label: "Office equipment for staff and faculty",
          directShare: 0.004
        },
        {
          id: "office_software",
          label: "Office software for staff and faculty",
          directShare: 0.0004
        },
        {
          id: "rent_utilities",
          label: "Rent and utilities for staff and faculty",
          directShare: 0.024
        },
        {
          id: "training_materials",
          label: "Training materials and printing",
          directShare: 0.0006
        },
        {
          id: "workshops",
          label: "Workshops and seminars",
          directShare: 0.107
        },
        {
          id: "travel_in_country",
          label: "In country travel for faculty, mentors and trainees",
          directShare: 0.65
        }
      ]
    }
  },
  intermediate: {
    combined: {
      id: "intermediate_combined",
      label: "Intermediate combined template (all institutions)",
      description:
        "Combined intermediate cost structure across all institutions using harmonised components and indirect costs including opportunity cost.",
      // indirect / direct = 93,200,454 / 267,896,450 ≈ 0.35
      oppRate: 0.35,
      components: [
        {
          id: "staff_core",
          label: "In country programme staff salaries and benefits",
          directShare: 0.0924
        },
        {
          id: "staff_other",
          label: "Other salaries and benefits for consultants and advisors",
          directShare: 0.0004
        },
        {
          id: "office_equipment",
          label: "Office equipment for staff and faculty",
          directShare: 0.0064
        },
        {
          id: "office_software",
          label: "Office software for staff and faculty",
          directShare: 0.027
        },
        {
          id: "rent_utilities",
          label: "Rent and utilities for staff and faculty",
          directShare: 0.0171
        },
        {
          id: "training_materials",
          label: "Training materials and printing",
          directShare: 0.0005
        },
        {
          id: "workshops",
          label: "Workshops and seminars",
          directShare: 0.0258
        },
        {
          id: "travel_in_country",
          label: "In country travel for faculty, mentors and trainees",
          directShare: 0.57
        },
        {
          id: "travel_international",
          label: "International travel for faculty, mentors and trainees",
          directShare: 0.1299
        },
        {
          id: "other_direct",
          label: "Other direct programme expenses",
          directShare: 0.1302
        }
      ]
    }
  },
  advanced: {
    combined: {
      id: "advanced_combined",
      label: "Advanced combined template (all institutions)",
      description:
        "Combined advanced cost structure across all institutions using harmonised components and indirect costs including opportunity cost.",
      // indirect / direct = 86,711,010 / 289,036,700 ≈ 0.30
      oppRate: 0.30,
      components: [
        {
          id: "staff_core",
          label: "In country programme staff salaries and benefits",
          directShare: 0.165
        },
        {
          id: "office_equipment",
          label: "Office equipment for staff and faculty",
          directShare: 0.0139
        },
        {
          id: "office_software",
          label: "Office software for staff and faculty",
          directShare: 0.0184
        },
        {
          id: "rent_utilities",
          label: "Rent and utilities for staff and faculty",
          directShare: 0.0255
        },
        {
          id: "trainee_allowances",
          label: "Trainee allowances and scholarships",
          directShare: 0.0865
        },
        {
          id: "trainee_equipment",
          label: "Trainee equipment such as laptops and internet",
          directShare: 0.0035
        },
        {
          id: "trainee_software",
          label: "Trainee software licences",
          directShare: 0.0017
        },
        {
          id: "training_materials",
          label: "Training materials and printing",
          directShare: 0.0024
        },
        {
          id: "workshops",
          label: "Workshops and seminars",
          directShare: 0.0188
        },
        {
          id: "travel_in_country",
          label: "In country travel for faculty, mentors and trainees",
          directShare: 0.372
        },
        {
          id: "travel_international",
          label: "International travel for faculty, mentors and trainees",
          directShare: 0.288
        },
        {
          id: "other_direct",
          label: "Other direct programme expenses",
          directShare: 0.0043
        }
      ]
    }
  }
};

/* Optional external JSON-driven cost configuration (if present) */
let COST_CONFIG = null;

/* ===========================
   Epidemiological settings
   =========================== */

/*
Advanced settings form fields:

- Indicative value per graduate (INR)
- Indicative value per outbreak response (INR)
- Completion rate for trainees (%)
- Outbreak responses per graduate per year
- Planning horizon (years)
- Discount rate for epidemiological benefits (%)
- INR to USD rate for display

Internally we store per tier:
- completionRate (0 to 1)
- outbreaksPerGraduatePerYear
- valuePerGraduate
- valuePerOutbreak
*/

const DEFAULT_EPI_SETTINGS = {
  general: {
    planningHorizonYears: 10,
    inrToUsdRate: 0.012,
    epiDiscountRate: 0.03
  },
  tiers: {
    frontline: {
      completionRate: 0.9,
      outbreaksPerGraduatePerYear: 0.5,
      valuePerGraduate: 500000,
      valuePerOutbreak: 2000000
    },
    intermediate: {
      completionRate: 0.9,
      outbreaksPerGraduatePerYear: 0.5,
      valuePerGraduate: 500000,
      valuePerOutbreak: 2000000
    },
    advanced: {
      completionRate: 0.9,
      outbreaksPerGraduatePerYear: 0.5,
      valuePerGraduate: 500000,
      valuePerOutbreak: 2000000
    }
  }
};

/* Response time multipliers for outbreak benefits */
const RESPONSE_TIME_MULTIPLIERS = {
  "30": 1.0,
  "15": 1.2,
  "7": 1.5
};

/* Tier duration in months */
const TIER_MONTHS = {
  frontline: 3,
  intermediate: 12,
  advanced: 24
};

/* ===========================
   Copilot interpretation prompt
   =========================== */

const COPILOT_INTERPRETATION_PROMPT = `
STEPS Tool Copilot Interpretation Prompt

Act as a senior health economist advising the Ministry of Health and Family Welfare in India on the national scale up of Field Epidemiology Training Programs. You are working with outputs from the STEPS FETP India Decision Aid. The scenario JSON you will receive summarises the configuration selected by the user, including programme tier, career pathway, mentorship intensity, delivery mode, outbreak response time, cost per trainee per month, number of cohorts and all model based outputs. Latent class results have been removed and should not be discussed. All other model components remain valid and must be interpreted.

Use the JSON provided to reconstruct the scenario in clear and plain language. Describe the configuration by stating which FETP tier is being scaled, the intake size, the main design elements related to careers, mentorship, delivery and response time, and the implied cost per trainee and the total economic cost across all cohorts. Present this description with precision so that senior decision makers can immediately understand what the configuration represents and the resources it requires.

Explain the discrete choice experiment endorsement results in intuitive terms and state what proportion of key stakeholders are predicted to support the configuration. Clarify whether support appears low, moderate or strong in the context of national scale up decisions in India. If there are any differences in endorsement associated with faster response time or stronger mentorship, articulate these clearly for policy makers.

Interpret the willingness to pay estimates as monetary summaries of how strongly stakeholders value the configuration. Make clear that willingness to pay is considered a benefit measure because it reflects the maximum monetary amount that informed stakeholders would hypothetically exchange to secure improvements in epidemiological training, mentoring, outbreak response and system capacity relative to the status quo. State that willingness to pay captures perceived programme value in financial units, allowing direct comparison with the economic costs of scale up and enabling the economic case to be assessed in terms of whether the perceived value generated by the programme exceeds its cost. Explain how total willingness to pay across all cohorts compares with total economic cost. Indicate whether stakeholders appear willing to pay more, about the same or less than the programme would cost to implement. Discuss the implications of this relationship for political feasibility, acceptability to partners and the strength of the economic case from a preference based perspective. If there are separate elements of willingness to pay related to response time, explain how much additional value stakeholders attach to faster detection and earlier control of outbreaks.

Summarise the epidemiological outputs by describing the expected number of graduates, the number of outbreak responses supported per year and the approximate monetary value of these epidemiological benefits. Clarify what these figures imply for the surveillance and response capacity of India and how the selected tier contributes to detecting events at the front line, analysing and interpreting surveillance data at the intermediate level or providing advanced leadership for complex responses. State whether the combined costs and epidemiological benefits yield a benefit cost ratio that is clearly above one, close to one or below one and interpret what that means for value for money in the Indian context.

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
    seen: false
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
  if (valueInInr === null || valueInInr === undefined || isNaN(valueInInr)) {
    return "-";
  }
  if (currency === "USD") {
    const rate =
      state.epiSettings.general.inrToUsdRate !== undefined
        ? state.epiSettings.general.inrToUsdRate
        : 0.012;
    const valueUsd = valueInInr * rate;
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

function getModelCoefs() {
  return MXL_COEFS;
}

function getTierLabel(tier) {
  if (tier === "intermediate") return "Intermediate";
  if (tier === "advanced") return "Advanced";
  return "Frontline";
}

function getCareerLabel(id) {
  const map = {
    certificate: "Government and partner certificate",
    uniqual: "University qualification",
    career_path: "Government career pathway"
  };
  return map[id] || id;
}

function getMentorshipLabel(id) {
  const map = {
    low: "Low mentorship",
    medium: "Medium mentorship",
    high: "High mentorship"
  };
  return map[id] || id;
}

function getDeliveryLabel(id) {
  const map = {
    blended: "Blended",
    inperson: "Fully in person",
    online: "Fully online"
  };
  return map[id] || id;
}

function getResponseLabel(val) {
  if (val === "7") return "Detect and respond within 7 days";
  if (val === "15") return "Detect and respond within 15 days";
  return "Detect and respond within 30 days";
}

function getTierMonths(tier) {
  return TIER_MONTHS[tier] || 12;
}

/* Simple toast utility */

function showToast(message, type = "info") {
  let container = document.getElementById("steps-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "steps-toast-container";
    container.style.position = "fixed";
    container.style.bottom = "16px";
    container.style.right = "16px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.marginTop = "8px";
  toast.style.padding = "8px 12px";
  toast.style.borderRadius = "4px";
  toast.style.fontSize = "12px";
  toast.style.backgroundColor =
    type === "error" ? "#b91c1c" : type === "success" ? "#166534" : "#334155";
  toast.style.color = "#f9fafb";
  toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode === container) {
      container.removeChild(toast);
    }
  }, 3500);
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
Compute endorsement probability and WTP summary.
Returns:
{
  endorsement,
  optOutShare,
  wtpPerTraineePerMonth,
  wtpComponents
}
*/
function computeEndorsementAndWtp(cfg) {
  const coefs = getModelCoefs();
  const nonCostUtility = computeNonCostUtility(cfg, coefs);
  const costPerThousand = cfg.costPerTraineePerMonth / 1000;
  const costUtility = (coefs.costPerThousand || 0) * costPerThousand;

  const uProgram = (coefs.ascProgram || 0) + nonCostUtility + costUtility;
  const uOptOut = coefs.ascOptOut || 0;

  const diff = uProgram - uOptOut;
  const endorseProb = logistic(diff);
  const optOutProb = 1 - endorseProb;

  const wtp = computeWtpComponents(cfg, coefs);

  return {
    endorsement: endorseProb,
    optOutShare: optOutProb,
    wtpPerTraineePerMonth: wtp.totalPerTraineePerMonth,
    wtpComponents: wtp.components
  };
}

/* ===========================
   Cost and epidemiology helpers
   =========================== */

function getCostConfigForTier(tier) {
  if (COST_CONFIG && COST_CONFIG[tier]) {
    return COST_CONFIG[tier];
  }
  return COST_TEMPLATES[tier] || {};
}

function getCostTemplate(tier, sourceId) {
  const cfg = getCostConfigForTier(tier);
  const keys = Object.keys(cfg);
  if (keys.length === 0) return null;

  if (sourceId && cfg[sourceId]) {
    return cfg[sourceId];
  }

  if (sourceId) {
    const matchById = keys
      .map((k) => cfg[k])
      .find((tpl) => tpl && tpl.id === sourceId);
    if (matchById) return matchById;
  }

  const firstKey = keys[0];
  return cfg[firstKey];
}

function updateCostSourceOptions(tier) {
  const select = document.getElementById("cost-source");
  if (!select) return;

  const cfg = getCostConfigForTier(tier);
  const keys = Object.keys(cfg);

  select.innerHTML = "";

  if (keys.length === 0) {
    state.currentCostSourceId = null;
    return;
  }

  keys.forEach((key) => {
    const tpl = cfg[key];
    if (!tpl) return;
    const id = tpl.id || key;
    tpl.id = id;
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = tpl.label || key;
    select.appendChild(opt);
  });

  const firstTpl = cfg[keys[0]];
  state.currentCostSourceId = (firstTpl && firstTpl.id) || keys[0];
}

function getEpiTierSettings(tier) {
  const base = state.epiSettings.tiers[tier];
  if (base) return base;
  return state.epiSettings.tiers.frontline;
}

/* ===========================
   Scenario calculations
   =========================== */

function computeScenarioResults(cfg) {
  const months = getTierMonths(cfg.tier);
  const epiTier = getEpiTierSettings(cfg.tier);
  const horizonYears = state.epiSettings.general.planningHorizonYears || 10;
  const responseMultiplier = RESPONSE_TIME_MULTIPLIERS[cfg.response] || 1.0;

  const overall = computeEndorsementAndWtp(cfg);
  const endorse = overall.endorsement;
  const optOut = overall.optOutShare;

  const trainees = cfg.traineesPerCohort;
  const cohorts = cfg.numberOfCohorts;

  // Programme cost per cohort (budgetary)
  const programCostPerCohortBudget =
    cfg.costPerTraineePerMonth * trainees * months;

  const template = getCostTemplate(cfg.tier, state.currentCostSourceId);
  const oppRate = template ? template.oppRate || 0 : 0;
  const oppCostPerCohort = state.includeOpportunityCost
    ? programCostPerCohortBudget * oppRate
    : 0;

  const totalEconomicCostPerCohort =
    programCostPerCohortBudget + oppCostPerCohort;
  const totalEconomicCostAllCohorts =
    totalEconomicCostPerCohort * cohorts;

  const wtpPerTraineePerMonth = overall.wtpPerTraineePerMonth || 0;
  const wtpComponents = overall.wtpComponents || null;
  const responseWtpPerTraineePerMonth =
    wtpComponents && wtpComponents.response
      ? wtpComponents.response
      : 0;

  const wtpTotalPerCohort =
    wtpPerTraineePerMonth * trainees * months;
  const wtpTotalAllCohorts =
    wtpTotalPerCohort * cohorts;
  const wtpResponseTotalAllCohorts =
    responseWtpPerTraineePerMonth * trainees * months * cohorts;

  const completionRate = epiTier.completionRate || 0;
  const outbreaksPerGraduatePerYear =
    epiTier.outbreaksPerGraduatePerYear || 0;

  const gradsPerCohort =
    trainees * completionRate * endorse;

  const outbreaksPerCohortPerYear =
    gradsPerCohort * outbreaksPerGraduatePerYear;

  const valueFromGraduatesPerCohort =
    gradsPerCohort * (epiTier.valuePerGraduate || 0);

  const valueFromOutbreaksPerCohort =
    outbreaksPerCohortPerYear *
    horizonYears *
    (epiTier.valuePerOutbreak || 0) *
    responseMultiplier;

  const epiBenefitPerCohort =
    valueFromGraduatesPerCohort + valueFromOutbreaksPerCohort;

  const epiBenefitAllCohorts =
    epiBenefitPerCohort * cohorts;

  const netBenefitPerCohort =
    epiBenefitPerCohort - totalEconomicCostPerCohort;

  const bcrPerCohort =
    totalEconomicCostPerCohort > 0
      ? epiBenefitPerCohort / totalEconomicCostPerCohort
      : null;

  const natNetBenefit =
    epiBenefitAllCohorts - totalEconomicCostAllCohorts;

  const natBcr =
    totalEconomicCostAllCohorts > 0
      ? epiBenefitAllCohorts / totalEconomicCostAllCohorts
      : null;

  const natGraduatesAllCohorts = gradsPerCohort * cohorts;
  const natOutbreaksPerYearAllCohorts =
    outbreaksPerCohortPerYear * cohorts;

  return {
    cfg,
    months,
    horizonYears,
    endorse,
    optOut,
    wtpPerTraineePerMonth,
    wtpComponents,
    responseWtpPerTraineePerMonth,
    wtpTotalPerCohort,
    wtpTotalAllCohorts,
    wtpResponseTotalAllCohorts,
    programCostPerCohortBudget,
    oppCostPerCohort,
    totalEconomicCostPerCohort,
    totalEconomicCostAllCohorts,
    gradsPerCohort,
    outbreaksPerCohortPerYear,
    valueFromGraduatesPerCohort,
    valueFromOutbreaksPerCohort,
    epiBenefitPerCohort,
    epiBenefitAllCohorts,
    netBenefitPerCohort,
    bcrPerCohort,
    natGraduatesAllCohorts,
    natOutbreaksPerYearAllCohorts,
    natNetBenefit,
    natBcr
  };
}

/* ===========================
   DOM updates: configuration summary
   =========================== */

function updateConfigSummary(results) {
  const container = document.getElementById("config-summary");
  const endorseSpan = document.getElementById("config-endorsement-value");
  const headlineTag = document.getElementById("headline-status-tag");
  const headlineText = document.getElementById("headline-recommendation");
  const briefingText = document.getElementById("headline-briefing-text");

  if (!container || !results) {
    if (endorseSpan) endorseSpan.textContent = "Apply configuration";
    if (headlineTag) {
      headlineTag.textContent = "No assessment yet";
      headlineTag.className = "status-pill status-neutral";
    }
    if (headlineText) {
      headlineText.textContent =
        "Apply a configuration to see a concise recommendation that combines endorsement, willingness to pay, costs and indicative benefits.";
    }
    if (briefingText) {
      briefingText.textContent =
        "Once a configuration is applied, this box will provide a short narrative summary that you can copy into briefing notes, World Bank documents or meeting minutes.";
    }
    return;
  }

  const { cfg } = results;

  const rows = [];

  rows.push({
    label: "Programme tier",
    value: `${getTierLabel(cfg.tier)} (${getTierMonths(cfg.tier)} months)`
  });
  rows.push({
    label: "Career incentive",
    value: getCareerLabel(cfg.career)
  });
  rows.push({
    label: "Mentorship intensity",
    value: getMentorshipLabel(cfg.mentorship)
  });
  rows.push({
    label: "Delivery mode",
    value: getDeliveryLabel(cfg.delivery)
  });
  rows.push({
    label: "Expected response time",
    value: getResponseLabel(cfg.response)
  });
  rows.push({
    label: "Cost per trainee per month",
    value: formatCurrency(cfg.costPerTraineePerMonth, "INR")
  });
  rows.push({
    label: "Trainees per cohort",
    value: formatNumber(cfg.traineesPerCohort)
  });
  rows.push({
    label: "Number of cohorts",
    value: formatNumber(cfg.numberOfCohorts)
  });

  container.innerHTML = "";
  rows.forEach((row) => {
    const div = document.createElement("div");
    div.className = "config-summary-row";
    const labelSpan = document.createElement("span");
    labelSpan.className = "config-summary-label";
    labelSpan.textContent = row.label;
    const valueSpan = document.createElement("span");
    valueSpan.className = "config-summary-value";
    valueSpan.textContent = row.value;
    div.appendChild(labelSpan);
    div.appendChild(valueSpan);
    container.appendChild(div);
  });

  if (endorseSpan) {
    endorseSpan.textContent = formatPercent(results.endorse * 100, 1);
  }

  if (headlineTag && headlineText && briefingText) {
    const endorsePct = results.endorse * 100;
    const bcr = results.bcrPerCohort;
    let statusClass = "status-neutral";
    let statusLabel = "Needs discussion";
    let recommendationText = "";
    const bcrText = bcr !== null ? bcr.toFixed(2) : "-";

    if (endorsePct >= 70 && bcr !== null && bcr >= 1.2) {
      statusClass = "status-good";
      statusLabel = "Strong case";
      recommendationText =
        "This configuration appears attractive, combining strong endorsement with an epidemiological benefit cost ratio above one. It is a good candidate for national or large scale investment discussions.";
    } else if (endorsePct >= 50 && bcr !== null && bcr >= 1.0) {
      statusClass = "status-warning";
      statusLabel = "Promising but mixed";
      recommendationText =
        "This configuration looks promising, with moderate endorsement and a benefit cost ratio close to or just above one. It may be suitable for targeted or phased scale up while further evidence is collected.";
    } else {
      statusClass = "status-poor";
      statusLabel = "Weak case";
      recommendationText =
        "Endorsement or value for money appears limited under this configuration. It may require redesign or a stronger justification before being considered for scale up.";
    }

    headlineTag.className = `status-pill ${statusClass}`;
    headlineTag.textContent = statusLabel;

    headlineText.textContent = recommendationText;

    const natCost = results.totalEconomicCostAllCohorts;
    const natEpiBenefit = results.epiBenefitAllCohorts;
    const natBcr = results.natBcr;

    const natCostText = formatCurrency(natCost, state.currency);
    const natBenefitText = formatCurrency(natEpiBenefit, state.currency);
    const natBcrText = natBcr !== null ? natBcr.toFixed(2) : "-";
    const endorseText = formatPercent(results.endorse * 100, 1);

    briefingText.textContent =
      `Under the current settings, a ${getTierLabel(cfg.tier)} configuration with ` +
      `${cfg.traineesPerCohort} trainees per cohort and ${cfg.numberOfCohorts} cohorts ` +
      `is predicted to attract endorsement from around ${endorseText} of stakeholders ` +
      `under the mixed logit preference model. Total economic cost across all cohorts is ` +
      `${natCostText}, while indicative epidemiological benefits over a planning horizon ` +
      `of ${results.horizonYears} years are valued at approximately ${natBenefitText}. ` +
      `This corresponds to a national epidemiological benefit cost ratio of about ${natBcrText}. ` +
      `These figures provide a concise summary for concept notes, steering committee briefings and ` +
      `discussions with ministries and partners.`;
  }
}

/* ===========================
   DOM updates: charts and results tab
   =========================== */

function ensureChart(ctxId, chartKey, config) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return null;
  if (state.charts[chartKey]) {
    state.charts[chartKey].data = config.data;
    state.charts[chartKey].options = config.options || {};
    state.charts[chartKey].update();
    return state.charts[chartKey];
  }
  const chart = new Chart(ctx, config);
  state.charts[chartKey] = chart;
  return chart;
}

function updateResultsView(results) {
  if (!results) return;

  const endorseEl = document.getElementById("endorsement-rate");
  const optoutEl = document.getElementById("optout-rate");

  if (endorseEl) {
    endorseEl.textContent = formatPercent(results.endorse * 100, 1);
  }
  if (optoutEl) {
    optoutEl.textContent = formatPercent(results.optOut * 100, 1);
  }

  ensureChart("chart-uptake", "uptake", {
    type: "doughnut",
    data: {
      labels: ["Endorse FETP option", "Choose opt out"],
      datasets: [
        {
          data: [results.endorse * 100, results.optOut * 100]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });

  const wtpPerTraineeEl = document.getElementById("wtp-per-trainee");
  const wtpTotalCohortEl = document.getElementById("wtp-total-cohort");
  const progCostPerCohortEl = document.getElementById("prog-cost-per-cohort");
  const totalCostEl = document.getElementById("total-cost");
  const netBenefitEl = document.getElementById("net-benefit");
  const bcrEl = document.getElementById("bcr");

  if (wtpPerTraineeEl) {
    wtpPerTraineeEl.textContent = formatCurrency(
      results.wtpPerTraineePerMonth,
      state.currency
    );
  }
  if (wtpTotalCohortEl) {
    wtpTotalCohortEl.textContent = formatCurrency(
      results.wtpTotalPerCohort,
      state.currency
    );
  }
  if (progCostPerCohortEl) {
    progCostPerCohortEl.textContent = formatCurrency(
      results.programCostPerCohortBudget,
      state.currency
    );
  }
  if (totalCostEl) {
    totalCostEl.textContent = formatCurrency(
      results.totalEconomicCostPerCohort,
      state.currency
    );
  }
  if (netBenefitEl) {
    netBenefitEl.textContent = formatCurrency(
      results.netBenefitPerCohort,
      state.currency
    );
  }
  if (bcrEl) {
    bcrEl.textContent =
      results.bcrPerCohort !== null ? results.bcrPerCohort.toFixed(2) : "-";
  }

  ensureChart("chart-bcr", "bcr", {
    type: "bar",
    data: {
      labels: ["Costs and benefits per cohort"],
      datasets: [
        {
          label: "Total economic cost",
          data: [results.totalEconomicCostPerCohort]
        },
        {
          label: "Indicative epidemiological benefit",
          data: [results.epiBenefitPerCohort]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  const epiGraduatesEl = document.getElementById("epi-graduates");
  const epiOutbreaksEl = document.getElementById("epi-outbreaks");
  const epiBenefitEl = document.getElementById("epi-benefit");

  if (epiGraduatesEl) {
    epiGraduatesEl.textContent = formatNumber(results.natGraduatesAllCohorts);
  }
  if (epiOutbreaksEl) {
    epiOutbreaksEl.textContent = formatNumber(
      results.natOutbreaksPerYearAllCohorts,
      1
    );
  }
  if (epiBenefitEl) {
    epiBenefitEl.textContent = formatCurrency(
      results.epiBenefitPerCohort,
      state.currency
    );
  }

  ensureChart("chart-epi", "epi", {
    type: "bar",
    data: {
      labels: ["Graduates", "Outbreak responses per year (national)"],
      datasets: [
        {
          label: "Outputs",
          data: [
            results.natGraduatesAllCohorts,
            results.natOutbreaksPerYearAllCohorts
          ]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
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

/* ===========================
   DOM updates: costing tab
   =========================== */

function updateCostingView(results) {
  const summaryContainer = document.getElementById("cost-breakdown-summary");
  const tbody = document.getElementById("cost-components-list");
  const select = document.getElementById("cost-source");

  if (!summaryContainer || !tbody || !results) return;

  const cfg = results.cfg;
  const template = getCostTemplate(cfg.tier, state.currentCostSourceId);

  if (select && template) {
    for (let i = 0; i < select.options.length; i += 1) {
      if (select.options[i].value === template.id) {
        select.selectedIndex = i;
        break;
      }
    }
  }

  summaryContainer.innerHTML = "";
  tbody.innerHTML = "";

  if (!template) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent =
      "No cost template is available for this tier. A combined template can be added in a separate cost_config.json file if required.";
    summaryContainer.appendChild(note);
    return;
  }

  const budgetCost = results.programCostPerCohortBudget;
  const oppCost = results.oppCostPerCohort;
  const econCost = results.totalEconomicCostPerCohort;
  const econTotal = econCost;

  const cards = [
    {
      label: "Programme cost per cohort (budgetary)",
      value: formatCurrency(budgetCost, state.currency)
    },
    {
      label: "Opportunity cost per cohort",
      value: formatCurrency(oppCost, state.currency)
    },
    {
      label: "Total economic cost per cohort",
      value: formatCurrency(econCost, state.currency)
    }
  ];

  cards.forEach((c) => {
    const div = document.createElement("div");
    div.className = "cost-summary-card";
    const l = document.createElement("div");
    l.className = "cost-summary-label";
    l.textContent = c.label;
    const v = document.createElement("div");
    v.className = "cost-summary-value";
    v.textContent = c.value;
    div.appendChild(l);
    div.appendChild(v);
    summaryContainer.appendChild(div);
  });

  const components = template.components || [];
  components.forEach((comp) => {
    const tr = document.createElement("tr");

    const amountPerCohort = budgetCost * (comp.directShare || 0);

    const amountPerTraineePerMonth =
      cfg.traineesPerCohort > 0 && results.months > 0
        ? amountPerCohort / (cfg.traineesPerCohort * results.months)
        : 0;

    const shareOfEconomicCost =
      econTotal > 0 ? (amountPerCohort / econTotal) * 100 : 0;

    const tdName = document.createElement("td");
    tdName.textContent = comp.label;

    const tdShare = document.createElement("td");
    tdShare.textContent = formatPercent(shareOfEconomicCost, 1);

    const tdAmount = document.createElement("td");
    tdAmount.textContent = formatCurrency(amountPerCohort, state.currency);
    tdAmount.className = "numeric-cell";

    const tdPerTrainee = document.createElement("td");
    tdPerTrainee.textContent = formatCurrency(
      amountPerTraineePerMonth,
      state.currency
    );
    tdPerTrainee.className = "numeric-cell";

    const tdNotes = document.createElement("td");
    tdNotes.textContent = "";

    tr.appendChild(tdName);
    tr.appendChild(tdShare);
    tr.appendChild(tdAmount);
    tr.appendChild(tdPerTrainee);
    tr.appendChild(tdNotes);

    tbody.appendChild(tr);
  });
}

/* ===========================
   DOM updates: national simulation
   =========================== */

function updateNationalSimulationView(results) {
  if (!results) return;

  const natTotalCostEl = document.getElementById("nat-total-cost");
  const natTotalBenefitEl = document.getElementById("nat-total-benefit");
  const natNetBenefitEl = document.getElementById("nat-net-benefit");
  const natBcrEl = document.getElementById("nat-bcr");
  const natTotalWtpEl = document.getElementById("nat-total-wtp");
  const natGraduatesEl = document.getElementById("nat-graduates");
  const natOutbreaksEl = document.getElementById("nat-outbreaks");
  const summaryTextEl = document.getElementById("natsim-summary-text");

  if (natTotalCostEl) {
    natTotalCostEl.textContent = formatCurrency(
      results.totalEconomicCostAllCohorts,
      state.currency
    );
  }
  if (natTotalBenefitEl) {
    natTotalBenefitEl.textContent = formatCurrency(
      results.epiBenefitAllCohorts,
      state.currency
    );
  }
  if (natNetBenefitEl) {
    natNetBenefitEl.textContent = formatCurrency(
      results.natNetBenefit,
      state.currency
    );
  }
  if (natBcrEl) {
    natBcrEl.textContent =
      results.natBcr !== null ? results.natBcr.toFixed(2) : "-";
  }
  if (natTotalWtpEl) {
    natTotalWtpEl.textContent = formatCurrency(
      results.wtpTotalAllCohorts,
      state.currency
    );
  }
  if (natGraduatesEl) {
    natGraduatesEl.textContent = formatNumber(results.natGraduatesAllCohorts);
  }
  if (natOutbreaksEl) {
    natOutbreaksEl.textContent = formatNumber(
      results.natOutbreaksPerYearAllCohorts,
      1
    );
  }

  ensureChart("chart-nat-cost-benefit", "natCostBenefit", {
    type: "bar",
    data: {
      labels: ["National totals"],
      datasets: [
        {
          label: "Total economic cost (all cohorts)",
          data: [results.totalEconomicCostAllCohorts]
        },
        {
          label: "Total epidemiological benefit (all cohorts)",
          data: [results.epiBenefitAllCohorts]
        },
        {
          label: "Total willingness to pay (all cohorts)",
          data: [results.wtpTotalAllCohorts]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  ensureChart("chart-nat-epi", "natEpi", {
    type: "bar",
    data: {
      labels: ["Graduates", "Outbreak responses per year"],
      datasets: [
        {
          label: "Outputs",
          data: [
            results.natGraduatesAllCohorts,
            results.natOutbreaksPerYearAllCohorts
          ]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  if (summaryTextEl) {
    const cfg = results.cfg;
    const natCostText = formatCurrency(
      results.totalEconomicCostAllCohorts,
      state.currency
    );
    const natBenefitText = formatCurrency(
      results.epiBenefitAllCohorts,
      state.currency
    );
    const natNetText = formatCurrency(results.natNetBenefit, state.currency);
    const natBcrText =
      results.natBcr !== null ? results.natBcr.toFixed(2) : "-";
    const gradsText = formatNumber(results.natGraduatesAllCohorts);
    const outbreaksText = formatNumber(
      results.natOutbreaksPerYearAllCohorts,
      1
    );

    summaryTextEl.textContent =
      `With ${cfg.numberOfCohorts} cohorts of ${cfg.traineesPerCohort} trainees ` +
      `at the ${getTierLabel(cfg.tier)} tier, this configuration generates an estimated ` +
      `${gradsText} FETP graduates in total and supports around ${outbreaksText} outbreak ` +
      `responses per year once graduates are in post. Total economic cost across all cohorts is ` +
      `${natCostText}, while indicative epidemiological benefits over a ${results.horizonYears}-year ` +
      `horizon are valued at about ${natBenefitText}. This yields a national epidemiological benefit ` +
      `cost ratio of approximately ${natBcrText} and a national net benefit of ${natNetText}.`;
  }
}

/* ===========================
   Sensitivity and DCE benefits tab
   =========================== */

function getBenefitDefinitionSettings() {
  const defSelect = document.getElementById("benefit-definition-select");
  const epiToggle = document.getElementById("sensitivity-epi-toggle");
  const endorsementOverrideInput = document.getElementById(
    "endorsement-override"
  );

  const benefitDefinition = defSelect ? defSelect.value : "wtp_only";
  const includeEpi = epiToggle && epiToggle.classList.contains("on");

  let endorsementOverride = null;
  if (endorsementOverrideInput && endorsementOverrideInput.value !== "") {
    const v = parseFloat(endorsementOverrideInput.value);
    if (!isNaN(v) && v >= 0 && v <= 100) {
      endorsementOverride = v / 100;
    }
  }

  return {
    benefitDefinition,
    includeEpi,
    endorsementOverride
  };
}

function computeScenarioForSensitivity(
  baseCfg,
  includeEpi,
  benefitDefinition,
  endorsementOverride
) {
  const results = computeScenarioResults(baseCfg);

  const endorseUsed =
    typeof endorsementOverride === "number"
      ? endorsementOverride
      : results.endorse;

  const epiPartAllCohorts = includeEpi
    ? results.valueFromOutbreaksPerCohort * baseCfg.numberOfCohorts
    : 0;

  const totalWtpAllCohorts = results.wtpTotalAllCohorts;
  let wtpUsedForRatios = totalWtpAllCohorts;

  if (benefitDefinition === "endorsement_adjusted") {
    wtpUsedForRatios = totalWtpAllCohorts * endorseUsed;
  }

  const combinedBenefitAllCohorts = includeEpi
    ? wtpUsedForRatios + epiPartAllCohorts
    : wtpUsedForRatios;

  const costAllCohorts = results.totalEconomicCostAllCohorts;

  const bcrWtpOnly =
    costAllCohorts > 0 ? wtpUsedForRatios / costAllCohorts : null;
  const npvWtpOnly = wtpUsedForRatios - costAllCohorts;

  const bcrCombined =
    costAllCohorts > 0 ? combinedBenefitAllCohorts / costAllCohorts : null;
  const npvCombined = combinedBenefitAllCohorts - costAllCohorts;

  const effectiveWtp = totalWtpAllCohorts * endorseUsed;
  const effectiveCombined =
    (totalWtpAllCohorts + epiPartAllCohorts) * endorseUsed;

  return {
    results,
    endorseUsed,
    epiAllCohorts: epiPartAllCohorts,
    totalWtpAllCohorts,
    wtpResponseTotalAllCohorts: results.wtpResponseTotalAllCohorts,
    costAllCohorts,
    bcrWtpOnly,
    npvWtpOnly,
    bcrCombined,
    npvCombined,
    effectiveWtp,
    effectiveCombined
  };
}

function buildDceBenefitsTableRow(label, scenarioCfg, settings) {
  const { benefitDefinition, includeEpi, endorsementOverride } = settings;

  const calc = computeScenarioForSensitivity(
    scenarioCfg,
    includeEpi,
    benefitDefinition,
    endorsementOverride
  );

  const row = document.createElement("tr");

  const epiShown = includeEpi ? calc.epiAllCohorts : 0;
  const endorsePctUsed = calc.endorseUsed * 100;

  const tdScenario = document.createElement("td");
  tdScenario.textContent = label;

  const tdCost = document.createElement("td");
  tdCost.textContent = formatCurrency(calc.costAllCohorts, state.currency);
  tdCost.className = "numeric-cell";

  const tdTotalCostAll = document.createElement("td");
  tdTotalCostAll.textContent = formatCurrency(
    calc.costAllCohorts,
    state.currency
  );
  tdTotalCostAll.className = "numeric-cell";

  const tdNetBenefitAll = document.createElement("td");
  tdNetBenefitAll.textContent = formatCurrency(
    calc.bcrCombined !== null
      ? calc.npvCombined
      : calc.npvWtpOnly,
    state.currency
  );
  tdNetBenefitAll.className = "numeric-cell";

  const tdTotalWtp = document.createElement("td");
  tdTotalWtp.textContent = formatCurrency(
    calc.totalWtpAllCohorts,
    state.currency
  );
  tdTotalWtp.className = "numeric-cell";

  const tdWtpResponse = document.createElement("td");
  tdWtpResponse.textContent = formatCurrency(
    calc.wtpResponseTotalAllCohorts,
    state.currency
  );
  tdWtpResponse.className = "numeric-cell";

  const tdEpi = document.createElement("td");
  tdEpi.textContent = formatCurrency(epiShown, state.currency);
  tdEpi.className = "numeric-cell";

  const tdEndorseUsed = document.createElement("td");
  tdEndorseUsed.textContent = formatPercent(endorsePctUsed, 1);

  const tdEffectiveWtp = document.createElement("td");
  tdEffectiveWtp.textContent = formatCurrency(
    calc.effectiveWtp,
    state.currency
  );
  tdEffectiveWtp.className = "numeric-cell";

  const tdBcrWtpOnly = document.createElement("td");
  tdBcrWtpOnly.textContent =
    calc.bcrWtpOnly !== null ? calc.bcrWtpOnly.toFixed(2) : "-";
  tdBcrWtpOnly.className = "numeric-cell";

  const tdNpvWtpOnly = document.createElement("td");
  tdNpvWtpOnly.textContent = formatCurrency(
    calc.npvWtpOnly,
    state.currency
  );
  tdNpvWtpOnly.className = "numeric-cell";

  const tdBcrCombined = document.createElement("td");
  tdBcrCombined.textContent =
    calc.bcrCombined !== null ? calc.bcrCombined.toFixed(2) : "-";
  tdBcrCombined.className = "numeric-cell";

  const tdNpvCombined = document.createElement("td");
  tdNpvCombined.textContent = formatCurrency(
    calc.npvCombined,
    state.currency
  );
  tdNpvCombined.className = "numeric-cell";

  row.appendChild(tdScenario);
  row.appendChild(tdCost);
  row.appendChild(tdTotalCostAll);
  row.appendChild(tdNetBenefitAll);
  row.appendChild(tdTotalWtp);
  row.appendChild(tdWtpResponse);
  row.appendChild(tdEpi);
  row.appendChild(tdEndorseUsed);
  row.appendChild(tdEffectiveWtp);
  row.appendChild(tdBcrWtpOnly);
  row.appendChild(tdNpvWtpOnly);
  row.appendChild(tdBcrCombined);
  row.appendChild(tdNpvCombined);

  return row;
}

function buildSensitivityMatrixRow(label, scenarioCfg, includeEpi) {
  const calc = computeScenarioForSensitivity(
    scenarioCfg,
    includeEpi,
    "wtp_only",
    null
  );
  const results = calc.results;

  const row = document.createElement("tr");

  const tdScenario = document.createElement("td");
  tdScenario.textContent = label;

  const tdModel = document.createElement("td");
  tdModel.textContent = "Mixed logit overall sample";

  const tdEndorse = document.createElement("td");
  tdEndorse.textContent = formatPercent(results.endorse * 100, 1);

  const tdCostPerCohort = document.createElement("td");
  tdCostPerCohort.textContent = formatCurrency(
    results.totalEconomicCostPerCohort,
    state.currency
  );
  tdCostPerCohort.className = "numeric-cell";

  const tdTotalWtpPerCohort = document.createElement("td");
  tdTotalWtpPerCohort.textContent = formatCurrency(
    results.wtpTotalPerCohort,
    state.currency
  );
  tdTotalWtpPerCohort.className = "numeric-cell";

  const tdWtpResponsePerCohort = document.createElement("td");
  tdWtpResponsePerCohort.textContent = formatCurrency(
    results.responseWtpPerTraineePerMonth *
      results.cfg.traineesPerCohort *
      results.months,
    state.currency
  );
  tdWtpResponsePerCohort.className = "numeric-cell";

  const tdEpiBenefitPerCohort = document.createElement("td");
  const epiPerCohort = includeEpi
    ? results.valueFromOutbreaksPerCohort
    : 0;
  tdEpiBenefitPerCohort.textContent = formatCurrency(
    epiPerCohort,
    state.currency
  );
  tdEpiBenefitPerCohort.className = "numeric-cell";

  const tdBcrWtp = document.createElement("td");
  const bcrWtp =
    results.totalEconomicCostPerCohort > 0
      ? results.wtpTotalPerCohort / results.totalEconomicCostPerCohort
      : null;
  tdBcrWtp.textContent = bcrWtp !== null ? bcrWtp.toFixed(2) : "-";
  tdBcrWtp.className = "numeric-cell";

  const tdNpvWtp = document.createElement("td");
  const npvWtp =
    results.wtpTotalPerCohort - results.totalEconomicCostPerCohort;
  tdNpvWtp.textContent = formatCurrency(npvWtp, state.currency);
  tdNpvWtp.className = "numeric-cell";

  const tdBcrCombined = document.createElement("td");
  const combinedBenefitPerCohort =
    results.wtpTotalPerCohort + epiPerCohort;
  const bcrCombined =
    results.totalEconomicCostPerCohort > 0
      ? combinedBenefitPerCohort / results.totalEconomicCostPerCohort
      : null;
  tdBcrCombined.textContent =
    bcrCombined !== null ? bcrCombined.toFixed(2) : "-";
  tdBcrCombined.className = "numeric-cell";

  const tdNpvCombined = document.createElement("td");
  const npvCombined =
    combinedBenefitPerCohort - results.totalEconomicCostPerCohort;
  tdNpvCombined.textContent = formatCurrency(
    npvCombined,
    state.currency
  );
  tdNpvCombined.className = "numeric-cell";

  const tdEffectiveWtp = document.createElement("td");
  const effectiveWtpPerCohort =
    results.wtpTotalPerCohort * results.endorse;
  tdEffectiveWtp.textContent = formatCurrency(
    effectiveWtpPerCohort,
    state.currency
  );
  tdEffectiveWtp.className = "numeric-cell";

  const tdEffectiveCombined = document.createElement("td");
  const effectiveCombinedPerCohort =
    (results.wtpTotalPerCohort + epiPerCohort) * results.endorse;
  tdEffectiveCombined.textContent = formatCurrency(
    effectiveCombinedPerCohort,
    state.currency
  );
  tdEffectiveCombined.className = "numeric-cell";

  row.appendChild(tdScenario);
  row.appendChild(tdModel);
  row.appendChild(tdEndorse);
  row.appendChild(tdCostPerCohort);
  row.appendChild(tdTotalWtpPerCohort);
  row.appendChild(tdWtpResponsePerCohort);
  row.appendChild(tdEpiBenefitPerCohort);
  row.appendChild(tdBcrWtp);
  row.appendChild(tdNpvWtp);
  row.appendChild(tdBcrCombined);
  row.appendChild(tdNpvCombined);
  row.appendChild(tdEffectiveWtp);
  row.appendChild(tdEffectiveCombined);

  return row;
}

function updateSensitivityTables() {
  const benefitsTbody = document.getElementById("dce-benefits-table-body");
  const sensTbody = document.getElementById("sensitivity-table-body");
  if (!benefitsTbody || !sensTbody) return;

  benefitsTbody.innerHTML = "";
  sensTbody.innerHTML = "";

  if (!state.lastResults) return;

  const settings = getBenefitDefinitionSettings();

  const currentLabel = "Current configuration";
  benefitsTbody.appendChild(
    buildDceBenefitsTableRow(currentLabel, state.lastResults.cfg, settings)
  );
  sensTbody.appendChild(
    buildSensitivityMatrixRow(
      currentLabel,
      state.lastResults.cfg,
      settings.includeEpi
    )
  );

  state.scenarios.forEach((sc, index) => {
    const label = sc.name || `Scenario ${index + 1}`;
    benefitsTbody.appendChild(
      buildDceBenefitsTableRow(label, sc.cfg, settings)
    );
    sensTbody.appendChild(
      buildSensitivityMatrixRow(label, sc.cfg, settings.includeEpi)
    );
  });
}

/* ===========================
   Scenarios tab and exports
   =========================== */

function addScenarioFromCurrentResults() {
  if (!state.lastResults) return;

  const { cfg } = state.lastResults;
  const name =
    cfg.scenarioName && cfg.scenarioName.length > 0
      ? cfg.scenarioName
      : `Scenario ${state.scenarios.length + 1}`;

  const scenario = {
    id: Date.now(),
    name,
    notes: cfg.scenarioNotes || "",
    cfg: { ...cfg },
    resultsSnapshot: { ...state.lastResults }
  };

  state.scenarios.push(scenario);
  updateScenarioTable();
  showToast("Scenario saved for comparison", "success");
}

function updateScenarioTable() {
  const tbody = document.querySelector("#scenario-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.scenarios.forEach((sc) => {
    const r = sc.resultsSnapshot;
    const tr = document.createElement("tr");

    const tdShortlist = document.createElement("td");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.dataset.scenarioId = String(sc.id);
    tdShortlist.appendChild(chk);

    const tdName = document.createElement("td");
    tdName.textContent = sc.name;

    const tdTags = document.createElement("td");
    tdTags.textContent = "";

    const tdTier = document.createElement("td");
    tdTier.textContent = getTierLabel(sc.cfg.tier);

    const tdCareer = document.createElement("td");
    tdCareer.textContent = getCareerLabel(sc.cfg.career);

    const tdMentor = document.createElement("td");
    tdMentor.textContent = getMentorshipLabel(sc.cfg.mentorship);

    const tdDelivery = document.createElement("td");
    tdDelivery.textContent = getDeliveryLabel(sc.cfg.delivery);

    const tdResponse = document.createElement("td");
    tdResponse.textContent = getResponseLabel(sc.cfg.response);

    const tdCohorts = document.createElement("td");
    tdCohorts.textContent = formatNumber(sc.cfg.numberOfCohorts);

    const tdTrainees = document.createElement("td");
    tdTrainees.textContent = formatNumber(sc.cfg.traineesPerCohort);

    const tdCostPerTrainee = document.createElement("td");
    tdCostPerTrainee.textContent = formatCurrency(
      sc.cfg.costPerTraineePerMonth,
      state.currency
    );
    tdCostPerTrainee.className = "numeric-cell";

    const tdModel = document.createElement("td");
    tdModel.textContent = "Average mixed logit (overall sample)";

    const tdEndorse = document.createElement("td");
    tdEndorse.textContent = formatPercent(r.endorse * 100, 1);

    const tdWtpPerTrainee = document.createElement("td");
    tdWtpPerTrainee.textContent = formatCurrency(
      r.wtpPerTraineePerMonth,
      state.currency
    );
    tdWtpPerTrainee.className = "numeric-cell";

    const tdTotalWtpAll = document.createElement("td");
    tdTotalWtpAll.textContent = formatCurrency(
      r.wtpTotalAllCohorts,
      state.currency
    );
    tdTotalWtpAll.className = "numeric-cell";

    const tdBcr = document.createElement("td");
    tdBcr.textContent = r.natBcr !== null ? r.natBcr.toFixed(2) : "-";
    tdBcr.className = "numeric-cell";

    const tdTotalCostAll = document.createElement("td");
    tdTotalCostAll.textContent = formatCurrency(
      r.totalEconomicCostAllCohorts,
      state.currency
    );
    tdTotalCostAll.className = "numeric-cell";

    const tdTotalEpiAll = document.createElement("td");
    tdTotalEpiAll.textContent = formatCurrency(
      r.epiBenefitAllCohorts,
      state.currency
    );
    tdTotalEpiAll.className = "numeric-cell";

    const tdNetEpiAll = document.createElement("td");
    tdNetEpiAll.textContent = formatCurrency(
      r.natNetBenefit,
      state.currency
    );
    tdNetEpiAll.className = "numeric-cell";

    const tdOutbreaks = document.createElement("td");
    tdOutbreaks.textContent = formatNumber(
      r.natOutbreaksPerYearAllCohorts,
      1
    );

    const tdNotes = document.createElement("td");
    tdNotes.textContent = sc.notes;

    tr.appendChild(tdShortlist);
    tr.appendChild(tdName);
    tr.appendChild(tdTags);
    tr.appendChild(tdTier);
    tr.appendChild(tdCareer);
    tr.appendChild(tdMentor);
    tr.appendChild(tdDelivery);
    tr.appendChild(tdResponse);
    tr.appendChild(tdCohorts);
    tr.appendChild(tdTrainees);
    tr.appendChild(tdCostPerTrainee);
    tr.appendChild(tdModel);
    tr.appendChild(tdEndorse);
    tr.appendChild(tdWtpPerTrainee);
    tr.appendChild(tdTotalWtpAll);
    tr.appendChild(tdBcr);
    tr.appendChild(tdTotalCostAll);
    tr.appendChild(tdTotalEpiAll);
    tr.appendChild(tdNetEpiAll);
    tr.appendChild(tdOutbreaks);
    tr.appendChild(tdNotes);

    tbody.appendChild(tr);
  });
}

function exportScenariosToExcel() {
  if (typeof XLSX === "undefined") {
    showToast("Excel export library is not available", "error");
    return;
  }
  const rows = [];

  rows.push([
    "Name",
    "Tier",
    "Career incentive",
    "Mentorship",
    "Delivery",
    "Response time",
    "Cohorts",
    "Trainees per cohort",
    "Cost per trainee per month (INR)",
    "Preference model",
    "Endorsement (%)",
    "Total willingness to pay (all cohorts, INR)",
    "Total economic cost (all cohorts, INR)",
    "Total epidemiological benefit (all cohorts, INR)",
    "Net epidemiological benefit (all cohorts, INR)",
    "National benefit cost ratio"
  ]);

  state.scenarios.forEach((sc) => {
    const r = sc.resultsSnapshot;
    rows.push([
      sc.name,
      getTierLabel(sc.cfg.tier),
      getCareerLabel(sc.cfg.career),
      getMentorshipLabel(sc.cfg.mentorship),
      getDeliveryLabel(sc.cfg.delivery),
      getResponseLabel(sc.cfg.response),
      sc.cfg.numberOfCohorts,
      sc.cfg.traineesPerCohort,
      sc.cfg.costPerTraineePerMonth,
      "Average mixed logit (overall sample)",
      (r.endorse * 100).toFixed(1),
      r.wtpTotalAllCohorts,
      r.totalEconomicCostAllCohorts,
      r.epiBenefitAllCohorts,
      r.natNetBenefit,
      r.natBcr !== null ? r.natBcr.toFixed(2) : ""
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Scenarios");
  XLSX.writeFile(wb, "steps_scenarios.xlsx");
}

function exportScenariosToPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("PDF export library is not available", "error");
    return;
  }
  const doc = new window.jspdf.jsPDF("p", "mm", "a4");
  let y = 10;

  doc.setFontSize(14);
  doc.text("STEPS FETP India Decision Aid", 10, y);
  y += 7;
  doc.setFontSize(11);
  doc.text("Policy brief: saved scenarios", 10, y);
  y += 8;
  doc.setFontSize(9);

  state.scenarios.forEach((sc, idx) => {
    const r = sc.resultsSnapshot;
    if (y > 270) {
      doc.addPage();
      y = 10;
    }
    doc.text(`${idx + 1}. ${sc.name}`, 10, y);
    y += 5;
    const lines = [
      `Tier: ${getTierLabel(sc.cfg.tier)}, cohorts: ${sc.cfg.numberOfCohorts}, trainees per cohort: ${sc.cfg.traineesPerCohort}`,
      `Endorsement: ${(r.endorse * 100).toFixed(1)} %, model: average mixed logit (overall sample)`,
      `Total economic cost (all cohorts): ${formatCurrencyInr(
        r.totalEconomicCostAllCohorts
      )}`,
      `Total willingness to pay (all cohorts): ${formatCurrencyInr(
        r.wtpTotalAllCohorts
      )}`,
      `Total epidemiological benefit (all cohorts): ${formatCurrencyInr(
        r.epiBenefitAllCohorts
      )}`,
      `Net epidemiological benefit (all cohorts): ${formatCurrencyInr(
        r.natNetBenefit
      )}, national benefit cost ratio: ${
        r.natBcr !== null ? r.natBcr.toFixed(2) : "-"
      }`
    ];
    lines.forEach((line) => {
      doc.text(line, 12, y);
      y += 4;
    });
    if (sc.notes && sc.notes.length > 0) {
      const noteLines = doc.splitTextToSize(
        `Notes: ${sc.notes}`,
        180
      );
      noteLines.forEach((ln) => {
        doc.text(ln, 12, y);
        y += 4;
      });
    }
    y += 3;
  });

  doc.save("steps_scenarios_brief.pdf");
}

/* ===========================
   Sensitivity exports
   =========================== */

function exportSensitivityToExcel(tableId, filename) {
  if (typeof XLSX === "undefined") {
    showToast("Excel export library is not available", "error");
    return;
  }
  const table = document.getElementById(tableId);
  if (!table) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, "Sensitivity");
  XLSX.writeFile(wb, filename);
}

function exportSensitivityToPdf(tableId, filename) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("PDF export library is not available", "error");
    return;
  }
  const table = document.getElementById(tableId);
  if (!table) return;

  const doc = new window.jspdf.jsPDF("l", "mm", "a4");
  let y = 10;

  doc.setFontSize(13);
  doc.text("STEPS DCE benefits and sensitivity summary", 10, y);
  y += 8;
  doc.setFontSize(7);

  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const cells = row.querySelectorAll("th, td");
    const texts = [];
    cells.forEach((c) => {
      texts.push(c.innerText.replace(/\s+/g, " ").trim());
    });
    const line = texts.join(" | ");
    const split = doc.splitTextToSize(line, 280);
    split.forEach((ln) => {
      if (y > 190) {
        doc.addPage();
        y = 10;
      }
      doc.text(ln, 10, y);
      y += 3;
    });
    y += 1;
  });

  doc.save(filename);
}

/* ===========================
   Currency and slider helpers
   =========================== */

function refreshCostDisplay() {
  const slider = document.getElementById("cost-slider");
  const display = document.getElementById("cost-display");
  const currencyLabel = document.getElementById("currency-label");
  if (!slider || !display || !currencyLabel) return;

  const val = parseFloat(slider.value) || 0;
  currencyLabel.textContent = state.currency;
  display.textContent = formatCurrency(val, state.currency);
}

/* ===========================
   Advanced settings
   =========================== */

function applyAdvancedSettingsFromForm() {
  const valGradEl = document.getElementById("adv-value-per-graduate");
  const valOutbreakEl = document.getElementById("adv-value-per-outbreak");
  const completionEl = document.getElementById("adv-completion-rate");
  const outbreaksPerGradEl = document.getElementById(
    "adv-outbreaks-per-graduate"
  );
  const horizonEl = document.getElementById("adv-planning-horizon");
  const discEl = document.getElementById("adv-epi-discount-rate");
  const usdRateEl = document.getElementById("adv-usd-rate");

  const valuePerGrad = valGradEl ? parseFloat(valGradEl.value) || 0 : 0;
  const valuePerOutbreak = valOutbreakEl
    ? parseFloat(valOutbreakEl.value) || 0
    : 0;
  const completionRatePct = completionEl
    ? parseFloat(completionEl.value) || 0
    : 0;
  const outbreaksPerGrad = outbreaksPerGradEl
    ? parseFloat(outbreaksPerGradEl.value) || 0
    : 0;
  const horizon = horizonEl ? parseInt(horizonEl.value, 10) || 1 : 1;
  const discRatePct = discEl ? parseFloat(discEl.value) || 0 : 0;
  const usdRate = usdRateEl ? parseFloat(usdRateEl.value) || 0.012 : 0.012;

  state.epiSettings.general.planningHorizonYears = horizon;
  state.epiSettings.general.epiDiscountRate = discRatePct / 100;
  state.epiSettings.general.inrToUsdRate = usdRate;

  const completionRate = completionRatePct / 100;

  ["frontline", "intermediate", "advanced"].forEach((tier) => {
    state.epiSettings.tiers[tier].completionRate = completionRate;
    state.epiSettings.tiers[tier].outbreaksPerGraduatePerYear = outbreaksPerGrad;
    state.epiSettings.tiers[tier].valuePerGraduate = valuePerGrad;
    state.epiSettings.tiers[tier].valuePerOutbreak = valuePerOutbreak;
  });

  if (state.lastResults) {
    recomputeResultsPreserveConfig();
  }
  refreshCostDisplay();
  showToast("Advanced settings applied for this session", "success");
}

function resetAdvancedSettingsFormToDefaults() {
  state.epiSettings = JSON.parse(JSON.stringify(DEFAULT_EPI_SETTINGS));

  const valGradEl = document.getElementById("adv-value-per-graduate");
  const valOutbreakEl = document.getElementById("adv-value-per-outbreak");
  const completionEl = document.getElementById("adv-completion-rate");
  const outbreaksPerGradEl = document.getElementById(
    "adv-outbreaks-per-graduate"
  );
  const horizonEl = document.getElementById("adv-planning-horizon");
  const discEl = document.getElementById("adv-epi-discount-rate");
  const usdRateEl = document.getElementById("adv-usd-rate");

  if (valGradEl)
    valGradEl.value =
      DEFAULT_EPI_SETTINGS.tiers.frontline.valuePerGraduate;
  if (valOutbreakEl)
    valOutbreakEl.value =
      DEFAULT_EPI_SETTINGS.tiers.frontline.valuePerOutbreak;
  if (completionEl)
    completionEl.value =
      DEFAULT_EPI_SETTINGS.tiers.frontline.completionRate * 100;
  if (outbreaksPerGradEl)
    outbreaksPerGradEl.value =
      DEFAULT_EPI_SETTINGS.tiers.frontline
        .outbreaksPerGraduatePerYear;
  if (horizonEl)
    horizonEl.value =
      DEFAULT_EPI_SETTINGS.general.planningHorizonYears;
  if (discEl)
    discEl.value =
      DEFAULT_EPI_SETTINGS.general.epiDiscountRate * 100;
  if (usdRateEl)
    usdRateEl.value =
      DEFAULT_EPI_SETTINGS.general.inrToUsdRate;

  if (state.lastResults) {
    recomputeResultsPreserveConfig();
  }
  refreshCostDisplay();
  showToast("Advanced settings reset to default values", "success");
}

/* ===========================
   Copilot integration
   =========================== */

function buildCopilotScenarioJson(results) {
  const cfg = results.cfg;
  const tierSettings = getEpiTierSettings(cfg.tier);
  return {
    tool: "STEPS FETP India Decision Aid",
    version: "1.0",
    configuration: {
      scenarioName: cfg.scenarioName || "",
      scenarioNotes: cfg.scenarioNotes || "",
      programmeTierId: cfg.tier,
      programmeTierLabel: getTierLabel(cfg.tier),
      programmeDurationMonths: results.months,
      careerIncentiveId: cfg.career,
      careerIncentiveLabel: getCareerLabel(cfg.career),
      mentorshipId: cfg.mentorship,
      mentorshipLabel: getMentorshipLabel(cfg.mentorship),
      deliveryModeId: cfg.delivery,
      deliveryModeLabel: getDeliveryLabel(cfg.delivery),
      expectedResponseTimeDays: parseInt(cfg.response, 10),
      costPerTraineePerMonthInr: cfg.costPerTraineePerMonth,
      traineesPerCohort: cfg.traineesPerCohort,
      numberOfCohorts: cfg.numberOfCohorts
    },
    modelOutputs: {
      preferenceModel: "Average mixed logit (overall sample)",
      endorsementRate: results.endorse,
      optOutRate: results.optOut,
      willingnessToPayPerTraineePerMonthInr:
        results.wtpPerTraineePerMonth,
      totalWillingnessToPayAllCohortsInr:
        results.wtpTotalAllCohorts,
      totalEconomicCostPerCohortInr:
        results.totalEconomicCostPerCohort,
      totalEconomicCostAllCohortsInr:
        results.totalEconomicCostAllCohorts,
      epidemiologicalBenefitPerCohortInr:
        results.epiBenefitPerCohort,
      epidemiologicalBenefitAllCohortsInr:
        results.epiBenefitAllCohorts,
      netEpidemiologicalBenefitPerCohortInr:
        results.netBenefitPerCohort,
      netEpidemiologicalBenefitAllCohortsInr:
        results.natNetBenefit,
      epidemiologicalBenefitCostRatioPerCohort:
        results.bcrPerCohort,
      epidemiologicalBenefitCostRatioNational:
        results.natBcr,
      graduatesAllCohorts: results.natGraduatesAllCohorts,
      outbreakResponsesPerYearAllCohorts:
        results.natOutbreaksPerYearAllCohorts,
      planningHorizonYears: results.horizonYears,
      includeOpportunityCost: state.includeOpportunityCost
    },
    advancedSettings: {
      valuePerGraduateInr: tierSettings.valuePerGraduate,
      valuePerOutbreakInr: tierSettings.valuePerOutbreak,
      completionRate: tierSettings.completionRate,
      outbreaksPerGraduatePerYear:
        tierSettings.outbreaksPerGraduatePerYear,
      epidemiologicalDiscountRate:
        state.epiSettings.general.epiDiscountRate,
      inrToUsdRate: state.epiSettings.general.inrToUsdRate
    }
  };
}

function buildCopilotPromptText() {
  if (!state.lastResults) {
    return (
      "Apply a configuration in STEPS and click the Open in Copilot and copy prompt button. " +
      "The tool will generate a full interpretation prompt and scenario JSON here, ready to paste into Microsoft Copilot."
    );
  }
  const payload = buildCopilotScenarioJson(state.lastResults);
  const jsonBlock = JSON.stringify(payload, null, 2);
  return (
    COPILOT_INTERPRETATION_PROMPT.trim() +
    "\n\nJSON scenario data:\n\n" +
    jsonBlock
  );
}

function handleCopilotOpenAndCopy() {
  const textarea = document.getElementById("copilot-prompt-output");
  const statusEl = document.getElementById("copilot-status-text");

  const text = buildCopilotPromptText();

  if (textarea) {
    textarea.value = text;
  }

  if (!state.lastResults) {
    if (statusEl) {
      statusEl.textContent =
        "Apply a configuration first so that the Copilot prompt can include the current scenario JSON.";
    }
    showToast(
      "Apply a configuration before using the Copilot tab.",
      "error"
    );
    window.open("https://copilot.microsoft.com/", "_blank", "noopener");
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        if (statusEl) {
          statusEl.textContent =
            "Prompt copied to clipboard and Microsoft Copilot opened in a new tab. Paste the text there to generate a policy briefing.";
        }
        showToast("Prompt copied to clipboard", "success");
      })
      .catch(() => {
        if (statusEl) {
          statusEl.textContent =
            "Prompt prepared. Copy it manually from the box below and paste into Microsoft Copilot.";
        }
        showToast(
          "Prompt prepared. Please copy it manually.",
          "warning"
        );
      });
  } else {
    if (statusEl) {
      statusEl.textContent =
        "Prompt prepared. Copy it manually from the box below and paste into Microsoft Copilot.";
    }
    showToast(
      "Prompt prepared. Please copy it manually.",
      "warning"
    );
  }

  window.open("https://copilot.microsoft.com/", "_blank", "noopener");
}

/* ===========================
   Recompute and refresh helpers
   =========================== */

function recomputeResultsFromInputs() {
  const cfg = readConfigurationFromInputs();
  state.currentTier = cfg.tier;
  updateCostSourceOptions(cfg.tier);
  const results = computeScenarioResults(cfg);
  state.lastResults = results;

  updateConfigSummary(results);
  updateResultsView(results);
  updateCostingView(results);
  updateNationalSimulationView(results);
  updateSensitivityTables();
}

function recomputeResultsPreserveConfig() {
  if (!state.lastResults) return;
  const cfg = { ...state.lastResults.cfg };
  state.currentTier = cfg.tier;
  updateCostSourceOptions(cfg.tier);
  const results = computeScenarioResults(cfg);
  state.lastResults = results;

  updateConfigSummary(results);
  updateResultsView(results);
  updateCostingView(results);
  updateNationalSimulationView(results);
  updateSensitivityTables();
}

/* ===========================
   Tab navigation and UI wiring
   =========================== */

function switchTab(tabId) {
  const panels = document.querySelectorAll(".tab-panel");
  const links = document.querySelectorAll(".tab-link");
  panels.forEach((p) => {
    if (p.id === `tab-${tabId}`) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });
  links.forEach((btn) => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function toggleSwitchPill(el, onLabel, offLabel) {
  if (!el) return;
  el.classList.toggle("on");
  const labelSpan = el.querySelector(".switch-label");
  if (!labelSpan) return;
  if (el.classList.contains("on")) {
    labelSpan.textContent = onLabel;
  } else {
    labelSpan.textContent = offLabel;
  }
}

/* Simple guided tour placeholder */

function startQuickTour() {
  if (state.tour.seen) {
    showToast(
      "Use the tabs along the top and the panels on each tab to explore STEPS.",
      "info"
    );
    return;
  }
  state.tour.seen = true;
  showToast(
    "Quick tour: start with Configuration, then view Results, Costing, National simulation, Sensitivity and Copilot tabs.",
    "info"
  );
}

/* ===========================
   Initialisation
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  // Tabs
  document.querySelectorAll(".tab-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      if (tabId) {
        switchTab(tabId);
      }
    });
  });

  // Quick tour
  const tourBtn = document.getElementById("btn-start-tour");
  if (tourBtn) {
    tourBtn.addEventListener("click", () => {
      startQuickTour();
    });
  }

  // Programme tier change updates cost source options
  const tierSelect = document.getElementById("program-tier");
  if (tierSelect) {
    tierSelect.addEventListener("change", () => {
      state.currentTier = tierSelect.value;
      updateCostSourceOptions(state.currentTier);
      if (state.lastResults) {
        recomputeResultsFromInputs();
      }
    });
  }

  // Cost source change updates costing view
  const costSourceSelect = document.getElementById("cost-source");
  if (costSourceSelect) {
    costSourceSelect.addEventListener("change", () => {
      state.currentCostSourceId = costSourceSelect.value;
      if (state.lastResults) {
        recomputeResultsPreserveConfig();
      }
    });
  }

  // Cost slider display
  const costSlider = document.getElementById("cost-slider");
  if (costSlider) {
    costSlider.addEventListener("input", () => {
      refreshCostDisplay();
    });
  }

  // Currency toggle
  document.querySelectorAll(".pill-toggle[data-currency]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const currency = btn.dataset.currency;
      if (!currency) return;
      state.currency = currency;
      document
        .querySelectorAll(".pill-toggle[data-currency]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      refreshCostDisplay();
      if (state.lastResults) {
        updateConfigSummary(state.lastResults);
        updateResultsView(state.lastResults);
        updateCostingView(state.lastResults);
        updateNationalSimulationView(state.lastResults);
        updateSensitivityTables();
        updateScenarioTable();
      }
    });
  });

  // Opportunity cost toggle
  const oppToggle = document.getElementById("opp-toggle");
  if (oppToggle) {
    oppToggle.addEventListener("click", () => {
      state.includeOpportunityCost = !oppToggle.classList.contains("on");
      toggleSwitchPill(
        oppToggle,
        "Opportunity cost included",
        "Opportunity cost excluded"
      );
      if (state.lastResults) {
        recomputeResultsPreserveConfig();
      }
    });
  }

  // Sensitivity outbreak benefits toggle
  const epiToggle = document.getElementById("sensitivity-epi-toggle");
  if (epiToggle) {
    epiToggle.addEventListener("click", () => {
      toggleSwitchPill(
        epiToggle,
        "Outbreak benefits included",
        "Outbreak benefits not included"
      );
      updateSensitivityTables();
    });
  }

  // Apply configuration
  const updateBtn = document.getElementById("update-results");
  if (updateBtn) {
    updateBtn.addEventListener("click", () => {
      recomputeResultsFromInputs();
      showToast("Configuration applied and results updated", "success");
    });
  }

  // View results summary shortcut
  const openSnapshotBtn = document.getElementById("open-snapshot");
  if (openSnapshotBtn) {
    openSnapshotBtn.addEventListener("click", () => {
      switchTab("results");
      const el = document.getElementById("tab-results");
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  // Save scenario
  const saveScenarioBtn = document.getElementById("save-scenario");
  if (saveScenarioBtn) {
    saveScenarioBtn.addEventListener("click", () => {
      if (!state.lastResults) {
        showToast(
          "Apply a configuration before saving a scenario.",
          "error"
        );
        return;
      }
      addScenarioFromCurrentResults();
    });
  }

  // Scenario exports
  const exportExcelBtn = document.getElementById("export-excel");
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => {
      exportScenariosToExcel();
    });
  }
  const exportPdfBtn = document.getElementById("export-pdf");
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
      exportScenariosToPdf();
    });
  }

  // Sensitivity controls
  const refreshSensitivityBtn = document.getElementById(
    "refresh-sensitivity-benefits"
  );
  if (refreshSensitivityBtn) {
    refreshSensitivityBtn.addEventListener("click", () => {
      updateSensitivityTables();
      showToast("Sensitivity tables updated", "success");
    });
  }

  const exportSensExcelBtn = document.getElementById(
    "export-sensitivity-benefits-excel"
  );
  if (exportSensExcelBtn) {
    exportSensExcelBtn.addEventListener("click", () => {
      exportSensitivityToExcel(
        "dce-benefits-table",
        "steps_dce_benefits_sensitivity.xlsx"
      );
    });
  }

  const exportSensPdfBtn = document.getElementById(
    "export-sensitivity-benefits-pdf"
  );
  if (exportSensPdfBtn) {
    exportSensPdfBtn.addEventListener("click", () => {
      exportSensitivityToPdf(
        "dce-benefits-table",
        "steps_dce_benefits_sensitivity.pdf"
      );
    });
  }

  // Advanced settings
  const advApplyBtn = document.getElementById("adv-apply-settings");
  if (advApplyBtn) {
    advApplyBtn.addEventListener("click", () => {
      applyAdvancedSettingsFromForm();
    });
  }
  const advResetBtn = document.getElementById("adv-reset-settings");
  if (advResetBtn) {
    advResetBtn.addEventListener("click", () => {
      resetAdvancedSettingsFormToDefaults();
    });
  }

  // Copilot button
  const copilotBtn = document.getElementById(
    "copilot-open-and-copy-btn"
  );
  if (copilotBtn) {
    copilotBtn.addEventListener("click", () => {
      handleCopilotOpenAndCopy();
    });
  }

  // Initial cost source options and cost display
  state.currentTier =
    document.getElementById("program-tier")?.value || "frontline";
  updateCostSourceOptions(state.currentTier);
  refreshCostDisplay();

  // Apply initial configuration so all tabs have content
  recomputeResultsFromInputs();
});
