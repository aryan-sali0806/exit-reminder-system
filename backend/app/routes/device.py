"""
Device (ESP32) endpoints — no JWT required; authenticated via device_key.
"""
from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse

from backend.app.database import get_db
from backend.app.models import ScanRequest, ScanResponse, DeviceKeyResponse
from backend.app.rule_engine import compute_required, make_speech

router = APIRouter(tags=["device"])


async def _resolve_user(device_key: str, db):
    user = await db.users.find_one({"device_key": device_key})
    if not user:
        raise HTTPException(401, "Unknown device key")
    return user


async def _do_scan(req: ScanRequest, db) -> ScanResponse:
    user = await _resolve_user(req.device_key, db)
    uid = str(user["_id"])

    # All user tags: epc -> {name, id}
    all_tags = await db.tags.find({"user_id": uid}).to_list(None)
    epc_map = {t["epc"]: {"name": t["name"], "id": str(t["_id"])} for t in all_tags}

    # Build a reverse map: tag_id (str) -> tag_name
    id_to_name = {info["id"]: info["name"] for info in epc_map.values()}

    # Active lists with their tag names
    active_lists = await db.lists.find({"user_id": uid, "active": True}).to_list(None)
    enriched = []
    for lst in active_lists:
        tag_names = [id_to_name[tid] for tid in lst.get("tag_ids", []) if tid in id_to_name]
        enriched.append({"tag_names": tag_names})

    required_names = sorted(compute_required(enriched))

    # Scanned: split into registered and unregistered
    scanned_names: List[str] = []
    unregistered: List[str] = []
    for epc in req.scanned_epcs:
        if epc in epc_map:
            scanned_names.append(epc_map[epc]["name"])
        else:
            unregistered.append(epc)

    missing_names = sorted(set(required_names) - set(scanned_names))
    speech = make_speech(missing_names)
    alert = len(missing_names) > 0

    # Save event
    result = await db.events.insert_one({
        "user_id": uid,
        "scanned_epcs": req.scanned_epcs,
        "required_names": required_names,
        "missing_names": missing_names,
        "alert": alert,
        "speech": speech,
        "ts": datetime.now(timezone.utc),
    })

    # Track unregistered EPCs on the user doc
    if unregistered:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$addToSet": {"unregistered_epcs_seen": {"$each": unregistered}}},
        )

    return ScanResponse(
        required=required_names,
        scanned=sorted(scanned_names),
        missing=missing_names,
        alert=alert,
        speech=speech,
        event_id=str(result.inserted_id),
    )


@router.post("/device/scan", response_model=ScanResponse)
async def device_scan(req: ScanRequest, db=Depends(get_db)):
    return await _do_scan(req, db)


@router.post("/check", response_model=ScanResponse)
async def check_legacy(req: ScanRequest, db=Depends(get_db)):
    """Backward-compatible alias for /device/scan. Requires device_key in body."""
    return await _do_scan(req, db)


@router.get("/device/latest")
async def device_latest(device_key: str, db=Depends(get_db)):
    """Latest scan result for a device. Used by the /voice browser page."""
    user = await _resolve_user(device_key, db)
    uid = str(user["_id"])
    event = await db.events.find_one({"user_id": uid}, sort=[("ts", -1)])
    if not event:
        return {"alert": False, "speech": "", "missing": [], "required": []}
    return {
        "event_id": str(event["_id"]),
        "alert": event["alert"],
        "speech": event["speech"],
        "missing": event["missing_names"],
        "required": event["required_names"],
        "ts": event["ts"].isoformat(),
    }


# /voice browser page — requires device_key query param
_VOICE_HTML = """<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Exit Reminder Voice</title>
<style>body{font-family:system-ui;max-width:520px;margin:40px auto;padding:0 16px}
button{font-size:18px;padding:12px 20px}#msg{margin-top:24px;font-size:22px}</style></head>
<body><h2>Smart Exit Reminder: voice output</h2>
<p>Click once to enable sound, then keep this tab open.</p>
<button id="go">Enable voice</button><div id="msg">Waiting...</div>
<script>
const key = new URLSearchParams(location.search).get('device_key') || '';
let seen = null, on = false;
document.getElementById('go').onclick = () => {
  on = true;
  speechSynthesis.speak(new SpeechSynthesisUtterance('Voice enabled'));
  document.getElementById('go').textContent = 'Voice enabled ✓';
};
async function poll() {
  try {
    const r = await fetch('/device/latest?device_key=' + encodeURIComponent(key));
    if (r.status === 401) { document.getElementById('msg').textContent='Invalid device key.'; return; }
    const d = await r.json();
    const id = d.event_id || '';
    if (seen === null) { seen = id; }
    else if (id && id !== seen) {
      seen = id;
      document.getElementById('msg').textContent = d.speech;
      if (on) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(d.speech)); }
    }
  } catch(e) {}
  setTimeout(poll, 2000);
}
poll();
</script></body></html>"""


@router.get("/voice", response_class=HTMLResponse)
async def voice_page(device_key: str = "", db=Depends(get_db)):
    if not device_key:
        return HTMLResponse("<h2>device_key query parameter required</h2>", status_code=401)
    if not await db.users.find_one({"device_key": device_key}):
        return HTMLResponse("<h2>Invalid device key</h2>", status_code=401)
    return HTMLResponse(_VOICE_HTML)
