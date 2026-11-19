from __future__ import annotations

import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[1]

from scripts.live_orbit import (
    CACHE_TTL_SECONDS,
    LiveOmmUnavailable,
    get_live_omm,
    make_omm_payload,
    parse_utc,
    validate_omm_record,
)

FIXTURE = json.loads((ROOT / "tests" / "fixtures" / "iss_omm_sample.json").read_text(encoding="utf-8"))
RECORD = FIXTURE["elements"]


class OmmValidationTests(unittest.TestCase):
    def test_accepts_valid_iss_record_and_normalizes_epoch(self):
        record = validate_omm_record(RECORD)
        self.assertEqual(str(record["NORAD_CAT_ID"]), "25544")
        payload = make_omm_payload(record, fetched_at_utc="2026-11-12T13:00:00Z")
        self.assertEqual(payload["epoch_utc"], "2026-11-11T08:03:57.286080Z")
        self.assertEqual(payload["satellite"]["norad_id"], "25544")

    def test_rejects_wrong_satellite_and_invalid_parameters(self):
        wrong_id = dict(RECORD, NORAD_CAT_ID=25543)
        with self.assertRaisesRegex(ValueError, "NORAD 25544"):
            validate_omm_record(wrong_id)
        bad_motion = dict(RECORD, MEAN_MOTION=0)
        with self.assertRaisesRegex(ValueError, "MEAN_MOTION"):
            validate_omm_record(bad_motion)
        bad_eccentricity = dict(RECORD, ECCENTRICITY=1)
        with self.assertRaisesRegex(ValueError, "ECCENTRICITY"):
            validate_omm_record(bad_eccentricity)

    def test_rejects_missing_or_non_finite_omm_values(self):
        missing_epoch = dict(RECORD)
        missing_epoch.pop("EPOCH")
        with self.assertRaisesRegex(ValueError, "EPOCH"):
            validate_omm_record(missing_epoch)
        non_finite = dict(RECORD, INCLINATION=float("nan"))
        with self.assertRaisesRegex(ValueError, "não finito"):
            validate_omm_record(non_finite)

    def test_iso_epoch_is_parsed_as_utc(self):
        value = parse_utc("2026-11-11T08:03:57.286080")
        self.assertEqual(value.tzinfo, timezone.utc)
        self.assertEqual(value.hour, 8)


class OmmCacheTests(unittest.TestCase):
    def _write_snapshot(self, path: Path, fetched_at: datetime) -> None:
        payload = make_omm_payload(RECORD, fetched_at_utc=fetched_at, delivery="build_snapshot")
        path.write_text(json.dumps(payload), encoding="utf-8")

    def test_recent_build_snapshot_suppresses_upstream_request(self):
        now = datetime(2026, 11, 12, 14, 0, tzinfo=timezone.utc)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "snapshot.json"
            self._write_snapshot(path, now - timedelta(hours=1))
            fetcher = Mock(side_effect=AssertionError("não deveria consultar a origem"))
            payload, ttl = get_live_omm(path, now=now, fetcher=fetcher)
        fetcher.assert_not_called()
        self.assertEqual(payload["delivery"], "build_snapshot")
        self.assertEqual(payload["elements"]["NORAD_CAT_ID"], RECORD["NORAD_CAT_ID"])
        self.assertGreater(ttl, 0)
        self.assertLessEqual(ttl, CACHE_TTL_SECONDS)

    def test_force_refresh_bypasses_recent_build_snapshot(self):
        now = datetime(2026, 11, 12, 14, 0, tzinfo=timezone.utc)
        fresh_payload = make_omm_payload(RECORD, fetched_at_utc=now, delivery="live")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "snapshot.json"
            self._write_snapshot(path, now - timedelta(hours=1))
            fetcher = Mock(return_value=fresh_payload)
            payload, ttl = get_live_omm(path, now=now, fetcher=fetcher, force_refresh=True)
        fetcher.assert_called_once()
        self.assertEqual(payload["delivery"], "live")
        self.assertEqual(ttl, CACHE_TTL_SECONDS)

    def test_old_snapshot_falls_back_with_warning_when_source_fails(self):
        now = datetime(2026, 11, 12, 14, 0, tzinfo=timezone.utc)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "snapshot.json"
            self._write_snapshot(path, now - timedelta(days=4))
            fetcher = Mock(side_effect=LiveOmmUnavailable("sem rede"))
            payload, ttl = get_live_omm(path, now=now, fetcher=fetcher)
        self.assertEqual(payload["delivery"], "build_snapshot_stale")
        self.assertIn("sem rede", payload["warning"])
        self.assertEqual(ttl, CACHE_TTL_SECONDS)
        fetcher.assert_called_once()

    def test_successful_refresh_persists_only_when_explicitly_enabled(self):
        now = datetime(2026, 11, 12, 14, 0, tzinfo=timezone.utc)
        fresh_payload = make_omm_payload(RECORD, fetched_at_utc=now)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "snapshot.json"
            self._write_snapshot(path, now - timedelta(hours=8))
            fetcher = Mock(return_value=fresh_payload)
            payload, ttl = get_live_omm(path, now=now, fetcher=fetcher, persist_snapshot=True)
            stored = json.loads(path.read_text(encoding="utf-8"))
        fetcher.assert_called_once()
        self.assertEqual(payload["delivery"], "live")
        self.assertEqual(stored["fetched_at_utc"], fresh_payload["fetched_at_utc"])
        self.assertEqual(ttl, CACHE_TTL_SECONDS)

    def test_source_failure_without_snapshot_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "missing.json"
            fetcher = Mock(side_effect=LiveOmmUnavailable("indisponível"))
            with self.assertRaises(LiveOmmUnavailable):
                get_live_omm(path, now=datetime.now(timezone.utc), fetcher=fetcher)


class SatelliteJsParityTests(unittest.TestCase):
    @unittest.skipUnless(__import__("shutil").which("node"), "Node.js não instalado; teste de antimeridiano não executado")
    def test_ground_track_splits_at_antimeridian(self):
        import subprocess

        completed = subprocess.run(
            ["node", str(ROOT / "scripts" / "test_live_track.mjs")],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=10,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertIn("sem linha atravessando", completed.stdout)

    @unittest.skipUnless(__import__("shutil").which("node"), "Node.js não instalado; teste de frescor não executado")
    def test_elements_older_than_72_hours_make_position_unavailable(self):
        import subprocess

        completed = subprocess.run(
            ["node", str(ROOT / "scripts" / "test_live_freshness.mjs")],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=10,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertIn(">72 h indisponível", completed.stdout)

    @unittest.skipUnless(__import__("shutil").which("node"), "Node.js não instalado; paridade browser não executada")
    def test_satellite_js_matches_skyfield(self):
        import subprocess

        completed = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "verify_live_parity.py")],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertIn("Paridade aprovada", completed.stdout)


if __name__ == "__main__":
    unittest.main()
