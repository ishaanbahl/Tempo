import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { PlaylistView } from './components/PlaylistView';
import { LoginView } from './components/LoginView';
import { Message, Playlist, Track } from './types';

const API_URL = 'http://127.0.0.1:8000';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'Tempo', text: "hey! I'm Tempo 🎧 your Spotify co-pilot. tell me what you want to do — move songs around, clean up a playlist, find something to vibe to... i got you." }
  ]);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState<boolean>(false);
  const [trackCache, setTrackCache] = useState<Record<string, Track[]>>({});
  const prefetchingRef = useRef<Set<string>>(new Set());
  // Incremented on each fetchTracks call so stale async pages don't update state
  const fetchIdRef = useRef(0);
  const [userName, setUserName] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('spotify_token');
  const getRefreshToken = () => localStorage.getItem('spotify_refresh_token');

  const logout = () => {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_refresh_token');
    setIsAuthenticated(false);
    setPlaylists([]);
    setSelectedPlaylist(null);
  };

  // Wraps fetch with automatic token refresh on 401.
  // On successful refresh the original request is retried transparently.
  // On refresh failure the user is logged out.
  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const makeRequest = (token: string) => fetch(url, {
      ...options,
      headers: {
        ...(options.headers as Record<string, string>),
        'Authorization': `Bearer ${token}`,
      },
    });

    const token = getToken();
    if (!token) { logout(); throw new Error('No token'); }

    const res = await makeRequest(token);
    if (res.status !== 401) return res;

    const refreshToken = getRefreshToken();
    if (!refreshToken) { logout(); throw new Error('Session expired'); }

    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!refreshRes.ok) throw new Error('Refresh failed');
      const refreshData = await refreshRes.json();
      localStorage.setItem('spotify_token', refreshData.access_token);
      if (refreshData.refresh_token) {
        localStorage.setItem('spotify_refresh_token', refreshData.refresh_token);
      }
      return makeRequest(refreshData.access_token);
    } catch {
      logout();
      throw new Error('Session expired');
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/me`);
      if (res.ok) {
        const data = await res.json();
        setUserName(data.display_name);
      }
    } catch { /* fetchWithAuth already logged out on auth failure */ }
  };

  const fetchPlaylists = async () => {
    const isInitialLoad = playlists.length === 0;
    if (isInitialLoad) setLoadingPlaylists(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/playlists`);
      if (!res.ok) throw new Error('Failed to fetch playlists');
      const data = await res.json();
      setPlaylists(data.playlists);
    } catch { /* silent */ } finally {
      if (isInitialLoad) setLoadingPlaylists(false);
    }
  };

  const applyPlaylistDeltas = (mutations: { playlist_id: string; delta: number }[]) => {
    setPlaylists(prev => prev.map(p => {
      const mutation = mutations.find(m => m.playlist_id === p.id);
      return mutation ? { ...p, tracks: Math.max(0, p.tracks + mutation.delta) } : p;
    }));
    setTrackCache(prev => {
      const next = { ...prev };
      mutations.forEach(m => { delete next[m.playlist_id]; });
      return next;
    });
  };

  const fetchTracks = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);

    if (trackCache[playlist.id]) {
      setTracks(trackCache[playlist.id]);
      // Silently refresh cache only — never call setTracks here to avoid
      // overwriting the display if the user navigates to a different playlist
      fetchWithAuth(`${API_URL}/playlists/${playlist.id}/tracks`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setTrackCache(prev => ({ ...prev, [playlist.id]: data.tracks }));
        })
        .catch(() => {});
      return;
    }

    // Assign a fetch ID so stale pages from a previous load don't update state
    const myId = ++fetchIdRef.current;
    setLoadingTracks(true);
    setTracks([]);

    let accumulated: Track[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      if (fetchIdRef.current !== myId) return; // user navigated away
      try {
        const res = await fetchWithAuth(`${API_URL}/playlists/${playlist.id}/tracks?offset=${offset}`);
        if (!res.ok || fetchIdRef.current !== myId) return;
        const data = await res.json();
        accumulated = [...accumulated, ...data.tracks];
        setTracks([...accumulated]);
        if (offset === 0) setLoadingTracks(false); // first page ready — hide spinner
        hasMore = data.has_more;
        offset += 50;
      } catch { break; }
    }

    if (fetchIdRef.current === myId) {
      setLoadingTracks(false);
      setTrackCache(prev => ({ ...prev, [playlist.id]: accumulated }));
    }
  };

  // Fire-and-forget prefetch triggered on hover — avoids duplicate in-flight requests
  const prefetchTracks = async (playlist: Playlist) => {
    if (trackCache[playlist.id] || prefetchingRef.current.has(playlist.id)) return;
    prefetchingRef.current.add(playlist.id);
    try {
      // Only prefetch first page so hover doesn't trigger heavy multi-page loads
      const res = await fetchWithAuth(`${API_URL}/playlists/${playlist.id}/tracks`);
      if (!res.ok) return;
      const data = await res.json();
      setTrackCache(prev => ({ ...prev, [playlist.id]: data.tracks }));
    } catch { /* silent */ } finally {
      prefetchingRef.current.delete(playlist.id);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (window.location.pathname === '/callback' && code) {
      setIsLoggingIn(true);
      fetch(`${API_URL}/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
        .then(res => res.json())
        .then(data => {
          if (data.access_token) {
            localStorage.setItem('spotify_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('spotify_refresh_token', data.refresh_token);
            }
            window.history.pushState({}, '', '/');
            setIsAuthenticated(true);
          }
        })
        .catch(err => console.error("Login failed:", err))
        .finally(() => setIsLoggingIn(false));
    } else {
      const token = localStorage.getItem('spotify_token');
      if (token) setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaylists();
      fetchUser();
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsLoggingIn(true);
    fetch(`${API_URL}/auth/login`)
      .then(res => res.json())
      .then(data => { if (data.url) window.location.href = data.url; })
      .catch(err => { console.error(err); setIsLoggingIn(false); });
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} isLoggingIn={isLoggingIn} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', padding: '24px', gap: '24px' }}>
      <Sidebar
        playlists={playlists}
        loading={loadingPlaylists}
        selectedId={selectedPlaylist?.id}
        userName={userName}
        onPlaylistClick={fetchTracks}
        onPlaylistHover={prefetchTracks}
        onDisconnect={logout}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
        <Header
          subtitle={selectedPlaylist ? `VIEWING: ${selectedPlaylist.name}` : undefined}
          onBack={selectedPlaylist ? () => { fetchIdRef.current++; setSelectedPlaylist(null); setTracks([]); } : undefined}
        />

        {selectedPlaylist ? (
          <PlaylistView
            playlist={selectedPlaylist}
            tracks={tracks}
            loading={loadingTracks}
          />
        ) : (
          <ChatView
            messages={messages}
            setMessages={setMessages}
            playlists={playlists}
            selectedPlaylist={selectedPlaylist}
            fetchWithAuth={fetchWithAuth}
            fetchPlaylists={fetchPlaylists}
            fetchTracks={fetchTracks}
            applyPlaylistDeltas={applyPlaylistDeltas}
          />
        )}
      </main>
    </div>
  );
}

export default App;
