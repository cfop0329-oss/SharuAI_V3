import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ message: "Пользователь не найден" });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      bin_iin: user.bin_iin,
      user_type: user.user_type,
      organization_name: user.organization_name,
      region: user.region,
      district: user.district,
      phone: user.phone,
      postal_address: user.postal_address,
    };

    next();
  } catch (error) {
    console.error("authMiddleware error:", error);
    return res.status(401).json({ message: "Недействительный токен" });
  }
}