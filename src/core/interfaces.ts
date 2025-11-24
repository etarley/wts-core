import type { AnyMessageContent, proto, GroupMetadata, NewsletterMetadata, ProductCreate, ProductUpdate, WAPrivacyValue, WAPrivacyOnlineValue, WAPrivacyGroupAddValue, WAReadReceiptsValue } from '@whiskeysockets/baileys';

export interface SendMessageOptions {
    quoted?: proto.IWebMessageInfo;
    recipientType?: 'individual' | 'group';
    [key: string]: unknown;
}

export interface TemplateComponent {
    type: 'BODY' | 'HEADER' | 'FOOTER' | 'BUTTONS' | 'LIMITED_TIME_OFFER' | 'OTP';
    text?: string;
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
    buttons?: Array<{
        type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE' | 'FLOW' | 'OTP';
        text?: string;
        url?: string;
        phone_number?: string;
        otp_type?: 'COPY_CODE' | 'ONE_TAP' | 'ZERO_TAP';
        autofill_text?: string;
        package_name?: string;
        signature_hash?: string;
        zero_tap_terms_accepted?: boolean;
        flow_id?: string;
        flow_action?: 'navigate' | 'data_exchange';
        navigate_screen?: string;
    }>;
    example?: {
        header_text?: string[];
        body_text?: string[][];
        header_handle?: string[];
    };
    limited_time_offer?: {
        text: string;
        has_expiration: boolean;
    };
    add_security_recommendation?: boolean;
    code_expiration_minutes?: number;
}

export interface AdapterCapabilities {
    hasGroups: boolean;
    hasNewsletter: boolean;
    hasStatus: boolean;
    hasCommunity: boolean;
    hasBusiness: boolean;
    hasCall: boolean;
    hasPrivacy: boolean;
    hasSticker: boolean;
    hasLocation: boolean;
    hasPoll: boolean;
    hasReaction: boolean;
}

// Common methods available in all adapters
export interface AdapterBase {
    capabilities?: AdapterCapabilities;
    raw: unknown;
    connect(): Promise<void>;
    disconnect(): Promise<void>;

    /**
     * Handle incoming HTTP requests (Webhooks).
     */
    handleWebhook(request: Request, env?: unknown, ctx?: unknown): Promise<Response>;

    sendMessage(
        jid: string,
        content: AnyMessageContent,
        options?: SendMessageOptions
    ): Promise<proto.IWebMessageInfo | undefined>;

    readMessage(keys: proto.IMessageKey[]): Promise<void>;

    downloadMedia(message: proto.IWebMessageInfo): Promise<Buffer>;

    // User Management (Common)
    updateProfilePicture(jid: string, buffer: Buffer): Promise<void>;
    removeProfilePicture(jid: string): Promise<void>;
    updateStatus(status: string): Promise<void>;
    updateName(name: string): Promise<void>;
    getMe(): { id: string; name?: string } | undefined;

    // Contact Management (Common)
    blockContact(jid: string): Promise<void>;
    unblockContact(jid: string): Promise<void>;
    getProfilePicture(jid: string): Promise<string | undefined>;
    getStatus(jid: string): Promise<string | undefined>;
    isOnWhatsApp(jid: string): Promise<{ jid: string; exists: boolean } | undefined>;

    // Status Management (Common)
    sendStatus(content: AnyMessageContent): Promise<void>;

    // Presence Management (Common)
    sendPresenceUpdate(jid: string, type: 'composing' | 'recording' | 'available' | 'unavailable', messageId?: string): Promise<void>;

    // Call Management (Common)
    rejectCall(callId: string, from: string): Promise<void>;

    // Chat Modifications (Common)
    chatModify(jid: string, type: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'mute' | 'unmute' | 'clear' | 'delete', options?: { duration?: number }): Promise<void>;

    // Privacy Settings (Common)
    fetchPrivacySettings(force?: boolean): Promise<unknown>;
    updatePrivacySetting(type: 'last' | 'online' | 'profile' | 'status' | 'readreceipts' | 'groupadd', value: WAPrivacyValue | WAPrivacyOnlineValue | WAPrivacyGroupAddValue | WAReadReceiptsValue): Promise<void>;

    // Events
    on<T extends unknown[] = unknown[]>(event: string, handler: (...args: T) => void): void;
}

export interface BaileysAdapterInterface extends AdapterBase {
    mode: 'baileys';

