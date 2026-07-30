# Vortex IoT — Plataforma de Monitoramento Inteligente de Ambientes

Projeto desenvolvido para o desafio técnico do processo seletivo de estágio em IoT do Laboratório Vortex (UNIFOR).

ESP32 + sensores → backend REST/WebSocket → dashboard web em tempo real.

Veja `docs/architecture.md` para o diagrama de fluxo de dados, contrato da API e máquina de estados do firmware, e `docs/wiring.md` para o pinout completo.

## Ao vivo agora

**[pulseorigin.com.br/iot-dashboard](https://pulseorigin.com.br/iot-dashboard)** — o ESP32 físico deste projeto está ligado no meu quarto agora, publicando temperatura, umidade e luminosidade reais em tempo real. Qualquer pessoa pode abrir esse link e ver os dados atualizando sozinhos ao vivo, sem precisar rodar nada localmente.

## Estrutura

```
vortex-iot/
├── Firmware/    # projeto PlatformIO (ESP32, C++/Arduino)
├── Backend/     # FastAPI + SQLite + WebSocket
├── Frontend/    # dashboard Vite + React
├── docs/        # arquitetura e pinout
├── video/       # vídeo de apresentação
└── docker-compose.yml
```

## Como rodar

### Backend

Requer **Python 3.10+** (o código usa a sintaxe `X | None` nos type hints, que não existe em versões anteriores).

```bash
cd Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Testes: `pytest tests/ -v` (7 testes, sem hardware necessário).

A API sobe em `http://localhost:8000` (docs interativas em `/docs`).

### Frontend

```bash
cd Frontend
cp .env.example .env   # ajuste VITE_API_URL se o backend não estiver em localhost:8000
npm install
npm run dev
```

Abre em `http://localhost:5173`. Atualiza em tempo real via WebSocket assim que o ESP32 (ou um POST de teste) enviar dados.

### Firmware (Wemos D1 R32 / ESP32)

1. Copie `Firmware/include/secrets.h.example` para `Firmware/include/secrets.h` e preencha `WIFI_SSID` / `WIFI_PASSWORD` com sua rede real (esse arquivo é gitignored, nunca vai pro repositório).
2. Edite `Firmware/include/config.h`:
   - `SERVER_URL` — IP local da máquina rodando o backend (ex: `http://192.168.0.100:8000`), **não** `localhost`
   - Ajuste o pinout em `docs/wiring.md` se sua fiação for diferente
3. Abra `Firmware/` no PlatformIO (VS Code) ou use a CLI: `pio run --target upload`.
4. Grave no ESP32 e acompanhe o Serial Monitor (115200 baud) para confirmar conexão Wi-Fi e envio dos payloads.

Testado com: `pio run` compila sem erros contra a placa `wemos_d1_uno32` (Wemos D1 R32). A gravação e o teste físico (sensores, LED onboard, buzzer, joystick) ficam por sua conta, já que o ambiente de desenvolvimento não tem acesso USB ao hardware.

### Docker (opcional)

```bash
docker compose up --build
```

Sobe backend (`:8000`) e frontend (`:5173` servido via Vite preview) juntos.

## Sobre a instância pública

A instância ao vivo (`pulseorigin.com.br/iot-dashboard`) roda em três peças: o backend em um Web Service Docker no **Render**, o dashboard em um Static Site (também Render), e um **Cloudflare Worker** que faz proxy de `pulseorigin.com.br/iot-dashboard` para esse Static Site — assim o dashboard fica sob meu domínio próprio sem afetar o resto do site que já roda lá.

A principal diferença em relação a rodar localmente: o firmware fala com o backend via `https://` em vez de `http://` (o Render só aceita HTTPS, então o ESP32 usa `WiFiClientSecure` para isso), e o build do frontend recebe um prefixo de caminho extra (`/iot-dashboard/`) que só existe nesse deploy — localmente tudo continua servindo da raiz, sem esse prefixo. Passo a passo completo de como reproduzir esse deploy (incluindo o script do Worker) está em `docs/deploy.md`.

## Testando sem hardware físico

Você pode simular o ESP32 com `curl`:

```bash
curl -X POST http://localhost:8000/measurements \
  -H "Content-Type: application/json" \
  -d '{"device":"VTX001","temperature":26.3,"humidity":61,"luminosity":420,"timestamp":"2026-07-24T15:00:00"}'
```

---

# Vortex IoT — Smart Environment Monitoring Platform

*(English translation below - see above for the original Portuguese version.)*

Project developed for the technical challenge of the IoT internship selection process at Laboratório Vortex (UNIFOR).

ESP32 + sensors → REST/WebSocket backend → real-time web dashboard.

See `docs/architecture.md` for the data flow diagram, API contract, and firmware state machine, and `docs/wiring.md` for the full pinout.

## Live now

**[pulseorigin.com.br/iot-dashboard](https://pulseorigin.com.br/iot-dashboard)** — this project's physical ESP32 is running in my room right now, publishing real temperature, humidity, and luminosity data in real time. Anyone can open that link and watch the data update live, with nothing to run locally.

## Structure

```
vortex-iot/
├── Firmware/    # PlatformIO project (ESP32, C++/Arduino)
├── Backend/     # FastAPI + SQLite + WebSocket
├── Frontend/    # Vite + React dashboard
├── docs/        # architecture and pinout
├── video/       # presentation video
└── docker-compose.yml
```

## How to run

### Backend

Requires **Python 3.10+** (the code uses `X | None` type hint syntax, not available in earlier versions).

```bash
cd Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Tests: `pytest tests/ -v` (7 tests, no hardware needed).

The API comes up at `http://localhost:8000` (interactive docs at `/docs`).

### Frontend

```bash
cd Frontend
cp .env.example .env   # adjust VITE_API_URL if the backend isn't on localhost:8000
npm install
npm run dev
```

Opens at `http://localhost:5173`. Updates in real time over WebSocket as soon as the ESP32 (or a test POST) sends data.

### Firmware (Wemos D1 R32 / ESP32)

1. Copy `Firmware/include/secrets.h.example` to `Firmware/include/secrets.h` and fill in `WIFI_SSID` / `WIFI_PASSWORD` with your real network (this file is gitignored, never committed).
2. Edit `Firmware/include/config.h`:
   - `SERVER_URL` — local IP of the machine running the backend (e.g. `http://192.168.0.100:8000`), **not** `localhost`
   - Adjust the pinout in `docs/wiring.md` if your wiring is different
3. Open `Firmware/` in PlatformIO (VS Code) or use the CLI: `pio run --target upload`.
4. Flash the board and watch the Serial Monitor (115200 baud) to confirm the Wi-Fi connection and payload delivery.

Tested with: `pio run` compiles without errors against the `wemos_d1_uno32` board (Wemos D1 R32). Flashing and physical testing (sensors, onboard LED, buzzer, joystick) are on you, since the development environment has no USB access to the hardware.

### Docker (optional)

```bash
docker compose up --build
```

Brings up the backend (`:8000`) and frontend (`:5173`, served via Vite preview) together.

## About the public instance

The live instance (`pulseorigin.com.br/iot-dashboard`) runs as three pieces: the backend as a Docker Web Service on **Render**, the dashboard as a Static Site (also Render), and a **Cloudflare Worker** that proxies `pulseorigin.com.br/iot-dashboard` to that Static Site — so the dashboard lives under my own domain without touching the rest of the site already running there.

The main difference from running locally: the firmware talks to the backend over `https://` instead of `http://` (Render only accepts HTTPS, so the ESP32 uses `WiFiClientSecure` for that), and the frontend build gets an extra path prefix (`/iot-dashboard/`) that only exists in that deployment — locally everything keeps serving from the root, without that prefix. Full step-by-step instructions for reproducing this deploy (including the Worker script) are in `docs/deploy.md`.

## Testing without physical hardware

You can simulate the ESP32 with `curl`:

```bash
curl -X POST http://localhost:8000/measurements \
  -H "Content-Type: application/json" \
  -d '{"device":"VTX001","temperature":26.3,"humidity":61,"luminosity":420,"timestamp":"2026-07-24T15:00:00"}'
```
