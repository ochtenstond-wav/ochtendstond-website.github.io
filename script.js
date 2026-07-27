console.log("OCHTENDSTOND VISUALS ACTIVE");

// FormSubmit.co endpoint - geen backend nodig, automatisch e-mail
const EMAIL_SERVICE_URL = "https://formsubmit.co/ajax/ochtendstond@gmail.com";
const REQUEST_TIMEOUT_MS = 12000;

let dashboardPassword = "";
let isSubmittingProject = false;

const state = {
  step: 0,
  totalSteps: 4,
  projects: [],
  selected: {
    goals: [],
    styles: [],
    formats: []
  },
  latestBreakdown: null,
  latestInput: null,
  selectedProjectId: null
};

const stepNames = ["Project", "Stijl", "Locatie & timing", "Deliverables"];

document.addEventListener("DOMContentLoaded", () => {
  setText("year", new Date().getFullYear());

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => openTab(button.dataset.tab));
  });

  document.querySelectorAll("[data-open-tab]").forEach((button) => {
    button.addEventListener("click", () => openTab(button.dataset.openTab));
  });

  document.querySelectorAll(".option-grid").forEach((grid) => {
    const group = grid.dataset.group;

    grid.querySelectorAll(".option").forEach((button) => {
      button.addEventListener("click", () => {
        button.classList.toggle("selected");
        const value = button.textContent.trim();
        const values = state.selected[group];

        if (values.includes(value)) {
          state.selected[group] = values.filter((item) => item !== value);
        } else {
          state.selected[group].push(value);
        }
      });
    });
  });

  document.getElementById("backBtn").addEventListener("click", previousStep);
  document.getElementById("nextBtn").addEventListener("click", handleNextClick);
  document.getElementById("client-form").addEventListener("submit", handleFormSubmit);
  document.getElementById("unlockDashboard").addEventListener("click", unlockDashboard);
  document.getElementById("dashboardPassword").addEventListener("keydown", (event) => {
    if (event.key === "Enter") unlockDashboard();
  });

  renderStep();
});

function makeThanksUrl() {
  const path = window.location.pathname.replace(/\/[^\/]*$/, "/thanks.html");
  return `${window.location.origin}${path}`;
}

function openTab(tabId) {
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
  document.getElementById(tabId).classList.add("active");

  if (tabId === "dashboard-panel" && dashboardPassword) {
    renderDashboard();
  }
}

function renderStep() {
  document.querySelectorAll(".form-step").forEach((step) => {
    step.classList.toggle("active", Number(step.dataset.step) === state.step);
  });

  for (let i = 0; i < state.totalSteps; i++) {
    const dot = document.getElementById(`dot-${i}`);
    dot.className = "step-dot";
    if (i < state.step) dot.classList.add("done");
    if (i === state.step) dot.classList.add("active");
  }

  setText("step-label", `Stap ${state.step + 1} van ${state.totalSteps} - ${stepNames[state.step]}`);
  document.getElementById("backBtn").style.visibility = state.step === 0 ? "hidden" : "visible";
  document.getElementById("nextBtn").textContent = state.step === state.totalSteps - 1 ? "Projectaanvraag verzenden" : "Volgende";
}

function handleFormSubmit(event) {
  event.preventDefault();

  if (state.step < state.totalSteps - 1) {
    nextStep();
    return;
  }

  submitProjectRequest();
}

function handleNextClick(event) {
  event.preventDefault();
  
  if (state.step < state.totalSteps - 1) {
    nextStep();
    return;
  }

  submitProjectRequest();
}

function nextStep() {
  if (isSubmittingProject) return;
  if (state.step === 0 && !validateRequired()) return;

  if (state.step < state.totalSteps - 1) {
    state.step++;
    renderStep();
  }
}

function previousStep() {
  if (isSubmittingProject || state.step === 0) return;
  state.step--;
  renderStep();
}

