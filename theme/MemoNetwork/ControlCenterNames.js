(() => {
  'use strict';

  const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const cachedNames = [];
  let observedList = null;
  let listObserver = null;

  const invalidName = (text) => {
    if (!text || text.length > 48) return true;
    return /^(server|cpu|memory|ram|users?|players?|running|offline|sleeping|busy|starting|waiting for input|instance not running)$/i.test(text) ||
      /application\s+(sleeping|waiting|stopped)|waiting for user input|instance not running|manage this instance|provide required information|start or configure|click the green start button|\d{1,3}(?:\.\d{1,3}){3}:\d+/i.test(text);
  };

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

  const extractName = (entry) => {
    const entryRect = entry.getBoundingClientRect();
    const selectors = [
      '.ServerEntryName', '.ServerEntryTitle', '.InstanceName', '.ServerName',
      '[data-bind*="friendlyName"]', '[data-bind*="displayName"]',
      'h1', 'h2', 'h3', 'strong'
    ];

    const candidates = [];
    selectors.forEach((selector, selectorIndex) => {
      entry.querySelectorAll(selector).forEach((element) => {
        const text = normalize(element.textContent).replace(/\s+SERVER\s*$/i, '').trim();
        if (invalidName(text)) return;

        const rect = element.getBoundingClientRect();
        const relativeTop = rect.top - entryRect.top;
        if (relativeTop < -5 || relativeTop > 90) return;

        candidates.push({
          text,
          score: relativeTop + selectorIndex * 4 + Math.min(text.length, 30) / 10
        });
      });
    });

    candidates.sort((a, b) => a.score - b.score);
    return candidates[0]?.text ?? '';
  };

  const refreshCache = () => {
    const group = findLocalGroup();
    if (!group) return;

    const entries = Array.from(group.querySelectorAll('.ServerEntry')).filter((entry) =>
      !/create instance/i.test(entry.textContent ?? '')
    );

    entries.forEach((entry, index) => {
      const name = extractName(entry);
      if (name && !invalidName(name)) cachedNames[index] = name;
    });
  };

  const restoreNames = () => {
    const panel = document.getElementById('mn-dashboard-pro');
    const rows = Array.from(panel?.querySelectorAll('.mn-server-row') ?? []);
    if (!rows.length) return;

    const usedNames = new Map();
    rows.forEach((row, index) => {
      const baseName = cachedNames[index];
      if (!baseName) return;

      const count = (usedNames.get(baseName) ?? 0) + 1;
      usedNames.set(baseName, count);
      const displayName = count === 1 ? baseName : `${baseName} ${count}`;
      const nameNode = row.querySelector('.mn-server-name strong');
      if (nameNode && nameNode.textContent !== displayName) nameNode.textContent = displayName;
    });
  };

  const attachListObserver = () => {
    const list = document.querySelector('#mn-dashboard-pro [data-server-list]');
    if (!list || list === observedList) return;

    listObserver?.disconnect();
    observedList = list;

    // MutationObserver callbacks run before the browser paints. Restoring the
    // cached names synchronously prevents a one-frame "Instance not running"
    // flash when MemoNetwork.js rebuilds the rows.
    listObserver = new MutationObserver(() => restoreNames());
    listObserver.observe(list, { childList: true, subtree: true });
  };

  const update = () => {
    refreshCache();
    restoreNames();
    attachListObserver();
  };

  const start = () => {
    update();
    window.setInterval(update, 2500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
