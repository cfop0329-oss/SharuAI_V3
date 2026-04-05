import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

function pickFirst(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return null;
}

function normalizeApplications(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.applications)) return data.applications;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalizeRiskFlags(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeApplication(app) {
  const user = app?.user || {};

  return {
    ...app,
    organizationName:
      pickFirst(
        app?.organization_name,
        app?.organizationName,
        user?.organization_name,
        user?.organizationName,
        app?.applicantName,
        app?.applicant_name
      ) || "—",

    email:
      pickFirst(
        app?.email,
        app?.user_email,
        app?.applicant_email,
        user?.email
      ) || "—",

    binIin:
      pickFirst(
        app?.bin_iin,
        app?.binIin,
        app?.iin,
        app?.bin,
        user?.bin_iin,
        user?.binIin
      ) || "—",

    region:
      pickFirst(
        app?.region,
        app?.region_name
      ) || "Не указан",

    subsidyProgram:
      pickFirst(
        app?.subsidyProgram,
        app?.subsidy_program,
        app?.program,
        app?.program_type
      ) || "Не указана",

    requestedAmount: pickFirst(
      app?.requestedAmount,
      app?.requested_amount,
      app?.amount,
      app?.sum
    ),

    score: pickFirst(
      app?.score,
      app?.ml_score
    ),

    priority:
      pickFirst(
        app?.priority,
        app?.priority_level
      ) || "LOW",

    recommendation:
      pickFirst(
        app?.recommendation,
        app?.recommendation_text,
        app?.decision_hint
      ) || "—",

    status:
      pickFirst(
        app?.status,
        app?.application_status
      ) || "NEW",

    riskFlags: normalizeRiskFlags(
      pickFirst(app?.riskFlags, app?.risk_flags, app?.risks)
    ),
  };
}

function priorityLabel(priority) {
  if (priority === "HIGH") return "Высокий";
  if (priority === "MEDIUM") return "Средний";
  if (priority === "LOW") return "Низкий";
  return priority || "—";
}

function statusLabel(status) {
  if (status === "NEW") return "Новые";
  if (status === "REVIEW") return "На проверке";
  if (status === "IN_REVIEW") return "В рассмотрении";
  if (status === "APPROVED") return "Одобрено";
  if (status === "REJECTED") return "Отклонено";
  return status || "—";
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  return Number.isNaN(num) ? "—" : num.toLocaleString("ru-RU");
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function isExpertOrAdmin(user) {
  const role = String(
    user?.role || user?.user_role || user?.account_role || ""
  ).toUpperCase();

  const userType = String(user?.user_type || "").toLowerCase();

  return (
    role === "EXPERT" ||
    role === "ADMIN" ||
    userType.includes("эксперт") ||
    userType.includes("админ") ||
    userType.includes("admin")
  );
}

export default function ExpertQueue() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const token = localStorage.getItem("token");
  const currentUser = getCurrentUser();
  const canOpenExpertQueue = isExpertOrAdmin(currentUser);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setAccessDenied(false);

      if (!token) {
        setApplications([]);
        setStats(null);
        setError("Нет токена. Сначала войдите в систему.");
        return;
      }

      const [appsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/applications/queue`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/api/applications/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const [appsData, statsData] = await Promise.all([
        safeJson(appsRes),
        safeJson(statsRes),
      ]);

      console.log("QUEUE RESPONSE:", appsData);
      console.log("STATS RESPONSE:", statsData);
      console.log("CURRENT USER:", currentUser);
      console.log("CAN OPEN EXPERT QUEUE:", canOpenExpertQueue);

      if (
        appsRes.status === 401 ||
        appsRes.status === 403 ||
        statsRes.status === 401 ||
        statsRes.status === 403
      ) {
        setApplications([]);
        setStats(null);
        setAccessDenied(true);
        setError(
          appsData?.message ||
            statsData?.message ||
            "Доступ только для эксперта или администратора"
        );
        return;
      }

      if (!appsRes.ok || !statsRes.ok) {
        const message =
          appsData?.message ||
          statsData?.message ||
          `Ошибка доступа: queue=${appsRes.status}, stats=${statsRes.status}`;

        setApplications([]);
        setStats(null);
        setError(message);
        return;
      }

      const normalizedApps = normalizeApplications(appsData).map(normalizeApplication);

      setApplications(normalizedApps);
      setStats(statsData && typeof statsData === "object" ? statsData : {});
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
      setApplications([]);
      setStats(null);
      setError(err?.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      setError("");
      setUpdatingId(id);

      if (!token) {
        setError("Нет токена. Сначала войдите в систему.");
        return;
      }

      const res = await fetch(`${API_URL}/api/applications/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setError(data?.message || "Ошибка обновления статуса");
        return;
      }

      const newStatus = data?.application?.status || status;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app
        )
      );
    } catch (err) {
      console.error("Ошибка обновления статуса:", err);
      setError(err?.message || "Ошибка обновления статуса");
    } finally {
      setUpdatingId(null);
    }
  }

  const priorityChartData = useMemo(() => {
    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    applications.forEach((app) => {
      const key = app.priority || "LOW";
      counts[key] = (counts[key] || 0) + 1;
    });

    return [
      { name: "Высокий", value: counts.HIGH || 0 },
      { name: "Средний", value: counts.MEDIUM || 0 },
      { name: "Низкий", value: counts.LOW || 0 },
    ];
  }, [applications]);

  const statusChartData = useMemo(() => {
    const counts = {};

    applications.forEach((app) => {
      const key = app.status || "NEW";
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts).map(([key, value]) => ({
      name: statusLabel(key),
      value,
    }));
  }, [applications]);

  const regionChartData = useMemo(() => {
    const counts = {};

    applications.forEach((app) => {
      const key = app.region || "Не указан";
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [applications]);

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Очередь заявок эксперта</h1>
          <p style={styles.subtitle}>
            Приоритетные заявки, скоринг и смена статуса
          </p>
          <div style={styles.metaText}>
            API: {API_URL}
            {lastUpdated ? ` • Обновлено: ${lastUpdated.toLocaleTimeString("ru-RU")}` : ""}
          </div>
        </div>

        <button onClick={loadData} style={styles.refreshButton} disabled={loading}>
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {accessDenied && currentUser && (
        <div style={styles.profileCard}>
          <h2 style={styles.profileTitle}>Ваши данные из формы пользователя</h2>
          <p style={styles.profileText}>
            Это данные вашего аккаунта. Полная очередь доступна только роли эксперт/админ.
          </p>

          <div style={styles.profileGrid}>
            <ProfileItem label="БИН / ИИН" value={currentUser?.bin_iin || "—"} />
            <ProfileItem label="Email" value={currentUser?.email || "—"} />
            <ProfileItem label="Организация" value={currentUser?.organization_name || "—"} />
            <ProfileItem label="Тип пользователя" value={currentUser?.user_type || "—"} />
            <ProfileItem label="Область" value={currentUser?.region || "—"} />
            <ProfileItem label="Район" value={currentUser?.district || "—"} />
            <ProfileItem label="Телефон" value={currentUser?.phone || "—"} />
            <ProfileItem label="Почтовый адрес" value={currentUser?.postal_address || "—"} />
          </div>
        </div>
      )}

      {!accessDenied && !error && stats && (
        <div style={styles.statsGrid}>
          <Card title="Всего" value={stats.total ?? applications.length ?? 0} />
          <Card title="Высокий приоритет" value={stats.high ?? priorityChartData[0]?.value ?? 0} />
          <Card title="Средний приоритет" value={stats.medium ?? priorityChartData[1]?.value ?? 0} />
          <Card title="Низкий приоритет" value={stats.low ?? priorityChartData[2]?.value ?? 0} />
          <Card
            title="С рисками"
            value={
              stats.reviewNeeded ??
              applications.filter((app) => Array.isArray(app.riskFlags) && app.riskFlags.length > 0).length
            }
          />
          <Card title="Средний score" value={stats.avgScore ?? "—"} />
        </div>
      )}

      {!accessDenied && !error && (
        <div style={styles.chartsGrid}>
          <ChartCard title="Распределение по приоритету">
            {applications.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label
                  >
                    {priorityChartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Нет данных для графика" />
            )}
          </ChartCard>

          <ChartCard title="Статусы заявок">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-10} textAnchor="end" height={55} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Нет данных для графика" />
            )}
          </ChartCard>

          <ChartCard title="Топ регионов по количеству заявок">
            {regionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={regionChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, bottom: 10, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Нет данных для графика" />
            )}
          </ChartCard>
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Организация</Th>
              <Th>Почта</Th>
              <Th>БИН/ИИН</Th>
              <Th>Регион</Th>
              <Th>Программа</Th>
              <Th>Сумма</Th>
              <Th>Score</Th>
              <Th>Приоритет</Th>
              <Th>Риски</Th>
              <Th>Рекомендация</Th>
              <Th>Статус</Th>
              <Th>Действие</Th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={13}>Загрузка данных...</Td>
              </tr>
            ) : accessDenied ? (
              <tr>
                <Td colSpan={13}>
                  Полная очередь недоступна для обычного пользователя. Войдите под экспертом или админом.
                </Td>
              </tr>
            ) : !Array.isArray(applications) || applications.length === 0 ? (
              <tr>
                <Td colSpan={13}>
                  {error ? "Не удалось загрузить заявки" : "Нет заявок для отображения"}
                </Td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id}>
                  <Td>{app.id}</Td>
                  <Td>{app.organizationName}</Td>
                  <Td>{app.email}</Td>
                  <Td>{app.binIin}</Td>
                  <Td>{app.region}</Td>
                  <Td>{app.subsidyProgram}</Td>
                  <Td>{safeNumber(app.requestedAmount)}</Td>
                  <Td>{app.score ?? "—"}</Td>
                  <Td>{priorityLabel(app.priority)}</Td>
                  <Td>
                    {Array.isArray(app.riskFlags) && app.riskFlags.length > 0 ? (
                      <ul style={styles.riskList}>
                        {app.riskFlags.map((flag, idx) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    ) : (
                      "Нет"
                    )}
                  </Td>
                  <Td>{app.recommendation}</Td>
                  <Td>{app.status || "NEW"}</Td>
                  <Td>
                    <select
                      value={app.status || "NEW"}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      disabled={updatingId === app.id}
                      style={styles.select}
                    >
                      <option value="NEW">NEW</option>
                      <option value="REVIEW">REVIEW</option>
                      <option value="IN_REVIEW">IN_REVIEW</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div style={styles.profileItem}>
      <div style={styles.profileLabel}>{label}</div>
      <div style={styles.profileValue}>{value}</div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitle}>{title}</div>
      {children}
    </div>
  );
}

function EmptyChart({ text }) {
  return <div style={styles.emptyChart}>{text}</div>;
}

function Th({ children }) {
  return <th style={styles.th}>{children}</th>;
}

function Td({ children, colSpan }) {
  return (
    <td colSpan={colSpan} style={styles.td}>
      {children}
    </td>
  );
}

const styles = {
  page: {
    padding: "24px",
    background: "#f6f8fb",
    minHeight: "100vh",
    color: "#1f2937",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "20px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
  },
  subtitle: {
    marginTop: "8px",
    marginBottom: "6px",
    color: "#6b7280",
  },
  metaText: {
    fontSize: "13px",
    color: "#6b7280",
  },
  refreshButton: {
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    cursor: "pointer",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
  },
  errorBox: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: "12px 14px",
    borderRadius: "12px",
    marginBottom: "16px",
    fontWeight: 600,
  },
  profileCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "20px",
  },
  profileTitle: {
    margin: "0 0 8px",
    fontSize: "22px",
    fontWeight: 800,
  },
  profileText: {
    margin: "0 0 18px",
    color: "#64748b",
  },
  profileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
    gap: "12px",
  },
  profileItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px",
  },
  profileLabel: {
    color: "#64748b",
    fontSize: "13px",
    marginBottom: "6px",
    fontWeight: 600,
  },
  profileValue: {
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: 700,
    wordBreak: "break-word",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(160px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "16px",
  },
  cardTitle: {
    color: "#6b7280",
    fontSize: "13px",
    marginBottom: "8px",
    fontWeight: 600,
  },
  cardValue: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#111827",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(260px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  chartCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "16px",
    minHeight: "340px",
  },
  chartTitle: {
    fontSize: "16px",
    fontWeight: 700,
    marginBottom: "12px",
    color: "#111827",
  },
  emptyChart: {
    height: "280px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    border: "1px dashed #d1d5db",
    borderRadius: "12px",
    background: "#f9fafb",
  },
  tableWrap: {
    overflowX: "auto",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1400px",
  },
  th: {
    textAlign: "left",
    background: "#f9fafb",
    padding: "14px",
    fontSize: "13px",
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 700,
    verticalAlign: "top",
  },
  td: {
    padding: "14px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
    fontSize: "14px",
  },
  riskList: {
    margin: 0,
    paddingLeft: "18px",
  },
  select: {
    minWidth: "140px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "8px 10px",
    background: "#fff",
  },
};