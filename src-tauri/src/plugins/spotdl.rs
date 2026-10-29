use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;

use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio::io::{AsyncBufReadExt, AsyncRead, BufReader};
use tokio::process::Command;
use tokio::sync::{Notify, mpsc};
use ts_rs::TS;
use uuid::Uuid;

use crate::libs::error::{AnyResult, MuseeksError};
use crate::libs::events::IPCEvent;
use crate::plugins::config::ConfigManager;

/**
 * Max number of output lines kept per download (enough to debug a failure)
 */
const MAX_LOG_LINES: usize = 300;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/typings.ts")]
pub enum DownloadStatus {
    Queued,
    Running,
    Done,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/typings.ts")]
pub struct DownloadJob {
    id: String,
    /** Spotify URL (track, album, playlist, artist) or a text search */
    query: String,
    status: DownloadStatus,
    output_dir: String,
    /** Songs processed so far, as reported by spotdl ("N/M complete") */
    progress_current: usize,
    progress_total: usize,
    downloaded_count: usize,
    skipped_count: usize,
    last_line: Option<String>,
    log: Vec<String>,
    error: Option<String>,
}

#[derive(Default)]
pub struct SpotdlState {
    jobs: Mutex<Vec<DownloadJob>>,
    /** (job id, process group id) of the running spotdl process */
    running: Mutex<Option<(String, u32)>>,
    wake_worker: Notify,
}

impl SpotdlState {
    fn update_job(&self, id: &str, f: impl FnOnce(&mut DownloadJob)) {
        let mut jobs = self.jobs.lock().unwrap();
        if let Some(job) = jobs.iter_mut().find(|job| job.id == id) {
            f(job);
        }
    }

    fn get_job(&self, id: &str) -> Option<DownloadJob> {
        let jobs = self.jobs.lock().unwrap();
        jobs.iter().find(|job| job.id == id).cloned()
    }

    fn next_queued_job(&self) -> Option<DownloadJob> {
        let jobs = self.jobs.lock().unwrap();
        jobs.iter()
            .find(|job| job.status == DownloadStatus::Queued)
            .cloned()
    }
}

fn emit_jobs<R: Runtime>(app_handle: &AppHandle<R>) {
    let state = app_handle.state::<SpotdlState>();
    let jobs = state.jobs.lock().unwrap().clone();

    if let Err(err) = app_handle.emit(IPCEvent::DownloadsUpdate.as_ref(), jobs) {
        warn!("Failed to emit downloads update: {}", err);
    }
}

/**
 * GUI apps on macOS do not inherit the shell PATH, so add the usual places
 * where spotdl (pipx, uv, brew) and ffmpeg (brew) get installed.
 */
fn get_search_path() -> String {
    let mut paths: Vec<PathBuf> = std::env::var_os("PATH")
        .map(|path| std::env::split_paths(&path).collect())
        .unwrap_or_default();

    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".local/bin"));
        paths.push(home.join(".cargo/bin"));
    }

    paths.push(PathBuf::from("/opt/homebrew/bin"));
    paths.push(PathBuf::from("/usr/local/bin"));

    std::env::join_paths(paths)
        .map(|path| path.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn find_spotdl(search_path: &str) -> Option<PathBuf> {
    let bin_name = if cfg!(windows) {
        "spotdl.exe"
    } else {
        "spotdl"
    };

    std::env::split_paths(search_path)
        .map(|dir| dir.join(bin_name))
        .find(|path| path.is_file())
}

/**
 * spotdl pads its lines with spaces and may use carriage returns
 */
fn clean_line(line: &str) -> Option<String> {
    let line = line.rsplit('\r').next().unwrap_or(line).trim();

    if line.is_empty() {
        None
    } else {
        Some(line.to_owned())
    }
}

/**
 * Parse "12/50 complete"
 */
fn parse_progress(line: &str) -> Option<(usize, usize)> {
    let progress = line.strip_suffix(" complete")?;
    let (current, total) = progress.split_once('/')?;

    Some((current.parse().ok()?, total.parse().ok()?))
}

fn apply_line(job: &mut DownloadJob, line: String) {
    if let Some((current, total)) = parse_progress(&line) {
        job.progress_current = current;
        job.progress_total = total;
    } else if line.starts_with("Downloaded \"") {
        job.downloaded_count += 1;
    } else if line.starts_with("Skipping ") {
        job.skipped_count += 1;
    }

    // Progress/URL lines are noise for the "what is happening now" status
    if parse_progress(&line).is_none() && !line.starts_with("http") {
        job.last_line = Some(line.clone());
    }

    job.log.push(line);
    if job.log.len() > MAX_LOG_LINES {
        job.log.remove(0);
    }
}

fn forward_lines<T: AsyncRead + Unpin + Send + 'static>(stream: T, tx: mpsc::Sender<String>) {
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stream).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if tx.send(line).await.is_err() {
                break;
            }
        }
    });
}

