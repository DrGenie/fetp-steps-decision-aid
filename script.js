// =====================================================
// STEPS – FETP scale-up decision aid (India)
// Front-end logic
// =====================================================

// -------------------------------
// Global state
// -------------------------------

const appState = {
  currencyDisplay: "INR",
  exchangeRateINRtoUSD: 0.0112, // approximate, updated November 2025 :contentReference[oaicite:1]{index=1}
  currentScenario: null,
  savedScenarios: [],
  charts: {},
  epiConfig: null
};

// -------------------------------
// DCE coefficients and WTP
// -------------------------------

// Programme durations in months
const PROGRAM_DURATIONS = {
  frontline: 3,
  intermediate: 15,
  advanced: 24
};

// Default "costing study baseline" direct financial cost per trainee per month (INR)
// Calculated from your cost totals assuming ~60 trainees per cohort
// Frontline: (total - opp) / (60*3), clamped to 75,000 as per DCE range
// Intermediate: (total - opp) / (60*15)
// Advanced: total / (60*24)
const COST_BASELINES = {
  frontline: 75000, // clamp from ~57,800
  intermediate: 313700,
  advanced: 200700
};

// Opportunity cost ratios (opportunity cost / direct cost) derived from your templates
// Frontline: opp 7,006,465; total 17,413,794 → r = opp/(total - opp) ≈ 0.673
// Intermediate: opp 5,707,525; total 288,040,319 → r ≈ 0.020
// Advanced: no explicit data; approximate using intermediate ratio
const OPP_DIRECT_RATIO = {
  frontline: 0.673,
  intermediate: 0.020,
  advanced: 0.020
};

// Mixed logit (MXL) mean coefficients for India (per 1,000 INR), from your DCE
// Signs: positive improves utility, negative reduces utility
const MXL_COEFS = {
  ascOptOut: -0.601, // ASC for opt-out vs Training B
  intermediate: 0.220,
  advanced: 0.487,
  uniQual: 0.017,
  govCareer: -0.122,
  mentorMedium: 0.453,
  mentorHigh: 0.640,
  inPerson: -0.232,
  online: -1.073,
  resp15: 0.546,
  resp7: 0.610,
  // Cost coefficient back-transformed from (negative) log-normal in your model
  // Here we use the approximate mean marginal utility per 1,000 INR (negative)
  costPer1000: -0.005
};

// Latent class Class 2 (“training supporters”) coefficients (per 1,000 INR)
// Taken directly from your LC model estimates
const LC2_COEFS = {
  ascOptOut: -2.543,
  intermediate: 0.087,
  advanced: 0.422,
  uniQual: -0.024,
  govCareer: -0.123,
  mentorMedium: 0.342,
  mentorHigh: 0.486,
  inPerson: -0.017,
  online: -0.700,
  resp15: 0.317,
  resp7: 0.504,
  costPer1000: -0.001
};

// WTP per attribute level (₹000 per trainee per month) – mixed logit average
// Based on your WTP table (main mixed logit model)
const WTP_MXL_K = {
  intermediate: 47.06,
  advanced: 103.99,
  uniQual: 3.69,
  govCareer: -26.17,
  mentorMedium: 96.87,
  mentorHigh: 136.79,
  inPerson: -49.56,
  online: -229.33,
  resp15: 116.70,
  resp7: 130.46
};

// WTP per attribute level (₹000 per trainee per month) – Latent Class 2 (“supporters”)
// Based on your Table of WTP, Class 2 column
const WTP_LC2_K = {
  intermediate: 63,
  advanced: 303,
  uniQual: -18,
  govCareer: -88,
  mentorMedium: 245,
  mentorHigh: 349,
  inPerson: -12,
  online: -503,
  resp15: 228,
  resp7: 362
};

// -------------------------------
// Utility and WTP helpers
// -------------------------------

function getCoefficients(modelType) {
  return modelType === "lc2" ? LC2_COEFS : MXL_COEFS;
}

function getWtpTable(modelType) {
  return modelType === "lc2" ? WTP_LC2_K : WTP_MXL_K;
}

function computeNetUtility(config, modelType) {
  const coefs = getCoefficients(modelType);

  // Attribute dummies (reference levels all zero)
  let vAttrs = 0;

  if (config.programType === "intermediate") vAttrs += coefs.intermediate;
  if (config.programType === "advanced") vAttrs += coefs.advanced;

  if (config.careerIncentive === "university") vAttrs += coefs.uniQual;
  if (config.careerIncentive === "gov_pathway") vAttrs += coefs.govCareer;

  if (config.mentorship === "medium") vAttrs += coefs.mentorMedium;
  if (config.mentorship === "high") vAttrs += coefs.mentorHigh;

  if (config.deliveryMode === "inperson") vAttrs += coefs.inPerson;
  if (config.deliveryMode === "online") vAttrs += coefs.online;

  if (config.responseTime === 15) vAttrs += coefs.resp15;
  if (config.responseTime === 7) vAttrs += coefs.resp7;

  const costInThousands = config.costPerTrainee / 1000;
  const vCost = coefs.costPer1000 * costInThousands;

  // We set the opt-out utility as U_optout = ascOptOut, programme as U_prog = vAttrs + vCost
  // Probability of accepting a programme is logistic in (U_prog - U_optout) = vAttrs + vCost - ascOptOut
  const netUtility = vAttrs + vCost - coefs.ascOptOut;
  return netUtility;
}

function computeUptakeProbability(config, modelType) {
  const v = computeNetUtility(config, modelType);
  // Logistic
  return 1 / (1 + Math.exp(-v));
}

