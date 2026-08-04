(() => {
  'use strict';

  const VERSION = '5.1.0';
  const BUILD = '04-08-2026 · 16:48';

  const clamp = (value, min = 0, max = 100) =>
    Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));

  const parseNumber = (value) => {
    const number = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(number) ? number : 0;
  };

  const parsePercent = (text) => {
    const match = String(text ?? '').match(/(-?\d+(?:[.,]\d+)?)\s*%/);
    return match ? clamp(parseNumber(match[1])) : 0;
  };

  const parseRatioValues = (text) => {
    const match = String(text ?? '').match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)/);
    return match ? { used: parseNumber(match[1]), total: parseNumber(match[2]) } : { used: 0, total: 0 };
  };

  const parseRatio = (text) => {
    const { used, total } = parseRatioValues(text);
    return total > 0 ? clamp((used / total) * 100) : 0;
  };

  const metricData = (metric) => ({
    label: metric.querySelector('h3')?.textContent?.trim().toLowerCase() ?? '',
    value: metric.querySelector('h4')?.textContent?.trim() ?? ''
  });

  const metricPercent = (metric) => {
    const { label, value } = metricData(metric);
    if (label.includes('cpu')) return parsePercent(value);
    if (label.includes('memory') || label.includes('ram')) return parseRatio(value);
    if (label.includes('user') || label.includes('player')) return parseRatio(value);
    return 0;
  };

  const updateMetric = (metric) => {
    const percent = metricPercent(metric);
    metric.style.setProperty('--mn-progress', `${percent.toFixed(2)}%`);
    metric.dataset.mnProgress = percent.toFixed(2);
  };

  const updateAll = (root = document) => {
    root.querySelectorAll?.('.ServerEntryMetric').forEach(updateMetric);
  };

  const createDashboard = () => {
    const panel = document.createElement('section');
    panel.id = 'mn-dashboard-pro';
    panel.innerHTML = `
      <article class="mn-dashboard-stat" data-kind="online"><span class="mn-dashboard-stat-label">Servers online</span><strong class="mn-dashboard-stat-value" data-stat="online">0</strong><span class="mn-dashboard-stat-detail" data-detail="online">0 servers total</span></article>
      <article class="mn-dashboard-stat" data-kind="players"><span class="mn-dashboard-stat-label">Players online</span><strong class="mn-dashboard-stat-value" data-stat="players">0</strong><span class="mn-dashboard-stat-detail" data-detail="players">0 / 0 slots</span></article>
      <article class="mn-dashboard-stat" data-kind="cpu"><span class="mn-dashboard-stat-label">Average CPU</span><strong class="mn-dashboard-stat-value" data-stat="cpu">0%</strong><span class="mn-dashboard-stat-detail">Running instances</span></article>
      <article class="mn-dashboard-stat" data-kind="memory"><span class="mn-dashboard-stat-label">Memory in use</span><strong class="mn-dashboard-stat-value" data-stat="memory">0 GB</strong><span class="mn-dashboard-stat-detail" data-detail="memory">0 / 0 GB</span></article>`;
    return panel;
  };

  const serverEntries = () => Array.from(document.querySelectorAll('.ServerEntry')).filter((entry) =>
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
    const header = document.querySelector('.ServerGroupHeader');
    if (!header?.parentElement) {
      document.getElementById('mn-dashboard-pro')?.remove();
      return;
    }

    let panel = document.getElementById('mn-dashboard-pro');
    if (!panel) panel = createDashboard();
    if (panel.previousElementSibling !== header) header.insertAdjacentElement('afterend', panel);

    const entries = serverEntries();
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
        const ratio = parseRatioValues(metricData(players).value);
        playersUsed += ratio.used;
        playersTotal += ratio.total;
      }

      const cpu = findMetric(entry, ['cpu']);
      if (cpu) {
        cpuTotal += parsePercent(metricData(cpu).value);
        cpuCount += 1;
      }

      const memory = findMetric(entry, ['memory', 'ram']);
      if (memory) {
        const ratio = parseRatioValues(metricData(memory).value);
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
    if (footer && !footer.querySelector('[data-mn-footer-version]')) {
      footer.className = 'mn-v51-footer';
      footer.removeAttribute('data-viewmodel');
      footer.innerHTML = `<div class="tiny" data-mn-footer-version><strong>v${VERSION}</strong><br><small>Built ${BUILD}</small></div>`;
    }

    Array.from(document.querySelectorAll('button, a, div')).forEach((element) => {
      if (/^MEMONETWORK CONTROL PANEL$/i.test(element.textContent?.trim() ?? '')) {
        element.style.setProperty('display', 'none', 'important');
      }
    });
  };

  const drawerMedia = window.matchMedia('(min-width: 701px) and (max-width: 1180px)');

  const markDrawerChrome = () => {
    const menu = document.querySelector('#sideMenuContainer');
    if (!menu) return;

    menu.querySelectorAll('img').forEach((image) => {
      const src = image.getAttribute('src') ?? '';
      const alt = image.getAttribute('alt') ?? '';
      const rect = image.getBoundingClientRect();
      const isLargeBranding = rect.width > 58 || rect.height > 58;
      const looksLikeBranding = /FullLogo|MemoNetwork|logo/i.test(`${src} ${alt}`);
      if (isLargeBranding || looksLikeBranding) {
        image.classList.add('mn-drawer-hide');
        const parent = image.parentElement;
        if (parent && parent.children.length === 1) parent.classList.add('mn-drawer-hide');
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
      toggle.title = 'Menu';
      toggle.setAttribute('aria-label', 'Menu openen');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.append(toggle);
    }

    if (!toggle.dataset.mnBound) {
      toggle.dataset.mnBound = 'true';
      toggle.addEventListener('click', () => {
        const open = document.body.classList.toggle('mn-drawer-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'mn-drawer-backdrop';
      document.body.append(backdrop);
    }

    if (!backdrop.dataset.mnBound) {
      backdrop.dataset.mnBound = 'true';
      backdrop.addEventListener('click', closeDrawer);
    }

    requestAnimationFrame(markDrawerChrome);
  };

  let queued = false;
  const queueUpdate = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateAll();
      ensureDashboard();
      ensureFooter();
      ensureDesktopDrawer();
    });
  };

  const start = () => {
    queueUpdate();
    drawerMedia.addEventListener?.('change', () => {
      if (!drawerMedia.matches) closeDrawer();
      ensureDesktopDrawer();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    });
    const observer = new MutationObserver(queueUpdate);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(() => {
      updateAll();
      ensureDashboard();
      ensureFooter();
    }, 1500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
