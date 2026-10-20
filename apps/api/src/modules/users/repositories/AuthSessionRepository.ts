import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../db/schema/index.js";
import { authSessions } from "../../../db/schema/index.js";
import { eq, and, isNull, gt } from "drizzle-orm";

export class AuthSessionRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    const [session] = await this.db
      .insert(authSessions)
      .values(data)
      .returning({
        id: authSessions.id,
        userId: authSessions.userId,
        expiresAt: authSessions.expiresAt,
        createdAt: authSessions.createdAt,
      });

    return session;
  }

  async findActiveByTokenHash(tokenHash: string, now: Date) {
    const [result] = await this.db
      .select({
        sessionId: authSessions.id,
        sessionExpiresAt: authSessions.expiresAt,
        userId: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        role: schema.users.role,
        status: schema.users.status,
        emailVerified: schema.users.emailVerified,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      })
      .from(authSessions)
      .innerJoin(schema.users, eq(authSessions.userId, schema.users.id))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
          eq(schema.users.status, "ACTIVE"),
        ),
      )
      .limit(1);

    return result ?? null;
  }

  async revokeById(sessionId: string) {
    const [session] = await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)),
      )
      .returning({ id: authSessions.id });

    return session ?? null;
  }
}
