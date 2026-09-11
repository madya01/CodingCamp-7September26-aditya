# Implementation Plan: To-do List Life Dashboard

## Overview

Pure HTML/CSS/Vanilla JavaScript single-page application. No build step, no npm, no frameworks.
All code lives in `js/app.js` (IIFE), `css/style.css`, and `index.html`.
Property-based tests use the `fast-check` UMD bundle loaded directly in `tests/index.html`.

Tasks are ordered by dependency. Tasks 1 and 2 are already complete.

---

## Tasks

- [x] 1. HTML skeleton (`index.html`)
  - Semantic sections for all four widgets, theme-restore inline script, ARIA attributes, error banner, theme toggle button, and `<script src="js/app.js">` at end of `<body>`.
  - _Requirements: 1, 3, 5, 8, 10, 12_

- [x] 2. CSS foundation (`css/style.css`)
  - [x] 2.1 CSS custom properties — light theme token set
    - All colour, spacing, typography, radius, shadow, and transition tokens under `[data-theme="light"]` and `:root`.
    - _Requirements: 10.2, 10.5_
  - [x] 2.2 CSS custom properties — dark theme token set
    - Token overrides under `[data-theme="dark"]`; all colour pairs meet WCAG AA 4.5:1.
    - _Requirements: 10.2_
  - [x] 2.3 Widget-level styles and utility classes
    - `.widget-card`, responsive grid (`grid-template-areas`, `@media (min-width: 768px)`), `.validation-message`, `.hidden`, `.task-item`, `.task-name.completed` (strikethrough), `.timer-display`, `#theme-toggle` fixed positioning, `#error-banner` fixed positioning, edit-mode input styles.
    - _Requirements: 6.8, 10.2, 12.1, 12.2, 12.3_

- [x] 3. Storage Module (`js/app.js`)
  - [x] 3.1 Implement `Storage.read(key)` and `Storage.write(key, value)`
    - Define `Storage.KEYS` constant object with `TASKS`, `LINKS`, `SETTINGS`.
    - `read`: wrap `localStorage.getItem` + `JSON.parse` in try/catch; return `{ ok: true, data }` on success or `{ ok: false, error }` on any exception.
    - `write`: wrap `JSON.stringify` + `localStorage.setItem` in try/catch; return `{ ok: true }` or `{ ok: false, error }`.
    - Expose on `window._ldbTest` for test access.
    - _Requirements: 11.1, 11.4_
 
- [x] 4. Pure helper functions — formatting and greeting (`js/app.js`)
  - [x] 4.1 Implement `formatTime(date)`, `formatDate(date)`, `getGreetingPhrase(hour)`, `buildGreeting(phrase, name)`
    - `formatTime`: returns `HH:MM` (24-hour, zero-padded) from a `Date` object.
    - `formatDate`: returns `"DayName, DD MonthName YYYY"` using `toLocaleDateString` with explicit options or manual mapping so the format is deterministic.
    - `getGreetingPhrase`: maps integer hour 0–23 to `"Good Morning"` (5–11), `"Good Afternoon"` (12–17), `"Good Evening"` (18–20), `"Good Night"` (21–23, 0–4).
    - `buildGreeting`: returns `phrase + ", " + name.slice(0, 50)` when name is non-empty after trim; returns `phrase` otherwise.
    - Expose all four on `window._ldbTest`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
 
- [x] 5. Pure helper functions — validation (`js/app.js`)
  - [x] 5.1 Implement `validateTaskName(name, existing)`, `validateSessionDuration(value)`, `validateQuickLink(label, url)`, `toggleTheme(current)`, `generateId()`
    - `validateTaskName`: returns `{ valid: true }` or `{ valid: false, error: string }`. Rejects empty/whitespace-only; rejects > 200 chars; rejects case-insensitive duplicate against `existing` array.
    - `validateSessionDuration`: returns `true` iff value is an integer in `[1, 120]`; `false` for any non-integer, non-numeric, empty, or out-of-range input.
    - `validateQuickLink`: returns `{ valid: true }` or `{ valid: false, errors: { label?, url? } }`. Label 1–50 chars; URL 1–2048 chars starting with `http://` or `https://`.
    - `toggleTheme`: `'light' → 'dark'`, `'dark' → 'light'`.
    - `generateId`: returns a unique string (e.g. `"task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7)`).
    - Expose all on `window._ldbTest`.
    - _Requirements: 4.3, 5.3, 5.4, 5.5, 8.3, 10.2_

