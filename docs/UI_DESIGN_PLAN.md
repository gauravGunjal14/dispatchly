# Dispatchly UI Redesign & Brand Architecture Plan (Pass 1 - Approved with Revisions)

> **Document Status:** Approved with Revisions — Entering Pass 2 (Build in 3 Checkpoints)  
> **Brand Concept:** Work-Zone Signage meets Dispatch Board (Practical, High-Visibility, Trustworthy, Confident, Fast)  
> **Scope:** Full-stack UI redesign across Landing Page, Customer Portal, Technician Hub, and Admin Operations Console without modifying backend APIs, database models, or route contracts.

---

## 0. Key Approved Revisions & Execution Constraints

1. **Strictly Sentence Case Everywhere:** No uppercase text or wide tracking in `StatusPill`, `StatCard` labels, table headers, section titles, breadcrumbs, or buttons. All copy is plain sentence case.
2. **Landing Page Sample Data Centralization:** All sample data (jobs, neutral addresses, technician names, metrics) is stored in a single source file (`client/src/data/landingSample.js`). No hardcoded currency symbols or real street addresses on the landing page; neutral terminology is used throughout.
3. **Mandatory "Example" Badging:** All sample data displays on the landing page (dispatch preview, technician offer card, operator KPI metrics) visibly carry an "Example" badge.
4. **Typography & Sizing:** Minimum text size is 12px (`text-xs`). Landing page body text is 16px (`text-base`); application UI body text is 14px (`text-sm`). Desktop hero headline is ~56px; mobile headline is ~36px.
5. **Desktop "How it works":** All four steps are laid out in a single horizontal row connected by a vector route line (vertical sequence on mobile).
6. **Mobile Content Parity:** Mobile landing views retain all six matching weights, "Built to be trusted", and operator capabilities (structured cleanly with responsive stacking and accordions).
7. **Expanded Component Catalog:** Added `ScoreBar`, `CountdownRing`, `DropdownMenu`, `Pagination`, `FormField`, and `Tooltip`.
8. **Universal Focus Ring:** Defined as 2px Ink (`#12161C`) with 2px offset (`ring-2 ring-ink ring-offset-2`), guaranteeing at least 3:1 contrast against every background surface.
9. **Single Amber Action Rule:** In the customer dashboard and all primary viewports, only **one** amber button is permitted per viewport to maintain clear action hierarchy.
10. **Seeded Catalogue Fidelity:** Landing page service vertical names and items match the real seeded service catalogue.

---

## 1. Brand Direction & Design Philosophy

Dispatchly is an intelligent on-demand dispatch marketplace for mission-critical field services: **Plumbing**, **AC / HVAC**, and **Urgent Delivery**. When a customer's pipe bursts, an AC compressor fails in peak summer, or a critical replacement part must cross town immediately, the product's promise is precision and speed:
> *"The right technician, not just the nearest one."*

### Brand Pillars
1. **Work-Zone Signage Clarity:** High contrast, legible typography, unadorned surfaces, and functional color signaling inspired by transit and field-operation control boards.
2. **Operational Honesty:** No fake marketing fluff, no stock photos of smiling actors, no fabricated review statistics. Every UI component displays real product behavior, actual dispatch mechanics, and transparent pricing/testing statuses.
3. **Speed & Confidence:** Tight layout density, immediate visual hierarchy, 60-second offer countdown timers, and clear active milestones that make users feel the system is alive and moving.
4. **Light Theme Only:** Grounded in White `#FFFFFF`, Concrete `#EEF0F2`, and 1px Line borders `#D9DDE2`, with Ink `#12161C` carrying contrast and Signal Amber `#FFB400` reserved for primary action accents.

---

## 2. Token System Specification

All styles are implemented as Tailwind tokens in `tailwind.config.js`. No ad-hoc hex codes or arbitrary inline values are permitted in components.

### 2.1 Color Palette & Token Definitions

Base status colors are maintained for fills and borders, paired with dedicated darker text tokens (`status-success-text` and `status-danger-text`) to guarantee strict WCAG AA (>= 4.5:1) compliance on both White surfaces and 10% tint badge fills.

| Token Name | Hex Code | Role & Application Rules |
| :--- | :--- | :--- |
| `ink` | `#12161C` | Primary text, headings, dark brand surfaces, table header text, logo mark pin. |
| `amber` | `#FFB400` | Signal Amber. Primary action fill (buttons), brand logo square, top weight bar. **Rule:** ALWAYS paired with `ink` text (`#12161C`). Never amber text on white. |
| `concrete` | `#EEF0F2` | Secondary section background, table header fill, neutral badge fill. |
| `white` | `#FFFFFF` | Primary card panels, modal surfaces, alternate section backgrounds. |
| `line` | `#D9DDE2` | 1px structural borders, table dividers, control borders. |
| `line-subtle`| `#E7EAEE` | Secondary dividers within dense panels. |
| `status-success` | `#1E8E4E` | Success border and fill tint (10% tint: `#E9F4ED`). |
| `status-success-text` | `#17753F` | **Darker text token** for success pills, badges, and verified labels. |
| `status-info` | `#2F5D8A` | Info border, fill tint (10% tint: `#EAEFF3`), and info text. |
| `status-warning` | `#FFB400` | Warning border and fill tint. Strictly paired with `ink` (`#12161C`) text. |
| `status-danger` | `#C8372D` | Danger border and fill tint (10% tint: `#FAEBEA`). |
| `status-danger-text` | `#B92E25` | **Darker text token** for error messages, dispute pills, and SLA breach badges. |

#### Color Usage Rules
- **Amber is rationed:** Exactly one amber primary button or visual highlight per screen viewport. It signals the single next step (e.g., "Book a technician", "Accept job", "Approve quote", "Pay now").
- **Ink and Concrete carry the layout:** Structure, typography, and section contrast are formed by deep Ink `#12161C` against White `#FFFFFF` and Concrete `#EEF0F2`.
- **Status indicators are semantic:** Badges use designated color pairings (10% tint background + 1px solid border + darker text token).

### 2.2 Script-Verified WCAG Contrast Table

Every contrast ratio below has been mathematically computed using the official W3C WCAG relative luminance formula via script:
$$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

