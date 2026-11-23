# Dispatchly: Project Status & Implementation Audit Report

**Date of Audit:** November 23, 2026  
**Auditor Mode:** Read-Only Codebase & Test Verification  
**Repository:** Dispatchly &mdash; Last-Mile Dynamic Technician Dispatcher  
**Output Path:** `/docs/PROJECT_STATUS.md`  

---

## 1. Executive Overview

Dispatchly is an on-demand marketplace connecting customers with verified independent service technicians across three verticals: **Plumbing**, **HVAC**, and **Urgent Courier Delivery**. The platform implements automated multi-factor dispatch matching, sequential offer expiry, real-time Leaflet tracking, milestone-driven SLA compliance monitoring, parts inventory reservation, on-site quotation approvals, and double-entry financial settlement.

### Tech Stack Actually In Use

| Tier | Technologies / Libraries Actually Used | Notes & Divergences |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14.2.35 (App Router), React 18, Tailwind CSS, Lucide React, Recharts 2.12, Leaflet / React-Leaflet 4.2 | 100% Client/Server App Router. No third-party UI component libraries (custom Tailwind). |
| **Backend** | Node.js 20, Express 4.19, Socket.IO 4.7.5, Mongoose 8.4, Zod 3.23, Helmet, CORS, Morgan | Monolithic Node process hosting REST APIs, WebSocket gateway, and 4 in-process sweepers. |
| **Database** | MongoDB Atlas / Local MongoDB 6+ (Mongoose ODM) | Utilizes `2dsphere` geospatial indexing, atomic document operators, and compound unique indexes. |
| **Real-Time** | Socket.IO WebSockets | In-memory room segregation (`user:{id}`, `ticket:{id}`, `admin:dispatch`). Single-node only. |
| **Maps & Routing** | Project OSRM Public Server (`http://router.project-osrm.org`) + Haversine fallback | **MOCK/UNPROTECTED**: Uses plain HTTP demo server with no live traffic data and strict rate limits. |
| **File Storage** | Local Disk Storage (`uploads/`) with Magic Byte verification | **MOCK**: `S3StorageService` contains placeholder code that falls back to local disk. |
| **Authentication**| JWT (`jsonwebtoken`) Access (15m) + Refresh (7d) + Bcrypt (10 salt rounds) | Stored in browser `localStorage`. No password reset or email verification flows. |
| **Payments** | In-Memory `MockPaymentGateway` + Mongo Ledger + Unique Platform Fee ($1.50) | **MOCK**: Simulated transactions (`txn_mock_...`). No real gateway (Stripe/PayPal/Adyen). |

### Repository Structure

```
dispatchly/
├── client/                     # Next.js 14 App Router frontend
│   ├── src/app/                # 23 page routes (auth, customer, technician, admin)
│   ├── src/components/         # Leaflet maps, Navbar, Notification bell
│   ├── src/context/            # AuthContext (JWT management via localStorage)
│   └── src/lib/                # api.js (Axios/fetch client), socket.js (Socket.IO client)
├── server/                     # Express.js REST API + Socket.IO Backend
│   ├── src/config/             # db.js (Mongoose connection)
│   ├── src/controllers/        # 12 REST controllers (auth, booking, dispatch, admin, etc.)
│   ├── src/models/             # 17 Mongoose schemas with compound indexes
│   ├── src/routes/             # 7 Express route modules
│   ├── src/services/           # Dispatch engine, SLA, tracking, payments, sweepers
│   └── tests/                  # 8 Jest test suites (98 automated tests)
├── docs/                       # PRD.pdf, PROJECT_STATUS.md
├── AGENTS.md                   # Agent system guidelines
├── DEPLOYMENT.md               # Container & Vercel deployment manual
└── README.md                   # Operational quickstart and architecture
```

### Verification & Test Suite Execution Results

Automated tests and production build were executed in a sandboxed verification environment against the test database:

- **Server Test Suite (`npm run test:all --prefix server`):**
  - **Suites:** `8 passed`, `8 total` (100% pass)
  - **Tests:** `98 passed`, `98 total` (0 failures, 0 skipped)
  - **Execution Time:** ~50.8 s
  - **Test Breakdown:**
    - `auth.test.js`: 7 passed (Registration, duplicate email rejection, login, JWT issuance, protected `/me`, token refresh, token revoking via version increment)
    - `phase2.test.js`: 12 passed (Technician profile creation, service areas, inventory CRUD, admin verification gate, availability toggling)
    - `phase3.test.js`: 10 passed (Service catalogue listing, dynamic pricing estimation, idempotent booking creation, Leaflet coordinate picking)
    - `phase4.test.js`: 17 passed (Eligibility filter, 6-factor candidate ranking, sequential offer creation, 60s expiration, atomic acceptance race conditions)
    - `phase5.test.js`: 14 passed (Socket.IO room segregation, GPS streaming, out-of-order coordinate rejection, SLA milestone calculations)
    - `phase6.test.js`: 13 passed (On-site quotation approval gate, job completion with evidence, atomic part deduction, mock payment capture, unique $1.50 platform fee, review rating calculation)
    - `phase7.test.js`: 11 passed (Admin KPI aggregation, revenue calculation, dispute resolution, CSV export formula injection sanitization)
    - `e2e.test.js`: 14 passed (7 full multi-role end-to-end integration flows)
- **Frontend Production Build (`npm run build --prefix client`):**
  - **Status:** **PASS** (Compiled cleanly with zero type errors and zero ESLint errors).
  - **Routes Generated:** 23 / 23 routes successfully prerendered as static or dynamic server-rendered pages.

---

## 2. Feature Inventory by Functional Area

### 2.1 Authentication & Authorization

| Feature | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| User Registration | **DONE** | `POST /api/auth/register`, `authController.js:14`, `auth.test.js` | Enforces email regex, min 6 char password, unique email index, bcrypt hash. |
| User Login | **DONE** | `POST /api/auth/login`, `authController.js:63`, `auth.test.js` | Returns access token (15m), refresh token (7d), and user payload. |
| Token Refresh | **DONE** | `POST /api/auth/refresh`, `authController.js:108`, `auth.test.js` | Verifies refresh secret and checks `tokenVersion` against database. |
| User Logout | **DONE** | `POST /api/auth/logout`, `authController.js:142`, `auth.test.js` | Increments `user.tokenVersion`, invalidating all existing refresh tokens. |
| Role-Based Access Control | **DONE** | `middleware/auth.js:46`, `e2e.test.js (Flow 7)` | Roles: `customer`, `technician`, `admin`. Blocks cross-role resource tampering. |
| Account Deactivation | **DONE** | `PUT /api/admin/users/:id/toggle-status`, `adminController.js:336` | Deactivated users cannot log in; existing tokens revoked via `tokenVersion`. |
| Password Reset Flow | **MISSING**| No routes or controllers exist in `authRoutes.js` | No `/forgot-password`, `/reset-password`, or email reset token mechanisms exist. |
| Email / Phone Verification | **MISSING**| `User.js`, `authController.js` | Accounts are active immediately upon registration; no email or SMS OTP gate. |

