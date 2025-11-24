import { describe, it, expect } from "bun:test";
import { Context } from "../src/core/Context";
import type { IAdapter } from "../src/core/interfaces";
import type { Client } from "../src/core/Client";
import { proto } from "@whiskeysockets/baileys";

describe("Context", () => {
    const mockAdapter = {} as IAdapter;
    const mockClient = {} as Client;

    it("should correctly parse basic properties", () => {
        const raw: proto.IWebMessageInfo = {
            key: {
                remoteJid: "1234567890@s.whatsapp.net",
                fromMe: true,
                id: "ABC12345"
            },
            message: {
                conversation: "Hello World"
            },
            pushName: "Test User"
        };

        const ctx = new Context(raw, mockAdapter, mockClient);

        expect(ctx.from).toBe("1234567890@s.whatsapp.net");
        expect(ctx.fromMe).toBe(true);
        expect(ctx.body).toBe("Hello World");
        expect(ctx.pushName).toBe("Test User");
        expect(ctx.isGroup()).toBe(false);
    });

    it("should identify group messages", () => {
        const raw: proto.IWebMessageInfo = {
            key: {
                remoteJid: "1234567890@g.us",
                fromMe: false,
                participant: "9876543210@s.whatsapp.net"
            },
            message: {
                conversation: "Group Chat"
            }
        };

        const ctx = new Context(raw, mockAdapter, mockClient);

        expect(ctx.isGroup()).toBe(true);
        expect(ctx.sender).toBe("9876543210@s.whatsapp.net");
    });

    it("should manage state variables", () => {
        const raw: proto.IWebMessageInfo = { key: {} };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = new Context<{ Variables: { foo: string } }>(raw, mockAdapter, mockClient as any);

        ctx.set("foo", "bar");
        expect(ctx.get("foo")).toBe("bar");
        expect(ctx.req.valid("foo")).toBe("bar");
    });

    it("should identify message types", () => {
        const textMsg: proto.IWebMessageInfo = {
            key: {},
            message: { conversation: "text" }
        };
        const imgMsg: proto.IWebMessageInfo = {
            key: {},
            message: { imageMessage: {} }
        };

        const ctxText = new Context(textMsg, mockAdapter, mockClient);
        const ctxImg = new Context(imgMsg, mockAdapter, mockClient);

        expect(ctxText.type).toBe("text");
        expect(ctxImg.type).toBe("image");
    });

    it("should identify audio messages", () => {
        const audioMsg: proto.IWebMessageInfo = {
            key: {},
            message: { audioMessage: {} }
        };

        const ctxAudio = new Context(audioMsg, mockAdapter, mockClient);

        expect(ctxAudio.isAudio()).toBe(true);
        expect(ctxAudio.type).toBe("audio");
    });
});
