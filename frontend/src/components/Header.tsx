interface HeaderProps {
  subtitle?: string;
  onBack?: () => void;
}

export const Header = ({ subtitle, onBack }: HeaderProps) => (
  <header style={{ paddingBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
    <div>
      <h1 
        className="cyber-glitch-text" 
        data-text="TEMPO"
        style={{ fontSize: '3rem', color: 'var(--fg-color)', textShadow: 'var(--neon-text-glow)' }}
      >
        TEMPO
      </h1>
      <h3 style={{ color: 'var(--accent)', marginTop: '8px' }}>
        <span className="animate-blink">_</span>
        {subtitle || 'CHAT WINDOW'}
      </h3>
    </div>
    {onBack && (
      <button
        className="btn-cyber cyber-chamfer-sm"
        style={{ fontSize: '11px', padding: '6px 14px', marginTop: '8px' }}
        onClick={onBack}
      >
        ← START CHATTING
      </button>
    )}
  </header>
);
