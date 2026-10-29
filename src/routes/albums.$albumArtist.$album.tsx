import { Plural, Trans, useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import AlbumsAPI, { getAlbumQueueOrigin } from '../api/AlbumsAPI';
import AlbumCover, { useTrackCover } from '../components/AlbumCover';
import AlbumFill from '../components/AlbumFill';
import Icon from '../components/Icon';
import TrackList from '../components/TrackList';
import View from '../elements/View';
import type { Track } from '../generated/typings';
import useGlobalTrackListStatus from '../hooks/useGlobalTrackListStatus';
import DatabaseBridge from '../lib/bridge-database';
import { configQuery } from '../lib/queries';

export const Route = createFileRoute('/albums/$albumArtist/$album')({
  component: ViewAlbumDetails,
  loader: async ({ params }) => {
    const [tracks, playlists] = await Promise.all([
      DatabaseBridge.getAlbumTracks(params.albumArtist, params.album),
      DatabaseBridge.getAllPlaylists(),
    ]);

    if (tracks.length === 0) {
      throw notFound();
    }

    return { tracks, playlists };
  },
});

/**
 * Format a duration in seconds as "1 h 12 min" / "43 min"
 */
function formatLongDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

/**
 * Number of tracks the album should have, according to the "track x of y"
 * tags (per disc), or null if unknown
 */
function getExpectedTrackCount(tracks: Array<Track>): number | null {
  const tracksOfByDisc = new Map<number, number>();

  for (const track of tracks) {
    if (track.track_of == null) return null;

    const disc = track.disk_no ?? 1;
    tracksOfByDisc.set(
      disc,
      Math.max(tracksOfByDisc.get(disc) ?? 0, track.track_of),
    );
  }

  let total = 0;
  for (const count of tracksOfByDisc.values()) total += count;

  return total > 0 ? total : null;
}

function ViewAlbumDetails() {
  const { tracks, playlists } = Route.useLoaderData();
  const { albumArtist, album } = Route.useParams();
  const config = useSuspenseQuery(configQuery).data;
  const { t } = useLingui();

  useGlobalTrackListStatus(tracks);

  const queueOrigin = useMemo(
    () => getAlbumQueueOrigin(albumArtist, album),
    [albumArtist, album],
  );

  // Used for the blurred backdrop
  const { cover } = useTrackCover(tracks[0].path, false);

  const year = tracks.find((track) => track.year != null)?.year;
  const duration = tracks.reduce((total, track) => total + track.duration, 0);
  const genres = [...new Set(tracks.flatMap((track) => track.genres))];
  const isCompilation = tracks.some((track) => track.is_compilation);

  const expectedTrackCount = getExpectedTrackCount(tracks);
  const missingTrackCount =
    expectedTrackCount != null
      ? Math.max(0, expectedTrackCount - tracks.length)
      : 0;

  const [isFillOpen, setIsFillOpen] = useState(false);
  useEffect(() => setIsFillOpen(false), [albumArtist, album]);

  return (
    <View>
      <div {...stylex.props(styles.page)}>
        <header {...stylex.props(styles.hero)}>
          {cover != null && (
            <div
              aria-hidden
              {...stylex.props(styles.backdrop)}
              style={{ backgroundImage: `url("${cover}")` }}
            />
          )}
          <div {...stylex.props(styles.backdropFade)} aria-hidden />

          <div {...stylex.props(styles.heroContent)}>
            <Link to="/albums" draggable={false} {...stylex.props(styles.back)}>
              ‹ <Trans>Albums</Trans>
            </Link>

            <div {...stylex.props(styles.heroMain)}>
              <div {...stylex.props(styles.cover)}>
                <AlbumCover path={tracks[0].path} alt={t`Cover of ${album}`} />
              </div>

              <div {...stylex.props(styles.info)}>
                <div {...stylex.props(styles.eyebrow)}>
                  {isCompilation ? t`Compilation` : t`Album`}
                </div>
                <h1 {...stylex.props(styles.title)} title={album}>
                  {album}
                </h1>
                {isCompilation ? (
                  <div {...stylex.props(styles.artist)}>{albumArtist}</div>
                ) : (
                  <Link
                    to="/artists/$artistID"
                    params={{ artistID: albumArtist }}
                    draggable={false}
                    {...stylex.props(styles.artist, styles.artistLink)}
                  >
                    {albumArtist}
                  </Link>
                )}
                <div {...stylex.props(styles.meta)}>
                  {year != null && <span>{year}</span>}
                  <span>
                    <Plural
                      value={tracks.length}
                      one="# track"
                      other="# tracks"
                    />
                  </span>
                  <span>{formatLongDuration(duration)}</span>
                  {genres.length > 0 && <span>{genres.join(', ')}</span>}
                  {missingTrackCount > 0 && (
                    <span {...stylex.props(styles.missing)}>
                      <Plural
                        value={missingTrackCount}
                        one="# missing track"
                        other="# missing tracks"
                      />
                    </span>
                  )}
                </div>

                <div {...stylex.props(styles.actions)}>
                  <button
                    type="button"
                    data-museeks-action
                    onClick={() =>
                      AlbumsAPI.play(albumArtist, album, { tracks })
                    }
                    {...stylex.props(styles.action, styles.actionPrimary)}
                  >
                    <Icon name="play" size={12} />
                    <Trans>Play</Trans>
                  </button>
                  <button
                    type="button"
                    data-museeks-action
                    onClick={() =>
                      AlbumsAPI.play(albumArtist, album, {
                        tracks,
                        shuffle: true,
                      })
                    }
                    {...stylex.props(styles.action, styles.actionSecondary)}
                  >
                    <Icon name="shuffle" size={12} />
                    <Trans>Shuffle</Trans>
                  </button>
                  <button
                    type="button"
                    data-museeks-action
                    aria-expanded={isFillOpen}
                    title={t`Download the missing tracks with spotdl`}
                    onClick={() => setIsFillOpen((open) => !open)}
                    {...stylex.props(
                      styles.action,
                      styles.actionSecondary,
                      missingTrackCount > 0 && styles.actionHighlight,
                    )}
                  >
                    <Icon name="download" size={12} />
                    <Trans>Complete</Trans>
                  </button>
                </div>

                {isFillOpen && (
                  <AlbumFill
                    key={`${albumArtist}\u0000${album}`}
                    album={album}
                    track={tracks[0]}
                    onClose={() => setIsFillOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        <div {...stylex.props(styles.tracks)}>
          <TrackList
            layout="default"
            data={tracks}
            tracksDensity={config.track_view_density}
            playlists={playlists}
            queueOrigin={queueOrigin}
          />
        </div>
      </div>
    </View>
  );
}

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  hero: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
    isolation: 'isolate',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--border-color)',
  },
  backdrop: {
    position: 'absolute',
    inset: '-80px',
    zIndex: -2,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(60px) saturate(1.5)',
    opacity: 0.55,
  },
  backdropFade: {
    position: 'absolute',
    inset: 0,
    zIndex: -1,
    backgroundImage:
      'linear-gradient(to bottom, transparent 0%, var(--background) 100%)',
  },
  heroContent: {
    paddingTop: '16px',
    paddingBottom: '28px',
    paddingInline: '32px',
  },
  back: {
    display: 'inline-block',
    marginBottom: '16px',
    fontSize: '12px',
    color: {
      default: 'var(--text-muted)',
      ':hover': 'var(--text)',
    },
    textDecoration: 'none',
  },
  heroMain: {
    display: 'flex',
    alignItems: 'flex-end',
    columnGap: '28px',
  },
  cover: {
    width: '200px',
    flexShrink: 0,
    borderRadius: '8px',
    boxShadow:
      '0 2px 6px rgba(0, 0, 0, 0.2), 0 24px 48px -12px rgba(0, 0, 0, 0.55)',
  },
  info: {
    minWidth: 0,
    flexGrow: 1,
  },
  eyebrow: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  title: {
    margin: 0,
    fontSize: '34px',
    fontWeight: 800,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    overflowWrap: 'anywhere',
  },
  artist: {
    display: 'inline-block',
    marginTop: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  artistLink: {
    textDecoration: {
      default: 'none',
      ':hover': 'underline',
    },
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: '14px',
    rowGap: '2px',
    marginTop: '4px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  actions: {
    display: 'flex',
    columnGap: '8px',
    marginTop: '18px',
  },
  action: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '8px',
    paddingBlock: '8px',
    paddingInline: '18px',
    borderRadius: '999px',
    borderStyle: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transitionProperty: 'transform, filter',
    transitionDuration: '0.15s',
    transform: {
      default: 'scale(1)',
      ':hover': 'scale(1.03)',
      ':active': 'scale(0.98)',
    },
  },
  actionPrimary: {
    color: 'white',
    backgroundColor: 'var(--main-color)',
    boxShadow: '0 4px 14px -4px var(--main-color)',
    filter: {
      default: 'none',
      ':hover': 'brightness(1.08)',
    },
  },
  // Readable on both light and dark backgrounds
  actionHighlight: {
    color: 'color-mix(in srgb, var(--warning-color) 70%, var(--text))',
  },
  missing: {
    color: 'color-mix(in srgb, var(--warning-color) 70%, var(--text))',
    fontWeight: 600,
  },
  actionSecondary: {
    color: 'var(--text)',
    backgroundColor: 'var(--text-interactive-bg)',
    backdropFilter: 'blur(10px)',
  },
  tracks: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
  },
});
