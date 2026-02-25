import { SunIcon, MoonIcon } from "lucide-react";
import { useThemeStore } from "@/hook/theme-store";

export default function StatusBar() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="flex items-center justify-end h-6 px-3 bg-background border-t border-border shrink-0">
      <button
        onClick={toggleTheme}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Alternar tema"
      >
        {theme === "dark" ? (
          <SunIcon className="size-3" />
        ) : (
          <MoonIcon className="size-3" />
        )}
        <span className="text-[10px]">{theme === "dark" ? "Claro" : "Escuro"}</span>
      </button>
    </div>
  );
}
