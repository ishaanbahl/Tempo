interface HeaderProps {
  subtitle?: string;
}

export const Header = ({ subtitle }: HeaderProps) => (
  <header style={{ paddingBottom: '24px' }}>
    <h1 
      className="cyber-glitch-text" 
      data-text="TEMPO // TERMINAL"
      style={{ fontSize: '3rem', color: 'var(--fg-color)', textShadow: 'var(--neon-text-glow)' }}
    >
      TEMPO // TERMINAL
    </h1>
    <h3 style={{ color: 'var(--accent)', marginTop: '8px' }}>
      <span className="animate-blink">_</span>
      {subtitle || 'AWAITING_INPUT'}
    </h3>
  </header>
);