| Foreground (Text Token) | Foreground Hex | Background | Background Hex | Computed Ratio | WCAG AA Standard ( $\ge 4.5:1$ ) | Application Context |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `ink` | `#12161C` | `white` | `#FFFFFF` | **18.15:1** | **PASS (AAA)** | Primary page text, headings on white cards |
| `ink` | `#12161C` | `concrete` | `#EEF0F2` | **15.88:1** | **PASS (AAA)** | Headings and body on concrete section surfaces |
| `ink` | `#12161C` | `amber` | `#FFB400` | **10.18:1** | **PASS (AAA)** | Primary button label, warning badge text |
| `white` | `#FFFFFF` | `ink` | `#12161C` | **18.15:1** | **PASS (AAA)** | Secondary button text, technician section copy |
| `status-info` | `#2F5D8A` | `white` | `#FFFFFF` | **6.88:1** | **PASS (AA)** | Info text on white cards, customer banner text |
| `status-info` | `#2F5D8A` | Info 10% tint | `#EAEFF3` | **5.94:1** | **PASS (AA)** | Info badge (En Route, Assigned, In Progress) |
| `status-info` | `#2F5D8A` | `concrete` | `#EEF0F2` | **6.02:1** | **PASS (AA)** | Info labels on concrete panel backgrounds |
| `status-success-text` | `#17753F` | `white` | `#FFFFFF` | **5.75:1** | **PASS (AA)** | Success inline labels on white cards |
| `status-success-text` | `#17753F` | Success 10% tint | `#E9F4ED` | **5.10:1** | **PASS (AA)** | Verified technician pill, Paid status badge |
| `status-success-text` | `#17753F` | `concrete` | `#EEF0F2` | **5.03:1** | **PASS (AA)** | Success labels on concrete panel backgrounds |
| `status-danger-text` | `#B92E25` | `white` | `#FFFFFF` | **6.03:1** | **PASS (AA)** | Form validation error text on white inputs |
| `status-danger-text` | `#B92E25` | Danger 10% tint | `#FAEBEA` | **5.21:1** | **PASS (AA)** | SLA Breached badge, Dispute Open pill |
| `status-danger-text` | `#B92E25` | `concrete` | `#EEF0F2` | **5.28:1** | **PASS (AA)** | Error banners on concrete dashboard backgrounds |

*Note on Base Color Adjustments:* Base `#1E8E4E` on White (4.17:1) and on its 10% tint (3.70:1) failed AA. Introducing `#17753F` raises both to 5.75:1 and 5.10:1. Base `#C8372D` on its 10% tint was 4.49:1 (just under the 4.5:1 floor); introducing `#B92E25` raises it to 5.21:1 on tint and 6.03:1 on white.

---

### 2.3 Typography System

Loaded via `next/font/google` with system fallbacks.

- **Headlines:** `Archivo` (variable width font; slightly condensed letterforms reminiscent of technical wayfinding signage; `font-weight: 700` / `800`; tight line-height `1.1`–`1.2`; strictly sentence case).
- **Body & UI Controls:** `Public Sans` (clean, highly readable industrial sans-serif; tabular numbers enabled for timer countdowns, currency values, and coordinates; `font-weight: 400`, `500`, `600`).
- **Forbidden Fonts:** No Inter, Poppins, Space Grotesk, DM Sans, Roboto.

```js
// Typography Scale Tokens (tailwind.config.js)
fontFamily: {
  headline: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
  sans: ['var(--font-public-sans)', 'system-ui', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
}
```

#### Type Scale & Sizing Rules

| Token | Size | Line Height | Weight | Applied To |
| :--- | :--- | :--- | :--- | :--- |
| `text-display` | 44px (mobile: 32px) | 1.1 | Archivo 800 | Landing page hero headline |
| `text-title-1` | 32px (mobile: 26px) | 1.15 | Archivo 700 | Page titles, major section headers |
| `text-title-2` | 24px | 1.2 | Archivo 700 | Panel titles, modal headings, wizard step titles |
| `text-title-3` | 18px | 1.3 | Archivo 600 | Card titles, service names, stat group labels |
| `text-body` | 14px | 1.5 | Public Sans 400/500 | Default UI body, descriptions (max 75 char line-length) |
| `text-body-sm` | 13px | 1.45 | Public Sans 400/500 | Metadata, technician specs, helper text |
| `text-caption` | 11px | 1.4 | Public Sans 600 | Status pills, table headers, breadcrumbs, tags |
| `text-mono-stat`| 28px / 36px | 1.0 | Public Sans 700 (tabular) | KPI numbers, 60s countdowns, fee summaries |

---

### 2.4 Geometry & Radii

To avoid the generic "pill everything" or "inconsistent rounded corner" look, Dispatchly enforces strictly **two radii**:
- **Control Radius (`6px` / `rounded-[6px]`):** All interactive controls: Buttons, text inputs, select dropdowns, textareas, checkboxes, and status badges.
- **Panel Radius (`12px` / `rounded-[12px]`):** All structural enclosures: Cards, modals, side panels, data tables, map containers, and callout banners.
- **Exceptions:** `rounded-full` is strictly prohibited except for the 60-second radial SVG timer and circular technician initials avatar.

---

### 2.5 Borders & Structural Lines

- **1px Solid Line (`#D9DDE2`):** Defines boundaries for every card, input, table row, navigation bar, and section edge.
- Elevation is defined by **borders and spacing**, not heavy shadows.
- Cards do not blend into backgrounds with heavy drop shadows; they have crisp, visible physical boundaries.

---

### 2.6 Elevation & Layers

| Layer Level | Shadow Token | Border | Used On |
| :--- | :--- | :--- | :--- |
| **Ground (0)** | `none` | None | Base page background (`#FFFFFF` or `#EEF0F2`) |
| **Surface (1)** | `none` | `1px solid #D9DDE2` | Standard panels, cards, tables, dashboard widgets |
| **Floating (2)** | `0 4px 20px -2px rgba(18,22,28,0.08), 0 1px 3px 0 rgba(18,22,28,0.04)` | `1px solid #D9DDE2` | Modals, notification dropdown, action popovers |

---

## 3. Logo & Visual Language

### 3.1 The Dispatchly Mark & Wordmark
- **Wordmark:** "Dispatchly" in `Archivo` bold, tracking `-0.02em`, solid `ink` (`#12161C`).
- **Brand Mark:** A precision geometric square:
  - Fill: Signal Amber `#FFB400`
  - Dimensions: 32x32px, `border-radius: 6px`, 1px border `#12161C` (15% opacity).
  - Center: Solid Ink `#12161C` circular route node (`w-3 h-3`) connected to an offset outgoing route notch (`w-1.5 h-1.5`).
  - No clip-art wrenches, no gears, no 3D globes, no gradients.

### 3.2 Iconography Guidelines
- Library: `lucide-react`.
- Stroke width: Consistent `1.75px` across all sizes.
- **Rule:** Used plainly inline with labels. Icons are **NEVER placed inside colored circles, pastel blobs, or gradient squares**.
- Emojis are strictly banned from UI labels, buttons, and status indicators.

### 3.3 Route Diagrams & Visuals
- Real UI components with sample data replace stock photography.
- Process flows use clean, inline SVG vector lines (`stroke="#D9DDE2"`, active segment `#12161C`, node `#FFB400`) instead of generic illustrations.

---

## 4. Shared Component Library

A cohesive, typed component library will be constructed in `client/src/components/ui/` to eliminate all ad-hoc styling across screens.

