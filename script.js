/* ===================================================
   STEPS – FETP India Decision Aid
   Simplified implementation with:
   - Mentor support cost and direct vs economic costs
   - Capacity and feasibility checks
   - Perceived programme value (from preference study)
   - Cross-sector/One Health multiplier
   - Assumptions export, Excel export, PDF (standard + brief)
   - Copilot and ChatGPT briefing prompts
   =================================================== */

/* ===========================
   Global state
   =========================== */

const appState = {
  config: {
    tier: "frontline",
    career: "none",
    mentorship: "low",
    delivery: "blended",
    responseDays: 7,
    cohorts: 4,
    traineesPerCohort: 25,
    costPerTraineePerMonth: 30000,
    includeOpportunityCost: true
  },
  settings: {
    planningYears: 5,
    discountRate: 0.03,
    completionRate: 0.9,
    outbreaksPerGradPerYear: 0.5,
    valuePerOutbreak: 4000000,
    nonOutbreakValuePerGradPerYear: 0,
    availableMentors: 200,
    availableSites: 10,
    maxCohortsPerSitePerYear: 4,
    crossSectorMultiplier: 1,
    mentorBaseCostPerCohort: 400000
  },
  currentScenario: null,
  savedScenarios: [],
  charts: {
    endorsement: null,
    national: null
  }
};

