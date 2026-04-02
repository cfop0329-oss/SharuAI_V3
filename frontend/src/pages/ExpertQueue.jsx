import { useEffect, useState } from "react";

const API_URL = "http://localhost:5001";

export default function ExpertQueue() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const token = localStorage.getItem("token");

  const normalizeApplications = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.applications)) return data.applications;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const priorityLabel = (priority) => {
    if (priority === "HIGH") return "Высокий";
    if (priority === "MEDIUM") return "Средний";
    if (priority === "LOW") return "Низкий";
    return priority || "—";
  };

  const safeNumber = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    return Number.isNaN(num) ? "—" : num.toLocaleString();
  };

  async function loadData() {
    try {
      setLoading(true);
      setError("");

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

      const appsData = await appsRes.json().catch(() => ({}));
      const statsData = await statsRes.json().catch(() => ({}));

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

      setApplications(normalizeApplications(appsData));
      setStats(statsData && typeof statsData === "object" ? statsData : null);
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
      setApplications([]);
      setStats(null);
      setError("Ошибка загрузки данных");
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Ошибка обновления статуса");
        return;
      }

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: data?.application?.status || status } : app
        )
      );
    } catch (err) {
      console.error("Ошибка обновления статуса:", err);
      setError("Ошибка обновления статуса");
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.infoBox}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Очередь заявок эксперта</h1>
          <p style={styles.subtitle}>
            Приоритетные заявки, скоринг и смена статуса
          </p>
        </div>

        <button onClick={loadData} style={styles.refreshButton}>
          Обновить
        </button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {stats && (
        <div style={styles.statsGrid}>
          <Card title="Всего" value={stats.total ?? 0} />
          <Card title="Высокий приоритет" value={stats.high ?? 0} />
          <Card title="Средний приоритет" value={stats.medium ?? 0} />
          <Card title="Низкий приоритет" value={stats.low ?? 0} />
          <Card title="С рисками" value={stats.reviewNeeded ?? 0} />
          <Card title="Средний score" value={stats.avgScore ?? 0} />
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
            {!Array.isArray(applications) || applications.length === 0 ? (
              <tr>
                <Td colSpan={13}>Нет заявок для отображения</Td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id}>
                  <Td>{app.id}</Td>
                  <Td>{app.user?.organization_name || app.applicantName || "—"}</Td>
                  <Td>{app.user?.email || "—"}</Td>
                  <Td>{app.user?.bin_iin || "—"}</Td>
                  <Td>{app.region || "—"}</Td>
                  <Td>{app.subsidyProgram || "—"}</Td>
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
                  <Td>{app.recommendation || "—"}</Td>
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

function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
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
    marginBottom: 0,
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
  infoBox: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
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
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
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
    minWidth: "120px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "8px 10px",
    background: "#fff",
  },
};