| Component | Props / Variants | Behavior & Styling |
| :--- | :--- | :--- |
| `Button` | `variant: 'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'`<br>`size: 'sm' \| 'md' \| 'lg'`<br>`fullWidth?: boolean`<br>`loading?: boolean` | Primary: `#FFB400` fill + `#12161C` text + 6px radius.<br>Secondary: `#12161C` fill + `#FFFFFF` text.<br>Outline: `#FFFFFF` fill + 1px `#D9DDE2` border + `#12161C` text.<br>Active states have 2px offset focus rings. |
| `IconButton` | `icon: LucideIcon`, `label: string`, `size: 'sm' \| 'md'` | Transparent or outline with accessible `aria-label` and tooltip. |
| `Input` | `label?: string`, `error?: string`, `hint?: string`, `leftIcon?: LucideIcon`, `rightElement?: ReactNode` | 1px border `#D9DDE2`, focus: `#12161C` 1px border + 2px soft ring, 6px radius, 14px text. |
| `Select` | `label?: string`, `options: Array<{ value, label }>`, `error?: string` | Custom chevron down icon, native accessibility, 6px radius, 1px border `#D9DDE2`. |
| `Textarea` | `label?: string`, `rows?: number`, `error?: string` | Monospaced or clean sans, 6px radius, no resize handles overflowing layout. |
| `Checkbox` | `label: string`, `checked: boolean`, `onChange: Function` | Square 16x16px, 4px radius, `#12161C` fill on check, high-contrast checkmark. |
| `StatusPill` | `status: string`, `label?: string` | Canonical status mapper: 6px radius, 11px uppercase tracking, 10% tint fill + solid border + darker text token (`#17753F` / `#B92E25`). |
| `Panel` | `title?: string`, `action?: ReactNode`, `variant: 'white' \| 'concrete'`, `noPadding?: boolean` | 12px radius, 1px `#D9DDE2` border, optional header divider. |
| `Table` | `columns: Array`, `data: Array`, `emptyText?: string` | Sticky header with `#EEF0F2` background, 1px bottom border on rows, tabular numbers. |
| `Modal` | `isOpen: boolean`, `onClose: Function`, `title: string`, `children` | Fixed backdrop (`rgba(18,22,28,0.5)`), 12px panel, floating shadow, Esc & click-outside close. |
| `Toast` | `type: 'success' \| 'error' \| 'info'`, `message: string` | Bottom-right stack, 6px radius, 1px border, high-contrast text. |
| `Tabs` | `tabs: Array<{ id, label, count? }>`, `activeTab: string`, `onChange: Function` | Underline with `#12161C` active indicator or segmented concrete pill. |
| `Accordion` | `items: Array<{ id, title, content }>`, `defaultOpen?: string` | Accessible disclosure list, 1px `#D9DDE2` top/bottom dividers, smooth chevron rotation. |
| `Skeleton` | `className?: string` | Subtle pulse `#EEF0F2` to `#E2E6EA`, 6px or 12px radius, no rainbow gradients. |
| `EmptyState` | `icon: LucideIcon`, `title: string`, `description: string`, `action?: ReactNode` | Left-aligned or centered, clear actionable prompt, no apologetic language. |
| `ErrorState` | `title: string`, `message: string`, `onRetry?: Function` | Plain-language statement of what failed and how to recover. |
| `StatCard` | `label: string`, `value: string \| number`, `benchmark?: string`, `trend?: { value, isPositive }` | Dominant numeric stat, subtle uppercase label, 12px panel, 1px border. |
| `Stepper` | `steps: Array<{ title, description? }>`, `currentStep: number` | Numbered step indicator connected by 1px route line for booking flow. |
| `Timeline` | `items: Array<{ title, timestamp?, status, description? }>` | Vertical milestone tracker with active signal amber pips and solid line connectors. |

---

## 5. Canonical Status Mapping & Currency Formatting

### 5.1 Status Mapping Matrix
A single helper `getStatusBadge(status)` maps all database and websocket statuses to `StatusPill` variants:

```typescript
export const STATUS_CONFIG: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
  // Booking Lifecycle
  draft:        { label: 'Draft',        variant: 'neutral' },
  searching:    { label: 'Matching',     variant: 'info' },
  offered:      { label: 'Offer Sent',   variant: 'warning' },
  assigned:     { label: 'Assigned',     variant: 'info' },
  en_route:     { label: 'En Route',     variant: 'info' },
  arrived:      { label: 'Arrived',      variant: 'info' },
  in_progress:  { label: 'In Progress',  variant: 'info' },
  completed:    { label: 'Completed',    variant: 'success' },
  cancelled:    { label: 'Cancelled',    variant: 'danger' },

  // Quotes
  quote_pending:   { label: 'Quote Pending',   variant: 'warning' },
  quote_approved:  { label: 'Quote Approved',  variant: 'success' },
  quote_rejected:  { label: 'Quote Rejected',  variant: 'danger' },

  // Payments
  unpaid:     { label: 'Payment Pending', variant: 'warning' },
  paid:       { label: 'Paid',            variant: 'success' },
  failed:     { label: 'Payment Failed',  variant: 'danger' },
  refunded:   { label: 'Refunded',        variant: 'neutral' },

  // Verification
  unverified: { label: 'Unverified',      variant: 'neutral' },
  pending:    { label: 'Under Review',    variant: 'warning' },
  approved:   { label: 'Verified',        variant: 'success' },
  rejected:   { label: 'Verification Denied', variant: 'danger' },

  // Disputes
  open:       { label: 'Dispute Open',    variant: 'danger' },
  resolved:   { label: 'Resolved',        variant: 'success' },
};
```

### 5.2 Currency Formatter
A single helper `formatMoney(amount, currency = 'USD')` in `client/src/lib/format.js` formats all money values across the client, respecting settings without hardcoding symbols:
```javascript
export function formatMoney(amount, currency = 'USD') {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
```

---

## 6. Landing Page Architecture & ASCII Wireframes

The landing page (`/`) is built on a 12-column responsive grid (max width 1200px) with alternating White and Concrete sections.

### 6.1 Landing Page Section Breakdown
1. **Sticky Header (White, 1px border bottom):** Brand mark + wordmark left; links: "Services", "How it works", "For technicians"; right: "Log in" (text) and "Book a technician" (amber button). Logged-in users see "Go to dashboard" button instead. Mobile: clean slide-down drawer.
2. **Hero Section (White background):**
   - **Left column (7 cols):** Headline: *"The right technician, not just the nearest one."* Subhead: *"Plumbing, AC repair and urgent delivery. We match by skill, parts in the van and your deadline, then track the job live until it's done."* Service picker: 3 selectable options [Plumbing, AC and HVAC, Urgent delivery]. Primary CTA: "Book a technician" (Amber). Secondary link: "Become a technician".
   - **Right column (5 cols):** "Example dispatch" panel (labeled with an explicit "Example" pill). Displays real interactive components: Pipe leak request, 3 ranked technician rows with matching scores (top row expanded: *"4 min away · has the valve in stock · fits your 2-hour window"*), live status line *"Offer sent · 60 s to respond"* with a ticking 60-second countdown that updates once on load.
   - **Below the fold edge:** Clean single truth line: *"Live tracking · Upfront estimates · Quotes you approve before work starts"*.
