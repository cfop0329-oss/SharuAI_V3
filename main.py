from pathlib import Path
from typing import Any, Optional

import joblib
import pandas as pd
from catboost import CatBoostRegressor
from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "ml" / "models" / "catboost_merit_model.cbm"
MODEL_COLUMNS_PATH = BASE_DIR / "model_columns.pkl"
CATEGORICAL_COLS_PATH = BASE_DIR / "categorical_cols.pkl"
DEFAULT_VALUES_PATH = BASE_DIR / "default_values.pkl"
CATEGORY_OPTIONS_PATH = BASE_DIR / "category_options.pkl"

print("MODEL_PATH:", MODEL_PATH, MODEL_PATH.exists())
print("MODEL_COLUMNS_PATH:", MODEL_COLUMNS_PATH, MODEL_COLUMNS_PATH.exists())
print("CATEGORICAL_COLS_PATH:", CATEGORICAL_COLS_PATH, CATEGORICAL_COLS_PATH.exists())
print("DEFAULT_VALUES_PATH:", DEFAULT_VALUES_PATH, DEFAULT_VALUES_PATH.exists())
print("CATEGORY_OPTIONS_PATH:", CATEGORY_OPTIONS_PATH, CATEGORY_OPTIONS_PATH.exists())

app = FastAPI(title="SharuAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = CatBoostRegressor()
model.load_model(str(MODEL_PATH))

model_columns = joblib.load(MODEL_COLUMNS_PATH)
categorical_cols = joblib.load(CATEGORICAL_COLS_PATH)
default_values = joblib.load(DEFAULT_VALUES_PATH)
category_options = joblib.load(CATEGORY_OPTIONS_PATH)


class ApplicationInput(BaseModel):
    application_date: Optional[str] = None

    region: str = ""
    district: str = ""
    akimat: str = ""
    direction: str = ""
    species: str = ""
    subsidy_program: str = ""
    producer_type: str = ""

    entitled_amount_kzt: float = 0
    subsidized_units_est: float = 0
    years_in_operation: int = 0
    employees_count: int = 0
    land_area_ha: float = 0
    herd_size_head: float = 0
    output_volume_tons: float = 0
    productivity_index: float = 0
    revenue_kzt: float = 0
    ebitda_margin_pct: float = 0
    debt_to_revenue_pct: float = 0

    prior_subsidies_count_3y: int = 0
    prior_subsidies_amount_kzt_3y: float = 0
    prior_violations_count_3y: int = 0
    prior_refunds_count_3y: int = 0
    prior_refunds_amount_kzt_3y: float = 0
    unmet_obligations_flag: int = 0

    past_applications_count: int = 0
    past_approved_count: int = 0
    past_rejected_count: int = 0
    past_withdrawn_count: int = 0
    past_paid_amount_kzt: float = 0


class StatusUpdate(BaseModel):
    status: str


APPLICATIONS = []


def safe_str(x: Any) -> str:
    if x is None:
        return ""
    return str(x).strip()


def safe_num(x: Any) -> float:
    try:
        if x is None or x == "":
            return 0.0
        return float(x)
    except Exception:
        return 0.0


def build_input_df(data: ApplicationInput) -> pd.DataFrame:
    payload = data.model_dump()

    row = {}
    for col in model_columns:
        row[col] = default_values.get(col, 0)

    if payload.get("application_date"):
        dt = pd.to_datetime(payload["application_date"])
        if "year" in model_columns:
            row["year"] = int(dt.year)
        if "month" in model_columns:
            row["month"] = int(dt.month)
        if "quarter" in model_columns:
            row["quarter"] = int(dt.quarter)
        if "day_of_year" in model_columns:
            row["day_of_year"] = int(dt.dayofyear)

    # перенос полей формы
    field_map = {
        "region": "region",
        "district": "district",
        "akimat": "akimat",
        "direction": "direction",
        "species": "species",
        "subsidy_program": "subsidy_program",
        "producer_type": "producer_type",

        "entitled_amount_kzt": "entitled_amount_kzt",
        "subsidized_units_est": "subsidized_units_est",
        "years_in_operation": "years_in_operation",
        "employees_count": "employees_count",
        "land_area_ha": "land_area_ha",
        "herd_size_head": "herd_size_head",
        "output_volume_tons": "output_volume_tons",
        "productivity_index": "productivity_index",
        "revenue_kzt": "revenue_kzt",
        "ebitda_margin_pct": "ebitda_margin_pct",
        "debt_to_revenue_pct": "debt_to_revenue_pct",

        "prior_subsidies_count_3y": "prior_subsidies_count_3y",
        "prior_subsidies_amount_kzt_3y": "prior_subsidies_amount_kzt_3y",
        "prior_violations_count_3y": "prior_violations_count_3y",
        "prior_refunds_count_3y": "prior_refunds_count_3y",
        "prior_refunds_amount_kzt_3y": "prior_refunds_amount_kzt_3y",
        "unmet_obligations_flag": "unmet_obligations_flag",

        "past_applications_count": "past_applications_count",
        "past_approved_count": "past_approved_count",
        "past_rejected_count": "past_rejected_count",
        "past_withdrawn_count": "past_withdrawn_count",
        "past_paid_amount_kzt": "past_paid_amount_kzt",
    }

    for source_key, target_key in field_map.items():
      if target_key in row:
          row[target_key] = payload.get(source_key, row[target_key])

    df = pd.DataFrame([row]).reindex(columns=model_columns)

    for col in df.columns:
        if col in categorical_cols:
            df[col] = df[col].map(safe_str)
        else:
            df[col] = df[col].map(safe_num)

    return df


def get_priority(score: float) -> str:
    if score >= 80:
        return "HIGH"
    if score >= 60:
        return "MEDIUM"
    return "LOW"


def build_risk_flags(data: ApplicationInput) -> list[str]:
    flags = []

    if data.prior_violations_count_3y > 0:
        flags.append("Есть нарушения за 3 года")

    if data.unmet_obligations_flag == 1:
        flags.append("Есть невыполненные обязательства")

    if data.debt_to_revenue_pct > 60:
        flags.append("Высокая долговая нагрузка")

    if data.prior_refunds_count_3y > 0:
        flags.append("Есть возвраты субсидий")

    return flags


def get_recommendation(priority: str, risk_flags: list[str]) -> str:
    if priority == "HIGH" and not risk_flags:
        return "Рекомендуется к одобрению"
    if priority == "LOW":
        return "Высокий риск, требуется дополнительная проверка"
    return "Передать эксперту на рассмотрение"


@app.get("/")
def root():
    return {"message": "SharuAI API работает"}


@app.post("/api/applications")
def create_application(data: ApplicationInput, authorization: str | None = Header(default=None)):
    # для демо user берём из заглушки
    # потом заменишь на реальную авторизацию и БД
    current_user = {
        "organization_name": "Demo Organization",
        "email": "demo@mail.com",
        "bin_iin": "000000000000",
    }

    df = build_input_df(data)
    score = float(model.predict(df)[0])
    priority = get_priority(score)
    risk_flags = build_risk_flags(data)
    recommendation = get_recommendation(priority, risk_flags)

    application = {
        "id": len(APPLICATIONS) + 1,
        "user": current_user,
        "region": data.region,
        "subsidyProgram": data.subsidy_program,
        "requestedAmount": data.entitled_amount_kzt,
        "score": round(score, 2),
        "priority": priority,
        "riskFlags": risk_flags,
        "recommendation": recommendation,
        "status": "NEW",
        "rawPayload": data.model_dump(),
    }

    APPLICATIONS.insert(0, application)

    return {
        "message": "Заявка создана",
        "application": application
    }


@app.get("/api/applications/queue")
def get_queue(authorization: str | None = Header(default=None)):
    return {"applications": APPLICATIONS}


@app.get("/api/applications/stats")
def get_stats(authorization: str | None = Header(default=None)):
    total = len(APPLICATIONS)
    high = sum(1 for a in APPLICATIONS if a["priority"] == "HIGH")
    medium = sum(1 for a in APPLICATIONS if a["priority"] == "MEDIUM")
    low = sum(1 for a in APPLICATIONS if a["priority"] == "LOW")
    review_needed = sum(1 for a in APPLICATIONS if len(a["riskFlags"]) > 0)

    scores = [a["score"] for a in APPLICATIONS if a.get("score") is not None]
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0

    return {
        "total": total,
        "high": high,
        "medium": medium,
        "low": low,
        "reviewNeeded": review_needed,
        "avgScore": avg_score,
    }


@app.patch("/api/applications/{application_id}/status")
def update_application_status(
    application_id: int,
    data: StatusUpdate,
    authorization: str | None = Header(default=None),
):
    for app_item in APPLICATIONS:
        if app_item["id"] == application_id:
            app_item["status"] = data.status
            return {
                "message": "Статус обновлён",
                "application": app_item
            }

    return {"message": "Заявка не найдена"}