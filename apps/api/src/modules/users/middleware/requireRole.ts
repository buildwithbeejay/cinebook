import type { preHandlerHookHandler } from "fastify";
import type { AuthenticatedUser } from "../types.js";

type UserRole = AuthenticatedUser["role"];

export function requireRole(
  ...allowedRoles: UserRole[]
): preHandlerHookHandler {
  return async (request, reply) => {
    const user = request.authenticatedUser;

    if (!user) {
      return reply.code(401).send({
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return reply.code(403).send({
        message: "You do not have permission to access this resource",
      });
    }
  };
}
