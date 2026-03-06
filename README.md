# Ticket Frontend (React + TypeScript)

Frontend app for the ticket system, connected to `ticket-backend` APIs.

## Stack
- React 18
- TypeScript
- Vite
- React Router
- Axios
- TanStack Query

## Prerequisites
- Node.js 18+ (recommended)
- Backend running at `http://localhost:8080`

## Install Dependencies
From [`/Users/sukeerth/Desktop/Ticket/Ticket-frontend`](/Users/sukeerth/Desktop/Ticket/Ticket-frontend), run:
`npm install`

## Run In Development
From [`/Users/sukeerth/Desktop/Ticket/Ticket-frontend`](/Users/sukeerth/Desktop/Ticket/Ticket-frontend), run:
`npm run dev`

Frontend runs on: `http://localhost:5173`

## Production Build
- Build: `npm run build`
- Preview build: `npm run preview`

## Backend Integration
- API base URL is configured from the Control API page.
- Default API base URL: `http://localhost:8080/api`
- JWT token is stored after login/signup and sent in `Authorization` header.
- Ticket APIs use requester identity with `X-User-Id`.

## Main Routes
- `/login`
- `/signup`
- `/forgot-password`
- `/verify-otp`
- `/control-api`
- `/space/:spaceId/board`
- `/space/:spaceId/list`
- `/space/:spaceId/summary`
- `/for-you`
- `/recent`
- `/starred`

## Auth + Setup Flow
1. Start backend (`ticket-backend`) and MySQL.
2. Open frontend and sign up/login.
3. Go to `/control-api`.
4. Confirm API base URL and requester user ID.
5. Create users/tickets and use the app normally.

## Notes
- No mock data is used.
- All data is fetched from backend APIs.
- Export CSV in List page downloads the full filtered ticket list.
