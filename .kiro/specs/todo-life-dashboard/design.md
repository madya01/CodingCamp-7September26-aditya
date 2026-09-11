# Design Document: To-do List Life Dashboard

## Overview

The To-do List Life Dashboard is a client-side single-page application (SPA) delivered as a single `index.html` file with one companion CSS file and one JavaScript file. It runs entirely in the browser with no server, no build pipeline, and no external dependencies.

The application is composed of four independent widgets rendered in a CSS grid layout:

- **Greeting Widget** — displays the user's name, the current time and date, and a time-aware greeting phrase.
- **Timer Widget** — a configurable Pomodoro countdown timer with start, stop, and reset controls.
- **Task Widget** — a full task manager supporting add, edit, complete, sort, and delete.
- **Quick Links Widget** — a one-click link launcher for user-defined bookmarks.

All persistent state is stored in `window.localStorage` under four namespaced keys. The app follows a layered architecture: a thin storage layer handles serialisation and deserialisation, a state layer holds in-memory representations, and a render layer produces DOM updates from state diffs.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                         index.html                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  css/style.css│  │  js/app.js   │  │ localStorage  │   │
│  └──────────────┘  └──────┬───────┘  └───────┬───────┘   │
│                            │                  │            │
│          ┌─────────────────▼──────────────────▼───────┐   │
│          │              js/app.js                      │   │
│          │  ┌─────────────────────────────────────┐   │   │
│          │  │         Storage Module              │   │   │
│          │  │  read(key) / write(key, value)      │   │   │
│          │  │  Returns {ok, data, error}          │   │   │
│          │  └──────────────┬──────────────────────┘   │   │
│          │                 │                           │   │
│          │  ┌──────────────▼──────────────────────┐   │   │
│          │  │         State Module                 │   │   │
│          │  │  tasks[], quickLinks[], settings{}   │   │   │
│          │  │  timer{} — in-memory only            │   │   │
│          │  └──────────────┬──────────────────────┘   │   │
│          │                 │                           │   │
│          │  ┌──────────────▼──────────────────────┐   │   │
│          │  │         Render Module                │   │   │
│          │  │  renderGreeting()   renderTimer()    │   │   │
│          │  │  renderTasks()      renderLinks()    │   │   │
│          │  └──────────────┬──────────────────────┘   │   │
│          │                 │                           │   │
│          │  ┌──────────────▼──────────────────────┐   │   │
│          │  │         Event Module                 │   │   │
│          │  │  Delegates DOM events to state →     │   │   │
│          │  │  persist → render pipeline           │   │   │
│          │  └─────────────────────────────────────┘   │   │
│          └─────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**Data flow for a mutation:**
1. User interaction fires DOM event.
2. Event handler calls a state-mutation function (e.g., `addTask(name)`).
3. Mutation function validates input and updates in-memory state.
4. Mutation function calls `Storage.write(key, updatedData)`.
5. If write succeeds, `render*()` is called to reflect the new state in the DOM.
6. If write fails, state is kept in memory, an error banner is displayed, and the DOM reflects the in-memory state (not the failed-write state).

**Separation of concerns:**
- The Storage Module knows nothing about the DOM.
- The State Module knows nothing about the DOM.
- The Render Module reads from State; it never mutates State.
- All modules live in a single `js/app.js` file wrapped in an IIFE to avoid polluting the global scope.

---

## Components and Interfaces

### File Structure

```
project-root/
├── index.html
├── css/
│   └── style.css
└── js/
    └── app.js
```

### index.html

