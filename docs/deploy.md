# Deploy em nuvem (passo a passo completo)

O README foca em rodar o projeto localmente (o que a avaliacao do desafio espera). Este arquivo documenta, em detalhe, como a instancia publica em `pulseorigin.com.br/iot-dashboard` foi colocada no ar, caso alguem queira reproduzir o mesmo setup.

## 1. Backend (Render Web Service, Docker)

1. Render → **New** → **Web Service** → conecta o repositorio
2. **Root Directory**: `Backend`
3. **Language**: Docker (detecta o `Dockerfile` sozinho)
4. **Instance Type**: Free
5. **Environment Variables**: `PORT=8000` (garante que o Render encontre a porta certa do container; os demais valores - `OFFLINE_THRESHOLD_SECONDS`, `MEASUREMENT_RETENTION_DAYS`, etc. - podem ficar com o default do codigo)
6. Cria o servico e anota a URL publica gerada (`https://SEU-BACKEND.onrender.com`)

## 2. Frontend (Render Static Site)

1. Render → **New** → **Static Site** → mesmo repositorio
2. **Root Directory**: `Frontend`
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_URL` = URL do backend (passo 1)
   - `VITE_BASE_PATH` = `/iot-dashboard/` (necessario so se for usar o proxy de dominio proprio da secao 4; sem essa env var, o build serve normalmente da raiz)

## 3. Firmware

Em `Firmware/include/config.h`, troca `SERVER_URL` para a URL publica do backend, com `https://`. O firmware detecta esse prefixo sozinho e passa a usar `WiFiClientSecure` (o Render so aceita HTTPS, nao ha opcao de HTTP puro).

## 4. Dominio proprio sob um caminho (Cloudflare Worker)

O Render so oferece dominio customizado no nivel de um (sub)dominio inteiro - nao da pra apontar so um caminho (`/iot-dashboard`) de um dominio que ja tem outro site rodando nele. A solucao foi um **Cloudflare Worker** fazendo proxy, sem afetar o resto do dominio:

1. `Frontend/vite.config.js` le `base` da env var `VITE_BASE_PATH` (ver passo 2) - isso faz todo asset do HTML/JS referenciar o prefixo `/iot-dashboard/`.
2. Um Cloudflare Worker (script completo em `docs/cloudflare-worker.js`) intercepta as requisicoes em `pulseorigin.com.br/iot-dashboard*`, remove esse prefixo e busca o conteudo real no Render (que continua servindo os arquivos na raiz dele), devolvendo a resposta como se fosse do proprio dominio.
3. Configuracao no painel da Cloudflare: Workers & Pages → Create Worker → cola o script → Deploy → aba Triggers → Routes → Add Route com o padrao `pulseorigin.com.br/iot-dashboard*` (sem `*.` na frente, que casaria so subdominios, nao o dominio raiz).

A URL no navegador nunca muda para `onrender.com` - o proxy acontece de forma transparente na borda da Cloudflare.

## Limitacoes do plano gratuito (Render)

- O backend "hiberna" apos ~15min sem uso - a primeira requisicao depois disso demora uns 30-50s pra acordar.
- O disco nao e persistente - o historico de medicoes no SQLite se perde a cada redeploy/reinicio do servico (o `cleanup_loop` de retencao de 2 dias continua funcionando normalmente enquanto o servico estiver de pe).
- `VITE_BASE_PATH` so deve ser setado no Render - localmente (`npm run dev`, `docker compose up --build`) essa env var nao existe, entao o build local continua servindo da raiz sem prefixo.
