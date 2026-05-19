console.log("EBBEN VISUALS ACTIVE");

const SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycby7mgIi9c5SYGJV10z1ixNDh87Q_-Te4Ua0TnD5AAR8aXWYus8ktFYtynhPVs1CZ0Y-lA/exec";

let dashboardPassword = "";
let isSubmittingToWeb3Forms = false;

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
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("redirectUrl").value = makeThanksUrl();

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
        const arr = state.selected[group];

        if (arr.includes(value)) {
          state.selected[group] = arr.filter((item) => item !== value);
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
  renderDashboard();
});

function makeThanksUrl() {
  const path = window.location.pathname.replace(/\/[^/]*$/, "/thanks.html");
  return `${window.location.origin}${path}`;
}

function openTab(tabId) {
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
  document.getElementById(tabId).classList.add("active");

  if (tabId === "dashboard-panel") {
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

  document.getElementById("step-label").textContent =
    `Stap ${state.step + 1} van ${state.totalSteps} — ${stepNames[state.step]}`;

  document.getElementById("backBtn").style.visibility = state.step === 0 ? "hidden" : "visible";
  document.getElementById("nextBtn").textContent =
    state.step === state.totalSteps - 1 ? "Verzend projectaanvraag →" : "Volgende →";
}

function handleFormSubmit(event) {
  if (isSubmittingToWeb3Forms) return;
  event.preventDefault();

  if (state.step < state.totalSteps - 1) {
    nextStep();
    return;
  }

  submitProjectRequest();
}

function nextStep() {
  if (state.step === 0 && !validateRequired(["clientName", "clientEmail", "projectIdea"])) return;

  if (state.step < state.totalSteps - 1) {
    state.step++;
    renderStep();
    return;
  }

  submitProjectRequest();
}

function submitProjectRequest() {
  generateBreakdown();
  fillMailFields();
  postProjectToSheet();

  setTimeout(() => {
    isSubmittingToWeb3Forms = true;
    document.getElementById("client-form").submit();
  }, 700);
}

function previousStep() {
  if (state.step > 0) {
    state.step--;
    renderStep();
  }
}

function validateRequired(ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.focus();
      return false;
    }
  }
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
    clientContact: getValue("clientContact", "Niet opgegeven"),
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
    projectName: createProjectName(input),
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

  state.latestBreakdown = breakdown;
  state.latestInput = input;
  renderBreakdown(breakdown, input);

  document.getElementById("empty-breakdown").classList.add("hidden");
  document.getElementById("breakdown-output").classList.remove("hidden");
}

function fillMailFields() {
  const b = state.latestBreakdown;
  const input = state.latestInput;
  if (!b || !input) return;

  document.getElementById("web3Name").value = input.clientName;
  document.getElementById("mailReplyTo").value = input.clientEmail;
  document.getElementById("mailSubject").value = `Nieuwe projectaanvraag — ${b.projectName}`;
  document.getElementById("mailGoals").value = input.goals.join(", ") || "Niet opgegeven";
  document.getElementById("mailStyles").value = input.styles.join(", ") || "Niet opgegeven";
  document.getElementById("mailFormats").value = input.formats.join(", ") || "Niet opgegeven";
  document.getElementById("mailProjectName").value = b.projectName;
  document.getElementById("mailConcept").value = b.concept;
  document.getElementById("mailShotlist").value = b.shots.join(" | ");
  document.getElementById("mailEquipment").value = b.equipment.join(" | ");
  document.getElementById("mailPlanning").value = b.planning.map((p) => `${p.phase}: ${p.action}`).join(" | ");
  document.getElementById("mailDeliverables").value = b.deliverables.join(" | ");
  document.getElementById("mailAttention").value = b.attention;
  document.getElementById("web3Message").value = buildMailMessage(b, input);
}

