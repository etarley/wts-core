import { proto, type Chat, type Contact, type BaileysEventEmitter } from '@whiskeysockets/baileys';
import { readFile, writeFile } from 'fs/promises';

export interface IStore {
    bind(ev: BaileysEventEmitter): void;
    readFromFile(path: string): Promise<void>;
    writeToFile(path: string): Promise<void>;
    loadMessage(jid: string, id: string): Promise<proto.IWebMessageInfo | undefined>;
}

export class Store implements IStore {
    private chats: Record<string, Chat> = {};
    private messages: Record<string, proto.IWebMessageInfo[]> = {};
    private contacts: Record<string, Contact> = {};

    static create(path: string = './store.json'): Store {
        const store = new Store();
        store.readFromFile(path).catch(() => {});
        
        // Save every 10s
        setInterval(() => {
            store.writeToFile(path);
        }, 10_000);

        return store;
    }

    bind(ev: BaileysEventEmitter): void {
        ev.on('messages.upsert', (update: { messages: proto.IWebMessageInfo[], type: string }) => {
            for (const msg of update.messages) {
                const jid = msg.key?.remoteJid;
                if (!jid) continue;
                const messages = this.messages[jid];
                if (messages) {
                    messages.push(msg);
                } else {
                    this.messages[jid] = [msg];
                }
            }
        });

        ev.on('contacts.upsert', (update: Contact[]) => {
            for (const contact of update) {
                if (contact.id) {
                    this.contacts[contact.id] = Object.assign(this.contacts[contact.id] || {}, contact);
                }
            }
        });

        ev.on('chats.upsert', (update: Chat[]) => {
            for (const chat of update) {
                if (chat.id) {
                    this.chats[chat.id] = Object.assign(this.chats[chat.id] || {}, chat);
                }
            }
        });
    }

    async readFromFile(path: string): Promise<void> {
        try {
            const data = JSON.parse(await readFile(path, 'utf-8'));
            this.chats = data.chats || {};
            this.messages = data.messages || {};
            this.contacts = data.contacts || {};
        } catch {
            // Ignore if file doesn't exist
        }
    }

    async writeToFile(path: string): Promise<void> {
        const data = {
            chats: this.chats,
            messages: this.messages,
            contacts: this.contacts
        };
        await writeFile(path, JSON.stringify(data, null, 2));
    }

    async loadMessage(jid: string, id: string): Promise<proto.IWebMessageInfo | undefined> {
        const messages = this.messages[jid];
        if (!messages) return undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return messages.find((m: any) => m.key.id === id);
    }
}
