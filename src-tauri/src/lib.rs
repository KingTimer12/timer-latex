use std::{
    fs,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

#[derive(Default)]
struct TexlabState {
    child: Option<CommandChild>,
}

type SharedTexlabState = Arc<Mutex<TexlabState>>;

#[tauri::command]
async fn compile_latex(app: AppHandle, content: String) -> Result<Vec<u8>, String> {
    println!("Compiling LaTeX...");
    let tmp_dir = std::env::temp_dir().join("timer-latex");
    fs::create_dir_all(&tmp_dir).map_err(|e| e.to_string())?;

    let tex_path = tmp_dir.join("main.tex");
    fs::write(&tex_path, content).map_err(|e| e.to_string())?;

    let output = app
        .shell()
        .sidecar("tectonic")
        .map_err(|e| e.to_string())?
        .args([
            tex_path.to_str().unwrap(),
            "--outdir",
            tmp_dir.to_str().unwrap(),
            "--keep-logs",
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        return Err(format!("stderr: {}\nstdout: {}", stderr, stdout));
    }

    let pdf_path = tmp_dir.join("main.pdf");
    let pdf_bytes = fs::read(&pdf_path).map_err(|e| e.to_string())?;
    Ok(pdf_bytes)
}

#[tauri::command]
async fn start_texlab(app: AppHandle) -> Result<(), String> {
    let state = app.state::<SharedTexlabState>();
    let mut guard = state.lock().map_err(|e| e.to_string())?;

    // Kill any existing process so the new LSPClient gets a clean session
    if let Some(old_child) = guard.child.take() {
        drop(old_child);
    }

    let app_clone = app.clone();
    let (mut rx, child) = app
        .shell()
        .sidecar("texlab")
        .map_err(|e| e.to_string())?
        .set_raw_out(true)
        .spawn()
        .map_err(|e| e.to_string())?;

    guard.child = Some(child);
    drop(guard);

    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;
        let mut raw_buf: Vec<u8> = Vec::new();
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    raw_buf.extend_from_slice(&bytes);
                    // Emit complete LSP messages (Content-Length framed)
                    loop {
                        // Find header separator
                        let sep = b"\r\n\r\n";
                        let Some(header_end) = raw_buf
                            .windows(sep.len())
                            .position(|w| w == sep)
                        else {
                            break;
                        };
                        let header = &raw_buf[..header_end];
                        let header_str = String::from_utf8_lossy(header);
                        let content_length = header_str
                            .lines()
                            .find_map(|line| {
                                let lower = line.to_ascii_lowercase();
                                lower.strip_prefix("content-length:").map(|v| {
                                    v.trim().parse::<usize>().ok()
                                })
                            })
                            .flatten();
                        let Some(content_length) = content_length else {
                            // Malformed header — skip past separator
                            raw_buf.drain(..header_end + sep.len());
                            break;
                        };
                        let body_start = header_end + sep.len();
                        if raw_buf.len() < body_start + content_length {
                            break; // Wait for more data
                        }
                        let message_end = body_start + content_length;
                        let full_message = raw_buf[..message_end].to_vec();
                        raw_buf.drain(..message_end);
                        if let Ok(text) = String::from_utf8(full_message) {
                            let _ = app_clone.emit("texlab-message", text);
                        }
                    }
                }
                CommandEvent::Terminated(_) => {
                    let _ = app_clone.emit("texlab-terminated", ());
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn send_to_texlab(app: AppHandle, message: String) -> Result<(), String> {
    let state = app.state::<SharedTexlabState>();
    let mut guard = state.lock().map_err(|e| e.to_string())?;

    if let Some(child) = guard.child.as_mut() {
        child
            .write(message.as_bytes())
            .map_err(|e| e.to_string())?;
    } else {
        return Err("TexLab not running".into());
    }

    Ok(())
}

#[tauri::command]
async fn stop_texlab(app: AppHandle) -> Result<(), String> {
    let state = app.state::<SharedTexlabState>();
    let mut guard = state.lock().map_err(|e| e.to_string())?;

    if let Some(child) = guard.child.take() {
        drop(child);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SharedTexlabState::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            compile_latex,
            start_texlab,
            send_to_texlab,
            stop_texlab,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
