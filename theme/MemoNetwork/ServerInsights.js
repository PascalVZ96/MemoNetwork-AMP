(() => {
  'use strict';

  const CPU_WARNING = 65;
  const CPU_CRITICAL = 85;
  const RAM_WARNING = 75;
  const RAM_CRITICAL = 90;
  let observedPanel = null;
  let panelObserver = null;
  let queued = false;

  const compact = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const numberFrom = (value) => {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const ratioFrom = (text) => {
    const match = String(text ?? '').match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)/);
    return match ? { used: numberFrom(match[1]), total: numberFrom(match[2]) } : { used: 0, total: 0 };
  };

  const metricData = (metric) => ({
    label: compact(metric?.querySelector('h3')?.textContent).toLowerCase(),
    value: compact(metric?.querySelector('h4')?.textContent)
  });

  const findMetric = (entry, terms) => Array.from(entry.querySelectorAll('.ServerEntryMetric')).find((metric) => {
    const label = metricData(metric).label;
    return terms.some((term) => label.includes(term));
  });

  const rawName = (entry) => {
    for (const selector of ['.ServerEntryName', '.ServerEntryTitle', 'h2', 'h3']) {
      const value = compact(entry.querySelector(selector)?.textContent);
      if (value && !/cpu|memory|users|application waiting|application sleeping|instance not running|application idle/i.test(value)) {
        return value.replace(/\s+SERVER\s*$/i, '').trim();
      }
    }
    return '';
  };

  const isRunning = (entry) => {
    const text = compact(entry.textContent);
    if (/waiting for user input|application waiting|application sleeping|instance not running|application stopped|application idle|\boffline\b|\bstopped\b|\bidle\b/i.test(text)) return false;
    return /\brunning\b/i.test(text) || entry.classList.contains('statusRunning') || entry.getAttribute('data-state') === '20';
  };

  const inspectEntry = (entry, index) => {
    const name = rawName(entry);
    if (!name || /create instance/i.test(compact(entry.textContent))) return null;

    const cpuMetric = findMetric(entry, ['cpu']);
    const memoryMetric = findMetric(entry, ['memory', 'ram']);
    const cpu = cpuMetric ? numberFrom(metricData(cpuMetric).value.match(/-?\d+(?:[.,]\d+)?/)?.[0]) : 0;
    const memory = memoryMetric ? ratioFrom(metricData(memoryMetric).value) : { used: 0, total: 0 };
    const ramPercent = memory.total > 0 ? (memory.used / memory.total) * 100 : 0;
    const running = isRunning(entry);

    let level = 'normal';
    const reasons = [];
    if (running && cpu >= CPU_CRITICAL) { level = 'critical'; reasons.push(`CPU ${cpu.toFixed(0)}%`); }
    else if (running && cpu >= CPU_WARNING) { level = 'warning'; reasons.push(`CPU ${cpu.toFixed(0)}%`); }

    if (running && ramPercent >= RAM_CRITICAL) { level = 'critical'; reasons.push(`RAM ${ramPercent.toFixed(0)}%`); }
    else if (running && ramPercent >= RAM_WARNING) {
      if (level !== 'critical') level = 'warning';
      reasons.push(`RAM ${ramPercent.toFixed(0)}%`);
    }

    return { entry, index, name, running, cpu, ramPercent, level, reasons };
  };

  const getInsights = () => Array.from(document.querySelectorAll('.ServerEntry'))
    .map(inspectEntry)
    .filter(Boolean);

  const updateRows = (panel, insights) => {
    const rows = Array.from(panel.querySelectorAll('.mn-server-row'));
    rows.forEach((row, index) => {
      const insight = insights[index];
      row.classList.remove('mn-health-warning', 'mn-health-critical');
      row.removeAttribute('data-health-level');
      const oldBadge = row.querySelector('.mn-server-health-badge');
      oldBadge?.remove();
      if (!insight || insight.level === 'normal') return;

      row.classList.add(`mn-health-${insight.level}`);
      row.dataset.healthLevel = insight.level;
      const nameBlock = row.querySelector('.mn-server-name');
      if (!nameBlock) return;
      const badge = document.createElement('em');
      badge.className = `mn-server-health-badge is-${insight.level}`;
      badge.textContent = insight.reasons.join(' · ');
      badge.title = `${insight.name}: ${insight.reasons.join(', ')}`;
      nameBlock.appendChild(badge);
    });
  };

  const ensureAlerts = (panel) => {
    const activityPanel = panel.querySelector('.mn-activity-panel');
    if (!activityPanel) return null;
    let host = activityPanel.querySelector('.mn-insights-alerts');
    if (!host) {
      host = document.createElement('div');
      host.className = 'mn-insights-alerts';
      const list = activityPanel.querySelector('.mn-activity-list');
      if (list) activityPanel.insertBefore(host, list);
      else activityPanel.appendChild(host);
    }
    return host;
  };

  const renderAlerts = (panel, insights) => {
    const alerts = insights.filter((item) => item.level !== 'normal');
    const host = ensureAlerts(panel);
    if (!host) return;

    if (!alerts.length) {
      host.innerHTML = '<div class="mn-insights-ok"><span></span>Resource health normal</div>';
      return;
    }

    host.innerHTML = alerts.map((item) =>
      `<button type="button" class="mn-insight-alert is-${item.level}" data-insight-index="${item.index}"><strong>${item.name}</strong><span>${item.reasons.join(' · ')}</span></button>`
    ).join('');

    host.querySelectorAll('[data-insight-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = insights.find((entry) => entry.index === Number(button.dataset.insightIndex));
        if (!item?.entry) return;
        item.entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.entry.classList.add('mn-card-highlight');
        window.setTimeout(() => item.entry.classList.remove('mn-card-highlight'), 1400);
      });
    });
  };

  const renderSummary = (panel, insights) => {
    const heading = panel.querySelector('.mn-control-heading');
    if (!heading) return;
    let summary = heading.querySelector('.mn-resource-health');
    if (!summary) {
      summary = document.createElement('span');
      summary.className = 'mn-resource-health';
      const liveTime = heading.querySelector('.mn-live-time');
      if (liveTime) heading.insertBefore(summary, liveTime);
      else heading.appendChild(summary);
    }

    const critical = insights.filter((item) => item.level === 'critical').length;
    const warning = insights.filter((item) => item.level === 'warning').length;
    summary.className = `mn-resource-health ${critical ? 'is-critical' : warning ? 'is-warning' : 'is-normal'}`;
    summary.textContent = critical ? `${critical} resource alert${critical === 1 ? '' : 's'}` : warning ? `${warning} resource warning${warning === 1 ? '' : 's'}` : 'Resources OK';
    summary.title = `Warning: CPU ≥ ${CPU_WARNING}% or RAM ≥ ${RAM_WARNING}% · Critical: CPU ≥ ${CPU_CRITICAL}% or RAM ≥ ${RAM_CRITICAL}%`;
  };

  const update = () => {
    queued = false;
    const panel = document.getElementById('mn-dashboard-pro');
    if (!panel) return;
    const insights = getInsights();
    updateRows(panel, insights);
    renderAlerts(panel, insights);
    renderSummary(panel, insights);
  };

  const queueUpdate = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  };

  const attach = () => {
    const panel = document.getElementById('mn-dashboard-pro');
    if (!panel || panel === observedPanel) return Boolean(panel);
    panelObserver?.disconnect();
    observedPanel = panel;
    panelObserver = new MutationObserver(queueUpdate);
    panelObserver.observe(panel, { childList: true, subtree: true, characterData: true });
    update();
    return true;
  };

  const start = () => {
    if (attach()) return;
    const bootstrap = new MutationObserver(() => {
      if (attach()) bootstrap.disconnect();
    });
    bootstrap.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