    // Group Management (Baileys Specific)
    groupFetchAllParticipating(): Promise<Record<string, GroupMetadata>>;
    groupParticipantsUpdate(jid: string, participants: string[], action: 'add' | 'remove' | 'promote' | 'demote'): Promise<void>;
    groupRequestParticipantsList(jid: string): Promise<unknown[]>;
    groupRequestParticipantsUpdate(jid: string, participants: string[], action: 'approve' | 'reject'): Promise<void>;
    groupUpdateSubject(jid: string, subject: string): Promise<void>;
    groupUpdateDescription(jid: string, description: string): Promise<void>;
    groupSettingUpdate(jid: string, setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'): Promise<void>;
    groupInviteCode(jid: string): Promise<string | undefined>;
    groupRevokeInvite(jid: string): Promise<void>;
    groupAcceptInvite(code: string): Promise<string | undefined>;
    groupGetInviteInfo(code: string): Promise<GroupMetadata | undefined>;
    groupLeave(jid: string): Promise<void>;
    groupCreate(subject: string, participants: string[], description?: string): Promise<GroupMetadata>;
    groupMetadata(jid: string): Promise<GroupMetadata>;
    toggleEphemeral(jid: string, duration: number): Promise<void>;

    // Newsletter (Channel) Management (Baileys Specific in this implementation)
    newsletterCreate(name: string, description: string, picture?: Buffer): Promise<NewsletterMetadata>;
    newsletterFollow(jid: string): Promise<void>;
    newsletterUnfollow(jid: string): Promise<void>;
    newsletterMute(jid: string): Promise<void>;
    newsletterUnmute(jid: string): Promise<void>;
    newsletterUpdate(jid: string, changes: { name?: string; description?: string; picture?: Buffer }): Promise<void>;

    // Community Management (Baileys Specific)
    communityCreate(subject: string, description?: string): Promise<GroupMetadata>;
    communityDeactivate(jid: string): Promise<void>;

    // Labels (Baileys Specific)
    addChatLabel(jid: string, labelId: string): Promise<void>;
    removeChatLabel(jid: string, labelId: string): Promise<void>;

    // Contact Management (Baileys Specific)
    fetchBlocklist(): Promise<string[]>;
    
    // Presence Management (Baileys Specific)
    presenceSubscribe(jid: string): Promise<void>;

    // Business Features (Baileys Specific)
    businessGetCatalog(jid: string, limit?: number): Promise<unknown>;
    businessProductCreate(product: ProductCreate): Promise<unknown>;
    businessProductUpdate(productId: string, update: ProductUpdate): Promise<unknown>;
    businessProductDelete(productIds: string[]): Promise<unknown>;

    // Pairing Code (Baileys Specific)
    requestPairingCode(phoneNumber: string): Promise<string>;
}

export interface CloudAdapterInterface extends AdapterBase {
    mode: 'cloud';

    /**
     * Start a standalone server to listen for webhooks.
     * Detects runtime (Bun/Node) automatically.
     * @param port The port to listen on (default: 3000)
     * @param path The path to listen for webhooks (default: /webhook)
     */
    listen(port?: number, path?: string): Promise<void>;

    // --- Templates Management (Cloud API Specific) ---
    createTemplate(name: string, category: string, components: TemplateComponent[], language: string): Promise<unknown>;
    getTemplates(limit?: number): Promise<unknown>;
    deleteTemplate(name: string): Promise<void>;
    unpauseTemplate(templateId: string): Promise<unknown>;
    compareTemplates(templateId: string, compareWith: string[], start: number, end: number): Promise<unknown>;

    // Edit/Star might be supported by Cloud but with limitations, treating as specific for safety or keeping common if implemented
    editMessage(jid: string, key: proto.IMessageKey, text: string): Promise<proto.IWebMessageInfo | undefined>;
    starMessage(jid: string, key: proto.IMessageKey, star: boolean): Promise<void>;

    // --- Flows Management (Cloud API Specific) ---
    createFlow(name: string, categories: string[], flowJson: object): Promise<unknown>;
    publishFlow(flowId: string): Promise<void>;
    deleteFlow(flowId: string): Promise<void>;
    deprecateFlow(flowId: string): Promise<unknown>;
    getFlows(): Promise<unknown>;
    getFlow(flowId: string, fields?: string): Promise<unknown>;
    updateFlow(flowId: string, params: { name?: string; categories?: string[]; endpoint_uri?: string; application_id?: string }): Promise<unknown>;
    updateFlowJSON(flowId: string, flowJson: object, name?: string): Promise<unknown>;
    getFlowAssets(flowId: string): Promise<unknown>;
    migrateFlows(destWabaId: string, sourceWabaId: string, flowNames?: string[]): Promise<unknown>;

