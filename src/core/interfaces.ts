import type { AnyMessageContent, proto, GroupMetadata, NewsletterMetadata, ProductCreate, ProductUpdate, WAPrivacyValue, WAPrivacyOnlineValue, WAPrivacyGroupAddValue, WAReadReceiptsValue } from '@whiskeysockets/baileys';

export interface SendMessageOptions {
    quoted?: proto.IWebMessageInfo;
    [key: string]: unknown;
}

export interface IAdapter {
    mode: 'baileys' | 'cloud';
    connect(): Promise<void>;

    sendMessage(
        jid: string, 
        content: AnyMessageContent, 
        options?: SendMessageOptions
    ): Promise<proto.IWebMessageInfo | undefined>;

    readMessage(keys: proto.IMessageKey[]): Promise<void>;

    // User Management
    updateProfilePicture(jid: string, buffer: Buffer): Promise<void>;
    updateStatus(status: string): Promise<void>;
    updateName(name: string): Promise<void>;
    getMe(): { id: string; name?: string } | undefined;

    // Contact Management
    blockContact(jid: string): Promise<void>;
    unblockContact(jid: string): Promise<void>;
    getProfilePicture(jid: string): Promise<string | undefined>;
    getStatus(jid: string): Promise<string | undefined>;
    isOnWhatsApp(jid: string): Promise<{ jid: string; exists: boolean } | undefined>;

    // Group Management
    groupParticipantsUpdate(jid: string, participants: string[], action: 'add' | 'remove' | 'promote' | 'demote'): Promise<void>;
    groupUpdateSubject(jid: string, subject: string): Promise<void>;
    groupUpdateDescription(jid: string, description: string): Promise<void>;
    groupSettingUpdate(jid: string, setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'): Promise<void>;
    groupInviteCode(jid: string): Promise<string | undefined>;
    groupRevokeInvite(jid: string): Promise<void>;
    groupAcceptInvite(code: string): Promise<string | undefined>;
    groupLeave(jid: string): Promise<void>;
    groupCreate(subject: string, participants: string[]): Promise<GroupMetadata>;
    groupMetadata(jid: string): Promise<GroupMetadata>;
    toggleEphemeral(jid: string, duration: number): Promise<void>;

    // Status Management
    sendStatus(content: AnyMessageContent): Promise<void>;

    // Presence Management
    sendPresenceUpdate(jid: string, type: 'composing' | 'recording' | 'available' | 'unavailable'): Promise<void>;

    // Call Management
    rejectCall(callId: string, from: string): Promise<void>;

    // Newsletter (Channel) Management
    newsletterCreate(name: string, description: string, picture?: Buffer): Promise<NewsletterMetadata>;
    newsletterFollow(jid: string): Promise<void>;
    newsletterUnfollow(jid: string): Promise<void>;
    newsletterMute(jid: string): Promise<void>;
    newsletterUnmute(jid: string): Promise<void>;
    newsletterUpdate(jid: string, changes: { name?: string; description?: string; picture?: Buffer }): Promise<void>;

    // Community Management
    communityCreate(subject: string, description?: string): Promise<GroupMetadata>;
    communityDeactivate(jid: string): Promise<void>;

    // Business Features
    businessGetCatalog(jid: string, limit?: number): Promise<unknown>;
    businessProductCreate(product: ProductCreate): Promise<unknown>;
    businessProductUpdate(productId: string, update: ProductUpdate): Promise<unknown>;
    businessProductDelete(productIds: string[]): Promise<unknown>;
    businessGetOrderDetails(orderId: string, token: string): Promise<unknown>;

    // Chat Modifications
    chatModify(jid: string, type: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'mute' | 'unmute', options?: { duration?: number }): Promise<void>;

    // Privacy Settings
    fetchPrivacySettings(force?: boolean): Promise<unknown>;
    updatePrivacySetting(type: 'last' | 'online' | 'profile' | 'status' | 'readreceipts' | 'groupadd', value: WAPrivacyValue | WAPrivacyOnlineValue | WAPrivacyGroupAddValue | WAReadReceiptsValue): Promise<void>;

    // Events
    on(event: string, handler: (...args: unknown[]) => void): void;
}
