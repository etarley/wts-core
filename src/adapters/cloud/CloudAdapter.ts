import { createServer } from 'node:http';
import { parse as parseUrl } from 'node:url';
import type { CloudAdapterInterface, SendMessageOptions, AdapterCapabilities, FlowRequestData, FlowResponseData, TemplateComponent } from '../../core/interfaces';
import type { UniversalOptions } from '../../types';
import { proto, type AnyMessageContent, type ProductCreate, type ProductUpdate, type GroupMetadata } from '@whiskeysockets/baileys';
import { CloudNormalizer } from './CloudNormalizer';
import type { CloudMediaResponse, CloudSendMessageResponse, CloudWebhookPayload, CloudMessageBody, CloudCatalogResponse, CloudCommerceSettingsResponse, CloudBusinessProfileResponse, CloudQrListResponse, CloudQrResponse } from './types';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mapCloudError } from './errors';

interface PhoneDetailsResponse {
    id?: string;
    whatsapp_business_account?: {
        id: string;
    };
}

interface CustomButton {
    buttonId: string;
    buttonText: {
        displayText: string;
    };
}

interface CustomMessageContent {
    template?: proto.IMessage['templateMessage'];
    buttons?: CustomButton[];
    text?: string;
}

import { FlowCrypto } from '../../utils/FlowCrypto';

export class CloudAdapter implements CloudAdapterInterface {
    public mode = 'cloud' as const;
    public conf: UniversalOptions['cloudApi'];
    private flowCrypto?: FlowCrypto;
    private requestQueue: { task: () => Promise<unknown>; resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = [];
    private processingQueue = false;
    private lastRequestTime = 0;
    private readonly MIN_REQUEST_INTERVAL = 50; // 20 requests per second max (conservative)

    public capabilities: AdapterCapabilities = {
        hasGroups: true,
        hasNewsletter: false,
        hasStatus: false,
        hasCommunity: false,
        hasBusiness: true,
        hasCall: false,
        hasPrivacy: false,
        hasSticker: true,
        hasLocation: true,
        hasPoll: false,
        hasReaction: true
    };

    public get raw(): unknown {
        return {
            baseUrl: this.baseUrl,
            accessToken: this.options.cloudApi?.accessToken,
            phoneNumberId: this.options.cloudApi?.phoneNumberId,
            fetch: this.fetch.bind(this),
            request: this.apiRequest.bind(this)
        };
    }

    private eventHandlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();
    private baseUrl: string;

    constructor(private options: UniversalOptions) {
        if (!options.cloudApi) throw new Error('Cloud API configuration missing');
        this.baseUrl = `https://graph.facebook.com/v24.0/${options.cloudApi.phoneNumberId}`;
        
        if (options.cloudApi.flowPrivateKey) {
            this.flowCrypto = new FlowCrypto({
                privateKey: options.cloudApi.flowPrivateKey
            });
        }
    }

    async connect(): Promise<void> {
        const port = this.options.cloudApi?.port || 3000;

        if (typeof Bun !== 'undefined' && Bun.serve) {
            Bun.serve({
                port,
                fetch: this.fetch.bind(this),
            });
            console.log(`Cloud API Adapter listening on port ${port}`);
        } else {
            try {
                const { createServer } = await import('node:http');
                const server = createServer(async (req, res) => {
                    try {
                        const url = new URL(req.url || '', `http://${req.headers.host}`);

                        if (req.method === 'GET') {
                            const mode = url.searchParams.get('hub.mode');
                            const token = url.searchParams.get('hub.verify_token');
                            const challenge = url.searchParams.get('hub.challenge');

                            if (mode === 'subscribe' && token === this.options.cloudApi!.webhookVerifyToken) {
                                console.log('✅ Webhook verified successfully!');
                                res.writeHead(200);
                                res.end(challenge);
                                return;
                            }
                            console.error('❌ Webhook verification failed! Token mismatch.');
                            res.writeHead(403);
                            res.end('Forbidden');
                            return;
                        }

                        if (req.method === 'POST') {
                            const chunks: Buffer[] = [];
                            let receivedLength = 0;
                            // 1MB limit
                            const MAX_BODY_SIZE = 1024 * 1024;

                            req.on('data', (chunk) => {
                                receivedLength += chunk.length;
                                if (receivedLength > MAX_BODY_SIZE) {
                                    req.destroy();
                                    return;
                                }
                                chunks.push(chunk);
                            });
                            req.on('end', () => {
                                if (receivedLength > MAX_BODY_SIZE) return; // Already destroyed

                                try {
                                    const rawBody = Buffer.concat(chunks).toString();
                                    const signature = req.headers['x-hub-signature-256'] as string;

                                    if (this.options.cloudApi?.appSecret && !this.verifySignature(rawBody, signature)) {
                                        res.writeHead(403);
                                        res.end('Forbidden');
                                        return;
                                    }

                                    const body = JSON.parse(rawBody) as CloudWebhookPayload;
                                    this.processWebhook(body);
                                    res.writeHead(200);
                                    res.end('OK');
                                } catch (error) {
                                    console.error('Webhook parsing error:', error);
                                    res.writeHead(500);
                                    res.end('Internal Server Error');
                                }
                            });
                            return;
                        }
                        res.writeHead(404);
                        res.end('Not Found');
                    } catch (error) {
                        console.error('Request handling error:', error);
                        res.writeHead(500);
                        res.end('Internal Server Error');
                    }
                });

                server.listen(port, () => {
                    console.log(`Cloud API Adapter listening on port ${port} (Node.js)`);
                });
            } catch (error) {
                console.warn('Failed to start Node.js server. Ensure you are running in a compatible environment or use handleWebhook with your own server.', error);
            }
        }

        this.emit('ready');
    }

    /**
     * Start a standalone server.
     * Supports Bun.serve and Node.js http.
     */
    async listen(port: number = 3000, path: string = '/webhook'): Promise<void> {
        // 1. DETECT BUN RUNTIME
        // Bun types might not be globally present in all envs
        if (typeof Bun !== 'undefined') {
            this.startBunServer(port, path);
            return;
        }

        // 2. FALLBACK TO NODE.JS
        this.startNodeServer(port, path);
    }

    private startBunServer(port: number, path: string) {
        console.log(`🚀 wts-core (Cloud) running on Bun at http://0.0.0.0:${port}${path}`);
        
        Bun.serve({
            port,
            fetch: async (req: Request) => {
                const url = new URL(req.url);
                
                // Only handle the specific webhook path
                if (url.pathname === path) {
                    // Pass strict env/ctx as undefined, adapter handles standard web request
                    return this.handleWebhook(req);
                }
                
                return new Response('Not Found', { status: 404 });
            },
        });
    }

    private startNodeServer(port: number, path: string) {
        console.log(`🚀 wts-core (Cloud) running on Node.js at http://0.0.0.0:${port}${path}`);

        const server = createServer(async (req, res) => {
            // Simple routing
            const reqUrl = parseUrl(req.url || '', true);
            
            if (reqUrl.pathname !== path) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }

            try {
                // Convert Node.js IncomingMessage to Web Standard Request
                // This is required because handleWebhook expects a standard Request object
                const webRequest = await this.nodeRequestToWebRequest(req);
                
                // Handle via existing logic
                const response = await this.handleWebhook(webRequest);

                // Write response back to Node.js ServerResponse
                res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
                res.end(await response.text());
            } catch (error) {
                console.error('Webhook Error:', error);
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        });

        server.listen(port);
    }

    // Helper to convert Node stream to Web Standard Request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async nodeRequestToWebRequest(nodeReq: any): Promise<Request> {
        const headers = new Headers();
        for (const [key, value] of Object.entries(nodeReq.headers)) {
            if (Array.isArray(value)) {
                value.forEach(v => headers.append(key, v as string));
            } else if (typeof value === 'string') {
                headers.set(key, value);
            }
        }

        const method = nodeReq.method || 'GET';
        let body = null;

        if (method !== 'GET' && method !== 'HEAD') {
            // Read buffer
            const buffers = [];
            for await (const chunk of nodeReq) {
                buffers.push(chunk);
            }
            body = Buffer.concat(buffers);
        }

        return new Request(`http://${nodeReq.headers.host}${nodeReq.url}`, {
            method,
            headers,
            body
        });
    }

