import { create } from 'zustand';
import { format } from 'date-fns';
import { Priority, TaskStatus } from '@/types';

export interface UndoAction {
  message: string;
  undo: () => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

interface TaskStoreState {
  selectedDate: string; // YYYY-MM-DD
  searchQuery: string;
  filterCategory: string | null;
  filterPriority: Priority | null;
  filterStatus: TaskStatus | null;
  refreshKey: number;
  undoAction: UndoAction | null;

  setSelectedDate: (date: string) => void;
  setSearchQuery: (query: string) => void;
  setFilterCategory: (categoryId: string | null) => void;
  setFilterPriority: (priority: Priority | null) => void;
  setFilterStatus: (status: TaskStatus | null) => void;
  triggerRefresh: () => void;
  showUndo: (message: string, undoCallback: () => void) => void;
  clearUndo: () => void;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  searchQuery: '',
  filterCategory: null,
  filterPriority: null,
  filterStatus: null,
  refreshKey: 0,
  undoAction: null,

  setSelectedDate: (date: string) => set({ selectedDate: date }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setFilterCategory: (filterCategory: string | null) => set({ filterCategory }),
  setFilterPriority: (filterPriority: Priority | null) => set({ filterPriority }),
  setFilterStatus: (filterStatus: TaskStatus | null) => set({ filterStatus }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),

  showUndo: (message: string, undoCallback: () => void) => {
    const existing = get().undoAction;
    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    const timeoutId = setTimeout(() => {
      set({ undoAction: null });
    }, 5000);

    set({
      undoAction: {
        message,
        undo: () => {
          clearTimeout(timeoutId);
          undoCallback();
          set({ undoAction: null });
          get().triggerRefresh();
        },
        timeoutId,
      },
    });
  },

  clearUndo: () => {
    const existing = get().undoAction;
    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
    }
    set({ undoAction: null });
  },
}));