- [x] 6. Pure helper functions — timer display, sort, and storage parsing (`js/app.js`)
  - [x] 6.1 Implement `formatTimerDisplay(totalSeconds)`, `sortTasks(tasks, option)`, `parseStore(raw, key)`
    - `formatTimerDisplay`: returns `MM:SS` where MM = `Math.floor(s / 60)` zero-padded to 2 digits, SS = `s % 60` zero-padded to 2 digits. Input range `[0, 7200]`.
    - `sortTasks`: returns a **new** sorted array (does not mutate input). Options: `'default'` (creation order by `createdAt`), `'az'` (alphabetical, ties by `createdAt`), `'za'` (reverse alphabetical, ties by `createdAt`), `'completed-last'` (incomplete before complete, each group by `createdAt`).
    - `parseStore`: parses JSON string `raw`; on any failure (null, invalid JSON, wrong type) returns safe default: `[]` for `'ldb_tasks'`/`'ldb_links'`, default Settings object for `'ldb_settings'`.
    - Expose all three on `window._ldbTest`.
    - _Requirements: 3.1, 7.2, 11.3_

- [x] 8. State Module — data structures and bootstrap load (`js/app.js`)
  - [x] 8.1 Define `State` object with `tasks`, `quickLinks`, `settings`, `timer` fields
    - Declare `State` with arrays and default objects as shown in the design's State Module section.
    - `timer` object: `{ totalSeconds, remainingSeconds, running, intervalId, notified }`.
    - _Requirements: 3.2, 11.2, 11.3_
  - [x] 8.2 Implement `State.load()` — restore all three stores from `localStorage` on boot
    - Call `Storage.read` for each key; pass result to `parseStore`; populate `State.tasks`, `State.quickLinks`, `State.settings`.
    - Set `State.timer.totalSeconds` and `State.timer.remainingSeconds` from `settings.sessionDuration * 60`.
    - Collect any read errors and return them for the bootstrap phase to display.
    - _Requirements: 4.4, 5.6, 8.5, 10.5, 11.2, 11.3_

- [x] 9. State Module — task mutations (`js/app.js`)
  - [x] 9.1 Implement `State.addTask(name)`, `State.deleteTask(id)`, `State.toggleComplete(id)`, `State.updateTask(id, newName)`
    - `addTask`: validate with `validateTaskName`; on success push `{ id: generateId(), name: name.trim(), completed: false, createdAt: Date.now() }` to `State.tasks`; call `Storage.write`; return `{ ok, error? }`.
    - `deleteTask`: find and splice task by `id`; call `Storage.write`; return `{ ok, error? }`.
    - `toggleComplete`: toggle `completed` flag on matching task; call `Storage.write`; return `{ ok, error? }`.
    - `updateTask`: validate new name (non-empty, ≤ 200 chars) against other tasks for duplicates; update `name`; call `Storage.write`; return `{ ok, error? }`.
    - Expose on `window._ldbTest`.
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 6.3, 6.4, 6.5, 6.8, 6.9, 6.11_

- [x] 10. State Module — sort, quick links, settings, and theme mutations (`js/app.js`)
  - [x] 10.1 Implement `State.setSortOption(option)`, `State.addQuickLink(label, url)`, `State.deleteQuickLink(id)`, `State.saveName(nameValue)`, `State.saveSessionDuration(minutes)`, `State.toggleThemeState()`
    - `setSortOption`: update `State.settings.sortOption`; call `Storage.write(SETTINGS, settings)`; return `{ ok, error? }`.
    - `addQuickLink`: validate with `validateQuickLink` and check 50-link limit; push `{ id: generateId(), label, url, createdAt: Date.now() }` to `State.quickLinks`; call `Storage.write(LINKS, ...)`; return `{ ok, error? }`.
    - `deleteQuickLink`: splice from `State.quickLinks`; call `Storage.write(LINKS, ...)`; return `{ ok, error? }`.
    - `saveName`: if `nameValue.trim()` is empty, set `settings.name = ""`; else set `settings.name = nameValue.trim().slice(0, 50)`; call `Storage.write(SETTINGS, settings)`; return `{ ok, error? }`.
    - `saveSessionDuration`: validate with `validateSessionDuration`; update `settings.sessionDuration`; call `Storage.write(SETTINGS, settings)`; if Timer is running, stop it and reset remaining seconds; return `{ ok, error? }`.
    - `toggleThemeState`: call `toggleTheme(State.settings.theme)`; update `settings.theme`; set `data-theme` attribute on `document.documentElement`; call `Storage.write(SETTINGS, settings)`; return `{ ok, error? }`.
    - Expose on `window._ldbTest`.
    - _Requirements: 2.2, 2.3, 4.2, 4.6, 4.7, 7.2, 8.2, 9.3, 10.2, 10.3_

