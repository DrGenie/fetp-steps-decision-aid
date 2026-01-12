/* ===================================================
   STEPS: Scalable Training Estimation and Planning System (FETP India)
   Core logic + UI wiring (enhanced version with mentor costs, capacity,
   assumptions, One Health multiplier, and dual Copilot/ChatGPT briefing)
   =================================================== */

/* ===========================
   Global model coefficients
   =========================== */

/**
 * Mixed logit coefficients from the preference study.
 * Used to derive endorsement and perceived programme value.
 * (Unchanged numerically from the original tool.)
 */
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
    medium: 0.075,
    high: 0.209
  },
  delivery: {
    blended: 0.0,
    in_service: -0.359
  },
  response: {
    7: 0.321
  },
  costPerTraineePerMonth: -0.000000884,
  scaleValue: 1.0
};

/* ===========================
   Cost templates (unchanged)
   =========================== */

const COST_TEMPLATES = {
  frontline: {
    combined: {
      id: "frontline_combined",
      label: "Frontline combined template (all institutions)",
      description:
        "Combined frontline cost structure across all institutions, aggregating harmonised components and indirect costs including opportunity cost.",
      oppRate: 0.35,
      components: [
        { id: "tuition", label: "Tuition and program management", directShare: 0.14 },
        { id: "faculty", label: "Faculty and teaching time", directShare: 0.32 },
        { id: "travel", label: "Trainee travel and per diems", directShare: 0.25 },
        { id: "admin", label: "Administration and overheads", directShare: 0.29 }
      ]
    }
  },
  intermediate: {
    combined: {
      id: "intermediate_combined",
      label: "Intermediate combined template (all institutions)",
      description:
        "Combined intermediate cost structure across all institutions, aggregating harmonised components and indirect costs including opportunity cost.",
      oppRate: 0.35,
      components: [
        { id: "tuition", label: "Tuition and fees", directShare: 0.2265 },
        { id: "faculty", label: "Faculty and teaching", directShare: 0.2004 },
        { id: "trainee_support", label: "Trainee support costs", directShare: 0.2349 },
        { id: "admin", label: "Administration and overheads", directShare: 0.3382 }
      ]
    }
  },
  advanced: {
    combined: {
      id: "advanced_combined",
      label: "Advanced combined template (all institutions)",
      description:
        "Combined advanced cost structure across all institutions, aggregating harmonised components and indirect costs including opportunity cost.",
      oppRate: 0.35,
      components: [
        { id: "tuition", label: "Tuition and program management", directShare: 0.22 },
        { id: "faculty", label: "Faculty and teaching", directShare: 0.28 },
        { id: "trainee_support", label: "Trainee support costs", directShare: 0.25 },
        { id: "admin", label: "Administration and overheads", directShare: 0.25 }
      ]
    }
  }
};

/* ===========================
   Epidemiological settings
   =========================== */

const DEFAULT_EPI_SETTINGS = {
  general: {
    planningHorizonYears: 5,
    inrToUsdRate: 83,
    epiDiscountRate: 0.03,
    crossSectorBenefitMultiplier: 1.0, // One Health / cross-sector multiplier
    mentorBaseCostPerCohort: 2000000, // INR, user-editable
    availableMentorsNational: 200,
    availableTrainingSites: 0,
    maxCohortsPerSitePerYear: 0
  },
  tiers: {
    frontline: {
      completionRate: 0.9,
      outbreaksPerGraduatePerYear: 0.5,
      valuePerGraduate: 0, // non-outbreak value per graduate per year (INR)
      valuePerOutbreak: 4000000
    },
    intermediate: {
      completionRate: 0.9,
      outbreaksPerGraduatePerYear: 0.5,
      valuePerGraduate: 0,
      valuePerOutbreak: 4000000
    },
    advanced: {
      completionRate: 0.9,
      outbreaksPerGraduatePerYear: 0.5,
      valuePerGraduate: 0,
      valuePerOutbreak: 4000000
    }
  }
};

/* Tier duration in months (unchanged) */
const TIER_MONTHS = {
  frontline: 3,
  intermediate: 12,
  advanced: 24
};

/* Mentor capacity assumptions (new, used for capacity tab) */
const MENTOR_CAPACITY = {
  low: 5,
  medium: 3.5,
  high: 2
};

const MENTOR_MULTIPLIERS = {
  low: 1.0,
  medium: 1.3,
  high: 1.7
};

/* ===========================
   Copilot / ChatGPT interpretation prompt
   =========================== */

const COPILOT_INTERPRETATION_PROMPT = `
You are a senior health economist advising the Ministry of Health and NCDC on scaling up Field Epidemiology Training Programmes (FETP) in India. You receive structured outputs from the STEPS decision aid summarising alternative programme configurations, costs, epidemiological benefits, and perceived programme value derived from a discrete choice experiment.

Your task is to turn these outputs into a short, policy-ready briefing for decision-makers, clearly explaining:
- What each scenario implies in terms of cost, epidemiological impact, and perceived programme value.
- How scenarios compare on value-for-money (benefit–cost ratios, net benefits).
- Any capacity and feasibility issues (mentor numbers, training sites).
- Key implementation enablers and risks.

Use plain language suitable for senior policy audiences. Avoid technical jargon and equations. Clearly label all monetary values as INR and round to sensible units (e.g. millions of INR). Where relevant, highlight trade-offs between higher resource use and greater epidemiological or perceived value.

DO NOT re-estimate any models – simply interpret and communicate the results.
`;

const CHATGPT_INTERPRETATION_ADDITION = `
Paste this prompt and data into ChatGPT. Using the structured STEPS output, draft a concise 2-page policy brief or slide-ready summary that:
- Explains the scenarios and their main differences.
- Highlights perceived programme value, epidemiological benefits, and economic costs.
- Includes a small comparison table of the top scenarios.
- Summarises capacity and feasibility findings.
- Lists key implementation enablers and risks in bullet form.

Keep the language policy-ready and accessible. Avoid technical econometric language and focus on implications for decision-making.
`;

const COPILOT_INTERPRETATION_ADDITION = `
Paste this prompt and data into Microsoft Copilot (for Word or PowerPoint). Use it to generate a short briefing note or a slide deck that:
- Explains and compares the scenarios.
- Highlights perceived programme value, epidemiological benefits, and economic costs.
- Summarises capacity and feasibility.
- Lists implementation enablers and risks.

Keep the language concise and suitable for senior policy decision-makers.
`;

/* ===========================
   App state
   =========================== */

const appState = {
  epiSettings: JSON.parse(JSON.stringify(DEFAULT_EPI_SETTINGS)),
  usdRate: DEFAULT_EPI_SETTINGS.general.inrToUsdRate,
  currentScenario: null,
  savedScenarios: [],
  nationalSimulation: {
    population: 1_400_000_000,
    cohortScaleFactor: 1
  },
  warnings: {
    largeCohortShown: false,
    costExtremeShown: false
  }
};

