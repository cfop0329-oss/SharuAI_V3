import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const initialForm = {
  application_date: "",

  region: "",
  district: "",
  akimat: "",
  direction: "",
  species: "",
  subsidy_program: "",
  producer_type: "",

  entitled_amount_kzt: "",
  subsidized_units_est: "",
  years_in_operation: "",
  employees_count: "",
  land_area_ha: "",
  herd_size_head: "",
  output_volume_tons: "",
  productivity_index: "",
  revenue_kzt: "",
  ebitda_margin_pct: "",
  debt_to_revenue_pct: "",

  prior_subsidies_count_3y: "",
  prior_subsidies_amount_kzt_3y: "",
  prior_violations_count_3y: "",
  prior_refunds_count_3y: "",
  prior_refunds_amount_kzt_3y: "",
  unmet_obligations_flag: 0,

  past_applications_count: "",
  past_approved_count: "",
  past_rejected_count: "",
  past_withdrawn_count: "",
  past_paid_amount_kzt: "",
};

const labels = {
  application_date: "Дата заявки",
  region: "Регион",
  district: "Район",
  akimat: "Акимат",
  direction: "Направление",
  species: "Вид",
  subsidy_program: "Программа субсидии",
  producer_type: "Тип хозяйства",

  entitled_amount_kzt: "Сумма субсидии, KZT",
  subsidized_units_est: "Количество единиц",
  years_in_operation: "Лет работы",
  employees_count: "Количество сотрудников",
  land_area_ha: "Площадь земли, га",
  herd_size_head: "Поголовье",
  output_volume_tons: "Объем выпуска, т",
  productivity_index: "Индекс продуктивности",
  revenue_kzt: "Выручка, KZT",
  ebitda_margin_pct: "EBITDA margin, %",
  debt_to_revenue_pct: "Debt / Revenue, %",

  prior_subsidies_count_3y: "Субсидий за 3 года",
  prior_subsidies_amount_kzt_3y: "Сумма субсидий за 3 года, KZT",
  prior_violations_count_3y: "Нарушения за 3 года",
  prior_refunds_count_3y: "Возвраты за 3 года",
  prior_refunds_amount_kzt_3y: "Сумма возвратов за 3 года, KZT",
  unmet_obligations_flag: "Невыполненные обязательства",

  past_applications_count: "Прошлых заявок",
  past_approved_count: "Ранее одобрено",
  past_rejected_count: "Ранее отклонено",
  past_withdrawn_count: "Ранее отозвано",
  past_paid_amount_kzt: "Ранее выплачено, KZT",
};

const sections = [
  {
    title: "Общая информация",
    fields: [
      "application_date",
      "region",
      "district",
      "akimat",
      "direction",
      "species",
      "subsidy_program",
      "producer_type",
    ],
  },
  {
    title: "Параметры заявки",
    fields: ["entitled_amount_kzt", "subsidized_units_est"],
  },
  {
    title: "Параметры хозяйства",
    fields: [
      "years_in_operation",
      "employees_count",
      "land_area_ha",
      "herd_size_head",
      "output_volume_tons",
      "productivity_index",
      "revenue_kzt",
      "ebitda_margin_pct",
      "debt_to_revenue_pct",
    ],
  },
  {
    title: "История и риски",
    fields: [
      "prior_subsidies_count_3y",
      "prior_subsidies_amount_kzt_3y",
      "prior_violations_count_3y",
      "prior_refunds_count_3y",
      "prior_refunds_amount_kzt_3y",
      "unmet_obligations_flag",
    ],
  },
  {
    title: "История заявок",
    fields: [
      "past_applications_count",
      "past_approved_count",
      "past_rejected_count",
      "past_withdrawn_count",
      "past_paid_amount_kzt",
    ],
  },
];

