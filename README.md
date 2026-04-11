# 🎯 InterviewAI — Full-Stack AI Mock Interview Coach

A full-stack web application powered by **Google Gemini AI**, **React**, **Node/Express**, **MySQL**, and **JWT authentication** to help engineers practice technical and behavioral interviews with real-time AI feedback.

---

## 🗂️ Project Structure

```
interview-coach/
├── server/                  # Express + Node.js backend
│   ├── index.js             # Server entry point
│   ├── db.js                # MySQL pool + table init
│   ├── middleware/
│   │   └── auth.js          # JWT middleware + token generation
│   ├── routes/
│   │   ├── auth.js          # /api/auth — register, login, me
│   │   ├── interviews.js    # /api/interviews — CRUD + AI evaluation
│   │   └── stats.js         # /api/stats — dashboard data
│   ├── services/
│   │   └── gemini.js        # Gemini AI: questions, feedback, summary
│   └── .env.example         # Environment variables template
│
└── client/                  # React + Vite + Tailwind frontend
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.jsx         # Public landing page
    │   │   ├── Login.jsx           # JWT login
    │   │   ├── Register.jsx        # Registration
    │   │   ├── Dashboard.jsx       # Stats + recent sessions
    │   │   ├── NewInterview.jsx    # 4-step interview setup
    │   │   ├── InterviewSession.jsx# Live Q&A with AI feedback
    │   │   ├── SessionResult.jsx   # Results + AI summary
    │   │   └── History.jsx         # Session history
    │   ├── components/
    │   │   └── Layout.jsx          # Sidebar navigation
    │   ├── context/
    │   │   └── AuthContext.jsx     # Auth state + JWT storage
    │   └── utils/
    │       └── api.js              # Axios instance with JWT interceptor
    └── ...config files
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+
- **MySQL** 8.0+
- **Google Gemini API key** — [Get one here](https://aistudio.google.com/app/apikey)

---

### 2. Database Setup

```sql
CREATE DATABASE interview_coach CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'interview_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON interview_coach.* TO 'interview_user'@'localhost';
FLUSH PRIVILEGES;
```

Tables are **auto-created** on server start via `db.js → initDB()`.

---

### 3. Backend Setup

```bash
cd server

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

**`.env` configuration:**
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=interview_coach

JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

GEMINI_API_KEY=your_gemini_api_key_here

CLIENT_URL=http://localhost:5173
```

---

### 4. Frontend Setup

```bash
cd client

# Install dependencies (if not already done)
npm install

# Start dev server
npm run dev
```

App will be available at **http://localhost:5173**

---

## 🔌 API Reference

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (protected) |
| PUT | `/api/auth/profile` | Update profile (protected) |

### Interviews
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/interviews` | Create session + generate questions |
| GET | `/api/interviews` | List user's sessions |
| GET | `/api/interviews/:id` | Get session with all Q&A |
| POST | `/api/interviews/:id/answer` | Submit + evaluate answer |
| POST | `/api/interviews/:id/complete` | Complete + generate summary |
| POST | `/api/interviews/:id/hint` | Get AI hint for question |
| DELETE | `/api/interviews/:id` | Delete session |

### Stats
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/stats/dashboard` | Dashboard data + score history |

---

## 🤖 AI Features (Gemini 1.5 Flash)

1. **Question Generation** — Role/level/type specific questions (3–10)
2. **Answer Evaluation** — Score (0–100), feedback, strengths, improvements, ideal answer
3. **Hint System** — Contextual hints without giving away the answer
4. **Session Summary** — Overall assessment, readiness level, next steps

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts with bcrypt passwords |
| `interview_sessions` | Session metadata, status, scores |
| `interview_qa` | Questions, answers, AI feedback per session |
| `user_stats` | Aggregate stats: avg score, streak, time |

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| Routing | React Router v6 |
| HTTP Client | Axios (JWT interceptor) |
| Animations | Framer Motion |
| Backend | Node.js, Express 4 |
| Database | MySQL 8 + mysql2 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| AI | Google Gemini 1.5 Flash |
| Security | Helmet, express-rate-limit, CORS |

---

## 🔒 Security Features

- **bcrypt** password hashing (salt rounds: 12)
- **JWT** tokens with 7-day expiration
- **Rate limiting** — 100 req/15min global, 10 req/min for AI endpoints
- **Helmet** security headers
- **CORS** restricted to client origin

---

## 📝 Environment Variables Quick Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | ✅ | MySQL host |
| `DB_USER` | ✅ | MySQL username |
| `DB_PASSWORD` | ✅ | MySQL password |
| `DB_NAME` | ✅ | Database name |
| `JWT_SECRET` | ✅ | Secret key (32+ chars) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `CLIENT_URL` | ✅ | Frontend URL for CORS |
| `PORT` | ❌ | Server port (default: 5000) |

---

## 💡 Usage Flow

1. **Register/Login** → JWT stored in localStorage
2. **New Interview** → Select role, level, type, question count
3. **Gemini generates** tailored questions
4. **Answer questions** → Gemini evaluates each in real-time
5. **Complete interview** → Get AI summary + readiness score
6. **Dashboard** tracks progress over time

---

*Built with ❤️ using React, Express, MySQL, JWT & Google Gemini*
