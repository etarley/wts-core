import type { StorageAdapter } from './types';
import type { Chat, Contact, proto } from '@whiskeysockets/baileys';

export class MemoryAdapter implements StorageAdapter {
    private chats: Record<string, Chat> = {};
    private messages: Record<string, proto.IWebMessageInfo[]> = {};
    private contacts: Record<string, Contact> = {};

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
