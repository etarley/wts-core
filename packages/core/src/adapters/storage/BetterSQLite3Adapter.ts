import type { StorageAdapter } from '../../core/storage/types';
import type { Chat, Contact, proto } from '@whiskeysockets/baileys';
import type Database from 'better-sqlite3';

export class BetterSQLite3Adapter implements StorageAdapter {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    async init(): Promise<void> {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                jid TEXT,
                id TEXT,
                message JSON,
                PRIMARY KEY (jid, id)
            );
            CREATE TABLE IF NOT EXISTS chats (
                jid TEXT PRIMARY KEY,
                data JSON
            );
            CREATE TABLE IF NOT EXISTS contacts (
                jid TEXT PRIMARY KEY,
                data JSON
            );
        `);
    }

    async saveMessages(messages: proto.IWebMessageInfo[]): Promise<void> {
        const insert = this.db.prepare('INSERT OR REPLACE INTO messages (jid, id, message) VALUES (?, ?, ?)');
        const transaction = this.db.transaction((msgs: proto.IWebMessageInfo[]) => {
            for (const msg of msgs) {
                const jid = msg.key?.remoteJid;
                const id = msg.key?.id;
                if (jid && id) {
                    insert.run(jid, id, JSON.stringify(msg));
                }
            }
        });
        transaction(messages);
    }

    async loadMessage(jid: string, id: string): Promise<proto.IWebMessageInfo | undefined> {
        const row = this.db.prepare('SELECT message FROM messages WHERE jid = ? AND id = ?').get(jid, id) as { message: string } | undefined;
        if (row) {
            return JSON.parse(row.message);
        }
        return undefined;
    }

    async saveChats(chats: Partial<Chat>[]): Promise<void> {
        const insert = this.db.prepare('INSERT OR REPLACE INTO chats (jid, data) VALUES (?, ?)');
        const transaction = this.db.transaction((chats: Partial<Chat>[]) => {
            for (const chat of chats) {
                if (chat.id) {
                    const existing = this.db.prepare('SELECT data FROM chats WHERE jid = ?').get(chat.id) as { data: string } | undefined;
                    const data = existing ? { ...JSON.parse(existing.data), ...chat } : chat;
                    
                    insert.run(chat.id, JSON.stringify(data));
                }
            }
        });
        transaction(chats);
    }

    async getChat(jid: string): Promise<Chat | undefined> {
        const row = this.db.prepare('SELECT data FROM chats WHERE jid = ?').get(jid) as { data: string } | undefined;
        if (row) {
            return JSON.parse(row.data);
        }
        return undefined;
    }

    async saveContacts(contacts: Partial<Contact>[]): Promise<void> {
        const insert = this.db.prepare('INSERT OR REPLACE INTO contacts (jid, data) VALUES (?, ?)');
        const transaction = this.db.transaction((contacts: Partial<Contact>[]) => {
            for (const contact of contacts) {
                if (contact.id) {
                    const existing = this.db.prepare('SELECT data FROM contacts WHERE jid = ?').get(contact.id) as { data: string } | undefined;
                    const data = existing ? { ...JSON.parse(existing.data), ...contact } : contact;
                    insert.run(contact.id, JSON.stringify(data));
                }
            }
        });
        transaction(contacts);
    }

    async getContact(jid: string): Promise<Contact | undefined> {
        const row = this.db.prepare('SELECT data FROM contacts WHERE jid = ?').get(jid) as { data: string } | undefined;
        if (row) {
            return JSON.parse(row.data);
        }
        return undefined;
    }
}
