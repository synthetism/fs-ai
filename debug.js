import { MemFileSystem } from '@synet/fs-memory/promises';
import { AIFileSystem } from './src/index.js';

const baseFs = new MemFileSystem();

// Test case 1: Simple allowedPaths
console.log('\n=== Test Case 1: Simple allowedPaths ===');
const aiFs1 = new AIFileSystem(baseFs, {
  allowedPaths: ['./workspace/']
});

console.log('Config:', aiFs1.getSafetyConfig());
console.log('isPathAllowed("./workspace/file.txt"):', aiFs1.isPathAllowed('./workspace/file.txt'));
console.log('isPathAllowed("./workspace/../workspace/file.txt"):', aiFs1.isPathAllowed('./workspace/../workspace/file.txt'));

// Test case 2: Depth only
console.log('\n=== Test Case 2: Depth only ===');
const aiFs2 = new AIFileSystem(baseFs, {
  maxDepth: 3,
  allowedPaths: ['./']
});

console.log('Config:', aiFs2.getSafetyConfig());
console.log('isPathAllowed("./a/file.txt"):', aiFs2.isPathAllowed('./a/file.txt'));
console.log('isPathAllowed("./a/b/file.txt"):', aiFs2.isPathAllowed('./a/b/file.txt'));
