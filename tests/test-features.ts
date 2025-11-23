import { FlowCrypto } from '../src/utils/FlowCrypto';
import { FlowJSON, Screen, Layout, TextHeading, TextInput, Footer } from '../src/builders/FlowBuilder';
import { TemplateBuilder } from '../src/builders/TemplateBuilder';
import { filters } from '../src/types';
import { Context } from '../src/core/Context';
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;

async function testFlowCrypto() {
    console.log('--- Testing FlowCrypto ---');
    // Generate keys for testing
    const { privateKey, publicKey } = await subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    const exportedPrivateKey = await subtle.exportKey("pkcs8", privateKey);
    
    const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(exportedPrivateKey).toString('base64')}\n-----END PRIVATE KEY-----`;
    
    const crypto = new FlowCrypto({ privateKey: privateKeyPem });

    // Simulate Encryption (what WhatsApp does)
    const aesKey = await subtle.generateKey(
        { name: "AES-GCM", length: 128 },
        true,
        ["encrypt", "decrypt"]
    );
    
    const iv = listRandomValues(new Uint8Array(12));
    const flowData = JSON.stringify({ screen: "SUCCESS", data: { extension_message_response: { params: { flow_token: "test-token" } } } });
    
    const encryptedFlowData = await subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        new TextEncoder().encode(flowData)
    );

    const exportedAesKey = await subtle.exportKey("raw", aesKey);
    const encryptedAesKey = await subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        exportedAesKey
    );

    // Test Decryption
    try {
        const decrypted = await crypto.decryptRequest(
            Buffer.from(encryptedFlowData).toString('base64'),
            Buffer.from(encryptedAesKey).toString('base64'),
            Buffer.from(iv).toString('base64')
        );
        console.log('Decrypted:', decrypted);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((decrypted.decryptedBody as any).screen === 'SUCCESS') console.log('✅ FlowCrypto Decryption Passed');
        else console.error('❌ FlowCrypto Decryption Failed');
    } catch (e) {
        console.error('❌ FlowCrypto Decryption Error:', e);
    }
}

function listRandomValues(array: Uint8Array) {
    for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
    }
    return array;
}

function testFlowBuilder() {
    console.log('\n--- Testing FlowBuilder ---');
    const screen = new Screen(
        'screen_1',
        'Welcome',
        new Layout([
            new TextHeading('Hello World'),
            new TextInput('name', 'Your Name'),
            new Footer('Submit', 'submit_action')
        ]),
        {},
        true
    );

    const flow = new FlowJSON('3.0', [screen]);
    const json = flow.toJSON();
    console.log(JSON.stringify(json, null, 2));
    
    if (json.screens?.[0]?.id === 'screen_1' && json.screens[0].layout?.children?.length === 3) {
        console.log('✅ FlowBuilder Passed');
    } else {
        console.error('❌ FlowBuilder Failed');
    }
}

function testTemplateBuilder() {
    console.log('\n--- Testing TemplateBuilder ---');
    const builder = new TemplateBuilder('welcome_message');
    builder.addHeader('TEXT', 'Welcome!');
    builder.addBody('Hello {{1}}');
    builder.addButtons([
        { type: 'QUICK_REPLY', text: 'Yes' },
        { type: 'URL', text: 'Visit', url: 'https://google.com' }
    ]);

    const json = builder.build();
    console.log(JSON.stringify(json, null, 2));

    if (json.components?.length === 3 && json.components?.[2]?.buttons?.length === 2) {
        console.log('✅ TemplateBuilder Passed');
    } else {
        console.error('❌ TemplateBuilder Failed');
    }
}

async function testFilters() {
    console.log('\n--- Testing Filters ---');
    
    const mockCtx = {
        type: 'text',
        body: '/start',
        from: '1234567890'
    } as unknown as Context;

    const isCommand = filters.command('start')(mockCtx);
    const isText = filters.text(mockCtx);
    const isPhoto = filters.photo(mockCtx);

    const complexFilter = filters.and(filters.text, filters.command('start'));
    const isComplex = await complexFilter(mockCtx);

    console.log('Is Command:', isCommand);
    console.log('Is Text:', isText);
    console.log('Is Photo:', isPhoto);
    console.log('Is Complex (Text & Command):', isComplex);

    if (isCommand && isText && !isPhoto && isComplex) {
        console.log('✅ Filters Passed');
    } else {
        console.error('❌ Filters Failed');
    }
}

async function run() {
    await testFlowCrypto();
    testFlowBuilder();
    testTemplateBuilder();
    await testFilters();
}

run().catch(console.error);
