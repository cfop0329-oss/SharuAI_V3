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

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

function toInt(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

function toFloat(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function normalizeMlPayload(payload = {}) {
  return {
    applicationDate: payload.application_date ? new Date(payload.application_date) : null,
    region: payload.region || null,
    district: payload.district || null,
    akimat: payload.akimat || null,
    direction: payload.direction || null,
    species: payload.species || null,
    subsidyProgram: payload.subsidy_program || null,
    producerType: payload.producer_type || null,

    entitledAmountKzt: toFloat(payload.entitled_amount_kzt),
    subsidizedUnitsEst: toFloat(payload.subsidized_units_est),
    yearsInOperation: toInt(payload.years_in_operation),
    employeesCount: toInt(payload.employees_count),
    landAreaHa: toFloat(payload.land_area_ha),
    herdSizeHead: toFloat(payload.herd_size_head),
    outputVolumeTons: toFloat(payload.output_volume_tons),
    productivityIndex: toFloat(payload.productivity_index),
    revenueKzt: toFloat(payload.revenue_kzt),
    ebitdaMarginPct: toFloat(payload.ebitda_margin_pct),
    debtToRevenuePct: toFloat(payload.debt_to_revenue_pct),

    priorSubsidiesCount3y: toInt(payload.prior_subsidies_count_3y),
    priorSubsidiesAmountKzt3y: toFloat(payload.prior_subsidies_amount_kzt_3y),
    priorViolationsCount3y: toInt(payload.prior_violations_count_3y),
    priorRefundsCount3y: toInt(payload.prior_refunds_count_3y),
    priorRefundsAmountKzt3y: toFloat(payload.prior_refunds_amount_kzt_3y),
    unmetObligationsFlag: toInt(payload.unmet_obligations_flag),

    pastApplicationsCount: toInt(payload.past_applications_count),
    pastApprovedCount: toInt(payload.past_approved_count),
    pastRejectedCount: toInt(payload.past_rejected_count),
    pastWithdrawnCount: toInt(payload.past_withdrawn_count),
    pastPaidAmountKzt: toFloat(payload.past_paid_amount_kzt),
  };
}

function normalizeRiskFlags(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function mapMlQueueItem(app) {
  return {
    ...app,
    organization_name: app.user?.organization_name || "—",
    email: app.user?.email || "—",
    bin_iin: app.user?.bin_iin || "—",
    region: app.region || app.user?.region || "—",
    subsidyProgram: app.subsidyProgram || "—",
    requestedAmount: app.entitledAmountKzt ?? 0,
    riskFlags: normalizeRiskFlags(app.riskFlags),
  };
}

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
  const currentType = String(req.user?.user_type || "").toUpperCase();

  if (currentType === "ADMIN" || currentType === "EXPERT") {
    return next();
  }

  return res.status(403).json({
    message: "Доступ только для эксперта или администратора",
  });
}

function buildTokenPayload(user) {
  return {
    userId: user.id,
    email: user.email,
    bin_iin: user.bin_iin,
    user_type: user.user_type,
  };
}

function buildPublicUser(user) {
  return {
    id: user.id,
    bin_iin: user.bin_iin,
    email: user.email,
    organization_name: user.organization_name,
    user_type: user.user_type,
    org_form: user.org_form,
    director: user.director,
    region: user.region,
    district: user.district,
    rural_district: user.rural_district,
    locality: user.locality,
    phone: user.phone,
    postal_address: user.postal_address,
    certificate_file_url: user.certificate_file_url,
  };
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
      buildTokenPayload(user),
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Регистрация успешна",
      token,
      user: buildPublicUser(user),
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
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
      buildTokenPayload(user),
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Вход выполнен успешно",
      token,
      user: buildPublicUser(user),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

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

    if (
      !applicantName ||
      !region ||
      !subsidyProgram ||
      requestedAmount === undefined ||
      requestedAmount === null ||
      requestedAmount === ""
    ) {
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
        landAreaHa:
          landAreaHa !== undefined && landAreaHa !== ""
            ? Number(landAreaHa)
            : null,
        employeesCount:
          employeesCount !== undefined && employeesCount !== ""
            ? Number(employeesCount)
            : null,
        annualRevenue:
          annualRevenue !== undefined && annualRevenue !== ""
            ? Number(annualRevenue)
            : null,
        taxDebt:
          taxDebt !== undefined && taxDebt !== ""
            ? Number(taxDebt)
            : 0,
        creditDebt:
          creditDebt !== undefined && creditDebt !== ""
            ? Number(creditDebt)
            : 0,
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
    console.error("CREATE APPLICATION ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера при создании заявки" });
  }
});