    /**
     * Handle encrypted Flow requests from WhatsApp.
     */
    handleFlowRequest(req: Request): Promise<Response>;

    /**
     * Register a handler for Flow logic.
     */
    onFlowRequest?: (data: FlowRequestData) => Promise<FlowResponseData>;

    // Business Features (Cloud API Specific)
    businessGetCatalog(jid: string, limit?: number): Promise<unknown>;
    businessProductCreate(product: ProductCreate): Promise<unknown>;
    businessProductUpdate(productId: string, update: ProductUpdate): Promise<unknown>;
    businessProductDelete(productIds: string[]): Promise<unknown>;
    businessGetOrderDetails(orderId: string, token: string): Promise<unknown>;

    // Account Settings
    getBusinessPhoneNumber(): Promise<unknown>;
    updateBusinessSettings(settings: unknown): Promise<unknown>;
    getBlockList(limit?: number, after?: string): Promise<unknown>;

    // SIP
    getSIPSettings(): Promise<unknown>;
    updateSIPTrunk(trunks: unknown[]): Promise<unknown>;

    // Commerce Settings
    getCommerceSettings(): Promise<unknown>;
    updateCommerceSettings(isCartEnabled: boolean, isCatalogVisible: boolean): Promise<unknown>;

    // Business Profile Management
    businessUpdateProfile(settings: {
        about?: string;
        address?: string;
        email?: string;
        websites?: string[];
        vertical?: string;
    }): Promise<void>;
    getBusinessProfile(): Promise<unknown>;

    // Two-Step Verification
    registerPhone(pin: string): Promise<void>;
    deregisterPhone(pin: string): Promise<void>;

    // QR Codes
    qrCreate(message: string, format?: 'png' | 'svg'): Promise<{ code: string; url: string }>;
    qrList(): Promise<unknown[]>;
    qrGet(codeId: string): Promise<unknown>;
    qrUpdate(code: string, message: string): Promise<unknown>;
    qrDelete(code: string): Promise<void>;

    // --- Commerce Messaging ---
    sendProduct(jid: string, catalogId: string, productId: string, text?: string): Promise<proto.IWebMessageInfo | undefined>;
    sendMultiProduct(jid: string, catalogId: string, sections: { title: string; productIds: string[] }[], text: string, header?: string): Promise<proto.IWebMessageInfo | undefined>;
    sendCatalog(jid: string, text?: string, footer?: string): Promise<proto.IWebMessageInfo | undefined>;

    // --- Group Management (Cloud API) ---
    groupFetchAllParticipating(): Promise<Record<string, GroupMetadata>>;
    groupParticipantsUpdate(jid: string, participants: string[], action: 'add' | 'remove' | 'promote' | 'demote'): Promise<void>;
    groupRequestParticipantsList(jid: string): Promise<unknown[]>;
    groupRequestParticipantsUpdate(jid: string, participants: string[], action: 'approve' | 'reject'): Promise<void>;
    groupUpdateSubject(jid: string, subject: string): Promise<void>;
    groupUpdateDescription(jid: string, description: string): Promise<void>;
    groupInviteCode(jid: string): Promise<string | undefined>;
    groupRevokeInvite(jid: string): Promise<void>;
    groupLeave(jid: string): Promise<void>;
    groupCreate(subject: string, participants: string[], description?: string, joinApprovalMode?: 'approval_required' | 'auto_approve'): Promise<GroupMetadata>;
    groupMetadata(jid: string): Promise<GroupMetadata>;

    // Direct API Access
    apiRequest(endpoint: string, method: string, body?: unknown): Promise<unknown>;

    // Media Management (Direct API)
    uploadMedia(file: Buffer, type: 'image' | 'video' | 'audio' | 'document', filename?: string, mimeType?: string): Promise<{ id: string }>;
    deleteMedia(mediaId: string): Promise<void>;
    getMediaUrl(mediaId: string): Promise<{ url?: string; mime_type?: string; sha256?: string; file_size?: number; id?: string } | undefined>;
}

export interface FlowRequestData {
    screen: string;
    data: Record<string, unknown>;
    version: string;
    action: string;
    flow_token: string;
}

export interface FlowResponseData {
    screen: string;
    data: Record<string, unknown>;
}

export type IAdapter = BaileysAdapterInterface | CloudAdapterInterface;
