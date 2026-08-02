import { useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '@/store';
import { TabBar } from './TabBar';
import { WelcomePage } from './WelcomePage';
import type { editor } from 'monaco-editor';

export function EditorArea() {
  const {
    editorTabs,
    activeTabId,
    updateTabContent,
    saveTab,
    settings,
  } = useAppStore();

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeTabId && value !== undefined) {
        updateTabContent(activeTabId, value);
      }
    },
    [activeTabId, updateTabContent]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (activeTabId) saveTab(activeTabId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, saveTab]);

  if (!activeTab) {
    return (
      <div className="vscode-editor">
        <TabBar />
        <WelcomePage />
      </div>
    );
  }

  return (
    <div className="vscode-editor">
      <TabBar />

      {/* Breadcrumb */}
      <div style={{
        height: 22,
        background: '#1e1e1e',
        borderBottom: '1px solid #3e3e42',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: 12,
        color: '#858585',
        gap: 4,
      }}>
        <span>workspace</span>
        <span>/</span>
        <span style={{ color: '#cccccc' }}>{activeTab.name}</span>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Editor
          height="100%"
          language={activeTab.language}
          value={activeTab.content}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            fontSize: settings.fontSize,
            tabSize: settings.tabSize,
            wordWrap: settings.wordWrap ? 'on' : 'off',
            minimap: { enabled: settings.minimap },
            lineNumbers: settings.lineNumbers ? 'on' : 'off',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'all',
            guides: { indentation: true, highlightActiveIndentation: true },
            bracketPairColorization: { enabled: true },
            folding: true,
            foldingHighlight: true,
            unfoldOnClickAfterEndOfLine: false,
            matchBrackets: 'always',
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            snippetSuggestions: 'inline',
            wordBasedSuggestions: 'allDocuments',
            parameterHints: { enabled: true },
            hover: { enabled: true },
            links: true,
            colorDecorators: true,
            selectionHighlight: true,
            occurrencesHighlight: 'singleFile',
            codeLens: true,
            trimAutoWhitespace: true,
            renderWhitespace: 'selection',
            renderControlCharacters: true,
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            fontLigatures: true,
            cursorBlinking: 'blink',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            contextmenu: true,
            mouseWheelZoom: true,
            multiCursorModifier: 'ctrlCmd',
            accessibilitySupport: 'off',
          }}
          onMount={(editor: editor.IStandaloneCodeEditor) => {
            // Focus the editor
            editor.focus();

            // Add command palette action
            editor.addAction({
              id: 'save-file',
              label: 'Save File',
              keybindings: [2051], // Ctrl+S
              run: () => {
                if (activeTabId) saveTab(activeTabId);
              },
            });
          }}
        />
      </div>
    </div>
  );
}
