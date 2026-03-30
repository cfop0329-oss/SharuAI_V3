import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads"),
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.get("/", (_, res) => {
  res.send("API работает");
});

app.post("/api/auth/register", upload.single("certificate"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
        message: "Загрузите свидетельство о государственной регистрации"
  });
    }
  try {
    const {
      bin_iin,
      user_type,
      org_form,
      organization_name,
      registration_date,
      director,
      region,
      district,
      rural_district,
      locality,
      phone,
      postal_address,
      email,
      password,
    } = req.body;

    if (!bin_iin || !user_type || !org_form || !organization_name || !director || !region || !email || !password) {
      return res.status(400).json({ message: "Заполните обязательные поля" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { bin_iin }],
      },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Пользователь уже существует" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        bin_iin,
        user_type,
        org_form,
        organization_name,
        registration_date: registration_date ? new Date(registration_date) : null,
        director,
        region,
        district: district || null,
        rural_district: rural_district || null,
        locality: locality || null,
        phone: phone || null,
        postal_address: postal_address || null,
        email,
        password_hash,
        certificate_file_url: req.file ? `/uploads/${req.file.filename}` : null,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Регистрация успешна",
      token,
      user: {
        id: user.id,
        email: user.email,
        organization_name: user.organization_name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { bin_iin, password } = req.body;

    if (!bin_iin || !password) {
      return res.status(400).json({ message: "Введите БИН/ИИН и пароль" });
    }

    const user = await prisma.user.findUnique({
      where: { bin_iin },
    });

    if (!user) {
      return res.status(401).json({ message: "Пользователь не найден" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Неверный пароль" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        bin_iin: user.bin_iin,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Вход выполнен успешно",
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
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server started on port 5000");
});