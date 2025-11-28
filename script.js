// ===========================
// Global configuration
// ===========================

// Model coefficients from the paper
// Utilities are defined relative to baseline levels
// Cost coefficients are per 1 000 INR per trainee per month

const MODELS = {
  mxl: {
    key: "mxl",
    label: "Mixed logit (average stakeholders)",
    ascOptOut: -0.601, // ASC for opt out
    costCoef: -0.005,  // mean marginal disutility of cost (per 1 000 INR)
    betas: {
      programIntermediate: 0.220,
      programAdvanced: 0.487,
      incUniversity: 0.017,
      incGovPath: -0.122,
      mentorMedium: 0.453,
      mentorHigh: 0.640,
      deliveryInPerson: -0.232,
      deliveryOnline: -1.073,
      resp15: 0.546,
      resp7: 0.610
    }
  },
  lc2: {
    key: "lc2",
    label: "Latent class 2 (training supporters)",
    ascOptOut: -2.543,
    costCoef: -0.001, // cost per 1 000 INR
    betas: {
      programIntermediate: 0.087,
      programAdvanced: 0.422,
      incUniversity: -0.024,
      incGovPath: -0.123,
      mentorMedium: 0.342,
      mentorHigh: 0.486,
      deliveryInPerson: -0.017,
      deliveryOnline: -0.700,
      resp15: 0.317,
      resp7: 0.504
    }
  }
};

// WTP estimates in 1 000 INR per trainee per month
// MXL from Table 4; LC2 from Table 6 (class 2)
const WTP_SETS = {
  mxl: {
    programIntermediate: 47.06,
    programAdvanced: 103.99,
    incUniversity: 3.69,
    incGovPath: -26.17,
    mentorMedium: 96.87,
    mentorHigh: 136.79,
    deliveryInPerson: -49.56,
    deliveryOnline: -229.33,
    resp15: 116.70,
    resp7: 130.46
  },
  lc2: {
    programIntermediate: 63.0,
    programAdvanced: 303.0,
    incUniversity: -18.0,
    incGovPath: -88.0,
    mentorMedium: 245.0,
    mentorHigh: 349.0,
    deliveryInPerson: -12.0,
    deliveryOnline: -503.0,
    resp15: 228.0,
    resp7: 362.0
  }
};

// Duration of each tier in months
const DURATION_MONTHS = {
  frontline: 3,
  intermediate: 12,
  advanced: 24
};

// Cost templates per cohort (INR) from WHO, NIE and NCDC
const COST_TEMPLATES = {
  frontline: {
    WHO: 17413794 // per cohort
  },
  intermediate: {
    WHO: 70300369,
    NIE: 208739950,
    NCDC: 8900000
  },
  advanced: {
    NIE: 229810700,
    NCDC: 74200000
  }
};

// State
const appState = {
  modelKey: "mxl",
  lastResults: null
};

// Charts
let chartUptake = null;
let chartBenefitCost = null;
let chartSensitivity = null;
let chartSimulation = null;

