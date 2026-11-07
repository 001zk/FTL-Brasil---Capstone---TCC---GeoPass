from __future__ import annotations

import argparse
import json
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from skyfield.api import EarthSatellite, load, wgs84

from geopass_core import group_event_indices

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config.json"
DATA_DIR = ROOT / "data"
CACHE_PATH = DATA_DIR / "source_omm.json"
OUTPUT_PATH = DATA_DIR / "passes.json"
BASE_URL = "https://celestrak.org/NORAD/elements/gp.php"
USER_AGENT = "GeoPass-Student-Prototype/0.1 (educational project)"


def read_config() -> dict:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    if not config.get("locations"):
        raise ValueError("Adicione ao menos uma localidade em config.json.")
    for loc in config["locations"]:
        if not (-90 <= float(loc["latitude"]) <= 90):
            raise ValueError(f"Latitude inválida em {loc.get('id')}.")
        if not (-180 <= float(loc["longitude"]) <= 180):
            raise ValueError(f"Longitude inválida em {loc.get('id')}.")
    return config


def fetch_omm(config: dict, refresh: bool = False) -> tuple[list[dict], str]:
    cache_hours = float(config.get("cache_hours", 12))
    if CACHE_PATH.exists() and not refresh:
        age = datetime.now(timezone.utc).timestamp() - CACHE_PATH.stat().st_mtime
        if age < cache_hours * 3600:
            records = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
            if isinstance(records, list) and records:
                return records, f"cache local ({age / 3600:.1f} h)"

    query = urlencode({"GROUP": config["celestrak_group"].upper(), "FORMAT": "JSON"})
    url = f"{BASE_URL}?{query}"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        records = json.loads(response.read().decode("utf-8"))
    if not isinstance(records, list) or not records:
        raise RuntimeError("A CelesTrak não retornou uma lista OMM válida.")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=DATA_DIR, delete=False) as tmp:
        json.dump(records, tmp, ensure_ascii=False, indent=2)
        temp_name = tmp.name
    Path(temp_name).replace(CACHE_PATH)
    return records, url


def utc_iso(time_obj) -> str:
    return time_obj.utc_datetime().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def compute_track(satellite: EarthSatellite, ts, start: datetime, hours: int, step_minutes: int) -> list[dict]:
    points: list[dict] = []
    count = int(hours * 60 / step_minutes)
    for i in range(count + 1):
        when = start + timedelta(minutes=i * step_minutes)
        position = satellite.at(ts.from_datetime(when))
        subpoint = wgs84.subpoint(position)
        points.append({
            "time_utc": when.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "latitude": round(float(subpoint.latitude.degrees), 5),
            "longitude": round(float(subpoint.longitude.degrees), 5),
        })
    return points


def compute_passes(satellite: EarthSatellite, observer, ts, start: datetime, end: datetime,
                   min_elevation: float, location: dict) -> list[dict]:
    t0 = ts.from_datetime(start)
    t1 = ts.from_datetime(end)
    times, events = satellite.find_events(
        observer, t0, t1, altitude_degrees=min_elevation
    )
    event_list = [int(event) for event in events]
    passes: list[dict] = []

    for rise_i, peak_indices, set_i in group_event_indices(event_list):
        best_peak = max(
            peak_indices,
            key=lambda idx: (satellite - observer).at(times[idx]).altaz()[0].degrees,
        )
        topocentric = (satellite - observer).at(times[best_peak])
        altitude, azimuth, distance = topocentric.altaz()
        passes.append({
            "location_id": location["id"],
            "satellite_id": str(satellite.model.satnum),
            "satellite_name": satellite.name or f"NORAD {satellite.model.satnum}",
            "start_utc": utc_iso(times[rise_i]),
            "peak_utc": utc_iso(times[best_peak]),
            "end_utc": utc_iso(times[set_i]),
            "max_elevation_deg": round(float(altitude.degrees), 2),
            "azimuth_at_peak_deg": round(float(azimuth.degrees), 2),
            "range_km_at_peak": round(float(distance.km), 1),
            "epoch_utc": utc_iso(satellite.epoch),
            "min_elevation_deg": min_elevation,
        })
    return passes


def build(refresh: bool = False) -> dict:
    config = read_config()
    records, source_used = fetch_omm(config, refresh=refresh)
    ts = load.timescale(builtin=True)
    satellites: list[EarthSatellite] = []
    warnings: list[str] = []
    wanted_ids = {str(value) for value in config.get("satellite_ids", [])}

    for record in records:
        sat_id = str(record.get("NORAD_CAT_ID", ""))
        if wanted_ids and sat_id not in wanted_ids:
            continue
        try:
            satellites.append(EarthSatellite.from_omm(ts, record))
        except Exception as exc:
            warnings.append(f"Ignorado registro {sat_id or '(sem ID)'}: {exc}")

    limit = int(config.get("max_satellites", 40))
    satellites = satellites[:limit]
    if not satellites:
        raise RuntimeError("Nenhum satélite válido após aplicar os filtros do config.json.")

    start = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    hours = int(config.get("interval_hours", 24))
    end = start + timedelta(hours=hours)
    min_elevation = float(config.get("pass_min_elevation_deg", 10.0))
    track_step = int(config.get("track_step_minutes", 10))
    if hours <= 0 or track_step <= 0:
        raise ValueError("interval_hours e track_step_minutes devem ser positivos.")

    satellite_meta = []
    tracks = []
    all_passes = []
    for satellite in satellites:
        sat_id = str(satellite.model.satnum)
        name = satellite.name or f"NORAD {sat_id}"
        satellite_meta.append({
            "id": sat_id,
            "name": name,
            "epoch_utc": utc_iso(satellite.epoch),
        })
        tracks.append({
            "satellite_id": sat_id,
            "satellite_name": name,
            "points": compute_track(satellite, ts, start, hours, track_step),
        })
        for location in config["locations"]:
            observer = wgs84.latlon(
                float(location["latitude"]), float(location["longitude"]),
                elevation_m=float(location.get("elevation_m", 0)),
            )
            all_passes.extend(compute_passes(
                satellite, observer, ts, start, end, min_elevation, location
            ))

    all_passes.sort(key=lambda item: (item["location_id"], item["start_utc"]))
    return {
        "project": "GeoPass",
        "generated_at_utc": start.isoformat().replace("+00:00", "Z"),
        "window_end_utc": end.isoformat().replace("+00:00", "Z"),
        "data_source": source_used,
        "celestrak_group": config["celestrak_group"],
        "min_elevation_deg": min_elevation,
        "locations": config["locations"],
        "satellites": satellite_meta,
        "passes": all_passes,
        "tracks": tracks,
        "warnings": warnings,
        "notice": "Passagem geométrica calculada; não é garantia de visibilidade a olho nu.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera dados de demonstração do GeoPass.")
    parser.add_argument("--refresh", action="store_true", help="Baixa novamente o grupo GP da CelesTrak.")
    args = parser.parse_args()
    try:
        dataset = build(refresh=args.refresh)
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"OK: {len(dataset['satellites'])} satélites; {len(dataset['passes'])} passagens; {len(dataset['locations'])} locais.")
        print(f"Arquivo: {OUTPUT_PATH}")
        print("Nota: horários de passagem são geométricos; confira os avisos de dados e a época orbital.")
        return 0
    except Exception as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
