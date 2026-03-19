# ✅ Deadline Tracker - Integration Testing Guide

## Current Status
**Date**: March 18, 2026  
**Phase**: 2/3 Complete (Phases 1 & 2 - **Backend** + **Frontend** ready for testing)

---

## 🚀 App Launch Command

```bash
cd /Users/weiming/Documents/deadlines/deadline-tracker
npm run tauri:dev
```

This command:
1. ✅ Starts **Vite dev server** on http://localhost:5173 (with hot-reload)
2. ✅ Compiles **Rust backend** with Cargo (Tauri 2.0)
3. ✅ Launches **Deadline Tracker** native macOS window

---

## 🧪 Manual Testing Checklist

### Test 1: App Launches & Renders UI
- [ ] Native Tauri window opens on macOS
- [ ] Dashboard visible with sidebar filters
- [ ] Empty state message appears (no tasks yet)
- [ ] QuickAddInput visible at bottom

### Test 2: Create a Task
- [ ] Press `/` or click the quick add field
- [ ] Enter: "Design login screen ~30m !high @tomorrow 3pm"
- [ ] Press Enter key
- [ ] Task appears in list
- [ ] Input clears for next task
- [ ] Task remains after refresh/restart

### Test 3: Task Display & Metadata
- [ ] Task title visible
- [ ] Priority badge shows the selected priority
- [ ] Due date shows with time if set
- [ ] Time estimate shows as metadata if set
- [ ] Hover effect on task card

### Test 4: Toggle Task Complete
- [ ] Click checkbox on left of task
- [ ] Checkbox fills with blue checkmark
- [ ] Task title becomes strikethrough + faded
- [ ] Task hides immediately when "Show completed" is off
- [ ] Task remains visible when "Show completed" is on

### Test 5: Expand Inline Task Editor
- [ ] Click on a task card
- [ ] Inline task editor opens under the task
- [ ] Notes field is editable
- [ ] Due date/time field is editable
- [ ] Time estimate field accepts "30m", "2h", or raw minutes
- [ ] Archive button visible

### Test 6: Edit Task
- [ ] Open the detail panel
- [ ] Edit title: "Design login screen" → "Design login & signup screens"
- [ ] Click "Done"
- [ ] Updated title shows in task list

### Test 7: Archive Task
- [ ] Open the inline editor
- [ ] Click "Archive" button
- [ ] Confirm archive
- [ ] Task removed from the active list

### Test 8: Add Task with All Fields
- [ ] Create new task
- [ ] Open details panel
- [ ] Edit with title, priority, time estimate, due date/time, and notes
- [ ] Task shows in list with red priority badge

### Test 9: Multiple Tasks Sorting
- [ ] Create 5 tasks with different priorities & due dates:
  - Task A: Medium, tomorrow
  - Task B: Low, today
  - Task C: High, in 3 days
  - Task D: High, today
  - Task E: Medium, today
- [ ] List should be sorted: **Due date → Priority**
  - Task D (High, today) at top
  - Task E (Medium, today) below
  - Task B (Low, today) below
  - Task A (Medium, tomorrow) below
  - Task C (High, in 3 days) at bottom

### Test 10: View Filters
- [ ] Switch between Today, Upcoming, Overdue, and All
- [ ] Lists refresh to match the selected view
- [ ] "Show completed" survives refresh and reloads completed tasks

### Test 11: System Theme Detection
- [ ] macOS Settings → General → Appearance → *Light*
- [ ] App refreshes to light theme:
  - White background
  - Dark text
  - Light cards
- [ ] Switch to *Dark*
- [ ] App switches to dark theme:
  - Dark background (#0f172a)
  - Light text
  - Dark cards

### Test 12: App Persistence
- [ ] Create 3 tasks
- [ ] Close Tauri app window
- [ ] Restart: `npm run tauri:dev`
- [ ] Same 3 tasks still present
  - ✅ If present: Database persistence working
  - ❌ If missing: Check SQLite database file

### Test 13: Error Handling
- [ ] Try to create task with empty title (should show validation error)
- [ ] Force offline (disconnect WiFi)
- [ ] Confirm app still behaves gracefully with local data

---

## 🔍 Debugging Tips

### Check Backend Logs
- Rust backend logs appear in terminal running `npm run tauri:dev`
- Look for SQL errors or handler crashes

### Check Frontend Logs
- Press: **F12** in Tauri window (or Cmd+Option+I)
- DevTools shows browser console
- Check for JavaScript errors or failed IPC calls

### Verify IPC Communication
Open browser DevTools console and run:
```javascript
// Import the test integration script (if needed)
const { runAllTests } = await import('/test-integration.ts');
await runAllTests();
```
This validates all Tauri command handlers work correctly.

### Database File Location
```bash
# macOS database location:
~/Library/Application\ Support/deadline-tracker/deadline-tracker.db
```

Extract with SQLite:
```bash
sqlite3 ~/Library/Application\ Support/deadline-tracker/deadline-tracker.db
.tables
SELECT * FROM tasks;
```

---

## 📊 Expected Results

| Test | Expected | Result |
|------|----------|--------|
| App Launch | Window opens, UI renders | ✅ / ❌ |
| Create Task | Task appears in list | ✅ / ❌ |
| Toggle Complete | Checkbox fills, strikethrough | ✅ / ❌ |
| Edit Task | Updates persist | ✅ / ❌ |
| Delete Task | Removed from list | ✅ / ❌ |
| Capacity Bar | Math correct, updates live | ✅ / ❌ |
| Sorting | Priority + due date order | ✅ / ❌ |
| Theme | System preference detected | ✅ / ❌ |
| Persistence | Tasks survive app restart | ✅ / ❌ |

---

## 🐛 Known Limitations (Phase 1 MVP)

- ❌ No keyboard shortcuts yet (Phase 3)
- ❌ No error boundary UI (crashes show blank) (Phase 3)
- ❌ No categories UI (backend ready)
- ❌ No subtasks UI (backend ready)
- ❌ No search UI
- ❌ No recurring tasks (Phase 2)
- ❌ No recurring tasks UI
- ❌ No import/export (Phase 3)
- ❌ No cloud sync (Future)

---

## ✅ Next Steps After Testing

1. **If all tests pass**:
   - Proceed to Phase 3: Polish, keyboard shortcuts, error handling
   - Add missing UI for categories, search, filters
   - Prepare GitHub Actions for macOS DMG builds
   - Create release notes
   - Tag v0.1.0 and publish to GitHub

2. **If tests fail**:
   - Check database initialization
   - Verify Rust handlers are returning correct JSON
   - Check Tauri IPC event names match between frontend & backend
   - Review browser console (F12) for JavaScript errors

---

**Last Updated**: March 18, 2026 @ 13:45 UTC  
**Build Status**: ✅ Frontend compiles, ✅ Backend compiles, ✅ Dev environment running
