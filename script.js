// script.js
"use strict";

// Programme durations (months)
const DURATION_BY_PROGRAM = {
  frontline: 3,
  intermediate: 12,
  advanced: 24,
};

// Mixed logit average coefficients
const DCE_COEF_MXL = {
  ascA: 0.168,
  ascOptOut: -0.601,
  program: {
    frontline: 0.0,
    intermediate: 0.220,
    advanced: 0.487,
  },
  career: {
    certificate: 0.0,
    uni: 0.017,
    govpath: -0.122,
  },
  mentorship: {
    low: 0.0,
    medium: 0.453,
    high: 0.640,
  },
  delivery: {
    blended: 0.0,
    inperson: -0.232,
    online: -1.073,
  },
  response: {
    "30": 0.0,
    "15": 0.546,
    "7": 0.610,
  },
  costPerThousand: -0.005,
};

// Latent class "supporters" coefficients
// Replace with the exact Class 2 estimates when final numbers are confirmed.
const DCE_COEF_LC2 = {
  ascA: 0.25,
  ascOptOut: -0.9,
  program: {
    frontline: 0.0,
    intermediate: 0.35,
    advanced: 0.9,
  },
  career: {
    certificate: 0.0,
    uni: 0.1,
    govpath: -0.2,
  },
  mentorship: {
    low: 0.0,
    medium: 0.7,
    high: 1.1,
  },
  delivery: {
    blended: 0.0,
    inperson: -0.2,
    online: -1.4,
  },
  response: {
    "30": 0.0,
    "15": 0.8,
    "7": 0.9,
  },
  costPerThousand: -0.007,
};

