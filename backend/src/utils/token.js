import jwt from "jsonwebtoken";

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      bin_iin: user.bin_iin,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}