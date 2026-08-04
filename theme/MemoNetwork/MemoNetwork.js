(() => {
  'use strict';

  const BUILD_INFO = window.MemoNetworkBuild ?? {};
  const VERSION = BUILD_INFO.version ?? '6.0.0';
  const COMMIT = BUILD_INFO.commit ?? 'unknown';
  const BUILD_DATE = BUILD_INFO.date ?? 'unknown';
  const previousStates = new Map();
  const activity = [];
  let initialized = false;

  const compact = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const numberFrom = (value) => {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const ratioFrom = (text) => {
    const match = String(text ?? '').match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)/);
    return match ? { used: numberFrom(match[1]), total: numberFrom(match[2]) } : { used: 0, total: 0 };
  };

  const memoryFrom = (text) => {
    const value = compact(text);
    const ratio = ratioFrom(value);
    const unit = (value.match(/\b(KB|MB|GB|TB)\b/i)?.[1] ?? 'GB').toUpperCase();
    const factor = { KB: 1 / 1048576, MB: 1 / 1024, GB: 1, TB: 1024 }[unit] ?? 1;
    return { used: ratio.used * factor, total: ratio.total * factor };
  };

  const formatMemory = (gb) => gb > 0 && gb < 1
    ? `${Math.round(gb * 1024)} MB`
    : `${gb.toFixed(2)} GB`;

  const percentFrom = (text) => {
    const match = String(text ?? '').match(/(-?\d+(?:[.,]\d+)?)\s*%/);
    return match ? numberFrom(match[1]) : 0;
  };

  const metricData = (metric) => ({
    label: compact(metric?.querySelector('h3')?.textContent).toLowerCase(),
    value: compact(metric?.querySelector('h4')?.textContent)
  });

  const findMetric = (entry, terms) => Array.from(entry.querySelectorAll('.ServerEntryMetric')).find((metric) => {
    const label = metricData(metric).label;
    return terms.some((term) => label.includes(term));
  });

  const updateProgressBars = () => {
    document.querySelectorAll('.ServerEntryMetric').forEach((metric) => {
      const { label, value } = metricData(metric);
      let percentage = 0;
      if (label.includes('cpu')) percentage = percentFrom(value);
      else if (label.includes('memory') || label.includes('ram')) {
        const memory = memoryFrom(value);
        percentage = memory.total > 0 ? (memory.used / memory.total) * 100 : 0;
      } else if (label.includes('user') || label.includes('player')) {
        const players = ratioFrom(value);
        percentage = players.total > 0 ? (players.used / players.total) * 100 : 0;
      }
      metric.style.setProperty('--mn-progress', `${Math.max(0, Math.min(100, percentage)).toFixed(2)}%`);
    });
  };

  const findLocalInstancesHeader = () => Array.from(document.querySelectorAll('.ServerGroupHeader')).find((header) =>
    compact(header.querySelector('.ServerGroupName > span')?.textContent) === 'Local Instances' &&
    !header.classList.contains('loadPending')) ?? null;

  const findLocalInstancesGroup = (header) => {
    let node = header?.parentElement ?? null;
    while (node && node !== document.body) {
      if (node.querySelector('.ServerEntry')) return node;
      node = node.parentElement;
    }
    return document;
  };

  const rawName = (entry) => {
    for (const selector of ['.ServerEntryName', '.ServerEntryTitle', 'h2', 'h3']) {
      const value = compact(entry.querySelector(selector)?.textContent);
      if (value && !/cpu|memory|users|application waiting|application sleeping/i.test(value)) {
        return value.replace(/\s+SERVER\s*$/i, '').trim();
      }
    }
    return 'Server';
  };

  const getEntries = (root) => Array.from(root.querySelectorAll('.ServerEntry')).filter((entry) =>
    !/create instance/i.test(compact(entry.textContent)) && rawName(entry) !== 'Server'
  );

  const stateFrom = (entry) => {
    const text = compact(entry.textContent);
    const upper = text.toUpperCase();

    if (upper.includes('WAITING FOR USER INPUT') || upper.includes('APPLICATION WAITING')) return 'waiting';
    if (upper.includes('APPLICATION SLEEPING') || /\bSLEEPING\b/i.test(text)) return 'sleeping';
    if (upper.includes('INSTANCE NOT RUNNING') || upper.includes('APPLICATION STOPPED') || /\bOFFLINE\b|\bSTOPPED\b/i.test(text)) return 'offline';
    if (/\bSTARTING\b|\bRESTARTING\b|\bUPDATING\b/i.test(text)) return 'busy';

    const badgeTexts = Array.from(entry.querySelectorAll('span, div'))
      .map((node) => compact(node.textContent))
      .filter((value) => value.length > 0 && value.length < 50);
    if (badgeTexts.some((value) => /^RUNNING\b/i.test(value))) return 'online';
    if (entry.classList.contains('statusRunning') || entry.getAttribute('data-state') === '20') return 'online';

    return 'offline';
  };

  const stateLabel = (state) => ({
    online: 'Running',
    sleeping: 'Sleeping',
    waiting: 'Waiting for input',
    busy: 'Starting',
    offline: 'Offline'
  }[state] ?? 'Unknown');

  const makeServers = (entries) => {
    const counts = new Map();
    return entries.map((entry) => {
      const baseName = rawName(entry);
      const count = (counts.get(baseName) ?? 0) + 1;
      counts.set(baseName, count);
      const state = stateFrom(entry);
      const playersMetric = findMetric(entry, ['user', 'player']);
      const cpuMetric = findMetric(entry, ['cpu']);
      const memoryMetric = findMetric(entry, ['memory', 'ram']);
      return {
        entry,
        key: `${baseName}-${count}`,
        name: count === 1 ? baseName : `${baseName} ${count}`,
        state,
        running: state === 'online',
        players: ratioFrom(playersMetric ? metricData(playersMetric).value : ''),
        cpu: percentFrom(cpuMetric ? metricData(cpuMetric).value : ''),
        memory: memoryFrom(memoryMetric ? metricData(memoryMetric).value : '')
      };
    });
  };

  const addActivity = (message, kind = 'info') => {
    activity.unshift({
      message,
      kind,
      time: new Date().toLocaleTimeString('en-GB', { hour12: false })
    });
    if (activity.length > 6) activity.length = 6;
  };

  const trackChanges = (servers) => {
    servers.forEach((server) => {
      const previous = previousStates.get(server.key);
      const current = { state: server.state, players: server.players.used };
      if (initialized && previous) {
        if (previous.state !== current.state) {
          addActivity(`${server.name}: ${stateLabel(current.state)}`, current.state === 'online' ? 'success' : 'warning');
        }
        if (previous.players !== current.players) {
          addActivity(`${server.name}: ${Math.round(current.players)} player${current.players === 1 ? '' : 's'} online`, 'players');
        }
      }
      previousStates.set(server.key, current);
    });
    initialized = true;
  };

  const createControlCenter = () => {
    const panel = document.createElement('section');
    panel.id = 'mn-dashboard-pro';
    panel.innerHTML = `
      <div class="mn-control-heading">
        <div><span class="mn-health-dot"></span><strong data-health>Checking system status…</strong><small>Live Control Center</small></div>
        <span class="mn-live-time" data-updated>--:--:--</span>
      </div>
      <div class="mn-control-layout">
        <div class="mn-server-overview" data-server-list></div>
        <aside class="mn-activity-panel">
          <div class="mn-section-title"><strong>Live activity</strong><span>This browser session</span></div>
          <div class="mn-activity-list" data-activity-list></div>
        </aside>
      </div>
      <div class="mn-summary-strip">
        <span><b data-summary-online>0</b> online</span>
        <span><b data-summary-players>0</b> players</span>
        <span><b data-summary-cpu>0%</b> average CPU</span>
        <span><b data-summary-memory>0 GB</b> RAM in use</span>
      </div>`;
    return panel;
  };

  const renderServers = (panel, servers) => {
    const list = panel.querySelector('[data-server-list]');
    const html = servers.map((server, index) => `
      <button type="button" class="mn-server-row is-${server.state}" data-server-index="${index}" aria-label="Open ${server.name}">
        <span class="mn-server-state"></span>
        <span class="mn-server-name"><strong>${server.name}</strong><small>${stateLabel(server.state)}</small></span>
        <span><b>${server.players.total > 0 ? `${Math.round(server.players.used)}/${Math.round(server.players.total)}` : '—'}</b><small>Players</small></span>
        <span><b>${server.running ? `${server.cpu.toFixed(1)}%` : '—'}</b><small>CPU</small></span>
        <span><b>${server.running && server.memory.used > 0 ? formatMemory(server.memory.used) : '—'}</b><small>RAM</small></span>
      </button>`).join('');

    if (list.innerHTML === html) return;
    list.innerHTML = html;
    list.querySelectorAll('[data-server-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const server = servers[Number(button.dataset.serverIndex)];
        if (!server?.entry) return;
        server.entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
        server.entry.classList.add('mn-card-highlight');
        window.setTimeout(() => server.entry.classList.remove('mn-card-highlight'), 1400);
      });
    });
  };

  const renderActivity = (panel) => {
    const list = panel.querySelector('[data-activity-list]');
    const items = activity.length
      ? activity
      : [{ time: '--:--:--', message: 'Waiting for status changes…', kind: 'muted' }];
    list.innerHTML = items.map((item) =>
      `<div class="mn-activity-item is-${item.kind}"><time>${item.time}</time><span>${item.message}</span></div>`
    ).join('');
  };

  const updateControlCenter = () => {
    const header = findLocalInstancesHeader();
    if (!header) return;

    let panel = document.getElementById('mn-dashboard-pro');
    if (!panel) panel = createControlCenter();
    if (panel.parentElement !== header) header.appendChild(panel);

    const servers = makeServers(getEntries(findLocalInstancesGroup(header)));
    const active = servers.filter((server) => server.running);
    trackChanges(servers);
    renderServers(panel, servers);
    renderActivity(panel);

    const players = active.reduce((sum, server) => sum + server.players.used, 0);
    const cpu = active.length ? active.reduce((sum, server) => sum + server.cpu, 0) / active.length : 0;
    const memory = active.reduce((sum, server) => sum + server.memory.used, 0);
    const counts = {
      waiting: servers.filter((server) => server.state === 'waiting').length,
      sleeping: servers.filter((server) => server.state === 'sleeping').length,
      busy: servers.filter((server) => server.state === 'busy').length,
      offline: servers.filter((server) => server.state === 'offline').length
    };

    const notices = [];
    if (counts.waiting) notices.push(`${counts.waiting} waiting for input`);
    if (counts.sleeping) notices.push(`${counts.sleeping} sleeping`);
    if (counts.busy) notices.push(`${counts.busy} starting`);
    if (counts.offline) notices.push(`${counts.offline} offline`);

    panel.classList.toggle('has-attention', counts.waiting > 0 || counts.sleeping > 0 || counts.busy > 0);
    panel.classList.toggle('has-offline', counts.offline > 0);
    panel.querySelector('[data-health]').textContent = notices.length ? notices.join(' • ') : 'All systems operational';
    panel.querySelector('[data-updated]').textContent = `Live · ${new Date().toLocaleTimeString('en-GB', { hour12: false })}`;
    panel.querySelector('[data-summary-online]').textContent = `${active.length}/${servers.length}`;
    panel.querySelector('[data-summary-players]').textContent = String(Math.round(players));
    panel.querySelector('[data-summary-cpu]').textContent = `${cpu.toFixed(1)}%`;
    panel.querySelector('[data-summary-memory]').textContent = formatMemory(memory);
  };

  const ensureFooter = () => {
    const footer = document.getElementById('bgtext');
    if (!footer) return;
    footer.className = 'mn-v51-footer';
    footer.removeAttribute('data-viewmodel');
    const html = `<span id="versionHeadline">v${VERSION} • ${COMMIT}</span><div class="tiny">Built ${BUILD_DATE}</div>`;
    if (footer.innerHTML !== html) footer.innerHTML = html;
  };

  const drawerMedia = window.matchMedia('(min-width: 701px) and (max-width: 1180px)');
  const closeDrawer = () => {
    document.body.classList.remove('mn-drawer-open');
    document.getElementById('mn-desktop-drawer-toggle')?.setAttribute('aria-expanded', 'false');
  };

  const ensureDesktopDrawer = () => {
    let toggle = document.getElementById('mn-desktop-drawer-toggle');
    let backdrop = document.getElementById('mn-drawer-backdrop');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'mn-desktop-drawer-toggle';
      toggle.type = 'button';
      toggle.innerHTML = '<span aria-hidden="true">☰</span>';
      toggle.setAttribute('aria-label', 'Open menu');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.append(toggle);
      toggle.addEventListener('click', () => {
        const open = document.body.classList.toggle('mn-drawer-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'mn-drawer-backdrop';
      backdrop.addEventListener('click', closeDrawer);
      document.body.append(backdrop);
    }
  };

  const update = () => {
    updateProgressBars();
    updateControlCenter();
    ensureFooter();
    ensureDesktopDrawer();
  };

  const start = () => {
    update();
    window.setInterval(update, 1500);
    drawerMedia.addEventListener?.('change', () => { if (!drawerMedia.matches) closeDrawer(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
