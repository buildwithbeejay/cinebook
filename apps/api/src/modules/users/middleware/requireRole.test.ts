import type { FastifyRequest } from "fastify";
import Fastify from "fastify";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { requireRole } from "./requireRole.js";

describe("requireRole middleware", () => {
  let app: ReturnType<typeof Fastify>;

  afterEach(async () => {
    await app?.close();
  });

  it("allows an admin to access an admin route", async () => {
    app = Fastify();
    app.decorateRequest("authenticatedUser", null);

    app.addHook("preHandler", async (request: FastifyRequest) => {
      request.authenticatedUser = {
        id: "admin-123",
        sessionId: "session-123",
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    app.get("/admin", { preHandler: requireRole("ADMIN") }, async () => ({
      message: "Welcome, admin",
    }));

    const response = await app.inject({
      method: "GET",
      url: "/admin",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().message, "Welcome, admin");
  });

  it("rejects a customer from an admin route", async () => {
    app = Fastify();
    app.decorateRequest("authenticatedUser", null);

    app.addHook("preHandler", async (request: FastifyRequest) => {
      request.authenticatedUser = {
        id: "user-123",
        sessionId: "session-123",
        email: "customer@example.com",
        firstName: "Test",
        lastName: "Customer",
        role: "CUSTOMER",
        status: "ACTIVE",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    app.get("/admin", { preHandler: requireRole("ADMIN") }, async () => ({
      message: "Welcome, admin",
    }));

    const response = await app.inject({
      method: "GET",
      url: "/admin",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(
      response.json().message,
      "You do not have permission to access this resource",
    );
  });

  it("rejects an unauthenticated request", async () => {
    app = Fastify();
    app.decorateRequest("authenticatedUser", null);

    app.addHook("preHandler", async (_request: FastifyRequest) => {});

    app.get("/admin", { preHandler: requireRole("ADMIN") }, async () => ({
      message: "Welcome, admin",
    }));

    const response = await app.inject({
      method: "GET",
      url: "/admin",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().message, "Authentication required");
  });
});
