import { useState, useEffect } from 'react';
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

  const fetchTracks = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setLoadingTracks(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/playlists/${playlist.id}/tracks`);
      if (!res.ok) throw new Error('Failed to fetch tracks');
      const data = await res.json();
      setTracks(data.tracks);
    } catch { /* silent */ } finally {
      setLoadingTracks(false);
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
        onDisconnect={logout}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
        <Header
          subtitle={selectedPlaylist ? `VIEWING: ${selectedPlaylist.name}` : undefined}
          onBack={selectedPlaylist ? () => { setSelectedPlaylist(null); setTracks([]); } : undefined}
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
          />
        )}
      </main>
    </div>
  );
}

export default App;
