import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";

const SUBSIDY_TYPES = [
  {
    code: "SELECTION_COMMERCIAL_DAMS",
    label: "Селекционная и племенная работа с товарным маточным поголовьем КРС",
  },
  {
    code: "SELECTION_PEDIGREE_DAMS",
    label: "Селекционная и племенная работа с племенным маточным поголовьем КРС",
  },
  {
    code: "BREEDING_DOMESTIC_BEEF",
    label: "Приобретение отечественного племенного маточного поголовья КРС мясных и мясо-молочных пород",
  },
  {
    code: "BREEDING_DOMESTIC_DAIRY",
    label: "Приобретение отечественного племенного маточного поголовья КРС молочных и молочно-мясных пород",
  },
  {
    code: "BREEDING_IMPORTED_CIS_UA_BEEF",
    label: "Приобретение импортированного племенного маточного поголовья КРС мясных и мясо-молочных пород из стран СНГ и Украины",
  },
  {
    code: "BREEDING_IMPORTED_AMERICA_EUROPE_BEEF",
    label: "Приобретение импортированного племенного маточного поголовья КРС мясных и мясо-молочных пород из Австралии, Северной и Южной Америки, Европы",
  },
  {
    code: "BREEDING_IMPORTED_CIS_UA_DAIRY",
    label: "Приобретение импортированного племенного маточного поголовья КРС молочных и молочно-мясных пород из стран СНГ и Украины",
  },
  {
    code: "BREEDING_IMPORTED_AMERICA_EUROPE_DAIRY",
    label: "Приобретение импортированного племенного маточного поголовья КРС молочных и молочно-мясных пород из Австралии, Северной и Южной Америки, Европы",
  },
  {
    code: "BREEDING_BULLS_BEEF",
    label: "Приобретение племенных быков-производителей мясных и мясо-молочных пород",
  },
  {
    code: "SEMEN_SINGLE_SEX",
    label: "Удешевление стоимости семени племенных быков-производителей (однополое)",
  },
  {
    code: "SEMEN_BISEXUAL",
    label: "Удешевление стоимости семени племенных быков-производителей (двуполое)",
  },
  {
    code: "YOUNG_STOCK_BEEF",
    label: "Удешевление затрат при выращивании племенного молодняка КРС мясного направления",
  },
  {
    code: "CATTLE_TRANSFER_TO_FEEDLOT",
    label: "Удешевление стоимости КРС, реализованных или перемещенных на откормплощадки",
  },
  {
    code: "CATTLE_TRANSFER_TO_PROCESSING",
    label: "Удешевление стоимости КРС, реализованных или перемещенных на мясоперерабатывающие предприятия",
  },
  {
    code: "MILK_COOPERATIVE",
    label: "Субсидирование производства молока для сельскохозяйственных кооперативов",
  },
  {
    code: "MILK_50_HEAD",
    label: "Субсидирование производства молока при наличии фуражного поголовья коров от 50 голов",
  },
  {
    code: "MILK_400_HEAD",
    label: "Субсидирование производства молока при наличии фуражного поголовья коров от 400 голов",
  },
  {
    code: "MILK_600_HEAD",
    label: "Субсидирование производства молока при наличии фуражного поголовья коров от 600 голов",
  },
  {
    code: "FEED_DAIRY_DAMS",
    label: "Удешевление стоимости затрат на корма для маточного поголовья КРС молочного и молочно-мясного направления",
  },
  {
    code: "FEED_TURKESTAN_DAIRY",
    label: "Удешевление стоимости затрат на корма для маточного поголовья КРС в Туркестанской области",
  },
];

