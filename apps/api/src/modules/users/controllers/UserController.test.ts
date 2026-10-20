import type { FastifyReply, FastifyRequest } from "fastify";
import Fastify from "fastify";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { UserController } from "./UserController.js";

describe("User registration", () => {
  let app: ReturnType<typeof Fastify>;

  afterEach(async () => {
    await app?.close();
  });

  it("registers a user successfully", async () => {
    // Arrange: mock the service so this test doesn't need a database.
    const mockUserService = {
      register: async () => ({
        id: "69168586-6d22-43b0-ae0b-e2261c26f6e8",
        email: "test@example.com",
        firstName: "Test",
        lastName: "Customer",
        role: "CUSTOMER",
        status: "ACTIVE",
        emailVerified: false,
        createdAt: new Date("2026-10-20T10:00:00.000Z"),
      }),
    };

    app = Fastify();
    const controller = new UserController(mockUserService as never);

    app.post(
      "/users/register",
      (request: FastifyRequest, reply: FastifyReply) =>
        controller.register(request as never, reply),
    );

    // Act: send a registration request.
    const response = await app.inject({
      method: "POST",
      url: "/users/register",
      payload: {
        email: "test@example.com",
        password: "StrongPassword123!",
        firstName: "Test",
        lastName: "Customer",
      },
    });

    // Assert: check the HTTP response.
    assert.equal(response.statusCode, 201);

    const body = response.json();

    assert.equal(body.message, "Account created successfully");
    assert.equal(body.user.email, "test@example.com");
    assert.equal(body.user.firstName, "Test");
    assert.equal(body.user.role, "CUSTOMER");
    assert.equal("passwordHash" in body.user, false);
  });
  it("rejects registration when the email already exists", async () => {
    const mockUserService = {
      register: async () => {
        throw new Error("EMAIL_ALREADY_EXISTS");
      },
    };

    app = Fastify();
    const controller = new UserController(mockUserService as never);

    app.post(
      "/users/register",
      (request: FastifyRequest, reply: FastifyReply) =>
        controller.register(request as never, reply),
    );

    // Act: send a registration request.
    const response = await app.inject({
      method: "POST",
      url: "/users/register",
      payload: {
        email: "test@example.com",
        password: "StrongPassword123!",
        firstName: "Test",
        lastName: "Customer",
      },
    });

    // Assert: check the HTTP response.
    assert.equal(response.statusCode, 409);
    const body = response.json();

    assert.equal(body.message, "An account with this email already exists");
  });

  it("invalid registration input", async () => {
    const mockUserService = {
      register: async () => {
        throw new Error("Should not be called");
      },
    };

    app = Fastify();
    const controller = new UserController(mockUserService as never);

    app.post(
      "/users/register",
      {
        schema: {
          body: {
            type: "object",
            required: ["email", "password", "firstName", "lastName"],
            properties: {
              email: { type: "string", minLength: 3, maxLength: 255 },
              password: { type: "string", minLength: 12, maxLength: 128 },
              firstName: { type: "string", minLength: 1, maxLength: 100 },
              lastName: { type: "string", minLength: 1, maxLength: 100 },
            },
          },
        },
      },
      (request: FastifyRequest, reply: FastifyReply) =>
        controller.register(request as never, reply),
    );

    // Act: send a registration request.
    const response = await app.inject({
      method: "POST",
      url: "/users/register",
      payload: {
        email: "test@example.com",
        password: "Stro!",
        firstName: "Test",
        lastName: "Customer",
      },
    });

    // Assert: check the HTTP response.
    assert.equal(response.statusCode, 400);
    const body = response.json();

    assert.equal(
      body.message,
      "body/password must NOT have fewer than 12 characters",
    );
  });

  it("login a user successfully", async () => {
    // Arrange: mock the service so this test doesn't need a database.
    const mockUserService = {
      login: async () => ({
        user: {
          id: "69168586-6d22-43b0-ae0b-e2261c26f6e8",
          email: "test@example.com",
          firstName: "Test",
          lastName: "Customer",
          role: "CUSTOMER",
          status: "ACTIVE",
          emailVerified: false,
          createdAt: new Date("2026-10-20T05:34:06.117Z"),
          updatedAt: new Date("2026-10-20T05:34:06.117Z"),
        },
        session: {
          token: "mock-test-token",
          expiresAt: new Date("2026-10-21T05:34:06.117Z"),
        },
      }),
    };

    app = Fastify();
    const controller = new UserController(mockUserService as never);

    app.post(
      "/users/login",
      //   authenticate,
      (request: FastifyRequest, reply: FastifyReply) =>
        controller.login(request as never, reply),
    );

    // Act: send a registration request.
    const response = await app.inject({
      method: "POST",
      url: "/users/login",
      payload: {
        email: "test@example.com",
        password: "StrongPassword123!",
      },
    });

    // Assert: check the HTTP response.
    assert.equal(response.statusCode, 200);

    const body = response.json();

    assert.equal(body.message, "Login successful");
    assert.equal(body.user.email, "test@example.com");
    assert.equal(body.user.firstName, "Test");
    assert.equal(body.user.role, "CUSTOMER");
    assert.equal("passwordHash" in body.user, false);
    assert.ok(body.token);
    assert.ok(body.expiresAt);
  });

  it("wrong password", async () => {
    // Arrange: mock the service so this test doesn't need a database.
    const mockUserService = {
      login: async () => {
        throw new Error("INVALID_CREDENTIALS");
      },
    };

    app = Fastify();
    const controller = new UserController(mockUserService as never);

    app.post("/users/login", (request: FastifyRequest, reply: FastifyReply) =>
      controller.login(request as never, reply),
    );

    // Act: send a registration request.
    const response = await app.inject({
      method: "POST",
      url: "/users/login",
      payload: {
        email: "test@example.com",
        password: "StrongPassword1!",
      },
    });

    // Assert: check the HTTP response.
    assert.equal(response.statusCode, 401);

    const body = response.json();

    assert.equal(body.message, "Invalid email or password");
  });

  it("wrong email", async () => {
    // Arrange: mock the service so this test doesn't need a database.
    const mockUserService = {
      login: async () => {
        throw new Error("INVALID_CREDENTIALS");
      },
    };

    app = Fastify();
    const controller = new UserController(mockUserService as never);

    app.post("/users/login", (request: FastifyRequest, reply: FastifyReply) =>
      controller.login(request as never, reply),
    );

    // Act: send a registration request.
    const response = await app.inject({
      method: "POST",
      url: "/users/login",
      payload: {
        email: "tt@example.com",
        password: "StrongPassword123!",
      },
    });

    // Assert: check the HTTP response.
    assert.equal(response.statusCode, 401);

    const body = response.json();

    assert.equal(body.message, "Invalid email or password");
    assert.equal(response.statusCode, 401);
  });

  it("Inactive account", async () => {
    // Arrange: mock the service so this test doesn't need a database.
    const mockUserService = {
      login: async () => {
        throw new Error("ACCOUNT_INACTIVE");
      },
    };

    app = Fastify();
    const controller = new UserController(mockUserService as never);

    app.post("/users/login", (request: FastifyRequest, reply: FastifyReply) =>
      controller.login(request as never, reply),
    );

    // Act: send a registration request.
    const response = await app.inject({
      method: "POST",
      url: "/users/login",
      payload: {
        email: "tt@example.com",
        password: "StrongPassword123!",
      },
    });

    // Assert: check the HTTP response.
    assert.equal(response.statusCode, 403);

    const body = response.json();

    assert.equal(response.statusCode, 403);
    assert.equal(body.message, "Your account is not active");
  });

  describe("User logout", () => {
    let app: ReturnType<typeof Fastify>;

    afterEach(async () => {
      await app?.close();
    });

    it("logs out an authenticated user successfully", async () => {
      let revokedSessionId = "";

      const mockUserService = {
        logout: async (sessionId: string) => {
          revokedSessionId = sessionId;
          return { id: sessionId };
        },
      };

      app = Fastify();
      app.decorateRequest("authenticatedUser", null);

      const controller = new UserController(mockUserService as never);

      const authenticate = async (request: FastifyRequest) => {
        request.authenticatedUser = {
          id: "user-123",
          sessionId: "session-123",
          email: "test@example.com",
          firstName: "Test",
          lastName: "Customer",
          role: "CUSTOMER",
          status: "ACTIVE",
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      };

      app.post(
        "/users/logout",
        { preHandler: authenticate },
        (request: FastifyRequest, reply: FastifyReply) =>
          controller.logout(request, reply),
      );

      const response = await app.inject({
        method: "POST",
        url: "/users/logout",
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.json().message, "Logout successful");
      assert.equal(revokedSessionId, "session-123");
    });

    it("rejects logout when the user is unauthenticated", async () => {
      app = Fastify();
      app.decorateRequest("authenticatedUser", null);

      const controller = new UserController({
        logout: async () => null,
      } as never);

      app.post(
        "/users/logout",
        (request: FastifyRequest, reply: FastifyReply) =>
          controller.logout(request, reply),
      );

      const response = await app.inject({
        method: "POST",
        url: "/users/logout",
      });

      assert.equal(response.statusCode, 401);
      assert.equal(response.json().message, "Authentication required");
    });
  });
});
