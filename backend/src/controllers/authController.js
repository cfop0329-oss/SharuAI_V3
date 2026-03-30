import {
  createUser,
  findExistingUser,
  loginUser,
} from "../services/authService.js";
import prisma from "../config/prisma.js";
import { generateToken } from "../utils/token.js";

export async function register(req, res) {
  try {
    const data = req.body;

    if (
      !data.bin_iin ||
      !data.user_type ||
      !data.org_form ||
      !data.organization_name ||
      !data.director ||
      !data.region ||
      !data.email ||
      !data.password
    ) {
      return res.status(400).json({ message: "Заполните обязательные поля" });
    }

    const existingUser = await findExistingUser({
      email: data.email,
      bin_iin: data.bin_iin,
    });

    if (existingUser) {
      return res.status(409).json({ message: "Пользователь уже существует" });
    }

    const certificateFileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const user = await createUser(data, certificateFileUrl);
    const token = generateToken(user);

    return res.status(201).json({
      message: "Регистрация успешна",
      token,
      user: {
        id: user.id,
        bin_iin: user.bin_iin,
        email: user.email,
        organization_name: user.organization_name,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
}

export async function login(req, res) {
  try {
    const { bin_iin, password } = req.body;

    if (!bin_iin || !password) {
      return res.status(400).json({ message: "Введите БИН/ИИН и пароль" });
    }

    const result = await loginUser(bin_iin, password);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    return res.json({
      message: "Вход выполнен успешно",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
}

export async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.json({
      id: user.id,
      bin_iin: user.bin_iin,
      email: user.email,
      organization_name: user.organization_name,
      user_type: user.user_type,
      registration_date: user.registration_date,
      director: user.director,
      region: user.region,
    });
  } catch (error) {
    console.error("ME ERROR:", error);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
}