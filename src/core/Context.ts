import { proto, type AnyMessageContent, downloadMediaMessage, type WAMessage } from '@whiskeysockets/baileys';
import type { IAdapter } from './interfaces';
import type { Client } from './Client';

interface ExtendedWebMessageInfo extends proto.IWebMessageInfo {
    participant?: string | null;
}

export class Context {
    constructor(
        public readonly raw: proto.IWebMessageInfo,
        private readonly adapter: IAdapter,
        public readonly client: Client
    ) {}

    /** 
     * The JID of the "Room" (User or Group) where the message was sent.
     */
    get from(): string {
        return this.raw.key?.remoteJid ?? '';
    }

    /**
     * The JID of the specific user who sent the message.
     */
    get sender(): string {
        return (
            this.raw.key?.participant || 
            (this.raw as ExtendedWebMessageInfo).participant || 
            this.from
        );
    }

    /**
     * The display name of the sender (if available)
     */
    get pushName(): string | undefined {
        return this.raw.pushName ?? undefined;
    }

    /**
     * Is this a group message?
     */
    get isGroup(): boolean {
        return this.from.endsWith('@g.us');
    }

    /**
     * Is this message sent by the bot (outgoing) or received from someone else (incoming)?
     * true = outgoing (from me), false = incoming (to me)
     */
    get fromMe(): boolean {
        return this.raw.key?.fromMe ?? false;
    }

    /**
     * The actual text content (flattened)
     */
    get body(): string {
        const msg = this.raw.message;
        return (
            msg?.conversation ??
            msg?.extendedTextMessage?.text ??
            msg?.imageMessage?.caption ??
            msg?.videoMessage?.caption ??
            ''
        );
    }

    /**
     * Checks if the message mentions the bot
     */
    get mentionsMe(): boolean {
        const myJid = this.client.user.id;
        // TODO: Normalize JID comparison (remove @s.whatsapp.net suffix for comparison if needed)
        return this.raw.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(myJid) 
          || false;
    }

    /**
     * Easy access to quoted message context
     */
    get quoted(): Context | null {
        const msg = this.raw.message;
        // Find contextInfo in common message types
        const content = msg?.extendedTextMessage || 
                        msg?.imageMessage || 
                        msg?.videoMessage || 
                        msg?.stickerMessage ||
                        msg?.audioMessage ||
                        msg?.documentMessage;
                        
        const ctxInfo = content?.contextInfo;

        if (!ctxInfo?.quotedMessage) return null;

        const quotedMsg: proto.IWebMessageInfo = {
            key: {
                remoteJid: this.from,
                fromMe: ctxInfo.participant === this.client.user.id,
                id: ctxInfo.stanzaId,
                participant: ctxInfo.participant
            },
            message: ctxInfo.quotedMessage,
            pushName: undefined
        };

        return new Context(quotedMsg, this.adapter, this.client);
    }

    /**
     * Download media from the message if it exists.
     * Returns Buffer or null if no media.
     */
    async download(): Promise<Buffer | null> {
        try {
            // We need to pass a logger to downloadMediaMessage, but we can use a dummy one or console
            // The type definition might require a specific logger interface
            const buffer = await downloadMediaMessage(
                this.raw as WAMessage,
                'buffer',
                { }
            );
            return buffer;
        } catch (err) {
            console.error('Failed to download media:', err);
            return null;
        }
    }

    /**
     * Reply to this message.
     */
    async reply(content: string | AnyMessageContent) {
        const payload = typeof content === 'string' ? { text: content } : content;
        
        return this.adapter.sendMessage(
            this.from, 
            payload, 
            { quoted: this.raw }
        );
    }

    /**
     * Send a poll
     */
    async sendPoll(name: string, values: string[]) {
        return this.adapter.sendMessage(this.from, {
            poll: {
                name,
                values,
                selectableCount: 1
            }
        });
    }

    /**
     * React to this message
     */
    async react(emoji: string) {
        const key = this.raw.key;
        if (!key) return;
        
        return this.adapter.sendMessage(this.from, {
            react: { text: emoji, key }
        });
    }

    /**
     * Mark this message as read
     */
    async read() {
        const key = this.raw.key;
        if (!key) return;
        return this.adapter.readMessage([key]);
    }

    // --- Presence Helpers ---

    /**
     * Simulate typing (composing) state.
     */
    async typing() {
        return this.adapter.sendPresenceUpdate(this.from, 'composing');
    }

    /**
     * Simulate recording audio state.
     */
    async recording() {
        return this.adapter.sendPresenceUpdate(this.from, 'recording');
    }

    // --- Messaging Helpers ---

    async forward(jid: string) {
        return this.adapter.sendMessage(jid, { forward: this.raw as WAMessage });
    }

    async sendLocation(lat: number, long: number) {
        return this.adapter.sendMessage(this.from, {
            location: { degreesLatitude: lat, degreesLongitude: long }
        });
    }

    async replyWithMentions(text: string, mentions: string[]) {
        return this.adapter.sendMessage(this.from, {
            text: text,
            mentions: mentions
        }, { quoted: this.raw });
    }
}
