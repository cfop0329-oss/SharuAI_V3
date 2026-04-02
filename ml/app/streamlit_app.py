from pathlib import Path

import joblib
import pandas as pd
import streamlit as st
from catboost import CatBoostRegressor, Pool


st.set_page_config(
    page_title="SharuAI V3 — Merit Score",
    layout="wide"
)

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "catboost_merit_model.cbm"
MODEL_COLUMNS_PATH = BASE_DIR / "model_columns.pkl"
CATEGORICAL_COLS_PATH = BASE_DIR / "categorical_cols.pkl"
DEFAULT_VALUES_PATH = BASE_DIR / "default_values.pkl"
CATEGORY_OPTIONS_PATH = BASE_DIR / "category_options.pkl"


@st.cache_resource
def load_model():
    model = CatBoostRegressor()
    model.load_model(str(MODEL_PATH))
    return model


@st.cache_data
def load_artifacts():
    model_columns = joblib.load(MODEL_COLUMNS_PATH)
    categorical_cols = joblib.load(CATEGORICAL_COLS_PATH)
    default_values = joblib.load(DEFAULT_VALUES_PATH)
    category_options = joblib.load(CATEGORY_OPTIONS_PATH)
    return model_columns, categorical_cols, default_values, category_options


LABELS = {
    "record_no": "Номер записи",
    "year": "Год",
    "month": "Месяц",
    "quarter": "Квартал",
    "day_of_year": "День года",
    "application_hour": "Час подачи",
    "region": "Регион",
    "district": "Район",
    "akimat": "Акимат",
    "direction": "Направление",
    "species": "Вид",
    "subsidy_program": "Программа субсидии",
    "producer_type": "Тип хозяйства",
    "data_origin": "Источник данных",
    "normative_kzt_per_unit": "Норматив KZT/ед.",
    "entitled_amount_kzt": "Сумма субсидии, KZT",
    "subsidized_units_est": "Субсидируемые единицы",
    "years_in_operation": "Лет работы",
    "employees_count": "Количество сотрудников",
    "land_area_ha": "Площадь земли, га",
    "herd_size_head": "Поголовье",
    "output_volume_tons": "Объем выпуска, т",
    "productivity_index": "Индекс продуктивности",
    "revenue_kzt": "Выручка, KZT",
    "ebitda_margin_pct": "EBITDA margin, %",
    "debt_to_revenue_pct": "Debt / Revenue, %",
    "prior_subsidies_count_3y": "Субсидий за 3 года",
    "prior_subsidies_amount_kzt_3y": "Сумма субсидий за 3 года, KZT",
    "prior_violations_count_3y": "Нарушения за 3 года",
    "prior_refunds_count_3y": "Возвраты за 3 года",
    "prior_refunds_amount_kzt_3y": "Сумма возвратов за 3 года, KZT",
    "unmet_obligations_flag": "Невыполненные обязательства",
    "prior_avg_output_growth_pct": "Средний рост выпуска, %",
    "prior_avg_revenue_growth_pct": "Средний рост выручки, %",
    "producer_application_seq_no": "Порядковый номер заявки хозяйства",
    "past_applications_count": "Прошлых заявок",
    "past_approved_count": "Ранее одобрено",
    "past_rejected_count": "Ранее отклонено",
    "past_withdrawn_count": "Ранее отозвано",
    "past_paid_amount_kzt": "Ранее выплачено, KZT",
    "past_avg_entitled_amount_kzt": "Средняя прошлая сумма, KZT",
    "region_execution_rate_real": "Execution rate региона",
    "district_execution_rate_real": "Execution rate района",
    "direction_execution_rate_real": "Execution rate направления",
    "program_execution_rate_real": "Execution rate программы",
}

