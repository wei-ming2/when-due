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

### 3. Row Editing

For an existing task:

- double-click the title and rename it
- click the due pill and update the deadline
- click the estimate pill and update the estimate
- click the tag pill and add or remove multiple tags
- change priority

Verify each change persists after closing and reopening the app.

### 4. Notes And Subtasks

- open a task
- add a description
- add several subtasks
- complete one subtask
- rename a subtask
- delete a subtask

Verify:

- notes auto-save
- subtask counts update in the collapsed row
- completed subtasks sort below active subtasks

### 5. Filters

- switch between `Today`, `Upcoming`, `Overdue`, and `All`
- filter by one priority
- filter by one tag
- clear filters

Verify the task list updates immediately and predictably.

### 6. Completion Lifecycle

- complete a task
- turn `Show completed tasks` on and off in Settings
- verify completed tasks hide when disabled
- verify completed tasks remain visible when enabled

### 7. Persistence

- quit the app completely
- relaunch
- verify tasks, tags, notes, and subtasks persist
- verify settings persist

## Release QA

Before cutting a release:

- confirm app name is `When Due`
- confirm repository links point to `wei-ming2/when-due`
- confirm macOS app bundle launches from Finder
- confirm Windows installer artifact exists if Windows testing is part of the release
- confirm docs do not mention old product names or removed concepts like focus mode
