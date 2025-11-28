// script.js
"use strict";

// =============== GLOBAL CONSTANTS ===============

// Programme durations (months) used for cost aggregation
const DURATION_BY_PROGRAM = {
  frontline: 3,
  intermediate: 12,
  advanced: 24,
};

// Mixed logit (MXL) mean coefficients (preference space)
// Training B is the reference alternative; "ASC_A" used as generic programme ASC
// and "ASC_OptOut" anchors the opt-out alternative.
const DCE_COEF = {
  ascA: 0.168, // ASC-A (vs B)
  ascOptOut: -0.601, // ASC-Opt-out (vs B)

  // Program type (ref: frontline)
  program: {
    frontline: 0.0,
    intermediate: 0.220,
    advanced: 0.487,
  },

  // Career incentives (ref: certificate)
  career: {
    certificate: 0.0,
    uni: 0.017,
    govpath: -0.122,
  },

  // Mentorship intensity (ref: low)
  mentorship: {
    low: 0.0,
    medium: 0.453,
    high: 0.640,
  },

  // Delivery mode (ref: blended)
  delivery: {
    blended: 0.0,
    inperson: -0.232,
    online: -1.073,
  },

  // Response capacity (ref: 30 days)
  response: {
    "30": 0.0,
    "15": 0.546,
    "7": 0.610,
  },

  // Mean marginal cost coefficient after lognormal back-transformation
  // from Table 3 (approx). Units: utility per ₹000.
  costPerThousand: -0.005,
};

// WTP estimates (Table 4) in ₹000 per trainee per month
const WTP_000 = {
  program: {
    frontline: 0.0,
    intermediate: 47.06,
    advanced: 103.99,
  },
  career: {
    certificate: 0.0,
    uni: 3.69,
    govpath: -26.17,
  },
  mentorship: {
    low: 0.0,
    medium: 96.87,
    high: 136.79,
  },
  delivery: {
    blended: 0.0,
    inperson: -49.56,
    online: -229.33,
  },
  response: {
    "30": 0.0,
    "15": 116.70,
    "7": 130.46,
  },
};

// Approximate per-cohort costs from templates (for display only)
const TEMPLATE_COHORT_COSTS = {
  frontline: 17400000,
  intermediate: 288000000,
  advanced: 289000000,
};

// Saved scenarios store
const savedScenarios = [];

// Chart instances
let uptakeBarChart = null;
let benefitCostChart = null;
let sensitivityChart = null;
let simulationChart = null;
let compareChart = null;

// =============== HELPER FUNCTIONS ===============

function formatINR(value) {
  if (!Number.isFinite(value)) return "₹0";
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return value.toFixed(1) + "%";
}

function clampCostPerTrainee(raw) {
  const min = 75000;
  const max = 400000;
  if (!Number.isFinite(raw)) return 250000;
  return Math.min(Math.max(raw, min), max);
}

// Read configuration from the form
function getCurrentConfig() {
  const program = document.getElementById("program-type").value;
  const career = document.getElementById("career-incentive").value;
  const mentorship = document.getElementById("mentorship").value;
  const delivery = document.getElementById("delivery").value;
  const response = document.getElementById("response").value;
  const cohortSizeRaw = Number(document.getElementById("cohort-size").value);
  const costPerTraineeRaw = Number(document.getElementById("cost-per-trainee").value);
  const costSource = document.getElementById("cost-source").value;
  const includeOpportunityCost = document.getElementById("include-opportunity-cost").checked;

  const cohortSize = Number.isFinite(cohortSizeRaw) && cohortSizeRaw > 0 ? cohortSizeRaw : 20;
  const costPerTrainee = clampCostPerTrainee(costPerTraineeRaw);
  const durationMonths = DURATION_BY_PROGRAM[program] || 12;

  return {
    program,
    career,
    mentorship,
    delivery,
    response,
    cohortSize,
    costPerTrainee,
    costSource,
    includeOpportunityCost,
    durationMonths,
  };
}