- [x] 12. Render Module — Greeting Widget (`js/app.js`)
  - [x] 12.1 Implement `Render.greeting()`
    - Write the current time (via `formatTime(new Date())`) to `#greeting-time`.
    - Write the current date (via `formatDate(new Date())`) to `#greeting-date`.
    - Write `buildGreeting(getGreetingPhrase(new Date().getHours()), State.settings.name)` to `#greeting-phrase`.
    - Restore the saved name to `#name-input`.
    - Start a `setInterval` (60 s) to call `Render.greeting()` so the clock updates every minute. Ensure only one interval is ever active.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.4_

- [x] 13. Render Module — Timer Widget (`js/app.js`)
  - [x] 13.1 Implement `Render.timer()`
    - Write `formatTimerDisplay(State.timer.remainingSeconds)` to `#timer-display`.
    - Show/hide `#timer-notification` based on `State.timer.notified`.
    - Populate `#duration-input` with `State.settings.sessionDuration`.
    - _Requirements: 3.1, 3.7, 3.8_

- [x] 14. Render Module — Task Widget and Quick Links Widget (`js/app.js`)
  - [x] 14.1 Implement `Render.tasks()`
    - Clear and rebuild `#task-list` from `sortTasks(State.tasks, State.settings.sortOption)`.
    - Each `<li>` contains: checkbox (checked if `completed`), task name span (add `completed` class if done), Edit button, Delete button, and an empty validation `<span>`.
    - Set the sort `<select>` to `State.settings.sortOption`.
    - Show/hide `#task-load-error` based on load-error state.
    - _Requirements: 5.6, 6.1, 6.7, 6.10, 7.3_
  - [x] 14.2 Implement `Render.links()`
    - Clear and rebuild `#link-list` from `State.quickLinks`.
    - Each `<li>` contains: a link-open button (label text) and a Delete button.
    - Show `#link-limit-msg` and disable `#add-link-btn` when `State.quickLinks.length >= 50`.
    - Show/hide `#link-load-error` based on load-error state.
    - _Requirements: 8.5, 9.1_
  - [x] 14.3 Implement `Render.errorBanner(message)` and `Render.clearErrorBanner()`
    - `errorBanner`: set `#error-banner` text content and remove `hidden` attribute.
    - `clearErrorBanner`: set `hidden` attribute on `#error-banner` and clear text.
    - _Requirements: 11.4_

- [x] 15. Timer logic (`js/app.js`)
  - [x] 15.1 Implement `Timer.start()`, `Timer.stop()`, `Timer.reset()`, and the countdown tick handler
    - `start`: if `timer.running` is true, do nothing (Req 3.9). Otherwise set `timer.running = true`; start a 1-second `setInterval` that decrements `timer.remainingSeconds`; when it reaches 0, clear the interval, set `timer.notified = true`, play an audio alert (`AudioContext` or `new Audio` beep), call `Render.timer()`.
    - `stop`: if `timer.running` is false, do nothing (Req 3.10). Otherwise clear the interval, set `timer.running = false`, call `Render.timer()`.
    - `reset`: call `Timer.stop()`; reset `timer.remainingSeconds` to `timer.totalSeconds`; set `timer.notified = false`; call `Render.timer()` within 200 ms (Req 3.6).
    - Clear `timer.intervalId` before setting a new one to prevent parallel intervals.
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 16. Event Module — Greeting and Timer events (`js/app.js`)
  - [x] 16.1 Wire `#name-form` submit event
    - On submit: call `State.saveName(nameInput.value)`; if `ok`, call `Render.greeting()`; if not ok, show error in `#name-validation`.
    - _Requirements: 2.2, 2.3, 2.5_
  - [x] 16.2 Wire `#duration-form` submit event
    - On submit: call `State.saveSessionDuration(value)`; if `ok`, call `Render.timer()`, clear `#duration-validation`; if validation fails, show inline message in `#duration-validation`.
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_
  - [x] 16.3 Wire timer control buttons (`#timer-start-btn`, `#timer-stop-btn`, `#timer-reset-btn`, `#timer-dismiss-btn`)
    - Start → `Timer.start()`.
    - Stop → `Timer.stop()`.
    - Reset → `Timer.reset()`.
    - Dismiss → set `State.timer.notified = false`, call `Render.timer()`.
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.8_

