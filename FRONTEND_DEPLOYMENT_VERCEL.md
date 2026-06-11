# Frontend Deployment Guide: Vercel

This guide covers deployment of the React/Vite frontend to Vercel.

## 1. Build Configuration Review

The frontend is already production-friendly for static hosting:

- Vite builds to `dist/`
- API base URL is controlled by `VITE_API_URL` in [frontend/src/api/client.js](/D:/JAVA/Campus%20Resource%20Sharing%20Platform/frontend/src/api/client.js)
- No server-side rendering is required

For Vercel, the frontend should be deployed as a static site with an explicit API URL.

## 2. Required Environment Variables

Set these in the Vercel project settings:

```bash
VITE_API_URL=https://your-backend-domain.com/api
VITE_WS_URL=wss://your-backend-domain.com/ws
```

Optional variables can be added if the frontend ever needs them, but these two are the minimum for production.

## 3. Deployment Steps

1. Import the repository into Vercel.
2. Select the `frontend` directory as the project root if using a monorepo import.
3. Use the default Vite build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add the environment variables above.
5. Deploy to production.

## 4. Vercel Notes

- Ensure the backend domain uses HTTPS so the browser can call it from Vercel without mixed-content issues.
- If you use custom domains, update both `VITE_API_URL` and `VITE_WS_URL` when the backend endpoint changes.
- Because the app is a client-side React application, no Vercel rewrite is required unless you want SPA fallback handling for direct route refreshes. If so, add a simple catch-all rewrite in Vercel project settings.

## 5. Frontend Production Checklist

- `npm run build` succeeds locally and in CI
- `VITE_API_URL` points at the production backend
- `VITE_WS_URL` uses the production WebSocket endpoint
- Login, register, verification, and password reset links resolve correctly
- CORS on the backend allows the Vercel domain
- Images, notes, and marketplace flows load correctly in a browser

