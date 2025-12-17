import { VCardBuilder } from '../src/utils/VCardBuilder';
import { StickerFormatter } from '../src/utils/StickerFormatter';
import sharp from 'sharp';

async function testVCard() {
    console.log('--- Testing VCardBuilder ---');
    const vcard = new VCardBuilder()
        .setFullName('John Doe')
        .setPhone('+1234567890')
        .setOrganization('Acme Corp')
        .setEmail('john@example.com')
        .setUrl('https://example.com')
        .build();

    console.log(vcard);

    if (!vcard.includes('FN:John Doe')) throw new Error('Missing Name');
    if (!vcard.includes('TEL;type=CELL;type=VOICE;waid=1234567890:+1234567890')) throw new Error('Missing Phone');
    console.log('✅ VCardBuilder passed');
}

async function testSticker() {
    console.log('\n--- Testing StickerFormatter ---');
    // Create a simple 100x100 red image buffer using sharp
    const inputBuffer = await sharp({
        create: {
            width: 100,
            height: 100,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
    })
    .png()
    .toBuffer();

    const stickerBuffer = await StickerFormatter.generate(inputBuffer, {
        pack: 'Test Pack',
        author: 'Test Author'
    });

    const metadata = await sharp(stickerBuffer).metadata();
    
    console.log('Sticker Metadata:', {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height
    });

    if (metadata.format !== 'webp') throw new Error('Output is not WebP');
    if (metadata.width !== 512 || metadata.height !== 512) throw new Error('Output is not 512x512');
    console.log('✅ StickerFormatter passed');
}

async function run() {
    try {
        await testVCard();
        await testSticker();
        console.log('\n🎉 All utility tests passed!');
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

run();