function computePerTraineeWtpPerMonthINR(config, modelType) {
  const wtpTable = getWtpTable(modelType);
  let wtpK = 0;

  if (config.programType === "intermediate") wtpK += wtpTable.intermediate;
  if (config.programType === "advanced") wtpK += wtpTable.advanced;

  if (config.careerIncentive === "university") wtpK += wtpTable.uniQual;
  if (config.careerIncentive === "gov_pathway") wtpK += wtpTable.govCareer;

  if (config.mentorship === "medium") wtpK += wtpTable.mentorMedium;
  if (config.mentorship === "high") wtpK += wtpTable.mentorHigh;

  if (config.deliveryMode === "inperson") wtpK += wtpTable.inPerson;
  if (config.deliveryMode === "online") wtpK += wtpTable.online;

  if (config.responseTime === 15) wtpK += wtpTable.resp15;
  if (config.responseTime === 7) wtpK += wtpTable.resp7;

  return wtpK * 1000; // convert from thousands to INR
}

// -------------------------------
// Epidemiological metrics
// -------------------------------

function loadEpiConfig() {
  fetch("epi_config.json")
    .then((resp) => resp.json())
    .then((data) => {
      appState.epiConfig = data;
    })
    .catch(() => {
      // Fallback defaults if config is missing
      appState.epiConfig = {
        currency: "INR",
        discountRate: 0.03,
        workingYearsPerGraduate: 5,
        benefitPerGraduateINR: {
          frontline: 800000,
          intermediate: 1500000,
          advanced: 2500000
        },
        outbreaksAvertedPer100AdvancedGraduatesPerYear: 0.5,
        economicLossPerModerateOutbreakINR: 2000000000
      };
    });
}

function computeEpiMetrics(config, uptake) {
  const epi = appState.epiConfig;
  if (!epi) {
    return {
      additionalGraduates: uptake * config.cohortSize,
      outbreaksAverted: 0,
      economicLossAvoidedINR: 0
    };
  }

  const grads = uptake * config.cohortSize;
  const tier = config.programType;

  const benefitPerGrad = epi.benefitPerGraduateINR[tier] || 0;
  const years = epi.workingYearsPerGraduate;
  const r = epi.discountRate;

  // Present value factor for a constant annual stream over "years"
  const pvFactor = r > 0 ? (1 - Math.pow(1 + r, -years)) / r : years;
  const economicBenefitFromGraduates = grads * benefitPerGrad * pvFactor;

  // Simple outbreak metric: assume that only advanced graduates materially shift outbreak dynamics
  let outbreaksAverted = 0;
  if (tier === "advanced") {
    const per100 = epi.outbreaksAvertedPer100AdvancedGraduatesPerYear || 0;
    const outbreaksPerYear = (grads / 100) * per100;
    outbreaksAverted = outbreaksPerYear * years;
  }

  const economicLossAvoidedINR = outbreaksAverted * (epi.economicLossPerModerateOutbreakINR || 0);
  const totalEpiMonetaryBenefitINR = economicBenefitFromGraduates + economicLossAvoidedINR;

  return {
    additionalGraduates: grads,
    outbreaksAverted,
    economicLossAvoidedINR: totalEpiMonetaryBenefitINR
  };
}

// -------------------------------
// Cost calculations
// -------------------------------

function computeCosts(config) {
  const duration = PROGRAM_DURATIONS[config.programType] || 3;

  const directCostPerTraineePerMonthINR = config.costPerTrainee;
  const directCostPerCohortINR = directCostPerTraineePerMonthINR * config.cohortSize * duration;

  const oppRatio = OPP_DIRECT_RATIO[config.programType] || 0;
  const oppCostPerCohortINR = config.includeOppCost ? directCostPerCohortINR * oppRatio : 0;
  const economicCostPerCohortINR = directCostPerCohortINR + oppCostPerCohortINR;

  const directCostNationalINR = directCostPerCohortINR * config.numCohorts;
  const oppCostNationalINR = oppCostPerCohortINR * config.numCohorts;
  const economicCostNationalINR = directCostNationalINR + oppCostNationalINR;

  return {
    duration,
    directCostPerCohortINR,
    oppCostPerCohortINR,
    economicCostPerCohortINR,
    directCostNationalINR,
    oppCostNationalINR,
    economicCostNationalINR
  };
}

// -------------------------------
// Scenario computation
// -------------------------------

function getConfigFromUI() {
  const programType = document.getElementById("programType").value;
  const mentorship = document.getElementById("mentorship").value;
  const careerIncentive = document.getElementById("careerIncentive").value;
  const deliveryMode = document.getElementById("deliveryMode").value;
  const responseTime = parseInt(document.getElementById("responseTime").value, 10);
  const costPerTrainee = parseInt(document.getElementById("costPerTrainee").value, 10);
  const cohortSize = parseInt(document.getElementById("cohortSize").value, 10) || 0;
  const numCohorts = parseInt(document.getElementById("numCohorts").value, 10) || 1;
  const includeOppCost = document.getElementById("includeOppCost").checked;
  const prefModel = document.getElementById("prefModel").value;
  const scenarioNotes = document.getElementById("scenarioNotes").value.trim();

  let currencyDisplay = "INR";
  const radios = document.querySelectorAll('input[name="currencyDisplay"]');
  radios.forEach((r) => {
    if (r.checked) currencyDisplay = r.value;
  });
  appState.currencyDisplay = currencyDisplay;

  return {
    programType,
    mentorship,
    careerIncentive,
    deliveryMode,
    responseTime,
    costPerTrainee,
    cohortSize,
    numCohorts,
    includeOppCost,
    prefModel,
    scenarioNotes
  };
}

