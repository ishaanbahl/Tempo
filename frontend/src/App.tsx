import { useState, SyntheticEvent, useEffect } from 'react';
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
    { id: 1, role: 'system', text: "SYSTEM_INITIALIZED..." },
    { id: 2, role: 'ai', text: "Connection stable. Welcome to TEMPO. State your command." }
  ]);
  const [inputVal, setInputVal] = useState<string>('');

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState<boolean>(false);
  const [userName, setUserName] = useState<string | null>(null);
  const getToken = () => localStorage.getItem('spotify_token');

  const fetchUser = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserName(data.display_name);
      }
    } catch (err) {
      console.error("Failed to load user:", err);
    }
  };

  const fetchPlaylists = async () => {
    const token = getToken();
    if (!token) return;
    setLoadingPlaylists(true);
    try {
      const res = await fetch(`${API_URL}/playlists`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch playlists');
      const data = await res.json();
      setPlaylists(data.playlists);
    } catch (err) {
      console.error("Failed to load playlists:", err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const fetchTracks = async (playlist: Playlist) => {
    const token = getToken();
    if (!token) return;
    setSelectedPlaylist(playlist);
    setLoadingTracks(true);
    try {
      const res = await fetch(`${API_URL}/playlists/${playlist.id}/tracks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch tracks');
      const data = await res.json();
      setTracks(data.tracks);
    } catch (err) {
      console.error("Failed to load tracks:", err);
    } finally {
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

  const handleSend = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: inputVal }]);
    setInputVal('');
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'ai', text: "PROCESSING... Simulating function call [move_tracks]."
      }]);
    }, 1000);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('spotify_token');
    setIsAuthenticated(false);
    setPlaylists([]);
    setSelectedPlaylist(null);
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
        onDisconnect={handleDisconnect}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
        <Header subtitle={selectedPlaylist ? `VIEWING: ${selectedPlaylist.name}` : undefined} />

        {selectedPlaylist ? (
          <PlaylistView
            playlist={selectedPlaylist}
            tracks={tracks}
            loading={loadingTracks}
            onBack={() => { setSelectedPlaylist(null); setTracks([]); }}
          />
        ) : (
          <ChatView
            messages={messages}
            inputVal={inputVal}
            setInputVal={setInputVal}
            onSend={handleSend}
          />
        )}
      </main>
    </div>
  );
}

export default App;
