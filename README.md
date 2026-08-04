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

## Inteligência Artificial e Diário de Bordo

**Ferramentas utilizadas**: Claude Code (Anthropic), modelo Sonnet 5 high - Chat GPT, modelo GPT-5.5 - Google Gemini 3.1 Pro.

**Uso**: planejamento da arquitetura (backend FastAPI + WebSocket, dashboard React, firmware PlatformIO), geração do código de cada camada, revisão do projeto contra o edital, instalação/configuração do toolchain local (Node, PlatformIO), execução de testes automatizados (`pytest`), deploy em nuvem (Render + Cloudflare Worker).

**Prompts importantes**:
- Um prompt grande no início, pedindo para a IA desenhar um planejamento e modelo inicial do projeto inteiro. Depois que ela trouxe esse planejamento, pedi para a própria IA julgar o planejamento que ela mesma tinha acabado de gerar. É uma técnica que na maioria das vezes funciona muito bem: ela consegue apontar erros e inconsistências do primeiro resultado dela, e a segunda versão do planejamento sai bem mais sólida do que a primeira.
- Pedido inicial e final para revisar o projeto contra o PDF do edital.
- Pedido de features novas (contador de próxima leitura, aviso de atualização manual, configuração de alerta pelo dashboard, busca histórica, limpeza automática do banco, deploy em nuvem com domínio próprio).

**Dificuldades encontradas**:
- `LEDC is not initialized` no Serial Monitor, testando o buzzer pela primeira vez: antes de mexer no código, conferi se a fiação do buzzer estava certa, estava tudo certo. Só depois de descartar o hardware fui olhar a lógica no código, onde o problema realmente estava (o firmware chamava `noTone()` toda hora, mesmo antes do buzzer ter tocado uma vez sequer). Corrigido, o erro parou de aparecer.
- Calibração do joystick analógico (módulo resistor ladder, 5 botões num pino só): já tinha os valores calibrados de um projeto anterior meu (o RelogioCorreio, também com ESP32, no GitHub), usando o mesmo módulo de joystick, reaproveitei essa experiência em vez de calibrar do zero.
- Ainda hoje, às vezes preciso apertar o botão do joystick com mais força pra registrar o clique. Acredito que seja porque, sendo um joystick analógico (usa resistores diferentes pra variar a tensão de cada botão), não existe uma calibração 100% fixa e exata, perto da borda da faixa de cada botão, o contato pode não firmar direito.
- Bug de fuso horário, "próxima leitura" chegou a mostrar "10810s" (commit 03cb0ed e 990bac2): demorei um pouco pra perceber o padrão. Percebi que o problema parecia estar ligado a qual dispositivo estava acessando o dashboard, o que me fez pensar que o problema não estava no dado guardado, e sim em como cada aparelho interpretava esse dado, foi esse raciocínio que levou à correção (o backend passou a marcar os horários explicitamente como UTC, e o contador de "próxima leitura" parou de depender do relógio de quem está vendo a tela, contando localmente a partir da última leitura recebida).
- CSS do dashboard sumindo (404) logo depois do primeiro deploy no Render: percebi na hora que a página estava toda sem estilo, mas não cheguei a entender a causa exata, parece ter sido um erro pontual do próprio Render no upload daquele deploy específico. Um novo deploy ("clear cache & deploy") resolveu.
- Erro `JSON parse failed: InvalidInput` buscando `/settings` já na nuvem: demorei mais pra relacionar esse com a mudança pra nuvem. Minha primeira impressão foi que o dado "não estava formatado direito pro código entender", o que no fim não estava tão longe da causa real (o servidor manda a resposta "picada" em pedaços, e a forma como o firmware lia não montava isso direito antes de tentar interpretar o JSON).
- Git: já tinha experiência com Git antes, mas não tinha domínio total de merge, precisei pesquisar um pouco pra entender e resolver um push rejeitado por branches divergentes. E os commits que não aparecem com minha foto de perfil simplesmente porque eu ainda não tinha configurado o `user.email` (tinha esquecido mesmo, resolvido rápido).

**Como validei as respostas da IA**:
- Backend: suíte de testes automatizados (`pytest`, 7 casos incluindo o broadcast via WebSocket) rodando contra um banco SQLite temporário, além de chamadas `curl` manuais contra o servidor real (local e em produção no Render).
- Frontend: `npm run build` sem erros, dashboard testado ao vivo no navegador (desktop e celular), conferindo se os dados batiam com o que o ESP32 físico estava enviando.
- Firmware: compilado com `pio run` contra a placa `wemos_d1_uno32` antes de cada gravação, e testado fisicamente no hardware real, Serial Monitor, sensores, LED, buzzer e joystick.
- Deploy: testado com `curl` direto nas URLs públicas (backend e frontend) e conferido visualmente no navegador, de diferentes redes.

**Reflexão crítica**:

A IA ajudou muito na parte técnica e na formatação/organização do projeto, e foi essencial em vários momentos, mas onde ela não me ajuda muito é na parte visual e criativa. Um exemplo, no começo, o dashboard veio com tema escuro, e eu queria claro; teve também escolhas de como mostrar o valor de luminosidade, formatação de botões e outros detalhes visuais que eu não achei que combinavam e pedi pra mudar. Isso reforça pra mim que decisão de design/estética ainda é uma parte onde a palavra final tem que ser minha, na maioria das vezes que discordei de alguma sugestão, era sobre isso.

Teve bastante coisa que só eu conseguia testar e validar, porque envolvia o hardware físico de verdade: fiação, os sensores em diferentes ambientes e condições (pra confirmar que estavam calibrados e sem nenhum problema físico), e testar o site em diferentes aparelhos e plataformas. Essa parte de teste prático ficou separada do trabalho com a IA, mas foi importantíssima pra achar e corrigir erros que só apareciam no mundo real e com testes reais.

Tecnicamente, já tinha trabalhado um pouco com requisições HTTP antes, mas aprendi muito mais nesse projeto. A parte de nuvem foi um pouco nova pra mim, nunca tinha usado o Render, e gostei bastante de mexer nele, apesar das limitações do plano gratuito, por exemplo, o servidor entra em "standby" depois de um tempo sem receber dado, e quando isso acontece ele para de salvar no banco, isso já foi avisado quando criei a conta, mas só senti a diferença na prática depois que comecei a usar o deploy em nuvem, já que no começo do projeto eu estava rodando tudo só local. Também gostei de como ficou organizado o repositório no GitHub, talvez eu ainda adicione mais fotos/capturas de tela pra completar antes da entrega final. No geral, foi um projeto que gostei bastante de fazer, pensando nele isoladamente, sem nem pensar no processo seletivo.

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
