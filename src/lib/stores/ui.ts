// UI state store for view mode, filters, and theme
import { writable } from 'svelte/store';

export type ViewMode = 'focus' | 'all' | 'tasks-list';
export type FilterMode = 'today' | 'week' | 'overdue' | 'all';
export type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  viewMode: ViewMode;
  filterMode: FilterMode;
  themeMode: ThemeMode;
  currentTheme: 'light' | 'dark';
  selectedCategoryId?: string;
  selectedPriorities: Set<string>; // 'high' | 'medium' | 'low'
  showCompleted: boolean;
  sidebarVisible: boolean; // Show/hide filter sidebar
  taskBeingEdited?: string; // Task ID being edited
}

function createUIStore() {
  // Initialize from browser storage if available
  let initialState: UIState = {
    viewMode: 'focus',
    filterMode: 'today',
    themeMode: 'system',
    currentTheme: getSystemTheme(),
    selectedPriorities: new Set<string>(),
    showCompleted: false,
    sidebarVisible: true,
  };

  // Try to load from localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('deadline-tracker-ui');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert stored array back to Set
        if (parsed.selectedPriorities && Array.isArray(parsed.selectedPriorities)) {
          parsed.selectedPriorities = new Set(parsed.selectedPriorities);
        } else {
          parsed.selectedPriorities = new Set<string>();
        }
        initialState = { ...initialState, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load UI state from localStorage:', error);
    }
  }

  const { subscribe, set, update } = writable<UIState>(initialState);

  // Subscribe to changes and persist to localStorage
  subscribe((state) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        // Convert Set to array for JSON serialization
        const stateToSave = {
          ...state,
          selectedPriorities: Array.from(state.selectedPriorities),
        };
        localStorage.setItem('deadline-tracker-ui', JSON.stringify(stateToSave));
      } catch (error) {
        console.warn('Failed to persist UI state to localStorage:', error);
      }
    }
  });

  // Set up system theme listener
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      update((state) => ({
        ...state,
        currentTheme: state.themeMode === 'system' ? getSystemTheme() : state.currentTheme,
      }));
    };
    mediaQuery.addEventListener('change', handleChange);
  }

  return {
    subscribe,

    setViewMode(mode: ViewMode) {
      update((state) => ({ ...state, viewMode: mode }));
    },

    setFilterMode(mode: FilterMode) {
      update((state) => ({ ...state, filterMode: mode }));
    },

    setThemeMode(mode: ThemeMode) {
      update((state) => ({
        ...state,
        themeMode: mode,
        currentTheme: mode === 'system' ? getSystemTheme() : state.currentTheme,
      }));
    },

    setCurrentTheme(theme: 'light' | 'dark') {
      update((state) => ({ ...state, currentTheme: theme }));
    },

    setSelectedCategory(categoryId?: string) {
      update((state) => ({ ...state, selectedCategoryId: categoryId }));
    },

    toggleShowCompleted() {
      update((state) => ({ ...state, showCompleted: !state.showCompleted }));
    },

    setShowCompleted(show: boolean) {
      update((state) => ({ ...state, showCompleted: show }));
    },

    togglePriority(priority: string) {
      update((state) => {
        const updated = new Set(state.selectedPriorities);
        if (updated.has(priority)) {
          updated.delete(priority);
        } else {
          updated.add(priority);
        }
        return { ...state, selectedPriorities: updated };
      });
    },

    clearPriorityFilters() {
      update((state) => ({ ...state, selectedPriorities: new Set<string>() }));
    },

    toggleSidebar() {
      update((state) => ({ ...state, sidebarVisible: !state.sidebarVisible }));
    },

    setSidebarVisible(visible: boolean) {
      update((state) => ({ ...state, sidebarVisible: visible }));
    },

    setTaskBeingEdited(taskId?: string) {
      update((state) => ({ ...state, taskBeingEdited: taskId }));
    },
  };
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export const uiState = createUIStore();