    public handleFlowRequest = async (req: Request): Promise<Response> => {
        if (!this.flowCrypto) {
            console.error("Flow Private Key not configured in CloudAdapter");
            return new Response("Flow encryption not configured", { status: 500 });
        }

        try {
             
            const body = await req.json() as { encrypted_flow_data: string; encrypted_aes_key: string; initial_vector: string };
            
            if (!body.encrypted_flow_data || !body.encrypted_aes_key || !body.initial_vector) {
                return new Response("Missing required encryption fields", { status: 400 });
            }

            const { decryptedBody, aesKey, iv } = await this.flowCrypto.decryptRequest(
                body.encrypted_flow_data,
                body.encrypted_aes_key,
                body.initial_vector
            );

            const responseData = await this.processFlowLogic(decryptedBody as unknown as FlowRequestData);

            const encryptedResponse = await this.flowCrypto.encryptResponse(
                responseData,
                aesKey,
                iv
            );

            return new Response(encryptedResponse, { status: 200 });
        } catch (error) {
            console.error("Flow processing error:", error);
            return new Response("Error processing flow", { status: 500 });
        }
    }

    public onFlowRequest?: (data: FlowRequestData) => Promise<FlowResponseData>;

    private async processFlowLogic(data: FlowRequestData): Promise<FlowResponseData> {
        if (this.onFlowRequest) {
            return await this.onFlowRequest(data);
        }
        console.warn("No flow request handler registered. Returning empty success.");
        return { screen: "SUCCESS", data: {} };
    }

    async disconnect(): Promise<void> {
        // Stateless
    }

