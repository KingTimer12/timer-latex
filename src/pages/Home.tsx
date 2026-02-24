import CodeMirror from "@uiw/react-codemirror";
import { latex } from "codemirror-lang-latex";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import LatexPreview from "@/components/latex-preview";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

const DEBOUNCE_MS = 1000;

export default function Home() {
  const [pdfData, setPdfData] = React.useState<Uint8Array | null>(null);
  const [value, setValue] = React.useState<string>("");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  async function compile(content: string) {
    const bytes: number[] = await invoke("compile_latex", { content });
    setPdfData(new Uint8Array(bytes));
  }

  const onChange = React.useCallback((val: string) => {
    setValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => compile(val), DEBOUNCE_MS);
  }, []);

  return (
    <main className="flex h-screen">
      <ResizablePanelGroup>
        <ResizablePanel defaultSize='50%'>
          <div className="h-full">
            <CodeMirror
              value={value}
              height="100%"
              style={{ height: "100%" }}
              extensions={[latex()]}
              onChange={onChange}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize='50%'>
          <div className="flex h-full flex-col">
            <LatexPreview pdfData={pdfData} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
