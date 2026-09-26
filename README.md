# Tab Limiter

A cross-browser extension for **Zen Browser** (Firefox/Gecko) and **Chrome**
(Chromium) that caps the number of unpinned tabs per window. Open one too many
and it is closed immediately, with a badge and notification explaining why.

- One Manifest V3 codebase, no build step.
- Per-window limit, pinned tabs (and Zen Essentials) exempt.
- Configurable from the toolbar popup and the options page.
- Default limit: **10**.

---

## Files

```
manifest.json              # MV3; declares both service_worker (Chrome) and scripts (Firefox/Zen)
background.js              # enforcement: tabs.onCreated -> count -> close if over limit
popup/                     # toolbar popup: live "count / limit" + quick limit edit
options/                   # options page: limit, enable/disable, notes
icons/                     # 16/32/48/128 px + source SVG
```

`background.js` is written for a non-persistent context: listeners are
registered at the top level, all state lives in `storage`, and nothing relies
on globals surviving between events.

---

## Install in Chrome / Chromium

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder (the one containing
   `manifest.json`).

Unpacked extensions persist across browser restarts in Chrome. Chrome may warn
that the `background.scripts` key is unrecognized — harmless; Chrome uses
`service_worker`.

---

## Install in Zen Browser

Zen is Firefox-based, and Zen **release builds ignore
`xpinstall.signatures.required`**, so you cannot permanently install an unsigned
extension. You have two options.

### Option A — Temporary (simplest, no signing)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `manifest.json` in this folder.

It works fully, but Zen forgets it when you quit. Reload it after each restart.
Use **Reload** on its entry after you edit any file.

### Option B — Permanent (sign it as unlisted)

Requires a free Mozilla account and Node.js.

1. Get an AMO API key/secret: <https://addons.mozilla.org/en-US/developers/addon/api/key/>
2. Sign the add-on (this does **not** publish it publicly):

   ```sh
   npx web-ext sign \
     --source-dir . \
     --channel unlisted \
     --api-key "YOUR_JWT_ISSUER" \
     --api-secret "YOUR_JWT_SECRET"
   ```

3. The signed `.xpi` appears in `web-ext-artifacts/`.
4. In Zen: `about:addons` → gear icon → **Install Add-on From File…** → pick the
   `.xpi`.

The signed add-on now survives restarts and updates.

> The `browser_specific_settings.gecko.id`
> (`{008111df-42af-4097-a1df-72a41d7e9edd}`) in the manifest is what AMO uses to
> tie signatures to this add-on. Keep it stable. This is a per-developer GUID;
> if you fork this project, generate your own (`python3 -c "import uuid; print(uuid.uuid4())"`).

---

## Usage

- Click the toolbar icon to see `N of LIMIT tabs used` for the active window and
  change the limit.
- Use the **Options** link (or the extensions manager) for the limit, the
  enable/disable toggle, and notes.
- Settings are stored in `storage.sync` so they follow your Chrome profile;
  in Firefox/Zen they are stored locally unless Firefox Sync is enabled.

---

## Behavior & edge cases

- **Counts unpinned tabs only.** Pinned tabs and Zen Essentials are exempt and
  never count toward the limit.
- **Per window.** Each window has its own count; opening a new window starts
  fresh.
- **Any unpinned tab counts**, including background tabs (Ctrl/Cmd+click) and
  links opened with `target="_blank"`. There is no reliable way to distinguish
  only manually created tabs, so all unpinned tabs are enforced uniformly.
- **Startup grace period.** For ~5 seconds after browser startup, enforcement is
  paused so session restore / "continue where you left off" is not interrupted.
- **Lowering the limit** never closes tabs that are already open; only new tabs
  are blocked from then on.
- Closing a new tab can be reverted with the browser's own "reopen closed tab"
  shortcut, but it will be closed again if you are still over the limit.

---

## Troubleshooting

- **Extension gone after restarting Zen?** That is expected for a temporary
  add-on. Use Option B to sign it, or reload it from `about:debugging`.
- **No notification appears?** The badge on the toolbar icon still shows `!`.
  Check that notifications are allowed for the browser at the OS level.
- **A tab I opened wasn't closed?** If you are within the startup grace period,
  or the tab is pinned, it is intentionally allowed.
