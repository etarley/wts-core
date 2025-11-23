import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';
import type { BaileysAdapterInterface, CloudAdapterInterface } from '../../core/interfaces';
import type { GroupMetadata } from '@whiskeysockets/baileys';

type GroupAdapter = BaileysAdapterInterface | CloudAdapterInterface;

export interface GroupPluginAPI {
    group: {
        list(): Promise<Record<string, GroupMetadata>>;
        create(subject: string, participants: string[], description?: string): Promise<GroupMetadata>;
        getMetadata(groupJid: string): Promise<GroupMetadata>;
        promote(groupJid: string, participants: string[]): Promise<void>;
        demote(groupJid: string, participants: string[]): Promise<void>;
        add(groupJid: string, participants: string[]): Promise<void>;
        kick(groupJid: string, participants: string[]): Promise<void>;
        makeAdmin(groupJid: string, participants: string[]): Promise<void>;
        demoteAdmin(groupJid: string, participants: string[]): Promise<void>;
        updateSubject(groupJid: string, subject: string): Promise<void>;
        updateDescription(groupJid: string, description: string): Promise<void>;
        updateSetting(groupJid: string, setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'): Promise<void>;
        inviteCode(groupJid: string): Promise<string | undefined>;
        revokeInvite(groupJid: string): Promise<void>;
        acceptInvite(code: string): Promise<string | undefined>;
        leave(groupJid: string): Promise<void>;
        joinRequests(groupJid: string): Promise<unknown[]>;
        approve(groupJid: string, userJids: string[]): Promise<void>;
        reject(groupJid: string, userJids: string[]): Promise<void>;
    };
}

export const group = (): WtsPlugin<GroupPluginAPI> => {
    return {
        id: "group",
        api: (client: Client): GroupPluginAPI => ({
            group: {
                async list() {
                    if (client.supports('hasGroups')) {
                        return (client.adapter as GroupAdapter).groupFetchAllParticipating();
                    }
                    return {};
                },
                async create(subject: string, participants: string[], description?: string) {
                    if (client.supports('hasGroups')) {
                        return (client.adapter as GroupAdapter).groupCreate(subject, participants, description);
                    }
                    throw new Error('Group creation is not supported by this adapter');
                },
                async getMetadata(groupJid: string) {
                    if (client.supports('hasGroups')) {
                        return (client.adapter as GroupAdapter).groupMetadata(groupJid);
                    }
                    throw new Error('Group metadata is not supported by this adapter');
                },
                async promote(groupJid: string, participants: string[]) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupParticipantsUpdate(groupJid, participants, 'promote');
                        return;
                    }
                    throw new Error('Group promote is not supported by this adapter');
                },
                async demote(groupJid: string, participants: string[]) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupParticipantsUpdate(groupJid, participants, 'demote');
                        return;
                    }
                    throw new Error('Group demote is not supported by this adapter');
                },
                async add(groupJid: string, participants: string[]) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupParticipantsUpdate(groupJid, participants, 'add');
                        return;
                    }
                    throw new Error('Group add is not supported by this adapter');
                },
                async kick(groupJid: string, participants: string[]) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupParticipantsUpdate(groupJid, participants, 'remove');
                        return;
                    }
                    throw new Error('Group kick is not supported by this adapter');
                },
                async makeAdmin(groupJid: string, participants: string[]) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupParticipantsUpdate(groupJid, participants, 'promote');
                        return;
                    }
                    throw new Error('Group makeAdmin is not supported by this adapter');
                },
                async demoteAdmin(groupJid: string, participants: string[]) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupParticipantsUpdate(groupJid, participants, 'demote');
                        return;
                    }
                    throw new Error('Group demoteAdmin is not supported by this adapter');
                },
                async updateSubject(groupJid: string, subject: string) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupUpdateSubject(groupJid, subject);
                        return;
                    }
                    throw new Error('Group updateSubject is not supported by this adapter');
                },
                async updateDescription(groupJid: string, description: string) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupUpdateDescription(groupJid, description);
                        return;
                    }
                    throw new Error('Group updateDescription is not supported by this adapter');
                },
                async updateSetting(groupJid: string, setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked') {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as BaileysAdapterInterface).groupSettingUpdate(groupJid, setting);
                        return;
                    }
                    throw new Error('Group updateSetting is not supported by this adapter');
                },
                async inviteCode(groupJid: string) {
                    if (client.supports('hasGroups')) {
                        return (client.adapter as GroupAdapter).groupInviteCode(groupJid);
                    }
                    return undefined;
                },
                async revokeInvite(groupJid: string) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupRevokeInvite(groupJid);
                        return;
                    }
                    throw new Error('Group revokeInvite is not supported by this adapter');
                },
                async acceptInvite(code: string) {
                    if (client.supports('hasGroups')) {
                        return (client.adapter as BaileysAdapterInterface).groupAcceptInvite(code);
                    }
                    return undefined;
                },
                async leave(groupJid: string) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupLeave(groupJid);
                        return;
                    }
                    throw new Error('Group leave is not supported by this adapter');
                },
                async joinRequests(groupJid: string) {
                    if (client.supports('hasGroups')) {
                        return (client.adapter as GroupAdapter).groupRequestParticipantsList(groupJid);
                    }
                    return [];
                },
                async approve(groupJid: string, userJids: string[]) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupRequestParticipantsUpdate(groupJid, userJids, 'approve');
                        return;
                    }
                    throw new Error('Group approve is not supported by this adapter');
                },
                async reject(groupJid: string, userJids: string[]) {
                    if (client.supports('hasGroups')) {
                        await (client.adapter as GroupAdapter).groupRequestParticipantsUpdate(groupJid, userJids, 'reject');
                        return;
                    }
                    throw new Error('Group reject is not supported by this adapter');
                }
            }
        })
    };
};
