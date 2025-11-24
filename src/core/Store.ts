import type { BaileysEventEmitter, proto, Chat, Contact } from '@whiskeysockets/baileys';
import type { StorageAdapter } from './storage/types';
import { MemoryAdapter } from './storage/MemoryAdapter';

export interface IStore {
    bind(ev: BaileysEventEmitter): void;
    loadMessage(jid: string, id: string): Promise<proto.IWebMessageInfo | undefined>;
    getContact(jid: string): Promise<Contact | undefined>;
}

export class MemoryStore implements IStore {
    constructor(public readonly adapter: StorageAdapter = new MemoryAdapter()) {
        if (this.adapter.init) {
            this.adapter.init().catch(err => console.error('Failed to init storage adapter:', err));
        }
    }

    // Store.create is removed to avoid dependency on 'fs' for serverless compatibility.
    // Use new Store(new JSONFileAdapter('./store.json')) instead.

    bind(ev: BaileysEventEmitter): void {
        ev.on('messages.upsert', async ({ messages }: { messages: proto.IWebMessageInfo[] }) => {
            await this.adapter.saveMessages(messages);
        });

        ev.on('contacts.upsert', async (update) => {
            await this.adapter.saveContacts(update as Partial<Contact>[]);
        });

        ev.on('chats.upsert', async (update) => {
            await this.adapter.saveChats(update as Partial<Chat>[]);
        });
    }

    async loadMessage(jid: string, id: string): Promise<proto.IWebMessageInfo | undefined> {
        return this.adapter.loadMessage(jid, id);
    }

    async getContact(jid: string): Promise<Contact | undefined> {
        return this.adapter.getContact(jid);
    }
}

export { MemoryStore as Store };
