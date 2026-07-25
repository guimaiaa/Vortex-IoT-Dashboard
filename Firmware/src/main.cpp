#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <time.h>

#include "config.h"

#if USE_BME280
#include <Adafruit_BME280.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
Adafruit_BME280 bme;
#else
#include <DHT.h>
DHT dht(DHT_PIN, DHT_TYPE);
#endif

enum class SystemState { CONNECTING, OK, ALERT, SENSOR_ERROR };

SystemState currentState = SystemState::CONNECTING;
bool wifiWasConnected = false;

unsigned long lastPublishMs = 0;
unsigned long lastWifiAttemptMs = 0;
bool forcePublish = true; // trigger an immediate sensor read/publish on boot
bool buzzerMuted = false;
bool lastSensorOk = false;

float lastTemperature = NAN;
float lastHumidity = NAN;
int lastLuminosity = 0;

enum class JoyButton { NONE, UP, DOWN, LEFT, RIGHT, CENTER };

JoyButton lastStableJoyButton = JoyButton::NONE;
JoyButton lastRawJoyButton = JoyButton::NONE;
unsigned long lastJoyChangeMs = 0;
unsigned long lastJoyDebugMs = 0;

// Classifies a raw analogRead() value from the resistor-ladder joystick into a button,
// based on the JOY_*_VALUE constants in config.h (fill these in via JOY_CALIBRATE mode).
JoyButton classifyJoystick(int raw) {
  auto near = [raw](int target) { return abs(raw - target) <= JOY_TOLERANCE; };
  if (near(JOY_CENTER_VALUE))
    return JoyButton::CENTER;
  if (near(JOY_UP_VALUE))
    return JoyButton::UP;
  if (near(JOY_DOWN_VALUE))
    return JoyButton::DOWN;
  if (near(JOY_LEFT_VALUE))
    return JoyButton::LEFT;
  if (near(JOY_RIGHT_VALUE))
    return JoyButton::RIGHT;
  return JoyButton::NONE;
}

void connectWifi() {
  Serial.printf("[WiFi] Connecting to %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      Serial.printf("[WiFi] Connected, IP: %s\n", WiFi.localIP().toString().c_str());
    }
    return;
  }
  wifiWasConnected = false;
  unsigned long now = millis();
  if (now - lastWifiAttemptMs >= WIFI_RECONNECT_INTERVAL_MS) {
    lastWifiAttemptMs = now;
    connectWifi();
  }
}

void setupTime() {
  // Brasilia time (UTC-3) via config.h, so every timestamp the device reports is already local.
  configTime(TIMEZONE_OFFSET_SEC, TIMEZONE_DST_OFFSET_SEC, "a.st1.ntp.br", "b.st1.ntp.br", "pool.ntp.org");
}

String isoTimestamp() {
  time_t now;
  time(&now);
  if (now < 100000) {
    // NTP not synced yet - fall back to an obviously-placeholder timestamp
    return String("1970-01-01T00:00:00");
  }
  struct tm timeinfo;
  localtime_r(&now, &timeinfo); // applies TIMEZONE_OFFSET_SEC, unlike gmtime_r
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buf);
}

bool readSensors(float &temperature, float &humidity, int &luminosity) {
  luminosity = analogRead(LDR_PIN); // raw 0-4095 relative light level
#if USE_BME280
  temperature = bme.readTemperature();
  humidity = bme.readHumidity();
#else
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
#endif
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("[Sensor] Read failed");
    return false;
  }
  return true;
}

void publishMeasurement(float temperature, float humidity, int luminosity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Skipping publish, WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(String(SERVER_URL) + "/measurements");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  JsonDocument doc;
  doc["device"] = DEVICE_ID;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["luminosity"] = luminosity;
  doc["timestamp"] = isoTimestamp();

  String body;
  serializeJson(doc, body);

  int status = http.POST(body);
  if (status > 0) {
    Serial.printf("[HTTP] POST /measurements -> %d\n", status);
  } else {
    Serial.printf("[HTTP] POST failed: %s\n", http.errorToString(status).c_str());
  }
  http.end();
}

void doSensorCycle() {
  float temperature, humidity;
  int luminosity;
  lastSensorOk = readSensors(temperature, humidity, luminosity);
  if (lastSensorOk) {
    lastTemperature = temperature;
    lastHumidity = humidity;
    lastLuminosity = luminosity;
    Serial.printf("[Sensor] T=%.1fC H=%.1f%% L=%d\n", temperature, humidity, luminosity);
    publishMeasurement(temperature, humidity, luminosity);
  }
}

