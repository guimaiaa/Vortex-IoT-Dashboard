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
