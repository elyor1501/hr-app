import asyncio
import httpx
import time

AI_ML_URL = "http://localhost:8001"

SAMPLE_RESUME = """John Smith
Email: john.smith@email.com | Phone: +1-555-0100
Location: New York, USA
SUMMARY
Senior Software Engineer with 8 years experience in Python and cloud infrastructure.
SKILLS
Python, FastAPI, Docker, Kubernetes, PostgreSQL, AWS, Redis, Microservices
EXPERIENCE
Senior Engineer at TechCorp | 2020 - Present
- Built microservices architecture serving 1M users
Engineer at StartupXYZ | 2018 - 2020
- Developed REST APIs using FastAPI
EDUCATION
B.Tech Computer Science | MIT University | 2014 - 2018"""

async def run_test(client, count, batch_size, max_concurrent, label):
    resumes = [{"resume_id": f"test_{i}", "raw_text": SAMPLE_RESUME} for i in range(count)]
    batches = [resumes[i:i+batch_size] for i in range(0, len(resumes), batch_size)]
    semaphore = asyncio.Semaphore(max_concurrent)

    async def call_batch(batch):
        async with semaphore:
            r = await client.post(
                f"{AI_ML_URL}/api/v1/structure/batch",
                json={"resumes": batch},
                timeout=300
            )
            return r

    start = time.time()
    responses = await asyncio.gather(*[call_batch(b) for b in batches], return_exceptions=True)
    total = time.time() - start

    extracted = 0
    for r in responses:
        if not isinstance(r, Exception) and r.status_code == 200:
            extracted += len(r.json().get("results", []))

    print(f"  {label}: {count} resumes | batch={batch_size} | concurrent={max_concurrent} | {total:.1f}s | per resume={total/count:.2f}s | extracted={extracted}")
    return total

async def main():
    print("=" * 70)
    print("FINDING OPTIMAL BATCH SIZE")
    print("=" * 70)

    async with httpx.AsyncClient(timeout=600) as client:
        print("\nWarmup...")
        await client.post(f"{AI_ML_URL}/api/v1/structure/batch",
                         json={"resumes": [{"resume_id": "w", "raw_text": SAMPLE_RESUME}]})
        await asyncio.sleep(3)

        print("\n--- Testing different batch sizes for 10 resumes ---")
        for bs in [3, 5, 10]:
            for cc in [1, 2, 3]:
                t = await run_test(client, 10, bs, cc, f"bs={bs} cc={cc}")
                await asyncio.sleep(2)

        print("\n--- Testing best config for 50 resumes ---")
        await run_test(client, 50, 5, 3, "bs=5 cc=3")
        await asyncio.sleep(3)
        await run_test(client, 50, 10, 2, "bs=10 cc=2")
        await asyncio.sleep(3)
        await run_test(client, 50, 5, 2, "bs=5 cc=2")
        await asyncio.sleep(3)

        print("\n--- Testing best config for 100 resumes ---")
        await run_test(client, 100, 5, 3, "bs=5 cc=3")
        await asyncio.sleep(3)
        await run_test(client, 100, 10, 2, "bs=10 cc=2")

if __name__ == "__main__":
    asyncio.run(main())
