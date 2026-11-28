# Dispatchly Live Demo Script (6–7 Minutes)

A step-by-step walkthrough showcasing Dispatchly's Mumbai dispatch engine, live MapLibre GL tracking, on-site quotation approval, mock settlement, and operations analytics.

---

## Pre-Demo Checklist

- [ ] **Backend Awake (Free Tier):** Ping `GET /api/health` 2 minutes before starting so the container is warm.
- [ ] **Clean Demo Dataset Loaded:** Confirm `npm run reset:demo` (and optionally `npm run seed:demo-activity` for historical KPIs) was run against the demo database.
- [ ] **Demo Flags Enabled (Demo Environment Only):**
  - `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true`
  - `DEMO_FRESH_LOCATIONS=true` (only in demo so idle technicians remain eligible without stale-GPS rejections)
- [ ] **Technician Online:** Open a second browser window/profile logged in as the Andheri plumber and confirm status is **Online for Offers**.
- [ ] **Three Browser Windows Ready:**
  1. **Customer Window** (`/`)
  2. **Technician Window** (`/technician/dashboard`)
  3. **Admin Window** (`/admin/dispatch`)

---

## Demo Accounts (Emails Only)

> **Security Note:** Passwords are set via `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_PASSWORD`, and `SEED_TECH_PASSWORD` during `npm run reset:demo` and are never stored in documentation.

| Role | Email | Area / Specialty |
| :--- | :--- | :--- |
| **Customer** | `customer@dispatchly.com` | Aarav Mehta — Andheri West, Mumbai |
| **Plumber (Online, Full Stock)** | `technician@dispatchly.com` | Ramesh Patil — Andheri |
| **Plumber (Online, Bandra)** | `sandeep.yadav@dispatchly.com` | Sandeep Yadav — Bandra |
| **HVAC (Low Capacitor Stock)** | `farhan.ansari@dispatchly.com` | Farhan Ansari — Andheri (filtered out on Capacitor jobs) |
| **Operations Admin** | `admin@dispatchly.com` | Rohan Deshmukh — Dispatch & Governance |

---

## Walkthrough (6–7 Minutes)

### 1. Landing & Value Proposition (45 seconds) — Customer Window
- **Clicks:** Open `/` and scroll briefly to *"Nearest isn't always right"*.
- **Say:** *"Dispatchly doesn't just send the closest technician—it scores every eligible technician across 6 factors: arrival deadline feasibility, travel time, verified skills, active workload, van parts stock, and reliability."*

### 2. Customer Books a Plumbing Job in Andheri (60 seconds) — Customer Window
- **Clicks:**
  1. Click **Book a technician** -> Sign in as `customer@dispatchly.com`.
  2. Click **Book a service** -> Select **Plumbing** -> Choose **Emergency Pipe Leak Repair** -> Click **Continue to job details**.
  3. Enter description: `"Kitchen sink pipe leaking under cabinet"` -> Select **Urgent priority** -> Click **Continue to location**.
  4. On the MapLibre map, click the **Andheri West** quick preset (or drag the pin) -> Click **Continue to review**.
  5. Click **Confirm and dispatch technician**.
- **Say:** *"Notice the transparent INR estimate upfront and test-mode notice. Behind the scenes, the engine immediately filters out anyone missing the brass ball valve in their van or outside their service radius."*

### 3. Admin Dispatch Monitor & Ranked Scoring (45 seconds) — Admin Window
- **Clicks:** On `/admin/dispatch`, view the live Mumbai map and click **Inspect** on the newly created ticket.
- **Say:** *"Operations sees the exact candidate ranking: Ramesh Patil in Andheri scores highest with parts in stock, while technicians missing required parts or pending verification are explicitly filtered out with audit reasons."*

### 4. Technician Accepts Offer & Simulates Travel Along Real Route (90 seconds) — Technician & Customer Windows
- **Clicks:**
  1. Switch to **Technician Window** (`/technician/dashboard`). Point out the 60-second countdown offer card and click **Accept Offer**.
  2. Point out the **Sharing location** heartbeat indicator and the active-job MapLibre route.
  3. Select **10x** speed and click **Simulate travel**.
  4. Immediately bring **Customer Window** (`/bookings/<id>`) side-by-side.
- **Say:** *"The technician moves smoothly along the real OSRM road route—no teleporting or fake jitter. Every tick flows through the validated location service, updating the live ETA and Amber completed route line in real time until arrival."*

### 5. Quotation Approval, Completion, Test Payment & Review (90 seconds) — Technician & Customer Windows
- **Clicks:**
  1. *(Quotation step — optional or on a Bathroom Remodel / Split AC Installation booking)*: Technician clicks **Submit Quotation**, adds line items, and submits. Customer reviews the itemised INR quote and clicks **Approve and proceed**.
  2. In **Technician Window**, once status reaches `arrived`, click **Start Work**, then **Complete Job** (select parts used, enter final INR price, submit).
  3. In **Customer Window**, click **Verify and accept work**, review the *"Test mode: no real money is charged"* banner, click **Pay now (test mode)**, and submit a **5-star** review.
- **Say:** *"Customer verification triggers atomic settlement: mock payment capture, a single platform fee record, net payout credited to the technician, and updated reliability scores."*

### 6. Admin KPIs & Platform Fee Verification (45 seconds) — Admin Window
- **Clicks:** Navigate to `/admin/dashboard` and `/admin/payments`.
- **Say:** *"All KPIs—SLA compliance, gross INR volume, platform fees collected, and technician payouts—reflect the live transaction with full auditability."*

---

## Fallback Plan if Something Fails During Live Demo

| Issue | Immediate Recovery |
| :--- | :--- |
| **Public OSRM rate-limited / slow** | Built-in 3s timeout automatically falls back to straight-line + Haversine (`source: "estimate"`) so tracking and simulation continue smoothly. |
| **OpenFreeMap tile load hiccup** | Click **Retry** on the map ErrorState; all booking, quote, and payment flows work independently of map tiles. |
| **No technician receives offer** | Verify technician is **Online** on `/technician/dashboard` and `DEMO_FRESH_LOCATIONS=true` is set; or use **Manual Override** in `/admin/dispatch`. |
| **Free-tier backend cold start** | Refresh once after 10–15 seconds; `GET /api/health` warms MongoDB and Socket.IO immediately. |