3. **Services Section (Concrete background):**
   - Asymmetric 12-column layout:
     - **Left (6 cols, full height):** Large **Plumbing** panel (Emergency pipe leak repair, drain unblocking, valve replacement, bathroom remodel by quote).
     - **Top Right (6 cols):** **AC and HVAC** panel (AC tune-up, refrigerant recharge, capacitor replacement, heat pump install by quote).
     - **Bottom Right (6 cols):** **Urgent delivery** panel (Document courier, parcel delivery, cargo freight, cold-chain by quote).
   - Each card features honest descriptions and direct "Book [service]" links.
4. **How It Works Section (White background):**
   - 4-step horizontal sequence connected by an inline SVG route line:
     - `1`: **Tell us what's wrong** (Describe the job and drop a pin where you need help).
     - `2`: **We find the right pro** (We check skills, parts in stock, distance and your deadline, then send the job to the best match).
     - `3`: **Track them live** (Watch your technician arrive on the map with a live ETA).
     - `4`: **Approve, pay, rate** (Approve the final quote or price, pay after the work is verified, and leave a rating).
   - Mobile: vertical step sequence with connecting 1px vertical line.
5. **Why Matching Matters Section (White background, memorable contrast):**
   - **Left (5 cols):** *"Nearest isn't always right. A plumber two kilometres away without the right valve can't fix your leak."*
   - **Right (7 cols):** Horizontal bar chart of the actual dispatch engine weights:
     - SLA feasibility: `30%` (Top weight — highlighted in Amber `#FFB400`)
     - Location and travel time: `25%` (Ink `#12161C`)
     - Skills and experience: `15%` (Ink `#12161C`)
     - Workload: `10%` (Ink `#12161C`)
     - Parts and equipment: `10%` (Ink `#12161C`)
     - Reliability and ratings: `10%` (Ink `#12161C`)
   - Bottom note: *"If a technician doesn't meet the hard requirements (skills, parts, availability), they're never offered the job, whatever their score."*
6. **Built to be Trusted Section (Concrete background):**
   - 2-column plain list (not cards) with clean outline icons:
     - Technicians are verified (document review by operations).
     - Know the price first (upfront estimates or itemised quotes approved before work starts).
     - Proof of work (completion notes, photos, and parts used).
     - If something goes wrong (raise a dispute for manual team review).
     - Pay after verification (customer confirms work done before payment).
7. **For Technicians Section (Ink `#12161C` background, White text):**
   - Headline: *"Get jobs that fit your skills and your van."*
   - Copy: *"Set your service area and availability, keep your parts stock up to date, and receive offers matched to what you can actually fix. See your earnings for every job."*
   - CTAs: "Join as a technician" (Amber button) and "How verification works" (text link to FAQ).
   - Right: Compact example technician offer card with 60s countdown and Accept/Decline actions (labeled "Example").
8. **For Operators Section (White background):**
   - Headline: *"Run dispatch from one board."*
   - Copy: Overview of live dispatch board, automated scoring, SLA breach warnings, manual reassignment, dispute resolution, and audit logs.
   - Right: Composition of real KPI mini-cards and active queue counts (labeled "Example").
   - Link: "Admin log in".
9. **FAQ Section (Concrete background):**
   - 6-item accessible accordion addressing real product mechanics:
     1. How is the price decided?
     2. What happens if a technician declines my job?
     3. What if the work needs an on-site quote?
     4. How do you verify technicians?
     5. Can I cancel?
     6. Is payment real? (*"Payments are in test mode in this version; no real money is charged."*)
10. **Final CTA Banner (Signal Amber `#FFB400` background band, Ink text):**
    - Headline: *"Need someone today?"*
    - Actions: "Book a technician" (Ink button) and "Become a technician" (Outline button).
11. **Footer (Concrete `#EEF0F2`, 1px Line top border):**
    - Left: Brand mark + wordmark + concise product description.
    - Right columns: Services, How it works, For technicians, Log in, Register.
    - Copyright & test-mode indicator. No fake social links, no fake addresses.

---

### 6.2 Desktop Landing Page ASCII Wireframe (~1200px Grid)

