<div align="center">

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--                    TYPING SVG HEADER                           -->
<!-- ═══════════════════════════════════════════════════════════════ -->

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Share+Tech+Mono&size=28&duration=3000&pause=1000&color=00FF88&center=true&vCenter=true&multiline=true&width=900&height=120&lines=◈+ATLAS+CONTROL+◈;Deterministic+Orchestration+Engine;Offline-First+%7C+Six-Tier+%7C+Fully+Observable)](https://git.io/typing-svg)

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--              ANIMATED CYBERPUNK GRADIENT LINE                  -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png" width="100%"/>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--                     VISITOR COUNTER                            -->
<!-- ═══════════════════════════════════════════════════════════════ -->

![Visitor Count](https://profile-counter.glitch.me/atlas-control/count.svg)

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--                  GLOW BADGES (with icons)                      -->
<!-- ═══════════════════════════════════════════════════════════════ -->

![STATUS](https://img.shields.io/badge/STATUS-OPERATIONAL-00ff88?style=for-the-badge&labelColor=0a0a0a&logo=statuspage&logoColor=00ff88)
![RUNTIME](https://img.shields.io/badge/RUNTIME-DOCKER-00ccff?style=for-the-badge&labelColor=0a0a0a&logo=docker&logoColor=00ccff)
![AGENTS](https://img.shields.io/badge/AGENTS-10_ONLINE-ff6600?style=for-the-badge&labelColor=0a0a0a&logo=probot&logoColor=ff6600)
![API](https://img.shields.io/badge/API-PORT_3847-00ff88?style=for-the-badge&labelColor=0a0a0a&logo=express&logoColor=00ff88)
![DASHBOARD](https://img.shields.io/badge/DASHBOARD-PORT_5173-aa00ff?style=for-the-badge&labelColor=0a0a0a&logo=react&logoColor=aa00ff)
![SECURITY](https://img.shields.io/badge/SECURITY-ENFORCED-ff0055?style=for-the-badge&labelColor=0a0a0a&logo=springsecurity&logoColor=ff0055)
![ROUTING](https://img.shields.io/badge/ROUTING_%3C50ms-DETERMINISTIC-ffcc00?style=for-the-badge&labelColor=0a0a0a)
![SQLITE](https://img.shields.io/badge/PERSISTENCE-SQLITE_WAL-00ccff?style=for-the-badge&labelColor=0a0a0a&logo=sqlite&logoColor=00ccff)
![BUILD](https://img.shields.io/badge/BUILD-PASSING-00ff88?style=for-the-badge&labelColor=0a0a0a&logo=githubactions&logoColor=00ff88)
![TYPESCRIPT](https://img.shields.io/badge/TYPESCRIPT-MONOREPO-3178c6?style=for-the-badge&labelColor=0a0a0a&logo=typescript&logoColor=3178c6)

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png" width="100%"/>

</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--              TERMINAL-STYLE LIVE STATUS SECTION                -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<div align="center">

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ◈  ATLAS RUNTIME — LIVE SYSTEM TELEMETRY                       v1.0.0-mvp  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  > boot atlas-runtime                                                        ║
║                                                                              ║
║  [✓] memory vault mounted                                                    ║
║  [✓] orchestration core active                                               ║
║  [✓] agent mesh synchronized          AGENTS ONLINE  :: 10 (A → J)          ║
║  [✓] telemetry initialized            ROUTING        :: <50ms deterministic  ║
║  [✓] cognitive routing online         WORKER POOL    :: concurrency 3        ║
║  [✓] security matrix armed            SECURITY GATE  :: ARMED                ║
║  [✓] deterministic engine primed      VALIDATION     :: ENFORCED             ║
║  [✓] SQLite WAL online                PERSISTENCE    :: data/atlas.db        ║
║  [✓] API listening                    PORT           :: 0.0.0.0:3847         ║
║  [✓] dashboard serving                PORT           :: localhost:5173       ║
║                                                                              ║
║                    ◈  SYSTEM READY — EXECUTION ONLINE  ◈                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

</div>

---

## ◈ REQUIREMENT

**Docker Desktop is the only thing you need to run Atlas Control.**

No Node.js. No npm. No manual installs. Docker handles everything.

Download Docker Desktop → https://www.docker.com/products/docker-desktop/

---

## ◈ RUNNING THE SYSTEM

### Start everything

Open a terminal in the project root folder and run:

```bash
docker compose up --build
```

This builds and starts all services automatically. Wait for the logs to show both services ready, then open:

- **Dashboard (UI):** http://localhost:5173
- **API:** http://localhost:3847

That's it. Atlas Control is running.

---

### Stop everything

**Option A — in the same terminal:**
Press `Ctrl + C`

**Option B — from any terminal:**
```bash
docker compose down
```

**Option C — force-remove all running containers (nuclear stop):**
```cmd
for /f %i in ('docker ps -aq') do docker rm -f %i
```

---

## ◈ WHAT IS ATLAS CONTROL

**Project Atlas Control** is an offline-first, deterministic mode-assignment and workflow-orchestration engine. It intercepts raw developer intent, scores eight execution modes through a weighted cognition engine, decomposes work into parallel agent tasks, validates outputs before merge, enforces security gates, and returns fully observable, traced, synthesized results — all in under 50ms on the routing path.

Every decision is explainable. Every trace is persisted. Every failure is handled.

Built as a TypeScript monorepo with SQLite persistence, an Express REST API on port 3847, and a React trace dashboard on port 5173.

---

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--                     GITHUB STATS                               -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<div align="center">

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png" width="100%"/>

### ◈ PROJECT STATS

<img height="180em" src="https://github-readme-stats.vercel.app/api?username=YOUR_GITHUB_USERNAME&show_icons=true&theme=chartreuse-dark&include_all_commits=true&count_private=true&hide_border=true&bg_color=0a0a0a&title_color=00ff88&icon_color=00ccff&text_color=ffffff"/>
<img height="180em" src="https://github-readme-stats.vercel.app/api/top-langs/?username=YOUR_GITHUB_USERNAME&layout=compact&langs_count=8&theme=chartreuse-dark&hide_border=true&bg_color=0a0a0a&title_color=00ff88&text_color=ffffff"/>

<img src="https://github-readme-streak-stats.herokuapp.com/?user=YOUR_GITHUB_USERNAME&theme=dark&hide_border=true&background=0a0a0a&ring=00ff88&fire=ff6600&currStreakLabel=00ccff&sideLabels=ffffff&currStreakNum=ffffff&sideNums=ffffff&dates=888888"/>

</div>

---

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--              SNAKE CONTRIBUTION ANIMATION                      -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<div align="center">

### ◈ CONTRIBUTION MESH

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_GITHUB_USERNAME/output/github-contribution-grid-snake-dark.svg"/>
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_GITHUB_USERNAME/output/github-contribution-grid-snake.svg"/>
  <img alt="snake animation" src="https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_GITHUB_USERNAME/output/github-contribution-grid-snake-dark.svg"/>
</picture>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png" width="100%"/>

</div>

---

## ◈ PORTS

| Service   | URL                      |
|-----------|--------------------------|
| API       | http://localhost:3847    |
| Dashboard | http://localhost:5173    |

---

## ◈ API — QUICK REFERENCE

**Base:** `http://localhost:3847`

| Method | Endpoint           | Description                       |
|--------|--------------------|-----------------------------------|
| GET    | `/api/health`      | Health check                      |
| GET    | `/api/modes`       | Full mode registry                |
| POST   | `/api/orchestrate` | Run full six-tier pipeline        |
| GET    | `/api/history`     | List persisted orchestration runs |
| GET    | `/api/history/:id` | Full request + all trace rows     |

**POST /api/orchestrate — Request Body:**

```json
{
  "prompt": "string (required)",
  "manualOverride": "build",
  "sessionId": "optional"
}
```

**cURL example (Windows):**

```cmd
curl -s -X POST http://localhost:3847/api/orchestrate ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Debug failing unit tests in payment module\"}"
```

---

## ◈ EIGHT EXECUTION MODES

| MODE        | TRIGGER SIGNATURE              |
|-------------|-------------------------------|
| individual  | Short queries, low depth       |
| multi_agent | Parallel / workflow_depth high |
| research    | Compare, evaluate, survey      |
| build       | Implement, create, ship        |
| review      | PR, audit, code review         |
| debug       | Error sigs, stack traces       |
| creative    | Brainstorm, design, draft      |
| safety      | Risk detected — forced         |

---

## ◈ TROUBLESHOOTING

**Containers won't start** — Make sure Docker Desktop is open and running before running `docker compose up --build`.

**Port already in use** — Something else is using port 3847 or 5173. Stop that process or change the ports in `docker-compose.yml`.

**Want a clean rebuild** — Run `docker compose down` first, then `docker compose up --build` again.

**Force-stop all containers:**
```cmd
for /f %i in ('docker ps -aq') do docker rm -f %i
```

---

<div align="center">

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png" width="100%"/>

*Offline-first. Deterministic. Fully observable. Every decision traced.*

![Footer Wave](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,5,30&height=100&section=footer&animation=fadeIn)

</div>
