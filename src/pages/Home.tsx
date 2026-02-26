import CodeMirror from "@uiw/react-codemirror";
import { latex } from "codemirror-lang-latex";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import LatexPreview from "@/components/latex-preview";
import TitleBar from "@/components/title-bar";
import StatusBar from "@/components/status-bar";
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
import { useLoadStore } from "@/hook/loading-store";
import { useThemeStore } from "@/hook/theme-store";
import { Spinner } from "@/components/ui/spinner";

const DEBOUNCE_MS = 1000;
const FILE_URI = "file:///tmp/timer-latex/main.tex";

export default function Home() {
  const { startLoading, stopLoading, loading } = useLoadStore();
  const { theme } = useThemeStore();
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
    startLoading();
    const bytes: number[] = await invoke("compile_latex", { content });
    setPdfData(new Uint8Array(bytes));
  }

  const onChange = React.useCallback((val: string) => {
    setValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => compile(val), DEBOUNCE_MS);
  }, []);

  return (
    <main className="flex flex-col h-full">
      <TitleBar />
      <ResizablePanelGroup className="flex-1 min-h-0">
        <ResizablePanel defaultSize={50}>
          <div className="h-full">
            <CodeMirror
              value={value}
              height="100%"
              style={{ height: "100%" }}
              theme={theme}
              extensions={[
                latex(),
                lintGutter(),
                bracketMatching(),
                ...lspExtensions,
              ]}
              onChange={onChange}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>
          <div className="relative flex h-full flex-col">
            {loading > 0 && (
              <div className="absolute z-50 w-full h-full flex gap-2 justify-center items-center bg-primary/40 backdrop-blur-lg">
                <div className="animate-pulse flex gap-2 justify-center text-primary-foreground">
                  <Spinner className="size-5" />
                  <p>Compilando...</p>
                </div>
              </div>
            )}
            <LatexPreview pdfData={pdfData} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <StatusBar />
    </main>
  );
}