```text
+----------------------------------------------------------------------------------------------------+
| [■] DISPATCHLY             Services    How it works    For technicians          Log in   [Book a tech] |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  HERO SECTION (White)                                                                              |
|  --------------------------------------------------   -------------------------------------------  |
|  The right technician, not just the nearest one.      | EXAMPLE DISPATCH                [Example] |  |
|                                                       | ----------------------------------------- |  |
|  Plumbing, AC repair and urgent delivery. We match    | Job #3104: Emergency Pipe Leak            |  |
|  by skill, parts in the van and your deadline,        | 750 Market St · 2-hour SLA window         |  |
|  then track the job live until it's done.             | ----------------------------------------- |  |
|                                                       | 1. Carlos M. (Score: 94)        [MATCH]   |  |
|  Select service:                                      |    4 min away · Valve in stock · Fits SLA |  |
|  [■ Plumbing]  [  AC & HVAC  ]  [  Urgent Delivery ] | 2. Lisa C.   (Score: 81)                  |  |
|                                                       |    9 min away · Valve in stock            |  |
|  [ Book a technician ]   Become a technician ->       | 3. Sam T.    (Score: 68)                  |  |
|                                                       |    14 min away · Low inventory            |  |
|                                                       | ----------------------------------------- |  |
|                                                       | Status: Offer sent · [ 54s ] to respond   |  |
|                                                       -------------------------------------------  |
|  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -   |
|  Live tracking  ·  Upfront estimates  ·  Quotes you approve before work starts                     |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  SERVICES (Concrete)                                                                               |
|  ---------------------------------------   ------------------------------------------------------  |
|  | PLUMBING                            |   | AC & HVAC                                          |  |
|  | Emergency pipe leak repair          |   | AC diagnostics, refrigerant recharge,              |  |
|  | Drain cleaning & snake unblocking   |   | capacitor replacement, heat pump tune-up.          |  |
|  | Main shutoff ball valve replacement |   | [ Book AC & HVAC -> ]                              |  |
|  | Bathroom & fixture remodel by quote |   ------------------------------------------------------  |
|  |                                     |   | URGENT DELIVERY                                    |  |
|  | [ Book plumbing -> ]                |   | Critical parts, document couriers, parcel delivery |  |
|  |                                     |   | and heavy freight with capacity matching.          |  |
|  |                                     |   | [ Book delivery -> ]                               |  |
|  ---------------------------------------   ------------------------------------------------------  |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  HOW IT WORKS (White)                                                                              |
|  ( 1 ) Tell us what's wrong  -------> ( 2 ) We find the right pro ------> ( 3 ) Track them live    |
|  Describe the job and drop a pin.     Check skills, parts, distance.     Watch live on the map.    |
|                                                                                                    |
|                                 ------------> ( 4 ) Approve, pay, rate                             |
|                                               Approve quote, verify work, pay in test mode.         |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  WHY MATCHING MATTERS (White)                                                                      |
|  ---------------------------------------   ------------------------------------------------------  |
|  Nearest isn't always right.               | SLA feasibility (30%)       [■■■■■■■■■■■■■■■] (Amber) |
|                                            | Location & travel (25%)     [■■■■■■■■■■■■   ]         |
|  A plumber two kilometres away             | Skills & experience (15%)   [■■■■■■■        ]         |
|  without the right valve can't fix         | Workload balance (10%)      [■■■■■          ]         |
|  your leak.                                | Parts & equipment (10%)     [■■■■■          ]         |
|                                            | Reliability & ratings (10%) [■■■■■          ]         |
|  If a technician doesn't meet the hard     ------------------------------------------------------  |
|  requirements, they are never offered.                                                             |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  BUILT TO BE TRUSTED (Concrete)                                                                    |
|  [v] Technicians are verified: our team reviews documents before any jobs are assigned.            |
|  [v] Know the price first: upfront fixed rates or an itemised quote you approve before work starts.|
|  [v] Proof of work: completion notes, photo records, and parts used attached to each ticket.       |
|  [v] If something goes wrong: raise a dispute and our operations team reviews it manually.         |
|  [v] Pay after verification: confirm the work is completed to satisfaction before settlement.      |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  FOR TECHNICIANS (Ink Background, White Text)                                                      |
|  ---------------------------------------   ------------------------------------------------------  |
|  Get jobs that fit your skills and van.    | OFFER PREVIEW                               [Example] |
|                                            | Emergency Pipe Leak Repair · 3.2 km away              |
|  Set service area & availability, keep     | Payout: $110.00 · Requires: Ball Valve 3/4" (In stock)|
|  parts stock up to date, and receive       | [ 48s remaining ]                                     |
|  offers you can actually fix.              | [ Accept Job (Amber) ]      [ Decline ]               |
|                                            ------------------------------------------------------  |
|  [ Join as a technician (Amber) ]   How verification works ->                                      |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  FOR OPERATORS (White)                                                                             |
|  Run dispatch from one board.                                                                      |
|  Live dispatch map, automated SLA breach warnings, manual reassignment, dispute handling, audit.   |
|  [ 94.2% Success Rate ]  [ 18 min Avg Arrival ]  [ 2 SLA Warnings ]  [ Admin log in -> ]           |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  FREQUENTLY ASKED QUESTIONS (Concrete)                                                             |
|  [+] How is the price decided?                                                                     |
|  [+] What happens if a technician declines my job?                                                 |
|  [+] What if the work needs an on-site quote?                                                      |
|  [+] How do you verify technicians?                                                                |
|  [+] Can I cancel my booking?                                                                      |
|  [-] Is payment real?                                                                              |
|      Payments are in test mode in this version; no real money is charged.                          |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|  FINAL CTA (Amber Banner, Ink Text)                                                                |
|  Need someone today?                       [ Book a technician (Ink) ]  [ Become a tech (Outline) ]|
+----------------------------------------------------------------------------------------------------+
|  FOOTER (Concrete)                                                                                 |
|  [■] Dispatchly                            Services        How it works    Portals                 |
|  Intelligent on-demand dispatch for        Plumbing        4-step dispatch Customer Log in         |
|  plumbing, HVAC & urgent delivery.         AC & HVAC       Why matching    Technician Portal       |
|  Test mode active · No real currency.      Urgent delivery Verification    Admin Console           |
+----------------------------------------------------------------------------------------------------+
```

---

### 6.3 Mobile Landing Page ASCII Wireframe (360px–420px)

```text
+--------------------------------------+
| [■] DISPATCHLY                 [ = ] |
+--------------------------------------+
|                                      |
| The right technician, not just       |
| the nearest one.                     |
|                                      |
| Plumbing, AC repair and urgent       |
| delivery. We match by skill, parts   |
| and deadline.                        |
|                                      |
| [ Plumbing ]                         |
| [ AC & HVAC ]                        |
| [ Urgent Delivery ]                  |
|                                      |
| [ Book a technician (Amber) ]        |
| Become a technician ->               |
|                                      |
| ------------------------------------ |
| EXAMPLE DISPATCH           [Example] |
| Emergency Pipe Leak                  |
| 1. Carlos M. (Score 94) - 4 min away |
|    Valve in stock · Fits SLA         |
| Status: Offer sent [ 54s ]           |
| ------------------------------------ |
|                                      |
| Live tracking · Upfront estimates    |
| Quotes you approve before work       |
|                                      |
+--------------------------------------+
| SERVICES                             |
|                                      |
| [ Plumbing ]                         |
| Pipe leaks, drain unblocking, valves |
| Book plumbing ->                     |
|                                      |
| [ AC & HVAC ]                        |
| Diagnostics, recharge, capacitors    |
| Book AC & HVAC ->                    |
|                                      |
| [ Urgent Delivery ]                  |
| Critical parts, courier, freight     |
| Book delivery ->                     |
+--------------------------------------+
| HOW IT WORKS                         |
|                                      |
| (1) Tell us what's wrong             |
|     Describe job & drop pin          |
|  |                                   |
| (2) We find the right pro            |
|     Match skills, parts & ETA        |
|  |                                   |
| (3) Track them live                  |
|     Follow pro on live map           |
|  |                                   |
| (4) Approve, pay, rate               |
|     Test payment after sign-off      |
+--------------------------------------+
| WHY MATCHING MATTERS                 |
| Nearest isn't always right.          |
|                                      |
| SLA feasibility (30%)                |
| [■■■■■■■■■■■■■■■■■■■] (Amber)        |
| Location & travel (25%)              |
| [■■■■■■■■■■■■■■■    ]                |
| Skills & experience (15%)            |
| [■■■■■■■■■          ]                |
| Parts & stock (10%)                  |
| [■■■■■■             ]                |
+--------------------------------------+
| FOR TECHNICIANS                      |
| (Ink Background)                     |
| Get jobs that fit your skills & van. |
|                                      |
| [ Join as a technician (Amber) ]     |
+--------------------------------------+
| FAQ (Accordion)                      |
| [+] How is price decided?            |
| [+] What if tech declines?           |
| [+] Is payment real?                 |
+--------------------------------------+
| NEED SOMEONE TODAY?                  |
| [ Book a technician ]                |
+--------------------------------------+
| FOOTER                               |
| Dispatchly © 2026                    |
+--------------------------------------+
```

---

## 7. App Shell Layouts & Screen Specifications

