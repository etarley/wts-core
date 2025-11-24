import makeWASocket, { DisconnectReason, type WASocket, proto, type AnyMessageContent, type ConnectionState, type WAMessage, type GroupMetadata, type NewsletterMetadata, type NewsletterUpdate, generateWAMessageFromContent, downloadMediaMessage, type ProductCreate, type ProductUpdate } from '@whiskeysockets/baileys';
import WebSocket from 'ws';
import { type Boom } from '@hapi/boom';
import { createLogger } from '../../utils/logger';
import type { BaileysAdapterInterface, SendMessageOptions, AdapterCapabilities } from '../../core/interfaces';
import type { UniversalOptions } from '../../types';
import qrcode from 'qrcode-terminal';
import { LocalAuthStrategy } from '../../core/auth/LocalAuthStrategy';
import type { AuthStrategy } from '../../core/auth/AuthStrategy';


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



// Extended interface to include methods that might be missing from the core types or are internal
interface ExtendedWASocket extends WASocket {
    removeProfilePicture(jid: string): Promise<void>;
    groupRequestParticipantsUpdate(jid: string, participants: string[], action: 'approve' | 'reject'): Promise<{ status: string; jid: string | undefined; }[]>;
    newsletterCreate(name: string, description?: string): Promise<NewsletterMetadata>;
    newsletterUpdate(jid: string, changes: NewsletterUpdate): Promise<void>;
    chatModify(modification: unknown, jid: string): Promise<void>;
}

export class BaileysAdapter implements BaileysAdapterInterface {
    public mode = 'baileys' as const;
    public capabilities: AdapterCapabilities = {
        hasGroups: true,
        hasNewsletter: true,
        hasStatus: true,
        hasCommunity: true,
        hasBusiness: true,
        hasCall: true,
        hasPrivacy: true,
        hasSticker: true,
        hasLocation: true,
        hasPoll: true,
        hasReaction: true
    };

    public get raw(): WASocket | undefined {
        return this.sock;
    }

    private sock: WASocket | undefined;
    private options: UniversalOptions;
    private eventHandlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();
    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds

    constructor(options: UniversalOptions) {
        this.options = options;
    }

     
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleWebhook(_request: Request): Promise<Response> {
        return new Response('Not found', { status: 404 });
    }

