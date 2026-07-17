# Clutch: AI-Powered Student Productivity Companion

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20--alpine-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Gemini API](https://img.shields.io/badge/Powered%20by-Gemini%20API-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Clutch** is a minimal, blazing-fast, server-side AI-powered productivity companion built specifically for students in a rush. Seamlessly integrating voice permissions and advanced multimodal intelligence through Google's new **Gemini v2 SDK (`@google/genai`)**, Clutch helps students crunch deadlines, synthesize complex topics, and optimize engineering workflows on the fly.

Designed for high-performance localized executions and simple containerized deployment, Clutch shifts your productivity into high gear when you're under the pump.

---

## 🚀 Key Features

- **⚡ Server-Side Gemini API Orchestration:** Secure, server-managed AI sessions built on top of the ultra-modern `@google/genai` (v2.4+) and Legacy `@google/generative-ai` interfaces.
- **🎙️ Native Multimodal Stream Ready:** Configured out-of-the-box with direct microphone permission specifications (`requestFramePermissions: ["microphone"]`) tailored for real-time voice prompts and interactions.
- **🎨 Modern UI with Motion Foundations:** Implements fluid, natural visual transitions using **Framer Motion** combined with custom utility styling engineered via the modern **Tailwind v4 Compiler Pipeline (`@tailwindcss/vite`)**.
- **📦 Production-Grade Containerization:** Completely Dockerized using multi-stage build workflows with a ultra-lightweight `node:20-alpine` footprint, optimized package layer caching, and client static build-serving via Express.
- **⚡ Unified Monorepo Development Environment:** Coordinated front-and-back architecture leveraging Vite 6 for lightning-fast bundling, HMR control overrides, TypeScript optimization (`tsx`), and production bundling using `esbuild`.

---

## 🛠️ Architecture & Tech Stack

Clutch is engineered as a decoupled full-stack React-Express application communicating securely through a server-side proxy layer to preserve API key integrity.

- **Frontend:** React 19, React Router DOM v7, Framer Motion, Lucide Icons
- **Build System:** Vite 6, `@tailwindcss/vite` (Tailwind v4 pipeline), ESBuild, TypeScript (`tsc`)
- **Backend Node Layer:** Express 4.x, CORS, Dotenv, TSX engine runtime execution
- **AI Engine Integrations:** Google Gemini Advanced Developer SDK (`@google/genai` v2.x & `@google/generative-ai`)
- **DevOps/Deployment:** Docker (Alpine deployment standard), Multi-stage build compilation, PWA manifest configurations

---

## 📁 Repository Structure

```text
├── client/                 # React 19 SPA Frontend
│   ├── src/               # Component architectures, application logic, entrypoints
│   │   └── main.tsx       # Core React framework bootstrap
│   ├── index.html         # Application viewport configurations and manifest hooks
│   ├── manifest.json      # Progressive Web App baseline settings
│   └── package.json       # Frontend build specifications & styles
├── server/                 # Express backend layer
│   ├── index.js           # Core application routing, API orchestration, proxy middleware
│   └── package.json       # Server configurations and SDK dependencies
├── server.ts               # Unified localized runner index
├── Dockerfile              # Multi-stage production container setup
├── vite.config.ts          # Compilations, path mapping aliases, and build rules
├── tsconfig.json           # Application-wide strict type checking rules
└── .gitignore              # Dependency and environment filter maps
```

---

## 🔧 Installation & Local Setup

Follow these steps to get your local environment configured for active development:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (Recommended version: `>= 20.x`).

### 1. Clone & Install Dependencies
Clone your repository and run a top-level installation script to bind package manifests:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` or `.env` file within your server/root structure:
```env
GEMINI_API_KEY=your_actual_google_gemini_api_key_here
PORT=3001
NODE_ENV=development
```

### 3. Launch Development Server
Boot both front-end and back-end watch tasks dynamically through Vite and `tsx`:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the companion.

---

## 🐳 Docker Deployment

Clutch is production-optimized with an automated build manifest designed to wrap, compile, and execute with minimum operational overhead.

### Build Image Locally
```bash
docker build -t clutch-productivity-app .
```

### Launch Container
```bash
docker run -d -p 3001:3001 --env GEMINI_API_KEY="your_api_key" clutch-productivity-app
```
Your service will be available immediately at `http://localhost:3001`.

---
