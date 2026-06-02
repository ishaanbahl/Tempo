interface LoginViewProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export const LoginView = ({ onLogin, isLoggingIn }: LoginViewProps) => (
  <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px' }}>
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
);
