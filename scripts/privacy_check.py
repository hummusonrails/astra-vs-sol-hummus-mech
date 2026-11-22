#!/usr/bin/env python3
"""Check publishable files for credentials, personal home paths and private artifacts."""
import argparse
from pathlib import Path
import re
import subprocess
import sys
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {'.git', 'node_modules', '.venv', '__pycache__', 'test-results', 'playwright-report', '.private', '.vercel', '.npm-cache', 'dist'}
RULES = {
    'personal home directory': re.compile(r'/(?:Users|home)/[A-Za-z0-9_.-]+/|[A-Za-z]:\\Users\\[^\\\s]+\\'),
    'private key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),
    'access token': re.compile(r'\b(?:ghp_|github_pat_|sk-proj-|xox[baprs]-)[A-Za-z0-9_-]{16,}'),
    'credential in URL': re.compile(r'https?://[^/\s:@]+:[^/\s@]+@'),
    'deployment identity': re.compile(r'\b(?:dpl_|prj_)[A-Za-z0-9]{15,}|https?://[^\s<>"\x27]+\.vercel\.app'),
    'email address': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'),
}
FORBIDDEN_SUFFIXES = {'.jsonl', '.sqlite', '.sqlite3', '.db', '.pem', '.key', '.p12'}

def files(include_builds):
    for path in ROOT.rglob('*'):
        relative = path.relative_to(ROOT)
        excluded = EXCLUDED - ({'dist'} if include_builds else set())
        if path.is_file() and not any(part in excluded for part in relative.parts):
            yield path

def metadata_text(path, raw):
    if path.suffix.lower() != '.png':
        return raw.decode('utf-8', errors='ignore')
    # Compressed pixel bytes are not text. Inspect PNG text metadata, not IDAT noise.
    if not raw.startswith(b'\x89PNG\r\n\x1a\n'):
        return raw.decode('utf-8', errors='ignore')
    offset, strings = 8, []
    while offset + 12 <= len(raw):
        size = struct.unpack('>I', raw[offset:offset + 4])[0]
        kind = raw[offset + 4:offset + 8]
        data = raw[offset + 8:offset + 8 + size]
        try:
            if kind == b'tEXt':
                strings.append(data.decode('latin-1'))
            elif kind == b'zTXt':
                key, compressed = data.split(b'\0', 1)
                strings.append(key.decode('latin-1') + zlib.decompress(compressed[1:]).decode('utf-8', errors='ignore'))
            elif kind == b'iTXt':
                key, compressed, method, language, translated, text = data.split(b'\0', 5)
                if compressed == b'\x01':
                    text = zlib.decompress(text)
                strings.append(key.decode('utf-8', errors='ignore') + text.decode('utf-8', errors='ignore'))
            elif kind == b'eXIf':
                strings.append(data.decode('utf-8', errors='ignore'))
        except (ValueError, zlib.error):
            strings.append('Unreadable PNG text metadata')
        offset += size + 12
    return '\n'.join(strings)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--denylist', type=Path, help='Private file of additional identifying strings, outside this repository')
    parser.add_argument('--include-builds', action='store_true')
    args = parser.parse_args()
    denied = [line.strip().lower() for line in args.denylist.read_text().splitlines() if line.strip()] if args.denylist else []
    problems = []
    checked = 0
    for path in files(args.include_builds):
        checked += 1
        relative = path.relative_to(ROOT)
        if path.suffix in FORBIDDEN_SUFFIXES or (path.name.startswith('.env') and path.name != '.env.example'):
            problems.append((relative, 'private artifact type'))
        # Binary metadata can contain paths or identifying strings too; never print matching values.
        raw = path.read_bytes()
        text = metadata_text(path, raw)
        for name, regex in RULES.items():
            matches = list(regex.finditer(text))
            if name == 'email address':
                matches = [m for m in matches if not m.group().endswith(('@example.invalid', '@example.com', '@users.noreply.github.com')) and str(relative).split('/')[0] != 'LICENSES']
            if matches:
                problems.append((relative, name))
        if any(value in text.lower() or value in raw.decode('utf-8', errors='ignore').lower() or value in str(relative).lower() for value in denied):
            problems.append((relative, 'private denylist match'))
    # Inspect all refs' author/committer metadata without echoing personal values.
    if (ROOT / '.git').is_dir():
        history = subprocess.run(['git', 'log', '--all', '--format=%an%n%ae%n%cn%n%ce%n%B'], cwd=ROOT, text=True, capture_output=True)
        if history.returncode == 0:
            if any(value in history.stdout.lower() for value in denied):
                problems.append(('.git history', 'private denylist match'))
            addresses = RULES['email address'].findall(history.stdout)
            if any(not address.endswith('@example.invalid') for address in addresses):
                problems.append(('.git history', 'non-anonymous commit email'))
    for path, reason in sorted(set((str(p), r) for p, r in problems)):
        print(f'{path}: {reason}', file=sys.stderr)
    if problems:
        print(f'Privacy check failed: {len(problems)} findings.', file=sys.stderr)
        return 1
    print(f'Privacy check passed for {checked} files. No matched values were printed.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
