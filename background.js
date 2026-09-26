"use strict";

// Cross-browser handle:
// - Firefox / Zen expose `browser` (promise-based)
// - Chrome exposes only `chrome` (promise-based in MV3)
const api = globalThis.browser ?? globalThis.chrome;

const settingsStore = api.storage.sync || api.storage.local;
const runtimeStore = api.storage.local;

const DEFAULT_LIMIT = 10;
const GRACE_MS = 5000;
const NOTIFICATION_ID = "tab-limit-reached";

async function getSettings() {
  const raw = await settingsStore.get({
    limit: DEFAULT_LIMIT,
    enabled: true,
  });
  let limit = Math.floor(Number(raw.limit));
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  return { limit, enabled: raw.enabled !== false };
}

function beginGrace() {
  return runtimeStore.set({ graceUntil: Date.now() + GRACE_MS });
}

async function inGracePeriod() {
  const { graceUntil = 0 } = await runtimeStore.get({ graceUntil: 0 });
  return Number(graceUntil) > Date.now();
}

async function clearBadge() {
  if (!api.action || !api.action.setBadgeText) return;
  try {
    await api.action.setBadgeText({ text: "" });
  } catch (_) {
    /* badge not available */
  }
}

async function flagBlocked(limit) {
  if (api.action && api.action.setBadgeText) {
    try {
      await api.action.setBadgeBackgroundColor({ color: "#d93025" });
      await api.action.setBadgeText({ text: "!" });
      await api.action.setTitle({
        title: `Tab Limiter: ${limit}-tab limit reached`,
      });
    } catch (_) {
      /* badge not available */
    }
  }

  if (!api.notifications || !api.notifications.create) return;
  try {
    await api.notifications.create(NOTIFICATION_ID, {
      type: "basic",
      iconUrl: api.runtime.getURL("icons/icon-128.png"),
      title: "Tab limit reached",
      message: `Your limit is ${limit} unpinned tabs per window. The new tab was closed.`,
      priority: 0,
    });
  } catch (_) {
    /* notifications not available */
  }
}

async function enforce(tab) {
  if (!tab || tab.id === undefined) return;

  const { limit, enabled } = await getSettings();
  if (!enabled) {
    await clearBadge();
    return;
  }

  if (tab.pinned) return;
  if (await inGracePeriod()) return;

  const tabs = await api.tabs.query({
    windowId: tab.windowId,
    pinned: false,
  });

  if (tabs.length > limit) {
    try {
      await api.tabs.remove(tab.id);
    } catch (_) {
      return;
    }
    await flagBlocked(limit);
  } else {
    await clearBadge();
  }
}

api.tabs.onCreated.addListener((tab) => {
  enforce(tab).catch((err) => console.warn("[Tab Limiter]", err));
});

api.runtime.onStartup.addListener(() => {
  beginGrace().catch(() => {});
  clearBadge();
});

api.runtime.onInstalled.addListener((details) => {
  beginGrace().catch(() => {});
  clearBadge();
  if (details.reason === "install") {
    settingsStore
      .set({ limit: DEFAULT_LIMIT, enabled: true })
      .catch(() => {});
  }
});