// Compute utility of programme and opt-out, and endorsement probability
function computeUtilityAndUptake(config) {
  // Programme utility
  let V_prog =
    DCE_COEF.ascA +
    DCE_COEF.program[config.program] +
    DCE_COEF.career[config.career] +
    DCE_COEF.mentorship[config.mentorship] +
    DCE_COEF.delivery[config.delivery] +
    DCE_COEF.response[config.response];

  // Cost in thousands (consistent with DCE coding)
  const cost000 = config.costPerTrainee / 1000;
  V_prog += DCE_COEF.costPerThousand * cost000;

  // Opt-out utility
  const V_opt = DCE_COEF.ascOptOut;

  const expProg = Math.exp(V_prog);
  const expOpt = Math.exp(V_opt);
  const pProg = expProg / (expProg + expOpt); // P(choose a programme vs "neither")

  return {
    V_prog,
    V_opt,
    pProg,
  };
}

// Compute WTP-based benefits
function computeBenefits(config, uptakeProb) {
  // WTP in ₹000 per trainee per month
  const wtpProgram = WTP_000.program[config.program];
  const wtpCareer = WTP_000.career[config.career];
  const wtpMentor = WTP_000.mentorship[config.mentorship];
  const wtpDelivery = WTP_000.delivery[config.delivery];
  const wtpResponse = WTP_000.response[config.response];

  const wtpTotal000 =
    wtpProgram + wtpCareer + wtpMentor + wtpDelivery + wtpResponse;

  // Convert to ₹ per trainee per month
  const perTraineeBenefitPerMonth = wtpTotal000 * 1000;

  // Aggregate to cohort over full duration, weighted by endorsement probability
  const totalBenefit =
    perTraineeBenefitPerMonth *
    config.cohortSize *
    config.durationMonths *
    uptakeProb;

  return {
    perTraineeBenefitPerMonth,
    totalBenefit,
  };
}

// Compute costs
function computeCost(config) {
  // Programme cost over full duration
  let totalCost =
    config.costPerTrainee * config.cohortSize * config.durationMonths;

  // Simple adjustment if opportunity costs included (here ~20% uplift as illustration)
  if (config.includeOpportunityCost) {
    totalCost *= 1.2;
  }

  return totalCost;
}

// =============== RENDER FUNCTIONS ===============

function updateSummaryCards(results) {
  const { uptakeProb, totalBenefit, totalCost, netBenefit, bcr } = results;

  document.getElementById("summary-uptake").textContent = formatPercent(
    uptakeProb * 100
  );
  document.getElementById("summary-bcr").textContent = bcr.toFixed(2);
  document.getElementById("summary-net-benefit").textContent = formatINR(netBenefit);
}

