import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useContentDataStore } from "@/hook/content-data";

const appWindow = getCurrentWindow();

interface TitleBarProps {
  title?: string;
  showBack?: boolean;
}

export default function TitleBar({ title = "Timer LaTex", showBack = false }: TitleBarProps) {
  const navigate = useNavigate();
  const clearContentData = useContentDataStore((s) => s.clearContentData);

  function goHome() {
    clearContentData();
    navigate("/");
  }

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 px-3 bg-background rounded-t-xl select-none shrink-0"
    >
      <div className="flex items-center gap-1" data-tauri-drag-region>
        {showBack && (
          <button
            onClick={goHome}
            className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors mr-1"
            aria-label="Voltar para projetos"
          >
            <ChevronLeft className="size-3.5" />
            <span className="text-xs">Projetos</span>
          </button>
        )}
        <span
          data-tauri-drag-region
          className="text-xs text-foreground font-medium tracking-wide"
        >
          {title}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => appWindow.minimize()}
          className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-300 transition-colors"
          aria-label="Minimizar"
        />
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
          aria-label="Maximizar"
        />
        <button
          onClick={() => appWindow.close()}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
          aria-label="Fechar"
        />
      </div>
    </div>
  );
}
