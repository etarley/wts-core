import { FlowCrypto } from '../src/utils/FlowCrypto';
import { CloudAdapter } from '../src/adapters/cloud/CloudAdapter';
import type { UniversalOptions } from '../src/types';
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;

async function generateKeyPair() {
    return await subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

async function exportPrivateKey(key: CryptoKey) {
    const exported = await subtle.exportKey("pkcs8", key);
    const exportedAsBase64 = Buffer.from(exported).toString("base64");
    return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
}

async function testFlowCrypto() {
    console.log('--- Testing FlowCrypto ---');

    // 1. Setup Keys
    const keyPair = await generateKeyPair();
    const privateKeyPem = await exportPrivateKey(keyPair.privateKey);
    
    const flowCrypto = new FlowCrypto({ privateKey: privateKeyPem });

    // 2. Simulate WhatsApp Encryption (Client Side)
    const flowData = {
        screen: "SUCCESS",
        data: {
            extension_message_response: {
                params: {
                    flow_token: "FLOW_TOKEN",
                    some_param: "some_value"
                }
            }
        }
    };

    // Generate AES Key
    const aesKey = await subtle.generateKey(
        { name: "AES-GCM", length: 128 },
        true,
        ["encrypt", "decrypt"]
    );

    // Encrypt AES Key with Public Key
    const rawAesKey = await subtle.exportKey("raw", aesKey);
    const encryptedAesKeyBuffer = await subtle.encrypt(
        { name: "RSA-OAEP" },
        keyPair.publicKey,
        rawAesKey
    );
    const encryptedAesKey = Buffer.from(encryptedAesKeyBuffer).toString("base64");

    // Encrypt Flow Data with AES Key
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const initialVector = Buffer.from(iv).toString("base64");
    
    const encryptedFlowDataBuffer = await subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        new TextEncoder().encode(JSON.stringify(flowData))
    );
    const encryptedFlowData = Buffer.from(encryptedFlowDataBuffer).toString("base64");

    console.log('Generated Encrypted Payload');

    // 3. Test Decryption
    try {
        const { decryptedBody, aesKey, iv: decryptedIv } = await flowCrypto.decryptRequest(
            encryptedFlowData,
            encryptedAesKey,
            initialVector
        );
        
        console.log('Decrypted Data:', JSON.stringify(decryptedBody, null, 2));
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (decryptedBody.screen === "SUCCESS" && (decryptedBody as any).data.extension_message_response.params.flow_token === "FLOW_TOKEN") {
            console.log('✅ Decryption Successful');
        } else {
            console.error('❌ Decryption Failed: Data mismatch');
        }

        // 4. Test Encryption (Response)
        const response = {
            screen: "NEXT_SCREEN",
            data: {
                extension_message_response: {
                    params: {
                        next_step: "step_2"
                    }
                }
            }
        };

        const encryptedResponse = await flowCrypto.encryptResponse(
            response,
            aesKey,
            decryptedIv
        );
        
        console.log('Encrypted Response:', encryptedResponse);
        
        // Verify we can decrypt it back (using the flipped IV)
        const flippedIv = new Uint8Array(decryptedIv);
        for(let i=0; i < flippedIv.length; i++) {
            flippedIv[i] = flippedIv[i]! ^ 0xFF;
        }

        const decryptedResponseBuffer = await subtle.decrypt(
            { name: "AES-GCM", iv: flippedIv },
            aesKey,
            Buffer.from(encryptedResponse, "base64")
        );
        const decryptedResponse = JSON.parse(new TextDecoder().decode(decryptedResponseBuffer));
        
        if (decryptedResponse.screen === "NEXT_SCREEN") {
            console.log('✅ Encryption Successful');
        } else {
            console.error('❌ Encryption Failed');
        }

    } catch (error) {
        console.error('❌ Crypto Test Failed:', error);
    }
}

async function testCloudAdapterIntegration() {
    console.log('\n--- Testing CloudAdapter Integration ---');
    
    const keyPair = await generateKeyPair();
    const privateKeyPem = await exportPrivateKey(keyPair.privateKey);

    const options: UniversalOptions = {
        cloudApi: {
            accessToken: 'test',
            phoneNumberId: 'test',
            webhookVerifyToken: 'test',
            flowPrivateKey: privateKeyPem
        }
    };

    const adapter = new CloudAdapter(options);

    // Mock Request
    if (typeof adapter.handleFlowRequest === 'function') {
        console.log('✅ handleFlowRequest exists');
    } else {
        console.error('❌ handleFlowRequest missing');
    }

    if (typeof adapter.onFlowRequest === 'undefined') {
        console.log('✅ onFlowRequest is initially undefined');
    }

    // Test registering a handler (simulating Client behavior)
    adapter.onFlowRequest = async (_data) => {
        void _data;
        return { screen: "TEST", data: {} };
    };

    if (typeof adapter.onFlowRequest === 'function') {
        console.log('✅ onFlowRequest registered successfully');
    }
}

async function run() {
    await testFlowCrypto();
    await testCloudAdapterIntegration();
}

run();
