Smart Exit Reminder: project brief for Claude Code
How to use this file
Create a folder on your computer, e.g. exit-reminder/, and copy into it the files you already downloaded from this chat: sketch_voice.ino, mock_backend.py, diagram.json, requirements.txt.
Also put in the folder the paper Smart_Exit_Reminder_IEEE_v4.pdf (for reference only).
Open that folder in Claude Code.
Paste everything from "PART 1: CONTEXT" to the end as your first message. (Or save Part 1 as CLAUDE.md in the folder and paste only Part 2.)
PART 1: CONTEXT
Who I am

Aryan, third-year Computer Engineering B.Tech student in India. This is an IoT mini-project with an IEEE-style paper for institutional submission (team: Aryan Sali, Vinayak Patil, Prasad Patil; guides Prof. Shraddha Ovale and Prof. Prapti Kallawar, PCCOE Pune). I prefer plain-language explanations alongside the technical detail. Challenge my design decisions if something is risky. Build the riskiest parts first.

The project: Context-Aware Smart Exit Reminder System

A doorway checkpoint. Items (keys, wallet, ID card, umbrella...) carry passive UHF RFID tags (EPC Gen2). When a PIR sensor sees someone approaching, an ESP32 reads all tags in range through a YRM100 UHF reader and sends the list of EPCs to a backend. The backend works out which required items are missing and the user gets a spoken alert ("Please remember your Keys and Wallet"). Everything is shown on a dashboard.

Paper architecture (from the paper): ESP32 edge node, YRM100 reader, PIR, MAX98357A I2S speaker, FastAPI backend with a rule engine, MongoDB, React/Tailwind dashboard over WebSocket. Rule model: C_required = Base ∪ WeatherRules ∪ ScheduleRules; Missing M = C_required \ T_scanned.

What exists today (a working simulation)

Hardware is not built. It runs as a simulation on Wokwi (wokwi.com):

ESP32 DevKit, PIR sensor (GPIO 27), SSD1306 OLED (I2C SDA 21, SCL 22), buzzer (GPIO 25), and three slide switches standing in for RFID tags: GPIO 13 = Wallet (EPC E200001122334455), GPIO 12 = Keys (E200AABBCCDDEEFF), GPIO 14 = Umbrella (E20011223344AABB). Switch ON means the tag is detected.
Wokwi has no UHF reader and no speaker, so the reader is faked by the switches and the voice is produced by the browser (see below).
sketch_voice.ino (Arduino C++): on PIR trigger it waits 1 s, reads the switches, POSTs JSON {"scanned_epcs": ["E200..."]} over HTTPS to the backend /check, reads the "missing" list from the JSON reply, shows it on the OLED, and beeps once. If the backend call fails it falls back to a built-in offline rule check. It uses WiFiClientSecure.setInsecure() for https (demo only) and a 20 s HTTP timeout because the free Render server sleeps.
mock_backend.py (FastAPI, single file, in-memory): hardcoded TAG_DB (EPC to item name), hardcoded mock weather/calendar constants, POST /check (computes required, scanned, missing; stores a spoken sentence in an in-memory LATEST), GET /latest, GET /voice (a web page that polls /latest every second and speaks new results with the browser's speechSynthesis after the user clicks "Enable voice"), GET /health.
Deployed on Render (free tier) at https://exit-reminder-system.onrender.com, from a GitHub repo of the backend files. Start command: uvicorn mock_backend:app --host 0.0.0.0 --port $PORT. The free tier sleeps after about 15 minutes of no traffic (cold start 30-60 s) and its disk is ephemeral.
Verified working end to end: Wokwi ESP32 → Render → response → OLED + browser voice.

Current API contract used by the ESP32 (keep it working or change it together with the sketch):

Request: POST /check with {"scanned_epcs": ["<EPC>", ...]}
Response: {"required": [...], "scanned": [...], "missing": [...], "alert": bool, ...}
Known limitations and constraints
Wokwi runs on Wokwi's servers, so the ESP32 can only reach a public URL (that is why the backend is on Render).
Render free tier: ephemeral disk (no SQLite file persistence), sleeps when idle. Use a hosted database (MongoDB Atlas free tier fits the paper) and read secrets from environment variables.
The simulation validates software and data flow only, not RF read reliability or real audio hardware. Do not claim otherwise in any text you write.
Never hardcode secrets (JWT secret, DB connection string) or commit them. Use environment variables and a .env.example.