### 2.2 Customer Features

| Feature | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| Service Catalog Browsing | **DONE** | `GET /api/services`, `/book`, `ServiceCatalog.js` | Publicly queryable; filtered by active status and service vertical. |
| Booking Creation Wizard | **DONE** | `POST /api/bookings`, `/(customer)/book/page.jsx`, `e2e.test.js (Step 1.1)` | Multi-step wizard: category, service, priority, contact, coordinates. |
| Map Pin Location Picking | **DONE** | `LocationPickerMap.jsx`, `book/page.jsx:440` | Interactive Leaflet map with reverse geocoding to address text. |
| Real-time Price Estimation | **DONE** | `POST /api/bookings/estimate`, `pricingEstimator.js` | Computes base price, urgent surcharge, delivery distance pricing, and estimated SLA. |
| Live Technician Tracking | **DONE** | `/(customer)/bookings/[id]/page.jsx`, `LiveTrackingMap.jsx` | Streams technician GPS marker and route polyline via Socket.IO room `ticket:{id}`. |
| Booking Cancellation | **DONE** | `POST /api/bookings/:id/cancel`, `bookingController.js:235` | Allowed prior to technician arrival; updates status to `cancelled`. |
| Quotation Approval Gate | **DONE** | `PUT /api/bookings/:id/quote`, `quoteService.js`, `e2e.test.js (Flow 3)` | Mandatory customer approval on technician quote before work can begin. |
| Completion Verification | **DONE** | `POST /api/bookings/:id/verify-completion`, `completionService.js` | Customer reviews technician notes, photo evidence, and parts used. |
| Payment Checkout | **MOCK** | `POST /api/bookings/:id/pay`, `paymentController.js:9` | Mock gateway authorization & capture; records platform fee and payouts. |
| Ratings & Reviews | **DONE** | `POST /api/bookings/:id/review`, `reviewService.js`, `e2e.test.js (Step 1.6)` | 1-5 stars, tags, comments; recalculates technician rating and reliability score. |
| Dispute Escalation | **DONE** | `POST /api/bookings/:id/dispute`, `completionController.js:63` | Transitions booking to `disputed` and creates a `Dispute` ticket for admin review. |
| In-App Notification Bell | **DONE** | `NotificationBell.jsx`, `GET /api/notifications` | Live unread badge and dropdown feed updated via Socket.IO `notification:new`. |

### 2.3 Technician Features

| Feature | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| Onboarding & Profile Setup | **DONE** | `PUT /api/technicians/me/profile`, `/technician/profile` | Configures service categories, skills, experience, vehicle type, service area radius. |
| Document Upload | **PARTIAL** | `POST /api/technicians/me/documents`, `technicianController.js:180` | Multer upload with magic byte check; saved to local disk instead of real S3. |
| Verification Gate | **DONE** | `TechnicianProfile.js:92`, `eligibilityFilter.js:98` | Unverified technicians (`status: pending`) cannot receive dispatch offers. |
| Availability Toggle | **DONE** | `PUT /api/technicians/me/availability`, `/technician/profile` | Technicians toggle online/offline status; blocked if verification is unapproved. |
| Vehicle Inventory Management | **DONE** | `/api/technicians/me/inventory`, `/technician/inventory` | CRUD operations for spare parts; tracks quantity, reserved quantity, and cost. |
| Real-time Offer Countdown | **DONE** | `/technician/dashboard`, `Socket.IO event offer:new` | Displays 60-second visual countdown timer with SLA, distance, and score. |
| Accept / Reject Offers | **DONE** | `POST /api/technicians/offers/:id/accept`, `offerService.js:292` | Atomic race-safe accept with stock reservation; reject triggers auto-reassignment. |
| Job Milestone Lifecycle | **DONE** | `POST /api/technicians/jobs/:bookingId/status`, `stateMachine.js` | Validates transitions: `assigned -> en_route -> arrived -> in_progress`. |
| Live GPS Telemetry Stream | **DONE** | `technician:location` Socket event, `locationService.js` | Browser `watchPosition` sends coordinates; server throttles and broadcasts. |
| On-Site Quotation Creation | **DONE** | `POST /api/technicians/jobs/:bookingId/quote`, `quoteController.js:12` | Submits itemized line items; work blocked until customer approves. |
| Completion with Evidence | **DONE** | `POST /api/technicians/jobs/:bookingId/complete`, `completionService.js` | Submits notes, consumed parts, and up to 5 photos; deducts inventory atomically. |
| Earnings & Payout Ledger | **DONE** | `GET /api/technicians/me/earnings`, `/technician/earnings` | Displays completed jobs, gross revenue, $1.50 fee deductions, and net payouts. |

### 2.4 Admin & Operations Features

| Feature | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| Technician Verification Desk | **DONE** | `/admin/technicians`, `PUT /api/admin/technicians/:id/verify` | Inspects uploaded documents; approves or rejects with mandatory feedback reason. |
| User Directory & Control | **DONE** | `/admin/users`, `PUT /api/admin/users/:id/toggle-status` | Search, filter by role, and activate/deactivate customer or technician accounts. |
| Service Catalogue Management | **DONE** | `/admin/services`, `serviceController.js` | Create, edit, and toggle services; configure required skills and parts. |
| Platform Settings Management | **DONE** | `/admin/settings`, `settingsController.js` | Adjust platform fee ($1.50), weights, offer expiry (60s), and category SLA targets. |
| Live Dispatch Operations Map | **DONE** | `/admin/dispatch`, `dispatchController.js:348` | Real-time board showing unassigned, searching, offered, and assigned jobs. |
| Manual Dispatch Override | **DONE** | `POST /api/admin/dispatch/:bookingId/assign`, `dispatchController.js:460` | Dispatcher manually assigns a technician, bypassing algorithm. Logs to AuditLog. |
| Reassignment Decision Queue | **DONE** | `PUT /api/admin/reassignments/:id/decide`, `dispatchController.js:540` | Approves or denies technician reassignment requests. |
| Dispute Resolution Mediation | **DONE** | `/admin/disputes`, `disputeController.js:33` | Admin resolves disputes with full refund or proceeding with payout. |
| Payment & Ledger View | **DONE** | `/admin/payments`, `adminController.js:207` | Ledger audit of payments, fee collections, payouts, and manual refund button. |
| Audit Trail Logging | **DONE** | `/admin/audit-logs`, `AuditLog.js` | Tracks actor, role, IP address, target entity, and timestamp. |
| KPI & Time-Series Analytics | **DONE** | `GET /api/admin/kpis`, `/admin/dashboard`, `kpiService.js` | Aggregation pipelines: success rate, arrival time, SLA rate, revenue, daily charts. |
| CSV Report Export | **DONE** | `GET /api/admin/reports/:type`, `kpiService.js:705` | Exports Bookings, Payments, SLA, and Technicians; sanitizes CSV formula injection. |