/* ===========================
   Utility helpers
   =========================== */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatINR(x) {
  if (!isFinite(x)) return "-";
  if (Math.abs(x) >= 1e7) {
    return `₹${(x / 1e7).toFixed(2)} crore`;
  }
  if (Math.abs(x) >= 1e5) {
    return `₹${(x / 1e5).toFixed(1)} lakh`;
  }
  return `₹${x.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatNumber(x, decimals = 0) {
  if (!isFinite(x)) return "-";
  return x.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function getElement(id) {
  return document.getElementById(id);
}

function getElementFromCandidates(ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function showToast(message, type = "info") {
  const toast = getElement("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

/* ===========================
   Preference model helpers
   =========================== */

function tierEffect(tier) {
  return MXL_COEFS.tier[tier] || 0;
}

function careerEffect(career) {
  return MXL_COEFS.career[career] || 0;
}

function mentorshipEffect(level) {
  return MXL_COEFS.mentorship[level] || 0;
}

function deliveryEffect(delivery) {
  return MXL_COEFS.delivery[delivery] || 0;
}

function responseEffect(resp) {
  return MXL_COEFS.response[resp] || 0;
}

function costEffect(costPerTraineePerMonth) {
  return MXL_COEFS.costPerTraineePerMonth * costPerTraineePerMonth;
}

function logit(p) {
  return 1 / (1 + Math.exp(-p));
}

/**
 * Compute endorsement probability and perceived programme value.
 * Perceived programme value is the old WTP construct, renamed in UI.
 */
function computePreferenceOutputs(config) {
  const vProgram =
    MXL_COEFS.ascProgram +
    tierEffect(config.tier) +
    careerEffect(config.career) +
    mentorshipEffect(config.mentorship) +
    deliveryEffect(config.delivery) +
    responseEffect(config.response) +
    costEffect(config.costPerTraineePerMonth);

  const vOptOut = MXL_COEFS.ascOptOut;
  const expProg = Math.exp(vProgram);
  const expOptOut = Math.exp(vOptOut);

  const endorsement = expProg / (expProg + expOptOut);
  const perceivedProgrammeValuePerTraineePerMonth =
    -costEffect(config.costPerTraineePerMonth) / Math.abs(MXL_COEFS.costPerTraineePerMonth);

  return {
    endorsementProbability: endorsement,
    perceivedProgrammeValuePerTraineePerMonth
  };
}

/* ===========================
   Costing: direct + economic + mentor support (new)
   =========================== */

function getMentorMultiplier(mentorship) {
  return MENTOR_MULTIPLIERS[mentorship] || 1.0;
}

function computeCosts(config) {
  const tierTemplate = COST_TEMPLATES[config.tier]?.combined;
  const oppRateBase = tierTemplate ? tierTemplate.oppRate : 0;
  const oppRate = config.opportunityCostIncluded ? oppRateBase : 0;

  const months = TIER_MONTHS[config.tier] || 12;
  const trainees = config.traineesPerCohort;
  const costPerTraineePerMonth = config.costPerTraineePerMonth;

  const directProgrammeCostPerCohort = trainees * months * costPerTraineePerMonth;

  const general = appState.epiSettings.general || {};
  const mentorBaseCostPerCohort = Number(general.mentorBaseCostPerCohort) || 0;
  const mentorMultiplier = getMentorMultiplier(config.mentorship);
  const mentorCostPerCohort = mentorBaseCostPerCohort * mentorMultiplier;
  const totalMentorCostAllCohorts = mentorCostPerCohort * config.cohorts;

  const directCostPerCohort = directProgrammeCostPerCohort + mentorCostPerCohort;
  const opportunityCostPerCohort = directCostPerCohort * oppRate;
  const totalEconomicCostPerCohort = directCostPerCohort + opportunityCostPerCohort;

  const directCostAllCohorts = directCostPerCohort * config.cohorts;
  const totalEconomicCostAllCohorts = totalEconomicCostPerCohort * config.cohorts;

  return {
    months,
    trainees,
    costPerTraineePerMonth,
    template: tierTemplate,
    mentorBaseCostPerCohort,
    mentorMultiplier,
    mentorCostPerCohort,
    totalMentorCostAllCohorts,
    directProgrammeCostPerCohort,
    directCostPerCohort,
    directCostAllCohorts,
    opportunityCostRate: oppRate,
    opportunityCostPerCohort,
    totalEconomicCostPerCohort,
    totalEconomicCostAllCohorts
  };
}

/* ===========================
   Epidemiological benefits (with One Health multiplier & optional non-outbreak value)
   =========================== */

function computeEpidemiological(config, endorsement) {
  const general = appState.epiSettings.general;
  const tierSettings = appState.epiSettings.tiers[config.tier];

  const completionRate = tierSettings.completionRate;
  const outbreaksPerGraduatePerYear = tierSettings.outbreaksPerGraduatePerYear;
  const valuePerOutbreak = tierSettings.valuePerOutbreak;
  const valuePerGraduate = tierSettings.valuePerGraduate || 0;
  const includeNonOutbreak = valuePerGraduate > 0;

  const planningHorizonYears = general.planningHorizonYears;
  const discountRate = general.epiDiscountRate;
  const crossSectorMultiplier = general.crossSectorBenefitMultiplier || 1.0;

  const trainees = config.traineesPerCohort;
  const grads = trainees * completionRate;
  const effectiveGrads = grads * endorsement;

  const pvFactor =
    discountRate > 0
      ? (1 - Math.pow(1 + discountRate, -planningHorizonYears)) / discountRate
      : planningHorizonYears;

  const outbreakAnnualBenefitPerCohort =
    effectiveGrads * outbreaksPerGraduatePerYear * valuePerOutbreak;
  const outbreakBenefitPV = outbreakAnnualBenefitPerCohort * pvFactor;

  let nonOutbreakAnnualBenefitPerCohort = 0;
  let nonOutbreakBenefitPV = 0;

  if (includeNonOutbreak && valuePerGraduate > 0) {
    nonOutbreakAnnualBenefitPerCohort = effectiveGrads * valuePerGraduate;
    nonOutbreakBenefitPV = nonOutbreakAnnualBenefitPerCohort * pvFactor;
  }

  const epiBenefitPerCohortBase = outbreakBenefitPV + nonOutbreakBenefitPV;
  const epiBenefitPerCohort = epiBenefitPerCohortBase * crossSectorMultiplier;

  const outbreakResponsesPerYearPerCohort = effectiveGrads * outbreaksPerGraduatePerYear;

  return {
    grads,
    effectiveGrads,
    completionRate,
    outbreaksPerGraduatePerYear,
    valuePerOutbreak,
    valuePerGraduate,
    includeNonOutbreak,
    planningHorizonYears,
    discountRate,
    crossSectorMultiplier,
    outbreakAnnualBenefitPerCohort,
    nonOutbreakAnnualBenefitPerCohort,
    epiBenefitPerCohort,
    outbreakResponsesPerYearPerCohort
  };
}

/* ===========================
   Capacity & Feasibility (new)
   =========================== */

function computeCapacityAndFeasibility(config) {
  const general = appState.epiSettings.general || {};
  const capacityPerMentor = MENTOR_CAPACITY[config.mentorship] || 5;

  const mentorsPerCohort =
    config.traineesPerCohort > 0 ? Math.ceil(config.traineesPerCohort / capacityPerMentor) : 0;
  const totalMentorsRequired = mentorsPerCohort * config.cohorts;

  const availableMentors = Number(general.availableMentorsNational) || null;
  let mentorShortfall = 0;
  let withinMentorCapacity = true;

  if (availableMentors && totalMentorsRequired > availableMentors) {
    withinMentorCapacity = false;
    mentorShortfall = totalMentorsRequired - availableMentors;
  }

  const availableSites = Number(general.availableTrainingSites) || null;
  const maxCohortsPerSitePerYear = Number(general.maxCohortsPerSitePerYear) || null;

  let totalCohortCapacity = null;
  let cohortsShortfall = 0;
  let withinSiteCapacity = true;

  if (availableSites && maxCohortsPerSitePerYear) {
    totalCohortCapacity = availableSites * maxCohortsPerSitePerYear;
    if (config.cohorts > totalCohortCapacity) {
      withinSiteCapacity = false;
      cohortsShortfall = config.cohorts - totalCohortCapacity;
    }
  }

  const overallWithinCapacity = withinMentorCapacity && withinSiteCapacity;

  let statusText = overallWithinCapacity ? "Within current capacity" : "Requires capacity expansion";
  let gapNote = "";

  if (!overallWithinCapacity) {
    const parts = [];
    if (!withinMentorCapacity && mentorShortfall > 0) {
      parts.push(`approximately ${mentorShortfall} additional mentors`);
    }
    if (!withinSiteCapacity && cohortsShortfall > 0 && totalCohortCapacity !== null) {
      parts.push(
        `${cohortsShortfall} more cohorts than current site capacity (${totalCohortCapacity} cohorts/year)`
      );
    }
    gapNote =
      parts.length > 0
        ? `Scenario exceeds capacity and would require ${parts.join(" and ")}.`
        : "Scenario exceeds at least one capacity constraint.";
  } else {
    gapNote =
      "Scenario fits within the currently specified mentor and training-site capacity assumptions.";
  }

  return {
    capacityPerMentor,
    mentorsPerCohort,
    totalMentorsRequired,
    availableMentors,
    mentorShortfall,
    withinMentorCapacity,
    availableSites,
    maxCohortsPerSitePerYear,
    totalCohortCapacity,
    cohortsShortfall,
    withinSiteCapacity,
    overallWithinCapacity,
    statusText,
    gapNote
  };
}

/* ===========================
   Configuration reading
   =========================== */

function getConfigFromForm() {
  const tier = getElement("program-tier")?.value || "frontline";
  const career = getElement("career-track")?.value || "certificate";
  const mentorship = getElement("mentorship")?.value || "low";
  const delivery = getElement("delivery")?.value || "blended";

  let response = "7";
  const responseEl = getElement("response");
  if (responseEl) {
    response = responseEl.value || "7";
    responseEl.value = "7";
  }

  const costSliderEl = getElement("cost-slider");
  const costPerTraineePerMonth = costSliderEl ? Number(costSliderEl.value) || 0 : 0;

  const trainees = Number(getElement("trainees")?.value) || 0;
  const cohorts = Number(getElement("cohorts")?.value) || 0;

  const horizonInput = getElementFromCandidates([
    "adv-planning-years",
    "adv-planning-horizon",
    "planning-horizon"
  ]);
  let planningHorizonYears = appState.epiSettings.general.planningHorizonYears;
  if (horizonInput) {
    const phVal = Number(horizonInput.value);
    if (!isNaN(phVal) && phVal > 0) {
      planningHorizonYears = phVal;
    }
  }
  appState.epiSettings.general.planningHorizonYears = planningHorizonYears;

  const oppToggle = getElement("opp-toggle");
  const oppIncluded = oppToggle ? oppToggle.classList.contains("on") : true;

  const scenarioNameInput = getElement("scenario-name");
  const scenarioNotesInput = getElement("scenario-notes");
  const scenarioName =
    (scenarioNameInput?.value.trim()) ||
    `${tier} / ${mentorship} / ${cohorts} cohort(s)`;
  const scenarioNotes = scenarioNotesInput?.value.trim() || "";

  // Validation warnings
  const totalTrainees = trainees * cohorts;
  if (totalTrainees > 5000 && !appState.warnings.largeCohortShown) {
    showToast(
      "Total trainees across cohorts is very large. Please check whether this scenario is realistic.",
      "warning"
    );
    appState.warnings.largeCohortShown = true;
  }

  if (
    costSliderEl &&
    !appState.warnings.costExtremeShown &&
    costSliderEl.min &&
    costSliderEl.max
  ) {
    const min = Number(costSliderEl.min);
    const max = Number(costSliderEl.max);
    if (
      costPerTraineePerMonth <= min + 0.05 * (max - min) ||
      costPerTraineePerMonth >= max - 0.05 * (max - min)
    ) {
      showToast(
        "Cost per trainee per month is near the minimum or maximum of the range. Please check that this assumption is realistic.",
        "warning"
      );
      appState.warnings.costExtremeShown = true;
    }
  }

  return {
    tier,
    career,
    mentorship,
    delivery,
    response,
    costPerTraineePerMonth,
    traineesPerCohort: trainees,
    cohorts,
    planningHorizonYears,
    opportunityCostIncluded: oppIncluded,
    name: scenarioName,
    notes: scenarioNotes,
    preferenceModel: "Mixed logit model from the preference study"
  };
}

/* ===========================
   Scenario computation
   =========================== */

function computeScenario() {
  const config = getConfigFromForm();
  const pref = computePreferenceOutputs(config);
  const costs = computeCosts(config);
  const epi = computeEpidemiological(config, pref.endorsementProbability);
  const capacity = computeCapacityAndFeasibility(config);

  const epiBenefitAllCohorts = epi.epiBenefitPerCohort * config.cohorts;
  const natTotalCost = costs.totalEconomicCostAllCohorts;
  const netBenefitAllCohorts = epiBenefitAllCohorts - natTotalCost;
  const bcrPerCohort =
    costs.totalEconomicCostPerCohort > 0
      ? epi.epiBenefitPerCohort / costs.totalEconomicCostPerCohort
      : null;

  const perceivedProgrammeValuePerTraineePerMonth =
    pref.perceivedProgrammeValuePerTraineePerMonth;
  const perceivedProgrammeValueTotal =
    perceivedProgrammeValuePerTraineePerMonth *
    costs.months *
    config.traineesPerCohort *
    config.cohorts;

  const scenario = {
    id: `scen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    config,
    costs,
    epi,
    capacity,
    endorsement: pref.endorsementProbability,
    perceivedProgrammeValuePerTraineePerMonth,
    perceivedProgrammeValueTotal,
    epiBenefitAllCohorts,
    netBenefitAllCohorts,
    natTotalCost,
    benefitCostRatio: bcrPerCohort
  };

  appState.currentScenario = scenario;
  return scenario;
}

