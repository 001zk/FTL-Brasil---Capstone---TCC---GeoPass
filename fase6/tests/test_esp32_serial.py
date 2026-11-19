import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.esp32_serial import build_next_pass_line, validate_ack_line


SAMPLE = {
    "satellite_id": "25544",
    "start_utc": "2026-10-03T08:00:00Z",
    "peak_utc": "2026-10-03T08:02:00Z",
    "end_utc": "2026-10-03T08:04:00Z",
    "max_elevation_deg": 40.0,
}


class Esp32SerialProtocolTests(unittest.TestCase):
    def test_builds_compact_ascii_command(self):
        self.assertEqual(
            build_next_pass_line(SAMPLE),
            "NEXT|1|25544|2026-10-03T08:00:00Z|2026-10-03T08:02:00Z|2026-10-03T08:04:00Z|40.00\n",
        )

    def test_normalizes_zero_offset_utc(self):
        event = {**SAMPLE, "start_utc": "2026-10-03T08:00:00+00:00"}
        self.assertIn("|2026-10-03T08:00:00Z|", build_next_pass_line(event))

    def test_rejects_non_utc_and_malformed_timestamps(self):
        for value in ("2026-10-03T05:00:00-03:00", "tomorrow"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                build_next_pass_line({**SAMPLE, "start_utc": value})

    def test_rejects_invalid_id_or_injection(self):
        with self.assertRaises(ValueError):
            build_next_pass_line({**SAMPLE, "satellite_id": "25544|RESET"})

    def test_rejects_impossible_elevation_and_event_order(self):
        with self.assertRaises(ValueError):
            build_next_pass_line({**SAMPLE, "max_elevation_deg": 95})
        with self.assertRaises(ValueError):
            build_next_pass_line({**SAMPLE, "peak_utc": "2026-10-03T07:59:00Z"})

    def test_ack_must_match_protocol_version_and_satellite(self):
        self.assertTrue(validate_ack_line("ACK|1|25544|OK\r\n", "25544"))
        with self.assertRaises(ValueError):
            validate_ack_line("ACK|1|25544|OK", "48274")
        with self.assertRaises(ValueError):
            validate_ack_line("ACK|2|25544|OK", "25544")


if __name__ == "__main__":
    unittest.main()
