/* ===================================================
   STEPS – FETP India Decision Aid (Upgraded)
   - Uses original mixed logit coefficients
   - Adds mentor support cost and capacity checks
   - Adds cross-sector multiplier and richer exports
   - Restores outbreak response capacity attribute
   =================================================== */

/* ===========================
   Global model coefficients
   (from original MXL model)
   =========================== */

const MXL_COEFS = {
  ascProgram: 0.168,
  ascOptOut: -0.601,
  tier: {
    frontline: 0.0,
    intermediate: 0.22,
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
    high: 0.64
  },
  delivery: {
    blended: 0.0,
    inperson: -0.232,
    online: -1.073
  },
  response: {
    30: 0.0,
    15: 0.546,
    7: 0.61
  },
  costPerThousand: -0.005
};

/* ===========================
   Cost templates (combined)
   =========================== */

const COST_TEMPLATES = {
  frontline: {
    combined: {
      id: "frontline_combined",
      label: "Frontline combined template (all institutions)",
      description:
        "Combined frontline cost structure across all institutions using harmonised components and indirect costs including opportunity cost.",
      oppRate: 1.09,
      components: [
        { id: "staff_core", label: "In country programme staff salaries and benefits", directShare: 0.214 },
        { id: "office_equipment", label: "Office equipment for staff and faculty", directShare: 0.004 },
        { id: "office_software", label: "Office software for staff and faculty", directShare: 0.0004 },
        { id: "rent_utilities", label: "Rent and utilities for staff and faculty", directShare: 0.024 },
        { id: "training_materials", label: "Training materials and printing", directShare: 0.0006 },
        { id: "workshops", label: "Workshops and seminars", directShare: 0.107 },
        { id: "travel_in_country", label: "In country travel for faculty, mentors and trainees", directShare: 0.65 }
      ]
    }
  },
  intermediate: {
    combined: {
      id: "intermediate_combined",
      label: "Intermediate combined template (all institutions)",
      description:
        "Combined intermediate cost structure across all institutions using harmonised components and indirect costs including opportunity cost.",
      oppRate: 0.61,
      components: [
        { id: "staff_core", label: "In country programme staff salaries and benefits", directShare: 0.192 },
        { id: "office_equipment", label: "Office equipment for staff and faculty", directShare: 0.0066 },
        { id: "office_software", label: "Office software for staff and faculty", directShare: 0.0004 },
        { id: "rent_utilities", label: "Rent and utilities for staff and faculty", directShare: 0.031 },
        { id: "training_materials", label: "Training materials and printing", directShare: 0.0007 },
        { id: "workshops", label: "Workshops and seminars", directShare: 0.103 },
        { id: "travel_in_country", label: "In country travel for faculty, mentors and trainees", directShare: 0.509 },
        { id: "travel_international", label: "International travel for faculty, mentors and trainees", directShare: 0.157 },
        { id: "other_direct", label: "Other direct programme expenses", directShare: 0.0003 }
      ]
    }
  },
  advanced: {
    combined: {
      id: "advanced_combined",
      label: "Advanced combined template (all institutions)",
      description:
        "Combined advanced cost structure across all institutions using harmonised components and indirect costs including opportunity cost.",
      oppRate: 0.3,
      components: [
        { id: "staff_core", label: "In country programme staff salaries and benefits", directShare: 0.165 },
        { id: "office_equipment", label: "Office equipment for staff and faculty", directShare: 0.0139 },
        { id: "office_software", label: "Office software for staff and faculty", directShare: 0.0184 },
        { id: "rent_utilities", label: "Rent and utilities for staff and faculty", directShare: 0.0255 },
        { id: "trainee_allowances", label: "Trainee allowances and scholarships", directShare: 0.0865 },
        { id: "trainee_equipment", label: "Trainee equipment such as laptops and internet", directShare: 0.0035 },
        { id: "trainee_software", label: "Trainee software licences", directShare: 0.0017 },
        { id: "training_materials", label: "Training materials and printing", directShare: 0.0024 },
        { id: "workshops", label: "Workshops and seminars", directShare: 0.0188 },
        { id: "travel_in_country", label: "In country travel for faculty, mentors and trainees", directShare: 0.372 },
        { id: "travel_international", label: "International travel for faculty, mentors and trainees", directShare: 0.288 },
        { id: "other_direct", label: "Other direct programme expenses", directShare: 0.0043 }
      ]
    }
  }
};

/* ===========================
   Tier duration in months
   =========================== */

const TIER_MONTHS = {
  frontline: 3,
  intermediate: 12,
  advanced: 24
};

/* ===========================
   Mentor capacity by intensity
   =========================== */

const MENTOR_CAPACITY = {
  low: 5,
  medium: 3.5,
  high: 2
};

/* ===========================
   Global app state
   =========================== */

const appState = {
  currentConfig: null,
  currentScenario: null,
  savedScenarios: [],
  charts: {
    uptake: null,
    sensitivity: null
  },
  assumptionsText: "",
  briefMode: "standard"
};

/* ===========================
   Utilities
   =========================== */

function clamp(x, min, max) {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return "–";
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

function formatCurrencyINR(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return "–";
  return "INR " + formatNumber(value, decimals);
}

function getInputNumber(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = Number(el.value);
  return isNaN(v) ? fallback : v;
}

function getCheckbox(id) {
  const el = document.getElementById(id);
  return !!(el && el.checked);
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast";
  toast.classList.add(`toast-${type}`, "toast-visible");
  setTimeout(() => {
    toast.classList.remove("toast-visible");
  }, 2800);
}

/* ===========================
   Tabs
   =========================== */

function initTabs() {
  const links = Array.from(document.querySelectorAll(".tab-link[data-tab]"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));
  if (!links.length || !panels.length) return;

  function activateTab(id) {
    panels.forEach((p) => {
      p.classList.toggle("active", p.id === id);
    });
    links.forEach((l) => {
      l.classList.toggle("active", l.dataset.tab === id);
    });
  }

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.dataset.tab;
      activateTab(id);
    });
  });

  // Ensure the first tab is active
  activateTab("intro-tab");
}

/* ===========================
   Tooltip system
   =========================== */

