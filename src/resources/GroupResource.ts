import type { IAdapter } from '../core/interfaces';

export class GroupResource {
    constructor(private readonly adapter: IAdapter) {}

    async create(subject: string, participants: string[], description?: string) {
        return this.adapter.groupCreate(subject, participants, description);
    }

    async getMetadata(groupJid: string) {
        return this.adapter.groupMetadata(groupJid);
    }

    async promote(groupJid: string, participants: string[]) {
        await this.adapter.groupParticipantsUpdate(groupJid, participants, 'promote');
    }

    async demote(groupJid: string, participants: string[]) {
        await this.adapter.groupParticipantsUpdate(groupJid, participants, 'demote');
    }

    async add(groupJid: string, participants: string[]) {
        await this.adapter.groupParticipantsUpdate(groupJid, participants, 'add');
    }

    async kick(groupJid: string, participants: string[]) {
        await this.adapter.groupParticipantsUpdate(groupJid, participants, 'remove');
    }

    async makeAdmin(groupJid: string, participants: string[]) {
        return this.promote(groupJid, participants);
    }

    async demoteAdmin(groupJid: string, participants: string[]) {
        return this.demote(groupJid, participants);
    }

    async updateSubject(groupJid: string, subject: string) {
        await this.adapter.groupUpdateSubject(groupJid, subject);
    }

    async updateDescription(groupJid: string, description: string) {
        await this.adapter.groupUpdateDescription(groupJid, description);
    }

    async updateSetting(groupJid: string, setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked') {
        await this.adapter.groupSettingUpdate(groupJid, setting);
    }

    async inviteCode(groupJid: string) {
        return this.adapter.groupInviteCode(groupJid);
    }

    async revokeInvite(groupJid: string) {
        await this.adapter.groupRevokeInvite(groupJid);
    }

    async acceptInvite(code: string) {
        return this.adapter.groupAcceptInvite(code);
    }

    async leave(groupJid: string) {
        await this.adapter.groupLeave(groupJid);
    }
}