/* ===========================
   Assumptions object (for exports & prompts)
   =========================== */

function buildAssumptionsForScenario(scenario) {
  const general = appState.epiSettings.general;
  const tierSettings = appState.epiSettings.tiers[scenario.config.tier];

  return {
    planningHorizonYears: general.planningHorizonYears,
    discountRatePercent: general.epiDiscountRate * 100,
    completionRatePercent: tierSettings.completionRate * 100,
    outbreaksPerGraduatePerYear: tierSettings.outbreaksPerGraduatePerYear,
    valuePerOutbreakINR: tierSettings.valuePerOutbreak,
    nonOutbreakValuePerGraduatePerYearINR: tierSettings.valuePerGraduate || 0,
    includeNonOutbreak: (tierSettings.valuePerGraduate || 0) > 0,
    opportunityCostIncluded: scenario.config.opportunityCostIncluded,
    mentorBaseCostPerCohortINR: general.mentorBaseCostPerCohort,
    mentorshipMultiplier: scenario.costs.mentorMultiplier,
    crossSectorBenefitMultiplier: general.crossSectorBenefitMultiplier,
    availableMentorsNational: general.availableMentorsNational,
    availableTrainingSites: general.availableTrainingSites,
    maxCohortsPerSitePerYear: general.maxCohortsPerSitePerYear
  };
}

