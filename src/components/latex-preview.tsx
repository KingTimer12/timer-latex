import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useLoadStore } from "@/hook/loading-store";
import { useThemeStore } from "@/hook/theme-store";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface LatexPreviewProps {
  pdfData: Uint8Array | null;
}

export default function LatexPreview({ pdfData }: LatexPreviewProps) {
  const resetLoading = useLoadStore((s) => s.resetLoading);
  const { theme } = useThemeStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const renderAll = async (pagesEl: HTMLDivElement, isDark: boolean) => {
    const pdf = pdfRef.current;
    if (!pdf) return;

    pagesEl.innerHTML = "";
    const availableWidth = pagesEl.clientWidth;
    const dpr = window.devicePixelRatio || 1;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = (availableWidth / unscaledViewport.width) * dpr;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      canvas.style.filter = isDark ? "invert(1) hue-rotate(180deg)" : "none";

      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "12px";
      wrapper.style.boxShadow = isDark
        ? "0 4px 16px rgba(0,0,0,0.6)"
        : "0 1px 4px rgba(0,0,0,0.15)";
      wrapper.appendChild(canvas);
      pagesEl.appendChild(wrapper);

      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    }
  };

  useEffect(() => {
    if (!pdfData || !pagesRef.current) return;

    const pagesEl = pagesRef.current;
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });

    loadingTask.promise.then((pdf) => {
      pdfRef.current = pdf;
      renderAll(pagesEl, theme === "dark").then(() => resetLoading());
    });

    return () => {
      loadingTask.destroy();
      pdfRef.current = null;
    };
  }, [pdfData]);

  useEffect(() => {
    const pagesEl = pagesRef.current;
    if (!pagesEl || !pdfRef.current) return;
    renderAll(pagesEl, theme === "dark");
  }, [theme]);

  useEffect(() => {
    const pagesEl = pagesRef.current;
    if (!pagesEl) return;

    let debounceTimer: ReturnType<typeof setTimeout>;

    const observer = new ResizeObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (pdfRef.current) renderAll(pagesEl, theme === "dark");
      }, 150);
    });

    observer.observe(pagesEl);

    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [theme]);

  return (
    <div ref={scrollRef} className={`h-full overflow-y-auto ${theme === "dark" ? "bg-neutral-800" : "bg-neutral-200"}`}>
      <div ref={pagesRef} />
    </div>
  );
}
