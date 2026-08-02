import { useState } from 'react';
import { useAppStore } from '@/store';
import type { Extension } from '@/types';
import { Search, Download, Star, ToggleLeft, ToggleRight, Trash2, Puzzle } from 'lucide-react';

const POPULAR_EXTENSIONS: Extension[] = [
  { id: 'github-copilot', name: 'GitHub Copilot', publisher: 'GitHub', version: '1.180.0', description: 'AI pair programmer', enabled: false, installed: false, downloads: 28000000, rating: 4.5 },
  { id: 'tailwind-css', name: 'Tailwind CSS: IntelliSense', publisher: 'Tailwind Labs', version: '0.10.5', description: 'Intelligent Tailwind CSS: tooling', enabled: false, installed: false, downloads: 15000000, rating: 4.8 },
  { id: 'material-icon', name: 'Material Icon Theme', publisher: 'Philipp Kief', version: '4.34.0', description: 'Material Design Icons', enabled: false, installed: false, downloads: 35000000, rating: 4.9 },
  { id: 'live-server', name: 'Live Server', publisher: 'Ritwick Dey', version: '5.7.9', description: 'Launch a development local server', enabled: false, installed: false, downloads: 42000000, rating: 4.6 },
  { id: 'vim', name: 'Vim', publisher: 'vscodevim', version: '1.27.2', description: 'Vim emulation for VS Code:', enabled: false, installed: false, downloads: 5500000, rating: 4.3 },
  { id: 'bracket-pair', name: 'Bracket Pair Colorizer', publisher: 'Coenraads', version: '1.0.62', description: 'A customizable extension for colorizing matching brackets', enabled: false, installed: false, downloads: 12000000, rating: 4.7 },
];

function ExtensionItem({ ext, installed }: { ext: Extension; installed: boolean }) {
  const { toggleExtension, installExtension, uninstallExtension } = useAppStore();
  const [showDetail, setShowDetail] = useState(false);

  if (showDetail) {
    return (
      <div style={{ padding: 12, borderBottom: '1px solid #3e3e42' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              width: 48,
              height: 48,
              background: '#37373d',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Puzzle size={24} color="#858585" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{ext.name}</div>
              <div style={{ fontSize: 12, color: '#858585' }}>{ext.publisher}</div>
              <div style={{ fontSize: 11, color: '#858585' }}>v{ext.version}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {installed ? (
              <>
                <button
                  className="vscode-button secondary"
                  onClick={() => toggleExtension(ext.id)}
                  title={ext.enabled ? 'Disable' : 'Enable'}
                >
                  {ext.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button
                  className="vscode-button secondary"
                  onClick={() => { uninstallExtension(ext.id); setShowDetail(false); }}
                  title="Uninstall"
                >
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <button
                className="vscode-button"
                onClick={() => { installExtension(ext); setShowDetail(false); }}
              >
                <Download size={14} />
                Install
              </button>
            )}
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#cccccc', lineHeight: 1.5 }}>
          {ext.description}
        </div>
        {ext.rating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: '#858585' }}>
            <Star size={12} color="#cca700" fill="#cca700" />
            <span>{ext.rating}</span>
            {ext.downloads && (
              <span style={{ marginLeft: 8 }}>{(ext.downloads / 1000000).toFixed(1)}M downloads</span>
            )}
          </div>
        )}
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: '#4fc1ff',
            fontSize: 12,
            cursor: 'pointer',
            marginTop: 8,
          }}
          onClick={() => setShowDetail(false)}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        gap: 8,
        borderBottom: '1px solid #3e3e42',
        cursor: 'pointer',
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#2a2d2e'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      onClick={() => setShowDetail(true)}
    >
      <div style={{
        width: 32,
        height: 32,
        background: '#37373d',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Puzzle size={16} color="#858585" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-ellipsis" style={{ fontSize: 13, fontWeight: 500 }}>{ext.name}</div>
        <div className="text-ellipsis" style={{ fontSize: 11, color: '#858585' }}>{ext.description}</div>
      </div>
      {installed && (
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: ext.enabled ? '#4ec9b0' : '#858585',
          flexShrink: 0,
        }} />
      )}
    </div>
  );
}

export function ExtensionsView() {
  const { extensions } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'installed' | 'popular'>('installed');

  const filteredInstalled = extensions.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.publisher.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPopular = POPULAR_EXTENSIONS.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.publisher.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid #3e3e42',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#bbbbbb' }}>
          Extensions
        </span>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 6, color: '#858585' }} />
          <input
            className="vscode-input"
            placeholder="Search Extensions in Marketplace"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 28, fontSize: 13, height: 28 }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #3e3e42',
        padding: '0 12px',
      }}>
        {(['installed', 'popular'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #007acc' : '2px solid transparent',
              color: activeTab === tab ? '#cccccc' : '#858585',
              fontSize: 11,
              textTransform: 'uppercase',
              padding: '6px 8px',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab === 'installed' ? `Installed (${extensions.length})` : 'Popular'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="scrollbars" style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'installed' ? (
          filteredInstalled.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#858585', fontSize: 13 }}>
              No installed extensions match your search
            </div>
          ) : (
            filteredInstalled.map((ext) => (
              <ExtensionItem key={ext.id} ext={ext} installed />
            ))
          )
        ) : (
          filteredPopular.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#858585', fontSize: 13 }}>
              No extensions found
            </div>
          ) : (
            filteredPopular.map((ext) => (
              <ExtensionItem key={ext.id} ext={ext} installed={false} />
            ))
          )
        )}
      </div>
    </div>
  );
}
