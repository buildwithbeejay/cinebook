import { createHash, randomBytes } from "node:crypto";
import { AuthSessionRepository } from "../repositories/AuthSessionRepository.js";

const DEFAULT_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

interface AuthSessionServiceOptions {
  sessionLifetimeMs?: number;
}

export class AuthSessionService {
  private readonly sessionLifetimeMs: number;

  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    options: AuthSessionServiceOptions = {},
  ) {
    this.sessionLifetimeMs =
      options.sessionLifetimeMs ?? DEFAULT_SESSION_LIFETIME_MS;

    if (
      !Number.isSafeInteger(this.sessionLifetimeMs) ||
      this.sessionLifetimeMs <= 0
    ) {
      throw new Error("Session lifetime must be a positive integer");
    }
  }

  async createForUser(userId: string) {
    // Give the client a cryptographically secure bearer token.
    const token = randomBytes(32).toString("base64url");

    // Store only the SHA-256 hash in the database.
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const expiresAt = new Date(Date.now() + this.sessionLifetimeMs);

    // If persistence fails, this method throws and does not return a token.
    await this.sessionRepository.create({
      userId,
      tokenHash,
      expiresAt,
    });

    return {
      token,
      expiresAt,
    };
  }

  async validateToken(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    return this.sessionRepository.findActiveByTokenHash(tokenHash, new Date());
  }

  async revokeSession(sessionId: string) {
    return this.sessionRepository.revokeById(sessionId);
  }
}
