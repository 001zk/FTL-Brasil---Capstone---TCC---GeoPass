from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Flask, jsonify, request, send_from_directory
from skyfield.api import EarthSatellite, load, wgs84

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))
from scripts.build_dataset import (
    CACHE_PATH,
    DATA_DIR,
    compute_passes,
    fetch_omm,
    read_config,
)

GEOCODE_CACHE_PATH = DATA_DIR / "geocode_cache.json"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
APP_USER_AGENT = "GeoPass-TCC-Student-Prototype/0.2 (local educational use)"
app = Flask(__name__, static_folder=None)
_geocode_lock = threading.Lock()
_last_geocode_request = 0.0
_pass_cache: dict[str, tuple[float, dict]] = {}


def get_omm_records(config: dict) -> list[dict]:
    records, _source = fetch_omm(config, refresh=False)
    return records


def get_satellites(selected_ids: list[str] | None = None):
    config = read_config()
    records = get_omm_records(config)
    ts = load.timescale(builtin=True)
    configured_ids = {str(value) for value in config.get("satellite_ids", [])}
    selected = {str(value) for value in (selected_ids or [])}
    allowed_ids = selected or configured_ids
    limit = min(int(config.get("max_satellites", 40)), 12)
    satellites = []
    for record in records:
        sat_id = str(record.get("NORAD_CAT_ID", ""))
        if allowed_ids and sat_id not in allowed_ids:
            continue
        try:
            satellites.append(EarthSatellite.from_omm(ts, record))
        except Exception:
            continue
        if len(satellites) >= limit:
            break
    if not satellites:
        raise ValueError("Nenhum satélite válido selecionado. Rode primeiro scripts/build_dataset.py.")
    return config, ts, satellites


def suggest_brazil_timezone(row: dict, lat: float, lon: float) -> str | None:
    address = row.get("address") or {}
    if str(address.get("country_code", "")).lower() != "br":
        return None
    if -5.5 <= lat <= 0 and -35.5 <= lon <= -32.5:
        return "America/Noronha"
    state_code = str(address.get("ISO3166-2-lvl4", "")).split("-")[-1].upper()
    if state_code == "AC" or (state_code == "AM" and lon < -66.5) or lon < -68.0:
        return "America/Rio_Branco"
    if state_code in {"AM", "RO", "RR", "MT", "MS"}:
        return "America/Manaus"
    return "America/Sao_Paulo"


def _load_geocode_cache() -> dict:
    try:
        value = json.loads(GEOCODE_CACHE_PATH.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def search_city(query: str) -> list[dict]:
    cleaned = " ".join(query.split())
    if len(cleaned) < 2 or len(cleaned) > 120:
        raise ValueError("Digite o nome de uma cidade ou local (2 a 120 caracteres).")
    key = cleaned.casefold()
    cache = _load_geocode_cache()
    entry = cache.get(key)
    if isinstance(entry, dict) and isinstance(entry.get("results"), list):
        return entry["results"]

    global _last_geocode_request
    with _geocode_lock:
        wait = 1.05 - (time.monotonic() - _last_geocode_request)
        if wait > 0:
            time.sleep(wait)
        params = urlencode({
            "q": cleaned,
            "format": "jsonv2",
            "limit": 5,
            "addressdetails": 1,
            "accept-language": "pt-BR,pt,en",
        })
        req = Request(
            f"{NOMINATIM_URL}?{params}",
            headers={"User-Agent": APP_USER_AGENT, "Accept": "application/json"},
        )
        with urlopen(req, timeout=15) as response:
            rows = json.loads(response.read().decode("utf-8"))
        _last_geocode_request = time.monotonic()

    results = []
    for row in rows[:5]:
        try:
            lat, lon = float(row["lat"]), float(row["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue
        results.append({
            "name": str(row.get("display_name", cleaned))[:240],
            "latitude": lat,
            "longitude": lon,
            "timezone": suggest_brazil_timezone(row, lat, lon),
        })
    cache[key] = {
        "queried_at_utc": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    GEOCODE_CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    return results


@app.get("/")
def home():
    return send_from_directory(ROOT / "web", "index.html")


@app.get("/data/<path:filename>")
def data_file(filename: str):
    return send_from_directory(DATA_DIR, filename)


@app.post("/api/geocode")
def geocode():
    payload = request.get_json(silent=True) or {}
    try:
        query = str(payload.get("query", ""))
        results = search_city(query)
        return jsonify({"results": results, "attribution": "© OpenStreetMap contributors"})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Falha na busca de cidade")
        return jsonify({"error": f"Busca indisponível no momento: {exc}"}), 502


@app.post("/api/passes")
def passes_for_location():
    payload = request.get_json(silent=True) or {}
    try:
        lat = float(payload.get("latitude"))
        lon = float(payload.get("longitude"))
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("Latitude ou longitude fora dos limites válidos.")
        name = " ".join(str(payload.get("name", "Local no mapa")).split())[:240]
        raw_ids = payload.get("satellite_ids", [])
        if not isinstance(raw_ids, list):
            raise ValueError("satellite_ids deve ser uma lista de IDs.")
        selected_ids = list(dict.fromkeys(str(item) for item in raw_ids if str(item).isdigit()))
        if not selected_ids:
            raise ValueError("Marque ao menos um satélite para calcular as passagens.")
        if len(selected_ids) > 12:
            raise ValueError("Selecione no máximo 12 satélites por cálculo nesta versão.")
        zone = str(payload.get("timezone", "UTC")).strip()
        if len(zone) > 80:
            raise ValueError("Fuso horário inválido.")
        try:
            ZoneInfo(zone)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Fuso horário inválido; escolha uma opção da lista.")

        cache_key = json.dumps([round(lat, 5), round(lon, 5), sorted(set(selected_ids)), zone])
        cached = _pass_cache.get(cache_key)
        if cached and time.monotonic() - cached[0] < 180:
            return jsonify(cached[1])

        config, ts, satellites = get_satellites(selected_ids)
        start = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        hours = min(max(int(config.get("interval_hours", 24)), 1), 48)
        end = start + timedelta(hours=hours)
        min_elevation = float(config.get("pass_min_elevation_deg", 10.0))
        observer = wgs84.latlon(lat, lon)
        location = {"id": "custom", "name": name, "latitude": lat, "longitude": lon, "timezone": zone}
        found = []
        for sat in satellites:
            found.extend(compute_passes(
                sat, observer, ts, start, end, min_elevation, location
            ))
        found.sort(key=lambda item: item["start_utc"])
        result = {
            "location": {**location, "timezone": zone},
            "generated_at_utc": start.isoformat().replace("+00:00", "Z"),
            "window_end_utc": end.isoformat().replace("+00:00", "Z"),
            "min_elevation_deg": min_elevation,
            "satellite_count": len(satellites),
            "passes": found,
            "notice": "Passagem geométrica calculada com elementos orbitais atuais; não é garantia de visibilidade a olho nu.",
        }
        _pass_cache[cache_key] = (time.monotonic(), result)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Falha ao calcular passagem")
        return jsonify({"error": f"Não foi possível calcular. Verifique a conexão e rode scripts/build_dataset.py: {exc}"}), 500


if __name__ == "__main__":
    print("GeoPass local: http://127.0.0.1:8000")
    print("Para consulta dinâmica, mantenha a janela aberta e use o mapa ou busque uma cidade.")
    app.run(host="127.0.0.1", port=8000, debug=False)