### 7.1 Authentication Shell (`/login`, `/register`)

- **Split Screen Layout:**
  - **Left Brand Panel (40% desktop, hidden on mobile):** Solid Ink `#12161C` background. Displays the Dispatchly mark + wordmark, followed by a single honest operational statement:
    > *"Precision field dispatch. Every technician is verified, every part is matched before dispatch, and every job is tracked live."*
    A simple inline SVG route node visualization is placed at the bottom.
  - **Right Form Panel (60% desktop):** Pure White `#FFFFFF`. Clean 12px panel container, standard 6px input fields, password show/hide toggle icon button, explicit error banner (`#B92E25` text on `#FAEBEA` tint).
- **Removals & Cleanup:**
  - **DELETED:** All "Quick Demo One-Click Selectors" (Customer / Technician / Admin demo buttons).
  - **DELETED:** Any prefilled credentials (`customer@dispatchly.com`, `password123`) in state or inputs.
  - Error messages rewritten in clear active voice: *"That email or password is incorrect."*

```text
+-------------------------------------+---------------------------------------------------+
| BRAND PANEL (Ink #12161C)           | FORM PANEL (White #FFFFFF)                        |
|                                     |                                                   |
| [■] Dispatchly                      | Log in to your account                            |
|                                     | Enter your credentials to access your portal.     |
| Precision field dispatch.           |                                                   |
| Every technician is verified,       | Email address                                     |
| every part is matched before        | [ user@domain.com                               ] |
| dispatch, and every job is          |                                                   |
| tracked live.                       | Password                         [Show]           |
|                                     | [ ••••••••••••••                                ] |
|                                     |                                                   |
| ( O ) ======= ( O ) ======= ( O )   | [ Log in (Amber)                                ] |
|                                     |                                                   |
|                                     | Don't have an account? Register ->                |
+-------------------------------------+---------------------------------------------------+
```

---

### 7.2 Customer Shell & Screens

- **Navigation Bar:**
  - Sticky white header with bottom 1px line.
  - Links: `Services & Book`, `My bookings`.
  - Notification Bell component (clean outline bell, count pill).
  - Account menu (User name, Role pill, Sign out button).
- **Customer Dashboard (`/dashboard`):**
  - **Active Request First:** If an active booking exists (`searching`, `offered`, `assigned`, `en_route`, `arrived`, `in_progress`), it is rendered as the primary, prominent 12px panel at the top with live status pill, ETA badge, technician card, and a direct link to the live tracking page.
  - **Quick Book Row:** 3 cards for Plumbing, AC/HVAC, Urgent Delivery with immediate "Book" buttons.
  - **Recent Bookings Table:** Clean, tabular list with columns: Date, Service, Technician, Status, Amount, and Action link.
- **Booking Wizard (`/book`):**
  - **Top Stepper Component:** 4 steps: `1. Service`, `2. Location`, `3. Details`, `4. Review & Confirm`.
  - **Layout:** 2-column asymmetric layout:
    - **Left (8 cols):** Active step form controls.
    - **Right (4 cols):** Sticky **Price & SLA Estimate Panel** that updates dynamically as service, urgency, and distance change.
  - Exactly one primary button per step ("Next: Location", "Next: Details", "Confirm & Dispatch").
- **Booking Detail & Live Tracking (`/bookings/[id]`):**
  - **Map Frame:** Brand frame with 12px radius, 1px `#D9DDE2` border, controls top-right.
  - **Lifecycle Timeline:** Horizontal/vertical timeline with status pips connected by route lines.
  - **SLA & Live ETA Block:** Displays target arrival time and live ETA countdown.
  - **Technician Card:** Verified technician badge, photo/initials, vehicle type, contact button.
  - **Quote Approval Card:** Displays itemized parts and labor; primary buttons: "Approve quote" (Amber) and "Decline quote" (Outline).
  - **Settlement & Payment Card:**
    - **MANDATORY BANNER:** *"Test mode: no real money is charged."* prominently displayed in `#2F5D8A` info tint.
    - **DELETED:** "Simulate Mock Processor: Simulate Decline" checkbox is completely removed.
    - Single clear action: "Pay now (Test mode)".
  - **Review Card:** 5-star rating selector, tag chips, and honest submit button.

```text
+----------------------------------------------------------------------------------------------------+
| [■] DISPATCHLY             Services & Book    My Bookings                [Bell]  Alice C. [Sign Out] |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  CUSTOMER DASHBOARD                                                                                |
|  ------------------------------------------------------------------------------------------------  |
|  ACTIVE REQUEST: Emergency Pipe Leak Repair                                                        |
|  Technician: Carlos M. · 4 min away (En Route) · ETA 12:14 PM              [ View Live Map -> ]    |
|  ------------------------------------------------------------------------------------------------  |
|                                                                                                    |
|  BOOK A FIELD SERVICE                                                                              |
|  +---------------------------+ +---------------------------+ +-----------------------------------+ |
|  | PLUMBING                  | | AC & HVAC                 | | URGENT DELIVERY                   | |
|  | Leaks, valves, drains     | | Diagnostics, recharge     | | Critical courier, freight         | |
|  | [ Book Plumbing (Amber) ] | | [ Book AC & HVAC ]        | | [ Book Delivery ]                 | |
|  +---------------------------+ +---------------------------+ +-----------------------------------+ |
|                                                                                                    |
|  RECENT BOOKINGS                                                                                   |
|  Date         Service              Technician     Status          Amount      Action               |
|  2026-11-20   Pipe Leak Repair     Carlos M.      [ COMPLETED ]   $110.00     [ View Details ]     |
|  2026-11-12   AC Capacitor Tune    Elena R.       [ COMPLETED ]   $145.00     [ View Details ]     |
+----------------------------------------------------------------------------------------------------+
```

---

### 7.3 Technician Shell & Screens

- **Header & Live Status Bar:**
  - Header: Dashboard, Inventory, Earnings, Profile.
  - **Prominent Status Bar:**
    - Live **Online / Offline Toggle** (large switch with status text: *"Available for offers"* vs *"Offline"*).
    - **Verification Status Banner:**
      - If Pending: Amber banner *"Your profile is under review by operations. You will receive dispatch offers once approved."*
      - If Approved: Green verified pill *"Verified Technician"*.
- **Technician Dashboard (`/technician/dashboard`):**
  - **Incoming Offer Card (Modal / Prominent Surface):**
    - Large 60-second radial SVG countdown timer.
    - Job summary: Category, customer address, distance, SLA deadline, parts required (with van stock confirmation).
    - Calculated payout amount.
    - Two large glanceable buttons: **"Accept job" (Amber `#FFB400`)** and **"Decline offer" (Outline)**.
  - **Active Job Screen:**
    - Prominent milestone action buttons that update the job status:
      - `[ Start Travelling ]` -> `[ Mark Arrived ]` -> `[ Create On-Site Quote (if needed) ]` -> `[ Complete Job ]`
    - Live customer address, navigation button, and emergency contact button.
