import { CloudNormalizer } from '../src/adapters/cloud/CloudNormalizer';
import type { CloudMessage } from '../src/adapters/cloud/types';
import assert from 'assert';

console.log('Running CloudNormalizer Test...');

const mockCloudMessage: CloudMessage = {
    from: '1234567890',
    id: 'wamid.HBgLM...',
    timestamp: '1672531200',
    type: 'text',
    text: { body: 'Reply message' },
    context: {
        from: '0987654321',
        id: 'wamid.HBgLM...QUOTED'
    }
};

const normalized = CloudNormalizer.normalizeMessage(mockCloudMessage, {
    display_phone_number: '1234567890',
    phone_number_id: '100000000'
});

console.log('Normalized Message:', JSON.stringify(normalized, null, 2));

// Verify contextInfo is present
assert.ok(normalized.message?.extendedTextMessage?.contextInfo, 'contextInfo should be present');
assert.strictEqual(normalized.message?.extendedTextMessage?.contextInfo?.stanzaId, 'wamid.HBgLM...QUOTED', 'stanzaId mismatch');
assert.strictEqual(normalized.message?.extendedTextMessage?.contextInfo?.participant, '0987654321', 'participant mismatch');
assert.ok(normalized.message?.extendedTextMessage?.contextInfo?.quotedMessage, 'quotedMessage should be present');

console.log('✅ CloudNormalizer Test Passed!');
