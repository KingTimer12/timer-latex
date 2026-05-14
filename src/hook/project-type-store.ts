import { create } from "zustand";

type ProjectType = "latex" | "quarkdown";

interface ProjectTypeState {
  projectType: ProjectType;
  setProjectType: (t: ProjectType) => void;
}

export const useProjectTypeStore = create<ProjectTypeState>()((set) => ({
  projectType: "latex",
  setProjectType: (projectType) => set({ projectType }),
}));
