import { BaseResource } from './BaseResource';

export class CommunityResource extends BaseResource {
    /**
     * Create a new Community
     */
    async create(subject: string, description?: string) {
        return this.adapter.communityCreate(subject, description);
    }

    /**
     * Deactivate a Community
     */
    async deactivate(jid: string) {
        return this.adapter.communityDeactivate(jid);
    }

    /**
     * Get Community Metadata
     */
    async getMetadata(jid: string) {
        return this.adapter.groupMetadata(jid);
    }
}
