/* STEPS – FETP Decision Aid logic */
/* Uses mixed logit coefficients and WTP from the FETP DCE */

(function () {
  "use strict";

  // ==============================
  // 1. Core parameters from MXL
  // ==============================

  // Mixed logit mean coefficients (preference space)
  // Reference levels:
  //  - Program: frontline
  //  - Career incentives: certificate
  //  - Mentorship: low
  //  - Delivery: blended
  //  - Response: 30 days
  //  - Training B as base, opt-out ASC for opt-out
  const BETA = {
    program: {
      frontline: 0.0,
      intermediate: 0.220,
      advanced: 0.487
    },
    career: {
      certificate: 0.0,
      university: 0.017,
      gov_career: -0.122
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
      "30": 0.0,
      "15": 0.546,
      "7": 0.610
    },
    ascOptout: -0.601,
    // Mean marginal utility of cost per ₹000 (after back-transform)
    cost: -0.005
  };

  // WTP estimates (₹000 per trainee per month) from Table 4
  const WTP = {
    program: {
      intermediate: 47.06,
      advanced: 103.99
    },
    career: {
      university: 3.69,
      gov_career: -26.17
    },
    mentorship: {
      medium: 96.87,
      high: 136.79
    },
    delivery: {
      inperson: -49.56,
      online: -229.33
    },
    response: {
      "15": 116.70,
      "7": 130.46
    }
  };

  // Duration in months by program type
  const DURATION_MONTHS = {
    frontline: 3,
    intermediate: 12,
    advanced: 24
  };

  // Latest scenario state, used across tabs and exports
  let latestScenario = null;

  // Chart handles
  const charts = {
    uptakeBar: null,
    benefitBar: null,
    uptakeCurve: null,
    sensitivity: null,
    simulation: null
  };

  // ==============================
  // 2. Utility and economic logic
  // ==============================

  function getConfigFromInputs() {
    const programType = document.getElementById("programType").value;
    const careerIncentive = document.getElementById("careerIncentive").value;
    const mentorship = document.getElementById("mentorship").value;
    const deliveryMode = document.getElementById("deliveryMode").value;
    const responseSpeed = document.getElementById("responseSpeed").value;

    const costPerTrainee = parseFloat(
      document.getElementById("costPerTrainee").value
    );
    const cohortSize = parseInt(
      document.getElementById("cohortSize").value,
      10
    );
    const scenarioLabelInput = document.getElementById("cohortLabel").value;

    const validCost = isFinite(costPerTrainee) && costPerTrainee > 0
      ? costPerTrainee
      : 150000;
    const validCohort = isFinite(cohortSize) && cohortSize > 0
      ? cohortSize
      : 20;

    const scenarioLabel =
      scenarioLabelInput && scenarioLabelInput.trim().length > 0
        ? scenarioLabelInput.trim()
        : `${capitalize(programType)} program, ${capitalize(
            mentorship
          )} mentorship`;

    return {
      programType,
      careerIncentive,
      mentorship,
      deliveryMode,
      responseSpeed,
      costPerTraineeMonth: validCost,
      cohortSize: validCohort,
      scenarioLabel
    };
  }

  function computeUtilityAndUptake(config) {
    const costPerTrainee000 = config.costPerTraineeMonth / 1000.0;

    // Utility of the configured program (relative to Training B)
    let U_program = 0.0;
    U_program += BETA.program[config.programType] || 0.0;
    U_program += BETA.career[config.careerIncentive] || 0.0;
    U_program += BETA.mentorship[config.mentorship] || 0.0;
    U_program += BETA.delivery[config.deliveryMode] || 0.0;
    U_program += BETA.response[config.responseSpeed] || 0.0;
    U_program += BETA.cost * costPerTrainee000;

    // Utility of opting out
    const U_optout = BETA.ascOptout;

    const expProg = Math.exp(U_program);
    const expOpt = Math.exp(U_optout);

    const uptakeProb = expProg / (expProg + expOpt);

    return {
      U_program,
      uptake: uptakeProb
    };
  }

  function computeBenefits(config, uptake) {
    const duration = DURATION_MONTHS[config.programType] || 12;
    const cohortSize = config.cohortSize;

    // Sum WTP for this configuration, relative to the reference profile
    let wtpThousand = 0.0;

    if (config.programType === "intermediate") {
      wtpThousand += WTP.program.intermediate;
    } else if (config.programType === "advanced") {
      wtpThousand += WTP.program.advanced;
    }

    if (config.careerIncentive === "university") {
      wtpThousand += WTP.career.university;
    } else if (config.careerIncentive === "gov_career") {
      wtpThousand += WTP.career.gov_career;
    }

    if (config.mentorship === "medium") {
      wtpThousand += WTP.mentorship.medium;
    } else if (config.mentorship === "high") {
      wtpThousand += WTP.mentorship.high;
    }

    if (config.deliveryMode === "inperson") {
      wtpThousand += WTP.delivery.inperson;
    } else if (config.deliveryMode === "online") {
      wtpThousand += WTP.delivery.online;
    }

    if (config.responseSpeed === "15") {
      wtpThousand += WTP.response["15"];
    } else if (config.responseSpeed === "7") {
      wtpThousand += WTP.response["7"];
    }

    // Convert WTP from ₹000 to ₹
    const benefitPerTraineeMonth = wtpThousand * 1000.0;

    const totalBenefitIfImplemented =
      benefitPerTraineeMonth * duration * cohortSize;

    const totalCost =
      config.costPerTraineeMonth * duration * cohortSize;

    const bcr =
      totalCost > 0 ? totalBenefitIfImplemented / totalCost : 0.0;

    const netBenefitIfImplemented =
      totalBenefitIfImplemented - totalCost;

    // Expected net benefit, adjusting for DCE-based uptake
    const expectedNetBenefit = uptake * netBenefitIfImplemented;

    return {
      duration,
      benefitPerTraineeMonth,
      totalBenefitIfImplemented,
      totalCost,
      bcr,
      netBenefitIfImplemented,
      expectedNetBenefit
    };
  }

  function computeScenario(config) {
    const { U_program, uptake } = computeUtilityAndUptake(config);
    const econ = computeBenefits(config, uptake);

    return {
      config,
      U_program,
      uptake,
      ...econ
    };
  }

  // ==============================
  // 3. Update UI helpers
  // ==============================

  function formatCurrency(value) {
    if (!isFinite(value)) return "-";
    const abs = Math.abs(value);
    if (abs >= 1e9) {
      return `₹ ${(value / 1e9).toFixed(2)} B`;
    }
    if (abs >= 1e6) {
      return `₹ ${(value / 1e6).toFixed(2)} M`;
    }
    if (abs >= 1e3) {
      return `₹ ${(value / 1e3).toFixed(1)} K`;
    }
    return `₹ ${value.toFixed(0)}`;
  }

  function formatPercent(value) {
    if (!isFinite(value)) return "-";
    return `${(value * 100).toFixed(1)}%`;
  }

  function updateResultCards(scenario) {
    if (!scenario) return;

    const {
      U_program,
      uptake,
      duration,
      benefitPerTraineeMonth,
      totalBenefitIfImplemented,
      totalCost,
      bcr,
      expectedNetBenefit,
      config
    } = scenario;

    document.getElementById("kpiUtility").textContent =
      U_program.toFixed(3);
    document.getElementById("kpiUptake").textContent =
      formatPercent(uptake);
    document.getElementById("kpiScenarioLabel").textContent =
      config.scenarioLabel;

    document.getElementById("kpiBenefitPerTrainee").textContent =
      formatCurrency(benefitPerTraineeMonth);
    document.getElementById("kpiTotalBenefit").textContent =
      formatCurrency(totalBenefitIfImplemented);
    document.getElementById(
      "kpiExpectedNetBenefit"
    ).textContent = formatCurrency(expectedNetBenefit);

    document.getElementById("kpiDuration").textContent =
      `${duration.toFixed(0)} months`;
    document.getElementById("kpiTotalCost").textContent =
      formatCurrency(totalCost);
    document.getElementById("kpiBCR").textContent =
      bcr.toFixed(2);
  }

  function updateModal(scenario) {
    if (!scenario) return;
    const {
      U_program,
      uptake,
      totalBenefitIfImplemented,
      totalCost,
      bcr,
      expectedNetBenefit
    } = scenario;

    document.getElementById("modalUptake").textContent =
      formatPercent(uptake);
    document.getElementById("modalUtility").textContent =
      U_program.toFixed(3);
    document.getElementById("modalBenefit").textContent =
      formatCurrency(totalBenefitIfImplemented);
    document.getElementById("modalCost").textContent =
      formatCurrency(totalCost);
    document.getElementById("modalBCR").textContent =
      bcr.toFixed(2);
    document.getElementById(
      "modalExpectedNetBenefit"
    ).textContent = formatCurrency(expectedNetBenefit);
  }

  // ==============================
  // 4. Charts
  // ==============================

  function drawUptakeBar(scenario) {
    const ctx = document.getElementById("chartUptakeBar");
    if (!ctx) return;
    if (charts.uptakeBar) charts.uptakeBar.destroy();

    charts.uptakeBar = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Program vs opt-out"],
        datasets: [
          {
            label: "Uptake probability",
            data: [scenario.uptake * 100],
            backgroundColor: "#0060b9"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function (v) {
                return v + "%";
              }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.raw.toFixed(1)}% uptake`;
              }
            }
          }
        }
      }
    });
  }

  function drawBenefitBar(scenario) {
    const ctx = document.getElementById("chartBenefitBar");
    if (!ctx) return;
    if (charts.benefitBar) charts.benefitBar.destroy();

    const benefitM = scenario.totalBenefitIfImplemented / 1e6;
    const costM = scenario.totalCost / 1e6;

    charts.benefitBar = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Cohort"],
        datasets: [
          {
            label: "Total benefit (M ₹)",
            data: [benefitM],
            backgroundColor: "#008b5a"
          },
          {
            label: "Total cost (M ₹)",
            data: [costM],
            backgroundColor: "#cbd2e6"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (v) {
                return v.toFixed(1);
              }
            }
          }
        },
        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }
    });
  }

  function drawUptakeCurve(config) {
    const ctx = document.getElementById("chartUptakeCurve");
    if (!ctx) return;
    if (charts.uptakeCurve) charts.uptakeCurve.destroy();

    const baseCost = config.costPerTraineeMonth;
    const multipliers = [0.5, 0.75, 1, 1.25, 1.5];

    const labels = multipliers.map((m) => `${Math.round(m * 100)}% cost`);
    const values = multipliers.map((m) => {
      const cfg = {
        ...config,
        costPerTraineeMonth: baseCost * m
      };
      const { uptake } = computeUtilityAndUptake(cfg);
      return uptake * 100;
    });

    charts.uptakeCurve = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Uptake as cost changes",
            data: values,
            borderColor: "#0050b3",
            backgroundColor: "rgba(0,80,179,0.1)",
            fill: true,
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function (v) {
                return v + "%";
              }
            }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  function drawSensitivity(config) {
    const ctx = document.getElementById("chartSensitivity");
    if (!ctx) return;
    if (charts.sensitivity) charts.sensitivity.destroy();

    const baseCost = config.costPerTraineeMonth;
    const multipliers = [0.8, 0.9, 1.0, 1.1, 1.2];
    const labels = multipliers.map((m) => `${Math.round(m * 100)}%`);
    const uptakeValues = [];
    const netValues = [];

    multipliers.forEach((m) => {
      const cfg = {
        ...config,
        costPerTraineeMonth: baseCost * m
      };
      const scenario = computeScenario(cfg);
      uptakeValues.push(scenario.uptake * 100);
      netValues.push(scenario.expectedNetBenefit / 1e6);
    });

    charts.sensitivity = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Uptake (%)",
            data: uptakeValues,
            borderColor: "#0060b9",
            backgroundColor: "rgba(0,96,185,0.08)",
            yAxisID: "y1",
            tension: 0.2
          },
          {
            label: "Expected net benefit (M ₹)",
            data: netValues,
            borderColor: "#008b5a",
            backgroundColor: "rgba(0,139,90,0.08)",
            yAxisID: "y2",
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y1: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            ticks: {
              callback: function (v) {
                return v + "%";
              }
            }
          },
          y2: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              callback: function (v) {
                return v.toFixed(1);
              }
            }
          }
        }
      }
    });
  }

  function drawSimulationChart(simResult) {
    const ctx = document.getElementById("chartSimulation");
    if (!ctx) return;
    if (charts.simulation) charts.simulation.destroy();

    const benefitM =
      simResult.totalBenefitIfImplemented / 1e6;
    const costM = simResult.totalCost / 1e6;
    const expectedNetM =
      simResult.expectedNetBenefit / 1e6;

    charts.simulation = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["National total"],
        datasets: [
          {
            label: "Total benefit (M ₹)",
            data: [benefitM],
            backgroundColor: "#008b5a"
          },
          {
            label: "Total cost (M ₹)",
            data: [costM],
            backgroundColor: "#cbd2e6"
          },
          {
            label: "Expected net benefit (M ₹)",
            data: [expectedNetM],
            backgroundColor: "#0050b3"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (v) {
                return v.toFixed(1);
              }
            }
          }
        }
      }
    });
  }

  // ==============================
  // 5. National simulation
  // ==============================

  function runSimulation() {
    if (!latestScenario) return;

    const simCohortsInput = document.getElementById(
      "simCohorts"
    );
    const nCohorts = parseInt(simCohortsInput.value, 10);
    const cohorts = isFinite(nCohorts) && nCohorts > 0
      ? nCohorts
      : 1;

    const totalBenefitIfImplemented =
      latestScenario.totalBenefitIfImplemented * cohorts;
    const totalCost = latestScenario.totalCost * cohorts;
    const expectedNetBenefit =
      latestScenario.expectedNetBenefit * cohorts;

    const simResult = {
      totalBenefitIfImplemented,
      totalCost,
      expectedNetBenefit
    };

    document.getElementById("simTotalBenefit").textContent =
      formatCurrency(totalBenefitIfImplemented);
    document.getElementById("simTotalCost").textContent =
      formatCurrency(totalCost);
    document.getElementById(
      "simExpectedNetBenefit"
    ).textContent = formatCurrency(expectedNetBenefit);

    drawSimulationChart(simResult);
  }

  // ==============================
  // 6. Tab navigation
  // ==============================

  function setActiveTab(tabId) {
    const panels = document.querySelectorAll(".tab-panel");
    panels.forEach((p) => {
      p.classList.toggle(
        "active",
        p.id === `tab-${tabId}`
      );
    });

    const buttons = document.querySelectorAll(".tab-button");
    buttons.forEach((b) => {
      b.classList.toggle(
        "active",
        b.dataset.tab === tabId
      );
    });

    if (!latestScenario) return;

    if (tabId === "results") {
      updateResultCards(latestScenario);
      drawUptakeBar(latestScenario);
      drawBenefitBar(latestScenario);
      drawUptakeCurve(latestScenario.config);
    } else if (tabId === "sensitivity") {
      drawSensitivity(latestScenario.config);
    } else if (tabId === "simulation") {
      runSimulation();
    }
  }

  // ==============================
  // 7. Export functions
  // ==============================

  function exportPDF() {
    if (!latestScenario || !window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const s = latestScenario;
    const cfg = s.config;

    let y = 14;
    doc.setFontSize(14);
    doc.text("STEPS scenario brief – FETP scale-up", 14, y);
    y += 8;

    doc.setFontSize(11);
    doc.text("Configuration", 14, y);
    y += 6;

    const linesConfig = [
      `Scenario label: ${cfg.scenarioLabel}`,
      `Program type: ${capitalize(cfg.programType)}`,
      `Career incentives: ${readableCareer(cfg.careerIncentive)}`,
      `Mentorship: ${capitalize(cfg.mentorship)}`,
      `Delivery mode: ${readableDelivery(cfg.deliveryMode)}`,
      `Response capacity: within ${cfg.responseSpeed} days`,
      `Cohort size: ${cfg.cohortSize} trainees`,
      `Cost per trainee per month: ${formatCurrency(
        cfg.costPerTraineeMonth
      )}`
    ];

    linesConfig.forEach((line) => {
      doc.text(line, 16, y);
      y += 5;
    });

    y += 2;
    doc.text("Uptake and outcomes", 14, y);
    y += 6;

    const linesOutcomes = [
      `Program utility index (vs opt-out): ${s.U_program.toFixed(
        3
      )}`,
      `Uptake probability: ${formatPercent(s.uptake)}`,
      `Program duration: ${s.duration.toFixed(0)} months`,
      `Benefit per trainee per month: ${formatCurrency(
        s.benefitPerTraineeMonth
      )}`,
      `Total benefit (if implemented): ${formatCurrency(
        s.totalBenefitIfImplemented
      )}`,
      `Total cost: ${formatCurrency(s.totalCost)}`,
      `Benefit cost ratio (if implemented): ${s.bcr.toFixed(2)}`,
      `Expected net benefit: ${formatCurrency(
        s.expectedNetBenefit
      )}`
    ];

    linesOutcomes.forEach((line) => {
      doc.text(line, 16, y);
      y += 5;
    });

    doc.save("steps_scenario_brief.pdf");
  }

  function exportExcel() {
    if (!latestScenario || !window.XLSX) return;

    const s = latestScenario;
    const cfg = s.config;

    const rows = [
      ["STEPS scenario summary"],
      [],
      ["Configuration"],
      ["Scenario label", cfg.scenarioLabel],
      ["Program type", cfg.programType],
      ["Career incentives", cfg.careerIncentive],
      ["Mentorship", cfg.mentorship],
      ["Delivery mode", cfg.deliveryMode],
      ["Response capacity (days)", cfg.responseSpeed],
      ["Cohort size", cfg.cohortSize],
      ["Cost per trainee per month (₹)", cfg.costPerTraineeMonth],
      [],
      ["Outputs"],
      ["Utility index (vs opt-out)", s.U_program],
      ["Uptake probability", s.uptake],
      ["Program duration (months)", s.duration],
      ["Benefit per trainee per month (₹)", s.benefitPerTraineeMonth],
      ["Total benefit if implemented (₹)", s.totalBenefitIfImplemented],
      ["Total cost (₹)", s.totalCost],
      ["Benefit cost ratio", s.bcr],
      ["Expected net benefit (₹)", s.expectedNetBenefit]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Scenario");
    XLSX.writeFile(wb, "steps_scenario_summary.xlsx");
  }

  // ==============================
  // 8. Modal controls
  // ==============================

  function openModal() {
    const modal = document.getElementById("resultsModal");
    if (!modal) return;
    modal.classList.remove("hidden");
  }

  function closeModal() {
    const modal = document.getElementById("resultsModal");
    if (!modal) return;
    modal.classList.add("hidden");
  }

  // ==============================
  // 9. Small helpers
  // ==============================

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function readableCareer(code) {
    if (code === "certificate") {
      return "Government and partner certificate";
    }
    if (code === "university") {
      return "University qualification";
    }
    if (code === "gov_career") {
      return "Government career pathway";
    }
    return code;
  }

  function readableDelivery(code) {
    if (code === "blended") return "Blended";
    if (code === "inperson") return "Fully in-person";
    if (code === "online") return "Fully online";
    return code;
  }

  // ==============================
  // 10. Initialise on DOM ready
  // ==============================

  document.addEventListener("DOMContentLoaded", function () {
    // Tab navigation
    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        const tabId = this.dataset.tab;
        setActiveTab(tabId);
      });
    });

    // Apply configuration
    const applyBtn = document.getElementById("btnApplyConfig");
    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        const config = getConfigFromInputs();
        const scenario = computeScenario(config);
        latestScenario = scenario;

        updateResultCards(scenario);
        updateModal(scenario);
        drawUptakeBar(scenario);
        drawBenefitBar(scenario);
        drawUptakeCurve(config);
        drawSensitivity(config);
        runSimulation();

        openModal();
      });
    }

    // Simulation button
    const simBtn = document.getElementById("btnRunSimulation");
    if (simBtn) {
      simBtn.addEventListener("click", function () {
        runSimulation();
      });
    }

    // Export buttons
    const pdfBtn = document.getElementById("btnExportPDF");
    if (pdfBtn) {
      pdfBtn.addEventListener("click", exportPDF);
    }
    const excelBtn = document.getElementById("btnExportExcel");
    if (excelBtn) {
      excelBtn.addEventListener("click", exportExcel);
    }

    // Modal buttons
    const modalClose = document.getElementById("modalClose");
    const modalDismiss = document.getElementById("modalDismiss");
    const modalGoToResults = document.getElementById(
      "modalGoToResults"
    );
    const modalBackdrop = document.querySelector(
      "#resultsModal .modal-backdrop"
    );

    [modalClose, modalDismiss, modalBackdrop].forEach((el) => {
      if (el) {
        el.addEventListener("click", closeModal);
      }
    });

    if (modalGoToResults) {
      modalGoToResults.addEventListener("click", function () {
        closeModal();
        setActiveTab("results");
      });
    }

    // Initialise with default configuration
    const initialConfig = getConfigFromInputs();
    latestScenario = computeScenario(initialConfig);
    updateResultCards(latestScenario);
    drawUptakeBar(latestScenario);
    drawBenefitBar(latestScenario);
    drawUptakeCurve(initialConfig);
    drawSensitivity(initialConfig);
    runSimulation();
  });
})();
