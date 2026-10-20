export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CUSTOMER" | "ADMIN" | "STAFF";
  status: "ACTIVE" | "SUSPENDED";
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  sessionId: string;
}
