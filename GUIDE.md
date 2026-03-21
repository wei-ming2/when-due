# When Due Guide

This guide is for everyday use of When Due.

## Core Idea

When Due is built around one job:

- capture deadlines quickly
- see what matters now
- edit details without breaking flow

## Quick Add Syntax

The input box understands a compact syntax:

- `@...` sets the due date
- `~...` sets the time estimate
- `!high`, `!medium`, `!low` sets priority

Examples:

```text
Chem hw ~2h @24 2300
Essay draft !high @tomorrow 6pm
Review slides @monday 9am
Pay fees @1/5 2300
```

## Date Input Rules

### Day Only

```text
@24 2300
```

Means:

- the 24th of the current month if it is still upcoming
- otherwise the 24th of the next month

### Day / Month

```text
@1/5 2300
```

Means:

- `1 May 23:00` using day/month ordering
- if that date has already passed this year, it rolls into the next year

### Relative Dates

Examples:

```text
@today 5pm
@tomorrow 9am
@next week 9am
@eom
```

## Time Estimates

Examples:

```text
~30m
~45
~2h
~1.5h
~2h30m
```

Rules:

- bare numbers mean minutes
- `h` means hours
- `m` means minutes

## Task Editing

### On The Row

You can edit most task metadata directly from the task row:

- double-click the title to rename
- click the due chip or due icon to edit deadline
- click the estimate chip or clock icon to edit estimate
- click tag chips or the tag icon to edit tags
- click the priority badge to change priority
- click the notes button to open notes, images, and nested tasks

### Defaults While Adding

Quick add can inherit context from the UI:

- the selected tag becomes the default tag for new tasks
- the selected priority becomes the default priority for new tasks
- if no priority filter is selected, Settings can define the default priority

### Sorting

Use the sort dropdown in the top-right header to switch between:

- `Due date (soonest first)`
- `Date added (newest first)`
- `Priority (high to low)`

### Notes And Nested Tasks

Opening the notes panel is mainly for:

- notes and images
- nested tasks

It opens as a small floating panel, auto-saves notes as you type, and closes when you click away or press `Escape`.
If a save fails, the panel stays open and the app shows an in-app error message instead of pretending the change worked.

Nested tasks also stay visible under the parent task in the main list, so you can see the breakdown without reopening the notes section.

## Filters

Use the sidebar to:

- switch between `Today`, `Upcoming`, `Overdue`, and `All`
- filter by one priority at a time
- filter by a tag
- manage tags
- move tags up or down in edit mode

## Completed Tasks

Completed tasks can be:

- hidden completely
- shown in a separate collapsible section
- auto-archived after a configurable number of days

You can control completed-task behavior in Settings.

## Deadline Reminders

When Due can send desktop notifications for active tasks with deadlines.

- enable reminders in `Settings`
- choose how many minutes before the deadline you want to be reminded
- set reminder lead time to `0` if you want a notification right when something is due

When reminders are enabled, the app keeps scheduled notifications in sync as tasks are added, edited, completed, or archived.

## Images

You can add images to a task from the notes section by:

- dragging image files into the note area, including from Finder
- pasting an image directly into the notes panel
- clicking `Add image`

Images are stored locally with your app data.

## Keyboard Shortcuts

- `/` focuses quick add
- `Cmd/Ctrl + K` focuses quick add
- `Enter` in quick add submits the task
- `Enter` in subtask input adds a subtask
- `Escape` closes the notes panel
- `Escape` closes any open row editor

## Notes On The Current Product

When Due is intentionally narrower than a full task manager.

It is best for:

- school assignments
- project deadlines
- deliverables
- things with a real due date

It is not trying to be a team project tracker or a general knowledge workspace.
