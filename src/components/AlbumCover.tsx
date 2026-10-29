import * as stylex from '@stylexjs/stylex';
import { useEffect, useRef, useState } from 'react';

import { getCover } from '../lib/cover';
import Icon from './Icon';

type Props = {
  /** Path of a track of the album, its cover will be displayed */
  path: string;
  alt: string;
  /** Only fetch the cover once visible (for long grids) */
  lazy?: boolean;
  xstyle?: stylex.StyleXStyles;
};

/**
 * Hook returning the cover of a track file, optionally once the element is
 * visible on screen
 */
export function useTrackCover(path: string, lazy: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible || ref.current == null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;
    setCover(null);

    void getCover(path).then((cover) => {
      if (!cancelled) setCover(cover);
    });

    return () => {
      cancelled = true;
    };
  }, [path, isVisible]);

  return { ref, cover };
}

export default function AlbumCover(props: Props) {
  const { ref, cover } = useTrackCover(props.path, props.lazy ?? false);

  return (
    <div ref={ref} {...stylex.props(styles.cover, props.xstyle)}>
      <div {...stylex.props(styles.placeholder)} aria-hidden>
        <Icon name="album" size={36} />
      </div>
      {cover != null && (
        <img
          src={cover}
          alt={props.alt}
          draggable={false}
          {...stylex.props(styles.image)}
        />
      )}
    </div>
  );
}

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  cover: {
    position: 'relative',
    aspectRatio: '1',
    width: '100%',
    overflow: 'hidden',
    borderRadius: '8px',
    backgroundColor: 'var(--cover-bg)',
    backgroundImage:
      'linear-gradient(135deg, var(--cover-bg), var(--background))',
  },
  placeholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    opacity: 0.35,
  },
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    animationName: fadeIn,
    animationDuration: '0.25s',
    animationTimingFunction: 'ease-out',
  },
});
