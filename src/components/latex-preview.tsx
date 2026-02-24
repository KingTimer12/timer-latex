import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface LatexPreviewProps {
  pdfData: Uint8Array | null;
}

export default function LatexPreview({ pdfData }: LatexPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfData || !pagesRef.current) return;

    const pagesEl = pagesRef.current;
    pagesEl.innerHTML = "";

    const loadingTask = pdfjsLib.getDocument({ data: pdfData });

    loadingTask.promise.then((pdf) => {
      const renderPage = async (pageNum: number) => {
        const page = await pdf.getPage(pageNum);
        const availableWidth = pagesEl.clientWidth;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = availableWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "12px";
        wrapper.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
        wrapper.appendChild(canvas);
        pagesEl.appendChild(wrapper);

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      };

      const renderAll = async () => {
        for (let i = 1; i <= pdf.numPages; i++) {
          await renderPage(i);
        }
      };

      renderAll();
    });

    return () => {
      loadingTask.destroy();
    };
  }, [pdfData]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto bg-neutral-200">
      <div ref={pagesRef} className="mx-auto max-w-3xl px-4 py-6" />
    </div>
  );
}
