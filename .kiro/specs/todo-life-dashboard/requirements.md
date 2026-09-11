# Requirements Document

## Introduction

The To-do List Life Dashboard is a client-side, single-page web application built with HTML, CSS, and Vanilla JavaScript. It provides a personal productivity hub that combines a time-aware greeting, a configurable Pomodoro focus timer, a task manager, and a quick-access link launcher — all persisted via the browser's Local Storage API. The app requires no backend, no build step, and no external dependencies.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **User**: The person using the Dashboard in a modern browser.
- **Task**: A named to-do item that can be added, edited, marked done, or deleted.
- **Task_List**: The collection of all Tasks stored in Local Storage.
- **Timer**: The countdown timer that tracks a configurable focus session.
- **Session_Duration**: The number of minutes the Timer counts down from; defaults to 25.
- **Quick_Link**: A named URL entry that the User can click to open a website.
- **Quick_Links_Store**: The collection of all Quick_Links stored in Local Storage.
- **Settings_Store**: The Local Storage entry that persists user preferences (name, theme, Session_Duration). Default settings object: `{ name: "", theme: "light", sessionDuration: 25, sortOption: "default" }`.
- **Greeting_Widget**: The UI section that displays the User's name, current time, date, and a time-based greeting phrase.
- **Timer_Widget**: The UI section that displays the countdown Timer and its controls.
- **Task_Widget**: The UI section that displays the Task_List and its controls.
- **Quick_Links_Widget**: The UI section that displays the Quick_Links and its controls.
- **Theme**: The visual mode of the Dashboard; either `light` or `dark`.
- **Local_Storage**: The browser's `window.localStorage` API used for all persistence.

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a User, I want to see the current time, date, and a personalised greeting, so that the Dashboard feels contextual and welcoming.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM (24-hour) format, updated every 60 seconds using the local system clock.
2. THE Greeting_Widget SHALL display the current date in the format "DayName, DD MonthName YYYY" (e.g., "Monday, 26 September 2025") using the local system locale.
3. WHEN the local system hour is between 05:00 and 11:59 inclusive, THE Greeting_Widget SHALL display the phrase "Good Morning".
4. WHEN the local system hour is between 12:00 and 17:59 inclusive, THE Greeting_Widget SHALL display the phrase "Good Afternoon".
5. WHEN the local system hour is between 18:00 and 20:59 inclusive, THE Greeting_Widget SHALL display the phrase "Good Evening".
6. WHEN the local system hour is between 21:00 and 23:59, or between 00:00 and 04:59 inclusive, THE Greeting_Widget SHALL display the phrase "Good Night".
7. WHEN a custom name has been saved in the Settings_Store, THE Greeting_Widget SHALL display the greeting phrase followed by a comma and the saved name, with the saved name truncated to a maximum of 50 characters (e.g., "Good Morning, Aditya").
8. WHEN no custom name has been saved in the Settings_Store, THE Greeting_Widget SHALL display the greeting phrase without a name suffix.
9. WHEN the Settings_Store cannot be read, THE Greeting_Widget SHALL display the greeting phrase without a name suffix.

---

### Requirement 2: Custom Name Setting

**User Story:** As a User, I want to set a custom name that appears in my greeting, so that the Dashboard feels personal.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input field accepting up to 50 characters and a save button for the User to enter a custom name.
2. WHEN the User submits a name containing at least one non-whitespace character, THE Dashboard SHALL persist the trimmed name to the Settings_Store and update the Greeting_Widget within 300 milliseconds.
3. WHEN the User submits an empty string or a whitespace-only string as the name, THE Dashboard SHALL remove the saved name from the Settings_Store and display the greeting without a name suffix.
4. WHEN the Dashboard loads, THE Dashboard SHALL read the name from the Settings_Store and restore it to the greeting without requiring User interaction.
5. IF the Settings_Store is unavailable when the User submits a name, THEN THE Dashboard SHALL display an error message indicating the name could not be saved and leave the greeting unchanged.
6. IF the Settings_Store is unavailable when the Dashboard loads, THEN THE Dashboard SHALL display the greeting without a name suffix.

---

### Requirement 3: Focus Timer

**User Story:** As a User, I want a countdown timer I can start, stop, and reset, so that I can focus on tasks using the Pomodoro technique.

#### Acceptance Criteria

