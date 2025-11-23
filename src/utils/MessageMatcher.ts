import { proto } from '@whiskeysockets/baileys';

export type MessageType = 
    | 'text' 
    | 'image' 
    | 'video' 
    | 'gif'
    | 'video_note'
    | 'sticker' 
    | 'audio' 
    | 'voice' 
    | 'document' 
    | 'contact' 
    | 'location' 
    | 'live_location'
    | 'poll' 
    | 'poll_update'
    | 'reaction' 
    | 'protocol' 
    | 'revoke'
    | 'ephemeral_setting'
    | 'history_sync'
    | 'call' 
    | 'group_invite' 
    | 'newsletter'
    | 'newsletter_invite'
    | 'payment_invite' 
    | 'payment_send' 
    | 'payment_request' 
    | 'product' 
    | 'order' 
    | 'list' 
    | 'buttons' 
    | 'template' 
    | 'interactive' 
    | 'native_flow'
    | 'carousel'
    | 'shop'
    | 'list_response'
    | 'buttons_response'
    | 'template_response'
    | 'interactive_response'
    | 'event'
    | 'event_response'
    | 'pin_message'
    | 'system' 
    | 'unknown';

/**
 * Utility to match message types from raw proto content.
 * Helps decouple logic from the Context class.
 */
export const getMessageType = (msg: proto.IMessage | null | undefined): MessageType => {
    if (!msg) return 'unknown';

    // Text
    if (msg.conversation || msg.extendedTextMessage) return 'text';
    
    // Media
    if (msg.imageMessage) return 'image';
    if (msg.videoMessage) return msg.videoMessage.gifPlayback ? 'gif' : 'video';
    if (msg.ptvMessage) return 'video_note';
    if (msg.stickerMessage) return 'sticker';
    if (msg.audioMessage) return msg.audioMessage.ptt ? 'voice' : 'audio';
    if (msg.documentMessage) return 'document';
    
    // Contacts & Location
    if (msg.contactMessage || msg.contactsArrayMessage) return 'contact';
    if (msg.locationMessage) return 'location';
    if (msg.liveLocationMessage) return 'live_location';
    
    // Interactive / UI
    if (msg.listMessage) return 'list';
    if (msg.buttonsMessage) return 'buttons';
    if (msg.templateMessage) return 'template';
    if (msg.interactiveMessage) {
        const content = msg.interactiveMessage;
        if (content.nativeFlowMessage) return 'native_flow';
        if (content.carouselMessage) return 'carousel';
        if (content.shopStorefrontMessage) return 'shop';
        return 'interactive';
    }

    // Responses
    if (msg.listResponseMessage) return 'list_response';
    if (msg.buttonsResponseMessage) return 'buttons_response';
    if (msg.templateButtonReplyMessage) return 'template_response';
    if (msg.interactiveResponseMessage) return 'interactive_response';

    // Polls
    if (msg.pollCreationMessage || msg.pollCreationMessageV2 || msg.pollCreationMessageV3 || msg.pollCreationMessageV4 || msg.pollCreationMessageV5) return 'poll';
    if (msg.pollUpdateMessage) return 'poll_update';
    
    // Reactions & System
    if (msg.reactionMessage || msg.encReactionMessage) return 'reaction';
    if (msg.pinInChatMessage) return 'pin_message';
    if (msg.groupInviteMessage) return 'group_invite';
    
    // Protocol
    if (msg.protocolMessage) {
        const type = msg.protocolMessage.type;
        if (type === proto.Message.ProtocolMessage.Type.REVOKE) return 'revoke';
        if (type === proto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING) return 'ephemeral_setting';
        if (type === proto.Message.ProtocolMessage.Type.HISTORY_SYNC_NOTIFICATION) return 'history_sync';
        return 'protocol';
    }

    // Commerce
    if (msg.productMessage) return 'product';
    if (msg.orderMessage) return 'order';
    if (msg.paymentInviteMessage) return 'payment_invite';
    if (msg.sendPaymentMessage) return 'payment_send';
    if (msg.requestPaymentMessage || msg.cancelPaymentRequestMessage || msg.declinePaymentRequestMessage) return 'payment_request';

    // Events
    if (msg.eventMessage) return 'event';
    
    // Call
    if (msg.call || msg.scheduledCallCreationMessage || msg.scheduledCallEditMessage) return 'call';

    // Misc System
    if (msg.keepInChatMessage || msg.messageContextInfo) return 'system';
    if (msg.newsletterAdminInviteMessage || msg.newsletterFollowerInviteMessageV2) return 'newsletter_invite';

    return 'unknown';
};