function computeScenario(config) {
  const uptake = computeUptakeProbability(config, config.prefModel);
  const perTraineeWtpPerMonthINR = computePerTraineeWtpPerMonthINR(config, config.prefModel);
  const costs = computeCosts(config);

  const perTraineeBenefitTotalINR = perTraineeWtpPerMonthINR * costs.duration;
  const benefitPerCohortINR = perTraineeBenefitTotalINR * config.cohortSize;
  const benefitNationalINR = benefitPerCohortINR * config.numCohorts;

  const bcrFinancial = costs.directCostPerCohortINR > 0 ? benefitPerCohortINR / costs.directCostPerCohortINR : 0;
  const bcrEconomic =
    costs.economicCostPerCohortINR > 0 ? benefitPerCohortINR / costs.economicCostPerCohortINR : 0;

  const netBenefitPerCohortINR = benefitPerCohortINR - costs.directCostPerCohortINR;
  const netBenefitEconomicPerCohortINR = benefitPerCohortINR - costs.economicCostPerCohortINR;

  const epiMetrics = computeEpiMetrics(config, uptake);

  return {
    config,
    uptake,
    perTraineeWtpPerMonthINR,
    perTraineeBenefitTotalINR,
    benefitPerCohortINR,
    benefitNationalINR,
    bcrFinancial,
    bcrEconomic,
    netBenefitPerCohortINR,
    netBenefitEconomicPerCohortINR,
    costs,
    epiMetrics
  };
}

// -------------------------------
// Formatting helpers
// -------------------------------

function formatCurrencyINR(value) {
  if (!isFinite(value)) return "–";
  return "INR " + Math.round(value).toLocaleString("en-IN");
}

function formatCurrencyDisplay(inrValue) {
  if (!isFinite(inrValue)) return "–";
  if (appState.currencyDisplay === "USD") {
    const usd = inrValue * appState.exchangeRateINRtoUSD;
    return "USD " + usd.toFixed(1).toLocaleString("en-US");
  }
  return formatCurrencyINR(inrValue);
}

function formatPercent(p) {
  if (!isFinite(p)) return "–";
  return (p * 100).toFixed(1) + "%";
}

function classifyScenario(bcrEconomic, uptake) {
  if (!isFinite(bcrEconomic)) return "No valid results available.";

  if (bcrEconomic >= 1.5 && uptake >= 0.6) {
    return "This configuration is a strong candidate for scale-up. It offers a clearly favourable economic return and is likely to be endorsed by most stakeholders.";
  }
  if (bcrEconomic >= 1 && uptake >= 0.4) {
    return "This configuration appears viable but not outstanding. It may be worth considering alongside alternative options with higher mentorship intensity or stronger outbreak response performance.";
  }
  if (bcrEconomic < 1 && uptake >= 0.4) {
    return "Stakeholders are moderately supportive, but the economic return is weak. Consider reducing costs or moving to a design with stronger epidemiological benefits.";
  }
  return "This configuration is not attractive in its current form. Both endorsement and economic return are modest. It is advisable to adjust programme design or costs before scaling.";
}

// -------------------------------
// Rendering
// -------------------------------

function updateConfigSummary(config) {
  const el = document.getElementById("configSummary");
  if (!el) return;

  const duration = PROGRAM_DURATIONS[config.programType] || 3;
  const tierLabel =
    config.programType === "frontline"
      ? "Frontline"
      : config.programType === "intermediate"
      ? "Intermediate"
      : "Advanced";

  const modelLabel =
    config.prefModel === "lc2" ? "Training supporters (latent class)" : "Average mixed logit";

  el.innerHTML = `
    <p><strong>Preference model:</strong> ${modelLabel}</p>
    <p><strong>Tier:</strong> ${tierLabel} (${duration} months)</p>
    <p><strong>Mentorship:</strong> ${config.mentorship}</p>
    <p><strong>Career incentives:</strong> ${config.careerIncentive}</p>
    <p><strong>Delivery mode:</strong> ${config.deliveryMode}</p>
    <p><strong>Outbreak response:</strong> investigate within ${config.responseTime} days</p>
    <p><strong>Cost per trainee per month:</strong> ${formatCurrencyDisplay(config.costPerTrainee)}</p>
    <p><strong>Trainees per cohort:</strong> ${config.cohortSize}</p>
    <p><strong>Number of cohorts (national plan):</strong> ${config.numCohorts}</p>
    <p><strong>Include opportunity cost:</strong> ${config.includeOppCost ? "Yes" : "No"}</p>
    ${config.scenarioNotes ? `<p><strong>Notes:</strong> ${config.scenarioNotes}</p>` : ""}
  `;
}

function renderResults(scenario) {
  if (!scenario) return;

  const { uptake, bcrFinancial, bcrEconomic, netBenefitPerCohortINR, costs, epiMetrics } = scenario;

  // Headline
  const headline = classifyScenario(bcrEconomic, uptake);
  document.getElementById("headlineRecommendation").textContent = headline;

  document.getElementById("metricUptake").textContent = formatPercent(uptake);
  document.getElementById("metricBCRFinancial").textContent = bcrFinancial.toFixed(2);
  document.getElementById("metricBCREconomic").textContent = bcrEconomic.toFixed(2);
  document.getElementById("metricNetBenefit").textContent = formatCurrencyDisplay(netBenefitPerCohortINR);

  // Financial narrative
  const finText = `
    For one cohort of ${scenario.config.cohortSize} trainees, the direct programme cost is
    ${formatCurrencyDisplay(costs.directCostPerCohortINR)}. The DCE-based benefit per cohort is
    ${formatCurrencyDisplay(scenario.benefitPerCohortINR)}. This yields a financial benefit–cost ratio of
    ${bcrFinancial.toFixed(2)}. When trainee opportunity costs are included, the economic benefit–cost ratio is
    ${bcrEconomic.toFixed(2)}.
  `;
  document.getElementById("resultsFinancialText").textContent = finText.replace(/\s+/g, " ").trim();

  // Epi narrative
  const epi = epiMetrics;
  const epiText = `
    Under this configuration, the expected number of additional trained epidemiologists per cohort is
    ${epi.additionalGraduates.toFixed(1)}. Using simple epidemiological multipliers, this corresponds to an estimated
    ${epi.outbreaksAverted.toFixed(2)} significant outbreaks averted over a working lifetime and an economic value of
    ${formatCurrencyDisplay(epi.economicLossAvoidedINR)} in avoided outbreak losses and strengthened surveillance.
  `;
  document.getElementById("epiSummaryText").textContent = epiText.replace(/\s+/g, " ").trim();

  // Charts
  renderCostBenefitChart(scenario);
  renderEpiChart(scenario);
  renderSensitivityChart(scenario);
  renderNationalChart(scenario);
  renderCostBreakdownChart(scenario);
  renderSavedScenarios();
  renderScenarioCompareChart();

  // Cost breakdown text
  renderCostBreakdownText(scenario);
  renderNationalSummaryText(scenario);
}

