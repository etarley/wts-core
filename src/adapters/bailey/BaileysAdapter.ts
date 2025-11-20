import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    type WASocket,
    proto,
    type AnyMessageContent,
    type ConnectionState,
    type WAMessage
} from '@whiskeysockets/baileys';
import { type Boom } from '@hapi/boom';
import { createLogger } from '../../utils/logger';
import type { IAdapter, SendMessageOptions } from '../../core/interfaces';
import type { UniversalOptions } from '../../types';
import qrcode from 'qrcode-terminal';

export class BaileysAdapter implements IAdapter {
    public mode = 'baileys' as const;
    private sock: WASocket | undefined;
    private options: UniversalOptions;
    private eventHandlers: Map<string, ((arg: unknown) => void)[]> = new Map();

    constructor(options: UniversalOptions) {
        this.options = options;
    }

    async connect(): Promise<void> {
        const { state, saveCreds } = await useMultiFileAuthState(
            this.options.authStrategy || './session'
        );

        this.sock = makeWASocket({
            auth: state,
            // REMOVED: printQRInTerminal: this.options.printQR ?? true, 
            logger: createLogger('silent') as any, 
            ...this.options.socketConfig,
        });

        this.sock.ev.on('creds.update', saveCreds);
        this.sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(update));
        this.sock.ev.on('messages.upsert', (update) => this.handleMessagesUpsert(update));
    }

    async sendMessage(
        jid: string, 
        content: AnyMessageContent, 
        options?: SendMessageOptions
    ): Promise<proto.IWebMessageInfo | undefined> {
        if (!this.sock) {
            throw new Error('Client not connected. Call client.connect() first.');
        }

        const { quoted, ...rest } = options || {};

        return this.sock.sendMessage(jid, content, {
            quoted: quoted as WAMessage, 
            ...rest,
        });
    }

    async readMessage(keys: proto.IMessageKey[]): Promise<void> {
        if (!this.sock) {
            throw new Error('Client not connected. Call client.connect() first.');
        }

        await this.sock.readMessages(keys);
    }

    on(event: string, handler: (arg: unknown) => void): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(handler);
    }

    private emit(event: string, arg: unknown) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => handler(arg));
        }
    }

    private handleConnectionUpdate(update: Partial<ConnectionState>) {
        const { connection, lastDisconnect, qr } = update;

        // 1. Handle QR Code manually
        if (qr && this.options.printQR) {
            console.log('Scan this QR Code:');
            qrcode.generate(qr, { small: true });
        }

        // 2. Handle Connection Closure
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting:', shouldReconnect);
            
            if (shouldReconnect) {
                this.connect();
            }
        } else if (connection === 'open') {
            this.emit('ready', undefined);
        }
    }

    private async handleMessagesUpsert(update: { messages: proto.IWebMessageInfo[]; type: string }) {
        if (update.type !== 'notify') return;

        const messagesToRead: proto.IMessageKey[] = [];

        for (const msg of update.messages) {
            if (!msg.message) continue;
            
            if (this.options.readConfirmations && msg.key && !msg.key.fromMe) {
                messagesToRead.push(msg.key);
            }
            
            this.emit('message', msg);
        }

        if (messagesToRead.length > 0 && this.sock) {
            await this.sock.readMessages(messagesToRead);
        }
    }
}