const TOOLTIP_CONTENT = {
  planning_horizon: {
    title: "Planning horizon",
    body: "Number of years over which epidemiological benefits are counted and discounted."
  },
  discount_rate: {
    title: "Discount rate",
    body: "Annual discount rate applied to future epidemiological benefits when computing present value."
  },
  non_outbreak_value: {
    title: "Non-outbreak value",
    body: "Indicative value of contributions each graduate makes outside formal outbreak responses (per year)."
  },
  value_per_outbreak: {
    title: "Value per outbreak response",
    body: "Estimated monetary value of one outbreak response coordinated or supported by FETP graduates."
  },
  completion_rate: {
    title: "Completion rate",
    body: "Proportion of trainees who successfully complete the programme and become graduates."
  },
  outbreaks_per_grad: {
    title: "Outbreak responses per graduate",
    body: "Average number of outbreak responses each graduate contributes to per year."
  },
  cross_sector_multiplier: {
    title: "Cross-sector multiplier",
    body: "Multiplier applied to epidemiological benefits to reflect additional cross-sector (One Health) gains."
  },
  available_mentors: {
    title: "Available mentors",
    body: "Approximate number of mentors who can support FETP trainees nationally."
  },
  available_sites: {
    title: "Training sites / hubs",
    body: "Number of institutions or hubs that can host FETP cohorts."
  },
  max_cohorts_per_site: {
    title: "Max cohorts per site",
    body: "Maximum cohorts per site per year that can be delivered with quality."
  },
  opp_cost_toggle: {
    title: "Opportunity cost toggle",
    body: "When on, economic cost includes the opportunity cost of trainee time using tier-specific cost templates."
  },
  tier: {
    title: "Programme tier",
    body: "Frontline, Intermediate or Advanced FETP tier, as defined in the preference study and cost templates."
  },
  career: {
    title: "Career incentive",
    body: "Main career-related incentive offered to trainees (certificate, university qualification, or government career pathway)."
  },
  mentorship: {
    title: "Mentorship intensity",
    body: "Number of trainees each mentor is expected to support: low (≈5), medium (≈3–4) or high (2)."
  },
  delivery: {
    title: "Delivery mode",
    body: "Programme delivery mode (in-person, blended or fully online) consistent with the preference study attributes."
  },
  response_capacity: {
    title: "Outbreak response capacity",
    body: "Attribute describing the expected time to respond to outbreaks (30, 15 or 7 days) as in the preference study."
  },
  cost_per_trainee: {
    title: "Cost per trainee per month",
    body: "Total direct cost per trainee per month in Indian rupees, within the range used in the preference study."
  },
  trainees: {
    title: "Trainees per cohort",
    body: "Number of trainees enrolled in each FETP cohort for the selected tier."
  },
  cohorts: {
    title: "Number of cohorts",
    body: "Total number of cohorts planned across India within the planning period."
  },
  planning_horizon_config: {
    title: "Planning horizon for scenario",
    body: "Planning horizon applied for this scenario; should normally match the horizon set in the Settings tab."
  },
  opp_cost_config: {
    title: "Opportunity cost configuration",
    body: "Scenario-level toggle for including opportunity cost; used together with the global toggle in Settings."
  },
  endorsement_rate: {
    title: "Endorsement",
    body: "Predicted percentage of stakeholders who would support the FETP configuration over the opt-out."
  },
  optout_rate: {
    title: "Opt-out",
    body: "Predicted percentage preferring not to invest in this configuration given the choice."
  },
  value_per_trainee: {
    title: "Perceived programme value per trainee",
    body: "Implicit valuation per trainee per month derived from the mixed logit preference study."
  },
  value_per_cohort: {
    title: "Perceived programme value per cohort",
    body: "Perceived programme value aggregated across all trainees and months in one cohort."
  },
  direct_cost: {
    title: "Direct cost",
    body: "Programme plus mentor support costs per cohort, excluding the opportunity cost of trainee time."
  },
  economic_cost: {
    title: "Economic cost",
    body: "Direct cost plus opportunity cost of trainee time (if enabled)."
  },
  epi_benefit: {
    title: "Epidemiological benefit",
    body: "Present value of outbreak and non-outbreak benefits per cohort, including any cross-sector multiplier."
  },
  bcr: {
    title: "Benefit–cost ratio",
    body: "Ratio of epidemiological benefit to economic cost per cohort."
  },
  net_benefit: {
    title: "Net benefit",
    body: "Epidemiological benefit minus economic cost per cohort."
  },
  mentor_cost: {
    title: "Mentor support cost",
    body: "Cost per cohort for mentor support, scaled by mentorship intensity via fixed multipliers."
  },
  mentor_cost_base: {
    title: "Base mentor cost per cohort",
    body: "Base mentor support cost per cohort in Indian rupees before applying mentorship intensity multipliers."
  },
  required_mentors: {
    title: "Required mentors",
    body: "Number of mentors needed nationally for the current configuration given mentorship intensity and cohort size."
  },
  mentor_shortfall: {
    title: "Mentor shortfall",
    body: "Difference between required mentors and available mentors; zero or negative means sufficient mentors."
  },
  site_capacity: {
    title: "Site capacity",
    body: "Comparison between planned cohorts and maximum cohorts deliverable given sites and cohorts-per-site assumptions."
  },
  total_value_all: {
    title: "Total perceived value",
    body: "Perceived programme value across all cohorts, derived from the preference study."
  },
  value_outbreak_component: {
    title: "Outbreak-related component",
    body: "Illustrative component of perceived value linked to outbreak performance (fixed share of total perceived value)."
  }
};

function initTooltips() {
  const tooltip = document.getElementById("global-tooltip");
  if (!tooltip) return;

  const titleEl = tooltip.querySelector(".tooltip-title");
  const bodyEl = tooltip.querySelector(".tooltip-body");

  function showTooltip(target, key) {
    const def = TOOLTIP_CONTENT[key];
    if (!def) return;
    titleEl.textContent = def.title;
    bodyEl.textContent = def.body;
    const rect = target.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.setAttribute("aria-hidden", "false");
    tooltip.classList.add("visible");
  }

  function hideTooltip() {
    tooltip.classList.remove("visible");
    tooltip.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".info-icon");
    if (!btn) {
      hideTooltip();
      return;
    }
    const key = btn.dataset.tooltipKey;
    if (!key) return;
    if (tooltip.classList.contains("visible")) {
      hideTooltip();
      setTimeout(() => showTooltip(btn, key), 50);
    } else {
      showTooltip(btn, key);
    }
  });

  window.addEventListener("scroll", () => {
    if (tooltip.classList.contains("visible")) {
      tooltip.classList.remove("visible");
      tooltip.setAttribute("aria-hidden", "true");
    }
  });
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
function mentorshipEffect(m) {
  return MXL_COEFS.mentorship[m] || 0;
}
function deliveryEffect(d) {
  return MXL_COEFS.delivery[d] || 0;
}
function responseEffect(r) {
  return MXL_COEFS.response[r] || 0;
}

function computeEndorsementAndValue(config) {
  const costThousands = config.costPerTraineePerMonth / 1000;

  const utilProgram =
    MXL_COEFS.ascProgram +
    tierEffect(config.tier) +
    careerEffect(config.career) +
    mentorshipEffect(config.mentorship) +
    deliveryEffect(config.delivery) +
    responseEffect(config.response) +
    MXL_COEFS.costPerThousand * costThousands;

  const utilOptOut = MXL_COEFS.ascOptOut;

  const maxU = Math.max(utilProgram, utilOptOut);
  const expProg = Math.exp(utilProgram - maxU);
  const expOpt = Math.exp(utilOptOut - maxU);
  const denom = expProg + expOpt;

  const endorseProb = denom > 0 ? expProg / denom : 0.5;
  const optOutProb = 1 - endorseProb;

  const nonCostUtility =
    MXL_COEFS.ascProgram +
    tierEffect(config.tier) +
    careerEffect(config.career) +
    mentorshipEffect(config.mentorship) +
    deliveryEffect(config.delivery) +
    responseEffect(config.response);

  const wtpPerTraineePerMonth = (nonCostUtility / Math.abs(MXL_COEFS.costPerThousand)) * 1000;

  return {
    endorseRate: clamp(endorseProb * 100, 0, 100),
    optOutRate: clamp(optOutProb * 100, 0, 100),
    wtpPerTraineePerMonth
  };
}