// ===========================
// Helpers
// ===========================

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(value) {
  if (!isFinite(value)) return "-";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return sign + abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatCurrencyLakh(value) {
  if (!isFinite(value)) return "-";
  const lakh = value / 100000;
  return lakh.toFixed(1) + " lakh";
}

function logistic(x) {
  if (x > 40) return 1;
  if (x < -40) return 0;
  return 1 / (1 + Math.exp(-x));
}

// ===========================
// Core DCE and CBA engine
// ===========================

function readConfig() {
  const programType = document.getElementById("programType").value;
  const careerIncentive = document.getElementById("careerIncentive").value;
  const mentorshipLevel = document.getElementById("mentorshipLevel").value;
  const deliveryMode = document.getElementById("deliveryMode").value;
  const responseTime = document.getElementById("responseTime").value;
  const costSource = document.getElementById("costSource").value;

  const monthlyCostInput = Number(document.getElementById("monthlyCost").value) || 0;
  const monthlyCost = clamp(monthlyCostInput, 10000, 600000);

  const cohortSize = Number(document.getElementById("cohortSize").value) || 20;
  const cohortsNational = Number(document.getElementById("nationalCohorts").value) || 1;

  return {
    programType,
    careerIncentive,
    mentorshipLevel,
    deliveryMode,
    responseTime,
    costSource,
    monthlyCost,
    cohortSize,
    cohortsNational
  };
}

// Apply cost template to fill monthly cost if available
function applyCostTemplate(config) {
  const duration = DURATION_MONTHS[config.programType] || 12;
  const templates = COST_TEMPLATES[config.programType];
  if (!templates) return null;

  const templateTotal = templates[config.costSource];
  if (!templateTotal) return null;

  const perTraineePerMonth = templateTotal / (config.cohortSize * duration);
  return perTraineePerMonth;
}

// Compute DCE uptake and WTP-based benefits
function computeResults(config) {
  const model = MODELS[appState.modelKey];
  const wtpSet = WTP_SETS[appState.modelKey];

  // Attribute indicators
  const x = {
    programIntermediate: config.programType === "intermediate" ? 1 : 0,
    programAdvanced: config.programType === "advanced" ? 1 : 0,
    incUniversity: config.careerIncentive === "university" ? 1 : 0,
    incGovPath: config.careerIncentive === "govpath" ? 1 : 0,
    mentorMedium: config.mentorshipLevel === "medium" ? 1 : 0,
    mentorHigh: config.mentorshipLevel === "high" ? 1 : 0,
    deliveryInPerson: config.deliveryMode === "inperson" ? 1 : 0,
    deliveryOnline: config.deliveryMode === "online" ? 1 : 0,
    resp15: config.responseTime === "15" ? 1 : 0,
    resp7: config.responseTime === "7" ? 1 : 0
  };

  // Utility for a single training program relative to a baseline with all reference attributes
  const costThousand = config.monthlyCost / 1000;
  let vProgram = 0;
  vProgram += model.betas.programIntermediate * x.programIntermediate;
  vProgram += model.betas.programAdvanced * x.programAdvanced;
  vProgram += model.betas.incUniversity * x.incUniversity;
  vProgram += model.betas.incGovPath * x.incGovPath;
  vProgram += model.betas.mentorMedium * x.mentorMedium;
  vProgram += model.betas.mentorHigh * x.mentorHigh;
  vProgram += model.betas.deliveryInPerson * x.deliveryInPerson;
  vProgram += model.betas.deliveryOnline * x.deliveryOnline;
  vProgram += model.betas.resp15 * x.resp15;
  vProgram += model.betas.resp7 * x.resp7;
  vProgram += model.costCoef * costThousand;

  // Utility for opting out
  const vNone = model.ascOptOut;

  // Probability that stakeholders endorse training rather than opt out
  const uptakeProb = logistic(vProgram - vNone);

  // WTP based value per trainee per month (1 000 INR)
  let wtpPerTraineeMonthK = 0;
  wtpPerTraineeMonthK += wtpSet.programIntermediate * x.programIntermediate;
  wtpPerTraineeMonthK += wtpSet.programAdvanced * x.programAdvanced;
  wtpPerTraineeMonthK += wtpSet.incUniversity * x.incUniversity;
  wtpPerTraineeMonthK += wtpSet.incGovPath * x.incGovPath;
  wtpPerTraineeMonthK += wtpSet.mentorMedium * x.mentorMedium;
  wtpPerTraineeMonthK += wtpSet.mentorHigh * x.mentorHigh;
  wtpPerTraineeMonthK += wtpSet.deliveryInPerson * x.deliveryInPerson;
  wtpPerTraineeMonthK += wtpSet.deliveryOnline * x.deliveryOnline;
  wtpPerTraineeMonthK += wtpSet.resp15 * x.resp15;
  wtpPerTraineeMonthK += wtpSet.resp7 * x.resp7;

  const wtpPerTraineeMonth = wtpPerTraineeMonthK * 1000;

  // Duration and costs
  const duration = DURATION_MONTHS[config.programType] || 12;
  const cohortCost = config.monthlyCost * config.cohortSize * duration;

  // Total socio economic benefit for this cohort
  const expectedValuePerTraineeMonth = uptakeProb * wtpPerTraineeMonth;
  const totalBenefit = expectedValuePerTraineeMonth * config.cohortSize * duration;

  const bcr = cohortCost > 0 ? totalBenefit / cohortCost : NaN;
  const netBenefit = totalBenefit - cohortCost;

  // National simulation
  const totalBenefitNational = totalBenefit * config.cohortsNational;
  const totalCostNational = cohortCost * config.cohortsNational;
  const netBenefitNational = totalBenefitNational - totalCostNational;

  return {
    modelLabel: model.label,
    vProgram,
    vNone,
    uptakeProb,
    wtpPerTraineeMonth,
    duration,
    cohortCost,
    totalBenefit,
    bcr,
    netBenefit,
    totalBenefitNational,
    totalCostNational,
    netBenefitNational
  };
}

// ===========================
// UI update functions
// ===========================

function updateResultsUI(config, results) {
  const uptakePercent = results.uptakeProb * 100;

  document.getElementById("resultModelLabel").textContent = results.modelLabel;
  document.getElementById("resultUptake").textContent = uptakePercent.toFixed(1) + " %";
  document.getElementById("resultUptakeNote").textContent =
    uptakePercent >= 70
      ? "High endorsement of this configuration among stakeholders."
      : uptakePercent >= 40
        ? "Moderate endorsement. Some stakeholders may prefer not to adopt this design."
        : "Low endorsement. The configuration may need adjustment.";

  document.getElementById("resultValuePerTrainee").textContent =
    "₹ " + formatCurrency(results.wtpPerTraineeMonth);

  document.getElementById("resultCohortCost").textContent =
    "₹ " + formatCurrency(results.cohortCost);

  document.getElementById("resultDurationNote").textContent =
    "Duration: " +
    results.duration +
    " months, cohort size " +
    config.cohortSize +
    " trainees.";

  document.getElementById("resultTotalBenefit").textContent =
    "₹ " + formatCurrency(results.totalBenefit);

  const bcrText = isFinite(results.bcr) ? results.bcr.toFixed(2) : "-";
  document.getElementById("resultBcr").textContent = bcrText;

  let bcrNote = "";
  if (results.bcr > 1.2) {
    bcrNote = "Strong value for money at cohort level.";
  } else if (results.bcr >= 1.0) {
    bcrNote = "Benefits slightly exceed costs.";
  } else if (isFinite(results.bcr)) {
    bcrNote = "Net benefits are negative at this cost level.";
  }
  document.getElementById("resultBcrNote").textContent = bcrNote;

  document.getElementById("resultNb").textContent =
    "₹ " + formatCurrency(results.netBenefit);

  // National simulation labels
  document.getElementById("simCohortsLabel").textContent =
    String(config.cohortsNational);
  document.getElementById("simTotalCost").textContent =
    "₹ " + formatCurrency(results.totalCostNational);
  document.getElementById("simTotalBenefit").textContent =
    "₹ " + formatCurrency(results.totalBenefitNational);
  document.getElementById("simNetBenefit").textContent =
    "₹ " + formatCurrency(results.netBenefitNational);

  // Update report note
  document.getElementById("reportNote").textContent =
    "Current configuration: " +
    config.programType.charAt(0).toUpperCase() +
    config.programType.slice(1) +
    " FETP, " +
    config.cohortSize +
    " trainees per cohort, model " +
    results.modelLabel +
    ".";
}

// ===========================
// Charts
// ===========================

function updateCharts(config, results) {
  const uptakePercent = results.uptakeProb * 100;

  // Uptake chart
  const uptakeCtx = document.getElementById("chartUptake").getContext("2d");
  if (chartUptake) chartUptake.destroy();
  chartUptake = new Chart(uptakeCtx, {
    type: "doughnut",
    data: {
      labels: ["Endorse training", "Prefer no training"],
      datasets: [
        {
          data: [uptakePercent, 100 - uptakePercent]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.label + ": " + ctx.parsed.toFixed(1) + " %";
            }
          }
        }
      },
      cutout: "65%"
    }
  });

  // Benefit vs cost chart
  const benefitCtx = document
    .getElementById("chartBenefitCost")
    .getContext("2d");
  if (chartBenefitCost) chartBenefitCost.destroy();
  chartBenefitCost = new Chart(benefitCtx, {
    type: "bar",
    data: {
      labels: ["Cost", "Benefit"],
      datasets: [
        {
          data: [results.cohortCost, results.totalBenefit]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return "₹ " + formatCurrency(ctx.parsed);
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              return formatCurrencyLakh(value);
            }
          }
        }
      }
    }
  });

  // Sensitivity chart
  const sensCtx = document.getElementById("chartSensitivity").getContext("2d");
  const costBase = config.monthlyCost;
  const costValues = [0.8 * costBase, costBase, 1.2 * costBase];
  const uptakeVals = costValues.map((c) => {
    const cfg = { ...config, monthlyCost: c };
    const res = computeResults(cfg);
    return res.uptakeProb * 100;
  });
  if (chartSensitivity) chartSensitivity.destroy();
  chartSensitivity = new Chart(sensCtx, {
    type: "line",
    data: {
      labels: ["-20 % cost", "Base cost", "+20 % cost"],
      datasets: [
        {
          data: uptakeVals
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.parsed.toFixed(1) + " % uptake";
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            callback: function (v) {
              return v + " %";
            }
          }
        }
      }
    }
  });

  // National simulation chart
  const simCtx = document
    .getElementById("chartSimulation")
    .getContext("2d");
  if (chartSimulation) chartSimulation.destroy();
  chartSimulation = new Chart(simCtx, {
    type: "bar",
    data: {
      labels: ["Total cost", "Total benefit"],
      datasets: [
        {
          data: [results.totalCostNational, results.totalBenefitNational]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return "₹ " + formatCurrency(ctx.parsed);
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              return formatCurrencyLakh(value);
            }
          }
        }
      }
    }
  });
}

