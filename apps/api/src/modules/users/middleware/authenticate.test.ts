import type { FastifyRequest } from "fastify";
import Fastify from "fastify";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { createAuthenticatePreHandler } from "./authenticate.js";

describe("authentication middleware", () => {
  let app: ReturnType<typeof Fastify> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("rejects requests without a bearer token", async () => {
    app = Fastify();
    app.decorateRequest("authenticatedUser", null);

    const authenticate = createAuthenticatePreHandler({
      authenticate: async () => null,
    } as never);

    app.get(
      "/protected",
      { preHandler: authenticate },
      async (request: FastifyRequest) => ({
        user: request.authenticatedUser,
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/protected",
    });

    assert.equal(response.statusCode, 401);
  });

  it("rejects an invalid token", async () => {
    app = Fastify();
    app.decorateRequest("authenticatedUser", null);

    const authenticate = createAuthenticatePreHandler({
      authenticate: async () => null,
    } as never);

    app.get(
      "/protected",
      { preHandler: authenticate },
      async (request: FastifyRequest) => ({
        user: request.authenticatedUser,
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: {
        authorization: "Bearer invalid-token",
      },
    });

    assert.equal(response.statusCode, 401);
  });

  it("allows a valid token and attaches the authenticated user", async () => {
    app = Fastify();
    app.decorateRequest("authenticatedUser", null);

    const expectedUser = {
      userId: "69168586-6d22-43b0-ae0b-e2261c26f6e8",
      email: "cinebook.test@example.com",
      firstName: "Test",
      lastName: "Customer",
      role: "CUSTOMER" as const,
      status: "ACTIVE" as const,
      emailVerified: false,
      createdAt: new Date("2026-10-20T05:34:06.117Z"),
      updatedAt: new Date("2026-10-20T05:34:06.117Z"),
    };

    const authenticate = createAuthenticatePreHandler({
      authenticate: async () => expectedUser,
    } as never);

    app.get(
      "/protected",
      { preHandler: authenticate },
      async (request: FastifyRequest) => ({
        user: request.authenticatedUser,
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: {
        authorization: "Bearer valid-test-token",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().user.id, expectedUser.userId);
    assert.equal(response.json().user.email, expectedUser.email);
  });

  it("fails closed when session validation throws", async () => {
    app = Fastify();
    app.decorateRequest("authenticatedUser", null);

    const authenticate = createAuthenticatePreHandler({
      authenticate: async () => {
        throw new Error("Database unavailable");
      },
    } as never);

    app.get("/protected", { preHandler: authenticate }, async () => ({
      ok: true,
    }));

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: {
        authorization: "Bearer valid-test-token",
      },
    });

    assert.equal(response.statusCode, 503);
  });
});
