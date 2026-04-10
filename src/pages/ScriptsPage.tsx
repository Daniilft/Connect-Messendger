import React, { useState } from "react";
import { useCustomScripts } from "../hooks/useCustomScripts";
import { CustomScript } from "../types";

export function ScriptsPage() {
  const {
    scripts,
    publicScripts,
    loading,
    checkNameUnique,
    createScript,
    updateScript,
    deleteScript,
    executeScript,
  } = useCustomScripts();

  const [showEditor, setShowEditor] = useState(false);
  const [editorClosing, setEditorClosing] = useState(false);
  const [editingScript, setEditingScript] = useState<CustomScript | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [nameError, setNameError] = useState("");
  const [executing, setExecuting] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"my" | "public">("my");

  const resetForm = () => {
    setName("");
    setDescription("");
    setCode("");
    setIsPublic(false);
    setNameError("");
    setEditingScript(null);
  };

  const handleSave = async () => {
    setNameError("");

    // Проверка уникальности имени
    const isUnique = await checkNameUnique(name);
    if (!isUnique) {
      setNameError("Такое имя уже используется");
      return;
    }

    if (editingScript) {
      await updateScript(editingScript.id, {
        name,
        description,
        code,
        is_public: isPublic,
      });
    } else {
      await createScript(name, code, description, isPublic);
    }

    closeEditor();
  };

  const closeEditor = () => {
    setEditorClosing(true);
    setTimeout(() => {
      setShowEditor(false);
      setEditorClosing(false);
      resetForm();
    }, 250);
  };

  const handleEdit = (script: CustomScript) => {
    setEditingScript(script);
    setName(script.name);
    setDescription(script.description || "");
    setCode(script.code);
    setIsPublic(script.is_public);
    setShowEditor(true);
  };

  const handleDelete = async (scriptId: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm("Удалить скрипт?")) {
      await deleteScript(scriptId);
    }
  };

  const handleExecute = async (scriptId: string) => {
    setExecuting(true);
    setOutput(null);
    const result = await executeScript(scriptId, { test: "data" });
    setOutput(result);
    setExecuting(false);
  };

  const displayScripts = activeTab === "my" ? scripts : publicScripts;

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="scripts-page">
      <div className="scripts-header">
        <h1>Скрипты</h1>
        <button
          onClick={() => {
            resetForm();
            setShowEditor(true);
          }}
        >
          + Новый скрипт
        </button>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "my" ? "active" : ""}
          onClick={() => setActiveTab("my")}
        >
          Мои скрипты ({scripts.length})
        </button>
        <button
          className={activeTab === "public" ? "active" : ""}
          onClick={() => setActiveTab("public")}
        >
          Публичные ({publicScripts.length})
        </button>
      </div>

      <div className="scripts-list">
        {displayScripts.length === 0 ? (
          <div className="empty">Нет скриптов</div>
        ) : (
          displayScripts.map((script) => (
            <div key={script.id} className="script-card">
              <div className="script-info">
                <h3>{script.name}</h3>
                <p>{script.description || "Без описания"}</p>
                <span className="script-author">
                  Автор: {script.author?.display_name || "Unknown"}
                </span>
              </div>
              <div className="script-actions">
                <button
                  onClick={() => handleExecute(script.id)}
                  disabled={executing}
                >
                  ▶ Выполнить
                </button>
                {activeTab === "my" && (
                  <>
                    <button onClick={() => handleEdit(script)}>✏️</button>
                    <button onClick={() => handleDelete(script.id)}>🗑️</button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {output && (
        <div className="output-panel">
          <h4>Результат:</h4>
          <pre>{JSON.stringify(output, null, 2)}</pre>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className={`modal-overlay ${editorClosing ? "closing" : ""}`}>
          <div className={`modal editor-modal ${editorClosing ? "closing" : ""}`}>
            <h2>{editingScript ? "Редактировать" : "Новый скрипт"}</h2>

            <input
              type="text"
              placeholder="Уникальное имя скрипта"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {nameError && <div className="error">{nameError}</div>}

            <input
              type="text"
              placeholder="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Публичный скрипт
            </label>

            <textarea
              placeholder="// Ваш код на JavaScript"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={15}
              className="code-editor"
            />

            <div className="modal-actions">
              <button onClick={handleSave}>Сохранить</button>
              <button onClick={closeEditor}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