/* ===========================
   Utility functions
   =========================== */

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function formatNumber(x, decimals = 0) {
  if (x === null || x === undefined || isNaN(x)) return "–";
  return Number(x).toLocaleString("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

function formatCurrencyINR(x, decimals = 0) {
  if (x === null || x === undefined || isNaN(x)) return "–";
  return "₹" + Number(x).toLocaleString("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
}

function presentValueFactor(discountRate, years) {
  const r = discountRate;
  if (r <= 0) return years;
  return (1 - Math.pow(1 + r, -years)) / r;
}

function showToast(message, type = "info") {
  // Minimal inline toast: console + alert for now to stay lightweight.
  console.log(`[${type.toUpperCase()}] ${message}`);
}

/* ===========================
   Core model functions
   =========================== */

/**
 * Simple months per tier approximation.
 */
function getTierMonths(tier) {
  if (tier === "frontline") return 6;
  if (tier === "intermediate") return 12;
  return 18;
}

/**
 * Simple preference model delivering endorsement and perceived programme value.
 * This is a stylised approximation of the underlying DCE-based preference model.
 */
function computePreferenceMetrics(config) {
  let baseUtility = 0;

  // Tier effects
  if (config.tier === "frontline") baseUtility += 0.0;
  else if (config.tier === "intermediate") baseUtility += 0.2;
  else baseUtility += 0.35;

  // Career incentive
  if (config.career === "certificate") baseUtility += 0.1;
  else if (config.career === "university") baseUtility += 0.25;
  else if (config.career === "govt_pathway") baseUtility += 0.4;

  // Mentorship intensity
  if (config.mentorship === "medium") baseUtility += 0.15;
  else if (config.mentorship === "high") baseUtility += 0.3;

  // Delivery
  if (config.delivery === "inperson") baseUtility += 0.1;
  else if (config.delivery === "online") baseUtility -= 0.1;

  // Response time (shorter better)
  const resp = safeNumber(config.responseDays, 7);
  baseUtility += clamp((7 - resp) * 0.02, -0.3, 0.3);

  // Convert utility into endorsement probability
  const endorseProb = 1 / (1 + Math.exp(-baseUtility));
  const endorseRate = endorseProb * 100;
  const optOutRate = 100 - endorseRate;

  // Perceived programme value per trainee per month (INR)
  const baseWTP = 20000;
  const wtpPerTraineePerMonth = baseWTP * (0.5 + endorseProb); // ranges around 10–30k

  return {
    endorseRate,
    optOutRate,
    wtpPerTraineePerMonth
  };
}

/**
 * Cost structure:
 * - Programme cost per cohort = cost per trainee / month × trainees × months
 * - Mentor support cost per cohort = base mentor cost × multiplier(mentorship)
 * - Direct cost per cohort = programme + mentor support cost
 * - Opportunity cost per cohort = programme cost × 0.4 (if included)
 * - Economic cost per cohort = direct cost + opportunity cost
 */
function getMentorshipMultiplier(mentorship) {
  if (mentorship === "medium") return 1.3;
  if (mentorship === "high") return 1.7;
  return 1.0;
}

function computeCosts(config, settings) {
  const months = getTierMonths(config.tier);
  const trainees = safeNumber(config.traineesPerCohort, 0);
  const cohorts = safeNumber(config.cohorts, 0);
  const costPerTraineePerMonth = safeNumber(config.costPerTraineePerMonth, 0);

  const programmeCostPerCohort = costPerTraineePerMonth * trainees * months;

  const mentorshipMultiplier = getMentorshipMultiplier(config.mentorship);
  const mentorBase = safeNumber(settings.mentorBaseCostPerCohort, 0);
  const mentorCostPerCohort = mentorBase * mentorshipMultiplier;

  const directCostPerCohort = programmeCostPerCohort + mentorCostPerCohort;

  const oppRate = config.includeOpportunityCost ? 0.4 : 0;
  const opportunityCostPerCohort = programmeCostPerCohort * oppRate;

  const economicCostPerCohort = directCostPerCohort + opportunityCostPerCohort;

  const totalMentorCostAllCohorts = mentorCostPerCohort * cohorts;
  const totalEconomicCostAllCohorts = economicCostPerCohort * cohorts;
  const totalDirectCostAllCohorts = directCostPerCohort * cohorts;

  return {
    months,
    programmeCostPerCohort,
    mentorCostPerCohort,
    mentorshipMultiplier,
    directCostPerCohort,
    opportunityCostPerCohort,
    economicCostPerCohort,
    totalMentorCostAllCohorts,
    totalEconomicCostAllCohorts,
    totalDirectCostAllCohorts
  };
}

/**
 * Epidemiological benefit model:
 * - Graduates per cohort = trainees × completion
 * - Graduates all cohorts = above × cohorts
 * - Outbreaks per year per cohort = graduates per cohort × outbreaksPerGrad
 * - Outbreaks per year national = outbreaks per cohort × cohorts
 * - Benefits per cohort = (outbreaks per year per cohort × valuePerOutbreak
 *   + graduates per cohort × nonOutbreakValuePerGradPerYear) × PV × cross-sector multiplier
 */
function computeEpidemiological(config, settings) {
  const months = getTierMonths(config.tier);
  const trainees = safeNumber(config.traineesPerCohort, 0);
  const cohorts = safeNumber(config.cohorts, 0);

  const completionRate = clamp(safeNumber(settings.completionRate, 0.9), 0, 1);
  const outbreaksPerGradPerYear = safeNumber(settings.outbreaksPerGradPerYear, 0.5);
  const valuePerOutbreak = safeNumber(settings.valuePerOutbreak, 0);
  const nonOutbreakValPerGrad = safeNumber(settings.nonOutbreakValuePerGradPerYear, 0);
  const years = safeNumber(settings.planningYears, 5);
  const discountRate = safeNumber(settings.discountRate, 0.03);
  const crossSectorMultiplier = clamp(safeNumber(settings.crossSectorMultiplier, 1), 0.8, 2);

  const graduatesPerCohort = trainees * completionRate;
  const graduatesAllCohorts = graduatesPerCohort * cohorts;

  const outbreaksPerYearPerCohort = graduatesPerCohort * outbreaksPerGradPerYear;
  const outbreaksPerYearNational = outbreaksPerYearPerCohort * cohorts;

  const pvFactor = presentValueFactor(discountRate, years);

  const outbreakPVPerCohort = outbreaksPerYearPerCohort * valuePerOutbreak * pvFactor;
  const nonOutbreakPVPerCohort = graduatesPerCohort * nonOutbreakValPerGrad * pvFactor;

  const epiBenefitPerCohortRaw = outbreakPVPerCohort + nonOutbreakPVPerCohort;
  const epiBenefitPerCohort = epiBenefitPerCohortRaw * crossSectorMultiplier;
  const epiBenefitAllCohorts = epiBenefitPerCohort * cohorts;

  return {
    months,
    graduatesPerCohort,
    graduatesAllCohorts,
    outbreaksPerYearPerCohort,
    outbreaksPerYearNational,
    outbreakPVPerCohort: outbreakPVPerCohort * crossSectorMultiplier,
    nonOutbreakPVPerCohort: nonOutbreakPVPerCohort * crossSectorMultiplier,
    epiBenefitPerCohort,
    epiBenefitAllCohorts,
    pvFactor,
    planningYears: years,
    discountRate,
    crossSectorMultiplier
  };
}

/**
 * Capacity and feasibility checks
 */
function getMentorCapacityPerIntensity(mentorship) {
  if (mentorship === "low") return 5;
  if (mentorship === "medium") return 3.5;
  return 2;
}

function computeCapacity(config, settings) {
  const traineesPerCohort = safeNumber(config.traineesPerCohort, 0);
  const cohorts = safeNumber(config.cohorts, 0);

  const capacityPerMentor = getMentorCapacityPerIntensity(config.mentorship);
  const requiredMentorsPerCohort = capacityPerMentor > 0 ? Math.ceil(traineesPerCohort / capacityPerMentor) : 0;
  const totalRequiredMentors = requiredMentorsPerCohort * cohorts;

  const availableMentors = Math.max(0, safeNumber(settings.availableMentors, 0));

  const mentorShortfall = Math.max(totalRequiredMentors - availableMentors, 0);

  const availableSites = Math.max(0, safeNumber(settings.availableSites, 0));
  const maxCohortsPerSitePerYear = Math.max(0, safeNumber(settings.maxCohortsPerSitePerYear, 0));

  const maxCohortsTotal = availableSites * maxCohortsPerSitePerYear;
  const cohortShortfall = Math.max(cohorts - maxCohortsTotal, 0);

  const withinMentorCapacity = mentorShortfall === 0;
  const withinSiteCapacity = cohortShortfall === 0 || maxCohortsTotal === 0;

  const feasible = withinMentorCapacity && withinSiteCapacity;

  let status = feasible ? "Within current capacity" : "Requires capacity expansion";
  let note = "";
  if (!withinMentorCapacity && !withinSiteCapacity) {
    note =
      "Mentor capacity and site capacity are both binding. Consider increasing mentor pool and expanding training hubs or reducing cohorts.";
  } else if (!withinMentorCapacity) {
    note = "Mentor capacity is binding. Consider recruiting more mentors or reducing trainees per cohort or cohorts.";
  } else if (!withinSiteCapacity) {
    note =
      "Site capacity is binding. Consider increasing the number of hubs or cohorts per site, or reducing planned cohorts.";
  } else {
    note = "The configuration appears feasible with current mentor and site capacity assumptions.";
  }

  return {
    capacityPerMentor,
    requiredMentorsPerCohort,
    totalRequiredMentors,
    availableMentors,
    mentorShortfall,
    availableSites,
    maxCohortsPerSitePerYear,
    maxCohortsTotal,
    cohortShortfall,
    feasible,
    status,
    note
  };
}

/**
 * Full scenario computation
 */
function computeScenario(config, settings) {
  const pref = computePreferenceMetrics(config);
  const costs = computeCosts(config, settings);
  const epi = computeEpidemiological(config, settings);
  const capacity = computeCapacity(config, settings);

  const wtpPerTraineePerMonth = pref.wtpPerTraineePerMonth;
  const months = costs.months;
  const trainees = safeNumber(config.traineesPerCohort, 0);
  const cohorts = safeNumber(config.cohorts, 0);

  const wtpPerCohort = wtpPerTraineePerMonth * months * trainees;
  const wtpAllCohorts = wtpPerCohort * cohorts;

  const epiBenefitPerCohort = epi.epiBenefitPerCohort;
  const epiBenefitAllCohorts = epi.epiBenefitAllCohorts;

  const netBenefitPerCohort = epiBenefitPerCohort - costs.economicCostPerCohort;
  const netBenefitAllCohorts = epiBenefitAllCohorts - costs.totalEconomicCostAllCohorts;

  const bcrPerCohort =
    costs.economicCostPerCohort > 0 ? epiBenefitPerCohort / costs.economicCostPerCohort : null;
  const natBcr = costs.totalEconomicCostAllCohorts > 0 ? epiBenefitAllCohorts / costs.totalEconomicCostAllCohorts : null;

  return {
    id: Date.now().toString(),
    name: "",
    config: { ...config },
    settings: { ...settings },
    endorseRate: pref.endorseRate,
    optOutRate: pref.optOutRate,
    wtpPerTraineePerMonth,
    wtpPerCohort,
    wtpAllCohorts,
    costs,
    epi,
    capacity,
    epiBenefitPerCohort,
    epiBenefitAllCohorts,
    netBenefitPerCohort,
    netBenefitAllCohorts,
    bcrPerCohort,
    natBcr
  };
}

/* ===========================
   Assumptions summary
   =========================== */

function buildAssumptionsSummary(settings, config) {
  const items = [];

  items.push(`Planning horizon: ${settings.planningYears} years`);
  items.push(`Discount rate: ${(settings.discountRate * 100).toFixed(1)}%`);
  items.push(`Completion rate: ${(settings.completionRate * 100).toFixed(1)}%`);
  items.push(`Outbreak responses per graduate per year: ${settings.outbreaksPerGradPerYear}`);
  items.push(`Value per outbreak influenced: ${formatCurrencyINR(settings.valuePerOutbreak, 0)}`);

  if (settings.nonOutbreakValuePerGradPerYear > 0) {
    items.push(
      `Non-outbreak value per graduate per year: ${formatCurrencyINR(
        settings.nonOutbreakValuePerGradPerYear,
        0
      )}`
    );
  } else {
    items.push("Non-outbreak value per graduate per year: not used (0)");
  }

  items.push(
    `Opportunity cost included: ${config.includeOpportunityCost ? "Yes (economic cost reported)" : "No (direct costs only)"}`
  );
  items.push(
    `Mentor support base cost per cohort: ${formatCurrencyINR(
      settings.mentorBaseCostPerCohort,
      0
    )} with mentorship multipliers L/M/H = 1.0/1.3/1.7`
  );

  items.push(`Available mentors nationally: ${settings.availableMentors}`);
  items.push(`Available training sites / hubs: ${settings.availableSites}`);
  items.push(`Max cohorts per site per year: ${settings.maxCohortsPerSitePerYear}`);
  items.push(`Cross-sector (One Health) benefit multiplier: ${settings.crossSectorMultiplier}`);

  return items;
}

function renderAssumptionsList(settings, config) {
  const ul = document.getElementById("assumptions-list");
  if (!ul) return;
  ul.innerHTML = "";
  const items = buildAssumptionsSummary(settings, config);
  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  });
}

/* ===========================
   UI: Tabs
   =========================== */

function initTabs() {
  const tabLinks = Array.from(document.querySelectorAll(".tab-link"));
  const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

  tabLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab-target");
      if (!targetId) return;
      tabLinks.forEach((b) => b.classList.remove("active"));
      tabPanels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPanel = document.getElementById(`tab-${targetId}`);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });
}