/* ===========================
   Epidemiological benefits
   =========================== */

function presentValueFactor(discountRate, years) {
  if (years <= 0) return 0;
  if (discountRate === 0) return years;
  const r = discountRate;
  return (1 - Math.pow(1 + r, -years)) / r;
}

function computeEpidemiological(config, endorseRate, settings) {
  const completionRate = settings.completionRate;
  const outbreaksPerGrad = settings.outbreaksPerGraduate;
  const valuePerOutbreak = settings.valuePerOutbreak;
  const nonOutbreakValuePerGradPerYear = settings.nonOutbreakValuePerGradPerYear;
  const planningYears = settings.planningHorizonYears;
  const discountRate = settings.discountRate;
  const crossSectorMultiplier = settings.crossSectorMultiplier;

  const pvFactor = presentValueFactor(discountRate, planningYears);
  const endorseFactor = endorseRate / 100;

  const months = TIER_MONTHS[config.tier] || 12;
  const enrolledPerCohort = config.traineesPerCohort;
  const completedPerCohort = enrolledPerCohort * completionRate;
  const graduatesEffective = completedPerCohort * endorseFactor;
  const graduatesAllCohorts = graduatesEffective * config.cohorts;

  const outbreaksPerYearPerCohort = graduatesEffective * outbreaksPerGrad;
  const outbreaksPerYearNational = outbreaksPerYearPerCohort * config.cohorts;

  const outbreakAnnualBenefitPerCohort = outbreaksPerYearPerCohort * valuePerOutbreak;
  const outbreakPVPerCohort = outbreakAnnualBenefitPerCohort * pvFactor;

  const gradAnnualBenefitPerCohort = graduatesEffective * nonOutbreakValuePerGradPerYear;
  const gradPVPerCohort = gradAnnualBenefitPerCohort * pvFactor;

  const totalEpiBenefitPerCohort = (outbreakPVPerCohort + gradPVPerCohort) * crossSectorMultiplier;

  return {
    months,
    graduatesPerCohort: graduatesEffective,
    graduatesAllCohorts,
    outbreaksPerYearPerCohort,
    outbreaksPerYearNational,
    graduateBenefitPerCohort: gradPVPerCohort,
    outbreakPVPerCohort,
    epiBenefitPerCohort: totalEpiBenefitPerCohort,
    planningYears,
    discountRate,
    crossSectorMultiplier
  };
}

/* ===========================
   Costing and mentor support
   =========================== */

function computeCosts(config, mentorCostBase, includeOppCostGlobal) {
  const months = TIER_MONTHS[config.tier] || 12;
  const trainees = config.traineesPerCohort;
  const cohorts = config.cohorts;
  const programmeCostPerCohort = config.costPerTraineePerMonth * months * trainees;

  const template = (COST_TEMPLATES[config.tier] && COST_TEMPLATES[config.tier].combined) || null;
  const oppRate = template ? template.oppRate : 0;

  const includeOpp = includeOppCostGlobal && config.opportunityCostIncluded;
  const opportunityCostPerCohort = includeOpp ? programmeCostPerCohort * oppRate : 0;

  const mentorshipMultiplier =
    config.mentorship === "high" ? 1.7 : config.mentorship === "medium" ? 1.3 : 1.0;
  const mentorCostPerCohort = mentorCostBase * mentorshipMultiplier;

  const directCostPerCohort = programmeCostPerCohort + mentorCostPerCohort;
  const totalEconomicCostPerCohort = directCostPerCohort + opportunityCostPerCohort;

  return {
    template,
    months,
    programmeCostPerCohort,
    mentorCostPerCohort,
    directCostPerCohort,
    opportunityCostPerCohort,
    totalEconomicCostPerCohort,
    mentorshipMultiplier
  };
}

/* ===========================
   Capacity & feasibility
   =========================== */

function computeCapacity(config, settings) {
  const mentorCap = MENTOR_CAPACITY[config.mentorship] || 5;
  const mentorsPerCohort = Math.ceil(config.traineesPerCohort / mentorCap);
  const requiredMentors = mentorsPerCohort * config.cohorts;

  const availableMentors = settings.availableMentors;
  const mentorShortfall = Math.max(0, requiredMentors - availableMentors);

  const maxCohortsBySites = settings.availableSites * settings.maxCohortsPerSite;
  const cohShortfall = Math.max(0, config.cohorts - maxCohortsBySites);

  let capacityStatus = "Within current capacity";
  if (mentorShortfall > 0 || cohShortfall > 0) {
    capacityStatus = "Requires capacity expansion";
  }

  return {
    mentorsPerCohort,
    requiredMentors,
    mentorShortfall,
    maxCohortsBySites,
    cohortShortfall: cohShortfall,
    capacityStatus
  };
}

/* ===========================
   Scenario computation
   =========================== */

function readSettings() {
  const planningHorizonYears = getInputNumber("planning-horizon", 5);
  const discountRate = getInputNumber("discount-rate", 3) / 100;
  const nonOutbreakValuePerGradPerYear = getInputNumber("non-outbreak-value", 0);
  const valuePerOutbreak = getInputNumber("value-per-outbreak", 2000000);
  const completionRate = getInputNumber("completion-rate", 90) / 100;
  const outbreaksPerGraduate = getInputNumber("outbreaks-per-grad", 0.2);
  const crossSectorMultiplier = getInputNumber("cross-sector-multiplier", 1);
  const availableMentors = getInputNumber("available-mentors", 200);
  const availableSites = getInputNumber("available-sites", 20);
  const maxCohortsPerSite = getInputNumber("max-cohorts-per-site", 4);
  const includeOppCost = getCheckbox("opp-cost-toggle");

  return {
    planningHorizonYears,
    discountRate,
    nonOutbreakValuePerGradPerYear,
    valuePerOutbreak,
    completionRate,
    outbreaksPerGraduate,
    crossSectorMultiplier,
    availableMentors,
    availableSites,
    maxCohortsPerSite,
    includeOppCost
  };
}