async fn run_job<R: Runtime>(app_handle: &AppHandle<R>, job: DownloadJob) -> AnyResult<()> {
    let state = app_handle.state::<SpotdlState>();
    let search_path = get_search_path();

    let spotdl = find_spotdl(&search_path).ok_or_else(|| {
        MuseeksError::Unknown(anyhow::anyhow!(
            "spotdl was not found, make sure it is installed and in your PATH"
        ))
    })?;

    info!("Running {:?} download {:?}", spotdl, job.query);

    let mut command = Command::new(spotdl);
    command
        .arg("download")
        .arg(&job.query)
        .arg("--simple-tui")
        // The output template is relative to the working dir (default is "{artists} - {title}.{output-ext}")
        .current_dir(&job.output_dir)
        .env("PATH", search_path)
        .env("PYTHONUNBUFFERED", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    // Own process group, so cancelling also kills ffmpeg & co.
    #[cfg(unix)]
    command.process_group(0);

    let mut child = command.spawn()?;

    if let Some(pid) = child.id() {
        *state.running.lock().unwrap() = Some((job.id.clone(), pid));
    }

    let (tx, mut rx) = mpsc::channel::<String>(100);
    forward_lines(child.stdout.take().unwrap(), tx.clone());
    forward_lines(child.stderr.take().unwrap(), tx);

    while let Some(line) = rx.recv().await {
        if let Some(line) = clean_line(&line) {
            state.update_job(&job.id, |job| apply_line(job, line));
            emit_jobs(app_handle);
        }
    }

    let exit_status = child.wait().await?;
    *state.running.lock().unwrap() = None;

    state.update_job(&job.id, |job| {
        if job.status == DownloadStatus::Cancelled {
            return;
        }

        if exit_status.success() {
            job.status = DownloadStatus::Done;
        } else {
            job.status = DownloadStatus::Failed;
            job.error = Some(
                job.last_line
                    .clone()
                    .unwrap_or_else(|| format!("spotdl exited with {}", exit_status)),
            );
        }
    });

    Ok(())
}

/**
 * Process the queue, one download at a time
 */
async fn worker<R: Runtime>(app_handle: AppHandle<R>) {
    let state = app_handle.state::<SpotdlState>();

    loop {
        let Some(job) = state.next_queued_job() else {
            state.wake_worker.notified().await;
            continue;
        };

        state.update_job(&job.id, |job| job.status = DownloadStatus::Running);
        emit_jobs(&app_handle);

        if let Err(err) = run_job(&app_handle, job.clone()).await {
            error!("Download {:?} failed: {}", job.query, err);
            state.update_job(&job.id, |job| {
                job.status = DownloadStatus::Failed;
                job.error = Some(err.to_string());
            });
        }

        emit_jobs(&app_handle);

        if let Some(finished_job) = state.get_job(&job.id) {
            let _ = app_handle.emit(IPCEvent::DownloadFinished.as_ref(), finished_job);
        }
    }
}

#[cfg(unix)]
fn kill_process_group(pgid: u32) {
    let _ = std::process::Command::new("kill")
        .arg("-TERM")
        .arg(format!("-{}", pgid))
        .status();
}

#[cfg(windows)]
fn kill_process_group(pid: u32) {
    let _ = std::process::Command::new("taskkill")
        .args(["/T", "/F", "/PID", &pid.to_string()])
        .status();
}

/** ----------------------------------------------------------------------------
 * Commands
 * -------------------------------------------------------------------------- */

#[tauri::command]
fn get_downloads(state: State<SpotdlState>) -> Vec<DownloadJob> {
    state.jobs.lock().unwrap().clone()
}

/**
 * Queue a spotdl download, saved in the first library folder (so it gets
 * imported when the library is scanned)
 */
#[tauri::command]
fn enqueue_download<R: Runtime>(
    app_handle: AppHandle<R>,
    state: State<SpotdlState>,
    config_manager: State<ConfigManager>,
    query: String,
) -> AnyResult<DownloadJob> {
    let query = query.trim().to_owned();

    if query.is_empty() {
        return Err(MuseeksError::Unknown(anyhow::anyhow!(
            "Nothing to download"
        )));
    }

    let output_dir = config_manager
        .get()?
        .library_folders
        .first()
        .cloned()
        .ok_or_else(|| {
            MuseeksError::Unknown(anyhow::anyhow!(
                "Add a library folder first, downloads are saved there"
            ))
        })?;

    let job = DownloadJob {
        id: Uuid::new_v4().to_string(),
        query,
        status: DownloadStatus::Queued,
        output_dir: output_dir.to_string_lossy().into_owned(),
        progress_current: 0,
        progress_total: 0,
        downloaded_count: 0,
        skipped_count: 0,
        last_line: None,
        log: vec![],
        error: None,
    };

    state.jobs.lock().unwrap().push(job.clone());
    state.wake_worker.notify_one();
    emit_jobs(&app_handle);

    Ok(job)
}

#[tauri::command]
fn cancel_download<R: Runtime>(app_handle: AppHandle<R>, state: State<SpotdlState>, id: String) {
    state.update_job(&id, |job| {
        if matches!(job.status, DownloadStatus::Queued | DownloadStatus::Running) {
            job.status = DownloadStatus::Cancelled;
        }
    });

    let running = state.running.lock().unwrap().clone();
    if let Some((running_id, pid)) = running
        && running_id == id
    {
        info!("Cancelling download {}", id);
        kill_process_group(pid);
    }

    emit_jobs(&app_handle);
}

#[tauri::command]
fn clear_finished_downloads<R: Runtime>(app_handle: AppHandle<R>, state: State<SpotdlState>) {
    state
        .jobs
        .lock()
        .unwrap()
        .retain(|job| matches!(job.status, DownloadStatus::Queued | DownloadStatus::Running));

    emit_jobs(&app_handle);
}

/**
 * Plugin in charge of downloading music with spotdl
 */
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R>::new("spotdl")
        .invoke_handler(tauri::generate_handler![
            get_downloads,
            enqueue_download,
            cancel_download,
            clear_finished_downloads
        ])
        .setup(|app_handle, _api| {
            app_handle.manage(SpotdlState::default());
            tauri::async_runtime::spawn(worker(app_handle.clone()));

            Ok(())
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_progress_lines() {
        assert_eq!(parse_progress("12/50 complete"), Some((12, 50)));
        assert_eq!(parse_progress("Artist - Title: Done"), None);
    }

    #[test]
    fn cleans_padded_lines() {
        assert_eq!(
            clean_line("Artist - Title: Downloading      "),
            Some("Artist - Title: Downloading".to_owned())
        );
        assert_eq!(clean_line("old\rnew  "), Some("new".to_owned()));
        assert_eq!(clean_line("     "), None);
    }
}
