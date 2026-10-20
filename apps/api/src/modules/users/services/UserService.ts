import { UserRepository } from "../repositories/UserRepository.js";
import { AuthSessionService } from "./AuthSessionService.js";
import { PasswordService } from "./PasswordService.js";
export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async findById(id: string) {
    return this.userRepository.findById(id);
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email.trim().toLowerCase());
  }

  async register(input: RegisterUserInput) {
    const email = input.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await this.passwordService.hash(input.password);

    return this.userRepository.create({
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
    });
  }

  async login(input: LoginUserInput) {
    const email = input.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(email);

    if (!existingUser) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const passwordMatch = await this.passwordService.verify(
      existingUser.passwordHash,
      input.password,
    );

    if (!passwordMatch) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (existingUser.status !== "ACTIVE") {
      throw new Error("ACCOUNT_INACTIVE");
    }

    // Create a session only after authentication and account checks pass.
    const session = await this.authSessionService.createForUser(
      existingUser.id,
    );

    const { passwordHash, ...safeUser } = existingUser;

    return {
      user: safeUser,
      session,
    };
  }

  async authenticate(token: string) {
    return this.authSessionService.validateToken(token);
  }

  async logout(sessionId: string) {
    return this.authSessionService.revokeSession(sessionId);
  }
}
