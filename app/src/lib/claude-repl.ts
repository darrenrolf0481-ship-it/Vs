import type { ToolCall } from '@/types';

const SLASH_COMMANDS: Record<string, string> = {
  help: `Available slash commands:
  /help     Show this help message
  /clear    Clear the conversation history
  /exit     Exit Claude Code REPL
  /model    Show current model information
  /tools    List available tools

You can also ask me anything about coding, file operations, or general questions.`,

  model: `Current model: claude-sonnet-4-20250514
Provider: Anthropic
Context window: 200K tokens
Max output: 8K tokens

Knowledge cutoff: 2026-04-01`,

  tools: `Available tools:
  read_file    - Read file contents
  write_file   - Write content to file
  run_command  - Execute shell commands
  search       - Search files
  list_dir     - List directory contents

I can use these tools to help you with file operations, code analysis, and more.`,

  clear: '__CLEAR__',
  exit: '__EXIT__',
};

const RESPONSE_TEMPLATES: Array<{
  keywords: string[];
  response: string;
  tools?: ToolCall[];
}> = [
  {
    keywords: ['hello', 'hi', 'hey', 'greetings'],
    response: `Hello! I'm Claude, your AI coding assistant. I can help you with:

- Writing and editing code
- Explaining concepts and debugging
- File operations (read, write, search)
- Running terminal commands
- Code review and optimization

What would you like to work on?`,
  },
  {
    keywords: ['help', 'how do i', 'how to', 'what can you'],
    response: `I'm Claude, an AI assistant specialized in coding tasks. Here's how I can help:

**File Operations:**
- Read and analyze files: "Read the contents of app.ts"
- Write or modify files: "Create a new helper function"
- Search across files: "Find all uses of 'User' type"

**Code Assistance:**
- Explain code: "What does this function do?"
- Debug: "Why is this throwing an error?"
- Refactor: "Clean up this component"

**Terminal:**
- Run commands and interpret output
- Set up projects and environments

Try asking me something like: "Explain the app.ts file" or "How do I add error handling?"`,
  },
  {
    keywords: ['app.ts', 'explain app', 'what is app'],
    response: `Looking at the **app.ts** file, it defines an App class that serves as the main application entry point. Let me break it down:

**Key Components:**
1. **Properties:**
   - version: string - Current app version ("1.0.0")
   - isRunning: boolean - Tracks if app is active

2. **Methods:**
   - initialize() - Starts the app, sets up listeners, renders
   - setupEventListeners() - Adds DOM event listeners
   - render() - Renders initial HTML to #app element
   - getVersion() - Returns version string
   - shutdown() - Cleans up and stops the app

**Architecture Pattern:** Classic OOP with lifecycle methods (initialize -> render -> shutdown). The initialize method follows the init pattern common in frameworks.

Would you like me to suggest improvements or refactor this class?`,
    tools: [
      {
        id: 'tool_01',
        name: 'read_file',
        status: 'completed',
        input: { file_path: 'src/app.ts' },
        output: 'Read 22 lines from src/app.ts',
      },
    ],
  },
  {
    keywords: ['index.ts', 'explain index', 'entry point'],
    response: `The **index.ts** file is the application entry point. It's straightforward:

\`\`\`typescript
import { App } from './app';

const app = new App();
app.initialize();

console.log('Application started');
\`\`\`

**What it does:**
1. Imports the App class from ./app
2. Creates a new instance
3. Calls initialize() to start the app
4. Logs a startup message

This follows the standard pattern of separating class definition (app.ts) from instantiation (index.ts), which makes testing easier.`,
    tools: [
      {
        id: 'tool_02',
        name: 'read_file',
        status: 'completed',
        input: { file_path: 'src/index.ts' },
        output: 'Read 6 lines from src/index.ts',
      },
    ],
  },
  {
    keywords: ['refactor', 'improve', 'clean up', 'optimize'],
    response: `Here are some improvements I could make to the codebase:

**1. Add TypeScript Strictness:**
- Enable strict null checks
- Add return type annotations
- Use readonly where appropriate

**2. Error Handling:**
- Add try/catch in initialize()
- Validate DOM element exists before rendering
- Add error event listeners

**3. Modern Patterns:**
- Use dependency injection for config
- Add event emitter for decoupled communication
- Implement proper cleanup in shutdown()

**4. Add Tests:**
- Unit tests for App class methods
- Mock DOM for testing render()

Would you like me to apply any of these improvements to a specific file?`,
  },
  {
    keywords: ['react', 'component', 'jsx', 'tsx'],
    response: `I can help you with React components! Here are some common patterns:

**Functional Component with Hooks:**
\`\`\`tsx
import { useState, useEffect } from 'react';

interface Props {
  title: string;
  initialCount?: number;
}

export function Counter({ title, initialCount = 0 }: Props) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    document.title = title + ': ' + count;
  }, [title, count]);

  return (
    <div>
      <h2>{title}</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
\`\`\`

Would you like me to create a specific component or explain React patterns?`,
  },
  {
    keywords: ['typescript', 'types', 'interface', 'type'],
    response: `TypeScript provides powerful type safety. Here are key patterns:

**Interfaces vs Types:**
\`\`\`typescript
// Interface - extensible, good for objects
interface User {
  id: number;
  name: string;
  email?: string; // optional
}

// Type - more flexible, supports unions
type Status = 'active' | 'inactive' | 'pending';
type Response = User | null;

// Generic function
function fetchData<T>(url: string): Promise<T> {
  return fetch(url).then(r => r.json());
}
\`\`\`

**Utility Types:**
- Partial<T> - all properties optional
- Required<T> - all properties required
- Pick<T, K> - select specific keys
- Omit<T, K> - exclude specific keys

What TypeScript concept would you like to explore?`,
  },
  {
    keywords: ['debug', 'error', 'fix', 'bug', 'issue', 'problem'],
    response: `I can help you debug! Here's my systematic approach:

**1. Identify the Problem:**
- Read error messages carefully
- Check line numbers and stack traces
- Reproduce the issue consistently

**2. Isolate the Cause:**
- Check recent changes (git diff)
- Add console.log or breakpoints
- Test with minimal reproduction

**3. Common Fixes:**
- Type errors: Check interfaces and type annotations
- Runtime errors: Add null checks and validation
- Logic errors: Trace execution flow step by step

**4. Prevention:**
- Add unit tests
- Use TypeScript strict mode
- Add error boundaries (React)

Share the error message or code snippet you're struggling with!`,
  },
  {
    keywords: ['write', 'create file', 'new file', 'generate'],
    response: `I can help you create new files! Let me know:

- What type of file (component, utility, config, etc.)
- What it should do
- Any specific patterns or conventions to follow

For example:
- "Create a React form component with validation"
- "Write a utility function for date formatting"
- "Generate a Dockerfile for a Node.js app"

What would you like me to create?`,
  },
  {
    keywords: ['test', 'jest', 'vitest', 'testing'],
    response: `Testing is crucial! Here's a Jest/Vitest example:

\`\`\`typescript
import { describe, it, expect, vi } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('should initialize correctly', () => {
    const app = new App();
    expect(app.getVersion()).toBe('1.0.0');
    
    app.initialize();
    expect(app).toBeDefined();
  });

  it('should render to DOM', () => {
    document.body.innerHTML = '<div id="app"></div>';
    
    const app = new App();
    app.initialize();
    
    const root = document.getElementById('app');
    expect(root?.innerHTML).toContain('Hello');
  });

  it('should shutdown cleanly', () => {
    const app = new App();
    app.initialize();
    
    expect(() => app.shutdown()).not.toThrow();
  });
});
\`\`\`

Key testing principles:
1. **AAA Pattern**: Arrange -> Act -> Assert
2. **One assertion per concept**
3. **Mock external dependencies**
4. **Test edge cases and errors**

Would you like me to write tests for a specific file?`,
  },
  {
    keywords: ['git', 'commit', 'branch', 'merge', 'push'],
    response: `Git workflow tips:

**Basic Workflow:**
\`\`\`bash
git status                    # Check current state
git add .                     # Stage all changes
git commit -m "message"       # Commit with message
git push origin main          # Push to remote
\`\`\`

**Branching Strategy:**
\`\`\`bash
git checkout -b feature/name  # Create and switch
git checkout main             # Switch to main
git merge feature/name        # Merge branch
git branch -d feature/name    # Delete after merge
\`\`\`

**Useful Commands:**
- git log --oneline --graph - Visual history
- git diff - See changes
- git stash - Save changes temporarily
- git reset --soft HEAD~1 - Undo last commit

Would you like help with a specific git operation?`,
  },
  {
    keywords: ['css', 'style', 'tailwind', 'styled'],
    response: `Here are modern CSS approaches:

**Tailwind CSS (Utility-First):**
\`\`\`tsx
<div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg shadow-md hover:bg-gray-700 transition-colors">
  <span className="text-white font-semibold">Card Title</span>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Action
  </button>
</div>
\`\`\`

**CSS Modules:**
\`\`\`tsx
import styles from './Button.module.css';

<button className={styles.primary}>Click</button>
\`\`\`

**CSS-in-JS (Styled Components):**
\`\`\`tsx
const Button = styled.button\`
  background: \${(props: { primary?: boolean }) => props.primary ? 'blue' : 'gray'};
  padding: 0.5rem 1rem;
  border-radius: 4px;
\`;
\`\`\`

Which styling approach are you using?`,
  },
  {
    keywords: ['api', 'fetch', 'axios', 'http', 'request', 'backend'],
    response: `Here's how to handle HTTP requests:

**Modern Fetch with async/await:**
\`\`\`typescript
interface User {
  id: number;
  name: string;
}

async function fetchUsers(): Promise<User[]> {
  try {
    const response = await fetch('/api/users', {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

// Usage with React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
\`\`\`

**Axios alternative:**
\`\`\`typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);
\`\`\`

Need help with a specific API integration?`,
  },
  {
    keywords: ['database', 'sql', 'prisma', 'orm', 'mongoose'],
    response: `Database integration patterns:

**Prisma ORM (Recommended):**
\`\`\`typescript
// schema.prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

// Usage
const user = await prisma.user.create({
  data: { email: 'user@example.com', name: 'John' },
});

const users = await prisma.user.findMany({
  where: { name: { contains: 'John' } },
  include: { posts: true },
});
\`\`\`

**Raw SQL with pg:**
\`\`\`typescript
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
\`\`\`

Would you like me to help set up a specific database?`,
  },
  {
    keywords: ['docker', 'container', 'dockerfile', 'compose'],
    response: `Docker configuration:

**Dockerfile:**
\`\`\`dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
\`\`\`

**docker-compose.yml:**
\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
  
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
\`\`\`

Need help containerizing your application?`,
  },
  {
    keywords: ['deploy', 'vercel', 'netlify', 'aws', 'hosting'],
    response: `Deployment options:

**Vercel (Easiest for Frontend):**
\`\`\`bash
npm i -g vercel
vercel --prod
\`\`\`

**Docker + VPS:**
\`\`\`bash
docker build -t myapp .
docker run -p 3000:3000 myapp
\`\`\`

**Environment Variables:**
- Never commit .env files
- Use platform-specific secret management
- Validate env vars at startup

**CI/CD Pipeline:**
\`\`\`yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run deploy
\`\`\`

Which platform are you deploying to?`,
  },
  {
    keywords: ['performance', 'optimize', 'slow', 'cache', 'memory'],
    response: `Performance optimization strategies:

**1. Code Splitting:**
\`\`\`tsx
const LazyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Spinner />}>
  <LazyComponent />
</Suspense>
\`\`\`

**2. Memoization:**
\`\`\`tsx
const MemoizedComponent = memo(function MyComponent({ data }) {
  const processed = useMemo(() => heavyCalculation(data), [data]);
  return <div>{processed}</div>;
});
\`\`\`

**3. Virtual Lists:**
\`\`\`tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList height={400} itemCount={10000} itemSize={35}>
  {({ index, style }) => <Row index={index} style={style} />}
</FixedSizeList>
\`\`\`

**4. Caching:**
- React Query for server state
- useMemo for expensive computations
- Service Workers for assets

**5. Bundle Analysis:**
\`\`\`bash
npm run build -- --analyze
\`\`\`

What performance issue are you facing?`,
  },
  {
    keywords: ['security', 'auth', 'jwt', 'oauth', 'login', 'password'],
    response: `Security best practices:

**Authentication Pattern:**
\`\`\`typescript
// Password hashing with bcrypt
const hashedPassword = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(password, hashedPassword);

// JWT tokens
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' }
);

// Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
\`\`\`

**Security Checklist:**
- Use HTTPS everywhere
- Hash passwords (never store plain text)
- Validate all inputs
- Use parameterized queries (prevent SQL injection)
- Set security headers (CSP, HSTS)
- Rate limit API endpoints
- Keep dependencies updated

Need help implementing a specific security feature?`,
  },
  {
    keywords: ['vscode', 'extension', 'plugin', 'snippet'],
    response: `VS Code: extension development:

**Extension Structure:**
\`\`\`
my-extension/
  src/
    extension.ts          # Main entry
  package.json            # Extension manifest
  tsconfig.json
\`\`\`

**package.json:**
\`\`\`json
{
  "name": "my-extension",
  "publisher": "your-name",
  "version": "0.0.1",
  "engines": { "vscode": "^1.74.0" },
  "categories": ["Other"],
  "activationEvents": ["onCommand:myExtension.hello"],
  "contributes": {
    "commands": [{
      "command": "myExtension.hello",
      "title": "Hello World"
    }]
  }
}
\`\`\`

**extension.ts:**
\`\`\`typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'myExtension.hello',
    () => vscode.window.showInformationMessage('Hello from my extension!')
  );
  context.subscriptions.push(disposable);
}
\`\`\`

Want to build a specific type of extension?`,
  },
  {
    keywords: ['nodejs', 'node.js', 'express', 'server', 'backend', 'api'],
    response: `Node.js/Express server setup:

**Express server:**
\`\`\`typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users', async (_req, res) => {
  const users = await db.user.findMany();
  res.json(users);
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
\`\`\`

**Project Structure:**
\`\`\`
src/
  routes/       # Route definitions
  controllers/  # Business logic
  middleware/   # Custom middleware
  models/       # Data models
  utils/        # Helpers
  app.ts        # App setup
  server.ts     # Entry point
\`\`\`

Need help with a specific backend feature?`,
  },
  {
    keywords: ['react hooks', 'usestate', 'useeffect', 'usecontext', 'custom hook'],
    response: `React Hooks patterns:

**Custom Hook Example:**
\`\`\`typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      return valueToStore;
    });
  };

  return [storedValue, setValue] as const;
}

// Usage
const [theme, setTheme] = useLocalStorage('theme', 'light');
\`\`\`

**useEffect patterns:**
\`\`\`typescript
// Fetch data
useEffect(() => {
  let cancelled = false;
  fetchData().then(data => {
    if (!cancelled) setData(data);
  });
  return () => { cancelled = true };
}, [id]);

// Event listener
useEffect(() => {
  const handler = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
\`\`\`

What hook pattern are you exploring?`,
  },
  {
    keywords: ['state management', 'redux', 'zustand', 'context', 'mobx'],
    response: `State management options:

**Zustand (Recommended - Simple):**
\`\`\`typescript
import { create } from 'zustand';

interface BearStore {
  bears: number;
  increase: () => void;
  removeAll: () => void;
}

const useStore = create<BearStore>((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
  removeAll: () => set({ bears: 0 }),
}));

// Usage
const bears = useStore((state) => state.bears);
\`\`\`

**Context API (Built-in):**
\`\`\`tsx
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={theme}>
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button>{theme}</button>;
}
\`\`\`

Need help with a specific state management approach?`,
  },
  {
    keywords: ['form', 'validation', 'react hook form', 'formik'],
    response: `Form handling patterns:

**React Hook Form:**
\`\`\`tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
      
      <button type="submit">Login</button>
    </form>
  );
}
\`\`\`

Need help with a specific form pattern?`,
  },
  {
    keywords: ['routing', 'react router', 'navigation', 'route'],
    response: `React Router patterns:

**Setup:**
\`\`\`tsx
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/users/:id" element={<UserProfile />} />
      </Routes>
    </BrowserRouter>
  );
}

function UserProfile() {
  const { id } = useParams<{ id: string }>();
  return <div>User: {id}</div>;
}
\`\`\`

**Protected Route:**
\`\`\`tsx
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}
\`\`\`

Need help with a specific routing scenario?`,
  },
];

