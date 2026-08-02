import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store';
import { api, type SearchResult } from '@/lib/api';
import { Search, CaseSensitive, WholeWord, Regex, ChevronRight, ChevronDown, FileCode } from 'lucide-react';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('node_modules, .git');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const { fileTree, openFile, backendConnected, openFileFromDisk } = useAppStore();

  // When the backend is live, search runs server-side across real files on
  // disk (the client only holds the tree structure, not file contents, so a
  // client-side search would find nothing).
  const [serverResults, setServerResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!backendConnected || !query.trim()) {
      setServerResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    // Debounce so we don't fire a filesystem walk on every keystroke
    const timer = setTimeout(async () => {
      try {
        const { results } = await api.search(query);
        if (!cancelled) setServerResults(results);
      } catch {
        if (!cancelled) setServerResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, backendConnected]);

  // Flatten all files for searching
  const allFiles = useMemo(() => {
    const files: Array<{ name: string; content: string; path: string }> = [];
    function walk(nodes: typeof fileTree, prefix = '') {
      for (const node of nodes) {
        const path = prefix ? `${prefix}/${node.name}` : node.name;
        if (node.type === 'file' && node.content) {
          files.push({ name: node.name, content: node.content, path });
        }
        if (node.children) {
          walk(node.children, path);
        }
      }
    }
    walk(fileTree);
    return files;
  }, [fileTree]);

  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const searchResults: Array<{
      file: string;
      matches: Array<{ line: number; text: string; range: [number, number] }>;
    }> = [];

    for (const file of allFiles) {
      const lines = file.content.split('\n');
      const matches: Array<{ line: number; text: string; range: [number, number] }> = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let searchQuery = query;
        let lineText = line;

        if (!caseSensitive) {
          searchQuery = query.toLowerCase();
          lineText = line.toLowerCase();
        }

        let index = lineText.indexOf(searchQuery);
        while (index !== -1) {
          matches.push({
            line: i + 1,
            text: line,
            range: [index, index + query.length],
          });
          index = lineText.indexOf(searchQuery, index + 1);
        }
      }

      if (matches.length > 0) {
        searchResults.push({ file: file.name, matches });
      }
    }

    return searchResults;
  }, [query, allFiles, caseSensitive]);

  // Reshape server results (flat list of path/line/text) into the grouped
  // shape the renderer already expects, so the UI code stays unchanged.
  const displayResults = useMemo(() => {
    if (!backendConnected) return results;

    const grouped = new Map<string, Array<{ line: number; text: string; range: [number, number] }>>();
    for (const r of serverResults) {
      const idx = r.text.indexOf(query);
      const list = grouped.get(r.path) ?? [];
      list.push({
        line: r.line,
        text: r.text,
        range: [Math.max(0, idx), Math.max(0, idx) + query.length],
      });
      grouped.set(r.path, list);
    }
    return Array.from(grouped.entries()).map(([file, matches]) => ({ file, matches }));
  }, [backendConnected, results, serverResults, query]);

  const toggleFile = (file: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
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
          Search
        </span>
      </div>

      {/* Search Input */}
      <div style={{ padding: '8px 12px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 6, color: '#858585' }} />
          <input
            className="vscode-input"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 28, fontSize: 13, height: 28 }}
          />
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <button
            title="Match Case"
            onClick={() => setCaseSensitive(!caseSensitive)}
            style={{
              background: caseSensitive ? '#37373d' : 'transparent',
              border: 'none',
              color: caseSensitive ? '#cccccc' : '#858585',
              padding: 2,
              cursor: 'pointer',
              borderRadius: 3,
            }}
          >
            <CaseSensitive size={16} />
          </button>
          <button
            title="Match Whole Word"
            onClick={() => setWholeWord(!wholeWord)}
            style={{
              background: wholeWord ? '#37373d' : 'transparent',
              border: 'none',
              color: wholeWord ? '#cccccc' : '#858585',
              padding: 2,
              cursor: 'pointer',
              borderRadius: 3,
            }}
          >
            <WholeWord size={16} />
          </button>
          <button
            title="Use Regular Expression"
            onClick={() => setUseRegex(!useRegex)}
            style={{
              background: useRegex ? '#37373d' : 'transparent',
              border: 'none',
              color: useRegex ? '#cccccc' : '#858585',
              padding: 2,
              cursor: 'pointer',
              borderRadius: 3,
            }}
          >
            <Regex size={16} />
          </button>
        </div>

        {/* Include/Exclude */}
        <input
          className="vscode-input"
          placeholder="files to include"
          value={includePattern}
          onChange={(e) => setIncludePattern(e.target.value)}
          style={{ marginTop: 4, fontSize: 12, height: 24, padding: '2px 8px' }}
        />
        <input
          className="vscode-input"
          placeholder="files to exclude"
          value={excludePattern}
          onChange={(e) => setExcludePattern(e.target.value)}
          style={{ marginTop: 4, fontSize: 12, height: 24, padding: '2px 8px' }}
        />
      </div>

      {/* Results */}
      <div className="scrollbars" style={{ flex: 1, overflow: 'auto' }}>
        {query && (
          <div style={{ padding: '4px 12px', fontSize: 11, color: '#858585' }}>
            {searching
              ? 'Searching…'
              : `${displayResults.length} file${displayResults.length !== 1 ? 's' : ''} with matches`}
          </div>
        )}
        {displayResults.map((result) => (
          <div key={result.file}>
            <div
              className="vscode-tree-item"
              style={{ paddingLeft: 8 }}
              onClick={() => toggleFile(result.file)}
            >
              {expandedFiles.has(result.file) ? (
                <ChevronDown size={14} color="#858585" />
              ) : (
                <ChevronRight size={14} color="#858585" />
              )}
              <FileCode size={14} color="#519aba" />
              <span>{result.file}</span>
              <span style={{ marginLeft: 'auto', color: '#858585', fontSize: 11 }}>
                {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}
              </span>
            </div>
            {expandedFiles.has(result.file) && result.matches.map((match, i) => (
              <div
                key={i}
                className="vscode-tree-item"
                style={{ paddingLeft: 36, fontSize: 12 }}
                onClick={() => {
                  if (backendConnected) {
                    // result.file is the real workspace-relative path
                    void openFileFromDisk(result.file);
                    return;
                  }
                  const node = { id: 'search-' + result.file, name: result.file, type: 'file' as const, content: '', language: 'typescript' };
                  openFile(node);
                }}
              >
                <span style={{ color: '#858585', marginRight: 8, minWidth: 24 }}>{match.line}</span>
                <span className="text-ellipsis">
                  {match.text.substring(0, match.range[0])}
                  <span style={{ background: '#613214' }}>
                    {match.text.substring(match.range[0], match.range[1])}
                  </span>
                  {match.text.substring(match.range[1])}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
