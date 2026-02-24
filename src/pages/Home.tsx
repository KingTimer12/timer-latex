import CodeMirror from "@uiw/react-codemirror";
import { latex } from "codemirror-lang-latex";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import LatexPreview from "@/components/latex-preview";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  LSPClient,
  languageServerExtensions,
  serverDiagnostics,
} from "@codemirror/lsp-client";
import { lintGutter } from "@codemirror/lint";
import { bracketMatching } from "@codemirror/language";
import { createTexlabTransport } from "@/lib/texlab-transport";
import { type Extension } from "@codemirror/state";

const DEBOUNCE_MS = 1000;
const FILE_URI = "file:///tmp/timer-latex/main.tex";

export default function Home() {
  const [pdfData, setPdfData] = React.useState<Uint8Array | null>(null);
  const [value, setValue] = React.useState<string>("");
  const [lspExtensions, setLspExtensions] = React.useState<Extension[]>([]);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lspClientRef = React.useRef<LSPClient | null>(null);

  React.useEffect(() => {
    const client = new LSPClient({
      rootUri: "file:///tmp/timer-latex",
      extensions: [...languageServerExtensions(), serverDiagnostics()],
    });
    lspClientRef.current = client;

    let mounted = true;

    createTexlabTransport()
      .then((transport) => {
        if (!mounted) return;
        client.connect(transport);
        setLspExtensions([client.plugin(FILE_URI, "latex")]);
      })
      .catch(console.error);

    return () => {
      mounted = false;
      client.disconnect();
    };
  }, []);

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
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50}>
          <div className="h-full">
            <CodeMirror
              value={value}
              height="100%"
              style={{ height: "100%" }}
              extensions={[latex(), lintGutter(), bracketMatching(), ...lspExtensions]}
              onChange={onChange}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>
          <div className="flex h-full flex-col">
            <LatexPreview pdfData={pdfData} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
