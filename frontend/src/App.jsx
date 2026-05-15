import React, { useState } from 'react';

function App() {
  const [messages, setMessages] = useState([
    { id: 1, role: 'system', text: "SYSTEM_INITIALIZED..." },
    { id: 2, role: 'ai', text: "Connection stable. Welcome to TEMPO. State your command." }
  ]);
  const [inputVal, setInputVal] = useState('');

  const playlists = [
    { id: '1', name: 'NIGHT_DRIVE_//', tracks: 42 },
    { id: '2', name: 'GYM_PROTOCOL', tracks: 112 },
    { id: '3', name: 'ACOUSTIC_ARCHIVE', tracks: 18 }
  ];

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: inputVal }]);
    setInputVal('');
    
    // Fake AI Response for structural testing
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        role: 'ai', 
        text: "PROCESSING... Simulating function call [move_tracks]." 
      }]);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', padding: '24px', gap: '24px' }}>
      
      {/* LEFT SIDEBAR - PLAYLISTS */}
      <aside 
        className="card-cyber cyber-chamfer"
        style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div>
          <h3 style={{ color: 'var(--accent-secondary)' }}>DATABANKS</h3>
          <p style={{ fontSize: '12px', color: 'var(--muted-fg)' }}>// CONNECTED: SPOTIFY_SECURE</p>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          {playlists.map(p => (
            <div 
              key={p.id} 
              className="cyber-chamfer-sm"
              style={{ 
                padding: '12px', 
                border: '1px solid var(--border-color)', 
                display: 'flex', 
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-color)',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '14px', color: 'var(--fg-color)' }}>{p.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--accent)' }}>[{p.tracks}]</span>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: 'auto' }}>
          <button className="btn-cyber cyber-chamfer-sm" style={{ width: '100%' }}>
            SYNC DATA
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CHAT AREA */}
      <main 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}
      >
        {/* HERO HEADER */}
        <header style={{ paddingBottom: '24px' }}>
          <h1 
            className="cyber-glitch-text" 
            data-text="TEMPO // TERMINAL"
            style={{ fontSize: '3rem', color: 'var(--fg-color)', textShadow: 'var(--neon-text-glow)' }}
          >
            TEMPO // TERMINAL
          </h1>
          <h3 style={{ color: 'var(--accent)', marginTop: '8px' }}>
            <span className="animate-blink">_</span>AWAITING_INPUT
          </h3>
        </header>

        {/* CHAT DISPLAY */}
        <div 
          className="card-cyber cyber-chamfer" 
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {messages.map(m => (
            <div key={m.id} style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '70%'
              }}
            >
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
        </div>

        {/* INPUT BOX */}
        <form onSubmit={handleSend} className="input-cyber-wrapper">
          <input 
            type="text" 
            className="input-cyber cyber-chamfer-sm"
            placeholder="Execute protocol... (e.g. Move unliked songs from NIGHT_DRIVE to ACOUSTIC_ARCHIVE)"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
          />
        </form>
      </main>

    </div>
  );
}

export default App;
