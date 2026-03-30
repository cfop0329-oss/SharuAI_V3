import React, { useMemo, useState } from "react";

const subsidyOptions = [
  "Селекционная и племенная работа с товарным маточным поголовьем КРС",
  "Селекционная и племенная работа с племенным маточным поголовьем КРС",
  "Приобретение отечественного племенного маточного поголовья КРС мясных и мясо-молочных пород",
  "Приобретение отечественного племенного маточного поголовья КРС молочных и молочно-мясных пород",
  "Приобретение импортированного племенного маточного поголовья КРС мясных и мясо-молочных пород из стран СНГ и Украины",
  "Приобретение импортированного племенного маточного поголовья КРС мясных и мясо-молочных пород из Австралии, Северной и Южной Америки, Европы",
  "Приобретение импортированного племенного маточного поголовья КРС молочных и молочно-мясных пород из стран СНГ и Украины",
  "Приобретение импортированного племенного маточного поголовья КРС молочных и молочно-мясных пород из Австралии, Северной и Южной Америки, Европы",
  "Приобретение племенных быков-производителей мясных и мясо-молочных пород",
  "Удешевление стоимости семени племенных быков-производителей (однополое)",
  "Удешевление стоимости семени племенных быков-производителей (двуполое)",
  "Удешевление стоимости затрат при выращивании племенного молодняка КРС мясного направления",
  "Удешевление стоимости КРС, реализованных или перемещенных на откормплощадки",
  "Удешевление стоимости КРС, реализованных или перемещенных на мясоперерабатывающие предприятия",
  "Субсидирование производства молока для сельскохозяйственных кооперативов",
  "Субсидирование производства молока при наличии фуражного поголовья коров от 50 голов",
  "Субсидирование производства молока при наличии фуражного поголовья коров от 400 голов",
  "Субсидирование производства молока при наличии фуражного поголовья коров от 600 голов",
  "Удешевление стоимости затрат на корма для маточного поголовья КРС молочного и молочно-мясного направления",
  "Удешевление стоимости затрат на корма для маточного поголовья КРС в Туркестанской области",
];

export default function SubsidyTypeSelector({ onSelect }) {
  const [search, setSearch] = useState("");
  const [selectedSubsidy, setSelectedSubsidy] = useState("");

  const filteredOptions = useMemo(() => {
    return subsidyOptions.filter((item) =>
      item.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const handleSelect = (value) => {
    setSelectedSubsidy(value);
    if (onSelect) {
      onSelect(value);
    }
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Выбор типа субсидии</h2>
      <p style={styles.subtitle}>
        Найдите и выберите нужный вид субсидирования в скотоводстве
      </p>

      <input
        type="text"
        placeholder="Поиск типа субсидии..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.input}
      />

      <div style={styles.list}>
        {filteredOptions.length > 0 ? (
          filteredOptions.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(item)}
              style={{
                ...styles.option,
                ...(selectedSubsidy === item ? styles.optionActive : {}),
              }}
            >
              {item}
            </button>
          ))
        ) : (
          <div style={styles.empty}>Ничего не найдено</div>
        )}
      </div>

      {selectedSubsidy && (
        <div style={styles.result}>
          <h3 style={styles.resultTitle}>Выбранный тип субсидии:</h3>
          <p style={styles.resultText}>{selectedSubsidy}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "24px",
    borderRadius: "16px",
    background: "#ffffff",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "28px",
    fontWeight: "700",
    color: "#1f2937",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "20px",
    color: "#6b7280",
    fontSize: "15px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    marginBottom: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "380px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  option: {
    textAlign: "left",
    padding: "14px 16px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#f9fafb",
    cursor: "pointer",
    fontSize: "14px",
    transition: "0.2s",
  },
  optionActive: {
    background: "#e0f2fe",
    border: "1px solid #38bdf8",
  },
  empty: {
    padding: "16px",
    textAlign: "center",
    color: "#9ca3af",
    border: "1px dashed #d1d5db",
    borderRadius: "12px",
  },
  result: {
    marginTop: "20px",
    padding: "16px",
    borderRadius: "12px",
    background: "#f0fdf4",
    border: "1px solid #86efac",
  },
  resultTitle: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "18px",
    color: "#166534",
  },
  resultText: {
    margin: 0,
    color: "#14532d",
    fontSize: "15px",
    lineHeight: "1.5",
  },
};