# CivicLens — Complete Project Reference

> This document is the authoritative reference for LLMs and developers who need full project context without access to the source code.

---

## Table of Contents

1. [Project Description](#1-project-description)
2. [Problem Statement](#2-problem-statement)
3. [Domain & Scope](#3-domain--scope)
4. [Target Users](#4-target-users)
5. [Architecture Overview](#5-architecture-overview)
6. [Tech Stack](#6-tech-stack)
7. [Administrative Hierarchy](#7-administrative-hierarchy)
8. [Role System](#8-role-system)
9. [Data Models](#9-data-models)
10. [Complaint Lifecycle](#10-complaint-lifecycle)
11. [Features — Citizen](#11-features--citizen)
12. [Features — Administrative](#12-features--administrative)
13. [AI & ML Components](#13-ai--ml-components)
14. [WhatsApp Bot](#14-whatsapp-bot)
15. [Blockchain Transparency](#15-blockchain-transparency)
16. [API Reference Summary](#16-api-reference-summary)
17. [Frontend Pages & Routing](#17-frontend-pages--routing)
18. [Security Model](#18-security-model)
19. [Deployment](#19-deployment)
20. [Known Issues & Limitations](#20-known-issues--limitations)
21. [Environment Variables](#21-environment-variables)

---

## 1. Project Description

**CivicLens** is a geo-based civic grievance management platform built for Karachi, Pakistan. It enables citizens to report civic issues (roads, water, garbage, electricity) through multiple channels — web app, WhatsApp bot, and voice — and routes complaints automatically to the correct Union Council (UC) authority using GPS geo-fencing.

The system includes AI-powered complaint classification, duplicate detection, severity scoring, role-based administrative dashboards, heatmap visualization, and an optional blockchain audit trail for transparency.

- **Live Backend**: `https://civiclensbackend.abdulrahmanazam.me`
- **Live Frontend**: `https://civiclensfast.vercel.app/`
- **WhatsApp Bot**: `+92 318 3610230`
- **Context**: Built as a hackathon project (24-hour build), scored 84.25/100.

---

## 2. Problem Statement

Civic complaint management in Pakistan suffers from:
- No unified channel for citizens to report issues
- Complaints get lost with no tracking or accountability
- No automatic routing to responsible authorities
- Zero transparency on resolution status
- Accessibility barriers (not everyone uses web apps)

CivicLens addresses all five gaps with multi-channel submission, geo-based automatic routing, status tracking, role-based access, and blockchain transparency.

---

## 3. Domain & Scope

| Dimension | Detail |
|-----------|--------|
| **Domain** | GovTech / Civic Tech / Smart Cities |
| **Geography** | Karachi, Pakistan (seeded with real UC boundaries) |
| **Languages** | English, Urdu (voice), Hindi (voice) |
| **Complaint Categories** | Roads, Water, Garbage, Electricity, Others |
| **Scale Target** | City-wide deployment across City → Town → UC hierarchy |

---

## 4. Target Users

| User Type | Access Method | Role in System |
|-----------|--------------|----------------|
| **Citizen** | Web app, WhatsApp, Voice | Submit & track complaints |
| **UC Chairman** | Web dashboard | Manage complaints in their Union Council |
| **Town Chairman** | Web dashboard | Oversee all UCs in their town |
| **Mayor** | Web dashboard | City-wide analytics, reassign complaints |
| **Website Admin** | Web dashboard | Full system access, invite officials |
| **NGOs** (planned) | Web app | View complaints in their area |

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTS                              │
│  Web (React SPA)  │  WhatsApp Bot  │  Voice/Audio       │
└────────┬──────────┴───────┬────────┴──────────┬─────────┘
         │                  │                   │
         ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express v5)              │
│                                                          │
│  REST API (v1)              WhatsApp Bot Process         │
│  ├── Auth (JWT)             ├── Baileys (WA Web API)     │
│  ├── Complaints             ├── RAG Knowledge Base       │
│  ├── Categories             └── Session Management       │
│  ├── Analytics                                           │
│  ├── Hierarchy (UC/Town/City)   AI Services              │
│  ├── Voice (Whisper)            ├── GROQ Classification  │
│  ├── Chatbot (GROQ + RAG)       ├── Duplicate Detection  │
│  └── Invitation System          └── Severity Scoring     │
└────────┬──────────────────────────────────┬─────────────┘
         │                                  │
         ▼                                  ▼
┌────────────────┐              ┌───────────────────────┐
│   MongoDB       │              │   External Services    │
│  (Mongoose ODM) │              │  Cloudinary (images)   │
│  GeoJSON indexes│              │  GROQ API (AI/LLM)    │
│  2dsphere index │              │  Nodemailer (email)    │
└────────────────┘              │  Ethereum Sepolia      │
                                │  (blockchain)          │
                                └───────────────────────┘
```

### Key Architectural Decisions

- **Monolith backend** — single Express app with modular routes/controllers/services
- **GeoJSON geo-fencing** — UC boundaries stored as GeoJSON Polygons; `$geoIntersects` query auto-assigns complaints to UCs
- **Fallback chain** — GROQ AI → local TF-IDF → keyword rules → default category
- **Immutable complaint fields** — `citizenInfo` and `location.coordinates` locked after creation via Mongoose pre-update hooks
- **Separate WhatsApp process** — `npm run whatsapp` runs the Baileys bot as a separate Node process

---

## 6. Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v18+ |
| Framework | Express.js v5 |
| Database | MongoDB with Mongoose ODM |
| Authentication | JWT + refresh tokens |
| OTP / Verification | Email-based via Nodemailer |
| Image Storage | Cloudinary |
| AI Classification | GROQ SDK (`groq-sdk`) with LRU cache |
| Local NLP Fallback | `natural` (TF-IDF + Porter Stemmer) |
| WhatsApp | `@whiskeysockets/baileys` (WhatsApp Web API) |
| Speech Recognition | Whisper.cpp (offline, currently in simulation mode) |
| Audio Conversion | FFmpeg (`fluent-ffmpeg`, `ffmpeg-static`) |
| Email | Nodemailer + Brevo SMTP |
| Security | Helmet.js, bcryptjs, AES-256-GCM (NIC encryption) |
| Validation | express-validator |
| File Upload | Multer |
| Logging | Pino + Morgan |
| Cron | node-cron (SLA monitoring, escalations) |
| Blockchain | Ethers.js v6 |

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Routing | React Router v7 |
| State Management | Zustand v5 |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet + React Leaflet + Leaflet.heat |
| Marker Clustering | react-leaflet-cluster |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Blockchain | Ethers.js v6 |

### Blockchain (Optional)

| Layer | Technology |
|-------|-----------|
| Framework | Hardhat |
| Language | Solidity |
| Library | Ethers.js v6 |
| Network | Sepolia Testnet (Ethereum) |
| Contract | `ComplaintTracker.sol` |

---

## 7. Administrative Hierarchy

CivicLens models Karachi's real governance structure:

```
City (Karachi)
└── Town (e.g., Saddar Town, Gulshan Town)
    └── UC / Union Council (e.g., UC-1, UC-2 ... UC-N)
        └── Complaints (geo-fenced to UC)
```

### Database Models

| Model | Key Fields |
|-------|-----------|
| `City` | `name`, `code`, `mayor` (ref User), `boundary` (GeoJSON Polygon) |
| `Town` | `name`, `code`, `city` (ref City), `chairman` (ref User), `boundary` |
| `UC` | `name`, `code`, `ucNumber`, `town` (ref Town), `city` (ref City), `chairman` (ref User), `center` (Point), `boundary` (Polygon), `stats` |

### UC Geo-Assignment Logic

When a complaint is submitted with GPS coordinates:

1. **Geo-fence match** — `$geoIntersects` query checks which UC polygon contains the point → `confidence: exact`
2. **Nearest fallback** — `$near` query finds closest UC center within 10km → `confidence: high/medium/low` based on distance
3. **Manual** — Admin/Mayor can reassign complaint to a different UC

---

## 8. Role System

| Role | `role` value | Manages | Can Do |
|------|-------------|---------|--------|
| Citizen | `citizen` | Own complaints | Submit, track, provide feedback |
| UC Chairman | `uc_chairman` | One UC | Acknowledge, update status, resolve |
| Town Chairman | `town_chairman` | One Town (all UCs) | View all UC complaints, escalate |
| Mayor | `mayor` | One City (all Towns) | City analytics, reassign complaints to different UCs |
| Website Admin | `website_admin` | Entire system | Full CRUD, invite officials, manage categories |

### Invitation System

Officials (UC Chairman, Town Chairman, Mayor) are **not** self-registered. They receive email invitations from higher-authority users:

- Admin invites Mayor
- Mayor invites Town Chairmen
- Town Chairman invites UC Chairmen

Invitations include a token link. On acceptance, the invitee sets their NIC (encrypted AES-256-GCM) and password.

### NIC Encryption

National Identity Card numbers for officials are stored encrypted using **AES-256-GCM**:
- Full NIC stored as `nic.encrypted` (ciphertext, never returned in API responses)
- Last 4 digits stored as `nic.lastFour` for display
- `maskNIC()` utility masks the number as `*****-*******-X`

---

## 9. Data Models

### User

```
name, email, phone, password (bcrypt), role
nic: { encrypted (AES-256-GCM), lastFour }
ucId / townId / cityId (based on role)
invitedBy, invitationId
isActive, isVerified, verificationToken
passwordResetToken, refreshToken
loginAttempts, lockUntil (lockout after 5 failures, 2hr lock)
stats: { totalComplaints, resolvedComplaints, avgFeedbackRating }
managerStats: { complaintsHandled, avgResolutionTime, slaComplianceRate }
notifications: { email, sms, push, whatsapp }
avatar: { url, publicId }
```

### Complaint

```
complaintId: "CL-YYYYMMDD-NNNNN" (auto-generated, unique)
citizenInfo: { userId, name, phone, email }  ← IMMUTABLE after creation
description (max 2000 chars)
category:
  primary: Roads | Water | Garbage | Electricity | Others
  confidence: 0-1
  subcategory, urgency: low|medium|high|critical
  keywords[], classificationSource: groq|local|manual|default
  needsReview: boolean
location:
  type: "Point", coordinates: [lng, lat]  ← IMMUTABLE after creation
  address, area, uc, pincode
images[]: { url (Cloudinary), publicId, uploadedAt } — max 5
source: web | mobile | whatsapp | voice
citizenUser (ref User, optional — for logged-in citizens)
ucId, townId, cityId (auto-detected from coordinates)
ucAssignment: { method, confidence, distance, assignedAt, previousUCId }
assignedTo (ref User)
status:
  current: submitted|acknowledged|in_progress|resolved|closed|citizen_feedback|rejected
  history[]: { status, timestamp, updatedBy, updatedByRole, remarks }
severity:
  score: 0-100, priority: low|medium|high|critical
  factors: { frequency, duration, categoryUrgency, areaImpact, citizenUrgency }
slaDeadline, slaHours (default 48), slaBreach
citizenFeedback: { rating 1-5, comment, satisfactionLevel, feedbackAt }
resolution: { resolvedBy, resolvedAt, remarks }
duplicateOf (ref Complaint), linkedComplaints[]
metadata: { ipAddress, userAgent, voiceTranscript, aiProcessing }
```

### Complaint Indexes

- `location` — 2dsphere (geospatial)
- `category.primary` — category filtering
- `status.current` — status filtering
- `createdAt DESC` — recency sorting
- `ucId + status.current` — UC dashboard queries
- `townId + status.current`, `cityId + status.current` — hierarchy queries
- Full-text index on `description + location.address`

---

## 10. Complaint Lifecycle

```
submitted ──► acknowledged ──► in_progress ──► resolved ──► closed ──► citizen_feedback
    │               │               │
    └───────────────┴───────────────┴──► rejected
```

| Transition | Who Triggers |
|-----------|-------------|
| `submitted → acknowledged` | UC Chairman |
| `acknowledged → in_progress` | UC Chairman |
| `in_progress → resolved` | UC Chairman |
| `resolved → closed` | UC Chairman |
| `closed → citizen_feedback` | Citizen (provides rating 1-5) |
| Any → `rejected` | UC Chairman |

- **Terminal states**: `citizen_feedback`, `rejected` — no further transitions
- `citizenInfo` and `location.coordinates` are **immutable** — Mongoose pre-update middleware blocks modification
- Status history is append-only with full audit trail (who, when, role, remarks)

---

## 11. Features — Citizen

### Complaint Submission

- **Web form** — description, GPS location (auto or map pin), up to 5 images, optional name/email
- **WhatsApp bot** — conversational flow, supports text, photos, voice notes, location pin
- **Voice complaint** — record audio → auto-transcribed by Whisper.cpp → complaint created
- **Complaint ID** — format `CL-YYYYMMDD-NNNNN` returned immediately on submission

### Tracking

- View all own complaints with current status
- Full status history with timestamps and remarks
- Real-time status updates via notification (email/WhatsApp)

### Feedback

- After complaint reaches `closed`, citizen can submit rating (1-5) and comment
- Moves status to `citizen_feedback` (terminal)

### Chatbot

- Floating chat widget on website powered by GROQ AI
- Answers questions about complaint process, Karachi administration, categories
- Quick-action buttons for common queries

---

## 12. Features — Administrative

### UC Chairman Dashboard

- View all complaints in their UC, filtered by status/category
- Update complaint status with remarks
- View UC statistics (total, pending, in-progress, resolved, SLA compliance, avg feedback)
- Assign complaints to officers (model exists; UI partial)

### Town Chairman Dashboard

- Aggregate view across all UCs in their town
- Monitor resolution rates and SLA compliance per UC
- Escalation visibility

### Mayor Dashboard

- City-wide analytics: complaint density, category breakdown, resolution rates
- Reassign complaints from one UC to another (manual override)
- Heatmap visualization of entire city

### Admin Dashboard

- Full CRUD on all entities
- Invite officials (generate email invitation tokens)
- Manage complaint categories (name, SLA hours, department, icon, color)
- Manage territories (UC boundaries)
- Manage users (activate/deactivate)

### Analytics & Heatmap

- **Global heatmap** — complaint density across Karachi, weighted by severity
  - Intensity = `(count × avgSeverity / 10)`
  - Color gradient: green → orange → red
- **Profile heatmap** — resolved complaints by a specific organization, shows impact area
  - Intensity = `(count / 5)`, shows avg resolution time
- Category and date-range filters on both heatmaps
- Statistics: by category, by status, by area, avg resolution time, feedback ratings

---

## 13. AI & ML Components

### Classification Service (`classificationService.js`)

**Pipeline** (in order of priority):

1. **LRU Cache check** — 500-entry cache, 1-hour TTL. Cache key = normalized text.
2. **GROQ AI** — calls `llama3-8b-8192` model via GROQ API (free tier). Returns: `primary`, `subcategory`, `urgency`, `keywords[]`, `confidence`.
3. **Local TF-IDF fallback** — `natural` library with `PorterStemmer`. Builds TF-IDF from keyword corpus.
4. **Rule-based keyword matching** — weighted keyword lists per category.
5. **Default** — assigns `Others` with `confidence: 0`.

**Categories with keywords:**
- `Roads`: road, pothole, street, traffic, signal, bridge, footpath…
- `Water`: water, pipe, leak, sewage, drain, flood, supply…
- `Garbage`: garbage, trash, waste, dump, smell, litter…
- `Electricity`: power, electricity, outage, transformer, wire, pole…
- `Others`: noise, pollution, encroachment, illegal, parking, stray…

### Duplicate Detection (`duplicateService.js`)

- Checks for similar complaints within **500m radius** of new complaint
- Time window: **7 days**
- Similarity check on description text
- If duplicate found: links complaints via `duplicateOf` field

### Severity Scoring (`severityService.js`)

Calculates score 0–100, maps to priority:

| Score | Priority |
|-------|---------|
| 0–25 | low |
| 26–50 | medium |
| 51–75 | high |
| 76–100 | critical |

Factors:
- `frequency` — how many similar complaints in area
- `duration` — age of the issue
- `categoryUrgency` — base urgency per category
- `areaImpact` — population density of UC
- `citizenUrgency` — urgency keywords in description

### RAG Chatbot (`ragService.js`, `chatbotService.js`)

- Knowledge base: `backend/src/data/knowledgeBase.json` — facts about Karachi administration, local helplines (KMC, K-Electric, KWSB), complaint process
- RAG: retrieves relevant knowledge base chunks, injects into GROQ prompt
- Used by: website chatbot widget AND WhatsApp bot responses
- WhatsApp bot adds conversational session management

### Speech Recognition (`speechService.js`, `ttsService.js`)

- Whisper.cpp (offline) for speech-to-text — **currently in simulation mode** (Whisper not configured in deployment)
- Supports: English, Hindi, Urdu, auto-detect
- Audio conversion via FFmpeg: WebM/OGG/MP3 → WAV
- Max audio: 10MB, 30 seconds
- TTS (text-to-speech) for WhatsApp voice responses

---

## 14. WhatsApp Bot

**Library**: `@whiskeysockets/baileys` (WhatsApp Web API — scans QR code)
**Run**: `npm run whatsapp` (separate process from main API)
**Auth**: Stored in `whatsapp-auth/` directory (session persistence)

### Conversation Flow

```
User: "Hi"
Bot: "Welcome to CivicLens! I can help you report civic issues.
      Please describe your complaint:"

User: [describes issue]
Bot: AI classifies → "Category detected: Roads (Pothole)
      Please share your location:"

User: [shares location or sends web link]
Bot: "Got it! Optionally send photos (up to 5):"

User: [sends photos or "skip"]
Bot: "Complaint registered! Your ID is CL-YYYYMMDD-NNNNN"
```

### Capabilities

- Text complaint submission
- Voice note transcription (Whisper.cpp)
- Image upload (forwarded to Cloudinary)
- Location sharing (GPS via WhatsApp) or web link (generates shareable URL)
- Status check: user replies with complaint ID to get current status
- RAG-based answers to questions about the system
- Session management via `WhatsAppSession` model

### Models

- `WhatsAppUser` — tracks WhatsApp users (phone → registered citizen mapping)
- `WhatsAppSession` — tracks multi-turn conversation state per user

---

## 15. Blockchain Transparency

**Status**: Implemented but not deployed in production (requires Sepolia contract address).

### Smart Contract: `ComplaintTracker.sol`

- Network: Ethereum Sepolia Testnet
- Framework: Hardhat
- Functions:
  - `registerComplaint(complaintId, category, details)` — records new complaint on-chain
  - `updateStatus(complaintId, newStatus)` — appends status change
  - `getComplaint(complaintId)` — read complaint data
  - `getComplaintHistory(complaintId)` — full status history

### Status Enum (On-Chain)

| Value | Meaning |
|-------|---------|
| 0 | Pending |
| 1 | Under Review |
| 2 | In Progress |
| 3 | Resolved |
| 4 | Rejected |
| 5 | Closed |

### Frontend Components

- `BlockchainStatus.jsx` — shows verification badge on complaint
- `TransactionHistory.jsx` — modal with Etherscan links
- `TransparencyDashboard.jsx` (`/transparency` route) — **public**, no login required, shows all on-chain records

### Privacy

Only hashed complaint details stored on-chain — no personally identifiable information.

---

## 16. API Reference Summary

**Base URL**: `https://civiclensbackend.abdulrahmanazam.me/api/v1` (production)  
**Local**: `http://localhost:3000/api/v1`

### Standard Response Format

```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": false, "message": "...", "errors": [ { "field": "...", "message": "..." } ] }
```

### Complaint ID Format

`CL-YYYYMMDD-NNNNN` — e.g., `CL-20260127-00001`

### Coordinate Convention

GeoJSON order: `[longitude, latitude]` (NOT lat/lng)

### Key Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Health check |
| `POST` | `/complaints` | None | Submit complaint (multipart/form-data) |
| `GET` | `/complaints` | None* | List complaints (paginated, filterable) |
| `GET` | `/complaints/:id` | None | Get single complaint |
| `PATCH` | `/complaints/:id/status` | Auth | Update complaint status |
| `GET` | `/complaints/stats` | None | Aggregate statistics |
| `GET` | `/complaints/heatmap` | None | Clustered heatmap data |
| `GET` | `/complaints/heatmap/global` | None | Global severity-weighted heatmap |
| `GET` | `/complaints/heatmap/profile/:entityId` | None | Org-specific resolved heatmap |
| `GET` | `/categories` | None | List all categories |
| `POST` | `/categories/classify` | None | AI-classify text |
| `GET` | `/categories/stats` | None | Category statistics |
| `POST` | `/voice/transcribe` | None | Transcribe audio to text |
| `POST` | `/voice/complaint` | None | Submit voice complaint |
| `GET` | `/voice/status` | None | STT service status |
| `POST` | `/auth/register` | None | Register citizen |
| `POST` | `/auth/login` | None | Login (returns JWT) |
| `POST` | `/auth/refresh` | None | Refresh JWT |
| `GET` | `/hierarchy/cities` | Auth | List cities |
| `GET` | `/hierarchy/towns/:cityId` | Auth | List towns in city |
| `GET` | `/hierarchy/ucs/:townId` | Auth | List UCs in town |
| `POST` | `/chatbot/message` | None | Send message to AI chatbot |
| `GET` | `/territories` | None | UC boundary GeoJSON |
| `POST` | `/invitation` | Auth (Admin+) | Create invitation for official |
| `GET` | `/analytics/dashboard` | Auth | Role-filtered analytics |

*\* Currently no auth required on GET /complaints — known security issue*

### Complaint Query Params (GET /complaints)

| Param | Description |
|-------|-------------|
| `page`, `limit` | Pagination (limit max 100) |
| `category` | Filter by category |
| `status` | Filter by status |
| `area` | Filter by area string |
| `severity_min`, `severity_max` | Severity score range |
| `date_from`, `date_to` | ISO date range |
| `lat`, `lng`, `radius` | Geo-search (radius in meters, 100–50000) |
| `sort_by` | `createdAt` \| `severity` \| `status` |
| `sort_order` | `asc` \| `desc` |

---

## 17. Frontend Pages & Routing

### Public Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `LandingPage` | Hero, features, how-it-works, CTA |
| `/about` | `AboutPage` | Project info |
| `/contact` | `ContactPage` | Contact form |
| `/map` | `MapPage` | Public complaint map (Leaflet) |
| `/transparency` | `TransparencyDashboard` | Blockchain audit trail |
| `/privacy` | `PrivacyPolicyPage` | Privacy policy |
| `/terms` | `TermsOfServicePage` | Terms of service |
| `/share-location` | `ShareLocation` | WhatsApp location sharing helper |

### Auth Routes

| Path | Component |
|------|-----------|
| `/auth/citizen/login` | `CitizenLogin` |
| `/auth/citizen/register` | `CitizenRegister` |
| `/auth/official/login` | `OfficialLogin` |
| `/auth/admin/login` | `AdminLogin` |

### Protected Routes (Citizen)

| Path | Component |
|------|-----------|
| `/citizen/dashboard` | `CitizenDashboard` |
| `/citizen/report` | `ReportIssuePage` |
| `/citizen/complaints` | `MyComplaintsPage` |
| `/citizen/complaints/:id` | `ComplaintDetailPage` |
| `/citizen/notifications` | `NotificationsPage` |
| `/citizen/profile` | `ProfilePage` |
| `/citizen/settings` | `SettingsPage` |

### Protected Routes (Officials)

| Path | Component | Role |
|------|-----------|------|
| `/official/dashboard` | `OfficialDashboard` | UC Chairman |
| `/official/complaints` | `ManageComplaintsPage` | UC Chairman |
| `/official/territory` | `TerritoryPage` | UC Chairman |
| `/township/dashboard` | `TownshipDashboard` | Town Chairman |
| `/mayor/dashboard` | `MayorDashboard` | Mayor |
| `/uc/dashboard` | `UCChairmanDashboard` | UC Chairman |
| `/admin/dashboard` | `AdminDashboard` | Website Admin |
| `/admin/users` | `ManageUsersPage` | Website Admin |
| `/admin/categories` | `ManageCategoriesPage` | Website Admin |
| `/admin/territories` | `ManageTerritoriesPage` | Website Admin |
| `/admin/invitations` | `InvitationPage` | Website Admin |

### State Management (Zustand Stores)

- `authStore` — user session, token, role
- `filterStore` — map/complaint filter state
- `uiStore` — sidebar open/close, modal state

### Map Components

- `CivicLensMap` — main Leaflet map container
- `HeatmapLayer` — Leaflet.heat integration
- `ComplaintMarkers` — clustered markers
- `TerritoryBoundaries` — UC boundary polygons
- `FilterPanel` — category/status/date filters
- `MarkerPopup` — complaint detail popup
- `MapControls` — zoom/layer toggle
- `MapLegend` — color legend

---

## 18. Security Model

### Authentication

- **JWT** access tokens (configurable expiry, default 7 days)
- **Refresh tokens** stored in DB (`select: false`), rotated on use
- **Email verification** required for new accounts
- **Account lockout**: 5 failed login attempts → 2-hour lock

### Authorization

- **RBAC** enforced at route middleware level
- Role hierarchy: `website_admin` > `mayor` > `town_chairman` > `uc_chairman` > `citizen`
- Hierarchy access: Mayor can access Towns/UCs within their City; Town Chairman can access UCs within their Town
- Complaint visibility scoped to role's territory

### Data Protection

- Passwords: bcrypt (cost 12)
- NIC numbers: AES-256-GCM encryption, key in env var
- Phone/email: masked in API responses (`+9******67`, `a****d@example.com`)
- Citizen info and complaint location: immutable after creation

### Transport & API Security

- Helmet.js (security headers: CSP, HSTS, X-Frame-Options, etc.)
- CORS: configurable origin via `CORS_ORIGIN` env var
- MongoDB injection prevention via Mongoose schema validation
- Input validation: express-validator on all endpoints
- File upload: Multer with MIME type whitelist (JPEG, PNG, WebP for images; WAV/WebM/OGG/MP3 for audio)

### Known Security Gap

- `GET /api/v1/complaints` does not require authentication — all complaints are publicly readable (known issue, not yet fixed)

---

## 19. Deployment

### Backend

- **Host**: Any Node.js platform (currently deployed on a custom server)
- **Process**: `npm start` (production) / `npm run dev` (dev with nodemon)
- **WhatsApp Bot**: separate process `npm run whatsapp`
- **Port**: 3000 (configurable via `PORT` env var)
- **Database**: MongoDB Atlas or self-hosted

### Frontend

- **Host**: Vercel (`civiclensfast.vercel.app`)
- **Build**: `npm run build` → static `dist/` folder
- **Framework detection**: Vite → Vercel auto-detects

### Blockchain

- **Network**: Sepolia Testnet
- **Deploy**: `npx hardhat run scripts/deploy.js --network sepolia`
- **Verify**: `npx hardhat verify --network sepolia <ADDRESS>`

---

## 20. Known Issues & Limitations

### Critical

| Issue | Location | Impact |
|-------|----------|--------|
| `GET /complaints` public | `complaintRoutes.js` | All complaints readable without auth |
| Complaint creation fails if GPS outside seeded UC boundaries | `complaintController.js` | Users outside Karachi geo-data cannot submit |

### Medium

| Issue | Impact |
|-------|--------|
| Voice service in simulation mode | Voice transcription returns dummy text |
| Blockchain contract not deployed | Blockchain features show placeholder data |
| `logout` not imported in CitizenDashboard | Logout button broken on citizen dashboard |

### Missing Features (Planned, Not Implemented)

- SMS notifications (infrastructure present, not wired)
- Push notifications (infrastructure present, not connected)
- Mobile app (only web + WhatsApp)
- Complete MetaMask wallet connection flow for blockchain writes
- Officer assignment UI (model exists, no frontend)
- CSV/PDF export of analytics

### Architecture Limitations

- No TypeScript (plain JavaScript throughout)
- No unit tests (jest configured but no test files)
- No API rate limiting
- No request logging to file (only console via Pino)
- No database migration system

---

## 21. Environment Variables

### Backend (`.env`)

```env
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/civiclens

# Cloudinary (image storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# GROQ AI (free tier at console.groq.com)
GROQ_API_KEY=
AI_CLASSIFICATION_ENABLED=true
RAG_ENABLED=true

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d

# NIC Encryption
NIC_ENCRYPTION_KEY=  # 32-byte hex string

# WhatsApp Bot
WHATSAPP_ENABLED=true
WHATSAPP_AUTH_DIR=./whatsapp-auth

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# CORS
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=*

# Blockchain (optional)
BLOCKCHAIN_ENABLED=false
ETH_PRIVATE_KEY=
CONTRACT_ADDRESS=
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3000/api/v1

# Blockchain (optional)
VITE_CONTRACT_ADDRESS=
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

---

## Quick Reference: Complaint ID Format

```
CL-20260127-00001
│   │        └── 5-digit sequential number
│   └── YYYYMMDD date
└── Prefix
```

## Quick Reference: Karachi Data

The database is seeded with real Karachi administrative data:
- Towns: Saddar, Gulshan, SITE, Korangi, Malir, Keamari, Lyari, North Karachi, Orangi, Liaquatabad, Gulberg, Bin Qasim, Shah Faisal, Landhi
- Each Town has multiple UCs with real GeoJSON boundary polygons
- Seeding scripts: `backend/scripts/seed-complete-hierarchy.js`, `seed-karachi-towns.js`, `seed-karachi-ucs.js`

---

*Generated: 2026-06-06 | Version: 1.0*
