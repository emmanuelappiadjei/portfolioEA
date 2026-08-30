/* ==========================================================================
   Emmanuel Appiadjei — site behaviour
   No framework, no animation library. One rAF loop drives every scroll-linked
   effect; everything else is IntersectionObserver. Degrades to a plain,
   fully readable static page if JS fails or motion is reduced.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function on(el, type, fn, opts) { if (el) el.addEventListener(type, fn, opts); }
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* Scroll-linked effects share one rAF loop: anything that reads scroll
     position registers a task here rather than adding its own listener. */
  var scrollTasks = [];
  var ticking = false;

  function runTasks() {
    for (var i = 0; i < scrollTasks.length; i++) scrollTasks[i]();
    ticking = false;
  }

  function requestTick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(runTasks);
  }

  on(window, 'scroll', requestTick, { passive: true });
  on(window, 'resize', requestTick);

  /* --- Legacy hash routes -------------------------------------------------
     The previous build was a single page with #about / #landing / #work
     panels. Those URLs are still in the wild, so map them onto the new pages
     instead of dropping visitors at the top of the homepage. */
  (function legacyHashRoutes() {
    var map = { '#about': 'about.html', '#landing': 'landing-pages.html', '#work': 'work.html' };
    var isHome = /(^|\/)(index\.html)?$/.test(location.pathname);
    var target = map[location.hash];
    if (isHome && target) location.replace(target);
  })();

  /* --- Liquid header ---------------------------------------------------- */
  (function header() {
    var el = document.querySelector('.site-header');
    if (!el) return;

    var lastY = window.scrollY;
    var compact = false;

    function update() {
      var y = window.scrollY;
      var goingDown = y > lastY;
      var next = y > 90 && goingDown;
      if (y < 60) next = false;
      if (next !== compact) {
        compact = next;
        el.classList.toggle('is-compact', compact);
      }
      lastY = y;
    }

    update();
    scrollTasks.push(update);
  })();

  /* --- Sliding nav pill --------------------------------------------------
     One shape that travels to whichever link is active or hovered. */
  (function navPill() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var pill = nav.querySelector('.nav__pill');
    var links = all('.nav__link', nav);
    var current = nav.querySelector('.nav__link[aria-current="page"]');
    if (!pill || !links.length) return;

    var settleTimer = null;

    // The pill stretches along its direction of travel and settles back — the
    // small amount of give that makes the header read as one liquid material
    // rather than a rectangle teleporting between links.
    function moveTo(link, ready) {
      if (!link) { pill.classList.remove('is-ready'); return; }

      var x = link.offsetLeft;
      var moving = Math.abs(x - (parseFloat(pill.dataset.x) || 0)) > 2;
      pill.dataset.x = x;
      pill.style.width = link.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + x + 'px) scaleX(' + (moving ? 1.16 : 1) + ')';

      clearTimeout(settleTimer);
      if (moving) {
        settleTimer = setTimeout(function () {
          pill.style.transform = 'translateX(' + x + 'px) scaleX(1)';
        }, 150);
      }

      if (ready !== false) pill.classList.add('is-ready');
    }

    function settle() { moveTo(current); }

    links.forEach(function (link) {
      on(link, 'pointerenter', function () { moveTo(link); });
      on(link, 'focus', function () { moveTo(link); });
    });
    on(nav, 'pointerleave', settle);
    on(nav, 'focusout', settle);

    // Fonts land after first paint and change link widths.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
    on(window, 'resize', settle);
    requestAnimationFrame(settle);
  })();

  /* --- Mobile menu ------------------------------------------------------- */
  (function mobileMenu() {
    var toggle = document.querySelector('.menu-toggle');
    var menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      root.classList.toggle('is-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = menu.querySelector('a');
        if (first) first.focus({ preventScroll: true });
      }
    }

    on(toggle, 'click', function () {
      setOpen(!root.classList.contains('is-menu-open'));
    });

    all('a', menu).forEach(function (a) {
      on(a, 'click', function () { setOpen(false); });
    });

    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-menu-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Keep the drawer from lingering when the layout grows back to desktop.
    on(window, 'resize', function () {
      if (window.innerWidth > 1080 && root.classList.contains('is-menu-open')) setOpen(false);
    });

    menu.setAttribute('aria-hidden', 'true');
  })();

  /* --- Reveals ----------------------------------------------------------- */
  (function reveals() {
    var targets = all('[data-reveal], [data-reveal-mask], [data-mask-media]');
    if (!targets.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });

    // The observer's bottom margin means anything sitting in the last slice of
    // the first screen (a scroll cue, say) would never trigger. Play those in
    // on load instead, so nothing above the fold stays invisible.
    requestAnimationFrame(function () {
      targets.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    });
  })();

  /* Rising display type: lines travel up as their block crosses the viewport. */
  (function risingType() {
    if (reduceMotion.matches) return;
    var blocks = all('[data-rise]');
    if (!blocks.length) return;

    var items = blocks.map(function (block) {
      return {
        el: block,
        lines: all('.line > span', block),
        depth: parseFloat(block.dataset.rise) || 1
      };
    }).filter(function (item) { return item.lines.length; });

    if (!items.length) return;

    function update() {
      var vh = window.innerHeight;
      items.forEach(function (item) {
        var rect = item.el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        // 0 when the block first enters, 1 once it has settled mid-screen.
        var p = 1 - Math.min(Math.max((rect.top - vh * 0.18) / (vh * 0.72), 0), 1);
        item.lines.forEach(function (line, i) {
          var speed = item.depth * (1 + i * 0.22);
          var y = (1 - p) * 46 * speed;
          line.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
          line.style.opacity = (0.25 + p * 0.75).toFixed(3);
        });
      });
    }

    scrollTasks.push(update);
    update();
  })();

  /* Image parallax — transform only, clamped so nothing ever leaves its box. */
  (function parallax() {
    if (reduceMotion.matches) return;
    var nodes = all('[data-parallax]');
    if (!nodes.length) return;

    function update() {
      var vh = window.innerHeight;
      nodes.forEach(function (node) {
        var rect = node.getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > vh + 120) return;
        var amount = parseFloat(node.dataset.parallax) || 8;
        var centre = rect.top + rect.height / 2;
        var offset = (centre - vh / 2) / vh; // -1 .. 1
        var y = Math.max(-1, Math.min(1, offset)) * amount;
        var scale = node.dataset.parallaxScale || '1.08';
        node.style.transform = 'translate3d(0,' + y.toFixed(2) + '%,0) scale(' + scale + ')';
      });
    }

    scrollTasks.push(update);
    update();
  })();

  /* Scroll progress hairline. */
  (function progress() {
    var bar = document.querySelector('.progress');
    if (!bar) return;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(Math.max(p, 0), 1).toFixed(4) + ')';
    }

    scrollTasks.push(update);
    update();
  })();

  /* --- Work index cursor preview -----------------------------------------
     Desktop only. One reused element; rows carry the image source. */
  (function workPeek() {
    var index = document.querySelector('[data-peek-scope]');
    if (!index || !finePointer.matches || reduceMotion.matches) return;

    var rows = all('[data-peek]', index);
    if (!rows.length) return;

    var peek = document.createElement('div');
    peek.className = 'work-peek';
    peek.setAttribute('aria-hidden', 'true');
    var img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    peek.appendChild(img);
    document.body.appendChild(peek);

    var targetX = 0, targetY = 0, x = 0, y = 0, active = false, raf = null;

    function loop() {
      x += (targetX - x) * 0.14;
      y += (targetY - y) * 0.14;
      peek.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + (active ? 1 : 0.94) + ')';
      if (active || Math.abs(targetX - x) > 0.5) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    }

    function start() { if (!raf) raf = requestAnimationFrame(loop); }

    rows.forEach(function (row) {
      on(row, 'pointerenter', function (e) {
        if (e.pointerType === 'touch') return;
        var src = row.getAttribute('data-peek');
        if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
        active = true;
        peek.classList.add('is-visible');
        targetX = e.clientX; targetY = e.clientY;
        x = targetX; y = targetY;
        start();
      });

      on(row, 'pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        targetX = e.clientX; targetY = e.clientY;
        start();
      });

      on(row, 'pointerleave', function () {
        active = false;
        peek.classList.remove('is-visible');
        start();
      });
    });
  })();

  /* --- Scrolling landing-page shots ---------------------------------------
     Each tall screenshot scrolls its own height on hover; the CSS needs to
     know how far, so publish the frame height as a custom property. */
  (function shotHeights() {
    var shots = all('.archive-item__shot');
    if (!shots.length) return;

    function measure() {
      shots.forEach(function (shot) {
        var image = shot.querySelector('img');
        if (!image) return;
        var h = shot.clientHeight;
        var full = image.offsetHeight;
        shot.style.setProperty('--shot-h', full > h ? (h / full * 100).toFixed(3) + '%' : '100%');
      });
    }

    all('.archive-item__shot img').forEach(function (image) {
      if (image.complete) return;
      on(image, 'load', measure);
    });

    measure();
    on(window, 'resize', measure);
  })();

  /* --- Case-study section index ------------------------------------------ */
  (function caseNav() {
    var nav = document.querySelector('.case-nav');
    if (!nav) return;

    var links = all('a', nav);
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    if (!sections.length) return;

    function update() {
      var mark = window.innerHeight * 0.32;
      var currentIndex = 0;
      sections.forEach(function (section, i) {
        if (section.getBoundingClientRect().top <= mark) currentIndex = i;
      });
      links.forEach(function (a, i) { a.classList.toggle('is-current', i === currentIndex); });
    }

    scrollTasks.push(update);
    update();
  })();

  /* --- Custom cursor -----------------------------------------------------
     Fine pointers only; the native cursor is never hidden, so a failure here
     is invisible rather than fatal. */
  (function cursor() {
    if (!finePointer.matches || reduceMotion.matches) return;

    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = 0, my = 0, rx = 0, ry = 0, raf = null;

    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      raf = requestAnimationFrame(loop);
    }

    on(window, 'pointermove', function (e) {
      if (e.pointerType === 'touch') { root.classList.remove('has-cursor'); return; }
      mx = e.clientX; my = e.clientY;
      root.classList.add('has-cursor');
      var el = e.target instanceof Element ? e.target : null;
      root.classList.toggle('cursor-active', Boolean(el && el.closest('a, button, [role="button"], input, textarea, select')));
      if (!raf) { rx = mx; ry = my; raf = requestAnimationFrame(loop); }
    }, { passive: true });

    on(document, 'pointerleave', function () { root.classList.remove('has-cursor'); });
    on(window, 'blur', function () { root.classList.remove('has-cursor'); });
  })();

  /* --- Current year in the footer ---------------------------------------- */
  all('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
