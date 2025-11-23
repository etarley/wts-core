import { proto } from '@whiskeysockets/baileys';
import type { CloudMessage, CloudValue, CloudContact } from './types';

export class CloudNormalizer {
    static normalizeMessage(cloudMsg: CloudMessage, metadata: CloudValue['metadata'], contacts?: CloudContact[]): proto.IWebMessageInfo {
        try {
            const remoteJid = cloudMsg.group_id || cloudMsg.from;
            const key: proto.IMessageKey = {
                remoteJid,
                fromMe: false,
                id: cloudMsg.id,
            };
            if (cloudMsg.group_id) {
                key.participant = cloudMsg.from;
            }

            const message: proto.IMessage = {};

            switch (cloudMsg.type) {
                case 'text':
                    message.conversation = cloudMsg.text?.body;
                    break;
                case 'image':
                    message.imageMessage = {
                        url: cloudMsg.image?.id, // In Cloud API, we might need to fetch this ID to get the URL
                        mimetype: cloudMsg.image?.mime_type,
                        caption: cloudMsg.image?.caption,
                    };
                    break;
                case 'video':
                    message.videoMessage = {
                        url: cloudMsg.video?.id,
                        mimetype: cloudMsg.video?.mime_type,
                        caption: cloudMsg.video?.caption,
                    };
                    break;
                case 'audio':
                    message.audioMessage = {
                        url: cloudMsg.audio?.id,
                        mimetype: cloudMsg.audio?.mime_type,
                        ptt: cloudMsg.audio?.voice === true,
                    };
                    break;
                case 'document':
                    message.documentMessage = {
                        url: cloudMsg.document?.id,
                        mimetype: cloudMsg.document?.mime_type,
                        fileName: cloudMsg.document?.filename,
                        caption: cloudMsg.document?.caption,
                    };
                    break;
                case 'location':
                    message.locationMessage = {
                        degreesLatitude: cloudMsg.location?.latitude,
                        degreesLongitude: cloudMsg.location?.longitude,
                        name: cloudMsg.location?.name,
                        address: cloudMsg.location?.address,
                    };
                    break;
                case 'interactive':
                    // Basic handling for interactive messages (buttons, lists)
                    // This is a simplification; Baileys has more complex structures for this
                    if (cloudMsg.interactive?.button_reply) {
                        message.conversation = cloudMsg.interactive.button_reply.title;
                    } else if (cloudMsg.interactive?.list_reply) {
                        message.conversation = cloudMsg.interactive.list_reply.title;
                    }
                    break;
                case 'order':
                    message.orderMessage = {
                        orderId: cloudMsg.order?.catalog_id, // Cloud API uses catalog_id as context sometimes, but order details are in product_items
                        itemCount: cloudMsg.order?.product_items?.length,
                        status: 1, // Default to PENDING
                        surface: 1, // CATALOG
                        message: cloudMsg.order?.text,
                        // We might need to map product_items to orderMessage.items if we want full detail
                    };
                    break;
                case 'system': {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const ProtocolMessageType = (proto as any).ProtocolMessage?.ProtocolMessageType || (proto as any).ProtocolMessageType;
                    
                    const sysType = cloudMsg.system?.type;
                    if (sysType === 'user_changed_number') {
                         // Map to a notification? For now, just text is fine, but we could try to map to protocol message if Baileys supports it.
                         // Baileys doesn't have a direct "User Changed Number" protocol message type exposed easily in IMessage usually, 
                         // it's often a stub.
                    }

                    message.protocolMessage = {
                        type: ProtocolMessageType?.EPHEMERAL_SETTING || 3,
                    };
                    
                    let body = cloudMsg.system?.body || 'System Message';
                    if (cloudMsg.system?.identity) {
                        body += ` (Identity: ${cloudMsg.system.identity})`;
                    }
                    if (cloudMsg.system?.wa_id) {
                        body += ` (WA ID: ${cloudMsg.system.wa_id})`;
                    }
                    
                    message.conversation = body;
                    break;
                }
                default:
                    // Fallback for unsupported types
                    message.conversation = `[Unsupported message type: ${cloudMsg.type}]`;
            }

            const contact = contacts?.find(c => c.wa_id === cloudMsg.from);

            return {
                key,
                message,
                pushName: contact?.profile?.name,
                messageTimestamp: parseInt(cloudMsg.timestamp, 10),
            };
        } catch (error) {
            console.error('Error normalizing Cloud API message:', error);
            // Return a minimal valid message to prevent crash
            return {
                key: { remoteJid: cloudMsg.from, fromMe: false, id: cloudMsg.id },
                message: { conversation: '[Error processing message]' },
                messageTimestamp: Date.now() / 1000
            };
        }
    }
}
