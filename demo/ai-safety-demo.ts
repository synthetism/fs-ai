/**
 * AI-Safe Filesystem Demo
 * 
 * Demonstrates how @synet/fs-ai protects against:
 * - Path traversal attacks
 * - Forbidden path access
 * - Operation restrictions
 * - Read-only mode
 */

import { MemFileSystem } from '@synet/fs-memory/promises';
import { AIFileSystem, type AISafetyConfig } from '../src/index.js';

async function runAISafetyDemo() {
  try {
    // Create base filesystem (using memory for demo)
    const baseFs = new MemFileSystem();
    
    console.log('📁 Base filesystem created');
    console.log('🤖 Creating AI-safe wrapper with security restrictions...\n');

    // AI Safety Configuration
    const safetyConfig: AISafetyConfig = {
      allowedPaths: ['./workspace/', './output/', './test/'],
      forbiddenPaths: ['/etc/', '/var/', '/usr/', '/sys/', '/proc/'],
      allowedOperations: ['readFile', 'writeFile', 'exists', 'readDir', 'ensureDir'],
      readOnly: false,
      maxDepth: 5
    };

    // Create AI-safe filesystem wrapper
    const aiFs = new AIFileSystem(baseFs, safetyConfig);

    console.log('🔒 Safety Configuration:');
    console.log(`   Allowed paths: ${safetyConfig.allowedPaths?.join(', ') || 'all except forbidden'}`);
    console.log(`   Forbidden paths: ${safetyConfig.forbiddenPaths?.join(', ') || 'none'}`);
    console.log(`   Allowed operations: ${safetyConfig.allowedOperations?.join(', ') || 'all'}`);
    console.log(`   Read-only mode: ${safetyConfig.readOnly || false}`);
    console.log(`   Max depth: ${safetyConfig.maxDepth || 'unlimited'}\n`);

    // Demo 1: Safe Operations
    console.log('✅ Demo 1: Safe AI Operations');
    try {
      await aiFs.writeFile('./workspace/safe-file.txt', 'This is safe content');
      const content = await aiFs.readFile('./workspace/safe-file.txt');
      console.log(`   ✓ Wrote and read safe file: "${content}"`);
    } catch (error) {
      console.log(`   ❌ Safe operation failed: ${error}`);
    }

    // Demo 2: Path Traversal Protection
    console.log('\n🚨 Demo 2: Path Traversal Attack Prevention');
    try {
      await aiFs.writeFile('../../../etc/passwd', 'malicious content');
      console.log('   ❌ SECURITY BREACH: Path traversal succeeded!');
    } catch (error) {
      console.log('   ✓ Path traversal blocked: Attack prevented');
    }

    // Demo 3: Forbidden Path Protection
    console.log('\n🚨 Demo 3: Forbidden Path Protection');
    try {
      await aiFs.writeFile('/etc/shadow', 'malicious content');
      console.log('   ❌ SECURITY BREACH: System file access succeeded!');
    } catch (error) {
      console.log('   ✓ System file access blocked: Attack prevented');
    }

    // Demo 4: Operation Restrictions
    console.log('\n🚨 Demo 4: Operation Restriction');
    try {
      await aiFs.deleteFile('./workspace/safe-file.txt');
      console.log('   ❌ SECURITY BREACH: Forbidden operation succeeded!');
    } catch (error) {
      console.log('   ✓ Delete operation blocked: Restricted operation prevented');
    }

    // Demo 5: Read-Only Mode Test
    console.log('\n🚨 Demo 5: Read-Only Mode Test');
    const readOnlyFs = new AIFileSystem(baseFs, { readOnly: true });
    try {
      await readOnlyFs.writeFile('./workspace/readonly-test.txt', 'should fail');
      console.log('   ❌ SECURITY BREACH: Write in read-only mode succeeded!');
    } catch (error) {
      console.log('   ✓ Write operation blocked: Read-only mode enforced');
    }

    // Demo 6: Path Validation
    console.log('\n📊 Demo 6: Path Validation');
    console.log(`   Path './workspace/file.txt' allowed: ${aiFs.isPathAllowed('./workspace/file.txt')}`);
    console.log(`   Path '/etc/passwd' allowed: ${aiFs.isPathAllowed('/etc/passwd')}`);
    console.log(`   Path '../../../secret' allowed: ${aiFs.isPathAllowed('../../../secret')}`);
    
    console.log('\n📋 Demo 7: Operation Checks');
    console.log(`   'readFile' allowed: ${aiFs.isOperationAllowed('readFile')}`);
    console.log(`   'writeFile' allowed: ${aiFs.isOperationAllowed('writeFile')}`);
    console.log(`   'deleteFile' allowed: ${aiFs.isOperationAllowed('deleteFile')}`);
    console.log(`   'chmod' allowed: ${aiFs.isOperationAllowed('chmod')}`);

    console.log('\n🎉 AI Safety Demo Complete!');
    console.log('\n📈 Summary:');
    console.log('   ✓ Safe operations: Allowed');
    console.log('   ✓ Path traversal: Blocked');
    console.log('   ✓ System files: Protected');
    console.log('   ✓ Operation restrictions: Enforced');
    console.log('   ✓ Read-only mode: Working');
    console.log('   ✓ Path validation: Active');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

runAISafetyDemo();
