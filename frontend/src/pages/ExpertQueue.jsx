import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

export default function ExpertQueue() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  async function loadData() {
    try {
      setLoading(true);

      const [appsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/applications/queue`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/applications/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const appsData = await appsRes.json();
      const statsData = await statsRes.json();

      setApplications(appsData);
      setStats(statsData);
    } catch (error) {
      console.error(error);
      alert("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      const res = await fetch(`${API_URL}/api/applications/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Ошибка обновления статуса");
        return;
      }

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Ошибка обновления статуса");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function priorityLabel(priority) {
    if (priority === "HIGH") return "Высокий";
    if (priority === "MEDIUM") return "Средний";
    return "Низкий";
  }

  if (loading) return <div style={{ padding: 20 }}>Загрузка...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Очередь заявок эксперта</h1>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
          <Card title="Всего" value={stats.total} />
          <Card title="Высокий приоритет" value={stats.high} />
          <Card title="Средний приоритет" value={stats.medium} />
          <Card title="Низкий приоритет" value={stats.low} />
          <Card title="С рисками" value={stats.reviewNeeded} />
          <Card title="Средний score" value={stats.avgScore} />
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Организация</Th>
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
            {applications.map((app) => (
              <tr key={app.id}>
                <Td>{app.id}</Td>
                <Td>{app.applicantName}</Td>
                <Td>{app.region}</Td>
                <Td>{app.subsidyProgram}</Td>
                <Td>{Number(app.requestedAmount).toLocaleString()}</Td>
                <Td>{app.score}</Td>
                <Td>{priorityLabel(app.priority)}</Td>
                <Td>
                  {Array.isArray(app.riskFlags) && app.riskFlags.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {app.riskFlags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  ) : (
                    "Нет"
                  )}
                </Td>
                <Td>{app.recommendation}</Td>
                <Td>{app.status}</Td>
                <Td>
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                  >
                    <option value="NEW">NEW</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 14, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        borderBottom: "1px solid #ddd",
        padding: 12,
        background: "#f8f8f8",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td
      style={{
        borderBottom: "1px solid #eee",
        padding: 12,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}