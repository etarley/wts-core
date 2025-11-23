import type { Client } from '../core/Client';

export interface WelcomeConfig {
    onAdd?: (groupId: string, participants: string[], client: Client) => Promise<void>;
    onRemove?: (groupId: string, participants: string[], client: Client) => Promise<void>;
}

import { chat } from './chat';
import type { InferPluginAPI } from '../types';

type ChatClient = Client & InferPluginAPI<[ReturnType<typeof chat>]>;

export const welcome = (config: WelcomeConfig) => ({
    id: 'welcome',
    init: (client: Client) => {
        client.on('group-participants', async (data) => {
            const { group, participants, action } = data;
            
            if (action === 'add') {
                data.participants.forEach(participant => {
                    const chatClient = client as ChatClient;
                    if (chatClient.chat) {
                        chatClient.chat.send(data.group, { text: `Welcome @${participant.split('@')[0]}!`, mentions: [participant] });
                    }
                });
            }
            if (action === 'add' && config.onAdd) {
                await config.onAdd(group, participants, client);
            } else if (action === 'remove' && config.onRemove) {
                await config.onRemove(group, participants, client);
            }
        });
    }
});
