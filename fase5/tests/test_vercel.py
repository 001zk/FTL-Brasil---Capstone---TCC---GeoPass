import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'scripts'))

import server
from scripts import build_dataset


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def read(self):
        return json.dumps(self.payload).encode('utf-8')


class VercelFilesystemTests(unittest.TestCase):
    def test_omm_fetch_returns_fresh_data_if_runtime_cannot_write_cache(self):
        records = [{'NORAD_CAT_ID': '25544', 'OBJECT_NAME': 'ISS (ZARYA)'}]
        config = {'celestrak_group': 'STATIONS', 'cache_hours': 12}
        with patch.object(build_dataset, 'urlopen', return_value=FakeResponse(records)), \
             patch.object(build_dataset.tempfile, 'NamedTemporaryFile', side_effect=PermissionError('read-only')):
            returned, source = build_dataset.fetch_omm(config, refresh=True)
        self.assertEqual(returned, records)
        self.assertIn('GROUP=STATIONS', source)

    def test_geocode_returns_results_if_runtime_cannot_write_cache(self):
        rows = [{
            'lat': '-22.9056', 'lon': '-47.0596',
            'display_name': 'Campinas, São Paulo, Brasil',
            'address': {'country_code': 'br', 'ISO3166-2-lvl4': 'BR-SP'},
        }]
        with patch.object(server, '_load_geocode_cache', return_value={}), \
             patch.object(server, 'urlopen', return_value=FakeResponse(rows)), \
             patch('pathlib.Path.write_text', side_effect=PermissionError('read-only')):
            results = server.search_city('Campinas, SP')
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Campinas, São Paulo, Brasil')
        self.assertEqual(results[0]['timezone'], 'America/Sao_Paulo')


if __name__ == '__main__':
    unittest.main()
