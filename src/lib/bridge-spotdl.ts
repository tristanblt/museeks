import { invoke } from '@tauri-apps/api/core';

import type { DownloadJob } from '../generated/typings';

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
};

export default SpotdlBridge;