### 2.5 Dispatch Engine

| Capability | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| Hard Eligibility Rules | **DONE** | `eligibilityFilter.js:53`, `phase4.test.js` | 10 strict gates: category, skills, radius (25km), status, capacity, working hours. |
| 6-Factor Weighted Scoring | **DONE** | `scorer.js:28`, `phase4.test.js` | Normalized 0-100: SLA (30%), Location (25%), Skills (15%), Workload (10%), Inventory (10%), Reliability (10%). |
| Candidate Ranking | **DONE** | `rankingService.js:14` | Sorts candidates by composite score; tie-breaks by ETA, rating, creation date. |
| Sequential Offer Delivery | **DONE** | `offerService.js:80`, `e2e.test.js (Flow 1)` | Delivers offer exclusively to candidate #1 for 60 seconds. |
| Automated Expiry Sweeper | **DONE** | `expirySweeper.js:23` | Background interval (5s) expires timed-out offers and cascades to candidate #2. |
| Inventory Parts Reservation | **DONE** | `offerService.js:368`, `e2e.test.js (Step 1.2)` | Atomically reserves stock using `$expr` condition; reverts on rejection. |
| Race-Condition Protection | **DONE** | `offerService.js:296`, `phase4.test.js:510` | Uses atomic `findOneAndUpdate` with `{ status: 'pending', expiresAt: { $gt: now } }`. |
| Routing Provider & Fallback | **PARTIAL** | `travelTimeService.js:55` | Calls public OSRM HTTP endpoint; falls back to Haversine distance at 30 km/h. |

### 2.6 Real-Time & WebSockets

| Capability | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| Socket.IO Gateway Setup | **DONE** | `server.js:53`, `socketService.js` | Embedded with Express on port 5000; CORS aligned with `CLIENT_URL`. |
| JWT Socket Authentication | **DONE** | `server.js:155` | Verifies JWT token on handshake; attaches user payload to socket. |
| Room Authorization Enforcement| **DONE** | `server.js:175-234` | Re-checks DB authorization before permitting sockets to join `ticket:{id}`. |
| Live GPS Telemetry Streaming | **DONE** | `server.js:236`, `locationService.js` | Throttles updates (3s memory, 15s DB write), drops coordinates outside [-180, 180]. |
| Customer Privacy Protection | **DONE** | `locationService.js:86` | Location broadcast to ticket room strictly from `en_route` until job completion. |
| Dynamic ETA Recalculation | **DONE** | `etaService.js:36` | Recalculates route ETA when technician moves > 200m or 30s elapse. |

### 2.7 SLA Monitoring

| Capability | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| Milestone Deadline Computation | **DONE** | `bookingController.js:93`, `PlatformSettings.js` | Sets deadlines for Response, Arrival, and Completion by category and priority. |
| SLA Background Sweeper | **DONE** | `slaSweeper.js:22` | Runs every 30s; identifies tickets at 80% elapsed time or past deadline. |
| Approaching Breach Warnings | **DONE** | `slaSweeper.js:55` | Sets `sla.status = 'at_risk'` and broadcasts `sla:warning` to admin console. |
| Milestone Breach Marking | **DONE** | `slaSweeper.js:82` | Sets `sla.status = 'breached'` and broadcasts `sla:breach` to admin console. |
| Final SLA Auditing | **DONE** | `completionService.js:80` | Records final SLA results (`met` vs `missed`) per milestone upon job completion. |

### 2.8 Payments & Financial Ledger

| Capability | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| Payment Gateway Adapter | **MOCK** | `paymentGateway.js`, `mockPaymentGateway.js` | Clean interface, but implementation is 100% mock simulating network delays. |
| Unique Platform Fee Record | **DONE** | `PlatformFee.js:9`, `paymentService.js:145` | Unique index on `booking` prevents double-charging platform fee under race conditions. |
| Double-Entry Ledger Entries | **DONE** | `Payment.js:74`, `paymentService.js:88` | Tracks audit history in `ledger` array for authorization, capture, and refunds. |
| Technician Payout Generation | **DONE** | `Payout.js:15`, `paymentService.js:178` | Generates payout record deducting platform fee ($1.50) from gross amount. |
| Stuck Payment Reconciliation | **DONE** | `paymentReconciliationSweeper.js:15`| In-process sweeper running every 5m checks gateway status for stuck transactions. |
| Administrative Refunds | **DONE** | `POST /api/admin/bookings/:id/refund`, `paymentService.js:254` | Marks payment refunded, records ledger entry, and reverts technician earnings. |

### 2.9 Storage & File Assets

| Capability | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| Storage Service Abstraction | **DONE** | `storageService.js:45` | Uniform interface: `saveFile`, `getFileStream`, `deleteFile`. |
| Magic Byte Validation | **DONE** | `storageService.js:11` | Inspects first 8 bytes for PDF, PNG, and JPEG signatures, rejecting spoofed files. |
| Private Asset Streaming | **DONE** | `technicianController.js:218`, `completionController.js:88` | Files are served through authenticated streaming endpoints, never public URLs. |
| Cloud Object Storage (S3/R2) | **MOCK** | `storageService.js:120` | `S3StorageService` comments out AWS SDK calls and saves to local disk (`uploads/`). |

### 2.10 Notifications & Messaging

| Capability | Status | Evidence | Notes |
| :--- | :---: | :--- | :--- |
| In-App Notification Delivery | **DONE** | `notificationService.js:20` | Creates database record and pushes live event `notification:new` via Socket.IO. |
| Admin Alert Broadcasting | **DONE** | `notificationService.js:57` | Batches notifications across all admin users and emits `notification:admin`. |
| Email Notifications | **MISSING**| Entire codebase | Zero SMTP / SendGrid / Postmark / SES adapters implemented. |
| SMS Text Messaging | **MISSING**| Entire codebase | Zero Twilio / SNS adapters implemented; dispatch offers rely entirely on WebSockets. |
| Push Notifications (Web/Mobile)| **MISSING**| Entire codebase | Zero Web Push / FCM / APNS integrations exist. |

