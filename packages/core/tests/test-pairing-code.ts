import { createClient } from '../src';

/**
 * Test script for Pairing Code feature
 * 
 * This script demonstrates how to use the pairing code authentication method
 * instead of QR code scanning. This is useful for automation and testing.
 * 
 * Usage:
 * 1. Run this script: bun test-pairing-code.ts
 * 2. Enter your phone number when prompted (without + prefix)
 * 3. The script will display an 8-character pairing code
 * 4. Open WhatsApp on your phone and enter the code
 */

async function testPairingCode(): Promise<void> {
    console.log('🔐 Testing Pairing Code Authentication\n');
    
    // Create a Baileys-based client (pairing code only works with Baileys)
    const client = createClient({
        authStrategy: './auth-pairing-test',
    });
    
    // Listen for connection events
    client.adapter.on('ready', () => {
        console.log('✅ Client is ready and authenticated!');
    });
    
    client.adapter.on('qr', (qr: string) => {
        console.log('📱 QR Code received (you can ignore this if using pairing code):', qr.substring(0, 50) + '...');
    });
    
    // Start the connection
    await client.connect();
    
    // Request a pairing code
    // In production, you would get this from user input
    const phoneNumber = '1234567890'; // Replace with actual phone number (without + prefix)
    
    try {
        console.log(`\n📞 Requesting pairing code for: +${phoneNumber}`);
        const code = await client.adapter.requestPairingCode(phoneNumber);
        
        console.log('\n' + '='.repeat(50));
        console.log(`🔑 Your pairing code is: ${code}`);
        console.log('='.repeat(50));
        console.log('\nInstructions:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Go to Settings > Linked Devices');
        console.log('3. Tap "Link a Device"');
        console.log('4. Tap "Link with phone number instead"');
        console.log(`5. Enter this code: ${code}`);
        console.log('\nWaiting for authentication...\n');
        
    } catch (error) {
        if (error instanceof Error) {
            console.error('❌ Failed to get pairing code:', error.message);
        }
    }
    
    // Keep the process running
    await new Promise(() => {});
}

// Run the test if this file is executed directly
if (import.meta.main) {
    testPairingCode().catch(console.error);
}
