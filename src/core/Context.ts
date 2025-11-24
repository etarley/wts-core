import { readFile } from 'node:fs/promises';
import { proto, type AnyMessageContent, type WAMessage } from '@whiskeysockets/baileys';
import type { IAdapter } from './interfaces';
import type { Client } from './Client';
import type { Env, ExecutionContext } from '../types';
import { render } from '../jsx/render';
import type { VNode } from '../jsx/runtime';
import { StickerFormatter, type StickerMetadata } from '../utils/StickerFormatter';
import { type IStorageStrategy, LocalFileStorage } from './storage/StorageStrategy';
import { getMessageType, type MessageType } from '../utils/MessageMatcher';

const MIMETYPE_MAP: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'application/pdf': 'pdf',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt'
};

interface ExtendedWebMessageInfo extends proto.IWebMessageInfo {
    participant?: string | null;
}

export class Context<E extends Env = Env> {
    private _variables: Map<string, unknown> = new Map();
    private _executionCtx?: ExecutionContext;
    public env: E['Bindings'] = {} as unknown as E['Bindings'];
    public session: Record<string, unknown> = {};

    constructor(
        public readonly raw: proto.IWebMessageInfo,
        private readonly adapter: IAdapter,
        public readonly client: Client<E>,
        executionCtx?: ExecutionContext,
        env?: E['Bindings']
    ) {
        if (executionCtx) this._executionCtx = executionCtx;
        if (env) this.env = env;
    }

    /**
     * Wait until the promise is resolved.
     * This is useful for serverless environments like Cloudflare Workers.
     */
    waitUntil(promise: Promise<unknown>) {
        if (this._executionCtx && typeof this._executionCtx.waitUntil === 'function') {
            this._executionCtx.waitUntil(promise);
        } else {
            void promise;
        }
    }

    /**
     * Set a value in the context state.
     */
    set<K extends keyof E['Variables']>(key: K, value: E['Variables'][K]) {
        this._variables.set(key as string, value);
    }

    /**
     * Get a value from the context state.
     */
    get<K extends keyof E['Variables']>(key: K): E['Variables'][K] | undefined {
        return this._variables.get(key as string) as E['Variables'][K] | undefined;
    }

    /**
     * Magic Proxy for Variables
     */
    public get var(): E['Variables'] {
        return new Proxy(this._variables, {
            get: (target, prop) => target.get(prop as string)
        }) as unknown as E['Variables'];
    }

    /**
     * Request helper to match Hono's API surface
     */
    public req = {
        valid: <K extends keyof E['Variables']>(key: K): E['Variables'][K] => {
            return this.get(key) as E['Variables'][K];
        }
    };

    /** 
     * The JID of the "Room" (User or Group) where the message was sent.
     */
    get from(): string {
        return this.raw.key?.remoteJid ?? '';
    }

