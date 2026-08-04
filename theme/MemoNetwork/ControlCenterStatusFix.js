(() => {
  'use strict';

  const getCards = () => Array.from(document.querySelectorAll('.ServerEntry')).filter((entry) =>
    !/create instance/i.test(entry.textContent ?? '')
  );

  const compactText = (node) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const detectState = (entry) => {
    const text = compactText(entry);
    const upper = text.toUpperCase();

    // Specific non-running states must be checked before the word RUNNING,
    // because AMP also uses text such as "Instance not running".
    if (
      upper.includes('WAITING FOR USER INPUT') ||
      upper.includes('APPLICATION WAITING')
    ) return 'waiting';

    if (
      upper.includes('APPLICATION SLEEPING') ||
      /(^|\s)SLEEPING(?=\s|$)/i.test(text)
    ) return 'sleeping';

    if (
      upper.includes('INSTANCE NOT RUNNING') ||
      upper.includes('APPLICATION STOPPED') ||
      /(^|\s)(OFFLINE|STOPPED)(?=\s|$)/i.test(text)
    ) return 'offline';

    if (/(^|\s)(STARTING|RESTARTING|UPDATING)(?=\s|$)/i.test(text)) return 'busy';

    // AMP badges can contain icon text in addition to RUNNING, so an exact
    // element-text match is unreliable. At this point "not running" has
    // already been excluded safely.
    if (
      entry?.classList.contains('statusRunning') ||
      entry?.getAttribute('data-state') === '20' ||
      /(^|\s)RUNNING(?=\s|$)/i.test(text)
    ) return 'online';

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
    const number = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(number) ? number : 0;
  };

  const ratioFrom = (text) => {
    const match = String(text ?? '').match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)/);
    return match ? { used: numberFrom(match[1]), total: numberFrom(match[2]) } : { used: 0, total: 0 };
  };

  const memoryGB = (text) => {
    const value = String(text ?? '');
    const ratio = ratioFrom(value);
    const unit = (value.match(/\b(KB|MB|GB|TB)\b/i)?.[1] ?? 'GB').toUpperCase();
    const factor = { KB: 1 / 1048576, MB: 1 / 1024, GB: 1, TB: 1024 }[unit] ?? 1;
    return ratio.used * factor;
  };

  const metricValue = (entry, pattern) => {
    const metric = Array.from(entry.querySelectorAll('.ServerEntryMetric')).find((item) =>
      pattern.test(item.querySelector('h3')?.textContent ?? '')
    );
    return metric?.querySelector('h4')?.textContent?.trim() ?? '';
  };

  const formatMemory = (gb) => gb > 0 && gb < 1 ? `${Math.round(gb * 1024)} MB` : `${gb.toFixed(2)} GB`;

  const update = () => {
    const panel = document.getElementById('mn-dashboard-pro');
    if (!panel) return;

    const rows = Array.from(panel.querySelectorAll('.mn-server-row'));
    const cards = getCards().slice(0, rows.length);
    if (!rows.length || !cards.length) return;

    const states = [];
    rows.forEach((row, index) => {
      const card = cards[index];
      if (!card) return;
      const state = detectState(card);
      states.push({ state, card });

      row.classList.remove('is-online', 'is-sleeping', 'is-waiting', 'is-busy', 'is-offline');
      row.classList.add(`is-${state}`);
      const stateLabel = row.querySelector('.mn-server-name small');
      if (stateLabel) stateLabel.textContent = labelFor(state);

      if (state !== 'online') {
        const metrics = row.querySelectorAll(':scope > span:not(.mn-server-state):not(.mn-server-name):not(.mn-row-arrow) b');
        metrics.forEach((metric) => { metric.textContent = '—'; });
      }
    });

    const online = states.filter((item) => item.state === 'online');
    const sleeping = states.filter((item) => item.state === 'sleeping').length;
    const waiting = states.filter((item) => item.state === 'waiting').length;
    const busy = states.filter((item) => item.state === 'busy').length;
    const offline = states.filter((item) => item.state === 'offline').length;

    const players = online.reduce((sum, item) => sum + ratioFrom(metricValue(item.card, /user|player/i)).used, 0);
    const cpu = online.length
      ? online.reduce((sum, item) => sum + numberFrom(metricValue(item.card, /cpu/i).match(/-?\d+(?:[.,]\d+)?/)?.[0]), 0) / online.length
      : 0;
    const memory = online.reduce((sum, item) => sum + memoryGB(metricValue(item.card, /memory|ram/i)), 0);

    const notices = [];
    if (waiting) notices.push(`${waiting} waiting for input`);
    if (sleeping) notices.push(`${sleeping} sleeping`);
    if (busy) notices.push(`${busy} starting`);
    if (offline) notices.push(`${offline} offline`);

    const health = panel.querySelector('[data-health]');
    if (health) health.textContent = notices.length ? notices.join(' • ') : 'All systems operational';

    const summaryOnline = panel.querySelector('[data-summary-online]');
    const summaryPlayers = panel.querySelector('[data-summary-players]');
    const summaryCpu = panel.querySelector('[data-summary-cpu]');
    const summaryMemory = panel.querySelector('[data-summary-memory]');
    if (summaryOnline) summaryOnline.textContent = `${online.length}/${states.length}`;
    if (summaryPlayers) summaryPlayers.textContent = String(Math.round(players));
    if (summaryCpu) summaryCpu.textContent = `${cpu.toFixed(1)}%`;
    if (summaryMemory) summaryMemory.textContent = formatMemory(memory);

    const summarySpans = panel.querySelectorAll('.mn-summary-strip > span');
    if (summarySpans[0]) summarySpans[0].lastChild.textContent = ' online';
    if (summarySpans[1]) summarySpans[1].lastChild.textContent = ' players';
    if (summarySpans[2]) summarySpans[2].lastChild.textContent = ' average CPU';
    if (summarySpans[3]) summarySpans[3].lastChild.textContent = ' RAM in use';

    const sectionTitle = panel.querySelector('.mn-section-title strong');
    const sessionLabel = panel.querySelector('.mn-section-title span');
    if (sectionTitle) sectionTitle.textContent = 'Live activity';
    if (sessionLabel) sessionLabel.textContent = 'This browser session';

    panel.querySelectorAll('.mn-activity-item span').forEach((node) => {
      if (/Wachten op statuswijzigingen/i.test(node.textContent ?? '')) node.textContent = 'Waiting for status changes…';
      node.textContent = (node.textContent ?? '')
        .replace(/Wacht op invoer/gi, 'Waiting for input')
        .replace(/Bezig/gi, 'Starting')
        .replace(/speler online/gi, 'player online')
        .replace(/spelers online/gi, 'players online');
    });
  };

  const start = () => {
    update();
    new MutationObserver(() => requestAnimationFrame(update)).observe(document.body, { childList: true, subtree: true });
    window.setInterval(update, 700);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
