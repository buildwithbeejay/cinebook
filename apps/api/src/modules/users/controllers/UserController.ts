import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserService } from "../services/UserService.js";

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

export class UserController {
  constructor(private readonly userService: UserService) {}

  async register(
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply,
  ) {
    try {
      const user = await this.userService.register(request.body);

      return reply.code(201).send({
        message: "Account created successfully",
        user,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
        return reply.code(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "An account with this email already exists",
        });
      }

      const databaseError = error as {
        code?: string;
        constraint?: string;
      };

      if (
        databaseError.code === "23505" &&
        databaseError.constraint === "users_email_unique"
      ) {
        return reply.code(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "An account with this email already exists",
        });
      }

      request.log.error(error, "User registration failed");

      return reply.code(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Unable to register user",
      });
    }
  }

  async login(
    request: FastifyRequest<{ Body: LoginBody }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await this.userService.login(request.body);

      return reply.code(200).send({
        message: "Login successful",
        user: result.user,
        token: result.session.token,
        expiresAt: result.session.expiresAt,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_CREDENTIALS") {
          return reply.code(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Invalid email or password",
          });
        }

        if (error.message === "ACCOUNT_INACTIVE") {
          return reply.code(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "Your account is not active",
          });
        }
      }

      request.log.error(error, "User login failed");

      return reply.code(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Unable to log in",
      });
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.authenticatedUser) {
      return reply.code(401).send({
        message: "Authentication required",
      });
    }

    return reply.code(200).send({
      user: request.authenticatedUser,
    });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const user = request.authenticatedUser;

    if (!user) {
      return reply.code(401).send({ message: "Authentication required" });
    }

    try {
      await this.userService.logout(user.sessionId);

      return reply.code(200).send({ message: "Logout successful" });
    } catch (error) {
      request.log.error(error, "User logout failed");
      return reply.code(500).send({ message: "Unable to log out" });
    }
  }
}
