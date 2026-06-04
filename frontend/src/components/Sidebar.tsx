import { Playlist } from '../types';

interface SidebarProps {
  playlists: Playlist[];
  loading: boolean;
  selectedId: string | undefined;
  userName: string | null;
  onPlaylistClick: (p: Playlist) => void;
  onPlaylistHover: (p: Playlist) => void;
  onDisconnect: () => void;
}

export const Sidebar = ({ playlists, loading, selectedId, userName, onPlaylistClick, onPlaylistHover, onDisconnect }: SidebarProps) => (
  <aside
    className="card-cyber cyber-chamfer"
    style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}
  >
    <div>
      <h3 style={{ color: 'var(--accent-secondary)' }}> // PLAYLISTS</h3>
    </div>

    <div style={{ borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
      {loading ? (
        <div style={{ color: 'var(--accent)', fontSize: '13px', padding: '12px', textAlign: 'center' }}>
          <span className="animate-blink">_</span> LOADING...
        </div>
      ) : playlists.length === 0 ? (
        <div style={{ color: 'var(--muted-fg)', fontSize: '13px', padding: '12px', textAlign: 'center' }}>
          NO PLAYLISTS DETECTED
        </div>
      ) : (
        playlists.map(p => (
          <div
            key={p.id}
            className={`cyber-chamfer-sm playlist-item ${selectedId === p.id ? 'active' : ''}`}
            onClick={() => onPlaylistClick(p)}
            onMouseEnter={() => onPlaylistHover(p)}
            style={{
              padding: '12px',
              border: `1px solid ${selectedId === p.id ? 'var(--accent)' : 'var(--border-color)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: selectedId === p.id ? 'var(--muted-bg)' : 'var(--bg-color)',
              cursor: 'pointer',
              boxShadow: selectedId === p.id ? 'var(--neon-glow-sm)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ overflow: 'hidden', marginRight: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--fg-color)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              <span style={{ fontSize: '10px', color: 'var(--muted-fg)' }}>{p.owner}</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--accent)', flexShrink: 0 }}>[{p.tracks}]</span>
          </div>
        ))
      )}
    </div>

    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ 
        padding: '12px', 
        backgroundColor: 'var(--muted-bg)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '4px',
        textAlign: 'center',
        fontSize: '14px',
        color: 'var(--accent)',
        letterSpacing: '1px'
      }}>
        {userName || 'UNKNOWN_USER'}
      </div>
      <button className="btn-cyber cyber-chamfer-sm" style={{ width: '100%' }} onClick={onDisconnect}>
        DISCONNECT
      </button>
    </div>
  </aside>
);

