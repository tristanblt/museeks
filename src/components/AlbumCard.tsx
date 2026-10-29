import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { Link } from '@tanstack/react-router';
import { memo } from 'react';

import AlbumsAPI from '../api/AlbumsAPI';
import type { Album } from '../generated/typings';
import AlbumCover from './AlbumCover';
import Icon from './Icon';

type Props = {
  album: Album;
  isPlaying: boolean;
};

function AlbumCard({ album, isPlaying }: Props) {
  const { t } = useLingui();

  const subtitle = [album.album_artist, album.year].filter(Boolean).join(' · ');

  return (
    <Link
      to="/albums/$albumArtist/$album"
      params={{ albumArtist: album.album_artist, album: album.name }}
      draggable={false}
      {...stylex.props(styles.card, stylex.defaultMarker())}
    >
      <div {...stylex.props(styles.coverWrapper)}>
        <AlbumCover
          path={album.cover_path}
          alt={t`Cover of ${album.name}`}
          lazy
          xstyle={styles.cover}
        />
        <button
          type="button"
          title={t`Play`}
          aria-label={t`Play ${album.name}`}
          data-museeks-action
          onClick={(event) => {
            // Play without opening the album
            event.preventDefault();
            event.stopPropagation();
            void AlbumsAPI.play(album.album_artist, album.name);
          }}
          {...stylex.props(styles.playButton)}
        >
          <Icon name="play" size={16} xstyle={styles.playIcon} />
        </button>
      </div>
      <div
        {...stylex.props(styles.title, isPlaying && styles.titlePlaying)}
        title={album.name}
      >
        {album.name}
      </div>
      <div {...stylex.props(styles.subtitle)} title={subtitle}>
        {subtitle}
      </div>
    </Link>
  );
}

export default memo(AlbumCard);

const styles = stylex.create({
  card: {
    display: 'block',
    minWidth: 0,
    color: 'inherit',
    textDecoration: 'none',
    outline: 'none',
    cursor: 'default',
  },
  coverWrapper: {
    position: 'relative',
    marginBottom: '10px',
    borderRadius: '8px',
    boxShadow: {
      default:
        '0 1px 2px rgba(0, 0, 0, 0.12), 0 6px 16px -6px rgba(0, 0, 0, 0.35)',
      [stylex.when.ancestor(':hover')]:
        '0 2px 4px rgba(0, 0, 0, 0.15), 0 14px 28px -8px rgba(0, 0, 0, 0.45)',
    },
    transform: {
      default: 'translateY(0)',
      [stylex.when.ancestor(':hover')]: 'translateY(-3px)',
    },
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease-out',
    // Keyboard focus
    outlineWidth: {
      default: 0,
      [stylex.when.ancestor(':focus-visible')]: '2px',
    },
    outlineStyle: 'solid',
    outlineColor: 'var(--focus-color)',
    outlineOffset: '2px',
  },
  cover: {
    borderRadius: '8px',
  },
  playButton: {
    position: 'absolute',
    right: '10px',
    bottom: '10px',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    borderStyle: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
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
    transitionTimingFunction: 'ease-out',
  },
  playIcon: {
    display: 'block',
    // The triangle's visual center is left of its bounding box center
    transform: 'translateX(1.5px)',
  },
  title: {
    fontSize: '13px',
    fontWeight: 600,
    lineHeight: 1.35,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titlePlaying: {
    color: 'var(--main-color)',
  },
  subtitle: {
    fontSize: '12px',
    lineHeight: 1.35,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});
