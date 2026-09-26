"use strict";

const api = globalThis.browser ?? globalThis.chrome;
const settingsStore = api.storage.sync || api.storage.local;
const DEFAULT_LIMIT = 10;

const els = {
  status: document.getElementById("status"),
  meterBar: document.getElementById("meterBar"),
  limit: document.getElementById("limit"),
  enabled: document.getElementById("enabled"),
  form: document.getElementById("form"),
  openOptions: document.getElementById("openOptions"),
};

async function getSettings() {
  const raw = await settingsStore.get({ limit: DEFAULT_LIMIT, enabled: true });
  let limit = Math.floor(Number(raw.limit));
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  return { limit, enabled: raw.enabled !== false };
}

async function countUnpinnedTabs() {
  const tabs = await api.tabs.query({ currentWindow: true, pinned: false });
  return tabs.length;
}

function render(count, limit) {
  const over = count > limit;
  els.status.textContent = "";
  if (over) {
    const span = document.createElement("span");
    span.className = "over";
    span.textContent = `${count} tabs — over the limit of ${limit}`;
    els.status.appendChild(span);
  } else {
    els.status.textContent = `${count} of ${limit} tabs used`;
  }
  const pct = limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 100;
  els.meterBar.style.width = pct + "%";
  els.meterBar.classList.toggle("over", over);
}

async function refresh() {
  const [{ limit, enabled }, count] = await Promise.all([
    getSettings(),
    countUnpinnedTabs(),
  ]);
  els.limit.value = limit;
  els.enabled.checked = enabled;
  els.limit.disabled = !enabled;
  render(count, limit);
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  let limit = Math.floor(Number(els.limit.value));
  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }
  els.limit.value = limit;
  await settingsStore.set({ limit });
  await refresh();
  els.limit.blur();
});

els.enabled.addEventListener("change", async () => {
  await settingsStore.set({ enabled: els.enabled.checked });
  await refresh();
});

els.openOptions.addEventListener("click", (event) => {
  event.preventDefault();
  if (api.runtime.openOptionsPage) {
    api.runtime.openOptionsPage();
  }
});

api.storage.onChanged.addListener(() => {
  refresh().catch(() => {});
});

// Clear any stale "limit reached" badge while the popup is open.
if (api.action && api.action.setBadgeText) {
  api.action.setBadgeText({ text: "" }).catch(() => {});
}

refresh().catch((err) => {
  els.status.textContent = "Could not read tab count";
  console.warn("[Tab Limiter]", err);
});