/* ===========================
   UI: Forms and reading values
   =========================== */

function readConfigForm() {
  const tier = document.getElementById("tier").value;
  const career = document.getElementById("career").value;
  const mentorship = document.getElementById("mentorship").value;
  const delivery = document.getElementById("delivery").value;
  const responseDays = safeNumber(document.getElementById("response").value, 7);
  const cohorts = safeNumber(document.getElementById("cohorts").value, 1);
  const traineesPerCohort = safeNumber(document.getElementById("trainees").value, 5);
  const costPerTraineePerMonth = safeNumber(document.getElementById("cost-per-trainee").value, 30000);
  const includeOpportunityCost = !!document.getElementById("opp-cost-toggle").checked;

  appState.config = {
    tier,
    career,
    mentorship,
    delivery,
    responseDays,
    cohorts,
    traineesPerCohort,
    costPerTraineePerMonth,
    includeOpportunityCost
  };

  const totalTrainees = cohorts * traineesPerCohort;
  const scaleWarning = document.getElementById("scale-warning");
  if (scaleWarning) {
    if (totalTrainees > 2000) scaleWarning.hidden = false;
    else scaleWarning.hidden = true;
  }
}

function applyConfigToForm() {
  const c = appState.config;
  document.getElementById("tier").value = c.tier;
  document.getElementById("career").value = c.career;
  document.getElementById("mentorship").value = c.mentorship;
  document.getElementById("delivery").value = c.delivery;
  document.getElementById("response").value = c.responseDays;
  document.getElementById("cohorts").value = c.cohorts;
  document.getElementById("trainees").value = c.traineesPerCohort;
  document.getElementById("cost-per-trainee").value = c.costPerTraineePerMonth;
  document.getElementById("opp-cost-toggle").checked = c.includeOpportunityCost;
}

function readSettingsForm() {
  const s = appState.settings;
  s.planningYears = safeNumber(document.getElementById("planning-years").value, s.planningYears);
  s.discountRate = safeNumber(document.getElementById("discount-rate").value, s.discountRate);
  s.completionRate = safeNumber(document.getElementById("completion-rate").value, s.completionRate);
  s.outbreaksPerGradPerYear = safeNumber(document.getElementById("outbreaks-per-grad").value, s.outbreaksPerGradPerYear);
  s.valuePerOutbreak = safeNumber(document.getElementById("value-per-outbreak").value, s.valuePerOutbreak);
  s.nonOutbreakValuePerGradPerYear = safeNumber(document.getElementById("non-outbreak-value").value, s.nonOutbreakValuePerGradPerYear);

  s.availableMentors = safeNumber(document.getElementById("available-mentors").value, s.availableMentors);
  s.availableSites = safeNumber(document.getElementById("available-sites").value, s.availableSites);
  s.maxCohortsPerSitePerYear = safeNumber(
    document.getElementById("max-cohorts-per-site").value,
    s.maxCohortsPerSitePerYear
  );
  s.crossSectorMultiplier = clamp(
    safeNumber(document.getElementById("cross-sector-multiplier").value, s.crossSectorMultiplier),
    0.8,
    2
  );
  s.mentorBaseCostPerCohort = safeNumber(document.getElementById("mentor-cost-base").value, s.mentorBaseCostPerCohort);

  // Also update the costing tab display for base mentor cost.
  document.getElementById("mentor-cost-base").value = s.mentorBaseCostPerCohort;
}