function updateFullResults(config, utility, benefits, costs) {
  const { V_prog, V_opt, pProg } = utility;
  const { perTraineeBenefitPerMonth, totalBenefit } = benefits;
  const totalCost = costs;
  const netBenefit = totalBenefit - totalCost;
  const bcr = totalCost > 0 ? totalBenefit / totalCost : 0;

  document.getElementById("res-utility").textContent = V_prog.toFixed(3);
  document.getElementById("res-utility-optout").textContent = V_opt.toFixed(3);
  document.getElementById("res-uptake").textContent = formatPercent(pProg * 100);
  document.getElementById("res-benefit-per-trainee").textContent =
    formatINR(perTraineeBenefitPerMonth);
  document.getElementById("res-total-benefit").textContent =
    formatINR(totalBenefit);
  document.getElementById("res-total-cost").textContent = formatINR(totalCost);
  document.getElementById("res-bcr").textContent = bcr.toFixed(2);
  document.getElementById("res-net-benefit").textContent = formatINR(netBenefit);

  const configList = document.getElementById("res-config-list");
  configList.innerHTML = "";
  const items = [
    ["Program type", config.program],
    ["Career incentive", config.career],
    ["Mentorship intensity", config.mentorship],
    ["Delivery mode", config.delivery],
    ["Response capacity", `${config.response} days`],
    ["Cohort size", String(config.cohortSize)],
    ["Programme duration", `${config.durationMonths} months`],
    [
      "Cost per trainee per month",
      formatINR(config.costPerTrainee),
    ],
    ["Cost template", config.costSource],
    [
      "Include opportunity costs?",
      config.includeOpportunityCost ? "Yes" : "No",
    ],
  ];
  for (const [label, value] of items) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${label}:</strong> ${value}`;
    configList.appendChild(li);
  }

  // Modal fields (mirror the same numbers)
  document.getElementById("modal-uptake").textContent = formatPercent(
    pProg * 100
  );
  document.getElementById(
    "modal-benefit-per-trainee"
  ).textContent = formatINR(perTraineeBenefitPerMonth);
  document.getElementById("modal-total-benefit").textContent =
    formatINR(totalBenefit);
  document.getElementById("modal-total-cost").textContent =
    formatINR(totalCost);
  document.getElementById("modal-bcr").textContent = bcr.toFixed(2);
  document.getElementById("modal-net-benefit").textContent =
    formatINR(netBenefit);

  const modalConfigList = document.getElementById("modal-config-list");
  modalConfigList.innerHTML = configList.innerHTML;
}

function updateCharts(utility, benefits, costs) {
  const { pProg } = utility;
  const { totalBenefit } = benefits;
  const totalCost = costs;

  // Uptake bar
  const ctxUptake = document.getElementById("chart-uptake-bar");
  if (uptakeBarChart) uptakeBarChart.destroy();
  uptakeBarChart = new Chart(ctxUptake, {
    type: "bar",
    data: {
      labels: ["Endorsement"],
      datasets: [
        {
          label: "Endorsement probability",
          data: [pProg * 100],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: (v) => v + "%" },
        },
      },
    },
  });

  // Benefit vs cost
  const ctxBC = document.getElementById("chart-benefit-vs-cost");
  if (benefitCostChart) benefitCostChart.destroy();
  benefitCostChart = new Chart(ctxBC, {
    type: "bar",
    data: {
      labels: ["Per cohort"],
      datasets: [
        {
          label: "Total benefit",
          data: [totalBenefit],
        },
        {
          label: "Total cost",
          data: [totalCost],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => "₹" + (v / 1_00_000).toFixed(1) + " lakh",
          },
        },
      },
    },
  });
}

// Sensitivity chart: vary cost ±20% and plot uptake + BCR
function updateSensitivity(config) {
  const ctx = document.getElementById("chart-sensitivity");
  if (sensitivityChart) sensitivityChart.destroy();

  const baseCost = config.costPerTrainee;
  const scenarios = [
    { label: "-20%", multiplier: 0.8 },
    { label: "Base", multiplier: 1.0 },
    { label: "+20%", multiplier: 1.2 },
  ];

  const uptakeVals = [];
  const bcrVals = [];

  for (const s of scenarios) {
    const c = { ...config, costPerTrainee: clampCostPerTrainee(baseCost * s.multiplier) };
    const util = computeUtilityAndUptake(c);
    const benefits = computeBenefits(c, util.pProg);
    const cost = computeCost(c);
    const bcr = cost > 0 ? benefits.totalBenefit / cost : 0;

    uptakeVals.push(util.pProg * 100);
    bcrVals.push(bcr);
  }

  sensitivityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: scenarios.map((s) => s.label),
      datasets: [
        {
          label: "Endorsement probability (%)",
          data: uptakeVals,
          yAxisID: "y1",
        },
        {
          label: "Benefit–cost ratio",
          data: bcrVals,
          yAxisID: "y2",
        },
      ],
    },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "bottom",
        },
      },
      scales: {
        y1: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          max: 100,
          ticks: { callback: (v) => v + "%" },
        },
        y2: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

// National simulation chart
function updateSimulation(config, results) {
  const numCohorts = Number(document.getElementById("num-cohorts").value) || 50;

  const perCohortCost = results.totalCost;
  const perCohortBenefit = results.totalBenefit;
  const perCohortNet = results.netBenefit;

  const totalCost = perCohortCost * numCohorts;
  const totalBenefit = perCohortBenefit * numCohorts;
  const totalNet = perCohortNet * numCohorts;

  document.getElementById("sim-total-cost").textContent = formatINR(totalCost);
  document.getElementById("sim-total-benefit").textContent =
    formatINR(totalBenefit);
  document.getElementById("sim-total-net-benefit").textContent =
    formatINR(totalNet);

  const ctx = document.getElementById("chart-simulation");
  if (simulationChart) simulationChart.destroy();
  simulationChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["National totals"],
      datasets: [
        { label: "Total benefit", data: [totalBenefit] },
        { label: "Total cost", data: [totalCost] },
        { label: "Net benefit", data: [totalNet] },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => "₹" + (v / 1_00_00_000).toFixed(1) + " crore",
          },
        },
      },
    },
  });
}

// Saved scenarios list and comparison chart
function refreshSavedScenariosUI() {
  const tbody = document.querySelector("#saved-table tbody");
  tbody.innerHTML = "";

  const selectA = document.getElementById("compare-a");
  const selectB = document.getElementById("compare-b");
  selectA.innerHTML = "";
  selectB.innerHTML = "";

  savedScenarios.forEach((s, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${s.config.program}</td>
      <td>${formatPercent(s.results.uptakeProb * 100)}</td>
      <td>${s.results.bcr.toFixed(2)}</td>
      <td>${formatINR(s.results.netBenefit)}</td>
    `;
    tbody.appendChild(tr);

    const optA = document.createElement("option");
    optA.value = idx;
    optA.textContent = s.name;
    selectA.appendChild(optA);

    const optB = document.createElement("option");
    optB.value = idx;
    optB.textContent = s.name;
    selectB.appendChild(optB);
  });

  if (savedScenarios.length >= 2) {
    selectA.value = "0";
    selectB.value = "1";
    updateCompareChart();
  } else if (compareChart) {
    compareChart.destroy();
    compareChart = null;
  }
}