---

## 3. PRD Traceability & Acceptance Criteria Audit

### 3.1 PRD In-Scope MVP Capabilities

| PRD Capability | Status | Implementation Evidence |
| :--- | :---: | :--- |
| **Plumbing, HVAC, Delivery Support** | **DONE** | `ServiceCatalog.js`, `seed.js`, `Booking.js:74`, `tests/e2e.test.js` |
| **Instant Price & ETA Preview** | **DONE** | `POST /api/bookings/estimate`, `pricingEstimator.js`, `client/book/page.jsx` |
| **Geospatial Map Location Picker** | **DONE** | `LocationPickerMap.jsx`, Leaflet integration in booking flow |
| **6-Factor Dynamic Dispatch Match** | **DONE** | `scorer.js`, `eligibilityFilter.js`, `rankingService.js`, `tests/phase4.test.js` |
| **60s Sequential Offer Expiration** | **DONE** | `offerService.js`, `expirySweeper.js`, `tests/phase4.test.js` |
| **On-Site Quotation Approval Gate**| **DONE** | `quoteService.js`, `Quote.js`, `tests/e2e.test.js (Flow 3)` |
| **Live GPS Map Tracking with Route**| **DONE** | `LiveTrackingMap.jsx`, `locationService.js`, `etaService.js` |
| **Milestone SLA Tracking (Resp/Arr/Comp)** | **DONE** | `slaService.js`, `slaSweeper.js`, `Booking.js:180` |
| **Completion Evidence & Parts Deduction** | **DONE** | `completionService.js`, `InventoryItem.js`, `tests/e2e.test.js (Step 1.4)` |
| **Unique $1.50 Platform Fee Settlement** | **DONE** | `PlatformFee.js` (`unique: true`), `mockPaymentGateway.js`, `tests/phase6.test.js` |
| **Post-Job Star Reviews & Reliability** | **DONE** | `reviewService.js`, `reliabilityService.js`, `Review.js` |
| **Admin Operations Panel & Overrides** | **DONE** | `admin/dispatch/page.jsx`, `adminController.js`, `tests/phase7.test.js` |
| **Audit Trails & Security Middleware** | **DONE** | `AuditLog.js`, `rateLimiter.js`, `auth.js`, `helmet` in `server.js` |

### 3.2 Verification of the 10 MVP Acceptance Criteria

| # | Acceptance Criterion | Status | Verification Evidence & Notes |
| :-: | :--- | :---: | :--- |
| **1** | **Sub-500ms Dispatch Execution** | **DONE** | Benchmark script `server/src/scripts/benchmarkLatency.js` confirms composite ranking queries complete in 12–45 ms against indexed collections. |
| **2** | **Multi-Factor Candidate Ranking** | **DONE** | `scorer.js` combines SLA (30%), Location (25%), Skills (15%), Workload (10%), Inventory (10%), Reliability (10%) into a normalized 0–100 score. Tested in `phase4.test.js`. |
| **3** | **Sequential Offer Cascading** | **DONE** | `offerService.js` and `expirySweeper.js` exclude rejected or timed-out candidates and seamlessly issue offers to candidate #2. Verified in `e2e.test.js (Flow 2)`. |
| **4** | **Hard Eligibility Filtering** | **DONE** | Verified in `phase4.test.js` and `e2e.test.js (Flow 4 & 5)`: unapproved accounts, missing skills, out-of-range coordinates, and missing vehicle payload capacity are strictly excluded. |
| **5** | **Live GPS Telemetry & ETA** | **DONE** | Verified in `phase5.test.js`: Technician coordinates are validated, throttled, and streamed to the ticket room with updated ETA from `travelTimeService.js`. |
| **6** | **Milestone SLA Compliance** | **DONE** | Verified in `phase5.test.js` and `phase7.test.js`: Background sweeper warns at 80% elapsed time and flags breaches on arrival and completion. |
| **7** | **Quotation Approval Gate** | **DONE** | Verified in `e2e.test.js (Flow 3)`: Technician cannot start work on quotation-type services until customer approves the itemized quote. |
| **8** | **Atomic Completion & Stock Deduction**| **DONE** | Verified in `e2e.test.js (Step 1.4)`: Used parts are subtracted from vehicle inventory atomically, and completion evidence is stored. |
| **9** | **Idempotent Settlement & $1.50 Fee** | **DONE** | Verified in `phase6.test.js`: Database enforces compound unique index on `PlatformFee.booking`, preventing duplicate fee capture on retries. |
| **10**| **Reliability Score Recalculation** | **DONE** | Verified in `e2e.test.js (Step 1.6)`: Customer review submission updates the technician's average star rating and reliability score algorithmically. |

---

## 4. Data Model & Database Architecture

The system utilizes 17 Mongoose schemas in MongoDB Atlas with strict schema validation and compound indexing.

