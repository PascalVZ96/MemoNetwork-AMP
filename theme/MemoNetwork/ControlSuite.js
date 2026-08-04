(() => {
  'use strict';

  const FAVORITES_KEY = 'memonetwork-v6-favorites';
  const previousStates = new Map();
  let initialized = false;

  const readFavorites = () => {
    try {
      const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return new Set(Array.isArray(value) ? value : []);
    } catch {
      return new Set();
    }
  };

  const saveFavorites = (favorites) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch {
      // Local storage can be unavailable in private browser modes.
    }
  };

  const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('nl-NL');

  const rowName = (row) => row.querySelector('.mn-server-name strong')?.textContent?.trim() || 'Server';
  const rowState = (row) => row.querySelector('.mn-server-name small')?.textContent?.trim() || 'Onbekend';

  const getInstanceCards = () => Array.from(document.querySelectorAll('.ServerEntry')).filter((entry) =>
    !/create instance/i.test(entry.textContent ?? '')
  );

  const findCardForRow = (row, cards) => {
    const name = normalize(rowName(row).replace(/\s+\d+$/, ''));
    return cards.find((card) => normalize(card.textContent).includes(name)) ?? null;
  };

  const showToast = (title, message, kind = 'info') => {
    let host = document.getElementById('mn-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'mn-toast-host';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }

    const toast = document.createElement('div');
    toast.className = `mn-toast is-${kind}`;
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 220);
    }, 3800);
  };

  const applySearch = (query) => {
    const normalized = normalize(query);
    const rows = Array.from(document.querySelectorAll('#mn-dashboard-pro .mn-server-row'));
    const cards = getInstanceCards();

    rows.forEach((row) => {
      const visible = !normalized || normalize(row.textContent).includes(normalized);
      row.classList.toggle('mn-v6-filtered', !visible);
      const card = findCardForRow(row, cards);
      if (card) card.classList.toggle('mn-v6-filtered', !visible);
    });
  };

  const applyFavorites = () => {
    const list = document.querySelector('#mn-dashboard-pro [data-server-list]');
    if (!list) return;

    const favorites = readFavorites();
    const rows = Array.from(list.querySelectorAll('.mn-server-row'));

    rows.forEach((row) => {
      const name = rowName(row);
      let button = row.querySelector('.mn-favorite-toggle');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'mn-favorite-toggle';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const current = readFavorites();
          if (current.has(name)) current.delete(name);
          else current.add(name);
          saveFavorites(current);
          applyFavorites();
        });
        row.insertBefore(button, row.firstChild);
      }

      const active = favorites.has(name);
      row.classList.toggle('is-favorite', active);
      button.textContent = active ? '★' : '☆';
      button.title = active ? 'Verwijder uit favorieten' : 'Zet bovenaan';
      button.setAttribute('aria-label', button.title);
    });

    rows.sort((a, b) => {
      const aFavorite = favorites.has(rowName(a)) ? 1 : 0;
      const bFavorite = favorites.has(rowName(b)) ? 1 : 0;
      return bFavorite - aFavorite;
    }).forEach((row) => list.appendChild(row));
  };

  const trackStatusChanges = () => {
    document.querySelectorAll('#mn-dashboard-pro .mn-server-row').forEach((row) => {
      const name = rowName(row);
      const state = rowState(row);
      const previous = previousStates.get(name);
      if (initialized && previous && previous !== state) {
        const kind = /running/i.test(state) ? 'success' : /offline|waiting|sleep/i.test(state) ? 'warning' : 'info';
        showToast(name, `Status gewijzigd naar ${state}`, kind);
      }
      previousStates.set(name, state);
    });
    initialized = true;
  };

  const ensureToolbar = () => {
    const panel = document.getElementById('mn-dashboard-pro');
    const heading = panel?.querySelector('.mn-control-heading');
    if (!panel || !heading) return;

    let suite = heading.querySelector('.mn-v6-suite');
    if (!suite) {
      suite = document.createElement('div');
      suite.className = 'mn-v6-suite';
      suite.innerHTML = `
        <label class="mn-v6-search">
          <span class="mat-icon" aria-hidden="true">search</span>
          <input type="search" placeholder="Zoek server…" aria-label="Zoek server">
          <button type="button" aria-label="Wis zoekopdracht">×</button>
        </label>`;

      const liveTime = heading.querySelector('.mn-live-time');
      if (liveTime) heading.insertBefore(suite, liveTime);
      else heading.appendChild(suite);

      const input = suite.querySelector('input');
      const clear = suite.querySelector('button');
      input.addEventListener('input', () => applySearch(input.value));
      clear.addEventListener('click', () => {
        input.value = '';
        input.focus();
        applySearch('');
      });
    }

    applyFavorites();
    trackStatusChanges();
  };

  const update = () => {
    ensureToolbar();
    const query = document.querySelector('.mn-v6-search input')?.value ?? '';
    applySearch(query);
  };

  let queued = false;
  const queueUpdate = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };

  const start = () => {
    update();
    new MutationObserver(queueUpdate).observe(document.body, { childList: true, subtree: true });
    window.setInterval(update, 1500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
