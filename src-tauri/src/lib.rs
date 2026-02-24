use std::fs;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn compile_latex(app: tauri::AppHandle, content: String) -> Result<Vec<u8>, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![compile_latex])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