| Collection / Model | Primary Key & References | Key Fields | Indexes & Constraints |
| :--- | :--- | :--- | :--- |
| **`User`** | `_id` | `name`, `email`, `passwordHash`, `role`, `isActive`, `tokenVersion` | `email` (unique) |
| **`TechnicianProfile`**| `_id`, `user` &rarr; `User` | `serviceCategories`, `skills`, `serviceArea`, `currentLocation`, `vehicleType`, `packageCapacityKg`, `verificationStatus`, `isAvailable`, `rating`, `reliabilityScore` | `user` (unique), `currentLocation` (`2dsphere`), `serviceArea.center` (`2dsphere`), `{ verificationStatus: 1, isAvailable: 1 }`, `serviceCategories` |
| **`TechnicianDocument`**| `_id`, `technician` &rarr; `TechnicianProfile` | `docType`, `filePath`, `originalName`, `mimeType`, `size`, `status`, `reviewedBy` | `technician: 1` |
| **`Booking`** | `_id`, `customer` &rarr; `User`, `assignedTechnician` &rarr; `TechnicianProfile` | `ticketNumber`, `category`, `priority`, `location`, `status`, `pricing`, `sla`, `dispatch`, `inventoryReservations` | `ticketNumber` (unique), `location` (`2dsphere`), `{ customer: 1, idempotencyKey: 1 }` (unique), `{ status: 1, createdAt: -1 }`, `{ createdAt: -1, category: 1, status: 1 }` |
| **`DispatchOffer`** | `_id`, `booking` &rarr; `Booking`, `technician` &rarr; `TechnicianProfile` | `attempt`, `rank`, `totalScore`, `scoreBreakdown`, `etaMinutes`, `status`, `expiresAt`, `rejectReason` | `{ booking: 1, technician: 1 }` (unique &mdash; never offers same job twice), `{ status: 1, expiresAt: 1 }` |
| **`ReassignmentRequest`**| `_id`, `booking` &rarr; `Booking`, `technician` &rarr; `TechnicianProfile` | `reason`, `status`, `decidedBy`, `decisionNote` | `{ status: 1, createdAt: -1 }` |
| **`InventoryItem`** | `_id`, `technician` &rarr; `TechnicianProfile` | `name`, `category`, `partCode`, `quantity`, `reservedQuantity`, `unitCost` | `{ technician: 1, partCode: 1 }` (unique) |
| **`ServiceCatalog`**| `_id` | `category`, `name`, `code`, `pricingType`, `basePrice`, `requirements`, `isActive` | `code` (unique), `{ category: 1, isActive: 1 }` |
| **`Quote`** | `_id`, `booking` &rarr; `Booking`, `technician` &rarr; `TechnicianProfile` | `lineItems`, `total`, `notes`, `status`, `rejectionReason` | `{ booking: 1, createdAt: -1 }` |
| **`Payment`** | `_id`, `booking` &rarr; `Booking`, `customer` &rarr; `User`, `technician` &rarr; `TechnicianProfile`| `amount`, `currency`, `status`, `gatewayRef`, `idempotencyKey`, `ledger` | `booking` (unique), `{ status: 1, createdAt: -1 }` |
| **`PlatformFee`** | `_id`, `booking` &rarr; `Booking` | `amount` ($1.50), `currency`, `feePayer`, `capturedAt` | `booking` (unique &mdash; zero duplicate fee records) |
| **`Payout`** | `_id`, `booking` &rarr; `Booking`, `technician` &rarr; `TechnicianProfile` | `amount`, `feeDeducted`, `currency`, `status`, `paidAt` | `booking` (unique), `{ technician: 1, createdAt: -1 }` |
| **`Dispute`** | `_id`, `booking` &rarr; `Booking`, `raisedBy` &rarr; `User` | `reason`, `status`, `resolution`, `resolvedBy`, `adminNotes` | `booking: 1`, `status: 1` |
| **`Review`** | `_id`, `booking` &rarr; `Booking`, `customer` &rarr; `User`, `technician` &rarr; `TechnicianProfile` | `rating`, `comment`, `tags`, `isHidden` | `booking` (unique), `{ technician: 1, createdAt: -1 }` |
| **`Notification`** | `_id`, `user` &rarr; `User` | `type`, `title`, `body`, `data`, `readAt` | `{ user: 1, readAt: 1 }`, `{ user: 1, createdAt: -1 }` |
| **`PlatformSettings`**| `_id` | `platformFeePerTicket`, `offerExpirySeconds`, `dispatchWeights`, `slaTargets`, `pricingConfig` | Singleton configuration document |
| **`AuditLog`** | `_id`, `performedBy` &rarr; `User` | `action`, `role`, `targetEntity`, `entityId`, `details`, `ipAddress` | `{ performedBy: 1, createdAt: -1 }`, `{ targetEntity: 1, entityId: 1 }` |

---

## 5. API Inventory & Route Matrix

