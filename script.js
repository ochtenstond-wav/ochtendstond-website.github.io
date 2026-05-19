let currentStep = 0;
const totalSteps = 4;

const steps = document.querySelectorAll(".form-step");
const dots = document.querySelectorAll(".step-dot");
const stepLabel = document.getElementById("step-label");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const form = document.querySelector("form");

const labels = [
  "Stap 1 van 4 — Project",
  "Stap 2 van 4 — Stijl",
  "Stap 3 van 4 — Locatie & timing",
  "Stap 4 van 4 — Deliverables"
];

document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll(".option").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("selected");
    updateHiddenFields();
  });
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    openPanel(tab.dataset.tab);
  });
});

document.querySelectorAll("[data-open-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    openPanel(button.dataset.openTab);
  });
});

nextBtn.addEventListener("click", () => {
  if (currentStep < totalSteps - 1) {
    currentStep++;
    updateSteps();
  } else {
    updateHiddenFields();
    form.submit();
  }
});

backBtn.addEventListener("click", () => {
  if (currentStep > 0) {
    currentStep--;
    updateSteps();
  }
});

function updateSteps() {
  steps.forEach((step, index) => {
    step.classList.toggle("active", index === currentStep);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentStep);
    dot.classList.toggle("done", index < currentStep);
  });

  stepLabel.textContent = labels[currentStep];

  backBtn.style.visibility = currentStep === 0 ? "hidden" : "visible";
  nextBtn.textContent = currentStep === totalSteps - 1 ? "Verzenden →" : "Volgende →";
}

function openPanel(panelId) {
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.remove("active");
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  document.getElementById(panelId).classList.add("active");

  const activeTab = document.querySelector(`[data-tab="${panelId}"]`);
  if (activeTab) activeTab.classList.add("active");
}

function selectedOptions(group) {
  return Array.from(
    document.querySelectorAll(`[data-group="${group}"] .option.selected`)
  ).map((btn) => btn.textContent.trim());
}

function updateHiddenFields() {
  document.getElementById("mailGoals").value = selectedOptions("goals").join(", ");
  document.getElementById("mailStyles").value = selectedOptions("styles").join(", ");
  document.getElementById("mailFormats").value = selectedOptions("formats").join(", ");
}

updateSteps();
