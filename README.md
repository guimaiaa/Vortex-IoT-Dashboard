# Vortex IoT — Plataforma de Monitoramento Inteligente de Ambientes

Projeto desenvolvido para o desafio técnico do processo seletivo de estágio em IoT do Laboratório Vortex (UNIFOR).

ESP32 + sensores → backend REST/WebSocket → dashboard web em tempo real.

Veja `docs/architecture.md` para o diagrama de fluxo de dados, contrato da API e máquina de estados do firmware, e `docs/wiring.md` para o pinout completo.

## 🔴 Ao vivo agora

**[pulseorigin.com.br/iot-dashboard](https://pulseorigin.com.br/iot-dashboard)** — o ESP32 físico deste projeto está ligado no meu quarto agora, publicando temperatura, umidade e luminosidade reais em tempo real. Qualquer pessoa pode abrir esse link e ver os dados atualizando sozinhos, sem precisar rodar nada localmente.

## Estrutura

```
vortex-iot/
├── Firmware/    # projeto PlatformIO (ESP32, C++/Arduino)
├── Backend/     # FastAPI + SQLite + WebSocket
├── Frontend/    # dashboard Vite + React
├── docs/        # arquitetura e pinout
├── video/       # vídeo de apresentação (máx. 6 min)
└── docker-compose.yml
```

## Como rodar

### Backend

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
4. Grave na placa e acompanhe o Serial Monitor (115200 baud) para confirmar conexão Wi-Fi e envio dos payloads.

Testado com: `pio run` compila sem erros contra a placa `wemos_d1_uno32` (Wemos D1 R32). A gravação e o teste físico (sensores, LED onboard, buzzer, joystick) ficam por sua conta, já que o ambiente de desenvolvimento não tem acesso USB ao hardware.

### Docker (opcional)

```bash
docker compose up --build
```

Sobe backend (`:8000`) e frontend (`:5173` servido via Vite preview) juntos.

## Sobre a instância pública

A instância ao vivo (`pulseorigin.com.br/iot-dashboard`) roda em três peças: o backend em um Web Service Docker no **Render**, o dashboard em um Static Site (também Render), e um **Cloudflare Worker** que faz proxy de `pulseorigin.com.br/iot-dashboard` para esse Static Site — assim o dashboard fica sob um domínio próprio sem afetar o resto do site que já roda lá.

A principal diferença em relação a rodar localmente: o firmware fala com o backend via `https://` em vez de `http://` (o Render só aceita HTTPS, então o ESP32 usa `WiFiClientSecure` para isso), e o build do frontend recebe um prefixo de caminho extra (`/iot-dashboard/`) que só existe nesse deploy — localmente tudo continua servindo da raiz, sem esse prefixo. Passo a passo completo de como reproduzir esse deploy (incluindo o script do Worker) está em `docs/deploy.md`.

## Testando sem hardware físico

Você pode simular o ESP32 com `curl`:

```bash
curl -X POST http://localhost:8000/measurements \
  -H "Content-Type: application/json" \
  -d '{"device":"VTX001","temperature":26.3,"humidity":61,"luminosity":420,"timestamp":"2026-07-24T15:00:00"}'
```
