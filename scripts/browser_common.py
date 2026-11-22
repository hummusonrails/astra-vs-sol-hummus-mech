"""Portable browser configuration and temporary app servers."""
import os
from pathlib import Path
import subprocess
import time
import urllib.request
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parents[1]

def launch(playwright):
    options = {"headless": True}
    executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    if executable:
        options["executable_path"] = executable
    return playwright.chromium.launch(**options)

@contextmanager
def serve(label, port):
    process = subprocess.Popen(["node", "scripts/server.mjs", label, str(port)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError(f"{label} server exited before readiness")
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1) as response:
                    if response.status == 200:
                        break
            except (OSError, TimeoutError):
                time.sleep(0.1)
        else:
            raise RuntimeError(f"{label} server was not ready")
        yield f"http://127.0.0.1:{port}"
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
