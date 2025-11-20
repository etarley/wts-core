import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    type WASocket,
    proto,
    type AnyMessageContent,
    type ConnectionState,
    type WAMessage,
    type GroupMetadata,
    type NewsletterMetadata,
    type ProductCreate,
    type ProductUpdate
} from '@whiskeysockets/baileys';
import { type Boom } from '@hapi/boom';
import { createLogger } from '../../utils/logger';
import type { IAdapter, SendMessageOptions } from '../../core/interfaces';
import type { UniversalOptions } from '../../types';
import qrcode from 'qrcode-terminal';

// Minimal interface to satisfy Baileys logger requirement
interface PinoLogger {
    level: string;
    trace(obj: unknown, msg?: string): void;
    debug(obj: unknown, msg?: string): void;
    info(obj: unknown, msg?: string): void;
    warn(obj: unknown, msg?: string): void;
    error(obj: unknown, msg?: string): void;
    fatal(obj: unknown, msg?: string): void;
    child(bindings: unknown): PinoLogger;
}

export class BaileysAdapter implements IAdapter {
    public mode = 'baileys' as const;
    private sock: WASocket | undefined;
    private options: UniversalOptions;
    private eventHandlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();

    constructor(options: UniversalOptions) {
        this.options = options;
    }

    async connect(): Promise<void> {
        const { state, saveCreds } = await useMultiFileAuthState(
            this.options.authStrategy || './auth_info'
        );

        this.sock = makeWASocket({
            auth: state,
            logger: createLogger('silent') as unknown as PinoLogger,
            getMessage: async (key) => {
                if (this.options.store && key.remoteJid && key.id) {
                    const msg = await this.options.store.loadMessage(key.remoteJid, key.id);
                    return msg?.message || undefined;
                }
                return undefined;
            }
        });

        // Bind store if provided
        if (this.options.store) {
            this.options.store.bind(this.sock.ev);
        }

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && this.options.printQR) {
                qrcode.generate(qr, { small: true });
                console.log('Scan the QR code above to authenticate');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    await this.connect();
                }
            } else if (connection === 'open') {
                console.log('Connected to WhatsApp');
                if (this.options.phoneNumber) {
                    try {
                        const code = await this.sock!.requestPairingCode(this.options.phoneNumber);
                        console.log(`Pairing code: ${code}`);
                    } catch (error) {
                        console.error('Failed to get pairing code:', error);
                    }
                }
                this.emit('ready');
            }
        });

        this.sock.ev.on('messages.upsert', ({ messages }) => {
            void this.handleMessages(messages);
        });

        // Group participant updates
        this.sock.ev.on('group-participants.update', (update) => {
            this.emit('group-participants', update);
        });

        // Call events
        this.sock.ev.on('call', (callData) => {
            this.emit('call', callData);
        });
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
        return this.sock.sendMessage(jid, content, { quoted: quoted as WAMessage, ...rest });
    }

    async readMessage(keys: proto.IMessageKey[]): Promise<void> {
        if (!this.sock) {
            throw new Error('Client not connected. Call client.connect() first.');
        }

        await this.sock.readMessages(keys);
    }

    // User Management
    async updateProfilePicture(jid: string, buffer: Buffer): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.updateProfilePicture(jid, buffer);
    }

    async updateStatus(status: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.updateProfileStatus(status);
    }

    async updateName(name: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.updateProfileName(name);
    }

    getMe(): { id: string; name?: string } | undefined {
        if (!this.sock?.user) return undefined;
        return {
            id: this.sock.user.id,
            name: this.sock.user.name
        };
    }

    // Contact Management
    async blockContact(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.updateBlockStatus(jid, 'block');
    }

    async unblockContact(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.updateBlockStatus(jid, 'unblock');
    }

    async getProfilePicture(jid: string): Promise<string | undefined> {
        if (!this.sock) throw new Error('Client not connected');
        try {
            return await this.sock.profilePictureUrl(jid, 'image');
        } catch {
            return undefined;
        }
    }

    async getStatus(jid: string): Promise<string | undefined> {
        if (!this.sock) throw new Error('Client not connected');
        try {
            const result = await this.sock.fetchStatus(jid);
            if (Array.isArray(result) && result.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (result as any)[0]?.status;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (result as any)?.status;
        } catch {
            return undefined;
        }
    }

    async isOnWhatsApp(jid: string): Promise<{ jid: string; exists: boolean } | undefined> {
        if (!this.sock) throw new Error('Client not connected');
        const result = await this.sock.onWhatsApp(jid);
        if (Array.isArray(result) && result.length > 0 && result[0]) {
            return { jid: result[0].jid, exists: result[0].exists };
        }
        return undefined;
    }

    // Group Management
    async groupParticipantsUpdate(jid: string, participants: string[], action: 'add' | 'remove' | 'promote' | 'demote'): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.groupParticipantsUpdate(jid, participants, action);
    }

    async groupUpdateSubject(jid: string, subject: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.groupUpdateSubject(jid, subject);
    }

    async groupUpdateDescription(jid: string, description: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.groupUpdateDescription(jid, description);
    }

    async groupSettingUpdate(jid: string, setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.groupSettingUpdate(jid, setting);
    }

    async groupInviteCode(jid: string): Promise<string | undefined> {
        if (!this.sock) throw new Error('Client not connected');
        try {
            return await this.sock.groupInviteCode(jid);
        } catch {
            return undefined;
        }
    }

    async groupRevokeInvite(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.groupRevokeInvite(jid);
    }

    async groupAcceptInvite(code: string): Promise<string | undefined> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.groupAcceptInvite(code);
    }

    async groupLeave(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.groupLeave(jid);
    }

    async groupCreate(subject: string, participants: string[], description?: string): Promise<GroupMetadata> {
        if (!this.sock) throw new Error('Client not connected');
        const group = await this.sock.groupCreate(subject, participants);

        if (description) {
            await this.sock.groupUpdateDescription(group.id, description);
        }

        return group;
    }

    async groupMetadata(jid: string): Promise<GroupMetadata> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.groupMetadata(jid);
    }

    async toggleEphemeral(jid: string, duration: number): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.sendMessage(jid, {
            disappearingMessagesInChat: duration
        });
    }

    // Status Management
    async sendStatus(content: AnyMessageContent): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.sendMessage('status@broadcast', content);
    }

    // Presence Management
    async sendPresenceUpdate(jid: string, type: 'composing' | 'recording' | 'available' | 'unavailable'): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.sendPresenceUpdate(type, jid);
    }

    // Call Management
    async rejectCall(callId: string, from: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.rejectCall(callId, from);
    }

    // Newsletter (Channel) Management
    async newsletterCreate(name: string, description: string, picture?: Buffer): Promise<NewsletterMetadata> {
        if (!this.sock) throw new Error('Client not connected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.sock.newsletterCreate({ name, description, picture } as any);
    }

    async newsletterFollow(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.newsletterFollow(jid);
    }

    async newsletterUnfollow(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.newsletterUnfollow(jid);
    }

    async newsletterMute(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.newsletterMute(jid);
    }

    async newsletterUnmute(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.newsletterUnmute(jid);
    }

    async newsletterUpdate(jid: string, changes: { name?: string; description?: string; picture?: Buffer }): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.sock.newsletterUpdate(jid, changes as any);
    }

    //Community Management
    async communityCreate(subject: string, description?: string): Promise<GroupMetadata> {
        if (!this.sock) throw new Error('Client not connected');
        // Baileys uses groupCreate for communities, we just pass an empty array for participants
        const group = await this.sock.groupCreate(subject, []);

        if (description) {
            await this.sock.groupUpdateDescription(group.id, description);
        }

        return group;
    }

    async communityDeactivate(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.groupLeave(jid);
    }

    // Business Features
    async businessGetCatalog(jid: string, limit?: number): Promise<unknown> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.getCatalog({ jid, limit });
    }

    async businessProductCreate(product: ProductCreate): Promise<unknown> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.productCreate(product);
    }

    async businessProductUpdate(productId: string, update: ProductUpdate): Promise<unknown> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.productUpdate(productId, update);
    }

    async businessProductDelete(productIds: string[]): Promise<unknown> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.productDelete(productIds);
    }

    async businessGetOrderDetails(orderId: string, token: string): Promise<unknown> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.getOrderDetails(orderId, token);
    }

    // Chat Modifications
    async chatModify(jid: string, type: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'mute' | 'unmute', options?: { duration?: number }): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = {};
        if (type === 'archive') mod.archive = true;
        if (type === 'unarchive') mod.archive = false;
        if (type === 'pin') mod.pin = true;
        if (type === 'unpin') mod.pin = false;
        if (type === 'mute') mod.mute = options?.duration || 8 * 60 * 60 * 1000;
        if (type === 'unmute') mod.mute = null;
        
        if (type.includes('archive')) mod.lastMessages = [];
        
        await this.sock.chatModify(mod, jid);
    }

    // Privacy Settings
    async fetchPrivacySettings(force?: boolean): Promise<unknown> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.fetchPrivacySettings(force);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async updatePrivacySetting(type: 'last' | 'online' | 'profile' | 'status' | 'readreceipts' | 'groupadd', value: any): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        switch (type) {
            case 'last':
                await this.sock.updateLastSeenPrivacy(value);
                break;
            case 'online':
                await this.sock.updateOnlinePrivacy(value);
                break;
            case 'profile':
                await this.sock.updateProfilePicturePrivacy(value);
                break;
            case 'status':
                await this.sock.updateStatusPrivacy(value);
                break;
            case 'readreceipts':
                await this.sock.updateReadReceiptsPrivacy(value);
                break;
            case 'groupadd':
                await this.sock.updateGroupsAddPrivacy(value);
                break;
        }
    }

    // Events
    on(event: string, handler: (...args: unknown[]) => void): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(handler);
    }

    private emit(event: string, ...args: unknown[]): void {
        this.eventHandlers.get(event)?.forEach(fn => fn(...args));
    }

    private async handleMessages(messages: WAMessage[]): Promise<void> {
        const messagesToRead: proto.IMessageKey[] = [];

        for (const msg of messages) {
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
