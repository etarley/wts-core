import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BunSQLiteAdapter } from '../../src/adapters/storage/BunSQLiteAdapter';
import { unlink } from 'node:fs/promises';

import { Database } from 'bun:sqlite';

describe('BunSQLiteAdapter', () => {
    const dbName = 'test-bun.db';
    let adapter: BunSQLiteAdapter;

    beforeEach(async () => {
        const db = new Database(dbName);
        adapter = new BunSQLiteAdapter(db);
        await adapter.init();
    });

    afterEach(async () => {
        try {
            await unlink(dbName);
        } catch {
            // Ignore
        }
    });

    it('should save and load a message', async () => {
        const msg = {
            key: { remoteJid: '123@s.whatsapp.net', id: 'ABC', fromMe: true },
            message: { conversation: 'Hello' },
            messageTimestamp: Date.now() / 1000
        };

        await adapter.saveMessages([msg]);
        const loaded = await adapter.loadMessage('123@s.whatsapp.net', 'ABC');
        expect(loaded).toBeDefined();
        expect(loaded?.message?.conversation).toBe('Hello');
    });

    it('should save and load a chat', async () => {
        const chat = {
            id: '123@s.whatsapp.net',
            unreadCount: 5
        };

        await adapter.saveChats([chat]);
        const loaded = await adapter.getChat('123@s.whatsapp.net');
        expect(loaded).toBeDefined();
        expect(loaded?.unreadCount).toBe(5);
    });

    it('should save and load a contact', async () => {
        const contact = {
            id: '123@s.whatsapp.net',
            name: 'Test User'
        };

        await adapter.saveContacts([contact]);
        const loaded = await adapter.getContact('123@s.whatsapp.net');
        expect(loaded).toBeDefined();
        expect(loaded?.name).toBe('Test User');
    });
});
