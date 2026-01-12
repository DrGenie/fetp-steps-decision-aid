/* ===================================================
   STEPS FETP India Decision Aid – Enhanced script
   =================================================== */

/* ===========================
   Global constants
   =========================== */

const TIER_MONTHS = {
  frontline: 3,
  intermediate: 12,
  advanced: 24
};

// Mentor cost multipliers by mentorship intensity (Requirement A1)
const MENTOR_MULTIPLIERS = {
  low: 1.0,
  medium: 1.3,
  high: 1.7
};

// Mentor capacity (fellows per mentor) for feasibility checks (Requirement B1)
const MENTOR_CAPACITY = {
  low: 5,
  medium: 3.5,
  high: 2
};

// Response time multipliers for outbreak benefits (from original model)
const RESPONSE_TIME_MULTIPLIERS = {
  "30": 1.0,
  "15": 1.2,
  "7": 1.5
};

/* ===========================
   Epidemiological settings
   (adapted from original DEFAULT_EPI_SETTINGS)
   =========================== */

const DEFAULT_EPI_SETTINGS = {
  general: {
    planningHorizonYears: 5,
    inrToUsdRate: 83,
    epiDiscountRate: 0.03
  },
  tiers: {
    frontline: {
      completionRate: 0.9,
      outbreaksPerGraduatePerYear: 0.5,
      valuePerGraduate: 0,
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

// Opportunity-cost rates by tier (simplified from original COST_TEMPLATES)
const OPP_COST_RATE = {
  frontline: 1.09,
  intermediate: 1.09,
  advanced: 1.09
};

/* ===========================
   Mixed logit coefficients
   (from original MXL_COEFS)
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
    high: 0.692
  },
  delivery: {
    inperson: 0.0,
    blended: -0.015,
    online: -0.274
  },
  response: {
    "30": 0.0,
    "15": 0.342,
    "7": 0.868
  },
  costPerThousand: -0.137
};

/* ===========================
   Application state
   =========================== */

const appState = {
  epiSettings: JSON.parse(JSON.stringify(DEFAULT_EPI_SETTINGS)),
  currentScenario: null,
  savedScenarios: [],
  charts: {
    uptake: null,
    epi: null,
    bcr: null
  },
  settings: {
    crossSectorMultiplier: 1.0,
    availableMentors: 200,
    availableSites: null,
    maxCohortsPerSite: null,
    lastAppliedValues: null
  }
};

/* ===========================
   Utility helpers
   =========================== */

function getElement(id) {
  return document.getElementById(id);
}

function readNumber(id, fallback = 0) {
  const el = getElement(id);
  if (!el) return fallback;
  const v = Number(el.value);
  return isNaN(v) ? fallback : v;
}

function clamp(x, min, max) {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

function formatNumber(x, decimals = 0) {
  if (x === null || x === undefined || isNaN(x)) return "-";
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(x * factor) / factor;
  return rounded.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatCurrencyINR(x, decimals = 0) {
  if (x === null || x === undefined || isNaN(x)) return "-";
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(x * factor) / factor;
  return rounded.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/* ===========================
   Tabs
   =========================== */

function initTabs() {
  const tabButtons = Array.from(
    document.querySelectorAll(".tab-link.tablink[data-tab], .tablink[data-tab]")
  );
  const tabPanels = Array.from(
    document.querySelectorAll(".tab-panel.tabcontent")
  );

  if (!tabButtons.length || !tabPanels.length) return;

  tabPanels.forEach((panel) => {
    if (!panel.dataset.defaultDisplay) {
      const computed = window.getComputedStyle(panel).display;
      panel.dataset.defaultDisplay =
        computed && computed !== "none" ? computed : "block";
    }
  });

  function openTab(panelId, btn) {
    tabPanels.forEach((panel) => {
      panel.style.display = "none";
      panel.classList.remove("active");
    });
    tabButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    const targetPanel = document.getElementById(panelId);
    if (targetPanel) {
      targetPanel.style.display = targetPanel.dataset.defaultDisplay || "block";
      targetPanel.classList.add("active");
    }
    if (btn) {
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
    }
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      if (!target) return;
      openTab(target, btn);
    });
  });

  // Ensure one tab is active by default
  const activeBtn = tabButtons.find((b) => b.classList.contains("active"));
  if (activeBtn) {
    const target = activeBtn.getAttribute("data-tab");
    if (target) {
      openTab(target, activeBtn);
    }
  } else {
    const first = tabButtons[0];
    const target = first && first.getAttribute("data-tab");
    if (target) {
      openTab(target, first);
    }
  }
}

/* ===========================
   Preference model
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

// Endorsement + implicit value (re-labelled as “Perceived programme value”)
function computeEndorsementAndPerceivedValue(config) {
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

  const endorseProb = denom > 0 ? expProg / denom : 0.0;
  const optOutProb = 1 - endorseProb;

  const nonCostUtility =
    MXL_COEFS.ascProgram +
    tierEffect(config.tier) +
    careerEffect(config.career) +
    mentorshipEffect(config.mentorship) +
    deliveryEffect(config.delivery) +
    responseEffect(config.response);

  const wtpPerTraineePerMonth =
    (nonCostUtility / Math.abs(MXL_COEFS.costPerThousand)) * 1000;

  return {
    endorseRate: clamp(endorseProb * 100, 0, 100),
    optOutRate: clamp(optOutProb * 100, 0, 100),
    perceivedValuePerTraineePerMonth: wtpPerTraineePerMonth
  };
}

/* ===========================
   Epidemiology and costs
   =========================== */

function presentValueFactor(rate, years) {
  if (rate === 0) return years;
  const r = rate;
  return (1 - Math.pow(1 + r, -years)) / r;
}

function computeCosts(config) {
  const months = TIER_MONTHS[config.tier] || 12;
  const trainees = config.traineesPerCohort;

  const directProgrammeCostPerCohort =
    config.costPerTraineePerMonth * months * trainees;

  // Mentor cost (Requirement A1)
  let mentorBase = readNumber("mentor-cost-per-cohort", 0);
  if (mentorBase < 0) mentorBase = 0;
  const mentorshipMultiplier = MENTOR_MULTIPLIERS[config.mentorship] || 1.0;
  const mentorCostPerCohort = mentorBase * mentorshipMultiplier;
  const mentorCostAllCohorts = mentorCostPerCohort * config.cohorts;

  const directCostPerCohort =
    directProgrammeCostPerCohort + mentorCostPerCohort;

  const oppRate = config.opportunityCostIncluded
    ? OPP_COST_RATE[config.tier] || 0
    : 0;

  const opportunityCostPerCohort = directCostPerCohort * oppRate;
  const totalEconomicCostPerCohort =
    directCostPerCohort + opportunityCostPerCohort;

  return {
    months,
    trainees,
    directProgrammeCostPerCohort,
    mentorBaseCostPerCohort: mentorBase,
    mentorshipMultiplier,
    mentorCostPerCohort,
    mentorCostAllCohorts,
    directCostPerCohort,
    opportunityCostPerCohort,
    totalEconomicCostPerCohort
  };
}

function computeEpidemiological(config, endorseRate) {
  const settings = appState.epiSettings;
  const general = settings.general;
  const tierSettings = settings.tiers[config.tier];

  const completionRate = tierSettings.completionRate;
  const outbreaksPerGrad = tierSettings.outbreaksPerGraduatePerYear;
  const valuePerOutbreak = tierSettings.valuePerOutbreak;

  const planningYears = general.planningHorizonYears;
  const discountRate = general.epiDiscountRate;
  const pvFactor = presentValueFactor(discountRate, planningYears);

  const endorseFactor = endorseRate / 100;
  const months = TIER_MONTHS[config.tier] || 12;

  const enrolledPerCohort = config.traineesPerCohort;
  const completedPerCohort = enrolledPerCohort * completionRate;
  const graduatesEffective = completedPerCohort * endorseFactor;

  const graduatesAllCohorts = graduatesEffective * config.cohorts;

  const respMultiplier =
    RESPONSE_TIME_MULTIPLIERS[String(config.response)] || 1;

  const outbreaksPerYearPerCohort =
    graduatesEffective * outbreaksPerGrad * respMultiplier;
  const outbreaksPerYearNational =
    outbreaksPerYearPerCohort * config.cohorts;

  const outbreakAnnualBenefitPerCohort =
    outbreaksPerYearPerCohort * valuePerOutbreak;
  const outbreakPVPerCohort = outbreakAnnualBenefitPerCohort * pvFactor;

  // Cross-sector multiplier (Requirement E2)
  let crossSectorMultiplier = readNumber("cross-sector-multiplier", 1.0);
  if (!crossSectorMultiplier || crossSectorMultiplier <= 0) {
    crossSectorMultiplier = 1.0;
  }
  crossSectorMultiplier = clamp(crossSectorMultiplier, 0.8, 2.0);

  const totalEpiBenefitPerCohort =
    outbreakPVPerCohort * crossSectorMultiplier;
  const totalEpiBenefitAllCohorts =
    totalEpiBenefitPerCohort * config.cohorts;

  return {
    months,
    enrolledPerCohort,
    completedPerCohort,
    graduatesEffective,
    graduatesPerCohort: graduatesEffective,
    graduatesAllCohorts,
    outbreaksPerYearPerCohort,
    outbreaksPerYearNational,
    outbreakPVPerCohort,
    epiBenefitPerCohort: totalEpiBenefitPerCohort,
    epiBenefitAllCohorts: totalEpiBenefitAllCohorts,
    discountRate,
    planningYears,
    crossSectorMultiplier
  };
}

/* ===========================
   Capacity and feasibility
   (Requirement B)
   =========================== */

function computeCapacity(config) {
  const mentorship = config.mentorship;
  const cap = MENTOR_CAPACITY[mentorship] || 5;
  const traineesPerCohort = config.traineesPerCohort;
  const cohorts = config.cohorts;

  const requiredMentorsPerCohort = Math.ceil(traineesPerCohort / cap);
  const requiredMentorsNational = requiredMentorsPerCohort * cohorts;

  let availableMentors = readNumber("available-mentors", 200);
  if (availableMentors < 0) availableMentors = 0;

  let availableSites = null;
  let maxCohortsPerSite = null;

  const sitesInput = getElement("available-sites");
  if (sitesInput) {
    const v = Number(sitesInput.value);
    if (!isNaN(v) && v > 0) availableSites = v;
  }

  const maxPerSiteInput = getElement("max-cohorts-per-site");
  if (maxPerSiteInput) {
    const v = Number(maxPerSiteInput.value);
    if (!isNaN(v) && v > 0) maxCohortsPerSite = v;
  }

  const shortfall = Math.max(0, requiredMentorsNational - availableMentors);
  const status =
    shortfall > 0 ? "Requires capacity expansion" : "Within current capacity";

  let siteMessage = "";
  if (availableSites && maxCohortsPerSite) {
    const totalCapacity = availableSites * maxCohortsPerSite;
    if (cohorts > totalCapacity) {
      siteMessage = `Configured cohorts (${cohorts}) exceed site capacity (${totalCapacity}).`;
    } else {
      siteMessage = `Configured cohorts (${cohorts}) are within site capacity (${totalCapacity}).`;
    }
  }

  return {
    mentorship,
    capacityPerMentor: cap,
    requiredMentorsPerCohort,
    requiredMentorsNational,
    availableMentors,
    shortfall,
    status,
    siteMessage,
    availableSites,
    maxCohortsPerSite
  };
}

/* ===========================
   Configuration
   =========================== */

function getConfigFromForm() {
  const tierEl = getElement("program-tier");
  const careerEl = getElement("career-track");
  const mentorshipEl = getElement("mentorship");
  const deliveryEl = getElement("delivery");
  const responseEl = getElement("response");

  const tier = tierEl ? tierEl.value : "frontline";
  const career = careerEl ? careerEl.value : "certificate";
  const mentorship = mentorshipEl ? mentorshipEl.value : "low";
  const delivery = deliveryEl ? deliveryEl.value : "inperson";

  let response = "7";
  if (responseEl) {
    responseEl.value = "7";
    response = "7";
  }

  const costSlider = readNumber("cost-slider", 50000);
  const trainees = readNumber("trainees", 10);
  const cohorts = readNumber("cohorts", 1);

  const planningInput = getElement("planning-horizon-config");
  let planningHorizonYears =
    appState.epiSettings.general.planningHorizonYears || 5;
  if (planningInput) {
    const phVal = Number(planningInput.value);
    if (!isNaN(phVal) && phVal > 0) {
      planningHorizonYears = phVal;
      appState.epiSettings.general.planningHorizonYears = phVal;
    }
  }

  const oppToggle = getElement("opp-toggle");
  const oppIncluded = oppToggle
    ? oppToggle.classList.contains("on")
    : false;

  const scenarioNameEl = getElement("scenario-name");
  const scenarioNotesEl = getElement("scenario-notes");

  const scenarioName =
    (scenarioNameEl && scenarioNameEl.value.trim()) ||
    `${tier} ${mentorship} ${cohorts} cohorts`;
  const scenarioNotes = scenarioNotesEl ? scenarioNotesEl.value.trim() : "";

  return {
    tier,
    career,
    mentorship,
    delivery,
    response,
    costPerTraineePerMonth: costSlider,
    traineesPerCohort: trainees,
    cohorts,
    planningHorizonYears,
    opportunityCostIncluded: oppIncluded,
    name: scenarioName,
    notes: scenarioNotes,
    preferenceModel:
      "Mixed logit preference study (perceived programme value)"
  };
}

/* ===========================
   Scenario computation
   =========================== */

function computeScenario(config) {
  const pref = computeEndorsementAndPerceivedValue(config);
  const costs = computeCosts(config);
  const epi = computeEpidemiological(config, pref.endorseRate);
  const capacity = computeCapacity(config);

  const months = epi.months;
  const perceivedValuePerTraineePerMonth =
    pref.perceivedValuePerTraineePerMonth;

  const perceivedValuePerCohort =
    perceivedValuePerTraineePerMonth * months * config.traineesPerCohort;
  const perceivedValueAllCohorts =
    perceivedValuePerCohort * config.cohorts;

  const epiBenefitPerCohort = epi.epiBenefitPerCohort;
  const epiBenefitAllCohorts = epi.epiBenefitAllCohorts;

  const netBenefitPerCohort =
    epiBenefitPerCohort - costs.totalEconomicCostPerCohort;
  const netBenefitAllCohorts =
    epiBenefitAllCohorts - costs.totalEconomicCostPerCohort * config.cohorts;

  const bcrPerCohort =
    costs.totalEconomicCostPerCohort > 0
      ? epiBenefitPerCohort / costs.totalEconomicCostPerCohort
      : null;

  const natTotalCost = costs.totalEconomicCostPerCohort * config.cohorts;
  const natBcr =
    natTotalCost > 0 ? epiBenefitAllCohorts / natTotalCost : null;

  return {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    config,
    preferenceModel: config.preferenceModel,
    endorseRate: pref.endorseRate,
    optOutRate: pref.optOutRate,
    perceivedValuePerTraineePerMonth,
    perceivedValuePerCohort,
    perceivedValueAllCohorts,
    costs,
    epi,
    epiBenefitPerCohort,
    epiBenefitAllCohorts,
    netBenefitPerCohort,
    netBenefitAllCohorts,
    bcrPerCohort,
    natTotalCost,
    natBcr,
    graduatesPerCohort: epi.graduatesPerCohort,
    graduatesAllCohorts: epi.graduatesAllCohorts,
    outbreaksPerYearPerCohort: epi.outbreaksPerYearPerCohort,
    outbreaksPerYearNational: epi.outbreaksPerYearNational,
    discountRate: epi.discountRate,
    planningYears: epi.planningYears,
    crossSectorMultiplier: epi.crossSectorMultiplier,
    capacity
  };
}

/* ===========================
   UI updates – Results
   =========================== */

function updateResultsUI(scenario) {
  const s = scenario;
  const c = scenario.config;
  const costs = scenario.costs;
  const epi = scenario.epi;

  const endorseEl = getElement("endorse-rate");
  const optOutEl = getElement("optout-rate");
  const wtpPerTraEl = getElement("wtp-per-trainee");
  const wtpTotalCohortEl = getElement("wtp-total-cohort");

  const progCostPerCohortEl = getElement("prog-cost-per-cohort");
  const totalCostEl = getElement("total-cost");
  const bcrEl = getElement("bcr");
  const netBenefitEl = getElement("net-benefit");

  const natOutbreaksEl = getElement("nat-outbreaks");
  const natTotalBenefitEl = getElement("nat-total-benefit");
  const natTotalCostEl = getElement("nat-total-cost");
  const natTotalWtpEl = getElement("nat-total-wtp");

  if (endorseEl)
    endorseEl.textContent = `${formatNumber(s.endorseRate, 1)}%`;
  if (optOutEl)
    optOutEl.textContent = `${formatNumber(s.optOutRate, 1)}%`;

  if (wtpPerTraEl)
    wtpPerTraEl.textContent = `₹${formatCurrencyINR(
      s.perceivedValuePerTraineePerMonth,
      0
    )}`;
  if (wtpTotalCohortEl)
    wtpTotalCohortEl.textContent = `₹${formatCurrencyINR(
      s.perceivedValuePerCohort,
      0
    )}`;

  if (progCostPerCohortEl)
    progCostPerCohortEl.textContent = `₹${formatCurrencyINR(
      costs.directProgrammeCostPerCohort,
      0
    )}`;

  if (totalCostEl)
    totalCostEl.textContent = `₹${formatCurrencyINR(
      costs.totalEconomicCostPerCohort * c.cohorts,
      0
    )}`;

  if (bcrEl)
    bcrEl.textContent =
      s.natBcr !== null ? formatNumber(s.natBcr, 2) : "-";

  if (netBenefitEl)
    netBenefitEl.textContent = `₹${formatCurrencyINR(
      s.netBenefitAllCohorts,
      0
    )}`;

  if (natOutbreaksEl)
    natOutbreaksEl.textContent = formatNumber(
      epi.outbreaksPerYearNational,
      1
    );
  if (natTotalBenefitEl)
    natTotalBenefitEl.textContent = `₹${formatCurrencyINR(
      s.epiBenefitAllCohorts,
      0
    )}`;
  if (natTotalCostEl)
    natTotalCostEl.textContent = `₹${formatCurrencyINR(
      s.natTotalCost,
      0
    )}`;
  if (natTotalWtpEl)
    natTotalWtpEl.textContent = `₹${formatCurrencyINR(
      s.perceivedValueAllCohorts,
      0
    )}`;

  updateCostingDetailsUI(scenario);
  updateCapacityUI(scenario);
  updateCharts(scenario);
}

/* ===========================
   UI – Costing details
   =========================== */

function updateCostingDetailsUI(scenario) {
  const c = scenario.config;
  const costs = scenario.costs;

  const directCostEl = getElement("cost-direct-total");
  const econCostEl = getElement("cost-economic-total");
  const mentorBaseEl = getElement("cost-mentor-base");
  const mentorMultiplierEl = getElement("cost-mentor-multiplier");
  const mentorPerCohortEl = getElement("cost-mentor-per-cohort");
  const mentorTotalEl = getElement("cost-mentor-total");

  if (mentorBaseEl)
    mentorBaseEl.textContent = `₹${formatCurrencyINR(
      costs.mentorBaseCostPerCohort,
      0
    )}`;
  if (mentorMultiplierEl)
    mentorMultiplierEl.textContent = formatNumber(
      costs.mentorshipMultiplier,
      2
    );
  if (mentorPerCohortEl)
    mentorPerCohortEl.textContent = `₹${formatCurrencyINR(
      costs.mentorCostPerCohort,
      0
    )}`;
  if (mentorTotalEl)
    mentorTotalEl.textContent = `₹${formatCurrencyINR(
      costs.mentorCostAllCohorts,
      0
    )}`;

  if (directCostEl)
    directCostEl.textContent = `₹${formatCurrencyINR(
      costs.directCostPerCohort * c.cohorts,
      0
    )}`;
  if (econCostEl)
    econCostEl.textContent = `₹${formatCurrencyINR(
      costs.totalEconomicCostPerCohort * c.cohorts,
      0
    )}`;
}

/* ===========================
   UI – Capacity & feasibility
   =========================== */

function updateCapacityUI(scenario) {
  const cap = scenario.capacity;

  const statusEl = getElement("capacity-status");
  const detailEl = getElement("capacity-detail");

  if (statusEl) statusEl.textContent = cap.status;

  if (detailEl) {
    const lines = [];
    lines.push(
      `Required mentors per cohort: ${formatNumber(
        cap.requiredMentorsPerCohort,
        0
      )}`
    );
    lines.push(
      `Required mentors nationally: ${formatNumber(
        cap.requiredMentorsNational,
        0
      )}`
    );
    lines.push(
      `Available mentors: ${formatNumber(cap.availableMentors, 0)}`
    );
    if (cap.shortfall > 0) {
      lines.push(
        `Mentor shortfall: ${formatNumber(cap.shortfall, 0)}`
      );
    }
    if (cap.siteMessage) {
      lines.push(cap.siteMessage);
    }
    detailEl.textContent = lines.join(" | ");
  }
}

/* ===========================
   Charts
   =========================== */

function ensureChart(ctxId, type, data, options) {
  const canvas = getElement(ctxId);
  if (!canvas || !window.Chart) return null;
  const ctx = canvas.getContext("2d");
  return new Chart(ctx, { type, data, options });
}

function updateCharts(scenario) {
  if (!window.Chart) return;

  // Uptake chart
  const uptakeData = {
    labels: ["Endorsement", "Opt-out"],
    datasets: [
      {
        label: "Stakeholder support",
        data: [scenario.endorseRate, scenario.optOutRate]
      }
    ]
  };
  const uptakeOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100 }
    }
  };
  if (appState.charts.uptake) {
    appState.charts.uptake.data = uptakeData;
    appState.charts.uptake.options = uptakeOptions;
    appState.charts.uptake.update();
  } else {
    appState.charts.uptake = ensureChart(
      "chart-uptake",
      "bar",
      uptakeData,
      uptakeOptions
    );
  }

  // Epidemiology chart
  const epi = scenario.epi;
  const epiData = {
    labels: ["Graduates (all cohorts)", "Outbreak responses / year"],
    datasets: [
      {
        label: "Epidemiological outputs",
        data: [epi.graduatesAllCohorts, epi.outbreaksPerYearNational]
      }
    ]
  };
  const epiOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true }
    }
  };
  if (appState.charts.epi) {
    appState.charts.epi.data = epiData;
    appState.charts.epi.options = epiOptions;
    appState.charts.epi.update();
  } else {
    appState.charts.epi = ensureChart(
      "chart-epi",
      "bar",
      epiData,
      epiOptions
    );
  }

  // Benefit–cost ratio chart
  const bcrData = {
    labels: ["Benefit–cost ratio"],
    datasets: [
      {
        label: "BCR",
        data: [scenario.natBcr || 0]
      }
    ]
  };
  const bcrOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true }
    }
  };
  if (appState.charts.bcr) {
    appState.charts.bcr.data = bcrData;
    appState.charts.bcr.options = bcrOptions;
    appState.charts.bcr.update();
  } else {
    appState.charts.bcr = ensureChart(
      "chart-bcr",
      "bar",
      bcrData,
      bcrOptions
    );
  }
}