function updateCompareChart() {
  const idxA = Number(document.getElementById("compare-a").value);
  const idxB = Number(document.getElementById("compare-b").value);
  if (
    !Number.isInteger(idxA) ||
    !Number.isInteger(idxB) ||
    !savedScenarios[idxA] ||
    !savedScenarios[idxB]
  ) {
    return;
  }

  const sA = savedScenarios[idxA];
  const sB = savedScenarios[idxB];

  const ctx = document.getElementById("chart-compare");
  if (compareChart) compareChart.destroy();
  compareChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Endorsement", "BCR", "Net benefit per cohort"],
      datasets: [
        {
          label: sA.name,
          data: [
            sA.results.uptakeProb * 100,
            sA.results.bcr,
            sA.results.netBenefit,
          ],
        },
        {
          label: sB.name,
          data: [
            sB.results.uptakeProb * 100,
            sB.results.bcr,
            sB.results.netBenefit,
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => v.toFixed ? v.toFixed(1) : v,
          },
        },
      },
    },
  });
}

// =============== EXPORTS ===============

async function exportPDFBrief() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  const config = getCurrentConfig();
  const util = computeUtilityAndUptake(config);
  const benefits = computeBenefits(config, util.pProg);
  const cost = computeCost(config);
  const netBenefit = benefits.totalBenefit - cost;
  const bcr = cost > 0 ? benefits.totalBenefit / cost : 0;

  const scenarioLine = `Scenario: ${config.program} FETP, ${config.cohortSize} trainees per cohort, ` +
    `${config.durationMonths} months, cost of about ₹${config.costPerTrainee.toLocaleString("en-IN")} per trainee per month.`;

  const summaryLine =
    `Using the mixed logit model, the predicted endorsement is about ${formatPercent(util.pProg * 100)}. ` +
    `The expected socio-economic benefit per cohort is roughly ${formatINR(benefits.totalBenefit)} ` +
    `against a cost of ${formatINR(cost)}, giving a benefit–cost ratio of ${bcr.toFixed(
      2
    )} and a net benefit of approximately ${formatINR(netBenefit)}.`;

  const policyHint =
    bcr >= 1
      ? "At current cost and design, this configuration offers positive net benefits and strong endorsement. " +
        "It may be a good candidate for scaling, especially if mentorship and rapid outbreak response are prioritised."
      : "At current cost and design, net benefits are modest or negative. " +
        "Consider adjusting programme features to improve value, for example by increasing mentorship intensity, " +
        "optimising delivery mode (blended instead of fully online), or revisiting per-trainee costs.";

  const header = "STEPS FETP scale-up brief – India";
  doc.setFontSize(14);
  doc.text(header, 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "This brief summarises a Field Epidemiology Training Program (FETP) configuration evaluated with STEPS.",
    14,
    26
  );
  doc.text(
    "Results combine discrete choice experiment evidence on stakeholder preferences with costing assumptions.",
    14,
    31
  );

  doc.setTextColor(0, 0, 0);

  const linesScenario = doc.splitTextToSize(scenarioLine, 180);
  const linesSummary = doc.splitTextToSize(summaryLine, 180);
  const linesPolicy = doc.splitTextToSize("Policy interpretation: " + policyHint, 180);

  let y = 40;
  doc.text("Scenario description", 14, y);
  y += 6;
  doc.text(linesScenario, 14, y);
  y += linesScenario.length * 5 + 4;

  doc.text("DCE-based results", 14, y);
  y += 6;
  doc.text(linesSummary, 14, y);
  y += linesSummary.length * 5 + 4;

  doc.text("Policy interpretation", 14, y);
  y += 6;
  doc.text(linesPolicy, 14, y);
  y += linesPolicy.length * 5 + 6;

  if (savedScenarios.length > 0) {
    doc.text("Saved STEPS scenarios (comparison)", 14, y);
    y += 6;
    doc.setFontSize(10);

    savedScenarios.slice(0, 6).forEach((s) => {
      const line =
        `${s.name}: ${s.config.program} – endorsement ${formatPercent(
          s.results.uptakeProb * 100
        )}, ` +
        `BCR ${s.results.bcr.toFixed(2)}, net benefit per cohort ${formatINR(
          s.results.netBenefit
        )}.`;
      const wrapped = doc.splitTextToSize(line, 180);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 4 + 2;
    });
  }

  doc.save("STEPS_FETP_brief.pdf");
}

