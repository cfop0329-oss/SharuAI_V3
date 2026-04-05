import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    bin_iin: "",
    user_type: "",
    org_form: "",
    organization_name: "",
    registration_date: "",
    director: "",
    region: "",
    district: "",
    rural_district: "",
    locality: "",
    phone: "",
    postal_address: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [certificate, setCertificate] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const userTypes = [
    "Сельхозтоваропроизводитель",
    "Финансовый институт",
    "Племенной центр",
    "Дистрибьюторский центр",
    "Сервисная компания",
    "Отдел сельского хозяйства",
    "ЛПХ",
    "СПК",
  ];

  const orgForms = [
    "ТОО",
    "АО",
    "ИП",
    "КХ",
    "СПК",
    "ЛПХ",
    "ГУ",
    "ФХ",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setCertificate(file);
  };

  const validateForm = () => {
    if (
      !form.bin_iin ||
      !form.user_type ||
      !form.org_form ||
      !form.organization_name ||
      !form.director ||
      !form.region ||
      !form.email ||
      !form.password
    ) {
      setIsError(true);
      setMessage("Заполните все обязательные поля");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setIsError(true);
      setMessage("Пароли не совпадают");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!validateForm()) return;

    try {
      setLoading(true);
      setIsError(false);

      const data = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key !== "confirmPassword") {
          data.append(key, value);
        }
      });

      if (certificate) {
        data.append("certificate", certificate);
      }

      await axios.post(`${API_URL}/api/auth/register`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage("Регистрация прошла успешно");

      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      console.error("Register error:", err);
      setIsError(true);
      setMessage(err.response?.data?.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-shape auth-bg-shape-1"></div>
      <div className="auth-bg-shape auth-bg-shape-2"></div>

      <div className="auth-card register-card">
        <div className="auth-left">
          <div className="brand-badge">SharuAI</div>
          <h1>Регистрация аккаунта</h1>
          <p className="auth-subtitle">
            Создайте учетную запись, чтобы получить доступ к системе, подать заявку
            и работать с пользовательской панелью.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">Быстрая регистрация</div>
            <div className="auth-feature-item">Безопасное хранение данных</div>
            <div className="auth-feature-item">Подключение к Neon PostgreSQL</div>
          </div>
        </div>

        <div className="auth-right register-right">
          <form className="auth-form register-form-modern" onSubmit={handleSubmit}>
            <div className="auth-form-header">
              <h2>Создать аккаунт</h2>
              <p>Заполните регистрационные данные организации или пользователя</p>
            </div>

            <div className="register-grid">
              <div className="input-group">
                <label htmlFor="bin_iin">БИН / ИИН *</label>
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
                <label htmlFor="user_type">Тип пользователя *</label>
                <select
                  id="user_type"
                  name="user_type"
                  value={form.user_type}
                  onChange={handleChange}
                >
                  <option value="">Выберите тип</option>
                  {userTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="org_form">Организационная форма *</label>
                <select
                  id="org_form"
                  name="org_form"
                  value={form.org_form}
                  onChange={handleChange}
                >
                  <option value="">Выберите форму</option>
                  {orgForms.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="organization_name">Наименование *</label>
                <input
                  id="organization_name"
                  type="text"
                  name="organization_name"
                  value={form.organization_name}
                  onChange={handleChange}
                  placeholder="Название организации"
                />
              </div>

              <div className="input-group">
                <label htmlFor="registration_date">Дата гос. регистрации</label>
                <input
                  id="registration_date"
                  type="date"
                  name="registration_date"
                  value={form.registration_date}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label htmlFor="director">Руководитель *</label>
                <input
                  id="director"
                  type="text"
                  name="director"
                  value={form.director}
                  onChange={handleChange}
                  placeholder="ФИО руководителя"
                />
              </div>

              <div className="input-group">
                <label htmlFor="region">Область *</label>
                <input
                  id="region"
                  type="text"
                  name="region"
                  value={form.region}
                  onChange={handleChange}
                  placeholder="Введите область"
                />
              </div>

              <div className="input-group">
                <label htmlFor="district">Район</label>
                <input
                  id="district"
                  type="text"
                  name="district"
                  value={form.district}
                  onChange={handleChange}
                  placeholder="Введите район"
                />
              </div>

              <div className="input-group">
                <label htmlFor="rural_district">Сельский округ</label>
                <input
                  id="rural_district"
                  type="text"
                  name="rural_district"
                  value={form.rural_district}
                  onChange={handleChange}
                  placeholder="Введите сельский округ"
                />
              </div>

              <div className="input-group">
                <label htmlFor="locality">Населенный пункт</label>
                <input
                  id="locality"
                  type="text"
                  name="locality"
                  value={form.locality}
                  onChange={handleChange}
                  placeholder="Введите населенный пункт"
                />
              </div>

              <div className="input-group">
                <label htmlFor="phone">Телефон</label>
                <input
                  id="phone"
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+7 700 000 00 00"
                />
              </div>

              <div className="input-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@mail.kz"
                />
              </div>
            </div>

            <div className="input-group full-width">
              <label htmlFor="postal_address">Почтовый адрес</label>
              <textarea
                id="postal_address"
                name="postal_address"
                value={form.postal_address}
                onChange={handleChange}
                placeholder="Введите почтовый адрес"
                rows="3"
              />
            </div>

            <div className="register-grid register-grid-bottom">
              <div className="input-group">
                <label htmlFor="password">Пароль *</label>
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

              <div className="input-group">
                <label htmlFor="confirmPassword">Повторите пароль *</label>
                <div className="password-wrapper">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Повторите пароль"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? "Скрыть" : "Показать"}
                  </button>
                </div>
              </div>
            </div>

            <div className="input-group full-width">
              <label htmlFor="certificate">Свидетельство о гос. регистрации</label>
              <label className="upload-box">
                <input
                  id="certificate"
                  type="file"
                  onChange={handleFileChange}
                  hidden
                />
                <span className="upload-title">
                  {certificate ? "Файл выбран" : "Загрузить файл"}
                </span>
                <span className="upload-subtitle">
                  {certificate ? certificate.name : "PDF, JPG, PNG или другой документ"}
                </span>
              </label>
            </div>

            {message && (
              <div className={`auth-message ${isError ? "error" : "success"}`}>
                {message}
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </button>

            <div className="auth-footer">
              <span>Уже есть аккаунт?</span>
              <Link to="/">Войти</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}