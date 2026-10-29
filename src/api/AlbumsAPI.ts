import type { Album, Track } from '../generated/typings';
import DatabaseBridge from '../lib/bridge-database';
import player from '../lib/player';
import { logAndNotifyError } from '../lib/utils';
import type { QueueOrigin } from '../types/museeks';

export function getAlbumQueueOrigin(
  albumArtist: string,
  album: string,
): QueueOrigin {
  return { type: 'album', albumArtist, album };
}

export function isSameAlbum(
  album: Pick<Album, 'name' | 'album_artist'>,
  track: Track | null,
): boolean {
  return (
    track != null &&
    track.album === album.name &&
    track.album_artist === album.album_artist
  );
}

/**
 * Play an album from the start, or from a random track with shuffle enabled
 */
async function play(
  albumArtist: string,
  album: string,
  options: { shuffle?: boolean; tracks?: Array<Track> } = {},
): Promise<void> {
  try {
    const tracks =
      options.tracks ??
      (await DatabaseBridge.getAlbumTracks(albumArtist, album));

    if (tracks.length === 0) return;

    let startTrackID: string | null = null;

    if (options.shuffle === true) {
      if (!player.getShuffle()) {
        await player.toggleShuffle();
      }
      startTrackID = tracks[Math.floor(Math.random() * tracks.length)].id;
    }

    await player.start(
      tracks,
      startTrackID,
      getAlbumQueueOrigin(albumArtist, album),
    );
  } catch (err) {
    logAndNotifyError(err);
  }
}

const AlbumsAPI = {
  play,
};

export default AlbumsAPI;
