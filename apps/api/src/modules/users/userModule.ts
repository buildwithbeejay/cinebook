import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema/index.js";

import { UserRepository } from "./repositories/UserRepository.js";
import { UserService } from "./services/UserService.js";
import { PasswordService } from "./services/PasswordService.js";
import { AuthSessionRepository } from "./repositories/AuthSessionRepository.js";
import { AuthSessionService } from "./services/AuthSessionService.js";

interface UserModuleOptions {
  db: NodePgDatabase<typeof schema>;
}

export const createUserModule = ({ db }: UserModuleOptions) => {
  const userRepository = new UserRepository(db);
  const passwordService = new PasswordService();

  const authSessionRepository = new AuthSessionRepository(db);
  const authSessionService = new AuthSessionService(authSessionRepository);

  const userService = new UserService(
    userRepository,
    passwordService,
    authSessionService,
  );

  return {
    userRepository,
    passwordService,
    authSessionRepository,
    authSessionService,
    userService,
  };
};
