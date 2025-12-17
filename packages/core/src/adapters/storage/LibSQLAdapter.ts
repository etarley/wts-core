import type { StorageAdapter } from '../../core/storage/types';
import type { Chat, Contact, proto } from '@whiskeysockets/baileys';
import type { Client } from '@libsql/client';

export class LibSQLAdapter implements StorageAdapter {
    private db: Client;

    constructor(client: Client) {
        this.db = client;
    }

    async init(): Promise<void> {
        await this.db.batch([
            `CREATE TABLE IF NOT EXISTS messages (
                jid TEXT,
                id TEXT,
                message JSON,
                PRIMARY KEY (jid, id)
            )`,
            `CREATE TABLE IF NOT EXISTS chats (
                jid TEXT PRIMARY KEY,
                data JSON
            )`,
            `CREATE TABLE IF NOT EXISTS contacts (
                jid TEXT PRIMARY KEY,
                data JSON
            )`
        ], 'write');
    }

    async saveMessages(messages: proto.IWebMessageInfo[]): Promise<void> {
        const stmts = messages.map(msg => {
            const jid = msg.key?.remoteJid;
            const id = msg.key?.id;
            if (jid && id) {
                return {
                    sql: 'INSERT OR REPLACE INTO messages (jid, id, message) VALUES (?, ?, ?)',
                    args: [jid, id, JSON.stringify(msg)]
                };
            }
            return null;
        }).filter(Boolean) as { sql: string; args: Array<string | number | null> }[];

        if (stmts.length > 0) {
            await this.db.batch(stmts, 'write');
        }
    }

    async loadMessage(jid: string, id: string): Promise<proto.IWebMessageInfo | undefined> {
        const result = await this.db.execute({
            sql: 'SELECT message FROM messages WHERE jid = ? AND id = ?',
            args: [jid, id]
        });

        const row = result.rows[0];
        if (row) {
            return JSON.parse(row.message as string);
        }
        return undefined;
    }

    async saveChats(chats: Partial<Chat>[]): Promise<void> {
        const validChats = chats.filter(c => c.id);
        if (validChats.length === 0) return;

        // batch read existing chats
        const readStmts = validChats.map(chat => ({
            sql: 'SELECT data FROM chats WHERE jid = ?',
            args: [chat.id!]
        }));

        const readResults = await this.db.batch(readStmts, 'read');

        const writeStmts = validChats.map((chat, index) => {
            const result = readResults[index];
            const row = result?.rows?.[0] as unknown as { data: string } | undefined;
            const existingData = row ? JSON.parse(row.data) : {};
            const mergedData = { ...existingData, ...chat };

            return {
                sql: 'INSERT OR REPLACE INTO chats (jid, data) VALUES (?, ?)',
                args: [chat.id!, JSON.stringify(mergedData)]
            };
        });

        if (writeStmts.length > 0) {
            await this.db.batch(writeStmts, 'write');
        }
    }

    async getChat(jid: string): Promise<Chat | undefined> {
        const result = await this.db.execute({
            sql: 'SELECT data FROM chats WHERE jid = ?',
            args: [jid]
        });

        const row = result.rows[0];
        if (row && typeof row.data === 'string') {
            return JSON.parse(row.data);
        }
        return undefined;
    }

    async saveContacts(contacts: Partial<Contact>[]): Promise<void> {
        const validContacts = contacts.filter(c => c.id);
        if (validContacts.length === 0) return;

        // batch read existing contacts
        const readStmts = validContacts.map(contact => ({
            sql: 'SELECT data FROM contacts WHERE jid = ?',
            args: [contact.id!]
        }));

        const readResults = await this.db.batch(readStmts, 'read');

        const writeStmts = validContacts.map((contact, index) => {
            const result = readResults[index];
            const row = result?.rows?.[0] as unknown as { data: string } | undefined;
            const existingData = row ? JSON.parse(row.data) : {};
            const mergedData = { ...existingData, ...contact };

            return {
                sql: 'INSERT OR REPLACE INTO contacts (jid, data) VALUES (?, ?)',
                args: [contact.id!, JSON.stringify(mergedData)]
            };
        });

        if (writeStmts.length > 0) {
            await this.db.batch(writeStmts, 'write');
        }
    }

    async getContact(jid: string): Promise<Contact | undefined> {
        const result = await this.db.execute({
            sql: 'SELECT data FROM contacts WHERE jid = ?',
            args: [jid]
        });

        const row = result.rows[0];
        if (row && typeof row.data === 'string') {
            return JSON.parse(row.data);
        }
        return undefined;
    }
}
