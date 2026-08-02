import type { FileNode } from '@/types';

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', js: 'javascript', jsx: 'javascriptreact', tsx: 'typescriptreact',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin',
  swift: 'swift', c: 'c', cpp: 'cpp', cc: 'cpp', h: 'c', hpp: 'cpp',
  cs: 'csharp', php: 'php', html: 'html', htm: 'html', css: 'css', scss: 'scss',
  sass: 'sass', less: 'less', json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
  md: 'markdown', mdx: 'markdown', sql: 'sql', sh: 'shellscript', bash: 'shellscript',
  zsh: 'shellscript', fish: 'shellscript', ps1: 'powershell', dockerfile: 'dockerfile',
  vue: 'vue', svelte: 'svelte', astro: 'astro', prisma: 'prisma', graphql: 'graphql',
  gql: 'graphql', lua: 'lua', r: 'r', dart: 'dart', fl: 'flutter',
};

export function getLanguageFromExt(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[ext] || 'plaintext';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const DEFAULT_WORKSPACE: FileNode[] = [
  {
    id: 'root-readme',
    name: 'README.md',
    type: 'file',
    content: `# VS Code Web

A fully functional VS Code replica running entirely in your browser.

## Features

- **Monaco Editor** — Real syntax highlighting for 25+ languages
- **Multi-tab editing** — Open multiple files side by side
- **Integrated terminal** — Run commands in a virtual file system
- **Claude Code REPL** — Type \`claude\` in the terminal to start
- **File explorer** — Create, edit, rename, and delete files
- **Search** — Find across all files
- **Git integration** — Track changes and stage files
- **Extensions** — Browse and manage extensions

## Keyboard Shortcuts

- \`Ctrl+N\` — New File
- \`Ctrl+S\` — Save
- \`Ctrl+W\` — Close Tab
- \`Ctrl+\`\` — Toggle Terminal
- \`Ctrl+B\` — Toggle Sidebar
- \`Ctrl+Shift+P\` — Command Palette

## Getting Started

1. Open the Explorer (left sidebar) to browse files
2. Click any file to open it in the editor
3. Open the Terminal (\`Ctrl+\`\`) to run commands
4. Type \`claude\` to enter the Claude Code REPL

Enjoy coding!`,
    language: 'markdown',
    parent: 'root',
  },
  {
    id: 'root-src',
    name: 'src',
    type: 'folder',
    isOpen: true,
    parent: 'root',
    children: [
      {
        id: 'src-index',
        name: 'index.ts',
        type: 'file',
        content: `import { App } from './app';

const app = new App();
app.initialize();

console.log('Application started');`,
        language: 'typescript',
        parent: 'root-src',
      },
      {
        id: 'src-app',
        name: 'app.ts',
        type: 'file',
        content: `export class App {
  private version: string = '1.0.0';
  private isRunning: boolean = false;

  initialize(): void {
    this.isRunning = true;
    this.setupEventListeners();
    this.render();
  }

  private setupEventListeners(): void {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM ready');
    });
  }

  private render(): void {
    const root = document.getElementById('app');
    if (root) {
      root.innerHTML = '<h1>Hello, World!</h1>';
    }
  }

  getVersion(): string {
    return this.version;
  }

  shutdown(): void {
    this.isRunning = false;
    console.log('App shutdown');
  }
}`,
        language: 'typescript',
        parent: 'root-src',
      },
      {
        id: 'src-utils',
        name: 'utils',
        type: 'folder',
        isOpen: false,
        parent: 'root-src',
        children: [
          {
            id: 'utils-helpers',
            name: 'helpers.ts',
            type: 'file',
            content: `export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}`,
            language: 'typescript',
            parent: 'src-utils',
          },
        ],
      },
    ],
  },
  {
    id: 'root-pkg',
    name: 'package.json',
    type: 'file',
    content: `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}`,
    language: 'json',
    parent: 'root',
  },
  {
    id: 'root-gitignore',
    name: '.gitignore',
    type: 'file',
    content: `node_modules/
dist/
*.log
.env
.DS_Store
coverage/
*.tmp`,
    language: 'plaintext',
    parent: 'root',
  },
  {
    id: 'root-tsconfig',
    name: 'tsconfig.json',
    type: 'file',
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`,
    language: 'json',
    parent: 'root',
  },
];

export function findNodeById(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  const parts = path.split('/').filter(Boolean);
  let current: FileNode[] = nodes;

  for (const part of parts) {
    const found = current.find((n) => n.name === part);
    if (!found) return null;
    if (parts.indexOf(part) === parts.length - 1) return found;
    current = found.children || [];
  }
  return null;
}

export function getNodePath(nodes: FileNode[], node: FileNode): string {
  if (!node.parent || node.parent === 'root') {
    return node.name;
  }
  const parent = findNodeById(nodes, node.parent);
  if (!parent) return node.name;
  return `${getNodePath(nodes, parent)}/${node.name}`;
}

export function addChildNode(nodes: FileNode[], parentId: string, newNode: FileNode): FileNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        isOpen: true,
        children: [...(node.children || []), { ...newNode, parent: parentId }],
      };
    }
    if (node.children) {
      return { ...node, children: addChildNode(node.children, parentId, newNode) };
    }
    return node;
  });
}

export function removeNode(nodes: FileNode[], nodeId: string): FileNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => {
      if (node.children) {
        return { ...node, children: removeNode(node.children, nodeId) };
      }
      return node;
    });
}

export function updateNode(nodes: FileNode[], nodeId: string, updates: Partial<FileNode>): FileNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    if (node.children) {
      return { ...node, children: updateNode(node.children, nodeId, updates) };
    }
    return node;
  });
}

export function getAllFilePaths(nodes: FileNode[], prefix = ''): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'file') {
      paths.push(path);
    }
    if (node.children) {
      paths.push(...getAllFilePaths(node.children, path));
    }
  }
  return paths;
}

export function flattenFileTree(nodes: FileNode[]): Array<{ path: string; node: FileNode }> {
  const result: Array<{ path: string; node: FileNode }> = [];
  function walk(nodeList: FileNode[], prefix: string) {
    for (const node of nodeList) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      result.push({ path, node });
      if (node.children) {
        walk(node.children, path);
      }
    }
  }
  walk(nodes, '');
  return result;
}

export function fileTreeToStorage(nodes: FileNode[]): Record<string, { path: string; content: string; type: 'file' | 'folder'; modified: number }> {
  const result: Record<string, { path: string; content: string; type: 'file' | 'folder'; modified: number }> = {};
  const flat = flattenFileTree(nodes);
  for (const { path, node } of flat) {
    result[path] = {
      path,
      content: node.content || '',
      type: node.type,
      modified: Date.now(),
    };
  }
  return result;
}

export function storageToFileTree(storage: Record<string, { path: string; content: string; type: 'file' | 'folder' }>): FileNode[] {
  const entries = Object.entries(storage);
  const root: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  for (const [path, data] of entries) {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const node: FileNode = {
      id: generateId(),
      name,
      type: data.type,
      content: data.type === 'file' ? data.content : undefined,
      language: data.type === 'file' ? getLanguageFromExt(name) : undefined,
      parent: parentPath || 'root',
      isOpen: false,
      children: data.type === 'folder' ? [] : undefined,
    };

    folderMap.set(path, node);

    if (!parentPath) {
      root.push(node);
    } else {
      const parent = folderMap.get(parentPath);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  }

  return root.length > 0 ? root : DEFAULT_WORKSPACE;
}
