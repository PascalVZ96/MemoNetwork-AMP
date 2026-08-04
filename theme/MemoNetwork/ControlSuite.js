(() => {
  'use strict';

  const FAVORITES_KEY = 'memonetwork-v6-favorites-v3';
  const OLD_KEYS = ['memonetwork-v6-favorites', 'memonetwork-v6-favorites-v2'];
  const previousStates = new Map();
  let initialized = false;

  const rowName = (row) => row.querySelector('.mn-server-name strong')?.textContent?.trim() || 'Server';
  const rowState = (row) => row.querySelector('.mn-server-name small')?.textContent?.trim() || 'Onbekend';
  const favoriteKey = (row) => rowName(row).toLocaleLowerCase('nl-NL');

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
      // Local storage may be unavailable in private browser modes.
    }
  };

  const clearOldFavorites = () => {
    try {
      OLD_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore unavailable local storage.
    }
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

  const toggleFavorite = (row) => {
    const key = favoriteKey(row);
    const favorites = readFavorites();
    if (favorites.has(key)) favorites.delete(key);
    else favorites.add(key);
    saveFavorites(favorites);
    applyFavorites();
  };

  const applyFavorites = () => {
    const list = document.querySelector('#mn-dashboard-pro [data-server-list]');
    if (!list) return;

    const favorites = readFavorites();
    const rows = Array.from(list.querySelectorAll('.mn-server-row'));

    rows.forEach((row) => {
      const key = favoriteKey(row);
      let toggle = row.querySelector('.mn-favorite-toggle');

      if (!toggle) {
        toggle = document.createElement('span');
        toggle.className = 'mn-favorite-toggle';
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('tabindex', '0');

        toggle.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        toggle.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleFavorite(row);
        });
        toggle.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            toggleFavorite(row);
          }
        });

        row.insertBefore(toggle, row.firstChild);
      }

      const active = favorites.has(key);
      row.classList.toggle('is-favorite', active);
      toggle.textContent = active ? '★' : '☆';
      toggle.title = active ? 'Verwijder uit favorieten' : 'Markeer als favoriet';
      toggle.setAttribute('aria-label', toggle.title);
      toggle.setAttribute('aria-checked', String(active));
    });

    rows
      .map((row, index) => ({ row, index, favorite: favorites.has(favoriteKey(row)) }))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.index - b.index)
      .forEach(({ row }) => list.appendChild(row));
  };

  const trackStatusChanges = () => {
    document.querySelectorAll('#mn-dashboard-pro .mn-server-row').forEach((row) => {
      const key = favoriteKey(row);
      const name = rowName(row);
      const state = rowState(row);
      const previous = previousStates.get(key);

      if (initialized && previous && previous !== state) {
        const kind = /running/i.test(state) ? 'success' : /offline|waiting|sleep/i.test(state) ? 'warning' : 'info';
        showToast(name, `Status gewijzigd naar ${state}`, kind);
      }
      previousStates.set(key, state);
    });
    initialized = true;
  };

  const removeSearch = () => {
    document.querySelectorAll('.mn-v6-suite').forEach((node) => node.remove());
    document.querySelectorAll('.mn-v6-filtered').forEach((node) => node.classList.remove('mn-v6-filtered'));
  };

  const update = () => {
    removeSearch();
    applyFavorites();
    trackStatusChanges();
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
    clearOldFavorites();
    update();
    new MutationObserver(queueUpdate).observe(document.body, { childList: true, subtree: true });
    window.setInterval(update, 1500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
