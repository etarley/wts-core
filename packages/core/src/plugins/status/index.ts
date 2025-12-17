import type { AnyMessageContent } from '@whiskeysockets/baileys';
import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';


export const status = () => {
    return {
        id: "status",
        api: (client: Client) => ({
            status: {
                async broadcast(content: AnyMessageContent) {
                    return client.adapter.sendStatus(content);
                }
            }
        })
    } satisfies WtsPlugin;
};

