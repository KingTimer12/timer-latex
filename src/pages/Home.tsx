import CodeMirror from "@uiw/react-codemirror";
import { latex } from "codemirror-lang-latex";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import React from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [value, setValue] = React.useState(`
    \\documentclass{article}
    \\begin{document}
    Hello World! This is my first LaTeX document.
    \\end{document}
    `);
  const onChange = React.useCallback((val: string) => {
    console.log("val:", val);
    setValue(val);
  }, []);

  async function renderPdf() {
    const path: string = await invoke("compile_latex", { content: value });
    const assetUrl = convertFileSrc(path) + `?t=${Date.now()}`;
    setPdfUrl(assetUrl);
  }

  return (
    <main className="flex h-screen">
      <div className="h-full w-1/2">
        <CodeMirror
          value={value}
          height="100%"
          style={{ height: "100%" }}
          extensions={[latex()]}
          onChange={onChange}
        />
      </div>
      <div className="h-full w-1/2">
        <Button onClick={renderPdf}>Compilar</Button>
        {pdfUrl && (
          <iframe src={pdfUrl} style={{ width: "100%", height: "80vh" }} />
        )}
      </div>
    </main>
  );
}
