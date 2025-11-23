import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { CloudAdapter } from '../src/adapters/cloud/CloudAdapter';
import { Client } from '../src/core/Client';
import { Filter } from '../src/core/Filter';
import { Context } from '../src/core/Context';

// Mock fetch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchMock = mock() as any;
global.fetch = fetchMock;

describe('Cloud API Features', () => {
    let adapter: CloudAdapter;
    let client: Client;

    beforeEach(() => {
        fetchMock.mockReset();
        adapter = new CloudAdapter({
            cloudApi: {
                accessToken: 'test-token',
                phoneNumberId: 'test-phone-id',
                webhookVerifyToken: 'test-verify-token'
            }
        });
        client = new Client(adapter);
    });

    describe('Business Resource', () => {
        it('should update profile', async () => {
            fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
            
            await client.business.updateProfile({
                about: 'Test About',
                email: 'test@example.com'
            });

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/test-phone-id/whatsapp_business_profile'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"about":"Test About"')
                })
            );
        });
    });

    describe('Commerce Resource', () => {
        it('should send product', async () => {
            fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [{ id: 'msg-id' }] }) });
            
            await client.commerce.sendProduct('1234567890', 'catalog-id', 'product-id');

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/test-phone-id/messages'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"type":"interactive"'),
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                        'Content-Type': 'application/json'
                    })
                })
            );
        });
    });

    describe('QR Resource', () => {
        it('should create QR code', async () => {
            fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'qr-code', qr_image_url: 'http://example.com/qr.png' }) });
            
            const result = await client.qr.create('Hello', 'png');

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/test-phone-id/message_qrdls'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"prefilled_message":"Hello"')
                })
            );
            expect(result).toEqual({ code: 'qr-code', url: 'http://example.com/qr.png' });
        });
    });

    describe('Filter Class', () => {
        it('should filter text messages', async () => {
            const ctx = { content: { conversation: 'Hello' } } as unknown as Context;
            expect(await Filter.text.check(ctx)).toBe(true);
            
            const ctx2 = { content: { imageMessage: {} } } as unknown as Context;
            expect(await Filter.text.check(ctx2)).toBe(false);
        });

        it('should combine filters with AND', async () => {
            const ctx = { content: { conversation: 'Hello World' }, body: 'Hello World' } as unknown as Context;
            const filter = Filter.text.and(Filter.startsWith('Hello'));
            
            expect(await filter.check(ctx)).toBe(true);
        });

        it('should combine filters with OR', async () => {
            const ctx = { content: { imageMessage: {} } } as unknown as Context;
            const filter = Filter.text.or(Filter.image);
            
            expect(await filter.check(ctx)).toBe(true);
        });
    });
});
