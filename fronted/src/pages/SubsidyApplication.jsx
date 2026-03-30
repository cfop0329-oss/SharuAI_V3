import { useEffect, useState } from "react";
import axios from "axios";

export default function SubsidyApplication() {
  const [accessData, setAccessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState("");
  const [pageError, setPageError] = useState(false);

  const [obligationForm, setObligationForm] = useState({
    subsidy_year: "",
    subsidy_amount: "",
    obligation_description: "",
    planned_value: "",
    actual_value: "",
    status: "",
    notes: "",
  });

  const [applicationForm, setApplicationForm] = useState({
    subsidy_type: "",
    requested_amount: "",
    description: "",
  });

  const token = localStorage.getItem("token");

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const loadAccess = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        "http://localhost:5000/api/subsidy/application-access",
        authHeaders
      );
      setAccessData(res.data);
    } catch (err) {
      setPageError(true);
      setPageMessage(
        err.response?.data?.message || err.response?.data?.error || "Ошибка сервера"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccess();
  }, []);

  const handleObligationChange = (e) => {
    setObligationForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleApplicationChange = (e) => {
    setApplicationForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSaveObligation = async (e) => {
    e.preventDefault();
    setPageMessage("");

    try {
      await axios.post(
        "http://localhost:5000/api/counter-obligations",
        obligationForm,
        authHeaders
      );

      setPageError(false);
      setPageMessage("Данные по встречным обязательствам сохранены");

      setObligationForm({
        subsidy_year: "",
        subsidy_amount: "",
        obligation_description: "",
        planned_value: "",
        actual_value: "",
        status: "",
        notes: "",
      });

      await loadAccess();
    } catch (err) {
      setPageError(true);
      setPageMessage(err.response?.data?.message || "Не удалось сохранить данные");
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setPageMessage("");

    try {
      const res = await axios.post(
        "http://localhost:5000/api/subsidy/applications",
        applicationForm,
        authHeaders
      );

      setPageError(false);
      setPageMessage(res.data.message);

      setApplicationForm({
        subsidy_type: "",
        requested_amount: "",
        description: "",
      });
    } catch (err) {
      setPageError(true);
      setPageMessage(err.response?.data?.message || "Ошибка подачи заявки");
    }
  };

  if (loading) {
    return (
      <div className="subsidy-page">
        <div className="subsidy-shell">
          <div className="subsidy-loading">Загрузка данных...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="subsidy-page">
      <div className="subsidy-bg subsidy-bg-1"></div>
      <div className="subsidy-bg subsidy-bg-2"></div>

      <div className="subsidy-shell">
        <div className="subsidy-topbar">
          <div>
            <div className="subsidy-badge">SharuAI</div>
            <h1>Подача заявки на субсидию</h1>
            <p>
              Система проверяет дату регистрации и наличие данных по встречным
              обязательствам перед отправкой заявки.
            </p>
          </div>

          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.href = "/";
            }}
          >
            Выйти
          </button>
        </div>

        {pageMessage && (
          <div className={`status-banner ${pageError ? "error" : "success"}`}>
            {pageMessage}
          </div>
        )}

        {accessData && (
          <div className="status-card">
            <div className="status-card-header">
              <h2>Статус допуска</h2>
              <span className={`status-pill status-${accessData.status?.toLowerCase()}`}>
                {accessData.status}
              </span>
            </div>

            <p className="status-main-text">{accessData.message}</p>

            <div className="status-meta">
              <div className="meta-box">
                <span>Год регистрации</span>
                <strong>{accessData.registrationYear ?? "-"}</strong>
              </div>
              <div className="meta-box">
                <span>Текущий год</span>
                <strong>{accessData.currentYear ?? "-"}</strong>
              </div>
              <div className="meta-box">
                <span>Подача заявки</span>
                <strong>{accessData.allowApplication ? "Доступна" : "Ограничена"}</strong>
              </div>
            </div>
          </div>
        )}

        {accessData?.showMissingInfoBlock && (
          <div className="missing-obligation-card">
            <div className="missing-obligation-head">
              <h2>Отсутствуют данные по встречным обязательствам</h2>
              <p>
                Вы зарегистрированы не в текущем году, поэтому для подачи заявки
                необходимо заполнить сведения по ранее полученным субсидиям и
                выполненным обязательствам.
              </p>
            </div>

            <form className="modern-form" onSubmit={handleSaveObligation}>
              <div className="modern-grid">
                <div className="modern-field">
                  <label>Год субсидии *</label>
                  <input
                    type="number"
                    name="subsidy_year"
                    value={obligationForm.subsidy_year}
                    onChange={handleObligationChange}
                    placeholder="Например: 2024"
                  />
                </div>

                <div className="modern-field">
                  <label>Сумма субсидии</label>
                  <input
                    type="number"
                    name="subsidy_amount"
                    value={obligationForm.subsidy_amount}
                    onChange={handleObligationChange}
                    placeholder="Например: 2500000"
                  />
                </div>

                <div className="modern-field modern-field-full">
                  <label>Описание обязательства *</label>
                  <textarea
                    name="obligation_description"
                    value={obligationForm.obligation_description}
                    onChange={handleObligationChange}
                    placeholder="Например: увеличение объема валовой продукции, закуп техники, сохранение поголовья"
                    rows="3"
                  />
                </div>

                <div className="modern-field">
                  <label>Плановое значение</label>
                  <input
                    type="number"
                    name="planned_value"
                    value={obligationForm.planned_value}
                    onChange={handleObligationChange}
                    placeholder="Например: 100"
                  />
                </div>

                <div className="modern-field">
                  <label>Фактическое значение</label>
                  <input
                    type="number"
                    name="actual_value"
                    value={obligationForm.actual_value}
                    onChange={handleObligationChange}
                    placeholder="Например: 95"
                  />
                </div>

                <div className="modern-field">
                  <label>Статус</label>
                  <input
                    type="text"
                    name="status"
                    value={obligationForm.status}
                    onChange={handleObligationChange}
                    placeholder="fulfilled / partial / not_fulfilled"
                  />
                </div>

                <div className="modern-field">
                  <label>Комментарий</label>
                  <input
                    type="text"
                    name="notes"
                    value={obligationForm.notes}
                    onChange={handleObligationChange}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>

              <button type="submit" className="primary-btn">
                Сохранить данные по обязательствам
              </button>
            </form>
          </div>
        )}

        {accessData?.obligations?.length > 0 && (
          <div className="obligation-table-card">
            <div className="section-head">
              <h2>История встречных обязательств</h2>
              <p>Найденные данные по ранее полученным субсидиям</p>
            </div>

            <div className="table-wrap">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Год</th>
                    <th>Сумма</th>
                    <th>Обязательство</th>
                    <th>План</th>
                    <th>Факт</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {accessData.obligations.map((item) => (
                    <tr key={item.id}>
                      <td>{item.subsidy_year}</td>
                      <td>{item.subsidy_amount ?? "-"}</td>
                      <td>{item.obligation_description || "-"}</td>
                      <td>{item.planned_value ?? "-"}</td>
                      <td>{item.actual_value ?? "-"}</td>
                      <td>{item.status || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="application-card">
          <div className="section-head">
            <h2>Форма подачи заявки</h2>
            <p>Заполните основные данные для подачи на субсидию</p>
          </div>

          {!accessData?.allowApplication && (
            <div className="inline-warning">
              Чтобы отправить заявку, сначала заполните данные по встречным обязательствам.
            </div>
          )}

          <form className="modern-form" onSubmit={handleSubmitApplication}>
            <div className="modern-grid">
              <div className="modern-field">
                <label>Вид субсидии *</label>
                <input
                  type="text"
                  name="subsidy_type"
                  value={applicationForm.subsidy_type}
                  onChange={handleApplicationChange}
                  placeholder="Например: субсидия на развитие животноводства"
                />
              </div>

              <div className="modern-field">
                <label>Запрашиваемая сумма</label>
                <input
                  type="number"
                  name="requested_amount"
                  value={applicationForm.requested_amount}
                  onChange={handleApplicationChange}
                  placeholder="Например: 5000000"
                />
              </div>

              <div className="modern-field modern-field-full">
                <label>Описание заявки</label>
                <textarea
                  name="description"
                  value={applicationForm.description}
                  onChange={handleApplicationChange}
                  placeholder="Кратко опишите цель получения субсидии"
                  rows="4"
                />
              </div>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={!accessData?.allowApplication}
            >
              Подать заявку
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}