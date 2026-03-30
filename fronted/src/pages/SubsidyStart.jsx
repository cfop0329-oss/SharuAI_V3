import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function SubsidyStart() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [directions, setDirections] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [directionId, setDirectionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/subsidy/start-data",
          authHeaders
        );
        setDirections(res.data.directions);
        setDepartments(res.data.departments);
      } catch (err) {
        setIsError(true);
        setMessage("Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleNext = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const checkRes = await axios.post(
        "http://localhost:5000/api/subsidy/check-registration",
        {
          direction_id: directionId,
          mio_department_id: departmentId,
        },
        authHeaders
      );

      if (!checkRes.data.allowNextStep) {
        setIsError(true);
        setMessage(checkRes.data.message);
        return;
      }

      const draftRes = await axios.post(
        "http://localhost:5000/api/subsidy/create-draft",
        {
          direction_id: directionId,
          mio_department_id: departmentId,
        },
        authHeaders
      );

      localStorage.setItem("draftApplicationId", draftRes.data.applicationId);
      navigate("/subsidy/apply");
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || "Ошибка перехода к заявке");
    }
  };

  if (loading) {
    return <div className="simple-page">Загрузка...</div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-shape auth-bg-shape-1"></div>
      <div className="auth-bg-shape auth-bg-shape-2"></div>

      <div className="auth-card">
        <div className="auth-left">
          <div className="brand-badge">SharuAI</div>
          <h1>Выбор направления</h1>
          <p className="auth-subtitle">
            Выберите направление субсидирования и соответствующий МИО / УСХ перед формированием заявки.
          </p>
        </div>

        <div className="auth-right">
          <form className="auth-form" onSubmit={handleNext}>
            <div className="auth-form-header">
              <h2>Начать подачу заявки</h2>
              <p>Система сначала проверит регистрацию субъекта-получателя субсидии</p>
            </div>

            <div className="input-group">
              <label>Направление субсидирования</label>
              <select value={directionId} onChange={(e) => setDirectionId(e.target.value)}>
                <option value="">Выберите направление</option>
                {directions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>МИО / УСХ</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Выберите МИО / УСХ</option>
                {departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.region}
                  </option>
                ))}
              </select>
            </div>

            {message && (
              <div className={`auth-message ${isError ? "error" : "success"}`}>
                {message}
              </div>
            )}

            <button type="submit" className="auth-submit">
              Продолжить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}