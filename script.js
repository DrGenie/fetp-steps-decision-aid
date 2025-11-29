// STEPS – FETP DECISION AID
// All internal calculations in INR. Currency toggle changes display only.

(function () {
  const exchangeRateINRtoUSD = 1 / 83; // approximate; can be updated in config JSON later

  // Programme durations in months
  const PROGRAMME_DURATION = {
    frontline: 3,
    intermediate: 12,
    advanced: 24,
  };

  // Opportunity cost rates (approx) used when toggle is on
  const OPP_COST_RATE = {
    frontline: 0.40, // guided by frontline template (about 40 percent of full cost)
    intermediate: 0.20, // small but non-trivial share in intermediate template
    advanced: 0.25, // assumed; can be refined
  };

  // Mixed logit mean coefficients (preference space, Table 3)
  const MXL_COEF = {
    ascOptOut: -0.601,
    progIntermediate: 0.220,
    progAdvanced: 0.487,
    incUni: 0.017,
    incGovCareer: -0.122,
    mentorMedium: 0.453,
    mentorHigh: 0.640,
    modeInPerson: -0.232,
    modeOnline: -1.073,
    resp15: 0.546,
    resp7: 0.610,
    costPerThousand: -0.005, // INR 1,000 units
  };

  // Latent class Class 2 coefficients (Training supporters, Table 5)
  const LC2_COEF = {
    ascOptOut: -2.543,
    progIntermediate: 0.087,
    progAdvanced: 0.422,
    incUni: -0.024,
    incGovCareer: -0.123,
    mentorMedium: 0.342,
    mentorHigh: 0.486,
    modeInPerson: -0.017,
    modeOnline: -0.700,
    resp15: 0.317,
    resp7: 0.504,
    costPerThousand: -0.001,
  };

  // WTP per trainee per month in INR (rounded from Tables 4 and 6)
  const MXL_WTP = {
    intermediate: 47000,
    advanced: 104000,
    mentorshipMedium: 97000,
    mentorshipHigh: 137000,
    inPerson: -50000,
    online: -229000,
    resp15: 117000,
    resp7: 130000,
  };

  const LC2_WTP = {
    intermediate: 63000,
    advanced: 303000,
    mentorshipMedium: 245000,
    mentorshipHigh: 349000,
    inPerson: -12000,
    online: -503000,
    resp15: 228000,
    resp7: 362000,
  };

  // Cost breakdown shares: aggregated from templates (WHO, NIE, NCDC)
  // Shares refer to direct cost only; opportunity cost is added separately.
  const COST_SHARES = {
    frontline: {
      staff: 0.21,
      travel: 0.50,
      workshops: 0.07,
      facilities: 0.07,
      otherDirect: 0.15,
    },
    intermediate: {
      staff: 0.13,
      travel: 0.65,
      workshops: 0.03,
      facilities: 0.05,
      otherDirect: 0.14,
    },
    advanced: {
      staff: 0.14,
      travel: 0.61,
      workshops: 0.04,
      facilities: 0.06,
      otherDirect: 0.15,
    },
  };

  const COST_LABELS = {
    staff: "Staff and mentors",
    travel: "Travel (domestic and international)",
    workshops: "Workshops and materials",
    facilities: "Facilities and overheads",
    otherDirect: "Other direct costs",
  };

  // Charts
  let uptakeChart = null;
  let benefitChart = null;
  let sensitivityChart = null;
  let simulationChart = null;
  let dashboardChart = null;

  // Application state
  const state = {
    config: {
      programmeType: "frontline",
      careerIncentive: "certificate",
      mentorship: "low",
      deliveryMode: "blended",
      responseTime: "30",
      costPerTraineeMonth: 250000,
      cohortSize: 20,
      numCohorts: 50,
      valuePerGrad: 3000000,
      preferenceModel: "mxl",
      currency: "INR",
      includeOppCost: false,
      costTemplateSource: "combined",
      notes: "",
    },
    results: null,
    savedScenarios: [],
  };

  /* Utility formatting */

  function formatNumber(value, digits = 0) {
    if (value == null || isNaN(value)) return "–";
    return value.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function formatCurrencyINR(value) {
    if (value == null || isNaN(value)) return "–";
    return "₹ " + formatNumber(Math.round(value), 0);
  }

  function formatCurrency(value, currency) {
    if (value == null || isNaN(value)) return "–";
    if (currency === "USD") {
      const usd = value * exchangeRateINRtoUSD;
      return "$ " + formatNumber(usd, 0);
    }
    return formatCurrencyINR(value);
  }

  function formatPercent(p) {
    if (p == null || isNaN(p)) return "–";
    return formatNumber(p * 100, 1) + " %";
  }

  /* Read config from DOM */

  function readConfigFromInputs() {
    const programmeType = document.getElementById("programmeType").value;
    const careerIncentive = document.getElementById("careerIncentive").value;
    const mentorship = document.getElementById("mentorship").value;
    const deliveryMode = document.getElementById("deliveryMode").value;
    const responseTime = document.getElementById("responseTime").value;
    const costPerTraineeMonth = Number(
      document.getElementById("costSlider").value
    );
    const cohortSize = Number(
      document.getElementById("cohortSize").value || 0
    );
    const numCohorts = Number(
      document.getElementById("numCohorts").value || 0
    );
    const valuePerGrad = Number(
      document.getElementById("valuePerGrad").value || 0
    );
    const preferenceModel =
      document.getElementById("preferenceModel").value;
    const currency = document.getElementById("currencySelect").value;
    const costTemplateSource =
      document.getElementById("costTemplateSource").value;
    const notes = document.getElementById("scenarioNotes").value.trim();
    const includeOppCost =
      document
        .getElementById("oppCostToggle")
        .classList.contains("active") || false;

    state.config = {
      programmeType,
      careerIncentive,
      mentorship,
      deliveryMode,
      responseTime,
      costPerTraineeMonth,
      cohortSize,
      numCohorts,
      valuePerGrad,
      preferenceModel,
      currency,
      includeOppCost,
      costTemplateSource,
      notes,
    };
  }

  /* DCE utility and uptake */

  function computeUtilityForProgram(config, modelType) {
    const costInThousands = config.costPerTraineeMonth / 1000;
    let V_prog = 0;
    let V_opt;

    if (modelType === "lc2") {
      V_opt = LC2_COEF.ascOptOut;

      if (config.programmeType === "intermediate") {
        V_prog += LC2_COEF.progIntermediate;
      } else if (config.programmeType === "advanced") {
        V_prog += LC2_COEF.progAdvanced;
      }

      if (config.careerIncentive === "university") {
        V_prog += LC2_COEF.incUni;
      } else if (config.careerIncentive === "gov_career") {
        V_prog += LC2_COEF.incGovCareer;
      }

      if (config.mentorship === "medium") {
        V_prog += LC2_COEF.mentorMedium;
      } else if (config.mentorship === "high") {
        V_prog += LC2_COEF.mentorHigh;
      }

      if (config.deliveryMode === "inperson") {
        V_prog += LC2_COEF.modeInPerson;
      } else if (config.deliveryMode === "online") {
        V_prog += LC2_COEF.modeOnline;
      }

      if (config.responseTime === "15") {
        V_prog += LC2_COEF.resp15;
      } else if (config.responseTime === "7") {
        V_prog += LC2_COEF.resp7;
      }

      V_prog += LC2_COEF.costPerThousand * costInThousands;
    } else {
      V_opt = MXL_COEF.ascOptOut;

      if (config.programmeType === "intermediate") {
        V_prog += MXL_COEF.progIntermediate;
      } else if (config.programmeType === "advanced") {
        V_prog += MXL_COEF.progAdvanced;
      }

      if (config.careerIncentive === "university") {
        V_prog += MXL_COEF.incUni;
      } else if (config.careerIncentive === "gov_career") {
        V_prog += MXL_COEF.incGovCareer;
      }

      if (config.mentorship === "medium") {
        V_prog += MXL_COEF.mentorMedium;
      } else if (config.mentorship === "high") {
        V_prog += MXL_COEF.mentorHigh;
      }

      if (config.deliveryMode === "inperson") {
        V_prog += MXL_COEF.modeInPerson;
      } else if (config.deliveryMode === "online") {
        V_prog += MXL_COEF.modeOnline;
      }

      if (config.responseTime === "15") {
        V_prog += MXL_COEF.resp15;
      } else if (config.responseTime === "7") {
        V_prog += MXL_COEF.resp7;
      }

      V_prog += MXL_COEF.costPerThousand * costInThousands;
    }

    return { V_prog, V_opt };
  }

  function computeUptake(config) {
    const model =
      config.preferenceModel === "lc2" ? "lc2" : "mxl";
    const { V_prog, V_opt } = computeUtilityForProgram(config, model);
    const expProg = Math.exp(V_prog);
    const expOpt = Math.exp(V_opt);
    const probProg = expProg / (expProg + expOpt);
    return probProg;
  }

  /* Per trainee benefit from WTP */

  function computePerTraineeBenefit(config) {
    const dict =
      config.preferenceModel === "lc2" ? LC2_WTP : MXL_WTP;
    let wtp = 0;

    if (config.programmeType === "intermediate") {
      wtp += dict.intermediate || 0;
    } else if (config.programmeType === "advanced") {
      wtp += dict.advanced || 0;
    }

    if (config.mentorship === "medium") {
      wtp += dict.mentorshipMedium || 0;
    } else if (config.mentorship === "high") {
      wtp += dict.mentorshipHigh || 0;
    }

    if (config.deliveryMode === "inperson") {
      wtp += dict.inPerson || 0;
    } else if (config.deliveryMode === "online") {
      wtp += dict.online || 0;
    }

    if (config.responseTime === "15") {
      wtp += dict.resp15 || 0;
    } else if (config.responseTime === "7") {
      wtp += dict.resp7 || 0;
    }

    const months = PROGRAMME_DURATION[config.programmeType] || 12;
    const perTraineeTotal = wtp * months;
    return perTraineeTotal;
  }

  /* Cost and benefit calculations */

  function computeCohortCost(config) {
    const months = PROGRAMME_DURATION[config.programmeType] || 12;
    const directCost =
      config.costPerTraineeMonth * config.cohortSize * months;
    const oppRate = OPP_COST_RATE[config.programmeType] || 0;
    const oppCost = config.includeOppCost ? directCost * oppRate : 0;
    const totalCost = directCost + oppCost;
    return { directCost, oppCost, totalCost };
  }

  function computeCostBreakdown(config, directCost) {
    const shares = COST_SHARES[config.programmeType];
    if (!shares) return [];
    const rows = [];
    Object.keys(shares).forEach((key) => {
      const share = shares[key];
      const amount = directCost * share;
      rows.push({
        key,
        label: COST_LABELS[key],
        share,
        amount,
      });
    });
    return rows;
  }

  function computeResults(config) {
    const uptake = computeUptake(config);
    const perTraineeBenefit = computePerTraineeBenefit(config);
    const months = PROGRAMME_DURATION[config.programmeType] || 12;
    const { directCost, oppCost, totalCost } = computeCohortCost(config);

    const expectedGraduates = uptake * config.cohortSize;
    const epiWeight =
      config.programmeType === "advanced"
        ? 1.0
        : config.programmeType === "intermediate"
        ? 0.6
        : 0.3;

    const epiBenefit =
      expectedGraduates *
      config.valuePerGrad *
      epiWeight;

    const perceivedBenefitPerCohort =
      perTraineeBenefit * config.cohortSize * uptake;

    const totalBenefit = perceivedBenefitPerCohort + epiBenefit;

    const bcr = totalCost > 0 ? totalBenefit / totalCost : null;
    const netBenefit = totalBenefit - totalCost;

    const nationalCost = totalCost * config.numCohorts;
    const nationalBenefit = totalBenefit * config.numCohorts;
    const nationalNetBenefit = nationalBenefit - nationalCost;
    const nationalGraduates = expectedGraduates * config.numCohorts;

    const costBreakdown = computeCostBreakdown(config, directCost);

    return {
      uptake,
      perTraineeBenefit,
      months,
      directCost,
      oppCost,
      totalCost,
      expectedGraduates,
      epiBenefit,
      perceivedBenefitPerCohort,
      totalBenefit,
      bcr,
      netBenefit,
      nationalCost,
      nationalBenefit,
      nationalNetBenefit,
      nationalGraduates,
      costBreakdown,
    };
  }

  /* Update DOM with results */

  function updateCostBreakdownTable() {
    const tbody = document.getElementById("costBreakdownBody");
    const note = document.getElementById("costTemplateNote");
    if (!tbody || !state.results) return;
    tbody.innerHTML = "";

    state.results.costBreakdown.forEach((row) => {
      const tr = document.createElement("tr");
      const tdCat = document.createElement("td");
      const tdShare = document.createElement("td");
      const tdAmount = document.createElement("td");

      tdCat.textContent = row.label || row.key;
      tdShare.textContent = formatNumber(row.share * 100, 1) + " %";
      tdAmount.textContent = formatCurrency(
        row.amount,
        state.config.currency
      );

      tr.appendChild(tdCat);
      tr.appendChild(tdShare);
      tr.appendChild(tdAmount);
      tbody.appendChild(tr);
    });

    if (note) {
      note.textContent =
        "Cost structure is based on the combined WHO, NIE and NCDC templates for the selected programme type and rescaled to match the chosen cost per trainee per month and cohort size. Opportunity cost is added on top when the toggle is on.";
    }
  }

  function buildHeadlineText(results, config) {
    if (!results) {
      return "Configure a scenario and click “Apply configuration” to see results.";
    }
    const uptake = results.uptake;
    const bcr = results.bcr;

    if (uptake < 0.3 || (bcr !== null && bcr < 1)) {
      return (
        "This configuration is not attractive at current cost and design. " +
        "Uptake is relatively low and the benefit cost ratio is below one. " +
        "Consider moving to intermediate or advanced level with stronger mentorship and faster response time, " +
        "or reducing cost per trainee per month within the DCE range."
      );
    }

    if (uptake >= 0.3 && uptake < 0.6 && bcr !== null && bcr >= 1 && bcr < 2) {
      return (
        "This configuration is viable but not dominant. " +
        "Uptake and benefit cost ratio are acceptable but there may be room for improvement. " +
        "Exploring alternative combinations of mentorship, delivery mode and response time may yield higher value for money."
      );
    }

    if (uptake >= 0.6 && bcr !== null && bcr >= 1) {
      return (
        "This configuration looks promising. " +
        "Uptake is high and the benefit cost ratio exceeds one, suggesting good value for money. " +
        "Scaling this configuration across multiple cohorts is likely to deliver strong returns for India’s public health workforce."
      );
    }

    return (
      "This configuration yields moderate uptake and mixed economic signals. " +
      "Use the sensitivity and national simulation tabs to explore robustness under alternative assumptions."
    );
  }

  function updateResultsView() {
    const r = state.results;
    const c = state.config;
    if (!r) return;

    const uptakeEl = document.getElementById("resultUptake");
    const perTrEl = document.getElementById("resultBenefitPerTrainee");
    const totBenEl = document.getElementById("resultTotalBenefit");
    const costCohortEl = document.getElementById("resultCostCohort");
    const bcrEl = document.getElementById("resultBCR");
    const netBenEl = document.getElementById("resultNetBenefit");
    const gradEl = document.getElementById("resultGraduates");
    const headlineEl = document.getElementById("headlineRecommendation");

    if (uptakeEl) uptakeEl.textContent = formatPercent(r.uptake);
    if (perTrEl)
      perTrEl.textContent = formatCurrency(r.perTraineeBenefit, c.currency);
    if (totBenEl)
      totBenEl.textContent = formatCurrency(r.totalBenefit, c.currency);
    if (costCohortEl)
      costCohortEl.textContent = formatCurrency(r.totalCost, c.currency);
    if (bcrEl)
      bcrEl.textContent =
        r.bcr == null ? "–" : formatNumber(r.bcr, 2);
    if (netBenEl)
      netBenEl.textContent = formatCurrency(r.netBenefit, c.currency);
    if (gradEl)
      gradEl.textContent = formatNumber(r.expectedGraduates, 1);

    if (headlineEl) {
      const text = buildHeadlineText(r, c);
      headlineEl.textContent = text;
      headlineEl.classList.remove(
        "recommend-bad",
        "recommend-mixed",
        "recommend-good"
      );
      if (r.bcr !== null && (r.bcr < 1 || r.uptake < 0.3)) {
        headlineEl.classList.add("recommend-bad");
      } else if (
        r.bcr !== null &&
        r.bcr >= 1 &&
        r.bcr < 2 &&
        r.uptake >= 0.3
      ) {
        headlineEl.classList.add("recommend-mixed");
      } else if (r.bcr !== null && r.bcr >= 1 && r.uptake >= 0.6) {
        headlineEl.classList.add("recommend-good");
      }
    }

    updateCostBreakdownTable();
    updateResultsCharts();
    updateSimulationView();
  }

  /* Charts */

  function updateResultsCharts() {
    const r = state.results;
    const c = state.config;
    if (!r) return;

    const uptakeCtx = document.getElementById("uptakeChart");
    const benefitCtx = document.getElementById("benefitChart");

    if (uptakeCtx) {
      if (uptakeChart) uptakeChart.destroy();
      uptakeChart = new Chart(uptakeCtx.getContext("2d"), {
        type: "bar",
        data: {
          labels: ["Uptake", "Benefit cost ratio"],
          datasets: [
            {
              label: "Scenario",
              data: [r.uptake * 100, r.bcr || 0],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

    if (benefitCtx) {
      if (benefitChart) benefitChart.destroy();
      benefitChart = new Chart(benefitCtx.getContext("2d"), {
        type: "bar",
        data: {
          labels: ["Per trainee benefit", "Cost per trainee per month"],
          datasets: [
            {
              label: "INR (per trainee per month)",
              data: [
                r.perTraineeBenefit / (PROGRAMME_DURATION[c.programmeType] || 1),
                c.costPerTraineeMonth,
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

    updateSensitivityChart();
  }

  function updateSensitivityChart() {
    const r = state.results;
    const c = state.config;
    const canvas = document.getElementById("sensitivityChart");
    if (!r || !canvas) return;

    const baseCost = c.costPerTraineeMonth;
    const scenarios = [
      0.8 * baseCost,
      0.9 * baseCost,
      baseCost,
      1.1 * baseCost,
      1.2 * baseCost,
    ];

    const uptakeValues = [];
    const netBenefits = [];

    scenarios.forEach((costVal) => {
      const cfg = { ...c, costPerTraineeMonth: costVal };
      const res = computeResults(cfg);
      uptakeValues.push(res.uptake * 100);
      netBenefits.push(res.netBenefit);
    });

    if (sensitivityChart) sensitivityChart.destroy();
    sensitivityChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: scenarios.map((v) => "₹ " + formatNumber(v, 0)),
        datasets: [
          {
            label: "Uptake (%)",
            data: uptakeValues,
            yAxisID: "y",
          },
          {
            label: "Net benefit (INR, per cohort)",
            data: netBenefits,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          y: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            title: { display: true, text: "Uptake (%)" },
          },
          y1: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            title: { display: true, text: "Net benefit (INR)" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  function updateSimulationView() {
    const r = state.results;
    const c = state.config;
    if (!r) return;

    const numCohortsEl = document.getElementById("simNumCohorts");
    const totalCostEl = document.getElementById("simTotalCost");
    const totalBenefitEl = document.getElementById("simTotalBenefit");
    const netBenefitEl = document.getElementById("simNetBenefit");
    const totalGradEl = document.getElementById("simTotalGraduates");

    if (numCohortsEl)
      numCohortsEl.textContent = formatNumber(c.numCohorts, 0);
    if (totalCostEl)
      totalCostEl.textContent = formatCurrency(
        r.nationalCost,
        c.currency
      );
    if (totalBenefitEl)
      totalBenefitEl.textContent = formatCurrency(
        r.nationalBenefit,
        c.currency
      );
    if (netBenefitEl)
      netBenefitEl.textContent = formatCurrency(
        r.nationalNetBenefit,
        c.currency
      );
    if (totalGradEl)
      totalGradEl.textContent = formatNumber(r.nationalGraduates, 1);

    const canvas = document.getElementById("simulationChart");
    if (!canvas) return;
    if (simulationChart) simulationChart.destroy();

    simulationChart = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Total cost", "Total benefit", "Net benefit"],
        datasets: [
          {
            label: "National programme",
            data: [
              r.nationalCost,
              r.nationalBenefit,
              r.nationalNetBenefit,
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  /* Saved scenarios */

  function loadSavedScenarios() {
    try {
      const raw = window.localStorage.getItem("steps_scenarios");
      if (raw) {
        state.savedScenarios = JSON.parse(raw);
      } else {
        state.savedScenarios = [];
      }
    } catch (e) {
      state.savedScenarios = [];
    }
  }

  function persistSavedScenarios() {
    try {
      window.localStorage.setItem(
        "steps_scenarios",
        JSON.stringify(state.savedScenarios)
      );
    } catch (e) {
      // ignore
    }
  }

  function saveScenario() {
    if (!state.results) return;

    const nameParts = [
      state.config.programmeType,
      state.config.mentorship,
      state.config.responseTime + "d",
    ];
    const name =
      "Scenario " +
      (state.savedScenarios.length + 1) +
      " – " +
      nameParts.join(" / ");

    const scenario = {
      id: Date.now(),
      name,
      config: { ...state.config },
      results: { ...state.results },
      notes: state.config.notes,
    };

    state.savedScenarios.push(scenario);
    if (state.savedScenarios.length > 10) {
      state.savedScenarios.shift();
    }
    persistSavedScenarios();
    renderSavedScenariosTable();
  }

  function renderSavedScenariosTable() {
    const tbody = document.getElementById("savedScenariosBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    state.savedScenarios.forEach((s) => {
      const tr = document.createElement("tr");
      const sel = document.createElement("td");
      const radio = document.createElement("input");
      radio.type = "checkbox";
      radio.value = s.id;
      radio.className = "scenario-select";
      sel.appendChild(radio);

      const name = document.createElement("td");
      name.textContent = s.name;

      const programme = document.createElement("td");
      programme.textContent = s.config.programmeType;

      const mentor = document.createElement("td");
      mentor.textContent = s.config.mentorship;

      const resp = document.createElement("td");
      resp.textContent = s.config.responseTime + " days";

      const cost = document.createElement("td");
      cost.textContent =
        "₹ " +
        formatNumber(s.config.costPerTraineeMonth, 0);

      const uptake = document.createElement("td");
      uptake.textContent = formatPercent(s.results.uptake);

      const bcr = document.createElement("td");
      bcr.textContent =
        s.results.bcr == null
          ? "–"
          : formatNumber(s.results.bcr, 2);

      tr.appendChild(sel);
      tr.appendChild(name);
      tr.appendChild(programme);
      tr.appendChild(mentor);
      tr.appendChild(resp);
      tr.appendChild(cost);
      tr.appendChild(uptake);
      tr.appendChild(bcr);

      tbody.appendChild(tr);
    });
  }

  function compareSelectedScenarios() {
    const checks = Array.from(
      document.querySelectorAll(".scenario-select")
    ).filter((c) => c.checked);
    if (checks.length === 0) return;

    const ids = checks.map((c) => Number(c.value));
    const chosen = state.savedScenarios.filter((s) =>
      ids.includes(s.id)
    );

    const canvas = document.getElementById("dashboardChart");
    if (!canvas || chosen.length === 0) return;

    if (dashboardChart) dashboardChart.destroy();

    dashboardChart = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: chosen.map((s) => s.name),
        datasets: [
          {
            label: "Uptake (%)",
            data: chosen.map((s) => s.results.uptake * 100),
          },
          {
            label: "Benefit cost ratio",
            data: chosen.map((s) => s.results.bcr || 0),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  function clearAllScenarios() {
    state.savedScenarios = [];
    persistSavedScenarios();
    renderSavedScenariosTable();
    if (dashboardChart) {
      dashboardChart.destroy();
      dashboardChart = null;
    }
  }

  /* Modal */

  function openResultsModal() {
    const backdrop = document.getElementById("resultsModal");
    const body = document.getElementById("resultsModalContent");
    if (!backdrop || !body || !state.results) return;

    const r = state.results;
    const c = state.config;

    body.innerHTML = `
      <p><strong>Programme:</strong> ${c.programmeType}, mentorship ${c.mentorship}, response ${c.responseTime} days, ${c.cohortSize} trainees per cohort.</p>
      <p><strong>Preference model:</strong> ${
        c.preferenceModel === "lc2"
          ? "Latent class 2 (training supporters)"
          : "Average mixed logit"
      }.</p>
      <p><strong>Uptake probability:</strong> ${formatPercent(
        r.uptake
      )}.</p>
      <p><strong>Per trainee benefit (DCE, total over programme):</strong> ${formatCurrency(
        r.perTraineeBenefit,
        c.currency
      )}.</p>
      <p><strong>Total perceived benefit per cohort (DCE + epi):</strong> ${formatCurrency(
        r.totalBenefit,
        c.currency
      )}.</p>
      <p><strong>Total cost per cohort:</strong> ${formatCurrency(
        r.totalCost,
        c.currency
      )}, including ${
      c.includeOppCost
        ? "opportunity cost"
        : "no explicit opportunity cost"
    }.</p>
      <p><strong>Benefit cost ratio (per cohort):</strong> ${
        r.bcr == null ? "–" : formatNumber(r.bcr, 2)
      }.</p>
      <p><strong>Net benefit per cohort:</strong> ${formatCurrency(
        r.netBenefit,
        c.currency
      )}.</p>
      <p><strong>Expected graduates per cohort:</strong> ${formatNumber(
        r.expectedGraduates,
        1
      )}.</p>
      <p><strong>National simulation ( ${
        c.numCohorts
      } cohorts ):</strong> total cost ${formatCurrency(
      r.nationalCost,
      c.currency
    )}, total benefit ${formatCurrency(
      r.nationalBenefit,
      c.currency
    )}, net benefit ${formatCurrency(
      r.nationalNetBenefit,
      c.currency
    )} and about ${formatNumber(r.nationalGraduates, 1)} graduates.</p>
      ${
        c.notes
          ? `<p><strong>Scenario notes:</strong> ${c.notes}</p>`
          : ""
      }
    `;

    backdrop.classList.remove("hidden");
    backdrop.setAttribute("aria-hidden", "false");
  }

  function closeResultsModal() {
    const backdrop = document.getElementById("resultsModal");
    if (!backdrop) return;
    backdrop.classList.add("hidden");
    backdrop.setAttribute("aria-hidden", "true");
  }

  /* PDF exports */

  function downloadPolicyBriefPdf() {
    if (!state.results) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    const r = state.results;
    const c = state.config;

    const marginLeft = 54;
    let y = 60;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("STEPS FETP scale up brief – India", marginLeft, y);
    y += 26;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    const intro = [
      "This brief summarises a Field Epidemiology Training Program (FETP) configuration evaluated with STEPS.",
      "Results combine discrete choice experiment evidence on stakeholder preferences with cost templates and simple epidemiological assumptions.",
      "",
      `Scenario: ${c.programmeType} FETP, ${c.cohortSize} trainees per cohort, duration ${PROGRAMME_DURATION[c.programmeType]} months.`,
      `Cost per trainee per month: ${formatCurrencyINR(
        c.costPerTraineeMonth
      )}. Preference model: ${
        c.preferenceModel === "lc2"
          ? "latent class 2 (training supporters)"
          : "average mixed logit"
      }.`,
    ].join(" ");

    const introLines = doc.splitTextToSize(intro, 480);
    introLines.forEach((line) => {
      doc.text(line, marginLeft, y);
      y += 14;
    });
    y += 6;

    const core = [
      `The estimated endorsement (uptake) probability for this configuration is ${formatPercent(
        r.uptake
      )}.`,
      `Expected graduates per cohort are about ${formatNumber(
        r.expectedGraduates,
        1
      )}.`,
      `Total economic cost per cohort is ${formatCurrencyINR(
        r.totalCost
      )} (including ${
        c.includeOppCost ? "opportunity cost" : "direct costs only"
      }).`,
      `Total perceived benefit (stakeholder willingness to pay over all programme months plus simplified epidemiological benefits) is approximately ${formatCurrencyINR(
        r.totalBenefit
      )}.`,
      `This implies a benefit cost ratio of ${
        r.bcr == null ? "not defined" : formatNumber(r.bcr, 2)
      } and a net benefit of ${formatCurrencyINR(
        r.netBenefit
      )} per cohort.`,
    ].join(" ");

    const coreLines = doc.splitTextToSize(core, 480);
    coreLines.forEach((line) => {
      doc.text(line, marginLeft, y);
      y += 14;
    });
    y += 6;

    const national = [
      `Scaling this configuration to ${c.numCohorts} cohorts implies total programme costs of about ${formatCurrencyINR(
        r.nationalCost
      )} and total perceived benefits of ${formatCurrencyINR(
        r.nationalBenefit
      )}.`,
      `The national net benefit is ${formatCurrencyINR(
        r.nationalNetBenefit
      )}, with roughly ${formatNumber(
        r.nationalGraduates,
        1
      )} graduates.`,
    ].join(" ");

    const nationalLines = doc.splitTextToSize(national, 480);
    nationalLines.forEach((line) => {
      doc.text(line, marginLeft, y);
      y += 14;
    });
    y += 10;

    let recommendation = buildHeadlineText(r, c);
    const recLines = doc.splitTextToSize(
      "Headline recommendation: " + recommendation,
      480
    );
    recLines.forEach((line) => {
      doc.text(line, marginLeft, y);
      y += 14;
    });
    y += 12;

    if (c.notes) {
      const notesLines = doc.splitTextToSize(
        "Scenario notes: " + c.notes,
        480
      );
      notesLines.forEach((line) => {
        doc.text(line, marginLeft, y);
        y += 14;
      });
      y += 8;
    }

    doc.setFontSize(10);
    doc.text(
      "Prepared by Mesfin Genie, PhD, Newcastle Business School, The University of Newcastle, Australia.",
      marginLeft,
      780
    );
    doc.text(
      "Contact: mesfin.genie@newcastle.edu.au",
      marginLeft,
      794
    );

    doc.save("STEPS_FETP_brief.pdf");
  }

  function downloadExcelSummary() {
    if (!state.results) return;

    const c = state.config;
    const r = state.results;

    const rows = [
      [
        "Scenario name",
        "Programme",
        "Mentorship",
        "Delivery",
        "Response days",
        "Cost per trainee per month (INR)",
        "Preference model",
        "Cohort size",
        "Number of cohorts",
        "Uptake probability",
        "Expected graduates per cohort",
        "Per trainee benefit (INR, total)",
        "Total benefit per cohort (INR)",
        "Total cost per cohort (INR)",
        "Benefit cost ratio",
        "Net benefit per cohort (INR)",
        "National cost (INR)",
        "National benefit (INR)",
        "National net benefit (INR)",
        "National graduates",
        "Notes",
      ],
      [
        "Current scenario",
        c.programmeType,
        c.mentorship,
        c.deliveryMode,
        c.responseTime,
        c.costPerTraineeMonth,
        c.preferenceModel,
        c.cohortSize,
        c.numCohorts,
        r.uptake,
        r.expectedGraduates,
        r.perTraineeBenefit,
        r.totalBenefit,
        r.totalCost,
        r.bcr,
        r.netBenefit,
        r.nationalCost,
        r.nationalBenefit,
        r.nationalNetBenefit,
        r.nationalGraduates,
        c.notes,
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Scenario");
    XLSX.writeFile(wb, "STEPS_FETP_scenario.xlsx");
  }

  /* Technical appendix */

  function openTechnicalAppendixWindow() {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>STEPS technical appendix</title>
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 18px; line-height: 1.5; max-width: 840px; margin: 0 auto; background:#f9fafb; color:#111827; }
          h1,h2,h3 { color:#0f172a; }
          h1 { font-size:22px; margin-bottom:8px; }
          h2 { font-size:18px; margin-top:20px; margin-bottom:6px; }
          h3 { font-size:15px; margin-top:14px; margin-bottom:4px; }
          p { font-size:13px; margin:4px 0; }
          ul { font-size:13px; padding-left:20px; }
          code { background:#e5e7eb; padding:2px 4px; border-radius:4px; font-size:12px; }
        </style>
      </head>
      <body>
        <h1>STEPS technical appendix</h1>
        <p>
          This appendix summarises the methods used in STEPS for translating discrete choice experiment (DCE) evidence, cost templates and simple epidemiological assumptions into scenario level results. It is written for technical users and complements the main interface, which targets policy audiences.
        </p>

        <h2>1. Discrete choice experiment and utility specification</h2>
        <p>
          The DCE elicited preferences of 214 stakeholders over hypothetical FETP configurations characterised by six attributes: programme type (frontline, intermediate, advanced), career incentives (certificate, university qualification, government career pathway), mentorship intensity (low, medium, high), delivery mode (blended, fully in person, fully online), response capacity (30, 15, 7 days) and cost per trainee per month (₹75,000 to ₹400,000). A dual response format was used with two programme alternatives (Training A and Training B) followed by an opt out question.
        </p>
        <p>
          The econometric analysis followed random utility maximisation. For respondent <em>n</em>, alternative <em>j</em> and choice task <em>t</em>, utility is decomposed as
        </p>
        <p>
          <code>U<sub>njt</sub> = V<sub>njt</sub> + ε<sub>njt</sub></code>
        </p>
        <p>
          where <code>V<sub>njt</sub></code> is the systematic component and <code>ε<sub>njt</sub></code> follows an extreme value type I distribution. The systematic component used in STEPS is
        </p>
        <p>
          <code>
          V<sub>njt</sub> = α<sub>A,n</sub> ASC_A + α<sub>O,n</sub> ASC_OptOut
          + β<sub>1,n</sub> Intermediate
          + β<sub>2,n</sub> Advanced
          + β<sub>3,n</sub> University
          + β<sub>4,n</sub> GovernmentCareer
          + β<sub>5,n</sub> MentorshipMedium
          + β<sub>6,n</sub> MentorshipHigh
          + β<sub>7,n</sub> InPerson
          + β<sub>8,n</sub> Online
          + β<sub>9,n</sub> Response15
          + β<sub>10,n</sub> Response7
          + β<sub>11,n</sub> Cost
          </code>
        </p>
        <p>
          Training B is the reference alternative for the alternative specific constants (ASCs), frontline is the reference for programme type, certificate is the reference for career incentives, low mentorship for mentorship intensity, blended delivery for mode of delivery and response within 30 days for response capacity.
        </p>

        <h2>2. Mixed logit (MXL) model</h2>
        <p>
          The main model is a panel mixed logit estimated in preference space with normal distributions for all non cost coefficients and a lognormal distribution for cost. The individual parameter vector
          <code>θ<sub>n</sub> = (α<sub>A,n</sub>, α<sub>O,n</sub>, β<sub>1,n</sub>, …, β<sub>11,n</sub>)</code>
          is a draw from <code>f(θ<sub>n</sub>|ψ)</code>, where <code>ψ</code> contains means and standard deviations.
        </p>
        <p>
          The marginal utility of cost for individual <em>n</em> is specified as
        </p>
        <p>
          <code>β<sub>11,n</sub> = −exp(μ<sub>cost</sub> + σ<sub>cost</sub> η<sub>n</sub>)</code>
        </p>
        <p>
          where <code>η<sub>n</sub> ~ N(0,1)</code>. This ensures the marginal utility of cost is strictly negative for all individuals and produces a positively skewed distribution of cost sensitivity.
        </p>
        <p>
          Conditional on <code>θ<sub>n</sub></code>, the probability of choosing alternative <em>i</em> in task <em>t</em> is the multinomial logit:
        </p>
        <p>
          <code>P(y<sub>nt</sub> = i | θ<sub>n</sub>) = exp(V<sub>nit</sub>) / Σ<sub>j</sub> exp(V<sub>njt</sub>)</code>
        </p>
        <p>
          The unconditional probability integrates over <code>f(θ<sub>n</sub>|ψ)</code> and is approximated using simulated maximum likelihood with quasi random draws.
        </p>

        <h2>3. Latent class (LC) model</h2>
        <p>
          To capture discrete heterogeneity, a two class latent class logit model is estimated. Each class <code>c</code> has its own parameter vector <code>θ<sub>c</sub></code> and class membership probability <code>π<sub>c</sub></code>. Conditional choice probabilities follow the logit form and unconditional probabilities are finite mixtures:
        </p>
        <p>
          <code>P(y<sub>nt</sub> = i) = Σ<sub>c</sub> π<sub>c</sub> · P(y<sub>nt</sub> = i | c)</code>
        </p>
        <p>
          In STEPS, class 2 represents “training supporters”. Their cost coefficient is negative and significant, which makes willingness to pay (WTP) estimates economically meaningful. The interface allows users to switch between the MXL average model and this class 2 segment.
        </p>

        <h2>4. Willingness to pay and per trainee benefit</h2>
        <p>
          For attribute <code>k</code> with coefficient <code>β<sub>k</sub></code> and cost coefficient <code>β<sub>cost</sub></code>, individual specific WTP is
        </p>
        <p>
          <code>WTP<sub>k</sub> = − β<sub>k</sub> / β<sub>cost</sub></code>.
        </p>
        <p>
          STEPS uses the mean WTP values (expressed in INR per trainee per month) from the MXL model and from class 2 of the LC model. For a configuration, WTP contributions are summed across the relevant attribute levels (for example advanced rather than frontline, high rather than low mentorship and 7 day rather than 30 day response). This gives a per trainee WTP per month, which is multiplied by programme duration to obtain a per trainee WTP for the full programme.
        </p>

        <h2>5. Uptake calculation in STEPS</h2>
        <p>
          For the interface, the complex three alternative structure (Training A, Training B, opt out) is simplified to a binary choice between a generic FETP programme and an opt out option. The ASC for Training A is not used because it captures reading order rather than policy relevant preferences. The ASC for opt out is used to anchor the likelihood of declining any programme.
        </p>
        <p>
          With programme utility <code>V<sub>prog</sub></code> and opt out utility <code>V<sub>opt</sub></code>, the uptake probability is
        </p>
        <p>
          <code>P(programme) = exp(V<sub>prog</sub>) / [exp(V<sub>prog</sub>) + exp(V<sub>opt</sub>)]</code>.
        </p>

        <h2>6. Cost and cost breakdown</h2>
        <p>
          Users choose a cost per trainee per month within the DCE range (₹75,000 to ₹400,000). For a cohort of size <em>N</em> and programme duration <em>T</em> months, direct cost is
        </p>
        <p>
          <code>DirectCost = CostPerTraineePerMonth × N × T</code>.
        </p>
        <p>
          When the opportunity cost toggle is on, an additional percentage of direct cost is added based on the ratios observed in the cost templates. This approximates the salary income that trainees could have earned in alternative employment.
        </p>
        <p>
          WHO, NIE and NCDC cost templates are used to obtain shares of spending on staff, travel, workshops, facilities and other direct costs. STEPS rescales these shares so that the breakdown matches the chosen direct cost. This lets users change cost levels while preserving realistic cost structures.
        </p>

        <h2>7. Epidemiological multipliers and macroeconomic benefits</h2>
        <p>
          Epidemiological benefits are modelled in a stylised way. Evidence from FETP evaluations and broader work on surveillance and outbreak preparedness shows that trained field epidemiologists contribute to faster detection of outbreaks, more efficient investigations and stronger routine surveillance systems. These improvements reduce the health and economic burden of infectious diseases over time.
        </p>
        <p>
          In STEPS, expected graduates per cohort are <code>P(programme) × cohort size</code>. Each graduate is assigned an approximate economic value (for example three million INR), which the user can adjust. Relative impact weights are used for frontline, intermediate and advanced programmes to reflect differences in depth of training. Aggregate benefits scale linearly with numbers of graduates and numbers of cohorts.
        </p>

        <h2>8. Benefit cost ratio and net benefit</h2>
        <p>
          Per cohort total benefit is the sum of stakeholder WTP based benefit and the epidemiological benefit. Total cost combines direct cost and, when selected, opportunity cost. The benefit cost ratio (BCR) is
        </p>
        <p>
          <code>BCR = TotalBenefit / TotalCost</code>
        </p>
        <p>
          and net benefit is <code>TotalBenefit − TotalCost</code>. National values multiply cohort level results by the number of cohorts.
        </p>

        <h2>9. Interpretation and limitations</h2>
        <p>
          Results should be interpreted as decision support, not as precise forecasts. WTP based benefits quantify how much stakeholders are willing to pay for design improvements and provide a normative measure of value. Epidemiological multipliers translate additional trained epidemiologists into approximate avoided losses using simple rules of thumb. These are deliberately conservative and can be refined in future versions when more evidence is available.
        </p>
        <p>
          STEPS keeps all calculations within the attribute and cost ranges used in the DCE, which supports internal validity. External validity depends on how closely future implementation conditions match the contexts assumed in the study.
        </p>

        <h3>Contact</h3>
        <p>
          For further details or to adapt STEPS for other settings please contact:<br />
          <strong>Mesfin Genie, PhD</strong>, Newcastle Business School, The University of Newcastle, Australia.<br />
          Email: <a href="mailto:mesfin.genie@newcastle.edu.au">mesfin.genie@newcastle.edu.au</a>
        </p>
      </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
  }

  /* Tabs */

  function setupTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    const sections = document.querySelectorAll(".tab-section");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-tab-target");
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        sections.forEach((sec) => {
          if (sec.id === targetId) {
            sec.classList.add("active");
          } else {
            sec.classList.remove("active");
          }
        });
      });
    });
  }

  /* Cost slider display */

  function syncCostSliderDisplay() {
    const slider = document.getElementById("costSlider");
    const label = document.getElementById("costSliderValue");
    if (!slider || !label) return;
    const val = Number(slider.value);
    label.textContent = formatCurrencyINR(val);
  }

  /* Toggle behaviour */

  function setupToggle() {
    const toggle = document.getElementById("oppCostToggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("active");
      const pressed = toggle.classList.contains("active");
      toggle.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
  }

  /* Event bindings */

  function setupEventHandlers() {
    const applyBtn = document.getElementById("applyConfigBtn");
    const saveBtn = document.getElementById("saveScenarioBtn");
    const fullResultsBtn = document.getElementById("openFullResultsBtn");
    const pdfBtn = document.getElementById("downloadPdfBtn");
    const excelBtn = document.getElementById("downloadExcelBtn");
    const modalCloseBtn = document.getElementById(
      "closeResultsModalBtn"
    );
    const modalCloseBtn2 = document.getElementById("modalCloseBtn");
    const modalPdfBtn = document.getElementById("modalDownloadPdfBtn");
    const compareBtn = document.getElementById("compareScenariosBtn");
    const clearBtn = document.getElementById("clearScenariosBtn");
    const openTech1 = document.getElementById("openTechnicalBtn");
    const openTech2 = document.getElementById("openTechnicalBtn2");
    const currencySel = document.getElementById("currencySelect");
    const costSlider = document.getElementById("costSlider");

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        readConfigFromInputs();
        state.results = computeResults(state.config);
        updateResultsView();
        openResultsModal();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        readConfigFromInputs();
        state.results = computeResults(state.config);
        updateResultsView();
        saveScenario();
      });
    }

    if (fullResultsBtn) {
      fullResultsBtn.addEventListener("click", () => {
        if (!state.results) {
          readConfigFromInputs();
          state.results = computeResults(state.config);
          updateResultsView();
        }
        openResultsModal();
      });
    }

    if (pdfBtn) {
      pdfBtn.addEventListener("click", () => {
        if (!state.results) return;
        downloadPolicyBriefPdf();
      });
    }

    if (excelBtn) {
      excelBtn.addEventListener("click", () => {
        if (!state.results) return;
        downloadExcelSummary();
      });
    }

    if (modalPdfBtn) {
      modalPdfBtn.addEventListener("click", () => {
        if (!state.results) return;
        downloadPolicyBriefPdf();
      });
    }

    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", closeResultsModal);
    }
    if (modalCloseBtn2) {
      modalCloseBtn2.addEventListener("click", closeResultsModal);
    }

    if (compareBtn) {
      compareBtn.addEventListener("click", compareSelectedScenarios);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", clearAllScenarios);
    }

    if (openTech1) {
      openTech1.addEventListener("click", openTechnicalAppendixWindow);
    }
    if (openTech2) {
      openTech2.addEventListener("click", openTechnicalAppendixWindow);
    }

    if (currencySel) {
      currencySel.addEventListener("change", () => {
        readConfigFromInputs();
        if (state.results) {
          updateResultsView();
        }
      });
    }

    if (costSlider) {
      costSlider.addEventListener("input", () => {
        syncCostSliderDisplay();
      });
    }
  }

  /* Init */

  function init() {
    setupTabs();
    setupToggle();
    syncCostSliderDisplay();
    loadSavedScenarios();
    renderSavedScenariosTable();
    setupEventHandlers();

    // Initialise with default config and results
    readConfigFromInputs();
    state.results = computeResults(state.config);
    updateResultsView();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
