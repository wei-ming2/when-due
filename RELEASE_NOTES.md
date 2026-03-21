# Release Notes: When Due v0.1.2

This file is the draft body for the first GitHub release.

## Summary

When Due is a lightweight desktop app for tracking deadlines with less friction than a full task-management suite.

Version `0.1.2` focuses on the current polished deadline-tracking core:

- capture a task quickly
- see what is due
- edit the important metadata without losing flow
- add notes or subtasks only when needed

## Highlights

- Natural quick capture like `Chem hw ~2h @24 2300`
- Deadline views for `Today`, `Upcoming`, `Overdue`, and `All`
- Desktop deadline reminders with configurable lead time
- Sidebar filters for priority and tags
- Inline row editing for due date, time estimate, tags, and priority
- Expandable notes and subtasks
- Local-first SQLite persistence
- macOS app bundle support
- Windows installer support for tester feedback

## Release Assets

Planned assets for `v0.1.2`:

- macOS `.dmg`
- Windows `.exe` installer

If Linux artifacts are included later, they should be added here only after they are verified.

## Notes For Testers

- The app is local-first. Data stays on the machine unless you export it manually.
- Windows builds created from macOS are intended for testing and feedback.
- Unsigned builds may trigger OS security prompts.

## Known Limitations

- Windows cross-builds from macOS are experimental
- The app is optimized first for solo deadline tracking, not for team workflows
- Some internal schema pieces are still carrying legacy fields that are no longer central to the UI

## Feedback Focus

The most useful feedback for `v0.1.2` is:

- missed or confusing deadlines
- anything that feels slower than it should
- editing friction in the task list
- reminders not arriving or arriving at the wrong time
- visual rough edges on macOS or Windows
- persistence problems after restart
