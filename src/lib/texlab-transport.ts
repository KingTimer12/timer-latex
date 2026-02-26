import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { type Transport } from "@codemirror/lsp-client";

const TEXLAB_INIT_OPTIONS = {
  diagnosticsDelay: 300,
};

function frameMessage(message: string): string {
  const bytes = new TextEncoder().encode(message).length;
  return `Content-Length: ${bytes}\r\n\r\n${message}`;
}

function injectInitOptions(message: string): string {
  try {
    const parsed = JSON.parse(message);
    if (parsed.method === "initialize" && parsed.params) {
      parsed.params.initializationOptions = TEXLAB_INIT_OPTIONS;
      return JSON.stringify(parsed);
    }
  } catch {
    // not JSON — send as-is
  }
  return message;
}

export async function createTexlabTransport(): Promise<Transport> {
  await invoke("start_texlab");

  // All state local to this transport instance
  let buffer = "";
  const handlers = new Set<(msg: string) => void>();
  let unlisten: UnlistenFn | null = null;

  function parseMessages(chunk: string) {
    buffer += chunk;

    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = buffer.slice(0, headerEnd);
      const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const bodyStart = headerEnd + 4;

      if (buffer.length < bodyStart + contentLength) break;

      const body = buffer.slice(bodyStart, bodyStart + contentLength);
      buffer = buffer.slice(bodyStart + contentLength);

      for (const handler of handlers) {
        try {
          handler(body);
        } catch (e) {
          console.error("[texlab] handler error:", e);
        }
      }
    }
  }

  unlisten = await listen<string>("texlab-message", (event) => {
    parseMessages(event.payload);
  });

  return {
    send(message: string) {
      const patched = injectInitOptions(message);
      invoke("send_to_texlab", { message: frameMessage(patched) }).catch(
        console.error
      );
    },
    subscribe(handler: (value: string) => void) {
      handlers.add(handler);
    },
    unsubscribe(handler: (value: string) => void) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        unlisten?.();
        unlisten = null;
      }
    },
  };
}
