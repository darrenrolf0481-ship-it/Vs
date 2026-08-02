import type { FileNode } from '@/types';

export interface CommandContext {
  currentPath: string;
  fileTree: FileNode[];
  updateFileTree: (tree: FileNode[]) => void;
  getNodePath: (node: FileNode) => string;
}

export interface CommandResult {
  output: string;
  error?: boolean;
  newPath?: string;
}

function resolvePath(currentPath: string, target: string): string {
  if (target.startsWith('/')) return target;
  const parts = currentPath.split('/').filter(Boolean);
  const targetParts = target.split('/').filter(Boolean);

  for (const part of targetParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return '/' + parts.join('/');
}

function getNodeAtPath(fileTree: FileNode[], path: string): FileNode | null {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  let current = fileTree;
  let node: FileNode | null = null;

  for (let i = 0; i < parts.length; i++) {
    const found = current.find((n) => n.name === parts[i]);
    if (!found) return null;
    node = found;
    if (i < parts.length - 1) {
      current = found.children || [];
    }
  }

  return node;
}

function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

function getFileName(path: string): string {
  return path.split('/').filter(Boolean).pop() || '';
}

function addNode(fileTree: FileNode[], parentPath: string, newNode: FileNode): FileNode[] {
  if (parentPath === '/' || parentPath === '') {
    return [...fileTree, newNode];
  }
  return fileTree.map((node) => {
    const nodePath = '/' + node.name;
    if (nodePath === parentPath && node.type === 'folder') {
      return { ...node, children: [...(node.children || []), newNode] };
    }
    if (node.children) {
      return { ...node, children: addNode(node.children, parentPath, newNode) };
    }
    return node;
  });
}

function removeNode(fileTree: FileNode[], path: string): FileNode[] {
  const fileName = getFileName(path);
  return fileTree
    .filter((node) => !(node.name === fileName))
    .map((node) => {
      if (node.children) {
        return { ...node, children: removeNode(node.children, path) };
      }
      return node;
    });
}

const commands: Record<string, (args: string[], ctx: CommandContext) => CommandResult> = {
  help: () => ({
    output: `Available commands:
  ls [path]        List directory contents
  ll [path]        List directory contents (detailed)
  la [path]        List all files including hidden
  cd <path>        Change directory
  pwd              Print working directory
  cat <file>       Display file contents
  echo <text>      Print text
  mkdir <dir>      Create directory
  touch <file>     Create empty file
  rm <file>        Remove file
  rm -rf <dir>     Remove directory recursively
  clear            Clear terminal
  whoami           Print current user
  date             Print current date and time
  claude           Enter Claude Code REPL
  help             Show this help message`,
  }),

  ls: (args, ctx) => {
    const path = resolvePath(ctx.currentPath, args[0] || '.');
    const node = getNodeAtPath(ctx.fileTree, path);

    if (!node) {
      return { output: `ls: cannot access '${args[0] || path}': No such file or directory`, error: true };
    }

    if (node.type === 'file') {
      return { output: node.name };
    }

    const children = node.children || [];
    const names = children.map((child) => {
      if (child.type === 'folder') return `${child.name}/`;
      return child.name;
    });

    return { output: names.join('\n') || ' (empty directory)' };
  },

  ll: (args, ctx) => {
    const path = resolvePath(ctx.currentPath, args[0] || '.');
    const node = getNodeAtPath(ctx.fileTree, path);

    if (!node) {
      return { output: `ll: cannot access '${args[0] || path}': No such file or directory`, error: true };
    }

    if (node.type === 'file') {
      return { output: `-rw-r--r-- 1 user user ${(node.content || '').length} ${new Date().toLocaleString()} ${node.name}` };
    }

    const children = node.children || [];
    const lines = children.map((child) => {
      const size = child.type === 'file' ? (child.content || '').length : 0;
      const type = child.type === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--';
      return `${type} 1 user user ${size.toString().padStart(6)} ${new Date().toLocaleString()} ${child.name}`;
    });

    return { output: lines.join('\n') || 'total 0\n (empty directory)' };
  },

  la: (args, ctx) => {
    const result = commands.ls(args, ctx);
    return result;
  },

  cd: (args, ctx) => {
    if (!args[0] || args[0] === '~') {
      return { output: '', newPath: '/workspace' };
    }

    const path = resolvePath(ctx.currentPath, args[0]);
    const node = getNodeAtPath(ctx.fileTree, path);

    if (!node) {
      return { output: `cd: no such file or directory: ${args[0]}`, error: true };
    }

    if (node.type !== 'folder') {
      return { output: `cd: not a directory: ${args[0]}`, error: true };
    }

    return { output: '', newPath: path };
  },

  pwd: (_args, ctx) => ({
    output: ctx.currentPath,
  }),

  cat: (args, ctx) => {
    if (!args[0]) {
      return { output: 'cat: missing file operand', error: true };
    }

    const path = resolvePath(ctx.currentPath, args[0]);
    const node = getNodeAtPath(ctx.fileTree, path);

    if (!node) {
      return { output: `cat: ${args[0]}: No such file or directory`, error: true };
    }

    if (node.type === 'folder') {
      return { output: `cat: ${args[0]}: Is a directory`, error: true };
    }

    return { output: node.content || '' };
  },

  echo: (args) => ({
    output: args.join(' '),
  }),

  mkdir: (args, ctx) => {
    if (!args[0]) {
      return { output: 'mkdir: missing operand', error: true };
    }

    const path = resolvePath(ctx.currentPath, args[0]);
    const parentPath = getParentPath(path);
    const dirName = getFileName(path);

    const parent = getNodeAtPath(ctx.fileTree, parentPath);
    if (!parent && parentPath !== '/') {
      return { output: `mkdir: cannot create directory '${args[0]}': No such file or directory`, error: true };
    }

    const newFolder: FileNode = {
      id: Date.now().toString(36),
      name: dirName,
      type: 'folder',
      isOpen: false,
      children: [],
      parent: parent?.id || 'root',
    };

    const newTree = addNode(ctx.fileTree, parentPath, newFolder);
    ctx.updateFileTree(newTree);

    return { output: '' };
  },

  touch: (args, ctx) => {
    if (!args[0]) {
      return { output: 'touch: missing file operand', error: true };
    }

    const path = resolvePath(ctx.currentPath, args[0]);
    const parentPath = getParentPath(path);
    const fileName = getFileName(path);

    const existing = getNodeAtPath(ctx.fileTree, path);
    if (existing) {
      return { output: '' }; // File exists, just update timestamp
    }

    const newFile: FileNode = {
      id: Date.now().toString(36),
      name: fileName,
      type: 'file',
      content: '',
      parent: 'root',
    };

    const newTree = addNode(ctx.fileTree, parentPath, newFile);
    ctx.updateFileTree(newTree);

    return { output: '' };
  },

  rm: (args, ctx) => {
    if (!args[0]) {
      return { output: 'rm: missing operand', error: true };
    }

    const recursive = args.includes('-rf') || args.includes('-r');
    const target = args.filter((a) => !a.startsWith('-'))[0];

    if (!target) {
      return { output: 'rm: missing operand', error: true };
    }

    const path = resolvePath(ctx.currentPath, target);
    const node = getNodeAtPath(ctx.fileTree, path);

    if (!node) {
      return { output: `rm: cannot remove '${target}': No such file or directory`, error: true };
    }

    if (node.type === 'folder' && !recursive) {
      return { output: `rm: cannot remove '${target}': Is a directory`, error: true };
    }

    const newTree = removeNode(ctx.fileTree, path);
    ctx.updateFileTree(newTree);

    return { output: '' };
  },

  clear: () => ({
    output: '__CLEAR__',
  }),

  whoami: () => ({
    output: 'user',
  }),

  date: () => ({
    output: new Date().toString(),
  }),

  // Claude command is handled separately
  claude: () => ({
    output: '__CLAUDE__',
  }),
};

export function executeCommand(
  input: string,
  ctx: CommandContext
): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) return { output: '' };

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  const handler = commands[cmd];
  if (!handler) {
    return { output: `${cmd}: command not found. Type 'help' for available commands.`, error: true };
  }

  return handler(args, ctx);
}

export function getCompletions(input: string, ctx: CommandContext): string[] {
  const parts = input.split(/\s+/);
  if (parts.length <= 1) {
    // Complete command names
    const prefix = parts[0] || '';
    return Object.keys(commands).filter((cmd) => cmd.startsWith(prefix));
  }

  // Complete file names
  const prefix = parts[parts.length - 1] || '';
  const dirPath = resolvePath(ctx.currentPath, '.');
  const node = getNodeAtPath(ctx.fileTree, dirPath);

  if (!node || node.type !== 'folder') return [];

  const children = node.children || [];
  return children
    .map((c) => (c.type === 'folder' ? `${c.name}/` : c.name))
    .filter((name) => name.startsWith(prefix));
}