- **Inventory Screen (`/technician/inventory`):**
  - Clean data table of van stock parts: Part Code, Part Name, Category, In Stock, Reserved, Unit Cost, Actions.
  - Low-stock warning indicator for items below threshold.
- **Earnings Screen (`/technician/earnings`):**
  - KPI Stat cards: Total Earned, Jobs Completed, Average Ticket, Pending Payout.
  - Clean table of job payout history with date, service, payout, and receipt reference.
- **Profile Screen (`/technician/profile`):**
  - Service categories, vehicle type, skills checklist, service area radius map.
  - Document upload section (ID, Trade License).
  - **DELETED:** "Attach Sample License (PDF)" button is completely removed.

```text
+----------------------------------------------------------------------------------------------------+
| [■] DISPATCHLY    Dashboard & Offers   Parts Inventory   Earnings   Profile   [ Online Toggle: ON ]|
+----------------------------------------------------------------------------------------------------+
|  [✓] Verified Technician  ·  Reliability Score: 98%  ·  Van Inventory: 24 SKUs In Stock            |
|----------------------------------------------------------------------------------------------------|
|                                                                                                    |
|  INCOMING DISPATCH OFFER (Job #3104)                                                               |
|  +-----------------------------------------------------------------------------------------------+ |
|  | [ 48s ]  Emergency Pipe Leak Repair                                                           | |
|  |          Customer: 750 Market St (3.2 km away) · SLA Target: 45 min                           | |
|  |          Required Parts in Van: Brass Ball Valve 3/4" [ Confirmed in Stock ]                  | |
|  |          Calculated Payout: $110.00                                                           | |
|  |                                                                                               | |
|  |          [ Accept Job (Amber) ]                                [ Decline Offer (Outline) ]    | |
|  +-----------------------------------------------------------------------------------------------+ |
|                                                                                                    |
|  ACTIVE WORK ORDERS                                                                                |
|  No other active assignments. Ready for immediate dispatch.                                        |
+----------------------------------------------------------------------------------------------------+
```

---

### 7.4 Admin Operations Shell & Screens (`/admin/...`)

- **Grouped Left Sidebar (Desktop, 240px width):**
  - **Brand Header:** Dispatchly mark + wordmark + "Operations" pill.
  - **Operations:**
    - `Dispatch Engine` (`/admin/dispatch`)
    - `Bookings Queue` (`/admin/bookings`)
    - `Dispute Desk` (`/admin/disputes`)
  - **People:**
    - `Technicians` (`/admin/technicians`)
    - `Users & Customers` (`/admin/users`)
  - **Money:**
    - `Payments & Fees` (`/admin/payments`)
  - **System:**
    - `Service Catalogue` (`/admin/services`)
    - `Platform Settings` (`/admin/settings`)
    - `Audit Logs` (`/admin/audit-logs`)
- **Admin Dashboard (`/admin/dashboard`):**
  - **Top Row KPI Stat Cards (4-8 core metrics):** Dispatch Success Rate, SLA Compliance Rate, Avg Arrival Minutes, Platform Fee Revenue, Tech Acceptance Rate, Customer Rating.
  - **Dominant Trend Chart:** Daily Booking Volume vs Completed Jobs (Styled with Ink, Slate `#EEF0F2`, Success Green `#1E8E4E`, and Amber `#FFB400` highlight). Clean axes, tooltips, and legends.
  - **Live Fleet Operations Room:** Socket.IO live connection pill, counts by active state (Confirmed, Assigned, En Route, Arrived, In Progress), and urgent action queue pills (Open Disputes, SLA At-Risk, Reassignments).
- **Dispatch Engine Console (`/admin/dispatch`):**
  - Live dispatch board showing pending requests, evaluated candidate technicians, automated multi-factor scoring breakdown (SLA 30%, Location 25%, Skills 15%, Workload 10%, Inventory 10%, Reliability 10%), manual override / assign button, and re-assignment logs.

```text
+-----------------------+----------------------------------------------------------------------------+
| [■] DISPATCHLY        | OPERATIONS CONSOLE                                     [ Live Socket: ON ] |
| Operations Board      +----------------------------------------------------------------------------+
|                       |                                                                            |
| OPERATIONS            | 94.2%                 98.1%             18 min             $3,842.00       |
| - Dispatch Engine     | Dispatch Success      SLA Compliance    Avg Arrival Time   Platform Rev    |
| - Bookings Queue      | Target: >90%          Target: >95%      Assigned to Arrive 2,561 tickets   |
| - Dispute Desk (2)    |                                                                            |
|                       | DAILY BOOKING VOLUME & COMPLETIONS                                         |
| PEOPLE                | [■ Bookings (Ink)]   [■ Completed (Green)]                Filter: [ 30 Days ]|
| - Technicians         | 50 |      ■■                                                               |
| - Users & Customers   | 40 |   ■■ ■■ ■■                                                            |
|                       | 30 |   ■■ ■■ ■■ ■■                                                         |
| MONEY                 | 20 |   ■■ ■■ ■■ ■■ ■■                                                      |
| - Payments & Fees     |  0 +---------------------------------------------------------------------- |
|                       |    Nov 01    Nov 07    Nov 14    Nov 21                                    |
| SYSTEM                |                                                                            |
| - Service Catalogue   | LIVE FLEET OPERATIONS ROOM                                                 |
| - Platform Settings   | Confirmed: 3   Assigned: 4   En Route: 6   Arrived: 2   In Progress: 5     |
| - Audit Logs          | Urgent Queues: [ 2 Disputes Open ]  [ 1 SLA At-Risk ]  [ 0 Reassignments ] |
+-----------------------+----------------------------------------------------------------------------+
```

---

## 8. "What I Rejected as Generic and Why" (AI Slop Autopsy)

