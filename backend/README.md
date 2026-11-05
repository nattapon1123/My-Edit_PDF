# PDF Toolbox API

Run the API locally from this directory with:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Install Ghostscript before using the `/compress` endpoint. The Docker image
installs it automatically.

Set `BACKEND_CORS_ORIGINS` to a comma-separated list of exact frontend origins
when deploying, for example `https://pdf-toolbox.example.com`. If unset, only
the local Vite origin `http://localhost:5173` is allowed.
