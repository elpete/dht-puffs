(() => {
  const data = window.PUFFS_REHEARSAL_VIDEOS;
  const acts = [{ title: 'Act I', start: 1, end: 61 }, { title: 'Act II', start: 62, end: 101 }];
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const pages = (start, end) => start === end ? `Page ${start}` : `Pages ${start}–${end}`;
  const groups = new Map();
  for (const video of data.videos) {
    // Titles end with "Loyal Cast (1–5)" or "True Cast (1–5)".
    const match = video.title.match(/^(.*?)\s*(?:[-–—:]\s*)?(Loyal Cast|True Cast)\s*\((?:pp?\.?\s*|pages?\s*)?(\d+)(?:\s*[-–—]\s*(\d+))?\)\s*$/i);
    if (!match || !/^[\w-]{11}$/.test(video.id)) throw new Error(`Invalid rehearsal video: ${video.title}`);
    const title = match[1].replace(/\s*[-–—:]\s*$/, '').trim();
    const start = Number(match[3]);
    const end = Number(match[4] || match[3]);
    if (end < start || start < 1 || end > 101) throw new Error(`Invalid page range: ${video.title}`);
    const key = `${start}-${end}-${title.toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, { title, start, end, loyal: [], true: [] });
    groups.get(key)[match[2].toLowerCase().startsWith('loyal') ? 'loyal' : 'true'].push(video);
  }
  if (data.playlistUrl) {
    const link = element('a', 'Open the full YouTube playlist ↗', 'watch-link');
    link.href = data.playlistUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    document.getElementById('playlist-status').replaceChildren(link);
  }
  acts.forEach((act, index) => {
    const section = element('section', '', 'act');
    section.id = `act-${index + 1}`;
    section.setAttribute('aria-labelledby', `${section.id}-title`);
    const heading = element('h2', act.title);
    heading.id = `${section.id}-title`;
    const scroll = element('div', '', 'table-scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', `${act.title} rehearsal videos; scroll horizontally on small screens`);
    const table = element('table');
    table.append(element('caption', `${pages(act.start, act.end)}. On smaller screens, scroll across to see both casts.`));
    const head = element('thead');
    const headers = element('tr');
    ['Pages & Scene', 'Loyal Cast', 'True Cast'].forEach(title => {
      const th = element('th', title); th.scope = 'col'; headers.append(th);
    });
    head.append(headers);
    const body = element('tbody');
    const addGap = (start, end) => {
      if (start > end) return;
      const row = element('tr', '', 'gap');
      const label = element('th'); label.scope = 'row';
      label.append(element('span', pages(start, end), 'pages'));
      const cell = element('td', 'No rehearsal videos yet'); cell.colSpan = 2;
      row.append(label, cell); body.append(row);
    };
    let nextPage = act.start;
    [...groups.values()].filter(group => group.start <= act.end && group.end >= act.start)
      .sort((a, b) => a.start - b.start || a.end - b.end || a.title.localeCompare(b.title))
      .forEach(group => {
        addGap(nextPage, group.start - 1);
        const row = element('tr');
        const label = element('th'); label.scope = 'row';
        label.append(element('span', pages(group.start, group.end), 'pages'), element('span', group.title, 'scene-title'));
        row.append(label);
        ['loyal', 'true'].forEach(cast => {
          const cell = element('td');
          if (!group[cast].length) cell.append(element('p', 'No video yet for this cast.', 'missing'));
          group[cast].forEach(video => {
            const iframe = element('iframe', '', 'video');
            iframe.src = `https://www.youtube-nocookie.com/embed/${video.id}`;
            iframe.title = video.title;
            iframe.loading = 'lazy';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            const link = element('a', 'Watch on YouTube ↗', 'watch-link');
            link.href = `https://www.youtube.com/watch?v=${video.id}`;
            link.target = '_blank'; link.rel = 'noopener';
            link.setAttribute('aria-label', `Watch ${video.title} on YouTube (opens in a new tab)`);
            cell.append(iframe, link);
          });
          row.append(cell);
        });
        body.append(row);
        nextPage = Math.max(nextPage, group.end + 1);
      });
    addGap(nextPage, act.end);
    table.append(head, body); scroll.append(table); section.append(heading, scroll);
    document.getElementById('video-tables').append(section);
  });
})();
