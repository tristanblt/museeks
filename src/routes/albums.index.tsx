import { Plural, Trans, useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { isSameAlbum } from '../api/AlbumsAPI';
import AlbumCard from '../components/AlbumCard';
import View from '../elements/View';
import * as ViewMessage from '../elements/ViewMessage';
import type { Album } from '../generated/typings';
import usePlayingTrack from '../hooks/usePlayingTrack';
import DatabaseBridge from '../lib/bridge-database';
import useLibraryStore from '../lib/store';
import { stripAccents } from '../lib/utils-library';

const SORTS = ['artist', 'title', 'year'] as const;
type AlbumSort = (typeof SORTS)[number];

type Search = {
  sort?: AlbumSort;
};

export const Route = createFileRoute('/albums/')({
  component: ViewAlbums,
  validateSearch: (search): Search => {
    const sort = SORTS.find((value) => value === search.sort);
    return sort != null && sort !== 'artist' ? { sort } : {};
  },
  loader: async () => {
    const albums = await DatabaseBridge.getAlbums();
    return { albums };
  },
});

const collator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
});

function sortAlbums(albums: Array<Album>, sort: AlbumSort): Array<Album> {
  switch (sort) {
    case 'artist':
      // Already sorted by the backend
      return albums;
    case 'title':
      return albums.toSorted((a, b) => collator.compare(a.name, b.name));
    case 'year':
      // Most recent first, albums without year last
      return albums.toSorted(
        (a, b) =>
          (b.year ?? 0) - (a.year ?? 0) ||
          collator.compare(a.album_artist, b.album_artist),
      );
  }
}

function ViewAlbums() {
  const { albums } = Route.useLoaderData();
  const { sort = 'artist' } = Route.useSearch();
  const { t } = useLingui();

  const search = useLibraryStore((state) => stripAccents(state.search));
  const playingTrack = usePlayingTrack();

  const visibleAlbums = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered =
      query === ''
        ? albums
        : albums.filter((album) =>
            stripAccents(`${album.name} ${album.album_artist}`)
              .toLowerCase()
              .includes(query),
          );

    return sortAlbums(filtered, sort);
  }, [albums, search, sort]);

  const sortLabels: Record<AlbumSort, string> = {
    artist: t`Artist`,
    title: t`Title`,
    year: t`Year`,
  };

  if (albums.length === 0) {
    return (
      <View>
        <ViewMessage.Notice>
          <Trans>There are no albums in your library yet.</Trans>
        </ViewMessage.Notice>
      </View>
    );
  }

  return (
    <View>
      <div {...stylex.props(styles.page)}>
        <header {...stylex.props(styles.header)}>
          <div>
            <h1 {...stylex.props(styles.title)}>
              <Trans>Albums</Trans>
            </h1>
            <div {...stylex.props(styles.count)}>
              <Plural
                value={visibleAlbums.length}
                one="# album"
                other="# albums"
              />
            </div>
          </div>
          <nav aria-label={t`Sort albums by`} {...stylex.props(styles.sorts)}>
            {SORTS.map((value) => (
              <Link
                key={value}
                to="/albums"
                search={value === 'artist' ? {} : { sort: value }}
                replace
                draggable={false}
                aria-current={sort === value ? 'true' : undefined}
                {...stylex.props(
                  styles.sort,
                  sort === value && styles.sortActive,
                )}
              >
                {sortLabels[value]}
              </Link>
            ))}
          </nav>
        </header>

        {visibleAlbums.length === 0 ? (
          <div {...stylex.props(styles.empty)}>
            <Trans>No album matches your search.</Trans>
          </div>
        ) : (
          <div {...stylex.props(styles.grid)}>
            {visibleAlbums.map((album) => (
              <AlbumCard
                key={`${album.album_artist}\u0000${album.name}`}
                album={album}
                isPlaying={isSameAlbum(album, playingTrack)}
              />
            ))}
          </div>
        )}
      </div>
    </View>
  );
}

const styles = stylex.create({
  page: {
    paddingTop: '28px',
    paddingBottom: '40px',
    paddingInline: '32px',
    maxWidth: '1600px',
    marginInline: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    columnGap: '16px',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '26px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  count: {
    marginTop: '2px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  sorts: {
    display: 'flex',
    padding: '2px',
    borderRadius: '8px',
    backgroundColor: 'var(--text-interactive-bg)',
  },
  sort: {
    paddingBlock: '4px',
    paddingInline: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    color: {
      default: 'var(--text-muted)',
      ':hover': 'var(--text)',
    },
    textDecoration: 'none',
    transitionProperty: 'background-color, color',
    transitionDuration: '0.15s',
  },
  sortActive: {
    color: {
      default: 'var(--text)',
      ':hover': 'var(--text)',
    },
    backgroundColor: 'var(--background)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    columnGap: '24px',
    rowGap: '28px',
  },
  empty: {
    paddingBlock: '60px',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
});
