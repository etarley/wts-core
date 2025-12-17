import { randomBytes } from 'node:crypto';

export interface StickerMetadata {
    pack?: string;
    author?: string;
    categories?: string[];
    id?: string;
    quality?: number;
}

export class StickerFormatter {
    /**
     * Converts an image buffer to a WhatsApp-compatible WebP sticker.
     * - Resizes to 512x512 (fit: contain)
     * - Converts to WebP
     */
    static async generate(buffer: Buffer | string, metadata: StickerMetadata = {}): Promise<Buffer> {
        let sharp;
        try {
            sharp = (await import('sharp')).default;
        } catch {
            throw new Error('The "sharp" package is required for sticker generation. Please install it with "npm install sharp".');
        }

        const {
            quality = 50
        } = metadata;

        let inputBuffer: Buffer;

        // Handle URL string
        if (typeof buffer === 'string' && (buffer.startsWith('http://') || buffer.startsWith('https://'))) {
            const response = await fetch(buffer);
            if (!response.ok) {
                throw new Error(`Failed to fetch sticker image from URL: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            inputBuffer = Buffer.from(arrayBuffer);
        } else if (typeof buffer === 'string') {
            // Handle local file path
            inputBuffer = await sharp(buffer).toBuffer(); 
        } else {
            inputBuffer = buffer;
        }

        // 1. Process image with sharp
        const image = sharp(inputBuffer);
        
        // Resize to 512x512 and force WebP
        const webpBuffer = await image
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality })
            .toBuffer();

        return webpBuffer;
    }

    /**
     * Converts a video buffer (MP4, GIF) to an animated WebP sticker.
     * Uses ffmpeg to scale to 512x512, set FPS to 15, and ensure compatibility.
     */
    static async videoToSticker(buffer: Buffer): Promise<Buffer> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let ffmpeg: any;
        try {
            ffmpeg = (await import('fluent-ffmpeg')).default;
        } catch {
            throw new Error('The "fluent-ffmpeg" package is required for video stickers. Please install it with "npm install fluent-ffmpeg".');
        }

        // Dynamic imports for Node.js modules
        let fs: typeof import('node:fs/promises'), 
            tmpdir: typeof import('node:os').tmpdir, 
            join: typeof import('node:path').join;
        try {
            fs = await import('node:fs/promises');
            const os = await import('node:os');
            tmpdir = os.tmpdir;
            const path = await import('node:path');
            join = path.join;
        } catch {
            throw new Error('Video sticker generation requires a Node.js environment with filesystem access.');
        }

        const tempDir = tmpdir();
        const inputPath = join(tempDir, `input-${randomBytes(4).toString('hex')}.mp4`);
        const outputPath = join(tempDir, `output-${randomBytes(4).toString('hex')}.webp`);

        await fs.writeFile(inputPath, buffer);

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
                    '-loop', '0',
                    '-ss', '00:00:00',
                    '-t', '00:00:10', // Cap at 10 seconds
                    '-preset', 'default',
                    '-an',
                    '-vsync', '0'
                ])
                .toFormat('webp')
                .save(outputPath)
                .on('end', async () => {
                    try {
                        const data = await fs.readFile(outputPath);
                        resolve(data);
                    } catch (e) {
                        reject(e);
                    } finally {
                        // Cleanup
                        Promise.all([
                            fs.unlink(inputPath).catch(() => {}),
                            fs.unlink(outputPath).catch(() => {})
                        ]);
                    }
                })
                .on('error', (err: Error) => {
                    Promise.all([
                        fs.unlink(inputPath).catch(() => {}),
                        fs.unlink(outputPath).catch(() => {})
                    ]);
                    reject(err);
                });
        });
    }
}
