import bcrypt from "bcryptjs";

// Salted password hashing via bcryptjs — a well-maintained, pure-JS
// implementation of bcrypt (no native compilation step, so it installs
// reliably in any environment). Never invent a hashing algorithm; never
// store or log plaintext passwords.
const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// Constant-time-safe comparison is handled internally by bcryptjs.
export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}
