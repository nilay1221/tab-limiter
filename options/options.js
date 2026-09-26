"use strict";

const api = globalThis.browser ?? globalThis.chrome;
const settingsStore = api.storage.sync || api.storage.local;
const DEFAULT_LIMIT = 10;

const els = {
  form: document.getElementById("form"),
  limit: document.getElementById("limit"),
  enabled: document.getElementById("enabled"),
  status: document.getElementById("status"),
};

let statusTimer = null;

function flashStatus(message) {
  els.status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    els.status.textContent = "";
  }, 2500);
}

async function load() {
  const raw = await settingsStore.get({ limit: DEFAULT_LIMIT, enabled: true });
  let limit = Math.floor(Number(raw.limit));
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  els.limit.value = limit;
  els.enabled.checked = raw.enabled !== false;
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();

  let limit = Math.floor(Number(els.limit.value));
  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }

  await settingsStore.set({
    limit,
    enabled: els.enabled.checked,
  });

  els.limit.value = limit;
  flashStatus("Saved");
});

load().catch((err) => {
  console.warn("[Tab Limiter]", err);
  flashStatus("Could not load settings");
});
