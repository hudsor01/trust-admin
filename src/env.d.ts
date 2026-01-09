/// <reference types="bun-types" />

/**
 * Type-safe environment variables for Trust Admin
 * Bun automatically loads .env files, so no dotenv package is needed.
 * Access via process.env.VAR_NAME or Bun.env.VAR_NAME
 */
declare module "bun" {
  interface Env {
    // Database
    DATABASE_URL: string;

    // Server
    PORT?: string;
    NODE_ENV?: "development" | "production" | "test";

    // Add additional environment variables as needed
  }
}

export {};
