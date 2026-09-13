from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import exercises, gyms, logged_sets, memberships, users
from app.infra.db.session import get_db

app = FastAPI(title="RankD API")

app.include_router(users.router)
app.include_router(gyms.router)
app.include_router(memberships.router)
app.include_router(exercises.router)
app.include_router(logged_sets.router)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
