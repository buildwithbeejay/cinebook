import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuthSessionService } from "./AuthSessionService.js";

describe("AuthSessionService", () => {
  it("creates a session and returns a token", async () => {
    let savedSession:
      | {
          userId: string;
          tokenHash: string;
          expiresAt: Date;
        }
      | undefined;

    const mockRepository = {
      create: async (data: typeof savedSession & {}) => {
        savedSession = data;
      },
      findActiveByTokenHash: async () => null,
    };

    const service = new AuthSessionService(mockRepository as never);
    const result = await service.createForUser("user-123");

    assert.ok(result.token);
    assert.ok(result.expiresAt instanceof Date);
    assert.equal(savedSession?.userId, "user-123");
    assert.notEqual(savedSession?.tokenHash, result.token);
  });

  it("sets the session expiry to 24 hours by default", async () => {
    const mockRepository = {
      create: async (data: { expiresAt: Date }) => {
        assert.ok(data.expiresAt instanceof Date);
        const difference = data.expiresAt.getTime() - Date.now();

        assert.ok(
          difference > 23 * 60 * 60 * 1000 && difference <= 24 * 60 * 60 * 1000,
        );
      },
      findActiveByTokenHash: async () => null,
    };

    const service = new AuthSessionService(mockRepository as never);
    await service.createForUser("user-123");
  });

  it("rejects when session creation fails", async () => {
    const mockRepository = {
      create: async () => {
        throw new Error("Database error");
      },
      findActiveByTokenHash: async () => null,
    };

    const service = new AuthSessionService(mockRepository as never);
    await assert.rejects(service.createForUser("user-123"), /Database error/);
  });

  it("validates a token by looking up its hash", async () => {
    let receivedHash = "";

    const mockRepository = {
      create: async () => {},
      findActiveByTokenHash: async (hash: string) => {
        receivedHash = hash;
        return { userId: "user-123" };
      },
    };

    const service = new AuthSessionService(mockRepository as never);
    const result = await service.validateToken("valid-test-token");

    assert.equal(receivedHash.length, 64);
    assert.notEqual(receivedHash, "valid-test-token");
    assert.equal(result?.userId, "user-123");
  });

  it("Invalid Token", async () => {
    let receivedHash = "";

    const mockRepository = {
      create: async () => {
        throw new Error("Invalid Token");
      },
      findActiveByTokenHash: async () => null,
    };

    const service = new AuthSessionService(mockRepository as never);
    const result = await service.validateToken("valid-test-token");

    assert.equal(result, null);
  });

  it("revokes an existing session", async () => {
    const mockRepository = {
      create: async () => {},
      findActiveByTokenHash: async () => null,
      revokeById: async (sessionId: string) => ({ id: sessionId }),
    };

    const service = new AuthSessionService(mockRepository as never);
    const result = await service.revokeSession("session-123");

    assert.equal(result?.id, "session-123");
  });

  it("returns null when the session does not exist", async () => {
    const mockRepository = {
      create: async () => {},
      findActiveByTokenHash: async () => null,
      revokeById: async () => null,
    };

    const service = new AuthSessionService(mockRepository as never);
    const result = await service.revokeSession("missing-session");

    assert.equal(result, null);
  });

  it("rejects a revoked token", async () => {
    let revoked = false;

    const mockRepository = {
      create: async () => {},
      revokeById: async (sessionId: string) => {
        revoked = true;
        return { id: sessionId };
      },
      findActiveByTokenHash: async () => {
        return revoked ? null : { userId: "user-123" };
      },
    };

    const service = new AuthSessionService(mockRepository as never);

    await service.revokeSession("session-123");
    const result = await service.validateToken("revoked-test-token");

    assert.equal(result, null);
  });
});
