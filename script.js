// =====================================================
// STEPS – FETP Scale Up Decision Aid (India)
// Front end logic
// =====================================================

/* -----------------------------------------------------
   Global state and configuration
----------------------------------------------------- */

const INR_PER_USD = 89.5; // configurable exchange rate

const appState = {
  currency: "INR",
  model: "mxl", // "mxl" or "lc2"
  config: {
    programmeTier: "frontline",
    careerIncentive: "certificate",
    mentorshipLevel: "low",
    deliveryMode: "blended",
    responseTime: "30",
    costPerTraineeINR: 250000,
    cohortSize: 20,
    durationMonths: 3,
    numCohorts: 10,
    notes: ""
  },
  results: null,
  epiConfig: null,
  charts: {
    bcrChart: null,
    costBenefitChart: null,
    uptakeChart: null
  },
  savedScenarios: []
};

// MXL average coefficients (preference space) – means only.
// Cost coefficient is mean of back transformed lognormal: about -0.005 per ₹000.
const mxlParams = {
  name: "Average mixed logit",
  ascOptOut: -0.601,
  costPerThousand: -0.005,
  intermediate: 0.220,
  advanced: 0.487,
  uni: 0.017,
  govcareer: -0.122,
  mentorMedium: 0.453,
  mentorHigh: 0.640,
  inperson: -0.232,
  online: -1.073,
  resp15: 0.546,
  resp7: 0.610
};

// LC Class 2 (training supporters) coefficients and cost
const lc2Params = {
  name: "Training supporters (LC Class 2)",
  ascOptOut: -2.543,
  costPerThousand: -0.001,
  intermediate: 0.087,
  advanced: 0.422,
  uni: -0.024,
  govcareer: -0.123,
  mentorMedium: 0.342,
  mentorHigh: 0.486,
  inperson: -0.017,
  online: -0.700,
  resp15: 0.317,
  resp7: 0.504
};

// WTP values (per trainee per month, INR) from MXL (Table 4)
const wtpMxl = {
  intermediate: 47060,
  advanced: 103990,
  uni: 3690,
  govcareer: -26170,
  mentorMedium: 96870,
  mentorHigh: 136790,
  inperson: -49560,
  online: -229330,
  resp15: 116700,
  resp7: 130460
};

// WTP values (per trainee per month, INR) from LC Class 2 (Table 6)
const wtpLc2 = {
  intermediate: 63000,
  advanced: 303000,
  uni: -18000,
  govcareer: -88000,
  mentorMedium: 245000,
  mentorHigh: 349000,
  inperson: -12000,
  online: -503000,
  resp15: 228000,
  resp7: 362000
};

/* -----------------------------------------------------
   Utility, WTP and core calculations
----------------------------------------------------- */

function getModelParams() {
  return appState.model === "mxl" ? mxlParams : lc2Params;
}

function getWtpParams() {
  return appState.model === "mxl" ? wtpMxl : wtpLc2;
}

// Build attribute dummies from configuration
function buildAttributeVector(cfg) {
  return {
    intermediate: cfg.programmeTier === "intermediate" ? 1 : 0,
    advanced: cfg.programmeTier === "advanced" ? 1 : 0,
    uni: cfg.careerIncentive === "university" ? 1 : 0,
    govcareer: cfg.careerIncentive === "career_pathway" ? 1 : 0,
    mentorMedium: cfg.mentorshipLevel === "medium" ? 1 : 0,
    mentorHigh: cfg.mentorshipLevel === "high" ? 1 : 0,
    inperson: cfg.deliveryMode === "inperson" ? 1 : 0,
    online: cfg.deliveryMode === "online" ? 1 : 0,
    resp15: cfg.responseTime === "15" ? 1 : 0,
    resp7: cfg.responseTime === "7" ? 1 : 0
  };
}

// Systematic utility for programme alternative (excluding ASC_A)
function computeProgrammeUtility(cfg) {
  const p = getModelParams();
  const x = buildAttributeVector(cfg);
  const costThousand = cfg.costPerTraineeINR / 1000;

  let v =
    p.intermediate * x.intermediate +
    p.advanced * x.advanced +
    p.uni * x.uni +
    p.govcareer * x.govcareer +
    p.mentorMedium * x.mentorMedium +
    p.mentorHigh * x.mentorHigh +
    p.inperson * x.inperson +
    p.online * x.online +
    p.resp15 * x.resp15 +
    p.resp7 * x.resp7 +
    p.costPerThousand * costThousand;

  return v;
}

// Systematic utility for opt out (only ASC_OptOut)
function computeOptOutUtility() {
  const p = getModelParams();
  return p.ascOptOut;
}