// WTP (average mixed logit) in thousand INR per trainee per month
const WTP_000_MXL = {
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

// WTP (supporters) - can be updated with latent class WTP values
const WTP_000_LC2 = {
  program: {
    frontline: 0.0,
    intermediate: 60.0,
    advanced: 130.0,
  },
  career: {
    certificate: 0.0,
    uni: 8.0,
    govpath: -20.0,
  },
  mentorship: {
    low: 0.0,
    medium: 120.0,
    high: 170.0,
  },
  delivery: {
    blended: 0.0,
    inperson: -40.0,
    online: -260.0,
  },
  response: {
    "30": 0.0,
    "15": 140.0,
    "7": 160.0,
  },
};

// Template costs per cohort (INR)
const TEMPLATE_COHORT_COSTS = {
  frontline: 17400000,
  intermediate: 288000000,
  advanced: 289000000,
};

const savedScenarios = [];

let uptakeBarChart = null;
let benefitCostChart = null;
let sensitivityChart = null;
let simulationChart = null;
let compareChart = null;

function formatINR(value) {
  if (!Number.isFinite(value)) return "INR 0";
  return "INR " + Math.round(value).toLocaleString("en-IN");
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

function getCurrentConfig() {
  const program = document.getElementById("program-type").value;
  const preferenceModel = document.getElementById("preference-model").value;
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
    preferenceModel,
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

function selectCoef(config) {
  if (config.preferenceModel === "lc_supporters") {
    return DCE_COEF_LC2;
  }
  return DCE_COEF_MXL;
}

function selectWTP(config) {
  if (config.preferenceModel === "lc_supporters") {
    return WTP_000_LC2;
  }
  return WTP_000_MXL;
}

function computeUtilityAndUptake(config) {
  const coef = selectCoef(config);

  let V_prog =
    coef.ascA +
    coef.program[config.program] +
    coef.career[config.career] +
    coef.mentorship[config.mentorship] +
    coef.delivery[config.delivery] +
    coef.response[config.response];

  const cost000 = config.costPerTrainee / 1000;
  V_prog += coef.costPerThousand * cost000;

  const V_opt = coef.ascOptOut;

  const expProg = Math.exp(V_prog);
  const expOpt = Math.exp(V_opt);
  const pProg = expProg / (expProg + expOpt);

  return { V_prog, V_opt, pProg };
}

function computeBenefits(config, uptakeProb) {
  const wtpSource = selectWTP(config);

  const wtpProgram = wtpSource.program[config.program];
  const wtpCareer = wtpSource.career[config.career];
  const wtpMentor = wtpSource.mentorship[config.mentorship];
  const wtpDelivery = wtpSource.delivery[config.delivery];
  const wtpResponse = wtpSource.response[config.response];

  const wtpTotal000 =
    wtpProgram + wtpCareer + wtpMentor + wtpDelivery + wtpResponse;

  const perTraineeBenefitPerMonth = wtpTotal000 * 1000;

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

function computeCost(config) {
  let totalCost =
    config.costPerTrainee * config.cohortSize * config.durationMonths;

  if (config.includeOpportunityCost) {
    totalCost *= 1.2;
  }

  return totalCost;
}

function getHeadlineRecommendation(uptakeProb, bcr) {
  if (!Number.isFinite(uptakeProb) || !Number.isFinite(bcr)) return "";

  if (bcr >= 1.2 && uptakeProb >= 0.7) {
    return "Headline recommendation: this configuration has strong support and good value for money. It is a high priority candidate for scaling up.";
  }
  if (bcr >= 1.0 && uptakeProb >= 0.5) {
    return "Headline recommendation: this configuration looks broadly attractive. It can be considered for inclusion among priority FETP options after checking delivery capacity.";
  }
  if (bcr < 1.0 && uptakeProb >= 0.5) {
    return "Headline recommendation: support is reasonable but the benefit cost ratio is below 1. Consider reducing costs, refining programme design or moving towards higher value configurations.";
  }
  if (bcr >= 1.0 && uptakeProb < 0.5) {
    return "Headline recommendation: the estimated value for money is acceptable but endorsement is low. This may require changes to framing, communication or programme features to gain wider support.";
  }
  return "Headline recommendation: in its current form this configuration is not attractive. Consider shifting to higher mentorship, faster outbreak response or a different tier before scaling up.";
}

function updateSummaryCards(results) {
  const { uptakeProb, netBenefit, bcr } = results;

  document.getElementById("summary-uptake").textContent = formatPercent(
    uptakeProb * 100
  );
  document.getElementById("summary-bcr").textContent = bcr.toFixed(2);
  document.getElementById("summary-net-benefit").textContent =
    formatINR(netBenefit);

  const rec = getHeadlineRecommendation(uptakeProb, bcr);
  document.getElementById("headline-recommendation").textContent = rec;
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
    ["Preference model", config.preferenceModel === "lc_supporters" ? "Supportive group (latent class)" : "Average preferences (mixed logit)"],
    ["Program type", config.program],
    ["Career incentive", config.career],
    ["Mentorship intensity", config.mentorship],
    ["Delivery mode", config.delivery],
    ["Response capacity", config.response + " days"],
    ["Cohort size", String(config.cohortSize)],
    ["Programme duration", config.durationMonths + " months"],
    ["Cost per trainee per month", formatINR(config.costPerTrainee)],
    ["Cost template", config.costSource],
    [
      "Include opportunity costs",
      config.includeOpportunityCost ? "Yes" : "No",
    ],
  ];
  for (const [label, value] of items) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${label}:</strong> ${value}`;
    configList.appendChild(li);
  }

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
            callback: (v) => "INR " + (v / 100000).toFixed(1) + " lakh",
          },
        },
      },
    },
  });
}

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
          label: "Endorsement probability",
          data: uptakeVals,
          yAxisID: "y1",
        },
        {
          label: "Benefit cost ratio",
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

  const fellowsPerDistrict =
    Number(document.getElementById("fellows-per-district").value) || 1;
  const valuePerGrad =
    Number(document.getElementById("value-per-grad").value) || 0;
  const outbreaksPer100 =
    Number(document.getElementById("outbreaks-per-100-grad").value) || 0;
  const valuePerOutbreak =
    Number(document.getElementById("value-per-outbreak").value) || 0;

  const effectiveGraduates =
    numCohorts * config.cohortSize * results.uptakeProb;

  const districtCoverage =
    fellowsPerDistrict > 0 ? effectiveGraduates / fellowsPerDistrict : 0;

  const outbreaksAverted =
    (effectiveGraduates / 100) * outbreaksPer100;

  const epiBenefitGraduates = effectiveGraduates * valuePerGrad;
  const epiBenefitOutbreaks = outbreaksAverted * valuePerOutbreak;
  const epiBenefitTotal = epiBenefitGraduates + epiBenefitOutbreaks;

  document.getElementById("sim-total-graduates").textContent =
    Math.round(effectiveGraduates).toLocaleString("en-IN");
  document.getElementById("sim-district-coverage").textContent =
    districtCoverage.toFixed(1);
  document.getElementById("sim-outbreaks-averted").textContent =
    outbreaksAverted.toFixed(1);
  document.getElementById("sim-epi-benefit-total").textContent =
    formatINR(epiBenefitTotal);

  const ctx = document.getElementById("chart-simulation");
  if (simulationChart) simulationChart.destroy();
  simulationChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["National totals"],
      datasets: [
        { label: "Total benefit (DCE)", data: [totalBenefit] },
        { label: "Total cost", data: [totalCost] },
        { label: "Net benefit (DCE)", data: [totalNet] },
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
            callback: (v) =>
              "INR " + (v / 10000000).toFixed(1) + " crore",
          },
        },
      },
    },
  });
}

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
      labels: ["Endorsement", "Benefit cost ratio", "Net benefit per cohort"],
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
        },
      },
    },
  });
}

function exportPDFBrief() {
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

  const header = "STEPS FETP scale up summary - India";
  doc.setFontSize(14);
  doc.text(header, 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "This summary describes one Field Epidemiology Training Program configuration evaluated with STEPS.",
    14,
    26
  );
  doc.text(
    "Results combine discrete choice evidence on stakeholder preferences with your costing assumptions.",
    14,
    31
  );

  doc.setTextColor(0, 0, 0);

  const programmeLine = `Programme: ${config.program} FETP, ${config.cohortSize} trainees per cohort, ` +
    `${config.durationMonths} months, cost of about INR ${config.costPerTrainee.toLocaleString("en-IN")} per trainee per month.`;

  const modelText =
    config.preferenceModel === "lc_supporters"
      ? "Preference model: supportive group only (latent class)."
      : "Preference model: average preferences (mixed logit).";

  const scenarioLine = programmeLine + " " + modelText;

  const uptakeText = `Predicted endorsement is about ${formatPercent(
    util.pProg * 100
  )}.`;
  const benefitText =
    `The estimated socio economic benefit per cohort is around ${formatINR(
      benefits.totalBenefit
    )} ` +
    `against a cost of ${formatINR(cost)}. `;
  const ratioText =
    `This gives a benefit cost ratio of ${bcr.toFixed(
      2
    )} and a net benefit of about ${formatINR(netBenefit)}.`;

  const summaryLine = uptakeText + " " + benefitText + ratioText;

  const headline = getHeadlineRecommendation(util.pProg, bcr);

  const linesScenario = doc.splitTextToSize(scenarioLine, 180);
  const linesSummary = doc.splitTextToSize(summaryLine, 180);
  const linesHeadline = doc.splitTextToSize(headline, 180);

  let y = 40;
  doc.text("Scenario description", 14, y);
  y += 6;
  doc.text(linesScenario, 14, y);
  y += linesScenario.length * 5 + 4;

  doc.text("Key results", 14, y);
  y += 6;
  doc.text(linesSummary, 14, y);
  y += linesSummary.length * 5 + 4;

  doc.text("Headline recommendation", 14, y);
  y += 6;
  doc.text(linesHeadline, 14, y);
  y += linesHeadline.length * 5 + 6;

  if (savedScenarios.length > 0) {
    doc.text("Other saved STEPS scenarios (for comparison)", 14, y);
    y += 6;
    doc.setFontSize(10);

    savedScenarios.slice(0, 6).forEach((s) => {
      const line =
        `${s.name}: ${s.config.program}, endorsement ${formatPercent(
          s.results.uptakeProb * 100
        )}, ` +
        `benefit cost ratio ${s.results.bcr.toFixed(2)}, net benefit per cohort ${formatINR(
          s.results.netBenefit
        )}.`;
      const wrapped = doc.splitTextToSize(line, 180);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 4 + 2;
    });
  }

  doc.save("STEPS_FETP_policy_summary.pdf");
}

function exportExcelFile() {
  const rows = [];
  rows.push([
    "Scenario",
    "Preference model",
    "Programme",
    "Career",
    "Mentorship",
    "Delivery",
    "Response (days)",
    "Cohort size",
    "Duration (months)",
    "Cost per trainee per month (INR)",
    "Endorsement (%)",
    "Total benefit per cohort (INR)",
    "Total cost per cohort (INR)",
    "Net benefit per cohort (INR)",
    "Benefit cost ratio",
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
      config.preferenceModel,
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
        s.config.preferenceModel,
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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById(
    "cost-frontline-cohort"
  ).textContent = formatINR(TEMPLATE_COHORT_COSTS.frontline);
  document.getElementById(
    "cost-intermediate-cohort"
  ).textContent = formatINR(TEMPLATE_COHORT_COSTS.intermediate);
  document.getElementById(
    "cost-advanced-cohort"
  ).textContent = formatINR(TEMPLATE_COHORT_COSTS.advanced);

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

  document.getElementById("btn-apply").addEventListener("click", (e) => {
    e.preventDefault();
    runAllUpdates();
    document.getElementById("results-modal").classList.remove("hidden");
  });

  document
    .getElementById("btn-save-scenario")
    .addEventListener("click", (e) => {
      e.preventDefault();
      const { config, aggregateResults } = runAllUpdates();
      const name =
        prompt(
          "Name this scenario (for example: Advanced blended high mentorship)"
        ) || `Scenario ${savedScenarios.length + 1}`;
      savedScenarios.push({
        name,
        config: { ...config },
        results: { ...aggregateResults },
      });
      refreshSavedScenariosUI();
    });

  document.getElementById("compare-a").addEventListener("change", () => {
    updateCompareChart();
  });
  document.getElementById("compare-b").addEventListener("change", () => {
    updateCompareChart();
  });

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

  [
    "fellows-per-district",
    "value-per-grad",
    "outbreaks-per-100-grad",
    "value-per-outbreak",
  ].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
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
  });

  document
    .querySelectorAll(
      "#config-form select,#config-form input,#include-opportunity-cost"
    )
    .forEach((el) => {
      el.addEventListener("change", () => {
        runAllUpdates();
      });
    });

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

  document
    .getElementById("btn-export-pdf")
    .addEventListener("click", exportPDFBrief);
  document
    .getElementById("btn-export-excel")
    .addEventListener("click", exportExcelFile);

  runAllUpdates();
});
