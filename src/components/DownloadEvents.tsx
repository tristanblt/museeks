import { useLingui } from '@lingui/react/macro';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import LibraryAPI from '../api/LibraryAPI';
import type { DownloadJob, IPCEvent } from '../generated/typings';
import useInvalidate from '../hooks/useInvalidate';
import toastManager from '../lib/toast-manager';

/**
 * Import freshly downloaded tracks in the library, wherever the user is in the app
 */
function DownloadEvents() {
  const invalidate = useInvalidate();
  const { t } = useLingui();

  useEffect(() => {
    const promise = listen<DownloadJob>(
      'DownloadFinished' satisfies IPCEvent,
      async ({ payload: job }) => {
        if (job.status === 'Failed') {
          toastManager.add({
            title: t`Download failed: ${job.query}`,
            type: 'danger',
          });
        }

        if (job.downloaded_count > 0) {
          await LibraryAPI.scan();
          await invalidate();
        }
      },
    );

    return () => {
      void promise.then((unlisten) => unlisten());
    };
  }, [invalidate, t]);

  return null;
}

export default DownloadEvents;