function readConfig() {
  const tier = document.getElementById("tier").value;
  const career = document.getElementById("career").value;
  const mentorship = document.getElementById("mentorship").value;
  const delivery = document.getElementById("delivery").value;
  const response = Number(document.getElementById("response-time").value || 7);
  const costPerTraineePerMonth = getInputNumber("cost", 250000);
  const traineesPerCohort = getInputNumber("trainees", 25);
  const cohorts = getInputNumber("cohorts", 10);
  const planningHorizonYears = getInputNumber("planning-horizon-config", 5);
  const oppConfig = getCheckbox("opp-cost-config");
  const scenarioName = document.getElementById("scenario-name").value.trim();
  const scenarioNotes = document.getElementById("scenario-notes").value.trim();

  const config = {
    tier,
    career,
    mentorship,
    delivery,
    response,
    costPerTraineePerMonth,
    traineesPerCohort,
    cohorts,
    planningHorizonYears,
    opportunityCostIncluded: oppConfig,
    scenarioName,
    scenarioNotes
  };

  appState.currentConfig = config;
  return config;
}

function computeScenarioFull() {
  const settings = readSettings();
  const config = readConfig();
  const mentorCostBase = getInputNumber("mentor-cost-base", 1500000);

  const pref = computeEndorsementAndValue(config);
  const epi = computeEpidemiological(config, pref.endorseRate, settings);
  const costs = computeCosts(config, mentorCostBase, settings.includeOppCost);
  const capacity = computeCapacity(config, settings);

  const wtpPerTrainee = pref.wtpPerTraineePerMonth;
  const wtpPerCohort = wtpPerTrainee * epi.months * config.traineesPerCohort;
  const wtpAllCohorts = wtpPerCohort * config.cohorts;

  const epiBenefitPerCohort = epi.epiBenefitPerCohort;
  const epiBenefitAllCohorts = epiBenefitPerCohort * config.cohorts;

  const netBenefitPerCohort = epiBenefitPerCohort - costs.totalEconomicCostPerCohort;
  const netBenefitAllCohorts = epiBenefitAllCohorts - costs.totalEconomicCostPerCohort * config.cohorts;

  const bcrPerCohort =
    costs.totalEconomicCostPerCohort > 0 ? epiBenefitPerCohort / costs.totalEconomicCostPerCohort : null;

  const economicCostAllCohorts = costs.totalEconomicCostPerCohort * config.cohorts;
  const directCostAllCohorts = costs.directCostPerCohort * config.cohorts;
  const totalMentorCostAllCohorts = costs.mentorCostPerCohort * config.cohorts;

  const nationalBcr = economicCostAllCohorts > 0 ? epiBenefitAllCohorts / economicCostAllCohorts : null;

  const wtpOutbreakComponent = wtpAllCohorts * 0.3;

  const scenario = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    config,
    settings,
    mentorCostBase,
    endorseRate: pref.endorseRate,
    optOutRate: pref.optOutRate,
    wtpPerTraineePerMonth: wtpPerTrainee,
    wtpPerCohort,
    wtpAllCohorts,
    wtpOutbreakComponent,
    epi,
    epiBenefitPerCohort,
    epiBenefitAllCohorts,
    netBenefitPerCohort,
    netBenefitAllCohorts,
    bcrPerCohort,
    directCostPerCohort: costs.directCostPerCohort,
    economicCostPerCohort: costs.totalEconomicCostPerCohort,
    directCostAllCohorts,
    economicCostAllCohorts,
    totalMentorCostAllCohorts,
    programmeCostPerCohort: costs.programmeCostPerCohort,
    opportunityCostPerCohort: costs.opportunityCostPerCohort,
    capacity,
    graduatesAllCohorts: epi.graduatesAllCohorts,
    outbreaksPerYearNational: epi.outbreaksPerYearNational,
    nationalBcr
  };

  appState.currentScenario = scenario;
  updateAllPanels(scenario);
  return scenario;
}

/* ===========================
   UI updates – summary / results
   =========================== */

function updateConfigSummary(config) {
  const el = document.getElementById("config-summary");
  if (!el || !config) return;
  const tierLabel = {
    frontline: "Frontline",
    intermediate: "Intermediate",
    advanced: "Advanced"
  }[config.tier];

  el.innerHTML = `
    <ul class="summary-list">
      <li><strong>Tier:</strong> ${tierLabel}</li>
      <li><strong>Career incentive:</strong> ${config.career}</li>
      <li><strong>Mentorship intensity:</strong> ${config.mentorship}</li>
      <li><strong>Delivery mode:</strong> ${config.delivery}</li>
      <li><strong>Outbreak response capacity:</strong> ${config.response} days</li>
      <li><strong>Cohorts:</strong> ${formatNumber(config.cohorts)}</li>
      <li><strong>Trainees per cohort:</strong> ${formatNumber(config.traineesPerCohort)}</li>
      <li><strong>Cost per trainee per month:</strong> ${formatCurrencyINR(
        config.costPerTraineePerMonth
      )}</li>
    </ul>
  `;
}

function updateHeadlineStatus(scenario) {
  const statusEl = document.getElementById("headline-status");
  const textEl = document.getElementById("headline-recommendation");
  if (!statusEl || !textEl || !scenario) return;

  const endorse = scenario.endorseRate;
  let statusClass = "status-neutral";
  let msg =
    "This configuration has moderate support in the preference study. Consider comparing it with at least one other option.";

  if (endorse >= 70) {
    statusClass = "status-good";
    msg =
      "This configuration attracts strong support in the preference study. It is a good candidate for detailed business case work.";
  } else if (endorse < 50) {
    statusClass = "status-risk";
    msg =
      "This configuration has low support in the preference study. It may require design changes or a clearer communication strategy.";
  }

  statusEl.className = "status-tag " + statusClass;
  statusEl.textContent = `Endorsement: ${formatNumber(endorse, 1)}% · Opt-out: ${formatNumber(
    scenario.optOutRate,
    1
  )}%`;
  textEl.textContent = msg;
}

function updateResultsPanel(scenario) {
  if (!scenario) return;

  document.getElementById("endorsement-rate").textContent =
    formatNumber(scenario.endorseRate, 1) + " %";
  document.getElementById("optout-rate").textContent =
    formatNumber(scenario.optOutRate, 1) + " %";

  document.getElementById("value-per-trainee").textContent = formatCurrencyINR(
    scenario.wtpPerTraineePerMonth,
    0
  );
  document.getElementById("value-total-cohort").textContent = formatCurrencyINR(
    scenario.wtpPerCohort,
    0
  );

  document.getElementById("direct-cost-cohort").textContent = formatCurrencyINR(
    scenario.directCostPerCohort,
    0
  );
  document.getElementById("economic-cost-cohort").textContent = formatCurrencyINR(
    scenario.economicCostPerCohort,
    0
  );
  document.getElementById("epi-benefit-cohort").textContent = formatCurrencyINR(
    scenario.epiBenefitPerCohort,
    0
  );
  document.getElementById("bcr-cohort").textContent =
    scenario.bcrPerCohort === null ? "–" : formatNumber(scenario.bcrPerCohort, 2);
  document.getElementById("net-benefit-cohort").textContent = formatCurrencyINR(
    scenario.netBenefitPerCohort,
    0
  );
  document.getElementById("mentor-cost-cohort").textContent = formatCurrencyINR(
    scenario.directCostPerCohort - scenario.programmeCostPerCohort,
    0
  );

  document.getElementById("required-mentors").textContent = formatNumber(
    scenario.capacity.requiredMentors,
    0
  );
  document.getElementById("mentor-shortfall").textContent = formatNumber(
    scenario.capacity.mentorShortfall,
    0
  );
  document.getElementById("site-capacity").textContent = `${formatNumber(
    scenario.config.cohorts,
    0
  )} planned vs ${formatNumber(scenario.capacity.maxCohortsBySites, 0)} capacity`;

  const feasEl = document.getElementById("feasibility-status");
  feasEl.textContent = scenario.capacity.capacityStatus;
  feasEl.className =
    "status-tag " +
    (scenario.capacity.capacityStatus === "Within current capacity"
      ? "status-good"
      : "status-risk");
}