| Area | Method | Endpoint | Allowed Roles | Automated Test |
| :--- | :---: | :--- | :--- | :---: |
| **System** | `GET` | `/api/health` | Public | Yes (`auth.test.js`) |
| **Auth** | `POST` | `/api/auth/register` | Public | Yes (`auth.test.js`) |
| **Auth** | `POST` | `/api/auth/login` | Public | Yes (`auth.test.js`) |
| **Auth** | `POST` | `/api/auth/refresh` | Public | Yes (`auth.test.js`) |
| **Auth** | `GET` | `/api/auth/me` | Authenticated | Yes (`auth.test.js`) |
| **Auth** | `POST` | `/api/auth/logout` | Authenticated | Yes (`auth.test.js`) |
| **Services** | `GET` | `/api/services` | Public | Yes (`phase3.test.js`) |
| **Services** | `GET` | `/api/services/:id` | Public | Yes (`phase3.test.js`) |
| **Bookings** | `POST` | `/api/bookings/estimate` | Authenticated | Yes (`phase3.test.js`) |
| **Bookings** | `POST` | `/api/bookings` | `customer` | Yes (`e2e.test.js`) |
| **Bookings** | `GET` | `/api/bookings` | `customer` | Yes (`phase3.test.js`) |
| **Bookings** | `GET` | `/api/bookings/:id` | `customer`, `admin` | Yes (`e2e.test.js`) |
| **Bookings** | `POST` | `/api/bookings/:id/cancel` | `customer` | Yes (`phase3.test.js`) |
| **Quotation**| `GET` | `/api/bookings/:id/quote` | Authenticated | Yes (`phase6.test.js`) |
| **Quotation**| `PUT` | `/api/bookings/:id/quote` | `customer` | Yes (`e2e.test.js`) |
| **Quotation**| `POST` | `/api/bookings/:id/quote/approve` | `customer` | Yes (`e2e.test.js`) |
| **Completion**| `POST`| `/api/bookings/:id/verify-completion` | `customer`, `admin` | Yes (`phase6.test.js`) |
| **Completion**| `POST`| `/api/bookings/:id/completion/verify` | `customer`, `admin` | Yes (`e2e.test.js`) |
| **Disputes** | `POST` | `/api/bookings/:id/dispute` | `customer`, `admin` | Yes (`e2e.test.js`) |
| **Evidence** | `GET` | `/api/bookings/:id/evidence/:filename` | Authenticated | Yes (`phase6.test.js`) |
| **Payment** | `POST` | `/api/bookings/:id/pay` | `customer` | Yes (`phase6.test.js`) |
| **Payment** | `POST` | `/api/bookings/:id/payment` | `customer` | Yes (`e2e.test.js`) |
| **Payment** | `GET` | `/api/bookings/:id/payment` | Authenticated | Yes (`phase6.test.js`) |
| **Review** | `POST` | `/api/bookings/:id/review` | `customer` | Yes (`e2e.test.js`) |
| **Technician**| `GET` | `/api/technicians/me/profile` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `PUT` | `/api/technicians/me/profile` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `PUT` | `/api/technicians/me/availability` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `PATCH`| `/api/technicians/me/availability` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `PUT` | `/api/technicians/me/location` | `technician` | Yes (`phase5.test.js`) |
| **Technician**| `PATCH`| `/api/technicians/location` | `technician` | Yes (`phase5.test.js`) |
| **Technician**| `POST`| `/api/technicians/offers/:id/accept` | `technician` | Yes (`e2e.test.js`) |
| **Technician**| `POST`| `/api/technicians/offers/:id/reject` | `technician` | Yes (`e2e.test.js`) |
| **Technician**| `GET` | `/api/technicians/jobs/current` | `technician` | Yes (`phase5.test.js`) |
| **Technician**| `POST`| `/api/technicians/jobs/:bookingId/status` | `technician` | Yes (`e2e.test.js`) |
| **Technician**| `POST`| `/api/technicians/jobs/:bookingId/quote` | `technician` | Yes (`e2e.test.js`) |
| **Technician**| `POST`| `/api/technicians/jobs/:bookingId/complete` | `technician` | Yes (`e2e.test.js`) |
| **Technician**| `POST`| `/api/technicians/jobs/:bookingId/cancel` | `technician` | Yes (`phase4.test.js`) |
| **Technician**| `POST`| `/api/technicians/me/documents` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `GET` | `/api/technicians/me/documents` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `GET` | `/api/technicians/documents/:id/download` | `technician`, `admin` | Yes (`phase2.test.js`) |
| **Technician**| `GET` | `/api/technicians/me/inventory` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `POST`| `/api/technicians/me/inventory` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `PUT` | `/api/technicians/me/inventory/:id` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `DELETE`| `/api/technicians/me/inventory/:id` | `technician` | Yes (`phase2.test.js`) |
| **Technician**| `GET` | `/api/technicians/me/earnings` | `technician` | Yes (`phase6.test.js`) |
| **Technician**| `GET` | `/api/technicians/:id/reviews` | Public | Yes (`phase6.test.js`) |
| **Dispatch** | `GET` | `/api/dispatch/offers` | `technician` | Yes (`phase4.test.js`) |
| **Dispatch** | `POST` | `/api/dispatch/offers/:id/accept` | `technician` | Yes (`phase4.test.js`) |
| **Dispatch** | `POST` | `/api/dispatch/offers/:id/reject` | `technician` | Yes (`phase4.test.js`) |
| **Notifications**| `GET`| `/api/notifications` | Authenticated | Yes (`phase5.test.js`) |
| **Notifications**| `POST`| `/api/notifications/read` | Authenticated | Yes (`phase5.test.js`) |
| **Admin** | `GET` | `/api/admin/technicians` | `admin` | Yes (`phase2.test.js`) |
| **Admin** | `GET` | `/api/admin/technicians/:id` | `admin` | Yes (`phase2.test.js`) |
| **Admin** | `PUT` | `/api/admin/technicians/:id/verify` | `admin` | Yes (`phase2.test.js`) |
| **Admin** | `GET` | `/api/admin/services` | `admin` | Yes (`phase3.test.js`) |
| **Admin** | `POST` | `/api/admin/services` | `admin` | Yes (`phase3.test.js`) |
| **Admin** | `PUT` | `/api/admin/services/:id` | `admin` | Yes (`phase3.test.js`) |
| **Admin** | `DELETE`| `/api/admin/services/:id` | `admin` | Yes (`phase3.test.js`) |
| **Admin** | `GET` | `/api/admin/settings` | `admin` | Yes (`phase3.test.js`) |
| **Admin** | `PUT` | `/api/admin/settings` | `admin` | Yes (`phase3.test.js`) |
| **Admin** | `GET` | `/api/admin/bookings` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `GET` | `/api/admin/bookings/:id` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `GET` | `/api/admin/dispatch/monitor` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `GET` | `/api/admin/dispatch/:bookingId` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `POST` | `/api/admin/dispatch/:bookingId/assign` | `admin` | Yes (`phase4.test.js`) |
| **Admin** | `POST` | `/api/admin/dispatch/:bookingId/retry` | `admin` | Yes (`phase4.test.js`) |
| **Admin** | `GET` | `/api/admin/reassignments` | `admin` | Yes (`phase4.test.js`) |
| **Admin** | `PUT` | `/api/admin/reassignments/:id/decide` | `admin` | Yes (`phase4.test.js`) |
| **Admin** | `GET` | `/api/admin/disputes` | `admin` | Yes (`phase6.test.js`) |
| **Admin** | `PUT` | `/api/admin/disputes/:id/resolve` | `admin` | Yes (`e2e.test.js`) |
| **Admin** | `POST` | `/api/admin/bookings/:id/refund` | `admin` | Yes (`e2e.test.js`) |
| **Admin** | `GET` | `/api/admin/payments/ledger` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `PUT` | `/api/admin/reviews/:id/moderate` | `admin` | Yes (`phase6.test.js`) |
| **Admin** | `GET` | `/api/admin/kpis` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `GET` | `/api/admin/kpis/timeseries` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `GET` | `/api/admin/reports/:type` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `GET` | `/api/admin/operations/panel` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `GET` | `/api/admin/users` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `PUT` | `/api/admin/users/:id/toggle-status` | `admin` | Yes (`phase7.test.js`) |
| **Admin** | `GET` | `/api/admin/audit-logs` | `admin` | Yes (`phase7.test.js`) |

---

## 6. Frontend Pages Inventory

| Page Route | User Role | Core Purpose | Unfinished / Mock / Dev-Only Elements |
| :--- | :---: | :--- | :--- |
| `/` | Public | Landing page with hero CTA and platform overview | None (clean static page). |
| `/login` | Public | User authentication login | Quick-demo one-click buttons (guarded by `NEXT_PUBLIC_DEMO_MODE`). |
| `/register` | Public | Account creation for customer or technician | None. |
| `/dashboard` | `customer` | Customer landing view, booking metrics, active request cards | None. |
| `/book` | `customer` | Booking wizard, service picker, Leaflet location pin | None. |
| `/bookings` | `customer` | Historical booking ticket table with status filters | None. |
| `/bookings/[id]` | `customer` | Real-time tracking map, ETA, quote approval, payment, review | **MOCK**: Contains "Simulate Mock Processor" decline checkbox in checkout modal. |
| `/technician/dashboard` | `technician` | Incoming offers countdown, active job navigation, quote/complete modal | Contains local random jitter simulation in `navigator.geolocation` fallback. |
| `/technician/inventory` | `technician` | Spare parts stock table, add/edit part modals, low-stock flags | None. |
| `/technician/earnings` | `technician` | Gross earnings, $1.50 platform fee deductions, payout history | None. |
| `/technician/profile` | `technician` | Profile settings, vehicle type, service area radius map, documents | "Attach Sample License (PDF)" button (guarded by `NEXT_PUBLIC_DEMO_MODE`). |
| `/admin/dashboard` | `admin` | Executive KPI cards, Recharts time-series, live operations panel | None. |
| `/admin/dispatch` | `admin` | Live dispatch board, unassigned queue, candidate scores modal | None. |
| `/admin/bookings` | `admin` | Global bookings table with filter by status, category, priority | None. |
| `/admin/technicians` | `admin` | Technician verification review table and document viewer modal | None. |
| `/admin/users` | `admin` | User management directory with account deactivation toggles | None. |
| `/admin/services` | `admin` | Service catalogue CRUD with pricing rules and required skills | None. |
| `/admin/disputes` | `admin` | Open dispute mediation table with resolve modal (refund vs proceed) | None. |
| `/admin/payments` | `admin` | Financial ledger table, fee collection breakdown, refund trigger | None. |
| `/admin/settings` | `admin` | Configuration for weights, $1.50 fee, expiry timeouts, SLA targets | None. |
| `/admin/audit-logs` | `admin` | Audit trail viewer with search, action filters, and metadata inspector| None. |