const FALLBACK_RESPONSES = [
  `That's an interesting topic! Let me think about how I can help you with that.

Could you provide more context or share the specific code you're working with? That way I can give you a more targeted answer.`,

`I'd be happy to help with that! To give you the best answer, could you share:

1. What you're trying to accomplish
2. Any relevant code snippets
3. What you've already tried

This will help me provide a more specific and useful response.`,

`Great question! I can definitely help with this. Let me know if you'd like me to:

- Explain a concept in detail
- Review and improve existing code
- Write a complete implementation
- Suggest best practices and patterns

What would be most helpful?`,
];

export function processClaudeInput(input: string): {
  type: 'message' | 'slash' | 'exit' | 'clear';
  content?: string;
  tools?: ToolCall[];
} {
  const trimmed = input.trim();

  // Slash commands
  if (trimmed.startsWith('/')) {
    const cmd = trimmed.slice(1).split(' ')[0];
    const response = SLASH_COMMANDS[cmd];

    if (response === '__EXIT__') {
      return { type: 'exit' };
    }
    if (response === '__CLEAR__') {
      return { type: 'clear' };
    }

    return {
      type: 'slash',
      content: response || `Unknown command: /${cmd}. Type /help for available commands.`,
    };
  }

  // Empty input
  if (!trimmed) {
    return { type: 'message', content: '' };
  }

  // Find matching response template
  const lowerInput = trimmed.toLowerCase();
  const matched = RESPONSE_TEMPLATES.find((t) =>
    t.keywords.some((k) => lowerInput.includes(k))
  );

  if (matched) {
    return {
      type: 'message',
      content: matched.response,
      tools: matched.tools,
    };
  }

  // Fallback
  return {
    type: 'message',
    content: FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)],
  };
}

export function streamText(text: string, onChunk: (chunk: string) => void, onDone: () => void): () => void {
  let index = 0;
  const speed = 8; // characters per batch

  const interval = setInterval(() => {
    const chunk = text.slice(index, index + speed);
    onChunk(chunk);
    index += speed;

    if (index >= text.length) {
      clearInterval(interval);
      onDone();
    }
  }, 15);

  return () => clearInterval(interval);
}
