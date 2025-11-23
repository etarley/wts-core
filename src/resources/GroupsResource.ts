import type { IAdapter, CloudAdapterInterface, BaileysAdapterInterface } from '../core/interfaces';
import type { GroupMetadata } from '@whiskeysockets/baileys';

export class GroupsResource {
    constructor(private readonly adapter: IAdapter) {}

    private get cloud(): CloudAdapterInterface {
        if (this.adapter.mode !== 'cloud') throw new Error('This method is only for Cloud API');
        return this.adapter as CloudAdapterInterface;
    }

    private get baileys(): BaileysAdapterInterface {
        if (this.adapter.mode !== 'baileys') throw new Error('This method is only for Baileys');
        return this.adapter as BaileysAdapterInterface;
    }

    /**
     * Create a new Group
     * @param subject Group subject
     * @param participants List of participants to add (JIDs)
     * @param description Group description (optional)
     * @param approvalMode 'auto_approve' | 'approval_required' (Cloud API only)
     */
    async create(subject: string, participants: string[], description?: string, approvalMode: 'auto_approve' | 'approval_required' = 'auto_approve'): Promise<GroupMetadata> {
        if (this.adapter.mode === 'cloud') {
            return this.cloud.groupCreate(subject, participants, description, approvalMode);
        } else {
            return this.baileys.groupCreate(subject, participants, description);
        }
    }

    /**
     * Update Group Info
     */
    async update(groupId: string, updates: { subject?: string; description?: string; join_approval_mode?: string }) {
        if (this.adapter.mode === 'cloud') {
            if (updates.subject) await this.cloud.groupUpdateSubject(groupId, updates.subject);
            if (updates.description) await this.cloud.groupUpdateDescription(groupId, updates.description);
        } 
        
        if (this.adapter.mode === 'baileys') {
             if (updates.subject) await this.baileys.groupUpdateSubject(groupId, updates.subject);
             if (updates.description) await this.baileys.groupUpdateDescription(groupId, updates.description);
        }
    }
    
    /**
     * Get Group Invite Code
     */
    async inviteCode(jid: string): Promise<string | undefined> {
        if (this.adapter.mode === 'cloud') {
            return this.cloud.groupInviteCode(jid);
        } else {
            return this.baileys.groupInviteCode(jid);
        }
    }

    async revokeInvite(jid: string): Promise<void> {
        if (this.adapter.mode === 'cloud') {
             await this.cloud.groupRevokeInvite(jid);
        } else {
             await this.baileys.groupRevokeInvite(jid);
        }
    }
    
    async leave(jid: string): Promise<void> {
        if (this.adapter.mode === 'cloud') {
            await this.cloud.groupLeave(jid);
        } else {
            await this.baileys.groupLeave(jid);
        }
    }
    
    async metadata(jid: string): Promise<GroupMetadata> {
        if (this.adapter.mode === 'cloud') {
            return this.cloud.groupMetadata(jid);
        } else {
            return this.baileys.groupMetadata(jid);
        }
    }
}
