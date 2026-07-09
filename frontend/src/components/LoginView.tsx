interface LoginViewProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export const LoginView = ({ onLogin, isLoggingIn }: LoginViewProps) => (
  <div style={{ display: 'flex', height: '100vh', width: '100vw', flexDirection: 'column' }}>
    <div
      className="login-banner cyber-chamfer-sm"
      style={{
        margin: '24px 24px 0',
        padding: '14px 20px',
        background: 'var(--muted-bg)',
        border: '1px solid var(--accent-tertiary)',
        color: 'var(--fg-color)',
        fontFamily: 'var(--font-accent)',
        fontSize: '0.85rem',
        letterSpacing: '1px',
        lineHeight: 1.5,
        textAlign: 'center',
        boxShadow: '0 0 8px rgba(0, 212, 255, 0.2)',
      }}
    >
      Due to Spotify&apos;s developer related changes, you will be unable to log in unless specifically authenticated by the owner of this site.
    </div>

    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px' }}>
    <h1 
      className="cyber-glitch-text" 
      data-text="WELCOME TO TEMPO"
      style={{ fontSize: '4rem', color: 'var(--fg-color)', textShadow: 'var(--neon-text-glow)' }}
    >
      WELCOME TO TEMPO
    </h1>
    <p style={{ color: 'var(--muted-fg)', fontFamily: 'var(--font-accent)', letterSpacing: '2px' }}>
      SECURE CONNECTION REQUIRED
    </p>
    <button 
      className="btn-cyber cyber-chamfer-sm" 
      onClick={onLogin}
      disabled={isLoggingIn}
      style={{ fontSize: '1.2rem', padding: '16px 32px', marginTop: '16px', opacity: isLoggingIn ? 0.5 : 1 }}
    >
      {isLoggingIn ? "ESTABLISHING CONNECTION..." : "CONNECT TO SPOTIFY"}
    </button>
    </div>
  </div>
);
