                                                              
from __future__ import annotations

from datetime import datetime, timezone
import math


def _utc_seconds(value: object, field: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} precisa ser uma data ISO em UTC.")
    text = value.strip()
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{field} precisa ser uma data ISO válida.") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f"{field} precisa incluir o fuso horário UTC.")
    if parsed.utcoffset().total_seconds() != 0:
        raise ValueError(f"{field} precisa estar em UTC.")
    return parsed.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_next_pass_line(event: dict) -> str:
                                                                      
    if not isinstance(event, dict):
        raise ValueError("A passagem precisa ser um objeto JSON.")
    satellite_id = str(event.get("satellite_id", ""))
    if not satellite_id.isdigit() or not (1 <= len(satellite_id) <= 10):
        raise ValueError("ID de satélite inválido.")
    start = _utc_seconds(event.get("start_utc"), "start_utc")
    peak = _utc_seconds(event.get("peak_utc"), "peak_utc")
    end = _utc_seconds(event.get("end_utc"), "end_utc")
    try:
        elevation = float(event.get("max_elevation_deg"))
    except (TypeError, ValueError) as exc:
        raise ValueError("Elevação máxima inválida.") from exc
    if not math.isfinite(elevation) or not (0 <= elevation <= 90):
        raise ValueError("Elevação máxima deve estar entre 0° e 90°.")
    if not (start <= peak <= end):
        raise ValueError("A passagem precisa obedecer início ≤ pico ≤ fim.")
    return f"NEXT|1|{satellite_id}|{start}|{peak}|{end}|{elevation:.2f}\n"


def validate_ack_line(line: str, satellite_id: str) -> bool:
                                                                          
    parts = str(line).strip().split("|")
    if parts == ["ACK", "1", satellite_id, "OK"]:
        return True
    if len(parts) >= 3 and parts[0] == "ERR":
        raise ValueError("O ESP32 rejeitou a mensagem: " + "|".join(parts[2:]))
    raise ValueError("Resposta serial inesperada do ESP32.")
