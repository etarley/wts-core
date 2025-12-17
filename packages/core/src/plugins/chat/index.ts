import { type AnyMessageContent, proto } from '@whiskeysockets/baileys';
import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';
import { SentMessage } from '../../core/SentMessage';

export interface ChatPluginAPI {
    chat: {
        send(jid: string, content: string | AnyMessageContent): Promise<SentMessage>;
        toggleEphemeral(jid: string, duration: number): Promise<void>;
        archive(jid: string): Promise<void>;
        unarchive(jid: string): Promise<void>;
        pin(jid: string): Promise<void>;
        unpin(jid: string): Promise<void>;
        mute(jid: string, duration?: number): Promise<void>;
        unmute(jid: string): Promise<void>;
        react(jid: string, key: proto.IMessageKey, emoji: string): Promise<SentMessage>;
        delete(jid: string, key: proto.IMessageKey): Promise<SentMessage>;
    };
}

export const chat = (): WtsPlugin<ChatPluginAPI> => {
    return {
        id: "chat",
        api: (client: Client) => {
            return {
                chat: {
                    /**
                     * Send a message
                     * @param jid - The generic JID (e.g. 12345@s.whatsapp.net)
                     * @param content - The text content or Baileys content object
                     */
                    async send(jid: string, content: string | AnyMessageContent) {
                        const payload: AnyMessageContent = typeof content === 'string' ? { text: content } : content;
                        const response = await client.adapter.sendMessage(jid, payload);
                        return new SentMessage(client, jid, response?.key?.id || '');
                    },
                    async toggleEphemeral(jid: string, duration: number) {
                        if (client.adapter.mode === 'baileys') {
                            return client.adapter.toggleEphemeral(jid, duration);
                        }
                        throw new Error('toggleEphemeral not supported on Cloud API');
                    },
                    async archive(jid: string) {
                        return client.adapter.chatModify(jid, 'archive');
                    },
                    async unarchive(jid: string) {
                        return client.adapter.chatModify(jid, 'unarchive');
                    },
                    async pin(jid: string) {
                        return client.adapter.chatModify(jid, 'pin');
                    },
                    async unpin(jid: string) {
                        return client.adapter.chatModify(jid, 'unpin');
                    },
                    async mute(jid: string, duration?: number) {
                        return client.adapter.chatModify(jid, 'mute', { duration });
                    },
                    async unmute(jid: string) {
                        return client.adapter.chatModify(jid, 'unmute');
                    },
                    /**
                     * React to a message
                     * @param jid - The chat JID
                     * @param key - The message key (ID) to react to
                     * @param emoji - The emoji (e.g. 👍)
                     */
                    async react(jid: string, key: proto.IMessageKey, emoji: string) {
                        const response = await client.adapter.sendMessage(jid, {
                            react: { text: emoji, key }
                        });
                        return new SentMessage(client, jid, response?.key?.id || '');
                    },
                    /**
                     * Delete a message for everyone
                     * @param jid - The chat JID
                     * @param key - The message key (ID) to delete
                     */
                    async delete(jid: string, key: proto.IMessageKey) {
                        const response = await client.adapter.sendMessage(jid, {
                            delete: key
                        });
                        return new SentMessage(client, jid, response?.key?.id || '');
                    }
                }
            };
        }
    };
};
