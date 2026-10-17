import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

export function validatePassword(password: string, username = ""): string | null {
  if (password.length < 12) return "Password must contain at least 12 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return "Password must contain upper and lower case letters.";
  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return "Password must contain a number and a symbol.";
  if (username && password.toLowerCase().includes(username.toLowerCase())) return "Password must not contain the staff ID or username.";
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });
  return ["scrypt", COST, BLOCK_SIZE, PARALLELIZATION, salt.toString("base64url"), derived.toString("base64url")].join("$");
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, cost, blockSize, parallelization, saltValue, hashValue, extra] = encoded.split("$");
  if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !saltValue || !hashValue || extra) return false;
  const expected = Buffer.from(hashValue, "base64url");
  if (expected.length !== KEY_LENGTH) return false;
  try {
    const actual = scryptSync(password, Buffer.from(saltValue, "base64url"), expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
      maxmem: MAX_MEMORY,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function generateTemporaryPassword(): string {
  return `A9!${randomBytes(18).toString("base64url")}z`;
}
