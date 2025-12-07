/* ===================================================
   STEPS FETP India Decision Aid – script.js
   Premium version with DCE benefits, sensitivity,
   national-scale costing and soft Copilot helper
   =================================================== */

(() => {
  "use strict";

  /* ===========================
     Global model coefficients
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
      high: 0.640
    },
    delivery: {
      blended: 0.0,
      inperson: -0.232,
      online: -1.073
    },
    response: {
      30: 0.0,
      15: 0.546,
      7: 0.610
    },
    // Cost in thousands of rupees (₹1,000) per participant
    costPerThousand: -0.005
  };

  // Alternate (more conservative) model – currently mirroring MXL.
  // You can replace these with latent class estimates if needed.
  const ALT_COEFS = {
    ascProgram: 0.168,
    ascOptOut: -0.601,
    tier: { ...MXL_COEFS.tier },
    career: { ...MXL_COEFS.career },
    mentorship: { ...MXL_COEFS.mentorship },
    delivery: { ...MXL_COEFS.delivery },
    response: { ...MXL_COEFS.response },
    costPerThousand: MXL_COEFS.costPerThousand
  };

  /* ===========================
     DCE scenario definitions
     =========================== */

  // Nine stylised programme scenarios for DCE-based WTP and sensitivity.
  // These are defined in terms of FETP attributes and an internal DCE cost level.
  const DCE_SCENARIOS = [
    {
      id: "S1",
      label: "Scenario 1 – Baseline mixed-tier package",
      tier: "frontline",
      career: "certificate",
      mentorship: "low",
      delivery: "blended",
      response: 30,
      dceCost: 6,          // cost attribute in thousands of ₹
      costMultiplier: 1.0  // used for implementation costing
    },
    {
      id: "S2",
      label: "Scenario 2 – Certificate with stronger mentoring",
      tier: "frontline",
      career: "certificate",
      mentorship: "medium",
      delivery: "blended",
      response: 30,
      dceCost: 7,
      costMultiplier: 1.05
    },
    {
      id: "S3",
      label: "Scenario 3 – Certificate with rapid response",
      tier: "frontline",
      career: "certificate",
      mentorship: "medium",
      delivery: "blended",
      response: 15,
      dceCost: 7.5,
      costMultiplier: 1.08
    },
    {
      id: "S4",
      label: "Scenario 4 – University qualification, blended delivery",
      tier: "intermediate",
      career: "uniqual",
      mentorship: "medium",
      delivery: "blended",
      response: 15,
      dceCost: 8,
      costMultiplier: 1.15
    },
    {
      id: "S5",
      label: "Scenario 5 – University qualification, high mentoring",
      tier: "intermediate",
      career: "uniqual",
      mentorship: "high",
      delivery: "blended",
      response: 15,
      dceCost: 9,
      costMultiplier: 1.2
    },
    {
      id: "S6",
      label: "Scenario 6 – Career pathway, high mentoring",
      tier: "advanced",
      career: "career_path",
      mentorship: "high",
      delivery: "blended",
      response: 15,
      dceCost: 10,
      costMultiplier: 1.25
    },
    {
      id: "S7",
      label: "Scenario 7 – Career pathway with rapid response",
      tier: "advanced",
      career: "career_path",
      mentorship: "high",
      delivery: "blended",
      response: 7,
      dceCost: 10.5,
      costMultiplier: 1.3
    },
    {
      id: "S8",
      label: "Scenario 8 – Online-heavy advanced package",
      tier: "advanced",
      career: "career_path",
      mentorship: "medium",
      delivery: "online",
      response: 7,
      dceCost: 8.5,
      costMultiplier: 1.15
    },
    {
      id: "S9",
      label: "Scenario 9 – In-person advanced package",
      tier: "advanced",
      career: "career_path",
      mentorship: "high",
      delivery: "inperson",
      response: 7,
      dceCost: 11,
      costMultiplier: 1.35
    }
  ];

  /* ===========================
     Global state
     =========================== */

  const state = {
    model: "mxl",              // "mxl" or "alt"
    includeOppCost: true,
    charts: {
      uptake: null,
      bcr: null
    },
    savedScenarios: [],
    lastResults: null,
    assumptionLog: []
  };

  /* ===========================
     Utility helpers
     =========================== */

  function safeNumber(val, fallback = 0) {
    const num = typeof val === "number" ? val : parseFloat(val);
    return Number.isFinite(num) ? num : fallback;
  }

  function getNumberInput(id, fallback = 0) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    return safeNumber(el.value, fallback);
  }

  function getTextInput(id, fallback = "") {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const v = String(el.value || "").trim();
    return v || fallback;
  }

  function getSelectValue(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const v = el.value;
    return v === "" || v == null ? fallback : v;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = text;
    }
  }

  function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = html;
    }
  }

  function formatPercent(x, digits = 1) {
    const num = safeNumber(x, 0);
    return `${num.toFixed(digits)}%`;
  }

  function formatMillionsINR(x, digits = 2) {
    const num = safeNumber(x, 0);
    return num.toFixed(digits);
  }

  function formatINR(x, digits = 0) {
    const num = safeNumber(x, 0);
    return num.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    });
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(showToast._timeout);
    showToast._timeout = setTimeout(() => {
      toast.classList.add("hidden");
    }, 3500);
  }

  /* ===========================
     Configuration and inputs
     =========================== */

  function getCurrentConfig() {
    const cfg = {
      scenarioName: getTextInput("scenarioName", "Current configuration"),
      scenarioNotes: getTextInput("scenarioNotes", ""),
      tier: getSelectValue("inputTier", "frontline"),
      career: getSelectValue("inputCareer", "certificate"),
      mentorship: getSelectValue("inputMentorship", "low"),
      delivery: getSelectValue("inputDelivery", "blended"),
      responseDays: safeNumber(getSelectValue("inputResponseTime", "30"), 30),
      cohortsFrontline: getNumberInput("inputCohortsFrontline", 10),
      cohortsIntermediate: getNumberInput("inputCohortsIntermediate", 5),
      cohortsAdvanced: getNumberInput("inputCohortsAdvanced", 3),
      participantsPerCohort: getNumberInput("inputParticipantsPerCohort", 20),
      directCostPerParticipant: getNumberInput("inputCostDirect", 20000), // ₹ per participant
      oppCostPerParticipant: getNumberInput("inputCostOpp", 0)
    };
    cfg.includeOppCost = state.includeOppCost;
    return cfg;
  }

  function computeParticipantsAll(cfg) {
    const totalCohorts =
      safeNumber(cfg.cohortsFrontline) +
      safeNumber(cfg.cohortsIntermediate) +
      safeNumber(cfg.cohortsAdvanced);
    const participantsPerCohort = safeNumber(cfg.participantsPerCohort, 0);
    const totalParticipants = totalCohorts * participantsPerCohort;
    return {
      totalCohorts,
      participantsPerCohort,
      totalParticipants
    };
  }

  /* ===========================
     DCE computations
     =========================== */

  function computeNonCostUtility(attrs, coefs) {
    return (
      coefs.ascProgram +
      (coefs.tier[attrs.tier] || 0) +
      (coefs.career[attrs.career] || 0) +
      (coefs.mentorship[attrs.mentorship] || 0) +
      (coefs.delivery[attrs.delivery] || 0) +
      (coefs.response[String(attrs.response)] || 0)
    );
  }

  function getScenarioAttrsFromConfig(cfg, def) {
    return {
      tier: def.tier || cfg.tier,
      career: def.career || cfg.career,
      mentorship: def.mentorship || cfg.mentorship,
      delivery: def.delivery || cfg.delivery,
      response: def.response || cfg.responseDays,
      dceCost: def.dceCost != null ? def.dceCost : 6
    };
  }

  function computeScenarioCost(cfg, scenarioDef, participantsAll) {
    const costMultiplier =
      typeof scenarioDef.costMultiplier === "number"
        ? scenarioDef.costMultiplier
        : 1;

    const directPP =
      safeNumber(cfg.directCostPerParticipant, 0) * costMultiplier;
    const oppPP = safeNumber(cfg.oppCostPerParticipant, 0) * costMultiplier;

    const financialTotal = directPP * participantsAll;
    const economicTotal =
      financialTotal +
      (cfg.includeOppCost ? oppPP * participantsAll : 0);

    return {
      directPP,
      oppPP,
      financialTotal,
      economicTotal
    };
  }

  function buildDceRows(cfg, coefs, participantsSummary) {
    const participantsAll = Math.max(
      1,
      safeNumber(participantsSummary.totalParticipants, 1)
    );

    const baseDef = DCE_SCENARIOS[0];
    const baseAttrs = getScenarioAttrsFromConfig(cfg, baseDef);
    const baseNonCost = computeNonCostUtility(baseAttrs, coefs);

    const rows = [];

    DCE_SCENARIOS.forEach((def) => {
      const attrs = getScenarioAttrsFromConfig(cfg, def);
      const nonCost = computeNonCostUtility(attrs, coefs);

      const vProgram =
        nonCost + coefs.costPerThousand * safeNumber(attrs.dceCost, 6);
      const vOptOut = coefs.ascOptOut;
      const expProg = Math.exp(vProgram);
      const expOpt = Math.exp(vOptOut);
      const pProgram = expProg / (expProg + expOpt);
      const uptakePercent = pProgram * 100;

      const deltaNonCost = nonCost - baseNonCost;
      const betaCost = coefs.costPerThousand;
      const wtpThousand =
        betaCost !== 0 ? deltaNonCost / -betaCost : 0;
      const wtpRupees = Math.max(0, wtpThousand * 1000);

      const cost = computeScenarioCost(cfg, def, participantsAll);
      const benefitTotal = wtpRupees * participantsAll;

      const benefitMillions = benefitTotal / 1e6;
      const financialMillions = cost.financialTotal / 1e6;
      const economicMillions = cost.economicTotal / 1e6;
      const netBenefitMillions = benefitMillions - economicMillions;
      const bcr =
        economicMillions > 0 ? benefitMillions / economicMillions : 0;

      rows.push({
        id: def.id,
        label: def.label,
        attrs,
        uptake: pProgram,
        uptakePercent,
        wtpPerParticipant: wtpRupees,
        financialCostMillions: financialMillions,
        economicCostMillions: economicMillions,
        benefitMillions,
        netBenefitMillions,
        bcr
      });
    });

    return rows;
  }

  /* ===========================
     Rendering – DCE benefits
     =========================== */

  function renderDceBenefitsTable(rows) {
    const table = document.getElementById("dce-benefits-table");
    if (!table) return;

    table.innerHTML = "";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = [
      "Scenario",
      "Endorsement (%)",
      "WTP per participant (₹)",
      "Total financial cost, all cohorts (million ₹)",
      "Total economic cost, all cohorts (million ₹)",
      "DCE-based benefit, all cohorts (million ₹)",
      "Net benefit, all cohorts (million ₹)",
      "Benefit cost ratio"
    ];

    headers.forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const maxBcr = rows.reduce(
      (m, r) => (r.bcr > m ? r.bcr : m),
      0
    );

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      if (row.bcr === maxBcr && row.bcr > 0) {
        tr.style.fontWeight = "600";
      }

      const cells = [
        `${row.id}: ${row.label}`,
        row.uptakePercent.toFixed(1),
        row.wtpPerParticipant.toFixed(0),
        formatMillionsINR(row.financialCostMillions),
        formatMillionsINR(row.economicCostMillions),
        formatMillionsINR(row.benefitMillions),
        formatMillionsINR(row.netBenefitMillions),
        row.bcr.toFixed(2)
      ];

      cells.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
  }

  /* ===========================
     Rendering – sensitivity table
     =========================== */

  function renderSensitivityTable(rows) {
    const table = document.getElementById("sensitivity-table");
    if (!table) return;

    table.innerHTML = "";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = [
      "Scenario",
      "Base benefit cost ratio",
      "Cost x0.75 – BCR",
      "Cost x1.00 – BCR",
      "Cost x1.25 – BCR"
    ];

    headers.forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      const econBase = row.economicCostMillions;
      const benefit = row.benefitMillions;

      const econ075 = econBase * 0.75;
      const econ100 = econBase;
      const econ125 = econBase * 1.25;

      const bcr075 =
        econ075 > 0 ? benefit / econ075 : 0;
      const bcr100 =
        econ100 > 0 ? benefit / econ100 : 0;
      const bcr125 =
        econ125 > 0 ? benefit / econ125 : 0;

      const cells = [
        `${row.id}: ${row.label}`,
        row.bcr.toFixed(2),
        bcr075.toFixed(2),
        bcr100.toFixed(2),
        bcr125.toFixed(2)
      ];

      cells.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
  }

  /* ===========================
     Summary cards and status
     =========================== */

  function updateSummaryCards(cfg, rows, participantsSummary) {
    if (!rows || rows.length === 0) return;

    // Use Scenario 1 as the headline configuration
    const main = rows[0];

    const totalCohorts = participantsSummary.totalCohorts;
    const totalParticipants = participantsSummary.totalParticipants;

    const endorsement = main.uptakePercent;
    const bcr = main.bcr;
    const econCostM = main.economicCostMillions;
    const benefitM = main.benefitMillions;
    const netM = main.netBenefitMillions;

    const summaryText = [
      `The current configuration is labelled “${cfg.scenarioName}”. It trains approximately ${totalParticipants.toLocaleString(
        "en-IN"
      )} participants across ${totalCohorts} cohorts, with ${cfg.participantsPerCohort.toLocaleString(
        "en-IN"
      )} participants per cohort.`,
      `Based on the discrete choice experiment, around ${endorsement.toFixed(
        0
      )} percent of eligible officers are expected to endorse and choose this package when it is offered.`,
      `Implementing this scenario is expected to cost about ${formatMillionsINR(
        econCostM
      )} million rupees in total economic terms, including opportunity cost if this is switched on. The DCE-based willingness to pay for the package is roughly ${formatMillionsINR(
        benefitM
      )} million rupees across all cohorts, giving a net benefit of around ${formatMillionsINR(
        netM
      )} million rupees and a benefit cost ratio close to ${bcr.toFixed(
        2
      )}.`
    ].join(" ");

    setText("configSummaryText", summaryText);

    setText(
      "headlineEndorsement",
      `${endorsement.toFixed(1)}%`
    );
    setText(
      "headlineBcr",
      bcr > 0 ? bcr.toFixed(2) : "0.00"
    );
    setText(
      "headlineCostEconomic",
      `${formatMillionsINR(econCostM)} million ₹`
    );
    setText(
      "headlineNetBenefit",
      `${formatMillionsINR(netM)} million ₹`
    );

    let statusClass = "status-neutral";
    let statusLabel = "Neutral configuration";
    let statusText =
      "This configuration has moderate endorsement and a benefit cost ratio close to one.";

    if (bcr >= 1.2 && endorsement >= 60) {
      statusClass = "status-good";
      statusLabel = "Attractive configuration";
      statusText =
        "This configuration combines strong programme endorsement with a benefit cost ratio clearly above one. It is attractive from both an uptake and net benefit perspective.";
    } else if (bcr >= 0.9 && bcr < 1.2) {
      statusClass = "status-watch";
      statusLabel = "Borderline configuration";
      statusText =
        "This configuration is close to break-even in benefit cost terms. It may still be acceptable where strategic or equity goals justify investment, but further refinement of mentoring, delivery mode or career recognition could improve value.";
    } else if (bcr < 0.9 || endorsement < 40) {
      statusClass = "status-poor";
      statusLabel = "Weak configuration";
      statusText =
        "This configuration either has low expected endorsement or a benefit cost ratio well below one. It is unlikely to be a good candidate for large scale roll-out without substantial redesign.";
    }

    const pill = document.getElementById("headlineStatusPill");
    if (pill) {
      pill.className = `status-pill ${statusClass}`;
      pill.textContent = statusLabel;
    }
    setText("headlineStatusText", statusText);

    const briefing = [
      "You can adjust the training tier, mentoring level, delivery mode, response time and programme costs on the configuration tab. The summary above will update instantly so that you can see how endorsement, total economic costs and DCE-based benefits move as you refine the package.",
      "For national scale discussions, the DCE benefits tab and sensitivity table provide a structured view of how different configurations perform when costs move up or down by plus or minus twenty five percent."
    ].join(" ");

    setText("headlineBriefingText", briefing);
  }

  /* ===========================
     Charts
     =========================== */

  function createOrUpdateChart(key, canvasId, label, labels, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;

    const ctx = canvas.getContext("2d");

    if (state.charts[key]) {
      state.charts[key].destroy();
    }

    state.charts[key] = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label,
            data
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  function updateCharts(rows) {
    if (!rows || rows.length === 0) return;

    const labels = rows.map((r) => r.id);
    const uptakeValues = rows.map((r) => r.uptakePercent);
    const bcrValues = rows.map((r) => r.bcr);

    createOrUpdateChart(
      "uptake",
      "chartUptake",
      "Programme endorsement",
      labels,
      uptakeValues
    );

    createOrUpdateChart(
      "bcr",
      "chartBcr",
      "Benefit cost ratio",
      labels,
      bcrValues
    );
  }

  /* ===========================
     Assumption log
     =========================== */

  function logAssumptions(cfg, participantsSummary, rows) {
    const main = rows && rows.length > 0 ? rows[0] : null;
    if (!main) return;

    const line = [
      `Scenario “${cfg.scenarioName}” with ${cfg.tier} tier, ${cfg.mentorship} mentoring, ${cfg.delivery} delivery and a ${cfg.responseDays} day expected response time.`,
      `Covers ${participantsSummary.totalCohorts} cohorts and approximately ${participantsSummary.totalParticipants.toLocaleString(
        "en-IN"
      )} participants.`,
      `Economic cost is about ${formatMillionsINR(
        main.economicCostMillions
      )} million rupees, with DCE-based benefits of roughly ${formatMillionsINR(
        main.benefitMillions
      )} million rupees and a benefit cost ratio near ${main.bcr.toFixed(
        2
      )}.`
    ].join(" ");

    state.assumptionLog.push(
      `${new Date().toISOString()}: ${line}`
    );
    if (state.assumptionLog.length > 30) {
      state.assumptionLog.shift();
    }

    const logEl = document.getElementById("assumptionLogText");
    if (logEl) {
      logEl.textContent = state.assumptionLog.join("\n\n");
    }
  }

  /* ===========================
     Copilot helper
     =========================== */

  function buildCopilotPayload() {
    if (!state.lastResults) return null;

    const { config, participantsSummary, dceRows } =
      state.lastResults;

    const payload = {
      toolName: "STEPS FETP India Decision Aid",
      context: {
        country: "India",
        programmeType:
          "Field Epidemiology Training Programme (FETP)",
        developedBy:
          "Newcastle Business School with World Bank and partners"
      },
      configuration: {
        scenarioName: config.scenarioName,
        tier: config.tier,
        careerRecognition: config.career,
        mentoringLevel: config.mentorship,
        deliveryMode: config.delivery,
        responseDays: config.responseDays,
        cohortsFrontline: config.cohortsFrontline,
        cohortsIntermediate: config.cohortsIntermediate,
        cohortsAdvanced: config.cohortsAdvanced,
        participantsPerCohort: config.participantsPerCohort,
        directCostPerParticipant:
          config.directCostPerParticipant,
        opportunityCostPerParticipant:
          config.oppCostPerParticipant,
        includeOpportunityCost: config.includeOppCost
      },
      scaleUp: {
        totalCohorts: participantsSummary.totalCohorts,
        totalParticipants:
          participantsSummary.totalParticipants
      },
      dceBenefits: dceRows.map((r) => ({
        id: r.id,
        label: r.label,
        endorsementPercent: r.uptakePercent,
        wtpPerParticipantINR: r.wtpPerParticipant,
        financialCostMillionINR: r.financialCostMillions,
        economicCostMillionINR: r.economicCostMillions,
        benefitMillionINR: r.benefitMillions,
        netBenefitMillionINR: r.netBenefitMillions,
        benefitCostRatio: r.bcr
      })),
      assumptionLog: state.assumptionLog
    };

    return payload;
  }

  function updateCopilotText() {
    const el = document.getElementById("copilot-prepared-text");
    if (!el) return;

    const payload = buildCopilotPayload();
    if (!payload) {
      el.textContent =
        "Run an analysis in the STEPS tool first. Once results are available, this tab will prepare a full prompt and JSON block that you can copy into Copilot for policy interpretation.";
      return;
    }

    const json = JSON.stringify(payload, null, 2);

    const text = [
      "You are helping interpret outputs from the “STEPS FETP India Decision Aid” developed at Newcastle Business School in collaboration with the World Bank and partners in India.",
      "",
      "The tool combines discrete choice experiment results on FETP programme preferences with scale up costs and DCE-based willingness to pay. The JSON below describes one configuration that has just been analysed inside the STEPS tool.",
      "",
      "Please treat this JSON as the single source of truth for the scenario. Use it to prepare a concise and policy facing briefing note for senior decision makers in the Ministry of Health, Ministry of Finance and development partners.",
      "",
      "Your tasks are:",
      "1. Summarise the scenario and configuration in clear language, including the training tier, mentoring and delivery model, response time and scale of roll out.",
      "2. Report endorsement, willingness to pay, total financial and economic costs, DCE-based benefits, net benefits and benefit cost ratios for each of the nine scenarios.",
      "3. Highlight which scenario or scenarios look most attractive in terms of both endorsement and benefit cost ratio, and explain the trade offs clearly.",
      "4. Comment on whether the headline configuration looks suitable for scale up, where the main risks sit, and which parameters (such as mentoring level, delivery mode or number of cohorts) would be most important to adjust in a sensitivity analysis.",
      "5. Suggest two or three practical talking points that a World Bank or government team could use in a meeting with senior officials when presenting these results.",
      "",
      "Here is the JSON export from the STEPS tool:",
      "",
      json
    ].join("\n");

    el.textContent = text;
  }

  async function handleCopilotCopy() {
    const el = document.getElementById("copilot-prepared-text");
    if (!el) return;
    const text = el.textContent || "";
    if (!text.trim()) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showToast(
        "Text copied. Open Copilot in a new tab and paste it into the prompt box."
      );
    } catch (err) {
      showToast(
        "Copy did not work automatically. Select and copy the text manually if needed."
      );
    }
  }

  /* ===========================
     Export – Excel and PDF
     =========================== */

  function buildExportRows(lastResults) {
    const rows = [];
    rows.push([
      "Scenario",
      "Label",
      "Endorsement (%)",
      "WTP per participant (₹)",
      "Financial cost, all cohorts (million ₹)",
      "Economic cost, all cohorts (million ₹)",
      "DCE benefit, all cohorts (million ₹)",
      "Net benefit, all cohorts (million ₹)",
      "Benefit cost ratio"
    ]);

    lastResults.dceRows.forEach((r) => {
      rows.push([
        r.id,
        r.label,
        r.uptakePercent.toFixed(1),
        r.wtpPerParticipant.toFixed(0),
        r.financialCostMillions.toFixed(2),
        r.economicCostMillions.toFixed(2),
        r.benefitMillions.toFixed(2),
        r.netBenefitMillions.toFixed(2),
        r.bcr.toFixed(2)
      ]);
    });

    return rows;
  }

  function handleExportExcel() {
    if (!window.XLSX || !state.lastResults) {
      showToast("Nothing to export yet.");
      return;
    }
    const wb = XLSX.utils.book_new();
    const rows = buildExportRows(state.lastResults);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "DCE benefits");
    XLSX.writeFile(wb, "steps_dce_benefits.xlsx");
  }

  function handleExportPdf() {
    if (!window.jspdf || !state.lastResults) {
      showToast("Nothing to export yet.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(12);
    doc.text(
      "STEPS FETP India Decision Aid – DCE-based benefits and scale up summary",
      10,
      12
    );

    doc.setFontSize(9);

    let y = 20;
    state.lastResults.dceRows.forEach((r) => {
      const line = [
        `${r.id}: ${r.label}`,
        `Endorsement ${r.uptakePercent.toFixed(1)}%`,
        `WTP/participant ${r.wtpPerParticipant.toFixed(0)} ₹`,
        `Economic cost ${r.economicCostMillions.toFixed(
          2
        )} million ₹`,
        `Benefit ${r.benefitMillions.toFixed(2)} million ₹`,
        `Net benefit ${r.netBenefitMillions.toFixed(
          2
        )} million ₹`,
        `BCR ${r.bcr.toFixed(2)}`
      ].join(" | ");

      doc.text(line, 10, y);
      y += 6;
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("steps_dce_benefits.pdf");
  }

  /* ===========================
     Scenario saving
     =========================== */

  function handleSaveScenario() {
    if (!state.lastResults) {
      showToast("Run an analysis before saving a scenario.");
      return;
    }
    const snapshot = JSON.parse(JSON.stringify(state.lastResults));
    snapshot.savedAt = new Date().toISOString();
    state.savedScenarios.push(snapshot);
    showToast("Scenario saved for later comparison.");
  }

  /* ===========================
     Tabs
     =========================== */

  function initTabs() {
    const tabs = document.querySelectorAll(".tab-link");
    const panels = document.querySelectorAll(".tab-panel");
    if (!tabs.length) return;

    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.tab;
        tabs.forEach((b) =>
          b.classList.toggle("active", b === btn)
        );
        panels.forEach((panel) => {
          const panelTab = panel.dataset.tab || panel.id;
          const match =
            panelTab === target ||
            panel.id === `tab-${target}`;
          panel.classList.toggle("active", match);
        });
      });
    });
  }

  /* ===========================
     Event bindings
     =========================== */

  function initConfigControls() {
    // Opportunity cost toggle pill
    const toggleOpp = document.getElementById("toggleOppCost");
    if (toggleOpp) {
      toggleOpp.addEventListener("click", () => {
        state.includeOppCost = !state.includeOppCost;
        toggleOpp.classList.toggle("on", state.includeOppCost);
        const input = document.getElementById("includeOppCost");
        if (input) {
          input.checked = state.includeOppCost;
        }
        runAnalysis();
      });
    }

    const includeOppInput = document.getElementById(
      "includeOppCost"
    );
    if (includeOppInput) {
      state.includeOppCost = !!includeOppInput.checked;
      includeOppInput.addEventListener("change", () => {
        state.includeOppCost = !!includeOppInput.checked;
        if (toggleOpp) {
          toggleOpp.classList.toggle(
            "on",
            state.includeOppCost
          );
        }
        runAnalysis();
      });
    }

    const idsToWatch = [
      "scenarioName",
      "scenarioNotes",
      "inputTier",
      "inputCareer",
      "inputMentorship",
      "inputDelivery",
      "inputResponseTime",
      "inputCohortsFrontline",
      "inputCohortsIntermediate",
      "inputCohortsAdvanced",
      "inputParticipantsPerCohort",
      "inputCostDirect",
      "inputCostOpp"
    ];

    idsToWatch.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", runAnalysis);
      }
    });

    const btnApply = document.getElementById("btnApplyConfig");
    if (btnApply) {
      btnApply.addEventListener("click", (e) => {
        e.preventDefault();
        runAnalysis();
      });
    }

    const btnSave = document.getElementById("btnSaveScenario");
    if (btnSave) {
      btnSave.addEventListener("click", (e) => {
        e.preventDefault();
        handleSaveScenario();
      });
    }

    const btnExcel = document.getElementById("btnExportExcel");
    if (btnExcel) {
      btnExcel.addEventListener("click", (e) => {
        e.preventDefault();
        handleExportExcel();
      });
    }

    const btnPdf = document.getElementById("btnExportPdf");
    if (btnPdf) {
      btnPdf.addEventListener("click", (e) => {
        e.preventDefault();
        handleExportPdf();
      });
    }

    const btnCopilotCopy = document.getElementById(
      "btnCopilotCopy"
    );
    if (btnCopilotCopy) {
      btnCopilotCopy.addEventListener("click", (e) => {
        e.preventDefault();
        handleCopilotCopy();
      });
    }
  }

  /* ===========================
     Main analysis driver
     =========================== */

  function runAnalysis() {
    const cfg = getCurrentConfig();
    const participantsSummary = computeParticipantsAll(cfg);
    const coefs = state.model === "alt" ? ALT_COEFS : MXL_COEFS;

    const dceRows = buildDceRows(
      cfg,
      coefs,
      participantsSummary
    );

    state.lastResults = {
      config: cfg,
      participantsSummary,
      dceRows
    };

    updateSummaryCards(cfg, dceRows, participantsSummary);
    renderDceBenefitsTable(dceRows);
    renderSensitivityTable(dceRows);
    updateCharts(dceRows);
    logAssumptions(cfg, participantsSummary, dceRows);
    updateCopilotText();
  }

  /* ===========================
     Initialise
     =========================== */

  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initConfigControls();
    runAnalysis();
  });
})();
