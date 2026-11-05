# PDF Toolbox

## Run locally

```powershell
npm install
npm run dev
```

The PDF compression tool calls the backend at `http://localhost:8000` by
default. To use another backend locally, copy `.env.example` to `.env.local`
and set `VITE_API_URL` to the backend base URL.

## Deploy to Cloudflare Pages

1. Deploy the `backend` directory as a Docker service and note its public base
   URL.
2. In Cloudflare Pages, set the build command to `npm run build`, the output
   directory to `dist`, and the root directory to `pdf-toolbox`.
3. Add `VITE_API_URL` as a Pages build environment variable with the backend
   base URL, then deploy the frontend.
4. Set `BACKEND_CORS_ORIGINS` on the backend to the exact Cloudflare Pages
   origin, such as `https://your-project.pages.dev`, then redeploy/restart the
   backend.

The Pages `_redirects` file routes direct requests for frontend paths to the
single-page app.