/* ===========================
   UI updates: Results, Costing, Capacity
   =========================== */

function updateResultsTab(scenario) {
  if (!scenario) return;
  const { config, costs, epi } = scenario;

  const endorsementEl = getElement("config-endorsement-value");
  if (endorsementEl) {
    endorsementEl.textContent = `${(scenario.endorsement * 100).toFixed(1)}%`;
  }

  const wtpPerTraineeEl = getElement("wtp-per-trainee");
  if (wtpPerTraineeEl) {
    wtpPerTraineeEl.textContent = formatINR(
      scenario.perceivedProgrammeValuePerTraineePerMonth
    );
  }

  const wtpTotalEl = getElement("wtp-total");
  if (wtpTotalEl) {
    wtpTotalEl.textContent = formatINR(scenario.perceivedProgrammeValueTotal);
  }

  const epiPerCohortEl = getElement("epi-benefit-per-cohort");
  if (epiPerCohortEl) epiPerCohortEl.textContent = formatINR(epi.epiBenefitPerCohort);

  const epiAllEl = getElement("epi-benefit-all-cohorts");
  if (epiAllEl) epiAllEl.textContent = formatINR(scenario.epiBenefitAllCohorts);

  const econCostEl = getElement("econ-cost-all-cohorts");
  if (econCostEl) econCostEl.textContent = formatINR(scenario.natTotalCost);

  const netBenefitEl = getElement("net-benefit-all-cohorts");
  if (netBenefitEl) netBenefitEl.textContent = formatINR(scenario.netBenefitAllCohorts);

  const bcrEl = getElement("bcr-per-cohort");
  if (bcrEl) {
    bcrEl.textContent = scenario.benefitCostRatio
      ? scenario.benefitCostRatio.toFixed(2)
      : "-";
  }

  const outbreaksEl = getElement("outbreaks-per-year");
  if (outbreaksEl) {
    outbreaksEl.textContent = formatNumber(epi.outbreakResponsesPerYearPerCohort, 1);
  }
}

function updateCostingTab(scenario) {
  if (!scenario) return;
  const { costs, config } = scenario;

  const summaryBox = getElement("cost-summary");
  if (summaryBox) {
    summaryBox.innerHTML = "";

    const cardsData = [
      {
        label: "Direct programme cost per cohort (excl. mentors)",
        value: formatINR(costs.directProgrammeCostPerCohort)
      },
      {
        label: "Mentor support cost per cohort",
        value: formatINR(costs.mentorCostPerCohort)
      },
      {
        label: "Total mentor cost (all cohorts)",
        value: formatINR(costs.totalMentorCostAllCohorts)
      },
      {
        label: "Direct cost per cohort (programme + mentor, excl. opportunity cost)",
        value: formatINR(costs.directCostPerCohort)
      },
      {
        label: "Direct cost total (all cohorts)",
        value: formatINR(costs.directCostAllCohorts)
      },
      {
        label: "Economic cost per cohort (incl. opportunity cost if toggle on)",
        value: formatINR(costs.totalEconomicCostPerCohort)
      },
      {
        label: "Economic cost total (all cohorts)",
        value: formatINR(costs.totalEconomicCostAllCohorts)
      },
      {
        label: "Opportunity cost share (if included)",
        value:
          costs.opportunityCostRate > 0
            ? `${(costs.opportunityCostRate * 100).toFixed(0)}%`
            : "Not included"
      }
    ];

    cardsData.forEach((card) => {
      const div = document.createElement("div");
      div.className = "summary-card";
      div.innerHTML = `<div class="summary-label">${card.label}</div><div class="summary-value">${card.value}</div>`;
      summaryBox.appendChild(div);
    });
  }

  const componentsTbody = getElement("cost-components-list");
  if (componentsTbody && costs.template) {
    componentsTbody.innerHTML = "";
    costs.template.components.forEach((comp) => {
      const tr = document.createElement("tr");
      const perCohort =
        comp.directShare * costs.directProgrammeCostPerCohort;
      const perTraineePerMonth =
        costs.trainees > 0 && costs.months > 0
          ? perCohort / (costs.trainees * costs.months)
          : 0;

      tr.innerHTML = `
        <td>${comp.label}</td>
        <td>${(comp.directShare * 100).toFixed(1)}%</td>
        <td>${formatINR(perCohort)}</td>
        <td>${formatINR(perTraineePerMonth)}</td>
        <td>Based on combined cost template for ${config.tier} tier</td>
      `;
      componentsTbody.appendChild(tr);
    });

    // Mentor support as explicit component
    const mentorRow = document.createElement("tr");
    mentorRow.innerHTML = `
      <td>Mentor support cost (per cohort)</td>
      <td>—</td>
      <td>${formatINR(costs.mentorCostPerCohort)}</td>
      <td>—</td>
      <td>Base mentor support cost per cohort × mentorship intensity multiplier (${costs.mentorMultiplier.toFixed(
        1
      )})</td>
    `;
    componentsTbody.appendChild(mentorRow);
  }
}

function updateCapacityTab(scenario) {
  if (!scenario || !scenario.capacity) return;
  const c = scenario.capacity;

  const setText = (id, value, decimals = 0) => {
    const el = getElement(id);
    if (!el) return;
    el.textContent =
      value === null || value === undefined
        ? "-"
        : typeof value === "number"
        ? formatNumber(value, decimals)
        : value;
  };

  setText("capacity-mentors-per-cohort", c.mentorsPerCohort);
  setText("capacity-total-mentors-required", c.totalMentorsRequired);
  setText("capacity-available-mentors", c.availableMentors ?? "-");
  setText("capacity-mentor-shortfall", c.mentorShortfall > 0 ? c.mentorShortfall : 0);
  setText("capacity-total-cohort-capacity", c.totalCohortCapacity ?? "-");
  setText("capacity-cohort-shortfall", c.cohortsShortfall > 0 ? c.cohortsShortfall : 0);

  const statusEl = getElement("capacity-status-text");
  if (statusEl) statusEl.textContent = c.statusText;

  const gapNoteEl = getElement("capacity-gap-note");
  if (gapNoteEl) gapNoteEl.textContent = c.gapNote;
}

function updateNationalSimulationTab(scenario) {
  if (!scenario) return;
  const { epi, costs, config } = scenario;

  const natTotalCostEl = getElement("national-total-cost");
  if (natTotalCostEl) natTotalCostEl.textContent = formatINR(costs.totalEconomicCostAllCohorts);

  const natTotalEpiEl = getElement("national-total-epi");
  if (natTotalEpiEl) natTotalEpiEl.textContent = formatINR(scenario.epiBenefitAllCohorts);

  const natNetEl = getElement("national-net-benefit");
  if (natNetEl) natNetEl.textContent = formatINR(scenario.netBenefitAllCohorts);

  const natOutbreaksEl = getElement("national-outbreaks-per-year");
  if (natOutbreaksEl) {
    natOutbreaksEl.textContent = formatNumber(
      epi.outbreakResponsesPerYearPerCohort * config.cohorts,
      1
    );
  }
}

/* ===========================
   Saved scenarios
   =========================== */

function saveCurrentScenario() {
  if (!appState.currentScenario) {
    showToast("Compute a scenario before saving.", "warning");
    return;
  }
  appState.savedScenarios.push(appState.currentScenario);
  refreshSavedScenariosTable();
  showToast("Scenario saved.", "success");
}

