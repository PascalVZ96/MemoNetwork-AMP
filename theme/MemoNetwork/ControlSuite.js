(() => {
  'use strict';

  const FAVORITES_KEY = 'memonetwork-v6-favorites-v5';
  const OLD_KEYS = [
    'memonetwork-v6-favorites',
    'memonetwork-v6-favorites-v2',
    'memonetwork-v6-favorites-v3',
    'memonetwork-v6-favorites-v4'
  ];
  const previousStates = new Map();
  let initialized = false;
  let delegatedEventsInstalled = false;

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
      // Local storage may be unavailable.
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
    }, 3000);
  };

  const toggleFavorite = (row) => {
    if (!row) return;

    const key = favoriteKey(row);
    const favorites = readFavorites();
    const wasFavorite = favorites.has(key);

    if (wasFavorite) favorites.delete(key);
    else favorites.add(key);

    saveFavorites(favorites);
    applyFavorites();
    showToast(
      rowName(row),
      wasFavorite ? 'Verwijderd uit favorieten' : 'Toegevoegd aan favorieten'
    );
  };

  const isStarArea = (row, event) => {
    const rect = row.getBoundingClientRect();
    const width = window.matchMedia('(max-width: 700px)').matches ? 48 : 40;
    return event.clientX >= rect.left && event.clientX <= rect.left + width;
  };

  const installDelegatedEvents = () => {
    if (delegatedEventsInstalled) return;
    delegatedEventsInstalled = true;

    document.addEventListener('click', (event) => {
      const row = event.target.closest?.('#mn-dashboard-pro .mn-server-row');
      if (!row || !isStarArea(row, event)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      toggleFavorite(row);
    }, true);

    document.addEventListener('keydown', (event) => {
      const row = event.target.closest?.('#mn-dashboard-pro .mn-server-row');
      if (!row || (event.key !== 'f' && event.key !== 'F')) return;

      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(row);
    }, true);
  };

  const applyFavorites = () => {
    const list = document.querySelector('#mn-dashboard-pro [data-server-list]');
    if (!list) return;

    const favorites = readFavorites();
    const rows = Array.from(list.querySelectorAll('.mn-server-row'));

    rows.forEach((row) => {
      const key = favoriteKey(row);
      let star = row.querySelector('.mn-favorite-toggle');

      if (!star) {
        star = document.createElement('span');
        star.className = 'mn-favorite-toggle';
        star.setAttribute('aria-hidden', 'true');
        row.insertBefore(star, row.firstChild);
      }

      const active = favorites.has(key);
      row.classList.toggle('is-favorite', active);
      star.textContent = active ? '★' : '☆';
      row.title = active
        ? `${rowName(row)} — klik op de ster om uit favorieten te verwijderen`
        : `${rowName(row)} — klik op de ster om als favoriet te markeren`;
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
        const kind = /running/i.test(state)
          ? 'success'
          : /offline|waiting|sleep/i.test(state)
            ? 'warning'
            : 'info';
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
    installDelegatedEvents();
    update();
    new MutationObserver(queueUpdate).observe(document.body, { childList: true, subtree: true });
    window.setInterval(update, 1500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