function renderCostBenefitChart(scenario) {
  const ctx = document.getElementById("chartCostBenefit");
  if (!ctx) return;

  const data = {
    labels: ["Direct cost", "Economic cost", "Benefit"],
    datasets: [
      {
        label: "Per cohort",
        data: [
          scenario.costs.directCostPerCohortINR,
          scenario.costs.economicCostPerCohortINR,
          scenario.benefitPerCohortINR
        ]
      }
    ]
  };

  const cfg = {
    type: "bar",
    data,
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatCurrencyDisplay(ctx.parsed.y)
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => formatCurrencyDisplay(value)
          }
        }
      }
    }
  };

  if (appState.charts.costBenefit) {
    appState.charts.costBenefit.destroy();
  }
  appState.charts.costBenefit = new Chart(ctx, cfg);
}

function renderEpiChart(scenario) {
  const ctx = document.getElementById("chartEpi");
  if (!ctx) return;
  const epi = scenario.epiMetrics;

  const data = {
    labels: ["Additional epidemiologists", "Outbreaks averted (lifetime)"],
    datasets: [
      {
        data: [epi.additionalGraduates, epi.outbreaksAverted]
      }
    ]
  };

  const cfg = {
    type: "bar",
    data,
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  if (appState.charts.epi) {
    appState.charts.epi.destroy();
  }
  appState.charts.epi = new Chart(ctx, cfg);
}

function renderSensitivityChart(scenario) {
  const ctx = document.getElementById("chartSensitivity");
  if (!ctx) return;

  const config = scenario.config;
  const baseCost = config.costPerTrainee;

  const costs = [];
  const bcrs = [];

  const steps = [-0.4, -0.2, 0, 0.2, 0.4];
  steps.forEach((s) => {
    const costVal = Math.min(400000, Math.max(75000, baseCost * (1 + s)));
    const variantConfig = { ...config, costPerTrainee: costVal };
    const sc = computeScenario(variantConfig);
    costs.push(costVal);
    bcrs.push(sc.bcrEconomic);
  });

  const data = {
    labels: costs.map((c) => formatCurrencyDisplay(c)),
    datasets: [
      {
        data: bcrs
      }
    ]
  };

  const cfg = {
    type: "line",
    data,
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `BCR (economic): ${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  if (appState.charts.sensitivity) {
    appState.charts.sensitivity.destroy();
  }
  appState.charts.sensitivity = new Chart(ctx, cfg);
}

function renderNationalChart(scenario) {
  const ctx = document.getElementById("chartNational");
  if (!ctx) return;

  const benefit = scenario.benefitNationalINR;
  const cost = scenario.costs.economicCostNationalINR;

  const data = {
    labels: ["Total benefit", "Total economic cost"],
    datasets: [
      {
        data: [benefit, cost]
      }
    ]
  };

  const cfg = {
    type: "bar",
    data,
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatCurrencyDisplay(ctx.parsed.y)
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => formatCurrencyDisplay(value)
          }
        }
      }
    }
  };

  if (appState.charts.national) {
    appState.charts.national.destroy();
  }
  appState.charts.national = new Chart(ctx, cfg);
}

function renderCostBreakdownChart(scenario) {
  const ctx = document.getElementById("chartCostBreakdown");
  if (!ctx) return;

  const direct = scenario.costs.directCostPerCohortINR;
  const opp = scenario.costs.oppCostPerCohortINR;

  const data = {
    labels: ["Direct programme cost", "Trainee opportunity cost"],
    datasets: [
      {
        data: [direct, opp]
      }
    ]
  };

  const cfg = {
    type: "pie",
    data,
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatCurrencyDisplay(ctx.parsed)}`
          }
        }
      }
    }
  };

  if (appState.charts.costBreakdown) {
    appState.charts.costBreakdown.destroy();
  }
  appState.charts.costBreakdown = new Chart(ctx, cfg);
}

function renderCostBreakdownText(scenario) {
  const el = document.getElementById("costBreakdownText");
  if (!el) return;

  const direct = scenario.costs.directCostPerCohortINR;
  const opp = scenario.costs.oppCostPerCohortINR;
  const econ = scenario.costs.economicCostPerCohortINR;

  const text = `
    For this configuration, direct programme costs (including staff, workshops, materials and direct travel) per cohort
    are ${formatCurrencyDisplay(direct)}. When trainee opportunity costs are included, the total economic cost per
    cohort is ${formatCurrencyDisplay(econ)}. The share of opportunity costs in the total economic cost is
    ${econ > 0 ? ((opp / econ) * 100).toFixed(1) : "0.0"} percent.
  `;
  el.textContent = text.replace(/\s+/g, " ").trim();
}

function renderNationalSummaryText(scenario) {
  const el = document.getElementById("nationalSummaryText");
  if (!el) return;

  const cfg = scenario.config;
  const epi = scenario.epiMetrics;

  const text = `
    With ${cfg.numCohorts} cohorts of ${cfg.cohortSize} trainees each, the national plan would train
    approximately ${(epi.additionalGraduates * cfg.numCohorts).toFixed(1)} additional field epidemiologists. The total
    economic cost across all cohorts is ${formatCurrencyDisplay(scenario.costs.economicCostNationalINR)}, with an
    implied benefit of ${formatCurrencyDisplay(scenario.benefitNationalINR)} based on DCE-derived values. The
    resulting national benefit–cost ratio (economic) is
    ${scenario.costs.economicCostNationalINR > 0 ? (scenario.benefitNationalINR / scenario.costs.economicCostNationalINR).toFixed(2) : "0.00"}.
  `;
  el.textContent = text.replace(/\s+/g, " ").trim();
}