- [x] 17. Event Module — Task Widget events (`js/app.js`)
  - [x] 17.1 Wire `#task-form` submit event (add task)
    - Validate via `validateTaskName`; on success call `State.addTask(name)`, then check storage result, call `Render.tasks()`, clear `#task-validation`; on failure show inline validation message.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 17.2 Wire task list click delegation (`#task-widget`) for complete, edit, save-edit, cancel-edit, delete
    - Toggle checkbox → `State.toggleComplete(id)` → `Render.tasks()`. On storage error show error banner.
    - Edit button → replace task name span with a pre-filled `<input>` positioned at end of text; show Save and Cancel buttons.
    - Save edit (confirm) → `State.updateTask(id, newName)` → validate; on success `Render.tasks()`; on empty/whitespace show inline validation; on > 200 chars show inline validation. On storage error show error banner.
    - Cancel edit → `Render.tasks()` (discard edit input).
    - Delete button → `State.deleteTask(id)` → `Render.tasks()` within 300 ms. On storage error show error banner.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12_
  - [x] 17.3 Wire `#task-sort` change event
    - Call `State.setSortOption(value)` → `Render.tasks()`. On storage error show error banner.
    - _Requirements: 7.1, 7.2_

- [x] 18. Event Module — Quick Links and Theme events (`js/app.js`)
  - [x] 18.1 Wire `#link-form` submit event (add quick link)
    - Validate via `validateQuickLink`; show per-field validation messages in `#link-label-validation` and `#link-url-validation` on failure; on success call `State.addQuickLink` → `Render.links()` within 300 ms. On storage error show error banner.
    - _Requirements: 8.1, 8.2, 8.3, 8.6_
  - [x] 18.2 Wire quick links list click delegation (`#quick-links-widget`) for open and delete
    - Link open button → `window.open(url, '_blank', 'noopener,noreferrer')`.
    - Delete button → show `window.confirm` prompt; on confirm call `State.deleteQuickLink(id)` → `Render.links()`; on storage error revert and show error banner (Req 9.4).
    - _Requirements: 8.4, 9.2, 9.3, 9.4_
  - [x] 18.3 Wire `#theme-toggle` click event
    - Call `State.toggleThemeState()`; update `aria-pressed` and button icon/label; on storage error show error banner.
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 19. Bootstrap — wire everything together (`js/app.js`)
  - [x] 19.1 Implement the bootstrap sequence at the bottom of the IIFE
    - Call `State.load()`.
    - Call `Render.greeting()`, `Render.timer()`, `Render.tasks()`, `Render.links()`.
    - Sync `#theme-toggle` `aria-pressed` and icon with `State.settings.theme`.
    - Restore `#task-sort` select to `State.settings.sortOption`.
    - If `State.load()` returned any errors, call `Render.errorBanner(consolidatedMessage)`.
    - Call `Events.init()` to attach all event listeners.
    - _Requirements: 2.4, 4.4, 4.5, 5.6, 7.3, 7.4, 8.5, 10.5, 10.6, 10.7, 11.2, 11.3_

- [x] 20. Final checkpoint — full integration smoke test
  - Ensure all tests pass, ask the user if questions arise.
  - Open `index.html` in a browser and manually verify:
    - All four widgets render on load without errors.
    - Tasks and links saved in a previous session are restored.
    - Theme toggle persists across reload with no FOUC.
    - Timer start / stop / resume / reset cycle works correctly.
    - Session complete notification appears and is dismissible.
    - Responsive layout at 320 px (single column) and 768 px+ (two columns).

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- All property tests require `window._ldbTest` to be populated by `app.js`. The expose block should be wrapped in `if (typeof window !== 'undefined') window._ldbTest = { ... }` so it is easy to strip for production.
- The `fast-check` UMD bundle is loaded via CDN in `tests/index.html` — no local install required.
- Each property test must run a minimum of 100 iterations (`numRuns: 100` in `fc.assert` options).
- Storage errors during boot use a consolidated single banner rather than per-widget errors (design §Error Precedence).
- Timer state is intentionally not persisted — a page reload always starts a fresh session.
- `sortTasks` must never mutate its input array; use `[...tasks].sort(...)`.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["3.1"] },
    { "id": 1, "tasks": ["3.2", "4.1"] },
    { "id": 2, "tasks": ["4.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "6.1"] },
    { "id": 4, "tasks": ["6.2", "8.1"] },
    { "id": 5, "tasks": ["8.2"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["9.2", "10.1"] },
    { "id": 8, "tasks": ["10.2", "12.1", "13.1"] },
    { "id": 9, "tasks": ["14.1", "14.2", "14.3", "15.1"] },
    { "id": 10, "tasks": ["16.1", "16.2", "16.3", "17.1"] },
    { "id": 11, "tasks": ["17.2", "17.3", "18.1"] },
    { "id": 12, "tasks": ["18.2", "18.3"] },
    { "id": 13, "tasks": ["19.1"] }
  ]
}
```
