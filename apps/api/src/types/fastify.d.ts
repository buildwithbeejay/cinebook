import "fastify";
import type { AuthenticatedUser } from "../modules/users/types.js";

declare module "fastify" {
  interface FastifyRequest {
    authenticatedUser: AuthenticatedUser | null;
  }
}
