import { useSortable } from '@dnd-kit/sortable';
import * as stylex from '@stylexjs/stylex';
import type React from 'react';

import type { Track } from '../generated/typings';
import useFormattedDuration from '../hooks/useFormattedDuration';
import PlayingIndicator from './PlayingIndicator';

export type TrackRowEvents = {
  onTrackSelect: (
    event: React.MouseEvent,
    trackID: string,
    trackIndex: number,
  ) => void;
  onContextMenu: (
    event: React.MouseEvent,
    trackID: string,
    trackIndex: number,
  ) => void;
  onPlaybackStart: (trackID: string) => void;
};

type Props = {
  selected: boolean;
  hasSelectedAbove?: boolean;
  track: Track;
  index: number;
  isPlaying?: boolean;
  draggable?: boolean;
  simplified?: boolean;
  showArtistInTitle?: boolean;
  style?: React.CSSProperties;
} & TrackRowEvents;

export default function TrackRow(props: Props) {
  const {
    track,
    index,
    selected,
    draggable,
    onTrackSelect,
    onContextMenu,
    onPlaybackStart,
  } = props;

  const duration = useFormattedDuration(track.duration);

  // Drag-and-Drop for playlists
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging, // is this item being dragged around
    isOver, // is this item being dragged over by another item
    activeIndex,
    overIndex,
  } = useSortable({
    id: props.track.id,
    disabled: !draggable,
    data: {
      type: 'playlist-track',
      index,
    },
  });

  const isEvenRow = index % 2 === 0;
  const isSelectedWithSelectedAbove =
    selected && props.hasSelectedAbove === true;
  const isDropIndicatorVisible = isOver && !isDragging;
  const isDropAbove = isOver && overIndex < activeIndex;
  const isDropBelow = isOver && overIndex > activeIndex;

  return (
    // oxlint-disable-next-line jsx_a11y/click-events-have-key-events - given by ...listeners
    <li
      onDoubleClick={() => onPlaybackStart(track.id)}
      onMouseDown={(e) => onTrackSelect(e, track.id, index)}
      onClick={(e) => onTrackSelect(e, track.id, index)}
      onContextMenu={(e) => onContextMenu(e, track.id, index)}
      data-is-playing={props.isPlaying === true}
      data-track-id={track.id}
      // dnd-related props:
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // accessibility
      aria-disabled="false" // required
      aria-selected={selected}
      role="option" // technically already given by attributes, but that'll make the linter happy
      // styles
      {...stylex.props(
        trackStyles.track,
        isEvenRow && trackStyles.trackEvenRow,
        selected && trackStyles.trackSelected,
        isSelectedWithSelectedAbove && trackStyles.selectedWithSelectedAbove,
        isDragging && trackStyles.isDragging,
        isDropIndicatorVisible && trackStyles.isDraggedOver,
        isDropAbove && trackStyles.isDraggedOverAbove,
        isDropBelow && trackStyles.isDraggedOverBelow,
      )}
      style={props.style}
    >
      <div {...stylex.props(cellStyles.cell, cellStyles.trackPlaying)}>
        {props.isPlaying ? <PlayingIndicator /> : null}
      </div>
      <div {...stylex.props(cellStyles.cell, cellStyles.title)}>
        <span {...stylex.props(cellStyles.titleText)}>{track.title}</span>
        {props.showArtistInTitle === true && track.artists.length > 0 && (
          <span {...stylex.props(cellStyles.artistInTitle)}>
            {'— '}
            {track.artists.join(', ')}
          </span>
        )}
      </div>
      <div
        {...stylex.props(
          cellStyles.cell,
          cellStyles.duration,
          props.simplified === true && cellStyles.rightAligned,
        )}
      >
        {duration}
      </div>
      {props.simplified !== true && (
        <>
          <div {...stylex.props(cellStyles.cell, cellStyles.artist)}>
            {track.artists.join(', ')}
          </div>
          <div {...stylex.props(cellStyles.cell, cellStyles.album)}>
            {track.album}
          </div>
          <div {...stylex.props(cellStyles.cell, cellStyles.genre)}>
            {track.genres.join(', ')}
          </div>
        </>
      )}
    </li>
  );
}

const trackStyles = stylex.create({
  track: {
    position: 'relative',
    display: 'flex',
    borderRadius: 'var(--radius-md)',
    backgroundColor: {
      default: 'var(--tracks-bg-even)',
      ':hover': 'var(--text-interactive-bg)',
    },
    color: {
      default: 'inherit',
      ':is([data-is-playing="true"])': 'var(--main-color)',
    },
    alignItems: 'center',
    maxWidth: '100%',
  },
  trackEvenRow: {
    backgroundColor: {
      default: 'var(--tracks-bg-odd)',
      ':hover': 'var(--text-interactive-bg)',
    },
  },
  trackSelected: {
    backgroundColor: {
      default: 'var(--active-item-bg)',
      ':hover': 'var(--active-item-bg)',
    },
    color: {
      default: 'var(--active-item-color)',
      ':is([data-is-playing="true"])': 'var(--active-item-color)',
    },
  },
  // Consecutive selected rows look like a single block
  selectedWithSelectedAbove: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    boxShadow: '0 -4px 0 0 var(--active-item-bg)',
  },
  isDragging: {
    opacity: 0.5,
  },
  isDraggedOver: {
    '::after': {
      pointerEvents: 'none',
      position: 'absolute',
      zIndex: 1,
      display: 'block',
      width: '100%',
      content: '""',
      height: '2px',
      backgroundColor: 'var(--main-color)',
    },
  },
  isDraggedOverAbove: {
    '::after': {
      top: '-1px',
    },
  },
  isDraggedOverBelow: {
    '::after': {
      bottom: '-1px',
    },
  },
});

const cellStyles = stylex.create({
  cell: {
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
    borderLeftColor: 'transparent',
    paddingRight: '6px',
    paddingLeft: '6px',
    cursor: 'default',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '24px',
  },
  trackPlaying: {
    width: '30px',
    flexShrink: 0,
  },
  title: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 0,
    display: 'flex',
    alignItems: 'baseline',
    rowGap: '4px',
    columnGap: '4px',
  },
  titleText: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  artistInTitle: {
    color: 'var(--text-muted)',
    opacity: 0.9,
    fontSize: '0.85em',
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  duration: {
    width: '7%',
    minWidth: '70px',
    flexShrink: 0,
  },
  artist: {
    width: '20%',
    flexShrink: 0,
  },
  album: {
    width: '20%',
    flexShrink: 0,
  },
  genre: {
    width: '20%',
    flexShrink: 0,
  },
  rightAligned: {
    textAlign: 'right',
    paddingRight: '8px',
  },
});
