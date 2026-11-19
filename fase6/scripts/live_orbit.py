from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

NORAD_ID = "25544"
SOURCE_NAME = "CelesTrak GP · OMM JSON"
SOURCE_BASE_URL = "https://celestrak.org/NORAD/elements/gp.php"
SOURCE_URL = f"{SOURCE_BASE_URL}?{urlencode({'CATNR': NORAD_ID, 'FORMAT': 'JSON'})}"
USER_AGENT = "GeoPass-Student-Prototype/1.0 (educational project)"
CACHE_TTL_SECONDS = 6 * 60 * 60
STALE_FALLBACK_TTL_SECONDS = 6 * 60 * 60
REQUEST_TIMEOUT_SECONDS = 12
REQUIRED_NUMERIC_FIELDS = (
    "MEAN_MOTION",
    "ECCENTRICITY",
    "INCLINATION",
    "RA_OF_ASC_NODE",
    "ARG_OF_PERICENTER",
    "MEAN_ANOMALY",
    "BSTAR",
    "MEAN_MOTION_DOT",
    "MEAN_MOTION_DDOT",
)


class LiveOmmUnavailable(RuntimeError):
    """Raised when neither a valid source response nor a usable snapshot exists."""


def parse_utc(value: str) -> datetime:
    cleaned = str(value).strip()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    result = datetime.fromisoformat(cleaned)
    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)
    return result.astimezone(timezone.utc)


def format_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def validate_omm_record(record: object) -> dict:
    if not isinstance(record, dict):
        raise ValueError("O registro OMM precisa ser um objeto JSON.")
    if str(record.get("NORAD_CAT_ID", "")) != NORAD_ID:
        raise ValueError("O registro OMM não identifica a ISS (NORAD 25544).")
    for key in ("OBJECT_NAME", "OBJECT_ID", "EPOCH"):
        if not str(record.get(key, "")).strip():
            raise ValueError(f"Campo OMM obrigatório ausente: {key}.")
    parse_utc(record["EPOCH"])
    numeric = {}
    for key in REQUIRED_NUMERIC_FIELDS:
        try:
            numeric[key] = float(record[key])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Campo OMM inválido: {key}.") from exc
        if not math.isfinite(numeric[key]):
            raise ValueError(f"Campo OMM não finito: {key}.")
    if numeric["MEAN_MOTION"] <= 0:
        raise ValueError("MEAN_MOTION deve ser positivo.")
    if not 0 <= numeric["ECCENTRICITY"] < 1:
        raise ValueError("ECCENTRICITY deve estar no intervalo [0, 1).")
    if not 0 <= numeric["INCLINATION"] <= 180:
        raise ValueError("INCLINATION deve estar entre 0° e 180°.")
    return dict(record)


def make_omm_payload(
    record: object,
    *,
    source: str = SOURCE_NAME,
    fetched_at_utc: datetime | str | None = None,
    delivery: str = "live",
) -> dict:
    valid = validate_omm_record(record)
    fetched = parse_utc(fetched_at_utc) if isinstance(fetched_at_utc, str) else (fetched_at_utc or datetime.now(timezone.utc))
    return {
        "satellite": {
            "name": str(valid["OBJECT_NAME"]),
            "object_id": str(valid["OBJECT_ID"]),
            "norad_id": NORAD_ID,
        },
        "source": source,
        "source_url": SOURCE_URL,
        "fetched_at_utc": format_utc(fetched),
        "epoch_utc": format_utc(parse_utc(valid["EPOCH"])),
        "delivery": delivery,
        "elements": valid,
    }


def build_snapshot(records: object, _source: str, fetched_at_utc: datetime) -> dict | None:
    if not isinstance(records, list):
        return None
    record = next((item for item in records if isinstance(item, dict) and str(item.get("NORAD_CAT_ID", "")) == NORAD_ID), None)
    if record is None:
        return None
    try:
        return make_omm_payload(
            record,
            source=SOURCE_NAME,
            fetched_at_utc=fetched_at_utc,
            delivery="build_snapshot",
        )
    except ValueError:
        return None


def read_snapshot(path: Path) -> dict | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(value, dict):
            return None
        normalized = make_omm_payload(
            value.get("elements"),
            source=str(value.get("source", SOURCE_NAME)),
            fetched_at_utc=str(value.get("fetched_at_utc", "")),
            delivery=str(value.get("delivery", "build_snapshot")),
        )
        return normalized
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        return None


def fetch_live_omm(now: datetime | None = None) -> dict:
    query = urlencode({"CATNR": NORAD_ID, "FORMAT": "JSON"})
    url = f"{SOURCE_BASE_URL}?{query}"
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:  # nosec B310 - URL fixa HTTPS da CelesTrak
            if getattr(response, "status", 200) != 200:
                raise LiveOmmUnavailable("A fonte orbital retornou um estado HTTP inesperado.")
            body = json.loads(response.read().decode("utf-8"))
    except LiveOmmUnavailable:
        raise
    except (HTTPError, URLError, TimeoutError, OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise LiveOmmUnavailable("A fonte orbital CelesTrak não respondeu com dados OMM válidos.") from exc
    if not isinstance(body, list):
        raise LiveOmmUnavailable("A resposta da CelesTrak não contém uma lista OMM.")
    record = next((item for item in body if isinstance(item, dict) and str(item.get("NORAD_CAT_ID", "")) == NORAD_ID), None)
    if record is None:
        raise LiveOmmUnavailable("A resposta OMM não contém a ISS (NORAD 25544).")
    try:
        return make_omm_payload(record, source=SOURCE_NAME, fetched_at_utc=now or datetime.now(timezone.utc), delivery="live")
    except ValueError as exc:
        raise LiveOmmUnavailable("O registro recebido da CelesTrak falhou na validação OMM.") from exc


def get_live_omm(
    snapshot_path: Path,
    *,
    now: datetime | None = None,
    fetcher=fetch_live_omm,
    persist_snapshot: bool = False,
    force_refresh: bool = False,
) -> tuple[dict, int]:
    current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    snapshot = read_snapshot(snapshot_path)
    if snapshot is not None and not force_refresh:
        try:
            age_seconds = (current - parse_utc(snapshot["fetched_at_utc"])).total_seconds()
        except (TypeError, ValueError):
            age_seconds = float("inf")
        if 0 <= age_seconds < CACHE_TTL_SECONDS:
            cached = dict(snapshot)
            cached["delivery"] = "build_snapshot"
            remaining = max(60, int(CACHE_TTL_SECONDS - age_seconds))
            return cached, remaining
    try:
        payload = fetcher(now=current)
        if persist_snapshot:
            try:
                snapshot_path.parent.mkdir(parents=True, exist_ok=True)
                temporary_path = snapshot_path.with_name(f"{snapshot_path.name}.tmp")
                temporary_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
                temporary_path.replace(snapshot_path)
            except OSError:
                pass
        return payload, CACHE_TTL_SECONDS
    except LiveOmmUnavailable as exc:
        if snapshot is None:
            raise
        fallback = dict(snapshot)
        fallback["delivery"] = "build_snapshot_stale"
        fallback["warning"] = str(exc)
        return fallback, STALE_FALLBACK_TTL_SECONDS
