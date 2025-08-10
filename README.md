# @synet/fs-ai

**AI-Safe Filesystem Adapter with path protection and ACL**

> Zero-dependency, stateless filesystem adapter that provides AI safety through path protection, operation restrictions, and simplified navigation via homePath. Designed specifically for AI agents that need secure, controlled filesystem access.

## Quick Start

```bash
npm install @synet/fs-ai
```

```typescript
import { createAIFileSystem } from '@synet/fs-ai';
import { NodeFileSystem } from '@synet/fs/promises';

// Create AI-safe filesystem with simple configuration
const baseFs = new NodeFileSystem();
const aiFs = createAIFileSystem(baseFs, {
  homePath: '/workspace',
  allowedPaths: ['docs/', 'output/', 'temp/'],
  readOnly: false
});

// AI can now safely access files within constraints
await aiFs.writeFile('output/report.md', '# AI Generated Report');
const content = await aiFs.readFile('docs/template.md');
```

##  Perfect For

- **AI Agents & LLMs**: Secure filesystem access with built-in guardrails
- **Automated Scripts**: Prevent accidental system file modification  
- **Sandbox Environments**: Controlled file operations within defined boundaries
- **Unit Architecture**: Seamless integration with SYNET consciousness ecosystem
- **Production AI**: Safe deployment of AI-powered file operations

## Key Features

### **AI Safety First**
- **Path Protection**: Automatic validation against system directories (`/etc/`, `/var/`, `/sys/`)
- **Path Traversal Prevention**: Blocks `../` attacks and directory escapes
- **Operation Restrictions**: Granular control over allowed filesystem operations
- **Read-Only Mode**: Complete write protection when needed

### **HomePath Simplification**
- **AI-Friendly Navigation**: AI uses simple relative paths like `docs/file.md`
- **Automatic Resolution**: Paths resolve to `{homePath}/docs/file.md` safely
- **Working Directory Independence**: Consistent behavior regardless of `process.cwd()`
- **Path Normalization**: Handles all path formats consistently

### **Flexible Configuration**
- **Allowlist/Blocklist**: Fine-grained path access control
- **Operation Filtering**: Enable only specific filesystem operations
- **Depth Limiting**: Prevent deep directory traversal
- **Zero Dependencies**: Pure TypeScript with no external dependencies

### **Adapter Pattern**
- **Provider Agnostic**: Works with any `IAsyncFileSystem` implementation
- **Composable**: Chain with caching, audit, or other filesystem adapters
- **Stateless**: No internal state, thread-safe operations
- **Observable**: Compatible with `ObservableFileSystem` for monitoring

## Core Concepts

### AI Safety Configuration

```typescript
interface AISafetyConfig {
  // Path Security
  homePath?: string;           // Base directory for AI operations
  allowedPaths?: string[];     // Whitelist of allowed paths (relative to homePath)
  forbiddenPaths?: string[];   // Blacklist of forbidden paths  
  maxDepth?: number;           // Maximum directory depth (default: 10)

  // Operation Restrictions  
  allowedOperations?: AIOperation[];  // Allowed operations (default: all)
  readOnly?: boolean;                 // Read-only mode (default: false)
}
```

### HomePath Navigation

The **homePath** feature is designed specifically for AI agents:

```typescript
// AI thinks in simple terms
const aiFs = createAIFileSystem(baseFs, {
  homePath: '/home/user/workspace',
  allowedPaths: ['projects/', 'docs/', 'output/']
});

// AI uses simple paths
await aiFs.writeFile('output/analysis.md', content);     // → /home/user/workspace/output/analysis.md
await aiFs.readFile('docs/template.md');                 // → /home/user/workspace/docs/template.md
await aiFs.ensureDir('projects/new-project');            // → /home/user/workspace/projects/new-project

// All paths are validated and constrained automatically
```

## Usage Patterns

### Basic AI-Safe Filesystem

```typescript
import { createAIFileSystem, AIFileSystem } from '@synet/fs-ai';
import { NodeFileSystem } from '@synet/fs/promises';

const baseFs = new NodeFileSystem();
const aiFs = createAIFileSystem(baseFs, {
  homePath: process.cwd(),
  allowedPaths: ['workspace/', 'output/', 'temp/'],
  forbiddenPaths: ['config/', 'secrets/'],
  readOnly: false
});

// Safe operations within constraints
await aiFs.writeFile('output/report.md', '# Analysis Report');
await aiFs.ensureDir('workspace/new-project');
const files = await aiFs.readDir('workspace/');
```

### Read-Only AI Environment

```typescript
const readOnlyAiFs = createAIFileSystem(baseFs, {
  homePath: '/data',
  allowedPaths: ['documents/', 'resources/'],
  readOnly: true
});

// AI can read but not modify
const content = await readOnlyAiFs.readFile('documents/source.md');  // ✅ Allowed
await readOnlyAiFs.writeFile('output.md', content);                  // ❌ Blocked - read-only mode
```

### Operation-Restricted Environment

