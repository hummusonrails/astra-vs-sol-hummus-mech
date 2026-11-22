"""Regression checks for publication-blocking privacy failures."""
import contextlib
import io
from pathlib import Path
import tempfile
import struct
import zlib
import unittest
from unittest.mock import patch
import privacy_check

class PrivacyChecks(unittest.TestCase):
    def run_scan(self, name, text):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / name).write_text(text)
            output, errors = io.StringIO(), io.StringIO()
            with patch.object(privacy_check, 'ROOT', root), patch('sys.argv', ['privacy_check.py']), contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
                code = privacy_check.main()
            return code, output.getvalue() + errors.getvalue()

    def test_personal_home_path_is_rejected_without_echo(self):
        value = '/' + 'home' + '/' + 'sample-user' + '/' + 'work'
        code, output = self.run_scan('config.txt', value)
        self.assertEqual(code, 1)
        self.assertNotIn(value, output)

    def test_access_token_is_rejected_without_echo(self):
        value = 'ghp_' + 'A' * 36
        code, output = self.run_scan('config.txt', value)
        self.assertEqual(code, 1)
        self.assertNotIn(value, output)

    def test_raw_session_artifact_is_rejected(self):
        code, _ = self.run_scan('session.jsonl', '{}')
        self.assertEqual(code, 1)

    def test_credential_url_is_rejected(self):
        value = 'https' + '://' + 'sample' + ':' + 'password' + '@' + 'example.invalid'
        code, output = self.run_scan('config.txt', value)
        self.assertEqual(code, 1)
        self.assertNotIn(value, output)

    def test_public_attribution_is_allowed(self):
        code, _ = self.run_scan('notice.txt', 'Map data: https://www.openstreetmap.org/copyright')
        self.assertEqual(code, 0)

    def test_png_pixels_are_not_scanned_as_text(self):
        value = ('sample' + '@' + 'private.invalid').encode()
        chunk = b'IDAT' + value
        raw = b'\x89PNG\r\n\x1a\n' + struct.pack('>I', len(value)) + chunk + struct.pack('>I', zlib.crc32(chunk))
        self.assertEqual(privacy_check.metadata_text(Path('image.png'), raw), '')

    def test_png_compressed_metadata_is_inspected(self):
        value = ('/' + 'home' + '/' + 'sample-user' + '/' + 'work').encode()
        data = b'Comment\0\x01\x00\0\0' + zlib.compress(value)
        chunk = b'iTXt' + data
        raw = b'\x89PNG\r\n\x1a\n' + struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk))
        text = privacy_check.metadata_text(Path('image.png'), raw)
        self.assertTrue(privacy_check.RULES['personal home directory'].search(text))

if __name__ == '__main__':
    unittest.main()
