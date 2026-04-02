import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div style={styles.page}>
      <div style={styles.blurOne}></div>
      <div style={styles.blurTwo}></div>

      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>SharuAI</div>
            <h1 style={styles.title}>Личный кабинет</h1>
            <p style={styles.subtitle}>
              Здесь можно посмотреть данные пользователя, подать заявку и открыть очередь эксперта.
            </p>
          </div>

          <div style={styles.actions}>
            <Link to="/subsidy-application" style={styles.primaryButton}>
              Подать заявку
            </Link>

            <Link to="/expert-queue" style={styles.queueButton}>
              Очередь эксперта
            </Link>

            <button type="button" onClick={handleLogout} style={styles.secondaryButton}>
              Выйти
            </button>
          </div>
        </div>

        {user ? (
          <div style={styles.grid}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Данные пользователя</h2>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>БИН / ИИН</span>
                <span style={styles.infoValue}>{user.bin_iin || "—"}</span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Email</span>
                <span style={styles.infoValue}>{user.email || "—"}</span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Организация</span>
                <span style={styles.infoValue}>{user.organization_name || "—"}</span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Тип пользователя</span>
                <span style={styles.infoValue}>{user.user_type || "—"}</span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Область</span>
                <span style={styles.infoValue}>{user.region || "—"}</span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Район</span>
                <span style={styles.infoValue}>{user.district || "—"}</span>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Быстрые действия</h2>
              <p style={styles.cardText}>
                Сначала можно заполнить форму субсидии и отправить её модели. После этого заявка
                попадёт в очередь эксперта вместе с score, приоритетом, рисками и рекомендацией.
              </p>

              <div style={styles.quickActions}>
                <Link to="/subsidy-application" style={styles.bigLinkButton}>
                  Перейти к форме субсидии
                </Link>

                <Link to="/expert-queue" style={styles.bigQueueButton}>
                  Открыть очередь эксперта
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Пользователь не найден</h2>
            <p style={styles.cardText}>
              Похоже, данные не сохранились в localStorage. Выполни вход заново.
            </p>

            <button type="button" onClick={() => navigate("/")} style={styles.primaryButton}>
              Вернуться ко входу
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    padding: "40px 20px",
    background: "linear-gradient(135deg, #0f172a 0%, #172554 35%, #2563eb 100%)",
    fontFamily: "Inter, Arial, sans-serif",
  },
  blurOne: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "#38bdf8",
    filter: "blur(80px)",
    opacity: 0.25,
    top: -60,
    left: -80,
  },
  blurTwo: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "#8b5cf6",
    filter: "blur(80px)",
    opacity: 0.25,
    right: -120,
    bottom: -100,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1200,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.16)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 18,
  },
  title: {
    margin: "0 0 8px",
    color: "#fff",
    fontSize: 40,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    maxWidth: 680,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.6,
    fontSize: 16,
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    borderRadius: 16,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    padding: "14px 20px",
    fontSize: 15,
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(79, 70, 229, 0.28)",
  },
  queueButton: {
    border: "none",
    borderRadius: 16,
    background: "#0f766e",
    color: "#fff",
    padding: "14px 20px",
    fontSize: 15,
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    padding: "14px 20px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 20,
  },
  card: {
    background: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.22)",
  },
  cardTitle: {
    margin: "0 0 18px",
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
  },
  cardText: {
    margin: "0 0 18px",
    color: "#475569",
    lineHeight: 1.7,
    fontSize: 15,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 0",
    borderBottom: "1px solid #e2e8f0",
    flexWrap: "wrap",
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: 600,
  },
  infoValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 700,
  },
  quickActions: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  bigLinkButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    padding: "0 18px",
    borderRadius: 16,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    fontWeight: 700,
    textDecoration: "none",
  },
  bigQueueButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    padding: "0 18px",
    borderRadius: 16,
    background: "#ecfeff",
    border: "1px solid #99f6e4",
    color: "#0f766e",
    fontWeight: 700,
    textDecoration: "none",
  },
};