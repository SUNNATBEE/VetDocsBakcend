const authService = require('./auth.service');

async function register(req, res) {
  const out = await authService.register(req.validated.body, req.env);
  res.status(201).json({ success: true, data: out });
}

async function login(req, res) {
  const out = await authService.login(req.validated.body, req.env);
  res.status(200).json({ success: true, data: out });
}

async function refresh(req, res) {
  const out = await authService.refresh(req.validated.body, req.env);
  res.status(200).json({ success: true, data: out });
}

async function logout(req, res) {
  const out = await authService.logout(req.validated.body || {});
  res.status(200).json({ success: true, data: out });
}

module.exports = { register, login, refresh, logout };
