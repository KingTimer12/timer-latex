import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export default function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 px-3 bg-background rounded-t-xl select-none shrink-0"
    >
      <span
        data-tauri-drag-region
        className="text-xs text-foreground font-medium tracking-wide"
      >
        Timer LaTex
      </span>

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
