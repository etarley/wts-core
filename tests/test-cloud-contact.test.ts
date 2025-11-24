import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { CloudAdapter } from '../src/adapters/cloud/CloudAdapter';

// Mock fetch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchMock = mock() as any;
global.fetch = fetchMock;

describe('Cloud API Contact Message', () => {
    let adapter: CloudAdapter;

    beforeEach(() => {
        fetchMock.mockReset();
        adapter = new CloudAdapter({
            cloudApi: {
                accessToken: 'test-token',
                phoneNumberId: 'test-phone-id',
                webhookVerifyToken: 'test-verify-token'
            }
        });
    });

    it('should send contact message with structured data', async () => {
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [{ id: 'msg-id' }] }) });
        
        // Construct a vCard as Context.ts does
        const vcard = 'BEGIN:VCARD\nVERSION:3.0\nFN:Test Contact\nTEL;type=CELL;type=VOICE;waid=1234567890:1234567890\nEND:VCARD';
        
        await adapter.sendMessage('1234567890', {
            contacts: {
                displayName: 'Test Contact',
                contacts: [{ vcard }]
            }
        });

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/test-phone-id/messages'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"type":"contacts"')
            })
        );
        
        // Verify body contains structured data and NOT vcard key
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const call = fetchMock.mock.calls.find((c: any) => c[0].includes('/messages'));
        const body = JSON.parse(call[1].body);
        
        expect(body.contacts[0]).toHaveProperty('name');
        expect(body.contacts[0].name.formatted_name).toBe('Test Contact');
        expect(body.contacts[0]).toHaveProperty('phones');
        expect(body.contacts[0].phones[0].phone).toBe('1234567890');
        expect(body.contacts[0]).not.toHaveProperty('vcard');
    });
});