    async connect(): Promise<void> {
        let authStrategy: AuthStrategy;
        let usingLocalAuth = false;
        if (typeof this.options.authStrategy === 'string' || !this.options.authStrategy) {
            authStrategy = new LocalAuthStrategy(this.options.authStrategy || './auth_info');
            usingLocalAuth = true;
        } else {
            authStrategy = this.options.authStrategy;
        }

        const { state, saveCreds } = await authStrategy.getAuthState();

        // Detect environment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isNode = typeof process !== 'undefined' && (process as any).release?.name === 'node';
        const isBun = typeof Bun !== 'undefined';

        if (usingLocalAuth && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
            console.warn('[BaileysAdapter] LocalAuthStrategy is using the local file system. For production environments with ephemeral storage (Docker/Kubernetes/Serverless), use StoreAuthStrategy with a persistent database-backed AuthStore.');
        }

        console.log(`[BaileysAdapter] Connecting... Environment: isNode=${isNode}, isBun=${isBun}`);

        const socketConfig = {
            auth: state,
            logger: createLogger('silent') as unknown as PinoLogger,
            
            getMessage: async (key: proto.IMessageKey) => {
                if (this.options.store && key.remoteJid && key.id) {
                    const msg = await this.options.store.loadMessage(key.remoteJid, key.id);
                    return msg?.message || undefined;
                }
                return undefined;
            },
            ...(this.options.makeSignalRepository ? { makeSignalRepository: this.options.makeSignalRepository } : {}),
            // Explicitly provide WebSocket implementation for Node/Bun environments
            // This ensures we have setMaxListeners which Baileys expects
            ...(isNode || isBun ? { webSocket: WebSocket } : {}),
            ...this.options.socketConfig
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.sock = makeWASocket(socketConfig as any);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.sock = makeWASocket(socketConfig as any);

        // Bind store if provided
        if (this.options.store) {
            this.options.store.bind(this.sock.ev);
        }

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
            if (!update) {
                console.error('[BaileysAdapter] connection.update received undefined/null update');
                return;
            }

            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.emit('qr', qr);
            }

            // Only print QR if we are in a terminal environment and explicitely enabled
            if (qr && this.options.printQR && isNode) {
                qrcode.generate(qr, { small: true });
                console.log('Scan the QR code above to authenticate');
            } else if (qr && this.options.printQR && !isNode) {
                console.log('QR Code received (terminal printing disabled in non-Node env):', qr);
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                // console.log('[BaileysAdapter] Connection closed. Reason:', lastDisconnect?.error, 'Should reconnect:', shouldReconnect);
                
                if (statusCode === DisconnectReason.restartRequired) {
                    this.connect();
                } else if (shouldReconnect) {
                    this.reconnectAttempts++;
                    const delay = Math.min(this.MAX_RECONNECT_DELAY, Math.pow(2, this.reconnectAttempts) * 1000);
                    // console.log(`Connection closed, reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
                    setTimeout(() => this.connect(), delay);
                }
            } else if (connection === 'open') {
                this.reconnectAttempts = 0;
                // console.log('Connected to WhatsApp');
                if (this.options.phoneNumber) {
                    try {
                        const code = await this.sock!.requestPairingCode(this.options.phoneNumber);
                        // console.log(`Pairing code: ${code}`);
                        this.emit('pairing-code', code);
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

        // Group Join Requests
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.sock.ev.on('group.join-request', (data: any) => {
            this.emit('group.join_request', data);
        });

        // Message status updates
        this.sock.ev.on('messages.update', (updates) => {
            for (const update of updates) {
                if (update.update.status) {
                    let statusString = 'UNKNOWN';
                    switch (update.update.status) {
                        case proto.WebMessageInfo.Status.PENDING: statusString = 'PENDING'; break;
                        case proto.WebMessageInfo.Status.SERVER_ACK: statusString = 'SENT'; break;
                        case proto.WebMessageInfo.Status.DELIVERY_ACK: statusString = 'DELIVERED'; break;
                        case proto.WebMessageInfo.Status.READ: statusString = 'READ'; break;
                        case proto.WebMessageInfo.Status.PLAYED: statusString = 'PLAYED'; break;
                    }
                    this.emit('message.status', { id: update.key.id, status: statusString, remoteJid: update.key.remoteJid, fromMe: update.key.fromMe });
                }
            }
        });

        // Presence updates
        this.sock.ev.on('presence.update', (update) => {
            const id = update.id;
            const presence = update.presences[id]?.lastKnownPresence;
            this.emit('chat.update', { id, presence });
        });
    }

    async disconnect(): Promise<void> {
        if (this.sock) {
            this.sock.end(undefined);
            this.sock = undefined;
        }
    }

    async sendMessage(
        jid: string,
        content: AnyMessageContent,
        options?: SendMessageOptions
    ): Promise<proto.IWebMessageInfo | undefined> {
        if (!this.sock) {
            throw new Error('Client not connected. Call client.connect() first.');
        }

        const userJid = this.sock.user?.id;
        if (!userJid) {
            throw new Error('User JID not available. Is the client connected?');
        }

        const { quoted, ...rest } = options || {};

        // Handle interactive messages (Buttons, Lists, etc) which are wrapped in viewOnceMessage
        // Baileys sendMessage validation can fail on these, so we manually generate and relay
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ('viewOnceMessage' in (content as any)) {
            const waMessage = await generateWAMessageFromContent(
                jid,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content as any,
                { userJid: userJid, quoted: quoted as WAMessage, ...rest }
            );
            await this.sock.relayMessage(jid, waMessage.message!, {
                messageId: waMessage.key.id!,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                additionalNodes: (rest as any).additionalNodes
            });
            return waMessage;
        }

        return this.sock.sendMessage(jid, content, { quoted: quoted as WAMessage, ...rest });
    }

    async readMessage(keys: proto.IMessageKey[]): Promise<void> {
        if (!this.sock) {
            throw new Error('Client not connected. Call client.connect() first.');
        }
        await this.sock.readMessages(keys);
    }

    async downloadMedia(message: proto.IWebMessageInfo): Promise<Buffer> {
        return await downloadMediaMessage(message as WAMessage, 'buffer', {});
    }

    // User Management
    async updateProfilePicture(jid: string, buffer: Buffer): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.updateProfilePicture(jid, buffer);
    }

    async removeProfilePicture(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await (this.sock as ExtendedWASocket).removeProfilePicture(jid);
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
        return { id: this.sock.user.id, name: this.sock.user.name };
    }

    // Contact Management
    async fetchBlocklist(): Promise<string[]> {
        if (!this.sock) throw new Error('Client not connected');
        const result = await this.sock.fetchBlocklist();
        return result.filter((id): id is string => !!id);
    }

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
            if (result && typeof result === 'object' && 'status' in result) {
                return (result as { status: string }).status;
            }
            return undefined;
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
    async groupFetchAllParticipating(): Promise<Record<string, GroupMetadata>> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.groupFetchAllParticipating();
    }

    async groupParticipantsUpdate(jid: string, participants: string[], action: 'add' | 'remove' | 'promote' | 'demote'): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.groupParticipantsUpdate(jid, participants, action);
    }

    async groupRequestParticipantsList(jid: string): Promise<unknown[]> {
        if (!this.sock) throw new Error('Client not connected');
        return (this.sock as ExtendedWASocket).groupRequestParticipantsList(jid);
    }