SECTION_MAP = {
    "Дата и заявка": [
        "record_no",
        "application_hour",
        "region",
        "district",
        "akimat",
        "direction",
        "species",
        "subsidy_program",
        "producer_type",
        "data_origin",
        "normative_kzt_per_unit",
        "entitled_amount_kzt",
        "subsidized_units_est",
    ],
    "Параметры хозяйства": [
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
    "История субсидий и рисков": [
        "prior_subsidies_count_3y",
        "prior_subsidies_amount_kzt_3y",
        "prior_violations_count_3y",
        "prior_refunds_count_3y",
        "prior_refunds_amount_kzt_3y",
        "unmet_obligations_flag",
        "prior_avg_output_growth_pct",
        "prior_avg_revenue_growth_pct",
        "producer_application_seq_no",
        "past_applications_count",
        "past_approved_count",
        "past_rejected_count",
        "past_withdrawn_count",
        "past_paid_amount_kzt",
        "past_avg_entitled_amount_kzt",
    ],
    "Исторические rates": [
        "region_execution_rate_real",
        "district_execution_rate_real",
        "direction_execution_rate_real",
        "program_execution_rate_real",
    ],
}

INT_COLUMNS = {
    "record_no",
    "application_hour",
    "years_in_operation",
    "employees_count",
    "prior_subsidies_count_3y",
    "prior_violations_count_3y",
    "prior_refunds_count_3y",
    "producer_application_seq_no",
    "past_applications_count",
    "past_approved_count",
    "past_rejected_count",
    "past_withdrawn_count",
    "year",
    "month",
    "quarter",
    "day_of_year",
}

BINARY_COLUMNS = {"unmet_obligations_flag"}


def is_missing_value(x):
    try:
        return pd.isna(x)
    except Exception:
        return False


def safe_int(value, fallback=0):
    try:
        if is_missing_value(value):
            return int(fallback)
        return int(float(value))
    except Exception:
        return int(fallback)


def safe_float(value, fallback=0.0):
    try:
        if is_missing_value(value):
            return float(fallback)
        return float(value)
    except Exception:
        return float(fallback)


def safe_str(value, fallback="Unknown"):
    if is_missing_value(value):
        return fallback
    text = str(value).strip()
    return text if text else fallback


def get_cat_options(col, default_values, category_options):
    raw_options = category_options.get(col, [])
    clean_options = []

    for val in raw_options:
        if not is_missing_value(val):
            val = str(val).strip()
            if val:
                clean_options.append(val)

    clean_options = sorted(set(clean_options))

    default_str = safe_str(default_values.get(col, "Unknown"))
    if default_str not in clean_options:
        clean_options.insert(0, default_str)

    if not clean_options:
        clean_options = ["Unknown"]

    return clean_options


def get_priority_label(score):
    if score >= 80:
        return "Высокий приоритет"
    if score >= 60:
        return "Средний приоритет"
    return "Низкий приоритет"


def build_input_row(model_columns, categorical_cols, default_values, widget_values, application_date):
    row = {}

    for col in model_columns:
        row[col] = default_values.get(col, 0)

    dt = pd.Timestamp(application_date)

    if "year" in model_columns:
        row["year"] = int(dt.year)
    if "month" in model_columns:
        row["month"] = int(dt.month)
    if "quarter" in model_columns:
        row["quarter"] = int(dt.quarter)
    if "day_of_year" in model_columns:
        row["day_of_year"] = int(dt.dayofyear)

    for col, val in widget_values.items():
        row[col] = val

    input_df = pd.DataFrame([row]).reindex(columns=model_columns)

    for col in model_columns:
        if col in categorical_cols:
            input_df[col] = input_df[col].apply(lambda x: safe_str(x, "Unknown"))
        elif col in INT_COLUMNS:
            input_df[col] = input_df[col].apply(lambda x: safe_int(x, 0))
        else:
            input_df[col] = input_df[col].apply(lambda x: safe_float(x, 0.0))

    return input_df


def build_shap_explanation(model, input_df, categorical_cols):
    cat_feature_names = [col for col in categorical_cols if col in input_df.columns]

    pool = Pool(
        data=input_df,
        cat_features=cat_feature_names
    )

    shap_values = model.get_feature_importance(pool, type="ShapValues")

    base_value = float(shap_values[0, -1])
    shap_row = shap_values[0, :-1]

    explain_df = pd.DataFrame({
        "feature": input_df.columns,
        "value": input_df.iloc[0].values,
        "shap_value": shap_row
    })

    explain_df["abs_shap"] = explain_df["shap_value"].abs()
    explain_df["feature_ru"] = explain_df["feature"].map(lambda x: LABELS.get(x, x))
    explain_df = explain_df.sort_values("abs_shap", ascending=False).reset_index(drop=True)

    negative_df = (
        explain_df[explain_df["shap_value"] < 0]
        .sort_values("shap_value")
        .head(7)
        .copy()
    )

    positive_df = (
        explain_df[explain_df["shap_value"] > 0]
        .sort_values("shap_value", ascending=False)
        .head(7)
        .copy()
    )

    return base_value, explain_df, negative_df, positive_df


def validate_files():
    required_files = [
        MODEL_PATH,
        MODEL_COLUMNS_PATH,
        CATEGORICAL_COLS_PATH,
        DEFAULT_VALUES_PATH,
        CATEGORY_OPTIONS_PATH,
    ]
    missing = [p.name for p in required_files if not p.exists()]
    return missing


def main():
    st.title("SharuAI V3 — Скоринг сельхозпроизводителя")
    st.caption("Пользователь вводит данные, модель считает merit_score и показывает объяснение результата.")

    missing_files = validate_files()
    if missing_files:
        st.error("Не найдены нужные файлы:")
        for file_name in missing_files:
            st.write(f"- {file_name}")
        st.stop()

    try:
        model = load_model()
        model_columns, categorical_cols, default_values, category_options = load_artifacts()
    except Exception as e:
        st.error(f"Ошибка загрузки модели/артефактов: {e}")
        st.stop()

    if not isinstance(model_columns, list) or not model_columns:
        st.error("model_columns.pkl пустой или поврежден.")
        st.stop()

    if not isinstance(categorical_cols, list):
        categorical_cols = []

    if not isinstance(default_values, dict):
        default_values = {}

    if not isinstance(category_options, dict):
        category_options = {}

    st.subheader("Дата заявки")
    application_date = st.date_input("Выберите дату заявки")

    widget_values = {}

    for section_name, cols in SECTION_MAP.items():
        existing_cols = [c for c in cols if c in model_columns]
        if not existing_cols:
            continue

        st.subheader(section_name)
        cols_ui = st.columns(3)

        for i, col in enumerate(existing_cols):
            label = LABELS.get(col, col)

            with cols_ui[i % 3]:
                if col in categorical_cols:
                    options = get_cat_options(col, default_values, category_options)
                    default_value = safe_str(default_values.get(col, "Unknown"))
                    default_index = options.index(default_value) if default_value in options else 0

                    widget_values[col] = st.selectbox(
                        label,
                        options=options,
                        index=default_index,
                        key=f"widget_{col}"
                    )

                elif col in BINARY_COLUMNS:
                    default_value = 1 if safe_int(default_values.get(col, 0)) == 1 else 0
                    widget_values[col] = st.selectbox(
                        label,
                        options=[0, 1],
                        index=default_value,
                        key=f"widget_{col}"
                    )

                elif col in INT_COLUMNS:
                    widget_values[col] = st.number_input(
                        label,
                        value=safe_int(default_values.get(col, 0)),
                        step=1,
                        key=f"widget_{col}"
                    )

                else:
                    widget_values[col] = st.number_input(
                        label,
                        value=safe_float(default_values.get(col, 0.0)),
                        key=f"widget_{col}"
                    )

    with st.expander("Показать признаки модели"):
        st.write(model_columns)

    if st.button("Рассчитать merit_score", type="primary"):
        try:
            input_df = build_input_row(
                model_columns=model_columns,
                categorical_cols=categorical_cols,
                default_values=default_values,
                widget_values=widget_values,
                application_date=application_date
            )

            prediction = float(model.predict(input_df)[0])
            priority = get_priority_label(prediction)

            st.success(f"Predicted merit_score: {prediction:.2f}")
            st.info(f"Класс оценки: {priority}")

            try:
                base_value, explain_df, negative_df, positive_df = build_shap_explanation(
                    model=model,
                    input_df=input_df,
                    categorical_cols=categorical_cols
                )

                st.subheader("Почему модель дала такую оценку")

                left, right = st.columns(2)

                with left:
                    st.markdown("**Факторы, которые понизили score**")
                    if negative_df.empty:
                        st.write("Негативных факторов не найдено.")
                    else:
                        neg_show = negative_df[["feature_ru", "value", "shap_value"]].copy()
                        neg_show.columns = ["Фактор", "Значение", "Влияние"]
                        st.dataframe(neg_show, use_container_width=True)

                with right:
                    st.markdown("**Факторы, которые повысили score**")
                    if positive_df.empty:
                        st.write("Позитивных факторов не найдено.")
                    else:
                        pos_show = positive_df[["feature_ru", "value", "shap_value"]].copy()
                        pos_show.columns = ["Фактор", "Значение", "Влияние"]
                        st.dataframe(pos_show, use_container_width=True)

                st.subheader("Краткое объяснение")

                if not negative_df.empty:
                    neg_text = ", ".join(negative_df["feature_ru"].head(3).tolist())
                    st.write(f"Сильнее всего снизили итоговый score: {neg_text}.")

                if not positive_df.empty:
                    pos_text = ", ".join(positive_df["feature_ru"].head(3).tolist())
                    st.write(f"Сильнее всего повысили итоговый score: {pos_text}.")

                st.caption(f"Base value модели: {base_value:.2f}")

            except Exception as shap_error:
                st.warning(f"Скор посчитан, но SHAP-объяснение не построилось: {shap_error}")

            with st.expander("Посмотреть входные данные"):
                show_df = input_df.T.reset_index()
                show_df.columns = ["feature", "value"]
                show_df["feature"] = show_df["feature"].map(lambda x: LABELS.get(x, x))
                st.dataframe(show_df, use_container_width=True)

        except Exception as e:
            st.error(f"Ошибка при расчете оценки: {e}")


if __name__ == "__main__":
    main()