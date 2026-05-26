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
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
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

  const handleSend = async (e: SyntheticEvent) => {
    e.preventDefault();
    const userMessage = inputVal.trim();
    if (!userMessage || isAiLoading) return;

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMessage }]);
    setInputVal('');
    setIsAiLoading(true);

    // Build conversation history for the backend (exclude system messages, map 'ai' → 'assistant')
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'ai')
      .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          history,
          playlists: playlists.map(p => ({ id: p.id, name: p.name })),
        }),
      });

      if (!res.ok) {
        const errorMessages: Record<number, string> = {
          401: "Your Spotify session has expired. Please disconnect and log in again.",
          429: "Tempo is temporarily unavailable due to high demand. Please try again in a moment.",
          500: "Sorry, Tempo ran into an issue and couldn't complete your request.",
        };
        const msg = errorMessages[res.status] ?? `Sorry, something went wrong (error ${res.status}).`;
        setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: msg }]);
        return;
      }
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'ai', text: "Tempo is unreachable. Please check that the backend is running."
      }]);
    } finally {
      setIsAiLoading(false);
    }
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
            isLoading={isAiLoading}
          />
        )}
      </main>
    </div>
  );
}

export default App;
