export interface Message {
  id: number;
  role: 'system' | 'ai' | 'user';
  text: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: number;
  image: string | null;
  owner: string;
}

export interface Track {
  id: string;
  name: string;
  artists: string;
  album: string;
  duration_ms: number;
  image: string | null;
}
