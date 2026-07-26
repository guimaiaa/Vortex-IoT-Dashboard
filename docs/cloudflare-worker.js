// Cloudflare Worker que serve o dashboard (hospedado no Render) sob
// pulseorigin.com.br/iot-dashboard, sem mudar a URL que aparece no navegador.
//
// Configuração no painel da Cloudflare:
// 1. Workers & Pages -> Create -> Create Worker
// 2. Cola este script no editor (formato ES module) e faz Deploy
// 3. No próprio Worker: aba Triggers -> Routes -> Add Route
//    Route: pulseorigin.com.br/iot-dashboard*
//    Zone: pulseorigin.com.br
//
// O front-end (Frontend/vite.config.js) já gera os arquivos com o prefixo
// "/iot-dashboard/" embutido no HTML/JS - esse Worker remove esse prefixo antes
// de buscar no Render, que continua servindo os arquivos na raiz dele.

const RENDER_ORIGIN = "https://vortex-iot-frontend.onrender.com";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const upstreamPath = url.pathname.replace(/^\/iot-dashboard/, "") || "/";
    const upstreamUrl = RENDER_ORIGIN + upstreamPath + url.search;
    return fetch(new Request(upstreamUrl, request));
  },
};
