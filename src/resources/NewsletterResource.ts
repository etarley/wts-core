import type { IAdapter } from '../core/interfaces';
import type { NewsletterMetadata } from '@whiskeysockets/baileys';

export class NewsletterResource {
    constructor(private readonly adapter: IAdapter) {}

    async create(name: string, description: string, picture?: Buffer): Promise<NewsletterMetadata> {
        return this.adapter.newsletterCreate(name, description, picture);
    }

    async follow(jid: string): Promise<void> {
        await this.adapter.newsletterFollow(jid);
    }

    async unfollow(jid: string): Promise<void> {
        await this.adapter.newsletterUnfollow(jid);
    }

    async mute(jid: string): Promise<void> {
        await this.adapter.newsletterMute(jid);
    }

    async unmute(jid: string): Promise<void> {
        await this.adapter.newsletterUnmute(jid);
    }

    async update(jid: string, changes: { name?: string; description?: string; picture?: Buffer }): Promise<void> {
        await this.adapter.newsletterUpdate(jid, changes);
    }
}
