import dotenv from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: resolve(process.cwd(), "../../.env"),
});

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
