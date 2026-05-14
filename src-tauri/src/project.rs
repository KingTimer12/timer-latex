use std::{
    fs,
    path::PathBuf,
    process::Command,
};

use sailfish::TemplateSimple;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

use crate::{templates::PaperTemplate, utils::project_dir};

pub enum ProjectType {
    Latex,
    Quarkdown,
}

impl ProjectType {
    pub fn extension(&self) -> &str {
        match self {
            ProjectType::Latex => "tex",
            ProjectType::Quarkdown => "qd",
        }
    }
}

fn detect_project_type(app: &AppHandle, title: &str) -> Option<ProjectType> {
    let dir = project_dir(app).ok()?;
    if dir.join(format!("{}.tex", title)).exists() {
        Some(ProjectType::Latex)
    } else if dir.join(format!("{}.qd", title)).exists() {
        Some(ProjectType::Quarkdown)
    } else {
        None
    }
}

fn write_project_file(app: &AppHandle, title: &str, ext: &str, content: &str) -> Result<PathBuf, String> {
    let file_name = format!("{}.{}", title, ext);
    let dir = project_dir(app)?.join(file_name);
    fs::write(dir.clone(), content).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
pub fn check_java() -> bool {
    Command::new("java")
        .arg("-version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
pub fn load_content(app: AppHandle, title: String, project_type: String) -> String {
    let ext = if project_type == "quarkdown" { "qd" } else { "tex" };
    let dir = project_dir(&app).unwrap();
    fs::read_to_string(dir.join(format!("{}.{}", title, ext))).unwrap_or_default()
}

#[tauri::command]
pub fn save_content(app: AppHandle, title: String, content: String, project_type: String) -> Result<(), String> {
    let ext = if project_type == "quarkdown" { "qd" } else { "tex" };
    write_project_file(&app, &title, ext, &content)?;
    Ok(())
}

#[tauri::command]
pub fn get_project_type(app: AppHandle, title: String) -> String {
    match detect_project_type(&app, &title) {
        Some(ProjectType::Quarkdown) => "quarkdown".to_string(),
        _ => "latex".to_string(),
    }
}

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Vec<serde_json::Value> {
    let dir = match project_dir(&app) {
        Ok(d) => d,
        Err(_) => return vec![],
    };
    fs::read_dir(dir)
        .unwrap()
        .filter_map(|entry| {
            let path = entry.unwrap().path();
            let ext = path.extension()?.to_str()?.to_string();
            let name = path.file_name()?.to_str()?.to_string();
            if ext == "tex" || ext == "qd" {
                Some(serde_json::json!({ "name": name, "type": ext }))
            } else {
                None
            }
        })
        .collect()
}

#[tauri::command]
pub async fn create_project(
    app: AppHandle,
    title: String,
    template: String,
    project_type: String,
) -> Result<String, String> {
    match project_type.as_str() {
        "quarkdown" => {
            let content = quarkdown_template(&title, &template);
            write_project_file(&app, &title, "qd", &content)?;
            Ok(content)
        }
        _ => {
            let content = match template.as_str() {
                "empty" => String::new(),
                "simple" => r#"\documentclass{article}
\begin{document}
Hello, World!
\end{document}"#
                    .to_string(),
                "article" => {
                    let ctx = PaperTemplate { title: title.clone() };
                    ctx.render_once().unwrap()
                }
                _ => return Err(format!("Unknown template: {}", template)),
            };
            write_project_file(&app, &title, "tex", &content)?;
            Ok(content)
        }
    }
}

fn quarkdown_template(title: &str, template: &str) -> String {
    match template {
        "empty" => format!(
            ".doctype(paged)\n\n# {}\n\n",
            title
        ),
        "slides" => format!(
            ".doctype(slides)\n\n# {}\n\n## Slide 1\n\nConteúdo aqui.\n\n## Slide 2\n\nMais conteúdo.\n",
            title
        ),
        _ => format!(
            ".doctype(paged)\n\n# {}\n\n## Introdução\n\nEscreva seu documento aqui.\n",
            title
        ),
    }
}

#[tauri::command]
pub async fn compile_project(
    app: AppHandle,
    title: String,
    content: String,
) -> Result<Vec<u8>, String> {
    compile_latex(&app, &title, &content).await
}

#[tauri::command]
pub async fn compile_quarkdown_project(
    app: AppHandle,
    title: String,
    content: String,
) -> Result<String, String> {
    compile_quarkdown(&app, &title, &content).await
}

async fn compile_latex(
    app: &AppHandle,
    title: &str,
    content: &str,
) -> Result<Vec<u8>, String> {
    let dir = project_dir(app)?;
    let tex_path = write_project_file(app, title, "tex", content)?;

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

fn quarkdown_classpath(app: &AppHandle) -> Result<String, String> {
    // In dev mode, resources aren't copied to target/debug — use source path.
    // In production, use resource_dir (bundled path).
    let lib_dir = {
        #[cfg(dev)]
        {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("quarkdown").join("lib")
        }
        #[cfg(not(dev))]
        {
            app.path().resource_dir().map_err(|e| e.to_string())?.join("quarkdown").join("lib")
        }
    };

    let entries = fs::read_dir(&lib_dir).map_err(|_| {
        format!("quarkdown/lib não encontrado em {:?}", lib_dir)
    })?;
    let jars: Vec<String> = entries
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            if p.extension()?.to_str()? == "jar" {
                Some(p.to_str()?.to_string())
            } else {
                None
            }
        })
        .collect();
    if jars.is_empty() {
        return Err(format!("nenhum JAR encontrado em {:?}", lib_dir));
    }
    Ok(jars.join(":"))
}

fn inline_css_imports(css: &str, css_dir: &std::path::Path) -> String {
    let mut result = String::new();
    for line in css.lines() {
        let trimmed = line.trim();
        // Match: @import "path"; or @import url("path");
        if trimmed.starts_with("@import") {
            let path = trimmed
                .trim_start_matches("@import")
                .trim()
                .trim_start_matches("url(")
                .trim_end_matches(';')
                .trim_end_matches(')')
                .trim_matches('"')
                .trim_matches('\'')
                .trim_start_matches("./");
            let file_path = css_dir.join(path);
            if let Ok(imported) = fs::read_to_string(&file_path) {
                let sub_dir = file_path.parent().unwrap_or(css_dir);
                result.push_str(&inline_css_imports(&imported, sub_dir));
                result.push('\n');
                continue;
            }
        }
        result.push_str(line);
        result.push('\n');
    }
    result
}

fn inline_html_assets(html: &str, base_dir: &std::path::Path) -> String {
    let mut result = html.to_string();

    // Inline JS: <script src="./path"></script>  →  <script>...content...</script>
    let mut replacements: Vec<(String, String)> = Vec::new();
    for cap in find_between(&result, r#"<script src=""#, r#""></script>"#) {
        let path = cap.trim_start_matches("./");
        if let Ok(js) = fs::read_to_string(base_dir.join(path)) {
            replacements.push((
                format!(r#"<script src="{}"></script>"#, cap),
                format!("<script>{}</script>", js),
            ));
        }
    }
    for (from, to) in &replacements {
        result = result.replace(from.as_str(), to.as_str());
    }

    // Inline CSS: <link href="./path" rel="stylesheet">  →  <style>...content...</style>
    let mut css_replacements: Vec<(String, String)> = Vec::new();
    for cap in find_between(&result, r#"<link href=""#, r#"" rel="stylesheet">"#) {
        let path = cap.trim_start_matches("./");
        let file_path = base_dir.join(path);
        if let Ok(css) = fs::read_to_string(&file_path) {
            let css_dir = file_path.parent().unwrap_or(base_dir);
            let inlined_css = inline_css_imports(&css, css_dir);
            css_replacements.push((
                format!(r#"<link href="{}" rel="stylesheet">"#, cap),
                format!("<style>{}</style>", inlined_css),
            ));
        }
    }
    for (from, to) in &css_replacements {
        result = result.replace(from.as_str(), to.as_str());
    }

    result
}

fn find_between(text: &str, prefix: &str, suffix: &str) -> Vec<String> {
    let mut captures = Vec::new();
    let mut search = text;
    while let Some(start) = search.find(prefix) {
        let after = &search[start + prefix.len()..];
        if let Some(end) = after.find(suffix) {
            captures.push(after[..end].to_string());
            search = &after[end + suffix.len()..];
        } else {
            break;
        }
    }
    captures
}

async fn compile_quarkdown(
    app: &AppHandle,
    title: &str,
    content: &str,
) -> Result<String, String> {
    let dir = project_dir(app)?;
    let qd_path = write_project_file(app, title, "qd", content)?;
    let out_dir = dir.join(format!("{}-qd-out", title));
    fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

    let classpath = quarkdown_classpath(app)?;

    let output = Command::new("java")
        .args([
            "--enable-native-access=ALL-UNNAMED",
            "-cp",
            &classpath,
            "com.quarkdown.cli.QuarkdownCliKt",
            "c",
            qd_path.to_str().unwrap(),
            "--out",
            out_dir.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("java não encontrado: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        return Err(format!("stderr: {}\nstdout: {}", stderr, stdout));
    }

    // quarkdown may output to a subdir named after the project
    if let Some((html, html_dir)) = find_html_recursive(&out_dir) {
        let inlined = inline_html_assets(&html, &html_dir);
        return Ok(inlined);
    }

    let listing = list_dir_recursive(&out_dir);
    Err(format!("quarkdown compilou mas não gerou HTML.\nArquivos em {:?}:\n{}", out_dir, listing))
}

fn find_html_recursive(dir: &std::path::Path) -> Option<(String, std::path::PathBuf)> {
    let index = dir.join("index.html");
    if index.exists() {
        return fs::read_to_string(&index).ok().map(|html| (html, dir.to_path_buf()));
    }
    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            if let Some(result) = find_html_recursive(&p) {
                return Some(result);
            }
        } else if p.extension().and_then(|e| e.to_str()) == Some("html") {
            let parent = p.parent()?.to_path_buf();
            return fs::read_to_string(&p).ok().map(|html| (html, parent));
        }
    }
    None
}

fn inject_base_href(html: &str, dir: &std::path::Path) -> String {
    let base = format!(
        "<base href=\"asset://localhost{}/\">",
        dir.to_str().unwrap_or("")
    );
    if let Some(pos) = html.find("<head>") {
        let (before, after) = html.split_at(pos + "<head>".len());
        format!("{}{}{}", before, base, after)
    } else {
        format!("{}{}", base, html)
    }
}

fn list_dir_recursive(dir: &std::path::Path) -> String {
    let mut result = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            result.push(p.to_string_lossy().to_string());
            if p.is_dir() {
                result.push(list_dir_recursive(&p));
            }
        }
    }
    result.join("\n")
}
