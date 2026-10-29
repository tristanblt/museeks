import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as stylex from '@stylexjs/stylex';
import { useCallback } from 'react';

import type { Track } from '../generated/typings';
import player from '../lib/player';
import Cover from './Cover';

type Props = {
  index: number;
  track: Track;
  queueCursor: number;
};

export default function QueueListItem(props: Props) {
  const { track } = props;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: track.id,
      data: {
        type: 'queue-track',
      },
    });

  const itemStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const remove = useCallback(() => {
    player.removeFromQueue(props.index);
  }, [props.index]);

  const play = useCallback(async () => {
    await player.startFromQueue(props.queueCursor + props.index + 1);
  }, [props.index, props.queueCursor]);

  return (
    <li
      {...stylex.props(
        styles.queueItem,
        props.index > 0 && styles.queueItemWithTopBorder,
        stylex.defaultMarker(),
      )}
      {...attributes}
      // DnD props for re-ordering
      ref={setNodeRef}
      style={itemStyle}
      onDoubleClick={play}
      {...listeners}
    >
      <div {...stylex.props(styles.queueItemCover)}>
        <Cover track={track} iconSize={12} />
      </div>
      <div {...stylex.props(styles.queueItemInfo)}>
        <div {...stylex.props(styles.queueItemInfoTitle)}>{track.title}</div>
        <div {...stylex.props(styles.queueItemInfoOtherInfos)}>
          <span>{track.artists.join(', ')}</span> - <span>{track.album}</span>
        </div>
      </div>
      <button
        type="button"
        {...stylex.props(styles.queueItemRemove)}
        onClick={remove}
      >
        &times;
      </button>
    </li>
  );
}

const styles = stylex.create({
  queueItem: {
    display: 'flex',
    flexWrap: 'nowrap',
    width: '100%',
    position: 'relative',
    cursor: 'pointer',
    alignItems: 'center',
    borderRadius: 'var(--radius-md)',
    backgroundColor: {
      default: 'transparent',
      ':hover': 'var(--text-interactive-bg)',
    },
    transitionProperty: 'background-color',
    transitionDuration: 'var(--duration-fast)',
  },
  queueItemWithTopBorder: {},
  queueItemCover: {
    margin: '6px',
    marginRight: '10px',
    width: '34px',
    aspectRatio: '1',
    borderRadius: '5px',
    overflow: 'hidden',
    fontSize: '16px',
    boxShadow: 'var(--shadow-sm)',
  },
  queueItemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    minWidth: 0,
  },
  queueItemInfoTitle: {
    fontWeight: 600,
    marginBottom: '3px',
    paddingRight: '10px',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  queueItemInfoOtherInfos: {
    paddingRight: '10px',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
  },
  queueItemRemove: {
    color: 'var(--text-color)',
    borderStyle: 'none',
    backgroundColor: 'transparent',
    width: '25px',
    height: '25px',
    lineHeight: '10px',
    padding: '3px',
    marginRight: '5px',
    visibility: {
      default: 'hidden',
      [stylex.when.ancestor(':hover')]: 'visible',
    },
    fontSize: '14px',
    textDecoration: 'none',
  },
});
