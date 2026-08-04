(() => {
  'use strict';

  const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  const invalidName = (text) => {
    if (!text || text.length > 48) return true;
    return /^(server|cpu|memory|ram|users?|players?|running|offline|sleeping|busy|bezig|wacht op invoer)$/i.test(text) ||
      /application\s+(sleeping|waiting)|waiting for user input|manage this instance|provide required information|start or configure|\d{1,3}(?:\.\d{1,3}){3}:\d+/i.test(text);
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
        if (relativeTop < -5 || relativeTop > 105) return;

        candidates.push({
          text,
          score: relativeTop + selectorIndex * 4 + Math.min(text.length, 30) / 10
        });
      });
    });

    candidates.sort((a, b) => a.score - b.score);
    return candidates[0]?.text ?? 'Server';
  };

  const stateLabel = (entry) => {
    const text = normalize(entry.textContent);
    if (/application sleeping|\bsleeping\b/i.test(text)) return 'Sleeping';
    if (/waiting for user input|application waiting/i.test(text)) return 'Wacht op invoer';
    if (/\brunning\b/i.test(text)) return 'Running';
    return null;
  };

  const update = () => {
    const group = findLocalGroup();
    const panel = document.getElementById('mn-dashboard-pro');
    const rows = Array.from(panel?.querySelectorAll('.mn-server-row') ?? []);
    if (!group || !rows.length) return;

    const entries = Array.from(group.querySelectorAll('.ServerEntry')).filter((entry) =>
      !/create instance/i.test(entry.textContent ?? '')
    );

    const usedNames = new Map();
    entries.forEach((entry, index) => {
      const row = rows[index];
      if (!row) return;

      const baseName = extractName(entry);
      const count = (usedNames.get(baseName) ?? 0) + 1;
      usedNames.set(baseName, count);
      const displayName = count === 1 ? baseName : `${baseName} ${count}`;

      const nameNode = row.querySelector('.mn-server-name strong');
      if (nameNode && nameNode.textContent !== displayName) nameNode.textContent = displayName;

      const label = stateLabel(entry);
      const stateNode = row.querySelector('.mn-server-name small');
      if (label && stateNode && stateNode.textContent !== label) stateNode.textContent = label;
    });
  };

  const start = () => {
    update();
    new MutationObserver(() => requestAnimationFrame(update)).observe(document.body, { childList: true, subtree: true });
    window.setInterval(update, 1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
