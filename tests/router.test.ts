import { describe, it, expect, mock } from "bun:test";
import { Router } from "../src/router";
import { Context } from "../src/core/Context";

describe("Router", () => {
    it("should match exact commands", () => {
        const router = new Router();
        const handler = mock(() => {});
        
        router.command("ping", handler);
        
        // Mock context
        const ctx = { body: "ping" } as Context; 
        const match = router.match(ctx);
        
        expect(match).toBeDefined();
    });

    it("should match commands with arguments", () => {
        const router = new Router();
        const handler = mock(() => {});
        
        router.command("echo", handler);
        
        const ctx = { body: "echo hello world" } as Context;
        const match = router.match(ctx);
        
        expect(match).toBeDefined();
    });

    it("should match regex patterns", () => {
        const router = new Router();
        const handler = mock(() => {});
        
        router.hear(/hello/i, handler);
        
        const ctx = { body: "Hello there" } as Context;
        const match = router.match(ctx);
        
        expect(match).toBeDefined();
    });

    it("should handle sub-routers with prefix", () => {
        const router = new Router();
        const subRouter = new Router();
        const handler = mock(() => {});
        
        subRouter.command("ban", handler);
        router.route("admin", subRouter);
        
        const ctx = { body: "admin ban user" } as Context;
        const match = router.match(ctx);
        
        expect(match).toBeDefined();
    });

    it("should return undefined if no match", async () => {
        const router = new Router();
        const handler = mock(() => {});
        
        router.command("ping", handler);
        
        const ctx = { body: "pong" } as Context;
        const match = await router.match(ctx);
        
        expect(match).toBeUndefined();
    });
});
