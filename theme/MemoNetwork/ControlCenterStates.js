(() => {
  'use strict';

  const getName = (entry) => {
    for (const selector of ['.ServerEntryName', '.ServerEntryTitle', 'h2', 'h3']) {
      const text = entry.querySelector(selector)?.textContent?.trim();
      if (text && !/cpu|memory|users/i.test(text)) {
        return text.replace(/\s+SERVER\s*$/i, '').trim();
      }
    }
    return 'Server';
  };

  const isCreateCard = (entry) => /create instance/i.test(entry.textContent ?? '');

  const getState = (entry) => {
    const text = (entry.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (/waiting for user input|wacht.*invoer|application waiting/i.test(text)) return 'waiting';
    if (/starting|restarting|updating|sleeping/i.test(text)) return 'busy';
    if (entry.classList.contains('statusRunning') || entry.getAttribute('data-state') === '20' || /running/i.test(text)) return 'online';
    return 'offline';
  };

  const stateLabel = (state) => ({
    waiting: 'Wacht op invoer',
    busy: 'Bezig',
    online: 'Running',
    offline: 'Offline'
  }[state] ?? 'Onbekend');

  const findLocalGroup = () => {
    const header = Array.from(document.querySelectorAll('.ServerGroupHeader')).find((item) =>
      item.querySelector('.ServerGroupName > span')?.textContent?.trim() === 'Local Instances' &&
      !item.classList.contains('loadPending')
    );
    if (!header) return null;

    let node = header.parentElement;
    while (node && node !== document.body) {
      if (node.querySelector('.ServerEntry')) return node;
      node = node.parentElement;
    }
    return null;
  };

  const update = () => {
    const panel = document.getElementById('mn-dashboard-pro');
    const list = panel?.querySelector('[data-server-list]');
    const group = findLocalGroup();
    if (!panel || !list || !group) return;

    const entries = Array.from(group.querySelectorAll('.ServerEntry')).filter((entry) => !isCreateCard(entry));
    const existingNames = new Set(
      Array.from(list.querySelectorAll('.mn-server-name strong')).map((node) => node.textContent?.trim())
    );

    entries.forEach((entry) => {
      const name = getName(entry);
      if (existingNames.has(name)) return;

      const state = getState(entry);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `mn-server-row is-${state} mn-server-row-no-metrics`;
      row.innerHTML = `
        <span class="mn-server-state"></span>
        <span class="mn-server-name"><strong>${name}</strong><small>${stateLabel(state)}</small></span>
        <span class="mn-server-message"><b>${state === 'waiting' ? 'Actie nodig' : 'Geen live data'}</b><small>Status</small></span>
        <span class="mn-row-arrow">›</span>`;
      row.addEventListener('click', () => {
        entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
        entry.classList.add('mn-card-highlight');
        window.setTimeout(() => entry.classList.remove('mn-card-highlight'), 1400);
      });
      list.appendChild(row);
      existingNames.add(name);
    });

    const states = entries.map(getState);
    const online = states.filter((state) => state === 'online').length;
    const waiting = states.filter((state) => state === 'waiting').length;
    const busy = states.filter((state) => state === 'busy').length;
    const offline = states.filter((state) => state === 'offline').length;

    const summary = panel.querySelector('[data-summary-online]');
    if (summary) summary.textContent = `${online}/${entries.length}`;

    const health = panel.querySelector('[data-health]');
    if (health) {
      if (waiting > 0) health.textContent = `${waiting} server${waiting === 1 ? '' : 's'} wacht${waiting === 1 ? '' : 'en'} op invoer`;
      else if (busy > 0) health.textContent = `${busy} server${busy === 1 ? '' : 's'} bezig`;
      else if (offline > 0) health.textContent = `${offline} server${offline === 1 ? '' : 's'} offline`;
      else health.textContent = 'Alle systemen operationeel';
    }

    panel.classList.toggle('has-attention', waiting > 0 || busy > 0);
    panel.classList.toggle('has-offline', waiting === 0 && busy === 0 && offline > 0);
  };

  const start = () => {
    update();
    window.setInterval(update, 500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
