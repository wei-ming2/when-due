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

### Expanded Task

Expanding a task is mainly for:

- description / notes
- subtasks

The expanded section should be treated like extra context, not the main editing screen.

## Filters

Use the sidebar to:

- switch between `Today`, `Upcoming`, `Overdue`, and `All`
- filter by one priority at a time
- filter by a tag
- manage tags

## Completed Tasks

Completed tasks can be:

- hidden completely
- shown in a separate collapsible section
- auto-archived after a configurable number of days

You can control completed-task behavior in Settings.

## Keyboard Shortcuts

- `/` focuses quick add
- `Cmd/Ctrl + K` focuses quick add
- `Enter` in quick add submits the task
- `Enter` in subtask input adds a subtask
- `Escape` closes the expanded task section

## Notes On The Current Product

When Due is intentionally narrower than a full task manager.

It is best for:

- school assignments
- project deadlines
- deliverables
- things with a real due date

It is not trying to be a team project tracker or a general knowledge workspace.
