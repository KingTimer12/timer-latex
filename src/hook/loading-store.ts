import { create } from "zustand";

interface LoadState {
  loading: number;
  startLoading: () => void;
  stopLoading: () => void;
  resetLoading: () => void;
}

export const useLoadStore = create<LoadState>()((set) => ({
  loading: 0,
  startLoading: () =>
    set((state: { loading: number }) => ({ loading: state.loading + 1 })),
  stopLoading: () =>
    set((state: { loading: number }) => ({
      loading: Math.max(0, state.loading - 1),
    })),
  resetLoading: () => set({ loading: 0 }),
}));