async function submitProjectRequest() {
  if (isSubmittingProject || !validateRequired()) return;

  isSubmittingProject = true;
  setSubmitState(true, "Projectaanvraag verzenden...");

  try {
    generateBreakdown();
    await sendEmailViaFormSubmit(buildProjectPayload());
    window.location.href = makeThanksUrl();
  } catch (error) {
    console.error("Verzending mislukt:", error);
    isSubmittingProject = false;
    setSubmitState(false, "❌ Verzenden mislukt. Probeer opnieuw of mail rechtstreeks naar ochtendstond@gmail.com");
  }
}

function validateRequired() {
  const requiredIds = ["clientName", "clientEmail", "projectIdea"];

  for (const id of requiredIds) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.focus();
      setText("formStatus", "⚠️ Vul naam, e-mailadres en projectomschrijving in.");
      return false;
    }

    if (el.type === "email" && !el.checkValidity()) {
      el.focus();
      setText("formStatus", "⚠️ Vul een geldig e-mailadres in.");
      return false;
    }
  }

  setText("formStatus", "");
  return true;
}

function getValue(id, fallback = "Niet opgegeven") {
  const el = document.getElementById(id);
  const value = el ? el.value.trim() : "";
  return value || fallback;
}

function generateBreakdown() {
  const input = {
    clientName: getValue("clientName", "Nieuwe klant"),
    clientEmail: getValue("clientEmail", "Geen e-mail opgegeven"),
    clientContact: getValue("clientContact"),
    projectIdea: getValue("projectIdea", "Cinematic social video"),
    references: getValue("references", "Geen referenties opgegeven"),
    location: getValue("location", "Locatie nog te bepalen"),
    shootDate: getValue("shootDate", "Datum nog te bepalen"),
    deadline: getValue("deadline", "Deadline nog te bepalen"),
    music: getValue("music", "Muziek nog te bepalen"),
    budget: getValue("budget", "Budget nog niet opgegeven"),
    extraInfo: getValue("extraInfo", "Geen extra info"),
    goals: state.selected.goals,
    styles: state.selected.styles,
    formats: state.selected.formats
  };

  const mainStyle = input.styles[0] || "cinematic";
  const mainGoal = input.goals[0] || "social media";
  const mainFormat = input.formats[0] || "verticale en horizontale export";

  const breakdown = {
    projectName: `${input.clientName} - ${input.goals[0] || "Video"}`,
    client: input.clientName,
    concept: `Een ${mainStyle.toLowerCase()} video gericht op ${mainGoal.toLowerCase()}, met focus op sfeer, ritme, details en een duidelijke visuele identiteit.`,
    mood: input.styles.length ? input.styles.join(", ") : "Cinematic, modern, clean",
    shots: [
      "Wide establishing shot van locatie",
      "Close-ups van details, handen, textuur of product",
      "Bewegende gimbal shots voor energie",
      "Portretshots of interactie met talent",
      "Atmosferische b-roll voor pacing",
      "Eindshot met duidelijke brand/product focus"
    ],
    equipment: [
      "Camera body + 24-70mm lens",
      "Gimbal of handheld rig",
      "LED licht of kleine softbox",
      "ND filters voor buitenopnames",
      "Shotlist + opgeladen batterijen + backups"
    ],
    planning: [
      { phase: "Pre-productie", action: "Referenties verzamelen, stijl bepalen, locatie checken en shotlist finaliseren." },
      { phase: "Shoot", action: `Opnames op ${input.location}. Focus op hoofdshots, details, sfeer en extra b-roll.` },
      { phase: "Post-productie", action: "Selectie, montage, color grade, muziek/audio en export in gevraagde formaten." }
    ],
    deliverables: input.formats.length ? input.formats : [mainFormat, "Social media cut", "Final export"],
    attention: `Controleer vooraf locatie, timing, toestemming, muziekkeuze, budget en eventuele branding assets. Deadline: ${input.deadline}.`
  };

  state.latestInput = input;
  state.latestBreakdown = breakdown;
  renderBreakdown(breakdown, input);

  document.getElementById("empty-breakdown").classList.add("hidden");
  document.getElementById("breakdown-output").classList.remove("hidden");
}

