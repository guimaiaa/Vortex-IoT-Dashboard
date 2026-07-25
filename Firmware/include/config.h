#pragma once

// WiFi credentials live in secrets.h, which is gitignored - see secrets.h.example.
#include "secrets.h"

// ---- Backend ----
// Use your backend machine's LAN IP, not localhost - the ESP32 is a separate device on the network.
// Find it with `ipconfig getifaddr en0` (Wi-Fi) or `ifconfig` on the machine running the backend.
#define SERVER_URL "http://192.168.0.162:8000"

// ---- Device identity ----
#define DEVICE_ID "VTX001"

// ---- Sensor selection ----
// 0 = DHT11 (default, matches the hardware used in this build)
// 1 = BME280 (alternative, if you swap sensors)
#define USE_BME280 0
#define DHT_TYPE DHT11

// ---- Pin map ----
#define DHT_PIN 4
#define LDR_PIN 34 // analog input (ADC1, input-only pin, no pull resistor needed)

// Wemos D1 R32's onboard LED (single color, not RGB) - used instead of an external LED.
#define ONBOARD_LED_PIN 2

#define BUZZER_PIN 26
#define BUZZER_TONE_HZ 2000
#define BUZZER_BEEP_ON_MS 150  // chirp duration while alerting
#define BUZZER_BEEP_OFF_MS 350 // silence between chirps

// 5-button joystick module: resistor-ladder type, all 5 buttons share a single ADC pin,
// each button produces a different raw analogRead() value. CENTER fulfills the brief's
// required "botao": mutes buzzer + forces an immediate publish.
#define JOY_PIN 36 // ADC1 input-only pin (VP, safe to read with WiFi active, unlike ADC2 pins)

// Set to 1 to print the raw ADC value to Serial every 200ms instead of classifying
// buttons - hold each button and note the printed value, then fill in the JOY_*_VALUE
// constants below and set this back to 0.
#define JOY_CALIBRATE 0

// Calibrated on the physical module (readings taken via JOY_CALIBRATE mode):
// idle=4095, CENTER=2860-2900, RIGHT=1730-1790, LEFT=0, UP=410-440, DOWN=1010-1050.
// Tolerance of 150 stays clear of every neighboring value (tightest gap is
// LEFT(0)/UP(425), 212 apart, so +/-150 never overlaps).
#define JOY_IDLE_VALUE 4095
#define JOY_UP_VALUE 425
#define JOY_DOWN_VALUE 1030
#define JOY_LEFT_VALUE 0
#define JOY_RIGHT_VALUE 1760
#define JOY_CENTER_VALUE 2880
#define JOY_TOLERANCE 150 // +/- range around each value that still counts as that button

// ---- Timing ----
#define PUBLISH_INTERVAL_MS 10000
#define WIFI_RECONNECT_INTERVAL_MS 5000
#define HTTP_TIMEOUT_MS 5000
#define BUTTON_DEBOUNCE_MS 250

// ---- Timezone (America/Sao_Paulo - Brasilia time, UTC-3, no DST since 2019) ----
#define TIMEZONE_OFFSET_SEC (-3 * 3600)
#define TIMEZONE_DST_OFFSET_SEC 0

// ---- Alert thresholds ----
#define TEMP_HIGH_THRESHOLD_C 30.0
#define TEMP_LOW_THRESHOLD_C 10.0
