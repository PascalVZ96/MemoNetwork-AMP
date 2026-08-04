(() => {
  'use strict';

  const BUILD_INFO = window.MemoNetworkBuild ?? {};
  const VERSION = BUILD_INFO.version ?? '5.3.0';
  const COMMIT = BUILD_INFO.commit ?? 'unknown';
  const BUILD_DATE = BUILD_INFO.date ?? 'unknown';
  const previousStates = new Map();
  const activity = [];
  let initialized = false;

  const numberFrom = (value) => {
    const number = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(number) ? number : 0;
  };

  const ratioFrom = (text) => {
    const match = String(text ?? '').match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)/);
    return match ? { used: numberFrom(match[1]), total: numberFrom(match[2]) } : { used: 0, total: 0 };
  };

  const percentFrom = (text) => {
    const match = String(text ?? '').match(/(-?\d+(?:[.,]\d+)?)\s*%/);
    return match ? numberFrom(match[1]) : 0;
  };

  const metricData = (metric) => ({
    label: metric.querySelector('h3')?.textContent?.trim().toLowerCase() ?? '',
    value: metric.querySelector('h4')?.textContent?.trim() ?? ''
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
      if (label.includes('memory') || label.includes('ram') || label.includes('user') || label.includes('player')) {
        const ratio = ratioFrom(value);
        percentage = ratio.total > 0 ? (ratio.used / ratio.total) * 100 : 0;
      }
      metric.style.setProperty('--mn-progress', `${Math.max(0, Math.min(100, percentage)).toFixed(2)}%`);
    });
  };

  const findLocalInstancesHeader = () => Array.from(document.querySelectorAll('.ServerGroupHeader')).find((header) => {
    const name = header.querySelector('.ServerGroupName > span')?.textContent?.trim() ?? '';
    return name === 'Local Instances' && !header.classList.contains('loadPending');
  }) ?? null;

  const findLocalInstancesGroup = (header) => {
    let node = header?.parentElement ?? null;
    while (node && node !== document.body) {
      if (node.querySelector('.ServerEntry')) return node;
      node = node.parentElement;
    }
    return null;
  };

  const getEntries = (root = document) => Array.from(root.querySelectorAll('.ServerEntry')).filter((entry) =>
    entry.querySelector('.ServerEntryMetric') && !/create instance/i.test(entry.textContent ?? '')
  );

  const isRunning = (entry) =>
    entry.classList.contains('statusRunning') ||
    entry.getAttribute('data-state') === '20' ||
    /running/i.test(entry.querySelector('.ServerEntryStatus')?.textContent ?? entry.textContent ?? '');

  const serverName = (entry) => {
    const candidates = ['.ServerEntryName', '.ServerEntryTitle', 'h2', 'h3'];
    for (const selector of candidates) {
      const text = entry.querySelector(selector)?.textContent?.trim();
      if (text && !/cpu|memory|users/i.test(text)) return text.replace(/\s+SERVER\s*$/i, '').trim();
    }
    return 'Server';
  };

  const entryData = (entry) => {
    const running = isRunning(entry);
    const playersMetric = findMetric(entry, ['user', 'player']);
    const cpuMetric = findMetric(entry, ['cpu']);
    const memoryMetric = findMetric(entry, ['memory', 'ram']);
    return {
      entry,
      name: serverName(entry),
      running,
      players: ratioFrom(playersMetric ? metricData(playersMetric).value : ''),
      cpu: percentFrom(cpuMetric ? metricData(cpuMetric).value : ''),
      memory: ratioFrom(memoryMetric ? metricData(memoryMetric).value : '')
    };
  };

  const addActivity = (message, kind = 'info') => {
    activity.unshift({ message, kind, time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
    if (activity.length > 6) activity.length = 6;
  };

  const trackChanges = (servers) => {
    servers.forEach((server) => {
      const old = previousStates.get(server.name);
      const current = { running: server.running, players: server.players.used };
      if (initialized && old) {
        if (old.running !== current.running) addActivity(`${server.name} is ${current.running ? 'gestart' : 'gestopt'}`, current.running ? 'success' : 'warning');
        if (old.players !== current.players) addActivity(`${server.name}: ${Math.round(current.players)} speler${current.players === 1 ? '' : 's'} online`, 'players');
      }
      previousStates.set(server.name, current);
    });
    initialized = true;
  };

  const createControlCenter = () => {
    const panel = document.createElement('section');
    panel.id = 'mn-dashboard-pro';
    panel.innerHTML = `
      <div class="mn-control-heading">
        <div><span class="mn-health-dot"></span><strong data-health>System status controleren…</strong><small>Live Control Center</small></div>
        <span class="mn-live-time" data-updated>--:--:--</span>
      </div>
      <div class="mn-control-layout">
        <div class="mn-server-overview" data-server-list></div>
        <aside class="mn-activity-panel">
          <div class="mn-section-title"><strong>Live activiteit</strong><span>Deze browsersessie</span></div>
          <div class="mn-activity-list" data-activity-list></div>
        </aside>
      </div>
      <div class="mn-summary-strip">
        <span><b data-summary-online>0</b> online</span>
        <span><b data-summary-players>0</b> spelers</span>
        <span><b data-summary-cpu>0%</b> gemiddelde CPU</span>
        <span><b data-summary-memory>0 GB</b> RAM in gebruik</span>
      </div>`;
    return panel;
  };

  const renderServers = (panel, servers) => {
    const list = panel.querySelector('[data-server-list]');
    const html = servers.map((server, index) => `
      <button type="button" class="mn-server-row ${server.running ? 'is-online' : 'is-offline'}" data-server-index="${index}">
        <span class="mn-server-state"></span>
        <span class="mn-server-name"><strong>${server.name}</strong><small>${server.running ? 'Running' : 'Offline'}</small></span>
        <span><b>${Math.round(server.players.used)}/${Math.round(server.players.total)}</b><small>Players</small></span>
        <span><b>${server.cpu.toFixed(1)}%</b><small>CPU</small></span>
        <span><b>${server.memory.used.toFixed(2)} GB</b><small>RAM</small></span>
        <span class="mn-row-arrow">›</span>
      </button>`).join('');
    if (list.innerHTML !== html) {
      list.innerHTML = html;
      list.querySelectorAll('[data-server-index]').forEach((button) => {
        button.addEventListener('click', () => {
          const server = servers[Number(button.dataset.serverIndex)];
          server?.entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
          server?.entry.classList.add('mn-card-highlight');
          window.setTimeout(() => server?.entry.classList.remove('mn-card-highlight'), 1400);
        });
      });
    }
  };

  const renderActivity = (panel) => {
    const list = panel.querySelector('[data-activity-list]');
    const items = activity.length ? activity : [{ time: '--:--:--', message: 'Wachten op statuswijzigingen…', kind: 'muted' }];
    list.innerHTML = items.map((item) => `<div class="mn-activity-item is-${item.kind}"><time>${item.time}</time><span>${item.message}</span></div>`).join('');
  };

  const updateControlCenter = () => {
    const header = findLocalInstancesHeader();
    if (!header) return;
    document.querySelector('.ServerGroupHeader.loadPending #mn-dashboard-pro')?.remove();
    let panel = document.getElementById('mn-dashboard-pro');
    if (!panel) panel = createControlCenter();
    if (panel.parentElement !== header) header.appendChild(panel);

    const group = findLocalInstancesGroup(header);
    const servers = getEntries(group ?? document).map(entryData);
    const active = servers.filter((server) => server.running);
    trackChanges(servers);
    renderServers(panel, servers);
    renderActivity(panel);

    const players = active.reduce((sum, server) => sum + server.players.used, 0);
    const cpu = active.length ? active.reduce((sum, server) => sum + server.cpu, 0) / active.length : 0;
    const memory = active.reduce((sum, server) => sum + server.memory.used, 0);
    const allHealthy = servers.length > 0 && active.length === servers.length;

    panel.classList.toggle('has-offline', !allHealthy);
    panel.querySelector('[data-health]').textContent = allHealthy ? 'Alle systemen operationeel' : `${servers.length - active.length} server${servers.length - active.length === 1 ? '' : 's'} offline`;
    panel.querySelector('[data-updated]').textContent = `Live · ${new Date().toLocaleTimeString('nl-NL', { hour12: false })}`;
    panel.querySelector('[data-summary-online]').textContent = `${active.length}/${servers.length}`;
    panel.querySelector('[data-summary-players]').textContent = String(Math.round(players));
    panel.querySelector('[data-summary-cpu]').textContent = `${cpu.toFixed(1)}%`;
    panel.querySelector('[data-summary-memory]').textContent = `${memory.toFixed(2)} GB`;
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
      toggle.setAttribute('aria-label', 'Menu openen');
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

  let updateQueued = false;
  const queueUpdate = () => {
    if (updateQueued) return;
    updateQueued = true;
    requestAnimationFrame(() => {
      updateQueued = false;
      update();
    });
  };

  const start = () => {
    update();
    new MutationObserver(queueUpdate).observe(document.body, { childList: true, subtree: true });
    window.setInterval(update, 1500);
    drawerMedia.addEventListener?.('change', () => { if (!drawerMedia.matches) closeDrawer(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
