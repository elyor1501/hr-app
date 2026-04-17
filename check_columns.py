import asyncio
from src.db.session import async_session_maker
from sqlalchemy import text

async def check():
    async with async_session_maker() as s:
        result = await s.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'candidates' AND column_name IN ('experience_level', 'hourly_rate', 'availability') ORDER BY column_name"))
        rows = result.fetchall()
        if rows:
            for row in rows:
                print(f"Column: {row[0]} | Type: {row[1]}")
        else:
            print("Columns NOT found")

asyncio.run(check())
