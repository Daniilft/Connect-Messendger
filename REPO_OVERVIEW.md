# Connect Messenger — Обзор репозитория

## 1. Общее описание проекта

**Connect** — веб-мессенджер реального времени, аналог Telegram, построенный на React + Supabase.

### Стек технологий

| Категория | Технология |
|-----------|-----------|
| Фреймворк | React 18 + TypeScript |
| Сборка | Create React App (react-scripts 5.0.1) |
| Backend / BaaS | Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions) |
| Стили | Чистый CSS (App.css) с поддержкой тёмной темы |
| Иконки | Font Awesome (fas/far классы) |

### Ключевые возможности

- **Аутентификация** — регистрация, вход, сброс пароля через Supabase Auth с подтверждением email
- **Чаты** — личные (direct) и групповые (group) чаты
- **Сообщения** — текст, изображения, видео, файлы; ответы (reply), редактирование, удаление
- **Реакции** — 8 эмодзи-реакций на сообщения
- **Медиа** — загрузка файлов в Supabase Storage с прогресс-баром (лимиты: 10 МБ изображения, 100 МБ видео)
- **Поиск** — по чатам, сообщениям, каналам с debounce
- **Статусы пользователей** — online/offline/typing с автообновлением каждые 30 секунд
- **Кастомные скрипты** — создание, редактирование, выполнение через Supabase Edge Function
- **Настройки** — профиль (имя, username, bio), смена пароля, тёмная/светлая тема
- **Realtime** — подписки на изменения чатов и сообщений через Supabase Realtime
- **Бесконечная прокрутка** — подгрузка сообщений по 50 штук

---

## 2. Структура файлов и папок