// Predicted endorsement (programme vs opt out)
function computeEndorsementProbability(cfg) {
  const vProg = computeProgrammeUtility(cfg);
  const vOpt = computeOptOutUtility();
  const delta = vProg - vOpt;
  const p = 1 / (1 + Math.exp(-delta));
  const bounded = Math.min(Math.max(p, 0.01), 0.99);
  return bounded;
}

// WTP-based per trainee per month benefit relative to reference programme
function computePerTraineeMonthlyBenefit(cfg) {
  const w = getWtpParams();
  const x = buildAttributeVector(cfg);

  let b = 0;

  if (x.intermediate === 1) b += w.intermediate || 0;
  if (x.advanced === 1) b += w.advanced || 0;
  if (x.uni === 1) b += w.uni || 0;
  if (x.govcareer === 1) b += w.govcareer || 0;
  if (x.mentorMedium === 1) b += w.mentorMedium || 0;
  if (x.mentorHigh === 1) b += w.mentorHigh || 0;
  if (x.inperson === 1) b += w.inperson || 0;
  if (x.online === 1) b += w.online || 0;
  if (x.resp15 === 1) b += w.resp15 || 0;
  if (x.resp7 === 1) b += w.resp7 || 0;

  return b;
}

// Core metrics for current configuration
function computeMetrics(cfg) {
  const endorsement = computeEndorsementProbability(cfg);
  const perTraineeBenefitMonth = computePerTraineeMonthlyBenefit(cfg);

  const costPerCohortINR =
    cfg.costPerTraineeINR * cfg.cohortSize * cfg.durationMonths;

  const benefitPerCohortINR =
    perTraineeBenefitMonth *
    cfg.cohortSize *
    cfg.durationMonths *
    endorsement;

  const bcr =
    costPerCohortINR > 0 ? benefitPerCohortINR / costPerCohortINR : null;
  const nbPerCohortINR = benefitPerCohortINR - costPerCohortINR;

  const totalCostINR = costPerCohortINR * cfg.numCohorts;
  const totalBenefitINR = benefitPerCohortINR * cfg.numCohorts;
  const totalNbINR = nbPerCohortINR * cfg.numCohorts;

  return {
    endorsement,
    perTraineeBenefitMonth,
    costPerCohortINR,
    benefitPerCohortINR,
    bcr,
    nbPerCohortINR,
    totalCostINR,
    totalBenefitINR,
    totalNbINR
  };
}

/* -----------------------------------------------------
   Utility functions for formatting
----------------------------------------------------- */