Declares the semantic HTML skeleton. All four widget sections are present in document order to allow CSS grid to control visual layout. The `<script>` tag is placed at the end of `<body>` so the DOM is ready when `app.js` runs without requiring `DOMContentLoaded` listeners on every handler. The theme class (`data-theme="light"`) is set on `<html>` and is populated by an inline `<script>` snippet in `<head>` to prevent FOUC (flash of unstyled content).

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Life Dashboard</title>
  <!-- Anti-FOUC theme restoration -->
  <script>
    try {
      const s = JSON.parse(localStorage.getItem('ldb_settings') || '{}');
      if (s.theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    } catch (_) {}
  </script>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <header id="greeting-widget">...</header>
  <section id="timer-widget">...</section>
  <section id="task-widget">...</section>
  <section id="quick-links-widget">...</section>
  <div id="error-banner" role="alert" aria-live="assertive" hidden></div>
  <script src="js/app.js"></script>
</body>
</html>
```

### css/style.css

Responsibilities:
- CSS custom properties (variables) for the light and dark themes, scoped to `[data-theme="light"]` and `[data-theme="dark"]` on `html`.
- Responsive grid layout using `display: grid` and `@media` breakpoints.
- Widget-level styles (card layout, typography, form controls, animations).
- Utility classes for strikethrough, hidden, error states, edit mode.

Theme switching is accomplished by changing the `data-theme` attribute on `<html>` from JavaScript; no class toggling or inline style injection is needed.

### js/app.js — Module Breakdown

All code is wrapped in an IIFE:

```javascript
(function () {
  'use strict';
  // Storage Module
  // State Module
  // Helper / pure functions
  // Render Module
  // Event Module
  // Bootstrap
})();
```

#### Storage Module

```javascript
const Storage = {
  KEYS: {
    TASKS: 'ldb_tasks',
    LINKS: 'ldb_links',
    SETTINGS: 'ldb_settings',
  },
  read(key) {
    // Returns { ok: true, data } or { ok: false, error }
  },
  write(key, value) {
    // Returns { ok: true } or { ok: false, error }
  },
};
```

- `read` catches `JSON.parse` errors and storage-access exceptions; always returns a result object, never throws.
- `write` catches quota-exceeded and security errors; always returns a result object, never throws.

#### State Module

```javascript
const State = {
  tasks: [],          // Task[]
  quickLinks: [],     // QuickLink[]
  settings: { name: '', theme: 'light', sessionDuration: 25, sortOption: 'default' },
  timer: {
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    running: false,
    intervalId: null,
    notified: false,
  },
};
```

State is never mutated directly from the render or event layers — only through named mutation functions exported from the State module (e.g., `State.addTask`, `State.deleteTask`, `State.toggleComplete`).

#### Helper / Pure Functions

These are pure functions with no side effects. They are the primary targets for property-based testing.

| Function | Signature | Description |
|---|---|---|
| `formatTime` | `(date: Date) → string` | Returns HH:MM (24-hr) |
| `formatDate` | `(date: Date) → string` | Returns "DayName, DD MonthName YYYY" |
| `getGreetingPhrase` | `(hour: number) → string` | Maps hour [0–23] to greeting phrase |
| `buildGreeting` | `(phrase: string, name: string) → string` | Assembles full greeting; truncates name to 50 chars |
| `formatTimerDisplay` | `(totalSeconds: number) → string` | Returns MM:SS |
| `validateTaskName` | `(name: string, existing: Task[]) → ValidationResult` | Returns `{ valid, error }` |
| `validateSessionDuration` | `(value: any) → boolean` | True iff value is integer in [1, 120] |
| `validateQuickLink` | `(label: string, url: string) → ValidationResult` | Returns `{ valid, errors: {label?, url?} }` |
| `sortTasks` | `(tasks: Task[], option: SortOption) → Task[]` | Returns sorted copy; does not mutate input |
| `parseStore` | `(raw: string\|null, key: string) → any` | Parses JSON; returns safe default on failure |
| `toggleTheme` | `(current: Theme) → Theme` | Returns opposite theme |
| `generateId` | `() → string` | Returns a unique string ID (timestamp + random) |

#### Render Module

Each `render*` function is idempotent — it rebuilds the relevant DOM subtree from the current State on every call. This avoids stale-DOM bugs at the cost of slightly more DOM work, which is acceptable for the scale of this application.

```javascript
const Render = {
  greeting() { /* updates #greeting-widget */ },
  timer()    { /* updates #timer-widget */ },
  tasks()    { /* updates #task-widget task list */ },
  links()    { /* updates #quick-links-widget link list */ },
  errorBanner(message) { /* shows/hides #error-banner */ },
  clearErrorBanner()   { /* hides #error-banner */ },
};
```

Render functions attach event listeners via event delegation on the widget container rather than per-item, to avoid listener leak when items are re-rendered.

#### Event Module

Wires DOM events to State mutations and Render calls. Uses a single top-level `DOMContentLoaded` (implicit, since `<script>` is at bottom of `<body>`) to attach listeners after the initial render.

```javascript
const Events = {
  init() {
    document.getElementById('task-widget').addEventListener('click', Events.handleTaskClick);
    document.getElementById('quick-links-widget').addEventListener('click', Events.handleLinksClick);
    // ... other top-level delegated listeners
  },
  handleTaskClick(e) { /* dispatches to add / edit / delete / toggle / sort handlers */ },
  // ...
};
```

---

## Data Models

### Task

```javascript
{
  id: string,          // unique identifier, e.g. "task_1727380800000_x4f2"
  name: string,        // 1–200 characters, trimmed
  completed: boolean,  // default: false
  createdAt: number,   // Unix timestamp ms (Date.now()) — used for creation-order sort
}
```

Stored under `localStorage['ldb_tasks']` as a JSON array. Maximum practical size: 200 tasks × ~300 bytes = ~60 KB, well within the 5 MB typical localStorage limit.

### QuickLink

```javascript
{
  id: string,    // unique identifier
  label: string, // 1–50 characters
  url: string,   // 1–2048 characters, must begin with http:// or https://
  createdAt: number,
}
```

Stored under `localStorage['ldb_links']` as a JSON array. Maximum 50 entries per requirements.

### Settings

```javascript
{
  name: string,          // 0–50 characters; empty string means no custom name
  theme: 'light'|'dark', // default: 'light'
  sessionDuration: number, // integer 1–120, default: 25
  sortOption: 'default'|'az'|'za'|'completed-last', // default: 'default'
}
```

Stored under `localStorage['ldb_settings']` as a JSON object.

### Timer (in-memory only, not persisted)

```javascript
{
  totalSeconds: number,    // equals sessionDuration × 60; reset source
  remainingSeconds: number,
  running: boolean,
  intervalId: number|null, // setInterval handle
  notified: boolean,       // true after the end-of-session alert fires
}
```

The timer state is intentionally not persisted — a page reload always starts a fresh session per the requirements (no "resume across tabs/reload" requirement exists).

### Storage Keys Summary

| Key | Type | Safe Default |
|---|---|---|
| `ldb_tasks` | `Task[]` | `[]` |
| `ldb_links` | `QuickLink[]` | `[]` |
| `ldb_settings` | `Settings` | `{ name: "", theme: "light", sessionDuration: 25, sortOption: "default" }` |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Date formatting produces the correct structure

*For any* `Date` object, `formatDate(date)` SHALL return a string matching the pattern `"DayName, DD MonthName YYYY"` — that is, a full weekday name, a two-digit day, a full month name, and a four-digit year separated by a comma and spaces.

**Validates: Requirements 1.2**

---

### Property 2: Greeting phrase covers all 24 hours

*For any* integer hour `h` in `[0, 23]`, `getGreetingPhrase(h)` SHALL return exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"`, and the phrase SHALL correspond to the correct hour range as specified (05–11 → Morning, 12–17 → Afternoon, 18–20 → Evening, 21–23 and 00–04 → Night).

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 3: Greeting name truncation

*For any* greeting phrase and any name string, `buildGreeting(phrase, name)` SHALL produce a string that includes the phrase and, if name is non-empty after trimming, appends `", " + name.slice(0, 50)`. *For any* name longer than 50 characters, the appended portion SHALL be exactly 50 characters.

**Validates: Requirements 1.7, 1.8**

---

### Property 4: Name persistence round-trip

*For any* non-whitespace-only string `s`, after `saveName(s)` writes to `Settings_Store` and `loadSettings()` reads it back, the name field SHALL equal `s.trim()`.

**Validates: Requirements 2.2, 2.4**

---

### Property 5: Whitespace-only name clears the stored name

*For any* string `s` composed entirely of whitespace characters (including the empty string), calling `saveName(s)` SHALL result in the `name` field of `Settings_Store` being an empty string, and `buildGreeting` SHALL produce the phrase without a name suffix.

**Validates: Requirements 2.3**

---

### Property 6: Timer display format is always valid MM:SS

*For any* integer `s` in `[0, 7200]` (representing seconds remaining in a 1–120 minute session), `formatTimerDisplay(s)` SHALL return a string matching `/^\d{2}:\d{2}$/` where the minutes component equals `Math.floor(s / 60)` zero-padded to two digits, and the seconds component equals `s % 60` zero-padded to two digits.

**Validates: Requirements 3.1**

---

### Property 7: Session duration validation accepts exactly the valid range

*For any* integer `d`, `validateSessionDuration(d)` SHALL return `true` if and only if `d >= 1 && d <= 120`. For any non-integer, non-numeric, empty, or out-of-range value, it SHALL return `false`.

**Validates: Requirements 4.2, 4.3**

---

### Property 8: Adding a valid task grows the list by one with a unique ID

*For any* task list `T` and any valid task name `n` (non-empty after trimming, ≤ 200 characters, not a case-insensitive duplicate of any name in `T`), calling `addTask(n)` SHALL result in a task list of length `|T| + 1` where the new task has an `id` not present in `T`, a `name` equal to `n.trim()`, and `completed === false`.

**Validates: Requirements 5.2**

---

### Property 9: Duplicate task names are rejected

*For any* task list `T` containing a task with name `existing`, and any string `s` where `s.trim().toLowerCase() === existing.trim().toLowerCase()`, calling `addTask(s)` SHALL leave the task list unchanged (same length, same IDs).

**Validates: Requirements 5.3**

---

### Property 10: Task list storage round-trip

*For any* array of valid `Task` objects `T`, after `Storage.write('ldb_tasks', T)` succeeds, `parseStore(Storage.read('ldb_tasks').data, 'ldb_tasks')` SHALL return an array structurally equal to `T` (same IDs, names, completed flags, createdAt values, same order).

**Validates: Requirements 5.6, 11.2**

---

### Property 11: Task completion toggle is a round-trip

*For any* task `t` with any initial `completed` value `v`, calling `toggleComplete(t.id)` twice SHALL result in `t.completed === v` — the task is restored to its original completion state.

**Validates: Requirements 6.8, 6.9**

---

### Property 12: Deleting a task removes exactly that task

*For any* task list `T` containing at least one task with id `id`, calling `deleteTask(id)` SHALL produce a task list of length `|T| - 1` that contains no task with `id`, and all other tasks in `T` are present and unchanged.

**Validates: Requirements 6.11, 9.3**

---

### Property 13: Sort produces a permutation respecting the sort invariant

*For any* array of tasks `T` and any valid sort option `opt`, `sortTasks(T, opt)` SHALL:
1. Return an array of the same length as `T` containing the same task IDs (i.e., a permutation, not a copy with new objects).
2. Not mutate the input array `T`.
3. Satisfy the ordering invariant for `opt`: for Alphabetical A–Z, no task at index `i` SHALL have a name lexicographically greater than the task at index `i+1`; for Completed Last, no completed task SHALL appear before an incomplete task.

**Validates: Requirements 7.2**

---

### Property 14: Quick link validation accepts valid inputs and rejects invalid ones

*For any* label `l` and URL `u`, `validateQuickLink(l, u)` SHALL return `{ valid: true }` if and only if `l.length >= 1 && l.length <= 50` AND `u.length >= 1 && u.length <= 2048` AND `(u.startsWith('http://') || u.startsWith('https://'))`. For any input failing any of these conditions, it SHALL return `{ valid: false }` with an error entry for each offending field.

**Validates: Requirements 8.2, 8.3**

---

### Property 15: Theme toggle is an involution

*For any* theme value `t` in `{ 'light', 'dark' }`, `toggleTheme(t)` SHALL return the opposite theme, and `toggleTheme(toggleTheme(t))` SHALL equal `t` (round-trip).

**Validates: Requirements 10.2**

---

### Property 16: Corrupt or absent storage data yields safe defaults

*For any* string `raw` that is not parseable as valid JSON for the expected store structure (including `null`, empty string, malformed JSON, or JSON of the wrong type), `parseStore(raw, key)` SHALL return:
- `[]` when `key` is `'ldb_tasks'` or `'ldb_links'`
- `{ name: "", theme: "light", sessionDuration: 25, sortOption: "default" }` when `key` is `'ldb_settings'`

**Validates: Requirements 11.3**

---

## Error Handling

### Storage Error Strategy

All storage interactions are wrapped in the `Storage` module which returns result objects (`{ ok, data, error }`) rather than throwing. Callers follow this pattern:

```javascript
const result = Storage.write(Storage.KEYS.TASKS, State.tasks);
if (!result.ok) {
  Render.errorBanner('Your changes could not be saved. Storage may be full or unavailable.');
} else {
  Render.clearErrorBanner();
  Render.tasks();
}
```

This ensures:
- In-memory state always reflects the user's intended mutations.
- The UI accurately represents in-memory state regardless of storage health.
- Errors are reported once and non-intrusively (a dismissible banner, not a blocking modal).

### Input Validation Strategy

Validation is applied eagerly (on submit, not on keyup) to avoid distracting users while typing. Each widget input area has a dedicated `<span class="validation-message">` element that is shown/hidden and populated by the render layer. Invalid submissions do not modify State.

### Timer Error Boundaries

`setInterval` is the only async primitive used. If the interval fires but the remaining time is already 0 (e.g., due to a race), the timer is clamped to 0 and cleared. The `timer.intervalId` is always cleared before setting a new one to prevent multiple parallel intervals.

### Error Precedence

When multiple errors could occur simultaneously (e.g., a storage write fails during a bulk restore on load), the dashboard:
1. Completes the restore for all keys that succeed.
2. Initialises failed keys to their safe defaults.
3. Shows a single consolidated error banner listing which stores could not be loaded.

---

## Testing Strategy

### Approach

Because this is a pure HTML/CSS/Vanilla JavaScript application with no build step and no Node.js runtime, testing must be runnable directly in a browser or via a simple test harness. The recommended approach is:

- **Unit and property tests**: Use [fast-check](https://github.com/dubzzz/fast-check) loaded as a browser-compatible UMD bundle (single `<script>` tag, no bundler required). Tests are written in a separate `tests/app.test.js` file and run by opening `tests/index.html` in a browser.
- **Manual / integration tests**: Test the full UI in Chrome, Firefox, Edge, and Safari.

### Property-Based Tests (fast-check)

All pure helper functions (listed in the Components section) are the targets for property-based tests. Each test runs a minimum of 100 iterations.

Tag format per test: `// Feature: todo-life-dashboard, Property N: <property_text>`

| Property | Function Under Test | Generator |
|---|---|---|
| 1 | `formatDate` | `fc.date()` |
| 2 | `getGreetingPhrase` | `fc.integer({ min: 0, max: 23 })` |
| 3 | `buildGreeting` | `fc.string()` × 2 |
| 4 | `saveName` / `loadSettings` | `fc.string().filter(s => s.trim().length > 0)` |
| 5 | `saveName` | `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` |
| 6 | `formatTimerDisplay` | `fc.integer({ min: 0, max: 7200 })` |
| 7 | `validateSessionDuration` | `fc.anything()` |
| 8 | `addTask` | `fc.string({ minLength: 1, maxLength: 200 })` |
| 9 | `addTask` | `fc.string({ minLength: 1, maxLength: 200 })` (with pre-populated list) |
| 10 | `Storage.write` / `parseStore` | `fc.array(taskArbitrary())` |
| 11 | `toggleComplete` | `fc.boolean()` (initial completed state) |
| 12 | `deleteTask` | `fc.array(taskArbitrary(), { minLength: 1 })` |
| 13 | `sortTasks` | `fc.array(taskArbitrary())` × sort option |
| 14 | `validateQuickLink` | `fc.string()` × 2 |
| 15 | `toggleTheme` | `fc.constantFrom('light', 'dark')` |
| 16 | `parseStore` | `fc.oneof(fc.string(), fc.constant(null))` |

### Unit Tests (example-based)

Example-based unit tests cover:
- `formatTime` with a known fixed date → expected HH:MM string.
- Timer start/stop/reset state transitions with concrete initial states.
- Default fallback to 25 minutes when no session duration is saved.
- Error banner appears when `Storage.write` is mocked to throw.
- No duplicate IDs after adding 50 tasks sequentially.
- Quick Links limit message appears at exactly 50 links.
- Sort stability: tasks with identical names retain creation order.

### Cross-Browser Testing

Manual test matrix (Chrome, Firefox, Edge, Safari):
- Load with clean localStorage → verify all defaults.
- Add, edit, complete, delete tasks; reload → verify persistence.
- Add and remove quick links; reload → verify persistence.
- Toggle theme; reload → verify no FOUC and correct theme restored.
- Timer start → stop → resume → reset cycle.
- localStorage filled to quota → verify error banner displayed.
- Viewport at 320 px, 767 px, 768 px, 1280 px → verify responsive layout.

### Accessibility Testing

- All interactive elements are keyboard-accessible (tab order, Enter/Space activation).
- ARIA live region (`aria-live="assertive"`) on error banner ensures screen readers announce storage errors.
- `aria-label` on icon-only buttons (e.g., delete, edit controls).
- Colour contrast ratio ≥ 4.5:1 for all text in both light and dark themes.
- Manual test with NVDA (Windows) and VoiceOver (macOS/iOS).