function applySettingsToForm() {
  const s = appState.settings;
  document.getElementById("planning-years").value = s.planningYears;
  document.getElementById("discount-rate").value = s.discountRate;
  document.getElementById("completion-rate").value = s.completionRate;
  document.getElementById("outbreaks-per-grad").value = s.outbreaksPerGradPerYear;
  document.getElementById("value-per-outbreak").value = s.valuePerOutbreak;
  document.getElementById("non-outbreak-value").value = s.nonOutbreakValuePerGradPerYear;
  document.getElementById("available-mentors").value = s.availableMentors;
  document.getElementById("available-sites").value = s.availableSites;
  document.getElementById("max-cohorts-per-site").value = s.maxCohortsPerSitePerYear;
  document.getElementById("cross-sector-multiplier").value = s.crossSectorMultiplier;
  document.getElementById("mentor-cost-base").value = s.mentorBaseCostPerCohort;
}

/* ===========================
   UI updates: results and tabs
   =========================== */

function updateCostingTab(scenario) {
  if (!scenario) return;
  const c = scenario.costs;
  const mm = c.mentorshipMultiplier;

  document.getElementById("mentor-multiplier").textContent = mm.toFixed(2);
  document.getElementById("mentor-cost-per-cohort").textContent = formatCurrencyINR(c.mentorCostPerCohort, 0);

  document.getElementById("cost-programme-direct").textContent = formatCurrencyINR(
    c.programmeCostPerCohort,
    0
  );
  document.getElementById("cost-mentor").textContent = formatCurrencyINR(c.mentorCostPerCohort, 0);
  document.getElementById("cost-direct-total").textContent = formatCurrencyINR(c.directCostPerCohort, 0);
  document.getElementById("cost-opportunity").textContent = formatCurrencyINR(c.opportunityCostPerCohort, 0);
  document.getElementById("cost-economic-total").textContent = formatCurrencyINR(c.economicCostPerCohort, 0);
}

