import { readFile, writeFile, rename } from 'fs/promises';
import type { StorageAdapter } from './types';
import type { Chat, Contact, proto } from '@whiskeysockets/baileys';

export class JSONFileAdapter implements StorageAdapter {
    private chats: Record<string, Chat> = {};
    private messages: Record<string, proto.IWebMessageInfo[]> = {};
    private contacts: Record<string, Contact> = {};
    private initialized = false;

    constructor(private path: string = './store.json') {
        // We don't await init here to keep constructor sync,
        // but in a real app you might want to await specific init method
        this.init().catch(err => console.error('Failed to initialize JSON store:', err));
    }

    async init() {
        if (this.initialized) return;
        try {
            const data = JSON.parse(await readFile(this.path, 'utf-8'));
            this.chats = data.chats || {};
            this.messages = data.messages || {};
            this.contacts = data.contacts || {};
        } catch {
            // Ignore if file doesn't exist or invalid
        }

        // Auto-save every 10s
        setInterval(() => this.save(), 10_000);
        this.initialized = true;
    }

    private async save() {
        const data = {
            chats: this.chats,
            messages: this.messages,
            contacts: this.contacts
        };
        try {
            const tempPath = `${this.path}.tmp`;
            await writeFile(tempPath, JSON.stringify(data, null, 2));
            await rename(tempPath, this.path);
        } catch (error) {
            console.error('Failed to save store:', error);
        }
    }

    async saveMessages(messages: proto.IWebMessageInfo[]) {
        for (const msg of messages) {
            const jid = msg.key?.remoteJid;
            if (!jid) continue;

            if (!this.messages[jid]) {
                this.messages[jid] = [];
            }

            const currentMessages = this.messages[jid];
            if (currentMessages) {
                // Simple de-duplication check
                const exists = currentMessages.some(m => m.key?.id === msg.key?.id);
                if (!exists) {
                    currentMessages.push(msg);
                }
            }
        }
    }

    async loadMessage(jid: string, id: string) {
        return this.messages[jid]?.find(m => m.key?.id === id);
    }

    async saveChats(chats: Partial<Chat>[]) {
        for (const chat of chats) {
            if (chat.id) {
                this.chats[chat.id] = Object.assign(this.chats[chat.id] || {}, chat) as Chat;
            }
        }
    }

    async getChat(jid: string) {
        return this.chats[jid];
    }

    async saveContacts(contacts: Partial<Contact>[]) {
        for (const contact of contacts) {
            if (contact.id) {
                this.contacts[contact.id] = Object.assign(this.contacts[contact.id] || {}, contact) as Contact;
            }
        }
    }

    async getContact(jid: string) {
        return this.contacts[jid];
    }
}
