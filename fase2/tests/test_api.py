import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


class GeoPassApiTests(unittest.TestCase):
    def setUp(self):
        server._pass_cache.clear()
        self.client = server.app.test_client()

    def test_rejects_invalid_coordinates(self):
        response = self.client.post('/api/passes', json={
            'latitude': 91, 'longitude': -47, 'timezone': 'America/Sao_Paulo',
            'satellite_ids': ['25544']
        })
        self.assertEqual(response.status_code, 400)

    def test_requires_a_satellite_selection(self):
        response = self.client.post('/api/passes', json={
            'latitude': -22.9, 'longitude': -47.0, 'timezone': 'America/Sao_Paulo',
            'satellite_ids': []
        })
        self.assertEqual(response.status_code, 400)

    def test_rejects_more_than_twelve_satellites(self):
        ids = [str(value) for value in range(100, 113)]
        response = self.client.post('/api/passes', json={
            'latitude': -22.9, 'longitude': -47.0, 'timezone': 'America/Sao_Paulo',
            'satellite_ids': ids
        })
        self.assertEqual(response.status_code, 400)

    def test_rejects_unknown_timezone(self):
        response = self.client.post('/api/passes', json={
            'latitude': -22.9, 'longitude': -47.0, 'timezone': 'Not/A_Timezone',
            'satellite_ids': ['25544']
        })
        self.assertEqual(response.status_code, 400)

    def test_city_search_requires_manual_query(self):
        response = self.client.post('/api/geocode', json={'query': 'x'})
        self.assertEqual(response.status_code, 400)

    def test_brazil_timezone_suggestions(self):
        sao_paulo_row = {'address': {'country_code':'br', 'ISO3166-2-lvl4':'BR-SP'}}
        acre_row = {'address': {'country_code':'br', 'ISO3166-2-lvl4':'BR-AC'}}
        foreign_row = {'address': {'country_code':'us', 'ISO3166-2-lvl4':'US-CA'}}
        self.assertEqual(server.suggest_brazil_timezone(sao_paulo_row, -23.55, -46.63), 'America/Sao_Paulo')
        self.assertEqual(server.suggest_brazil_timezone(acre_row, -9.97, -67.81), 'America/Rio_Branco')
        self.assertIsNone(server.suggest_brazil_timezone(foreign_row, 34.05, -118.24))

    def test_dynamic_passes_use_the_selected_coordinates(self):
        fake_satellite = SimpleNamespace(name='ISS (ZARYA)', model=SimpleNamespace(satnum=25544))
        config = {'interval_hours': 24, 'pass_min_elevation_deg': 10.0}
        sample_pass = {
            'location_id': 'custom', 'satellite_id': '25544',
            'satellite_name': 'ISS (ZARYA)', 'start_utc': '2026-10-03T08:00:00Z',
            'peak_utc': '2026-10-03T08:02:00Z', 'end_utc': '2026-10-03T08:04:00Z',
            'max_elevation_deg': 40.0, 'azimuth_at_peak_deg': 120.0,
            'epoch_utc': '2026-10-02T20:00:00Z',
        }
        with patch.object(server, 'get_satellites', return_value=(config, object(), [fake_satellite])), \
             patch.object(server, 'compute_passes', return_value=[sample_pass]) as compute:
            response = self.client.post('/api/passes', json={
                'name': 'Campinas, SP', 'latitude': -22.9056,
                'longitude': -47.0596, 'timezone': 'America/Sao_Paulo',
                'satellite_ids': ['25544']
            })
        self.assertEqual(response.status_code, 200, response.get_json())
        body = response.get_json()
        self.assertEqual(body['location']['name'], 'Campinas, SP')
        self.assertEqual(body['location']['timezone'], 'America/Sao_Paulo')
        self.assertEqual(body['passes'], [sample_pass])
        self.assertEqual(compute.call_count, 1)
        passed_location = compute.call_args.args[-1]
        self.assertAlmostEqual(passed_location['latitude'], -22.9056)
        self.assertAlmostEqual(passed_location['longitude'], -47.0596)


if __name__ == '__main__':
    unittest.main()
