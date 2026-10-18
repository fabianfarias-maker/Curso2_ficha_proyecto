const fs = require('fs');
const path = require('path');

const TMP_FILE = path.join('/tmp', 'iplacex_fichas_proyectos_db.json');

if (!global.__IPLACEX_FICHAS_STATE) {
  global.__IPLACEX_FICHAS_STATE = { projects: [], lastResetAt: 0, deletedIds: {} };
}

function readState() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { projects: parsed, lastResetAt: 0, deletedIds: {} };
      }
      if (parsed && Array.isArray(parsed.projects)) {
        return {
          projects: parsed.projects,
          lastResetAt: parsed.lastResetAt || 0,
          deletedIds: parsed.deletedIds || {}
        };
      }
    }
  } catch (err) {
    console.warn('Warn reading /tmp db:', err.message);
  }
  return global.__IPLACEX_FICHAS_STATE || { projects: [], lastResetAt: 0, deletedIds: {} };
}

function writeState(state) {
  global.__IPLACEX_FICHAS_STATE = state;
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.warn('Warn writing /tmp db:', err.message);
  }
}

function isProjectValid(p) {
  if (!p || !p.id) return false;
  if (p.isRegistered) return true;
  const hasTeam = typeof p.teamName === 'string' && p.teamName.trim().length >= 2;
  const hasTitle = typeof p.projectTitle === 'string' && p.projectTitle.trim().length >= 2;
  const hasMembers = Array.isArray(p.members) && p.members.some(m => typeof m === 'string' && m.trim().length >= 2);
  return Boolean(hasTeam && hasTitle && hasMembers);
}

function mergeProjectsList(existingList, incomingList, lastResetAt, deletedIds) {
  const map = new Map();
  (existingList || []).forEach(p => {
    if (p && p.id && isProjectValid(p) && !deletedIds[p.id]) {
      map.set(p.id, p);
    }
  });
  (incomingList || []).forEach(inc => {
    if (!inc || !inc.id || !isProjectValid(inc)) return;
    if (deletedIds[inc.id]) return;
    if (lastResetAt && (inc.updatedAt || inc.createdAt || 0) < lastResetAt) return;
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

  const state = readState();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      projects: state.projects,
      lastResetAt: state.lastResetAt || 0,
      serverTime: Date.now()
    });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action || 'upsert';

    if (action === 'upsert' && body.project && body.project.id) {
      if (!isProjectValid(body.project)) {
        return res.status(200).json({ ok: true, projects: state.projects, lastResetAt: state.lastResetAt });
      }
      delete state.deletedIds[body.project.id];
      state.projects = mergeProjectsList(state.projects, [body.project], 0, state.deletedIds);
      writeState(state);
      return res.status(200).json({ ok: true, projects: state.projects, lastResetAt: state.lastResetAt });
    }

    if (action === 'bulk_merge' && Array.isArray(body.projects)) {
      state.projects = mergeProjectsList(state.projects, body.projects, state.lastResetAt, state.deletedIds);
      writeState(state);
      return res.status(200).json({ ok: true, projects: state.projects, lastResetAt: state.lastResetAt });
    }

    if (action === 'delete' && body.id) {
      state.deletedIds[body.id] = Date.now();
      state.projects = state.projects.filter(p => p.id !== body.id);
      writeState(state);
      return res.status(200).json({ ok: true, projects: state.projects, lastResetAt: state.lastResetAt });
    }

    if (action === 'reset') {
      state.projects = [];
      state.lastResetAt = Date.now();
      state.deletedIds = {};
      writeState(state);
      return res.status(200).json({ ok: true, projects: [], lastResetAt: state.lastResetAt });
    }

    return res.status(400).json({ ok: false, error: 'Acción inválida o datos incompletos' });
  }

  return res.status(405).json({ ok: false, error: 'Método no permitido' });
};
