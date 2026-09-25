// Volta do GitHub: troca o código pelo acesso e entrega à Central (janela que abriu o login).
module.exports = async (req, res) => {
  const url = new URL(req.url, 'https://central.local');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const saved = (req.headers.cookie || '').match(/(?:^|;\s*)central_state=([a-f0-9]+)/);

  let status = 'error';
  let content = { message: 'Não foi possível confirmar o login. Feche esta janela e tente de novo.' };

  if (code && saved && saved[1] === state) {
    try {
      const r = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code
        })
      });
      const j = await r.json();
      if (j.access_token) {
        status = 'success';
        content = { token: j.access_token, provider: 'github' };
      } else if (j.error_description) {
        content = { message: j.error_description };
      }
    } catch (e) {
      content = { message: 'O GitHub não respondeu. Tente de novo em instantes.' };
    }
  }

  const msg = `authorization:github:${status}:${JSON.stringify(content)}`;
  res.setHeader('Set-Cookie', 'central_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Central UVERGS</title></head>
<body style="font-family:system-ui,sans-serif;padding:24px">Concluindo o login…
<script>
(function () {
  var msg = ${JSON.stringify(msg).replace(/</g, '\\u003c')};
  function receber(e) {
    if (e.origin !== location.origin) return;
    window.opener.postMessage(msg, e.origin);
    window.removeEventListener('message', receber);
  }
  window.addEventListener('message', receber, false);
  if (window.opener) window.opener.postMessage('authorizing:github', location.origin);
  else document.body.textContent = 'Abra a Central pelo endereço /admin/ do site.';
})();
</script></body></html>`);
};
