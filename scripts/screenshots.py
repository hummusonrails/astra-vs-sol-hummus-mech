"""Render repository screenshots from anonymized app builds, without browser chrome."""
from playwright.sync_api import sync_playwright
from browser_common import ROOT, launch, serve

with sync_playwright() as p:
    for index, label in enumerate(("astra", "sol")):
        with serve(label, 49330 + index) as url:
            browser = launch(p)
            page = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
            page.goto(url, wait_until="networkidle")
            page.wait_for_function("window.walkerState || document.querySelector('#world canvas')?.dataset.x", timeout=30000)
            page.wait_for_timeout(500)
            destination = ROOT / "docs/screenshots"
            destination.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(destination / f"{label}-opening.png"))
            page.keyboard.press("Space")
            page.wait_for_timeout(650)
            page.screenshot(path=str(destination / f"{label}-stomp.png"))
            browser.close()
            print(f"Captured {label} opening and stomp")
