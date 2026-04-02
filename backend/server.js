import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { authMiddleware } from "./middleware/auth.js";
import { calculateApplicationScore } from "./utils/scoring.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET не найден в .env");
}

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
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const allowedMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Разрешены только PDF, PNG, JPG, JPEG"));
    }
    cb(null, true);
  },
});

function requireExpert(req, res, next) {
  const allowedRoles = ["EXPERT", "ADMIN", "expert", "admin"];
  if (!req.user || !allowedRoles.includes(req.user.user_type)) {
    return res.status(403).json({ message: "Доступ только для эксперта или администратора" });
  }
  next();
}

function priorityRank(priority) {
  if (priority === "HIGH") return 3;
  if (priority === "MEDIUM") return 2;
  return 1;
}

app.get("/", (_, res) => {
  res.send("API работает");
});

app.post("/api/auth/register", upload.single("certificate"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Загрузите свидетельство о государственной регистрации",
      });
    }

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

    if (
      !bin_iin ||
      !user_type ||
      !org_form ||
      !organization_name ||
      !director ||
      !region ||
      !email ||
      !password
    ) {
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
        certificate_file_url: `/uploads/${req.file.filename}`,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        bin_iin: user.bin_iin,
        user_type: user.user_type,
      },
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
        user_type: user.user_type,
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
        email: user.email,
        bin_iin: user.bin_iin,
        user_type: user.user_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Вход выполнен успешно",
      token,
      user: {
        id: user.id,
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

// Создание заявки + автоматический скоринг
app.post("/api/applications", authMiddleware, async (req, res) => {
  try {
    const {
      applicantName,
      region,
      subsidyProgram,
      requestedAmount,
      landAreaHa,
      employeesCount,
      annualRevenue,
      taxDebt,
      creditDebt,
      priorViolationsCount3y,
      priorRefundsCount3y,
      pastApplicationsCount,
      approvedSubsidiesCount,
    } = req.body;

    if (!applicantName || !region || !subsidyProgram || requestedAmount === undefined || requestedAmount === null || requestedAmount === "") {
      return res.status(400).json({
        message: "Заполните обязательные поля заявки",
      });
    }

    const scoring = calculateApplicationScore({
      requestedAmount,
      landAreaHa,
      employeesCount,
      annualRevenue,
      taxDebt,
      creditDebt,
      priorViolationsCount3y,
      priorRefundsCount3y,
      pastApplicationsCount,
      approvedSubsidiesCount,
    });

    const application = await prisma.application.create({
      data: {
        userId: req.user.userId,
        applicantName,
        region,
        subsidyProgram,
        requestedAmount: Number(requestedAmount),
        landAreaHa: landAreaHa !== undefined && landAreaHa !== "" ? Number(landAreaHa) : null,
        employeesCount: employeesCount !== undefined && employeesCount !== "" ? Number(employeesCount) : null,
        annualRevenue: annualRevenue !== undefined && annualRevenue !== "" ? Number(annualRevenue) : null,
        taxDebt: taxDebt !== undefined && taxDebt !== "" ? Number(taxDebt) : 0,
        creditDebt: creditDebt !== undefined && creditDebt !== "" ? Number(creditDebt) : 0,
        priorViolationsCount3y:
          priorViolationsCount3y !== undefined && priorViolationsCount3y !== ""
            ? Number(priorViolationsCount3y)
            : 0,
        priorRefundsCount3y:
          priorRefundsCount3y !== undefined && priorRefundsCount3y !== ""
            ? Number(priorRefundsCount3y)
            : 0,
        pastApplicationsCount:
          pastApplicationsCount !== undefined && pastApplicationsCount !== ""
            ? Number(pastApplicationsCount)
            : 0,
        approvedSubsidiesCount:
          approvedSubsidiesCount !== undefined && approvedSubsidiesCount !== ""
            ? Number(approvedSubsidiesCount)
            : 0,
        score: scoring.score,
        priority: scoring.priority,
        recommendation: scoring.recommendation,
        riskFlags: scoring.riskFlags,
        explanation: scoring.explanation,
      },
    });

    res.status(201).json({
      message: "Заявка создана и оценена",
      application,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера при создании заявки" });
  }
});

// Мои заявки
app.get("/api/applications/my", authMiddleware, async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Очередь эксперта
app.get("/api/applications/queue", authMiddleware, requireExpert, async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      include: {
        user: {
          select: {
            organization_name: true,
            email: true,
            bin_iin: true,
            user_type: true,
          },
        },
      },
    });

    applications.sort((a, b) => {
      const byPriority = priorityRank(b.priority) - priorityRank(a.priority);
      if (byPriority !== 0) return byPriority;

      const byScore = (b.score || 0) - (a.score || 0);
      if (byScore !== 0) return byScore;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Статистика для дашборда
app.get("/api/applications/stats", authMiddleware, requireExpert, async (req, res) => {
  try {
    const applications = await prisma.application.findMany();

    const stats = {
      total: applications.length,
      high: applications.filter((a) => a.priority === "HIGH").length,
      medium: applications.filter((a) => a.priority === "MEDIUM").length,
      low: applications.filter((a) => a.priority === "LOW").length,
      reviewNeeded: applications.filter(
        (a) => Array.isArray(a.riskFlags) && a.riskFlags.length > 0
      ).length,
      avgScore:
        applications.length > 0
          ? Number(
              (
                applications.reduce((sum, a) => sum + (a.score || 0), 0) /
                applications.length
              ).toFixed(2)
            )
          : 0,
    };

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Обновить статус заявки экспертом
app.patch("/api/applications/:id/status", authMiddleware, requireExpert, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["NEW", "REVIEW", "APPROVED", "REJECTED"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Недопустимый статус" });
    }

    const applicationId = Number(id);
    if (Number.isNaN(applicationId)) {
      return res.status(400).json({ message: "Некорректный ID заявки" });
    }

    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!existingApplication) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status },
    });

    res.json({
      message: "Статус обновлён",
      application: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Глобальный обработчик ошибок — после роутов
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: `Ошибка загрузки файла: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      message: err.message || "Ошибка запроса",
    });
  }

  next();
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server started on port ${process.env.PORT || 5000}`);
});