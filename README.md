# Vortex IoT — Plataforma de Monitoramento Inteligente de Ambientes

Projeto desenvolvido para o desafio técnico do processo seletivo de estagio em IoT do Laboratorio Vortex (UNIFOR).

ESP32 + sensores → backend REST/WebSocket → dashboard web em tempo real.

Veja `docs/architecture.md` para o diagrama de fluxo de dados, contrato da API e maquina de estados do firmware, e `docs/wiring.md` para o pinout completo.

## Estrutura

```
vortex-iot/
├── Firmware/    # projeto PlatformIO (ESP32, C++/Arduino)
├── Backend/     # FastAPI + SQLite + WebSocket
├── Frontend/    # dashboard Vite + React
├── docs/        # arquitetura e pinout
├── video/       # video de apresentacao (max. 6 min)
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

Testes: `pytest tests/ -v` (7 testes, sem hardware necessario).

A API sobe em `http://localhost:8000` (docs interativas em `/docs`).

### Frontend

```bash
cd Frontend
cp .env.example .env   # ajuste VITE_API_URL se o backend nao estiver em localhost:8000
npm install
npm run dev
```

Abre em `http://localhost:5173`. Atualiza em tempo real via WebSocket assim que o ESP32 (ou um POST de teste) enviar dados.

### Firmware (Wemos D1 R32 / ESP32)

1. Copie `Firmware/include/secrets.h.example` para `Firmware/include/secrets.h` e preencha `WIFI_SSID` / `WIFI_PASSWORD` com sua rede real (esse arquivo e gitignored, nunca vai pro repositorio).
2. Edite `Firmware/include/config.h`:
   - `SERVER_URL` — IP local da maquina rodando o backend (ex: `http://192.168.0.100:8000`), **nao** `localhost`
   - Ajuste o pinout em `docs/wiring.md` se sua fiacao for diferente
3. Abra `Firmware/` no PlatformIO (VS Code) ou use a CLI: `pio run --target upload`.
4. Grave na placa e acompanhe o Serial Monitor (115200 baud) para confirmar conexao Wi-Fi e envio dos payloads.

Testado com: `pio run` compila sem erros contra a placa `wemos_d1_uno32` (Wemos D1 R32). A gravacao e o teste fisico (sensores, LED onboard, buzzer, joystick) ficam por sua conta, ja que o ambiente de desenvolvimento nao tem acesso USB ao hardware.

### Docker (opcional)

```bash
docker compose up --build
```

Sobe backend (`:8000`) e frontend (`:5173` servido via Vite preview) juntos.

## Testando sem hardware fisico

Voce pode simular o ESP32 com `curl`:

```bash
curl -X POST http://localhost:8000/measurements \
  -H "Content-Type: application/json" \
  -d '{"device":"VTX001","temperature":26.3,"humidity":61,"luminosity":420,"timestamp":"2026-07-24T15:00:00"}'
```

## Inteligencia Artificial e Diario de Bordo

> Esta secao foi iniciada com base na sessao real de desenvolvimento assistido por IA. Revise, corrija e complete com sua propria reflexao antes da entrega — o desafio pede uma analise critica genuina, nao um texto gerado.

**Ferramentas utilizadas**: Claude Code (Anthropic), modelo Sonnet 5, no modo agente com acesso a terminal/arquivos.

**Uso**: planejamento da arquitetura (backend FastAPI + WebSocket, dashboard React, firmware PlatformIO), geracao do codigo inicial de cada camada, instalacao/configuracao do toolchain local (Node, PlatformIO), execucao de testes automatizados (`pytest`) e verificacao end-to-end via `curl` e um script WebSocket.

**Prompts importantes**: pedido inicial para montar a solucao completa a partir do PDF do desafio; ajustes de hardware real informados no meio do processo (DHT11 em vez de DHT22, joystick de 5 botoes em vez de botao unico), que mudaram o pinout e a logica de leitura de entrada no firmware.

**Dificuldades encontradas**: _(preencher com o que voce encontrou ao rodar em hardware real — calibracao do LDR, wiring do joystick, ajuste de thresholds, etc.)_

**Como validei as respostas da IA**:
- Backend: suite de testes automatizados (`pytest`, 7 casos incluindo o broadcast via WebSocket) rodando contra um banco SQLite temporario, mais chamadas `curl` manuais contra o servidor real.
- Frontend: `npm run build` sem erros, dev server servindo HTML valido, e um script Python que abriu uma conexao WebSocket real e confirmou que a mensagem recebida ao dar `POST /measurements` bate exatamente com o formato que o componente `App.jsx` espera.
- Firmware: compilado com `pio run` contra a plataforma `espressif32` para pegar erros de sintaxe/bibliotecas antes de gravar no hardware. _(preencher com a validacao fisica: gravacao, Serial Monitor, funcionamento dos sensores/LED/buzzer/joystick reais.)_

**Reflexao critica**: _(preencher — o que a IA acelerou, o que voce teve que corrigir ou entender melhor por conta propria, e onde voce discordou ou ajustou o que foi sugerido.)_