1. THE Timer_Widget SHALL display the remaining time in MM:SS format where MM is a zero-padded value between 00 and 99 and SS is a zero-padded value between 00 and 59.
2. WHEN the Dashboard loads and no Timer session is in progress, THE Timer_Widget SHALL display the Session_Duration as the starting value, where Session_Duration is a user-configurable duration between 1 minute and 120 minutes defaulting to 25 minutes.
3. WHEN the User activates the Start control, THE Timer_Widget SHALL begin counting down in one-second intervals, decrementing the displayed remaining time by one second per interval.
4. WHEN the User activates the Stop control while the Timer is running, THE Timer_Widget SHALL pause the countdown and retain the remaining time so that the displayed value does not change until the User resumes or resets.
5. WHEN the User activates the Start control after a pause, THE Timer_Widget SHALL resume the countdown from the retained remaining time without resetting to Session_Duration.
6. WHEN the User activates the Reset control, THE Timer_Widget SHALL stop any active countdown and restore the display to the current Session_Duration within 200 milliseconds.
7. WHEN the Timer reaches 00:00, THE Timer_Widget SHALL stop counting and display "00:00".
8. WHEN the Timer reaches 00:00, THE Dashboard SHALL emit an audible alert of at least one distinct tone and display a visible notification within the Timer_Widget that persists until the User dismisses it or activates the Reset control.
9. IF the User activates the Start control while the Timer is already running, THEN THE Timer_Widget SHALL ignore the input and continue the countdown without interruption.
10. IF the User activates the Stop control while the Timer is not running, THEN THE Timer_Widget SHALL ignore the input and retain the current displayed value unchanged.

---

### Requirement 4: Configurable Session Duration

**User Story:** As a User, I want to change the Pomodoro timer duration, so that I can adapt the focus period to my preference.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input control for the User to enter a Session_Duration value in whole minutes.
2. WHEN the User submits a Session_Duration value between 1 and 120 (inclusive), THE Dashboard SHALL persist the value to the Settings_Store and update the Timer_Widget display.
3. WHEN the User submits a Session_Duration value outside the range 1–120, or submits an empty or non-numeric value, THE Dashboard SHALL display an inline validation message indicating the valid range (1–120 minutes) and retain the previous Session_Duration value.
4. WHEN the Dashboard loads, THE Dashboard SHALL read the Session_Duration from the Settings_Store and restore the Timer_Widget to that value.
5. IF no Session_Duration has been saved, THEN THE Dashboard SHALL default the Session_Duration to 25 minutes.
6. WHILE the Timer is running, WHEN a new Session_Duration is saved, THE Dashboard SHALL stop the current session, discard the remaining time, and restart the Timer from the new Session_Duration value.
7. WHEN a new Session_Duration is saved while the Timer is not running, THE Dashboard SHALL update the Timer_Widget display to the new Session_Duration without starting the Timer.

---

### Requirement 5: Task Management — Add and Store

**User Story:** As a User, I want to add tasks to my list, so that I can track what I need to do.

#### Acceptance Criteria

1. THE Task_Widget SHALL provide a text input field with a maximum input length of 200 characters and an "Add" control.
2. WHEN the User submits a non-empty task name that does not exceed 200 characters, THE Task_Widget SHALL add the Task to the Task_List, assign it a unique identifier, and persist the updated Task_List to Local_Storage within 500 milliseconds.
3. WHEN the User submits a task name that, after trimming leading and trailing whitespace, matches an existing Task name (case-insensitive), THE Task_Widget SHALL display an inline duplicate warning message within the input area and SHALL NOT add the Task.
4. WHEN the User submits an empty or whitespace-only task name, THE Task_Widget SHALL display an inline validation message within the input area and SHALL NOT add the Task.
5. WHEN the User submits a task name exceeding 200 characters, THE Task_Widget SHALL display an inline validation message indicating the character limit and SHALL NOT add the Task.
6. WHEN the Dashboard loads, THE Task_Widget SHALL read the Task_List from Local_Storage and render all previously saved Tasks without requiring User interaction within 1 second of the Dashboard becoming visible.
7. IF Local_Storage is unavailable or the stored Task_List data cannot be parsed, THEN THE Task_Widget SHALL render with an empty Task_List and display an inline error message indicating that previously saved tasks could not be loaded.

---

### Requirement 6: Task Management — Edit, Complete, and Delete

