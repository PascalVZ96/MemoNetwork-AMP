(() => {
  'use strict';

  const findLocalHeader = () => Array.from(document.querySelectorAll('.ServerGroupHeader')).find((header) => {
    const name = header.querySelector('.ServerGroupName > span')?.textContent?.trim() ?? '';
    return name === 'Local Instances' && !header.classList.contains('loadPending');
  }) ?? null;

  const ensureBrandLogo = () => {
    const logo = document.querySelector('#sideMenu .heroImage');
    if (!logo) return;

    const src = '/Themes/AMPThemes/MemoNetwork/MemoNetwork-logo.png';
    if (logo instanceof HTMLImageElement && logo.getAttribute('src') !== src) {
      logo.setAttribute('src', src);
    }
    logo.style.setProperty('width', '168px', 'important');
    logo.style.setProperty('height', '124px', 'important');
    logo.style.setProperty('max-width', '168px', 'important');
    logo.style.setProperty('max-height', 'none', 'important');
    logo.style.setProperty('object-fit', 'contain', 'important');
    logo.style.setProperty('object-position', 'center', 'important');
    logo.style.setProperty('overflow', 'visible', 'important');
  };

  const formatSystemInfo = () => {
    const header = findLocalHeader();
    const info = header?.querySelector('.SystemInfo');
    if (!info) return;

    const raw = info.dataset.mnRawSystemInfo || info.textContent.replace(/\s+/g, ' ').trim();
    if (!raw) return;
    info.dataset.mnRawSystemInfo = raw;

    const match = raw.match(/^(.+?)\s*\|\s*([^|]+?RAM)\s+(.+?)\s*\((\d+)\s*Cores?\)$/i);
    if (!match) return;

    const os = match[1].trim();
    const ram = match[2].trim().replace(/(\d)GB\b/i, '$1 GB');
    const cpu = match[3]
      .replace(/Intel\(R\)/gi, 'Intel')
      .replace(/Core\(TM\)/gi, 'Core')
      .replace(/\s+/g, ' ')
      .trim();
    const cores = `${match[4]} Cores`;

    const expected = `<span class="mn-system-os">${os}</span><span class="mn-system-hardware">${ram}<i>•</i>${cpu}<i>•</i>${cores}</span>`;
    if (info.innerHTML !== expected) info.innerHTML = expected;
    info.classList.add('mn-system-info');
  };

  const polish = () => {
    ensureBrandLogo();
    formatSystemInfo();
    document.documentElement.classList.add('mn-hide-control-badge');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', polish, { once: true });
  } else {
    polish();
  }

  window.setInterval(polish, 1500);
})();