/* ===========================
   Saved scenarios and exports
   =========================== */

function buildScenarioTable() {
  const tbody = document.querySelector("#scenario-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  appState.savedScenarios.forEach((scenario) => {
    const c = scenario.config;
    const costs = scenario.costs;

    const tr = document.createElement("tr");
    const tierLabel =
      c.tier === "frontline"
        ? "Frontline"
        : c.tier === "intermediate"
        ? "Intermediate"
        : "Advanced";
    const mentorshipLabel =
      c.mentorship === "low"
        ? "Low"
        : c.mentorship === "medium"
        ? "Medium"
        : "High";
    const careerLabel =
      c.career === "certificate"
        ? "Certificate"
        : c.career === "uniqual"
        ? "University qualification"
        : "Government career pathway";

    tr.innerHTML = `
      <td><input type="checkbox" data-scenario-id="${scenario.id}" /></td>
      <td>${c.name || "Scenario"}</td>
      <td>
        <span class="chip chip-tier">${tierLabel}</span>
        <span class="chip chip-mentorship">${mentorshipLabel} mentorship</span>
        <span class="chip chip-incentive">${careerLabel}</span>
      </td>
      <td>${tierLabel}</td>
      <td>${careerLabel}</td>
      <td>${mentorshipLabel}</td>
      <td>${
        c.delivery === "blended"
          ? "Blended"
          : c.delivery === "inperson"
          ? "Fully in person"
          : "Fully online"
      }</td>
      <td>Within 7 days</td>
      <td class="numeric-cell">${formatNumber(c.cohorts, 0)}</td>
      <td class="numeric-cell">${formatNumber(
        c.traineesPerCohort,
        0
      )}</td>
      <td class="numeric-cell">₹${formatCurrencyINR(
        c.costPerTraineePerMonth,
        0
      )}</td>
      <td>${scenario.preferenceModel}</td>
      <td class="numeric-cell">${formatNumber(
        scenario.endorseRate,
        1
      )}%</td>
      <td class="numeric-cell">₹${formatCurrencyINR(
        scenario.perceivedValuePerTraineePerMonth,
        0
      )}</td>
      <td class="numeric-cell">₹${formatCurrencyINR(
        scenario.perceivedValueAllCohorts,
        0
      )}</td>
      <td class="numeric-cell">${
        scenario.natBcr !== null ? formatNumber(scenario.natBcr, 2) : "-"
      }</td>
      <td class="numeric-cell">₹${formatCurrencyINR(
        scenario.natTotalCost,
        0
      )}</td>
      <td class="numeric-cell">₹${formatCurrencyINR(
        scenario.epiBenefitAllCohorts,
        0
      )}</td>
      <td class="numeric-cell">₹${formatCurrencyINR(
        scenario.netBenefitAllCohorts,
        0
      )}</td>
      <td class="numeric-cell">${formatNumber(
        scenario.outbreaksPerYearNational,
        1
      )}</td>
      <td class="numeric-cell">₹${formatCurrencyINR(
        costs.mentorCostPerCohort,
        0
      )} / cohort</td>
      <td class="numeric-cell">₹${formatCurrencyINR(
        costs.mentorCostAllCohorts,
        0
      )}</td>
      <td>${c.notes || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

function exportScenariosToExcel(includeAssumptions = true) {
  if (!window.XLSX) return;

  const wb = XLSX.utils.book_new();
  const rows = [];
  rows.push([
    "Name",
    "Tier",
    "Career",
    "Mentorship",
    "Delivery",
    "Response time (days)",
    "Cohorts",
    "Trainees per cohort",
    "Cost per trainee per month (INR)",
    "Endorsement (%)",
    "Perceived programme value per trainee per month (INR)",
    "Total perceived programme value all cohorts (INR)",
    "Mentor cost per cohort (INR)",
    "Total mentor cost all cohorts (INR)",
    "Total direct cost all cohorts (INR)",
    "Total economic cost all cohorts (INR)",
    "Indicative epidemiological benefit all cohorts (INR)",
    "Net benefit all cohorts (INR)",
    "Benefit–cost ratio (epidemiological benefits)"
  ]);

  appState.savedScenarios.forEach((s) => {
    const c = s.config;
    const costs = s.costs;
    rows.push([
      c.name || "",
      c.tier,
      c.career,
      c.mentorship,
      c.delivery,
      c.response,
      c.cohorts,
      c.traineesPerCohort,
      c.costPerTraineePerMonth,
      s.endorseRate,
      s.perceivedValuePerTraineePerMonth,
      s.perceivedValueAllCohorts,
      costs.mentorCostPerCohort,
      costs.mentorCostAllCohorts,
      costs.directCostPerCohort * c.cohorts,
      s.natTotalCost,
      s.epiBenefitAllCohorts,
      s.netBenefitAllCohorts,
      s.natBcr
    ]);
  });

  const scenarioSheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, scenarioSheet, "Scenarios");

  if (includeAssumptions) {
    const a = buildAssumptionsObject();
    const ar = [
      ["Assumption", "Value"],
      ["Planning horizon (years)", a.planningHorizonYears],
      ["Discount rate (%)", a.discountRatePercent],
      ["Completion rate (%)", a.completionRatePercent],
      [
        "Outbreak responses per graduate per year",
        a.outbreaksPerGradPerYear
      ],
      ["Value per outbreak (INR)", a.valuePerOutbreak],
      [
        "Non-outbreak value per graduate per year (INR)",
        a.nonOutbreakValue || "Not used"
      ],
      ["Opportunity cost included", a.opportunityCostIncluded ? "Yes" : "No"],
      [
        "Mentor cost base per cohort (INR)",
        a.mentorBaseCostPerCohort
      ],
      ["Mentorship multiplier", a.mentorshipMultiplier],
      [
        "Cross-sector benefit multiplier",
        a.crossSectorBenefitMultiplier
      ],
      ["Available mentors nationally", a.availableMentors],
      ["Available sites", a.availableSites || "Not specified"],
      [
        "Max cohorts per site per year",
        a.maxCohortsPerSite || "Not specified"
      ]
    ];
    const assSheet = XLSX.utils.aoa_to_sheet(ar);
    XLSX.utils.book_append_sheet(wb, assSheet, "Assumptions");
  }

  XLSX.writeFile(wb, "steps_saved_scenarios.xlsx");
}

function exportScenariosToPdfStandard() {
  if (!window.jspdf || !window.jspdf.jsPDF) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });

  let y = 10;
  doc.setFontSize(14);
  doc.text(
    "STEPS FETP India Decision Aid - Saved scenarios",
    10,
    y
  );
  y += 8;
  doc.setFontSize(10);

  appState.savedScenarios.forEach((s, idx) => {
    const c = s.config;
    const costs = s.costs;
    const epi = s.epi;
    if (y > 190) {
      doc.addPage();
      y = 10;
    }
    doc.text(`${idx + 1}. ${c.name || "Scenario"}`, 10, y);
    y += 5;
    doc.text(
      `Tier: ${c.tier} | Career: ${c.career} | Mentorship: ${
        c.mentorship
      } | Delivery: ${c.delivery} | Response: ${c.response} days`,
      10,
      y
    );
    y += 5;
    doc.text(
      `Cohorts: ${c.cohorts}, Trainees per cohort: ${
        c.traineesPerCohort
      }, Cost per trainee per month (INR): ${formatNumber(
        c.costPerTraineePerMonth,
        0
      )}`,
      10,
      y
    );
    y += 5;
    doc.text(
      `Endorsement: ${formatNumber(
        s.endorseRate,
        1
      )}% | Perceived programme value per trainee per month (INR): ${formatNumber(
        s.perceivedValuePerTraineePerMonth,
        0
      )}`,
      10,
      y
    );
    y += 5;
    doc.text(
      `Total perceived programme value all cohorts (INR): ${formatNumber(
        s.perceivedValueAllCohorts,
        0
      )}`,
      10,
      y
    );
    y += 5;
    doc.text(
      `Total economic cost all cohorts (INR): ${formatNumber(
        s.natTotalCost,
        0
      )} | Epidemiological benefits all cohorts (INR): ${formatNumber(
        s.epiBenefitAllCohorts,
        0
      )}`,
      10,
      y
    );
    y += 5;
    doc.text(
      `Net benefit (INR): ${formatNumber(
        s.netBenefitAllCohorts,
        0
      )} | Benefit–cost ratio: ${
        s.natBcr !== null ? formatNumber(s.natBcr, 2) : "-"
      }`,
      10,
      y
    );
    y += 7;
  });

  // Assumptions box
  y += 5;
  if (y > 180) {
    doc.addPage();
    y = 10;
  }
  doc.setFontSize(11);
  doc.text("Assumptions used", 10, y);
  y += 6;
  doc.setFontSize(9);
  const a = buildAssumptionsObject();
  const lines = buildAssumptionsLines(a);
  lines.forEach((line) => {
    doc.text(line, 10, y);
    y += 4;
  });

  doc.save("steps_saved_scenarios.pdf");
}

// Brief 2-page export (Requirement F)
function exportScenariosToPdfBrief() {
  if (!window.jspdf || !window.jspdf.jsPDF) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  let y = 10;

  // Select top 3 scenarios by net benefit
  const top = [...appState.savedScenarios]
    .sort(
      (a, b) => (b.netBenefitAllCohorts || 0) - (a.netBenefitAllCohorts || 0)
    )
    .slice(0, 3);

  // Page 1: headline recommendation + table
  doc.setFontSize(14);
  doc.text("STEPS FETP India – Brief summary", 10, y);
  y += 8;
  doc.setFontSize(11);
  if (top.length > 0) {
    const best = top[0];
    doc.text(
      `Headline: Configuration "${best.config.name}" appears most attractive on net benefit and perceived value.`,
      10,
      y
    );
    y += 6;
  }

  doc.setFontSize(10);
  const headers = [
    "Name",
    "Endorse (%)",
    "Perceived value (INR, all cohorts)",
    "Direct cost (INR, all cohorts)",
    "Economic cost (INR, all cohorts)",
    "Epi benefits (INR, all cohorts)",
    "Net benefit (INR)",
    "BCR"
  ];
  let x = 10;
  headers.forEach((h) => {
    doc.text(h, x, y);
    x += 45;
  });
  y += 5;

  top.forEach((s) => {
    const c = s.config;
    const costs = s.costs;
    x = 10;
    const row = [
      c.name || "",
      `${formatNumber(s.endorseRate, 1)}%`,
      formatNumber(s.perceivedValueAllCohorts, 0),
      formatNumber(costs.directCostPerCohort * c.cohorts, 0),
      formatNumber(s.natTotalCost, 0),
      formatNumber(s.epiBenefitAllCohorts, 0),
      formatNumber(s.netBenefitAllCohorts, 0),
      s.natBcr !== null ? formatNumber(s.natBcr, 2) : "-"
    ];
    row.forEach((val) => {
      doc.text(String(val), x, y);
      x += 45;
    });
    y += 5;
  });

  // Page 2: assumptions + feasibility + enablers/risks
  doc.addPage();
  y = 10;
  doc.setFontSize(12);
  doc.text("Assumptions and feasibility", 10, y);
  y += 6;
  doc.setFontSize(9);
  const a = buildAssumptionsObject();
  const lines = buildAssumptionsLines(a);
  lines.forEach((line) => {
    doc.text(line, 10, y);
    y += 4;
  });

  y += 4;
  doc.setFontSize(11);
  doc.text("Implementation enablers and risks", 10, y);
  y += 6;
  doc.setFontSize(9);

  const enablersEl = getElement("enablers-text");
  const risksEl = getElement("risks-text");
  const enablers = enablersEl ? enablersEl.value.trim() : "";
  const risks = risksEl ? risksEl.value.trim() : "";

  doc.text("Enablers:", 10, y);
  y += 4;
  doc.text(enablers || "To be completed", 15, y);
  y += 6;
  doc.text("Risks:", 10, y);
  y += 4;
  doc.text(risks || "To be completed", 15, y);

  doc.save("steps_brief_summary.pdf");
}

/* ===========================
   Assumptions object
   =========================== */

function buildAssumptionsObject() {
  const g = appState.epiSettings.general;
  const t = appState.epiSettings.tiers.frontline;

  const current = appState.currentScenario;
  const c = current ? current.config : null;
  const costs = current ? current.costs : null;
  const cap = current ? current.capacity : null;

  const oppIncluded = c ? c.opportunityCostIncluded : false;

  return {
    planningHorizonYears: g.planningHorizonYears,
    discountRatePercent: g.epiDiscountRate * 100,
    completionRatePercent: t.completionRate * 100,
    outbreaksPerGradPerYear: t.outbreaksPerGraduatePerYear,
    valuePerOutbreak: t.valuePerOutbreak,
    nonOutbreakValue: t.valuePerGraduate || 0,
    opportunityCostIncluded: oppIncluded,
    mentorBaseCostPerCohort: costs ? costs.mentorBaseCostPerCohort : 0,
    mentorshipMultiplier: costs ? costs.mentorshipMultiplier : 1.0,
    crossSectorBenefitMultiplier: current
      ? current.crossSectorMultiplier
      : 1.0,
    availableMentors: cap ? cap.availableMentors : readNumber("available-mentors", 200),
    availableSites: cap ? cap.availableSites : null,
    maxCohortsPerSite: cap ? cap.maxCohortsPerSite : null
  };
}

function buildAssumptionsLines(a) {
  const lines = [];
  lines.push(`Planning horizon: ${formatNumber(a.planningHorizonYears, 0)} years`);
  lines.push(`Discount rate: ${formatNumber(a.discountRatePercent, 1)} percent`);
  lines.push(`Completion rate: ${formatNumber(a.completionRatePercent, 1)} percent`);
  lines.push(
    `Outbreak responses per graduate per year: ${formatNumber(
      a.outbreaksPerGradPerYear,
      2
    )}`
  );
  lines.push(
    `Value per outbreak: ₹${formatCurrencyINR(a.valuePerOutbreak, 0)}`
  );
  lines.push(
    `Non-outbreak value per graduate per year: ${
      a.nonOutbreakValue ? `₹${formatCurrencyINR(a.nonOutbreakValue, 0)}` : "Not used"
    }`
  );
  lines.push(
    `Opportunity cost included: ${a.opportunityCostIncluded ? "Yes" : "No"}`
  );
  lines.push(
    `Mentor cost base per cohort: ₹${formatCurrencyINR(
      a.mentorBaseCostPerCohort,
      0
    )}`
  );
  lines.push(
    `Mentorship multiplier: ${formatNumber(a.mentorshipMultiplier, 2)}`
  );
  lines.push(
    `Cross-sector benefit multiplier: ${formatNumber(
      a.crossSectorBenefitMultiplier,
      2
    )}`
  );
  lines.push(
    `Available mentors nationally: ${formatNumber(a.availableMentors, 0)}`
  );
  lines.push(
    `Available sites: ${
      a.availableSites !== null ? formatNumber(a.availableSites, 0) : "Not specified"
    }`
  );
  lines.push(
    `Max cohorts per site per year: ${
      a.maxCohortsPerSite !== null
        ? formatNumber(a.maxCohortsPerSite, 0)
        : "Not specified"
    }`
  );
  return lines;
}

/* ===========================
   Copilot & ChatGPT briefing
   (Requirement G)
   =========================== */

function buildScenarioJsonForPrompt() {
  if (!appState.currentScenario) return "{}";
  const s = appState.currentScenario;
  const minimal = {
    config: s.config,
    endorseRate: s.endorseRate,
    optOutRate: s.optOutRate,
    perceivedProgrammeValuePerTraineePerMonth:
      s.perceivedValuePerTraineePerMonth,
    perceivedProgrammeValueAllCohorts: s.perceivedValueAllCohorts,
    costs: s.costs,
    epi: s.epi,
    netBenefitAllCohorts: s.netBenefitAllCohorts,
    natBcr: s.natBcr,
    capacity: s.capacity,
    assumptions: buildAssumptionsObject()
  };
  return JSON.stringify(minimal, null, 2);
}

function buildBriefingPrompt(baseIntro) {
  const scenarioJson = buildScenarioJsonForPrompt();
  const lines = [];
  lines.push(baseIntro);
  lines.push("");
  lines.push(
    "Use the following JSON from the STEPS decision aid as your quantitative input. Do not fabricate numbers beyond this JSON."
  );
  lines.push("");
  lines.push("```json");
  lines.push(scenarioJson);
  lines.push("```");
  lines.push("");
  lines.push(
    "Write a concise, policy-ready briefing for senior decision makers in India. Use clear language, avoid technical jargon, and include at least one compact table summarising key scenarios and benefit–cost results."
  );
  return lines.join("\n");
}

function refreshBriefingPrompts() {
  if (!appState.currentScenario) return;

  const copilotIntro =
    "You are a senior health economist preparing a policy note on strengthening and scaling FETP in India using the STEPS decision aid. Produce a structured briefing of 2–4 pages suitable for Microsoft Word or PowerPoint.";
  const chatgptIntro =
    "You are preparing a 2-page policy brief or slide-ready summary for senior officials on strengthening and scaling FETP in India based on the STEPS decision aid results.";

  const copilotPrompt = buildBriefingPrompt(copilotIntro);
  const chatgptPrompt = buildBriefingPrompt(chatgptIntro);

  const copilotOutput = getElement("copilot-prompt-output");
  if (copilotOutput) copilotOutput.value = copilotPrompt;

  const chatgptOutput = getElement("chatgpt-prompt-output");
  if (chatgptOutput) chatgptOutput.value = chatgptPrompt;

  const statusPill = getElement("copilot-status-pill");
  const statusText = getElement("copilot-status-text");
  if (statusPill) statusPill.textContent = "Ready";
  if (statusText)
    statusText.textContent =
      "Prompts are based on the latest applied configuration and saved assumptions.";
}

function copyTextFromElement(elId) {
  const el = getElement(elId);
  if (!el) return;
  el.select();
  document.execCommand("copy");
}

/* ===========================
   Event handlers
   =========================== */

function applyConfigurationAndRefresh() {
  const config = getConfigFromForm();
  const scenario = computeScenario(config);
  appState.currentScenario = scenario;
  updateResultsUI(scenario);
}

function saveCurrentScenario() {
  if (!appState.currentScenario) return;
  appState.savedScenarios.push(appState.currentScenario);
  buildScenarioTable();
}

function initEventHandlers() {
  const updateBtn = getElement("update-results");
  if (updateBtn) {
    updateBtn.addEventListener("click", () => {
      applyConfigurationAndRefresh();
    });
  }

  const saveBtn = getElement("save-scenario");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!appState.currentScenario) {
        applyConfigurationAndRefresh();
      }
      if (appState.currentScenario) {
        saveCurrentScenario();
      }
    });
  }

  const exportExcelBtn = getElement("export-excel");
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () =>
      exportScenariosToExcel(true)
    );
  }

  const exportPdfBtn = getElement("export-pdf");
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () =>
      exportScenariosToPdfStandard()
    );
  }

  const exportPdfBriefBtn = getElement("export-pdf-brief");
  if (exportPdfBriefBtn) {
    exportPdfBriefBtn.addEventListener("click", () =>
      exportScenariosToPdfBrief()
    );
  }

  // Copilot + ChatGPT buttons
  const copilotCopyBtn = getElement("copilot-open-and-copy-btn");
  if (copilotCopyBtn) {
    copilotCopyBtn.addEventListener("click", () => {
      applyConfigurationAndRefresh();
      refreshBriefingPrompts();
      copyTextFromElement("copilot-prompt-output");
      window.open("https://copilot.microsoft.com", "_blank");
    });
  }

  const copilotCopyOnlyBtn = getElement("copilot-copy-btn");
  if (copilotCopyOnlyBtn) {
    copilotCopyOnlyBtn.addEventListener("click", () => {
      applyConfigurationAndRefresh();
      refreshBriefingPrompts();
      copyTextFromElement("copilot-prompt-output");
    });
  }

  const chatgptCopyBtn = getElement("chatgpt-copy-btn");
  if (chatgptCopyBtn) {
    chatgptCopyBtn.addEventListener("click", () => {
      applyConfigurationAndRefresh();
      refreshBriefingPrompts();
      copyTextFromElement("chatgpt-prompt-output");
    });
  }

  const downloadPromptsBtn = getElement("download-prompts-txt");
  if (downloadPromptsBtn) {
    downloadPromptsBtn.addEventListener("click", () => {
      applyConfigurationAndRefresh();
      refreshBriefingPrompts();
      const copilotOutput = getElement("copilot-prompt-output");
      const chatgptOutput = getElement("chatgpt-prompt-output");
      const blob = new Blob(
        [
          "=== Copilot prompt ===\n\n",
          copilotOutput ? copilotOutput.value : "",
          "\n\n=== ChatGPT prompt ===\n\n",
          chatgptOutput ? chatgptOutput.value : ""
        ],
        { type: "text/plain;charset=utf-8" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "steps_prompts.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Validation hints
  const traineesInput = getElement("trainees");
  const cohortsInput = getElement("cohorts");
  const costSliderInput = getElement("cost-slider");

  function checkScale() {
    const t = readNumber("trainees", 0);
    const c = readNumber("cohorts", 0);
    const warningEl = getElement("scale-warning");
    if (!warningEl) return;
    if (t * c > 2000) {
      warningEl.textContent =
        "Warning: Very large number of trainees; please check realism with programme planners.";
    } else {
      warningEl.textContent = "";
    }
  }

  function checkCost() {
    const cost = readNumber("cost-slider", 0);
    const el = getElement("cost-warning");
    if (!el) return;
    if (cost <= 10000 || cost >= 300000) {
      el.textContent =
        "Caution: extreme cost level; confirm against recent cost data.";
    } else {
      el.textContent = "";
    }
  }

  if (traineesInput) traineesInput.addEventListener("change", checkScale);
  if (cohortsInput) cohortsInput.addEventListener("change", checkScale);
  if (costSliderInput) costSliderInput.addEventListener("input", checkCost);
}

/* ===========================
   Init
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initEventHandlers();
  applyConfigurationAndRefresh();
});
