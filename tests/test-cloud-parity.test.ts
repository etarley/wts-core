import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { CloudAdapter } from '../src/adapters/cloud/CloudAdapter';
import { mapCloudError } from '../src/adapters/cloud/errors';
import { RateLimitError } from '../src/core/WhatsAppError';

describe('CloudAdapter Parity Features', () => {
    let adapter: CloudAdapter;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fetchMock: any;

    beforeEach(() => {
        fetchMock = mock(async () => new Response(JSON.stringify({ success: true, messages: [{ id: 'msg_123' }] })));
        global.fetch = fetchMock;

        adapter = new CloudAdapter({
            cloudApi: {
                accessToken: 'test_token',
                phoneNumberId: '123456789',
                webhookVerifyToken: 'verify_token'
            }
        });
    });

    afterEach(() => {
        mock.restore();
    });

    describe('Message Completeness', () => {
        it('should send sticker message', async () => {
            await adapter.sendMessage('123456', { sticker: { url: 'http://example.com/sticker.webp' } });
            
            const call = fetchMock.mock.calls[0];
            const body = JSON.parse(call[1].body);
            
            expect(body.type).toBe('sticker');
            expect(body.sticker).toEqual({ link: 'http://example.com/sticker.webp' });
        });

        it('should send location message', async () => {
            await adapter.sendMessage('123456', { 
                location: { degreesLatitude: 1.23, degreesLongitude: 4.56, name: 'Place', address: '123 St' } 
            });
            
            const call = fetchMock.mock.calls[0];
            const body = JSON.parse(call[1].body);
            
            expect(body.type).toBe('location');
            expect(body.location).toEqual({
                address: '123 St',
                latitude: 1.23,
                longitude: 4.56,
                name: 'Place'
            });
        });

        it('should send contacts message', async () => {
            const contacts = [{ name: { formatted_name: 'John Doe' } }];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await adapter.sendMessage('123456', { contacts: { contacts } } as any);
            
            const call = fetchMock.mock.calls[0];
            const body = JSON.parse(call[1].body);
            
            expect(body.type).toBe('contacts');
            expect(body.contacts).toEqual(contacts);
        });

        it('should remove reaction', async () => {
            await adapter.sendMessage('123456', { react: { text: '', key: { id: 'msg_id' } } });
            
            const call = fetchMock.mock.calls[0];
            const body = JSON.parse(call[1].body);
            
            expect(body.type).toBe('reaction');
            expect(body.reaction).toEqual({ message_id: 'msg_id', emoji: '' });
        });
    });

    describe('Management APIs', () => {
        it('should get flow metrics', async () => {
            await adapter.getFlowMetrics('flow_123', 'DAILY', 'start_date', 'end_date');
            const url = fetchMock.mock.calls[0][0];
            expect(url).toContain('/flow_123/metrics?granularity=DAILY&start=start_date&end=end_date');
        });

        it('should update template', async () => {
            await adapter.updateTemplate('tpl_123', [{ type: 'BODY', text: 'Hi' }]);
            const call = fetchMock.mock.calls[1];
            expect(call[0]).toContain('/tpl_123');
            expect(call[1].method).toBe('POST');
            expect(JSON.parse(call[1].body)).toEqual({ components: [{ type: 'BODY', text: 'Hi' }] });
        });
    });

    describe('Calling API', () => {
        it('should initiate call', async () => {
            await adapter.initiateCall('123456', 'sdp_data');
            const call = fetchMock.mock.calls[0];
            const body = JSON.parse(call[1].body);
            
            expect(call[0]).toContain('/calls');
            expect(body.type).toBe('offer');
            expect(body.sdp).toBe('sdp_data');
        });

        it('should accept call', async () => {
            await adapter.acceptCall('call_123', 'sdp_answer');
            const call = fetchMock.mock.calls[0];
            const body = JSON.parse(call[1].body);
            
            expect(call[0]).toContain('/calls/call_123');
            expect(body.type).toBe('answer');
            expect(body.sdp).toBe('sdp_answer');
        });
    });

    describe('Error Mapping', () => {
        it('should map rate limit error', () => {
            const error = mapCloudError({ code: 131048, message: 'Rate limit' });
            expect(error).toBeInstanceOf(RateLimitError);
        });

        it('should map unknown error to WhatsAppError', () => {
            const error = mapCloudError({ code: 999999, message: 'Unknown' });
            expect(error.code).toBe(999999);
            expect(error.name).toBe('WhatsAppError');
        });
    });
});
