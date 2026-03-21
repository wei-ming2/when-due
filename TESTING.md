# Testing Guide

This guide covers the checks that matter most before shipping a GitHub release of When Due.

## Automated Checks

Run all of these from the repo root:

```bash
npm run type-check
npm test -- --run
cargo check --manifest-path src-tauri/Cargo.toml
```

These currently cover:

- deadline parsing
- time-estimate parsing and formatting
- reminder timing and notification planning
- task view bucketing
- task list visibility and sorting

## Manual Smoke Test

### 1. Launch

- Open the app
- Confirm the main window renders without layout glitches
- Confirm the sidebar, task list, and quick-add area all appear

### 2. Quick Add

Create tasks such as:

- `Chem hw ~2h @24 2300`
- `Essay draft !high @tomorrow 6pm`
- `MSS reading`

Verify:

- task appears immediately
- title is clean
- due date is parsed correctly
- estimate is parsed correctly
- priority defaults behave correctly
- selected tag defaults are applied when a tag filter is active

### 3. Row Editing

For an existing task:

- double-click the title and rename it
- click the due pill and update the deadline
- click the estimate pill and update the estimate
- click the tag pill and add or remove multiple tags
- change priority
- change the sort mode in the header dropdown and verify the task list order updates immediately

Verify each change persists after closing and reopening the app.
If a save fails, verify the app shows an error toast instead of silently leaving the row in a misleading state.

### 4. Notes, Images, And Nested Tasks

- open a task
- add a description
- drag an image from Finder into the notes panel, paste one, or add one with `Add image`
- add several nested tasks
- complete one nested task
- rename a nested task
- delete a nested task

Verify:

- notes auto-save
- image thumbnails appear, are not cropped awkwardly, persist after reopening the panel, and can be removed
- subtask counts update in the collapsed row
- nested tasks remain visible under the parent task after you collapse the notes section
- completed nested tasks sort below active nested tasks
- closing the notes panel returns focus to the same task row

### 5. Filters

- switch between `Today`, `Upcoming`, `Overdue`, and `All`
- filter by one priority
- filter by one tag
- move tags up and down in edit mode
- clear filters

Verify the task list updates immediately and predictably, and verify tag order still matches after quitting and relaunching.

### 6. Completion Lifecycle

- complete a task
- turn `Show completed tasks` on and off in Settings
- verify completed tasks hide when disabled
- verify completed tasks remain visible when enabled

### 7. Persistence

- quit the app completely
- relaunch
- verify tasks, tag order, notes, images, and nested tasks persist
- verify settings persist

### 8. Deadline Reminders

- open `Settings`
- enable deadline reminders
- set a short lead time such as `5` minutes
- create or edit a task with a due date a few minutes ahead
- verify the operating system asks for notification permission if needed
- verify a reminder appears at the expected time
- complete or archive the task and verify the reminder no longer fires

## Release QA

Before cutting a release:

- confirm app name is `When Due`
- confirm repository links point to `wei-ming2/when-due`
- confirm macOS app bundle launches from Finder
- confirm Windows installer artifact exists if Windows testing is part of the release
- confirm docs do not mention old product names or removed concepts like focus mode
