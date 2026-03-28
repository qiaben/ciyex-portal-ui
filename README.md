# Ciyex Patient Portal

Patient-facing portal for the Ciyex EHR platform — built with Next.js, React, and Tailwind CSS. Provides patients with appointment scheduling, secure messaging, telehealth, medical records access, and billing.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| Auth | NextAuth.js + Keycloak (OAuth2/OIDC) |
| Real-time | STOMP over WebSocket |
| Charts | ApexCharts |
| Package Manager | pnpm |
| Container | Docker (node:24-alpine) |

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Running [Ciyex EHR Backend](https://github.com/ciyex-org/ciyex) API

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/ciyex-org/ciyex-portal-ui.git
cd ciyex-portal-ui
pnpm install
```

### 2. Configure environment

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_ENABLED=false
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8180
NEXT_PUBLIC_KEYCLOAK_REALM=master
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=ciyex-app
NEXT_PUBLIC_TELEHEALTH_WS_URL=ws://localhost:4443
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
NEXT_PUBLIC_ORG_ALIAS=default

# NextAuth (required)
NEXTAUTH_SECRET=generate-a-random-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build for production

```bash
pnpm build
pnpm start
```

## Docker

```bash
docker build -t ciyex-portal-ui .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://backend:8080/api \
  -e NEXTAUTH_SECRET=your-secret \
  ciyex-portal-ui
```

## Project Structure

```
src/
  app/           # Next.js App Router pages
  components/    # Reusable UI components
  context/       # React context providers
  hooks/         # Custom React hooks
  layout/        # Layout components (sidebar, header)
  utils/         # Utilities and env config
  pages/api/     # API proxy routes
```

## Related Repositories

- [ciyex](https://github.com/ciyex-org/ciyex) — EHR Backend (Spring Boot)
- [ciyex-ehr-ui](https://github.com/ciyex-org/ciyex-ehr-ui) — EHR Clinical UI (Next.js)

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).
