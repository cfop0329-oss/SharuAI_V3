import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const navigate = useNavigate();

  const [form, setForm] = useState({
    bin_iin: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.bin_iin || !form.password) {
      setIsError(true);
      setMessage("Заполните БИН/ИИН и пароль");
      return;
    }

    try {
      setLoading(true);
      setIsError(false);

      const res = await axios.post(`${API_URL}/api/auth/login`, {
        bin_iin: form.bin_iin,
        password: form.password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setMessage("Вход выполнен успешно");
      navigate("/dashboard");
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-shape auth-bg-shape-1"></div>
      <div className="auth-bg-shape auth-bg-shape-2"></div>

      <div className="auth-card">
        <div className="auth-left">
          <div className="brand-badge">SharuAI</div>
          <h1>Вход в систему</h1>
          <p className="auth-subtitle">
            Авторизуйтесь, чтобы перейти в личный кабинет и работать с системой.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">Безопасный вход</div>
            <div className="auth-feature-item">Данные из Neon</div>
            <div className="auth-feature-item">Доступ к панели пользователя</div>
          </div>
        </div>

        <div className="auth-right">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-header">
              <h2>Добро пожаловать</h2>
              <p>Введите данные, которые использовали при регистрации</p>
            </div>

            <div className="input-group">
              <label htmlFor="bin_iin">БИН / ИИН</label>
              <input
                id="bin_iin"
                type="text"
                name="bin_iin"
                value={form.bin_iin}
                onChange={handleChange}
                placeholder="Например: 123456789012"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Пароль</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>

            {message && (
              <div className={`auth-message ${isError ? "error" : "success"}`}>
                {message}
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </button>

            <div className="auth-footer">
              <span>Нет аккаунта?</span>
              <Link to="/register">Зарегистрироваться</Link>
            </div>

            <div className="auth-links">
              <a href="/">Инструкция</a>
              <a href="/">Видео-инструкция</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}