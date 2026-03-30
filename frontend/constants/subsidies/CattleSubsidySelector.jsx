import React, { useMemo, useState } from "react";
import {
  CATTLE_SUBSIDY_TYPES,
  getCattleSubsidyByCode,
} from "../../constants/cattleSubsidyTypes";

const styles = {
  wrapper: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
  },
  required: {
    color: "#dc2626",
    marginLeft: 4,
  },
  search: {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    padding: "12px 14px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  box: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#ffffff",
    maxHeight: 420,
    overflowY: "auto",
    padding: 12,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    margin: "12px 0 8px",
  },
  option: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#f9fafb",
    padding: 12,
    cursor: "pointer",
    marginBottom: 8,
  },
  optionActive: {
    border: "1px solid #2563eb",
    background: "#eff6ff",
  },
  optionCategory: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: 600,
    marginBottom: 6,
  },
  optionText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 1.45,
  },
  selectedBox: {
    border: "1px solid #86efac",
    background: "#f0fdf4",
    borderRadius: 12,
    padding: 12,
  },
  selectedTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#166534",
    marginBottom: 6,
  },
  selectedText: {
    fontSize: 14,
    color: "#14532d",
    lineHeight: 1.45,
  },
  empty: {
    border: "1px dashed #d1d5db",
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
  },
  error: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: -4,
  },
};

export default function CattleSubsidySelector({
  value,
  onChange,
  label = "Тип субсидии",
  required = false,
  error = "",
  name = "subsidyType",
}) {
  const [search, setSearch] = useState("");

  const selectedItem = useMemo(() => getCattleSubsidyByCode(value), [value]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return CATTLE_SUBSIDY_TYPES;

    return CATTLE_SUBSIDY_TYPES.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query)
      );
    });
  }, [search]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  const handleSelect = (item) => {
    if (!onChange) return;

    onChange({
      code: item.code,
      label: item.label,
      category: item.category,
      name,
    });
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>

      <input
        type="hidden"
        name={name}
        value={value || ""}
        readOnly
      />

      <input
        type="text"
        placeholder="Поиск по названию субсидии..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {selectedItem && (
        <div style={styles.selectedBox}>
          <div style={styles.selectedTitle}>Выбрано</div>
          <div style={styles.selectedText}>{selectedItem.label}</div>
        </div>
      )}

      <div style={styles.box}>
        {Object.keys(groupedItems).length === 0 ? (
          <div style={styles.empty}>Ничего не найдено</div>
        ) : (
          Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <div style={styles.categoryTitle}>{category}</div>

              {items.map((item) => {
                const isActive = value === item.code;

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelect(item)}
                    style={{
                      ...styles.option,
                      ...(isActive ? styles.optionActive : {}),
                    }}
                  >
                    <div style={styles.optionCategory}>{item.category}</div>
                    <div style={styles.optionText}>{item.label}</div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
    </div>
  );
}