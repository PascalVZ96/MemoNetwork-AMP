(() => {
  'use strict';

  const toNumber = (value) => {
    const number = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(number) ? number : 0;
  };

  const parseMemory = (text) => {
    const source = String(text ?? '').trim();
    const match = source.match(/([\d.,]+)\s*\/\s*([\d.,]+)\s*(KB|MB|GB|TB)?/i);
    if (!match) return { usedGb: 0, totalGb: 0, display: '0 GB' };

    const used = toNumber(match[1]);
    const total = toNumber(match[2]);
    const unit = (match[3] || 'GB').toUpperCase();
    const factor = unit === 'KB' ? 1 / (1024 * 1024) : unit === 'MB' ? 1 / 1024 : unit === 'TB' ? 1024 : 1;
    const usedGb = used * factor;
    const totalGb = total * factor;

    const display = unit === 'MB'
      ? `${Math.round(used)} MB`
      : unit === 'KB'
        ? `${Math.round(used)} KB`
        : unit === 'TB'
          ? `${used.toFixed(2)} TB`
          : `${used.toFixed(2)} GB`;

    return { usedGb, totalGb, display };
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

  const getMetric = (entry, term) => Array.from(entry.querySelectorAll('.ServerEntryMetric')).find((metric) =>
    metric.querySelector('h3')?.textContent?.trim().toLowerCase().includes(term)
  );

  const isRunning = (entry) => {
    const text = (entry.textContent ?? '').replace(/\s+/g, ' ');
    return entry.classList.contains('statusRunning') || entry.getAttribute('data-state') === '20' || /\brunning\b/i.test(text);
  };

  const update = () => {
    const panel = document.getElementById('mn-dashboard-pro');
    const list = panel?.querySelector('[data-server-list]');
    const group = findLocalGroup();
    if (!panel || !list || !group) return;

    const entries = Array.from(group.querySelectorAll('.ServerEntry')).filter((entry) =>
      !/create instance/i.test(entry.textContent ?? '') && isRunning(entry) && entry.querySelector('.ServerEntryMetric')
    );
    const normalRows = Array.from(list.querySelectorAll('.mn-server-row:not(.mn-server-row-extra-state)'));

    let totalUsedGb = 0;
    entries.forEach((entry, index) => {
      const memoryMetric = getMetric(entry, 'memory') || getMetric(entry, 'ram');
      const value = memoryMetric?.querySelector('h4')?.textContent?.trim() || '';
      const memory = parseMemory(value);
      totalUsedGb += memory.usedGb;

      const row = normalRows[index];
      const memoryCell = row?.querySelector('span:nth-last-child(2)');
      const valueNode = memoryCell?.querySelector('b');
      if (valueNode) valueNode.textContent = memory.display;
    });

    const summary = panel.querySelector('[data-summary-memory]');
    if (summary) summary.textContent = `${totalUsedGb.toFixed(2)} GB`;
  };

  const start = () => {
    update();
    window.setInterval(update, 350);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