    public fetch = async (req: Request, env?: unknown, ctx?: unknown): Promise<Response> => {
        try {
            const url = new URL(req.url);

            if (req.method === 'GET') {
                const mode = url.searchParams.get('hub.mode');
                const token = url.searchParams.get('hub.verify_token');
                const challenge = url.searchParams.get('hub.challenge');

                if (mode === 'subscribe' && token === this.options.cloudApi!.webhookVerifyToken) {
                    console.log('✅ Webhook verified successfully!');
                    return new Response(challenge, { status: 200 });
                }
                console.error('❌ Webhook verification failed! Token mismatch.');
                return new Response('Forbidden', { status: 403 });
            }

            if (req.method === 'POST') {
                const rawBody = await req.text();
                const signature = req.headers.get('x-hub-signature-256');

                if (this.options.cloudApi?.appSecret && !this.verifySignature(rawBody, signature)) {
                    return new Response('Forbidden', { status: 403 });
                }

                const body = JSON.parse(rawBody) as CloudWebhookPayload;
                this.processWebhook(body, env, ctx);
                return new Response('OK', { status: 200 });
            }

            return new Response('Not Found', { status: 404 });
        } catch (error) {
            console.error('Webhook handling error:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    async handleWebhook(req: Request, env?: unknown, ctx?: unknown): Promise<Response> {
        return this.fetch(req, env, ctx);
    }

    private verifySignature(payload: string, signature?: string | null): boolean {
        if (!signature) return false;
        const secret = this.options.cloudApi?.appSecret;
        if (!secret) return true;

        const parts = signature.split('=');
        const sigHex = (parts.length === 2 ? parts[1] : signature) || '';
        
        const hmac = createHmac('sha256', secret);
        hmac.update(payload);
        const digest = hmac.digest();
        const sigBuffer = Buffer.from(sigHex, 'hex');

        if (digest.length !== sigBuffer.length) return false;
        return timingSafeEqual(digest, sigBuffer);
    }

    async updateProfilePicture(jid: string, buffer: Buffer): Promise<void> {
        const cleanId = jid.replace('@g.us', '');
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'profile.jpg');
        
        const url = `https://graph.facebook.com/v24.0/${cleanId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` },
            body: formData
        });
        
        if (!response.ok) {
            const data = await response.json() as { error: unknown };
            throw mapCloudError(data.error);
        }
    }

    async removeProfilePicture(jid: string): Promise<void> {
        void jid;
        throw new Error('Method not implemented.');
    }

    async updateStatus(status: string): Promise<void> {
        void status;
        throw new Error('Method not implemented.');
    }

    async updateName(name: string): Promise<void> {
        void name;
        throw new Error('Method not implemented.');
    }

    getMe(): { id: string; name?: string } | undefined {
        if (this.options.cloudApi?.phoneNumberId) {
            return { id: this.options.cloudApi.phoneNumberId, name: "WhatsApp Bot" };
        }
        return undefined;
    }

    async fetchPrivacySettings(force?: boolean): Promise<unknown> {
        void force;
        return {};
    }

    async updatePrivacySetting(type: string, value: string): Promise<void> {
        void type; void value;
    }

    async sendStatus(content: AnyMessageContent): Promise<void> {
        void content;
    }

    private processWebhook(body: CloudWebhookPayload, env?: unknown, ctx?: unknown) {
        if (!body.entry) return;

        for (const entry of body.entry) {
            if (!entry.changes) continue;

            for (const change of entry.changes) {
                const value = change.value;
                if (!value) continue;

                if (value.messages) {
                    for (const msg of value.messages) {
                        const normalized = CloudNormalizer.normalizeMessage(msg, value.metadata, value.contacts);
                        this.emit('message', normalized, env, ctx);
                        this.emit('messages.upsert', { messages: [normalized], type: 'notify' }, env, ctx);
                    }
                }

                if (value.statuses) {
                    for (const status of value.statuses) {
                        let statusString = 'UNKNOWN';
                        switch (status.status) {
                            case 'sent': statusString = 'SENT'; break;
                            case 'delivered': statusString = 'DELIVERED'; break;
                            case 'read': statusString = 'READ'; break;
                            case 'failed': statusString = 'FAILED'; break;
                            case 'played': statusString = 'PLAYED'; break;
                        }
                        
                        // Include pricing info if available
                        const pricing = status.pricing ? {
                            billable: status.pricing.billable,
                            model: status.pricing.pricing_model,
                            category: status.pricing.category,
                            type: status.pricing.type
                        } : undefined;

                        this.emit('message.status', { 
                            id: status.id, 
                            status: statusString, 
                            remoteJid: status.recipient_id, 
                            fromMe: true,
                            pricing 
                        });
                    }
                }

                // --- Group Webhooks ---

                if (value.group_lifecycle_update) {
                    const update = value.group_lifecycle_update;
                    if (update.type === 'group_create') {
                        this.emit('groups.upsert', [{
                            id: update.group_id,
                            subject: update.subject,
                            creation: parseInt(update.timestamp),
                            inviteCode: update.invite_link?.split('/').pop(),
                            joinApprovalMode: update.join_approval_mode
                        }]);
                    } else if (update.type === 'group_delete') {
                        this.emit('groups.update', [{
                            id: update.group_id,
                            action: 'delete'
                        }]);
                    }
                }

                if (value.group_participants_update) {
                    const update = value.group_participants_update;
                    
                    if (update.type === 'group_participants_add' || update.type === 'group_participants_remove') {
                        const action = update.type === 'group_participants_add' ? 'add' : 'remove';
                        const participants = (update.added_participants || update.removed_participants || [])
                            .map(p => p.wa_id || p.input || '')
                            .filter(id => id !== '');

                        if (participants.length > 0) {
                            this.emit('group-participants.update', {
                                id: update.group_id,
                                participants,
                                action,
                                author: update.initiated_by === 'business' ? this.getMe()?.id : undefined
                            });
                        }
                    } else if (update.type === 'group_join_request_created' || update.type === 'group_join_request_revoked') {
                        // Emit a custom event for join requests
                        this.emit('group.join-request', {
                            id: update.group_id,
                            participant: update.wa_id,
                            requestId: update.join_request_id,
                            type: update.type === 'group_join_request_created' ? 'create' : 'revoke'
                        });
                    }
                }

                if (value.group_settings_update) {
                    const update = value.group_settings_update;
                    const changes: { id: string; subject?: string; desc?: string; icon?: boolean } = { id: update.group_id };
                    
                    if (update.group_subject?.update_successful) {
                        changes.subject = update.group_subject.text;
                    }
                    if (update.group_description?.update_successful) {
                        changes.desc = update.group_description.text;
                    }
                    if (update.profile_picture?.update_successful) {
                        changes.icon = true; // Flag that icon changed
                    }

                    this.emit('groups.update', [changes]);
                }
                
                if (value.group_status_update) {
                     const update = value.group_status_update;
                     this.emit('groups.update', [{
                         id: update.group_id,
                         suspended: update.type === 'group_suspend'
                     }]);
                }

                if (value.message_template_status_update) {
                    const update = value.message_template_status_update;
                    this.emit('template_status_update', {
                        event: update.event,
                        reason: update.reason,
                        templateName: update.message_template_name,
                        language: update.message_template_language
                    });
                }
            }
        }
    }

    public async apiRequest(endpoint: string, method: string, body?: unknown): Promise<unknown> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                task: async () => {
                    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
                    const response = await fetch(url, {
                        method,
                        headers: {
                            'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: body ? JSON.stringify(body) : undefined
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const error = (data as any).error;
                        throw mapCloudError(error);
                    }
                    return data;
                },
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.processingQueue) return;
        this.processingQueue = true;

        while (this.requestQueue.length > 0) {
            const now = Date.now();
            const timeSinceLast = now - this.lastRequestTime;
            
            if (timeSinceLast < this.MIN_REQUEST_INTERVAL) {
                await new Promise(r => setTimeout(r, this.MIN_REQUEST_INTERVAL - timeSinceLast));
            }

            const item = this.requestQueue.shift();
            if (item) {
                this.lastRequestTime = Date.now();
                try {
                    const result = await item.task();
                    item.resolve(result);
                } catch (e) {
                    item.reject(e);
                }
            }
        }

        this.processingQueue = false;
    }

    private parseVCard(vcard: string): { name: { formatted_name: string; first_name: string }; phones: Array<{ phone: string; type: string; wa_id?: string }> } {
        const nameMatch = vcard.match(/FN:(.+)/);
        const name = nameMatch?.[1]?.trim() || 'Unknown';
        
        const telMatch = vcard.match(/TEL;.*:(.+)/);
        const phone = telMatch?.[1]?.trim() || '';
        
        const waidMatch = vcard.match(/waid=([\d]+)/);
        const waId = waidMatch?.[1];

        return {
            name: {
                formatted_name: name,
                first_name: name.split(' ')[0] || name
            },
            phones: phone ? [{
                phone: phone,
                type: 'Mobile',
                wa_id: waId
            }] : []
        };
    }

    async sendMessage(jid: string, content: AnyMessageContent, options?: SendMessageOptions): Promise<proto.IWebMessageInfo | undefined> {
        // Determine if this is a group message based on JID format or explicit option
        // Group JIDs usually contain a hyphen (e.g., 123-456@g.us) or are longer/specific format in Cloud API
        // Cloud API group IDs are just numeric strings usually, but we can rely on explicit option or heuristic
        
        // Standardize JID: remove @g.us or @s.whatsapp.net if present to get ID
        const cleanId = jid.replace(/@(g\.us|s\.whatsapp\.net)/, '');
        
        // Heuristic: If explicit option is set, use it. 
        // Otherwise, check if it looks like a phone number (simple check). 
        // Groups in Cloud API are numeric IDs too, so explicit type is safer.
        const isGroup = options?.recipientType === 'group' || (jid.includes('@g.us')) || (jid.length > 18 && !jid.includes('@')); // Basic length check for Group IDs vs Phone numbers
        
        const body: CloudMessageBody = {
            messaging_product: 'whatsapp',
            to: cleanId,
            recipient_type: isGroup ? 'group' : 'individual'
        };

        // Unwrap viewOnceMessage
         
        if ('viewOnceMessage' in content) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const viewOnce = (content as any).viewOnceMessage;
            if (viewOnce.message) {
                content = viewOnce.message;
            }
        }

        if ('text' in content && typeof content.text === 'string') {
            body.type = 'text';
            body.text = { body: content.text };
        } else if ('image' in content) {
            body.type = 'image';
            const imgContent = content.image as { url?: string; id?: string };
            if (imgContent.url) body.image = { link: imgContent.url };
            else if (imgContent.id) body.image = { id: imgContent.id };
        } else if ('audio' in content) {
            body.type = 'audio';
            const audioContent = content.audio as { url?: string; id?: string; ptt?: boolean; voice?: boolean };
            const audioBody: { link?: string; id?: string; voice?: boolean } = {};
            
            if (audioContent.url) audioBody.link = audioContent.url;
            else if (audioContent.id) audioBody.id = audioContent.id;
            
            // Handle Voice Message Flag (ptt -> voice)
            // Map Baileys 'ptt' boolean or explicit 'voice' boolean to Cloud API 'voice' boolean
            if (audioContent.ptt === true || audioContent.voice === true) {
                audioBody.voice = true;
            }
            
            body.audio = audioBody;
        } else if ('template' in content) {
            body.type = 'template';
            body.template = (content as unknown as CustomMessageContent).template;
        } else if ('sticker' in content) {
            body.type = 'sticker';
            // Check for Buffer (uploaded media)
            if (Buffer.isBuffer(content.sticker)) {
                const { id } = await this.uploadMedia(content.sticker, 'image', 'sticker.webp', 'image/webp');
                body.sticker = { id };
            } else {
                const stickerContent = content.sticker as { url?: string; id?: string };
                if (stickerContent.url) body.sticker = { link: stickerContent.url };
                else if (stickerContent.id) body.sticker = { id: stickerContent.id };
            }
        } else if ('location' in content) {
            body.type = 'location';
            // Baileys uses degreesLatitude/Longitude, Cloud API uses latitude/longitude
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const loc = content.location as any;
            body.location = {
                latitude: loc.degreesLatitude || loc.latitude,
                longitude: loc.degreesLongitude || loc.longitude,
                name: loc.name,
                address: loc.address
            };
        } else if ('contacts' in content) {
            body.type = 'contacts';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contacts = (content.contacts as { contacts: any[] }).contacts;
            body.contacts = contacts.map(c => {
                if (c.vcard && !c.name) {
                    return this.parseVCard(c.vcard);
                }
                return c;
            });
        } else if ('react' in content) {
            body.type = 'reaction';
            body.reaction = {
                message_id: content.react.key?.id || '',
                emoji: content.react.text || ''
            };
        } else if ('stickerMessage' in content) {
            body.type = 'sticker';
             
            body.sticker = {
                id: (content.stickerMessage as { stickerId?: string }).stickerId || ''
            };
        } else if ('poll' in content || 'pollCreationMessage' in content) {
            throw new Error('Polls are not currently supported in Cloud API.');
        } else if ('interactiveMessage' in content) {
            body.type = 'interactive';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            body.interactive = this.transformInteractive((content as any).interactiveMessage);
        }

        if (options?.quoted?.key?.id) {
            body.context = { message_id: options.quoted.key.id };
        }

        const res = await this.apiRequest('/messages', 'POST', body) as CloudSendMessageResponse;
        
        const msgInfo: proto.IWebMessageInfo = {
            key: { remoteJid: jid, fromMe: true, id: res.messages?.[0]?.id },
            message: this.contentToProto(content),
            messageTimestamp: Date.now() / 1000,
            status: proto.WebMessageInfo.Status.SERVER_ACK
        };

        this.emit('messages.upsert', { messages: [msgInfo], type: 'append' });

        return msgInfo;
    }

    private contentToProto(content: AnyMessageContent): proto.IMessage {
        const message: proto.IMessage = {};

        if ('text' in content && typeof content.text === 'string') {
            message.conversation = content.text;
        } else if ('image' in content) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const img = content.image as any;
            message.imageMessage = {
                url: img.url,
                caption: img.caption,
                mimetype: 'image/jpeg'
            };
        } else if ('video' in content) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const vid = content.video as any;
            message.videoMessage = {
                url: vid.url,
                caption: vid.caption,
                mimetype: 'video/mp4'
            };
        } else if ('audio' in content) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const aud = content.audio as any;
            message.audioMessage = {
                url: aud.url,
                mimetype: aud.mimetype || 'audio/mp4',
                ptt: aud.ptt
            };
        } else if ('sticker' in content) {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const st = content.sticker as any;
             message.stickerMessage = {
                 url: st.url
             };
        } else if ('location' in content) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const loc = content.location as any;
            message.locationMessage = {
                degreesLatitude: loc.degreesLatitude,
                degreesLongitude: loc.degreesLongitude,
                name: loc.name,
                address: loc.address
            };
        } else if ('interactiveMessage' in content) {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             message.interactiveMessage = content.interactiveMessage as any;
        }

        return message;
    }


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private transformInteractive(interactive: any): Record<string, unknown> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: Record<string, any> = {
            body: interactive.body,
            footer: interactive.footer
        };

        // Handle Header
        if (interactive.header) {
            if (interactive.header.title) {
                result.header = {
                    type: 'text',
                    text: interactive.header.title
                };
            } else if (interactive.header.imageMessage) {
                 result.header = {
                    type: 'image',
                    image: { 
                        id: interactive.header.imageMessage.id,
                        link: interactive.header.imageMessage.url 
                    } 
                 };
                 // Clean up undefined
                 if (!result.header.image.id) delete result.header.image.id;
                 if (!result.header.image.link) delete result.header.image.link;
            } else if (interactive.header.videoMessage) {
                 result.header = {
                    type: 'video',
                    video: { 
                        id: interactive.header.videoMessage.id,
                        link: interactive.header.videoMessage.url 
                    } 
                 };
                 if (!result.header.video.id) delete result.header.video.id;
                 if (!result.header.video.link) delete result.header.video.link;
            } else if (interactive.header.documentMessage) {
                result.header = {
                   type: 'document',
                   document: { 
                       id: interactive.header.documentMessage.id,
                       link: interactive.header.documentMessage.url,
                       filename: interactive.header.documentMessage.fileName
                   } 
                };
                if (!result.header.document.id) delete result.header.document.id;
                if (!result.header.document.link) delete result.header.document.link;
           }
        }

        // Handle Native Flow (Buttons, List, etc.)
        if (interactive.nativeFlowMessage) {
            const buttons = interactive.nativeFlowMessage.buttons;
            if (buttons && buttons.length > 0) {
                const firstBtn = buttons[0];
                const params = firstBtn.buttonParamsJson ? JSON.parse(firstBtn.buttonParamsJson) : {};

                if (firstBtn.name === 'quick_reply') {
                    result.type = 'button';
                    result.action = {
                        buttons: buttons
                            .filter((btn: { name?: string }) => btn.name === 'quick_reply')
                            .map((btn: { buttonParamsJson?: string }) => {
                                const p = JSON.parse(btn.buttonParamsJson || '{}');
                                return {
                                    type: 'reply',
                                    reply: {
                                        id: p.id,
                                        title: p.display_text
                                    }
                                };
                            })
                    };
                } else if (firstBtn.name === 'single_select') {
                    result.type = 'list';
                    result.action = {
                        button: params.title,
                        sections: params.sections
                    };
                } else if (firstBtn.name === 'cta_url') {
                    result.type = 'cta_url';
                    result.action = {
                        name: 'cta_url',
                        parameters: {
                            display_text: params.display_text,
                            url: params.url
                        }
                    };
                }
            }
        } else if (interactive.carouselMessage) {
            result.type = 'carousel';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cards = interactive.carouselMessage.cards.map((card: any, index: number) => {
                const cardBtn = card.nativeFlowMessage?.buttons?.[0];
                const cardParams = cardBtn?.buttonParamsJson ? JSON.parse(cardBtn.buttonParamsJson) : {};
                
                // Construct header
                let header = undefined;
                if (card.header) {
                     if (card.header.imageMessage) {
                        header = {
                            type: 'image',
                            image: { 
                                id: card.header.imageMessage.id,
                                link: card.header.imageMessage.url 
                            }
                        };
                     } else if (card.header.videoMessage) {
                        header = {
                            type: 'video',
                            video: { 
                                id: card.header.videoMessage.id,
                                link: card.header.videoMessage.url 
                            }
                        };
                     }
                }

                // Cloud API carousels only support cta_url and product types
                // quick_reply buttons are not supported in carousels
                if (cardBtn?.name === 'cta_url') {
                    return {
                        card_index: index,
                        type: 'cta_url',
                        header: header,
                        body: { text: card.body?.text || card.body },
                        action: {
                            name: 'cta_url',
                            parameters: {
                                display_text: cardParams.display_text,
                                url: cardParams.url
                            }
                        }
                    };
                } else {
                    // Default to product type or cta_url if no valid button
                    // For now, skip cards without proper cta_url buttons
                    console.warn('Carousel cards require cta_url buttons. Card will be skipped.');
                    return null;
                }
            }).filter(Boolean); // Remove null cards
            
            result.action = { cards };
        }

        return result;
    }

    // --- Templates Management ---
    async createTemplate(name: string, category: string, components: TemplateComponent[], language: string) {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const wabaId = phoneDetails.whatsapp_business_account?.id;
        if (!wabaId) throw new Error('Could not retrieve WABA ID');

        const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, category, components: components as unknown, language })
        });
        return response.json();
    }

    async updateTemplate(name: string, components: TemplateComponent[]) {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const wabaId = phoneDetails.whatsapp_business_account?.id;
        // Note: Update usually requires ID, but name lookup is common pattern or we assume ID is passed as name
        // For parity with pywa, we might need to look up ID first or use a different endpoint.
        // Assuming ID is passed for now or using name if API supports it (Cloud API usually needs ID).
        // Let's assume we need to find it first or just use the ID.
        const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates/${name}`; 
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ components })
        });
        return response.json();
    }

    async getTemplates(limit = 25) {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const wabaId = phoneDetails.whatsapp_business_account?.id;
        const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?limit=${limit}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        return response.json();
    }
    
    async getFlowMetrics(flowId: string, granularity: string, start: string, end: string) {
        const params = new URLSearchParams({
            granularity,
            start,
            end
        });
        return this.apiRequest(`https://graph.facebook.com/v24.0/${flowId}/metrics?${params.toString()}`, 'GET');
    }

    async deleteTemplate(name: string) {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const wabaId = phoneDetails.whatsapp_business_account?.id;
        const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?name=${name}`;
        await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
    }

    async unpauseTemplate(templateId: string): Promise<{ success: boolean; reason?: string }> {
        return this.apiRequest(`https://graph.facebook.com/v24.0/${templateId}/unpause`, 'POST') as Promise<{ success: boolean; reason?: string }>;
    }

    async compareTemplates(templateId: string, compareWith: string[], start: number, end: number) {
        const params = new URLSearchParams({
            template_ids: compareWith.join(','),
            start: start.toString(),
            end: end.toString()
        });
        return this.apiRequest(`https://graph.facebook.com/v24.0/${templateId}/compare?${params.toString()}`, 'GET');
    }

    // --- Account Settings ---
    async getBusinessPhoneNumber() {
        // Retrieves quality rating, verified name, status, etc.
        return this.apiRequest('/', 'GET'); 
    }

    async updateBusinessSettings(settings: { 
        filter_ineligible_numbers?: boolean;
        webhook_configuration?: { override_callback_uri: string; verify_token: string };
    }) {
        return this.apiRequest('/', 'POST', settings);
    }

    async getBlockList(limit = 25, after?: string) {
        let url = `/block_users?limit=${limit}`;
        if (after) url += `&after=${after}`;
        return this.apiRequest(url, 'GET');
    }

    // --- SIP Configuration ---
    async getSIPSettings() {
        return this.apiRequest('/settings?fields=sip', 'GET');
    }

    async updateSIPTrunk(trunks: { ip: string; port?: number }[]) {
        return this.apiRequest('/settings', 'POST', {
            sip: {
                trunks: trunks
            }
        });
    }

    async createFlow(name: string, categories: string[], _flowJson: object) {
        void _flowJson;
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const wabaId = phoneDetails.whatsapp_business_account?.id;
        const url = `https://graph.facebook.com/v24.0/${wabaId}/flows`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, categories })
        });
        const data = await response.json();
        
        // If flowJson is provided, update it immediately (as create only makes draft)
        if (_flowJson && (data as { id?: string }).id) {
            try {
                await this.updateFlowJSON((data as { id: string }).id, _flowJson);
            } catch (e) {
                console.warn('Failed to upload Flow JSON during creation:', e);
            }
        }
        
        return data;
    }

    async updateFlow(flowId: string, params: { name?: string; categories?: string[]; endpoint_uri?: string; application_id?: string }) {
        const url = `https://graph.facebook.com/v24.0/${flowId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });
        return response.json();
    }

    async updateFlowJSON(flowId: string, flowJson: object, name = 'flow.json') {
        const url = `https://graph.facebook.com/v24.0/${flowId}/assets`;
        const formData = new FormData();
        
        const jsonString = JSON.stringify(flowJson);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        formData.append('file', blob, name);
        formData.append('name', name);
        formData.append('asset_type', 'FLOW_JSON');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                // Do not set Content-Type for FormData, fetch handles it with boundary
            },
            body: formData
        });
        return response.json();
    }

    async getFlow(flowId: string, fields?: string) {
        let url = `https://graph.facebook.com/v24.0/${flowId}`;
        if (fields) url += `?fields=${fields}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        return response.json();
    }

    async getFlowAssets(flowId: string) {
        const url = `https://graph.facebook.com/v24.0/${flowId}/assets`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        return response.json();
    }

    async deprecateFlow(flowId: string) {
        const url = `https://graph.facebook.com/v24.0/${flowId}/deprecate`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        return response.json();
    }

    async migrateFlows(destWabaId: string, sourceWabaId: string, flowNames?: string[]) {
        let url = `https://graph.facebook.com/v24.0/${destWabaId}/migrate_flows?source_waba_id=${sourceWabaId}`;
        if (flowNames && flowNames.length > 0) {
            url += `&source_flow_names=${JSON.stringify(flowNames)}`;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        return response.json();
    }

    async publishFlow(flowId: string) {
        const url = `https://graph.facebook.com/v24.0/${flowId}/publish`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
    }

    async deleteFlow(flowId: string) {
        const url = `https://graph.facebook.com/v24.0/${flowId}`;
        await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
    }

    async getFlows() {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const wabaId = phoneDetails.whatsapp_business_account?.id;
        const url = `https://graph.facebook.com/v24.0/${wabaId}/flows`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        return response.json();
    }

    async initiateCall(to: string, sdp: string) {
        return this.apiRequest('/calls', 'POST', {
            messaging_product: 'whatsapp',
            to: to.replace(/\D/g, ''),
            type: 'offer',
            sdp: sdp
        });
    }

    async acceptCall(callId: string, sdp: string) {
        return this.apiRequest(`/calls/${callId}`, 'POST', {
            messaging_product: 'whatsapp',
            type: 'answer',
            sdp: sdp
        });
    }

    async rejectCall(callId: string, _from: string): Promise<void> {
        void _from;
        await this.apiRequest(`/calls/${callId}`, 'POST', {
            messaging_product: 'whatsapp',
            type: 'reject'
        });
    }

    async downloadMedia(message: proto.IWebMessageInfo): Promise<Buffer> {
        let mediaId: string | null | undefined = null;
        if (message.message?.imageMessage?.url) mediaId = message.message.imageMessage.url;
        if (message.message?.videoMessage?.url) mediaId = message.message.videoMessage.url;
        if (message.message?.audioMessage?.url) mediaId = message.message.audioMessage.url;
        if (message.message?.documentMessage?.url) mediaId = message.message.documentMessage.url;
        if (message.message?.stickerMessage?.url) mediaId = message.message.stickerMessage.url;

        if (!mediaId) throw new Error("No media found in message");

        const mediaInfo = await this.getMediaUrl(mediaId);
        if (!mediaInfo?.url) throw new Error("Failed to retrieve media URL");

        const response = await fetch(mediaInfo.url, {
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        
        if (!response.ok) throw new Error(`Failed to download media: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    async chatModify(jid: string, type: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'mute' | 'unmute' | 'clear' | 'delete', options?: { duration?: number; messageId?: string }) {
        if (type === 'pin' || type === 'unpin') {
            if (!options?.messageId) throw new Error('messageId is required for pin/unpin');
            
            const cleanId = jid.replace('@g.us', '');
            const isGroup = jid.includes('@g.us') || (jid.length > 18 && !jid.includes('@'));
            
            const body: { messaging_product: string; recipient_type: string; to: string; type: string; pin: { type: string; message_id: string; expiration_days?: number } } = {
                messaging_product: 'whatsapp',
                recipient_type: isGroup ? 'group' : 'individual',
                to: cleanId,
                type: 'pin',
                pin: {
                    type: type,
                    message_id: options.messageId
                }
            };

            if (type === 'pin') {
                 // Default to 7 days (maximum 30) if not specified? Cloud API requires expiration_days for pin.
                 // Docs: "Pin duration in days. Can be 1 to 30 days."
                 // Options duration is usually in seconds (Baileys) or arbitrary. 
                 // Let's assume options.duration is seconds, convert to days, default to 7.
                 const days = options.duration ? Math.ceil(options.duration / 86400) : 7;
                 body.pin.expiration_days = Math.min(Math.max(days, 1), 30);
            }

            await this.apiRequest('/messages', 'POST', body);
            return;
        }
        
        throw new Error(`chatModify type '${type}' not implemented on Cloud API.`);
    }
    async register(_code: string) {
        void _code;
        throw new Error('Method not implemented.');
    }
    async requestRegistrationCode(_registrationOptions?: unknown) {
        void _registrationOptions;
        throw new Error('Method not implemented.');
    }
    async waitForConnectionUpdate(_update: unknown, _timeout?: number) {
        void _update; void _timeout;
        throw new Error('Method not implemented.');
    }
    async onUnexpectedError(_error: unknown, _msg: string) {
        void _error; void _msg;
        throw new Error('Method not implemented.');
    }
    async onConnectionUpdate(_update: unknown) {
        void _update;
        throw new Error('Method not implemented.');
    }
    async onCredsUpdated() {
        throw new Error('Method not implemented.');
    }
    async onMessage(_message: unknown) {
        void _message;
        throw new Error('Method not implemented.');
    }
    // --- Groups Management (Cloud API) ---
    
    async groupCreate(subject: string, participants: string[], description?: string, joinApprovalMode?: 'approval_required' | 'auto_approve') {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const phoneId = phoneDetails.id; // Use Phone ID for group creation
        
        const url = `https://graph.facebook.com/v24.0/${phoneId}/groups`;
        const body: { messaging_product: string; subject: string; description?: string; join_approval_mode?: string } = { 
            messaging_product: 'whatsapp',
            subject, 
            description
        };
        if (joinApprovalMode) {
            body.join_approval_mode = joinApprovalMode;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        const data = await response.json() as { group_id: string; invite_link?: string };
        
        if (!response.ok) {
             throw mapCloudError((data as { group_id?: string; error?: unknown }).error);
        }

        return {
            id: data.group_id,
            subject,
            creation: Date.now() / 1000,
            owner: undefined, 
            participants: [], 
            desc: description,
            inviteCode: data.invite_link?.split('/').pop(),
        } as unknown as GroupMetadata; 
    }

    async groupLeave(jid: string) {
        // Cloud API: DELETE /<GROUP_ID> deletes the group (if admin).
        // There isn't a distinct "leave" endpoint for business yet, 
        // but deleting it as creator effectively ends it or removes the business.
        const cleanId = jid.replace('@g.us', '');
        const url = `https://graph.facebook.com/v24.0/${cleanId}`;
        await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
    }

    async groupInviteCode(jid: string) {
        const cleanId = jid.replace('@g.us', '');
        const url = `https://graph.facebook.com/v24.0/${cleanId}/invite_link`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        const data = await response.json() as { invite_link: string };
        return data.invite_link?.split('/').pop();
    }

    async groupRevokeInvite(jid: string) {
        const cleanId = jid.replace('@g.us', '');
        const url = `https://graph.facebook.com/v24.0/${cleanId}/invite_link`;
        await fetch(url, {
            method: 'POST', // Docs say POST to reset/revoke
            headers: { 
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messaging_product: 'whatsapp' })
        });
    }

    async groupRequestParticipantsList(jid: string) {
        const cleanId = jid.replace('@g.us', '');
        const url = `https://graph.facebook.com/v24.0/${cleanId}/join_requests`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        const data = await response.json() as { data: unknown[] };
        return data.data || [];
    }

    async groupRequestParticipantsUpdate(jid: string, participants: string[], action: 'approve' | 'reject') {
        const cleanId = jid.replace('@g.us', '');
        const method = action === 'approve' ? 'POST' : 'DELETE';
        const url = `https://graph.facebook.com/v24.0/${cleanId}/join_requests`;
        
        await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                messaging_product: 'whatsapp',
                join_requests: participants 
            })
        });
    }

    async groupParticipantsUpdate(jid: string, participants: string[], action: 'add' | 'remove' | 'promote' | 'demote') {
        const cleanId = jid.replace('@g.us', '');
        
        if (action === 'remove') {
            const url = `https://graph.facebook.com/v24.0/${cleanId}/participants`;
            await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    messaging_product: 'whatsapp',
                    participants: participants.map(p => ({ user: p.replace(/\D/g, '') })) 
                })
            });
            return;
        }
        
        throw new Error(`Action '${action}' is not supported for Cloud Groups API. Use invite links for adding.`);
    }

    async groupUpdateSubject(jid: string, subject: string) {
        const cleanId = jid.replace('@g.us', '');
        const url = `https://graph.facebook.com/v24.0/${cleanId}`;
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                messaging_product: 'whatsapp',
                subject 
            })
        });
    }

    async groupUpdateDescription(jid: string, description: string) {
        const cleanId = jid.replace('@g.us', '');
        const url = `https://graph.facebook.com/v24.0/${cleanId}`;
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.cloudApi!.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                messaging_product: 'whatsapp',
                description 
            })
        });
    }

    async groupFetchAllParticipating(): Promise<Record<string, GroupMetadata>> {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const phoneId = phoneDetails.id;
        
        const url = `https://graph.facebook.com/v24.0/${phoneId}/groups`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        const data = await response.json() as { data?: { groups?: Array<{ id: string; subject?: string; description?: string; participants?: Array<{ wa_id: string; admin?: boolean }>; creation_timestamp?: number; join_approval_mode?: string; total_participant_count?: number }> } };
        
        const groups: Record<string, GroupMetadata> = {};
        if (data.data?.groups) {
            for (const g of data.data.groups) {
                groups[g.id] = {
                    id: g.id,
                    subject: g.subject,
                    creation: parseInt(String(g.creation_timestamp || 0)),
                    owner: undefined,
                    participants: [],
                    desc: undefined
                } as unknown as GroupMetadata;
            }
        }
        return groups;
    }

    async groupAcceptInvite(code: string) {
        void code;
        throw new Error('Method not implemented on Cloud API.');
    }
    async groupAcceptInviteV4(key: string, invite: unknown) {
        void key; void invite;
        throw new Error('Method not implemented on Cloud API.');
    }
    async groupToggleEphemeral(jid: string, ephemeralExpiration: number) {
        void jid; void ephemeralExpiration;
        throw new Error('Method not implemented on Cloud API.');
    }
    async groupSettingUpdate(jid: string, setting: 'announcement' | 'locked' | 'not_announcement' | 'unlocked') {
        void jid; void setting;
        throw new Error('Method not implemented on Cloud API.');
    }
    async groupGetInviteInfo(code: string) {
        void code;
        return undefined;
    }
    async groupMetadata(jid: string) {
        const cleanId = jid.replace('@g.us', '');
        const url = `https://graph.facebook.com/v24.0/${cleanId}?fields=subject,description,participants,creation_timestamp,join_approval_mode,total_participant_count`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` }
        });
        const data = await response.json() as { error?: unknown; id?: string; subject?: string; description?: string; creation_timestamp?: number; participants?: Array<{ wa_id: string; admin?: boolean }>; join_approval_mode?: string; total_participant_count?: number };
        
        if (data.error) throw mapCloudError(data.error);

        return {
            id: data.id,
            subject: data.subject,
            desc: data.description,
            creation: data.creation_timestamp,
            owner: undefined,
            participants: data.participants?.map(p => ({
                id: p.wa_id,
                admin: p.admin ? 'admin' : null
            })) || [],
            joinApprovalMode: data.join_approval_mode,
            size: data.total_participant_count
        } as unknown as GroupMetadata;
    }

    async processingMutex(_task: unknown) {
        void _task;
        throw new Error('Method not implemented.');
    }
    async upsertMessage(_msg: unknown, _type: unknown) {
        void _msg; void _type;
        throw new Error('Method not implemented.');
    }
    async appPatch(_patch: unknown) {
        void _patch;
        throw new Error('Method not implemented.');
    }
    async sendPresenceUpdate(jid: string, type: 'composing' | 'recording' | 'available' | 'unavailable', messageId?: string) {
        void jid;
        
        if (!messageId) return;

        // Only 'composing' and 'recording' are relevant for Cloud API typing indicators
        if (type === 'available' || type === 'unavailable') return;

        // Currently, 'text' is the only confirmed supported type for typing indicators
        const typingType = 'text';

        await this.apiRequest('/messages', 'POST', {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
            typing_indicator: {
                type: typingType
            }
        });
    }
    async presenceSubscribe(_to: string) {
        void _to;
        throw new Error('Method not implemented.');
    }
    async profilePictureUrl(_jid: string, _type?: 'image' | 'preview', _timeout?: number) {
        void _jid; void _type; void _timeout;
        throw new Error('Method not implemented.');
    }
    async onWhatsApp(_jids: string[]) {
        void _jids;
        throw new Error('Method not implemented.');
    }
    async fetchBlocklist() {
        throw new Error('Method not implemented.');
    }
    async updateBlockStatus(_jid: string, _action: 'block' | 'unblock') {
        void _jid; void _action;
        throw new Error('Method not implemented.');
    }

    async resyncAppState(_collections: unknown[]) {
        void _collections;
        throw new Error('Method not implemented.');
    }
    async chatRead(_jid: string, _participant?: string, _messageId?: string) {
        void _jid; void _participant; void _messageId;
        throw new Error('Method not implemented.');
    }
    async unreadMessages(_jid: string, _count: number, _messageId?: string) {
        void _jid; void _count; void _messageId;
        throw new Error('Method not implemented.');
    }
    
    // Implement other required methods from IAdapter
    async getChat(_jid: string) {
        void _jid;
        return null;
    }
    
    async getContact(_jid: string) {
        void _jid;
        return null;
    }

    async getStatus(_jid: string) {
        void _jid;
        return undefined;
    }

    async getProfilePicture(_jid: string) {
        void _jid;
        return undefined;
    }

    async updateMediaMessage(_jid: string, _key: unknown, _media: unknown) {
        void _jid; void _key; void _media;
        throw new Error('Method not implemented.');
    }

    async relayMessage(_jid: string, _message: unknown, _additionalAttributes?: unknown) {
        void _jid; void _message; void _additionalAttributes;
        throw new Error('Method not implemented.');
    }

    async refreshMediaConn(_forceGet?: boolean) {
        void _forceGet;
        throw new Error('Method not implemented.');
    }

    async waUploadToServer(_stream: unknown, _options: unknown) {
        void _stream; void _options;
        throw new Error('Method not implemented.');
    }

    async fetchStatus(_jid: string) {
        void _jid;
        throw new Error('Method not implemented.');
    }

    async updateBlocklist(_jid: string, _action: 'block' | 'unblock') {
        void _jid; void _action;
        throw new Error('Method not implemented.');
    }

    async getOrderDetails(_orderId: string, _token: string) {
        void _orderId; void _token;
        throw new Error('Method not implemented.');
    }

    async getProductDetails(_productId: string) {
        void _productId;
        throw new Error('Method not implemented.');
    }

    async getCatalog(_jid: string, _limit?: number) {
        void _jid; void _limit;
        throw new Error('Method not implemented.');
    }

    async getCollections(_jid: string, _limit?: number) {
        void _jid; void _limit;
        throw new Error('Method not implemented.');
    }

    async productCreate(_product: unknown) {
        void _product;
        throw new Error('Method not implemented.');
    }

    async productUpdate(_productId: string, _update: unknown) {
        void _productId; void _update;
        throw new Error('Method not implemented.');
    }

    async productDelete(_productId: string) {
        void _productId;
        throw new Error('Method not implemented.');
    }

    async orderUpdate(_orderId: string, _update: unknown) {
        void _orderId; void _update;
        throw new Error('Method not implemented.');
    }

    async catalogUpdate(_update: unknown) {
        void _update;
        throw new Error('Method not implemented.');
    }

    async collectionCreate(_collection: unknown) {
        void _collection;
        throw new Error('Method not implemented.');
    }

    async collectionUpdate(_collectionId: string, _update: unknown) {
        void _collectionId; void _update;
        throw new Error('Method not implemented.');
    }

    async collectionDelete(_collectionId: string) {
        void _collectionId;
        throw new Error('Method not implemented.');
    }

    async labelCreate(_name: string, _options?: unknown) {
        void _name; void _options;
        throw new Error('Method not implemented.');
    }

    async labelUpdate(_labelId: string, _update: unknown) {
        void _labelId; void _update;
        throw new Error('Method not implemented.');
    }

    async labelDelete(_labelId: string) {
        void _labelId;
        throw new Error('Method not implemented.');
    }

    async getLabels() {
        throw new Error('Method not implemented.');
    }

    async getLabelAssociation(_associationId: string, _type?: unknown) {
        void _associationId; void _type;
        throw new Error('Method not implemented.');
    }

    async getLabelAssociations(_associationId: string, _type?: unknown) {
        void _associationId; void _type;
        throw new Error('Method not implemented.');
    }

    async labelAssociationCreate(_labelId: string, _associationId: string, _type?: unknown) {
        void _labelId; void _associationId; void _type;
        throw new Error('Method not implemented.');
    }

    async labelAssociationDelete(_labelId: string, _associationId: string, _type?: unknown) {
        void _labelId; void _associationId; void _type;
        throw new Error('Method not implemented.');
    }

    async getUserDevices(_jids: string[]) {
        void _jids;
        throw new Error('Method not implemented.');
    }

    // Star/Unstar messages
    async star(_jid: string, _key: proto.IMessageKey, _star: boolean) {
        void _jid; void _key; void _star;
        throw new Error('Method not implemented.');
    }

    // Clear chat history
    async chatClear(_jid: string, _all?: boolean) {
        void _jid; void _all;
        throw new Error('Method not implemented.');
    }

    // Delete chat
    async chatDelete(_jid: string) {
        void _jid;
        throw new Error('Method not implemented.');
    }

    // Message Editing
    async sendMessageEdit(_jid: string, _key: proto.IMessageKey, _text: string): Promise<proto.IWebMessageInfo | undefined> {
        void _jid; void _key; void _text;
        throw new Error('Method not implemented.');
    }

    // Forwarding
    async sendMessageForward(_jid: string, _content: unknown, _options?: unknown) {
        void _jid; void _content; void _options;
        throw new Error('Method not implemented.');
    }

    // Presence
    async sendPresence(_jid: string, _type: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused') {
        void _jid; void _type;
        throw new Error('Method not implemented.');
    }

    // History Sync
    async handleHistorySync(_msg: unknown) {
        void _msg;
        throw new Error('Method not implemented.');
    }
    async getMediaUrl(mediaId: string): Promise<CloudMediaResponse> {
        return this.apiRequest(`https://graph.facebook.com/v24.0/${mediaId}`, 'GET') as Promise<CloudMediaResponse>;
    }

    // Events
    on<T extends unknown[] = unknown[]>(event: string, handler: (...args: T) => void) {
        if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, []);
        this.eventHandlers.get(event)?.push(handler as unknown as (...args: unknown[]) => void);
    }

    private emit(event: string, ...args: unknown[]) {
        this.eventHandlers.get(event)?.forEach(fn => fn(...args));
    }

    // Methods implemented for CloudAdapterInterface
    async readMessage(keys: proto.IMessageKey[]) {
        for (const key of keys) {
            if (key.id) {
                await this.apiRequest('/messages', 'POST', {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: key.id
                });
            }
        }
    }

    async blockContact(jid: string): Promise<void> {
        await this.apiRequest('/block_users', 'POST', {
            messaging_product: 'whatsapp',
            block_users: [{ user: jid.replace(/\D/g, '') }]
        });
    }

    async unblockContact(jid: string): Promise<void> {
        await this.apiRequest('/block_users', 'DELETE', {
            messaging_product: 'whatsapp',
            block_users: [{ user: jid.replace(/\D/g, '') }]
        });
    }

    async isOnWhatsApp(jid: string): Promise<{ jid: string; exists: boolean } | undefined> { 
        void jid;
        return undefined; 
    }

    async businessGetCatalog(_jid: string, limit?: number): Promise<CloudCatalogResponse> {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const wabaId = phoneDetails.whatsapp_business_account?.id;
        return this.apiRequest(`/${wabaId}/catalogs?limit=${limit || 25}`, 'GET') as Promise<CloudCatalogResponse>;
    }

    async businessProductCreate(product: ProductCreate): Promise<unknown> {
        const catalog = await this.businessGetCatalog('') as CloudCatalogResponse;
        if (!catalog.data?.[0]?.id) throw new Error('No catalog found');
        const catalogId = catalog.data[0].id;
        return this.apiRequest(`/${catalogId}/products`, 'POST', product);
    }

    async businessProductUpdate(productId: string, update: ProductUpdate): Promise<unknown> {
        return this.apiRequest(`/${productId}`, 'POST', update);
    }

    async businessProductDelete(productIds: string[]): Promise<unknown> {
        const catalog = await this.businessGetCatalog('') as CloudCatalogResponse;
        if (!catalog.data?.[0]?.id) throw new Error('No catalog found');
        const catalogId = catalog.data[0].id;
        return this.apiRequest(`/${catalogId}/products`, 'DELETE', { data: productIds });
    }

    async businessGetOrderDetails(orderId: string, token: string): Promise<unknown> {
        void token;
        return this.apiRequest(`/${orderId}`, 'GET');
    }

    async getCommerceSettings(): Promise<CloudCommerceSettingsResponse> {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const wabaId = phoneDetails.whatsapp_business_account?.id;
        return this.apiRequest(`/${wabaId}/whatsapp_commerce_settings`, 'GET') as Promise<CloudCommerceSettingsResponse>;
    }

    async updateCommerceSettings(isCartEnabled: boolean, isCatalogVisible: boolean): Promise<unknown> {
        const phoneDetails = await this.apiRequest('/', 'GET') as PhoneDetailsResponse;
        const wabaId = phoneDetails.whatsapp_business_account?.id;
        return this.apiRequest(`/${wabaId}/whatsapp_commerce_settings`, 'POST', {
            is_cart_enabled: isCartEnabled,
            is_catalog_visible: isCatalogVisible
        });
    }

    async businessUpdateProfile(settings: {
        about?: string;
        address?: string;
        email?: string;
        websites?: string[];
        vertical?: string;
    }): Promise<void> {
        await this.apiRequest('/whatsapp_business_profile', 'POST', {
            messaging_product: 'whatsapp',
            ...settings
        });
    }

    async getBusinessProfile(): Promise<CloudBusinessProfileResponse> {
        return this.apiRequest('/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical', 'GET') as Promise<CloudBusinessProfileResponse>;
    }

    async registerPhone(pin: string): Promise<void> {
        await this.apiRequest('/register', 'POST', { messaging_product: 'whatsapp', pin });
    }

    async deregisterPhone(pin: string): Promise<void> {
        await this.apiRequest('/deregister', 'POST', { messaging_product: 'whatsapp', pin });
    }

    async qrCreate(message: string, format: 'png' | 'svg' = 'png'): Promise<{ code: string; url: string }> {
        const res = await this.apiRequest('/message_qrdls', 'POST', {
            messaging_product: 'whatsapp',
            prefilled_message: message,
            generate_qr_image: format.toUpperCase()
        }) as { code: string; qr_image_url: string };
        return { code: res.code, url: res.qr_image_url };
    }

    async qrList(): Promise<CloudQrListResponse['data']> {
        const res = await this.apiRequest('/message_qrdls', 'GET') as { data: CloudQrListResponse['data'] };
        return res.data;
    }

    async qrGet(codeId: string): Promise<CloudQrResponse> {
        return this.apiRequest(`/message_qrdls/${codeId}`, 'GET') as Promise<CloudQrResponse>;
    }

    async qrUpdate(code: string, message: string): Promise<unknown> {
        return this.apiRequest(`/message_qrdls/${code}`, 'POST', {
            messaging_product: 'whatsapp',
            prefilled_message: message
        });
    }

    async qrDelete(code: string): Promise<void> {
        await this.apiRequest(`/message_qrdls/${code}`, 'DELETE');
    }

    async sendProduct(jid: string, catalogId: string, productId: string, text?: string): Promise<proto.IWebMessageInfo | undefined> {
        return this.sendMessage(jid, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: text || '' },
                        action: {
                            catalogId,
                            productRetailerId: productId
                        },
                        nativeFlowMessage: {
                            buttons: [{
                                name: 'product',
                                buttonParamsJson: JSON.stringify({ product_retailer_id: productId })
                            }]
                        }
                    }
                }
            }
        } as unknown as AnyMessageContent);
    }

    async sendMultiProduct(jid: string, catalogId: string, sections: { title: string; productIds: string[] }[], text: string, header?: string): Promise<proto.IWebMessageInfo | undefined> {
        return this.sendMessage(jid, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: header ? { title: header } : undefined,
                        body: { text },
                        nativeFlowMessage: {
                            buttons: [{
                                name: 'product_list',
                                buttonParamsJson: JSON.stringify({
                                    catalog_id: catalogId,
                                    sections: sections.map(s => ({
                                        title: s.title,
                                        product_items: s.productIds.map(id => ({ product_retailer_id: id }))
                                    }))
                                })
                            }]
                        }
                    }
                }
            }
        } as unknown as AnyMessageContent);
    }

    async sendCatalog(jid: string, text?: string, footer?: string): Promise<proto.IWebMessageInfo | undefined> {
        return this.sendMessage(jid, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: text || 'View our catalog' },
                        footer: footer ? { text: footer } : undefined,
                        action: { name: 'catalog_message' }
                    }
                }
            }
        } as unknown as AnyMessageContent);
    }

    async uploadMedia(file: Buffer, type: 'image' | 'video' | 'audio' | 'document', filename?: string, mimeType?: string): Promise<{ id: string }> {
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', new Blob([file], { type: mimeType }), filename);
        formData.append('type', mimeType || type);

        const url = `${this.baseUrl}/media`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.options.cloudApi!.accessToken}` },
            body: formData
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await response.json() as any;
        if (!response.ok) throw new Error(data.error?.message || 'Media upload failed');
        return { id: data.id };
    }

    async deleteMedia(mediaId: string): Promise<void> {
        await this.apiRequest(`https://graph.facebook.com/v24.0/${mediaId}`, 'DELETE');
    }

    // Legacy/Alias methods for CloudAdapterInterface
    async editMessage(jid: string, key: proto.IMessageKey, text: string): Promise<proto.IWebMessageInfo | undefined> {
        return this.sendMessageEdit(jid, key, text);
    }

    async starMessage(jid: string, key: proto.IMessageKey, star: boolean): Promise<void> {
        return this.star(jid, key, star);
    }
}
