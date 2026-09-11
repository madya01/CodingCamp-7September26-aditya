(function () {
  'use strict';

  // Storage Module
  const Storage = {
    KEYS: {
      TASKS: 'ldb_tasks',
      LINKS: 'ldb_links',
      SETTINGS: 'ldb_settings',
    },

    /**
     * @param {string} key
     * @returns {{ ok: true, data: any } | { ok: false, error: Error }}
     */
    read(key) {
      try {
        const raw = localStorage.getItem(key);
        const data = JSON.parse(raw);
        return { ok: true, data };
      } catch (error) {
        return { ok: false, error };
      }
    },

    /**
     * Serialise and write a value to localStorage.
     * @param {string} key
     * @param {any} value
     * @returns {{ ok: true } | { ok: false, error: Error }}
     */
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },
  };

  // Helper / Pure Functions

  /**
   * Returns the current time as "HH:MM" (24-hour, zero-padded).
   * @param {Date} date
   * @returns {string}
   */
  function formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }

  /**
   * Returns the date as "DayName, DD MonthName YYYY"
   * e.g. "Monday, 26 September 2025".
   * Uses manual extraction to guarantee deterministic format across all locales.
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    const DAYS = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday',
    ];
    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const dayName  = DAYS[date.getDay()];
    const dd       = String(date.getDate()).padStart(2, '0');
    const monthName = MONTHS[date.getMonth()];
    const yyyy     = date.getFullYear();
    return dayName + ', ' + dd + ' ' + monthName + ' ' + yyyy;
  }

  /**
   * Maps an integer hour (0–23) to a greeting phrase.
   * 05–11 → "Good Morning"
   * 12–17 → "Good Afternoon"
   * 18–20 → "Good Evening"
   * 21–23, 00–04 → "Good Night"
   * @param {number} hour  Integer in [0, 23]
   * @returns {string}
   */
  function getGreetingPhrase(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night';
  }

  /**
   * Assembles the full greeting string.
   * Returns "phrase, name" (name truncated to 50 chars) when name is non-empty after trim.
   * Returns "phrase" when name is empty or whitespace-only.
   * @param {string} phrase
   * @param {string} name
   * @returns {string}
   */
  function buildGreeting(phrase, name) {
    const trimmed = (name || '').trim();
    if (trimmed.length === 0) return phrase;
    return phrase + ', ' + trimmed.slice(0, 50);
  }

  // Helper / Pure Functions

  /**
   * Validates a task name against basic rules and an existing task list.
   * @param {string} name  The candidate task name.
   * @param {Array<{ name: string }>} existing  Current task objects.
   * @returns {{ valid: true } | { valid: false, error: string }}
   */
  function validateTaskName(name, existing) {
    const trimmed = (name || '').trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Task name cannot be empty.' };
    }

    if (trimmed.length > 200) {
      return { valid: false, error: 'Task name must not exceed 200 characters.' };
    }

    const lower = trimmed.toLowerCase();
    const isDuplicate = (existing || []).some(
      (task) => task.name.trim().toLowerCase() === lower
    );
    if (isDuplicate) {
      return { valid: false, error: 'A task with this name already exists.' };
    }

    return { valid: true };
  }

  /**
   * Returns true iff value is an integer in [1, 120].
   * Rejects non-numeric, non-integer, empty, null, undefined, and out-of-range inputs.
   * @param {any} value
   * @returns {boolean}
   */
  function validateSessionDuration(value) {
    // Reject null, undefined, empty string, booleans, objects, arrays
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return false;
    if (typeof value === 'string' && value.trim() === '') return false;

    const num = Number(value);

    // Must be a finite number, must equal its integer truncation (no decimals)
    if (!Number.isFinite(num)) return false;
    if (!Number.isInteger(num)) return false;

    return num >= 1 && num <= 120;
  }

  /**
   * Validates a quick link's label and URL.
   * @param {string} label
   * @param {string} url
   * @returns {{ valid: true } | { valid: false, errors: { label?: string, url?: string } }}
   */
  function validateQuickLink(label, url) {
    const errors = {};

    const labelStr = label || '';
    if (labelStr.length < 1 || labelStr.length > 50) {
      errors.label = 'Label must be between 1 and 50 characters.';
    }

    const urlStr = url || '';
    if (urlStr.length < 1 || urlStr.length > 2048) {
      errors.url = 'URL must be between 1 and 2048 characters.';
    } else if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      errors.url = 'URL must begin with http:// or https://.';
    }

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors };
    }
    return { valid: true };
  }

  /**
   * Returns the opposite theme.
   * @param {'light'|'dark'} current
   * @returns {'light'|'dark'}
   */
  function toggleTheme(current) {
    return current === 'light' ? 'dark' : 'light';
  }

  /**
   * Generates a unique string identifier.
   * @returns {string}
   */
  function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  // Helper / Pure Functions 

  /**
   * Formats a total number of seconds as "MM:SS" (both zero-padded to 2 digits).
   * Input range: [0, 7200] (0 s to 120 min).
   * @param {number} totalSeconds  Non-negative integer
   * @returns {string}  e.g. "05:03", "120:00"... wait — MM max is 120 (7200/60),
   *   which is 3 digits, but the design specifies zero-padded to 2 digits, so
   *   MM = Math.floor(s / 60).toString().padStart(2, '0').
   */
  function formatTimerDisplay(totalSeconds) {
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return mm + ':' + ss;
  }

  /**
   * Returns a new sorted copy of the tasks array without mutating the original.
   * Sort options:
   *   'default'        — creation order (ascending createdAt)
   *   'az'             — alphabetical A→Z, ties broken by createdAt asc
   *   'za'             — alphabetical Z→A, ties broken by createdAt asc
   *   'completed-last' — incomplete tasks first, completed tasks last;
   *                      within each group, creation order (ascending createdAt)
   * @param {Array<{ id: string, name: string, completed: boolean, createdAt: number }>} tasks
   * @param {'default'|'az'|'za'|'completed-last'} option
   * @returns {Array}
   */
  function sortTasks(tasks, option) {
    const copy = tasks.slice();

    switch (option) {
      case 'az':
        copy.sort(function (a, b) {
          const nameCmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          return nameCmp !== 0 ? nameCmp : a.createdAt - b.createdAt;
        });
        break;

      case 'za':
        copy.sort(function (a, b) {
          const nameCmp = b.name.toLowerCase().localeCompare(a.name.toLowerCase());
          return nameCmp !== 0 ? nameCmp : a.createdAt - b.createdAt;
        });
        break;

      case 'completed-last':
        copy.sort(function (a, b) {
          // false (0) before true (1)
          const completedCmp = (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
          return completedCmp !== 0 ? completedCmp : a.createdAt - b.createdAt;
        });
        break;

      case 'default':
      default:
        copy.sort(function (a, b) {
          return a.createdAt - b.createdAt;
        });
        break;
    }

    return copy;
  }

  /**
   * Default Settings object used as the safe fallback for 'ldb_settings'.
   * Defined once so both parseStore and State can reference the same shape.
   */
  var DEFAULT_SETTINGS = {
    name: '',
    theme: 'light',
    sessionDuration: 25,
    sortOption: 'default',
  };

  /**
   * Parses a raw JSON string from localStorage and returns a typed, safe value.
   * Falls back to a safe default on any failure (null input, invalid JSON,
   * unexpected type).
   * @param {string|null} raw
   * @param {string} key  One of Storage.KEYS.*
   * @returns {Array|Object}
   */
  function parseStore(raw, key) {
    var defaultValue;
    if (key === Storage.KEYS.TASKS || key === Storage.KEYS.LINKS) {
      defaultValue = [];
    } else {
      // 'ldb_settings' — return a fresh copy of the default each time
      defaultValue = Object.assign({}, DEFAULT_SETTINGS);
    }

    if (raw === null || raw === undefined) return defaultValue;

    try {
      var parsed = JSON.parse(raw);

      if (key === Storage.KEYS.TASKS || key === Storage.KEYS.LINKS) {
        // Must be an array
        if (!Array.isArray(parsed)) return defaultValue;
        return parsed;
      } else {
        // Must be a plain object (not an array, not null)
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return defaultValue;
        }
        // Merge parsed values over defaults so missing keys get their defaults
        return Object.assign({}, DEFAULT_SETTINGS, parsed);
      }
    } catch (_) {
      return defaultValue;
    }
  }

  // State Module 

  /**
   * Central in-memory state for the application.
   * Never mutate these properties directly from the Render or Event layers —
   * use the named mutation functions added in subsequent tasks.
   *
   * @property {Array<{ id: string, name: string, completed: boolean, createdAt: number }>} tasks
   * @property {Array<{ id: string, label: string, url: string, createdAt: number }>} quickLinks
   * @property {{ name: string, theme: 'light'|'dark', sessionDuration: number, sortOption: string }} settings
   * @property {{ totalSeconds: number, remainingSeconds: number, running: boolean, intervalId: number|null, notified: boolean }} timer
   * @property {boolean} _taskLoadError  True when tasks could not be read from localStorage on boot.
   * @property {boolean} _linkLoadError  True when quick links could not be read from localStorage on boot.
   */

  const State = {
    tasks: [],
    quickLinks: [],
    settings: {
      name: '',
      theme: 'light',
      sessionDuration: 25,
      sortOption: 'default',
    },
    timer: {
      totalSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      running: false,
      intervalId: null,
      notified: false,
    },
    _taskLoadError: false,
    _linkLoadError: false,

    /**
     * Restores all three stores from localStorage on boot.
     * Populates State.tasks, State.quickLinks, State.settings, and syncs
     * the timer from the loaded session duration.
     * @returns {Error[]}  Any read errors encountered; empty array on full success.
     */
    load() {
      const errors = [];

      const tasksResult = Storage.read(Storage.KEYS.TASKS);
      if (!tasksResult.ok) {
        errors.push(tasksResult.error);
        State._taskLoadError = true;
      } else {
        State._taskLoadError = false;
      }
      State.tasks = parseStore(
        tasksResult.ok ? JSON.stringify(tasksResult.data) : null,
        Storage.KEYS.TASKS
      );

      const linksResult = Storage.read(Storage.KEYS.LINKS);
      if (!linksResult.ok) {
        errors.push(linksResult.error);
        State._linkLoadError = true;
      } else {
        State._linkLoadError = false;
      }
      State.quickLinks = parseStore(
        linksResult.ok ? JSON.stringify(linksResult.data) : null,
        Storage.KEYS.LINKS
      );

      const settingsResult = Storage.read(Storage.KEYS.SETTINGS);
      if (!settingsResult.ok) errors.push(settingsResult.error);
      State.settings = parseStore(
        settingsResult.ok ? JSON.stringify(settingsResult.data) : null,
        Storage.KEYS.SETTINGS
      );

      // Sync timer from the loaded session duration
      State.timer.totalSeconds = State.settings.sessionDuration * 60;
      State.timer.remainingSeconds = State.settings.sessionDuration * 60;

      return errors;
    },
  };

  // State Module — task mutations 

  /**
   * Validates and adds a new task to State.tasks, then persists to storage.
   * @param {string} name  The candidate task name.
   * @returns {{ ok: true } | { ok: false, error: string }}
   */
  State.addTask = function addTask(name) {
    const validation = validateTaskName(name, State.tasks);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    const task = {
      id: generateId(),
      name: name.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    State.tasks.push(task);

    const writeResult = Storage.write(Storage.KEYS.TASKS, State.tasks);
    if (!writeResult.ok) {
      // Roll back the in-memory push so state stays consistent with storage
      State.tasks.pop();
      return { ok: false, error: writeResult.error };
    }

    return { ok: true };
  };

  /**
   * Removes the task with the given id from State.tasks and persists to storage.
   * If no task with that id exists the array is unchanged but storage is still written.
   * @param {string} id
   * @returns {{ ok: true } | { ok: false, error: Error }}
   */
  State.deleteTask = function deleteTask(id) {
    const index = State.tasks.findIndex(function (t) { return t.id === id; });
    const removed = index !== -1 ? State.tasks.splice(index, 1) : [];

    const writeResult = Storage.write(Storage.KEYS.TASKS, State.tasks);
    if (!writeResult.ok) {
      // Roll back the splice so state stays consistent with storage
      if (removed.length) State.tasks.splice(index, 0, removed[0]);
      return { ok: false, error: writeResult.error };
    }

    return { ok: true };
  };

  /**
   * Toggles the completed boolean on the task with the given id, then persists.
   * @param {string} id
   * @returns {{ ok: true } | { ok: false, error: Error }}
   */
  State.toggleComplete = function toggleComplete(id) {
    const task = State.tasks.find(function (t) { return t.id === id; });
    if (!task) return { ok: false, error: new Error('Task not found: ' + id) };

    const previous = task.completed;
    task.completed = !previous;

    const writeResult = Storage.write(Storage.KEYS.TASKS, State.tasks);
    if (!writeResult.ok) {
      // Roll back
      task.completed = previous;
      return { ok: false, error: writeResult.error };
    }

    return { ok: true };
  };

  /**
   * Updates the name of the task with the given id, then persists.
   * Validates newName (non-empty after trim, ≤ 200 chars, case-insensitive
   * duplicate check excludes the task being updated).
   * @param {string} id
   * @param {string} newName
   * @returns {{ ok: true } | { ok: false, error: string }}
   */
  State.updateTask = function updateTask(id, newName) {
    const task = State.tasks.find(function (t) { return t.id === id; });
    if (!task) return { ok: false, error: 'Task not found.' };

    // Validate against all OTHER tasks (exclude the task being updated)
    const others = State.tasks.filter(function (t) { return t.id !== id; });
    const validation = validateTaskName(newName, others);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    const previous = task.name;
    task.name = newName.trim();

    const writeResult = Storage.write(Storage.KEYS.TASKS, State.tasks);
    if (!writeResult.ok) {
      // Roll back
      task.name = previous;
      return { ok: false, error: writeResult.error };
    }

    return { ok: true };
  };

  // State Module — sort, quick links, settings, and theme mutations

  /**
   * Updates the sort option in settings and persists to storage.
   * @param {'default'|'az'|'za'|'completed-last'} option
   * @returns {{ ok: true } | { ok: false, error: Error }}
   */
  State.setSortOption = function setSortOption(option) {
    const previous = State.settings.sortOption;
    State.settings.sortOption = option;

    const writeResult = Storage.write(Storage.KEYS.SETTINGS, State.settings);
    if (!writeResult.ok) {
      // Roll back
      State.settings.sortOption = previous;
      return { ok: false, error: writeResult.error };
    }

    return { ok: true };
  };

  /**
   * Validates and adds a new quick link, then persists to storage.
   * Enforces the 50-link maximum.
   * @param {string} label  1–50 characters
   * @param {string} url    1–2048 characters, must begin with http:// or https://
   * @returns {{ ok: true } | { ok: false, error: string }}
   */
  State.addQuickLink = function addQuickLink(label, url) {
    if (State.quickLinks.length >= 50) {
      return { ok: false, error: 'Quick Links limit of 50 has been reached.' };
    }

    const validation = validateQuickLink(label, url);
    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const link = {
      id: generateId(),
      label: label,
      url: url,
      createdAt: Date.now(),
    };

    State.quickLinks.push(link);

    const writeResult = Storage.write(Storage.KEYS.LINKS, State.quickLinks);
    if (!writeResult.ok) {
      // Roll back
      State.quickLinks.pop();
      return { ok: false, error: writeResult.error };
    }

    return { ok: true };
  };

  /**
   * Removes the quick link with the given id from State.quickLinks and persists.
   * @param {string} id
   * @returns {{ ok: true } | { ok: false, error: Error }}
   */
  State.deleteQuickLink = function deleteQuickLink(id) {
    const index = State.quickLinks.findIndex(function (l) { return l.id === id; });
    const removed = index !== -1 ? State.quickLinks.splice(index, 1) : [];

    const writeResult = Storage.write(Storage.KEYS.LINKS, State.quickLinks);
    if (!writeResult.ok) {
      // Roll back
      if (removed.length) State.quickLinks.splice(index, 0, removed[0]);
      return { ok: false, error: writeResult.error };
    }

    return { ok: true };
  };

  /**
   * Saves the user's display name to settings and persists.
   * Trims the value; if empty/whitespace-only, clears the stored name.
   * Truncates to 50 characters.
   * @param {string} nameValue
   * @returns {{ ok: true } | { ok: false, error: Error }}
   */
  State.saveName = function saveName(nameValue) {
    const previous = State.settings.name;
    const trimmed = (nameValue || '').trim();

    State.settings.name = trimmed.length === 0 ? '' : trimmed.slice(0, 50);

    const writeResult = Storage.write(Storage.KEYS.SETTINGS, State.settings);
    if (!writeResult.ok) {
      // Roll back
      State.settings.name = previous;
      return { ok: false, error: writeResult.error };
    }

    return { ok: true };
  };

  /**
   * Validates and saves a new session duration, resets the timer, and persists.
   * If the timer is currently running, stops it inline before updating.
   * @param {number|string} minutes  Must be an integer in [1, 120]
   * @returns {{ ok: true } | { ok: false, error: string }}
   */
  State.saveSessionDuration = function saveSessionDuration(minutes) {
    if (!validateSessionDuration(minutes)) {
      return { ok: false, error: 'Session duration must be a whole number between 1 and 120.' };
    }

    const previous = State.settings.sessionDuration;

    // Stop a running timer inline (Timer object not yet defined at this point)
    if (State.timer.running) {
      clearInterval(State.timer.intervalId);
      State.timer.running = false;
      State.timer.intervalId = null;
    }

    State.settings.sessionDuration = Number(minutes);

    const writeResult = Storage.write(Storage.KEYS.SETTINGS, State.settings);
    if (!writeResult.ok) {
      // Roll back settings; timer remains stopped (safe state)
      State.settings.sessionDuration = previous;
      return { ok: false, error: writeResult.error };
    }

    // Always sync timer to the new duration
    State.timer.totalSeconds = State.settings.sessionDuration * 60;
    State.timer.remainingSeconds = State.settings.sessionDuration * 60;

    return { ok: true };
  };

  /**
   * Toggles the active theme between 'light' and 'dark', applies it to the DOM,
   * and persists to settings.
   * @returns {{ ok: true } | { ok: false, error: Error }}
   */
  State.toggleThemeState = function toggleThemeState() {
    const previous = State.settings.theme;
    const newTheme = toggleTheme(previous);

    State.settings.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);

    const writeResult = Storage.write(Storage.KEYS.SETTINGS, State.settings);
    if (!writeResult.ok) {
      // Roll back both the in-memory value and the DOM attribute
      State.settings.theme = previous;
      document.documentElement.setAttribute('data-theme', previous);
      return { ok: false, error: writeResult.error };
    }

    return { ok: true };
  };

  // Render Module 
  /** Tracks the single active greeting-clock interval so we never start two. */
  let _greetingIntervalId = null;

  const Render = {
    greeting() {
      const now = new Date();

      // 1. Write current time to #greeting-time
      const timeEl = document.getElementById('greeting-time');
      if (timeEl) timeEl.textContent = formatTime(now);

      // 2. Write current date to #greeting-date
      const dateEl = document.getElementById('greeting-date');
      if (dateEl) dateEl.textContent = formatDate(now);

      // 3. Write the assembled greeting to #greeting-phrase
      const phraseEl = document.getElementById('greeting-phrase');
      if (phraseEl) {
        phraseEl.textContent = buildGreeting(
          getGreetingPhrase(now.getHours()),
          State.settings.name
        );
      }

      // 4. Restore the saved name into the input field (Req 2.4)
      const nameInput = document.getElementById('name-input');
      if (nameInput) nameInput.value = State.settings.name;

      // 5. Ensure only one 60-second interval is active at a time
      if (_greetingIntervalId !== null) {
        clearInterval(_greetingIntervalId);
      }
      _greetingIntervalId = setInterval(function () {
        Render.greeting();
      }, 60 * 1000);
    },

    timer() {
      // 1. Write the formatted remaining time to #timer-display
      const displayEl = document.getElementById('timer-display');
      if (displayEl) {
        displayEl.textContent = formatTimerDisplay(State.timer.remainingSeconds);
      }

      // 2. Show #timer-notification when the session has ended (notified === true),
      //    hide it otherwise — mirrors the .hidden class pattern used in the HTML.
      const notifEl = document.getElementById('timer-notification');
      if (notifEl) {
        if (State.timer.notified) {
          notifEl.classList.remove('hidden');
        } else {
          notifEl.classList.add('hidden');
        }
      }

      // 3. Populate #duration-input with the current session duration
      const durationInput = document.getElementById('duration-input');
      if (durationInput) {
        durationInput.value = State.settings.sessionDuration;
      }
    },

    tasks() {
      // 1. Sync the sort <select> value
      const sortSelect = document.getElementById('task-sort');
      if (sortSelect) sortSelect.value = State.settings.sortOption;

      // 2. Show/hide the load-error message
      const loadErrorEl = document.getElementById('task-load-error');
      if (loadErrorEl) {
        if (State._taskLoadError) {
          loadErrorEl.textContent = 'Tasks could not be loaded from storage.';
          loadErrorEl.classList.remove('hidden');
        } else {
          loadErrorEl.textContent = '';
          loadErrorEl.classList.add('hidden');
        }
      }

      // 3. Rebuild the task list
      const listEl = document.getElementById('task-list');
      if (!listEl) return;

      // Clear existing items
      listEl.innerHTML = '';

      const sorted = sortTasks(State.tasks, State.settings.sortOption);

      sorted.forEach(function (task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.setAttribute('data-id', task.id);

        // Checkbox wrapped in a label with the task name span
        const label = document.createElement('label');
        label.className = 'task-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.setAttribute('aria-label', 'Mark ' + task.name + ' as complete');
        checkbox.setAttribute('data-id', task.id);
        checkbox.setAttribute('data-action', 'toggle');
        if (task.completed) checkbox.checked = true;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'task-name' + (task.completed ? ' completed' : '');
        nameSpan.textContent = task.name;

        label.appendChild(checkbox);
        label.appendChild(nameSpan);

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'task-edit-btn';
        editBtn.setAttribute('data-id', task.id);
        editBtn.setAttribute('data-action', 'edit');
        editBtn.setAttribute('aria-label', 'Edit task ' + task.name);
        editBtn.textContent = 'Edit';

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'task-delete-btn';
        deleteBtn.setAttribute('data-id', task.id);
        deleteBtn.setAttribute('data-action', 'delete');
        deleteBtn.setAttribute('aria-label', 'Delete task ' + task.name);
        deleteBtn.textContent = 'Delete';

        // Inline validation span
        const validationSpan = document.createElement('span');
        validationSpan.className = 'validation-message';
        validationSpan.setAttribute('role', 'alert');
        validationSpan.setAttribute('aria-live', 'assertive');

        li.appendChild(label);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
        li.appendChild(validationSpan);

        listEl.appendChild(li);
      });
    },

    links() {
      // 1. Show/hide the limit message and disable/enable the Add button
      const limitMsgEl = document.getElementById('link-limit-msg');
      const addLinkBtn = document.getElementById('add-link-btn');
      const atLimit = State.quickLinks.length >= 50;

      if (limitMsgEl) {
        if (atLimit) {
          limitMsgEl.classList.remove('hidden');
        } else {
          limitMsgEl.classList.add('hidden');
        }
      }

      if (addLinkBtn) {
        addLinkBtn.disabled = atLimit;
      }

      // 2. Show/hide the load-error message
      const loadErrorEl = document.getElementById('link-load-error');
      if (loadErrorEl) {
        if (State._linkLoadError) {
          loadErrorEl.textContent = 'Quick Links could not be loaded from storage.';
          loadErrorEl.classList.remove('hidden');
        } else {
          loadErrorEl.textContent = '';
          loadErrorEl.classList.add('hidden');
        }
      }

      // 3. Rebuild the link list
      const listEl = document.getElementById('link-list');
      if (!listEl) return;

      // Clear existing items
      listEl.innerHTML = '';

      State.quickLinks.forEach(function (link) {
        const li = document.createElement('li');
        li.className = 'link-item';
        li.setAttribute('data-id', link.id);

        // Open button — label text, opens the URL in a new tab
        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'link-open-btn';
        openBtn.setAttribute('data-id', link.id);
        openBtn.setAttribute('data-action', 'open-link');
        openBtn.textContent = link.label;

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'link-delete-btn';
        deleteBtn.setAttribute('data-id', link.id);
        deleteBtn.setAttribute('data-action', 'delete-link');
        deleteBtn.setAttribute('aria-label', 'Delete link ' + link.label);
        deleteBtn.textContent = 'Delete';

        li.appendChild(openBtn);
        li.appendChild(deleteBtn);

        listEl.appendChild(li);
      });
    },

  };

  // Render Module — Error Banner

  /**
   * Displays a persistent error message in the global #error-banner element.
   * Removes the `hidden` attribute so the banner becomes visible.
   * @param {string} message  The error text to display.
   */
  Render.errorBanner = function errorBanner(message) {
    const banner = document.getElementById('error-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.removeAttribute('hidden');
  };

  Render.clearErrorBanner = function clearErrorBanner() {
    const banner = document.getElementById('error-banner');
    if (!banner) return;
    banner.textContent = '';
    banner.setAttribute('hidden', '');
  };

  // Timer Module 
  const Timer = {
    start() {
      if (State.timer.running) return;

      // Guard: clear any orphaned interval before starting a new one
      if (State.timer.intervalId !== null) {
        clearInterval(State.timer.intervalId);
        State.timer.intervalId = null;
      }

      State.timer.running = true;

      State.timer.intervalId = setInterval(function () {
        if (State.timer.remainingSeconds > 0) {
          State.timer.remainingSeconds -= 1;
          Render.timer();
        }

        if (State.timer.remainingSeconds === 0) {
          clearInterval(State.timer.intervalId);
          State.timer.intervalId = null;
          State.timer.running = false;
          State.timer.notified = true;

          // Play a brief audio alert using the Web Audio API
          try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 1);
            }
          } catch (_) {
            /* audio unavailable — silently ignore */
          }

          Render.timer();
        }
      }, 1000);
    },

    stop() {
      if (!State.timer.running) return;
      clearInterval(State.timer.intervalId);
      State.timer.intervalId = null;
      State.timer.running = false;
      Render.timer();
    },

    reset() {
      Timer.stop();
      State.timer.remainingSeconds = State.timer.totalSeconds;
      State.timer.notified = false;
      Render.timer();
    },
  };

  // Event Module 
  const Events = {
    init() {
      Events.wireNameForm();
      Events.wireDurationForm();
      Events.wireTaskForm();
      Events.wireTaskListClick();
      Events.wireTaskSort();
      Events.wireTimerButtons();
      Events.wireThemeToggle();
      Events.wireLinkForm();
      Events.wireLinkListClick();
    },

    wireNameForm() {
      const form = document.getElementById('name-form');
      if (!form) return;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const nameInput = document.getElementById('name-input');
        const validationEl = document.getElementById('name-validation');

        const result = State.saveName(nameInput ? nameInput.value : '');

        if (result.ok) {
          // Success — refresh the greeting and clear any prior validation message
          Render.greeting();
          if (validationEl) {
            validationEl.textContent = '';
          }
        } else {
          // Failure (storage unavailable) — show error, leave greeting unchanged
          if (validationEl) {
            validationEl.textContent =
              result.error && result.error.message
                ? result.error.message
                : 'Your name could not be saved. Storage may be unavailable.';
          }
        }
      });
    },

    wireDurationForm() {
      const form = document.getElementById('duration-form');
      if (!form) return;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const durationInput = document.getElementById('duration-input');
        const validationEl = document.getElementById('duration-validation');

        const value = durationInput ? durationInput.value : '';
        const result = State.saveSessionDuration(value);

        if (result.ok) {
          // Success — refresh the timer display and clear any prior validation message
          Render.timer();
          if (validationEl) {
            validationEl.textContent = '';
          }
        } else {
          // Failure — show the error in the inline validation element
          const errorText =
            result.error instanceof Error
              ? result.error.message
              : result.error;

          if (validationEl) {
            validationEl.textContent = errorText || 'Session duration could not be saved.';
          }

          // Storage error (not a validation error) — also show the global banner
          if (result.error instanceof Error) {
            Render.errorBanner(errorText || 'Session duration could not be saved.');
          }
        }
      });
    },

    wireTaskForm() {
      const form = document.getElementById('task-form');
      if (!form) return;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const taskInput = document.getElementById('task-input');
        const validationEl = document.getElementById('task-validation');

        const name = taskInput ? taskInput.value : '';
        const result = State.addTask(name);

        if (result.ok) {
          // Success — clear input, clear validation, refresh task list
          if (taskInput) taskInput.value = '';
          if (validationEl) validationEl.textContent = '';
          Render.tasks();
        } else {
          // Failure — show the error in the inline validation element
          const errorText =
            result.error instanceof Error
              ? result.error.message
              : result.error;

          if (validationEl) {
            validationEl.textContent = errorText || 'Task could not be added.';
          }

          // Storage error (not a validation error) — also show the global banner
          if (result.error instanceof Error) {
            Render.errorBanner(errorText || 'Task could not be added.');
          }
        }
      });
    },

    wireTaskListClick() {
      const widget = document.getElementById('task-widget');
      if (!widget) return;

      widget.addEventListener('click', function (e) {
        const target = e.target;
        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');

        // Guard against missing id or action
        if (!id) return;

        if (action === 'toggle') {
          // Toggle complete checkbox
          const result = State.toggleComplete(id);
          if (!result.ok) {
            const errorText =
              result.error instanceof Error
                ? result.error.message
                : result.error;
            Render.errorBanner(errorText || 'Task state could not be updated.');
          }
          Render.tasks();
        } else if (action === 'edit') {
          // Enter edit mode: replace name span with input + Save/Cancel buttons
          const li = target.closest('li[data-id="' + id + '"]');
          if (!li) return;

          const label = li.querySelector('.task-label');
          const nameSpan = li.querySelector('.task-name');
          const validationSpan = li.querySelector('.validation-message');

          if (!label || !nameSpan) return;

          // Clear validation before entering edit mode
          if (validationSpan) validationSpan.textContent = '';

          // Create an input pre-filled with the current task name
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'task-edit-input';
          input.maxLength = '200';
          input.value = nameSpan.textContent;

          // Create Save button
          const saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'task-save-btn';
          saveBtn.setAttribute('data-id', id);
          saveBtn.setAttribute('data-action', 'save-edit');
          saveBtn.setAttribute('aria-label', 'Save edit');
          saveBtn.textContent = 'Save';

          // Create Cancel button
          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'task-cancel-btn';
          cancelBtn.setAttribute('data-id', id);
          cancelBtn.setAttribute('data-action', 'cancel-edit');
          cancelBtn.setAttribute('aria-label', 'Cancel edit');
          cancelBtn.textContent = 'Cancel';

          // Replace the label with input in the DOM
          label.replaceWith(input);

          // Replace Edit button with Save button
          const editBtn = li.querySelector('.task-edit-btn');
          if (editBtn) editBtn.replaceWith(saveBtn);

          // Replace Delete button with Cancel button
          const deleteBtn = li.querySelector('.task-delete-btn');
          if (deleteBtn) deleteBtn.replaceWith(cancelBtn);

          // Focus the input and move cursor to end of text
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        } else if (action === 'save-edit') {
          // Confirm edit: validate new name and update task
          const li = target.closest('li[data-id="' + id + '"]');
          if (!li) return;

          const input = li.querySelector('.task-edit-input');
          const validationSpan = li.querySelector('.validation-message');

          if (!input) return;

          const newName = input.value;

          // Validate: must be non-empty (after trim) and ≤ 200 chars
          const trimmed = newName.trim();
          if (trimmed.length === 0) {
            if (validationSpan) {
              validationSpan.textContent = 'Task name cannot be empty.';
            }
            return;
          }

          if (trimmed.length > 200) {
            if (validationSpan) {
              validationSpan.textContent = 'Task name must not exceed 200 characters.';
            }
            return;
          }

          // Attempt to update the task
          const result = State.updateTask(id, newName);
          if (!result.ok) {
            // Show error in validation span
            const errorText =
              result.error instanceof Error
                ? result.error.message
                : result.error;
            if (validationSpan) {
              validationSpan.textContent = errorText || 'Task could not be updated.';
            }

            // Storage error — also show global banner
            if (result.error instanceof Error) {
              Render.errorBanner(errorText || 'Task could not be updated.');
            }
          } else {
            // Success — clear validation and re-render
            if (validationSpan) validationSpan.textContent = '';
            Render.tasks();
          }
        } else if (action === 'cancel-edit') {
          // Discard edit — re-render to restore original state
          Render.tasks();
        } else if (action === 'delete') {
          // Delete task
          const result = State.deleteTask(id);
          if (!result.ok) {
            const errorText =
              result.error instanceof Error
                ? result.error.message
                : result.error;
            Render.errorBanner(errorText || 'Task could not be deleted.');
          }
          // Re-render within 300 ms
          setTimeout(function () {
            Render.tasks();
          }, 0);
        }
      });
    },

    wireTaskSort() {
      const sortSelect = document.getElementById('task-sort');
      if (!sortSelect) return;

      sortSelect.addEventListener('change', function (e) {
        const option = e.target.value;

        const result = State.setSortOption(option);
        if (!result.ok) {
          const errorText =
            result.error instanceof Error
              ? result.error.message
              : result.error;
          Render.errorBanner(errorText || 'Sort option could not be saved.');
        }

        Render.tasks();
      });
    },

    wireTimerButtons() {
      const startBtn = document.getElementById('timer-start-btn');
      if (startBtn) {
        startBtn.addEventListener('click', function () {
          Timer.start();
        });
      }

      const stopBtn = document.getElementById('timer-stop-btn');
      if (stopBtn) {
        stopBtn.addEventListener('click', function () {
          Timer.stop();
        });
      }

      const resetBtn = document.getElementById('timer-reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          Timer.reset();
        });
      }

      const dismissBtn = document.getElementById('timer-dismiss-btn');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', function () {
          State.timer.notified = false;
          Render.timer();
        });
      }
    },

    wireThemeToggle() {
      const themeToggle = document.getElementById('theme-toggle');
      if (!themeToggle) return;

      themeToggle.addEventListener('click', function () {
        const result = State.toggleThemeState();

        if (result.ok) {
          // Success — update aria-pressed and icon to match new theme
          const isDark = State.settings.theme === 'dark';
          themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');

          if (isDark) {
            themeToggle.textContent = '🌙';
            themeToggle.setAttribute('aria-label', 'Switch to light theme');
          } else {
            themeToggle.textContent = '☀️';
            themeToggle.setAttribute('aria-label', 'Switch to dark theme');
          }

          // Clear any prior error banner
          Render.clearErrorBanner();
        } else {
          // Failure — show error banner
          const errorText =
            result.error instanceof Error
              ? result.error.message
              : result.error;
          Render.errorBanner(errorText || 'Theme could not be saved.');
        }
      });
    },

    wireLinkForm() {
      const form = document.getElementById('link-form');
      if (!form) return;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const labelInput = document.getElementById('link-label-input');
        const urlInput = document.getElementById('link-url-input');
        const labelValidation = document.getElementById('link-label-validation');
        const urlValidation = document.getElementById('link-url-validation');

        const label = labelInput ? labelInput.value : '';
        const url = urlInput ? urlInput.value : '';

        const result = State.addQuickLink(label, url);

        if (result.ok) {
          if (labelInput) labelInput.value = '';
          if (urlInput) urlInput.value = '';
          if (labelValidation) labelValidation.textContent = '';
          if (urlValidation) urlValidation.textContent = '';
          Render.links();
        } else {
          // Failure — check if it's a validation error or storage error
          if (result.errors) {
            // Validation error — populate the respective error spans
            if (result.errors.label && labelValidation) {
              labelValidation.textContent = result.errors.label;
            }
            if (result.errors.url && urlValidation) {
              urlValidation.textContent = result.errors.url;
            }
          } else {
            // Storage error
            const errorText =
              result.error instanceof Error
                ? result.error.message
                : result.error;
            Render.errorBanner(errorText || 'Quick link could not be added.');
          }
        }
      });
    },

    wireLinkListClick() {
      const widget = document.getElementById('quick-links-widget');
      if (!widget) return;

      widget.addEventListener('click', function (e) {
        const target = e.target;
        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');

        // Guard against missing id or action
        if (!id) return;

        if (action === 'open-link') {
          // Open the URL in a new tab
          const link = State.quickLinks.find(function (l) { return l.id === id; });
          if (link && link.url) {
            window.open(link.url, '_blank', 'noopener,noreferrer');
          }
        } else if (action === 'delete-link') {
          // Show confirmation, then delete
          const link = State.quickLinks.find(function (l) { return l.id === id; });
          if (!link) return;

          const confirmed = confirm('Delete "' + link.label + '"?');
          if (!confirmed) return;

          const result = State.deleteQuickLink(id);
          if (!result.ok) {
            const errorText =
              result.error instanceof Error
                ? result.error.message
                : result.error;
            Render.errorBanner(errorText || 'Quick link could not be deleted.');
          }

          Render.links();
        }
      });
    },
  };

  (function bootstrap() {
    // 1. Restore state from localStorage
    const loadErrors = State.load();

    // 2. Render widgets with loaded state
    Render.greeting();
    Render.timer();
    Render.tasks();
    Render.links();

    // 3. Sync theme toggle aria-pressed and icon with current theme
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const isDark = State.settings.theme === 'dark';
      themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');

      // Sync the icon to match the theme
      // Icon convention: sun icon (light mode) when theme is light,
      // moon icon (dark mode) when theme is dark
      if (isDark) {
        themeToggle.textContent = '🌙';
        themeToggle.setAttribute('aria-label', 'Switch to light theme');
      } else {
        themeToggle.textContent = '☀️';
        themeToggle.setAttribute('aria-label', 'Switch to dark theme');
      }
    }

    // 4. Restore the sort select to the saved sort option
    const taskSort = document.getElementById('task-sort');
    if (taskSort) {
      taskSort.value = State.settings.sortOption;
    }

    // 5. Display consolidated error banner if any storage reads failed on load
    if (loadErrors.length > 0) {
      const errorMessages = loadErrors.map(function (err) {
        return err && err.message ? err.message : String(err);
      });
      const consolidatedMessage =
        'Some data could not be loaded from storage: ' +
        errorMessages.join('; ') +
        '.';
      Render.errorBanner(consolidatedMessage);
    }

    // 6. Attach all event listeners
    Events.init();
  })();

  // Test exposure — strip this block before production
  if (typeof window !== 'undefined') {
    window._ldbTest = Object.assign({}, window._ldbTest, {
      Storage,
      State,
      formatTime,
      formatDate,
      getGreetingPhrase,
      buildGreeting,
      validateTaskName,
      validateSessionDuration,
      validateQuickLink,
      toggleTheme,
      generateId,
      formatTimerDisplay,
      sortTasks,
      parseStore,
      addTask:        State.addTask,
      deleteTask:     State.deleteTask,
      toggleComplete: State.toggleComplete,
      updateTask:     State.updateTask,
      setSortOption:       State.setSortOption,
      addQuickLink:        State.addQuickLink,
      deleteQuickLink:     State.deleteQuickLink,
      saveName:            State.saveName,
      saveSessionDuration: State.saveSessionDuration,
      toggleThemeState:    State.toggleThemeState,
      Render,
      Timer,
      Events,
    });
  }

})();