function refreshSavedScenariosTable() {
  const tbody = getElement("scenario-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  appState.savedScenarios.forEach((scen) => {
    const { config, costs, epi } = scen;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" data-scenario-id="${scen.id}" /></td>
      <td>${config.name}</td>
      <td>${config.tier}</td>
      <td>${config.career}</td>
      <td>${config.mentorship}</td>
      <td>${config.delivery}</td>
      <td>${config.cohorts}</td>
      <td>${config.traineesPerCohort}</td>
      <td>${formatINR(config.costPerTraineePerMonth)}</td>
      <td>${formatINR(costs.mentorCostPerCohort)}</td>
      <td>${formatINR(costs.totalMentorCostAllCohorts)}</td>
      <td>${formatINR(costs.directCostAllCohorts)}</td>
      <td>${formatINR(costs.totalEconomicCostAllCohorts)}</td>
      <td>${(scen.endorsement * 100).toFixed(1)}%</td>
      <td>${formatINR(scen.perceivedProgrammeValueTotal)}</td>
      <td>${formatINR(scen.epiBenefitAllCohorts)}</td>
      <td>${formatINR(scen.netBenefitAllCohorts)}</td>
      <td>${
        scen.benefitCostRatio ? scen.benefitCostRatio.toFixed(2) : "-"
      }</td>
      <td>${formatNumber(
        epi.outbreakResponsesPerYearPerCohort * config.cohorts,
        1
      )}</td>
      <td>${scen.capacity?.statusText || "-"}</td>
      <td>${config.notes || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

function getShortlistedScenarios() {
  const tbody = getElement("scenario-table-body");
  if (!tbody) return [];
  const checkedIds = Array.from(
    tbody.querySelectorAll('input[type="checkbox"][data-scenario-id]:checked')
  ).map((el) => el.getAttribute("data-scenario-id"));
  if (!checkedIds.length) return [];
  return appState.savedScenarios.filter((s) => checkedIds.includes(s.id));
}

function getScenariosForBrief() {
  const shortlisted = getShortlistedScenarios();
  if (shortlisted.length > 0) return shortlisted;

  const sorted = [...appState.savedScenarios].sort(
    (a, b) => (b.netBenefitAllCohorts || 0) - (a.netBenefitAllCohorts || 0)
  );
  return sorted.slice(0, 3);
}

/* ===========================
   Excel export
   =========================== */

function buildAssumptionsRowsForExcel(scenario) {
  const a = buildAssumptionsForScenario(scenario);
  const rows = [
    ["Parameter", "Value"],
    ["Planning horizon (years)", a.planningHorizonYears],
    ["Discount rate (%)", a.discountRatePercent],
    ["Completion rate (%)", a.completionRatePercent],
    ["Outbreak responses per graduate per year", a.outbreaksPerGraduatePerYear],
    ["Value per outbreak (INR)", a.valuePerOutbreakINR],
    [
      "Non-outbreak value per graduate per year (INR)",
      a.includeNonOutbreak ? a.nonOutbreakValuePerGraduatePerYearINR : 0
    ],
    ["One Health / cross-sector benefit multiplier", a.crossSectorBenefitMultiplier],
    ["Opportunity cost included in economic costs?", a.opportunityCostIncluded ? "Yes" : "No"],
    ["Mentor support cost base per cohort (INR)", a.mentorBaseCostPerCohortINR],
    ["Mentorship intensity multiplier applied", a.mentorshipMultiplier],
    ["Available mentors nationally", a.availableMentorsNational ?? "-"],
    ["Available training sites / hubs", a.availableTrainingSites ?? "-"],
    ["Max cohorts per site per year", a.maxCohortsPerSitePerYear ?? "-"]
  ];
  return rows;
}

function exportScenariosToExcel() {
  if (!window.XLSX) {
    showToast("SheetJS (XLSX) library not loaded.", "error");
    return;
  }
  if (!appState.savedScenarios.length) {
    showToast("No saved scenarios to export.", "warning");
    return;
  }

  const wb = XLSX.utils.book_new();

  const header = [
    "Scenario name",
    "Tier",
    "Career track",
    "Mentorship",
    "Delivery",
    "Cohorts",
    "Trainees per cohort",
    "Cost per trainee per month (INR)",
    "Mentor cost per cohort (INR)",
    "Total mentor cost (all cohorts, INR)",
    "Direct cost total (all cohorts, INR)",
    "Economic cost total (all cohorts, INR)",
    "Endorsement (%)",
    "Perceived programme value total (INR)",
    "Epidemiological benefit total (INR)",
    "Net benefit (INR)",
    "Benefit–cost ratio",
    "Outbreak responses per year (all cohorts)",
    "Capacity status",
    "Notes"
  ];

  const rows = [header];

  appState.savedScenarios.forEach((s) => {
    const { config, costs, epi } = s;
    rows.push([
      config.name,
      config.tier,
      config.career,
      config.mentorship,
      config.delivery,
      config.cohorts,
      config.traineesPerCohort,
      config.costPerTraineePerMonth,
      costs.mentorCostPerCohort,
      costs.totalMentorCostAllCohorts,
      costs.directCostAllCohorts,
      costs.totalEconomicCostAllCohorts,
      s.endorsement * 100,
      s.perceivedProgrammeValueTotal,
      s.epiBenefitAllCohorts,
      s.netBenefitAllCohorts,
      s.benefitCostRatio ?? "",
      epi.outbreakResponsesPerYearPerCohort * config.cohorts,
      s.capacity?.statusText || "",
      config.notes || ""
    ]);
  });

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, sheet, "STEPS scenarios");

  const scenarioForAssumptions =
    appState.currentScenario || appState.savedScenarios[0];
  const assumptionsRows = buildAssumptionsRowsForExcel(scenarioForAssumptions);
  const assumptionsSheet = XLSX.utils.aoa_to_sheet(assumptionsRows);
  XLSX.utils.book_append_sheet(wb, assumptionsSheet, "Assumptions");

  XLSX.writeFile(wb, "STEPS_scenarios.xlsx");
}

/* ===========================
   PDF export (standard + brief)
   =========================== */

function getPdfExportMode() {
  const briefInput = getElement("pdf-export-brief");
  if (briefInput && briefInput.checked) return "brief";
  return "standard";
}

function drawAssumptionsBoxInPdf(doc, x, y, scenario, maxWidth) {
  const a = buildAssumptionsForScenario(scenario);
  doc.setFontSize(11);
  doc.text("Assumptions used", x, y);
  y += 6;

  const lines = [
    `Planning horizon: ${a.planningHorizonYears} years`,
    `Discount rate: ${a.discountRatePercent.toFixed(1)}%`,
    `Completion rate: ${a.completionRatePercent.toFixed(1)}%`,
    `Outbreak responses per graduate per year: ${a.outbreaksPerGraduatePerYear}`,
    `Value per outbreak: ${formatINR(a.valuePerOutbreakINR)}`,
    a.includeNonOutbreak
      ? `Non-outbreak value per graduate per year: ${formatINR(
          a.nonOutbreakValuePerGraduatePerYearINR
        )}`
      : "Non-outbreak benefits: not included (value set to 0)",
    `Opportunity cost included: ${a.opportunityCostIncluded ? "Yes" : "No"}`,
    `Mentor support cost base per cohort: ${formatINR(a.mentorBaseCostPerCohortINR)}`,
    `Mentorship intensity multiplier applied: ${a.mentorshipMultiplier.toFixed(1)}`,
    `One Health / cross-sector benefit multiplier: ${a.crossSectorBenefitMultiplier}`,
    `Available mentors nationally: ${a.availableMentorsNational ?? "-"}`,
    `Available training sites / hubs: ${a.availableTrainingSites ?? "-"}`,
    `Max cohorts per site per year: ${a.maxCohortsPerSitePerYear ?? "-"}`
  ];

  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, maxWidth);
    doc.text(wrapped, x, y);
    y += wrapped.length * 5;
  });

  return y;
}

