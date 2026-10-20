import Fastify, { type FastifyInstance } from "fastify";
import { pool as defaultPool } from "../db/client.js";
import type { Pool } from "pg";

import { db } from "../db/client.js";
import { createUserModule } from "../modules/users/userModule.js";
import { UserController } from "../modules/users/controllers/UserController.js";
import {
  loginUserRoutes,
  registerUserRoutes,
} from "../modules/users/routes/userRoutes.js";
import { createAuthenticatePreHandler } from "../modules/users/middleware/authenticate.js";

interface AppServerOptions {
  databasePool?: Pool;
}

export class AppServer {
  private readonly app: FastifyInstance;
  private readonly databasePool: Pool;

  constructor(options: AppServerOptions = {}) {
    this.databasePool = options.databasePool ?? defaultPool;

    this.app = Fastify({
      logger: true,
      ajv: {
        customOptions: {
          removeAdditional: false,
        },
      },
    });

    const userModule = createUserModule({ db });
    const userController = new UserController(userModule.userService);

    this.app.decorateRequest("authenticatedUser", null);

    const authenticate = createAuthenticatePreHandler(userModule.userService);

    registerUserRoutes(this.app, userController);
    loginUserRoutes(this.app, userController, authenticate);

    this.registerRoutes();
    this.registerLifecycleHooks();
  }

  get instance(): FastifyInstance {
    return this.app;
  }

  private registerRoutes(): void {
    this.app.get("/health", async () => {
      return {
        status: "ok",
        service: "cinebook-api",
        timestamp: new Date().toISOString(),
      };
    });

    this.app.get("/health/db", async (_request, reply) => {
      try {
        const result = await this.databasePool.query(
          "SELECT current_database() AS database, NOW() AS database_time",
        );

        return {
          status: "ok",
          database: result.rows[0].database,
          databaseTime: result.rows[0].database_time,
        };
      } catch (error) {
        this.app.log.error(error, "Database health check failed");

        return reply.code(503).send({
          status: "error",
          message: "Database unavailable",
        });
      }
    });
  }

  private registerLifecycleHooks(): void {
    this.app.addHook("onClose", async () => {
      await this.databasePool.end();
    });
  }

  async start(port = 3001, host = "0.0.0.0"): Promise<void> {
    await this.app.listen({ port, host });
  }

  async stop(): Promise<void> {
    await this.app.close();
  }
}
