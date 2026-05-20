import { Playlist, Track } from '../types';

interface PlaylistViewProps {
  playlist: Playlist;
  tracks: Track[];
  loading: boolean;
  onBack: () => void;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const PlaylistView = ({ playlist, tracks, loading, onBack }: PlaylistViewProps) => (
  <div 
    className="card-cyber cyber-chamfer" 
    style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h3 style={{ color: 'var(--accent-secondary)' }}>{playlist.name} // {playlist.tracks} TRACKS</h3>
      <button 
        className="btn-cyber cyber-chamfer-sm" 
        style={{ fontSize: '11px', padding: '6px 14px' }}
        onClick={onBack}
      >
        ← BACK TO TERMINAL
      </button>
    </div>

    <div style={{ borderTop: '1px solid var(--border-color)' }} />

    <div className="tracks-grid">
      <div className="track-row" style={{ borderBottom: '1px solid var(--border-color)', borderRadius: 0, paddingBottom: '12px', color: '#b3b3b3', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '2px', fontWeight: 'bold' }}>
        <span style={{ textAlign: 'center' }}>#</span>
        <span>Title</span>
        <span>Artist</span>
        <span style={{ textAlign: 'right' }}>Time</span>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent)' }}>
          <span className="animate-blink">_</span> SYNCHRONIZING_TRACKS...
        </div>
      ) : tracks.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#b3b3b3', fontSize: '14px' }}>
          NO_TRACKS_DETECTED_IN_THIS_PLAYLIST
        </div>
      ) : (
        tracks.map((track, index) => (
          <div key={track.id || index} className="track-row">
            <span style={{ color: '#b3b3b3', textAlign: 'center', fontSize: '13px' }}>{index + 1}</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
              {track.image && <img src={track.image} alt="" style={{ width: '40px', height: '40px', borderRadius: '2px', flexShrink: 0 }} />}
              <div style={{ color: '#ffffff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px' }}>
                {track.name}
              </div>
            </div>

            <div style={{ color: '#b3b3b3', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {track.artists}
            </div>

            <div style={{ color: '#b3b3b3', fontSize: '14px', textAlign: 'right', fontFamily: 'monospace' }}>
              {formatDuration(track.duration_ms)}
            </div>
          </div>
        ))
      )}
    </div>

  </div>
);
