// Início do login da Central UVERGS: manda a pessoa para o GitHub.
// Precisa das variáveis GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET na Vercel.
const crypto = require('crypto');

module.exports = (req, res) => {
  const id = process.env.GITHUB_CLIENT_ID;
  if (!id) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('O login da Central ainda não foi configurado (falta GITHUB_CLIENT_ID na Vercel).');
  }
  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', `central_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.statusCode = 302;
  res.setHeader('Location', 'https://github.com/login/oauth/authorize?' + new URLSearchParams({
    client_id: id,
    scope: 'repo,user',
    state
  }));
  res.end();
};