function formatCurrencyINR(value) {
  if (value == null || isNaN(value)) return "–";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function formatCurrencyUSD(value) {
  if (value == null || isNaN(value)) return "–";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function formatCurrency(valueINR) {
  if (appState.currency === "USD") {
    const vUSD = valueINR / INR_PER_USD;
    return formatCurrencyUSD(vUSD);
  }
  return formatCurrencyINR(valueINR);
}

function formatPercent(p) {
  if (p == null || isNaN(p)) return "–";
  return (p * 100).toFixed(1) + " %";
}

function tierLabel(value) {
  if (value === "frontline") return "Frontline (3 months)";
  if (value === "intermediate") return "Intermediate (12 months)";
  if (value === "advanced") return "Advanced (24 months)";
  return value;
}

/* -----------------------------------------------------
   DOM handling and charts
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initControls();
  loadEpiConfig();
  loadSavedScenarios();
  applyTierDefaultDuration();
  recomputeAndRender();
});

function initTabs() {
  const tabs = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.tab;
      document.getElementById(target).classList.add("active");
    });
  });
}

function initControls() {
  const costSlider = document.getElementById("costPerTrainee");
  const costDisplay = document.getElementById("costPerTraineeDisplay");

  costSlider.addEventListener("input", () => {
    const value = parseInt(costSlider.value, 10);
    appState.config.costPerTraineeINR = value;
    costDisplay.textContent = formatCurrencyINR(value);
  });

  document.getElementById("programmeTier").addEventListener("change", (e) => {
    appState.config.programmeTier = e.target.value;
    applyTierDefaultDuration();
  });

  document.getElementById("careerIncentive").addEventListener("change", (e) => {
    appState.config.careerIncentive = e.target.value;
  });

  document.getElementById("mentorshipLevel").addEventListener("change", (e) => {
    appState.config.mentorshipLevel = e.target.value;
  });

  document.getElementById("deliveryMode").addEventListener("change", (e) => {
    appState.config.deliveryMode = e.target.value;
  });

  document.getElementById("responseTime").addEventListener("change", (e) => {
    appState.config.responseTime = e.target.value;
  });

  document.getElementById("cohortSize").addEventListener("input", (e) => {
    appState.config.cohortSize = parseInt(e.target.value || "0", 10);
  });

  document.getElementById("programmeDuration").addEventListener("input", (e) => {
    appState.config.durationMonths = parseInt(e.target.value || "0", 10);
  });

  document.getElementById("numCohorts").addEventListener("input", (e) => {
    appState.config.numCohorts = parseInt(e.target.value || "0", 10);
  });

  document.getElementById("scenarioNotes").addEventListener("input", (e) => {
    appState.config.notes = e.target.value;
  });

  document.getElementById("applyConfigBtn").addEventListener("click", () => {
    recomputeAndRender();
  });

  document.getElementById("currencyToggle").addEventListener("change", (e) => {
    appState.currency = e.target.value;
    renderAll();
  });

  document.getElementById("modelToggle").addEventListener("change", (e) => {
    appState.model = e.target.value;
    recomputeAndRender();
  });

  document.getElementById("saveScenarioBtn").addEventListener("click", () => {
    saveCurrentScenario();
  });

  document
    .getElementById("downloadBriefBtn")
    .addEventListener("click", downloadPolicyBriefPDF);

  document
    .getElementById("downloadExcelBtn")
    .addEventListener("click", downloadExcelData);
}

function applyTierDefaultDuration() {
  const tier = appState.config.programmeTier;
  let months = 3;
  if (tier === "intermediate") months = 12;
  if (tier === "advanced") months = 24;
  appState.config.durationMonths = months;
  document.getElementById("programmeDuration").value = months;
}

async function loadEpiConfig() {
  try {
    const resp = await fetch("epi_config.json");
    if (!resp.ok) return;
    const data = await resp.json();
    appState.epiConfig = data;
  } catch (e) {
    // Fail quietly; epi benefits are optional
  }
}

function recomputeAndRender() {
  appState.results = computeMetrics(appState.config);
  renderAll();
}

function renderAll() {
  renderSummaryCards();
  renderResultsTable();
  renderCharts();
  renderSavedScenariosTable();
}

/* -----------------------------------------------------
   Rendering helpers
----------------------------------------------------- */

function renderSummaryCards() {
  const r = appState.results;
  if (!r) return;

  document.getElementById("endorsementRate").textContent = formatPercent(
    r.endorsement
  );
  document.getElementById("costPerCohort").textContent = formatCurrency(
    r.costPerCohortINR
  );
  document.getElementById("benefitPerCohort").textContent = formatCurrency(
    r.benefitPerCohortINR
  );
  document.getElementById("bcrValue").textContent =
    r.bcr == null ? "–" : r.bcr.toFixed(2);
}

function renderResultsTable() {
  const cfg = appState.config;
  const r = appState.results;
  if (!r) return;

  const modelName =
    appState.model === "mxl"
      ? "Average mixed logit"
      : "Training supporters (LC Class 2)";

  document.getElementById("resultsModelName").textContent = modelName;
  document.getElementById("resultsTier").textContent = tierLabel(
    cfg.programmeTier
  );
  document.getElementById("resultsMentorship").textContent =
    cfg.mentorshipLevel;
  document.getElementById("resultsDelivery").textContent = cfg.deliveryMode;
  document.getElementById("resultsResponse").textContent =
    cfg.responseTime + " days";
  document.getElementById("resultsCostPerTrainee").textContent = formatCurrency(
    cfg.costPerTraineeINR
  );
  document.getElementById("resultsCohortSize").textContent = cfg.cohortSize;
  document.getElementById("resultsDuration").textContent =
    cfg.durationMonths + " months";
  document.getElementById("resultsNumCohorts").textContent = cfg.numCohorts;

  document.getElementById("resultsEndorsement").textContent = formatPercent(
    r.endorsement
  );
  document.getElementById("resultsCostCohort").textContent = formatCurrency(
    r.costPerCohortINR
  );
  document.getElementById("resultsBenefitCohort").textContent = formatCurrency(
    r.benefitPerCohortINR
  );
  document.getElementById("resultsBcr").textContent =
    r.bcr == null ? "–" : r.bcr.toFixed(2);
  document.getElementById("resultsNbCohort").textContent = formatCurrency(
    r.nbPerCohortINR
  );
  document.getElementById("resultsTotalCost").textContent = formatCurrency(
    r.totalCostINR
  );
  document.getElementById("resultsTotalBenefit").textContent = formatCurrency(
    r.totalBenefitINR
  );
  document.getElementById("resultsTotalNb").textContent = formatCurrency(
    r.totalNbINR
  );
}

function renderCharts() {
  const r = appState.results;
  if (!r) return;

  const ctxBcr = document.getElementById("bcrChart").getContext("2d");
  const ctxCB = document.getElementById("costBenefitChart").getContext("2d");
  const ctxU = document.getElementById("uptakeChart").getContext("2d");

  if (appState.charts.bcrChart) appState.charts.bcrChart.destroy();
  if (appState.charts.costBenefitChart) appState.charts.costBenefitChart.destroy();
  if (appState.charts.uptakeChart) appState.charts.uptakeChart.destroy();

  appState.charts.bcrChart = new Chart(ctxBcr, {
    type: "bar",
    data: {
      labels: ["Benefit–cost ratio"],
      datasets: [
        {
          label: "",
          data: [r.bcr || 0],
          borderWidth: 1
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  appState.charts.costBenefitChart = new Chart(ctxCB, {
    type: "bar",
    data: {
      labels: ["Cost per cohort", "Benefit per cohort"],
      datasets: [
        {
          label: "",
          data: [r.costPerCohortINR, r.benefitPerCohortINR],
          borderWidth: 1
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  appState.charts.uptakeChart = new Chart(ctxU, {
    type: "bar",
    data: {
      labels: ["Endorsement"],
      datasets: [
        {
          label: "",
          data: [r.endorsement * 100],
          borderWidth: 1
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

/* -----------------------------------------------------
   Saved scenarios and export
----------------------------------------------------- */

function saveCurrentScenario() {
  const name = prompt("Scenario name:", "Scenario " + (appState.savedScenarios.length + 1));
  if (!name) return;

  const entry = {
    name,
    model: appState.model,
    config: { ...appState.config },
    results: { ...appState.results },
    timestamp: new Date().toISOString()
  };

  appState.savedScenarios.push(entry);
  localStorage.setItem("stepsSavedScenarios", JSON.stringify(appState.savedScenarios));
  renderSavedScenariosTable();
}

function loadSavedScenarios() {
  try {
    const raw = localStorage.getItem("stepsSavedScenarios");
    if (!raw) return;
    appState.savedScenarios = JSON.parse(raw);
  } catch (e) {
    appState.savedScenarios = [];
  }
}

function renderSavedScenariosTable() {
  const tbody = document.querySelector("#savedScenariosTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  appState.savedScenarios.forEach((s) => {
    const tr = document.createElement("tr");

    const cells = [
      s.name,
      tierLabel(s.config.programmeTier),
      s.config.mentorshipLevel,
      s.config.deliveryMode,
      s.config.responseTime + " days",
      formatCurrency(s.config.costPerTraineeINR),
      s.config.cohortSize.toString(),
      formatPercent(s.results.endorsement),
      s.results.bcr == null ? "–" : s.results.bcr.toFixed(2),
      s.config.notes || ""
    ];

    cells.forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function downloadExcelData() {
  const rows = appState.savedScenarios.map((s) => {
    return {
      Name: s.name,
      PreferenceModel:
        s.model === "mxl"
          ? "Average mixed logit"
          : "Training supporters (LC Class 2)",
      Tier: tierLabel(s.config.programmeTier),
      Mentorship: s.config.mentorshipLevel,
      Delivery: s.config.deliveryMode,
      ResponseDays: s.config.responseTime,
      CostPerTraineeMonthINR: s.config.costPerTraineeINR,
      CohortSize: s.config.cohortSize,
      DurationMonths: s.config.durationMonths,
      NumCohorts: s.config.numCohorts,
      EndorsementShare: s.results.endorsement,
      BenefitCostRatio: s.results.bcr,
      NetBenefitPerCohortINR: s.results.nbPerCohortINR,
      ScenarioNotes: s.config.notes || ""
    };
  });

  if (rows.length === 0 && appState.results) {
    const s = {
      name: "Current scenario",
      model: appState.model,
      config: { ...appState.config },
      results: { ...appState.results }
    };
    rows.push({
      Name: s.name,
      PreferenceModel:
        s.model === "mxl"
          ? "Average mixed logit"
          : "Training supporters (LC Class 2)",
      Tier: tierLabel(s.config.programmeTier),
      Mentorship: s.config.mentorshipLevel,
      Delivery: s.config.deliveryMode,
      ResponseDays: s.config.responseTime,
      CostPerTraineeMonthINR: s.config.costPerTraineeINR,
      CohortSize: s.config.cohortSize,
      DurationMonths: s.config.durationMonths,
      NumCohorts: s.config.numCohorts,
      EndorsementShare: s.results.endorsement,
      BenefitCostRatio: s.results.bcr,
      NetBenefitPerCohortINR: s.results.nbPerCohortINR,
      ScenarioNotes: s.config.notes || ""
    });
  }

  if (rows.length === 0) {
    alert("No scenarios to export.");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "STEPS scenarios");
  XLSX.writeFile(wb, "STEPS_FETP_scenarios.xlsx");
}

function downloadPolicyBriefPDF() {
  if (!appState.results) {
    alert("Please apply a configuration first.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cfg = appState.config;
  const r = appState.results;
  const modelName =
    appState.model === "mxl"
      ? "Average mixed logit"
      : "Training supporters (LC Class 2)";

  const currencyLabel = appState.currency === "USD" ? "USD" : "INR";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("STEPS FETP scale up brief – India", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This brief summarises a Field Epidemiology Training Programme (FETP) configuration evaluated with STEPS.",
    14,
    26,
    { maxWidth: 180 }
  );
  doc.text(
    "Results combine discrete choice experiment evidence on stakeholder preferences with a simple costing approach.",
    14,
    32,
    { maxWidth: 180 }
  );

  const line1 =
    "Scenario: " +
    tierLabel(cfg.programmeTier) +
    ", " +
    cfg.cohortSize +
    " trainees per cohort, " +
    cfg.durationMonths +
    " months, cost of " +
    formatCurrency(cfg.costPerTraineeINR) +
    " per trainee per month, using the " +
    modelName +
    " model.";

  doc.text(line1, 14, 40, { maxWidth: 180 });

  const briefCost = formatCurrency(r.costPerCohortINR);
  const briefBenefit = formatCurrency(r.benefitPerCohortINR);
  const bcrText = r.bcr == null ? "not defined" : r.bcr.toFixed(2);
  const nbText = formatCurrency(r.nbPerCohortINR);

  const summary =
    "Predicted endorsement for this configuration is " +
    formatPercent(r.endorsement) +
    ". The expected willingness to pay based benefit per cohort is " +
    briefBenefit +
    " against a cost of " +
    briefCost +
    ". This gives a benefit–cost ratio of " +
    bcrText +
    " and a net benefit of " +
    nbText +
    " per cohort.";

  doc.text(summary, 14, 48, { maxWidth: 180 });

  let recommendation;
  if (r.bcr == null || r.bcr < 0.9 || r.endorsement < 0.4) {
    recommendation =
      "At current cost and design, this configuration looks relatively weak. Consider increasing mentorship intensity, improving response time targets or reducing costs before large scale expansion.";
  } else if (r.bcr >= 0.9 && r.bcr < 1.1 && r.endorsement >= 0.4) {
    recommendation =
      "This configuration appears broadly acceptable, with benefits close to costs. Refinements to mentorship, delivery mode or response time could improve value without major changes in cost.";
  } else {
    recommendation =
      "This configuration looks attractive, with a benefit–cost ratio above one and solid endorsement. It is a strong candidate for expansion, provided the underlying cost assumptions hold.";
  }

  doc.text("Headline interpretation", 14, 60);
  doc.text(recommendation, 14, 66, { maxWidth: 180 });

  doc.text("National scaling", 14, 82);
  const totalCost = formatCurrency(r.totalCostINR);
  const totalBenefit = formatCurrency(r.totalBenefitINR);
  const totalNb = formatCurrency(r.totalNbINR);

  const scaleText =
    "Scaling this configuration to " +
    cfg.numCohorts +
    " cohorts implies total programme costs of approximately " +
    totalCost +
    " and total benefits of around " +
    totalBenefit +
    ", giving a total net benefit of " +
    totalNb +
    " at the chosen assumptions.";

  doc.text(scaleText, 14, 88, { maxWidth: 180 });

  if (cfg.notes && cfg.notes.trim().length > 0) {
    doc.text("Scenario notes", 14, 104);
    doc.text(cfg.notes.trim(), 14, 110, { maxWidth: 180 });
  }

  doc.setFontSize(8);
  doc.text(
    "All monetary values are calculated internally in INR and displayed here in " +
      currencyLabel +
      ".",
    14,
    130
  );
  doc.text(
    "For full technical details see the STEPS technical appendix.",
    14,
    136
  );
  doc.text(
    "Prepared by Mesfin Genie, PhD, Newcastle Business School, The University of Newcastle, Australia.",
    14,
    142
  );
  doc.text("Contact: mesfin.genie@newcastle.edu.au", 14, 148);

  doc.save("STEPS_FETP_brief.pdf");
}