app.get("/api/applications/my", authMiddleware, async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(applications);
  } catch (error) {
    console.error("MY APPLICATIONS ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

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
            region: true,
            district: true,
            phone: true,
            postal_address: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const mapped = applications.map((app) => ({
      ...app,
      organization_name: app.user?.organization_name || app.applicantName || "—",
      email: app.user?.email || "—",
      bin_iin: app.user?.bin_iin || "—",
      region: app.region || app.user?.region || "—",
    }));

    mapped.sort((a, b) => {
      const byPriority = priorityRank(b.priority) - priorityRank(a.priority);
      if (byPriority !== 0) return byPriority;

      const byScore = (b.score || 0) - (a.score || 0);
      if (byScore !== 0) return byScore;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(mapped);
  } catch (error) {
    console.error("QUEUE ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

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
    console.error("STATS ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.patch("/api/applications/:id/status", authMiddleware, requireExpert, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["NEW", "REVIEW", "IN_REVIEW", "APPROVED", "REJECTED"];

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
    console.error("UPDATE STATUS ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.post("/api/ml-applications", authMiddleware, async (req, res) => {
  try {
    const payload = req.body || {};

    const mlResponse = await fetch(`${ML_SERVICE_URL}/api/ml/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const mlData = await mlResponse.json().catch(() => ({}));

    if (!mlResponse.ok) {
      return res.status(502).json({
        message: mlData?.detail || mlData?.message || "ML сервис недоступен",
      });
    }

    const scored = mlData?.application || {};

    const application = await prisma.mlSubsidyApplication.create({
      data: {
        userId: req.user.userId,
        ...normalizeMlPayload(payload),
        score: typeof scored.score === "number" ? scored.score : toFloat(scored.score),
        priority: scored.priority || "LOW",
        recommendation: scored.recommendation || "Передать эксперту на рассмотрение",
        riskFlags: Array.isArray(scored.riskFlags) ? scored.riskFlags : [],
        rawPayload: payload,
        status: "NEW",
      },
      include: {
        user: {
          select: {
            organization_name: true,
            email: true,
            bin_iin: true,
            user_type: true,
            region: true,
            district: true,
            phone: true,
            postal_address: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Заявка создана и сохранена в БД",
      application: mapMlQueueItem(application),
    });
  } catch (error) {
    console.error("CREATE ML APPLICATION ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера при создании ML-заявки" });
  }
});

app.get("/api/ml-applications/my", authMiddleware, async (req, res) => {
  try {
    const applications = await prisma.mlSubsidyApplication.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ applications });
  } catch (error) {
    console.error("MY ML APPLICATIONS ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.get("/api/ml-applications/queue", authMiddleware, requireExpert, async (req, res) => {
  try {
    const applications = await prisma.mlSubsidyApplication.findMany({
      include: {
        user: {
          select: {
            organization_name: true,
            email: true,
            bin_iin: true,
            user_type: true,
            region: true,
            district: true,
            phone: true,
            postal_address: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = applications.map(mapMlQueueItem);

    mapped.sort((a, b) => {
      const byPriority = priorityRank(b.priority) - priorityRank(a.priority);
      if (byPriority !== 0) return byPriority;

      const byScore = Number(b.score || 0) - Number(a.score || 0);
      if (byScore !== 0) return byScore;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ applications: mapped });
  } catch (error) {
    console.error("ML QUEUE ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.get("/api/ml-applications/stats", authMiddleware, requireExpert, async (req, res) => {
  try {
    const applications = await prisma.mlSubsidyApplication.findMany();

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
                applications.reduce((sum, a) => sum + Number(a.score || 0), 0) /
                applications.length
              ).toFixed(2)
            )
          : 0,
    };

    res.json(stats);
  } catch (error) {
    console.error("ML STATS ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.patch("/api/ml-applications/:id/status", authMiddleware, requireExpert, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["NEW", "REVIEW", "IN_REVIEW", "APPROVED", "REJECTED"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Недопустимый статус" });
    }

    const applicationId = Number(id);
    if (Number.isNaN(applicationId)) {
      return res.status(400).json({ message: "Некорректный ID заявки" });
    }

    const existing = await prisma.mlSubsidyApplication.findUnique({
      where: { id: applicationId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    const updated = await prisma.mlSubsidyApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    res.json({
      message: "Статус обновлён",
      application: updated,
    });
  } catch (error) {
    console.error("UPDATE ML STATUS ERROR:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

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