**User Story:** As a User, I want to edit, mark done, and delete tasks, so that I can keep my list accurate and up to date.

#### Acceptance Criteria

1. THE Task_Widget SHALL provide an "Edit" control for each Task.
2. WHEN the User activates the Edit control for a Task, THE Task_Widget SHALL replace the task label with an editable input pre-filled with the current task name, with the cursor positioned at the end of the pre-filled text.
3. WHEN the User confirms an edit with a non-empty, non-whitespace-only name of 1–200 characters, THE Task_Widget SHALL update the Task name, persist the updated Task_List to Local_Storage, and exit edit mode.
4. WHEN the User confirms an edit with an empty or whitespace-only name, THE Task_Widget SHALL display an inline validation message indicating the name cannot be blank and retain the original task name without exiting edit mode.
5. WHEN the User confirms an edit with a name exceeding 200 characters, THE Task_Widget SHALL display an inline validation message indicating the maximum character limit and retain focus on the editable input without exiting edit mode.
6. IF Local_Storage is unavailable when the Task_Widget attempts to persist a task edit, THEN THE Task_Widget SHALL display an error message indicating the change could not be saved and retain the previous stored state.
7. THE Task_Widget SHALL provide a checkbox or toggle control for each Task to mark it as done.
8. WHEN the User marks a Task as done, THE Task_Widget SHALL apply a strikethrough style to the task label and persist the updated Task_List to Local_Storage.
9. WHEN the User un-marks a completed Task, THE Task_Widget SHALL remove the strikethrough style from the task label and persist the updated Task_List to Local_Storage.
10. THE Task_Widget SHALL provide a "Delete" control for each Task.
11. WHEN the User activates the Delete control for a Task, THE Task_Widget SHALL remove the Task from the Task_List, persist the updated Task_List to Local_Storage, and reflect the removal in the displayed list within 300 milliseconds.
12. IF Local_Storage is unavailable when the Task_Widget attempts to persist a deletion or completion state change, THEN THE Task_Widget SHALL display an error message indicating the change could not be saved and retain the previous stored state.

---

### Requirement 7: Task Sorting

**User Story:** As a User, I want to sort my tasks, so that I can organise them in a way that matches my priorities.

#### Acceptance Criteria

1. THE Task_Widget SHALL provide a sort control with at least the following options: "Default (creation order)", "Alphabetical (A–Z)", "Alphabetical (Z–A)", "Completed last". For Alphabetical options, tasks with identical names SHALL fall back to creation order. For "Completed last", incomplete tasks SHALL appear before completed tasks, with each group retaining creation order internally.
2. WHEN the User selects a sort option, THE Task_Widget SHALL reorder the displayed Task_List according to the selected option without modifying the underlying creation order in Local_Storage, and SHALL persist the selected sort option to Local_Storage.
3. WHEN the Dashboard loads, THE Task_Widget SHALL apply the sort option that was last selected by the User.
4. IF no sort option has been previously saved, THEN THE Task_Widget SHALL display Tasks in creation order.

---

### Requirement 8: Quick Links — Add and Open

**User Story:** As a User, I want to add quick-access links to my favourite websites, so that I can open them with one click.

#### Acceptance Criteria

1. THE Quick_Links_Widget SHALL provide a label input field accepting 1–50 characters, a URL input field accepting 1–2048 characters, and an "Add" button.
2. WHEN the User submits a label of 1–50 characters and a URL beginning with `http://` or `https://` and not exceeding 2048 characters, THE Quick_Links_Widget SHALL persist the Quick_Link to the Quick_Links_Store and render the new link button within 300 ms, up to a maximum of 50 stored Quick_Links.
3. WHEN the User submits an empty label, a label exceeding 50 characters, an empty URL, a URL not beginning with `http://` or `https://`, or a URL exceeding 2048 characters, THE Quick_Links_Widget SHALL display an inline validation message adjacent to the offending field and SHALL NOT add the Quick_Link to the Quick_Links_Store.
4. WHEN the User clicks a Quick_Link button, THE Dashboard SHALL open the associated URL in a new browser tab without navigating away from the Dashboard.
5. WHEN the Dashboard loads, THE Quick_Links_Widget SHALL read the Quick_Links_Store from Local_Storage and render all previously saved Quick_Links within 500 ms, without requiring User interaction.
6. IF the Quick_Links_Store already contains 50 Quick_Links, THEN THE Quick_Links_Widget SHALL display an inline message indicating the limit has been reached and SHALL disable the "Add" button until a Quick_Link is removed.
7. IF Local_Storage is unavailable or returns a parse error on Dashboard load, THEN THE Quick_Links_Widget SHALL render with an empty Quick_Links list and display an inline error message indicating that saved links could not be loaded.

