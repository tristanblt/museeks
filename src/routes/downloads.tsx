import { Trans, useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useState } from 'react';

import ProgressBar from '../components/ProgressBar';
import Button from '../elements/Button';
import Flexbox from '../elements/Flexbox';
import View from '../elements/View';
import type {
  DownloadJob,
  DownloadStatus,
  IPCEvent,
} from '../generated/typings';
import SpotdlBridge from '../lib/bridge-spotdl';
import { configQuery } from '../lib/queries';
import { logAndNotifyError } from '../lib/utils';

export const Route = createFileRoute('/downloads')({
  component: ViewDownloads,
  loader: async () => {
    const jobs = await SpotdlBridge.getDownloads();
    return { jobs };
  },
});

function ViewDownloads() {
  const { t } = useLingui();
  const config = useSuspenseQuery(configQuery).data;
  const outputDir = config.library_folders[0];

  const [jobs, setJobs] = useState(Route.useLoaderData().jobs);
  const [query, setQuery] = useState('');

  // The queue lives in the backend, keep the view in sync with it
  useEffect(() => {
    const promise = listen<Array<DownloadJob>>(
      'DownloadsUpdate' satisfies IPCEvent,
      ({ payload }) => setJobs(payload),
    );

    return () => {
      void promise.then((unlisten) => unlisten());
    };
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (query.trim() === '') return;

      try {
        await SpotdlBridge.enqueue(query);
        setQuery('');
      } catch (err) {
        logAndNotifyError(err);
      }
    },
    [query],
  );

  const hasFinishedJobs = jobs.some((job) => !isActive(job.status));

  return (
    <View hasPadding>
      <div {...stylex.props(styles.container)}>
        <h2 {...stylex.props(styles.title)}>
          <Trans>Downloads</Trans>
        </h2>
        <p {...stylex.props(styles.description)}>
          <Trans>
            Paste a Spotify link (track, album, playlist, artist) or search for
            a song. Downloaded tracks are added to your library automatically.
          </Trans>
        </p>

        <form onSubmit={submit} {...stylex.props(styles.form)}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder={t`https://open.spotify.com/... or "artist - title"`}
            aria-label={t`Spotify link or search`}
            spellCheck={false}
            disabled={outputDir == null}
            {...stylex.props(styles.input)}
          />
          <Button type="submit" disabled={outputDir == null || query === ''}>
            <Trans>Download</Trans>
          </Button>
        </form>

        <p {...stylex.props(styles.outputDir)}>
          {outputDir != null ? (
            <Trans>
              Saved to <code>{outputDir}</code>
            </Trans>
          ) : (
            <Trans>
              Add a folder to your library in the settings first: downloads are
              saved there.
            </Trans>
          )}
        </p>

        {jobs.length > 0 && (
          <>
            <Flexbox align="center" xstyle={styles.queueHeader}>
              <h3 {...stylex.props(styles.queueTitle)}>
                <Trans>Queue</Trans>
              </h3>
              <Button
                bSize="small"
                disabled={!hasFinishedJobs}
                onClick={() =>
                  SpotdlBridge.clearFinished().catch(logAndNotifyError)
                }
              >
                <Trans>Clear finished</Trans>
              </Button>
            </Flexbox>
            <ul {...stylex.props(styles.jobs)}>
              {jobs.toReversed().map((job) => (
                <DownloadItem key={job.id} job={job} />
              ))}
            </ul>
          </>
        )}
      </div>
    </View>
  );
}