// ===========================
// Modal
// ===========================

function openResultsModal(config, results) {
  const modal = document.getElementById("resultsModal");
  const uptakePercent = results.uptakeProb * 100;

  const lines = [];
  lines.push(
    "This summary is based on the discrete choice experiment of FETP stakeholders in India and the selected costing assumptions."
  );
  lines.push(
    "The scenario combines the chosen program type, mentorship, delivery mode, response capacity and monthly cost per trainee."
  );
  lines.push(
    "Uptake is interpreted as the share of stakeholders who would endorse this training configuration rather than choosing no training at all."
  );

  document.getElementById("modalSummaryText").textContent = lines.join(" ");

  document.getElementById("modalUptakeDetail").textContent =
    "Using the " +
    results.modelLabel +
    ", the predicted endorsement rate for this configuration is " +
    uptakePercent.toFixed(1) +
    " percent. This reflects the combined influence of program type, mentorship, delivery mode, outbreak response capacity and cost.";

  document.getElementById("modalCostDetail").textContent =
    "With a cohort of " +
    config.cohortSize +
    " trainees over " +
    results.duration +
    " months, the total cohort cost is approximately ₹" +
    formatCurrency(results.cohortCost) +
    ". The expected socio economic benefit, based on willingness to pay estimates and uptake, is about ₹" +
    formatCurrency(results.totalBenefit) +
    ", giving a benefit cost ratio of " +
    (isFinite(results.bcr) ? results.bcr.toFixed(2) : "-") +
    " and a net benefit of ₹" +
    formatCurrency(results.netBenefit) +
    ".";

  document.getElementById("modalNationalDetail").textContent =
    "Scaling this configuration to " +
    config.cohortsNational +
    " cohorts gives a total national programme cost of roughly ₹" +
    formatCurrency(results.totalCostNational) +
    " and a total benefit of about ₹" +
    formatCurrency(results.totalBenefitNational) +
    ". The resulting national net benefit is approximately ₹" +
    formatCurrency(results.netBenefitNational) +
    ".";

  let recommendation = "";
  if (results.uptakeProb >= 0.7 && results.bcr > 1.1) {
    recommendation =
      "This configuration appears to be a strong candidate for priority scale up. It secures both high stakeholder endorsement and clear net benefits. It may be suitable as a leading scenario in the business case, subject to workforce and implementation constraints.";
  } else if (results.uptakeProb >= 0.5 && results.bcr >= 1.0) {
    recommendation =
      "This configuration delivers acceptable net benefits with moderate endorsement. Consider this option as part of a portfolio of scenarios, and explore whether modest adjustments to cost, mentorship intensity or response capacity can raise uptake further.";
  } else if (results.bcr >= 1.0) {
    recommendation =
      "Although net benefits are positive, predicted endorsement is relatively low. Engagement and communication with key stakeholder groups may be required, or the design may need to shift towards more advanced training and stronger mentorship.";
  } else {
    recommendation =
      "At the current cost and design, predicted endorsement and net benefits are limited. Consider reducing per trainee costs, increasing mentorship intensity, moving towards blended delivery or improving outbreak response capacity to strengthen both uptake and value.";
  }
  document.getElementById("modalRecommendation").textContent = recommendation;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeResultsModal() {
  const modal = document.getElementById("resultsModal");
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

// ===========================
// Export helpers
// ===========================

function exportExcel(config, results) {
  if (!results) return;

  const rows = [
    ["Section", "Metric", "Value"],
    ["Model", "Preference model", results.modelLabel],
    ["Configuration", "Program type", config.programType],
    ["Configuration", "Career incentive", config.careerIncentive],
    ["Configuration", "Mentorship level", config.mentorshipLevel],
    ["Configuration", "Delivery mode", config.deliveryMode],
    ["Configuration", "Response time", config.responseTime + " days"],
    ["Configuration", "Cost per trainee per month (INR)", config.monthlyCost],
    ["Configuration", "Cohort size", config.cohortSize],
    ["Configuration", "National cohorts", config.cohortsNational],
    [
      "DCE",
      "Uptake probability",
      (results.uptakeProb * 100).toFixed(1) + " %"
    ],
    [
      "DCE",
      "Per trainee value (INR per month)",
      Math.round(results.wtpPerTraineeMonth)
    ],
    ["Costs", "Duration (months)", results.duration],
    ["Costs", "Cohort cost (INR)", Math.round(results.cohortCost)],
    ["Benefits", "Total benefit cohort (INR)", Math.round(results.totalBenefit)],
    [
      "Benefits",
      "Benefit cost ratio",
      isFinite(results.bcr) ? results.bcr.toFixed(3) : ""
    ],
    ["Benefits", "Net benefit cohort (INR)", Math.round(results.netBenefit)],
    [
      "National",
      "Total national cost (INR)",
      Math.round(results.totalCostNational)
    ],
    [
      "National",
      "Total national benefit (INR)",
      Math.round(results.totalBenefitNational)
    ],
    [
      "National",
      "National net benefit (INR)",
      Math.round(results.netBenefitNational)
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "STEPS summary");
  XLSX.writeFile(wb, "STEPS_FETP_summary.xlsx");
}

function exportPdf(config, results) {
  if (!results) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const margin = 40;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("STEPS FETP scale up brief – India", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const para1 =
    "This brief summarises a Field Epidemiology Training Program (FETP) configuration evaluated with STEPS. " +
    "Results combine discrete choice experiment evidence on stakeholder preferences with costing assumptions for the selected scenario.";

  const para2 =
    "Scenario: " +
    config.programType.charAt(0).toUpperCase() +
    config.programType.slice(1) +
    " FETP, " +
    config.cohortSize +
    " trainees per cohort, " +
    results.duration +
    " months duration, cost of about ₹" +
    formatCurrency(config.monthlyCost) +
    " per trainee per month, using the " +
    results.modelLabel +
    ".";

  const uptakeLine =
    "Predicted endorsement of this configuration is " +
    (results.uptakeProb * 100).toFixed(1) +
    " percent. The expected socio economic benefit per cohort is roughly ₹" +
    formatCurrency(results.totalBenefit) +
    " against a cost of ₹" +
    formatCurrency(results.cohortCost) +
    ", giving a benefit cost ratio of " +
    (isFinite(results.bcr) ? results.bcr.toFixed(2) : "-") +
    " and a net benefit of about ₹" +
    formatCurrency(results.netBenefit) +
    ".";

  const nationalLine =
    "Scaling to " +
    config.cohortsNational +
    " cohorts implies total national programme costs of around ₹" +
    formatCurrency(results.totalCostNational) +
    " and total benefits of about ₹" +
    formatCurrency(results.totalBenefitNational) +
    ", with a national net benefit close to ₹" +
    formatCurrency(results.netBenefitNational) +
    ".";

  let recommendation = "";
  if (results.uptakeProb >= 0.7 && results.bcr > 1.1) {
    recommendation =
      "Interpretation: This configuration appears suitable as a leading option for scale up, subject to practical workforce and delivery constraints. " +
      "It combines high stakeholder support with clear net benefits and may be presented as a primary scenario in the business case.";
  } else if (results.uptakeProb >= 0.5 && results.bcr >= 1.0) {
    recommendation =
      "Interpretation: This configuration is promising but not dominant. It may be best framed as one of several candidate options, with further analysis of " +
      "alternative mentorship levels, response times or cost sharing arrangements to enhance both uptake and value.";
  } else if (results.bcr >= 1.0) {
    recommendation =
      "Interpretation: Benefits exceed costs but endorsement is limited. Complementary strategies, such as stronger communication, institutional incentives " +
      "or targeted engagement with hesitant stakeholder groups, may be required before large scale investment.";
  } else {
    recommendation =
      "Interpretation: At current cost and design, both net benefits and endorsement are modest. Consider adjusting programme features to improve value, " +
      "for example increasing mentorship intensity, prioritising advanced training, delivering in blended format and managing per trainee costs.";
  }

  function writeParagraph(text) {
    const lines = doc.splitTextToSize(text, 515);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 6;
  }

  writeParagraph(para1);
  writeParagraph(para2);
  writeParagraph(uptakeLine);
  writeParagraph(nationalLine);
  writeParagraph(recommendation);

  doc.save("STEPS_FETP_brief.pdf");
}

// ===========================
// Tabs and events
// ===========================

function setActiveTab(tabKey) {
  const panels = document.querySelectorAll(".tab-panel");
  const buttons = document.querySelectorAll(".tab-button");
  panels.forEach((p) => {
    if (p.id === "tab-" + tabKey) {
      p.classList.add("is-active");
    } else {
      p.classList.remove("is-active");
    }
  });
  buttons.forEach((b) => {
    if (b.dataset.tab === tabKey) {
      b.classList.add("is-active");
    } else {
      b.classList.remove("is-active");
    }
  });
}

function selectModel(modelKey) {
  if (!MODELS[modelKey]) return;
  appState.modelKey = modelKey;

  document
    .querySelectorAll(".pill-option")
    .forEach((btn) =>
      btn.classList.toggle("is-selected", btn.dataset.model === modelKey)
    );
}

function syncCostSlider() {
  const input = document.getElementById("monthlyCost");
  const slider = document.getElementById("monthlyCostSlider");
  const val = clamp(Number(input.value) || 0, 10000, 600000);
  input.value = val;
  slider.value = clamp(val, slider.min, slider.max);
}

function syncCostInput() {
  const input = document.getElementById("monthlyCost");
  const slider = document.getElementById("monthlyCostSlider");
  const val = Number(slider.value) || 0;
  input.value = val;
}

// Main recomputation
function recomputeAndRefresh(openResultsIfOnResultsTab) {
  const config = readConfig();

  // Apply template if chosen and available
  if (config.costSource !== "custom") {
    const templ = applyCostTemplate(config);
    if (templ && isFinite(templ)) {
      config.monthlyCost = Math.round(templ);
      document.getElementById("monthlyCost").value = config.monthlyCost;
      document.getElementById("monthlyCostSlider").value = clamp(
        config.monthlyCost,
        document.getElementById("monthlyCostSlider").min,
        document.getElementById("monthlyCostSlider").max
      );
    }
  }

  const results = computeResults(config);
  appState.lastResults = { config, results };

  updateResultsUI(config, results);
  updateCharts(config, results);

  const activePanel = document.querySelector(".tab-panel.is-active");
  if (openResultsIfOnResultsTab && activePanel && activePanel.id === "tab-results") {
    openResultsModal(config, results);
  }
}

// ===========================
// Initialisation
// ===========================

document.addEventListener("DOMContentLoaded", () => {
  // Tab buttons
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabKey = btn.dataset.tab;
      setActiveTab(tabKey);
      if (tabKey === "results" && appState.lastResults) {
        // results already up to date
      }
      if (tabKey === "sensitivity" || tabKey === "simulation") {
        if (appState.lastResults) {
          // charts already updated by recompute
        } else {
          recomputeAndRefresh(false);
        }
      }
    });
  });

  // Model switch
  document.querySelectorAll(".pill-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectModel(btn.dataset.model);
      recomputeAndRefresh(false);
    });
  });

  // Cost inputs
  document
    .getElementById("monthlyCost")
    .addEventListener("input", () => {
      syncCostSlider();
    });
  document
    .getElementById("monthlyCostSlider")
    .addEventListener("input", () => {
      syncCostInput();
      recomputeAndRefresh(false);
    });

  // Other configuration fields
  [
    "programType",
    "careerIncentive",
    "mentorshipLevel",
    "deliveryMode",
    "responseTime",
    "cohortSize",
    "nationalCohorts",
    "costSource"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        recomputeAndRefresh(false);
      });
    }
  });

  // Apply configuration button
  document
    .getElementById("applyConfig")
    .addEventListener("click", () => {
      setActiveTab("results");
      recomputeAndRefresh(true);
    });

  // Full results modal
  document
    .getElementById("openFullResults")
    .addEventListener("click", () => {
      if (!appState.lastResults) {
        recomputeAndRefresh(false);
      }
      if (appState.lastResults) {
        openResultsModal(
          appState.lastResults.config,
          appState.lastResults.results
        );
      }
    });

  document
    .querySelector("#resultsModal .modal-close")
    .addEventListener("click", closeResultsModal);
  document
    .querySelector("#resultsModal .modal-backdrop")
    .addEventListener("click", closeResultsModal);

  // Export buttons
  document.getElementById("exportExcel").addEventListener("click", () => {
    if (!appState.lastResults) {
      recomputeAndRefresh(false);
    }
    if (appState.lastResults) {
      exportExcel(appState.lastResults.config, appState.lastResults.results);
    }
  });

  document.getElementById("exportPdf").addEventListener("click", () => {
    if (!appState.lastResults) {
      recomputeAndRefresh(false);
    }
    if (appState.lastResults) {
      exportPdf(appState.lastResults.config, appState.lastResults.results);
    }
  });

  // Initial sync and computation
  syncCostSlider();
  recomputeAndRefresh(false);
});