const selectOptions = {
  region: ["", "Акмолинская область", "Алматинская область", "Туркестанская область", "Костанайская область"],
  district: ["", "Енбекшиказахский", "Сарыагашский", "Аршалынский", "Карасуский"],
  akimat: ["", "Акимат 1", "Акимат 2", "Акимат 3"],
  direction: ["", "Скотоводство", "Растениеводство", "Молочное направление"],
  species: ["", "КРС", "МРС", "Лошади", "Птица"],
  subsidy_program: ["", "Программа 1", "Программа 2", "Программа 3"],
  producer_type: ["", "Фермер", "ТОО", "КХ", "ИП"],
  unmet_obligations_flag: [
    { value: 0, label: "Нет" },
    { value: 1, label: "Да" },
  ],
};

const numericFields = new Set([
  "entitled_amount_kzt",
  "subsidized_units_est",
  "years_in_operation",
  "employees_count",
  "land_area_ha",
  "herd_size_head",
  "output_volume_tons",
  "productivity_index",
  "revenue_kzt",
  "ebitda_margin_pct",
  "debt_to_revenue_pct",
  "prior_subsidies_count_3y",
  "prior_subsidies_amount_kzt_3y",
  "prior_violations_count_3y",
  "prior_refunds_count_3y",
  "prior_refunds_amount_kzt_3y",
  "unmet_obligations_flag",
  "past_applications_count",
  "past_approved_count",
  "past_rejected_count",
  "past_withdrawn_count",
  "past_paid_amount_kzt",
]);

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function normalizePayload(form) {
  const payload = { ...form };
  Object.keys(payload).forEach((key) => {
    if (numericFields.has(key)) payload[key] = toNumber(payload[key]);
  });
  return payload;
}

function getPriorityColor(priority) {
  const text = String(priority || "").toUpperCase();
  if (text === "HIGH") return "#166534";
  if (text === "MEDIUM") return "#b45309";
  if (text === "LOW") return "#b91c1c";
  return "#1d4ed8";
}

function priorityLabel(priority) {
  if (priority === "HIGH") return "Высокий";
  if (priority === "MEDIUM") return "Средний";
  if (priority === "LOW") return "Низкий";
  return priority || "—";
}

