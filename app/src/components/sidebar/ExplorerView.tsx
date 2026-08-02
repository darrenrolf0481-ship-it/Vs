import { useState, useCallback } from 'react';
import { useAppStore } from '@/store';
import type { FileNode } from '@/types';
import {
  FileCode, FileJson, FileText, FolderClosed, FolderOpen,
  ChevronRight, ChevronDown, FilePlus, FolderPlus, RefreshCw
} from 'lucide-react';

const FILE_ICONS: Record<string, typeof FileCode> = {
  ts: FileCode, js: FileCode, jsx: FileCode, tsx: FileCode,
  py: FileCode, rb: FileCode, go: FileCode, rs: FileCode,
  java: FileCode, kt: FileCode, swift: FileCode, c: FileCode,
  cpp: FileCode, cs: FileCode, php: FileCode,
  json: FileJson, md: FileText, default: FileText,
};

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function TreeNodeItem({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const {
    activeTabId, editorTabs, openFile, toggleFolder,
    deleteNode, renameNode, createFile, createFolder,
  } = useAppStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [creatingFile, setCreatingFile] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newName, setNewName] = useState('');

  const isActive = editorTabs.some((t) => t.name === node.name && t.id === activeTabId);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== node.name) {
      renameNode(node.id, renameValue.trim());
    }
    setRenaming(false);
  };

  const handleCreateFile = () => {
    if (newName.trim()) {
      createFile(node.id, newName.trim());
    }
    setCreatingFile(false);
    setNewName('');
  };

  const handleCreateFolder = () => {
    if (newName.trim()) {
      createFolder(node.id, newName.trim());
    }
    setCreatingFolder(false);
    setNewName('');
  };

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className="vscode-tree-item"
          style={{ paddingLeft: 8 + depth * 16 }}
          onClick={() => toggleFolder(node.id)}
          onContextMenu={handleContextMenu}
        >
          {node.isOpen ? (
            <ChevronDown size={14} color="#858585" />
          ) : (
            <ChevronRight size={14} color="#858585" />
          )}
          {node.isOpen ? (
            <FolderOpen size={16} color="#dcb67a" />
          ) : (
            <FolderClosed size={16} color="#dcb67a" />
          )}
          {renaming ? (
            <input
              className="vscode-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
              autoFocus
              style={{ height: 20, fontSize: 13, padding: '1px 4px' }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-ellipsis">{node.name}</span>
          )}
        </div>

        {node.isOpen && node.children && (
          <div>
            {creatingFile && (
              <div className="vscode-tree-item" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
                <FileCode size={16} color="#519aba" />
                <input
                  className="vscode-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleCreateFile}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFile(); if (e.key === 'Escape') { setCreatingFile(false); setNewName(''); } }}
                  autoFocus
                  placeholder="filename"
                  style={{ height: 20, fontSize: 13, padding: '1px 4px' }}
                />
              </div>
            )}
            {creatingFolder && (
              <div className="vscode-tree-item" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
                <FolderClosed size={16} color="#dcb67a" />
                <input
                  className="vscode-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleCreateFolder}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewName(''); } }}
                  autoFocus
                  placeholder="foldername"
                  style={{ height: 20, fontSize: 13, padding: '1px 4px' }}
                />
              </div>
            )}
            {node.children.map((child) => (
              <TreeNodeItem key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="context-menu-item" onClick={() => { setCreatingFile(true); setContextMenu(null); }}>
              <span>New File</span>
            </div>
            <div className="context-menu-item" onClick={() => { setCreatingFolder(true); setContextMenu(null); }}>
              <span>New Folder</span>
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => { setRenaming(true); setContextMenu(null); }}>
              <span>Rename</span>
            </div>
            <div className="context-menu-item" onClick={() => { deleteNode(node.id); setContextMenu(null); }}>
              <span style={{ color: '#f48771' }}>Delete</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // File
  const Icon = getFileIcon(node.name);
  return (
    <div>
      <div
        className={`vscode-tree-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => openFile(node)}
        onContextMenu={handleContextMenu}
      >
        <span style={{ width: 14, display: 'inline-block' }} />
        <Icon size={16} color="#519aba" />
        {renaming ? (
          <input
            className="vscode-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            autoFocus
            style={{ height: 20, fontSize: 13, padding: '1px 4px' }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-ellipsis">{node.name}</span>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="context-menu-item" onClick={() => { setRenaming(true); setContextMenu(null); }}>
            <span>Rename</span>
          </div>
          <div className="context-menu-item" onClick={() => { deleteNode(node.id); setContextMenu(null); }}>
            <span style={{ color: '#f48771' }}>Delete</span>
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={() => { navigator.clipboard.writeText(node.name); setContextMenu(null); }}>
            <span>Copy Path</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExplorerView() {
  const { fileTree, createFile, createFolder, backendConnected, workspacePath } = useAppStore();
  const [creatingFile, setCreatingFile] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreateFile = () => {
    if (newName.trim()) {
      createFile('root-src', newName.trim());
    }
    setCreatingFile(false);
    setNewName('');
  };

  const handleCreateFolder = () => {
    if (newName.trim()) {
      createFolder('root-src', newName.trim());
    }
    setCreatingFolder(false);
    setNewName('');
  };

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
          Explorer
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            title="New File"
            style={{ background: 'transparent', border: 'none', color: '#cccccc', cursor: 'pointer', padding: 2 }}
            onClick={() => setCreatingFile(true)}
          >
            <FilePlus size={16} />
          </button>
          <button
            title="New Folder"
            style={{ background: 'transparent', border: 'none', color: '#cccccc', cursor: 'pointer', padding: 2 }}
            onClick={() => setCreatingFolder(true)}
          >
            <FolderPlus size={16} />
          </button>
          <button
            title="Refresh"
            style={{ background: 'transparent', border: 'none', color: '#cccccc', cursor: 'pointer', padding: 2 }}
            onClick={() => {
              // Re-read the tree from disk rather than reloading the page,
              // which would throw away open tabs and unsaved edits.
              void useAppStore.getState().refreshTree();
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Workspace name — shows the real folder when connected to the backend */}
      <div style={{ padding: '4px 12px', fontSize: 11, color: '#858585', fontWeight: 600, textTransform: 'uppercase' }}
           title={workspacePath ?? 'In-memory demo workspace (backend not connected)'}>
        {backendConnected && workspacePath
          ? workspacePath.split('/').filter(Boolean).pop() || 'workspace'
          : 'workspace (demo)'}
      </div>

      {/* File Tree */}
      <div className="scrollbars" style={{ flex: 1, overflow: 'auto' }}>
        {creatingFile && (
          <div className="vscode-tree-item" style={{ paddingLeft: 8 }}>
            <FileCode size={16} color="#519aba" />
            <input
              className="vscode-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleCreateFile}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFile(); if (e.key === 'Escape') { setCreatingFile(false); setNewName(''); } }}
              autoFocus
              placeholder="filename"
              style={{ height: 20, fontSize: 13, padding: '1px 4px' }}
            />
          </div>
        )}
        {creatingFolder && (
          <div className="vscode-tree-item" style={{ paddingLeft: 8 }}>
            <FolderClosed size={16} color="#dcb67a" />
            <input
              className="vscode-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleCreateFolder}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewName(''); } }}
              autoFocus
              placeholder="foldername"
              style={{ height: 20, fontSize: 13, padding: '1px 4px' }}
            />
          </div>
        )}
        {fileTree.map((node) => (
          <TreeNodeItem key={node.id} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}
