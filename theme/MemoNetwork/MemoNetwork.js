(() => {
  'use strict';

  const VERSION = '5.1.0';
  const BUILD = '04-08-2026 · 16:48';

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
      percentage = Math.max(0, Math.min(100, percentage));
      metric.style.setProperty('--mn-progress', `${percentage.toFixed(2)}%`);
    });
  };

  const createDashboard = () => {
    const panel = document.createElement('section');
    panel.id = 'mn-dashboard-pro';
    panel.innerHTML = `
      <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Servers online</span><strong class="mn-dashboard-stat-value" data-stat="online">0</strong><span class="mn-dashboard-stat-detail" data-detail="online">0 servers total</span></article>
      <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Players online</span><strong class="mn-dashboard-stat-value" data-stat="players">0</strong><span class="mn-dashboard-stat-detail" data-detail="players">0 / 0 slots</span></article>
      <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Average CPU</span><strong class="mn-dashboard-stat-value" data-stat="cpu">0%</strong><span class="mn-dashboard-stat-detail">Running instances</span></article>
      <article class="mn-dashboard-stat"><span class="mn-dashboard-stat-label">Memory in use</span><strong class="mn-dashboard-stat-value" data-stat="memory">0 GB</strong><span class="mn-dashboard-stat-detail" data-detail="memory">0 / 0 GB</span></article>`;
    return panel;
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

  const ensureDashboard = () => {
    const header = findLocalInstancesHeader();
    if (!header) return;

    const stalePanel = document.querySelector('.ServerGroupHeader.loadPending #mn-dashboard-pro');
    if (stalePanel) stalePanel.remove();

    let panel = document.getElementById('mn-dashboard-pro');
    if (!panel) panel = createDashboard();
    if (panel.parentElement !== header) header.appendChild(panel);

    const group = findLocalInstancesGroup(header);
    const entries = getEntries(group ?? document);
    const active = entries.filter(isRunning);
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
    panel.querySelector('[data-stat="players"]').textContent = String(Math.round(playersUsed));
    panel.querySelector('[data-detail="players"]').textContent = `${Math.round(playersUsed)} / ${Math.round(playersTotal)} slots`;
    panel.querySelector('[data-stat="cpu"]').textContent = `${(cpuCount ? cpuTotal / cpuCount : 0).toFixed(1)}%`;
    panel.querySelector('[data-stat="memory"]').textContent = `${memoryUsed.toFixed(2)} GB`;
    panel.querySelector('[data-detail="memory"]').textContent = `${memoryUsed.toFixed(2)} / ${memoryTotal.toFixed(2)} GB`;
  };

  const ensureFooter = () => {
    const footer = document.getElementById('bgtext');
    if (footer) {
      footer.className = 'mn-v51-footer';
      footer.removeAttribute('data-viewmodel');
      const html = `<span id="versionHeadline">v${VERSION}</span><div class="tiny">Built ${BUILD}</div>`;
      if (footer.innerHTML !== html) footer.innerHTML = html;
    }

    Array.from(document.querySelectorAll('body *')).forEach((element) => {
      const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      if (text !== 'MEMONETWORK CONTROL PANEL') return;
      if (Array.from(element.children).some((child) => child.textContent?.replace(/\s+/g, ' ').trim() === text)) return;

      const candidate = element.closest('button, a, [role="button"], .slimButton, .button, .Button') ?? element;
      candidate.style.setProperty('display', 'none', 'important');
      if (candidate.parentElement?.children.length === 1) {
        candidate.parentElement.style.setProperty('display', 'none', 'important');
      }
    });
  };

  const drawerMedia = window.matchMedia('(min-width: 701px) and (max-width: 1180px)');

  const markDrawerChrome = () => {
    const menu = document.querySelector('#sideMenuContainer');
    if (!menu) return;
    menu.querySelectorAll('img').forEach((image) => {
      const rect = image.getBoundingClientRect();
      const source = `${image.getAttribute('src') ?? ''} ${image.getAttribute('alt') ?? ''}`;
      if (rect.width > 58 || rect.height > 58 || /FullLogo|MemoNetwork|logo/i.test(source)) {
        image.classList.add('mn-drawer-hide');
        if (image.parentElement?.children.length === 1) image.parentElement.classList.add('mn-drawer-hide');
      }
    });
  };

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

    requestAnimationFrame(markDrawerChrome);
  };

  const update = () => {
    updateProgressBars();
    ensureDashboard();
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
    const observer = new MutationObserver(queueUpdate);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(update, 1500);
    drawerMedia.addEventListener?.('change', () => {
      if (!drawerMedia.matches) closeDrawer();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
