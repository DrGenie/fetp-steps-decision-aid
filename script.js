/* ===================================================
   STEPS FETP India Decision Aid
   Next generation script with working tooltips,
   sensitivity / DCE benefits, Copilot integration
   and exports
   =================================================== */

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
  costPerThousand: -0.005
};

/* ===========================
   Embedded training video
   =========================== */

const STEPS_VIDEO_EMBED_URL =
  "https://uonstaff-my.sharepoint.com/personal/mg844_newcastle_edu_au/_layouts/15/embed.aspx?UniqueId=df59fa1b-0cd5-47fa-b743-cdd486b3b82c&embed=%7B%22ust%22%3Atrue%2C%22hv%22%3A%22CopyEmbedCode%22%7D&referrer=StreamWebApp&referrerScenario=EmbedDialog.Create";

/* ===========================
   Cost templates (combined)
   =========================== */

const COST_TEMPLATES = {
  frontline: {
    combined: {
      id: "frontline_combined",
      label: "Frontline combined template (all institutions)",
      description:
        "Combined frontline cost structure across all institutions using harmonised components and indirect costs including opportunity cost.",
      oppRate: 1.09,
      components: [
        {
          id: "staff_core",
          label: "In country programme staff salaries and benefits",
          directShare: 0.214
        },
        {
          id: "office_equipment",
          label: "Office equipment for staff and faculty",
          directShare: 0.004
        },
        {
          id: "office_software",
          label: "Office software for staff and faculty",
          directShare: 0.0004
        },
        {
          id: "rent_utilities",
          label: "Rent and utilities for staff and faculty",
          directShare: 0.024
        },
        {
          id: "training_materials",
          label: "Training materials and printing",
          directShare: 0.0006
        },
        {
          id: "workshops",
          label: "Workshops and seminars",
          directShare: 0.107
        },
        {
          id: "travel_in_country",
          label: "In country travel for faculty, mentors and trainees",
          directShare: 0.65
        }
      ]
    }
  },
  intermediate: {
    combined: {
      id: "intermediate_combined",
      label: "Intermediate combined template (all institutions)",
      description:
        "Combined intermediate cost structure across all institutions using harmonised components and indirect costs including opportunity cost.",
      oppRate: 0.35,
      components: [
        {
          id: "staff_core",
          label: "In country programme staff salaries and benefits",
          directShare: 0.0924
        },
        {
          id: "staff_other",
          label: "Other salaries and benefits for consultants and advisors",
          directShare: 0.0004
        },
        {
          id: "office_equipment",
          label: "Office equipment for staff and faculty",
          directShare: 0.0064
        },
        {
          id: "office_software",
          label: "Office software for staff and faculty",
          directShare: 0.027
        },
        {
          id: "rent_utilities",
          label: "Rent and utilities for staff and faculty",
          directShare: 0.0171
        },
        {
          id: "training_materials",
          label: "Training materials and printing",
          directShare: 0.0005
        },
        {
          id: "workshops",
          label: "Workshops and seminars",
          directShare: 0.0258
        },
        {
          id: "travel_in_country",
          label: "In country travel for faculty, mentors and trainees",
          directShare: 0.57
        },
        {
          id: "travel_international",
          label: "International travel for faculty, mentors and trainees",
          directShare: 0.1299
        },
        {
          id: "other_direct",
          label: "Other direct programme expenses",
          directShare: 0.1302
        }
      ]
    }
  },
  advanced: {
    combined: {
      id: "advanced_combined",
      label: "Advanced combined template (all institutions)",
      description:
        "Combined advanced cost structure across all institutions using harmonised components and indirect costs including opportunity cost.",
      oppRate: 0.30,
      components: [
        {
          id: "staff_core",
          label: "In country programme staff salaries and benefits",
          directShare: 0.165
        },
        {
          id: "office_equipment",
          label: "Office equipment for staff and faculty",
          directShare: 0.0139
        },
        {
          id: "office_software",
          label: "Office software for staff and faculty",
          directShare: 0.0184
        },
        {
          id: "rent_utilities",
          label: "Rent and utilities for staff and faculty",
          directShare: 0.0255
        },
        {
          id: "trainee_allowances",
          label: "Trainee allowances and scholarships",
          directShare: 0.0865
        },
        {
          id: "trainee_equipment",
          label: "Trainee equipment such as laptops and internet",
          directShare: 0.0035
        },
        {
          id: "trainee_software",
          label: "Trainee software licences",
          directShare: 0.0017
        },
        {
          id: "training_materials",
          label: "Training materials and printing",
          directShare: 0.0024
        },
        {
          id: "workshops",
          label: "Workshops and seminars",
          directShare: 0.0188
        },
        {
          id: "travel_in_country",
          label: "In country travel for faculty, mentors and trainees",
          directShare: 0.372
        },
        {
          id: "travel_international",
          label: "International travel for faculty, mentors and trainees",
          directShare: 0.288
        },
        {
          id: "other_direct",
          label: "Other direct programme expenses",
          directShare: 0.0043
        }
      ]
    }
  }
};

let COST_CONFIG = null;

/* ===========================
   Epidemiological settings
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
      valuePerGraduate: 500000,
      valuePerOutbreak: 30000000
    },
    intermediate: {
      completionRate: 0.9,
      outbreaksPerGraduatePerYear: 0.5,
      valuePerGraduate: 500000,
      valuePerOutbreak: 30000000
    },
    advanced: {
      completionRate: 0.9,
      outbreaksPerGraduatePerYear: 0.5,
      valuePerGraduate: 500000,
      valuePerOutbreak: 30000000
    }
  }
};

/* Response time multipliers for outbreak benefits */

const RESPONSE_TIME_MULTIPLIERS = {
  "30": 1.0,
  "15": 1.2,
  "7": 1.5
};

/* Tier duration in months */

const TIER_MONTHS = {
  frontline: 3,
  intermediate: 12,
  advanced: 24
};

/* ===========================
   Copilot interpretation prompt
   =========================== */

const COPILOT_INTERPRETATION_PROMPT = `
You are a senior health economist advising the Ministry of Health and Family Welfare in India, together with World Bank counterparts, on the national scale up of Field Epidemiology Training Programmes. You have received structured outputs from the STEPS FETP India Decision Aid. These outputs summarise one specific scenario, including programme tier, career pathway, mentorship intensity, delivery mode, outbreak response time, cohort structure, costs, epidemiological benefits, willingness to pay and benefit cost ratios.

Use the STEPS scenario JSON that follows as your only quantitative evidence base. Treat all values in the JSON as internally consistent and focus on explaining what they imply for policy. Work in Indian Rupees as the main currency. Where figures are large, you may also express them in millions of rupees for clarity.

Prepare a narrative policy brief of approximately three to five A4 pages. Write in clear paragraphs and organise the report into labelled sections written in prose, not in bullet points. Aim for sections with titles such as Background, Scenario description, Preference evidence and endorsement, Economic costs, Epidemiological effects, Benefit cost results, Distributional and implementation considerations, and Recommendations. Within each section, write connected paragraphs. Do not present any content as bulleted or numbered lists.

In the Background section, set out the role of FETP in India, the general purpose of the STEPS decision aid and why a structured view of costs, epidemiological benefits and willingness to pay is useful for ministries of health and finance. Keep this section concise and anchored to the scenario.

In the Scenario description section, describe the programme configuration that the JSON reports. Explain the chosen tier, the main career incentive, mentorship intensity, delivery mode, response time, number of cohorts, cohort size, cost per trainee per month and any assumptions about opportunity cost. Translate these into plain language that senior officials can understand quickly.

In the Preference evidence and endorsement section, explain the endorsement rate, the opt out rate and the willingness to pay measures. Interpret what these values mean for stakeholder support for this configuration. Comment on how strong the support appears to be, where the main sources of value lie and how these patterns might influence negotiations between government and partners.

In the Economic costs section, describe programme cost per cohort, the total economic cost per cohort, and the total economic cost across all cohorts in the planning horizon. Distinguish clearly between financial costs and economic costs that include opportunity cost of trainee time when this is relevant. Comment on how cost per trainee and total cost compare with the scale of training envisaged.

In the Epidemiological effects section, interpret the number of graduates, the implied outbreak responses per year and the epidemiological benefit values. Explain in words how response time, completion rates and values per graduate and per outbreak response combine to produce the total indicative epidemiological benefits.

In the Benefit cost results section, interpret the benefit cost ratios and net present values that are available in the JSON. Explain whether the scenario appears favourable on epidemiological benefits alone and on the combined willingness to pay and epidemiological benefits where this is reported. Comment on whether the ratios are clearly above, close to or below one and what this implies for the strength of the business case.

In the Distributional and implementation considerations section, discuss any equity, implementation or capacity points that arise from the scenario. For example, reflect briefly on how changing mentorship intensity, delivery mode or tier might shift both who benefits and how feasible the programme is to deliver, even if the JSON does not provide distributional statistics directly. Ground these comments in the structure of the scenario rather than speculating widely.

In the Recommendations section, provide a concise narrative summary of whether this scenario should be considered a strong, moderate or weak candidate for funding. Suggest how it might be improved through adjustments to mentorship, delivery mode, number of cohorts or cost levels, and indicate what further analysis or sensitivity checks ministries might request. Write this section as paragraphs with clear sentences, not as a list.

Insert one or two compact tables in the text only where they help clarify the main numbers that ministries will want to see, such as a table of key indicators for one cohort and for all cohorts combined. Describe each table in the surrounding narrative so that the text remains readable without the table.

Do not use bullet points or numbered lists at any point in your response. Express all structure through headings and paragraphs.
`;

