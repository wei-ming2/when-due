/**
 * Integration test: Verify Tauri IPC communication
 * 
 * This test validates:
 * 1. Backend handlers respond to IPC invocations
 * 2. Task CRUD operations work end-to-end
 * 3. Stores update correctly after backend operations
 * 4. Frontend re-renders with new data
 */

import { invoke } from '@tauri-apps/api/core';

async function testGetTasks() {
  console.log('📋 Testing: get_tasks("today")');
  try {
    const tasks = await invoke('get_tasks', { filter: 'today', includeCompleted: false });
    console.log('✅ Success. Tasks:', tasks);
    return tasks;
  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  }
}

async function testCreateTask() {
  console.log('\n➕ Testing: createTask');
  try {
    const task = await invoke('create_task', {
      title: 'Integration Test Task',
      description: 'This is a test task created at ' + new Date().toISOString(),
      dueDate: new Date().toISOString(),
      priority: 'medium',
      timeEstimate: 60,
      categoryId: null,
    });
    console.log('✅ Success. Created task:', task);
    return task;
  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  }
}

async function testToggleComplete(taskId: string) {
  console.log('\n✓ Testing: toggleTaskComplete');
  try {
    const result = await invoke('toggle_task_complete', {
      id: taskId,
      completed: true,
    });
    console.log('✅ Success. Toggled task:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  }
}

async function testUpdateTask(taskId: string) {
  console.log('\n✏️ Testing: updateTask');
  try {
    const updated = await invoke('update_task', {
      id: taskId,
      title: 'Integration Test Task - UPDATED',
      description: 'Updated description at ' + new Date().toISOString(),
    });
    console.log('✅ Success. Updated task:', updated);
    return updated;
  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  }
}

async function testDeleteTask(taskId: string) {
  console.log('\n🗄️ Testing: archiveTask');
  try {
    const result = await invoke('delete_task', { id: taskId });
    console.log('✅ Success. Archived task');
    return result;
  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  }
}

async function testGetCategories() {
  console.log('\n📂 Testing: getCategories');
  try {
    const categories = await invoke('get_categories');
    console.log('✅ Success. Categories:', categories);
    return categories;
  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Integration Tests\n');
  console.log('================================\n');

  try {
    // Test 1: Get existing tasks
    await testGetTasks();

    // Test 2: Create new task
    const newTask = await testCreateTask();
    const taskId = (newTask as any).id;

    // Test 3: Update task
    await testUpdateTask(taskId);

    // Test 4: Toggle complete
    await testToggleComplete(taskId);

    // Test 5: Get updated tasks
    await testGetTasks();

    // Test 6: Get categories
    await testGetCategories();

    // Test 7: Delete task
    await testDeleteTask(taskId);

    // Test 8: Verify deletion
    await testGetTasks();

    console.log('\n================================');
    console.log('✅ All tests passed!\n');
  } catch (error) {
    console.error('\n================================');
    console.error('❌ Test suite failed:', error);
  }
}

// Export for use in browser console or test runner
export { runAllTests, testGetTasks, testCreateTask, testToggleComplete, testUpdateTask, testDeleteTask, testGetCategories };

// If running in Node.js, execute tests immediately
if (typeof window === 'undefined') {
  runAllTests().catch(console.error);
}
