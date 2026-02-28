use tauri::AppHandle;

use crate::{textlab::SharedTexlabState, utils::project_dir};

mod project;
mod templates;
mod textlab;
mod utils;

#[tauri::command]
async fn get_project_dir(app: AppHandle) -> Result<String, String> {
    let dir = project_dir(&app)?;
    dir.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "caminho inválido".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SharedTexlabState::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_project_dir,
            project::create_project,
            project::compile_project,
            project::list_projects,
            project::load_content,
            textlab::start_texlab,
            textlab::send_to_texlab,
            textlab::stop_texlab,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
