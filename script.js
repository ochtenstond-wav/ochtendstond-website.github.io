console.log("EBBEN VISUALS ACTIVE");

const state = {
  step: 0,
  totalSteps: 4,
  projects: JSON.parse(localStorage.getItem("ebbenProjects") || "[]"),
  selected: {
    goals: [],
    styles: [],
    formats: []
  },
  latestBreakdown: null,
  latestInput: null
};

const stepNames = ["Project", "Stijl", "Locatie & timing", "Deliverables"];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("nextUrl").value = makeThanksUrl();

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

function nextStep() {
  if (state.step === 0 && !validateRequired(["clientName", "clientEmail", "projectIdea"])) return;

  if (state.step < state.totalSteps - 1) {
    state.step++;
    renderStep();
    return;
  }

  generateBreakdown();
  fillMailFields();
  saveProject(state.latestBreakdown, state.latestInput);
  renderDashboard();
  document.getElementById("client-form").submit();
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

function saveProject(breakdown, input) {
  const project = {
    id: Date.now(),
    name: breakdown.projectName,
    client: input.clientName,
    deadline: input.deadline,
    shootDate: input.shootDate,
    status: "Nieuw"
  };

  state.projects.unshift(project);
  localStorage.setItem("ebbenProjects", JSON.stringify(state.projects));
}

function renderDashboard() {
  document.getElementById("metric-active").textContent = state.projects.length;
  document.getElementById("metric-total").textContent = state.projects.length;
  document.getElementById("metric-next").textContent = state.projects[0]?.shootDate || "—";

  const list = document.getElementById("project-list");

  if (!state.projects.length) {
    list.innerHTML = `<p class="muted">Nog geen projecten. Vul eerst de intake in.</p>`;
    return;
  }

  list.innerHTML = state.projects.map((project) => `
    <article class="project-row">
      <span class="status">${escapeHtml(project.status)}</span>
      <div class="project-info">
        <strong>${escapeHtml(project.name)}</strong>
        <span>${escapeHtml(project.client)} · deadline: ${escapeHtml(project.deadline)}</span>
      </div>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
