const TOKEN = process.env.ADMIN_TOKEN || 'astorie';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = req.headers['x-admin-token'] === TOKEN;
  return res.status(admin ? 200 : 401).json({ ok: admin });
};