export default function SubsidyApplication() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [form, setForm] = useState({
    ...initialForm,
    region: user?.region || "",
    district: user?.district || "",
  });

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState(null);

  const handleTextChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setServerError("");
    setResult(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Нет токена. Выполни вход заново.");
      }

      const payload = normalizePayload(form);

      const response = await fetch(`${API_URL}/api/ml-applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.detail || "Ошибка при создании заявки");
      }

      setResult(data?.application || data);
    } catch (error) {
      setServerError(error.message || "Ошибка отправки формы");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Подача заявки на субсидию</h1>
            <p style={styles.subtitle}>Заполни форму и отправь её на оценку модели.</p>
          </div>

          <Link to="/dashboard" style={styles.backButton}>
            Назад
          </Link>
        </div>

        <div style={styles.layout}>
          <form onSubmit={handleSubmit} style={styles.formCard}>
            {sections.map((section) => (
              <div key={section.title} style={styles.section}>
                <h2 style={styles.sectionTitle}>{section.title}</h2>

                <div style={styles.grid}>
                  {section.fields.map((field) => {
                    const label = labels[field] || field;

                    if (field === "application_date") {
                      return (
                        <div key={field} style={styles.field}>
                          <label style={styles.label}>{label}</label>
                          <input
                            type="date"
                            value={form[field]}
                            onChange={(e) => handleTextChange(field, e.target.value)}
                            style={styles.input}
                          />
                        </div>
                      );
                    }

                    if (field === "unmet_obligations_flag") {
                      return (
                        <div key={field} style={styles.field}>
                          <label style={styles.label}>{label}</label>
                          <select
                            value={form[field]}
                            onChange={(e) => handleNumberChange(field, Number(e.target.value))}
                            style={styles.input}
                          >
                            {selectOptions.unmet_obligations_flag.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    if (selectOptions[field]) {
                      return (
                        <div key={field} style={styles.field}>
                          <label style={styles.label}>{label}</label>
                          <select
                            value={form[field]}
                            onChange={(e) => handleTextChange(field, e.target.value)}
                            style={styles.input}
                          >
                            {selectOptions[field].map((option) => (
                              <option key={option} value={option}>
                                {option || "Выберите значение"}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    return (
                      <div key={field} style={styles.field}>
                        <label style={styles.label}>{label}</label>
                        <input
                          type="number"
                          step="any"
                          value={form[field]}
                          onChange={(e) => handleNumberChange(field, e.target.value)}
                          style={styles.input}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button type="submit" style={styles.submitButton} disabled={loading}>
              {loading ? "Отправка..." : "Отправить модели для оценки"}
            </button>

            {serverError ? <div style={styles.errorBox}>{serverError}</div> : null}
          </form>

          <div style={styles.resultCard}>
            <h2 style={styles.resultTitle}>Результат</h2>

            {!result ? (
              <p style={styles.emptyText}>После отправки здесь появится итог заявки.</p>
            ) : (
              <>
                <div style={styles.metricCard}>
                  <div style={styles.metricLabel}>Score</div>
                  <div style={styles.metricValue}>{result.score ?? "—"}</div>
                </div>

                <div
                  style={{
                    ...styles.priorityBox,
                    color: getPriorityColor(result.priority),
                    borderColor: getPriorityColor(result.priority),
                  }}
                >
                  Приоритет: {priorityLabel(result.priority)}
                </div>

                <div style={styles.block}>
                  <h3 style={styles.blockTitle}>Рекомендация</h3>
                  <p style={styles.blockText}>{result.recommendation || "—"}</p>
                </div>

                <div style={styles.block}>
                  <h3 style={styles.blockTitle}>Риски</h3>
                  {Array.isArray(result.riskFlags) && result.riskFlags.length > 0 ? (
                    <ul style={styles.list}>
                      {result.riskFlags.map((flag, index) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={styles.blockText}>Нет</p>
                  )}
                </div>

                <div style={styles.block}>
                  <h3 style={styles.blockTitle}>Статус</h3>
                  <p style={styles.blockText}>{result.status || "NEW"}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f6f8fb", padding: 24 },
  container: { maxWidth: 1400, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 32, fontWeight: 800 },
  subtitle: { marginTop: 8, color: "#6b7280" },
  backButton: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "12px 16px", borderRadius: 12, textDecoration: "none",
    background: "#2563eb", color: "#fff", fontWeight: 700
  },
  layout: { display: "grid", gridTemplateColumns: "1.4fr 0.9fr", gap: 20 },
  formCard: { background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #e5e7eb" },
  resultCard: { background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #e5e7eb", height: "fit-content", position: "sticky", top: 20 },
  section: { marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid #e5e7eb" },
  sectionTitle: { margin: "0 0 14px", fontSize: 22, fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontWeight: 700, fontSize: 14, color: "#374151" },
  input: { minHeight: 46, borderRadius: 12, border: "1px solid #d1d5db", padding: "0 12px", fontSize: 14, background: "#fff" },
  submitButton: { width: "100%", minHeight: 52, border: "none", borderRadius: 14, background: "#2563eb", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" },
  errorBox: { marginTop: 16, padding: 14, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", fontWeight: 700 },
  resultTitle: { margin: "0 0 18px", fontSize: 24, fontWeight: 800 },
  emptyText: { color: "#6b7280" },
  metricCard: { borderRadius: 16, padding: 18, background: "#eff6ff", border: "1px solid #bfdbfe", marginBottom: 14 },
  metricLabel: { color: "#1d4ed8", fontWeight: 700, marginBottom: 8 },
  metricValue: { fontSize: 42, fontWeight: 900 },
  priorityBox: { border: "2px solid", borderRadius: 12, padding: 12, fontWeight: 800, marginBottom: 16 },
  block: { marginTop: 18, paddingTop: 18, borderTop: "1px solid #e5e7eb" },
  blockTitle: { margin: "0 0 10px", fontSize: 18, fontWeight: 800 },
  blockText: { margin: 0, color: "#374151", lineHeight: 1.6 },
  list: { margin: 0, paddingLeft: 18 },
};