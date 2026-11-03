# Dispatchly Production Deployment & Operations Guide

> Production deployment checklist for hosting the Express/Socket.IO backend on a Node.js container runner (Compute) and the Next.js 14 client on Sites/Edge.

---

## 1. Pre-Deployment Environment Checklist

Verify the following variables are configured in your deployment platform:

### Backend (`/server`)
| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Environment mode | `production` |
| `PORT` | **Yes** | Server port | `5000` |
| `CLIENT_URL` | **Yes** | Allowed web origin (CORS) | `https://dispatchly.app` |
| `MONGODB_URI` | **Yes** | Atlas connection string | `mongodb+srv://...` |
| `JWT_ACCESS_SECRET` | **Yes** | Min 32-character random string | `e.g. 64-hex string` |
| `JWT_REFRESH_SECRET` | **Yes** | Min 32-character random string | `e.g. 64-hex string` |
| `JWT_ACCESS_EXPIRY` | No | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | No | Refresh token TTL | `7d` |
| `STORAGE_DRIVER` | No | File driver (`local` or `s3`) | `s3` |
| `AWS_S3_BUCKET` | Cond. | S3 Bucket name (if driver=s3) | `dispatchly-prod-docs` |
| `AWS_REGION` | Cond. | AWS Region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Cond. | IAM Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY`| Cond. | IAM Secret Key | `...` |

### Frontend (`/client`)
| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | **Yes** | Public REST API base URL | `https://api.dispatchly.app/api` |
| `NEXT_PUBLIC_SOCKET_URL`| **Yes** | Public Socket.IO endpoint | `https://api.dispatchly.app` |

---

## 2. MongoDB Atlas Network Access

Before launching production instances:
1. Navigate to **MongoDB Atlas &rarr; Security &rarr; Network Access**.
2. Add the outbound static IP addresses of your backend Compute instance.
3. If running dynamic containers without static IPs, add your VPC peering connection or temporary cluster CIDR.

---

## 3. Cloud Storage Configuration (S3 / R2)

When `STORAGE_DRIVER=s3`:
1. Create a private S3 bucket (e.g., `dispatchly-documents-prod`).
2. Block all public access on the bucket.
3. Attach an IAM policy granting `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` only to the container execution role.
4. All customer and technician downloads are mediated through the authenticated backend streaming route (`/api/technicians/documents/:id/download`), preventing direct unauthenticated URL exposure.

---

## 4. Post-Deployment Smoke Test Checklist

Execute these 5-minute smoke tests on your production deployment URL:

- [ ] **Health Check**: `GET https://api.dispatchly.app/api/health` returns `HTTP 200` with `status: "healthy"` and `database: "connected"`.
- [ ] **Auth Gateway**: Log in as `admin@dispatchly.com` at `/login` and confirm JWT cookie/bearer exchange succeeds.
- [ ] **Public Catalogue**: Load `/dashboard` and verify service categories (Plumbing, HVAC, Delivery) display properly.
- [ ] **Geospatial Map**: Open `/book`, select a service, and verify Leaflet pin drop sets valid `[-180, 180]` longitude coordinates.
- [ ] **Real-Time Sockets**: Open two browser tabs (Dispatcher `/admin/dispatch` and Customer `/bookings`); confirm dispatch status changes broadcast via Socket.IO without page reload.

---

## 5. Rollback & Disaster Recovery Procedures

1. **Application Rollback**:
   - Revert your deployment container image tag to the previous known-healthy SHA.
   - Flush client-side caches by triggering a cache invalidation on the CDN distribution.

2. **Database Backup Recovery**:
   - MongoDB Atlas provides continuous point-in-time recovery (PITR).
   - If corrupted state occurs during migration, restore to the timestamp immediately preceding the deployment window.

3. **Session Invalidation**:
   - If an unauthorized access event occurs, increment user `tokenVersion` or execute:
     ```js
     await User.updateMany({}, { $inc: { tokenVersion: 1 } });
     ```
   - This immediately revokes all issued access and refresh tokens across all active browser sessions.