---

### Requirement 9: Quick Links — Delete

**User Story:** As a User, I want to remove Quick Links I no longer need, so that my link panel stays tidy.

#### Acceptance Criteria

1. THE Quick_Links_Widget SHALL provide a "Delete" control for each Quick_Link.
2. WHEN the User activates the Delete control for a Quick_Link, THE Quick_Links_Widget SHALL display a confirmation prompt before proceeding with the deletion.
3. WHEN the User confirms the deletion, THE Quick_Links_Widget SHALL remove the Quick_Link from the Quick_Links_Store, persist the updated store to Local_Storage, and re-render the Quick_Links list to reflect the removal.
4. IF a Local_Storage write fails during deletion, THEN THE Quick_Links_Widget SHALL retain the Quick_Link in memory, revert the visual removal, and notify the User that the deletion could not be saved.

---

### Requirement 10: Light / Dark Theme

**User Story:** As a User, I want to switch between a light and dark theme, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a theme toggle control that is visible and interactable in both `light` and `dark` themes at all times.
2. WHEN the User activates the theme toggle, THE Dashboard SHALL switch the active Theme between `light` and `dark` and apply the corresponding visual styles to all widgets within 100 milliseconds.
3. WHEN the User activates the theme toggle, THE Dashboard SHALL persist the newly selected Theme value to the Settings_Store before the next user interaction.
4. IF the Settings_Store is unavailable when the User activates the theme toggle, THEN THE Dashboard SHALL retain the active Theme for the current session and display an error message indicating the preference could not be saved.
5. WHEN the Dashboard loads, THE Dashboard SHALL read the Theme from the Settings_Store and apply it before rendering any visible content to prevent a flash of unstyled content.
6. IF no Theme has been saved in the Settings_Store, THEN THE Dashboard SHALL apply the `light` Theme by default.
7. IF the Settings_Store is unavailable on load, THEN THE Dashboard SHALL apply the `light` Theme by default and proceed with rendering.

---

### Requirement 11: Data Persistence and Recovery

**User Story:** As a User, I want my data to be automatically saved and restored, so that I never lose my tasks, links, or settings between sessions.

#### Acceptance Criteria

1. WHEN a mutation (add, edit, delete, or reorder) is applied to Task_List, Quick_Links_Store, or Settings_Store, THE Dashboard SHALL persist the updated store to Local_Storage before acknowledging the change in the UI.
2. WHEN the Dashboard loads, THE Dashboard SHALL restore Task_List, Quick_Links_Store, and Settings_Store from Local_Storage before rendering widget content.
3. IF Local_Storage data for a given key is absent, is not valid JSON, or does not conform to the expected store structure, THEN THE Dashboard SHALL initialise that key with its safe empty default — an empty array for Task_List and Quick_Links_Store, and the default Settings_Store object `{ name: "", theme: "light", sessionDuration: 25, sortOption: "default" }` — and SHALL continue loading without displaying an error to the User.
4. IF a Local_Storage write operation fails (e.g., storage quota exceeded), THEN THE Dashboard SHALL retain the mutation in memory for the current session and SHALL display a persistent error indicator to the User stating that the change could not be saved.

---

### Requirement 12: Responsive Layout

**User Story:** As a User, I want the Dashboard to be usable on both desktop and mobile screen sizes, so that I can access it from any device.

#### Acceptance Criteria

1. THE Dashboard SHALL display all four widgets (Greeting_Widget, Timer_Widget, Task_Widget, Quick_Links_Widget) on viewport widths of 320 px and above without horizontal scrolling.
2. WHEN the viewport width is 768 px or greater, THE Dashboard SHALL arrange widgets in a multi-column grid layout with at least two columns.
3. WHEN the viewport width is below 768 px, THE Dashboard SHALL stack widgets in a single-column layout in the order: Greeting_Widget, Timer_Widget, Task_Widget, Quick_Links_Widget.