// Saved scenarios

function renderSavedScenarios() {
  const container = document.getElementById("savedScenariosContainer");
  if (!container) return;

  if (appState.savedScenarios.length === 0) {
    container.textContent = "No scenarios saved yet.";
    return;
  }

  const header = document.createElement("div");
  header.className = "scenario-row scenario-row-header";
  header.innerHTML =
    "<span>Scenario</span><span>Tier</span><span>Uptake</span><span>BCR (econ)</span><span>Cost / cohort</span><span>Net benefit</span>";

  container.innerHTML = "";
  container.appendChild(header);

  appState.savedScenarios.forEach((s, idx) => {
    const row = document.createElement("div");
    row.className = "scenario-row";

    const name =
      s.name ||
      `Scenario ${idx + 1}: ${s.config.programType}, ${s.config.mentorship}, ${s.config.responseTime} days`;

    row.innerHTML = `
      <span>${name}</span>
      <span>${s.config.programType}</span>
      <span>${formatPercent(s.uptake)}</span>
      <span>${s.bcrEconomic.toFixed(2)}</span>
      <span>${formatCurrencyDisplay(s.costs.economicCostPerCohortINR)}</span>
      <span>${formatCurrencyDisplay(s.netBenefitPerCohortINR)}</span>
    `;
    container.appendChild(row);
  });
}

function renderScenarioCompareChart() {
  const ctx = document.getElementById("chartScenarioCompare");
  if (!ctx) return;
  const scenarios = appState.savedScenarios;
  if (scenarios.length === 0) {
    if (appState.charts.scenarioCompare) {
      appState.charts.scenarioCompare.destroy();
      appState.charts.scenarioCompare = null;
    }
    return;
  }

  const labels = scenarios.map((s, idx) => s.name || `S${idx + 1}`);
  const bcrs = scenarios.map((s) => s.bcrEconomic);
  const uptakes = scenarios.map((s) => s.uptake * 100);

  const data = {
    labels,
    datasets: [
      {
        label: "BCR (economic)",
        data: bcrs,
        yAxisID: "y1"
      },
      {
        label: "Endorsement (%)",
        data: uptakes,
        yAxisID: "y2"
      }
    ]
  };

  const cfg = {
    type: "bar",
    data,
    options: {
      responsive: true,
      scales: {
        y1: {
          position: "left",
          beginAtZero: true,
          title: { display: true, text: "BCR" }
        },
        y2: {
          position: "right",
          beginAtZero: true,
          title: { display: true, text: "Endorsement (%)" }
        }
      }
    }
  };

  if (appState.charts.scenarioCompare) {
    appState.charts.scenarioCompare.destroy();
  }
  appState.charts.scenarioCompare = new Chart(ctx, cfg);
}

// -------------------------------
// PDF generation
// -------------------------------

function buildPolicyBriefText(scenario) {
  const cfg = scenario.config;
  const epi = scenario.epiMetrics;
  const tierLabel =
    cfg.programType === "frontline"
      ? "Frontline"
      : cfg.programType === "intermediate"
      ? "Intermediate"
      : "Advanced";

  const endorsement = formatPercent(scenario.uptake);
  const bcrFin = scenario.bcrFinancial.toFixed(2);
  const bcrEcon = scenario.bcrEconomic.toFixed(2);
  const net = formatCurrencyDisplay(scenario.netBenefitPerCohortINR);
  const costCohort = formatCurrencyDisplay(scenario.costs.economicCostPerCohortINR);
  const benefitCohort = formatCurrencyDisplay(scenario.benefitPerCohortINR);

  const headline = classifyScenario(scenario.bcrEconomic, scenario.uptake);

  return [
    "STEPS FETP scale up brief – India",
    "",
    "This brief summarises a Field Epidemiology Training Program (FETP) configuration evaluated with STEPS. Results combine discrete choice experiment evidence on stakeholder preferences with costing assumptions for the selected scenario.",
    "",
    `Scenario: ${tierLabel} FETP, ${cfg.cohortSize} trainees per cohort, duration ${PROGRAM_DURATIONS[cfg.programType]} months, using the ${
      cfg.prefModel === "lc2" ? "latent class (training supporters)" : "mixed logit"
    } model.`,
    "",
    `The selected configuration has an estimated endorsement probability of ${endorsement}. The DCE based benefit per cohort is ${benefitCohort} against an economic cost of ${costCohort}, giving an economic benefit cost ratio of ${bcrEcon} and a financial benefit cost ratio of ${bcrFin}. Net economic benefit per cohort is approximately ${net}.`,
    "",
    `Under simple epidemiological assumptions, this configuration would train about ${epi.additionalGraduates.toFixed(
      1
    )} additional field epidemiologists per cohort, with an estimated ${epi.outbreaksAverted.toFixed(
      2
    )} significant outbreaks averted over a working lifetime and an indicative economic value of ${formatCurrencyDisplay(
      epi.economicLossAvoidedINR
    )} in avoided outbreak losses and strengthened surveillance.`,
    "",
    "Headline recommendation:",
    headline,
    "",
    "Policy interpretation:",
    "- If benefit–cost ratios are above one and endorsement is high, this configuration is a strong candidate for scale up, particularly when aligned with national workforce targets.",
    "- If benefit–cost ratios are close to one or endorsement is modest, consider adjusting mentorship intensity, outbreak response expectations or programme costs.",
    "- If benefit–cost ratios are below one, treat this configuration as exploratory and review design or costing assumptions before implementation.",
    "",
    "Prepared by Mesfin Genie, PhD, Newcastle Business School, The University of Newcastle, Australia. Contact: mesfin.genie@newcastle.edu.au."
  ];
}

