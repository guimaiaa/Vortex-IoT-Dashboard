# Deploy em nuvem (passo a passo completo)

O README foca em rodar o projeto localmente (o que a avaliação do desafio espera). Este arquivo documenta, em detalhe, como a instância pública em `pulseorigin.com.br/iot-dashboard` foi colocada no ar, caso alguém queira reproduzir o mesmo setup.

## 1. Backend (Render Web Service, Docker)

1. Render → **New** → **Web Service** → conecta o repositório
2. **Root Directory**: `Backend`
3. **Language**: Docker (detecta o `Dockerfile` sozinho)
4. **Instance Type**: Free
5. **Environment Variables**: `PORT=8000` (garante que o Render encontre a porta certa do container; os demais valores - `OFFLINE_THRESHOLD_SECONDS`, `MEASUREMENT_RETENTION_DAYS`, etc. - podem ficar com o default do código)
6. Cria o serviço e anota a URL pública gerada (`https://SEU-BACKEND.onrender.com`)

## 2. Frontend (Render Static Site)

1. Render → **New** → **Static Site** → mesmo repositório
2. **Root Directory**: `Frontend`
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_URL` = URL do backend (passo 1)
   - `VITE_BASE_PATH` = `/iot-dashboard/` (necessário só se for usar o proxy de domínio próprio da seção 4; sem essa env var, o build serve normalmente da raiz)

## 3. Firmware

Em `Firmware/include/config.h`, troca `SERVER_URL` para a URL pública do backend, com `https://`. O firmware detecta esse prefixo sozinho e passa a usar `WiFiClientSecure` (o Render só aceita HTTPS, não há opção de HTTP puro).

## 4. Domínio próprio sob um caminho (Cloudflare Worker)

O Render só oferece domínio customizado no nível de um (sub)domínio inteiro - não dá pra apontar só um caminho (`/iot-dashboard`) de um domínio que já tem outro site rodando nele. A solução foi um **Cloudflare Worker** fazendo proxy, sem afetar o resto do domínio:

1. `Frontend/vite.config.js` lê `base` da env var `VITE_BASE_PATH` (ver passo 2) - isso faz todo asset do HTML/JS referenciar o prefixo `/iot-dashboard/`.
2. Um Cloudflare Worker (script completo em `docs/cloudflare-worker.js`) intercepta as requisições em `pulseorigin.com.br/iot-dashboard*`, remove esse prefixo e busca o conteúdo real no Render (que continua servindo os arquivos na raiz dele), devolvendo a resposta como se fosse do próprio domínio.
3. Configuração no painel da Cloudflare: Workers & Pages → Create Worker → cola o script → Deploy → aba Triggers → Routes → Add Route com o padrão `pulseorigin.com.br/iot-dashboard*` (sem `*.` na frente, que casaria só subdomínios, não o domínio raiz).

A URL no navegador nunca muda para `onrender.com` - o proxy acontece de forma transparente na borda da Cloudflare.

## Limitações do plano gratuito (Render)

- O backend "hiberna" após ~15min sem uso - a primeira requisição depois disso demora uns 30-50s pra acordar.
- O disco não é persistente - o histórico de medições no SQLite se perde a cada redeploy/reinício do serviço (o `cleanup_loop` de retenção de 2 dias continua funcionando normalmente enquanto o serviço estiver de pé).
- `VITE_BASE_PATH` só deve ser setado no Render - localmente (`npm run dev`, `docker compose up --build`) essa env var não existe, então o build local continua servindo da raiz sem prefixo.

---

# Cloud Deploy (full step-by-step)

*(English translation below - see above for the original Portuguese version.)*

The README focuses on running the project locally (what the challenge evaluation expects). This file documents, in detail, how the public instance at `pulseorigin.com.br/iot-dashboard` was put online, in case someone wants to reproduce the same setup.

## 1. Backend (Render Web Service, Docker)

1. Render → **New** → **Web Service** → connect the repository
2. **Root Directory**: `Backend`
3. **Language**: Docker (auto-detects the `Dockerfile`)
4. **Instance Type**: Free
5. **Environment Variables**: `PORT=8000` (makes sure Render finds the container's actual port; the other values - `OFFLINE_THRESHOLD_SECONDS`, `MEASUREMENT_RETENTION_DAYS`, etc. - can be left at the code's defaults)
6. Create the service and note the generated public URL (`https://YOUR-BACKEND.onrender.com`)

## 2. Frontend (Render Static Site)

1. Render → **New** → **Static Site** → same repository
2. **Root Directory**: `Frontend`
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_URL` = the backend URL (step 1)
   - `VITE_BASE_PATH` = `/iot-dashboard/` (only needed if you're using the custom-domain proxy from section 4; without this env var, the build serves normally from the root)

## 3. Firmware

In `Firmware/include/config.h`, change `SERVER_URL` to the backend's public URL, with `https://`. The firmware detects that prefix on its own and switches to `WiFiClientSecure` (Render only accepts HTTPS, there's no plain-HTTP option).

## 4. Custom domain under a path (Cloudflare Worker)

Render only offers custom domains at the level of an entire (sub)domain - there's no way to point just one path (`/iot-dashboard`) of a domain that already has another site running on it. The solution was a **Cloudflare Worker** acting as a proxy, without touching the rest of the domain:

1. `Frontend/vite.config.js` reads `base` from the `VITE_BASE_PATH` env var (see step 2) - this makes every HTML/JS asset reference the `/iot-dashboard/` prefix.
2. A Cloudflare Worker (full script in `docs/cloudflare-worker.js`) intercepts requests to `pulseorigin.com.br/iot-dashboard*`, strips that prefix, and fetches the real content from Render (which keeps serving the files at its own root), returning the response as if it came from the custom domain itself.
3. Configuration in the Cloudflare dashboard: Workers & Pages → Create Worker → paste the script → Deploy → Triggers tab → Routes → Add Route with the pattern `pulseorigin.com.br/iot-dashboard*` (no `*.` in front, which would only match subdomains, not the root domain).

The URL in the browser never changes to `onrender.com` - the proxying happens transparently at Cloudflare's edge.

## Free tier limitations (Render)

- The backend "sleeps" after ~15min of inactivity - the first request after that takes about 30-50s to wake up.
- The disk isn't persistent - the SQLite measurement history is lost on every redeploy/restart of the service (the `cleanup_loop` for 2-day retention keeps working normally while the service is up).
- `VITE_BASE_PATH` should only be set on Render - locally (`npm run dev`, `docker compose up --build`) that env var doesn't exist, so the local build keeps serving from the root with no prefix.