---

## 7. Testing Coverage & End-to-End Flows

### Automated Test Suite Summary
- **Total Test Files:** 8 files (`server/tests/`)
- **Total Automated Tests:** 98 tests
- **Passing:** 98 (100%)
- **Failing:** 0
- **Code Coverage Areas:**
  - Complete Zod input validation schemas for all mutations.
  - Multi-tenant tenant isolation and RBAC authorization matrix.
  - State machine status transition matrix.
  - Atomic concurrency: race conditions on offer acceptance, inventory parts deduction, and single platform fee capture.
  - Aggregation pipelines for admin KPIs and timeseries.

### Full End-to-End (E2E) Verified Flows (`e2e.test.js`)
1. **Flow 1 &mdash; Standard Marketplace Lifecycle:** Customer books emergency plumbing job &rarr; Engine searches & issues 60s offer &rarr; Technician accepts &rarr; Technician updates milestones (`en_route` &rarr; `arrived` &rarr; `in_progress`) &rarr; Technician completes job with used parts &rarr; Customer verifies completion &rarr; Customer pays via mock gateway &rarr; Atomic $1.50 platform fee captured &rarr; Customer submits 5-star review &rarr; Technician rating and reliability score recalculated.
2. **Flow 2 &mdash; Offer Rejection & Auto-Reassignment:** System offers ticket to top candidate &rarr; Technician rejects with reason &rarr; Candidate added to excluded list &rarr; Engine cascades offer to candidate #2.
3. **Flow 3 &mdash; Quotation Gate:** Complex job booked with `pricingType: quotation` &rarr; Technician inspects on-site & submits quote &rarr; Job status holds in `in_progress` &rarr; Customer reviews and approves quote &rarr; Work proceeds.
4. **Flow 4 &mdash; Delivery Capacity Filtering:** Heavy cargo booked &rarr; Engine filters out motorcycles and payload capacities below threshold &rarr; Offers exclusively to matching vehicle.
5. **Flow 5 &mdash; Technician Onboarding Gate:** Unverified technician blocked from setting `isAvailable: true` until administrator inspects trade license and approves account.
6. **Flow 6 &mdash; Dispute Lifecycle & Refund Settlement:** Customer disputes poor workmanship &rarr; Payment held in `disputed_hold` &rarr; Admin mediates & issues refund &rarr; Ledger updated, technician payout cancelled.
7. **Flow 7 &mdash; Cross-Role Authorization Matrix:** Verified that customers cannot access `/admin/*`, technicians cannot create bookings, and customers cannot inspect other customers' booking details.

---

## 8. Real-World Readiness Gaps & Risk Analysis

| Gap Area | Risk Level | Description & Root Cause |
| :--- | :---: | :--- |
| **Mock Payment Gateway** | **HIGH** | `MockPaymentGateway` uses fake strings (`txn_mock_...`). No real Stripe / Adyen / Square integration. No real card tokenization, 3D Secure, automated bank payouts (Stripe Connect / ACH), or tax invoices. |
| **Public OSRM Demo Server** | **HIGH** | `travelTimeService.js` hits `http://router.project-osrm.org`. It is an unauthenticated public demo server without an SLA, using plain HTTP, and has zero live traffic awareness. In production, rush hour traffic will cause completely inaccurate ETAs and SLA breaches. |
| **Ephemeral Local Storage in S3 Driver** | **HIGH** | `S3StorageService` has the AWS SDK commented out and delegates file writes to the local `uploads/` directory. On ephemeral container hosting (Fly.io, InsForge, AWS ECS), all technician licenses and job proof photos will be permanently deleted upon container redeployment. |
| **No External Notifications (Email/SMS/Push)** | **HIGH** | Notifications only function while the user or technician has the web app actively open in their browser. If a technician locks their phone or backgrounds the browser, they will miss the 60-second dispatch offer countdown. Requires Twilio SMS and Web Push / FCM. |
| **Mobile Browser GPS Suspension** | **HIGH** | Mobile Safari (iOS) and Chrome (Android) aggressively freeze JavaScript execution and disconnect WebSockets when the screen locks or the tab is backgrounded. Real-world dispatching requires a native mobile app or background geolocation service worker. |
| **Technician KYC & Background Checks** | **HIGH** | Admin document review is purely manual visual inspection of uploaded images. No automated identity verification (Persona, Veriff) or criminal background check integration (Checkr). |
| **Horizontal Scalability (Single-Node Constraint)** | **MEDIUM** | In-process sweepers (`setInterval` for offer expiry, SLA checks, payments) and in-memory Maps (`locationService`, `travelTimeService`) will duplicate tasks or desynchronize if scaled to multiple container replicas without Redis and distributed locks (Redlock). |
| **Tokens Stored in localStorage** | **MEDIUM** | JWT access and refresh tokens are stored in `window.localStorage` in `AuthContext.js`, leaving them vulnerable to Cross-Site Scripting (XSS). Best practice is `httpOnly; SameSite=Strict; Secure` cookies for refresh tokens. |
| **No Password Reset or Email Verification** | **MEDIUM** | If a user forgets their password, there is no self-serve recovery mechanism. Users can register with fake or mistyped email addresses without verification. |
| **Legal, Compliance & Consent Policies** | **MEDIUM** | Missing Terms of Service, Privacy Policy (GDPR / CCPA disclosures), explicit GPS tracking consent notice for independent contractors, and formal customer cancellation fee policy. |
| **Observability & Error Tracking** | **MEDIUM** | System logs to `console.log` and `console.error`. No centralized APM or crash reporting (Sentry, Datadog) or Prometheus metrics for dispatcher operations. |
| **Unbounded Memory Caches** | **LOW** | `travelTimeService.js` caches route queries in an unbounded `new Map()`. Over months of operation with thousands of coordinates, this will cause memory bloat unless converted to an LRU cache. |

