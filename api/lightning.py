"""Vercel serverless adapter for authentic NOAA GOES-19 GLM flash data."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from hashlib import sha1
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from xml.etree import ElementTree
import json
import re
import threading
import time

from netCDF4 import Dataset, num2date

BUCKET = "https://noaa-goes19.s3.amazonaws.com"
BOUNDS = (-92.6, -6.2, -74.5, 3.0)
CACHE_TTL_SECONDS = 120
_cache = {}
_cache_lock = threading.Lock()


def _get(url, timeout=20):
    request = Request(url, headers={"User-Agent": "GeoCenso-Ecuador/1.0"})
    with urlopen(request, timeout=timeout) as response:
        return response.read()


def _hour_prefixes(start, end):
    current = start.replace(minute=0, second=0, microsecond=0)
    while current <= end:
        yield f"GLM-L2-LCFA/{current.year}/{current.timetuple().tm_yday:03d}/{current.hour:02d}/"
        current += timedelta(hours=1)


def _list_keys(prefix):
    root = ElementTree.fromstring(_get(f"{BUCKET}/?list-type=2&prefix={prefix}&max-keys=1000"))
    namespace = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}
    return [item.text for item in root.findall("s3:Contents/s3:Key", namespace) if item.text]


def _file_start(key):
    match = re.search(r"_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})", key)
    if not match:
        return None
    year, day, hour, minute, second = map(int, match.groups())
    return datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=day - 1, hours=hour, minutes=minute, seconds=second)


def _iso_datetime(value):
    text = value.isoformat() if hasattr(value, "isoformat") else str(value)
    if text.endswith("+00:00"):
        return text[:-6] + "Z"
    return text if text.endswith("Z") else text + "Z"


def _read_flashes(key, cutoff, payload=None):
    payload = payload if payload is not None else _get(f"{BUCKET}/{key}", timeout=25)
    with Dataset("inmemory.nc", mode="r", memory=payload) as dataset:
        latitudes = dataset.variables["flash_lat"][:]
        longitudes = dataset.variables["flash_lon"][:]
        offsets = dataset.variables["flash_time_offset_of_first_event"]
        values = offsets[:]
        units = getattr(offsets, "units", None)
        calendar = getattr(offsets, "calendar", "standard")
        fallback_start = _file_start(key) or cutoff
        observations = num2date(values, units, calendar=calendar, only_use_cftime_datetimes=False) if units else [fallback_start + timedelta(seconds=float(value)) for value in values]
        features = []
        for index, (latitude, longitude, observed) in enumerate(zip(latitudes, longitudes, observations)):
            lat, lon, observed_at = float(latitude), float(longitude), _iso_datetime(observed)
            try:
                observed_date = datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
            except ValueError:
                observed_date = fallback_start
            if observed_date < cutoff or not (BOUNDS[0] <= lon <= BOUNDS[2] and BOUNDS[1] <= lat <= BOUNDS[3]):
                continue
            features.append({
                "type": "Feature", "id": sha1(f"{key}:{index}".encode()).hexdigest()[:16],
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {"observedAt": observed_at, "source": "NOAA GOES-19 GLM-L2-LCFA"},
            })
        return features


def _build_payload(minutes):
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=minutes)
    keys = []
    for prefix in _hour_prefixes(cutoff, now):
        keys.extend(_list_keys(prefix))
    selected = [key for key in keys if (_file_start(key) or cutoff) >= cutoff - timedelta(seconds=30)]
    selected = selected[-(minutes * 3 + 3):]
    features, processed, failures = [], 0, 0
    downloads = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(_get, f"{BUCKET}/{key}", 25): key for key in selected}
        for future in as_completed(futures):
            try:
                downloads[futures[future]] = future.result()
            except Exception:
                failures += 1
    # netCDF4/HDF5 parsing is deliberately sequential: several common builds are not thread-safe.
    for key, payload in downloads.items():
        try:
            features.extend(_read_flashes(key, cutoff, payload))
            processed += 1
        except Exception:
            failures += 1
    if selected and processed == 0:
        raise RuntimeError(f"No se pudo procesar ninguno de los {len(selected)} archivos NetCDF disponibles.")
    features.sort(key=lambda item: item["properties"]["observedAt"])
    return {"type": "FeatureCollection", "features": features, "metadata": {
        "source": "NOAA Open Data on AWS", "satellite": "GOES-19 GLM", "requestedMinutes": minutes,
        "generatedAt": now.isoformat().replace("+00:00", "Z"), "filesProcessed": processed, "filesFailed": failures,
        "note": "Flashes ópticos detectados por GLM; no equivalen a descargas nube-tierra confirmadas.",
    }}


def _cached_payload(minutes):
    with _cache_lock:
        cached = _cache.get(minutes)
        if cached and time.time() - cached[0] < CACHE_TTL_SECONDS:
            return cached[1]
    payload = _build_payload(minutes)
    with _cache_lock:
        _cache[minutes] = (time.time(), payload)
    return payload


class handler(BaseHTTPRequestHandler):
    def _respond(self, status, payload):
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/geo+json; charset=utf-8")
        self.send_header("Cache-Control", "public, s-maxage=120, stale-while-revalidate=60")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            minutes = int(parse_qs(urlparse(self.path).query).get("minutes", ["15"])[0])
        except ValueError:
            minutes = 15
        if minutes not in (15, 30, 60):
            self._respond(400, {"error": "minutes debe ser 15, 30 o 60"})
            return
        try:
            self._respond(200, _cached_payload(minutes))
        except Exception as error:
            self._respond(502, {"error": "No fue posible procesar NOAA GLM.", "detail": str(error)})

