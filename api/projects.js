const fs = require('fs');
const path = require('path');

const TMP_FILE = path.join('/tmp', 'iplacex_fichas_proyectos_db.json');

if (!global.__IPLACEX_FICHAS_MEM) {
  global.__IPLACEX_FICHAS_MEM = null;
}

function readLocalTmp() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Warn reading /tmp db:', err.message);
  }
  return global.__IPLACEX_FICHAS_MEM || [];
}

function writeLocalTmp(projects) {
  global.__IPLACEX_FICHAS_MEM = projects;
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(projects, null, 2), 'utf8');
  } catch (err) {
    console.warn('Warn writing /tmp db:', err.message);
  }
}

function mergeProjectsList(existingList, incomingList) {
  const map = new Map();
  (existingList || []).forEach(p => {
    if (p && p.id) map.set(p.id, p);
  });
  (incomingList || []).forEach(inc => {
    if (!inc || !inc.id) return;
    const prev = map.get(inc.id);
    if (!prev || (inc.updatedAt || 0) >= (prev.updatedAt || 0)) {
      map.set(inc.id, inc);
    }
  });
  return Array.from(map.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let projects = readLocalTmp();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      projects,
      serverTime: Date.now()
    });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action || 'upsert';

    if (action === 'upsert' && body.project && body.project.id) {
      projects = mergeProjectsList(projects, [body.project]);
      writeLocalTmp(projects);
      return res.status(200).json({ ok: true, projects });
    }

    if (action === 'bulk_merge' && Array.isArray(body.projects)) {
      projects = mergeProjectsList(projects, body.projects);
      writeLocalTmp(projects);
      return res.status(200).json({ ok: true, projects });
    }

    if (action === 'delete' && body.id) {
      projects = projects.filter(p => p.id !== body.id);
      writeLocalTmp(projects);
      return res.status(200).json({ ok: true, projects });
    }

    if (action === 'reset') {
      projects = [];
      writeLocalTmp(projects);
      return res.status(200).json({ ok: true, projects });
    }

    return res.status(400).json({ ok: false, error: 'Acción inválida o datos incompletos' });
  }

  return res.status(405).json({ ok: false, error: 'Método no permitido' });
};