function updateCostingPanel(scenario) {
  if (!scenario) return;
  const tbody = document.querySelector("#cost-breakdown-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const template = COST_TEMPLATES[scenario.config.tier].combined;
  const totalProgramme = scenario.programmeCostPerCohort;

  template.components.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.label}</td>
      <td class="numeric-cell">${formatNumber(c.directShare * 100, 1)} %</td>
      <td class="numeric-cell">${formatCurrencyINR(totalProgramme * c.directShare, 0)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ===========================
   Assumptions panels
   =========================== */

function buildAssumptionsText(scenario) {
  if (!scenario) return "";
  const st = scenario.settings;
  const cfg = scenario.config;
  const mentorMult =
    cfg.mentorship === "high" ? 1.7 : cfg.mentorship === "medium" ? 1.3 : 1.0;

  const lines = [
    `Planning horizon: ${st.planningHorizonYears} years`,
    `Discount rate: ${formatNumber(st.discountRate * 100, 1)} %`,
    `Completion rate: ${formatNumber(st.completionRate * 100, 1)} %`,
    `Outbreak responses per graduate per year: ${formatNumber(st.outbreaksPerGraduate, 2)}`,
    `Value per outbreak response: ${formatCurrencyINR(st.valuePerOutbreak, 0)}`,
    `Non-outbreak value per graduate per year: ${formatCurrencyINR(
      st.nonOutbreakValuePerGradPerYear,
      0
    )}`,
    `Cross-sector benefit multiplier: ${formatNumber(st.crossSectorMultiplier, 2)}`,
    `Outbreak response capacity attribute: ${cfg.response} days (DCE levels: 30, 15, 7 days)`,
    `Opportunity cost included: ${st.includeOppCost && cfg.opportunityCostIncluded ? "Yes" : "No"}`,
    `Mentor support cost per cohort (base): ${formatCurrencyINR(
      scenario.mentorCostBase,
      0
    )}`,
    `Mentorship intensity multiplier applied: ${mentorMult}`,
    `Available mentors nationally: ${formatNumber(st.availableMentors, 0)}`,
    `Available training sites / hubs: ${formatNumber(st.availableSites, 0)}`,
    `Max cohorts per site per year: ${formatNumber(st.maxCohortsPerSite, 0)}`
  ];
  return lines.join("\n");
}

function updateAssumptionsPanels(scenario) {
  const summary = document.getElementById("assumptions-summary");
  const detail = document.getElementById("assumptions-detail");
  if (!scenario || !summary || !detail) return;

  const txt = buildAssumptionsText(scenario);
  appState.assumptionsText = txt;

  const lines = txt.split("\n");

  summary.innerHTML = `
    <ul>
      ${lines
        .slice(0, 6)
        .map((l) => `<li>${l}</li>`)
        .join("")}
    </ul>
  `;

  detail.innerHTML = `
    <ul>
      ${lines.map((l) => `<li>${l}</li>`).join("")}
    </ul>
  `;
}

/* ===========================
   National view panel
   =========================== */

function updateNationalPanel(scenario) {
  if (!scenario) return;

  document.getElementById("nat-graduates").textContent = formatNumber(
    scenario.graduatesAllCohorts,
    0
  );
  document.getElementById("nat-outbreaks").textContent = formatNumber(
    scenario.outbreaksPerYearNational,
    1
  );
  document.getElementById("nat-total-benefit").textContent = formatCurrencyINR(
    scenario.epiBenefitAllCohorts,
    0
  );
  document.getElementById("nat-total-cost").textContent = formatCurrencyINR(
    scenario.economicCostAllCohorts,
    0
  );
  document.getElementById("nat-net-benefit").textContent = formatCurrencyINR(
    scenario.netBenefitAllCohorts,
    0
  );
  document.getElementById("nat-bcr").textContent =
    scenario.nationalBcr === null ? "–" : formatNumber(scenario.nationalBcr, 2);
}

/* ===========================
   Perceived value & sensitivity tab
   =========================== */

function ensureChart(id, type, data, options) {
  if (!window.Chart) return null;
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (appState.charts[id]) {
    appState.charts[id].data = data;
    appState.charts[id].options = options;
    appState.charts[id].update();
    return appState.charts[id];
  }
  const chart = new Chart(ctx, {
    type,
    data,
    options
  });
  appState.charts[id] = chart;
  return chart;
}

function updateUptakeChart(scenario) {
  if (!scenario) return;
  const data = {
    labels: ["Endorse programme", "Opt-out"],
    datasets: [
      {
        label: "Share of respondents (%)",
        data: [scenario.endorseRate, scenario.optOutRate]
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v) => formatNumber(v, 0)
        }
      }
    }
  };
  ensureChart("chart-uptake", "bar", data, options);
}

function updateValuePanel(scenario) {
  if (!scenario) return;
  document.getElementById("value-all-cohorts").textContent = formatCurrencyINR(
    scenario.wtpAllCohorts,
    0
  );
  document.getElementById("value-outbreak-component").textContent = formatCurrencyINR(
    scenario.wtpOutbreakComponent,
    0
  );
}

