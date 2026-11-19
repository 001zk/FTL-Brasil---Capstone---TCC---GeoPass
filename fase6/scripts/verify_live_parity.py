from __future__ import annotations

import json
import math
import subprocess  # nosec B404 - executa somente o harness local versionado
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import cast

from skyfield.api import EarthSatellite, load, wgs84

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_PATH = ROOT / "tests" / "fixtures" / "iss_omm_sample.json"
JS_HARNESS = ROOT / "scripts" / "live_parity.mjs"
POSITION_TOLERANCE_KM = 0.001
VELOCITY_TOLERANCE_KM_S = 0.00001
SURFACE_TOLERANCE_KM = 5.0
ALTITUDE_TOLERANCE_KM = 0.02
EARTH_MEAN_RADIUS_KM = 6371.0088


def parse_utc(text: str) -> datetime:
    cleaned = text[:-1] + "+00:00" if text.endswith("Z") else text
    value = datetime.fromisoformat(cleaned)
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def norm_delta(left: list[float], right: list[float]) -> float:
    return math.sqrt(sum((float(a) - float(b)) ** 2 for a, b in zip(left, right, strict=True)))


def horizontal_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = phi2 - phi1
    delta_lon = math.radians(((lon2 - lon1 + 180) % 360) - 180)
    haversine = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lon / 2) ** 2
    return 2 * EARTH_MEAN_RADIUS_KM * math.asin(min(1.0, math.sqrt(haversine)))


def verify() -> list[dict]:
    sample = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    elements = sample["elements"]
    epoch = parse_utc(elements["EPOCH"])
    times = [epoch, epoch + timedelta(hours=12), epoch + timedelta(hours=24), epoch + timedelta(hours=48)]
    serialized_times = [value.isoformat(timespec="milliseconds").replace("+00:00", "Z") for value in times]
    completed = subprocess.run(  # nosec B603 B607 - executável e script locais fixos, sem shell
        ["node", str(JS_HARNESS)],
        input=json.dumps({"elements": elements, "times": serialized_times}),
        capture_output=True,
        text=True,
        check=True,
        cwd=ROOT,
    )
    javascript = json.loads(completed.stdout)
    if javascript["satellite_id"] != str(elements["NORAD_CAT_ID"]):
        raise AssertionError("satellite.js inicializou um NORAD diferente da ISS.")

    ts = load.timescale(builtin=True)
    satellite = EarthSatellite.from_omm(ts, elements)
    reports = []
    for instant, js_result in zip(times, javascript["results"], strict=True):
        minutes_from_epoch = (instant - epoch).total_seconds() / 60
        error_code, expected_position, expected_velocity = satellite.model.sgp4_tsince(minutes_from_epoch)
        if error_code:
            raise AssertionError(f"Skyfield/SGP4 retornou erro {error_code} em {instant.isoformat()}.")
        expected_position = cast(tuple[float, float, float], expected_position)
        expected_velocity = cast(tuple[float, float, float], expected_velocity)
        position_error = norm_delta(list(expected_position), js_result["position_teme_km"])
        velocity_error = norm_delta(list(expected_velocity), js_result["velocity_teme_km_s"])
        subpoint = wgs84.subpoint(satellite.at(ts.from_datetime(instant)))
        surface_error = horizontal_distance_km(
            cast(float, subpoint.latitude.degrees), cast(float, subpoint.longitude.degrees),
            float(js_result["latitude_deg"]), float(js_result["longitude_deg"]),
        )
        altitude_error = abs(cast(float, subpoint.elevation.km) - float(js_result["altitude_km"]))
        report = {
            "time_utc": instant.isoformat().replace("+00:00", "Z"),
            "position_teme_error_km": position_error,
            "velocity_teme_error_km_s": velocity_error,
            "subpoint_horizontal_error_km": surface_error,
            "altitude_error_km": altitude_error,
        }
        reports.append(report)
        if position_error > POSITION_TOLERANCE_KM:
            raise AssertionError(f"Erro ECI/TEME {position_error:.6f} km excede {POSITION_TOLERANCE_KM} km em {report['time_utc']}.")
        if velocity_error > VELOCITY_TOLERANCE_KM_S:
            raise AssertionError(f"Erro de velocidade {velocity_error:.8f} km/s excede {VELOCITY_TOLERANCE_KM_S} km/s em {report['time_utc']}.")
        if surface_error > SURFACE_TOLERANCE_KM:
            raise AssertionError(f"Erro horizontal {surface_error:.3f} km excede {SURFACE_TOLERANCE_KM} km em {report['time_utc']}.")
        if altitude_error > ALTITUDE_TOLERANCE_KM:
            raise AssertionError(f"Erro de altitude {altitude_error:.4f} km excede {ALTITUDE_TOLERANCE_KM} km em {report['time_utc']}.")
    return reports


def main() -> int:
    try:
        reports = verify()
    except (AssertionError, OSError, subprocess.CalledProcessError, json.JSONDecodeError, KeyError, ValueError) as exc:
        print(f"FALHA NA PARIDADE: {exc}", file=sys.stderr)
        return 1
    for row in reports:
        print(json.dumps(row, ensure_ascii=False))
    print("Paridade aprovada: satellite.js e Skyfield/SGP4 dentro das tolerâncias declaradas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
