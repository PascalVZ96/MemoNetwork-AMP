(() => {
  'use strict';

  const BUILD_INFO = window.MemoNetworkBuild ?? {};
  const VERSION = BUILD_INFO.version ?? '5.2.0';
  const COMMIT = BUILD_INFO.commit ?? 'unknown';
  const BUILD_DATE = BUILD_INFO.date ?? 'unknown';
  let activeFilter = 'all';

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

  const findMetric = (entry, terms) => Array.from(entry.querySelectorAll('.ServerEntryMetric')).find((metric) => {
    const label = metricData(metric).label;
    return terms.some((term) => label.includes(term));
  });

  const createDashboard = () => {
    const panel = document.createElement('section');
    panel.id = 'mn-dashboard-pro';
    panel.innerHTML = `
      <div class="mn-dashboard-toolbar">
        <div><strong>Dashboard Plus</strong><span>Live instance overview</span></div>
        <div class="mn-dashboard-filters" role="group" aria-label="Serverfilter">
          <button type="button" data-filter="all" class="active">All</button>
          <button type="button" data-filter="online">Online</button>
          <button type="button" data-filter="offline">Offline</button>
        </div>
      </div>
      <div class="mn-dashboard-grid">
        <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Servers online</span><strong class="mn-dashboard-stat-value" data-stat="online">0</strong><span class="mn-dashboard-stat-detail" data-detail="online">0 servers total</span></article>
        <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Servers offline</span><strong class="mn-dashboard-stat-value" data-stat="offline">0</strong><span class="mn-dashboard-stat-detail">Stopped instances</span></article>
        <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Players online</span><strong class="mn-dashboard-stat-value" data-stat="players">0</strong><span class="mn-dashboard-stat-detail" data-detail="players">0 / 0 slots</span></article>
        <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Average CPU</span><strong class="mn-dashboard-stat-value" data-stat="cpu">0%</strong><span class="mn-dashboard-stat-detail">Running instances</span></article>
        <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Memory in use</span><strong class="mn-dashboard-stat-value" data-stat="memory">0 GB</strong><span class="mn-dashboard-stat-detail" data-detail="memory">0 / 0 GB</span></article>
        <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Last refresh</span><strong class="mn-dashboard-stat-value mn-dashboard-time" data-stat="updated">--:--:--</strong><span class="mn-dashboard-stat-detail">Live AMP data</span></article>
      </div>`;

    panel.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter ?? 'all';
        panel.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
        updateDashboard();
      });
    });
    return panel;
  };

  const applyFilter = (entries) => {
    entries.forEach((entry) => {
      const running = isRunning(entry);
      const visible = activeFilter === 'all' || (activeFilter === 'online' && running) || (activeFilter === 'offline' && !running);
      entry.classList.toggle('mn-filter-hidden', !visible);
    });
  };

  const updateDashboard = () => {
    const header = findLocalInstancesHeader();
    if (!header) return;

    document.querySelector('.ServerGroupHeader.loadPending #mn-dashboard-pro')?.remove();
    let panel = document.getElementById('mn-dashboard-pro');
    if (!panel) panel = createDashboard();
    if (panel.parentElement !== header) header.appendChild(panel);

    const group = findLocalInstancesGroup(header);
    const entries = getEntries(group ?? document);
    const active = entries.filter(isRunning);
    applyFilter(entries);

    let playersUsed = 0;
    let playersTotal = 0;
    let cpuTotal = 0;
    let cpuCount = 0;
    let memoryUsed = 0;
    let memoryTotal = 0;

    active.forEach((entry) => {
      const players = findMetric(entry, ['user', 'player']);
      if (players) {
        const ratio = ratioFrom(metricData(players).value);
        playersUsed += ratio.used;
        playersTotal += ratio.total;
      }
      const cpu = findMetric(entry, ['cpu']);
      if (cpu) {
        cpuTotal += percentFrom(metricData(cpu).value);
        cpuCount += 1;
      }
      const memory = findMetric(entry, ['memory', 'ram']);
      if (memory) {
        const ratio = ratioFrom(metricData(memory).value);
        memoryUsed += ratio.used;
        memoryTotal += ratio.total;
      }
    });

    panel.querySelector('[data-stat="online"]').textContent = String(active.length);
    panel.querySelector('[data-detail="online"]').textContent = `${entries.length} servers total`;
    panel.querySelector('[data-stat="offline"]').textContent = String(Math.max(0, entries.length - active.length));
    panel.querySelector('[data-stat="players"]').textContent = String(Math.round(playersUsed));
    panel.querySelector('[data-detail="players"]').textContent = `${Math.round(playersUsed)} / ${Math.round(playersTotal)} slots`;
    panel.querySelector('[data-stat="cpu"]').textContent = `${(cpuCount ? cpuTotal / cpuCount : 0).toFixed(1)}%`;
    panel.querySelector('[data-stat="memory"]').textContent = `${memoryUsed.toFixed(2)} GB`;
    panel.querySelector('[data-detail="memory"]').textContent = `${memoryUsed.toFixed(2)} / ${memoryTotal.toFixed(2)} GB`;
    panel.querySelector('[data-stat="updated"]').textContent = new Date().toLocaleTimeString('nl-NL', { hour12: false });
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
    updateDashboard();
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