```typescript
const restrictedAiFs = createAIFileSystem(baseFs, {
  allowedOperations: ['readFile', 'exists', 'readDir'],  // No write/delete operations
  maxDepth: 5
});

await restrictedAiFs.readFile('data.json');        // ✅ Allowed
await restrictedAiFs.writeFile('output.txt', '');  // ❌ Blocked - operation not allowed
```

### Production AI Agent Setup

```typescript
import { createAIFileSystem } from '@synet/fs-ai';
import { NodeFileSystem, ObservableFileSystem } from '@synet/fs/promises';

// Create secure AI filesystem with monitoring
const baseFs = new NodeFileSystem();
const monitoredFs = new ObservableFileSystem(baseFs);
const aiFs = createAIFileSystem(monitoredFs, {
  homePath: '/app/workspace',
  allowedPaths: [
    'input/',      // AI can read input files
    'output/',     // AI can write results
    'temp/',       // AI can use temporary storage
  ],
  forbiddenPaths: [
    'config/',     // Protect configuration
    'secrets/',    // Protect sensitive data
    'system/'      // Protect system files
  ],
  allowedOperations: ['readFile', 'writeFile', 'exists', 'ensureDir', 'readDir'],
  maxDepth: 8,
  readOnly: false
});

// Monitor all AI filesystem operations
monitoredFs.getEventEmitter().subscribe('file.write', {
  update: (event) => console.log(`AI wrote: ${event.data.filePath}`)
});

// AI operates safely within constraints
await aiFs.writeFile('output/analysis.md', await generateReport());
```

## Advanced Integration

### Unit Architecture Integration

```typescript
import { AsyncFileSystem } from '@synet/fs';
import { createAIFileSystem } from '@synet/fs-ai';
import { AI } from '@synet/ai';

// Create AI-safe filesystem as Unit backend
const aiSafeBackend = createAIFileSystem(new NodeFileSystem(), {
  homePath: '/workspace',
  allowedPaths: ['vault/']
});

// Use with AsyncFileSystem Unit
const fs = AsyncFileSystem.create({ adapter: aiSafeBackend });
const ai = AI.openai({ apiKey: process.env.OPENAI_API_KEY });

// AI learns safe filesystem capabilities
await ai.learn([fs.teach()]);

// AI operates with built-in safety
await ai.call('Analyze the documents in vault/ and create a summary', {
  useTools: true
});
```

### Composition with Other Adapters

```typescript
import { CachedFileSystem, ObservableFileSystem } from '@synet/fs/promises';
import { createAIFileSystem } from '@synet/fs-ai';

// Layer AI safety with caching and monitoring
const baseFs = new NodeFileSystem();
const cachedFs = new CachedFileSystem(baseFs);
const observableFs = new ObservableFileSystem(cachedFs);
const aiSafeFs = createAIFileSystem(observableFs, {
  homePath: '/workspace',
  allowedPaths: ['data/', 'output/']
});

// Result: AI-safe + cached + observable filesystem
// Perfect for production AI applications
```

## Security Features

### Path Protection

```typescript
const aiFs = createAIFileSystem(baseFs, {
  homePath: '/safe/workspace',
  forbiddenPaths: ['/etc/', '/var/', '/sys/']
});

// These are automatically blocked
await aiFs.readFile('/etc/passwd');           // ❌ Forbidden path
await aiFs.writeFile('../../../etc/hosts');   // ❌ Path traversal blocked
await aiFs.deleteFile('/var/log/system.log'); // ❌ System path protected
```

### Operation Validation

```typescript
const config = {
  allowedOperations: ['readFile', 'exists'] as AIOperation[]
};

const aiFs = createAIFileSystem(baseFs, config);

await aiFs.readFile('data.txt');    // ✅ Allowed
await aiFs.writeFile('out.txt');    // ❌ Operation not permitted
await aiFs.deleteFile('temp.log');  // ❌ Operation not permitted
```

### Safety Introspection

```typescript
// Check current safety configuration
const config = aiFs.getSafetyConfig();
console.log('Home path:', config.homePath);
console.log('Read-only:', config.readOnly);
console.log('Max depth:', config.maxDepth);

// Check if operations are allowed
console.log('Can write:', aiFs.isOperationAllowed('writeFile'));
console.log('Can delete:', aiFs.isOperationAllowed('deleteFile'));
```

## Real-World Examples

### AI Document Processor