/* ===========================
   Global state
   =========================== */

const appState = {
  currency: "INR",
  usdRate: DEFAULT_EPI_SETTINGS.general.inrToUsdRate,
  epiSettings: JSON.parse(JSON.stringify(DEFAULT_EPI_SETTINGS)),
  currentScenario: null,
  savedScenarios: [],
  charts: {
    uptake: null,
    bcr: null,
    epi: null,
    natCostBenefit: null,
    natEpi: null
  },
  tooltip: {
    bubbleEl: null,
    arrowEl: null,
    currentTarget: null,
    hideTimeout: null
  },
  tour: {
    steps: [],
    currentIndex: 0,
    overlayEl: null,
    popoverEl: null
  }
};

/* ===========================
   Utility functions
   =========================== */

function formatNumber(x, decimals = 0) {
  if (x === null || x === undefined || isNaN(x)) return "-";
  return x.toLocaleString("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

function formatCurrencyINR(amount, decimals = 0) {
  if (amount === null || amount === undefined || isNaN(amount)) return "-";
  return "INR " + formatNumber(amount, decimals);
}

function formatCurrencyDisplay(amountInINR, decimals = 0) {
  if (amountInINR === null || amountInINR === undefined || isNaN(amountInINR))
    return "-";
  if (appState.currency === "USD") {
    const usd = amountInINR / (appState.usdRate || 1);
    return "USD " + formatNumber(usd, decimals);
  }
  return formatCurrencyINR(amountInINR, decimals);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function presentValueFactor(rate, years) {
  if (years <= 0) return 0;
  if (rate <= 0) return years;
  const r = rate;
  return (1 - Math.pow(1 + r, -years)) / r;
}

/* Toasts */

let toastEl = null;

function ensureToast() {
  if (toastEl) return;
  toastEl = document.createElement("div");
  toastEl.id = "toast";
  toastEl.className = "toast";
  document.body.appendChild(toastEl);
}

function showToast(message, type = "info") {
  ensureToast();
  toastEl.textContent = message;
  toastEl.classList.remove("toast-success", "toast-warning", "toast-error");
  if (type === "success") toastEl.classList.add("toast-success");
  if (type === "warning") toastEl.classList.add("toast-warning");
  if (type === "error") toastEl.classList.add("toast-error");
  toastEl.classList.add("show");
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3000);
}

/* ===========================
   Tooltip system
   =========================== */

function initTooltips() {
  const icons = Array.from(document.querySelectorAll(".info-icon"));
  if (!icons.length) return;

  // Normalise tooltip text: move title to data-tooltip and remove title attribute
  icons.forEach((icon) => {
    const dataTip = icon.getAttribute("data-tooltip");
    const title = icon.getAttribute("title");
    if (!dataTip && title) {
      icon.setAttribute("data-tooltip", title);
    }
    icon.removeAttribute("title");
  });

  // Create bubble once
  const bubble = document.createElement("div");
  bubble.className = "tooltip-bubble tooltip-hidden";
  const textP = document.createElement("p");
  const arrow = document.createElement("div");
  arrow.className = "tooltip-arrow";
  bubble.appendChild(textP);
  bubble.appendChild(arrow);
  document.body.appendChild(bubble);

  appState.tooltip.bubbleEl = bubble;
  appState.tooltip.arrowEl = arrow;

  function showTooltip(target) {
    const text =
      target.getAttribute("data-tooltip") ||
      target.getAttribute("aria-label") ||
      "";
    if (!text) return;

    appState.tooltip.currentTarget = target;
    textP.textContent = text;
    bubble.classList.remove("tooltip-hidden");
    bubble.classList.add("tooltip-visible");
    positionTooltip(target);
  }

  function hideTooltip() {
    bubble.classList.remove("tooltip-visible");
    bubble.classList.add("tooltip-hidden");
    appState.tooltip.currentTarget = null;
  }

  function positionTooltip(target) {
    const rect = target.getBoundingClientRect();
    bubble.style.left = "0px";
    bubble.style.top = "0px";
    bubble.classList.remove("top", "bottom");

    // First make visible to measure size
    bubble.style.visibility = "hidden";
    bubble.classList.remove("tooltip-hidden");
    bubble.classList.add("tooltip-visible");

    const bubbleRect = bubble.getBoundingClientRect();
    let top = rect.bottom + 8 + window.scrollY;
    let left =
      rect.left +
      window.scrollX +
      rect.width / 2 -
      bubbleRect.width / 2;

    // Adjust horizontally
    if (left < 8) left = 8;
    if (left + bubbleRect.width > window.scrollX + window.innerWidth - 8) {
      left = window.scrollX + window.innerWidth - bubbleRect.width - 8;
    }

    // If there is not enough space below, place above
    if (top + bubbleRect.height > window.scrollY + window.innerHeight - 8) {
      top = rect.top + window.scrollY - bubbleRect.height - 10;
      bubble.classList.add("top");
    } else {
      bubble.classList.add("bottom");
    }

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.style.visibility = "visible";
  }

  icons.forEach((icon) => {
    icon.addEventListener("mouseenter", () => {
      if (appState.tooltip.hideTimeout) {
        clearTimeout(appState.tooltip.hideTimeout);
      }
      showTooltip(icon);
    });

    icon.addEventListener("mouseleave", () => {
      appState.tooltip.hideTimeout = setTimeout(hideTooltip, 120);
    });

    icon.addEventListener("focus", () => {
      showTooltip(icon);
    });

    icon.addEventListener("blur", hideTooltip);

    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (appState.tooltip.currentTarget === icon) {
        hideTooltip();
      } else {
        showTooltip(icon);
      }
    });
  });

  window.addEventListener("scroll", () => {
    if (appState.tooltip.currentTarget) {
      positionTooltip(appState.tooltip.currentTarget);
    }
  });

  window.addEventListener("resize", () => {
    if (appState.tooltip.currentTarget) {
      positionTooltip(appState.tooltip.currentTarget);
    }
  });

  document.addEventListener("click", (e) => {
    if (!bubble.contains(e.target)) {
      hideTooltip();
    }
  });
}

/* ===========================
   Tabs
   =========================== */

function initTabs() {
  const tabLinks = Array.from(document.querySelectorAll(".tab-link"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  tabLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      tabLinks.forEach((b) => b.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));

      btn.classList.add("active");
      const panel = document.getElementById(`tab-${target}`);
      if (panel) panel.classList.add("active");
    });
  });
}

/* ===========================
   Guided tour
   =========================== */

