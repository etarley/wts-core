import type { Chat, Contact, proto } from '@whiskeysockets/baileys';

export interface StorageAdapter {
    init?(): Promise<void>;
    saveMessages(messages: proto.IWebMessageInfo[]): Promise<void>;
    loadMessage(jid: string, id: string): Promise<proto.IWebMessageInfo | undefined>;
    saveChats(chats: Partial<Chat>[]): Promise<void>;
    getChat(jid: string): Promise<Chat | undefined>;
    saveContacts(contacts: Partial<Contact>[]): Promise<void>;
    getContact(jid: string): Promise<Contact | undefined>;
}