```typescript
import { createAIFileSystem } from '@synet/fs-ai';
import { AI } from '@synet/ai';

async function createDocumentProcessor() {
  const aiFs = createAIFileSystem(new NodeFileSystem(), {
    homePath: '/documents',
    allowedPaths: [
      'input/',      // Source documents
      'processed/',  // AI-processed results
      'templates/'   // AI templates
    ],
    allowedOperations: ['readFile', 'writeFile', 'exists', 'ensureDir', 'readDir']
  });

  const ai = AI.openai({ apiKey: process.env.OPENAI_API_KEY });
  
  // Create processing function
  return async (documentPath: string) => {
    try {
      // AI safely reads input
      const content = await aiFs.readFile(`input/${documentPath}`);
      
      // AI processes document
      const processed = await ai.ask(`Process this document: ${content}`);
      
      // AI safely writes output  
      await aiFs.ensureDir('processed/');
      await aiFs.writeFile(`processed/${documentPath}`, processed.content);
      
      return { success: true, outputPath: `processed/${documentPath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
}
```

### AI Code Generator

```typescript
async function createCodeGenerator() {
  const aiFs = createAIFileSystem(new NodeFileSystem(), {
    homePath: '/projects',
    allowedPaths: [
      'src/',        // Source code
      'tests/',      // Generated tests
      'docs/',       // Documentation
      'examples/'    // Code examples
    ],
    forbiddenPaths: [
      'node_modules/',  // Protect dependencies
      '.git/',          // Protect version control
      'dist/'           // Protect build output
    ],
    maxDepth: 6
  });

  return {
    async generateComponent(name: string, spec: string) {
      await aiFs.ensureDir('src/components/');
      await aiFs.writeFile(`src/components/${name}.tsx`, await generateReactComponent(spec));
    },
    
    async generateTests(componentName: string) {
      await aiFs.ensureDir('tests/components/');
      const component = await aiFs.readFile(`src/components/${componentName}.tsx`);
      await aiFs.writeFile(`tests/components/${componentName}.test.tsx`, await generateTests(component));
    }
  };
}
```

## API Reference

### Factory Functions

#### `createAIFileSystem(baseFs, config?)`

Creates an AI-safe filesystem adapter.

```typescript
function createAIFileSystem(
  baseFileSystem: IAsyncFileSystem,
  config?: AISafetyConfig
): AIFileSystem
```

### AIFileSystem Class

#### `new AIFileSystem(baseFs, config?)`

```typescript
constructor(
  baseFileSystem: IAsyncFileSystem,
  config: AISafetyConfig = {}
)
```

#### Methods

All standard `IAsyncFileSystem` methods with AI safety validation:

```typescript
// File Operations
async readFile(path: string): Promise<string>
async writeFile(path: string, data: string): Promise<void>
async exists(path: string): Promise<boolean>
async deleteFile(path: string): Promise<void>

// Directory Operations  
async readDir(path: string): Promise<string[]>
async ensureDir(path: string): Promise<void>
async deleteDir(path: string): Promise<void>

// Metadata Operations
async chmod(path: string, mode: number): Promise<void>

// Safety Introspection
getSafetyConfig(): Required<AISafetyConfig>
isOperationAllowed(operation: AIOperation): boolean
```

## Testing

```bash
# Run test suite
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Demo
npm run demo
```

## Architecture

### Design Principles

1. **Security First**: Every operation validated against safety rules
2. **AI-Centric**: Optimized for AI agent filesystem access patterns
3. **Zero Dependencies**: No external dependencies, minimal footprint
4. **Adapter Pattern**: Wraps existing filesystems with safety layer
5. **Path Simplification**: HomePath abstraction for easier AI navigation

### Internal Structure

```
AIFileSystem
├── Safety Validation Layer
│   ├── Path validation (homePath, allowlist, blocklist)
│   ├── Operation validation (allowed operations, read-only)
│   └── Depth validation (maxDepth)
├── Path Resolution Layer  
│   ├── HomePath resolution
│   ├── Path normalization
│   └── Traversal protection
└── Base Filesystem Adapter
    └── Delegates to underlying IAsyncFileSystem
```

## Performance

- **Zero Overhead**: Minimal validation logic, no caching or state
- **Path Operations**: O(1) validation for most safety checks
- **Memory Efficient**: Stateless design, no memory accumulation
- **Async Optimized**: Non-blocking operations throughout

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/synthetism/synet
cd synet/packages/fs-ai
npm install
npm run build
npm test
```

## Use any filesystem, following IAsyncFileSystem interface

- **[@synet/fs](https://www.npmjs.com/package/@synet/fs)** - Core filesystem abstraction and Unit Architecture
- **[@synet/fs-memory](https://www.npmjs.com/package/@synet/fs-memory)** - In-memory storage adapter
- **[@synet/fs-azure](https://www.npmjs.com/package/@synet/fs-azure)** - Azure Blob Storage adapter
- **[@synet/fs-gcs](https://www.npmjs.com/package/@synet/fs-gcs)** - Google Cloud Storage adapter
- **[@synet/fs-s3](https://www.npmjs.com/package/@synet/fs-s3)** - AWS S3 storage adapter
- **[@synet/fs-linode](https://www.npmjs.com/package/@synet/fs-linode)** - Linode Object Storage adapter
- **[@synet/fs-r2](https://www.npmjs.com/package/@synet/fs-r2)** - Cloudflare R2 object storage adapter
- **[@synet/fs-github](https://www.npmjs.com/package/@synet/fs-github)** - Github as storage adapter

## License

MIT © [Synthetism](https://synthetism.ai)

---

**Built with ❤️ by the SYNET Team**

