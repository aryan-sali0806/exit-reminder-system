/*
 * Context-Aware Smart Exit Reminder System — Wokwi Simulation (Stage 2)
 * ESP32 firmware: PIR → tag scan → POST /device/scan → OLED + beep
 *
 * Stage-2 changes vs original:
 *   - Endpoint changed from /check to /device/scan
 *   - device_key added to POST body (set DEVICE_KEY below)
 *   - 2 extra tag switches: GPIO 26 (ID Card) and GPIO 33 (Laptop Bag)
 *   - Tag list is generic: the backend owns item names; sketch only knows EPCs
 *   - /check still works as a backward-compatible alias on the backend
 *
 * Wiring (matches diagram.json):
 *   PIR sensor       → GPIO 27
 *   Buzzer           → GPIO 25
 *   SSD1306 OLED     → I2C (SDA=21, SCL=22)
 *   Tag switches     → GPIO 13, 12, 14, 26, 33  (INPUT_PULLUP, LOW = tag present)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>

// ── Backend ─────────────────────────────────────────────────────
// Paste your Render URL here (keep /device/scan at the end)
const char* BACKEND_URL = "https://exit-reminder-system.onrender.com/device/scan";

// Paste the device key shown in the mobile app Settings screen
const char* DEVICE_KEY = "";   // e.g. "a3f8c2..."  (32 hex chars)

// ── Wi-Fi ────────────────────────────────────────────────────────
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// ── Pin definitions ──────────────────────────────────────────────
#define PIR_PIN     27
#define BUZZER_PIN  25

// ── OLED ─────────────────────────────────────────────────────────
#define SCREEN_W 128
#define SCREEN_H  64
Adafruit_SSD1306 oled(SCREEN_W, SCREEN_H, &Wire, -1);

// ── Tag switches (simulate UHF RFID tags) ────────────────────────
// Each entry: {EPC string, GPIO pin}
// LOW on pin = tag is on the person.  Add more rows to expand.
struct TagSim {
  const char* epc;
  int         pin;
};

const TagSim TAGS[] = {
  {"E200001122334455", 13},   // originally "Wallet"
  {"E200AABBCCDDEEFF", 12},   // originally "Keys"
  {"E20011223344AABB", 14},   // originally "Umbrella"
  {"E20022334455BBCC", 26},   // new: "ID Card"
  {"E20033445566CCDD", 33},   // new: "Laptop Bag"
};
const int NUM_TAGS = sizeof(TAGS) / sizeof(TAGS[0]);

// ── Forward declarations ─────────────────────────────────────────
void showOled(const char* line1, const char* line2 = "");

// ── State ────────────────────────────────────────────────────────
unsigned long lastTrigger = 0;
const unsigned long COOLDOWN = 10000;

// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Smart Exit Reminder (Stage 2) ===");

  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  for (int i = 0; i < NUM_TAGS; i++)
    pinMode(TAGS[i].pin, INPUT_PULLUP);

  Wire.begin();
  if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C))
    Serial.println("OLED init failed");
  showOled("Exit Reminder", "Stage 2 Ready");

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting Wi-Fi");
  for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500); Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED)
    Serial.printf("\nWi-Fi OK  IP: %s\n", WiFi.localIP().toString().c_str());
  else
    Serial.println("\nWi-Fi failed — offline mode");

  if (strlen(BACKEND_URL) == 0)
    Serial.println("[WARN] BACKEND_URL is empty — will use offline fallback only");
  if (strlen(DEVICE_KEY) == 0)
    Serial.println("[WARN] DEVICE_KEY is empty — backend calls will be rejected (401)");

  Serial.println("Waiting for motion...\n");
}

// ─────────────────────────────────────────────────────────────────
void showOled(const char* line1, const char* line2) {
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(0, 0);
  oled.println(line1);
  if (strlen(line2) > 0) oled.println(line2);
  oled.display();
}

// ─────────────────────────────────────────────────────────────────
int scanTags(String epcs[], int maxCount) {
  int n = 0;
  for (int i = 0; i < NUM_TAGS && n < maxCount; i++) {
    if (digitalRead(TAGS[i].pin) == LOW) {
      epcs[n++] = TAGS[i].epc;
      Serial.printf("  TAG: %s\n", TAGS[i].epc);
    }
  }
  return n;
}

// ─────────────────────────────────────────────────────────────────
void displayResult(String missing[], int missCount) {
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(0, 0);

  if (missCount == 0) {
    oled.println("--- ALL CLEAR ---");
    oled.println();
    oled.println("All items carried.");
    oled.println("Have a good day!");
    Serial.println("  >> ALL CLEAR");
    noTone(BUZZER_PIN);
  } else {
    oled.println("!! MISSING ITEMS !!");
    oled.println();
    for (int i = 0; i < missCount; i++) {
      oled.printf("> %s\n", missing[i].c_str());
      Serial.printf("  >> MISSING: %s\n", missing[i].c_str());
    }
    tone(BUZZER_PIN, 2000, 200);
    delay(300);
  }
  oled.display();
}

// ─────────────────────────────────────────────────────────────────
bool callBackend(String epcs[], int epcCount) {
  if (strlen(BACKEND_URL) == 0 || WiFi.status() != WL_CONNECTED)
    return false;

  WiFiClientSecure wcs;
  wcs.setInsecure();  // demo only: skips TLS certificate verification

  HTTPClient http;
  http.begin(wcs, BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(60000);  // 60 s — Render free tier cold-start can take ~60 s

  // Build {"device_key":"...","scanned_epcs":["E200...",...]}
  StaticJsonDocument<768> doc;
  doc["device_key"] = DEVICE_KEY;
  JsonArray arr = doc.createNestedArray("scanned_epcs");
  for (int i = 0; i < epcCount; i++) arr.add(epcs[i]);

  String body;
  serializeJson(doc, body);
  showOled("Contacting", "server...");
  Serial.printf("  POST %s\n  Body: %s\n", BACKEND_URL, body.c_str());

  int code = http.POST(body);

  if (code == 200) {
    String resp = http.getString();
    Serial.printf("  Response: %s\n", resp.c_str());

    StaticJsonDocument<512> rdoc;
    if (deserializeJson(rdoc, resp)) {
      Serial.println("  JSON parse error");
      http.end();
      return false;
    }

    JsonArray missingArr = rdoc["missing"].as<JsonArray>();
    String missing[NUM_TAGS];
    int missCount = 0;
    for (JsonVariant v : missingArr)
      missing[missCount++] = v.as<String>();

    displayResult(missing, missCount);
    http.end();
    return true;
  }

  if (code == 401)
    Serial.println("  HTTP 401 — check DEVICE_KEY matches your account");
  else
    Serial.printf("  HTTP error: %d\n", code);

  http.end();
  return false;
}

// ─────────────────────────────────────────────────────────────────
void offlineFallback(String epcs[], int epcCount) {
  // Hardcoded offline rule: Wallet + Keys always required
  const char* REQ_EPCS[] = {"E200001122334455", "E200AABBCCDDEEFF"};
  const char* REQ_NAMES[] = {"Wallet", "Keys"};
  String missing[2];
  int missCount = 0;
  for (int r = 0; r < 2; r++) {
    bool found = false;
    for (int s = 0; s < epcCount; s++)
      if (epcs[s] == REQ_EPCS[r]) { found = true; break; }
    if (!found) missing[missCount++] = REQ_NAMES[r];
  }
  displayResult(missing, missCount);
}

// ─────────────────────────────────────────────────────────────────
void loop() {
  if (digitalRead(PIR_PIN) == HIGH && (millis() - lastTrigger > COOLDOWN)) {
    lastTrigger = millis();
    Serial.println(">>> Motion detected!");

    showOled("Motion detected!", "Scanning...");
    delay(1000);

    String epcs[NUM_TAGS];
    int n = scanTags(epcs, NUM_TAGS);
    Serial.printf("  Scanned %d tag(s)\n", n);

    if (!callBackend(epcs, n)) {
      Serial.println("  Backend unreachable — using offline fallback");
      offlineFallback(epcs, n);
    }

    Serial.println();
  }
  delay(100);
}
