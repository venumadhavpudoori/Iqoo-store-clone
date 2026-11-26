"""
main.py – FastAPI application entry point.

Start the server:
    uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import init_db
from routes.auth import router as auth_router
from routes.users import router as users_router

load_dotenv()

FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
USER_FRONTEND_ORIGIN: str = os.getenv("USER_FRONTEND_ORIGIN", "http://localhost:3001")

# ── App ────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="iQOO Platform Owner – Backend API",
    description=(
        "FastAPI backend for the iQOO store platform owner portal. "
        "Handles superadmin authentication (signup / login / logout) "
        "with PostgreSQL storage and JWT-based auth."
    ),
    version="1.0.0",
    docs_url="/docs",       # Swagger UI  → http://localhost:8000/docs
    redoc_url="/redoc",     # ReDoc       → http://localhost:8000/redoc
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, USER_FRONTEND_ORIGIN],
    allow_credentials=True,            # allow cookies to be forwarded
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(auth_router)        # /auth/*
app.include_router(users_router)       # /users/auth/*

# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "platform-owner-backend"}
