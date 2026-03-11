# Pathfinding Visualizer — Java Spring Boot + React

**Stack:** Java 21 / Spring Boot 3 backend on **Render** · React + Vite frontend on **Vercel**

---

## Project Structure

```
pathfinding-visualizer/
├── backend/                          ← Java 21 + Spring Boot  →  Render
│   ├── pom.xml
│   ├── render-build.sh
│   └── src/main/java/com/pathfinder/
│       ├── PathfinderApplication.java
│       ├── controller/PathfinderController.java
│       ├── service/
│       │   ├── PathfindingService.java     ← 6 algorithms
│       │   ├── MapGeneratorService.java    ← Maze + traffic maps
│       │   └── AiAnalysisService.java      ← Claude API
│       ├── model/
│       │   ├── CellType.java
│       │   ├── Node.java
│       │   └── Dtos.java
│       └── config/WebConfig.java
│
├── frontend/                         ← React + Vite           →  Vercel
│   ├── vercel.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── hooks/useGrid.js
│       └── utils/
│           ├── api.js
│           └── constants.js
│
├── render.yaml                       ← Render blueprint (backend only)
└── README.md
```

---

## Deploy — Step by Step

### STEP 1 — Push to GitHub

```bash
cd pathfinding-visualizer
git init
git add .
git commit -m "feat: full-stack pathfinding visualizer (Java + React)"
git remote add origin https://github.com/YOUR_USERNAME/path-visualiser.git
git push -u origin main --force
```

---

### STEP 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates `pathfinder-api` automatically
4. Once created → **Environment** tab → add:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxxxxx` |
| `CORS_ALLOWED_ORIGINS` | `https://your-project.vercel.app` |

5. **Manual Deploy → Deploy latest commit**
6. Copy your backend URL e.g. `https://pathfinder-api.onrender.com`

Test: `curl https://pathfinder-api.onrender.com/api/health`

---

### STEP 3 — Update Frontend on Vercel (existing URL)

1. Open your existing Vercel project
2. **Settings → General → Root Directory** → set to `frontend`
3. **Settings → Environment Variables** → add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://pathfinder-api.onrender.com` |

4. **Deployments → Redeploy**

Your existing Vercel URL now points to the new full-stack app.

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend && mvn spring-boot:run

# Terminal 2 — Frontend
cd frontend
cp .env.example .env.local
npm install && npm run dev
```

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/health` | Health check |
| POST | `/api/path` | Run single algorithm |
| POST | `/api/path/compare` | Compare all 6 algorithms |
| POST | `/api/ai/analyze` | Claude AI route analysis |
| POST | `/api/map/traffic` | Generate traffic map |
| POST | `/api/map/maze` | Generate maze |

---

## Resume Description

> Built a full-stack pathfinding visualizer with a **Java 21 / Spring Boot 3** REST API implementing 6 graph algorithms (A*, Dijkstra, BFS, DFS, Greedy, Bidirectional BFS), weighted terrain, 3 maze generators, live traffic simulation with time vs. distance routing modes, and Claude AI-powered route analysis. Deployed across **Render** (Java backend) and **Vercel** (React frontend).
