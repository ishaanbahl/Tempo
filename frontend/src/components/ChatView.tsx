import { SyntheticEvent } from 'react';
import { Message } from '../types';

interface ChatViewProps {
  messages: Message[];
  inputVal: string;
  setInputVal: (val: string) => void;
  onSend: (e: SyntheticEvent) => void;
  isLoading?: boolean;
}

export const ChatView = ({ messages, inputVal, setInputVal, onSend, isLoading = false }: ChatViewProps) => (
  <>
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
      {isLoading && (
        <div style={{ alignSelf: 'flex-start', maxWidth: '70%' }}>
          <div style={{ fontSize: '12px', color: 'var(--accent-tertiary)', marginBottom: '4px' }}>AI</div>
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
    </div>

    <form onSubmit={onSend} className="input-cyber-wrapper">
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