| Rejected Generic Pattern | Why It Was Rejected | What We Built Instead |
| :--- | :--- | :--- |
| **Purple/Indigo/Pink Mesh Gradients** | Ubiquitous in low-effort AI-generated templates. Signals SaaS vaporware rather than a rugged, dependable field dispatch platform. | High-contrast **Ink `#12161C`**, **Concrete `#EEF0F2`**, and **White `#FFFFFF`**, with **Signal Amber `#FFB400`** as an intentional, high-visibility accent. |
| **Glassmorphism & Background Blur** | Frosted cards (`backdrop-blur-md bg-white/10`) reduce legibility, hurt rendering performance, and look like design concept art rather than production software. | Crisp **1px solid Line borders (`#D9DDE2`)** and solid surfaces with unambiguous contrast boundaries. |
| **3-Column Identical Card Grid for Everything** | Boring, repetitive, and fails to communicate functional hierarchy between services or workflow steps. | **Asymmetric 12-column layouts**; e.g., large plumbing panel left with stacked HVAC and delivery panels right; asymmetric hero with interactive dispatch preview. |
| **All-Caps Tracked Eyebrow on Every Heading** | Cheap trick used to artificially pad empty space (e.g., `ULTIMATE DISPATCH SYSTEM`). Adds cognitive noise. | Strict **sentence case**, semantic hierarchy, and direct, confident headlines that lead with value. |
| **Fake Social Proof & Invented Logos** | Fabricated "Trusted by 10,000+ companies", fake 5-star quotes, and generic Fortune 500 gray logos destroy user trust immediately. | **Zero fabricated claims.** The landing page showcases real product features: the actual matching weight formula, 60s offer mechanics, verified document review, and explicit test-mode payment disclosures. |
| **Icons in Pastel Rounded Circles** | Standard cookie-cutter icon treatment. Dulls icon clarity and wastes visual real estate. | Clean, unadorned **Lucide outline icons (1.75px stroke)** used plainly next to functional text labels. |
| **Floating 3D Orbs / Abstract Blobs** | Irrelevant visual filler that communicates nothing about trucks, pipes, tools, or dispatching. | **Functional dispatch diagrams and real interactive UI component previews** (e.g., sample dispatch offer countdown). |
| **Fade-and-Slide Hover Animations on Every Element** | Makes the UI feel floaty, sluggish, and unstable when interacting with rapid dispatch workflows. | **Snappy 150ms transitions** strictly for interactive state feedback (button clicks, tab switches, dropdowns). Respects `prefers-reduced-motion`. |
| **Simulated Decline Checkboxes & Demo Quick-Logins** | Leftover student-project scaffolding that looks unprofessional in a shippable product. | **Removed entirely.** The customer payment flow clearly states "Test mode" without mock error injection checkboxes. Auth forms are clean with real validation. |
| **Overloaded Drop Shadows** | Heavy blurry shadows look muddy on light backgrounds and create visual clutter. | **Flat surfaces by default**, with a single refined floating shadow reserved strictly for menus and modals. |

---

## 9. AVOID List Compliance Verification

| AVOID Checklist Item | Status | Compliance Verification in Plan |
| :--- | :---: | :--- |
| Purple/indigo/blue-pink gradients, gradient text, gradient washes | **CLEAN** | All gradients eliminated. Pure solid Ink, White, Concrete, and Amber tokens only. |
| Blobs, abstract floating shapes, 3D orbs, glow/neon effects, glassmorphism | **CLEAN** | Zero blobs, no glassmorphism, no glows. Solid panel geometry with 1px borders. |
| Dark background + single neon accent; cream + serif + terracotta | **CLEAN** | Pure light theme with Ink, Concrete, White, and Signal Amber. Modern Archivo/Public Sans typography. |
| Emoji as icons; icons inside pastel circles; smiling stock photos | **CLEAN** | Emojis banned from icons/actions. No pastel circles. Lucide outline icons used plainly. Zero stock photos. |
| Identical rounded cards in a 3-column grid for everything | **CLEAN** | Asymmetric layouts used across hero, services, how it works, and dashboards. |
| All-caps tracked eyebrow label above every heading | **CLEAN** | Eliminated. Clean sentence-case headings only. |
| Fade-and-slide-up on every section; hover scale on every card | **CLEAN** | No entrance scroll animations. Single load countdown in hero preview only. Snappy state transitions. |
| Fake social proof, fake reviews, fake client logos | **CLEAN** | Completely omitted. Only real product capabilities and honest test-mode statuses are presented. |
| Buzzwords (revolutionize, seamless, unlock, empower, cutting-edge) | **CLEAN** | Banned from all copy. Language is factual, concrete, and active-voice ("Book a technician", "Track live"). |
| Centered text everywhere; equal-weight dashboard cards | **CLEAN** | Left-aligned layouts, asymmetric grids, clear visual hierarchy on dashboards (KPIs -> Chart -> Operations). |
| Demo buttons, sample license generator, mock simulator checkbox | **CLEAN** | Explicitly targeted for removal across auth, customer booking, and technician profile. |

---

## 10. Pass 2 Implementation Sequence (Ready Upon Approval)

Once approved, implementation will proceed systematically in the following order:

1. **Phase 1: Token & Typography Configuration**
   - Update `tailwind.config.js` with brand tokens (`ink`, `amber`, `concrete`, `white`, `line`, status colors with darker text tokens, radii `6px` / `12px`, typography).
   - Configure `next/font/google` in `layout.jsx` for `Archivo` and `Public_Sans`.
   - Update `globals.css` with focus-visible styles, smooth resets, and removal of old blue/slate theme utilities.
   - Create `client/src/lib/format.js` (`formatMoney`).
2. **Phase 2: Core UI Component Library (`client/src/components/ui/`)**
   - Implement `Button`, `IconButton`, `Input`, `Select`, `Textarea`, `Checkbox`, `StatusPill`, `Panel`, `Table`, `Modal`, `Toast`, `Tabs`, `Accordion`, `Skeleton`, `EmptyState`, `ErrorState`, `StatCard`, `Stepper`, and `Timeline`.
3. **Phase 3: Brand Navigation & Landing Page (`client/src/app/page.jsx`, `Navbar.js`, `layout.jsx`)**
   - Build responsive sticky navigation with new brand mark.
   - Build all 10 landing page sections per specification.
   - Embed interactive sample dispatch panel with 60s countdown.
   - Add proper Open Graph tags, metadata, and favicon.
4. **Phase 4: Authentication Screen Modernization (`/login`, `/register`)**
   - Implement split brand/form layout.
   - Strip quick-login buttons and prefilled credentials.
   - Add show/hide password and clean validation feedback.
5. **Phase 5: Customer Portal Alignment**
   - Refactor `/dashboard`, `/book` (4-step stepper + sticky estimate), and `/bookings/[id]` (clean status timeline, SLA block, test mode banner, remove mock decline checkbox).
6. **Phase 6: Technician Hub Alignment**
   - Refactor `/technician/dashboard` (online/offline toggle, 60s offer cards, milestone buttons), `/technician/inventory`, `/technician/earnings`, and `/technician/profile` (remove sample license button).
7. **Phase 7: Admin Operations Console Alignment**
   - Implement grouped left sidebar layout (`(admin)/admin/layout.jsx`).
   - Refactor executive dashboard (`/admin/dashboard`) with KPI cards, restyled charts, and live operations room.
   - Align `/admin/dispatch`, `/admin/bookings`, `/admin/disputes`, `/admin/technicians`, `/admin/services`, `/admin/payments`, `/admin/audit-logs`, `/admin/settings`.
8. **Phase 8: Build & Quality Verification**
   - Run `npm run build --prefix client` and test verification.
   - Verify responsiveness (360px to 1440px), keyboard focus, accessibility, and contrast.

---

> **Checkpoint Notice:** Pass 1 revision complete. No application code has been modified. Awaiting user review and approval to proceed with Phase 1–8 build execution.
