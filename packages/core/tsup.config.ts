import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    external: ['ws', 'sharp', 'fluent-ffmpeg', '@hapi/boom', 'qrcode-terminal', 'pino', 'better-sqlite3', 'aws-sdk', '@aws-sdk/client-s3', 'fs', 'path', 'util', 'os', 'events', 'stream', 'crypto'],
    noExternal: ['@whiskeysockets/baileys'],
});