function getEnablersText() {
  const el = getElement("brief-enablers");
  if (el && el.value.trim()) return el.value.trim();
  return "- Strong NCDC stewardship and coordination across institutions.\n- Existing FETP infrastructure and faculty in key states.\n- Alignment with national pandemic preparedness and IHR obligations.";
}

function getRisksText() {
  const el = getElement("brief-risks");
  if (el && el.value.trim()) return el.value.trim();
  return "- Limited mentor availability and high workload in priority states.\n- Uneven training site capacity and supervision quality.\n- Budget constraints and competing priorities at state level.";
}

function exportScenariosToPdf(mode = "standard") {
  if (!window.jspdf && !window.jsPDF) {
    showToast("jsPDF library not loaded.", "error");
    return;
  }
  const JsPDF = window.jsPDF || window.jspdf.jsPDF;
  if (!JsPDF) {
    showToast("jsPDF is not available.", "error");
    return;
  }

  if (!appState.savedScenarios.length) {
    showToast("No saved scenarios to export.", "warning");
    return;
  }

  const scenariosForBrief = getScenariosForBrief();
  const scenarioForAssumptions =
    appState.currentScenario || scenariosForBrief[0] || appState.savedScenarios[0];

  const doc = new JsPDF({ orientation: "landscape" });

  if (mode === "brief") {
    // Page 1: headline + small comparison table
    doc.setFontSize(14);
    doc.text("STEPS FETP India – Scenario comparison (brief)", 14, 14);

    const topScenario = scenariosForBrief[0];
    if (topScenario) {
      doc.setFontSize(12);
      doc.text(
        `Headline recommendation: Prioritise scenario "${topScenario.config.name}" as the main scale-up option, with alternatives for phased implementation.`,
        14,
        24,
        { maxWidth: 270 }
      );
    }

    const headers = [
      "Scenario",
      "Tier",
      "Mentorship",
      "Cohorts × trainees",
      "Perceived programme value (INR)",
      "Epi benefits (INR)",
      "Economic cost (INR)",
      "Net benefit (INR)",
      "BCR"
    ];

    const startY = 40;
    const colXs = [14, 60, 90, 120, 160, 200, 240, 280, 320];

    doc.setFontSize(10);
    headers.forEach((h, i) => doc.text(h, colXs[i], startY));

    let y = startY + 8;

    scenariosForBrief.forEach((s) => {
      const { config, costs } = s;
      doc.text(config.name.slice(0, 20), colXs[0], y);
      doc.text(config.tier, colXs[1], y);
      doc.text(config.mentorship, colXs[2], y);
      doc.text(
        `${config.cohorts} × ${config.traineesPerCohort}`,
        colXs[3],
        y
      );
      doc.text(formatINR(s.perceivedProgrammeValueTotal), colXs[4], y);
      doc.text(formatINR(s.epiBenefitAllCohorts), colXs[5], y);
      doc.text(formatINR(costs.totalEconomicCostAllCohorts), colXs[6], y);
      doc.text(formatINR(s.netBenefitAllCohorts), colXs[7], y);
      doc.text(
        s.benefitCostRatio ? s.benefitCostRatio.toFixed(2) : "-",
        colXs[8],
        y
      );
      y += 7;
    });

    // Page 2: assumptions, feasibility, enablers & risks
    doc.addPage("landscape");
    doc.setFontSize(14);
    doc.text("Assumptions, feasibility, enablers and risks", 14, 14);

    let y2 = 24;
    y2 = drawAssumptionsBoxInPdf(doc, 14, y2, scenarioForAssumptions, 120);

    if (scenarioForAssumptions.capacity) {
      const c = scenarioForAssumptions.capacity;
      doc.setFontSize(12);
      doc.text("Capacity and feasibility summary", 150, 24);
      doc.setFontSize(10);
      const capLines = [
        `Status: ${c.statusText}`,
        `Mentors required (total): ${c.totalMentorsRequired} (approx. ${c.mentorsPerCohort} per cohort, capacity ${c.capacityPerMentor} fellows per mentor)`,
        c.availableMentors
          ? `Available mentors nationally: ${c.availableMentors} (shortfall: ${
              c.mentorShortfall > 0 ? c.mentorShortfall : 0
            })`
          : "Available mentors nationally: not specified",
        c.totalCohortCapacity
          ? `Training site capacity: ${c.totalCohortCapacity} cohorts/year (shortfall: ${
              c.cohortsShortfall > 0 ? c.cohortsShortfall : 0
            })`
          : "Training site capacity: not specified",
        `Note: ${c.gapNote}`
      ];
      let yCap = 32;
      capLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, 130);
        doc.text(wrapped, 150, yCap);
        yCap += wrapped.length * 5;
      });
    }

    const enablers = getEnablersText();
    const risks = getRisksText();

    let yER = Math.max(y2 + 6, 90);
    doc.setFontSize(12);
    doc.text("Implementation enablers", 14, yER);
    doc.setFontSize(10);
    yER += 4;
    const enLines = enablers.split("\n");
    enLines.forEach((l) => {
      const w = doc.splitTextToSize(l.startsWith("-") ? l : `- ${l}`, 120);
      doc.text(w, 14, yER);
      yER += w.length * 5;
    });

    yER += 6;
    doc.setFontSize(12);
    doc.text("Key risks and mitigation points", 14, yER);
    doc.setFontSize(10);
    yER += 4;
    const riskLines = risks.split("\n");
    riskLines.forEach((l) => {
      const w = doc.splitTextToSize(l.startsWith("-") ? l : `- ${l}`, 120);
      doc.text(w, 14, yER);
      yER += w.length * 5;
    });
  } else {
    // Standard PDF: detailed per-scenario summary
    doc.setFontSize(14);
    doc.text("STEPS FETP India – Saved scenario summary", 14, 14);

    let y = 24;
    y = drawAssumptionsBoxInPdf(doc, 14, y, scenarioForAssumptions, 260);
    y += 6;

    appState.savedScenarios.forEach((s, index) => {
      if (y > 190) {
        doc.addPage("landscape");
        y = 20;
      }
      const { config, costs, epi } = s;

      doc.setFontSize(12);
      doc.text(
        `Scenario ${index + 1}: ${config.name}`,
        14,
        y
      );
      y += 6;

      doc.setFontSize(10);
      const lines = [
        `Tier: ${config.tier}, career track: ${config.career}, mentorship: ${config.mentorship}, delivery: ${config.delivery}`,
        `Cohorts: ${config.cohorts}, trainees per cohort: ${config.traineesPerCohort}, cost per trainee per month: ${formatINR(
          config.costPerTraineePerMonth
        )}`,
        `Endorsement probability: ${(s.endorsement * 100).toFixed(
          1
        )}% (from preference model)`,
        `Perceived programme value (total): ${formatINR(
          s.perceivedProgrammeValueTotal
        )} (implicit valuation from discrete choice experiment)`,
        `Direct cost per cohort (programme + mentor, excl. opp. cost): ${formatINR(
          costs.directCostPerCohort
        )}`,
        `Economic cost per cohort (incl. opp. cost if toggle on): ${formatINR(
          costs.totalEconomicCostPerCohort
        )}`,
        `Economic cost total (all cohorts): ${formatINR(
          costs.totalEconomicCostAllCohorts
        )}`,
        `Epidemiological benefits per cohort (PV, including One Health multiplier): ${formatINR(
          epi.epiBenefitPerCohort
        )}`,
        `Epidemiological benefits total (all cohorts): ${formatINR(
          s.epiBenefitAllCohorts
        )}`,
        `Net benefit (epi – economic cost): ${formatINR(s.netBenefitAllCohorts)}`,
        `Benefit–cost ratio (epi / economic cost): ${
          s.benefitCostRatio ? s.benefitCostRatio.toFixed(2) : "-"
        }`,
        `Outbreak responses per year (all cohorts): ${formatNumber(
          epi.outbreakResponsesPerYearPerCohort * config.cohorts,
          1
        )}`,
        `Capacity status: ${s.capacity?.statusText || "not specified"}`,
        config.notes ? `Notes: ${config.notes}` : ""
      ].filter(Boolean);

      lines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, 270);
        doc.text(wrapped, 14, y);
        y += wrapped.length * 5;
      });

      y += 6;
    });
  }

  doc.save(
    mode === "brief" ? "STEPS_scenarios_brief.pdf" : "STEPS_scenarios.pdf"
  );
}

