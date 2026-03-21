// UI state store for filters and theme
import { writable } from 'svelte/store';

export type FilterMode = 'today' | 'week' | 'overdue' | 'all';
export type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  filterMode: FilterMode;
  themeMode: ThemeMode;
  currentTheme: 'light' | 'dark';
  completedRetentionDays: number;
  completedSectionExpanded: boolean;
  notificationsEnabled: boolean;
  notificationLeadMinutes: number;
  selectedCategoryId?: string;
  selectedPriorities: Set<string>; // 'high' | 'medium' | 'low'
  showCompleted: boolean;
  sidebarVisible: boolean; // Show/hide filter sidebar
}

function createUIStore() {
  const STORAGE_VERSION = 5;

  // Initialize from browser storage if available
  let initialState: UIState = {
    filterMode: 'all',
    themeMode: 'system',
    currentTheme: getSystemTheme(),
    completedRetentionDays: 7,
    completedSectionExpanded: false,
    notificationsEnabled: false,
    notificationLeadMinutes: 30,
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
        const storageVersion =
          typeof parsed.storageVersion === 'number' ? parsed.storageVersion : 1;
        // Convert stored array back to Set
        if (parsed.selectedPriorities && Array.isArray(parsed.selectedPriorities)) {
          parsed.selectedPriorities = new Set(parsed.selectedPriorities);
          if (parsed.selectedPriorities.size > 1) {
            parsed.selectedPriorities = new Set<string>();
          }
        } else {
          parsed.selectedPriorities = new Set<string>();
        }
        if (
          typeof parsed.completedRetentionDays !== 'number' ||
          Number.isNaN(parsed.completedRetentionDays)
        ) {
          parsed.completedRetentionDays = 7;
        }
        if (typeof parsed.completedSectionExpanded !== 'boolean') {
          parsed.completedSectionExpanded = false;
        }
        if (typeof parsed.notificationsEnabled !== 'boolean') {
          parsed.notificationsEnabled = false;
        }
        if (
          typeof parsed.notificationLeadMinutes !== 'number' ||
          Number.isNaN(parsed.notificationLeadMinutes)
        ) {
          parsed.notificationLeadMinutes = 30;
        }
        if (!parsed.filterMode || !['today', 'week', 'overdue', 'all'].includes(parsed.filterMode)) {
          parsed.filterMode = 'all';
        }
        if (storageVersion < STORAGE_VERSION && parsed.filterMode === 'today') {
          parsed.filterMode = 'all';
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
          storageVersion: STORAGE_VERSION,
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

    setCompletedRetentionDays(days: number) {
      const nextDays = Math.min(Math.max(Math.round(days), 0), 365);
      update((state) => ({ ...state, completedRetentionDays: nextDays }));
    },

    setNotificationsEnabled(enabled: boolean) {
      update((state) => ({ ...state, notificationsEnabled: enabled }));
    },

    setNotificationLeadMinutes(minutes: number) {
      const nextMinutes = Math.min(Math.max(Math.round(minutes), 0), 60 * 24 * 30);
      update((state) => ({ ...state, notificationLeadMinutes: nextMinutes }));
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

    toggleCompletedSection() {
      update((state) => ({ ...state, completedSectionExpanded: !state.completedSectionExpanded }));
    },

    setCompletedSectionExpanded(expanded: boolean) {
      update((state) => ({ ...state, completedSectionExpanded: expanded }));
    },

    togglePriority(priority: string) {
      update((state) => {
        const updated = new Set<string>();
        if (!state.selectedPriorities.has(priority) || state.selectedPriorities.size !== 1) {
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
  };
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export const uiState = createUIStore();
