<script lang="ts">
  import { createEventDispatcher, onDestroy, tick } from 'svelte';
  import {
    attachmentApi,
    subtaskApi,
    type Subtask,
    type Task,
    type TaskAttachment,
  } from '../services/api';
  import { tasks } from '../stores/tasks';
  import { showErrorToast } from '../stores/toasts';

  export let task: Task;
  export async function requestClose() {
    await handleClose();
  }

  const dispatch = createEventDispatcher<{ close: void }>();

  let isLoadingSubtasks = false;
  let isAddingSubtask = false;
  let loadedTaskId = '';
  let lastTaskSignature = '';
  let editDescription = '';
  let subtasks: Subtask[] = [];
  let attachments: TaskAttachment[] = [];
  let subtaskDrafts: Record<string, string> = {};
  let newSubtaskTitle = '';
  let newSubtaskInput: HTMLInputElement | null = null;
  let attachmentInput: HTMLInputElement | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let descriptionDirty = false;
  let loadedAttachmentTaskId = '';
  let isUploadingAttachments = false;
  let isDraggingFiles = false;
  let attachmentError = '';
  let subtaskLoadRequest = 0;
  let attachmentLoadRequest = 0;
  let attachmentPreviewUrls: Record<string, string> = {};
  let dragDepth = 0;
  const imageMimeTypesByExtension: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    heic: 'image/heic',
    heif: 'image/heif',
  };

  function syncFromTask() {
    editDescription = task.description || '';
    descriptionDirty = false;
    saveStatus = 'idle';
  }

  function syncSubtaskDrafts() {
    subtaskDrafts = Object.fromEntries(subtasks.map((subtask) => [subtask.id, subtask.title]));
  }

  function syncTaskSubtaskCounts() {
    const subtaskCount = subtasks.length;
    const subtaskCompletedCount = subtasks.filter((subtask) => subtask.completed).length;

    tasks.patchLocal(task.id, {
      subtaskCount,
      subtaskCompletedCount,
    });
  }

  function syncTaskAttachmentCount() {
    tasks.patchLocal(task.id, {
      attachmentCount: attachments.length,
    });
  }

  function setAttachmentPreviewUrl(id: string, url: string) {
    const previousUrl = attachmentPreviewUrls[id];
    if (previousUrl && previousUrl !== url) {
      URL.revokeObjectURL(previousUrl);
    }

    attachmentPreviewUrls = {
      ...attachmentPreviewUrls,
      [id]: url,
    };
  }

  function removeAttachmentPreviewUrl(id: string) {
    const previousUrl = attachmentPreviewUrls[id];
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }

    const nextPreviewUrls = { ...attachmentPreviewUrls };
    delete nextPreviewUrls[id];
    attachmentPreviewUrls = nextPreviewUrls;
  }

  function pruneAttachmentPreviewUrls(nextAttachments: TaskAttachment[]) {
    const nextIds = new Set(nextAttachments.map((attachment) => attachment.id));

    for (const attachmentId of Object.keys(attachmentPreviewUrls)) {
      if (!nextIds.has(attachmentId)) {
        removeAttachmentPreviewUrl(attachmentId);
      }
    }
  }

  function getAttachmentSrc(attachment: TaskAttachment) {
    return attachmentPreviewUrls[attachment.id] ?? '';
  }

  function inferImageMimeType(file: File): string | null {
    if (file.type?.startsWith('image/')) {
      return file.type;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    return imageMimeTypesByExtension[extension] ?? null;
  }

  function getFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
    if (!dataTransfer) return [];

    const directFiles = Array.from(dataTransfer.files ?? []);
    if (directFiles.length > 0) {
      return directFiles;
    }

    return Array.from(dataTransfer.items ?? [])
      .map((item) => (item.kind === 'file' ? item.getAsFile() : null))
      .filter((file): file is File => Boolean(file));
  }

  async function hydrateAttachmentPreviewUrls(
    nextAttachments: TaskAttachment[],
    requestId: number,
    taskId: string
  ) {
    const nextUrls = await Promise.all(
      nextAttachments.map(async (attachment) => {
        if (attachmentPreviewUrls[attachment.id]) {
          return null;
        }

        try {
          const bytes = await attachmentApi.getTaskAttachmentBytes(attachment.id);
          const buffer = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          ) as ArrayBuffer;
          return {
            id: attachment.id,
            url: URL.createObjectURL(new Blob([buffer], { type: attachment.mimeType })),
          };
        } catch (error) {
          console.error('Failed to load attachment preview:', error);
          return null;
        }
      })
    );

    if (requestId !== attachmentLoadRequest || task.id !== taskId) {
      nextUrls.forEach((entry) => {
        if (entry?.url) {
          URL.revokeObjectURL(entry.url);
        }
      });
      return;
    }

    nextUrls.forEach((entry) => {
      if (entry) {
        setAttachmentPreviewUrl(entry.id, entry.url);
      }
    });
  }

  async function loadSubtasks(taskId: string) {
    const requestId = ++subtaskLoadRequest;
    loadedTaskId = taskId;
    isLoadingSubtasks = true;

    try {
      const nextSubtasks = await subtaskApi.getSubtasks(taskId);
      if (requestId !== subtaskLoadRequest || task.id !== taskId) return;
      subtasks = nextSubtasks;
      syncSubtaskDrafts();
      syncTaskSubtaskCounts();
    } catch (error) {
      if (requestId !== subtaskLoadRequest || task.id !== taskId) return;
      console.error('Failed to load subtasks:', error);
      subtasks = [];
      subtaskDrafts = {};
      syncTaskSubtaskCounts();
    } finally {
      if (requestId === subtaskLoadRequest && task.id === taskId) {
        isLoadingSubtasks = false;
      }
    }
  }

  async function loadAttachments(taskId: string) {
    const requestId = ++attachmentLoadRequest;
    loadedAttachmentTaskId = taskId;
    attachmentError = '';

    try {
      const nextAttachments = await attachmentApi.getTaskAttachments(taskId);
      if (requestId !== attachmentLoadRequest || task.id !== taskId) return;
      attachments = nextAttachments;
      pruneAttachmentPreviewUrls(nextAttachments);
      syncTaskAttachmentCount();
      await hydrateAttachmentPreviewUrls(nextAttachments, requestId, taskId);
    } catch (error) {
      if (requestId !== attachmentLoadRequest || task.id !== taskId) return;
      console.error('Failed to load attachments:', error);
      attachments = [];
      attachmentError = 'Could not load saved images.';
      syncTaskAttachmentCount();
    }
  }

  $: taskSignature = JSON.stringify({
    id: task.id,
    updatedAt: task.updatedAt,
    description: task.description ?? '',
  });

  $: if (taskSignature !== lastTaskSignature && !descriptionDirty) {
    lastTaskSignature = taskSignature;
    syncFromTask();
  }

  $: if (task.id && task.id !== loadedTaskId) {
    void loadSubtasks(task.id);
  }

  $: if (task.id && task.id !== loadedAttachmentTaskId) {
    void loadAttachments(task.id);
  }

  $: orderedSubtasks = [...subtasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.order - b.order;
  });

  $: visibleSubtasks = orderedSubtasks.filter((subtask) => !subtask.completed);
  $: activeSubtaskCount = visibleSubtasks.length;

  function clearSaveTimer() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  }

  async function persistDescription(force = false) {
    clearSaveTimer();

    if (!force && !descriptionDirty) return true;

    const nextDescription = editDescription.trim() ? editDescription : null;
    const currentDescription = task.description ?? null;

    if ((nextDescription ?? '') === (currentDescription ?? '')) {
      descriptionDirty = false;
      saveStatus = 'saved';
      return true;
    }

    saveStatus = 'saving';

    try {
      await tasks.update(task.id, { description: nextDescription });
      descriptionDirty = false;
      saveStatus = 'saved';
      return true;
    } catch (error) {
      console.error('Failed to save task description:', error);
      saveStatus = 'error';
      showErrorToast('Could not save notes.');
      return false;
    }
  }

  function scheduleDescriptionSave() {
    descriptionDirty = true;
    saveStatus = 'idle';
    clearSaveTimer();
    saveTimer = setTimeout(() => {
      void persistDescription();
    }, 500);
  }

  async function handleClose() {
    const didSave = await persistDescription(true);
    if (!didSave) return;
    dispatch('close');
  }

  async function handleAddSubtask() {
    const title = newSubtaskTitle.trim();
    if (!title) return;

    isAddingSubtask = true;
    try {
      const subtask = await subtaskApi.addSubtask(task.id, title);
      subtasks = [...subtasks, subtask];
      syncSubtaskDrafts();
      syncTaskSubtaskCounts();
      tasks.patchLocal(task.id, { updatedAt: new Date().toISOString() });
      newSubtaskTitle = '';
      await tick();
      newSubtaskInput?.focus();
    } catch (error) {
      console.error('Failed to add subtask:', error);
      showErrorToast('Could not add nested task.');
    } finally {
      isAddingSubtask = false;
    }
  }

  async function addAttachments(files: File[]) {
    const imageFiles = files
      .map((file) => ({
        file,
        mimeType: inferImageMimeType(file),
      }))
      .filter(
        (entry): entry is { file: File; mimeType: string } =>
          Boolean(entry.mimeType)
      );

    if (imageFiles.length === 0) {
      attachmentError = 'Only image files are supported right now.';
      return;
    }

    attachmentError = '';
    isUploadingAttachments = true;

    const nextAttachments = [...attachments];
    let hadUploadError = false;

    try {
      for (const { file, mimeType } of imageFiles) {
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const attachment = await attachmentApi.addTaskAttachment(task.id, file.name, mimeType, bytes);
          nextAttachments.push(attachment);
          setAttachmentPreviewUrl(attachment.id, URL.createObjectURL(file));
        } catch (error) {
          console.error('Failed to upload attachment:', error);
          hadUploadError = true;
        }
      }

      attachments = nextAttachments;
      syncTaskAttachmentCount();

      if (hadUploadError) {
        attachmentError = 'One or more images could not be added. Try a smaller file or a standard image format.';
      }
    } finally {
      isUploadingAttachments = false;
      if (hadUploadError) {
        showErrorToast('One or more images could not be added.');
      }
    }
  }

  async function handleAttachmentBrowseChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    if (files.length > 0) {
      await addAttachments(files);
    }
    target.value = '';
  }

  function handleAttachmentDragEnter(e: DragEvent) {
    e.preventDefault();
    dragDepth += 1;
    isDraggingFiles = true;
  }

  function handleAttachmentDragOver(e: DragEvent) {
    e.preventDefault();
    isDraggingFiles = true;
  }

  function handleAttachmentDragLeave() {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      isDraggingFiles = false;
    }
  }

  async function handleAttachmentDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth = 0;
    isDraggingFiles = false;
    const files = getFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      await addAttachments(files);
    }
  }

  async function handleNotesPaste(e: ClipboardEvent) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const files = items
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file && file.type.startsWith('image/')));

    if (files.length === 0) return;

    e.preventDefault();
    await addAttachments(files);
  }

  async function handleDeleteAttachment(attachmentId: string) {
    try {
      await attachmentApi.deleteTaskAttachment(attachmentId);
      attachments = attachments.filter((attachment) => attachment.id !== attachmentId);
      removeAttachmentPreviewUrl(attachmentId);
      syncTaskAttachmentCount();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      attachmentError = 'Could not remove the image.';
      showErrorToast('Could not remove the image.');
    }
  }

  async function handleToggleSubtask(subtask: Subtask) {
    const nextCompleted = !subtask.completed;
    subtasks = subtasks.map((item) =>
      item.id === subtask.id ? { ...item, completed: nextCompleted } : item
    );

    try {
      const result = await subtaskApi.toggleSubtaskComplete(subtask.id, nextCompleted);
      subtasks = subtasks.map((item) =>
        item.id === subtask.id ? { ...item, completed: nextCompleted, updatedAt: result.updatedAt } : item
      );
      syncTaskSubtaskCounts();
      tasks.patchLocal(task.id, { updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to update subtask:', error);
      showErrorToast('Could not update nested task.');
      subtasks = subtasks.map((item) =>
        item.id === subtask.id ? { ...item, completed: subtask.completed } : item
      );
    }
  }

  async function handleSaveSubtask(subtask: Subtask) {
    const nextTitle = (subtaskDrafts[subtask.id] || '').trim();
    if (!nextTitle || nextTitle === subtask.title) {
      subtaskDrafts = { ...subtaskDrafts, [subtask.id]: subtask.title };
      return;
    }

    try {
      const result = await subtaskApi.updateSubtask(subtask.id, nextTitle);
      subtasks = subtasks.map((item) =>
        item.id === subtask.id ? { ...item, title: nextTitle, updatedAt: result.updatedAt } : item
      );
      subtaskDrafts = { ...subtaskDrafts, [subtask.id]: nextTitle };
      tasks.patchLocal(task.id, { updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to rename subtask:', error);
      subtaskDrafts = { ...subtaskDrafts, [subtask.id]: subtask.title };
      showErrorToast('Could not rename nested task.');
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    try {
      await subtaskApi.deleteSubtask(subtaskId);
      subtasks = subtasks.filter((subtask) => subtask.id !== subtaskId);
      const nextDrafts = { ...subtaskDrafts };
      delete nextDrafts[subtaskId];
      subtaskDrafts = nextDrafts;
      syncTaskSubtaskCounts();
      tasks.patchLocal(task.id, { updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      showErrorToast('Could not delete nested task.');
    }
  }

  function handleSubtaskKeydown(e: KeyboardEvent, subtask: Subtask) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSaveSubtask(subtask);
      return;
    }

    if (e.key === 'Backspace' && !(subtaskDrafts[subtask.id] || '').trim()) {
      e.preventDefault();
      void handleDeleteSubtask(subtask.id);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      subtaskDrafts = { ...subtaskDrafts, [subtask.id]: subtask.title };
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      void handleClose();
    }
  }

  onDestroy(() => {
    subtaskLoadRequest += 1;
    attachmentLoadRequest += 1;
    dragDepth = 0;
    Object.values(attachmentPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    clearSaveTimer();
  });
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<section class="task-detail-inline" role="group" aria-label="Task notes and nested tasks">
  <div class="notes-card">
    <div class="section-copy">
      <h3>Notes</h3>
      <p>Write freely here, then drag, paste, or browse images into the same space.</p>
    </div>

    <div
      class="notes-surface"
      class:dragging={isDraggingFiles}
      role="group"
      aria-label="Task notes"
      on:dragenter={handleAttachmentDragEnter}
      on:dragover={handleAttachmentDragOver}
      on:dragleave={handleAttachmentDragLeave}
      on:drop={handleAttachmentDrop}
    >
      <input
        bind:this={attachmentInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        on:change={handleAttachmentBrowseChange}
      />

      <textarea
        id={`task-description-${task.id}`}
        bind:value={editDescription}
        placeholder="Add notes, links, or a short plan for this deadline"
        on:input={scheduleDescriptionSave}
        on:blur={() => void persistDescription(true)}
        on:paste={handleNotesPaste}
      />

      {#if attachments.length > 0}
        <div class="attachment-grid">
          {#each attachments as attachment (attachment.id)}
            <figure class="attachment-card">
              {#if getAttachmentSrc(attachment)}
                <img src={getAttachmentSrc(attachment)} alt="Task attachment" />
              {:else}
                <div class="attachment-placeholder">Loading image…</div>
              {/if}
              <button
                class="attachment-delete"
                on:click={() => handleDeleteAttachment(attachment.id)}
                aria-label={`Remove ${attachment.name}`}
              >
                ×
              </button>
            </figure>
          {/each}
        </div>
      {/if}

      <div class="notes-toolbar">
        <span class="notes-toolbar-copy">
          {isUploadingAttachments
            ? 'Adding images…'
            : isDraggingFiles
              ? 'Drop images to attach them to this note.'
              : 'Drag, paste, or browse an image.'}
        </span>
        <button class="browse-btn" type="button" on:click={() => attachmentInput?.click()}>
          Add image
        </button>
      </div>
    </div>

    {#if attachmentError}
      <p class="attachment-error">{attachmentError}</p>
    {/if}
  </div>

  <div class="subtasks-card">
    <div class="subtasks-header">
      <div class="section-copy">
        <h3>Nested tasks</h3>
        <p>{activeSubtaskCount} open {activeSubtaskCount === 1 ? 'step' : 'steps'}</p>
      </div>
      {#if isLoadingSubtasks}
        <span class="subtasks-status">Loading…</span>
      {/if}
    </div>

    <div class="subtasks-tree">
      <form class="subtask-add" on:submit|preventDefault={handleAddSubtask}>
        <span class="subtask-indent" aria-hidden="true"></span>
        <span class="subtask-add-icon">+</span>
        <input
          bind:this={newSubtaskInput}
          bind:value={newSubtaskTitle}
          placeholder="Add a nested task and press Enter"
          disabled={isAddingSubtask}
        />
        {#if isAddingSubtask}
          <span class="subtask-inline-status">Adding…</span>
        {/if}
      </form>

      {#if orderedSubtasks.length === 0 && !isLoadingSubtasks}
        <p class="empty-copy">Add a nested task when a deadline needs a few concrete steps.</p>
      {:else if visibleSubtasks.length === 0 && !isLoadingSubtasks}
        <p class="empty-copy">All nested tasks completed.</p>
      {/if}

      {#each visibleSubtasks as subtask (subtask.id)}
        <div class="subtask-row" class:completed={subtask.completed}>
          <span class="subtask-indent" aria-hidden="true"></span>
          <button
            class="subtask-checkbox"
            on:click={() => handleToggleSubtask(subtask)}
            aria-label={subtask.completed ? 'Mark subtask incomplete' : 'Mark subtask complete'}
          >
            {#if subtask.completed}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            {/if}
          </button>

          <input
            class="subtask-input"
            bind:value={subtaskDrafts[subtask.id]}
            on:blur={() => handleSaveSubtask(subtask)}
            on:keydown={(e) => handleSubtaskKeydown(e, subtask)}
          />

          <button
            class="subtask-delete"
            on:click={() => handleDeleteSubtask(subtask.id)}
            aria-label={`Remove ${subtask.title}`}
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .task-detail-inline {
    margin-top: 6px;
    padding: 16px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    background: color-mix(in srgb, var(--bg-secondary) 97%, white);
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
  }

  .subtasks-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .section-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-copy h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .section-copy p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .subtask-checkbox svg {
    width: 16px;
    height: 16px;
  }

  .notes-card,
  .subtasks-card {
    padding: 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
  }

  .notes-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .notes-surface,
  .notes-card textarea,
  .subtask-input,
  .subtask-add input {
    width: 100%;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .notes-surface {
    padding: 10px 12px 12px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--bg-secondary) 94%, white);
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast),
      box-shadow var(--transition-fast);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .notes-surface.dragging {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent-light) 72%, white);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
  }

  .notes-card textarea {
    min-height: 120px;
    resize: vertical;
    border: none;
    background: transparent;
    padding: 0;
    box-shadow: none;
  }

  .notes-card textarea:focus {
    outline: none;
    box-shadow: none;
  }

  .attachment-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .attachment-card {
    position: relative;
    margin: 0;
    padding: 6px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
  }

  .attachment-card img,
  .attachment-placeholder {
    width: 100%;
    min-height: 180px;
    max-height: min(360px, 42vh);
    object-fit: contain;
    border-radius: calc(var(--radius-md) - 4px);
    background: color-mix(in srgb, var(--bg-primary) 85%, white);
  }

  .attachment-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    font-size: 0.78rem;
  }

  .attachment-delete {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.74);
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .attachment-delete:hover {
    background: rgba(239, 68, 68, 0.92);
  }

  .notes-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 2px;
    border-top: 1px solid color-mix(in srgb, var(--border-color) 88%, transparent);
  }

  .notes-toolbar-copy {
    color: var(--text-tertiary);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .browse-btn {
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-pill);
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 650;
  }

  .browse-btn:hover {
    border-color: color-mix(in srgb, var(--accent) 30%, var(--border-color));
    color: var(--accent);
  }

  .attachment-error {
    margin: 0;
    color: var(--danger);
    font-size: 0.78rem;
  }

  .subtasks-status,
  .empty-copy {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }

  .subtasks-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .subtasks-tree {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 10px;
    border-left: 1px solid color-mix(in srgb, var(--border-color) 92%, transparent);
  }

  .subtask-add {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0 10px 12px;
    border-radius: var(--radius-md);
    border: 1px dashed color-mix(in srgb, var(--border-color) 84%, transparent);
    background: color-mix(in srgb, var(--bg-secondary) 96%, white);
  }

  .subtask-add-icon {
    color: var(--text-tertiary);
    font-size: 1rem;
    font-weight: 700;
    line-height: 1;
  }

  .subtask-add input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    padding: 0;
    box-shadow: none;
  }

  .subtask-add input:focus {
    outline: none;
    box-shadow: none;
  }

  .subtask-indent {
    width: 12px;
    align-self: stretch;
    border-left: 1px solid color-mix(in srgb, var(--border-color) 85%, transparent);
    flex-shrink: 0;
  }

  .subtask-inline-status {
    color: var(--text-tertiary);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .subtask-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0 10px 12px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--bg-secondary) 96%, white);
    border: 1px solid color-mix(in srgb, var(--border-color) 88%, transparent);
  }

  .subtask-row.completed {
    opacity: 0.72;
  }

  .subtask-checkbox {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 1.5px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .subtask-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    padding: 0;
    box-shadow: none;
  }

  .subtask-input:focus {
    outline: none;
    box-shadow: none;
  }

  .subtask-row.completed .subtask-input {
    text-decoration: line-through;
    color: var(--text-secondary);
  }

  .subtask-delete {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-tertiary);
    font-size: 1rem;
  }

  .subtask-delete:hover {
    color: var(--danger);
    background: rgba(239, 68, 68, 0.08);
  }

  @media (max-width: 768px) {
    .task-detail-inline {
      padding: 14px;
    }

    .subtasks-header,
    .subtask-add,
    .notes-toolbar {
        flex-direction: column;
        align-items: stretch;
    }
  }
</style>
