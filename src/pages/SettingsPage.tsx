import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

interface SettingsPageProps {
  onBack: () => void;
}

type SettingsSection = "profile" | "security" | "theme";

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { user, profile, updateProfile } = useAuth();
  const [section, setSection] = useState<SettingsSection>("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Тема
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Профиль
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");

  // Безопасность
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const email = user?.email || "";

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          username: username,
          bio: bio,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;

      await updateProfile(displayName);
      setMessage({ type: "success", text: "Профиль обновлён" });
    } catch (err) {
      setMessage({ type: "error", text: "Ошибка обновления профиля" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Пароли не совпадают" });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Пароль должен быть не менее 6 символов",
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Пароль изменён" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Ошибка смены пароля" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Ссылка для сброса пароля отправлена на email",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Ошибка отправки письма",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Настройки</h2>
      </div>
      
      {/* Menu */}
      <div className="settings-menu">
        <button
          className={`settings-menu-item ${section === "theme" ? "active" : ""}`}
          onClick={() => setSection("theme")}
        >
          <i className="fas fa-moon"></i>
          <span>Оформление</span>
          <i className="fas fa-chevron-right"></i>
        </button>
        <button
          className={`settings-menu-item ${section === "profile" ? "active" : ""}`}
          onClick={() => setSection("profile")}
        >
          <i className="fas fa-user"></i>
          <span>Профиль</span>
          <i className="fas fa-chevron-right"></i>
        </button>
        <button
          className={`settings-menu-item ${section === "security" ? "active" : ""}`}
          onClick={() => setSection("security")}
        >
          <i className="fas fa-shield-alt"></i>
          <span>Безопасность</span>
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      {/* Content */}
      <div className="settings-content">
        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {section === "theme" && (
          <div className="settings-form">
            <div className="form-group">
              <div className="theme-toggle">
                <div className="theme-toggle-label">
                  <i className="fas fa-moon"></i>
                  <span>Тёмная тема</span>
                </div>
                <div
                  className={`theme-switch ${darkMode ? "dark" : ""}`}
                  onClick={() => setDarkMode(!darkMode)}
                ></div>
              </div>
              <small>Переключение между светлой и тёмной темой</small>
            </div>
          </div>
        )}

        {section === "profile" && (
          <form onSubmit={handleUpdateProfile} className="settings-form">
            <div className="form-group">
              <label>
                <i className="fas fa-user"></i> Имя
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ваше имя"
              />
            </div>

            <div className="form-group">
              <label>
                <i className="fas fa-at"></i> Имя для поиска
              </label>
              <div className="input-with-prefix">
                <span className="prefix">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
              </div>
              <small>Используется для поиска как в Telegram</small>
            </div>

            <div className="form-group">
              <label>
                <i className="fas fa-info-circle"></i> О профиле
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажите о себе..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>
                <i className="fas fa-envelope"></i> Email
              </label>
              <input type="email" value={email} disabled className="disabled" />
              <small>Email нельзя изменить</small>
            </div>

            <button type="submit" disabled={loading} className="save-btn">
              <i className="fas fa-save"></i>
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </form>
        )}

        {section === "security" && (
          <div className="settings-form">
            <div className="form-group">
              <label>
                <i className="fas fa-key"></i> Смена пароля
              </label>
              <form onSubmit={handleChangePassword} className="security-form">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Текущий пароль"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Новый пароль"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Подтвердите пароль"
                />
                <button type="submit" disabled={loading} className="save-btn">
                  <i className="fas fa-key"></i>
                  Изменить пароль
                </button>
              </form>
            </div>

            <div className="form-group">
              <label>
                <i className="fas fa-envelope"></i> Сброс пароля
              </label>
              <p className="help-text">
                Отправить ссылку для сброса пароля на email
              </p>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="secondary-btn"
              >
                <i className="fas fa-paper-plane"></i>
                Отправить ссылку
              </button>
            </div>

            <div className="form-group">
              <label>
                <i className="fas fa-sign-out-alt"></i> Выйти из аккаунта
              </label>
              <button
                type="button"
                className="danger-btn"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
              >
                <i className="fas fa-sign-out-alt"></i>
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
