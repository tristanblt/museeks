import { Plural, useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { Link } from '@tanstack/react-router';
import { useImperativeHandle, useRef } from 'react';

import AlbumsAPI from '../api/AlbumsAPI';
import Scrollable from '../elements/Scrollable';
import type { TrackGroup } from '../generated/typings';
import useAllTracks from '../hooks/useAllTracks';
import { parseDuration } from '../hooks/useFormattedDuration';
import usePlayingTrackID from '../hooks/usePlayingTrackID';
import type { TrackListVirtualizer } from '../types/museeks';
import AlbumCover from './AlbumCover';
import Icon from './Icon';
import TrackRow, { type TrackRowEvents } from './TrackRow';

/** ----------------------------------------------------------------------------
 * Group-based layout for TrackList:
 *  - Does NOT use a virtual list (but it should)
 *  - Non-reorderable
 * -------------------------------------------------------------------------- */

type Props = {
  ref: React.RefObject<TrackListVirtualizer | null>;
  trackGroups: TrackGroup[];
  selectedTracks: Set<string>;
  initialOffset: number;
  rowHeight: number;
  showArtistInTitle?: boolean;
} & TrackRowEvents;

export default function TrackListGroupedLayout(props: Props) {
  const { ref, trackGroups, rowHeight, showArtistInTitle, ...rest } = props;
  const { t } = useLingui();

  const tracks = useAllTracks(trackGroups);

  const innerScrollableRef = useRef<HTMLDivElement>(null);

  // Passes the ref back to the master component for interaction with the
  // scrollable view
  useImperativeHandle(ref, () => {
    return {
      scrollElement: innerScrollableRef.current,
      scrollToIndex: (index: number) => {
        if (innerScrollableRef.current) {
          const track = tracks[index];
          // not super idiomatic, but works eh
          document
            .querySelector(`[data-track-id="${track.id}"]`)
            ?.scrollIntoView({ block: 'nearest' });
        }
      },
    } satisfies TrackListVirtualizer;
  }, [tracks]);

  return (
    <Scrollable
      ref={innerScrollableRef}
      role="listbox"
      aria-label={t`Track list`}
      aria-multiselectable="true"
    >
      {trackGroups.map((tracksGroup) => {
        return (
          <TrackListGroup
            // Label should be unique due to how the tracks are grouped from get_artist_tracks()
            key={tracksGroup.label}
            tracksGroup={tracksGroup}
            rowHeight={rowHeight}
            showArtistInTitle={showArtistInTitle}
            {...rest}
          />
        );
      })}
    </Scrollable>
  );
}

type TrackListGroupProps = {
  tracksGroup: TrackGroup;
  selectedTracks: Set<string>;
  rowHeight: number;
  showArtistInTitle?: boolean;
} & TrackRowEvents;

function TrackListGroup(props: TrackListGroupProps) {
  const {
    selectedTracks,
    rowHeight,
    showArtistInTitle,
    onTrackSelect,
    onContextMenu,
    onPlaybackStart,
  } = props;
  const { tracks, label, year, genres, duration } = props.tracksGroup;
  const trackPlayingID = usePlayingTrackID();
  const { t } = useLingui();

  if (tracks.length === 0) {
    return null;
  }

  return (
    <div
      {...stylex.props(styles.group)}
      data-track-group={encodeURIComponent(label)}
    >
      <aside {...stylex.props(styles.aside)}>
        <Link
          to="/albums/$albumArtist/$album"
          params={{ albumArtist: tracks[0].album_artist, album: label }}
          draggable={false}
          title={t`Open the album`}
          {...stylex.props(styles.coverLink, stylex.defaultMarker())}
        >
          <AlbumCover path={tracks[0].path} alt={t`Cover of ${label}`} />
          <button
            type="button"
            title={t`Play`}
            aria-label={t`Play ${label}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void AlbumsAPI.play(tracks[0].album_artist, label, { tracks });
            }}
            {...stylex.props(styles.playButton)}
          >
            <Icon name="play" size={16} xstyle={styles.playIcon} />
          </button>
        </Link>
        <Link
          to="/albums/$albumArtist/$album"
          params={{ albumArtist: tracks[0].album_artist, album: label }}
          draggable={false}
          {...stylex.props(styles.label)}
        >
          {label}
        </Link>
        <div {...stylex.props(styles.metadata)}>
          {(year != null || genres.length > 0) && (
            <div>{[year, genres.join(', ')].filter(Boolean).join(' · ')}</div>
          )}
          <div>
            <Plural value={tracks.length} one="# track" other="# tracks" /> ·{' '}
            {parseDuration(duration)}
          </div>
        </div>
      </aside>
      <ul {...stylex.props(styles.rows)}>
        {tracks.map((track, index) => {
          return (
            <TrackRow
              key={track.id}
              selected={selectedTracks.has(track.id)}
              track={track}
              isPlaying={trackPlayingID === track.id}
              index={index}
              onTrackSelect={onTrackSelect}
              onContextMenu={onContextMenu}
              onPlaybackStart={onPlaybackStart}
              draggable={false}
              hasSelectedAbove={
                index > 0 && selectedTracks.has(tracks[index - 1].id)
              }
              simplified={true}
              showArtistInTitle={showArtistInTitle}
              style={{ height: `${rowHeight}px` }} // Figure out virtualization for grouped stuff
            />
          );
        })}
      </ul>
    </div>
  );
}

const styles = stylex.create({
  group: {
    display: 'flex',
    rowGap: '28px',
    columnGap: '28px',
    paddingBlock: '28px',
    paddingInline: '28px',
    alignItems: 'flex-start',
    position: 'relative',
    borderBottomWidth: {
      default: '1px',
      ':last-child': 0,
    },
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--border-color-softer)',
  },
  aside: {
    width: {
      default: '170px',
      '@media (min-width: 1024px)': '220px',
    },
    position: 'sticky',
    top: '28px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  coverLink: {
    position: 'relative',
    display: 'block',
    marginBottom: '14px',
    borderRadius: 'var(--radius-md)',
    boxShadow: {
      default: 'var(--shadow-md)',
      [stylex.when.ancestor(':hover')]: 'var(--shadow-lg)',
    },
    transform: {
      default: 'none',
      [stylex.when.ancestor(':hover')]: 'translateY(-3px)',
    },
    transitionProperty: 'transform, box-shadow',
    transitionDuration: 'var(--duration)',
    transitionTimingFunction: 'var(--ease-out)',
  },
  playButton: {
    position: 'absolute',
    right: '10px',
    bottom: '10px',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    borderStyle: 'none',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    backgroundColor: 'var(--main-color)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
    cursor: 'pointer',
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover')]: 1,
      ':focus-visible': 1,
    },
    transform: {
      default: 'translateY(6px) scale(0.92)',
      [stylex.when.ancestor(':hover')]: 'translateY(0) scale(1)',
      ':hover': 'translateY(0) scale(1.06)',
    },
    transitionProperty: 'opacity, transform',
    transitionDuration: '0.18s',
    transitionTimingFunction: 'var(--ease-out)',
  },
  playIcon: {
    display: 'block',
    // The triangle's visual center is left of its bounding box center
    transform: 'translateX(1.5px)',
  },
  label: {
    fontSize: '1.4rem',
    fontWeight: 700,
    letterSpacing: '-0.015em',
    lineHeight: 1.25,
    color: 'var(--text)',
    textDecoration: {
      default: 'none',
      ':hover': 'underline',
    },
    overflowWrap: 'anywhere',
  },
  metadata: {
    marginTop: '6px',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    rowGap: '3px',
    columnGap: '3px',
  },
  rows: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 0,
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
});
