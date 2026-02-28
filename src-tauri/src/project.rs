use std::{fs, path::PathBuf};

use sailfish::TemplateSimple;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

use crate::{templates::PaperTemplate, utils::project_dir};

fn project(app: &AppHandle, title: &str, content: &str) -> Result<PathBuf, String> {
    let file_name = format!("{}.tex", title);
    let dir = project_dir(&app)?.join(file_name);
    fs::write(dir.clone(), content).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
pub async fn create_project(
    app: AppHandle,
    title: String,
    template: String,
) -> Result<String, String> {
    let content = match template.as_str() {
        "empty" => "",
        "simple" => {
            r#"\documentclass{article}
\begin{document}
Hello, World!
\end{document}"#
        }
        "article" => {
            let ctx = PaperTemplate {
                title: title.clone(),
            };
            &ctx.render_once().unwrap()
        }
        _ => return Err(format!("Unknown template: {}", template)),
    };
    project(&app, &title, content)?;
    Ok(content.to_string())
}

#[tauri::command]
pub async fn compile_project(app: AppHandle, title: String, content: String) -> Result<Vec<u8>, String> {
    let dir = project_dir(&app)?;
    let tex_path = project(&app, &title, &content)?;

    let output = app
        .shell()
        .sidecar("tectonic")
        .map_err(|e| e.to_string())?
        .args([
            tex_path.to_str().unwrap(),
            "--outdir",
            dir.to_str().unwrap(),
            "--keep-logs",
            "-Z",
            "continue-on-errors",
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let pdf_path = dir.join(format!("{}.pdf", title));
    if fs::metadata(&pdf_path).is_ok() {
        let pdf_bytes = fs::read(&pdf_path).map_err(|e| e.to_string())?;
        return Ok(pdf_bytes);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Err(format!("stderr: {}\nstdout: {}", stderr, stdout))
}
