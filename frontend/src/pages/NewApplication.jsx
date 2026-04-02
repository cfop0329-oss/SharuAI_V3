import { useState } from "react";

const API_URL = "http://localhost:5000";

export default function NewApplication() {
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    applicantName: "",
    region: "",
    subsidyProgram: "",
    requestedAmount: "",
    landAreaHa: "",
    employeesCount: "",
    annualRevenue: "",
    taxDebt: "",
    creditDebt: "",
    priorViolationsCount3y: "",
    priorRefundsCount3y: "",
    pastApplicationsCount: "",
    approvedSubsidiesCount: "",
  });

  const [result, setResult] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const res = await fetch(`${API_URL}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Ошибка создания заявки");
      return;
    }

    setResult(data.application);
    alert("Заявка успешно создана");
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1>Новая заявка на субсидию</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
      >
        <Input name="applicantName" label="Название заявителя" value={form.applicantName} onChange={handleChange} />
        <Input name="region" label="Регион" value={form.region} onChange={handleChange} />
        <Input name="subsidyProgram" label="Программа субсидии" value={form.subsidyProgram} onChange={handleChange} />
        <Input name="requestedAmount" label="Сумма заявки" value={form.requestedAmount} onChange={handleChange} type="number" />
        <Input name="landAreaHa" label="Площадь (га)" value={form.landAreaHa} onChange={handleChange} type="number" />
        <Input name="employeesCount" label="Количество сотрудников" value={form.employeesCount} onChange={handleChange} type="number" />
        <Input name="annualRevenue" label="Годовая выручка" value={form.annualRevenue} onChange={handleChange} type="number" />
        <Input name="taxDebt" label="Налоговая задолженность" value={form.taxDebt} onChange={handleChange} type="number" />
        <Input name="creditDebt" label="Кредитная задолженность" value={form.creditDebt} onChange={handleChange} type="number" />
        <Input name="priorViolationsCount3y" label="Нарушения за 3 года" value={form.priorViolationsCount3y} onChange={handleChange} type="number" />
        <Input name="priorRefundsCount3y" label="Возвраты субсидий за 3 года" value={form.priorRefundsCount3y} onChange={handleChange} type="number" />
        <Input name="pastApplicationsCount" label="Подано заявок ранее" value={form.pastApplicationsCount} onChange={handleChange} type="number" />
        <Input name="approvedSubsidiesCount" label="Одобрено ранее" value={form.approvedSubsidiesCount} onChange={handleChange} type="number" />

        <button
          type="submit"
          style={{
            gridColumn: "1 / -1",
            padding: 14,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Рассчитать score и сохранить заявку
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 24, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2>Результат скоринга</h2>
          <p><b>Score:</b> {result.score}</p>
          <p><b>Приоритет:</b> {result.priority}</p>
          <p><b>Рекомендация:</b> {result.recommendation}</p>
          <p><b>Объяснение:</b> {result.explanation}</p>
          <p><b>Риск-флаги:</b></p>
          <ul>
            {Array.isArray(result.riskFlags) && result.riskFlags.length > 0 ? (
              result.riskFlags.map((flag, i) => <li key={i}>{flag}</li>)
            ) : (
              <li>Риски не выявлены</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span>{label}</span>
      <input
        {...props}
        style={{
          padding: 10,
          borderRadius: 10,
          border: "1px solid #ccc",
        }}
      />
    </label>
  );
}