# Changelog

All notable changes to When Due are documented here.

## [Unreleased]

- Docs cleanup for GitHub release
- Release workflow and cross-platform packaging polish
- Desktop deadline reminders with configurable lead time
- Reminder timing tests and notification-permission settings
- In-app error toasts for failed task, notes, and tag edits
- Focus returning to the task row after closing the notes panel
- Whiter app icon artwork and regenerated bundle icons

## [0.1.0] - 2026-03-20

### Added

- Tauri 2 desktop app with Svelte frontend and Rust backend
- Quick-add parser for deadlines, estimates, and priority flags
- Deadline views: `Today`, `Upcoming`, `Overdue`, and `All`
- Priority filters and tag filters
- Multi-tag task support
- Expandable notes and subtask checklist per task
- Local SQLite persistence
- macOS app bundle
- Windows NSIS installer support, including cross-builds from macOS for tester feedback

### Changed

- Simplified the product toward deadline tracking instead of a broader task-suite model
- Moved most metadata editing onto the task row for faster day-to-day use
- Reduced UI noise in the task list through quieter defaults and progressive disclosure

### Fixed

- Task visibility after quick add
- Completed-task hiding behavior
- Date parsing and time-estimate parsing for compact inputs
- macOS icon sizing and bundling polish
