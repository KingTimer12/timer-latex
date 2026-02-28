import { create } from "zustand";

interface ContentDataState {
  contentData: string;
  setContentData: (content: string) => void;
  clearContentData: () => void;
}

export const useContentDataStore = create<ContentDataState>()((set) => ({
  contentData: "",
  setContentData: (content: string) => set(() => ({ contentData: content })),
  clearContentData: () =>
    set(() => ({
      contentData: "",
    })),
}));
