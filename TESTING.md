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
- [ ] "Today's Focus" dashboard visible
- [ ] Empty state message appears (no tasks yet)
- [ ] CapacityBar shows at top
- [ ] QuickAddInput ("+ Add a task...") visible at bottom

### Test 2: Create a Task
- [ ] Click input field or type "+ Add a task"
- [ ] Enter: "Design login screen"
- [ ] Press Enter key
- [ ] Task appears in list
- [ ] Input clears for next task
- [ ] Task shows as uncertain until refresh

### Test 3: Task Display & Metadata
- [ ] Task title visible
- [ ] Priority badge shows (default: "MEDIUM" in orange)
- [ ] Due date shows if set (currently shows today by default)
- [ ] Time estimate shows (e.g., "60m")
- [ ] Hover effect on task card

### Test 4: Toggle Task Complete
- [ ] Click checkbox on left of task
- [ ] Checkbox fills with blue checkmark
- [ ] Task title becomes strikethrough + faded
- [ ] Task remains in list (Phase 3: option to hide completed)

### Test 5: Open Task Detail Panel
- [ ] Click on task title
- [ ] Modal panel slides in from right (or overlays)
- [ ] Displays full task details:
  - Title
  - Description (if any)
  - Due date
  - Priority level
  - Time estimate
  - Status (Active/Completed)
- [ ] "Edit" button visible
- [ ] "Delete" button visible
- [ ] "Cancel" button to close

### Test 6: Edit Task
- [ ] Open task detail panel
- [ ] Click "Edit" button
- [ ] Form fields become editable
- [ ] Edit title: "Design login screen" → "Design login & signup screens"
- [ ] Click "Save" button
- [ ] Modal closes
- [ ] Updated title shows in task list

### Test 7: Delete Task
- [ ] Open task detail panel
- [ ] Click "Delete" button
- [ ] Confirm deletion (if prompt shown)
- [ ] Task removed from list
- [ ] CapacityBar updates

### Test 8: Add Task with All Fields
- [ ] Create new task
- [ ] Open detail panel
- [ ] Edit with:
  - Title: "Weekly standup"
  - Priority: "HIGH"
  - Time estimate: 30 minutes
  - Due date: tomorrow
- [ ] Task shows in list with red priority badge
- [ ] CapacityBar updated

### Test 9: Capacity Bar Updates
- [ ] Add multiple tasks with time estimates:
  - Task 1: 60 minutes
  - Task 2: 120 minutes
  - Task 3: 240 minutes
  - Total: 420m = 7 hours
- [ ] CapacityBar shows "7h / 8h left: 1h" (green, under capacity)
- [ ] Add one more 2-hour task
- [ ] CapacityBar shows "Over capacity" (red, 1h over)

### Test 10: Multiple Tasks Sorting
- [ ] Create 5 tasks with different priorities & due dates:
  - Task A: Medium, tomorrow
  - Task B: Low, today
  - Task C: High, in 3 days
  - Task D: High, today
  - Task E: Medium, today
- [ ] List should be sorted: **Focus first → Due date → Priority**
  - Task D (High, today) at top
  - Task B (Low, today) below
  - Task E (Medium, today) below
  - Task A (Medium, tomorrow) below
  - Task C (High, in 3 days) at bottom

### Test 11: Search & Filter (Phase 1 - view all)
- [ ] Currently no UI for search/filter
- [ ] All created tasks visible in "Today's Focus"

### Test 12: System Theme Detection
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

### Test 13: App Persistence
- [ ] Create 3 tasks
- [ ] Close Tauri app window
- [ ] Restart: `npm run tauri:dev`
- [ ] Same 3 tasks still present
  - ✅ If present: Database persistence working
  - ❌ If missing: Check SQLite database file

### Test 14: Error Handling (Late - Phase 3)
- [ ] Try to create task with empty title (should show validation error)
- [ ] Force offline (disconnect WiFi)
- [ ] See if error handling UI appears (Phase 3)

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
~/Library/Application\ Support/com.deadlinetracker.app/data/deadline_tracker.db
```

Extract with SQLite:
```bash
sqlite3 ~/Library/Application\ Support/com.deadlinetracker.app/data/deadline_tracker.db
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
- ❌ No search/filter UI (backend ready)
- ❌ No recurring tasks (Phase 2)
- ❌ No dark mode toggle UI (auto-detection only)
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
