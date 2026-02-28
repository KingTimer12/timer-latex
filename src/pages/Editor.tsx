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
import { useParams } from "react-router-dom";
import { useContentDataStore } from "@/hook/content-data";

const DEBOUNCE_MS = 1000;

export default function Editor() {
  const { file } = useParams();
  const { startLoading, stopLoading, loading } = useLoadStore();
  const { setContentData, contentData } = useContentDataStore();
  const { theme } = useThemeStore();
  const [pdfData, setPdfData] = React.useState<Uint8Array | null>(null);
  const [compileError, setCompileError] = React.useState<string | null>(null);
  const [lspExtensions, setLspExtensions] = React.useState<Extension[]>([]);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lspClientRef = React.useRef<LSPClient | null>(null);

  React.useEffect(() => {
    let mounted = true;

    invoke<string>("get_project_dir").then((dir) => {
      if (!mounted) return;

      const fileUri = `file://${dir}/main.tex`;
      const rootUri = `file://${dir}`;

      const client = new LSPClient({
        rootUri,
        extensions: [...languageServerExtensions(), serverDiagnostics()],
      });
      lspClientRef.current = client;

      createTexlabTransport()
        .then((transport) => {
          if (!mounted) return;
          client.connect(transport);
          setLspExtensions([client.plugin(fileUri, "latex")]);
        })
        .catch(console.error);
    });

    return () => {
      mounted = false;
      lspClientRef.current?.disconnect();
    };
  }, []);

  async function compile(content: string) {
    startLoading();
    try {
      const bytes: number[] = await invoke("compile_project", {
        content,
        title: file,
      });
      setPdfData(new Uint8Array(bytes));
      setCompileError(null);
    } catch (e) {
      const raw = String(e);
      // Extrai apenas as linhas de erro do stderr do tectonic, removendo "downloading..." noise
      const errorLines = raw
        .split("\n")
        .filter((l) => l.startsWith("error:") || l.startsWith("!"))
        .join("\n");
      setCompileError(errorLines || raw);
    } finally {
      stopLoading();
    }
  }

  const onChange = React.useCallback((val: string) => {
    setContentData(val);
    invoke("write_tex", { content: val }).catch(() => {});
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => compile(val), DEBOUNCE_MS);
  }, [setContentData]);

  return (
    <main className="flex flex-col h-full">
      <TitleBar />
      <ResizablePanelGroup className="flex-1 min-h-0">
        <ResizablePanel defaultSize={50}>
          <div className="h-full">
            <CodeMirror
              value={contentData}
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
            {compileError && (
              <div className="shrink-0 max-h-40 overflow-y-auto border-t border-destructive/40 bg-destructive/5 px-3 py-2">
                <pre className="text-destructive text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {compileError}
                </pre>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <StatusBar />
    </main>
  );
}
