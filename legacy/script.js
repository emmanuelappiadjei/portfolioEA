/* Portfolio version 2026.08.20.3 - navigation, custom cursor, and subtle rainbow trail. */
(function () {
  'use strict';

  const routes = Array.from(document.querySelectorAll('[data-route-panel]'));
  const routeLinks = Array.from(document.querySelectorAll('[data-route]'));
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const nav = document.querySelector('.site-header nav');
  const menu = document.querySelector('.menu-button');
  const trail = document.querySelector('#cursor-trail');
  const customCursor = document.querySelector('#custom-cursor');

  const trailColors = [
    '#ff8fa3', '#ffc56e', '#87d7ad', '#70b7ff', '#aa91ff'
  ];

  function showRoute(name, updateHash) {
    const target = routes.find((route) => route.dataset.routePanel === name) || routes[0];
    if (!target) return;

    routes.forEach((route) => route.classList.toggle('active', route === target));
    navLinks.forEach((link) => link.classList.toggle('active', link.dataset.route === target.dataset.routePanel));

    if (nav) nav.classList.remove('open');
    if (menu) menu.setAttribute('aria-expanded', 'false');
    if (updateHash) history.pushState(null, '', '#' + target.dataset.routePanel);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  routeLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showRoute(link.dataset.route, true);
    });
  });

  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
  }

  window.addEventListener('popstate', () => showRoute(location.hash.slice(1) || 'home', false));

  const finePointer = window.matchMedia('(pointer: fine) and (hover: hover)');

  if (customCursor && finePointer.matches) {
    document.documentElement.classList.add('custom-cursor-enabled');

    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      customCursor.style.left = event.clientX + 'px';
      customCursor.style.top = event.clientY + 'px';
      customCursor.classList.add('is-visible');
      const target = event.target instanceof Element ? event.target : null;
      customCursor.classList.toggle('is-interactive', Boolean(target && target.closest('a, button')));
    });

    document.documentElement.addEventListener('mouseleave', () => customCursor.classList.remove('is-visible'));
    document.documentElement.addEventListener('mouseenter', () => customCursor.classList.add('is-visible'));
  }

  let lastTrailTime = 0;
  let trailIndex = 0;

  window.addEventListener('pointermove', (event) => {
    if (!trail || !finePointer.matches || event.pointerType === 'touch' || performance.now() - lastTrailTime < 34) return;
    lastTrailTime = performance.now();

    const dot = document.createElement('span');
    dot.className = 'rainbow-trail-dot';
    dot.style.setProperty('--trail-color', trailColors[trailIndex++ % trailColors.length]);
    dot.style.left = event.clientX + 'px';
    dot.style.top = event.clientY + 'px';
    trail.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  });

  showRoute(location.hash.slice(1) || 'home', false);
})();