```
connect-messenger/
├── public/                          # Статические файлы (CRA)
│   ├── favicon.ico
│   ├── index.html                   # HTML-шаблон
│   ├── logo192.png / logo512.png    # Иконки приложения
│   ├── manifest.json                # PWA манифест
│   └── robots.txt
├── src/
│   ├── components/                  # Переиспользуемые UI-компоненты
│   │   ├── ChatHeader.tsx           # Заголовок чата (имя, статус, поиск)
│   │   ├── ChatList.tsx             # Список чатов в сайдбаре
│   │   ├── MessageInput.tsx         # Поле ввода сообщений + загрузка файлов
│   │   └── MessageList.tsx          # Список сообщений с контекстным меню
│   ├── context/
│   │   └── AuthContext.tsx          # Контекст авторизации (AuthProvider + useAuth)
│   ├── hooks/                       # Кастомные хуки для работы с данными
│   │   ├── useChats.ts              # Управление чатами (CRUD, realtime)
│   │   ├── useCustomScripts.ts      # Управление скриптами (CRUD, выполнение)
│   │   ├── useMedia.ts              # Загрузка медиа в Storage
│   │   ├── useMessages.ts           # Управление сообщениями (CRUD, реакции, поиск)
│   │   ├── useUsers.ts              # Поиск пользователей и каналов
│   │   └── useUserStatus.ts         # Статус онлайн пользователя
│   ├── pages/                       # Страницы приложения
│   │   ├── AuthPage.tsx             # Страница входа/регистрации
│   │   ├── MessengerPage.tsx        # Главная страница мессенджера
│   │   ├── ScriptsPage.tsx          # Страница кастомных скриптов
│   │   └── SettingsPage.tsx         # Страница настроек
│   ├── types/
│   │   └── index.ts                 # Все TypeScript-типы
│   ├── App.tsx                      # Корневой компонент (роутинг по auth)
│   ├── App.css                      # Все стили (1858 строк, включая тёмную тему)
│   ├── index.tsx                    # Точка входа (ReactDOM.render)
│   └── supabaseClient.ts            # Инициализация Supabase клиента
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## 3. Описание компонентов

### ChatHeader

**Файл:** `src/components/ChatHeader.tsx`

**Props:**
| Prop | Тип | Описание |
|------|-----|----------|
| `chat` | `Chat \| null` | Текущий выбранный чат |

**Что рендерит:**
- Название чата (для группы — `chat.name`, для личного — `display_name` / `username` / `email` собеседника)
- Статус: для группы — количество участников, для личного — статус онлайн через `useUserStatus`
- Кнопка поиска в чате (иконка лупы)
- Возвращает `null` если `chat === null`

---

### ChatList

**Файл:** `src/components/ChatList.tsx`

**Props:**
| Prop | Тип | Описание |
|------|-----|----------|
| `chats` | `Chat[]` | Массив чатов |
| `selectedChatId` | `string \| null` | ID выбранного чата |
| `onSelectChat` | `(chatId: string) => void` | Колбэк при клике на чат |
| `loading` | `boolean` | Флаг загрузки |

**Что рендерит:**
- Состояние загрузки (спиннер) или пустой список (иконка + "Нет чатов")
- Список элементов чата с аватаром (иконка пользователя/группы), названием, последним сообщением (обрезка до 50 символов), бейджем непрочитанных
- Активный чат подсвечивается классом `active`

---

### MessageInput

**Файл:** `src/components/MessageInput.tsx`

**Props:**
| Prop | Тип | Описание |
|------|-----|----------|
| `onSend` | `(content, type, fileUrl?, fileName?, replyTo?) => Promise<void>` | Отправка сообщения |
| `replyingTo` | `Message \| null` | Сообщение, на которое отвечаем |
| `onCancelReply` | `() => void` | Отмена ответа |
| `disabled` | `boolean` | Блокировка ввода |

**Что рендерит:**
- Индикатор ответа (reply indicator) с именем автора и кнопкой отмены
- Прогресс-бар загрузки файлов
- Форму с кнопкой прикрепления файла, текстовым полем и кнопкой отправки
- Скрытый `<input type="file">` с поддержкой: `image/*, video/*, .pdf, .json, .txt`
- Автоматически определяет тип файла (image/video/file) и вызывает соответствующий метод загрузки

---

### MessageList

**Файл:** `src/components/MessageList.tsx`

**Props:**
| Prop | Тип | Описание |
|------|-----|----------|
| `messages` | `Message[]` | Массив сообщений |
| `loading` | `boolean` | Первичная загрузка |
| `hasMore` | `boolean` | Есть ли ещё сообщения для подгрузки |
| `loadingMore` | `boolean` | Идёт ли подгрузка |
| `onLoadMore` | `() => void` | Подгрузить следующую порцию |
| `onReply` | `(message: Message) => void` | Ответить на сообщение |
| `onEdit` | `(message: Message) => void` | Редактировать сообщение |
| `onDelete` | `(message: Message) => void` | Удалить сообщение |
| `onAddReaction` | `(messageId, emoji) => void` | Добавить реакцию |

**Что рендерит:**
- Список сообщений с автопрокруткой вниз при новых сообщениях
- Бесконечная прокрутка (подгрузка при скролле вверх, порог 100px)
- Типы сообщений: текст, изображение (`<img>`), видео (`<video controls>`), файл (ссылка на скачивание)
- Блок ответа (reply) с автором и содержимым
- Метка `(изменено)` если `updated_at !== created_at`
- Реакции (сгруппированные по эмодзи с количеством)
- Контекстное меню (правый клик) с анимацией: Ответить, Реакция, Изменить, Удалить (последние два — только для своих сообщений)
- Пикер реакций (8 эмодзи: 👍 ❤️ 😂 😢 😮 🔥 🎉 👎) в модальном окне

---

## 4. Описание хуков

### useChats

**Файл:** `src/hooks/useChats.ts`

**Возвращает:**
| Поле/Метод | Тип | Описание |
|------------|-----|----------|
| `chats` | `Chat[]` | Список чатов пользователя |
| `loading` | `boolean` | Флаг загрузки |
| `error` | `Error \| null` | Ошибка |
| `createDirectChat(otherUserId)` | `Promise<{chatId?, error?}>` | Создать/найти личный чат |
| `createGroupChat(name, memberIds)` | `Promise<{chatId?, error?}>` | Создать групповой чат |
| `getChatWithMembers(chatId)` | `Promise<ChatWithMembers \| null>` | Получить чат с полными данными участников |
| `addMember(chatId, userId)` | `Promise<{error?}>` | Добавить участника |
| `removeMember(chatId, userId)` | `Promise<{error?}>` | Удалить участника |
| `renameChat(chatId, name)` | `Promise<{error?}>` | Переименовать чат |
| `leaveChat(chatId)` | `Promise<{error?}>` | Покинуть чат |
| `refetch()` | `() => Promise<void>` | Перезагрузить чаты |

**Данные:** Таблицы `chats`, `chat_members`, `profiles`. Realtime-подписка на `chat_members`.

**Логика:** При загрузке сначала получает ID чатов из `chat_members`, затем данные чатов, затем профили других участников — всё отдельными запросами (без nested joins).

---

### useMessages

**Файл:** `src/hooks/useMessages.ts`

**Параметр:** `chatId: string | null`

**Возвращает:**
| Поле/Метод | Тип | Описание |
|------------|-----|----------|
| `messages` | `Message[]` | Сообщения текущего чата |
| `loading` | `boolean` | Первичная загрузка |
| `error` | `Error \| null` | Ошибка |
| `hasMore` | `boolean` | Есть ли ещё |
| `loadingMore` | `boolean` | Подгрузка |
| `loadMore()` | `() => void` | Загрузить следующую страницу (50 шт) |
| `sendMessage(content, type, fileUrl?, fileName?, replyTo?)` | `Promise` | Отправить сообщение |
| `editMessage(messageId, content)` | `Promise` | Редактировать (только свои) |
| `deleteMessage(messageId)` | `Promise` | Мягкое удаление (is_deleted = true) |
| `addReaction(messageId, emoji)` | `Promise` | Добавить реакцию |
| `removeReaction(messageId, emoji)` | `Promise` | Удалить свою реакцию |
| `searchMessages(query)` | `Promise<Message[]>` | Поиск в текущем чате |
| `searchAllMessages(query, userId)` | `Promise<any[]>` | Глобальный поиск по всем чатам |

**Данные:** Таблицы `messages`, `profiles`, `message_reactions`, `chat_members`. Realtime-подписка на `INSERT` в `messages` для текущего чата.

**Логика:** Загружает профили отправителей и reply-сообщения отдельными запросами. Свои сообщения не дублируются через realtime (фильтр `sender_id !== user.id`).

---

### useMedia

**Файл:** `src/hooks/useMedia.ts`

**Возвращает:**
| Поле/Метод | Тип | Описание |
|------------|-----|----------|
| `uploading` | `boolean` | Идёт ли загрузка |
| `progress` | `{loaded, total, percentage} \| null` | Прогресс загрузки |
| `error` | `Error \| null` | Ошибка |
| `uploadImage(file)` | `Promise<{url, name, size} \| null>` | Загрузить изображение (макс 10 МБ) |
| `uploadVideo(file)` | `Promise<{url, name, size} \| null>` | Загрузить видео (макс 100 МБ) |
| `uploadFile(file)` | `Promise<{url, name, size} \| null>` | Загрузить файл |
| `deleteMedia(filePath)` | `Promise<{error?}>` | Удалить файл из Storage |

**Данные:** Bucket `messages-media` в Supabase Storage. Путь файла: `{userId}/{timestamp}-{random}.{ext}`.

---

### useCustomScripts

**Файл:** `src/hooks/useCustomScripts.ts`

**Возвращает:**
| Поле/Метод | Тип | Описание |
|------------|-----|----------|
| `scripts` | `CustomScript[]` | Свои скрипты |
| `publicScripts` | `CustomScript[]` | Публичные скрипты других пользователей |
| `loading` | `boolean` | Флаг загрузки |
| `error` | `Error \| null` | Ошибка |
| `checkNameUnique(name)` | `Promise<boolean>` | Проверка уникальности имени |
| `createScript(name, code, description?, isPublic?)` | `Promise` | Создать скрипт |
| `updateScript(scriptId, updates)` | `Promise` | Обновить скрипт |
| `deleteScript(scriptId)` | `Promise` | Удалить скрипт |
| `executeScript(scriptId, input?)` | `Promise<ScriptExecution \| null>` | Выполнить через Edge Function |
| `refetch()` | `() => Promise<void>` | Перезагрузить |

**Данные:** Таблица `custom_scripts`. Выполнение через Supabase Edge Function `execute-script`.

---

### useUsers

**Файл:** `src/hooks/useUsers.ts`

**Возвращает:**
| Поле/Метод | Тип | Описание |
|------------|-----|----------|
| `users` | `Profile[]` | Результаты поиска пользователей |
| `channels` | `any[]` | Результаты поиска каналов |
| `loading` | `boolean` | Флаг загрузки |
| `searchUsers(query)` | `Promise<void>` | Поиск по точному совпадению username |
| `getUserById(userId)` | `Promise<Profile \| null>` | Получить профиль по ID |

**Данные:** Таблицы `profiles`, `chats` (тип `channel`).

---

### useUserStatus

**Файл:** `src/hooks/useUserStatus.ts`

**Параметр:** `userId: string | undefined`

**Возвращает:**
| Поле/Метод | Тип | Описание |
|------------|-----|----------|
| `status` | `UserStatus` | Текущий статус (online/offline/typing) |
| `lastSeen` | `string \| null` | Время последнего посещения |
| `getStatusText()` | `string` | Форматированный текст статуса ("в сети", "был(а) 5 мин. назад") |
| `updateOnlineStatus(isOnline)` | `Promise<void>` | Обновить свой статус |

**Данные:** Таблица `profiles` (поля `status`, `last_seen`). Realtime-подписка на `UPDATE` + периодический refresh каждые 30 секунд.

---

## 5. Описание страниц

### AuthPage

**Файл:** `src/pages/AuthPage.tsx`

**Режимы:** `login` | `register` | `reset` | `confirm`

**Функциональность:**
- **Вход** — email + пароль → `signIn()`
- **Регистрация** — имя + email + пароль → `signUp()` → переход на экран подтверждения email
- **Сброс пароля** — email → `resetPassword()` → отправка ссылки
- **Подтверждение** — экран с инструкцией проверить почту

**Состояния:** error, success, loading.

---

### MessengerPage

**Файл:** `src/pages/MessengerPage.tsx`

**Props:** `onOpenSettings: () => void`

**Функциональность:**
- Сайдбар с поиском (debounce 300мс) и списком чатов
- Поиск по 3 табам: Чаты, Сообщения, Каналы
- При выборе пользователя из поиска — создание личного чата
- Основная область чата: ChatHeader + MessageList + MessageInput
- Обработчики: отправка, ответ, редактирование, удаление, реакции
- Кнопка настроек в сайдбаре

**Состояния:** `selectedChatId`, `replyingTo`, `editingMessage`, `searchQuery`, `showSearchResults`, `searchTab`, `searchedMessages`

---

### ScriptsPage

**Файл:** `src/pages/ScriptsPage.tsx`

**Функциональность:**
- 2 таба: "Мои скрипты" и "Публичные"
- Список скриптов с кнопками: Выполнить, Редактировать, Удалить
- Модальный редактор: имя, описание, код (textarea с monospace), чекбокс "Публичный"
- Проверка уникальности имени при сохранении
- Панель вывода результата выполнения (JSON)

**Состояния:** `showEditor`, `editingScript`, `name`, `description`, `code`, `isPublic`, `output`, `executing`, `activeTab`

---

### SettingsPage

**Файл:** `src/pages/SettingsPage.tsx`

**Props:** `onBack: () => void`

**Секции:** `profile` | `security` | `theme`

**Функциональность:**
- **Оформление** — переключатель тёмной/светлой темы (сохраняется в localStorage)
- **Профиль** — редактирование display_name, username, bio; email отображается как disabled
- **Безопасность** — смена пароля (текущий + новый + подтверждение), сброс пароля через email, выход из аккаунта

**Состояния:** `section`, `loading`, `message`, `darkMode`, `displayName`, `username`, `bio`, `currentPassword`, `newPassword`, `confirmPassword`

---

## 6. Описание типов данных

**Файл:** `src/types/index.ts`

### Базовые типы-перечисления

```typescript
ChatType = "direct" | "group"
MessageType = "text" | "image" | "video" | "file" | "code"
MemberRole = "member" | "admin"
ExecutionStatus = "success" | "error" | "timeout"
UserStatus = "online" | "offline" | "typing"
```

### Profile

Профиль пользователя (таблица `profiles` в Supabase).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `string` | UUID (совпадает с Supabase Auth user.id) |
| `email` | `string` | Email |
| `display_name` | `string \| null` | Отображаемое имя |
| `username` | `string \| null` | Уникальный username для поиска (@username) |
| `bio` | `string \| null` | Описание профиля |
| `avatar_url` | `string \| null` | URL аватара |
| `status` | `UserStatus` | Статус онлайн |
| `last_seen` | `string \| null` | Время последнего посещения |
| `created_at` | `string` | Дата создания |
| `updated_at` | `string` | Дата обновления |

### Chat

Чат (таблица `chats`).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `string` | UUID |
| `type` | `ChatType` | direct или group |
| `name` | `string \| null` | Название (для групп) |
| `created_by` | `string` | ID создателя |
| `created_at` | `string` | Дата создания |
| `updated_at` | `string` | Дата обновления |
| `last_message?` | `Message` | UI-поле: последнее сообщение |
| `unread_count?` | `number` | UI-поле: кол-во непрочитанных |
| `members?` | `ChatMember[]` | UI-поле: участники |
| `other_member?` | `Profile \| null` | UI-поле: собеседник (для direct) |

### ChatMember

Участник чата (таблица `chat_members`).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `string` | UUID |
| `chat_id` | `string` | ID чата |
| `user_id` | `string` | ID пользователя |
| `role` | `MemberRole` | member или admin |
| `joined_at` | `string` | Дата вступления |
| `profile?` | `Profile` | Вложенный профиль |

### Message

Сообщение (таблица `messages`).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `string` | UUID |
| `chat_id` | `string` | ID чата |
| `sender_id` | `string` | ID отправителя |
| `content` | `string` | Текст сообщения |
| `message_type` | `MessageType` | Тип контента |
| `file_url` | `string \| null` | URL файла |
| `file_name` | `string \| null` | Имя файла |
| `file_size` | `number \| null` | Размер в байтах |
| `mime_type` | `string \| null` | MIME-тип |
| `reply_to` | `string \| null` | ID сообщения, на которое отвечаем |
| `is_deleted` | `boolean` | Флаг мягкого удаления |
| `created_at` | `string` | Дата создания |
| `updated_at` | `string` | Дата обновления |
| `sender?` | `Profile` | UI-поле: профиль отправителя |
| `reply_message?` | `Message` | UI-поле: исходное сообщение для reply |
| `reactions?` | `MessageReaction[]` | UI-поле: реакции |

### MessageReaction

Реакция (таблица `message_reactions`).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `string` | UUID |
| `message_id` | `string` | ID сообщения |
| `user_id` | `string` | ID пользователя |
| `emoji` | `string` | Эмодзи |
| `created_at` | `string` | Дата |
| `user?` | `Profile` | UI-поле: профиль |

### CustomScript

Кастомный скрипт (таблица `custom_scripts`).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `string` | UUID |
| `user_id` | `string` | ID автора |
| `name` | `string` | Уникальное имя |
| `description` | `string \| null` | Описание |
| `code` | `string` | Код скрипта |
| `is_public` | `boolean` | Публичный ли |
| `created_at` | `string` | Дата создания |
| `updated_at` | `string` | Дата обновления |
| `author?` | `Profile` | UI-поле: профиль автора |

### ScriptExecution

Результат выполнения скрипта.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `string` | UUID |
| `script_id` | `string` | ID скрипта |
| `user_id` | `string` | ID выполнившего |
| `input` | `Record<string, unknown>` | Входные данные |
| `output` | `Record<string, unknown> \| null` | Результат |
| `error` | `string \| null` | Текст ошибки |
| `status` | `ExecutionStatus` | Статус выполнения |
| `executed_at` | `string` | Дата выполнения |
| `duration_ms` | `number \| null` | Длительность в мс |

### ChatWithMembers

Расширенный тип чата с гарантированно заполненными участниками:
```typescript
interface ChatWithMembers extends Chat {
  members: (ChatMember & { profile: Profile })[];
}
```

---

## 7. Контекст авторизации (AuthContext)

**Файл:** `src/context/AuthContext.tsx`

### AuthProvider

Оборачивает всё приложение. Управляет состоянием аутентификации.

**Состояние:**
| Поле | Тип | Описание |
|------|-----|----------|
| `user` | `User \| null` | Supabase User |
| `session` | `Session \| null` | Supabase Session |
| `profile` | `Profile \| null` | Профиль из таблицы `profiles` |
| `loading` | `boolean` | Идёт ли проверка сессии |

**Методы:**
| Метод | Сигнатура | Описание |
|-------|-----------|----------|
| `signUp` | `(email, password, displayName?) => Promise<{error}>` | Регистрация + создание профиля через триггер |
| `signIn` | `(email, password) => Promise<{error}>` | Вход по email/паролю |
| `signOut` | `() => Promise<void>` | Выход |
| `resetPassword` | `(email) => Promise<{error}>` | Отправка ссылки сброса |
| `updateProfile` | `(displayName) => Promise<{error}>` | Обновление display_name |

**Логика инициализации:**
1. При монтировании вызывает `supabase.auth.getSession()` — восстанавливает сессию
2. Загружает профиль из `profiles` по `user.id`
3. Подписывается на `onAuthStateChange` — реагирует на вход/выход
4. Профиль создаётся автоматически через database trigger при регистрации

### useAuth

Хук для доступа к контексту. Бросает ошибку если вызван вне `AuthProvider`.

---

## 8. Конфигурация Supabase

**Файл:** `src/supabaseClient.ts`

```typescript
const supabaseUrl = "https://xcnrxygiipslzouqqttn.supabase.co";
const supabaseAnonKey = "eyJhbG..."; // публичный anon-ключ
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Используемые таблицы

| Таблица | Назначение |
|---------|-----------|
| `profiles` | Профили пользователей (синхронизируется с auth.users через триггер) |
| `chats` | Чаты (direct/group) |
| `chat_members` | Участники чатов |
| `messages` | Сообщения |
| `message_reactions` | Реакции на сообщения |
| `custom_scripts` | Пользовательские скрипты |

### Используемые сервисы

| Сервис | Использование |
|--------|--------------|
| **Auth** | Регистрация, вход, сессии, сброс пароля |
| **Database** | Все CRUD-операции через `.from().select/insert/update/delete()` |
| **Realtime** | Подписки на `chat_members` (изменения чатов) и `messages` (новые сообщения) и `profiles` (статусы) |
| **Storage** | Bucket `messages-media` для изображений, видео, файлов |
| **Edge Functions** | Функция `execute-script` для выполнения кастомных скриптов |

---

## 9. Зависимости (package.json)

### Основные зависимости

| Пакет | Версия | Назначение |
|-------|--------|-----------|
| `@supabase/supabase-js` | ^2.39.0 | JS-клиент Supabase (Auth, DB, Storage, Realtime, Functions) |
| `react` | ^18.2.0 | UI-фреймворк |
| `react-dom` | ^18.2.0 | Рендеринг в DOM |
| `react-scripts` | 5.0.1 | Сборка CRA (Webpack, Babel, ESLint, Jest) |
| `typescript` | ^4.9.5 | Типизация |
| `web-vitals` | ^2.1.4 | Метрики производительности |

### Dev-зависимости

| Пакет | Версия | Назначение |
|-------|--------|-----------|
| `@types/node` | ^16.18.0 | Типы Node.js |
| `@types/react` | ^18.2.0 | Типы React |
| `@types/react-dom` | ^18.2.0 | Типы ReactDOM |

### Скрипты

```
npm start   → react-scripts start    (dev-сервер)
npm run build → react-scripts build  (продакшен-сборка)
npm test    → react-scripts test     (Jest)
npm run eject → react-scripts eject  (выход из CRA)
```

---

## 10. Архитектура приложения

### Поток данных

```
App (AuthProvider)
  └─ AuthPage (если нет user)
  └─ MessengerPage (если есть user)
       ├─ useChats → загрузка чатов + realtime
       ├─ useMessages → загрузка сообщений + realtime
       ├─ useUsers → поиск пользователей
       ├─ ChatList → рендер списка чатов
       ├─ ChatHeader → заголовок + статус
       ├─ MessageList → сообщения + контекстное меню + реакции
       └─ MessageInput → ввод + загрузка файлов (useMedia)
  └─ SettingsPage (по навигации)
       ├─ Профиль (displayName, username, bio)
       ├─ Безопасность (смена пароля)
       └─ Тема (dark/light → localStorage)
```

### Навигация

Приложение не использует react-router. Навигация управляется через `useState`:
- `user === null` → AuthPage
- `user !== null` → MessengerPage
- `currentPage === "settings"` → SettingsPage (с анимацией slide)

### Realtime-подписки

| Канал | Таблица | Событие | Действие |
|-------|---------|---------|----------|
| `chats-changes` | `chat_members` | `*` (все) | Перезагрузка списка чатов |
| `messages-{chatId}` | `messages` | `INSERT` | Добавление нового сообщения (кроме своих) |
| `user-status-{userId}` | `profiles` | `UPDATE` | Обновление статуса собеседника |