export default function SubsidyApplication() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    subsidy_type: "",
    requested_amount: "",
    description: "",
  });

  const [access, setAccess] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const loadAccess = async () => {
      try {
        setCheckingAccess(true);

        const res = await axios.get(`${API_URL}/api/subsidy/application-access`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setAccess(res.data);
      } catch (err) {
        setIsError(true);
        setMessage(
          err.response?.data?.message || "Не удалось проверить доступ к подаче заявки"
        );
      } finally {
        setCheckingAccess(false);
      }
    };

    loadAccess();
  }, [token, navigate]);

  const filteredTypes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return SUBSIDY_TYPES;

    return SUBSIDY_TYPES.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query)
      );
    });
  }, [search]);

  const selectedType = useMemo(() => {
    return SUBSIDY_TYPES.find((item) => item.code === form.subsidy_type) || null;
  }, [form.subsidy_type]);

  const canSubmit = Boolean(access?.allowApplication);

  const handleSelectType = (code) => {
    setForm((prev) => ({
      ...prev,
      subsidy_type: code,
    }));

    setMessage("");
    setIsError(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.subsidy_type) {
      setIsError(true);
      setMessage("Выберите тип субсидии");
      return;
    }

    if (!canSubmit) {
      setIsError(true);
      setMessage("Сейчас подача заявки недоступна");
      return;
    }

    try {
      setSubmitting(true);
      setIsError(false);

      const payload = {
        subsidy_type: form.subsidy_type,
        requested_amount: form.requested_amount ? Number(form.requested_amount) : null,
        description: form.description.trim() || null,
      };

      const res = await axios.post(`${API_URL}/api/subsidy/applications`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage(res.data?.message || "Заявка успешно отправлена");

      setForm({
        subsidy_type: "",
        requested_amount: "",
        description: "",
      });

      setSearch("");
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || "Ошибка отправки заявки");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.blurOne}></div>
      <div style={styles.blurTwo}></div>

      <div style={styles.container}>
        <div style={styles.topBar}>
          <div>
            <div style={styles.badge}>SharuAI</div>
            <h1 style={styles.title}>Подача заявки на субсидию</h1>
            <p style={styles.subtitle}>
              Выбери вид субсидии по скотоводству и отправь заявку через текущий backend.
            </p>
          </div>

          <div style={styles.topBarButtons}>
            <Link to="/dashboard" style={styles.secondaryLink}>
              Назад в кабинет
            </Link>
          </div>
        </div>

        <div style={styles.layout}>
          <div style={styles.leftCard}>
            <h2 style={styles.cardTitle}>Информация о заявителе</h2>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Организация</span>
              <span style={styles.infoValue}>{user?.organization_name || "—"}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>БИН / ИИН</span>
              <span style={styles.infoValue}>{user?.bin_iin || "—"}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Тип пользователя</span>
              <span style={styles.infoValue}>{user?.user_type || "—"}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Регион</span>
              <span style={styles.infoValue}>{user?.region || "—"}</span>
            </div>

            <div style={{ ...styles.statusBox, ...(access?.allowApplication ? styles.statusOk : styles.statusWarn) }}>
              <div style={styles.statusTitle}>Статус подачи</div>

              {checkingAccess ? (
                <div style={styles.statusText}>Проверяем доступ...</div>
              ) : (
                <>
                  <div style={styles.statusText}>
                    {access?.message || "Статус пока не определен"}
                  </div>

                  {access?.status && (
                    <div style={styles.statusCode}>Статус: {access.status}</div>
                  )}
                </>
              )}
            </div>

            {selectedType && (
              <div style={styles.selectedTypeBox}>
                <div style={styles.selectedTypeLabel}>Выбрана субсидия</div>
                <div style={styles.selectedTypeText}>{selectedType.label}</div>
                <div style={styles.selectedTypeCode}>{selectedType.code}</div>
              </div>
            )}
          </div>

          <div style={styles.rightCard}>
            <form onSubmit={handleSubmit}>
              <h2 style={styles.cardTitle}>Форма заявки</h2>

              <div style={styles.field}>
                <label style={styles.label}>Поиск типа субсидии</label>
                <input
                  type="text"
                  placeholder="Например: молоко, корма, племенные быки..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Выбери тип субсидии *</label>

                <div style={styles.subsidyList}>
                  {filteredTypes.length > 0 ? (
                    filteredTypes.map((item) => {
                      const active = form.subsidy_type === item.code;

                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleSelectType(item.code)}
                          style={{
                            ...styles.subsidyButton,
                            ...(active ? styles.subsidyButtonActive : {}),
                          }}
                        >
                          <div style={styles.subsidyButtonTitle}>{item.label}</div>
                          <div style={styles.subsidyButtonCode}>{item.code}</div>
                        </button>
                      );
                    })
                  ) : (
                    <div style={styles.emptyState}>Ничего не найдено</div>
                  )}
                </div>
              </div>

              <div style={styles.field}>
                <label htmlFor="requested_amount" style={styles.label}>
                  Запрашиваемая сумма
                </label>
                <input
                  id="requested_amount"
                  type="number"
                  min="0"
                  name="requested_amount"
                  value={form.requested_amount}
                  onChange={handleChange}
                  placeholder="Например: 2500000"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label htmlFor="description" style={styles.label}>
                  Описание / комментарий
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Кратко опиши цель подачи заявки"
                  style={styles.textarea}
                />
              </div>

              {message && (
                <div
                  style={{
                    ...styles.message,
                    ...(isError ? styles.messageError : styles.messageSuccess),
                  }}
                >
                  {message}
                </div>
              )}

              <div style={styles.formActions}>
                <button
                  type="submit"
                  disabled={submitting || checkingAccess || !canSubmit}
                  style={{
                    ...styles.submitButton,
                    ...(submitting || checkingAccess || !canSubmit
                      ? styles.submitButtonDisabled
                      : {}),
                  }}
                >
                  {submitting ? "Отправка..." : "Отправить заявку"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
    maxWidth: 1280,
    margin: "0 auto",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  topBarButtons: {
    display: "flex",
    gap: 12,
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
    maxWidth: 720,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.6,
    fontSize: 16,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "0.9fr 1.1fr",
    gap: 20,
  },
  leftCard: {
    background: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.22)",
    alignSelf: "start",
  },
  rightCard: {
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
  statusBox: {
    marginTop: 20,
    borderRadius: 18,
    padding: 16,
    border: "1px solid transparent",
  },
  statusOk: {
    background: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  statusWarn: {
    background: "#fff7ed",
    borderColor: "#fdba74",
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#334155",
  },
  statusCode: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
  },
  selectedTypeBox: {
    marginTop: 20,
    borderRadius: 18,
    padding: 16,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
  },
  selectedTypeLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#1d4ed8",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  selectedTypeText: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "#0f172a",
    fontWeight: 700,
  },
  selectedTypeCode: {
    marginTop: 8,
    fontSize: 12,
    color: "#475569",
    fontWeight: 700,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 700,
    color: "#334155",
  },
  input: {
    width: "100%",
    minHeight: 54,
    padding: "0 16px",
    borderRadius: 16,
    border: "1px solid #dbe4f0",
    background: "#f8fafc",
    fontSize: 15,
    color: "#0f172a",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 120,
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid #dbe4f0",
    background: "#f8fafc",
    fontSize: 15,
    color: "#0f172a",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  subsidyList: {
    maxHeight: 360,
    overflowY: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 12,
    background: "#f8fafc",
  },
  subsidyButton: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    padding: 14,
    cursor: "pointer",
    marginBottom: 10,
  },
  subsidyButtonActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
  },
  subsidyButtonTitle: {
    fontSize: 14,
    lineHeight: 1.55,
    color: "#0f172a",
    fontWeight: 700,
    marginBottom: 6,
  },
  subsidyButtonCode: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
  },
  emptyState: {
    padding: 18,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
  },
  message: {
    marginTop: 10,
    padding: "14px 16px",
    borderRadius: 14,
    fontSize: 14,
    lineHeight: 1.5,
  },
  messageError: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
  },
  messageSuccess: {
    background: "#ecfdf5",
    color: "#047857",
    border: "1px solid #a7f3d0",
  },
  formActions: {
    marginTop: 22,
  },
  submitButton: {
    width: "100%",
    minHeight: 56,
    border: "none",
    borderRadius: 16,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(79, 70, 229, 0.28)",
  },
  submitButtonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  secondaryLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "0 18px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
  },
};