---

## 9. Known Bugs, Dead Code & Technical Debt

1. **Dead Code &mdash; `server/src/services/dispatch/dispatchPlaceholder.js`:**
   - Left over from early Phase 3 scaffolding. It is never imported anywhere in `server/`.
2. **Misleading Comment in `bookingController.js:166`:**
   - Code states `// 7. Trigger placeholder dispatch engine (implemented in Phase 4)`, but it actually invokes the real `startDispatch` from `offerService.js`.
3. **Simulated S3 Driver (`server/src/services/storage/storageService.js`):**
   - Class `S3StorageService` claims to support S3, but line 144 delegates saving to `this.localFallback.saveFile(...)`. `@aws-sdk/client-s3` is not in `package.json`.
4. **In-Memory Location Loss on Server Restart:**
   - `locationService.js` maintains an in-memory `activeLocations` map. If the backend restarts while jobs are `en_route`, the map is empty until the technician's phone emits its next GPS tick.
5. **No Cross-Device Geolocation Watcher Reconnection:**
   - If a technician refreshes their browser page during an active job, the geolocation watcher must be manually re-triggered or wait for browser permission prompts.

---

## 10. Pending PRD Stakeholder Decisions & Current Implementation

| Decision Area | Status in Code | Current Handling | Alternative Options for Production |
| :--- | :---: | :--- | :--- |
| **Platform Fee Payer** | Implemented as Technician | $1.50 is deducted from the technician's payout record (`Payout.feeDeducted = 1.50`). | Customer surcharge at checkout ($85 + $1.50) vs 50/50 split ($0.75 / $0.75). |
| **Launch Geography** | Hardcoded Defaults | Centered on San Francisco Bay Area (`[-122.4194, 37.7749]`) with 25 km max candidate radius. | Configurable city zones in `PlatformSettings` with dynamic bounding polygons. |
| **Offer Expiry Duration** | Configurable Default | Set to 60 seconds in `PlatformSettings.offerExpirySeconds`. | 45 seconds for urban urgent deliveries; 90 seconds for rural trades. |
| **SLA Standard Targets** | Configurable Default | Normal: Plumbing (120m), HVAC (180m), Delivery (45m). Urgent multiplier: ~0.33x. | Dynamic SLA calculated from real-time traffic matrix + buffer. |
| **Cancellation Fee Policy** | Basic Logic | Free cancellation before technician departure; no travel fee charged if customer cancels on-site. | Flat $15 travel fee charged to customer if cancelled after technician arrives. |
| **Auto-Verification Window** | In-Process Sweeper | `autoVerificationSweeper.js` automatically approves completed jobs after 24 hours of customer silence. | 48-hour window or automated customer SMS reminder at 12 hours. |

---

## 11. Production Roadmap & Action Plan

### Tier 1: Must-Fix Before Any Real Customer or Technician Uses It
1. **Real S3 / Cloud Storage Integration** (`Estimate: S`, `Deps: None`)
   - Install `@aws-sdk/client-s3` in `server/package.json`.
   - Update `S3StorageService` to upload buffers directly to AWS S3 / Cloudflare R2 with pre-signed download URLs.
2. **Real Payment Gateway Integration** (`Estimate: M`, `Deps: S3`)
   - Replace `MockPaymentGateway` with Stripe Elements & Payment Intents API.
   - Implement Stripe Connect for automated technician bank account payouts.
   - Implement Stripe webhook signature verification for asynchronous capture/refund events.
3. **SMS & Push Notifications for Dispatch Offers** (`Estimate: M`, `Deps: None`)
   - Integrate Twilio or AWS SNS for SMS dispatch alerts with actionable reply codes (or deep links).
   - Implement Web Push API / Firebase Cloud Messaging (FCM) so technicians receive sound alerts when phone screen is locked.
4. **Traffic-Aware Routing Engine** (`Estimate: S`, `Deps: None`)
   - Replace public HTTP OSRM with Google Maps Distance Matrix API, Mapbox Directions API, or a self-hosted private OSRM container with HTTPS.
5. **Self-Serve Password Reset & Email Verification** (`Estimate: S`, `Deps: Email Provider`)
   - Integrate transactional email (Resend / SendGrid / Postmark).
   - Implement `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` with signed expiry tokens.
6. **Move Refresh Tokens to Secure HTTP-Only Cookies** (`Estimate: S`, `Deps: None`)
   - Eliminate `localStorage` refresh token storage; set `httpOnly; SameSite=Strict; Secure` cookies to mitigate XSS risks.

### Tier 2: Should-Fix Within First Month of Operation
1. **Redis Adapter for Socket.IO & Distributed Sweepers** (`Estimate: M`, `Deps: Redis Instance`)
   - Add `@socket.io/redis-adapter` to allow multi-pod horizontal backend scaling.
   - Replace in-process `setInterval` sweepers with BullMQ or Agenda backed by Redis/Mongo locks to prevent duplicate job executions across pods.
2. **Automated Technician KYC & License Verification** (`Estimate: M`, `Deps: Third-Party API`)
   - Integrate Persona or Stripe Identity for automated driver license and identity verification.
3. **PWA / Native Shell for Background Geolocation** (`Estimate: L`, `Deps: Frontend`)
   - Package technician portal into a Progressive Web App (PWA) with Background Geolocation API plugin (or React Native shell) to maintain reliable GPS streaming when phone is in pocket.
4. **Centralized Error Monitoring & Telemetry** (`Estimate: S`, `Deps: None`)
   - Add Sentry SDK to Next.js client and Express backend for real-time exception tracking and alerts.

### Tier 3: Later Architectural Improvements
1. **Multi-Region & Dynamic Service Zones** (`Estimate: L`, `Deps: None`)
   - Support arbitrary city operational zones with distinct localized pricing, currency, tax rules, and local SLA targets.
2. **Real-Time In-App Support Chat** (`Estimate: M`, `Deps: Redis`)
   - In-app two-way messaging between customer and technician with masked phone proxy (Twilio Proxy).
3. **Automated Sales Tax & Invoice Generation** (`Estimate: M`, `Deps: Stripe Tax`)
   - Automated PDF receipt and tax invoice generation based on local jurisdiction tax rules.

---

*Report generated and validated autonomously against codebase test suites and build artifacts.*
