import { proto, type AnyMessageContent } from '@whiskeysockets/baileys';
import type { IAdapter } from './interfaces';

interface ExtendedWebMessageInfo extends proto.IWebMessageInfo {
    participant?: string | null;
}

export class Context {
    constructor(
        public readonly raw: proto.IWebMessageInfo,
        private readonly adapter: IAdapter
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
     * Reply to this message.
     * 
     * @example
     * // Simple text
     * ctx.reply("Hello!");
     * 
     * @example
     * // Full Baileys power (Images, etc.)
     * ctx.reply({ image: { url: '...' }, caption: 'Look!' });
     */
    async reply(content: string | AnyMessageContent) {
        const payload = typeof content === 'string' ? { text: content } : content;
        
        // We pass the 3rd argument 'options' which IAdapter now expects
        return this.adapter.sendMessage(
            this.from, 
            payload, 
            { quoted: this.raw }
        );
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
}