function initGuidedTour() {
  const trigger = document.getElementById("btn-start-tour");
  if (!trigger) return;

  const steps = Array.from(
    document.querySelectorAll("[data-tour-step]")
  );
  if (!steps.length) return;

  appState.tour.steps = steps;

  const overlay = document.createElement("div");
  overlay.id = "tour-overlay";
  overlay.className = "tour-overlay hidden";

  const popover = document.createElement("div");
  popover.id = "tour-popover";
  popover.className = "tour-popover hidden";
  popover.innerHTML = `
    <div class="tour-popover-header">
      <h3 id="tour-title"></h3>
      <button class="tour-close-btn" type="button" aria-label="Close tour">×</button>
    </div>
    <div class="tour-popover-body" id="tour-body"></div>
    <div class="tour-popover-footer">
      <span class="tour-step-indicator" id="tour-indicator"></span>
      <div class="tour-buttons">
        <button type="button" class="btn-ghost-small" id="tour-prev">Previous</button>
        <button type="button" class="btn-primary-small" id="tour-next">Next</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(popover);

  appState.tour.overlayEl = overlay;
  appState.tour.popoverEl = popover;

  function endTour() {
    overlay.classList.add("hidden");
    popover.classList.add("hidden");
  }

  function showStep(index) {
    const stepsArr = appState.tour.steps;
    if (!stepsArr.length) return;
    const i = clamp(index, 0, stepsArr.length - 1);
    appState.tour.currentIndex = i;
    const el = stepsArr[i];
    if (!el) return;

    const title =
      el.getAttribute("data-tour-title") || "STEPS tour";
    const content =
      el.getAttribute("data-tour-content") || "";

    document.getElementById("tour-title").textContent = title;
    document.getElementById("tour-body").textContent = content;
    document.getElementById(
      "tour-indicator"
    ).textContent = `Step ${i + 1} of ${stepsArr.length}`;

    overlay.classList.remove("hidden");
    popover.classList.remove("hidden");

    positionTourPopover(popover, el);
  }

  function positionTourPopover(popoverEl, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const popRect = popoverEl.getBoundingClientRect();
    let top =
      rect.bottom + 8 + window.scrollY;
    let left =
      rect.left +
      window.scrollX +
      rect.width / 2 -
      popRect.width / 2;

    if (left < 8) left = 8;
    if (left + popRect.width > window.scrollX + window.innerWidth - 8) {
      left =
        window.scrollX + window.innerWidth - popRect.width - 8;
    }
    if (top + popRect.height > window.scrollY + window.innerHeight - 8) {
      top = rect.top + window.scrollY - popRect.height - 10;
    }

    popoverEl.style.left = `${left}px`;
    popoverEl.style.top = `${top}px`;
  }

  trigger.addEventListener("click", () => {
    showStep(0);
  });

  overlay.addEventListener("click", endTour);
  popover
    .querySelector(".tour-close-btn")
    .addEventListener("click", endTour);
  popover
    .querySelector("#tour-prev")
    .addEventListener("click", () => {
      showStep(appState.tour.currentIndex - 1);
    });
  popover
    .querySelector("#tour-next")
    .addEventListener("click", () => {
      if (appState.tour.currentIndex >= appState.tour.steps.length - 1) {
        endTour();
      } else {
        showStep(appState.tour.currentIndex + 1);
      }
    });

  window.addEventListener("resize", () => {
    if (
      !overlay.classList.contains("hidden") &&
      appState.tour.steps.length
    ) {
      const el =
        appState.tour.steps[appState.tour.currentIndex];
      if (el) {
        positionTourPopover(popover, el);
      }
    }
  });

  window.addEventListener("scroll", () => {
    if (
      !overlay.classList.contains("hidden") &&
      appState.tour.steps.length
    ) {
      const el =
        appState.tour.steps[appState.tour.currentIndex];
      if (el) {
        positionTourPopover(popover, el);
      }
    }
  });
}

/* ===========================
   Configuration and results
   =========================== */

function getConfigFromForm() {
  const tier = document.getElementById("program-tier").value;
  const career = document.getElementById("career-track").value;
  const mentorship = document.getElementById("mentorship").value;
  const delivery = document.getElementById("delivery").value;
  const response = document.getElementById("response").value;
  const costSlider = Number(
    document.getElementById("cost-slider").value
  );
  const trainees = Number(
    document.getElementById("trainees").value
  );
  const cohorts = Number(
    document.getElementById("cohorts").value
  );
  const oppIncluded = document
    .getElementById("opp-toggle")
    .classList.contains("on");
  const scenarioName =
    document.getElementById("scenario-name").value.trim() ||
    `${tier} ${mentorship} ${cohorts} cohorts`;
  const scenarioNotes =
    document.getElementById("scenario-notes").value.trim();

  return {
    tier,
    career,
    mentorship,
    delivery,
    response,
    costPerTraineePerMonth: costSlider,
    traineesPerCohort: trainees,
    cohorts,
    opportunityCostIncluded: oppIncluded,
    name: scenarioName,
    notes: scenarioNotes,
    preferenceModel: "Mixed logit preference model"
  };
}

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

function computeEndorsementAndWTP(config) {
  const costThousands =
    config.costPerTraineePerMonth / 1000;
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

  const endorseProb = denom > 0 ? expProg / denom : 0.5;
  const optOutProb = 1 - endorseProb;

  const nonCostUtility =
    MXL_COEFS.ascProgram +
    tierEffect(config.tier) +
    careerEffect(config.career) +
    mentorshipEffect(config.mentorship) +
    deliveryEffect(config.delivery) +
    responseEffect(config.response);

  const wtpPerTraineePerMonth =
    nonCostUtility / Math.abs(MXL_COEFS.costPerThousand) * 1000;

  return {
    endorseRate: clamp(endorseProb * 100, 0, 100),
    optOutRate: clamp(optOutProb * 100, 0, 100),
    wtpPerTraineePerMonth
  };
}

function computeCosts(config) {
  const months = TIER_MONTHS[config.tier] || 12;
  const directCostPerTraineePerMonth =
    config.costPerTraineePerMonth;
  const trainees = config.traineesPerCohort;

  const programmeCostPerCohort =
    directCostPerTraineePerMonth * months * trainees;

  const templatesForTier = COST_TEMPLATES[config.tier];
  const template =
    (COST_CONFIG &&
      COST_CONFIG[config.tier] &&
      COST_CONFIG[config.tier].combined) ||
    (templatesForTier && templatesForTier.combined);

  let oppRate = template ? template.oppRate : 0;
  if (!config.opportunityCostIncluded) {
    oppRate = 0;
  }

  const opportunityCost = programmeCostPerCohort * oppRate;
  const totalEconomicCost =
    programmeCostPerCohort + opportunityCost;

  return {
    programmeCostPerCohort,
    totalEconomicCostPerCohort: totalEconomicCost,
    opportunityCostPerCohort: opportunityCost,
    template
  };
}

function computeEpidemiological(config, endorseRate) {
  const tierSettings = appState.epiSettings.tiers[config.tier];
  const general = appState.epiSettings.general;

  const completionRate = tierSettings.completionRate;
  const outbreaksPerGrad =
    tierSettings.outbreaksPerGraduatePerYear;
  const valuePerGraduate = tierSettings.valuePerGraduate;
  const valuePerOutbreak = tierSettings.valuePerOutbreak;

  const planningYears = general.planningHorizonYears;
  const discountRate = general.epiDiscountRate;

  const pvFactor = presentValueFactor(discountRate, planningYears);

  const endorseFactor = endorseRate / 100;

  const months = TIER_MONTHS[config.tier] || 12;

  const enrolledPerCohort = config.traineesPerCohort;
  const completedPerCohort =
    enrolledPerCohort * completionRate;
  const graduatesEffective =
    completedPerCohort * endorseFactor;

  const graduatesAllCohorts =
    graduatesEffective * config.cohorts;

  const respMultiplier =
    RESPONSE_TIME_MULTIPLIERS[String(config.response)] || 1;

  const outbreaksPerYearPerCohort =
    graduatesEffective * outbreaksPerGrad * respMultiplier;
  const outbreaksPerYearNational =
    outbreaksPerYearPerCohort * config.cohorts;

  const graduateBenefitPerCohort =
    graduatesEffective * valuePerGraduate;

  const outbreakAnnualBenefitPerCohort =
    outbreaksPerYearPerCohort * valuePerOutbreak;

  const outbreakPVPerCohort =
    outbreakAnnualBenefitPerCohort * pvFactor;

  const totalEpiBenefitPerCohort =
    graduateBenefitPerCohort + outbreakPVPerCohort;

  return {
    months,
    graduatesPerCohort: graduatesEffective,
    graduatesAllCohorts,
    outbreaksPerYearPerCohort,
    outbreaksPerYearNational,
    epiBenefitPerCohort: totalEpiBenefitPerCohort,
    graduateBenefitPerCohort,
    outbreakPVPerCohort,
    planningYears,
    discountRate
  };
}

function computeScenario(config) {
  const pref = computeEndorsementAndWTP(config);
  const costs = computeCosts(config);
  const epi = computeEpidemiological(
    config,
    pref.endorseRate
  );

  const wtpPerTraineePerMonth =
    pref.wtpPerTraineePerMonth;

  const wtpPerCohort =
    wtpPerTraineePerMonth *
    epi.months *
    config.traineesPerCohort;

  const wtpAllCohorts = wtpPerCohort * config.cohorts;

  const epiBenefitPerCohort = epi.epiBenefitPerCohort;
  const epiBenefitAllCohorts =
    epiBenefitPerCohort * config.cohorts;

  const netBenefitPerCohort =
    epiBenefitPerCohort -
    costs.totalEconomicCostPerCohort;
  const netBenefitAllCohorts =
    epiBenefitAllCohorts -
    costs.totalEconomicCostPerCohort * config.cohorts;

  const bcrPerCohort =
    costs.totalEconomicCostPerCohort > 0
      ? epiBenefitPerCohort /
        costs.totalEconomicCostPerCohort
      : null;

  const natTotalCost =
    costs.totalEconomicCostPerCohort * config.cohorts;
  const natBcr =
    natTotalCost > 0
      ? epiBenefitAllCohorts / natTotalCost
      : null;

  const wtpOutbreakComponent =
    wtpAllCohorts * 0.3;

  return {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    config,
    preferenceModel: config.preferenceModel,
    endorseRate: pref.endorseRate,
    optOutRate: pref.optOutRate,
    wtpPerTraineePerMonth,
    wtpPerCohort,
    wtpAllCohorts,
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
    outbreaksPerYearPerCohort:
      epi.outbreaksPerYearPerCohort,
    outbreaksPerYearNational:
      epi.outbreaksPerYearNational,
    wtpOutbreakComponent,
    discountRate: epi.discountRate,
    planningYears: epi.planningYears
  };
}

/* ===========================
   Charts
   =========================== */

function ensureChart(ctxId, type, data, options) {
  if (!window.Chart) return null;
  const ctx = document
    .getElementById(ctxId)
    ?.getContext("2d");
  if (!ctx) return null;
  return new Chart(ctx, { type, data, options });
}

function updateUptakeChart(scenario) {
  const ctxId = "chart-uptake";
  const existing = appState.charts.uptake;
  const data = {
    labels: ["Endorse FETP option", "Choose opt out"],
    datasets: [
      {
        label: "Share of stakeholders",
        data: [
          scenario.endorseRate,
          scenario.optOutRate
        ]
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  };
  if (existing) {
    existing.data = data;
    existing.options = options;
    existing.update();
  } else {
    appState.charts.uptake = ensureChart(
      ctxId,
      "bar",
      data,
      options
    );
  }
}

function updateBcrChart(scenario) {
  const ctxId = "chart-bcr";
  const existing = appState.charts.bcr;
  const data = {
    labels: ["Epidemiological benefit", "Economic cost"],
    datasets: [
      {
        label: "Per cohort (INR)",
        data: [
          scenario.epiBenefitPerCohort,
          scenario.costs.totalEconomicCostPerCohort
        ]
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  if (existing) {
    existing.data = data;
    existing.options = options;
    existing.update();
  } else {
    appState.charts.bcr = ensureChart(
      ctxId,
      "bar",
      data,
      options
    );
  }
}

function updateEpiChart(scenario) {
  const ctxId = "chart-epi";
  const existing = appState.charts.epi;
  const data = {
    labels: [
      "Graduates (all cohorts)",
      "Outbreak responses per year"
    ],
    datasets: [
      {
        label: "Epidemiological outputs",
        data: [
          scenario.graduatesAllCohorts,
          scenario.outbreaksPerYearNational
        ]
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  if (existing) {
    existing.data = data;
    existing.options = options;
    existing.update();
  } else {
    appState.charts.epi = ensureChart(
      ctxId,
      "bar",
      data,
      options
    );
  }
}

function updateNatCostBenefitChart(scenario) {
  const ctxId = "chart-nat-cost-benefit";
  const existing = appState.charts.natCostBenefit;
  const totalBenefit =
    scenario.epiBenefitAllCohorts;
  const data = {
    labels: [
      "Total economic cost (all cohorts)",
      "Total epidemiological benefit (all cohorts)"
    ],
    datasets: [
      {
        label: "National totals (INR)",
        data: [scenario.natTotalCost, totalBenefit]
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  if (existing) {
    existing.data = data;
    existing.options = options;
    existing.update();
  } else {
    appState.charts.natCostBenefit = ensureChart(
      ctxId,
      "bar",
      data,
      options
    );
  }
}

function updateNatEpiChart(scenario) {
  const ctxId = "chart-nat-epi";
  const existing = appState.charts.natEpi;
  const data = {
    labels: [
      "Total graduates",
      "Outbreak responses per year"
    ],
    datasets: [
      {
        label: "National epidemiological outputs",
        data: [
          scenario.graduatesAllCohorts,
          scenario.outbreaksPerYearNational
        ]
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  if (existing) {
    existing.data = data;
    existing.options = options;
    existing.update();
  } else {
    appState.charts.natEpi = ensureChart(
      ctxId,
      "bar",
      data,
      options
    );
  }
}

/* ===========================
   UI updates
   =========================== */

function updateCostSliderLabel() {
  const slider = document.getElementById("cost-slider");
  const display = document.getElementById("cost-display");
  if (!slider || !display) return;
  const val = Number(slider.value);
  display.textContent = formatCurrencyDisplay(val, 0);
}

function updateCurrencyToggle() {
  const label = document.getElementById("currency-label");
  const buttons = Array.from(
    document.querySelectorAll(".pill-toggle")
  );
  buttons.forEach((btn) => {
    const c = btn.getAttribute("data-currency");
    if (c === appState.currency) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  if (label) {
    label.textContent = appState.currency;
  }
  if (appState.currentScenario) {
    refreshAllOutputs(appState.currentScenario);
  }
}

function updateConfigSummary(scenario) {
  const container = document.getElementById(
    "config-summary"
  );
  if (!container) return;

  const c = scenario.config;
  container.innerHTML = "";

  const rows = [
    {
      label: "Programme tier",
      value:
        c.tier === "frontline"
          ? "Frontline"
          : c.tier === "intermediate"
          ? "Intermediate"
          : "Advanced"
    },
    {
      label: "Career incentive",
      value:
        c.career === "certificate"
          ? "Government and partner certificate"
          : c.career === "uniqual"
          ? "University qualification"
          : "Government career pathway"
    },
    {
      label: "Mentorship intensity",
      value:
        c.mentorship === "low"
          ? "Low"
          : c.mentorship === "medium"
          ? "Medium"
          : "High"
    },
    {
      label: "Delivery mode",
      value:
        c.delivery === "blended"
          ? "Blended"
          : c.delivery === "inperson"
          ? "Fully in person"
          : "Fully online"
    },
    {
      label: "Response time",
      value:
        c.response === "7"
          ? "Detect and respond within 7 days"
          : c.response === "15"
          ? "Detect and respond within 15 days"
          : "Detect and respond within 30 days"
    },
    {
      label: "Cost per trainee per month",
      value: formatCurrencyDisplay(
        c.costPerTraineePerMonth,
        0
      )
    },
    {
      label: "Trainees per cohort",
      value: formatNumber(c.traineesPerCohort, 0)
    },
    {
      label: "Number of cohorts",
      value: formatNumber(c.cohorts, 0)
    },
    {
      label: "Opportunity cost",
      value: c.opportunityCostIncluded
        ? "Included in economic cost"
        : "Not included"
    }
  ];

  rows.forEach((row) => {
    const div = document.createElement("div");
    div.className = "config-summary-row";
    div.innerHTML = `
      <span class="config-summary-label">${row.label}</span>
      <span class="config-summary-value">${row.value}</span>
    `;
    container.appendChild(div);
  });

  const endorsementEl = document.getElementById(
    "config-endorsement-value"
  );
  if (endorsementEl) {
    endorsementEl.textContent =
      formatNumber(scenario.endorseRate, 1) + "%";
  }

  const statusTag = document.getElementById(
    "headline-status-tag"
  );
  if (statusTag) {
    statusTag.textContent = "";
    statusTag.classList.remove(
      "status-neutral",
      "status-good",
      "status-warning",
      "status-poor"
    );

    let statusClass = "status-neutral";
    let statusText = "Scenario assessed";

    if (scenario.endorseRate >= 70 && scenario.bcrPerCohort !== null && scenario.bcrPerCohort >= 1.2) {
      statusClass = "status-good";
      statusText = "Strong configuration";
    } else if (scenario.endorseRate >= 50 && scenario.bcrPerCohort !== null && scenario.bcrPerCohort >= 1.0) {
      statusClass = "status-warning";
      statusText = "Promising configuration (needs discussion)";
    } else {
      statusClass = "status-poor";
      statusText = "Challenging configuration";
    }

    statusTag.classList.add(statusClass);
    statusTag.textContent = statusText;
  }

  const headlineText = document.getElementById(
    "headline-recommendation"
  );
  if (headlineText) {
    const endorse = formatNumber(
      scenario.endorseRate,
      1
    );
    const cost = formatCurrencyDisplay(
      scenario.costs.totalEconomicCostPerCohort,
      0
    );
    const bcr =
      scenario.bcrPerCohort !== null
        ? formatNumber(scenario.bcrPerCohort, 2)
        : "-";
    headlineText.textContent =
      `For this configuration, the preference model suggests an endorsement rate of about ${endorse} percent, with an economic cost of ${cost} per cohort and an epidemiological benefit cost ratio of approximately ${bcr}. These values can be used as a starting point for business case discussions with ministries and partners.`;
  }

  const briefingEl = document.getElementById(
    "headline-briefing-text"
  );
  if (briefingEl) {
    const natCost = formatCurrencyDisplay(
      scenario.natTotalCost,
      0
    );
    const natBenefit = formatCurrencyDisplay(
      scenario.epiBenefitAllCohorts,
      0
    );
    const natBcr =
      scenario.natBcr !== null
        ? formatNumber(scenario.natBcr, 2)
        : "-";
    briefingEl.textContent =
      `Under the chosen configuration, the model predicts that ${formatNumber(
        scenario.endorseRate,
        1
      )} percent of stakeholders would endorse the investment. Running ${formatNumber(
        scenario.config.cohorts,
        0
      )} cohorts of ${formatNumber(
        scenario.config.traineesPerCohort,
        0
      )} trainees leads to a total economic cost of around ${natCost} over the planning horizon and an indicative epidemiological benefit of roughly ${natBenefit}. The corresponding benefit cost ratio at national level is about ${natBcr}, assuming the values per graduate and per outbreak response in the Advanced and methods tab.`;
  }
}

function updateResultsTab(scenario) {
  const endorseEl = document.getElementById(
    "endorsement-rate"
  );
  const optOutEl = document.getElementById(
    "optout-rate"
  );
  const wtpPerTraineeEl = document.getElementById(
    "wtp-per-trainee"
  );
  const wtpTotalCohortEl = document.getElementById(
    "wtp-total-cohort"
  );
  const progCostEl = document.getElementById(
    "prog-cost-per-cohort"
  );
  const totalCostEl = document.getElementById(
    "total-cost"
  );
  const netBenefitEl = document.getElementById(
    "net-benefit"
  );
  const bcrEl = document.getElementById("bcr");
  const gradsEl = document.getElementById(
    "epi-graduates"
  );
  const outbreaksEl = document.getElementById(
    "epi-outbreaks"
  );
  const epiBenefitEl = document.getElementById(
    "epi-benefit"
  );

  if (endorseEl)
    endorseEl.textContent =
      formatNumber(scenario.endorseRate, 1) + "%";
  if (optOutEl)
    optOutEl.textContent =
      formatNumber(scenario.optOutRate, 1) + "%";
  if (wtpPerTraineeEl)
    wtpPerTraineeEl.textContent =
      formatCurrencyDisplay(
        scenario.wtpPerTraineePerMonth,
        0
      );
  if (wtpTotalCohortEl)
    wtpTotalCohortEl.textContent =
      formatCurrencyDisplay(
        scenario.wtpPerCohort,
        0
      );
  if (progCostEl)
    progCostEl.textContent =
      formatCurrencyDisplay(
        scenario.costs.programmeCostPerCohort,
        0
      );
  if (totalCostEl)
    totalCostEl.textContent =
      formatCurrencyDisplay(
        scenario.costs.totalEconomicCostPerCohort,
        0
      );
  if (netBenefitEl)
    netBenefitEl.textContent =
      formatCurrencyDisplay(
        scenario.netBenefitPerCohort,
        0
      );
  if (bcrEl)
    bcrEl.textContent =
      scenario.bcrPerCohort !== null
        ? formatNumber(scenario.bcrPerCohort, 2)
        : "-";

  if (gradsEl)
    gradsEl.textContent = formatNumber(
      scenario.graduatesAllCohorts,
      0
    );
  if (outbreaksEl)
    outbreaksEl.textContent = formatNumber(
      scenario.outbreaksPerYearNational,
      1
    );
  if (epiBenefitEl)
    epiBenefitEl.textContent =
      formatCurrencyDisplay(
        scenario.epiBenefitPerCohort,
        0
      );
}

function updateCostingTab(scenario) {
  const select = document.getElementById("cost-source");
  if (select && select.options.length === 0) {
    ["frontline", "intermediate", "advanced"].forEach(
      (tier) => {
        const templates = COST_TEMPLATES[tier];
        if (templates && templates.combined) {
          const opt = document.createElement("option");
          opt.value = templates.combined.id;
          opt.textContent = templates.combined.label;
          select.appendChild(opt);
        }
      }
    );
  }

  if (select) {
    const templates = COST_TEMPLATES[scenario.config.tier];
    if (templates && templates.combined) {
      select.value = templates.combined.id;
    }
  }

  const summaryBox = document.getElementById(
    "cost-breakdown-summary"
  );
  const tbody = document.getElementById(
    "cost-components-list"
  );
  if (!summaryBox || !tbody) return;

  tbody.innerHTML = "";
  summaryBox.innerHTML = "";

  const costInfo = scenario.costs;
  const template = costInfo.template;
  const directCost =
    costInfo.programmeCostPerCohort;
  const oppCost =
    costInfo.opportunityCostPerCohort;
  const econCost =
    costInfo.totalEconomicCostPerCohort;

  const cardsData = [
    {
      label: "Programme cost per cohort",
      value: formatCurrencyDisplay(directCost, 0)
    },
    {
      label: "Opportunity cost per cohort",
      value: formatCurrencyDisplay(oppCost, 0)
    },
    {
      label: "Total economic cost per cohort",
      value: formatCurrencyDisplay(econCost, 0)
    },
    {
      label: "Share of opportunity cost",
      value:
        econCost > 0
          ? formatNumber(
              (oppCost / econCost) * 100,
              1
            ) + "%"
          : "-"
    }
  ];

  cardsData.forEach((c) => {
    const div = document.createElement("div");
    div.className = "cost-summary-card";
    div.innerHTML = `
      <div class="cost-summary-label">${c.label}</div>
      <div class="cost-summary-value">${c.value}</div>
    `;
    summaryBox.appendChild(div);
  });

  if (!template) return;

  const months = TIER_MONTHS[scenario.config.tier] || 12;
  const trainees = scenario.config.traineesPerCohort;
  const directForComponents = directCost;

  template.components.forEach((comp) => {
    const amount =
      directForComponents * comp.directShare;
    const perTraineePerMonth =
      trainees > 0 && months > 0
        ? amount / (trainees * months)
        : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${comp.label}</td>
      <td class="numeric-cell">${formatNumber(
        comp.directShare * 100,
        1
      )}%</td>
      <td class="numeric-cell">${formatCurrencyDisplay(
        amount,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyDisplay(
        perTraineePerMonth,
        0
      )}</td>
      <td>Included in combined template for this tier.</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateNationalSimulationTab(scenario) {
  const totCostEl = document.getElementById(
    "nat-total-cost"
  );
  const totBenefitEl = document.getElementById(
    "nat-total-benefit"
  );
  const netBenefitEl = document.getElementById(
    "nat-net-benefit"
  );
  const natBcrEl = document.getElementById("nat-bcr");
  const natGraduatesEl = document.getElementById(
    "nat-graduates"
  );
  const natOutbreaksEl = document.getElementById(
    "nat-outbreaks"
  );
  const natTotalWtpEl = document.getElementById(
    "nat-total-wtp"
  );
  const textEl = document.getElementById(
    "natsim-summary-text"
  );

  const natCost = scenario.natTotalCost;
  const natBenefit = scenario.epiBenefitAllCohorts;
  const natNet = scenario.netBenefitAllCohorts;
  const natBcr =
    scenario.natBcr !== null
      ? scenario.natBcr
      : null;
  const natTotalWtp = scenario.wtpAllCohorts;

  if (totCostEl)
    totCostEl.textContent =
      formatCurrencyDisplay(natCost, 0);
  if (totBenefitEl)
    totBenefitEl.textContent =
      formatCurrencyDisplay(natBenefit, 0);
  if (netBenefitEl)
    netBenefitEl.textContent =
      formatCurrencyDisplay(natNet, 0);
  if (natBcrEl)
    natBcrEl.textContent =
      natBcr !== null
        ? formatNumber(natBcr, 2)
        : "-";
  if (natGraduatesEl)
    natGraduatesEl.textContent = formatNumber(
      scenario.graduatesAllCohorts,
      0
    );
  if (natOutbreaksEl)
    natOutbreaksEl.textContent = formatNumber(
      scenario.outbreaksPerYearNational,
      1
    );
  if (natTotalWtpEl)
    natTotalWtpEl.textContent =
      formatCurrencyDisplay(natTotalWtp, 0);

  if (textEl) {
    textEl.textContent =
      `At national level, this scenario would produce around ${formatNumber(
        scenario.graduatesAllCohorts,
        0
      )} graduates over the planning horizon, supporting roughly ${formatNumber(
        scenario.outbreaksPerYearNational,
        1
      )} outbreak responses per year once all cohorts are complete. The total economic cost across all cohorts is about ${formatCurrencyDisplay(
        natCost,
        0
      )}, while the indicative epidemiological benefit is approximately ${formatCurrencyDisplay(
        natBenefit,
        0
      )}. This implies a national benefit cost ratio of about ${
        natBcr !== null ? formatNumber(natBcr, 2) : "-"
      } and a net epidemiological benefit of ${formatCurrencyDisplay(
        natNet,
        0
      )}. Total willingness to pay across all cohorts is roughly ${formatCurrencyDisplay(
        natTotalWtp,
        0
      )}, which can be viewed alongside epidemiological benefits when preparing formal business cases.`;
  }

  updateNatCostBenefitChart(scenario);
  updateNatEpiChart(scenario);
}

/* ===========================
   Scenarios table and exports
   =========================== */

function refreshSavedScenariosTable() {
  const tbody = document.querySelector(
    "#scenario-table tbody"
  );
  if (!tbody) return;

  tbody.innerHTML = "";
  appState.savedScenarios.forEach((scenario) => {
    const c = scenario.config;
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
      <td>${
        c.response === "7"
          ? "Within 7 days"
          : c.response === "15"
          ? "Within 15 days"
          : "Within 30 days"
      }</td>
      <td class="numeric-cell">${formatNumber(
        c.cohorts,
        0
      )}</td>
      <td class="numeric-cell">${formatNumber(
        c.traineesPerCohort,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyDisplay(
        c.costPerTraineePerMonth,
        0
      )}</td>
      <td>${scenario.preferenceModel}</td>
      <td class="numeric-cell">${formatNumber(
        scenario.endorseRate,
        1
      )}%</td>
      <td class="numeric-cell">${formatCurrencyDisplay(
        scenario.wtpPerTraineePerMonth,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyDisplay(
        scenario.wtpAllCohorts,
        0
      )}</td>
      <td class="numeric-cell">${
        scenario.natBcr !== null
          ? formatNumber(scenario.natBcr, 2)
          : "-"
      }</td>
      <td class="numeric-cell">${formatCurrencyDisplay(
        scenario.natTotalCost,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyDisplay(
        scenario.epiBenefitAllCohorts,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyDisplay(
        scenario.netBenefitAllCohorts,
        0
      )}</td>
      <td class="numeric-cell">${formatNumber(
        scenario.outbreaksPerYearNational,
        1
      )}</td>
      <td>${c.notes || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

function exportScenariosToExcel() {
  if (!window.XLSX) {
    showToast(
      "Excel export is not available in this browser.",
      "error"
    );
    return;
  }
  const wb = XLSX.utils.book_new();
  const rows = [];
  rows.push([
    "Name",
    "Tier",
    "Career",
    "Mentorship",
    "Delivery",
    "Response time",
    "Cohorts",
    "Trainees per cohort",
    "Cost per trainee per month (INR)",
    "Endorsement (%)",
    "WTP per trainee per month (INR)",
    "Total WTP all cohorts (INR)",
    "Total economic cost all cohorts (INR)",
    "Total epidemiological benefit all cohorts (INR)",
    "Net epidemiological benefit all cohorts (INR)",
    "Benefit cost ratio (epidemiological)"
  ]);

  appState.savedScenarios.forEach((s) => {
    const c = s.config;
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
      s.wtpPerTraineePerMonth,
      s.wtpAllCohorts,
      s.natTotalCost,
      s.epiBenefitAllCohorts,
      s.netBenefitAllCohorts,
      s.natBcr
    ]);
  });

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(
    wb,
    sheet,
    "STEPS scenarios"
  );
  XLSX.writeFile(
    wb,
    "steps_saved_scenarios.xlsx"
  );
  showToast("Excel file downloaded.", "success");
}

function exportScenariosToPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast(
      "PDF export is not available in this browser.",
      "error"
    );
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape"
  });

  let y = 10;
  doc.setFontSize(14);
  doc.text(
    "STEPS FETP India Decision Aid - Saved Scenarios",
    10,
    y
  );
  y += 8;
  doc.setFontSize(10);

  appState.savedScenarios.forEach((s, idx) => {
    if (y > 190) {
      doc.addPage();
      y = 10;
    }
    const c = s.config;
    doc.text(
      `${idx + 1}. ${c.name || "Scenario"}`,
      10,
      y
    );
    y += 5;
    doc.text(
      `Tier: ${c.tier} | Career: ${c.career} | Mentorship: ${c.mentorship} | Delivery: ${c.delivery} | Response: ${c.response} days`,
      10,
      y
    );
    y += 5;
    doc.text(
      `Cohorts: ${c.cohorts}, Trainees per cohort: ${c.traineesPerCohort}, Cost per trainee per month (INR): ${formatNumber(
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
      )}% | WTP per trainee per month (INR): ${formatNumber(
        s.wtpPerTraineePerMonth,
        0
      )}`,
      10,
      y
    );
    y += 5;
    doc.text(
      `Total WTP all cohorts (INR): ${formatNumber(
        s.wtpAllCohorts,
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
      )} | Total epidemiological benefit (INR): ${formatNumber(
        s.epiBenefitAllCohorts,
        0
      )}`,
      10,
      y
    );
    y += 5;
    doc.text(
      `Net epidemiological benefit (INR): ${formatNumber(
        s.netBenefitAllCohorts,
        0
      )} | Benefit cost ratio: ${
        s.natBcr !== null
          ? formatNumber(s.natBcr, 2)
          : "-"
      }`,
      10,
      y
    );
    y += 7;
  });

  doc.save("steps_saved_scenarios.pdf");
  showToast("Policy brief PDF downloaded.", "success");
}

/* ===========================
   Sensitivity / DCE benefits
   =========================== */

function getSensitivityControls() {
  const benefitModeSelect = document.getElementById(
    "benefit-definition-select"
  );
  const epiToggle = document.getElementById(
    "sensitivity-epi-toggle"
  );
  const endorsementOverrideInput =
    document.getElementById("endorsement-override");

  return {
    benefitMode: benefitModeSelect
      ? benefitModeSelect.value
      : "wtp_only",
    epiIncluded:
      epiToggle &&
      epiToggle.classList.contains("on"),
    endorsementOverride: endorsementOverrideInput
      ? Number(endorsementOverrideInput.value) || null
      : null
  };
}

function computeSensitivityRow(scenario) {
  const c = scenario.config;
  const costAll =
    scenario.costs.totalEconomicCostPerCohort *
    c.cohorts;
  const epiAll =
    scenario.epiBenefitPerCohort * c.cohorts;
  const netAll = epiAll - costAll;
  const epiBcr =
    costAll > 0 ? epiAll / costAll : null;

  const wtpAll = scenario.wtpAllCohorts;
  const wtpOutbreak = scenario.wtpOutbreakComponent;
  const combinedBenefit = wtpAll + epiAll;

  const npvDceOnly = wtpAll - costAll;
  const npvCombined = combinedBenefit - costAll;

  return {
    costAll,
    epiAll,
    netAll,
    epiBcr,
    wtpAll,
    wtpOutbreak,
    combinedBenefit,
    npvDceOnly,
    npvCombined
  };
}

function refreshSensitivityTables() {
  const dceBody = document.getElementById(
    "dce-benefits-table-body"
  );
  const sensBody = document.getElementById(
    "sensitivity-table-body"
  );
  if (!dceBody || !sensBody) return;

  dceBody.innerHTML = "";
  sensBody.innerHTML = "";

  if (!appState.currentScenario) return;

  const controls = getSensitivityControls();

  const scenarios = [
    {
      label: "Current configuration",
      scenario: appState.currentScenario
    },
    ...appState.savedScenarios.map((s, idx) => ({
      label: s.config.name || `Saved scenario ${idx + 1}`,
      scenario: s
    }))
  ];

  scenarios.forEach(({ label, scenario }) => {
    const c = scenario.config;
    const s = computeSensitivityRow(scenario);

    let endorsementUsed =
      controls.endorsementOverride !== null
        ? controls.endorsementOverride
        : scenario.endorseRate;
    endorsementUsed = clamp(endorsementUsed, 0, 100);

    let effectiveWtp = s.wtpAll;
    if (controls.benefitMode === "endorsement_adjusted") {
      effectiveWtp =
        s.wtpAll * (endorsementUsed / 100);
    }

    let combinedBenefit = s.combinedBenefit;
    if (!controls.epiIncluded) {
      combinedBenefit = s.wtpAll;
    }

    const bcrDceOnly =
      s.costAll > 0 ? s.wtpAll / s.costAll : null;
    const bcrCombined =
      s.costAll > 0
        ? combinedBenefit / s.costAll
        : null;

    const npvDceOnly =
      controls.epiIncluded ? s.npvDceOnly : s.npvDceOnly;
    const npvCombined = s.npvCombined;

    const trHeadline = document.createElement("tr");
    trHeadline.innerHTML = `
      <td>${label}</td>
      <td class="numeric-cell">${formatCurrencyINR(
        s.costAll,
        0
      )}</td>
      <td class="numeric-cell">${formatNumber(
        s.costAll / 1e6,
        2
      )}</td>
      <td class="numeric-cell">${formatNumber(
        s.netAll / 1e6,
        2
      )}</td>
      <td class="numeric-cell">${formatCurrencyINR(
        s.wtpAll,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyINR(
        s.wtpOutbreak,
        0
      )}</td>
      <td class="numeric-cell">${controls.epiIncluded
        ? formatCurrencyINR(s.epiAll, 0)
        : "Not included"
      }</td>
      <td class="numeric-cell">${formatNumber(
        endorsementUsed,
        1
      )}</td>
      <td class="numeric-cell">${formatCurrencyINR(
        effectiveWtp,
        0
      )}</td>
      <td class="numeric-cell">${
        bcrDceOnly !== null
          ? formatNumber(bcrDceOnly, 2)
          : "-"
      }</td>
      <td class="numeric-cell">${formatCurrencyINR(
        npvDceOnly,
        0
      )}</td>
      <td class="numeric-cell">${
        bcrCombined !== null
          ? formatNumber(bcrCombined, 2)
          : "-"
      }</td>
      <td class="numeric-cell">${formatCurrencyINR(
        npvCombined,
        0
      )}</td>
    `;
    dceBody.appendChild(trHeadline);

    const trDetail = document.createElement("tr");
    trDetail.innerHTML = `
      <td>${label}</td>
      <td>${scenario.preferenceModel}</td>
      <td class="numeric-cell">${formatNumber(
        scenario.endorseRate,
        1
      )}%</td>
      <td class="numeric-cell">${formatCurrencyINR(
        scenario.costs.totalEconomicCostPerCohort,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyINR(
        scenario.wtpPerCohort,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyINR(
        scenario.wtpOutbreakComponent,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyINR(
        scenario.epiBenefitPerCohort,
        0
      )}</td>
      <td class="numeric-cell">${
        bcrDceOnly !== null
          ? formatNumber(bcrDceOnly, 2)
          : "-"
      }</td>
      <td class="numeric-cell">${formatCurrencyINR(
        npvDceOnly / c.cohorts,
        0
      )}</td>
      <td class="numeric-cell">${
        bcrCombined !== null
          ? formatNumber(bcrCombined, 2)
          : "-"
      }</td>
      <td class="numeric-cell">${formatCurrencyINR(
        npvCombined / c.cohorts,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyINR(
        s.wtpAll *
          (endorsementUsed / 100) /
          c.cohorts,
        0
      )}</td>
      <td class="numeric-cell">${formatCurrencyINR(
        (combinedBenefit *
          (endorsementUsed / 100)) /
          c.cohorts,
        0
      )}</td>
    `;
    sensBody.appendChild(trDetail);
  });
}

function exportSensitivityToExcel() {
  if (!window.XLSX) {
    showToast(
      "Excel export is not available in this browser.",
      "error"
    );
    return;
  }
  const table = document.getElementById(
    "dce-benefits-table"
  );
  if (!table) return;

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(
    wb,
    sheet,
    "Sensitivity"
  );
  XLSX.writeFile(
    wb,
    "steps_sensitivity_summary.xlsx"
  );
  showToast(
    "Sensitivity table Excel file downloaded.",
    "success"
  );
}

function exportSensitivityToPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast(
      "PDF export is not available in this browser.",
      "error"
    );
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape"
  });
  doc.setFontSize(14);
  doc.text(
    "STEPS FETP India Decision Aid - Sensitivity and DCE benefits",
    10,
    10
  );

  const table = document.getElementById(
    "dce-benefits-table"
  );
  if (!table) {
    doc.save("steps_sensitivity_summary.pdf");
    return;
  }

  let y = 18;
  doc.setFontSize(9);
  const rows = Array.from(
    table.querySelectorAll("tbody tr")
  );
  rows.forEach((tr, idx) => {
    if (y > 190) {
      doc.addPage();
      y = 10;
    }
    const cells = Array.from(tr.children).map((td) =>
      td.textContent.trim()
    );
    const text = cells.join(" | ");
    doc.text(`${idx + 1}. ${text}`, 10, y);
    y += 5;
  });

  doc.save("steps_sensitivity_summary.pdf");
  showToast(
    "Sensitivity table PDF downloaded.",
    "success"
  );
}

/* ===========================
   Advanced settings
   =========================== */

function initAdvancedSettings() {
  const valueGradInput = document.getElementById(
    "adv-value-per-graduate"
  );
  const valueOutbreakInput = document.getElementById(
    "adv-value-per-outbreak"
  );
  const completionInput = document.getElementById(
    "adv-completion-rate"
  );
  const outbreaksPerGradInput =
    document.getElementById(
      "adv-outbreaks-per-graduate"
    );
  const horizonInput = document.getElementById(
    "adv-planning-horizon"
  );
  const discInput = document.getElementById(
    "adv-epi-discount-rate"
  );
  const usdRateInput = document.getElementById(
    "adv-usd-rate"
  );
  const applyBtn = document.getElementById(
    "adv-apply-settings"
  );
  const resetBtn = document.getElementById(
    "adv-reset-settings"
  );
  const logBox = document.getElementById(
    "adv-settings-log"
  );

  function writeLog(message) {
    if (!logBox) return;
    const time = new Date().toLocaleString();
    const p = document.createElement("p");
    p.textContent = `[${time}] ${message}`;
    logBox.appendChild(p);
  }

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      if (
        valueGradInput &&
        valueOutbreakInput &&
        completionInput &&
        outbreaksPerGradInput &&
        horizonInput &&
        discInput &&
        usdRateInput
      ) {
        const vGrad = Number(
          valueGradInput.value
        );
        const vOut = Number(
          valueOutbreakInput.value
        );
        const compRate =
          Number(completionInput.value) / 100;
        const outPerGrad = Number(
          outbreaksPerGradInput.value
        );
        const horizon = Number(horizonInput.value);
        const discRate =
          Number(discInput.value) / 100;
        const usdRate = Number(usdRateInput.value);

        ["frontline", "intermediate", "advanced"].forEach(
          (tier) => {
            appState.epiSettings.tiers[
              tier
            ].valuePerGraduate = vGrad;
            appState.epiSettings.tiers[
              tier
            ].valuePerOutbreak = vOut;
            appState.epiSettings.tiers[
              tier
            ].completionRate = clamp(
              compRate,
              0,
              1
            );
            appState.epiSettings.tiers[
              tier
            ].outbreaksPerGraduatePerYear =
              outPerGrad;
          }
        );
        appState.epiSettings.general.planningHorizonYears =
          horizon;
        appState.epiSettings.general.epiDiscountRate =
          discRate;
        appState.epiSettings.general.inrToUsdRate =
          usdRate;
        appState.usdRate = usdRate;

        writeLog(
          "Advanced settings updated for value per graduate, value per outbreak, completion rate, outbreaks per graduate, planning horizon, discount rate and INR per USD."
        );

        if (appState.currentScenario) {
          const newScenario = computeScenario(
            appState.currentScenario.config
          );
          appState.currentScenario = newScenario;
          refreshAllOutputs(newScenario);
        }

        showToast(
          "Advanced settings applied for this session.",
          "success"
        );
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      appState.epiSettings = JSON.parse(
        JSON.stringify(DEFAULT_EPI_SETTINGS)
      );
      appState.usdRate =
        DEFAULT_EPI_SETTINGS.general.inrToUsdRate;

      if (valueGradInput)
        valueGradInput.value = "500000";
      if (valueOutbreakInput)
        valueOutbreakInput.value = "30000000";
      if (completionInput)
        completionInput.value = "90";
      if (outbreaksPerGradInput)
        outbreaksPerGradInput.value = "0.5";
      if (horizonInput)
        horizonInput.value = String(
          DEFAULT_EPI_SETTINGS.general
            .planningHorizonYears
        );
      if (discInput)
        discInput.value = String(
          DEFAULT_EPI_SETTINGS.general
            .epiDiscountRate * 100
        );
      if (usdRateInput)
        usdRateInput.value = String(
          DEFAULT_EPI_SETTINGS.general.inrToUsdRate
        );

      writeLog(
        "Advanced settings reset to default values."
      );

      if (appState.currentScenario) {
        const newScenario = computeScenario(
          appState.currentScenario.config
        );
        appState.currentScenario = newScenario;
        refreshAllOutputs(newScenario);
      }

      showToast(
        "Advanced settings reset to defaults.",
        "success"
      );
    });
  }
}

/* ===========================
   Copilot integration
   =========================== */

function buildScenarioJsonForCopilot(scenario) {
  const c = scenario.config;
  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      tool: "STEPS FETP India Decision Aid",
      country: "India",
      planningHorizonYears:
        scenario.planningYears,
      discountRateForBenefits:
        scenario.discountRate
    },
    configuration: {
      name: c.name,
      notes: c.notes,
      tier: c.tier,
      careerIncentive: c.career,
      mentorshipIntensity: c.mentorship,
      deliveryMode: c.delivery,
      responseTimeDays: Number(c.response),
      costPerTraineePerMonthINR:
        c.costPerTraineePerMonth,
      traineesPerCohort: c.traineesPerCohort,
      cohorts: c.cohorts,
      opportunityCostIncluded:
        c.opportunityCostIncluded
    },
    preferenceModel: {
      type: scenario.preferenceModel,
      endorsementRatePercent:
        scenario.endorseRate,
      optOutRatePercent: scenario.optOutRate,
      wtpPerTraineePerMonthINR:
        scenario.wtpPerTraineePerMonth,
      wtpPerCohortINR: scenario.wtpPerCohort,
      wtpAllCohortsINR: scenario.wtpAllCohorts
    },
    costResults: {
      programmeCostPerCohortINR:
        scenario.costs.programmeCostPerCohort,
      opportunityCostPerCohortINR:
        scenario.costs.opportunityCostPerCohort,
      economicCostPerCohortINR:
        scenario.costs.totalEconomicCostPerCohort,
      totalEconomicCostAllCohortsINR:
        scenario.natTotalCost
    },
    epidemiologicalResults: {
      graduatesPerCohort:
        scenario.graduatesPerCohort,
      graduatesAllCohorts:
        scenario.graduatesAllCohorts,
      outbreakResponsesPerYearPerCohort:
        scenario.outbreaksPerYearPerCohort,
      outbreakResponsesPerYearNational:
        scenario.outbreaksPerYearNational,
      epiBenefitPerCohortINR:
        scenario.epiBenefitPerCohort,
      epiBenefitAllCohortsINR:
        scenario.epiBenefitAllCohorts
    },
    benefitCostResults: {
      bcrPerCohortEpidemiological:
        scenario.bcrPerCohort,
      bcrNationalEpidemiological:
        scenario.natBcr,
      netBenefitPerCohortINR:
        scenario.netBenefitPerCohort,
      netBenefitAllCohortsINR:
        scenario.netBenefitAllCohorts,
      wtpOutbreakComponentAllCohortsINR:
        scenario.wtpOutbreakComponent,
      totalWtpAllCohortsINR:
        scenario.wtpAllCohorts
    }
  };
}

function initCopilot() {
  const btn = document.getElementById(
    "copilot-open-and-copy-btn"
  );
  const textarea = document.getElementById(
    "copilot-prompt-output"
  );
  const statusPill = document.getElementById(
    "copilot-status-pill"
  );
  const statusText = document.getElementById(
    "copilot-status-text"
  );

  function setStatus(text) {
    if (statusPill) {
      statusPill.textContent = text;
    }
  }

  if (!btn || !textarea) return;

  btn.addEventListener("click", async () => {
    if (!appState.currentScenario) {
      showToast(
        "Apply a configuration before preparing the Copilot prompt.",
        "warning"
      );
      setStatus("Waiting for configuration");
      textarea.value =
        'Apply a configuration in STEPS and click "Open in Copilot and copy prompt" to generate the full interpretation prompt and scenario JSON.';
      return;
    }

    const scenarioJson = buildScenarioJsonForCopilot(
      appState.currentScenario
    );
    const jsonText = JSON.stringify(
      scenarioJson,
      null,
      2
    );

    const fullText =
      COPILOT_INTERPRETATION_PROMPT.trim() +
      "\n\nThe STEPS scenario JSON is provided below between the markers <SCENARIO_JSON> and </SCENARIO_JSON>. Use it as the quantitative evidence base for your policy brief.\n\n<SCENARIO_JSON>\n" +
      jsonText +
      "\n</SCENARIO_JSON>\n";

    textarea.value = fullText;
    setStatus("Prompt prepared");
    if (statusText) {
      statusText.textContent =
        "The Copilot interpretation text now reflects the most recent configuration. Copy all of it before pasting into Microsoft Copilot.";
    }

    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(
          fullText
        );
        copied = true;
        showToast(
          "Prompt copied to clipboard. Opening Microsoft Copilot.",
          "success"
        );
      } catch (e) {
        copied = false;
      }
    }

    if (!copied) {
      showToast(
        "The prompt has been prepared. Copy it from the panel and paste into Microsoft Copilot.",
        "warning"
      );
    }

    window.open(
      "https://copilot.microsoft.com/",
      "_blank"
    );
  });
}

/* ===========================
   Snapshot modal
   =========================== */

let snapshotModal = null;

function ensureSnapshotModal() {
  if (snapshotModal) return;
  snapshotModal = document.createElement("div");
  snapshotModal.className = "modal hidden";
  snapshotModal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" type="button" aria-label="Close">×</button>
      <h2>Scenario summary</h2>
      <div id="snapshot-body"></div>
    </div>
  `;
  document.body.appendChild(snapshotModal);

  const closeBtn = snapshotModal.querySelector(
    ".modal-close"
  );
  closeBtn.addEventListener("click", () => {
    snapshotModal.classList.add("hidden");
  });
  snapshotModal.addEventListener("click", (e) => {
    if (e.target === snapshotModal) {
      snapshotModal.classList.add("hidden");
    }
  });
}

function openSnapshotModal(scenario) {
  ensureSnapshotModal();
  const body = snapshotModal.querySelector(
    "#snapshot-body"
  );
  if (body) {
    const c = scenario.config;
    body.innerHTML = `
      <p><strong>Scenario name:</strong> ${
        c.name || ""
      }</p>
      <p><strong>Tier:</strong> ${c.tier}</p>
      <p><strong>Career incentive:</strong> ${
        c.career
      }</p>
      <p><strong>Mentorship:</strong> ${
        c.mentorship
      }</p>
      <p><strong>Delivery mode:</strong> ${
        c.delivery
      }</p>
      <p><strong>Response time:</strong> ${
        c.response
      } days</p>
      <p><strong>Cohorts and trainees:</strong> ${formatNumber(
        c.cohorts,
        0
      )} cohorts of ${formatNumber(
        c.traineesPerCohort,
        0
      )} trainees</p>
      <p><strong>Cost per trainee per month:</strong> ${formatCurrencyDisplay(
        c.costPerTraineePerMonth,
        0
      )}</p>
      <p><strong>Endorsement:</strong> ${formatNumber(
        scenario.endorseRate,
        1
      )}%</p>
      <p><strong>Economic cost per cohort:</strong> ${formatCurrencyDisplay(
        scenario.costs.totalEconomicCostPerCohort,
        0
      )}</p>
      <p><strong>Epidemiological benefit per cohort:</strong> ${formatCurrencyDisplay(
        scenario.epiBenefitPerCohort,
        0
      )}</p>
      <p><strong>Benefit cost ratio per cohort:</strong> ${
        scenario.bcrPerCohort !== null
          ? formatNumber(scenario.bcrPerCohort, 2)
          : "-"
      }</p>
      <p><strong>Total economic cost all cohorts:</strong> ${formatCurrencyDisplay(
        scenario.natTotalCost,
        0
      )}</p>
      <p><strong>Total epidemiological benefit all cohorts:</strong> ${formatCurrencyDisplay(
        scenario.epiBenefitAllCohorts,
        0
      )}</p>
      <p><strong>Net epidemiological benefit all cohorts:</strong> ${formatCurrencyDisplay(
        scenario.netBenefitAllCohorts,
        0
      )}</p>
    `;
  }
  snapshotModal.classList.remove("hidden");
}

/* ===========================
   Event wiring and refresh
   =========================== */

function refreshAllOutputs(scenario) {
  updateCostSliderLabel();
  updateConfigSummary(scenario);
  updateResultsTab(scenario);
  updateCostingTab(scenario);
  updateNationalSimulationTab(scenario);
  updateUptakeChart(scenario);
  updateBcrChart(scenario);
  updateEpiChart(scenario);
  refreshSensitivityTables();
  refreshSavedScenariosTable();
}

function initEventHandlers() {
  const costSlider = document.getElementById(
    "cost-slider"
  );
  if (costSlider) {
    costSlider.addEventListener("input", () => {
      updateCostSliderLabel();
    });
  }

  const currencyButtons = Array.from(
    document.querySelectorAll(".pill-toggle")
  );
  currencyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const currency =
        btn.getAttribute("data-currency");
      if (currency && currency !== appState.currency) {
        appState.currency = currency;
        updateCurrencyToggle();
      }
    });
  });

  const oppToggle = document.getElementById(
    "opp-toggle"
  );
  if (oppToggle) {
    oppToggle.addEventListener("click", () => {
      const on = oppToggle.classList.toggle("on");
      const label = oppToggle.querySelector(
        ".switch-label"
      );
      if (label) {
        label.textContent = on
          ? "Opportunity cost included"
          : "Opportunity cost excluded";
      }
      if (appState.currentScenario) {
        const newScenario = computeScenario(
          appState.currentScenario.config
        );
        appState.currentScenario = newScenario;
        refreshAllOutputs(newScenario);
      }
    });
  }

  const updateBtn = document.getElementById(
    "update-results"
  );
  if (updateBtn) {
    updateBtn.addEventListener("click", () => {
      const config = getConfigFromForm();
      const scenario = computeScenario(config);
      appState.currentScenario = scenario;
      refreshAllOutputs(scenario);
      showToast(
        "Configuration applied and results updated.",
        "success"
      );
    });
  }

  const snapshotBtn = document.getElementById(
    "open-snapshot"
  );
  if (snapshotBtn) {
    snapshotBtn.addEventListener("click", () => {
      if (!appState.currentScenario) {
        showToast(
          "Apply a configuration before opening the summary.",
          "warning"
        );
        return;
      }
      openSnapshotModal(appState.currentScenario);
    });
  }

  const saveScenarioBtn = document.getElementById(
    "save-scenario"
  );
  if (saveScenarioBtn) {
    saveScenarioBtn.addEventListener("click", () => {
      if (!appState.currentScenario) {
        showToast(
          "Apply a configuration before saving a scenario.",
          "warning"
        );
        return;
      }
      appState.savedScenarios.push(
        appState.currentScenario
      );
      refreshSavedScenariosTable();
      refreshSensitivityTables();
      showToast(
        "Scenario saved for comparison and export.",
        "success"
      );
    });
  }

  const exportExcelBtn = document.getElementById(
    "export-excel"
  );
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => {
      exportScenariosToExcel();
    });
  }

  const exportPdfBtn = document.getElementById(
    "export-pdf"
  );
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
      exportScenariosToPdf();
    });
  }

  const sensUpdateBtn = document.getElementById(
    "refresh-sensitivity-benefits"
  );
  if (sensUpdateBtn) {
    sensUpdateBtn.addEventListener("click", () => {
      if (!appState.currentScenario) {
        showToast(
          "Apply a configuration before updating the sensitivity summary.",
          "warning"
        );
        return;
      }
      refreshSensitivityTables();
      showToast(
        "Sensitivity summary updated.",
        "success"
      );
    });
  }

  const sensExcelBtn = document.getElementById(
    "export-sensitivity-benefits-excel"
  );
  if (sensExcelBtn) {
    sensExcelBtn.addEventListener("click", () => {
      exportSensitivityToExcel();
    });
  }

  const sensPdfBtn = document.getElementById(
    "export-sensitivity-benefits-pdf"
  );
  if (sensPdfBtn) {
    sensPdfBtn.addEventListener("click", () => {
      exportSensitivityToPdf();
    });
  }

  const epiToggle = document.getElementById(
    "sensitivity-epi-toggle"
  );
  if (epiToggle) {
    epiToggle.addEventListener("click", () => {
      const on =
        epiToggle.classList.toggle("on");
      const label = epiToggle.querySelector(
        ".switch-label"
      );
      if (label) {
        label.textContent = on
          ? "Outbreak benefits included"
          : "Outbreak benefits excluded";
      }
      refreshSensitivityTables();
    });
  }
}

/* ===========================
   Initialise
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  COST_CONFIG = COST_TEMPLATES;

  initTabs();
  initTooltips();
  initGuidedTour();
  initAdvancedSettings();
  initCopilot();
  initEventHandlers();
  updateCostSliderLabel();
  updateCurrencyToggle();

  const videoIframe = document.getElementById(
    "steps-video"
  );
  if (videoIframe) {
    videoIframe.src = STEPS_VIDEO_EMBED_URL;
  }
});
