use std::fs;

use tauri::{AppHandle, Manager};

pub fn project_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    let dir = docs.join("timer-latex");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}
