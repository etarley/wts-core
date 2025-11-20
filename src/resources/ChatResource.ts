import { BaseResource } from './BaseResource';
import { type AnyMessageContent, proto } from '@whiskeysockets/baileys';

export class ChatResource extends BaseResource {
    /**
     * Send a text message
     * @param jid - The generic JID (e.g. 12345@s.whatsapp.net)
     * @param text - The text content
     */
    async send(jid: string, text: string): Promise<proto.IWebMessageInfo | undefined>;
    
    /**
     * Send a complex message (image, video, buttons)
     * @param jid - The generic JID
     * @param content - The Baileys content object
     */
    async send(jid: string, content: AnyMessageContent): Promise<proto.IWebMessageInfo | undefined>;
    
    /**
     * Implementation
     */
    async send(jid: string, content: string | AnyMessageContent) {
        const payload: AnyMessageContent = typeof content === 'string' ? { text: content } : content;
        return this.adapter.sendMessage(jid, payload);
    }

    async toggleEphemeral(jid: string, duration: number): Promise<void> {
        return this.adapter.toggleEphemeral(jid, duration);
    }

    async archive(jid: string): Promise<void> {
        return this.adapter.chatModify(jid, 'archive');
    }

    async unarchive(jid: string): Promise<void> {
        return this.adapter.chatModify(jid, 'unarchive');
    }

    async pin(jid: string): Promise<void> {
        return this.adapter.chatModify(jid, 'pin');
    }

    async unpin(jid: string): Promise<void> {
        return this.adapter.chatModify(jid, 'unpin');
    }

    async mute(jid: string, duration?: number): Promise<void> {
        return this.adapter.chatModify(jid, 'mute', { duration });
    }

    async unmute(jid: string): Promise<void> {
        return this.adapter.chatModify(jid, 'unmute');
    }

    /**
     * React to a message
     * @param jid - The chat JID
     * @param key - The message key (ID) to react to
     * @param emoji - The emoji (e.g. 👍)
     */
    async react(jid: string, key: proto.IMessageKey, emoji: string): Promise<proto.IWebMessageInfo | undefined> {
        return this.adapter.sendMessage(jid, {
            react: { text: emoji, key }
        });
    }

    /**
     * Delete a message for everyone
     * @param jid - The chat JID
     * @param key - The message key (ID) to delete
     */
    async delete(jid: string, key: proto.IMessageKey): Promise<proto.IWebMessageInfo | undefined> {
        return this.adapter.sendMessage(jid, {
            delete: key
        });
    }
}