function DownloadItem({ job }: { job: DownloadJob }) {
  const { t } = useLingui();

  const statusLabels: Record<DownloadStatus, string> = {
    Queued: t`Queued`,
    Running: t`Downloading`,
    Done: t`Done`,
    Failed: t`Failed`,
    Cancelled: t`Cancelled`,
  };

  const progress =
    job.progress_total > 0
      ? Math.round((job.progress_current / job.progress_total) * 100)
      : undefined;

  const counts = [
    job.downloaded_count > 0 && t`${job.downloaded_count} downloaded`,
    job.skipped_count > 0 && t`${job.skipped_count} already there`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li {...stylex.props(styles.job)}>
      <Flexbox align="center" gap={8}>
        <span {...stylex.props(styles.jobQuery)} title={job.query}>
          {job.query}
        </span>
        <span {...stylex.props(styles.status, statusStyles[job.status])}>
          {statusLabels[job.status]}
        </span>
        {isActive(job.status) && (
          <Button
            bSize="small"
            onClick={() => SpotdlBridge.cancel(job.id).catch(logAndNotifyError)}
          >
            <Trans>Cancel</Trans>
          </Button>
        )}
      </Flexbox>

      {job.status === 'Running' && (
        <div {...stylex.props(styles.progress)}>
          <ProgressBar
            progress={progress}
            label={
              job.progress_total > 0
                ? `${job.progress_current} / ${job.progress_total}`
                : ''
            }
          />
        </div>
      )}

      {(job.status === 'Running' || job.error != null || counts !== '') && (
        <div {...stylex.props(styles.jobDetails)}>
          {job.status === 'Running' && job.last_line}
          {job.status === 'Failed' && job.error}
          {job.status !== 'Running' && job.status !== 'Failed' && counts}
        </div>
      )}

      {job.log.length > 0 && (
        <details {...stylex.props(styles.log)}>
          <summary>
            <Trans>Show log</Trans>
          </summary>
          <pre {...stylex.props(styles.logContent)}>{job.log.join('\n')}</pre>
        </details>
      )}
    </li>
  );
}

function isActive(status: DownloadStatus): boolean {
  return status === 'Queued' || status === 'Running';
}

const styles = stylex.create({
  container: {
    maxWidth: '720px',
    marginInline: 'auto',
  },
  title: {
    marginTop: 0,
    marginBottom: '8px',
  },
  description: {
    color: 'var(--text-muted)',
    marginTop: 0,
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    columnGap: '8px',
  },
  input: {
    flexGrow: 1,
    fontSize: 'inherit',
    paddingBlock: '6px',
    paddingInline: '12px',
    backgroundColor: 'var(--search-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: {
      default: 'var(--border-color)',
      ':focus': 'var(--main-color)',
    },
    outline: 'none',
    color: 'var(--text)',
    borderRadius: 'var(--border-radius)',
    lineHeight: '16px',
  },
  outputDir: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '8px',
    marginBottom: '24px',
  },
  queueHeader: {
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  queueTitle: {
    margin: 0,
  },
  jobs: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    borderRadius: 'var(--border-radius)',
  },
  job: {
    paddingBlock: '10px',
    paddingInline: '12px',
    borderTopWidth: {
      default: '1px',
      ':first-child': '0',
    },
    borderTopStyle: 'solid',
    borderTopColor: 'var(--border-color)',
    backgroundColor: {
      default: 'var(--tracks-bg-even)',
      ':nth-child(odd)': 'var(--tracks-bg-odd)',
    },
  },
  jobQuery: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  status: {
    flexShrink: 0,
    fontSize: '12px',
    paddingBlock: '2px',
    paddingInline: '6px',
    borderRadius: 'var(--border-radius)',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  progress: {
    display: 'flex',
    marginTop: '8px',
  },
  jobDetails: {
    marginTop: '6px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  log: {
    marginTop: '6px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    cursor: 'default',
  },
  logContent: {
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '8px',
    marginTop: '6px',
    marginBottom: 0,
    backgroundColor: 'var(--background)',
    borderRadius: 'var(--border-radius)',
    whiteSpace: 'pre-wrap',
    userSelect: 'text',
  },
});

const statusStyles = stylex.create({
  Queued: {
    color: 'var(--text-muted)',
    borderColor: 'var(--border-color)',
  },
  Running: {
    color: 'var(--info-color)',
    borderColor: 'var(--info-color)',
  },
  Done: {
    color: 'var(--success-color)',
    borderColor: 'var(--success-color)',
  },
  Failed: {
    color: 'var(--danger-color)',
    borderColor: 'var(--danger-color)',
  },
  Cancelled: {
    color: 'var(--warning-color)',
    borderColor: 'var(--warning-color)',
  },
});
