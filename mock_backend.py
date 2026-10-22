"""
Mock FastAPI backend for the Smart Exit Reminder System.
Implements the paper's rule engine:
    C_required = Base ∪ WeatherRules ∪ ScheduleRules
    Missing    = C_required \ T_scanned
 
Run locally:
    pip install fastapi uvicorn
    python mock_backend.py
 
Then expose via ngrok (free):
    ngrok http 8000
    → paste the https://xxxx.ngrok-free.app/check URL into sketch.ino
"""
 
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import time
from pydantic import BaseModel
from typing import List
import uvicorn
 
app = FastAPI(title="Smart Exit Reminder — Mock Backend")
 
# ── Tag database ──────────────────────────────────────────────
TAG_DB = {
    "E200001122334455": "Wallet",
    "E200AABBCCDDEEFF": "Keys",
    "E20011223344AABB": "Umbrella",
}
 
# ── Mock context (change these to test different scenarios) ───
MOCK_WEATHER = "rainy"        # "clear" | "rainy" | "cold"
MOCK_CALENDAR = ""            # "" | "gym at 6pm" (adds a Gym Bag rule, which has no tag in the sim)
 
# ── Rule engine ───────────────────────────────────────────────
def get_required_items() -> set:
    """
    Base ∪ WeatherRules ∪ ScheduleRules → set of required item names.
    """
    required = {"Wallet", "Keys"}                # Base set
 
    # Weather rules
    if MOCK_WEATHER == "rainy":
        required.add("Umbrella")
    elif MOCK_WEATHER == "cold":
        required.add("Jacket")                   # (not wired in sim)
 
    # Schedule rules (example)
    if "gym" in MOCK_CALENDAR.lower():
        required.add("Gym Bag")                  # (not wired in sim)
 
    return required
 
# Last result, polled by the /voice page so the browser can speak it
LATEST = {"seq": 0, "speech": "", "missing": [], "ts": 0}
 
def make_speech(missing):
    if not missing:
        return "All items carried. Have a good day."
    if len(missing) == 1:
        items = missing[0]
    else:
        items = ", ".join(missing[:-1]) + " and " + missing[-1]
    return f"Alert. Please remember your {items}."
 
class ScanRequest(BaseModel):
    scanned_epcs: List[str]
 
@app.post("/check")
def check_items(req: ScanRequest):
    scanned_names = {TAG_DB.get(epc, epc) for epc in req.scanned_epcs}
    required      = get_required_items()
    missing       = sorted(required - scanned_names)
 
    LATEST.update(seq=LATEST["seq"] + 1, speech=make_speech(missing),
                  missing=missing, ts=time.time())
    return {
        "required": sorted(required),
        "scanned":  sorted(scanned_names),
        "missing":  missing,
        "weather":  MOCK_WEATHER,
        "calendar": MOCK_CALENDAR,
        "alert":    len(missing) > 0,
    }
 
@app.get("/latest")
def latest():
    return LATEST
 
VOICE_PAGE = """<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Exit Reminder Voice</title>
<style>body{font-family:system-ui;max-width:520px;margin:40px auto;padding:0 16px}
button{font-size:18px;padding:12px 20px}#msg{margin-top:24px;font-size:22px}</style></head>
<body><h2>Smart Exit Reminder: voice output</h2>
<p>Click once to enable sound, then keep this tab open while you run the Wokwi simulation.</p>
<button id="go">Enable voice</button><div id="msg">Waiting for the doorway sensor...</div>
<script>
let seen = null, on = false;
document.getElementById('go').onclick = () => {
  on = true;
  speechSynthesis.speak(new SpeechSynthesisUtterance('Voice enabled'));
  document.getElementById('go').textContent = 'Voice enabled';
};
async function poll() {
  try {
    const r = await fetch('/latest', {headers: {'ngrok-skip-browser-warning': 'true'}});
    const d = await r.json();
    if (seen === null) seen = d.seq;            // ignore anything older than this page
    else if (d.seq !== seen) {
      seen = d.seq;
      document.getElementById('msg').textContent = d.speech;
      if (on) {
        speechSynthesis.cancel();
        speechSynthesis.speak(new SpeechSynthesisUtterance(d.speech));
      }
    }
  } catch (e) {}
  setTimeout(poll, 1000);
}
poll();
</script></body></html>"""
 
@app.get("/voice", response_class=HTMLResponse)
def voice():
    return VOICE_PAGE
 
@app.get("/health")
def health():
    return {"status": "ok"}
 
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)