    async groupRequestParticipantsUpdate(jid: string, participants: string[], action: 'approve' | 'reject'): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await (this.sock as ExtendedWASocket).groupRequestParticipantsUpdate(jid, participants, action);
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

    async groupGetInviteInfo(code: string): Promise<GroupMetadata | undefined> {
        if (!this.sock) throw new Error('Client not connected');
        try {
            return await this.sock.groupGetInviteInfo(code);
        } catch {
            return undefined;
        }
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
        await this.sock.sendMessage(jid, { disappearingMessagesInChat: duration });
    }

    // Status Management
    async sendStatus(content: AnyMessageContent): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.sendMessage('status@broadcast', content);
    }

    // Presence Management
    async presenceSubscribe(jid: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.presenceSubscribe(jid);
    }

    async sendPresenceUpdate(jid: string, type: 'composing' | 'recording' | 'available' | 'unavailable', messageId?: string): Promise<void> {
        void messageId;
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.sendPresenceUpdate(type, jid);
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

    // Call Management
    async rejectCall(callId: string, from: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await this.sock.rejectCall(callId, from);
    }

    // Newsletter (Channel) Management
    async newsletterCreate(name: string, description: string, _picture?: Buffer): Promise<NewsletterMetadata> {
        void _picture;
        if (!this.sock) throw new Error('Client not connected');
        return (this.sock as ExtendedWASocket).newsletterCreate(name, description);
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
        
        const updatePayload: { name?: string; description?: string; picture?: string } = {
            name: changes.name,
            description: changes.description
        };

        if (changes.picture) {
            updatePayload.picture = changes.picture.toString('base64');
        }

        await (this.sock as ExtendedWASocket).newsletterUpdate(jid, updatePayload);
    }

    //Community Management
    async communityCreate(subject: string, description?: string): Promise<GroupMetadata> {
        if (!this.sock) throw new Error('Client not connected');
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

    // Labels
    async addChatLabel(jid: string, labelId: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await (this.sock as ExtendedWASocket).chatModify({ addLabel: labelId }, jid);
    }

    async removeChatLabel(jid: string, labelId: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        await (this.sock as ExtendedWASocket).chatModify({ removeLabel: labelId }, jid);
    }

    // Chat Modifications
    async chatModify(jid: string, type: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'mute' | 'unmute' | 'clear' | 'delete', options?: { duration?: number }): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        if (type === 'archive') await this.sock.chatModify({ archive: true, lastMessages: [] }, jid);
        if (type === 'unarchive') await this.sock.chatModify({ archive: false, lastMessages: [] }, jid);
        if (type === 'pin') await this.sock.chatModify({ pin: true }, jid);
        if (type === 'unpin') await this.sock.chatModify({ pin: false }, jid);
        if (type === 'mute') await this.sock.chatModify({ mute: options?.duration || 8 * 60 * 60 * 1000 }, jid);
        if (type === 'unmute') await this.sock.chatModify({ mute: null }, jid);
        if (type === 'delete') await this.sock.chatModify({ delete: true, lastMessages: [] }, jid);
        if (type === 'clear') await this.sock.chatModify({ delete: true, lastMessages: [] }, jid);
    }

    // Privacy Settings
    async fetchPrivacySettings(force?: boolean): Promise<unknown> {
        if (!this.sock) throw new Error('Client not connected');
        return this.sock.fetchPrivacySettings(force);
    }

    async updatePrivacySetting(type: 'last' | 'online' | 'profile' | 'status' | 'readreceipts' | 'groupadd', value: string): Promise<void> {
        if (!this.sock) throw new Error('Client not connected');
        switch (type) {
            case 'last': await this.sock.updateLastSeenPrivacy(value as 'all' | 'contacts' | 'contact_blacklist' | 'none'); break;
            case 'online': await this.sock.updateOnlinePrivacy(value as 'all' | 'match_last_seen'); break;
            case 'profile': await this.sock.updateProfilePicturePrivacy(value as 'all' | 'contacts' | 'contact_blacklist' | 'none'); break;
            case 'status': await this.sock.updateStatusPrivacy(value as 'all' | 'contacts' | 'contact_blacklist' | 'none'); break;
            case 'readreceipts': await this.sock.updateReadReceiptsPrivacy(value as 'all' | 'none'); break;
            case 'groupadd': await this.sock.updateGroupsAddPrivacy(value as 'all' | 'contacts' | 'contact_blacklist'); break;
        }
    }

    async requestPairingCode(phoneNumber: string): Promise<string> {
        if (!this.sock) {
            throw new Error('Socket not initialized. Call connect() first.');
        }
        const code = await this.sock.requestPairingCode(phoneNumber);
        console.log(`Pairing code for ${phoneNumber}: ${code}`);
        return code;
    }

    on<T extends unknown[] = unknown[]>(event: string, handler: (...args: T) => void) {
        if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, []);
        this.eventHandlers.get(event)?.push(handler as unknown as (...args: unknown[]) => void);
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
