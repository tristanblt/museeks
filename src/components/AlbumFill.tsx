import { Plural, Trans, useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { Link } from '@tanstack/react-router';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

import type {
  DownloadJob,
  IPCEvent,
  ResolvedAlbum,
  Track,
} from '../generated/typings';
import SpotdlBridge from '../lib/bridge-spotdl';
import { logAndNotifyError } from '../lib/utils';
import ProgressBar from './ProgressBar';

type Props = {
  album: string;
  /** Track used to find the album on Spotify */
  track: Track;
  onClose: () => void;
};

type Resolution =
  | { status: 'resolving' }
  | { status: 'resolved'; album: ResolvedAlbum }
  | { status: 'failed' };

/**
 * Find the Spotify album from one of its tracks (Spotify album search does not
 * work with spotdl's credentials)
 */
function useResolvedAlbum(track: Track, album: string) {
  const [resolution, setResolution] = useState<Resolution>({
    status: 'resolving',
  });

  const artist = track.artists[0] ?? track.album_artist;
  const query = `${artist} - ${track.title} ${album}`;

  useEffect(() => {
    let cancelled = false;
    setResolution({ status: 'resolving' });

    SpotdlBridge.resolveAlbum(query)
      .then((resolved) => {
        if (!cancelled) setResolution({ status: 'resolved', album: resolved });
      })
      .catch(() => {
        if (!cancelled) setResolution({ status: 'failed' });
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return resolution;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Follow a download of the spotdl queue
 */
function useDownloadJob(initialJob: DownloadJob | null) {
  const [job, setJob] = useState(initialJob);
  const jobID = initialJob?.id;

  useEffect(() => {
    setJob(initialJob);
    if (jobID == null) return;

    const promise = listen<Array<DownloadJob>>(
      'DownloadsUpdate' satisfies IPCEvent,
      ({ payload }) => {
        const updatedJob = payload.find((item) => item.id === jobID);
        if (updatedJob != null) setJob(updatedJob);
      },
    );

    return () => {
      void promise.then((unlisten) => unlisten());
    };
  }, [initialJob, jobID]);

  return job;
}

/**
 * Download the whole album with spotdl, to complete albums partially
 * downloaded from playlists. Tracks already in the library are skipped by
 * spotdl (same file name), the new ones are imported once the download is done.
 */
export default function AlbumFill(props: Props) {
  const { album, track, onClose } = props;
  const { t } = useLingui();

  const resolution = useResolvedAlbum(track, album);
  const [query, setQuery] = useState('');

  // Prefill the download with the album found
  useEffect(() => {
    if (resolution.status === 'resolved') setQuery(resolution.album.url);
  }, [resolution]);
  const [startedJob, setStartedJob] = useState<DownloadJob | null>(null);
  const job = useDownloadJob(startedJob);

  const start = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setStartedJob(await SpotdlBridge.enqueue(query));
    } catch (err) {
      logAndNotifyError(err);
    }
  };

  if (job == null) {
    return (
      <form onSubmit={start} {...stylex.props(styles.panel)}>
        <label htmlFor="album-fill-query" {...stylex.props(styles.label)}>
          <Trans>Complete the album with spotdl</Trans>
        </label>

        {resolution.status === 'resolving' && (
          <p {...stylex.props(styles.status, styles.pulse)}>
            <Trans>Looking for the album on Spotify…</Trans>
          </p>
        )}
        {resolution.status === 'failed' && (
          <p {...stylex.props(styles.status, styles.warning)}>
            <Trans>
              The album could not be found automatically, paste its Spotify link
              below.
            </Trans>
          </p>
        )}
        {resolution.status === 'resolved' && (
          <p {...stylex.props(styles.status)}>
            <Trans>
              Found <strong>{resolution.album.name}</strong> by{' '}
              {resolution.album.artist} ·{' '}
              <Plural
                value={resolution.album.track_count}
                one="# track"
                other="# tracks"
              />
            </Trans>
            {normalize(resolution.album.name) !== normalize(album) && (
              <span {...stylex.props(styles.warning)}>
                {' '}
                <Trans>(the name differs, check it is the right album)</Trans>
              </span>
            )}
          </p>
        )}

        <div {...stylex.props(styles.row)}>
          <input
            id="album-fill-query"
            type="text"
            value={query}
            placeholder="https://open.spotify.com/album/..."
            onChange={(e) => setQuery(e.currentTarget.value)}
            spellCheck={false}
            {...stylex.props(styles.input)}
          />
          <button
            type="submit"
            disabled={query.trim() === ''}
            {...stylex.props(styles.button, styles.buttonPrimary)}
          >
            <Trans>Download</Trans>
          </button>
          <button
            type="button"
            onClick={onClose}
            {...stylex.props(styles.button, styles.buttonGhost)}
          >
            <Trans>Cancel</Trans>
          </button>
        </div>
        <p {...stylex.props(styles.hint)}>
          <Trans>
            Paste another Spotify album link if this is not the right one.
            Tracks you already have are skipped.
          </Trans>
        </p>
      </form>
    );
  }

  const isActive = job.status === 'Queued' || job.status === 'Running';
  const progress =
    job.progress_total > 0
      ? Math.round((job.progress_current / job.progress_total) * 100)
      : undefined;

  return (
    <div {...stylex.props(styles.panel)} role="status">
      {job.status === 'Queued' && (
        <div {...stylex.props(styles.label)}>
          <Trans>Waiting for the other downloads to finish…</Trans>
        </div>
      )}

      {job.status === 'Running' && (
        <>
          <div {...stylex.props(styles.label)}>
            <Trans>Completing the album…</Trans>
          </div>
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
          {job.last_line != null && (
            <div {...stylex.props(styles.hint, styles.ellipsis)}>
              {job.last_line}
            </div>
          )}
        </>
      )}

      {job.status === 'Done' && (
        <div {...stylex.props(styles.label, styles.success)}>
          {job.downloaded_count > 0 ? (
            <Plural
              value={job.downloaded_count}
              one="# track added to the album"
              other="# tracks added to the album"
            />
          ) : (
            <Trans>Nothing new to download, the album is complete.</Trans>
          )}
        </div>
      )}

      {job.status === 'Failed' && (
        <div {...stylex.props(styles.label, styles.danger)}>
          <Trans>Download failed: {job.error}</Trans>
        </div>
      )}

      {job.status === 'Cancelled' && (
        <div {...stylex.props(styles.label)}>
          <Trans>Download cancelled.</Trans>
        </div>
      )}

      <div {...stylex.props(styles.row, styles.footer)}>
        <Link to="/downloads" {...stylex.props(styles.link)}>
          <Trans>See in downloads</Trans>
        </Link>
        {isActive ? (
          <button
            type="button"
            onClick={() => SpotdlBridge.cancel(job.id).catch(logAndNotifyError)}
            {...stylex.props(styles.button, styles.buttonGhost)}
          >
            <Trans>Cancel</Trans>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            title={t`Close`}
            {...stylex.props(styles.button, styles.buttonGhost)}
          >
            <Trans>Close</Trans>
          </button>
        )}
      </div>
    </div>
  );
}

const pulse = stylex.keyframes({
  '0%': { opacity: 1 },
  '50%': { opacity: 0.45 },
  '100%': { opacity: 1 },
});

const styles = stylex.create({
  panel: {
    marginTop: '14px',
    maxWidth: '560px',
    paddingBlock: '12px',
    paddingInline: '14px',
    borderRadius: '10px',
    backgroundColor: 'var(--text-interactive-bg)',
    backdropFilter: 'blur(12px)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '8px',
  },
  footer: {
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  input: {
    flexGrow: 1,
    minWidth: 0,
    fontSize: '12px',
    paddingBlock: '6px',
    paddingInline: '10px',
    borderRadius: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: {
      default: 'var(--border-color)',
      ':focus': 'var(--main-color)',
    },
    outline: 'none',
    color: 'var(--text)',
    backgroundColor: 'var(--background)',
  },
  button: {
    flexShrink: 0,
    paddingBlock: '6px',
    paddingInline: '12px',
    borderRadius: '999px',
    borderStyle: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    opacity: {
      default: 1,
      ':disabled': 0.5,
    },
  },
  buttonPrimary: {
    color: 'white',
    backgroundColor: 'var(--main-color)',
  },
  buttonGhost: {
    color: {
      default: 'var(--text-muted)',
      ':hover': 'var(--text)',
    },
    backgroundColor: 'transparent',
  },
  status: {
    margin: 0,
    marginBottom: '8px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  warning: {
    color: 'var(--warning-color)',
  },
  pulse: {
    animationName: pulse,
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  hint: {
    margin: 0,
    marginTop: '8px',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  ellipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progress: {
    display: 'flex',
  },
  success: {
    color: 'var(--success-color)',
    marginBottom: 0,
  },
  danger: {
    color: 'var(--danger-color)',
    marginBottom: 0,
  },
  link: {
    fontSize: '12px',
    color: 'var(--link-color)',
    textDecoration: {
      default: 'none',
      ':hover': 'underline',
    },
  },
});
