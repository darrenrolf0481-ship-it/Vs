import { useAppStore } from '@/store';
import { FilePlus, FolderOpen, GitBranch, BookOpen, Keyboard, Settings, Sparkles } from 'lucide-react';

export function WelcomePage() {
  const { createFile, togglePanel, createTerminalSession } = useAppStore();

  const actions = [
    {
      icon: FilePlus,
      label: 'New File...',
      shortcut: 'Ctrl+N',
      action: () => createFile('root-src', 'untitled.ts'),
    },
    {
      icon: FolderOpen,
      label: 'Open Folder...',
      shortcut: 'Ctrl+O',
      action: () => alert('Opening a folder would prompt for directory access.'),
    },
    {
      icon: GitBranch,
      label: 'Clone Repository...',
      action: () => alert('Cloning from: https://github.com/user/repo'),
    },
  ];

  const recents = [
    { label: 'workspace', path: '~/workspace' },
    { label: 'my-project', path: '~/projects/my-project' },
  ];

  const walkthroughs = [
    {
      icon: BookOpen,
      title: 'Get Started with VS Code:',
      description: 'Discover the best customizations to make VS Code: yours.',
    },
    {
      icon: Keyboard,
      title: 'Learn the Fundamentals',
      description: 'Unlock the full power of VS Code: with these core features.',
    },
    {
      icon: Sparkles,
      title: 'Claude Code REPL',
      description: 'Type "claude" in the terminal to start an AI coding session.',
      action: () => {
        createTerminalSession();
        togglePanel();
      },
    },
    {
      icon: Settings,
      title: 'Rich Editing Experience',
      description: 'Syntax highlighting, bracket matching, auto indent, and more.',
    },
  ];

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      overflow: 'auto',
    }}>
      {/* VS Code: Logo */}
      <div style={{ marginBottom: 24 }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.583 1.424L9.88 9.127l-5.98-4.59L1.16 6.15v11.7l2.74 1.613 5.98-4.59 7.703 7.703 4.417-2.05V3.474l-4.417-2.05zM3.16 15.9V8.1l4.5 3.9-4.5 3.9zm8.72-3.9l6.12-4.95v9.9l-6.12-4.95z" fill="#007acc"/>
        </svg>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 300, marginBottom: 32, color: '#cccccc' }}>
        VS Code: Web
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 32,
        maxWidth: 700,
        width: '100%',
      }}>
        {/* Start */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 400, color: '#858585', marginBottom: 12 }}>
            Start
          </h2>
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.action}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '6px 8px',
                background: 'transparent',
                border: 'none',
                color: '#4fc1ff',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: 4,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2a2d2e'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <action.icon size={16} />
              <span>{action.label}</span>
              {action.shortcut && (
                <span style={{ marginLeft: 'auto', color: '#858585', fontSize: 11 }}>
                  {action.shortcut}
                </span>
              )}
            </button>
          ))}

          <h2 style={{ fontSize: 13, fontWeight: 400, color: '#858585', marginTop: 20, marginBottom: 12 }}>
            Recent
          </h2>
          {recents.map((recent) => (
            <button
              key={recent.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '6px 8px',
                background: 'transparent',
                border: 'none',
                color: '#cccccc',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2a2d2e'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <FolderOpen size={16} color="#858585" />
              <span>{recent.label}</span>
              <span style={{ marginLeft: 'auto', color: '#858585', fontSize: 11 }}>
                {recent.path}
              </span>
            </button>
          ))}
        </div>

        {/* Walkthroughs */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 400, color: '#858585', marginBottom: 12 }}>
            Walkthroughs
          </h2>
          {walkthroughs.map((w) => (
            <button
              key={w.title}
              onClick={w.action}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                width: '100%',
                padding: '10px 12px',
                background: '#252526',
                border: '1px solid #3e3e42',
                color: '#cccccc',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: 6,
                marginBottom: 8,
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#007acc'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#3e3e42'; }}
            >
              <div style={{
                width: 32,
                height: 32,
                background: '#37373d',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <w.icon size={16} color="#cccccc" />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{w.title}</div>
                <div style={{ fontSize: 12, color: '#858585', lineHeight: 1.4 }}>{w.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