function buildTechnicalAppendixSections(scenario) {
  const cfg = scenario.config;

  return [
    {
      title: "1. Overview of STEPS",
      body: [
        "STEPS (Scalable Training Estimation and Planning System) is an online decision aid developed to support planning of Field Epidemiology Training Program (FETP) scale up in India. It combines evidence from a discrete choice experiment (DCE) conducted with key stakeholders, costing templates compiled from WHO, NIE and NCDC sources, and simple epidemiological assumptions regarding the impact of field epidemiologists on outbreak detection and response.",
        "Users specify programme attributes (tier, mentorship, incentives, delivery mode, outbreak response time and cost per trainee per month). STEPS then computes predicted endorsement probabilities, monetary benefits based on willingness to pay (WTP), cohort level costs, benefit–cost ratios and summary epidemiological metrics. These can be examined for a single cohort or scaled up to a national plan with multiple cohorts."
      ]
    },
    {
      title: "2. Discrete choice experiment and econometric models",
      body: [
        "The DCE presented respondents with pairs of FETP configurations and an opt out alternative. Attributes included programme tier (frontline, intermediate, advanced), mentorship intensity (low, medium, high), career incentives (government and partner certificate, university qualification, government career pathway), delivery mode (blended, fully in person, fully online), outbreak response capacity (investigate within 30 days, 15 days, 7 days) and cost per trainee per month. Design and estimation followed standard practice in health economics and transport economics.:contentReference[oaicite:2]{index=2}",
        "Utility for individual n choosing alternative j in task t is written as:",
        "  U_njt = α_A,n * ASC_A,jt + α_O,n * ASC_OptOut,jt + β_1,n * INTERMEDIATE_jt + β_2,n * ADVANCED_jt + β_3,n * UNIQUAL_jt + β_4,n * GOVCAREER_jt + β_5,n * MENTORMEDIUM_jt + β_6,n * MENTORHIGH_jt + β_7,n * INPERSON_jt + β_8,n * ONLINE_jt + β_9,n * RESP15_jt + β_10,n * RESP7_jt + β_11,n * COST_njt.",
        "Attribute indicators equal one when the relevant feature is present in alternative j and zero otherwise. Training B with frontline tier, low mentorship, government and partner certificate, blended delivery and response within 30 days is treated as the reference configuration with zero alternative specific constant.",
        "The mixed logit (MXL) model assumes that the individual specific parameter vector θ_n = (α_A,n, α_O,n, β_1,n, …, β_11,n)' follows a continuous distribution f(θ_n | ψ), where ψ collects the means and standard deviations of random coefficients. All taste parameters for non cost attributes and alternative specific constants are assumed normally distributed, while the cost coefficient follows a negative log normal distribution. This ensures that the marginal utility of cost is strictly negative for all respondents and produces a positively skewed distribution consistent with a small subset of relatively cost insensitive decision makers.:contentReference[oaicite:3]{index=3}",
        "Conditional on θ_n, the choice probability is multinomial logit:",
        "  P(y_nt = i | θ_n) = exp(V_nit) / Σ_j exp(V_njt),",
        "and unconditional probabilities integrate over f(θ_n | ψ) using simulated maximum likelihood.",
        "In the latent class (LC) model, the sample is partitioned into a small number of classes c = 1,…,C, each with its own parameter vector θ_c. Membership probabilities are modelled as functions of covariates or as class specific constants. STEPS uses Class 2, interpreted as “training supporters”, to produce an alternative set of benefits and uptake probabilities for a supportive stakeholder segment."
      ]
    },
    {
      title: "3. Benefit calculation and willingness to pay",
      body: [
        "Willingness to pay (WTP) for changes in programme attributes is derived as the ratio of attribute coefficients to the cost coefficient. For attribute k with coefficient β_k,n and cost coefficient β_11,n, individual specific WTP is WTP_k,n = -β_k,n / β_11,n, interpreted as additional cost per trainee per month that decision makers are willing to accept in exchange for moving from the reference level to the specified level. Point estimates for WTP use the ratio of mean attribute coefficients to the mean of the simulated cost coefficient, with standard errors obtained using the delta method.",
        "STEPS embeds WTP estimates from the mixed logit and Class 2 latent class models. Attribute level WTP values (in thousands of INR per trainee per month) are stored in lookup tables for:",
        "- Programme tier: intermediate and advanced versus frontline;",
        "- Mentorship intensity: medium and high versus low;",
        "- Career incentives: university qualification and government career pathway versus government and partner certificate;",
        "- Delivery mode: fully in person and fully online versus blended;",
        "- Outbreak response capacity: investigate within 15 or 7 days versus 30 days.",
        "For a given configuration, STEPS sums the relevant WTP values to obtain a total WTP per trainee per month. This is multiplied by programme duration (in months) and cohort size to generate a cohort level monetary benefit. Benefits are compared to direct programme costs to obtain financial benefit–cost ratios, and to economic costs (including opportunity cost) to obtain economic benefit–cost ratios."
      ]
    },
    {
      title: "4. Costing templates and opportunity cost",
      body: [
        "Cost templates for frontline, intermediate and advanced tiers are derived from WHO, NIE and NCDC cost data. These include salaries and benefits for in country programme staff, equipment and software, rent and utilities, training materials, workshops and travel, management and oversight, shared services, and trainee opportunity costs based on salary during training absences.",
        "For the frontline tier, the average cost per cohort, including six cohorts of training, combines direct costs (staff, workshops, travel and materials) and trainee opportunity costs. The ratio of opportunity cost to direct cost is approximately two thirds. For the intermediate tier, the opportunity cost share is much smaller. No explicit opportunity cost data are available for the advanced tier, so the intermediate tier ratio is used as a conservative proxy.",
        "In STEPS, the slider for cost per trainee per month represents direct financial programme cost. Opportunity cost is calculated by multiplying direct cost by the opportunity cost ratio for the selected tier. Financial benefit–cost ratios are based on direct costs only. Economic benefit–cost ratios include both direct and opportunity costs.",
        "Default cost baselines per trainee per month are based on dividing total direct costs by approximate numbers of trainees and months (for example 60 trainees for frontline, intermediate and advanced tiers) and are constrained to remain inside the 75,000 to 400,000 INR range used in the DCE."
      ]
    },
    {
      title: "5. Epidemiological assumptions and benefits",
      body: [
        "Epidemiological assumptions in STEPS reflect evidence that Field Epidemiology Training Programs improve outbreak detection, investigation and response, and strengthen surveillance and leadership capacity within ministries of health. Evaluations of FETPs and similar programmes report improved timeliness and completeness of surveillance, more rapid outbreak investigations and stronger coordination of response activities.:contentReference[oaicite:4]{index=4}",
        "Because published studies rarely provide precise monetary valuations per FETP graduate, STEPS uses simple, conservative assumptions that can be updated in a configuration file. For each tier, a default economic value per graduate is set as a multiple of typical public sector salary, reflecting both productivity gains and avoided outbreak losses. These are combined with assumptions about the number of years graduates remain active in the field and a constant discount rate to obtain the present value of benefits.",
        "For advanced programmes, an additional outbreak based benefit is included. A small number of moderate outbreaks averted per hundred advanced graduates per year is assumed, multiplied by an estimated economic loss per moderate outbreak drawn from the wider literature on the economic consequences of infectious disease outbreaks. The resulting monetary benefit is added to the graduate based benefit to produce a simple indicative value.",
        "All epidemiological parameters are stored in a separate configuration file (epi_config.json) so that national experts and World Bank counterparts can update values without changing core code. This separation also allows sensitivity analysis on alternative outbreak scenarios and valuations."
      ]
    },
    {
      title: "6. Interpretation and limitations",
      body: [
        "STEPS is designed as a transparent decision aid rather than a fully specified dynamic transmission model or a comprehensive cost–benefit analysis. Its strengths lie in linking stated preferences from the DCE to concrete programme design decisions, making explicit the trade offs between extra mentorship, faster outbreak response, stronger career incentives and higher programme costs.",
        "Several limitations should be recognised. First, monetary benefits are based on willingness to pay derived from stated preferences rather than revealed preference data. Second, epidemiological benefits rely on simple multipliers that summarise complex processes in a single number. Third, the opportunity cost estimates depend on available salary and costing information and may need refinement as more detailed data become available.",
        "Despite these limitations, the combination of DCE evidence, costing templates and epidemiological assumptions offers a structured and consistent way to compare alternative FETP scale up strategies under different resource envelopes. It supports constructive dialogue between the Ministry of Health, implementing partners and funders on how to configure FETP tiers, cohort sizes and mentorship intensity to maximise value for money and public health impact."
      ]
    },
    {
      title: "7. Author and contact",
      body: [
        "This technical appendix was prepared to accompany the STEPS decision aid tool for FETP scale up in India.",
        "Author: Mesfin Genie, PhD, Newcastle Business School, The University of Newcastle, Australia.",
        "Contact: mesfin.genie@newcastle.edu.au."
      ]
    }
  ];
}

