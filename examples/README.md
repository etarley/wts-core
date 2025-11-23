# wts-core Examples

This folder contains minimal, runnable examples for different environments.

## Prerequisites

Since these examples link to the local library, you must build the root library first:

```bash
# In the root of wts-core
bun install
bun run build
```

## 1. Node.js (Baileys/Socket)

A self-hosted bot that connects via QR code.

```bash
cd examples/node-baileys
npm install
npm run dev
```

## 2. Bun (Cloud API)

A high-performance webhook server using Bun.

```bash
cd examples/bun-cloud
bun install
# Export your credentials
export WA_TOKEN="your_token"
export WA_PHONE_ID="your_phone_id"
export WA_VERIFY="your_verify_token"

bun run dev
```

## 3. Cloudflare Workers

A serverless implementation for the Edge.

```bash
cd examples/cloudflare-worker
npm install
npm run dev
# or to deploy
npm run deploy
```
