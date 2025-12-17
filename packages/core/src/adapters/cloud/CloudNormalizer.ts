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

            // Handle Context (Quoted Message)
            let contextInfo: proto.IContextInfo | undefined;
            if (cloudMsg.context) {
                contextInfo = {
                    stanzaId: cloudMsg.context.id,
                    participant: cloudMsg.context.from,
                    quotedMessage: {
                        conversation: '' // Placeholder as Cloud API doesn't provide quoted content
                    }
                };
            }

            switch (cloudMsg.type) {
                case 'text':
                    if (contextInfo) {
                        message.extendedTextMessage = {
                            text: cloudMsg.text?.body,
                            contextInfo: contextInfo
                        };
                    } else {
                        message.conversation = cloudMsg.text?.body;
                    }
                    break;
                case 'image':
                    message.imageMessage = {
                        url: cloudMsg.image?.id,
                        mimetype: cloudMsg.image?.mime_type,
                        caption: cloudMsg.image?.caption,
                        contextInfo: contextInfo
                    };
                    break;
                case 'video':
                    message.videoMessage = {
                        url: cloudMsg.video?.id,
                        mimetype: cloudMsg.video?.mime_type,
                        caption: cloudMsg.video?.caption,
                        contextInfo: contextInfo
                    };
                    break;
                case 'audio':
                    message.audioMessage = {
                        url: cloudMsg.audio?.id,
                        mimetype: cloudMsg.audio?.mime_type,
                        ptt: cloudMsg.audio?.voice === true,
                        contextInfo: contextInfo
                    };
                    break;
                case 'document':
                    message.documentMessage = {
                        url: cloudMsg.document?.id,
                        mimetype: cloudMsg.document?.mime_type,
                        fileName: cloudMsg.document?.filename,
                        caption: cloudMsg.document?.caption,
                        contextInfo: contextInfo
                    };
                    break;
                case 'location':
                    message.locationMessage = {
                        degreesLatitude: cloudMsg.location?.latitude,
                        degreesLongitude: cloudMsg.location?.longitude,
                        name: cloudMsg.location?.name,
                        address: cloudMsg.location?.address,
                        contextInfo: contextInfo
                    };
                    break;
                case 'interactive':
                    // Basic handling for interactive messages (buttons, lists)
                    if (cloudMsg.interactive?.button_reply) {
                        message.buttonsResponseMessage = {
                            selectedButtonId: cloudMsg.interactive.button_reply.id,
                            selectedDisplayText: cloudMsg.interactive.button_reply.title,
                            contextInfo: contextInfo
                        };
                        // Also set conversation for backward compatibility/simple text access
                        message.conversation = cloudMsg.interactive.button_reply.title;
                    } else if (cloudMsg.interactive?.list_reply) {
                        message.listResponseMessage = {
                            singleSelectReply: {
                                selectedRowId: cloudMsg.interactive.list_reply.id
                            },
                            contextInfo: contextInfo
                        };
                        message.conversation = cloudMsg.interactive.list_reply.title;
                    }
                    break;
                case 'order':
                    message.orderMessage = {
                        orderId: cloudMsg.order?.catalog_id,
                        itemCount: cloudMsg.order?.product_items?.length,
                        status: 1, // Default to PENDING
                        surface: 1, // CATALOG
                        message: cloudMsg.order?.text,
                        contextInfo: contextInfo
                    };
                    break;
                case 'system': {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const ProtocolMessageType = (proto as any).ProtocolMessage?.ProtocolMessageType || (proto as any).ProtocolMessageType;
                    
                    const sysType = cloudMsg.system?.type;
                    if (sysType === 'user_changed_number') {
                         // Map to a notification? For now, just text is fine.
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
