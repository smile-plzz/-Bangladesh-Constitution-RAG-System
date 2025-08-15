import asyncio, json, hashlib, re
from bs4 import BeautifulSoup
import pandas as pd
import aiohttp
from playwright.async_api import async_playwright

BASE_SITE = "https://bd-laws.pages.dev"
API_BASE = "https://bd-laws-api.bdit.community/api"
OUT_JSONL = "bdlaws.jsonl"
OUT_PARQUET = "bdlaws.parquet"
CHUNK_TOKENS = 800
OVERLAP_TOKENS = 120

def choose_main_html(html):
    soup = BeautifulSoup(html, "lxml")
    for sel in ["main", "article", "div.prose", "div#content", "section#content"]:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            return str(el)
    return str(soup.body or soup)

def clean_text(html):
    soup = BeautifulSoup(html, "lxml")
    for sel in ["nav", "footer", "script", "style", "noscript"]:
        for tag in soup.select(sel):
            tag.decompose()
    headings = [h.get_text(" ", strip=True) for h in soup.select("h1, h2, h3")]
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    return text, headings

async def fetch_api_json(path):
    async with aiohttp.ClientSession() as session:
        async with session.get(API_BASE + path) as resp:
            return await resp.json()

async def crawl_all():
    print("Fetching volumes index...")
    volumes = await fetch_api_json("/volumes")
    print(f"Found {len(volumes)} volumes")

    results = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context()

        for vol in volumes:
            volume_id = vol["id"]
            print(f"Volume {volume_id}: {vol.get('name')}")
            data = await fetch_api_json(f"/acts/{volume_id}")
            for act in data:
                act_url = BASE_SITE + act["url"]
                title = act.get("name") or ""
                print(f" Crawling act: {act_url}")
                page = await ctx.new_page()
                try:
                    await page.goto(act_url, wait_until="networkidle")
                    await page.wait_for_timeout(800)
                    html = await page.content()
                    main_html = choose_main_html(html)
                    text, headings = clean_text(main_html)
                    if text:
                        results.append({"url": act_url, "title": title, "headings": headings, "text": text})
                except Exception as e:
                    print(f"  Error fetching {act_url}: {e}")
                finally:
                    await page.close()

        await browser.close()

    with open(OUT_JSONL, "w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"Wrote {len(results)} documents to {OUT_JSONL}")

    rows = []
    for r in results:
        words = r["text"].split()
        step = max(1, CHUNK_TOKENS - OVERLAP_TOKENS)
        for i in range(0, len(words), step):
            chunk = " ".join(words[i:i+CHUNK_TOKENS]).strip()
            if not chunk:
                continue
            chunk_id = hashlib.md5((r["url"] + str(i)).encode()).hexdigest()[:16]
            rows.append({
                "doc_url": r["url"],
                "doc_title": r["title"],
                "headings": " | ".join(r["headings"]),
                "chunk_id": chunk_id,
                "chunk_index": i // step,
                "text": chunk
            })

    if rows:
        pd.DataFrame(rows).to_parquet(OUT_PARQUET, index=False)
        print(f"Wrote {len(rows)} chunks to {OUT_PARQUET}")

if __name__ == "__main__":
    asyncio.run(crawl_all())

