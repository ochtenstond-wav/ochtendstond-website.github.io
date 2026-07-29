console.log("OCHTENDSTOND VISUALS ACTIVE");

const SHEET_WEB_APP_URL = document.body.dataset.webAppUrl || "https://script.google.com/macros/s/AKfycbzLbycL-A6nz-YAASXNSmbKkDYXyIheULGhSSXOK90BV1Yz51OiFy1w2h7F3xZlA-pELA/exec";
const REQUEST_TIMEOUT_MS = 30000;

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
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        button.classList.toggle("selected");
        button.setAttribute("aria-pressed", button.classList.contains("selected") ? "true" : "false");
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
  document.getElementById("nextBtn").addEventListener("click", nextStep);
  document.getElementById("client-form").addEventListener("submit", handleFormSubmit);
  document.getElementById("unlockDashboard").addEventListener("click", unlockDashboard);
  document.getElementById("dashboardPassword").addEventListener("keydown", (event) => {
    if (event.key === "Enter") unlockDashboard();
  });

  renderStep();
});

function makeThanksUrl() {
  const path = window.location.pathname.replace(/\/[^/]*$/, "/thanks.html");
  return `${window.location.origin}${path}`;
}

function openTab(tabId) {
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((tab) => {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });
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
  setText("nextBtn", state.step === state.totalSteps - 1 ? "Verzend projectaanvraag" : "Volgende");
}

function handleFormSubmit(event) {
  event.preventDefault();

  if (state.step < state.totalSteps - 1) {
    nextStep();
    return;
  }

  submitProjectRequest();
}

function nextStep() {
  if (isSubmittingProject) return;
  if (!validateCurrentStep()) return;

  if (state.step < state.totalSteps - 1) {
    state.step++;
    renderStep();
    return;
  }

  submitProjectRequest();
}

function previousStep() {
  if (isSubmittingProject || state.step === 0) return;
  state.step--;
  renderStep();
}

async function submitProjectRequest() {
  if (isSubmittingProject || !validateRequired() || !validateSelections()) return;

  isSubmittingProject = true;
  setSubmitState(true, "Aanvraag verzenden...");

  generateBreakdown();

  try {
    postProjectNoCors(buildProjectPayload());
    window.setTimeout(() => {
      redirectToThanks();
    }, 1200);
  } catch (error) {
    console.error("Projectaanvraag kon niet verzonden worden:", error);
    isSubmittingProject = false;
    setSubmitState(false, getFriendlyError(error));
  }
}

function postProjectNoCors(payload) {
  const body = new URLSearchParams();

  Object.entries(payload).forEach(([name, value]) => {
    body.append(name, value || "");
  });

  fetch(SHEET_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    body
  }).catch((error) => {
    console.error("Achtergrondverzending kon niet bevestigd worden:", error);
  });
}

function redirectToThanks() {
  try {
    window.location.href = makeThanksUrl();
  } catch (error) {
    window.location.href = "thanks.html";
  }
}

function validateRequired() {
  const requiredIds = ["clientName", "clientEmail", "projectIdea"];

  for (const id of requiredIds) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.focus();
      setText("formStatus", "Vul naam, e-mailadres en projectomschrijving in.");
      return false;
    }

    if (el.type === "email" && !el.checkValidity()) {
      el.focus();
      setText("formStatus", "Vul een geldig e-mailadres in.");
      return false;
    }
  }

  setText("formStatus", "");
  return true;
}

function validateCurrentStep() {
  if (state.step === 0) {
    return validateRequired() && validateGroup("goals", "Kies minstens een doel voor de video.");
  }

  if (state.step === 1) {
    return validateGroup("styles", "Kies minstens een sfeer of stijl.");
  }

  return true;
}

function validateSelections() {
  if (!validateGroup("goals", "Kies minstens een doel voor de video.")) {
    state.step = 0;
    renderStep();
    return false;
  }

  if (!validateGroup("styles", "Kies minstens een sfeer of stijl.")) {
    state.step = 1;
    renderStep();
    return false;
  }

  return true;
}

function validateGroup(group, message) {
  if (state.selected[group].length) {
    setText("formStatus", "");
    return true;
  }

  setText("formStatus", message);
  const grid = document.querySelector(`[data-group="${group}"]`);
  const firstOption = grid?.querySelector(".option");
  if (firstOption) firstOption.focus();
  return false;
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
    action: "create",
    projectName: b.projectName,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientContact: input.clientContact,
    projectIdea: input.projectIdea,
    goals: input.goals.join(", "),
    styles: input.styles.join(", "),
    formats: input.formats.join(", "),
    references: input.references,
    location: input.location,
    shootDate: input.shootDate,
    deadline: input.deadline,
    music: input.music,
    budget: input.budget,
    extraInfo: input.extraInfo,
    concept: b.concept,
    shotlist: b.shots.join(" | "),
    equipment: b.equipment.join(" | "),
    planning: b.planning.map((p) => `${p.phase}: ${p.action}`).join(" | "),
    deliverables: b.deliverables.join(" | "),
    attention: b.attention
  };
}

function submitHiddenPost(payload) {
  return new Promise((resolve, reject) => {
    const iframeName = `sheet-submit-frame-${Date.now()}`;
    const iframe = document.createElement("iframe");
    const form = document.createElement("form");
    let settled = false;

    const cleanup = () => {
      form.remove();
      iframe.remove();
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Verzenden duurde te lang."));
    }, REQUEST_TIMEOUT_MS);

    iframe.name = iframeName;
    iframe.className = "hidden";
    iframe.title = "Project database submission";
    iframe.addEventListener("load", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve();
    });

    form.method = "POST";
    form.action = SHEET_WEB_APP_URL;
    form.target = iframeName;
    form.style.display = "none";

    Object.entries(payload).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value || "";
      form.appendChild(input);
    });

    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
}

