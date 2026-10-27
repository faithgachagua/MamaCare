from fastapi import APIRouter

router = APIRouter()

from . import ai, auth, care, health, home, me

router.include_router(auth.router)
router.include_router(health.router)
router.include_router(ai.router)
router.include_router(care.router)
router.include_router(home.router)
router.include_router(me.router)
