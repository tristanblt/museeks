import { invoke } from '@tauri-apps/api/core';

import type { DownloadJob, ResolvedAlbum } from '../generated/typings';

/**
 * Bridge for the UI to manage spotdl downloads (queue processed by the backend)
 */
const SpotdlBridge = {
  async getDownloads(): Promise<Array<DownloadJob>> {
    return invoke('plugin:spotdl|get_downloads');
  },

  async enqueue(query: string): Promise<DownloadJob> {
    return invoke('plugin:spotdl|enqueue_download', { query });
  },

  async cancel(id: string): Promise<void> {
    return invoke('plugin:spotdl|cancel_download', { id });
  },

  async clearFinished(): Promise<void> {
    return invoke('plugin:spotdl|clear_finished_downloads');
  },

  /** Find the Spotify album of a track ("artist - title album") */
  async resolveAlbum(query: string): Promise<ResolvedAlbum> {
    return invoke('plugin:spotdl|resolve_album', { query });
  },
};

export default SpotdlBridge;
