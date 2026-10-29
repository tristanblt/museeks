import type {
  Album,
  Playlist,
  ScanResult,
  Track,
  TrackGroup,
} from '../../generated/typings';
import type { DatabaseBridgeInterface } from '../bridge-database';

// Thank you Pixabay for the copyright-free tracks
const MOCK_TRACKS: Array<Track> = [
  {
    id: '0',
    title: 'Whiskey Blues',
    artists: ['Captain_Sleepy'],
    album: 'Another Album',
    duration: 300,
    album_artist: 'Captain_Sleepy',
    year: 2025,
    disk_no: 1,
    disk_of: 1,
    track_no: 1,
    track_of: 1,
    genres: ['rock', 'blues'],
    path: '/whiskey-blues.mp3',
    is_compilation: false,
  },
  {
    id: '1',
    title: 'Majestic Blues',
    artists: ['Desicomix07'],
    album: 'Pixabay',
    duration: 300,
    album_artist: 'Desicomix07',
    year: 2025,
    disk_no: 1,
    disk_of: 1,
    track_no: 1,
    track_of: 2,
    genres: ['blues'],
    path: '/majestic-blues.mp3',
    is_compilation: false,
  },
  {
    id: '2',
    title: 'Romantic Blues',
    artists: ['Jean-Paul-V'],
    album: 'Pixabay',
    duration: 300,
    album_artist: 'Jean-Paul-V',
    year: 2025,
    disk_no: 1,
    disk_of: 1,
    track_no: 2,
    track_of: 2,
    genres: ['blues'],
    path: '/romantic-blues.mp3',
    is_compilation: false,
  },
];

// Weirdly, when using a class property, accessing it is extremely slow. No idea why. May be a webkit issue.
let tracks: Array<Track> = [];

class DatabaseBridge implements DatabaseBridgeInterface {
  async getAllTracks(): Promise<Array<Track>> {
    return tracks;
  }

  async getTracks(trackIDs: Array<string>): Promise<Array<Track>> {
    return tracks.filter((track) => trackIDs.includes(track.id));
  }

  async updateTrack(_track: Track): Promise<Track> {
    return {} as Track;
  }

  async removeTracks(_trackIDs: Array<string>): Promise<Array<Track>> {
    return [];
  }

  async importTracks(
    _importPaths: Array<string>,
    _refresh = false,
  ): Promise<ScanResult> {
    tracks = MOCK_TRACKS;

    return {
      playlist_count: 0,
      track_count: 0,
      playlist_failures: 0,
      track_failures: 0,
    };
  }

  async getAllArtists(): Promise<Array<string>> {
    return [...new Set(tracks.map((track) => track.album_artist))].sort();
  }

  async getArtistTracks(artist: string): Promise<Array<TrackGroup>> {
    const artistTracks = tracks.filter(
      (track) => track.album_artist === artist,
    );
    const albums = [...new Set(artistTracks.map((track) => track.album))];

    return albums.map((album) => {
      const albumTracks = artistTracks.filter((track) => track.album === album);

      return {
        label: album,
        genres: [...new Set(albumTracks.flatMap((track) => track.genres))],
        duration: albumTracks.reduce(
          (total, track) => total + track.duration,
          0,
        ),
        year: albumTracks[0].year,
        tracks: albumTracks,
      };
    });
  }

  async hasCompilations(): Promise<boolean> {
    return false;
  }

  async getCompilationAlbums(): Promise<Array<TrackGroup>> {
    return [];
  }

  async getAlbums(): Promise<Array<Album>> {
    const albums = new Map<string, Album>();

    for (const track of tracks) {
      const key = `${track.album_artist}\u0000${track.album}`;
      const album = albums.get(key);

      if (album == null) {
        albums.set(key, {
          name: track.album,
          album_artist: track.album_artist,
          year: track.year,
          track_count: 1,
          duration: track.duration,
          is_compilation: track.is_compilation,
          cover_path: track.path,
        });
      } else {
        album.track_count += 1;
        album.duration += track.duration;
      }
    }

    return [...albums.values()];
  }

  async getAlbumTracks(
    albumArtist: string,
    album: string,
  ): Promise<Array<Track>> {
    return tracks.filter(
      (track) => track.album_artist === albumArtist && track.album === album,
    );
  }

  async getAllPlaylists(): Promise<Array<Playlist>> {
    return [];
  }

  async getPlaylist(_id: string): Promise<Playlist> {
    return {
      id: '0',
      name: 'test playlist',
      tracks: [],
      import_path: null,
    };
  }

  async createPlaylist(_name: string, _ids: Array<string>): Promise<Playlist> {
    return this.getPlaylist('0');
  }

  async renamePlaylist(_id: string, _name: string): Promise<Playlist> {
    return this.getPlaylist('0');
  }

  async setPlaylistTracks(
    _id: string,
    _tracks: Array<string>,
  ): Promise<Playlist> {
    return this.getPlaylist('0');
  }

  async exportPlaylist(_id: string): Promise<void> {
    return;
  }

  async deletePlaylist(_id: string): Promise<void> {
    return;
  }

  async reset(): Promise<string | null> {
    return null;
  }
}

export default new DatabaseBridge();
