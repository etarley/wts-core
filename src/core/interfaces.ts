import { type AnyMessageContent, proto } from '@whiskeysockets/baileys';

export interface SendMessageOptions {
    /**
     * The message to quote (reply to)
     */
    quoted?: proto.IWebMessageInfo;
    
    /**
     * Allow passing extra options specific to an adapter (e.g. ephemeral expirations),
     * but force type-checking before usage.
     */
    [key: string]: unknown;
}

/**
 * The Interface that every adapter (Baileys, Cloud API) must implement.
 * The Main Client only talks to this.
 */
export interface IAdapter {
    /**
     * What mode is this adapter running in?
     */
    mode: 'baileys' | 'cloud';

    /**
     * Start the connection (Socket or Webhook Server)
     */
    connect(): Promise<void>;

    /**
     * Send a message
     * @param jid - The generic JID (e.g. 12345@s.whatsapp.net)
     * @param content - The content to send
     * @param options - Extra options like quoting
     */
    sendMessage(
        jid: string, 
        content: AnyMessageContent, 
        options?: SendMessageOptions
    ): Promise<proto.IWebMessageInfo | undefined>;

    /**
     * Mark messages as read
     * @param keys - The message keys to mark as read
     */
    readMessage(keys: proto.IMessageKey[]): Promise<void>;

    /**
     * Listen for events. 
     * 'message' yields 'unknown' because the raw payload differs by adapter.
     * The Client class is responsible for casting/validating this into a Context.
     */
    on(event: 'message', handler: (message: unknown) => void): void;
    on(event: 'ready', handler: () => void): void;
}
