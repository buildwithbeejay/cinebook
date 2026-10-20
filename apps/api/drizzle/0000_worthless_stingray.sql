CREATE TYPE "public"."session_seat_status" AS ENUM('AVAILABLE', 'HELD', 'BOOKED');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'ADMIN', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"release_date" date,
	"poster_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movies_duration_positive" CHECK ("movies"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"total_rows" integer NOT NULL,
	"total_columns" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_name_unique" UNIQUE("name"),
	CONSTRAINT "rooms_rows_positive" CHECK ("rooms"."total_rows" > 0),
	CONSTRAINT "rooms_columns_positive" CHECK ("rooms"."total_columns" > 0)
);
--> statement-breakpoint
CREATE TABLE "seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"row_label" varchar(5) NOT NULL,
	"seat_number" integer NOT NULL,
	"seat_type" varchar(30) DEFAULT 'STANDARD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seats_room_row_number_unique" UNIQUE("room_id","row_label","seat_number"),
	CONSTRAINT "seats_number_positive" CHECK ("seats"."seat_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "session_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"status" "session_seat_status" DEFAULT 'AVAILABLE' NOT NULL,
	"held_by" uuid,
	"hold_expires_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_seats_session_seat_unique" UNIQUE("session_id","seat_id"),
	CONSTRAINT "session_seats_version_nonnegative" CHECK ("session_seats"."version" >= 0),
	CONSTRAINT "session_seats_hold_state_consistent" CHECK ((
        ("session_seats"."status" = 'AVAILABLE' AND "session_seats"."held_by" IS NULL AND "session_seats"."hold_expires_at" IS NULL)
        OR ("session_seats"."status" = 'HELD' AND "session_seats"."held_by" IS NOT NULL AND "session_seats"."hold_expires_at" IS NOT NULL)
        OR ("session_seats"."status" = 'BOOKED' AND "session_seats"."held_by" IS NULL AND "session_seats"."hold_expires_at" IS NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"base_price" numeric(12, 2) NOT NULL,
	"status" "session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_valid_time_range" CHECK ("sessions"."ends_at" > "sessions"."starts_at"),
	CONSTRAINT "sessions_price_nonnegative" CHECK ("sessions"."base_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "user_role" DEFAULT 'CUSTOMER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_seats" ADD CONSTRAINT "session_seats_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_seats" ADD CONSTRAINT "session_seats_seat_id_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_seats" ADD CONSTRAINT "session_seats_held_by_users_id_fk" FOREIGN KEY ("held_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movies_title_idx" ON "movies" USING btree ("title");--> statement-breakpoint
CREATE INDEX "movies_published_idx" ON "movies" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "rooms_active_idx" ON "rooms" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "seats_room_idx" ON "seats" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "session_seats_session_status_idx" ON "session_seats" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "session_seats_hold_expiry_idx" ON "session_seats" USING btree ("hold_expires_at");--> statement-breakpoint
CREATE INDEX "sessions_movie_idx" ON "sessions" USING btree ("movie_id");--> statement-breakpoint
CREATE INDEX "sessions_room_start_idx" ON "sessions" USING btree ("room_id","starts_at");--> statement-breakpoint
CREATE INDEX "sessions_status_start_idx" ON "sessions" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");