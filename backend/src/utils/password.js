import bcrypt from "bcrypt";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}