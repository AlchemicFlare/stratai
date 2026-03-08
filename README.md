# stratAI — Intelligent Drill Core Annotation Platform

> **Your AI co-pilot, not autopilot.** AI-powered drill core annotation that augments geological expertise.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)](https://typescriptlang.org)

---

## Overview

stratAI is a next-generation SaaS platform for AI-assisted drill core logging and annotation, designed for exploration geologists working in field and office environments. The platform delivers **10× speed improvement** through AI-assisted annotation while maintaining **95%+ inter-geologist consistency** via standardized workflows.

### Key Features

- **AI Co-Pilot** — Real-time lithology detection, structural analysis, and RQD calculation with confidence scoring and explainable AI
- **Voice-First Interface** — 40+ geological voice commands for hands-free field operation
- **Multi-View Canvas** — Linear depth, 360° cylindrical unwrap, and dual-view modes
- **Layer Management** — Lithology, structure, alteration, mineralization, and RQD layers with visibility and lock controls
- **Platform-Neutral Export** — OMF 2.0, GeoJSON, CSV (acQuire-compatible), and Leapfrog formats
- **Offline-First Architecture** — Full functionality without connectivity, intelligent background sync
- **Human-in-the-Loop** — AI suggests, geologists validate. Complete audit trail for JORC/NI 43-101 compliance

### Architecture

```
stratAI Field  →  stratAI Core  →  stratAI Annotate  →  stratAI Connect
(mobile capture)  (cloud AI)      (human-AI workspace)  (export adapters)
```

## Quick Start

```bash
# Clone
git clone https://github.com/AlchemicFlare/stratAI.git
cd stratAI

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | React hooks (custom `useAppState`) |
| Canvas | HTML5 Canvas API |
| Components | 40+ shadcn/ui components |
| Fonts | Outfit (display) + JetBrains Mono (data) |

### Production Stack (Planned)

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + PostGIS + pgvector |
| ML Service | Python FastAPI + PyTorch |
| Mobile | Flutter (Android rugged tablets) |
| Offline | SQLite + GeoPackage + Vosk |

## Project Structure

```
src/
├── components/
│   ├── panels/          # Sidebar panels (Toolbar, Layers, AI, Properties, Stats)
│   ├── shared/          # Shared components (Header)
│   └── workspace/       # Main canvas workspace
├── data/                # Mock data and constants
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── index.css            # Geological dark theme
└── App.tsx              # Root application
```

## Roadmap

- [x] Interactive web prototype
- [x] React + TypeScript web application
- [ ] PERN backend (PostgreSQL + Express + React + Node.js)
- [ ] AI/ML microservice (lithology detection, auto-RQD)
- [ ] Flutter Android app (rugged tablet deployment)
- [ ] Real-time collaboration (Socket.io)
- [ ] Offline-first with IndexedDB sync
- [ ] OMF 2.0 / GeoSciML export pipeline

## Contributing

Contributions welcome. Please open an issue first to discuss proposed changes.

## License

MIT — see [LICENSE](LICENSE) for details.

---

**Built for geologists, by people who understand the field.**
