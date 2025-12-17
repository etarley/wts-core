import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Context } from './Context';
import type { IAdapter } from './interfaces';
import type { Client } from './Client';
import { proto } from '@whiskeysockets/baileys';

describe('Context', () => {
    let mockAdapter: IAdapter;
    let mockClient: Client;
    let context: Context;
    const mockJid = '1234567890@s.whatsapp.net';
    const mockMessage: proto.IWebMessageInfo = {
        key: {
            remoteJid: mockJid,
            id: 'test-msg-id',
            fromMe: false
        },
        message: {
            conversation: 'Hello'
        }
    };

    beforeEach(() => {
        mockAdapter = {
            sendMessage: mock(() => Promise.resolve({ key: { id: 'sent-id' } })),
            downloadMedia: mock(),
            getMe: mock(),
            readMessage: mock(),
            sendPresenceUpdate: mock(),
            mode: 'cloud'
        } as unknown as IAdapter;

        mockClient = {
            waitFor: mock()
        } as unknown as Client;

        context = new Context(mockMessage, mockAdapter, mockClient);
    });

    it('should reply with audio quoting the original message', async () => {
        const audioBuffer = Buffer.from('audio data');
        await context.replyAudio(audioBuffer);

        expect(mockAdapter.sendMessage).toHaveBeenCalledWith(
            mockJid,
            expect.objectContaining({
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: false
            }),
            expect.objectContaining({
                quoted: mockMessage
            })
        );
    });

    it('should reply with PTT audio quoting the original message', async () => {
        const audioBuffer = Buffer.from('audio data');
        await context.replyAudio(audioBuffer, true);

        expect(mockAdapter.sendMessage).toHaveBeenCalledWith(
            mockJid,
            expect.objectContaining({
                audio: audioBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            }),
            expect.objectContaining({
                quoted: mockMessage
            })
        );
    });

    it('should reply with image quoting the original message', async () => {
        const imageBuffer = Buffer.from('image data');
        await context.replyImage(imageBuffer, 'cool caption');

        expect(mockAdapter.sendMessage).toHaveBeenCalledWith(
            mockJid,
            expect.objectContaining({
                image: imageBuffer,
                caption: 'cool caption'
            }),
            expect.objectContaining({
                quoted: mockMessage
            })
        );
    });

    it('should reply with video quoting the original message', async () => {
        const videoBuffer = Buffer.from('video data');
        await context.replyVideo(videoBuffer, 'cool video');

        expect(mockAdapter.sendMessage).toHaveBeenCalledWith(
            mockJid,
            expect.objectContaining({
                video: videoBuffer,
                caption: 'cool video'
            }),
            expect.objectContaining({
                quoted: mockMessage
            })
        );
    });

    it('should reply with document quoting the original message', async () => {
        const docBuffer = Buffer.from('doc data');
        await context.replyDocument(docBuffer, 'file.pdf', 'cool doc', 'application/pdf');

        expect(mockAdapter.sendMessage).toHaveBeenCalledWith(
            mockJid,
            expect.objectContaining({
                document: docBuffer,
                fileName: 'file.pdf',
                caption: 'cool doc',
                mimetype: 'application/pdf'
            }),
            expect.objectContaining({
                quoted: mockMessage
            })
        );
    });
});
