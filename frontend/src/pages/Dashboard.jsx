export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Пользовательская панель</h1>
      {user ? (
        <div>
          <p><strong>БИН/ИИН:</strong> {user.bin_iin}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Организация:</strong> {user.organization_name}</p>
          <p><strong>Тип пользователя:</strong> {user.user_type}</p>
        </div>
      ) : (
        <p>Пользователь не найден</p>
      )}
    </div>
  );
}