function downloadPolicyPDF(scenario) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setLineHeightFactor(1.4);

  const lines = buildPolicyBriefText(scenario);
  let y = 15;
  const margin = 15;
  const pageHeight = doc.internal.pageSize.getHeight();

  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, doc.internal.pageSize.getWidth() - margin * 2);
    wrapped.forEach((wLine) => {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15;
      }
      doc.text(wLine, margin, y);
      y += 5;
    });
    y += 1;
  });

  doc.save("STEPS_FETP_policy_brief.pdf");
}

function downloadTechnicalPDF(scenario) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setLineHeightFactor(1.5);

  const sections = buildTechnicalAppendixSections(scenario);
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  sections.forEach((sec, index) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.text(sec.title, margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");

    sec.body.forEach((para) => {
      const wrapped = doc.splitTextToSize(para, pageWidth - margin * 2);
      wrapped.forEach((wLine) => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = margin;
        }
        doc.text(wLine, margin, y);
        y += 5;
      });
      y += 2;
    });

    if (index < sections.length - 1) {
      y += 4;
    }
  });

  doc.save("STEPS_FETP_technical_appendix.pdf");
}

// Excel export

function downloadExcel() {
  if (appState.savedScenarios.length === 0 && !appState.currentScenario) {
    return;
  }

  const rows = [];
  rows.push([
    "Name",
    "Tier",
    "Mentorship",
    "Career incentives",
    "Delivery mode",
    "Response days",
    "Cost per trainee per month (INR)",
    "Cohort size",
    "Number of cohorts",
    "Preference model",
    "Include opportunity cost",
    "Uptake",
    "BCR (financial)",
    "BCR (economic)",
    "Net benefit per cohort (INR)",
    "Direct cost per cohort (INR)",
    "Economic cost per cohort (INR)",
    "Scenario notes"
  ]);

  const scenarios = [...appState.savedScenarios];
  if (appState.currentScenario && !scenarios.includes(appState.currentScenario)) {
    scenarios.push(appState.currentScenario);
  }

  scenarios.forEach((s, idx) => {
    const name =
      s.name ||
      `Scenario ${idx + 1}: ${s.config.programType}, ${s.config.mentorship}, ${s.config.responseTime} days`;
    rows.push([
      name,
      s.config.programType,
      s.config.mentorship,
      s.config.careerIncentive,
      s.config.deliveryMode,
      s.config.responseTime,
      s.config.costPerTrainee,
      s.config.cohortSize,
      s.config.numCohorts,
      s.config.prefModel,
      s.config.includeOppCost ? "Yes" : "No",
      s.uptake,
      s.bcrFinancial,
      s.bcrEconomic,
      s.netBenefitPerCohortINR,
      s.costs.directCostPerCohortINR,
      s.costs.economicCostPerCohortINR,
      s.config.scenarioNotes || ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "STEPS scenarios");
  XLSX.writeFile(wb, "STEPS_FETP_scenarios.xlsx");
}

// -------------------------------
// Tab handling and UI wiring
// -------------------------------

function switchTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");

  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
}

function openModal(scenario) {
  const modal = document.getElementById("resultsModal");
  const backdrop = document.getElementById("modalBackdrop");
  if (!modal || !backdrop) return;

  document.getElementById("modalHeadline").textContent = classifyScenario(
    scenario.bcrEconomic,
    scenario.uptake
  );
  document.getElementById("modalUptake").textContent = formatPercent(scenario.uptake);
  document.getElementById("modalBCRFinancial").textContent = scenario.bcrFinancial.toFixed(2);
  document.getElementById("modalBCREconomic").textContent = scenario.bcrEconomic.toFixed(2);
  document.getElementById("modalNetBenefit").textContent = formatCurrencyDisplay(
    scenario.netBenefitPerCohortINR
  );

  modal.classList.remove("hidden");
  backdrop.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("resultsModal");
  const backdrop = document.getElementById("modalBackdrop");
  if (!modal || !backdrop) return;
  modal.classList.add("hidden");
  backdrop.classList.add("hidden");
}

// -------------------------------
// Initialisation
// -------------------------------

window.addEventListener("DOMContentLoaded", () => {
  loadEpiConfig();

  // Tabs
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Cost slider and labels
  const costSlider = document.getElementById("costPerTrainee");
  const costDisplay = document.getElementById("costPerTraineeDisplay");
  const costCurrencyLabel = document.getElementById("costCurrencyLabel");

  function updateCostDisplay() {
    const cfg = getConfigFromUI();
    costCurrencyLabel.textContent = appState.currencyDisplay;
    costDisplay.textContent = formatCurrencyDisplay(cfg.costPerTrainee);
  }

  costSlider.addEventListener("input", () => {
    updateCostDisplay();
    const cfg = getConfigFromUI();
    updateConfigSummary(cfg);
  });

  document.querySelectorAll('input[name="currencyDisplay"]').forEach((r) => {
    r.addEventListener("change", () => {
      const cfg = getConfigFromUI();
      updateCostDisplay();
      updateConfigSummary(cfg);
      if (appState.currentScenario) renderResults(appState.currentScenario);
    });
  });

  // Cost template button
  document.getElementById("btnUseCostTemplate").addEventListener("click", () => {
    const tier = document.getElementById("programType").value;
    const baseline = COST_BASELINES[tier] || 100000;
    costSlider.value = Math.round(baseline);
    updateCostDisplay();
    const cfg = getConfigFromUI();
    updateConfigSummary(cfg);
  });

  // Update config summary when selects change
  ["programType", "mentorship", "careerIncentive", "deliveryMode", "responseTime", "cohortSize", "numCohorts", "prefModel"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", () => {
        const cfg = getConfigFromUI();
        updateCostDisplay();
        updateConfigSummary(cfg);
      });
    }
  );

  document.getElementById("includeOppCost").addEventListener("change", () => {
    const cfg = getConfigFromUI();
    updateConfigSummary(cfg);
    if (appState.currentScenario) {
      appState.currentScenario = computeScenario(cfg);
      renderResults(appState.currentScenario);
    }
  });

  // Apply configuration
  document.getElementById("btnApplyConfig").addEventListener("click", () => {
    const cfg = getConfigFromUI();
    const scenario = computeScenario(cfg);
    appState.currentScenario = scenario;
    updateConfigSummary(cfg);
    renderResults(scenario);
    // Open modal without auto scrolling the page
    openModal(scenario);
    switchTab("resultsTab");
  });

  // Save scenario
  document.getElementById("btnSaveScenario").addEventListener("click", () => {
    if (!appState.currentScenario) {
      const cfg = getConfigFromUI();
      const sc = computeScenario(cfg);
      appState.currentScenario = sc;
    }
    const sc = appState.currentScenario;
    const tierLabel =
      sc.config.programType === "frontline"
        ? "Frontline"
        : sc.config.programType === "intermediate"
        ? "Intermediate"
        : "Advanced";
    const name = `${tierLabel}, ${sc.config.mentorship}, ${sc.config.responseTime}d, ${formatCurrencyINR(
      sc.config.costPerTrainee
    )}`;
    appState.savedScenarios.push({ ...sc, name });
    renderSavedScenarios();
    renderScenarioCompareChart();
  });

  // Clear scenarios
  document.getElementById("btnClearScenarios").addEventListener("click", () => {
    appState.savedScenarios = [];
    renderSavedScenarios();
    renderScenarioCompareChart();
  });

  // Modal close
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", closeModal);

  // Downloads
  document.getElementById("btnDownloadPolicyPDF").addEventListener("click", () => {
    if (!appState.currentScenario) return;
    downloadPolicyPDF(appState.currentScenario);
  });
  document.getElementById("btnDownloadTechnicalPDF").addEventListener("click", () => {
    if (!appState.currentScenario) return;
    downloadTechnicalPDF(appState.currentScenario);
  });
  document.getElementById("btnDownloadPolicyPDF2").addEventListener("click", () => {
    if (!appState.currentScenario) return;
    downloadPolicyPDF(appState.currentScenario);
  });
  document.getElementById("btnDownloadTechnicalPDF2").addEventListener("click", () => {
    if (!appState.currentScenario) return;
    downloadTechnicalPDF(appState.currentScenario);
  });

  document.getElementById("btnDownloadExcel").addEventListener("click", downloadExcel);

  // Initialise defaults: frontline tier baseline cost, config summary
  costSlider.value = COST_BASELINES.frontline;
  updateCostDisplay();
  const initialCfg = getConfigFromUI();
  updateConfigSummary(initialCfg);
});
