
import type { NewsletterMetadata } from '@whiskeysockets/baileys';
import type {WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';
import type { BaileysAdapterInterface } from '../../core/interfaces';

export const newsletter = () => {
    return {
        id: "newsletter",
        api: (client: Client) => ({
            newsletter: {
                async create(name: string, description: string, picture?: Buffer): Promise<NewsletterMetadata> {
                    if (client.supports('hasNewsletter')) {
                        return (client.adapter as BaileysAdapterInterface).newsletterCreate(name, description, picture);
                    }
                    throw new Error('Newsletter not supported by this adapter');
                },
                async follow(jid: string): Promise<void> {
                    if (client.supports('hasNewsletter')) {
                        await (client.adapter as BaileysAdapterInterface).newsletterFollow(jid);
                        return;
                    }
                    throw new Error('Newsletter not supported by this adapter');
                },
                async unfollow(jid: string): Promise<void> {
                    if (client.supports('hasNewsletter')) {
                        await (client.adapter as BaileysAdapterInterface).newsletterUnfollow(jid);
                        return;
                    }
                    throw new Error('Newsletter not supported by this adapter');
                },
                async mute(jid: string): Promise<void> {
                    if (client.supports('hasNewsletter')) {
                        await (client.adapter as BaileysAdapterInterface).newsletterMute(jid);
                        return;
                    }
                    throw new Error('Newsletter not supported by this adapter');
                },
                async unmute(jid: string): Promise<void> {
                    if (client.supports('hasNewsletter')) {
                        await (client.adapter as BaileysAdapterInterface).newsletterUnmute(jid);
                        return;
                    }
                    throw new Error('Newsletter not supported by this adapter');
                },
                async update(jid: string, changes: { name?: string; description?: string; picture?: Buffer }): Promise<void> {
                    if (client.supports('hasNewsletter')) {
                        await (client.adapter as BaileysAdapterInterface).newsletterUpdate(jid, changes);
                        return;
                    }
                    throw new Error('Newsletter not supported by this adapter');
                }
            }
        })
    } satisfies WtsPlugin;
};

