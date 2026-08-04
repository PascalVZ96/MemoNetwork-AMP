(() => {
  'use strict';

  const compact = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  const cardName = (entry) => {
    for (const selector of ['.ServerEntryName', '.ServerEntryTitle', 'h2', 'h3']) {
      const value = compact(entry.querySelector(selector)?.textContent);
      if (value && !/cpu|memory|users|application/i.test(value)) {
        return value.replace(/\s+SERVER\s*$/i, '').trim();
      }
    }
    return '';
  };

  const rowName = (row) => compact(row.querySelector('.mn-server-name strong')?.textContent)
    .replace(/\s+\d+$/, '')
    .trim();

  const getCards = () => Array.from(document.querySelectorAll('.ServerEntry')).filter((entry) =>
    !/create instance/i.test(compact(entry.textContent)) && cardName(entry)
  );

  const detectState = (entry) => {
    const text = compact(entry?.textContent);
    const upper = text.toUpperCase();

    if (upper.includes('WAITING FOR USER INPUT') || upper.includes('APPLICATION WAITING')) return 'waiting';
    if (upper.includes('APPLICATION SLEEPING') || /\bSLEEPING\b/i.test(text)) return 'sleeping';
    if (upper.includes('INSTANCE NOT RUNNING') || upper.includes('APPLICATION STOPPED') || /\bOFFLINE\b|\bSTOPPED\b/i.test(text)) return 'offline';
    if (/\bSTARTING\b|\bRESTARTING\b|\bUPDATING\b/i.test(text)) return 'busy';
    if (entry?.classList.contains('statusRunning') || entry?.getAttribute('data-state') === '20' || /\bRUNNING\b/i.test(text)) return 'online';
    return 'offline';
  };

  const labelFor = (state) => ({
    online: 'Running',
    sleeping: 'Sleeping',
    waiting: 'Waiting for input',
    busy: 'Starting',
    offline: 'Offline'
  }[state] ?? 'Unknown');

  const numberFrom = (value) => {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const ratioFrom = (text) => {
    const match = String(text ?? '').match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)/);
    return match ? { used: numberFrom(match[1]), total: numberFrom(match[2]) } : { used: 0, total: 0 };
  };

  const metricValue = (entry, pattern) => {
    const metric = Array.from(entry.querySelectorAll('.ServerEntryMetric')).find((item) =>
      pattern.test(item.querySelector('h3')?.textContent ?? '')
    );
    return compact(metric?.querySelector('h4')?.textContent);
  };

  const memoryGB = (text) => {
    const ratio = ratioFrom(text);
    const unit = (String(text).match(/\b(KB|MB|GB|TB)\b/i)?.[1] ?? 'GB').toUpperCase();
    const factor = { KB: 1 / 1048576, MB: 1 / 1024, GB: 1, TB: 1024 }[unit] ?? 1;
    return ratio.used * factor;
  };

  const formatMemory = (gb) => gb > 0 && gb < 1 ? `${Math.round(gb * 1024)} MB` : `${gb.toFixed(2)} GB`;
  const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };

  const update = () => {
    const panel = document.getElementById('mn-dashboard-pro');
    if (!panel) return;

    const rows = Array.from(panel.querySelectorAll('.mn-server-row'));
    const cards = getCards();
    if (!rows.length || !cards.length) return;

    const usedCards = new Set();
    const states = rows.map((row) => {
      const name = rowName(row).toLowerCase();
      let card = cards.find((candidate) => !usedCards.has(candidate) && cardName(candidate).toLowerCase() === name);
      if (!card) card = cards.find((candidate) => !usedCards.has(candidate));
      if (!card) return null;
      usedCards.add(card);

      const state = detectState(card);
      row.classList.remove('is-online', 'is-sleeping', 'is-waiting', 'is-busy', 'is-offline');
      row.classList.add(`is-${state}`);
      setText(row.querySelector('.mn-server-name small'), labelFor(state));

      if (state !== 'online') {
        row.querySelectorAll(':scope > span:not(.mn-server-state):not(.mn-server-name):not(.mn-row-arrow) b')
          .forEach((node) => setText(node, '—'));
      }
      return { state, card };
    }).filter(Boolean);

    const online = states.filter((item) => item.state === 'online');
    const counts = {
      sleeping: states.filter((item) => item.state === 'sleeping').length,
      waiting: states.filter((item) => item.state === 'waiting').length,
      busy: states.filter((item) => item.state === 'busy').length,
      offline: states.filter((item) => item.state === 'offline').length
    };

    const players = online.reduce((sum, item) => sum + ratioFrom(metricValue(item.card, /user|player/i)).used, 0);
    const cpu = online.length
      ? online.reduce((sum, item) => sum + numberFrom(metricValue(item.card, /cpu/i).match(/-?\d+(?:[.,]\d+)?/)?.[0]), 0) / online.length
      : 0;
    const memory = online.reduce((sum, item) => sum + memoryGB(metricValue(item.card, /memory|ram/i)), 0);

    const notices = [];
    if (counts.waiting) notices.push(`${counts.waiting} waiting for input`);
    if (counts.sleeping) notices.push(`${counts.sleeping} sleeping`);
    if (counts.busy) notices.push(`${counts.busy} starting`);
    if (counts.offline) notices.push(`${counts.offline} offline`);

    setText(panel.querySelector('[data-health]'), notices.length ? notices.join(' • ') : 'All systems operational');
    setText(panel.querySelector('[data-summary-online]'), `${online.length}/${states.length}`);
    setText(panel.querySelector('[data-summary-players]'), String(Math.round(players)));
    setText(panel.querySelector('[data-summary-cpu]'), `${cpu.toFixed(1)}%`);
    setText(panel.querySelector('[data-summary-memory]'), formatMemory(memory));
    setText(panel.querySelector('.mn-section-title strong'), 'Live activity');
    setText(panel.querySelector('.mn-section-title span'), 'This browser session');

    const summary = panel.querySelectorAll('.mn-summary-strip > span');
    if (summary[0]?.lastChild) summary[0].lastChild.textContent = ' online';
    if (summary[1]?.lastChild) summary[1].lastChild.textContent = ' players';
    if (summary[2]?.lastChild) summary[2].lastChild.textContent = ' average CPU';
    if (summary[3]?.lastChild) summary[3].lastChild.textContent = ' RAM in use';
  };

  const start = () => {
    update();
    window.setInterval(update, 2500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
