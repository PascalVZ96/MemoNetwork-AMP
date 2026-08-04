(() => {
  'use strict';

  const STORAGE_KEY = 'memonetwork-control-center-collapsed';

  const readState = () => {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  };

  const saveState = (collapsed) => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // Storage may be unavailable in private browser modes.
    }
  };

  const applyState = (panel, collapsed) => {
    panel.classList.toggle('mn-control-collapsed', collapsed);

    const button = panel.querySelector('#mn-control-collapse-toggle');
    if (!button) return;

    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? 'Live Control Center uitklappen' : 'Live Control Center inklappen');
    button.title = collapsed ? 'Uitklappen' : 'Inklappen';

    const icon = button.querySelector('.mn-collapse-icon');
    if (icon) icon.textContent = collapsed ? '⌄' : '⌃';
  };

  const ensureToggle = () => {
    const panel = document.getElementById('mn-dashboard-pro');
    const heading = panel?.querySelector('.mn-control-heading');
    if (!panel || !heading) return;

    let button = panel.querySelector('#mn-control-collapse-toggle');

    if (!button) {
      button = document.createElement('button');
      button.id = 'mn-control-collapse-toggle';
      button.type = 'button';
      button.className = 'mn-control-collapse-toggle';
      button.innerHTML = '<span class="mn-collapse-icon" aria-hidden="true">⌃</span>';

      const liveTime = heading.querySelector('.mn-live-time');
      if (liveTime) liveTime.insertAdjacentElement('afterend', button);
      else heading.appendChild(button);

      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const collapsed = !panel.classList.contains('mn-control-collapsed');
        saveState(collapsed);
        applyState(panel, collapsed);
      });
    }

    applyState(panel, readState());
  };

  const start = () => {
    ensureToggle();
    const observer = new MutationObserver(() => window.requestAnimationFrame(ensureToggle));
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