void updateState() {
  if (WiFi.status() != WL_CONNECTED) {
    currentState = SystemState::CONNECTING;
    return;
  }
  if (!lastSensorOk) {
    currentState = SystemState::SENSOR_ERROR;
    return;
  }
  if (lastTemperature >= TEMP_HIGH_THRESHOLD_C || lastTemperature <= TEMP_LOW_THRESHOLD_C) {
    currentState = SystemState::ALERT;
  } else {
    currentState = SystemState::OK;
    buzzerMuted = false; // clear any mute once conditions are normal again
  }
}

// Wemos D1 R32 only has a single onboard LED (no RGB), so state is communicated by blink rate:
// slow blink = connecting, solid on = OK, fast blink = alert / sensor error.
void updateLed() {
  switch (currentState) {
  case SystemState::CONNECTING: {
    bool blinkPhase = (millis() / 500) % 2;
    digitalWrite(ONBOARD_LED_PIN, blinkPhase ? HIGH : LOW);
    break;
  }
  case SystemState::OK:
    digitalWrite(ONBOARD_LED_PIN, HIGH);
    break;
  case SystemState::ALERT:
  case SystemState::SENSOR_ERROR: {
    bool blinkPhase = (millis() / 150) % 2;
    digitalWrite(ONBOARD_LED_PIN, blinkPhase ? HIGH : LOW);
    break;
  }
  }
}

bool buzzerSounding = false;

void updateBuzzer() {
  bool shouldSound = (currentState == SystemState::ALERT) && !buzzerMuted;
  // Only call tone()/noTone() on state transitions, not every loop() iteration.
  // On the ESP32 Arduino core 3.x, noTone() on a pin that tone() never attached
  // to the LEDC peripheral logs "LEDC is not initialized" - which happened here
  // because updateBuzzer() used to call noTone() unconditionally from the very
  // first loop, before any tone() call had attached the pin.
  if (shouldSound && !buzzerSounding) {
    tone(BUZZER_PIN, 2000);
    buzzerSounding = true;
  } else if (!shouldSound && buzzerSounding) {
    noTone(BUZZER_PIN);
    buzzerSounding = false;
  }
}

const char *joyButtonName(JoyButton b) {
  switch (b) {
  case JoyButton::UP:
    return "UP";
  case JoyButton::DOWN:
    return "DOWN";
  case JoyButton::LEFT:
    return "LEFT";
  case JoyButton::RIGHT:
    return "RIGHT";
  case JoyButton::CENTER:
    return "CENTER";
  default:
    return "NONE";
  }
}

// Debounces the classified button and fires the CENTER action on the press edge
// (NONE -> CENTER transition), same trigger semantics as a debounced digital button.
void handleJoystick() {
  int raw = analogRead(JOY_PIN);

#if JOY_CALIBRATE
  if (millis() - lastJoyDebugMs >= 200) {
    lastJoyDebugMs = millis();
    Serial.printf("[Joystick] raw ADC = %d\n", raw);
  }
  return;
#endif

  JoyButton rawButton = classifyJoystick(raw);
  if (rawButton != lastRawJoyButton) {
    lastJoyChangeMs = millis();
    lastRawJoyButton = rawButton;
  }

  if ((millis() - lastJoyChangeMs) > BUTTON_DEBOUNCE_MS && rawButton != lastStableJoyButton) {
    JoyButton previous = lastStableJoyButton;
    lastStableJoyButton = rawButton;

    if (rawButton == JoyButton::NONE)
      return; // only act on the press edge (previous == NONE, new != NONE)
    if (previous != JoyButton::NONE)
      return; // ignore sliding straight from one button to another without releasing

    Serial.printf("[Joystick] %s\n", joyButtonName(rawButton));
    if (rawButton == JoyButton::CENTER) {
      Serial.println("[Joystick] CENTER -> mute buzzer + force publish");
      buzzerMuted = true;
      forcePublish = true;
    }
    // Directional presses are classified and debounced but intentionally left as
    // no-ops - extension hooks for later (e.g. cycling a display) rather than scope
    // the brief didn't ask for.
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(ONBOARD_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  analogReadResolution(12);

#if JOY_CALIBRATE
  Serial.println("[Joystick] CALIBRATE mode - press each button and note the raw ADC value printed below");
#endif

#if USE_BME280
  Wire.begin();
  if (!bme.begin(0x76)) {
    Serial.println("[Sensor] Could not find BME280, check wiring/address");
  }
#else
  dht.begin();
#endif

  connectWifi();
  setupTime();

  Serial.println("[Vortex IoT] Firmware boot complete");
}

void loop() {
  ensureWifiConnected();
  handleJoystick();

  unsigned long now = millis();
  if (forcePublish || now - lastPublishMs >= PUBLISH_INTERVAL_MS) {
    lastPublishMs = now;
    forcePublish = false;
    doSensorCycle();
  }

  updateState();
  updateBuzzer();
  updateLed();
}
