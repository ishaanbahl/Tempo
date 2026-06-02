import { useState, SyntheticEvent, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import { Message, Playlist } from '../types';

const API_URL = 'http://127.0.0.1:8000';

interface ChatViewProps {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  playlists: Playlist[];
  selectedPlaylist: Playlist | null;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  fetchPlaylists: () => void;
  fetchTracks: (playlist: Playlist) => void;
}

export const ChatView = ({ messages, setMessages, playlists, selectedPlaylist, fetchWithAuth, fetchPlaylists, fetchTracks }: ChatViewProps) => {
  const [inputVal, setInputVal] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e: SyntheticEvent) => {
    e.preventDefault();
    const userMessage = inputVal.trim();
    if (!userMessage || isLoading) return;

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMessage }]);
    setInputVal('');
    setIsLoading(true);

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'Tempo')
      .map(m => ({ role: m.role === 'Tempo' ? 'assistant' : 'user', content: m.text }));

    try {
      const res = await fetchWithAuth(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history,
          playlists: playlists.map(p => ({ id: p.id, name: p.name })),
        }),
      });

      if (!res.ok) {
        const errorMessages: Record<number, string> = {
          429: "Tempo is temporarily unavailable due to high demand. Please try again in a moment.",
          500: "Sorry, Tempo ran into an issue and couldn't complete your request.",
        };
        const msg = errorMessages[res.status] ?? `Sorry, something went wrong (error ${res.status}).`;
        setMessages(prev => [...prev, { id: Date.now(), role: 'Tempo', text: msg }]);
        return;
      }

      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now(), role: 'Tempo', text: data.reply }]);
      if (data.playlists_modified) {
        setTimeout(() => {
          fetchPlaylists();
          if (selectedPlaylist) fetchTracks(selectedPlaylist);
        }, 800);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'Tempo', text: "Tempo is unreachable at the moment."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="card-cyber cyber-chamfer"
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {messages.map(m => (
          <div key={m.id} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '70%'
          }}>
            <div style={{
              fontSize: '12px',
              color: m.role === 'user' ? 'var(--accent-secondary)' : 'var(--accent-tertiary)',
              marginBottom: '4px'
            }}>
              {m.role.toUpperCase()}
            </div>
            <div
              className="cyber-chamfer-sm"
              style={{
                padding: '16px',
                backgroundColor: m.role === 'user' ? 'var(--bg-color)' : 'var(--muted-bg)',
                border: `1px solid ${m.role === 'user' ? 'var(--accent-secondary)' : 'var(--accent-tertiary)'}`,
                color: 'var(--fg-color)'
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '70%' }}>
            <div style={{ fontSize: '12px', color: 'var(--accent-tertiary)', marginBottom: '4px' }}>TEMPO</div>
            <div
              className="cyber-chamfer-sm"
              style={{
                padding: '16px',
                backgroundColor: 'var(--muted-bg)',
                border: '1px solid var(--accent-tertiary)',
                color: 'var(--accent-tertiary)',
                fontStyle: 'italic'
              }}
            >
              PROCESSING...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="input-cyber-wrapper">
        <input
          type="text"
          className="input-cyber cyber-chamfer-sm"
          placeholder="Execute protocol... (e.g. Move unliked songs from NIGHT_DRIVE to ACOUSTIC_ARCHIVE)"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.5 : 1 }}
        />
      </form>
    </>
  );
};
