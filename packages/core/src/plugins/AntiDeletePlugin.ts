import type { Client } from '../core/Client';
import { Context } from '../core/Context';
import { proto } from '@whiskeysockets/baileys';

/**
 * Anti-Delete Plugin
 * Listens for message revocations and attempts to retrieve the original message from the store.
 */
export const antiDelete = (onRevoke: (ctx: Context, oldMessage: proto.IWebMessageInfo) => Promise<void>) => ({
    id: 'antiDelete',
    init: (client: Client) => {
        client.on('message', async (ctx: Context) => {
            if (ctx.raw.message?.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE) {
                const deletedKey = ctx.raw.message.protocolMessage.key;
                if (deletedKey && deletedKey.remoteJid && deletedKey.id && client.store) {
                    const oldMsg = await client.store.loadMessage(deletedKey.remoteJid, deletedKey.id);
                    
                    if (oldMsg) {
                        await onRevoke(ctx, oldMsg);
                    }
                }
            }
        });
    }
});

