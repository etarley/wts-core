import { KVStorageAdapter } from '../src/core/storage/kv-storage-adapter';
import { existsSync, rmSync } from 'fs';
import { Database } from 'bun:sqlite';

/**
 * Test script for KVStorageAdapter
 * 
 * This script validates the CRUD operations of the SQLite storage adapter.
 * 
 * Usage: bun test-sql-storage.ts
 */

async function testSQLStorage(): Promise<void> {
    console.log('💾 Testing KVStorageAdapter\n');
    
    const dbPath = './test-storage.db';
    
    // Clean up any existing test database
    if (existsSync(dbPath)) {
        rmSync(dbPath);
        console.log('🗑️  Cleaned up existing test database');
    }
    
    // Create a new storage adapter
    const db = new Database(dbPath);
    const storage = new KVStorageAdapter({ driver: db });
    console.log('✅ Created KVStorageAdapter\n');
    
    try {
        // Test 1: Set and Get
        console.log('Test 1: Set and Get');
        await storage.set('user:123', JSON.stringify({ name: 'John', age: 30 }));
        const value = await storage.get('user:123');
        const parsed = value ? JSON.parse(value) : null;
        console.log('  ✓ Stored:', parsed);
        console.assert(parsed?.name === 'John', 'Name should be John');
        console.assert(parsed?.age === 30, 'Age should be 30');
        
        // Test 2: Update
        console.log('\nTest 2: Update existing key');
        await storage.set('user:123', JSON.stringify({ name: 'Jane', age: 25 }));
        const updated = await storage.get('user:123');
        const parsedUpdated = updated ? JSON.parse(updated) : null;
        console.log('  ✓ Updated:', parsedUpdated);
        console.assert(parsedUpdated?.name === 'Jane', 'Name should be Jane');
        
        // Test 3: Exists
        console.log('\nTest 3: Check existence');
        const exists = await storage.exists('user:123');
        const notExists = await storage.exists('user:999');
        console.log('  ✓ user:123 exists:', exists);
        console.log('  ✓ user:999 exists:', notExists);
        console.assert(exists === true, 'user:123 should exist');
        console.assert(notExists === false, 'user:999 should not exist');
        
        // Test 4: Multiple keys
        console.log('\nTest 4: Multiple keys');
        await storage.set('session:abc', 'session-data-1');
        await storage.set('session:def', 'session-data-2');
        const session1 = await storage.get('session:abc');
        const session2 = await storage.get('session:def');
        console.log('  ✓ session:abc:', session1);
        console.log('  ✓ session:def:', session2);
        console.assert(session1 === 'session-data-1', 'Session 1 should match');
        console.assert(session2 === 'session-data-2', 'Session 2 should match');
        
        // Test 5: Delete
        console.log('\nTest 5: Delete key');
        await storage.delete('session:abc');
        const deleted = await storage.get('session:abc');
        const stillExists = await storage.exists('session:abc');
        console.log('  ✓ session:abc after delete:', deleted);
        console.log('  ✓ session:abc exists:', stillExists);
        console.assert(deleted === null, 'Deleted key should return null');
        console.assert(stillExists === false, 'Deleted key should not exist');
        
        // Test 6: Get non-existent key
        console.log('\nTest 6: Get non-existent key');
        const nonExistent = await storage.get('does-not-exist');
        console.log('  ✓ Non-existent key returns:', nonExistent);
        console.assert(nonExistent === null, 'Non-existent key should return null');
        
        // Test 7: Clear all
        console.log('\nTest 7: Clear all data');
        await storage.clear();
        const afterClear1 = await storage.get('user:123');
        const afterClear2 = await storage.get('session:def');
        console.log('  ✓ user:123 after clear:', afterClear1);
        console.log('  ✓ session:def after clear:', afterClear2);
        console.assert(afterClear1 === null, 'All keys should be cleared');
        console.assert(afterClear2 === null, 'All keys should be cleared');
        
        console.log('\n✅ All tests passed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        throw error;
    } finally {
        // Clean up
        storage.close();
        console.log('\n🔒 Database connection closed');
        
        // Remove test database
        if (existsSync(dbPath)) {
            rmSync(dbPath);
            console.log('🗑️  Cleaned up test database');
        }
    }
}

// Run the test if this file is executed directly
if (import.meta.main) {
    testSQLStorage().catch(console.error);
}
