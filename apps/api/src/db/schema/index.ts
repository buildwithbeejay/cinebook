import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  time,
  numeric,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Account roles
export const userRoleEnum = pgEnum("user_role", ["CUSTOMER", "ADMIN", "STAFF"]);

// Account status
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED"]);

// Screening status
export const sessionStatusEnum = pgEnum("session_status", [
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED",
]);

// Seat availability for a particular screening
export const sessionSeatStatusEnum = pgEnum("session_seat_status", [
  "AVAILABLE",
  "HELD",
  "BOOKED",
]);

// 1. Users
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    role: userRoleEnum("role").notNull().default("CUSTOMER"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("users_email_unique").on(table.email),
    index("users_status_idx").on(table.status),
  ],
);

// 2. Movies
export const movies = pgTable(
  "movies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    releaseDate: date("release_date"),
    posterUrl: text("poster_url"),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("movies_duration_positive", sql`${table.durationMinutes} > 0`),
    index("movies_title_idx").on(table.title),
    index("movies_published_idx").on(table.isPublished),
  ],
);

// 3. Cinema rooms
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    totalRows: integer("total_rows").notNull(),
    totalColumns: integer("total_columns").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("rooms_name_unique").on(table.name),
    check("rooms_rows_positive", sql`${table.totalRows} > 0`),
    check("rooms_columns_positive", sql`${table.totalColumns} > 0`),
    index("rooms_active_idx").on(table.isActive),
  ],
);

// 4. Physical seats
export const seats = pgTable(
  "seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    rowLabel: varchar("row_label", { length: 5 }).notNull(),
    seatNumber: integer("seat_number").notNull(),
    seatType: varchar("seat_type", { length: 30 })
      .notNull()
      .default("STANDARD"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("seats_room_row_number_unique").on(
      table.roomId,
      table.rowLabel,
      table.seatNumber,
    ),
    check("seats_number_positive", sql`${table.seatNumber} > 0`),
    index("seats_room_idx").on(table.roomId),
  ],
);

// 5. Movie screening sessions
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "restrict" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
    }).notNull(),
    basePrice: numeric("base_price", {
      precision: 12,
      scale: 2,
    }).notNull(),
    status: sessionStatusEnum("status").notNull().default("SCHEDULED"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "sessions_valid_time_range",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    check("sessions_price_nonnegative", sql`${table.basePrice} >= 0`),
    index("sessions_movie_idx").on(table.movieId),
    index("sessions_room_start_idx").on(table.roomId, table.startsAt),
    index("sessions_status_start_idx").on(table.status, table.startsAt),
  ],
);

// 6. Seat state for each screening
export const sessionSeats = pgTable(
  "session_seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "restrict" }),
    seatId: uuid("seat_id")
      .notNull()
      .references(() => seats.id, { onDelete: "restrict" }),
    status: sessionSeatStatusEnum("status").notNull().default("AVAILABLE"),
    heldBy: uuid("held_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    holdExpiresAt: timestamp("hold_expires_at", {
      withTimezone: true,
    }),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("session_seats_session_seat_unique").on(
      table.sessionId,
      table.seatId,
    ),
    check("session_seats_version_nonnegative", sql`${table.version} >= 0`),
    check(
      "session_seats_hold_state_consistent",
      sql`(
        (${table.status} = 'AVAILABLE' AND ${table.heldBy} IS NULL AND ${table.holdExpiresAt} IS NULL)
        OR (${table.status} = 'HELD' AND ${table.heldBy} IS NOT NULL AND ${table.holdExpiresAt} IS NOT NULL)
        OR (${table.status} = 'BOOKED' AND ${table.heldBy} IS NULL AND ${table.holdExpiresAt} IS NULL)
      )`,
    ),
    index("session_seats_session_status_idx").on(table.sessionId, table.status),
    index("session_seats_hold_expiry_idx").on(table.holdExpiresAt),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("auth_sessions_user_id_idx").on(table.userId)],
);
