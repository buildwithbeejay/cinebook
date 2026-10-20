import type { preHandlerHookHandler } from "fastify";
import type { UserService } from "../services/UserService.js";

export function createAuthenticatePreHandler(
  userService: Pick<UserService, "authenticate">,
): preHandlerHookHandler {
  return async (request, reply) => {
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return reply.code(401).send({
        message: "Authentication required",
      });
    }

    try {
      const result = await userService.authenticate(match[1]);

      if (!result) {
        return reply.code(401).send({
          message: "Invalid or expired session",
        });
      }

      request.authenticatedUser = {
        id: result.userId,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role,
        status: result.status,
        emailVerified: result.emailVerified,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        sessionId: result.sessionId,
      };
    } catch (error) {
      request.log.error(error, "Session validation failed");

      return reply.code(503).send({
        message: "Authentication service temporarily unavailable",
      });
    }
  };
}
