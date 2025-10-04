Expense Manager API (backend)

Quickstart (Windows PowerShell):

# Create virtualenv and install
python -m venv .venv; .\.venv\Scripts\Activate; pip install -r requirements.txt

# Run migrations (none yet) and start server
uvicorn backend.app.main:app --reload --port 8000

Endpoints:
- POST /auth/signup
- POST /auth/login
- POST /expenses/ (multipart, fields + receipt file)
- GET /expenses/me

Notes:
- Uses sqlite by default at `expenses.db`.
- SECRET_KEY is set via env var or defaults to `devsecret` (change in prod).