function runSensitivity() {
  const scenario = appState.currentScenario;
  if (!scenario || !appState.currentConfig) {
    showToast("Update the scenario first.", "warning");
    return;
  }

  const minCost = getInputNumber("sensitivity-min-cost", 100000);
  const maxCost = getInputNumber("sensitivity-max-cost", 350000);
  const steps = getInputNumber("sensitivity-steps", 8);

  if (maxCost <= minCost || steps < 3) {
    showToast("Check sensitivity ranges and steps.", "error");
    return;
  }

  const cfgBase = appState.currentConfig;

  const labels = [];
  const endorseSeries = [];
  const valueSeries = [];

  const stepSize = (maxCost - minCost) / (steps - 1);

  for (let i = 0; i < steps; i++) {
    const cost = minCost + stepSize * i;
    const cfg = { ...cfgBase, costPerTraineePerMonth: cost };
    const pref = computeEndorsementAndValue(cfg);
    labels.push(formatNumber(cost, 0));
    endorseSeries.push(pref.endorseRate);
    valueSeries.push(pref.wtpPerTraineePerMonth);
  }

  const data = {
    labels,
    datasets: [
      {
        label: "Endorsement (%)",
        data: endorseSeries,
        yAxisID: "y"
      },
      {
        label: "Perceived value / trainee / month (INR)",
        data: valueSeries,
        yAxisID: "y1"
      }
    ]
  };

  const options = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    stacked: false,
    plugins: {
      legend: { display: true }
    },
    scales: {
      y: {
        type: "linear",
        position: "left",
        beginAtZero: true,
        ticks: { callback: (v) => formatNumber(v, 0) }
      },
      y1: {
        type: "linear",
        position: "right",
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { callback: (v) => formatNumber(v, 0) }
      }
    }
  };

  ensureChart("chart-sensitivity", "line", data, options);
}

/* ===========================
   Saved scenarios table
   =========================== */