function buildProjectPayload() {
  const b = state.latestBreakdown;
  const input = state.latestInput;

  return {
    Naam: input.clientName,
    Email: input.clientEmail,
    Telefoon: input.clientContact,
    Projectomschrijving: input.projectIdea,
    Doelen: input.goals.join(", "),
    Stijlen: input.styles.join(", "),
    Formaten: input.formats.join(", "),
    Referenties: input.references,
    Locatie: input.location,
    Opnamedatum: input.shootDate,
    Deadline: input.deadline,
    Muziek: input.music,
    Budget: input.budget,
    ExtraInfo: input.extraInfo,
    Concept: b.concept,
    Shotlist: b.shots.join(" | "),
    Equipment: b.equipment.join(" | "),
    Planning: b.planning.map((p) => `${p.phase}: ${p.action}`).join(" | "),
    Deliverables: b.deliverables.join(" | "),
    Aandachtspunten: b.attention,
    _captcha: "false"
  };
}

/**
 * Stuur e-mail via FormSubmit.co
 * Dit werkt zonder backend - je krijgt automatisch de data in je inbox
 */
function sendEmailViaFormSubmit(payload) {
  return new Promise((resolve, reject) => {
    fetch(EMAIL_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (response.ok) {
          console.log("✅ E-mail verzonden via FormSubmit.co");
          resolve();
        } else {
          console.error("❌ FormSubmit error:", response.status);
          reject(new Error(`HTTP ${response.status}`));
        }
      })
      .catch((error) => {
        console.error("❌ Network error:", error);
        reject(error);
      });
  });
}

function renderBreakdown(data, input) {
  const output = document.getElementById("breakdown-output");

  output.innerHTML = `
    <p class="muted">📧 Mail-preview: deze info wordt automatisch naar je inbox verzonden.</p>
    ${card("ti ti-id", "Project info", rows([
      ["Projectnaam", data.projectName],
      ["Klant", data.client],
      ["E-mail", input.clientEmail],
      ["Contact", input.clientContact],
      ["Locatie", input.location],
      ["Opnamedatum", input.shootDate],
      ["Deadline", input.deadline],
      ["Budget", input.budget]
    ]))}
    ${card("ti ti-bulb", "Concept & sfeer", rows([
      ["Projectomschrijving", input.projectIdea],
      ["Concept", data.concept],
      ["Sfeer", data.mood],
      ["Referenties", input.references]
    ]))}
    ${card("ti ti-camera", "Shotlist", pills(data.shots))}
    ${card("ti ti-device-camera-video", "Equipment", pills(data.equipment, "green"))}
    ${card("ti ti-calendar", "Planning", rows(data.planning.map((item) => [item.phase, item.action])))}
    ${card("ti ti-package-export", "Deliverables", pills(data.deliverables, "orange"))}
    ${card("ti ti-alert-triangle", "Aandachtspunten", `<p class="muted">${escapeHtml(data.attention)}</p>`)}
  `;
}

function unlockDashboard() {
  const input = document.getElementById("dashboardPassword");
  dashboardPassword = input.value.trim();

  if (!dashboardPassword) {
    setText("dashboardError", "Vul een wachtwoord in.");
    input.focus();
    return;
  }

  setText("dashboardError", "Dashboard laden...");
  setText("dashboardError", "Dashboard feature komt binnenkort. Controleer je e-mail voor projecten.");
}

function card(icon, title, body) {
  return `
    <article class="breakdown-card">
      <div class="breakdown-header">
        <i class="${icon}"></i>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="breakdown-body">${body}</div>
    </article>
  `;
}

function rows(items) {
  return items.map(([key, value]) => `
    <div class="breakdown-row">
      <span>${escapeHtml(key)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");
}

function pills(items, variant = "purple") {
  return `<div class="pill-list">${items.map((item) => `<span class="pill ${variant}">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function setSubmitState(isBusy, message) {
  const nextButton = document.getElementById("nextBtn");
  const backButton = document.getElementById("backBtn");

  if (nextButton) {
    nextButton.disabled = isBusy;
    if (isBusy) {
      nextButton.textContent = "Verzenden...";
    } else {
      nextButton.textContent = "Projectaanvraag verzenden";
    }
  }

  if (backButton) backButton.disabled = isBusy;
  setText("formStatus", message || "");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}