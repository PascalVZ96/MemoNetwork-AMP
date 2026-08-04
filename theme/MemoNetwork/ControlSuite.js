(() => {
  'use strict';

  const FAVORITE_KEYS = [
    'memonetwork-v6-favorites',
    'memonetwork-v6-favorites-v2',
    'memonetwork-v6-favorites-v3',
    'memonetwork-v6-favorites-v4',
    'memonetwork-v6-favorites-v5'
  ];
  const previousStates = new Map();
  let initialized = false;

  const rowName = (row) => row.querySelector('.mn-server-name strong')?.textContent?.trim() || 'Server';
  const rowState = (row) => row.querySelector('.mn-server-name small')?.textContent?.trim() || 'Unknown';

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

  const removeFavoritesFeature = () => {
    document.querySelectorAll('.mn-favorite-toggle').forEach((node) => node.remove());
    document.querySelectorAll('.mn-server-row.is-favorite').forEach((row) => row.classList.remove('is-favorite'));
    document.querySelectorAll('#mn-dashboard-pro .mn-server-row[title]').forEach((row) => row.removeAttribute('title'));

    try {
      FAVORITE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Local storage can be unavailable in private browser modes.
    }
  };

  const removeSearch = () => {
    document.querySelectorAll('.mn-v6-suite').forEach((node) => node.remove());
    document.querySelectorAll('.mn-v6-filtered').forEach((node) => node.classList.remove('mn-v6-filtered'));
  };

  const trackStatusChanges = () => {
    document.querySelectorAll('#mn-dashboard-pro .mn-server-row').forEach((row, index) => {
      const name = rowName(row);
      const state = rowState(row);
      const key = `${name.toLocaleLowerCase('en-US')}::${index}`;
      const previous = previousStates.get(key);

      if (initialized && previous && previous !== state) {
        const kind = /running/i.test(state)
          ? 'success'
          : /offline|waiting|sleep/i.test(state)
            ? 'warning'
            : 'info';
        showToast(name, `Status changed to ${state}`, kind);
      }

      previousStates.set(key, state);
    });
    initialized = true;
  };

  const update = () => {
    removeFavoritesFeature();
    removeSearch();
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
    update();
    new MutationObserver(queueUpdate).observe(document.body, { childList: true, subtree: true });
    window.setInterval(update, 1500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
