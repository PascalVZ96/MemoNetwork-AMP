(() => {
  'use strict';

  const clamp = (value, min = 0, max = 100) =>
    Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));

  const parsePercent = (text) => {
    const match = text.match(/(-?\d+(?:[.,]\d+)?)\s*%/);
    return match ? clamp(Number(match[1].replace(',', '.'))) : 0;
  };

  const parseRatio = (text) => {
    const match = text.match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)/);
    if (!match) return 0;

    const used = Number(match[1].replace(',', '.'));
    const total = Number(match[2].replace(',', '.'));
    return total > 0 ? clamp((used / total) * 100) : 0;
  };

  const metricPercent = (metric) => {
    const label = metric.querySelector('h3')?.textContent?.trim().toLowerCase() ?? '';
    const value = metric.querySelector('h4')?.textContent?.trim() ?? '';

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

  const drawerMedia = window.matchMedia('(min-width: 701px) and (max-width: 1180px)');

  const closeDrawer = () => {
    document.body.classList.remove('mn-drawer-open');
    document.getElementById('mn-desktop-drawer-toggle')?.setAttribute('aria-expanded', 'false');
  };

  const setupDesktopDrawer = () => {
    let toggle = document.getElementById('mn-desktop-drawer-toggle');
    let backdrop = document.getElementById('mn-drawer-backdrop');

    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'mn-desktop-drawer-toggle';
      toggle.type = 'button';
      toggle.textContent = '☰';
      toggle.title = 'Menu';
      toggle.setAttribute('aria-label', 'Menu openen');
      toggle.setAttribute('aria-expanded', 'false');

      const topBar = document.querySelector('#barTop');
      if (topBar) topBar.prepend(toggle);
    }

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'mn-drawer-backdrop';
      document.body.append(backdrop);
    }

    toggle?.addEventListener('click', () => {
      const open = document.body.classList.toggle('mn-drawer-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    backdrop?.addEventListener('click', closeDrawer);

    document.querySelector('#sideMenuContainer')?.addEventListener('click', (event) => {
      if (drawerMedia.matches && event.target.closest('a, button, .sideMenuItem')) closeDrawer();
    });

    drawerMedia.addEventListener?.('change', () => {
      if (!drawerMedia.matches) closeDrawer();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    });
  };

  let queued = false;
  const queueUpdate = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateAll();
    });
  };

  const start = () => {
    updateAll();
    setupDesktopDrawer();

    const observer = new MutationObserver(queueUpdate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
