(() => {
  'use strict';

  const STORAGE_KEY = 'memonetwork-control-center-collapsed';

  const applyState = (panel, collapsed) => {
    panel.classList.toggle('mn-control-collapsed', collapsed);
    const button = panel.querySelector('#mn-control-collapse-toggle');
    if (!button) return;
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? 'Live Control Center uitklappen' : 'Live Control Center inklappen');
    button.title = collapsed ? 'Uitklappen' : 'Inklappen';
    button.querySelector('.mn-collapse-icon').textContent = collapsed ? '⌄' : '⌃';
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
      button.innerHTML = '<span class="mn-collapse-label">Control Center</span><span class="mn-collapse-icon" aria-hidden="true">⌃</span>';
      heading.appendChild(button);
      button.addEventListener('click', () => {
        const collapsed = !panel.classList.contains('mn-control-collapsed');
        sessionStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
        applyState(panel, collapsed);
      });
    }

    applyState(panel, sessionStorage.getItem(STORAGE_KEY) === '1');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureToggle, { once: true });
  } else {
    ensureToggle();
  }

  window.setInterval(ensureToggle, 1200);
})();