    /**
     * The ID of the message.
     */
    get id(): string {
        return this.raw.key?.id ?? '';
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
    public isGroup(): this is Context<E> & { raw: { key: { remoteJid: `${string}@g.us` } } } {
        return this.from.endsWith('@g.us');
    }

    // Type Guards

    public isImage(): this is Context<E> & { content: { imageMessage: NonNullable<proto.IMessage['imageMessage']> } } {
        return this.type === 'image' && !!this.raw.message?.imageMessage;
    }

    public isVideo(): this is Context<E> & { content: { videoMessage: NonNullable<proto.IMessage['videoMessage']> } } {
        return this.type === 'video' && !!this.raw.message?.videoMessage;
    }

    public isAudio(): this is Context<E> & { content: { audioMessage: NonNullable<proto.IMessage['audioMessage']> } } {
        return this.type === 'audio' && !!this.raw.message?.audioMessage;
    }

    public isText(): this is Context<E> & { body: string } {
        return this.type === 'text';
    }

    /**
     * Is this message sent by the bot (outgoing) or received from someone else (incoming)?
     * true = outgoing (from me), false = incoming (to me)
     */
    get fromMe(): boolean {
        return this.raw.key?.fromMe ?? false;
    }

    /**
     * Is this message a forwarded message?
     */
    get isForwarded(): boolean {
        const msg = this.raw.message;
        const content = msg?.extendedTextMessage || 
                        msg?.imageMessage || 
                        msg?.videoMessage || 
                        msg?.stickerMessage ||
                        msg?.audioMessage ||
                        msg?.documentMessage;
        
        return content?.contextInfo?.isForwarded || false;
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
     * Get the normalized message content, unwrapping ephemeral/viewOnce wrappers.
     */
    get content(): proto.IMessage | null | undefined {
        return this._unwrap(this.raw.message);
    }

    private _unwrap(msg: proto.IMessage | null | undefined): proto.IMessage | undefined {
        if (!msg) return undefined;
        
        // Priority Unwrapping List
        if (msg.ephemeralMessage?.message) return this._unwrap(msg.ephemeralMessage.message);
        if (msg.viewOnceMessage?.message) return this._unwrap(msg.viewOnceMessage.message);
        if (msg.viewOnceMessageV2?.message) return this._unwrap(msg.viewOnceMessageV2.message);
        if (msg.viewOnceMessageV2Extension?.message) return this._unwrap(msg.viewOnceMessageV2Extension.message);
        if (msg.documentWithCaptionMessage?.message) return this._unwrap(msg.documentWithCaptionMessage.message);
        if (msg.editedMessage?.message) return this._unwrap(msg.editedMessage.message);
        if (msg.botInvokeMessage?.message) return this._unwrap(msg.botInvokeMessage.message);
        if (msg.groupMentionedMessage?.message) return this._unwrap(msg.groupMentionedMessage.message);
        
        return msg;
    }

    /**
     * Get the type of the message.
     */
    get type(): MessageType {
        return getMessageType(this.content);
    }

    // --- Flags ---

    get isViewOnce(): boolean {
        const raw = this.raw.message;
        return !!(raw?.viewOnceMessage || raw?.viewOnceMessageV2 || raw?.viewOnceMessageV2Extension);
    }

    get isEphemeral(): boolean {
        return !!this.raw.message?.ephemeralMessage;
    }

    get isEdit(): boolean {
        return !!this.raw.message?.editedMessage;
    }

    // --- Helpers for Interactive Responses ---

    /**
     * Get ID of selected button/list row
     */
    get selectedId(): string | undefined {
        const msg = this.content;
        if (!msg) return undefined;
        
        // Handle Native Flow (JSON)
        if (msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const params = JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                return params.id;
            } catch {
                // ignore error
            }
        }

        return (
            msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.buttonsResponseMessage?.selectedButtonId ||
            msg.templateButtonReplyMessage?.selectedId
        ) ?? undefined;
    }

    /**
     * Get text of selected button/list row
     */
    get selectedText(): string | undefined {
        const msg = this.content;
        if (!msg) return undefined;
        return (
            msg.listResponseMessage?.title ||
            msg.buttonsResponseMessage?.selectedDisplayText ||
            msg.templateButtonReplyMessage?.selectedDisplayText
        ) ?? undefined;
    }

    /**
     * Get Poll updates/votes
     */
    get pollUpdates() {
        const msg = this.content;
        if (msg?.pollUpdateMessage) {
            return {
                pollKey: msg.pollUpdateMessage.pollCreationMessageKey,
                vote: msg.pollUpdateMessage.vote
            };
        }
        return null;
    }

    /**
     * Get Event details
     */
    get event(): { isCanceled?: boolean; name?: string; description?: string; startTime?: number | Long; endTime?: number | Long; location?: NonNullable<proto.IMessage['eventMessage']>['location']; joinLink?: string } | null {
        const msg = this.content?.eventMessage;
        if (!msg) return null;
        return {
            isCanceled: msg.isCanceled || false,
            name: msg.name || undefined,
            description: msg.description || undefined,
            startTime: msg.startTime || undefined,
            endTime: msg.endTime || undefined,
            location: msg.location || undefined,
            joinLink: msg.joinLink || undefined
        };
    }

    /**
     * Get the key of the deleted message (if this is a revoke message)
     */
    get deletedMessageKey(): proto.IMessageKey | undefined {
        if (this.type === 'revoke') {
            return this.content?.protocolMessage?.key || undefined;
        }
        return undefined;
    }

    /**
     * Checks if the message mentions the bot
     */
    get mentionsMe(): boolean {
        const myJid = this.adapter.getMe()?.id;
        if (!myJid) return false;
        
        // TODO: Normalize JID comparison (remove @s.whatsapp.net suffix for comparison if needed)
        return this.raw.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(myJid) 
          || false;
    }

    /**
     * Easy access to quoted message context
     */
    get quoted(): QuotedContext<E> | null {
        const msg = this.raw.message;
        // Find contextInfo in common message types
        const content = msg?.extendedTextMessage || 
                        msg?.imageMessage || 
                        msg?.videoMessage || 
                        msg?.stickerMessage ||
                        msg?.audioMessage ||
                        msg?.documentMessage ||
                        msg?.buttonsResponseMessage ||
                        msg?.listResponseMessage;
                        
        const ctxInfo = content?.contextInfo;

        if (!ctxInfo?.quotedMessage) return null;

        const myJid = this.adapter.getMe()?.id;

        const quotedMsg: proto.IWebMessageInfo = {
            key: {
                remoteJid: this.from,
                fromMe: myJid ? ctxInfo.participant === myJid : false,
                id: ctxInfo.stanzaId,
                participant: ctxInfo.participant
            },
            message: ctxInfo.quotedMessage,
            pushName: undefined
        };

        return new QuotedContext<E>(quotedMsg, this.adapter, this.client, this._executionCtx, this.env);
    }

    /**
     * Fetch the full quoted message from the store.
     * Useful when the quoted message content is not available in the current message (e.g. Cloud API).
     */
    async fetchQuoted(): Promise<Context<E> | null> {
        const quoted = this.quoted;
        if (!quoted) return null;

        // If we already have the body, return it
        if (quoted.body) return quoted;

        // Try to load from store
        if (this.client.store) {
            const storedMsg = await this.client.store.loadMessage(quoted.from, quoted.id);
            if (storedMsg) {
                return new Context<E>(storedMsg, this.adapter, this.client, this._executionCtx, this.env);
            }
        }

        return quoted;
    }

    /**
     * Render a JSX Element to the chat.
     * @example
     * await ctx.render(<text body="Hello World" />);
     */
    async render(element: VNode) {
        const payload = await render(element);
        return this.reply(payload);
    }

    /**
     * Download media from the message if it exists.
     * Returns Buffer. Throws error if no media or download fails.
     */
    async download(): Promise<Buffer> {
        return this.adapter.downloadMedia(this.raw);
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

    /**
     * Wait for the next message from the same user in this chat.
     */
    async waitForReply(timeoutMs = 60000): Promise<Context<E>> {
        return this.client.waitFor<Context<E>>(
            'message',
            (ctx) => ctx.from === this.from && !ctx.fromMe,
            timeoutMs
        );
    }

    /**
     * Wait for a button click (Quick Reply or Native Flow Button)
     * @param buttonId Optional button ID to wait for. If not provided, waits for any button click.
     */
    async waitForClick(buttonId?: string | string[], timeoutMs = 60000): Promise<Context<E>> {
        return this.client.waitFor<Context<E>>(
            'message',
            (ctx) => {
                if (ctx.from !== this.from || ctx.fromMe) return false;
                
                const selectedId = ctx.selectedId;
                if (!selectedId) return false;

                if (buttonId) {
                    const ids = Array.isArray(buttonId) ? buttonId : [buttonId];
                    return ids.includes(selectedId);
                }
                return true;
            },
            timeoutMs
        );
    }

    /**
     * Wait for a list selection
     * @param rowId Optional row ID to wait for. If not provided, waits for any list selection.
     */
    async waitForSelection(rowId?: string | string[], timeoutMs = 60000): Promise<Context<E>> {
        return this.client.waitFor<Context<E>>(
            'message',
            (ctx) => {
                if (ctx.from !== this.from || ctx.fromMe) return false;
                
                // Ensure it is a list response
                if (ctx.type !== 'list_response') return false;

                const selectedId = ctx.selectedId;
                if (!selectedId) return false;

                if (rowId) {
                    const ids = Array.isArray(rowId) ? rowId : [rowId];
                    return ids.includes(selectedId);
                }
                return true;
            },
            timeoutMs
        );
    }

    // --- Presence Helpers ---

    /**
     * Simulate typing (composing) state.
     */
    async typing() {
        return this.adapter.sendPresenceUpdate(this.from, 'composing', this.id);
    }

    /**
     * Simulate recording audio state.
     */
    async recording() {
        return this.adapter.sendPresenceUpdate(this.from, 'recording', this.id);
    }

    // --- Messaging Helpers ---

    async forward(jid: string, score: number = 999) {
        // To show the "Forwarded" label, we need to set contextInfo
        const message = this.raw.message;
        if (!message) return;

        return this.adapter.sendMessage(jid, {
            forward: this.raw as WAMessage,
            contextInfo: {
                isForwarded: true,
                forwardingScore: score, // High score to ensure it shows as forwarded
                stanzaId: this.raw.key?.id,
                participant: this.raw.key?.participant,
                quotedMessage: message
            }
        });
    }

    /**
     * Reply with a sticker.
     * Automatically converts images to WebP 512x512 using sharp.
     */
    async replySticker(input: Buffer | string, metadata?: StickerMetadata) {
        const buffer = await StickerFormatter.generate(input, metadata);
        return this.adapter.sendMessage(this.from, { sticker: buffer }, { quoted: this.raw });
    }

    /**
     * Resolve media input to Buffer (local file) or URL object (remote file).
     */
    private async _resolveMedia(input: Buffer | string): Promise<Buffer | { url: string }> {
        if (typeof input === 'string') {
            if (input.startsWith('http://') || input.startsWith('https://')) {
                return { url: input };
            }
            try {
                return await readFile(input);
            } catch (error) {
                throw new Error(`Failed to read file from path '${input}': ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return input;
    }

    async sendImage(image: Buffer | string, caption?: string) {
        const content = await this._resolveMedia(image);
        return this.adapter.sendMessage(this.from, {
            image: content,
            caption: caption
        });
    }

    async sendDocument(document: Buffer | string, fileName?: string, caption?: string, mimetype?: string) {
        const content = await this._resolveMedia(document);
        return this.adapter.sendMessage(this.from, {
            document: content,
            fileName: fileName,
            caption: caption,
            mimetype: mimetype ?? 'application/octet-stream'
        });
    }

    /**
     * Reply with a video sticker.
     * Converts video buffer to animated WebP using ffmpeg.
     */
    async replyVideoSticker(input: Buffer | string) {
        let buffer: Buffer;
        
        if (typeof input === 'string') {
            // If URL, fetch it
            if (input.startsWith('http://') || input.startsWith('https://')) {
                const res = await fetch(input);
                if (!res.ok) throw new Error(`Failed to fetch video sticker from URL: ${res.statusText}`);
                buffer = Buffer.from(await res.arrayBuffer());
            } else {
                // Local file
                buffer = await readFile(input);
            }
        } else {
            buffer = input;
        }

        const sticker = await StickerFormatter.videoToSticker(buffer);
        return this.adapter.sendMessage(this.from, { sticker }, { quoted: this.raw });
    }

    async sendLocation(lat: number, long: number) {
        return this.adapter.sendMessage(this.from, {
            location: { degreesLatitude: lat, degreesLongitude: long }
        });
    }

    async sendContact(name: string, phoneNumber: string) {
        const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
            + 'VERSION:3.0\n' 
            + `FN:${name}\n` // full name
            + `TEL;type=CELL;type=VOICE;waid=${phoneNumber}:${phoneNumber}\n` // WhatsApp ID + phone number
            + 'END:VCARD';
        
        return this.adapter.sendMessage(this.from, {
            contacts: {
                displayName: name,
                contacts: [{ vcard }]
            }
        });
    }

    async sendVideo(video: Buffer | string, caption?: string, isGif: boolean = false, isPtv: boolean = false) {
        const content = await this._resolveMedia(video);
        return this.adapter.sendMessage(this.from, {
            video: content,
            caption: caption,
            gifPlayback: isGif,
            ptv: isPtv
        });
    }

    async sendVideoNote(video: Buffer | string) {
        return this.sendVideo(video, undefined, false, true);
    }

    async sendAudio(audio: Buffer | string, ptt: boolean = false) {
        const content = await this._resolveMedia(audio);
        
        // Ensure ptt is inside the audio object for adapters that look for it there
        const audioContent = typeof content === 'object' && !Buffer.isBuffer(content) 
            ? { ...content, ptt } 
            : content;

        return this.adapter.sendMessage(this.from, {
            audio: audioContent,
            ptt: ptt,
            mimetype: ptt ? 'audio/ogg; codecs=opus' : 'audio/mp4' 
        });
    }

    /**
     * Reply with an audio message.
     */
    async replyAudio(audio: Buffer | string, ptt: boolean = false) {
        const content = await this._resolveMedia(audio);
        
        // Ensure ptt is inside the audio object for adapters that look for it there
        const audioContent = typeof content === 'object' && !Buffer.isBuffer(content) 
            ? { ...content, ptt } 
            : content;

        return this.adapter.sendMessage(this.from, {
            audio: audioContent,
            ptt: ptt,
            mimetype: ptt ? 'audio/ogg; codecs=opus' : 'audio/mp4' 
        }, { quoted: this.raw });
    }

    /**
     * Reply with an image.
     */
    async replyImage(image: Buffer | string, caption?: string) {
        const content = await this._resolveMedia(image);
        return this.adapter.sendMessage(this.from, {
            image: content,
            caption: caption
        }, { quoted: this.raw });
    }

    /**
     * Reply with a video.
     */
    async replyVideo(video: Buffer | string, caption?: string, isGif: boolean = false, isPtv: boolean = false) {
        const content = await this._resolveMedia(video);
        return this.adapter.sendMessage(this.from, {
            video: content,
            caption: caption,
            gifPlayback: isGif,
            ptv: isPtv
        }, { quoted: this.raw });
    }

    /**
     * Reply with a document.
     */
    async replyDocument(document: Buffer | string, fileName?: string, caption?: string, mimetype?: string) {
        const content = await this._resolveMedia(document);
        return this.adapter.sendMessage(this.from, {
            document: content,
            fileName: fileName,
            caption: caption,
            mimetype: mimetype ?? 'application/octet-stream'
        }, { quoted: this.raw });
    }

    /**
     * Send modern interactive buttons (Native Flow)
     * 
     * **⚠️ Cloud API Limitation**: When using Cloud API (`cloudApi` config), only reply buttons are supported.
     * URL and copy buttons will be automatically filtered out. For Baileys adapter, all button types work but
     * they cannot be mixed in a single message - use only one type per message.
     * 
     * **Supported button types:**
     * - `reply`: Quick reply button (works on all adapters)
     * - `url`: URL button (Baileys only, requires separate message)
     * - `copy`: Copy code button (Baileys only, requires separate message)
     * 
     * @param text - Message body text
     * @param buttons - Array of buttons (max 3). For Cloud API, use only `type: 'reply'`.
     * @param footer - Optional footer text
     * @param header - Optional header text
     * 
     * @example
     * // ✅ CORRECT - Reply buttons only (works on all adapters)
     * await ctx.sendButtons('Choose an option', [
     *   { id: 'btn1', text: 'Option 1', type: 'reply' },
     *   { id: 'btn2', text: 'Option 2', type: 'reply' }
     * ]);
     * 
     * @example
     * // ❌ AVOID - Mixed button types (Cloud API will filter out non-reply buttons)
     * await ctx.sendButtons('Choose an option', [
     *   { id: 'btn1', text: 'Reply', type: 'reply' },
     *   { id: 'btn2', text: 'Visit', type: 'url', url: 'https://example.com' }  // Will be filtered out on Cloud API
     * ]);
     */
    async sendButtons(text: string, buttons: { id: string; text: string; type?: 'reply' | 'url' | 'copy'; url?: string; copyCode?: string }[], footer?: string, header?: string) {
        // Runtime warning for Cloud API users with mixed button types
        if (this.adapter.mode === 'cloud') {
            const hasNonReply = buttons.some(btn => btn.type && btn.type !== 'reply');
            if (hasNonReply) {
                console.warn(
                    '⚠️ Cloud API Limitation: Only reply buttons are supported. ' +
                    'URL and copy buttons will be filtered out. ' +
                    'Use only type="reply" or omit the type field for Cloud API.'
                );
            }
        }

        const buttonParams = buttons.map(btn => {
            if (btn.type === 'url') {
                return {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({ display_text: btn.text, url: btn.url, merchant_url: btn.url })
                };
            }
            if (btn.type === 'copy') {
                return {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({ display_text: btn.text, copy_code: btn.copyCode })
                };
            }
            // Default to quick reply
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id })
            };
        });

        return this.adapter.sendMessage(this.from, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: text },
                        footer: footer ? { text: footer } : undefined,
                        header: header ? { title: header, hasMediaAttachment: false } : undefined,
                        nativeFlowMessage: {
                            buttons: buttonParams
                        }
                    }
                }
            }
        } as unknown as AnyMessageContent);
    }

    /**
     * Send a modern list message (Single Select)
     */
    async sendList(text: string, buttonText: string, sections: { title: string; rows: { id: string; title: string; description?: string }[] }[], title?: string) {
        return this.adapter.sendMessage(this.from, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: text },
                        header: title ? { title: title, hasMediaAttachment: false } : undefined,
                        nativeFlowMessage: {
                            buttons: [{
                                name: 'single_select',
                                buttonParamsJson: JSON.stringify({
                                    title: buttonText,
                                    sections: sections
                                })
                            }]
                        }
                    }
                }
            }
        } as unknown as AnyMessageContent);
    }

    /**
     * Send a carousel message
     * 
     * **⚠️ Cloud API Limitation**: Carousels only support URL buttons (`type: 'url'`).
     * Reply and copy buttons are not supported in carousel messages and will be skipped.
     * 
     * **Supported button types in carousel:**
     * - `url`: URL button (required for Cloud API carousels)
     * - For reply buttons, use `sendButtons` instead
     * 
     * @param cards - Array of carousel cards (2-10 cards). Each card must have a URL button.
     * 
     * @example
     * // ✅ CORRECT - URL buttons in carousel
     * await ctx.sendCarousel([
     *   {
     *     body: 'Check out Product 1',
     *     header: 'Product 1',
     *     buttons: [{ id: 'b1', text: 'View', type: 'url', url: 'https://example.com/1' }]
     *   },
     *   {
     *     body: 'Check out Product 2',
     *     header: 'Product 2',
     *     buttons: [{ id: 'b2', text: 'View', type: 'url', url: 'https://example.com/2' }]
     *   }
     * ]);
     * 
     * @example
     * // ❌ AVOID - Reply buttons in carousel (will be skipped on Cloud API)
     * await ctx.sendCarousel([
     *   {
     *     body: 'Card 1',
     *     buttons: [{ id: 'b1', text: 'Reply', type: 'reply' }]  // Will be skipped
     *   }
     * ]);
     */
    async sendCarousel(cards: { 
        body: string; 
        header?: string | { image: { url: string } } | { video: { url: string } }; 
        footer?: string; 
        buttons: { id: string; text: string; type?: 'reply' | 'url' | 'copy'; url?: string; copyCode?: string }[] 
    }[], text: string = "Carousel Message") {
        // Runtime warning for Cloud API users with non-URL buttons
        if (this.adapter.mode === 'cloud') {
            const hasNonUrl = cards.some(card => 
                card.buttons.some(btn => btn.type && btn.type !== 'url')
            );
            if (hasNonUrl) {
                console.warn(
                    '⚠️ Cloud API Limitation: Carousel messages only support URL buttons. ' +
                    'Reply and copy buttons will be skipped. ' +
                    'Use type="url" for all carousel buttons.'
                );
            }
        }

        const cardsParams = cards.map(card => {
            const buttonParams = card.buttons.map(btn => {
                // Carousel cta_url buttons don't support merchant_url, only display_text and url
                if (btn.type === 'url') return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: btn.text, url: btn.url, merchant_url: btn.url }) };
                if (btn.type === 'copy') return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: btn.text, copy_code: btn.copyCode ?? '' }) };
                return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id }) };
            });

            let header: Record<string, unknown> | undefined = undefined;
            if (typeof card.header === 'string') {
                header = { title: card.header, hasMediaAttachment: false };
            } else if (card.header && 'image' in card.header) {
                header = { 
                    imageMessage: { url: card.header.image.url }, 
                    hasMediaAttachment: true 
                };
            } else if (card.header && 'video' in card.header) {
                header = { 
                    videoMessage: { url: card.header.video.url }, 
                    hasMediaAttachment: true 
                };
            }

            return {
                body: { text: card.body },
                header: header,
                footer: card.footer ? { text: card.footer } : undefined,
                nativeFlowMessage: { buttons: buttonParams }
            };
        });

        return this.adapter.sendMessage(this.from, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: text },
                        carouselMessage: {
                            cards: cardsParams
                        }
                    }
                }
            }
        } as unknown as AnyMessageContent);
    }

    /**
     * Send a product list message
     */
    async sendProductList(body: string, actionTitle: string, catalogId: string, sections: { title: string; products: { productId: string }[] }[], header?: string, footer?: string) {
        return this.adapter.sendMessage(this.from, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: body },
                        header: header ? { title: header, hasMediaAttachment: false } : undefined,
                        footer: footer ? { text: footer } : undefined,
                        nativeFlowMessage: {
                            buttons: [{
                                name: 'product_list',
                                buttonParamsJson: JSON.stringify({
                                    title: actionTitle,
                                    catalog_id: catalogId,
                                    sections: sections.map(s => ({
                                        title: s.title,
                                        product_items: s.products.map(p => ({ product_retailer_id: p.productId }))
                                    }))
                                })
                            }]
                        }
                    }
                }
            }
        } as unknown as AnyMessageContent);
    }

    async replyWithMentions(text: string, mentions: string[]) {
        return this.adapter.sendMessage(this.from, {
            text: text,
            mentions: mentions
        }, { quoted: this.raw });
    }

    /**
     * Tag all participants in the group.
     */
    async tagAll(text?: string) {
        if (!this.isGroup()) return;
        
        if (this.adapter.mode !== 'baileys') {
             return; // Not supported on Cloud API
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metadata = await (this.adapter as any).groupMetadata(this.from);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mentions = metadata.participants.map((p: any) => p.id);

        await this.reply({
            text: text || '',
            mentions: mentions
        });
    }

    /**
     * Save the media from this message to storage.
     * @param strategy The storage strategy to use. Defaults to LocalFileStorage.
     * @param fileName Optional filename. If not provided, a random one will be generated.
     */
    async saveMedia(strategy?: IStorageStrategy, fileName?: string): Promise<string | null> {
        const buffer = await this.download();
        if (!buffer) return null;

        const storage = strategy || new LocalFileStorage();
        
        let finalFileName = fileName;
        
        // Generate a filename if not provided
        if (!finalFileName) {
            const msg = this.raw.message;
            const content = msg?.extendedTextMessage || 
                            msg?.imageMessage || 
                            msg?.videoMessage || 
                            msg?.stickerMessage ||
                            msg?.audioMessage ||
                            msg?.documentMessage;
            
            // Specific handling for documents which might have a filename
            if (msg?.documentMessage?.fileName) {
                // Prepend timestamp to prevent collisions
                finalFileName = `${Date.now()}-${msg.documentMessage.fileName}`;
            } else {
                const mimetype = content && 'mimetype' in content ? (content.mimetype as string)?.split(';')[0] : undefined;
                
                // Default to 'bin' if no mimetype found or unknown
                const extension = mimetype ? (MIMETYPE_MAP[mimetype] || mimetype.split('/')[1] || 'bin') : 'bin';
                
                finalFileName = `media-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
            }
        }
        
        return storage.save(finalFileName, buffer);
    }
}

/**
 * A specialized Context for quoted messages.
 * It warns developers about missing content in Cloud API.
 */
export class QuotedContext<E extends Env = Env> extends Context<E> {
    /**
     * The actual text content (flattened).
     * 
     * @warning **Cloud API Limitation**: This field will be EMPTY in Cloud API webhooks because WhatsApp does not send the quoted message content.
     * Use `await ctx.fetchQuoted()` to retrieve the full message content from your store.
     */
    override get body(): string {
        return super.body;
    }

    /**
     * Get the normalized message content.
     * 
     * @warning **Cloud API Limitation**: This field will be EMPTY in Cloud API webhooks because WhatsApp does not send the quoted message content.
     * Use `await ctx.fetchQuoted()` to retrieve the full message content from your store.
     */
    override get content(): proto.IMessage | null | undefined {
        return super.content;
    }
}