function renderBreakdown(data, input) {
  const output = document.getElementById("breakdown-output");

  output.innerHTML = `
    <p class="muted">Mail-preview: deze info wordt automatisch naar Ebben gestuurd na verzenden.</p>
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
  loadProjectsFromSheet(dashboardPassword)
    .then((payload) => {
      if (!payload.ok) {
        setText("dashboardError", payload.error || "Dashboard kon niet laden.");
        return;
      }

      state.projects = payload.projects || [];
      document.getElementById("dashboard-lock").classList.add("hidden");
      document.getElementById("dashboard-content").classList.remove("hidden");
      renderDashboard();
    })
    .catch(() => setText("dashboardError", "Dashboard kon niet laden. Controleer je Apps Script-deployment."));
}

function loadProjectsFromSheet(password) {
  return new Promise((resolve, reject) => {
    const callbackName = `ochtendstondProjects_${Date.now()}`;
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Dashboard laden duurde te lang."));
    }, REQUEST_TIMEOUT_MS);

    window[callbackName] = (payload) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error("Dashboard-script kon niet laden."));
    };

    script.src = `${SHEET_WEB_APP_URL}?action=list&password=${encodeURIComponent(password)}&callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

function renderDashboard() {
  const activeProjects = state.projects.filter((project) => project.status !== "Afgewerkt");
  setText("metric-active", activeProjects.length);
  setText("metric-total", state.projects.length);
  setText("metric-next", activeProjects[0]?.shootDate || "-");

  const list = document.getElementById("project-list");
  const detail = document.getElementById("project-detail");

  if (!state.projects.length) {
    list.innerHTML = `<p class="muted">Nog geen projecten. Vul eerst de intake in.</p>`;
    detail.classList.add("hidden");
    return;
  }

  list.innerHTML = state.projects.map((project) => `
    <article class="project-row ${project.status === "Afgewerkt" ? "project-row-completed" : ""}" data-project-id="${escapeHtml(project.id)}">
      <span class="status">${escapeHtml(project.status)}</span>
      <div class="project-info">
        <strong>${escapeHtml(project.projectName)}</strong>
        <span>${escapeHtml(project.clientName)} - deadline: ${escapeHtml(project.deadline)}</span>
      </div>
    </article>
  `).join("");

  list.querySelectorAll(".project-row").forEach((row) => {
    row.addEventListener("click", () => renderProjectDetail(row.dataset.projectId));
  });

  renderProjectDetail(state.selectedProjectId || state.projects[0].id);
}

function renderProjectDetail(projectId) {
  const project = state.projects.find((item) => item.id === String(projectId));
  const detail = document.getElementById("project-detail");
  if (!project) return;

  state.selectedProjectId = project.id;
  detail.classList.remove("hidden");

  const isDone = project.status === "Afgewerkt";
  detail.innerHTML = `
    ${card("ti ti-id", "Project info", rows([
      ["Projectnaam", project.projectName],
      ["Klant", project.clientName],
      ["E-mail", project.clientEmail],
      ["Contact", project.clientContact],
      ["Opnamedatum", project.shootDate],
      ["Deadline", project.deadline],
      ["Status", project.status]
    ]))}
    <button class="btn btn-primary" type="button" id="completeProjectBtn" ${isDone ? "disabled" : ""}>
      ${isDone ? "Project afgerond" : "Project afronden"}
    </button>
  `;

  const button = document.getElementById("completeProjectBtn");
  if (button && !isDone) {
    button.addEventListener("click", () => completeProject(project.id));
  }
}

function completeProject(projectId) {
  const project = state.projects.find((item) => item.id === String(projectId));
  const button = document.getElementById("completeProjectBtn");
  if (!project) return;

  if (button) {
    button.disabled = true;
    button.textContent = "Afronden...";
  }

  const completedChecklist = (project.checklist || []).map((item) => ({
    label: item.label,
    done: true
  }));

  submitHiddenPost({
    action: "updateChecklist",
    password: dashboardPassword,
    id: project.id,
    checklistJson: JSON.stringify(completedChecklist)
  })
    .then(() => loadProjectsFromSheet(dashboardPassword))
    .then((payload) => {
      if (payload.ok) {
        state.projects = payload.projects || [];
        renderDashboard();
      }
    })
    .catch(() => {
      if (button) {
        button.disabled = false;
        button.textContent = "Project afronden";
      }
    });
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
  const submitButton = document.getElementById("submitProjectBtn");
  const nextButton = document.getElementById("nextBtn");
  const backButton = document.getElementById("backBtn");

  if (submitButton) {
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? "Verzenden..." : "Projectaanvraag verzenden";
  }

  if (nextButton) {
    nextButton.disabled = isBusy;
    nextButton.textContent = isBusy ? "Verzenden..." : "Verzend projectaanvraag";
  }
  if (backButton) backButton.disabled = isBusy;
  setText("formStatus", message || "");
}

function getFriendlyError(error) {
  const message = String(error?.message || "");

  if (message.includes("duurde te lang")) {
    return "De verbinding met het aanvraagsysteem duurde te lang. Controleer je internet en probeer opnieuw.";
  }

  if (!SHEET_WEB_APP_URL || !SHEET_WEB_APP_URL.startsWith("https://script.google.com/")) {
    return "De website mist een geldige Google Apps Script-link.";
  }

  return "Verzenden lukte niet. Probeer opnieuw of mail rechtstreeks naar ochtendstond@gmail.com.";
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
