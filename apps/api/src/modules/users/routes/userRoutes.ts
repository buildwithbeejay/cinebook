import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { UserController } from "../controllers/UserController.js";

interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export const registerUserRoutes = (
  app: FastifyInstance,
  controller: UserController,
): void => {
  app.post<{ Body: RegisterBody }>(
    "/users/register",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["email", "password", "firstName", "lastName"],
          properties: {
            email: {
              type: "string",
              format: "email",
              minLength: 3,
              maxLength: 255,
            },
            password: { type: "string", minLength: 12, maxLength: 128 },
            firstName: { type: "string", minLength: 1, maxLength: 100 },
            lastName: { type: "string", minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    (request, reply) => controller.register(request, reply),
  );
};

export const loginUserRoutes = (
  app: FastifyInstance,
  controller: UserController,
  authenticate: preHandlerHookHandler,
): void => {
  app.post<{ Body: LoginBody }>(
    "/users/login",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              minLength: 3,
              maxLength: 255,
            },
            password: { type: "string", minLength: 12, maxLength: 128 },
          },
        },
      },
    },
    (request, reply) => controller.login(request, reply),
  );

  app.get("/users/me", { preHandler: authenticate }, (request, reply) =>
    controller.me(request, reply),
  );

  app.post("/users/logout", { preHandler: authenticate }, (request, reply) =>
    controller.logout(request, reply),
  );
};
