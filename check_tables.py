import asyncio
from src.db.session import async_session_maker
from sqlalchemy import text

async def check():
    async with async_session_maker() as s:
        result = await s.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"))
        for t in result.fetchall():
            print(t[0])

asyncio.run(check())