function refreshScenarioTable() {
  const tbody = document.querySelector("#scenario-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  appState.savedScenarios.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="scenario-select" data-id="${s.id}"></td>
      <td>${s.config.scenarioName || "(unnamed scenario)"}</td>
      <td>${s.config.tier}</td>
      <td>${s.config.mentorship}</td>
      <td>${s.config.career}</td>
      <td>${s.config.delivery}</td>
      <td class="numeric-cell">${formatNumber(s.config.cohorts, 0)}</td>
      <td class="numeric-cell">${formatNumber(s.config.traineesPerCohort, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(s.wtpPerTraineePerMonth, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(s.wtpAllCohorts, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(s.directCostAllCohorts, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(s.economicCostAllCohorts, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(s.totalMentorCostAllCohorts, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(s.netBenefitAllCohorts, 0)}</td>
      <td class="numeric-cell">${
        s.nationalBcr === null ? "–" : formatNumber(s.nationalBcr, 2)
      }</td>
      <td class="numeric-cell">${formatNumber(s.endorseRate, 1)} %</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ===========================
   Copilot / ChatGPT briefing
   =========================== */

function getSelectedScenarioIds() {
  const boxes = Array.from(document.querySelectorAll(".scenario-select"));
  return boxes.filter((b) => b.checked).map((b) => b.dataset.id);
}

function chooseScenariosForBriefing() {
  const scopeEl = document.getElementById("briefing-scope");
  const scope = scopeEl ? scopeEl.value : "top3";

  if (!appState.savedScenarios.length && appState.currentScenario) {
    return [appState.currentScenario];
  }

  if (scope === "selected") {
    const ids = getSelectedScenarioIds();
    const chosen = appState.savedScenarios.filter((s) => ids.includes(s.id));
    return chosen.length ? chosen : appState.savedScenarios.slice(0, 3);
  }

  if (scope === "all") {
    return [...appState.savedScenarios];
  }

  // top3 by net benefit
  const sorted = [...appState.savedScenarios].sort(
    (a, b) => (b.netBenefitAllCohorts || 0) - (a.netBenefitAllCohorts || 0)
  );
  return sorted.slice(0, 3);
}

function buildScenarioJsonForAI(scenarios) {
  return JSON.stringify(
    scenarios.map((s) => ({
      name: s.config.scenarioName || "",
      tier: s.config.tier,
      mentorship: s.config.mentorship,
      career: s.config.career,
      delivery: s.config.delivery,
      outbreakResponseCapacityDays: s.config.response,
      cohorts: s.config.cohorts,
      traineesPerCohort: s.config.traineesPerCohort,
      endorseRate: s.endorseRate,
      optOutRate: s.optOutRate,
      perceivedValuePerTraineePerMonth: s.wtpPerTraineePerMonth,
      perceivedValueAllCohorts: s.wtpAllCohorts,
      epiBenefitAllCohorts: s.epiBenefitAllCohorts,
      economicCostAllCohorts: s.economicCostAllCohorts,
      netBenefitAllCohorts: s.netBenefitAllCohorts,
      bcrNationalEpi: s.nationalBcr,
      capacity: s.capacity
    })),
    null,
    2
  );
}

function buildBriefingPrompt(target = "copilot") {
  const scenarios = chooseScenariosForBriefing();
  const scenarioJson = buildScenarioJsonForAI(scenarios);
  const assumptions = appState.assumptionsText || "";
  const mainScenario = scenarios[0] || null;
  const feas = mainScenario ? mainScenario.capacity : null;
  const mainCfg = mainScenario ? mainScenario.config : null;

  const aiInstruction =
    target === "copilot"
      ? "Paste this prompt into Microsoft Copilot. You may use Microsoft Word or PowerPoint to draft the output."
      : "Paste this prompt into ChatGPT and generate a two-page policy brief or slide-ready summary.";

  const feasibilityText = feas
    ? `Capacity and feasibility summary (for the main configuration):
- Required mentors nationally: ${feas.requiredMentors}
- Mentor shortfall: ${feas.mentorShortfall}
- Planned cohorts vs site capacity: ${mainCfg ? mainCfg.cohorts : ""} vs ${feas.maxCohortsBySites}
- Overall feasibility status: ${feas.capacityStatus}`
    : "Capacity and feasibility summary: not computed.";

  return `${aiInstruction}

You are a senior health economist advising the Ministry of Health and its partners on plans to scale up FETP training in India.

Use only the quantitative STEPS scenario information provided in JSON below. Do not invent new numbers.

Your task:
- Draft a concise, policy-ready narrative for senior officials.
- Summarise the rationale for FETP scale-up, the configuration options and their trade-offs.
- Clearly report endorsement levels, perceived programme value (derived from a preference study), costs, epidemiological benefits, net benefits and benefit–cost ratios.
- Discuss capacity and feasibility issues (mentor availability and site capacity).
- Use non-technical language but maintain precision in numbers.
- Include a compact comparison table (or bullet list) across the scenarios.
- Keep the brief to around two pages of A4 when formatted, but focus more on clarity than strict length.

Assumptions used:
${assumptions}

${feasibilityText}

STE P S scenario JSON:
${scenarioJson}
`;
}

function copyBriefingPrompt(target) {
  const textArea = document.getElementById("briefing-text");
  if (!textArea) return;
  const prompt = buildBriefingPrompt(target);
  textArea.value = prompt;
  navigator.clipboard
    .writeText(prompt)
    .then(() => {
      showToast(`Prompt copied for ${target === "copilot" ? "Copilot" : "ChatGPT"}.`, "success");
    })
    .catch(() => {
      showToast("Unable to copy prompt to clipboard.", "error");
    });
}

function downloadPromptTxt() {
  const prompt = buildBriefingPrompt("chatgpt");
  const blob = new Blob([prompt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "steps_briefing_prompt.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ===========================
   PDF and Excel exports
   =========================== */

function collectScenariosForExport() {
  const ids = getSelectedScenarioIds();
  if (ids.length) {
    return appState.savedScenarios.filter((s) => ids.includes(s.id));
  }
  if (appState.savedScenarios.length) return [...appState.savedScenarios];
  if (appState.currentScenario) return [appState.currentScenario];
  return [];
}

function exportStandardPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("jsPDF is not available.", "error");
    return;
  }
  const scenarios = collectScenariosForExport();
  if (!scenarios.length) {
    showToast("No scenarios available to export.", "warning");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginLeft = 14;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("STEPS – FETP India Scale-up Decision Aid", marginLeft, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Standard scenario summary", marginLeft, y);
  y += 8;

  scenarios.forEach((s, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${idx + 1}. ${s.config.scenarioName || "Scenario"}`, marginLeft, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const lines = [
      `Tier: ${s.config.tier} · Mentorship: ${s.config.mentorship} · Career: ${s.config.career} · Delivery: ${s.config.delivery}`,
      `Outbreak response capacity: ${s.config.response} days`,
      `Cohorts: ${formatNumber(s.config.cohorts)} · Trainees / cohort: ${formatNumber(
        s.config.traineesPerCohort
      )}`,
      `Endorsement: ${formatNumber(s.endorseRate, 1)}% · Opt-out: ${formatNumber(
        s.optOutRate,
        1
      )}%`,
      `Perceived programme value (all cohorts): ${formatCurrencyINR(s.wtpAllCohorts, 0)}`,
      `Epidemiological benefit (all cohorts): ${formatCurrencyINR(s.epiBenefitAllCohorts, 0)}`,
      `Economic cost (all cohorts): ${formatCurrencyINR(s.economicCostAllCohorts, 0)}`,
      `Net benefit (all cohorts): ${formatCurrencyINR(s.netBenefitAllCohorts, 0)}`,
      `Benefit–cost ratio (epidemiological): ${
        s.nationalBcr === null ? "–" : formatNumber(s.nationalBcr, 2)
      }`,
      `Mentor support cost (all cohorts): ${formatCurrencyINR(s.totalMentorCostAllCohorts, 0)}`,
      `Capacity status: ${s.capacity.capacityStatus} (required mentors: ${
        s.capacity.requiredMentors
      }, shortfall: ${s.capacity.mentorShortfall})`
    ];

    lines.forEach((line) => {
      const split = doc.splitTextToSize(line, 180);
      split.forEach((ln) => {
        if (y > 280) {
          doc.addPage();
          y = 18;
        }
        doc.text(ln, marginLeft, y);
        y += 5;
      });
    });
    y += 4;
  });

  if (y > 260) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Assumptions used", marginLeft, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const assumptions = appState.assumptionsText || "";
  const linesAss = doc.splitTextToSize(assumptions, 180);
  linesAss.forEach((ln) => {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    doc.text(ln, marginLeft, y);
    y += 5;
  });

  doc.save("steps_standard_export.pdf");
}

function exportBriefPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("jsPDF is not available.", "error");
    return;
  }
  const scenarios = chooseScenariosForBriefing();
  if (!scenarios.length) {
    showToast("No scenarios available to export.", "warning");
    return;
  }

  const main = scenarios[0];
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginLeft = 14;
  let y = 18;

  // Page 1 – headline and compact table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("STEPS – FETP India Scale-up: Brief summary", marginLeft, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const headline = `Headline recommendation: ${
    main.config.scenarioName || "Preferred configuration"
  } (endorsement ${formatNumber(main.endorseRate, 1)}%, BCR ${
    main.nationalBcr === null ? "–" : formatNumber(main.nationalBcr, 2)
  }).`;
  doc.text(doc.splitTextToSize(headline, 180), marginLeft, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Compact comparison (top scenarios)", marginLeft, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const header = [
    "Scenario",
    "Tier",
    "Mentor",
    "Cohorts",
    "Endorse %",
    "Perceived value",
    "Cost",
    "Net benefit",
    "BCR"
  ];
  const colWidths = [40, 16, 18, 18, 18, 32, 28, 32, 14];

  function drawRow(values) {
    let x = marginLeft;
    values.forEach((val, idx) => {
      const w = colWidths[idx];
      const text = typeof val === "string" ? val : String(val);
      const lines = doc.splitTextToSize(text, w);
      lines.forEach((ln) => {
        doc.text(ln, x, y);
        y += 4;
      });
      y -= 4 * lines.length;
      x += w;
    });
    y += 5;
  }

  drawRow(header);
  doc.setFont("helvetica", "normal");
  scenarios.forEach((s) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    drawRow([
      (s.config.scenarioName || "").slice(0, 28),
      s.config.tier,
      s.config.mentorship,
      formatNumber(s.config.cohorts, 0),
      formatNumber(s.endorseRate, 1),
      formatCurrencyINR(s.wtpAllCohorts, 0),
      formatCurrencyINR(s.economicCostAllCohorts, 0),
      formatCurrencyINR(s.netBenefitAllCohorts, 0),
      s.nationalBcr === null ? "–" : formatNumber(s.nationalBcr, 2)
    ]);
  });

  // Page 2 – assumptions + enablers/risks
  doc.addPage();
  y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Assumptions used", marginLeft, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const assumptions = appState.assumptionsText || "";
  const linesAss = doc.splitTextToSize(assumptions, 180);
  linesAss.forEach((ln) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    doc.text(ln, marginLeft, y);
    y += 5;
  });

  if (y > 250) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Capacity and feasibility", marginLeft, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const c = main.capacity;
  const feasLines = [
    `Overall status: ${c.capacityStatus}`,
    `Required mentors nationally: ${formatNumber(c.requiredMentors, 0)} (shortfall: ${formatNumber(
      c.mentorShortfall,
      0
    )})`,
    `Planned cohorts: ${formatNumber(
      main.config.cohorts,
      0
    )} vs maximum cohorts deliverable by sites: ${formatNumber(c.maxCohortsBySites, 0)}`
  ];
  feasLines.forEach((ln) => {
    doc.text(ln, marginLeft, y);
    y += 5;
  });

  if (y > 230) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Implementation enablers and risks", marginLeft, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const enablers = (document.getElementById("enablers-text").value || "").trim();
  const risks = (document.getElementById("risks-text").value || "").trim();

  const enLines = doc.splitTextToSize(
    "Enablers: " + (enablers || "Specify key institutional and political enablers here."),
    180
  );
  const riskLines = doc.splitTextToSize(
    "Risks: " + (risks || "Add key implementation and sustainability risks here."),
    180
  );

  enLines.forEach((ln) => {
    doc.text(ln, marginLeft, y);
    y += 5;
  });
  y += 2;
  riskLines.forEach((ln) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    doc.text(ln, marginLeft, y);
    y += 5;
  });

  doc.save("steps_brief_export.pdf");
}

function exportExcel() {
  if (!window.XLSX) {
    showToast("SheetJS (XLSX) is not available.", "error");
    return;
  }
  const scenarios = collectScenariosForExport();
  if (!scenarios.length) {
    showToast("No scenarios available to export.", "warning");
    return;
  }

  const wb = XLSX.utils.book_new();

  const scenarioData = [
    [
      "Name",
      "Tier",
      "Mentorship",
      "Career",
      "Delivery",
      "Outbreak response capacity (days)",
      "Cohorts",
      "Trainees per cohort",
      "Endorsement (%)",
      "Opt-out (%)",
      "Perceived value per trainee per month (INR)",
      "Perceived value (all cohorts, INR)",
      "Epi benefit (all cohorts, INR)",
      "Economic cost (all cohorts, INR)",
      "Net benefit (all cohorts, INR)",
      "BCR (national, epi)",
      "Mentor cost (all cohorts, INR)",
      "Capacity status",
      "Required mentors",
      "Mentor shortfall"
    ]
  ];

  scenarios.forEach((s) => {
    scenarioData.push([
      s.config.scenarioName || "",
      s.config.tier,
      s.config.mentorship,
      s.config.career,
      s.config.delivery,
      s.config.response,
      s.config.cohorts,
      s.config.traineesPerCohort,
      s.endorseRate,
      s.optOutRate,
      s.wtpPerTraineePerMonth,
      s.wtpAllCohorts,
      s.epiBenefitAllCohorts,
      s.economicCostAllCohorts,
      s.netBenefitAllCohorts,
      s.nationalBcr,
      s.totalMentorCostAllCohorts,
      s.capacity.capacityStatus,
      s.capacity.requiredMentors,
      s.capacity.mentorShortfall
    ]);
  });

  const wsScenarios = XLSX.utils.aoa_to_sheet(scenarioData);
  XLSX.utils.book_append_sheet(wb, wsScenarios, "Scenarios");

  const assumptionsLines = (appState.assumptionsText || "").split("\n");
  const assumptionsData = [["Assumption"]];
  assumptionsLines.forEach((l) => assumptionsData.push([l]));
  const wsAssumptions = XLSX.utils.aoa_to_sheet(assumptionsData);
  XLSX.utils.book_append_sheet(wb, wsAssumptions, "Assumptions");

  XLSX.writeFile(wb, "steps_scenarios.xlsx");
}

/* ===========================
   Aggregate UI update
   =========================== */

function updateAllPanels(scenario) {
  updateConfigSummary(scenario.config);
  updateHeadlineStatus(scenario);
  updateResultsPanel(scenario);
  updateCostingPanel(scenario);
  updateValuePanel(scenario);
  updateNationalPanel(scenario);
  updateAssumptionsPanels(scenario);
  updateUptakeChart(scenario);
}

/* ===========================
   Validation warnings
   =========================== */

function updateCostWarning() {
  const costSlider = document.getElementById("cost");
  const warning = document.getElementById("cost-warning");
  if (!costSlider || !warning) return;
  const val = Number(costSlider.value);
  if (val <= 80000 || val >= 380000) {
    warning.textContent =
      "Cost is at the edge of the range used in the preference study. Check realism and robustness.";
  } else {
    warning.textContent = "";
  }
}

function updateVolumeWarning() {
  const trainees = getInputNumber("trainees", 25);
  const cohorts = getInputNumber("cohorts", 10);
  const warning = document.getElementById("volume-warning");
  if (!warning) return;
  const total = trainees * cohorts;
  if (total >= 5000) {
    warning.textContent =
      "Total trainees (cohorts × trainees) is very large. Please check realism and capacity assumptions.";
  } else {
    warning.textContent = "";
  }
}

/* ===========================
   Event handlers
   =========================== */

function initEventHandlers() {
  const costSlider = document.getElementById("cost");
  if (costSlider) {
    costSlider.addEventListener("input", () => {
      const disp = document.getElementById("cost-display");
      if (disp) disp.textContent = formatCurrencyINR(Number(costSlider.value), 0);
      updateCostWarning();
    });
  }

  const traineesInput = document.getElementById("trainees");
  const cohortsInput = document.getElementById("cohorts");
  if (traineesInput) {
    traineesInput.addEventListener("input", updateVolumeWarning);
  }
  if (cohortsInput) {
    cohortsInput.addEventListener("input", updateVolumeWarning);
  }

  const applySettingsBtn = document.getElementById("apply-settings");
  if (applySettingsBtn) {
    applySettingsBtn.addEventListener("click", () => {
      if (appState.currentScenario) {
        computeScenarioFull();
        showToast("Settings applied; results updated.", "success");
      } else {
        showToast("Configure and update a scenario first.", "info");
      }
    });
  }

  const updateScenarioBtn = document.getElementById("update-scenario");
  if (updateScenarioBtn) {
    updateScenarioBtn.addEventListener("click", () => {
      computeScenarioFull();
      showToast("Scenario updated.", "success");
    });
  }

  const saveScenarioBtn = document.getElementById("save-scenario");
  if (saveScenarioBtn) {
    saveScenarioBtn.addEventListener("click", () => {
      if (!appState.currentScenario) {
        showToast("Update the scenario first.", "warning");
        return;
      }
      appState.savedScenarios.push({ ...appState.currentScenario });
      refreshScenarioTable();
      showToast("Scenario saved.", "success");
    });
  }

  const runSensBtn = document.getElementById("run-sensitivity");
  if (runSensBtn) {
    runSensBtn.addEventListener("click", runSensitivity);
  }

  const copyCopilotBtn = document.getElementById("copy-copilot-prompt");
  if (copyCopilotBtn) {
    copyCopilotBtn.addEventListener("click", () => copyBriefingPrompt("copilot"));
  }

  const copyChatGPTBtn = document.getElementById("copy-chatgpt-prompt");
  if (copyChatGPTBtn) {
    copyChatGPTBtn.addEventListener("click", () => copyBriefingPrompt("chatgpt"));
  }

  const downloadPromptBtn = document.getElementById("download-prompt");
  if (downloadPromptBtn) {
    downloadPromptBtn.addEventListener("click", downloadPromptTxt);
  }

  const pdfStdBtn = document.getElementById("export-pdf-standard");
  if (pdfStdBtn) {
    pdfStdBtn.addEventListener("click", exportStandardPDF);
  }

  const pdfBriefBtn = document.getElementById("export-pdf-brief");
  if (pdfBriefBtn) {
    pdfBriefBtn.addEventListener("click", exportBriefPDF);
  }

  const excelBtn = document.getElementById("export-excel");
  if (excelBtn) {
    excelBtn.addEventListener("click", exportExcel);
  }
}

/* ===========================
   Init
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTooltips();
  initEventHandlers();

  // Initial cost label and warnings
  const costSlider = document.getElementById("cost");
  if (costSlider) {
    const disp = document.getElementById("cost-display");
    if (disp) disp.textContent = formatCurrencyINR(Number(costSlider.value), 0);
    updateCostWarning();
  }
  updateVolumeWarning();
});