/* ===========================
   Copilot & ChatGPT briefing tab
   =========================== */

function buildStructuredExportPayload() {
  const scenarios = getScenariosForBrief();
  const scenarioForAssumptions =
    appState.currentScenario || scenarios[0] || appState.savedScenarios[0];

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      tool: "STEPS – FETP India decision aid"
    },
    currentScenarioId: appState.currentScenario?.id || null,
    scenarios: scenarios.map((s) => ({
      id: s.id,
      name: s.config.name,
      tier: s.config.tier,
      career: s.config.career,
      mentorship: s.config.mentorship,
      delivery: s.config.delivery,
      cohorts: s.config.cohorts,
      traineesPerCohort: s.config.traineesPerCohort,
      opportunityCostIncluded: s.config.opportunityCostIncluded,
      costPerTraineePerMonthINR: s.config.costPerTraineePerMonth,
      mentorCostPerCohortINR: s.costs.mentorCostPerCohort,
      totalMentorCostAllCohortsINR: s.costs.totalMentorCostAllCohorts,
      directCostAllCohortsINR: s.costs.directCostAllCohorts,
      economicCostAllCohortsINR: s.costs.totalEconomicCostAllCohorts,
      endorsementProbability: s.endorsement,
      perceivedProgrammeValuePerTraineePerMonthINR:
        s.perceivedProgrammeValuePerTraineePerMonth,
      perceivedProgrammeValueTotalINR: s.perceivedProgrammeValueTotal,
      epiBenefitAllCohortsINR: s.epiBenefitAllCohorts,
      netBenefitAllCohortsINR: s.netBenefitAllCohorts,
      benefitCostRatio: s.benefitCostRatio,
      outbreakResponsesPerYearAllCohorts:
        s.epi.outbreakResponsesPerYearPerCohort * s.config.cohorts,
      capacity: s.capacity
    })),
    assumptions: buildAssumptionsForScenario(scenarioForAssumptions)
  };

  return JSON.stringify(payload, null, 2);
}