function buildMailMessage(b, input) {
  return [
    `Project: ${b.projectName}`,
    `Klant: ${input.clientName}`,
    `E-mail: ${input.clientEmail}`,
    `Contact: ${input.clientContact}`,
    `Omschrijving: ${input.projectIdea}`,
    `Doelen: ${input.goals.join(", ") || "Niet opgegeven"}`,
    `Sfeer: ${input.styles.join(", ") || "Niet opgegeven"}`,
    `Referenties: ${input.references}`,
    `Locatie: ${input.location}`,
    `Opnamedatum: ${input.shootDate}`,
    `Deadline: ${input.deadline}`,
    `Budget: ${input.budget}`,
    `Formaten: ${input.formats.join(", ") || "Niet opgegeven"}`,
    `Muziek/audio: ${input.music}`,
    `Extra info: ${input.extraInfo}`,
    "",
    `Concept: ${b.concept}`,
    `Shotlist: ${b.shots.join(" | ")}`,
    `Equipment: ${b.equipment.join(" | ")}`,
    `Planning: ${b.planning.map((p) => `${p.phase}: ${p.action}`).join(" | ")}`,
    `Deliverables: ${b.deliverables.join(" | ")}`,
    `Aandachtspunten: ${b.attention}`
  ].join("\n");
}

function postProjectToSheet() {
  const b = state.latestBreakdown;
  const input = state.latestInput;
  if (!b || !input) return;

  const payload = {
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

  submitHiddenPost(payload);
}

function submitHiddenPost(payload) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = SHEET_WEB_APP_URL;
  form.target = "sheet-submit-frame";
  form.style.display = "none";

  Object.entries(payload).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function createProjectName(input) {
  const type = input.goals[0] || "Video";
  return `${input.clientName} — ${type}`;
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

function card(icon, title, body) {
  return `
    <article class="breakdown-card">
      <div class="breakdown-header">
        <i class="${icon}"></i>
        <h3>${title}</h3>
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

function unlockDashboard() {
  const input = document.getElementById("dashboardPassword");
  dashboardPassword = input.value.trim();

  if (!dashboardPassword) {
    document.getElementById("dashboardError").textContent = "Vul een wachtwoord in.";
    input.focus();
    return;
  }

  document.getElementById("dashboardError").textContent = "Dashboard laden...";
  loadProjectsFromSheet(dashboardPassword).then((payload) => {
    if (!payload.ok) {
      document.getElementById("dashboardError").textContent = payload.error || "Dashboard kon niet laden.";
      return;
    }

    state.projects = payload.projects || [];
    document.getElementById("dashboard-lock").classList.add("hidden");
    document.getElementById("dashboard-content").classList.remove("hidden");
    renderDashboard();
  });
}

function loadProjectsFromSheet(password) {
  return new Promise((resolve) => {
    const callbackName = `ochtendstondProjects_${Date.now()}`;

    window[callbackName] = (payload) => {
      delete window[callbackName];
      script.remove();
      resolve(payload);
    };

    const script = document.createElement("script");
    script.src = `${SHEET_WEB_APP_URL}?action=list&password=${encodeURIComponent(password)}&callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

function renderDashboard() {
  if (!dashboardPassword) return;

  const activeProjects = state.projects.filter((project) => project.status !== "Afgewerkt");
  document.getElementById("metric-active").textContent = activeProjects.length;
  document.getElementById("metric-total").textContent = state.projects.length;
  document.getElementById("metric-next").textContent = activeProjects[0]?.shootDate || "—";

  const list = document.getElementById("project-list");

  if (!state.projects.length) {
    list.innerHTML = `<p class="muted">Nog geen projecten. Vul eerst de intake in.</p>`;
    document.getElementById("project-detail").classList.add("hidden");
    return;
  }

  list.innerHTML = state.projects.map((project) => `
    <article class="project-row" data-project-id="${escapeHtml(project.id)}">
      <span class="status">${escapeHtml(project.status)}</span>
      <div class="project-info">
        <strong>${escapeHtml(project.projectName)}</strong>
        <span>${escapeHtml(project.clientName)} · deadline: ${escapeHtml(project.deadline)}</span>
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
  if (!project) return;

  const completedChecklist = (project.checklist || []).map((item) => ({
    label: item.label,
    done: true
  }));

  submitHiddenPost({
    action: "updateChecklist",
    password: dashboardPassword,
    id: project.id,
    checklistJson: JSON.stringify(completedChecklist)
  });

  setTimeout(() => {
    loadProjectsFromSheet(dashboardPassword).then((payload) => {
      if (payload.ok) {
        state.projects = payload.projects || [];
        renderDashboard();
      }
    });
  }, 900);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

.project-row-active {
  border-color: var(--accent);
  background: rgba(139, 125, 255, 0.14);
}

.project-row-completed {
  opacity: 0.48;
  filter: grayscale(1);
}

.project-row-completed .status {
  color: #d7d7d7;
  background: rgba(255, 255, 255, 0.08);
}

#completeProjectBtn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
