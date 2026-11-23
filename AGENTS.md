# AGENTS.md

## Dispatchly Architecture & Hosting

This project is a full-stack on-demand dispatch platform:
- **Frontend:** Next.js 14 App Router with Tailwind CSS, deployed on Vercel.
- **Backend:** Node.js Express + Mongoose + Socket.IO, containerized and deployed on **InsForge Compute** (Docker container running as an always-on service).
- **Database:** MongoDB Atlas (Mongoose ODM).

InsForge is used **ONLY** as the container hosting platform for Compute. The application does not use InsForge BaaS (Postgres database, Auth, Storage, or SDK). All application state, authentication, and data models reside in MongoDB Atlas.

CLI operations for container deployment are executed via `npx @insforge/cli compute`.