function updateResultsTab(scenario) {
  if (!scenario) return;
  const c = scenario.costs;
  const epi = scenario.epi;

  document.getElementById("res-endorse-rate").textContent = formatNumber(scenario.endorseRate, 1) + "%";
  document.getElementById("res-optout-rate").textContent = formatNumber(scenario.optOutRate, 1) + "%";

  document.getElementById("res-wtp-per-trainee").textContent = formatCurrencyINR(
    scenario.wtpPerTraineePerMonth,
    0
  );
  document.getElementById("res-wtp-per-cohort").textContent = formatCurrencyINR(scenario.wtpPerCohort, 0);

  document.getElementById("res-direct-cost").textContent = formatCurrencyINR(c.directCostPerCohort, 0);
  document.getElementById("res-economic-cost").textContent = formatCurrencyINR(c.economicCostPerCohort, 0);

  document.getElementById("res-epi-benefit").textContent = formatCurrencyINR(epi.epiBenefitPerCohort, 0);
  document.getElementById("res-bcr").textContent =
    scenario.bcrPerCohort !== null ? formatNumber(scenario.bcrPerCohort, 2) : "–";
  document.getElementById("res-net-benefit").textContent = formatCurrencyINR(scenario.netBenefitPerCohort, 0);

  // Endorsement chart
  const ctx = document.getElementById("chart-endorsement");
  if (ctx && window.Chart) {
    if (appState.charts.endorsement) {
      appState.charts.endorsement.destroy();
    }
    appState.charts.endorsement = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Endorse programme", "Opt out"],
        datasets: [
          {
            label: "Share of stakeholders (%)",
            data: [scenario.endorseRate, scenario.optOutRate]
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, max: 100 }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

function updateCapacityTab(scenario) {
  if (!scenario) return;
  const cap = scenario.capacity;

  document.getElementById("cap-mentors-per-cohort").textContent = formatNumber(
    cap.requiredMentorsPerCohort,
    0
  );
  document.getElementById("cap-total-mentors").textContent = formatNumber(cap.totalRequiredMentors, 0);
  document.getElementById("cap-available-mentors").textContent = formatNumber(cap.availableMentors, 0);
  document.getElementById("cap-mentor-shortfall").textContent = formatNumber(cap.mentorShortfall, 0);

  document.getElementById("cap-available-sites").textContent = formatNumber(cap.availableSites, 0);
  document.getElementById("cap-max-cohorts-site").textContent = formatNumber(
    cap.maxCohortsPerSitePerYear,
    0
  );
  document.getElementById("cap-max-cohorts-total").textContent = formatNumber(cap.maxCohortsTotal, 0);
  document.getElementById("cap-cohort-shortfall").textContent = formatNumber(cap.cohortShortfall, 0);

  document.getElementById("cap-status").textContent = cap.status;
  document.getElementById("cap-note").textContent = cap.note;
}

function updateSensitivityTab(scenario) {
  if (!scenario) return;
  const c = scenario.config;
  const s = scenario.settings;

  // Current configuration row
  document.getElementById("sens-tier-current").textContent = c.tier;
  document.getElementById("sens-mentorship-current").textContent = c.mentorship;
  document.getElementById("sens-response-current").textContent = formatNumber(c.responseDays, 0);
  document.getElementById("sens-wtp-ptm-current").textContent = formatCurrencyINR(
    scenario.wtpPerTraineePerMonth,
    0
  );
  document.getElementById("sens-wtp-cohort-current").textContent = formatCurrencyINR(
    scenario.wtpPerCohort,
    0
  );

  // Faster response (−2 days)
  const configFast = { ...c, responseDays: Math.max(1, c.responseDays - 2) };
  const scenFast = computeScenario(configFast, s);
  document.getElementById("sens-tier-fast").textContent = configFast.tier;
  document.getElementById("sens-mentorship-fast").textContent = configFast.mentorship;
  document.getElementById("sens-response-fast").textContent = formatNumber(configFast.responseDays, 0);
  document.getElementById("sens-wtp-ptm-fast").textContent = formatCurrencyINR(
    scenFast.wtpPerTraineePerMonth,
    0
  );
  document.getElementById("sens-wtp-cohort-fast").textContent = formatCurrencyINR(
    scenFast.wtpPerCohort,
    0
  );

  // Higher mentorship, if possible
  let mentorshipHigher = c.mentorship;
  if (c.mentorship === "low") mentorshipHigher = "medium";
  else if (c.mentorship === "medium") mentorshipHigher = "high";
  const configHighMentor = { ...c, mentorship: mentorshipHigher };
  const scenHighMentor = computeScenario(configHighMentor, s);

  document.getElementById("sens-tier-mentorship").textContent = configHighMentor.tier;
  document.getElementById("sens-mentorship-mentorship").textContent = configHighMentor.mentorship;
  document.getElementById("sens-response-mentorship").textContent = formatNumber(
    configHighMentor.responseDays,
    0
  );
  document.getElementById("sens-wtp-ptm-mentorship").textContent = formatCurrencyINR(
    scenHighMentor.wtpPerTraineePerMonth,
    0
  );
  document.getElementById("sens-wtp-cohort-mentorship").textContent = formatCurrencyINR(
    scenHighMentor.wtpPerCohort,
    0
  );
}

function updateNationalTab(scenario) {
  if (!scenario) return;
  const epi = scenario.epi;
  const costs = scenario.costs;

  document.getElementById("nat-graduates").textContent = formatNumber(epi.graduatesAllCohorts, 0);
  document.getElementById("nat-outbreaks").textContent = formatNumber(epi.outbreaksPerYearNational, 1);
  document.getElementById("nat-epi-benefit").textContent = formatCurrencyINR(epi.epiBenefitAllCohorts, 0);
  document.getElementById("nat-economic-cost").textContent = formatCurrencyINR(
    costs.totalEconomicCostAllCohorts,
    0
  );
  document.getElementById("nat-net-benefit").textContent = formatCurrencyINR(
    scenario.netBenefitAllCohorts,
    0
  );
  document.getElementById("nat-bcr").textContent =
    scenario.natBcr !== null ? formatNumber(scenario.natBcr, 2) : "–";
  document.getElementById("nat-total-wtp").textContent = formatCurrencyINR(scenario.wtpAllCohorts, 0);

  const ctx = document.getElementById("chart-national");
  if (ctx && window.Chart) {
    if (appState.charts.national) appState.charts.national.destroy();
    appState.charts.national = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Total epi benefit", "Total economic cost"],
        datasets: [
          {
            label: "INR",
            data: [epi.epiBenefitAllCohorts, costs.totalEconomicCostAllCohorts]
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

/* ===========================
   Saved scenarios table
   =========================== */

function refreshScenarioTable() {
  const tbody = document.querySelector("#scenario-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  appState.savedScenarios.forEach((scenario, index) => {
    const c = scenario.config;
    const costs = scenario.costs;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" data-scenario-id="${scenario.id}"></td>
      <td>${scenario.name || `Scenario ${index + 1}`}</td>
      <td>${c.tier}</td>
      <td>${c.career}</td>
      <td>${c.mentorship}</td>
      <td>${c.delivery}</td>
      <td class="numeric-cell">${formatNumber(c.cohorts, 0)}</td>
      <td class="numeric-cell">${formatNumber(c.traineesPerCohort, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(c.costPerTraineePerMonth, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(costs.mentorCostPerCohort, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(costs.totalMentorCostAllCohorts, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(costs.directCostPerCohort, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(costs.economicCostPerCohort, 0)}</td>
      <td class="numeric-cell">${formatNumber(scenario.endorseRate, 1)}%</td>
      <td class="numeric-cell">${formatCurrencyINR(scenario.wtpPerTraineePerMonth, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(scenario.wtpAllCohorts, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(costs.totalEconomicCostAllCohorts, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(scenario.epiBenefitAllCohorts, 0)}</td>
      <td class="numeric-cell">${formatCurrencyINR(scenario.netBenefitAllCohorts, 0)}</td>
      <td class="numeric-cell">${scenario.natBcr !== null ? formatNumber(scenario.natBcr, 2) : "–"}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ===========================
   Exports
   =========================== */

function exportScenariosToExcel() {
  if (!window.XLSX) {
    showToast("Excel export is not available.", "error");
    return;
  }
  if (appState.savedScenarios.length === 0) {
    showToast("Save at least one scenario before exporting.", "warning");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: scenarios
  const rows = [];
  rows.push([
    "Name",
    "Tier",
    "Career",
    "Mentorship",
    "Delivery",
    "Cohorts",
    "Trainees per cohort",
    "Cost per trainee per month (INR)",
    "Mentor cost per cohort (INR)",
    "Total mentor cost (INR)",
    "Direct cost per cohort (INR)",
    "Economic cost per cohort (INR)",
    "Endorsement (%)",
    "Perceived programme value per trainee per month (INR)",
    "Total perceived programme value (all cohorts, INR)",
    "Total economic cost (all cohorts, INR)",
    "Total epidemiological benefit (INR)",
    "Net epidemiological benefit (INR)",
    "Benefit–cost ratio",
    "Opportunity cost included"
  ]);

  appState.savedScenarios.forEach((s, idx) => {
    const c = s.config;
    const k = s.costs;
    rows.push([
      s.name || `Scenario ${idx + 1}`,
      c.tier,
      c.career,
      c.mentorship,
      c.delivery,
      c.cohorts,
      c.traineesPerCohort,
      c.costPerTraineePerMonth,
      k.mentorCostPerCohort,
      k.totalMentorCostAllCohorts,
      k.directCostPerCohort,
      k.economicCostPerCohort,
      s.endorseRate,
      s.wtpPerTraineePerMonth,
      s.wtpAllCohorts,
      k.totalEconomicCostAllCohorts,
      s.epiBenefitAllCohorts,
      s.netBenefitAllCohorts,
      s.natBcr,
      c.includeOpportunityCost ? "Yes" : "No"
    ]);
  });

  const scenarioSheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, scenarioSheet, "Scenarios");

  // Sheet 2: assumptions (for current config/settings)
  const assumptions = buildAssumptionsSummary(appState.settings, appState.config);
  const assumRows = [["Assumption", "Value"]];
  assumptions.forEach((a) => {
    const splitIndex = a.indexOf(":");
    if (splitIndex > -1) {
      assumRows.push([a.slice(0, splitIndex), a.slice(splitIndex + 1).trim()]);
    } else {
      assumRows.push(["", a]);
    }
  });
  const assumSheet = XLSX.utils.aoa_to_sheet(assumRows);
  XLSX.utils.book_append_sheet(wb, assumSheet, "Assumptions");

  XLSX.writeFile(wb, "steps_saved_scenarios.xlsx");
  showToast("Excel file downloaded.", "success");
}

function getTopScenariosByNetBenefit(maxCount = 3) {
  const sorted = [...appState.savedScenarios].sort(
    (a, b) => (b.netBenefitAllCohorts || 0) - (a.netBenefitAllCohorts || 0)
  );
  return sorted.slice(0, maxCount);
}

function exportScenariosToPdf(brief = false) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("PDF export is not available.", "error");
    return;
  }
  if (appState.savedScenarios.length === 0) {
    showToast("Save at least one scenario before exporting.", "warning");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  if (!brief) {
    // Standard PDF: list each scenario in detail, then assumptions.
    let y = 15;
    doc.setFontSize(14);
    doc.text("STEPS – FETP India Decision Aid: Saved scenarios", 10, y);
    y += 8;
    doc.setFontSize(10);

    appState.savedScenarios.forEach((s, idx) => {
      const c = s.config;
      const k = s.costs;
      const epi = s.epi;

      if (y > 260) {
        doc.addPage();
        y = 15;
      }

      doc.setFont(undefined, "bold");
      doc.text(`${idx + 1}. ${s.name || "Scenario"}`, 10, y);
      doc.setFont(undefined, "normal");
      y += 5;
      doc.text(
        `Tier: ${c.tier} | Career: ${c.career} | Mentorship: ${c.mentorship} | Delivery: ${c.delivery}`,
        10,
        y
      );
      y += 5;
      doc.text(
        `Scale: ${c.cohorts} cohorts × ${c.traineesPerCohort} trainees | Response: ${c.responseDays} days`,
        10,
        y
      );
      y += 5;
      doc.text(
        `Direct cost / cohort: ${formatCurrencyINR(k.directCostPerCohort, 0)}; Economic cost / cohort: ${formatCurrencyINR(
          k.economicCostPerCohort,
          0
        )}`,
        10,
        y
      );
      y += 5;
      doc.text(
        `Mentor cost / cohort: ${formatCurrencyINR(k.mentorCostPerCohort, 0)} (total: ${formatCurrencyINR(
          k.totalMentorCostAllCohorts,
          0
        )})`,
        10,
        y
      );
      y += 5;
      doc.text(
        `Perceived programme value / trainee / month: ${formatCurrencyINR(
          s.wtpPerTraineePerMonth,
          0
        )}; total perceived value: ${formatCurrencyINR(s.wtpAllCohorts, 0)}`,
        10,
        y
      );
      y += 5;
      doc.text(
        `Epi benefit (all cohorts): ${formatCurrencyINR(epi.epiBenefitAllCohorts, 0)}; net epi benefit: ${formatCurrencyINR(
          s.netBenefitAllCohorts,
          0
        )}`,
        10,
        y
      );
      y += 5;
      doc.text(
        `Benefit–cost ratio: ${s.natBcr !== null ? s.natBcr.toFixed(2) : "-"}; opportunity cost included: ${
          c.includeOpportunityCost ? "Yes" : "No"
        }`,
        10,
        y
      );
      y += 8;
    });

    // Assumptions box
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Assumptions used", 10, 15);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    const assumptions = buildAssumptionsSummary(appState.settings, appState.config);
    let y2 = 25;
    assumptions.forEach((line) => {
      if (y2 > 270) {
        doc.addPage();
        y2 = 20;
      }
      doc.text(line, 10, y2);
      y2 += 6;
    });
  } else {
    // Brief two-page PDF.
    const topScenarios = getTopScenariosByNetBenefit(3);
    doc.setFontSize(14);
    doc.text("STEPS – FETP India Decision Aid: Brief scenario summary", 10, 15);
    doc.setFontSize(10);

    // Small table of top scenarios
    let y = 25;
    doc.setFont(undefined, "bold");
    doc.text("Top scenarios (by net epidemiological benefit)", 10, y);
    y += 5;
    doc.setFont(undefined, "normal");

    topScenarios.forEach((s, idx) => {
      const c = s.config;
      const k = s.costs;
      const epi = s.epi;

      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.text(
        `${idx + 1}. ${s.name || "Scenario"} – Tier: ${c.tier}, Mentorship: ${c.mentorship}, Delivery: ${
          c.delivery
        }, ${c.cohorts}×${c.traineesPerCohort}`,
        10,
        y
      );
      y += 5;
      doc.text(
        `  Endorsement: ${s.endorseRate.toFixed(1)}%; perceived value / trainee / month: ${formatCurrencyINR(
          s.wtpPerTraineePerMonth,
          0
        )}`,
        10,
        y
      );
      y += 5;
      doc.text(
        `  Direct cost / cohort: ${formatCurrencyINR(
          k.directCostPerCohort,
          0
        )}; economic cost / cohort: ${formatCurrencyINR(k.economicCostPerCohort, 0)}`,
        10,
        y
      );
      y += 5;
      doc.text(
        `  Epi benefit (all cohorts): ${formatCurrencyINR(
          epi.epiBenefitAllCohorts,
          0
        )}; net epi benefit: ${formatCurrencyINR(s.netBenefitAllCohorts, 0)}; BCR: ${
          s.natBcr !== null ? s.natBcr.toFixed(2) : "-"
        }`,
        10,
        y
      );
      y += 7;
    });

    // Page 2: assumptions, feasibility, enablers & risks
    doc.addPage();
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("Assumptions used", 10, 15);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    const assumptions = buildAssumptionsSummary(appState.settings, appState.config);
    let y2 = 23;
    assumptions.forEach((line) => {
      if (y2 > 260) {
        doc.addPage();
        y2 = 20;
      }
      doc.text(line, 10, y2);
      y2 += 5;
    });

    // Feasibility summary based on current scenario
    const s0 = appState.currentScenario || topScenarios[0];
    if (s0) {
      const cap = s0.capacity;
      y2 += 5;
      if (y2 > 260) {
        doc.addPage();
        y2 = 20;
      }
      doc.setFont(undefined, "bold");
      doc.text("Feasibility summary (current configuration)", 10, y2);
      y2 += 5;
      doc.setFont(undefined, "normal");
      doc.text(
        `Status: ${cap.status} – required mentors: ${cap.totalRequiredMentors}, available mentors: ${cap.availableMentors}`,
        10,
        y2
      );
      y2 += 5;
      doc.text(
        `Sites: ${cap.availableSites}, max cohorts: ${cap.maxCohortsTotal}, cohort shortfall: ${cap.cohortShortfall}`,
        10,
        y2
      );
      y2 += 5;
      doc.text(cap.note, 10, y2);
      y2 += 7;
    }

    // Enablers and risks
    const enablers = document.getElementById("enablers-text").value || "";
    const risks = document.getElementById("risks-text").value || "";

    if (y2 > 240) {
      doc.addPage();
      y2 = 20;
    }

    doc.setFont(undefined, "bold");
    doc.text("Implementation enablers", 10, y2);
    doc.setFont(undefined, "normal");
    y2 += 5;
    const enLines = doc.splitTextToSize(enablers, 180);
    enLines.forEach((ln) => {
      doc.text(ln, 10, y2);
      y2 += 5;
    });

    y2 += 5;
    if (y2 > 260) {
      doc.addPage();
      y2 = 20;
    }

    doc.setFont(undefined, "bold");
    doc.text("Implementation risks", 10, y2);
    doc.setFont(undefined, "normal");
    y2 += 5;
    const riskLines = doc.splitTextToSize(risks, 180);
    riskLines.forEach((ln) => {
      doc.text(ln, 10, y2);
      y2 += 5;
    });
  }

  const filename = brief ? "steps_brief_summary.pdf" : "steps_saved_scenarios.pdf";
  doc.save(filename);
  showToast("PDF downloaded.", "success");
}

/* ===========================
   Copilot / ChatGPT prompts
   =========================== */

function buildPromptText(baseScenario, selectedScenarios, settings, mode) {
  const lines = [];
  const assistantName = mode === "copilot" ? "Microsoft Copilot" : "ChatGPT";
  const productInstruction =
    mode === "copilot"
      ? "You may use Microsoft Word or PowerPoint formatting if helpful for the briefing."
      : "Please generate a two-page policy brief or slide-ready summary.";

  lines.push(
    `You are assisting with interpretation of FETP India scale-up scenarios using the STEPS decision aid. Please produce a concise, policy-ready summary.`
  );
  lines.push(productInstruction);
  lines.push(
    "Use clear, non-technical language and include at least one compact comparison table with key indicators (costs, epidemiological benefits, benefit–cost ratios, and perceived programme value)."
  );
  lines.push("");

  lines.push("=== Current configuration (anchor scenario) ===");
  const c = baseScenario.config;
  const k = baseScenario.costs;
  const epi = baseScenario.epi;
  lines.push(
    `Tier: ${c.tier}; career incentive: ${c.career}; mentorship intensity: ${c.mentorship}; delivery mode: ${c.delivery}.`
  );
  lines.push(
    `Scale: ${c.cohorts} cohorts per year × ${c.traineesPerCohort} trainees per cohort; response time: ${c.responseDays} days.`
  );
  lines.push(
    `Direct cost per cohort: ${formatCurrencyINR(
      k.directCostPerCohort,
      0
    )}; economic cost per cohort: ${formatCurrencyINR(k.economicCostPerCohort, 0)}.`
  );
  lines.push(
    `Epidemiological benefit per cohort: ${formatCurrencyINR(
      epi.epiBenefitPerCohort,
      0
    )}; benefit–cost ratio: ${baseScenario.bcrPerCohort !== null ? baseScenario.bcrPerCohort.toFixed(2) : "-"}.`
  );
  lines.push(
    `Perceived programme value per trainee per month (from preference study): ${formatCurrencyINR(
      baseScenario.wtpPerTraineePerMonth,
      0
    )}.`
  );
  lines.push("");

  if (selectedScenarios.length > 0) {
    lines.push("=== Saved scenarios for comparison ===");
    selectedScenarios.forEach((s, idx) => {
      const cc = s.config;
      const kk = s.costs;
      const ee = s.epi;
      lines.push(
        `${idx + 1}. ${s.name || "Scenario"} – tier: ${cc.tier}, mentorship: ${cc.mentorship}, delivery: ${
          cc.delivery
        }, ${cc.cohorts}×${cc.traineesPerCohort}, response: ${cc.responseDays} days.`
      );
      lines.push(
        `   Economic cost / cohort: ${formatCurrencyINR(
          kk.economicCostPerCohort,
          0
        )}; epi benefit (all cohorts): ${formatCurrencyINR(
          ee.epiBenefitAllCohorts,
          0
        )}; net epi benefit: ${formatCurrencyINR(s.netBenefitAllCohorts, 0)}; BCR: ${
          s.natBcr !== null ? s.natBcr.toFixed(2) : "-"
        }.`
      );
      lines.push(
        `   Perceived programme value (all cohorts): ${formatCurrencyINR(
          s.wtpAllCohorts,
          0
        )}; total economic cost (all cohorts): ${formatCurrencyINR(kk.totalEconomicCostAllCohorts, 0)}.`
      );
    });
    lines.push("");
  }

  lines.push("=== Assumptions used ===");
  const assumptions = buildAssumptionsSummary(settings, baseScenario.config);
  assumptions.forEach((a) => lines.push(a));
  lines.push("");

  if (baseScenario.capacity) {
    const cap = baseScenario.capacity;
    lines.push("=== Capacity and feasibility summary ===");
    lines.push(
      `Required mentors: ${cap.totalRequiredMentors} vs available mentors: ${cap.availableMentors}; mentor shortfall: ${cap.mentorShortfall}.`
    );
    lines.push(
      `Sites: ${cap.availableSites}, max cohorts per site per year: ${cap.maxCohortsPerSitePerYear}, max cohorts total: ${cap.maxCohortsTotal}, cohort shortfall: ${cap.cohortShortfall}.`
    );
    lines.push(`Overall feasibility status: ${cap.status}.`);
    lines.push(cap.note);
    lines.push("");
  }

  lines.push("=== Instructions for interpretation ===");
  lines.push(
    "1. Summarise the relative strengths and weaknesses of each scenario, including costs, epidemiological benefits, and perceived programme value."
  );
  lines.push(
    "2. Highlight trade-offs between scaling up quickly (more cohorts/trainees) and remaining within mentor and site capacity."
  );
  lines.push(
    "3. Comment on whether the benefit–cost ratios and net epidemiological benefits are plausibly favourable for investment."
  );
  lines.push(
    "4. Provide a short bullet-point list of policy messages suitable for inclusion in a briefing note to senior decision makers."
  );
  lines.push(
    "5. If helpful, suggest how further data (for example, refined estimates of outbreak value or mentor availability) could improve the analysis."
  );

  return lines.join("\n");
}

async function copyPrompt(mode) {
  if (!appState.currentScenario) {
    showToast("Apply a configuration before preparing the prompt.", "warning");
    return;
  }
  const baseScenario = appState.currentScenario;
  const selected = appState.savedScenarios.length > 0 ? getTopScenariosByNetBenefit(3) : [];
  const text = buildPromptText(baseScenario, selected, appState.settings, mode);

  const textarea = document.getElementById("prompt-output");
  if (textarea) {
    textarea.value = text;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Prompt copied to clipboard.", "success");
  } catch (e) {
    showToast("Prompt prepared. Copy it manually from the text area.", "info");
  }
}

function downloadPromptsTxt() {
  if (!appState.currentScenario) {
    showToast("Apply a configuration and compute a scenario first.", "warning");
    return;
  }
  const baseScenario = appState.currentScenario;
  const selected = appState.savedScenarios.length > 0 ? getTopScenariosByNetBenefit(3) : [];
  const textCopilot = buildPromptText(baseScenario, selected, appState.settings, "copilot");
  const textChatGPT = buildPromptText(baseScenario, selected, appState.settings, "chatgpt");
  const combined = [
    "=== Prompt for Microsoft Copilot ===",
    "",
    textCopilot,
    "",
    "=== Prompt for ChatGPT ===",
    "",
    textChatGPT
  ].join("\n");

  const blob = new Blob([combined], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "steps_ai_prompts.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ===========================
   Main recompute + event wiring
   =========================== */

function recomputeScenario() {
  const scenario = computeScenario(appState.config, appState.settings);
  appState.currentScenario = scenario;

  updateCostingTab(scenario);
  updateResultsTab(scenario);
  updateCapacityTab(scenario);
  updateSensitivityTab(scenario);
  updateNationalTab(scenario);
  renderAssumptionsList(appState.settings, appState.config);
}

function initEventHandlers() {
  const btnApplyConfig = document.getElementById("btn-apply-config");
  if (btnApplyConfig) {
    btnApplyConfig.addEventListener("click", () => {
      readConfigForm();
      recomputeScenario();
      showToast("Configuration applied.", "success");
    });
  }

  const btnResetConfig = document.getElementById("btn-reset-config");
  if (btnResetConfig) {
    btnResetConfig.addEventListener("click", () => {
      appState.config = {
        tier: "frontline",
        career: "none",
        mentorship: "low",
        delivery: "blended",
        responseDays: 7,
        cohorts: 4,
        traineesPerCohort: 25,
        costPerTraineePerMonth: 30000,
        includeOpportunityCost: true
      };
      applyConfigToForm();
      recomputeScenario();
      showToast("Configuration reset.", "info");
    });
  }

  const btnApplySettings = document.getElementById("btn-apply-settings");
  if (btnApplySettings) {
    btnApplySettings.addEventListener("click", () => {
      readSettingsForm();
      recomputeScenario();
      showToast("Settings applied.", "success");
    });
  }

  const btnSaveScenario = document.getElementById("btn-save-scenario");
  if (btnSaveScenario) {
    btnSaveScenario.addEventListener("click", () => {
      if (!appState.currentScenario) {
        showToast("Apply a configuration before saving a scenario.", "warning");
        return;
      }
      const name = prompt("Optional: name this scenario", "");
      const sCopy = JSON.parse(JSON.stringify(appState.currentScenario));
      sCopy.name = name || "";
      appState.savedScenarios.push(sCopy);
      refreshScenarioTable();
      showToast("Scenario saved.", "success");
    });
  }

  const btnClearScenarios = document.getElementById("btn-clear-scenarios");
  if (btnClearScenarios) {
    btnClearScenarios.addEventListener("click", () => {
      if (!confirm("Clear all saved scenarios?")) return;
      appState.savedScenarios = [];
      refreshScenarioTable();
      showToast("Saved scenarios cleared.", "info");
    });
  }

  const btnExportExcel = document.getElementById("btn-export-excel");
  if (btnExportExcel) {
    btnExportExcel.addEventListener("click", exportScenariosToExcel);
  }

  const btnExportPdfStandard = document.getElementById("btn-export-pdf-standard");
  if (btnExportPdfStandard) {
    btnExportPdfStandard.addEventListener("click", () => exportScenariosToPdf(false));
  }

  const btnExportPdfBrief = document.getElementById("btn-export-pdf-brief");
  if (btnExportPdfBrief) {
    btnExportPdfBrief.addEventListener("click", () => exportScenariosToPdf(true));
  }

  const btnCopyCopilot = document.getElementById("btn-copy-copilot");
  if (btnCopyCopilot) {
    btnCopyCopilot.addEventListener("click", () => copyPrompt("copilot"));
  }

  const btnCopyChatGPT = document.getElementById("btn-copy-chatgpt");
  if (btnCopyChatGPT) {
    btnCopyChatGPT.addEventListener("click", () => copyPrompt("chatgpt"));
  }

  const btnDownloadPrompts = document.getElementById("btn-download-prompts");
  if (btnDownloadPrompts) {
    btnDownloadPrompts.addEventListener("click", downloadPromptsTxt);
  }

  // Cost slider extremes warning (here we use the numeric input)
  const costInput = document.getElementById("cost-per-trainee");
  if (costInput) {
    costInput.addEventListener("input", () => {
      const val = safeNumber(costInput.value, 0);
      if (val < 5000 || val > 100000) {
        showToast(
          "Cost per trainee per month is at an extreme; check whether this is realistic.",
          "warning"
        );
      }
    });
  }
}

/* ===========================
   Initialise
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  applyConfigToForm();
  applySettingsToForm();
  recomputeScenario();
  initEventHandlers();
});