function exportExcelFile() {
  const rows = [];
  rows.push([
    "Scenario",
    "Programme",
    "Career",
    "Mentorship",
    "Delivery",
    "Response (days)",
    "Cohort size",
    "Duration (months)",
    "Cost per trainee per month (₹)",
    "Endorsement (%)",
    "Total benefit per cohort (₹)",
    "Total cost per cohort (₹)",
    "Net benefit per cohort (₹)",
    "Benefit–cost ratio",
  ]);

  if (savedScenarios.length === 0) {
    const config = getCurrentConfig();
    const util = computeUtilityAndUptake(config);
    const benefits = computeBenefits(config, util.pProg);
    const cost = computeCost(config);
    const netBenefit = benefits.totalBenefit - cost;
    const bcr = cost > 0 ? benefits.totalBenefit / cost : 0;

    rows.push([
      "Current scenario",
      config.program,
      config.career,
      config.mentorship,
      config.delivery,
      config.response,
      config.cohortSize,
      config.durationMonths,
      config.costPerTrainee,
      (util.pProg * 100).toFixed(1),
      Math.round(benefits.totalBenefit),
      Math.round(cost),
      Math.round(netBenefit),
      bcr.toFixed(2),
    ]);
  } else {
    savedScenarios.forEach((s) => {
      rows.push([
        s.name,
        s.config.program,
        s.config.career,
        s.config.mentorship,
        s.config.delivery,
        s.config.response,
        s.config.cohortSize,
        s.config.durationMonths,
        s.config.costPerTrainee,
        (s.results.uptakeProb * 100).toFixed(1),
        Math.round(s.results.totalBenefit),
        Math.round(s.results.totalCost),
        Math.round(s.results.netBenefit),
        s.results.bcr.toFixed(2),
      ]);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "STEPS scenarios");
  XLSX.writeFile(workbook, "STEPS_FETP_scenarios.xlsx");
}

// =============== MAIN UPDATE PIPELINE ===============

function runAllUpdates() {
  const config = getCurrentConfig();
  const util = computeUtilityAndUptake(config);
  const benefits = computeBenefits(config, util.pProg);
  const cost = computeCost(config);

  const netBenefit = benefits.totalBenefit - cost;
  const bcr = cost > 0 ? benefits.totalBenefit / cost : 0;

  const aggregateResults = {
    uptakeProb: util.pProg,
    totalBenefit: benefits.totalBenefit,
    totalCost: cost,
    netBenefit,
    bcr,
  };

  updateSummaryCards(aggregateResults);
  updateFullResults(config, util, benefits, cost);
  updateCharts(util, benefits, cost);
  updateSensitivity(config);
  updateSimulation(config, aggregateResults);

  return { config, util, benefits, cost, aggregateResults };
}

// =============== EVENT LISTENERS ===============

document.addEventListener("DOMContentLoaded", () => {
  // Display template costs
  document.getElementById(
    "cost-frontline-cohort"
  ).textContent = formatINR(TEMPLATE_COHORT_COSTS.frontline);
  document.getElementById(
    "cost-intermediate-cohort"
  ).textContent = formatINR(TEMPLATE_COHORT_COSTS.intermediate);
  document.getElementById(
    "cost-advanced-cohort"
  ).textContent = formatINR(TEMPLATE_COHORT_COSTS.advanced);

  // Tab switching (left)
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      document
        .querySelectorAll(".tab-button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document
        .querySelectorAll(".tab-pane")
        .forEach((pane) => pane.classList.remove("active"));
      document.getElementById(target).classList.add("active");
    });
  });

  // Tab switching (right)
  document.querySelectorAll(".tab-button-secondary").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      document
        .querySelectorAll(".tab-button-secondary")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document
        .querySelectorAll(".tab-pane-secondary")
        .forEach((pane) => pane.classList.remove("active"));
      document.getElementById(target).classList.add("active");
    });
  });

  // Apply configuration button (also opens modal)
  document.getElementById("btn-apply").addEventListener("click", (e) => {
    e.preventDefault();
    const { aggregateResults } = runAllUpdates();
    // open modal as well
    document.getElementById("results-modal").classList.remove("hidden");
  });

  // Save scenario
  document
    .getElementById("btn-save-scenario")
    .addEventListener("click", (e) => {
      e.preventDefault();
      const { config, aggregateResults } = runAllUpdates();
      const name =
        prompt("Name this scenario (e.g., Advanced blended high mentorship):") ||
        `Scenario ${savedScenarios.length + 1}`;
      savedScenarios.push({
        name,
        config: { ...config },
        results: { ...aggregateResults },
      });
      refreshSavedScenariosUI();
    });

  // Compare chart dropdowns
  document.getElementById("compare-a").addEventListener("change", () => {
    updateCompareChart();
  });
  document.getElementById("compare-b").addEventListener("change", () => {
    updateCompareChart();
  });

  // Simulation cohorts input
  document.getElementById("num-cohorts").addEventListener("input", () => {
    const config = getCurrentConfig();
    const util = computeUtilityAndUptake(config);
    const benefits = computeBenefits(config, util.pProg);
    const cost = computeCost(config);
    const netBenefit = benefits.totalBenefit - cost;
    const bcr = cost > 0 ? benefits.totalBenefit / cost : 0;
    updateSimulation(config, {
      uptakeProb: util.pProg,
      totalBenefit: benefits.totalBenefit,
      totalCost: cost,
      netBenefit,
      bcr,
    });
  });

  // Any config change triggers a quiet update
  document
    .querySelectorAll(
      "#config-form select,#config-form input,#include-opportunity-cost"
    )
    .forEach((el) => {
      el.addEventListener("change", () => {
        runAllUpdates();
      });
    });

  // Modal open / close
  document.getElementById("btn-show-modal").addEventListener("click", () => {
    runAllUpdates();
    document.getElementById("results-modal").classList.remove("hidden");
  });
  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("results-modal").classList.add("hidden");
  });
  document
    .getElementById("results-modal")
    .querySelector(".modal-backdrop")
    .addEventListener("click", () => {
      document.getElementById("results-modal").classList.add("hidden");
    });

  // Export buttons
  document
    .getElementById("btn-export-pdf")
    .addEventListener("click", exportPDFBrief);
  document
    .getElementById("btn-export-excel")
    .addEventListener("click", exportExcelFile);

  // Initial run
  runAllUpdates();
});