function buildPromptForAssistant(kind) {
  const payloadJSON = buildStructuredExportPayload();
  const base = COPILOT_INTERPRETATION_PROMPT.trim();
  const extra =
    kind === "chatgpt"
      ? CHATGPT_INTERPRETATION_ADDITION.trim()
      : COPILOT_INTERPRETATION_ADDITION.trim();

  const instructions =
    `${base}\n\n${extra}\n\nStructured STEPS output (JSON):\n\n` + payloadJSON;

  return instructions;
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast("Prompt copied to clipboard.", "success"),
      () =>
        showToast(
          "Unable to copy to clipboard. Please copy manually.",
          "warning"
        )
    );
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showToast("Prompt copied to clipboard.", "success");
    } catch (e) {
      showToast(
        "Unable to copy to clipboard. Please copy manually.",
        "warning"
      );
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

function downloadPromptsAsTxt() {
  const copilotPrompt = buildPromptForAssistant("copilot");
  const chatgptPrompt = buildPromptForAssistant("chatgpt");

  const content =
    "=== Copilot prompt ===\n\n" +
    copilotPrompt +
    "\n\n=== ChatGPT prompt ===\n\n" +
    chatgptPrompt +
    "\n";
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "STEPS_prompts.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initCopilotTab() {
  const copilotBtn = getElement("copilot-open-and-copy-btn");
  const chatgptBtn = getElement("chatgpt-copy-btn");
  const downloadTxtBtn = getElement("copilot-download-txt");
  const statusPill = getElement("copilot-status-pill");

  const updateStatus = (kind) => {
    if (!statusPill) return;
    statusPill.textContent =
      kind === "chatgpt"
        ? "Prompt ready for ChatGPT"
        : "Prompt ready for Copilot";
  };

  if (copilotBtn) {
    copilotBtn.addEventListener("click", () => {
      const prompt = buildPromptForAssistant("copilot");
      copyToClipboard(prompt);
      updateStatus("copilot");
      window.open("https://copilot.microsoft.com", "_blank");
    });
  }

  if (chatgptBtn) {
    chatgptBtn.addEventListener("click", () => {
      const prompt = buildPromptForAssistant("chatgpt");
      copyToClipboard(prompt);
      updateStatus("chatgpt");
      window.open("https://chatgpt.com", "_blank");
    });
  }

  if (downloadTxtBtn) {
    downloadTxtBtn.addEventListener("click", () => {
      downloadPromptsAsTxt();
      updateStatus("copilot");
    });
  }
}

/* ===========================
   Advanced settings (updated IDs + new fields)
   =========================== */

function initAdvancedSettings() {
  const valueGradInput = getElement("adv-non-outbreak-value-per-graduate");
  const valueOutbreakInput = getElement("adv-value-per-outbreak");
  const completionInput = getElement("adv-completion-rate");
  const outbreaksPerGradInput = getElement("adv-outbreaks-per-graduate");
  const horizonInput = getElementFromCandidates([
    "adv-planning-years",
    "adv-planning-horizon"
  ]);
  const discInput = getElement("adv-epi-discount-rate");
  const usdRateInput = getElement("adv-usd-rate");
  const mentorBaseInput = getElement("adv-mentor-base-cost-per-cohort");
  const availMentorsInput = getElement("adv-available-mentors-national");
  const availSitesInput = getElement("adv-available-training-sites");
  const maxCohortsPerSiteInput = getElement("adv-max-cohorts-per-site");
  const crossSectorInput = getElement("adv-cross-sector-multiplier");
  const applyBtn = getElement("adv-apply-settings");
  const resetBtn = getElement("adv-reset-settings");

  if (valueGradInput)
    valueGradInput.value = String(
      appState.epiSettings.tiers.frontline.valuePerGraduate || 0
    );
  if (valueOutbreakInput)
    valueOutbreakInput.value = String(
      appState.epiSettings.tiers.frontline.valuePerOutbreak || 4000000
    );
  if (completionInput)
    completionInput.value = String(
      appState.epiSettings.tiers.frontline.completionRate * 100
    );
  if (outbreaksPerGradInput)
    outbreaksPerGradInput.value = String(
      appState.epiSettings.tiers.frontline.outbreaksPerGraduatePerYear
    );
  if (horizonInput)
    horizonInput.value = String(appState.epiSettings.general.planningHorizonYears);
  if (discInput)
    discInput.value = String(appState.epiSettings.general.epiDiscountRate * 100);
  if (usdRateInput)
    usdRateInput.value = String(appState.epiSettings.general.inrToUsdRate);
  if (mentorBaseInput)
    mentorBaseInput.value = String(
      appState.epiSettings.general.mentorBaseCostPerCohort || 2000000
    );
  if (availMentorsInput)
    availMentorsInput.value = String(
      appState.epiSettings.general.availableMentorsNational || 200
    );
  if (availSitesInput)
    availSitesInput.value = String(
      appState.epiSettings.general.availableTrainingSites || 0
    );
  if (maxCohortsPerSiteInput)
    maxCohortsPerSiteInput.value = String(
      appState.epiSettings.general.maxCohortsPerSitePerYear || 0
    );
  if (crossSectorInput)
    crossSectorInput.value = String(
      appState.epiSettings.general.crossSectorBenefitMultiplier || 1.0
    );

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      const vGrad = Number(valueGradInput?.value);
      const vOut = Number(valueOutbreakInput?.value);
      const compRateRaw = Number(completionInput?.value);
      const compRate =
        isFinite(compRateRaw) && compRateRaw > 0
          ? clamp(compRateRaw / 100, 0, 1)
          : appState.epiSettings.tiers.frontline.completionRate;
      const outPerGrad = Number(outbreaksPerGradInput?.value);
      const horizon = Number(horizonInput?.value);
      const discRateRaw = Number(discInput?.value);
      const discRate =
        isFinite(discRateRaw) && discRateRaw >= 0
          ? clamp(discRateRaw / 100, 0, 1)
          : appState.epiSettings.general.epiDiscountRate;
      const usdRate = Number(usdRateInput?.value);

      const mentorBase = Number(mentorBaseInput?.value);
      const availMentors = Number(availMentorsInput?.value);
      const availSites = Number(availSitesInput?.value);
      const maxCohortSite = Number(maxCohortsPerSiteInput?.value);
      const crossSector = Number(crossSectorInput?.value);

      ["frontline", "intermediate", "advanced"].forEach((tier) => {
        appState.epiSettings.tiers[tier].valuePerGraduate = isFinite(vGrad)
          ? vGrad
          : appState.epiSettings.tiers[tier].valuePerGraduate;
        if (isFinite(vOut) && vOut > 0)
          appState.epiSettings.tiers[tier].valuePerOutbreak = vOut;
        appState.epiSettings.tiers[tier].completionRate = compRate;
        if (isFinite(outPerGrad) && outPerGrad >= 0)
          appState.epiSettings.tiers[tier].outbreaksPerGraduatePerYear = outPerGrad;
      });

      if (isFinite(horizon) && horizon > 0)
        appState.epiSettings.general.planningHorizonYears = horizon;
      appState.epiSettings.general.epiDiscountRate = discRate;

      if (isFinite(usdRate) && usdRate > 0) {
        appState.epiSettings.general.inrToUsdRate = usdRate;
        appState.usdRate = usdRate;
      }

      if (isFinite(mentorBase) && mentorBase >= 0)
        appState.epiSettings.general.mentorBaseCostPerCohort = mentorBase;
      if (isFinite(availMentors) && availMentors >= 0)
        appState.epiSettings.general.availableMentorsNational = availMentors;
      if (isFinite(availSites) && availSites >= 0)
        appState.epiSettings.general.availableTrainingSites = availSites;
      if (isFinite(maxCohortSite) && maxCohortSite >= 0)
        appState.epiSettings.general.maxCohortsPerSitePerYear = maxCohortSite;
      if (isFinite(crossSector) && crossSector > 0)
        appState.epiSettings.general.crossSectorBenefitMultiplier = crossSector;

      showToast("Advanced settings and assumptions updated.", "success");
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      appState.epiSettings = JSON.parse(JSON.stringify(DEFAULT_EPI_SETTINGS));
      appState.usdRate = DEFAULT_EPI_SETTINGS.general.inrToUsdRate;

      if (valueGradInput) valueGradInput.value = "0";
      if (valueOutbreakInput) valueOutbreakInput.value = "4000000";
      if (completionInput) completionInput.value = "90";
      if (outbreaksPerGradInput) outbreaksPerGradInput.value = "0.5";
      if (horizonInput)
        horizonInput.value = String(
          DEFAULT_EPI_SETTINGS.general.planningHorizonYears
        );
      if (discInput)
        discInput.value = String(
          DEFAULT_EPI_SETTINGS.general.epiDiscountRate * 100
        );
      if (usdRateInput)
        usdRateInput.value = String(DEFAULT_EPI_SETTINGS.general.inrToUsdRate);
      if (mentorBaseInput)
        mentorBaseInput.value = String(
          DEFAULT_EPI_SETTINGS.general.mentorBaseCostPerCohort
        );
      if (availMentorsInput)
        availMentorsInput.value = String(
          DEFAULT_EPI_SETTINGS.general.availableMentorsNational
        );
      if (availSitesInput)
        availSitesInput.value = String(
          DEFAULT_EPI_SETTINGS.general.availableTrainingSites
        );
      if (maxCohortsPerSiteInput)
        maxCohortsPerSiteInput.value = String(
          DEFAULT_EPI_SETTINGS.general.maxCohortsPerSitePerYear
        );
      if (crossSectorInput)
        crossSectorInput.value = String(
          DEFAULT_EPI_SETTINGS.general.crossSectorBenefitMultiplier
        );

      showToast("Advanced settings reset to default values.", "success");
    });
  }
}

/* ===========================
   Cost slider label & WTP relabelling
   =========================== */

function updateCostSliderLabel() {
  const slider = getElement("cost-slider");
  const label = getElement("cost-slider-value");
  if (!slider || !label) return;
  const val = Number(slider.value) || 0;
  label.textContent = formatINR(val);
}

/* ===========================
   Main refresh
   =========================== */

function refreshAllOutputs() {
  const scenario = computeScenario();
  updateResultsTab(scenario);
  updateCostingTab(scenario);
  updateCapacityTab(scenario);
  updateNationalSimulationTab(scenario);
}

/* ===========================
   Event handlers
   =========================== */

function initEventHandlers() {
  const updateBtn = getElement("update-results");
  if (updateBtn) {
    updateBtn.addEventListener("click", () => {
      refreshAllOutputs();
    });
  }

  const saveBtn = getElement("save-scenario");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      saveCurrentScenario();
    });
  }

  const exportExcelBtn = getElement("export-excel");
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => {
      exportScenariosToExcel();
    });
  }

  const exportPdfBtn = getElement("export-pdf");
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
      const mode = getPdfExportMode();
      exportScenariosToPdf(mode);
    });
  }

  const costSlider = getElement("cost-slider");
  if (costSlider) {
    costSlider.addEventListener("input", updateCostSliderLabel);
  }
}

/* ===========================
   Init
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  initAdvancedSettings();
  initCopilotTab();
  initEventHandlers();
  updateCostSliderLabel();

  // Initial compute if desired
  if (getElement("update-results")) {
    refreshAllOutputs();
  }
});
