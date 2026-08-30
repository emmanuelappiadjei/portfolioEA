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

  /* --- Header -----------------------------------------------------------
     Hides on the way down, returns on the way up, and retires entirely once
     the closing contact block reaches the top of the viewport, so it never
     sits on top of the footer. */
  (function header() {
    var el = document.querySelector('.site-header');
    if (!el) return;

    var lastY = window.scrollY;
    var tucked = false;
    var retired = false;
    var closing = document.querySelector('.contact-block');

    function update() {
      var y = window.scrollY;
      var down = y > lastY + 2;
      var up = y < lastY - 2;

      var wantRetired = closing
        ? closing.getBoundingClientRect().top <= el.offsetHeight + 8
        : false;

      if (wantRetired !== retired) {
        retired = wantRetired;
        el.classList.toggle('is-retired', retired);
      }

      var wantTucked = tucked;
      if (y < 90) wantTucked = false;
      else if (down) wantTucked = true;
      else if (up) wantTucked = false;

      if (wantTucked !== tucked) {
        tucked = wantTucked;
        el.classList.toggle('is-tucked', tucked);
      }

      if (Math.abs(y - lastY) > 2) lastY = y;
    }

    update();
    scrollTasks.push(update);
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

  /* --- Reveals -----------------------------------------------------------
     IntersectionObserver drives the reveals, with a scroll sweep behind it so
     an element that comes to rest exactly on the observer's bottom margin can
     never stay stuck at zero opacity. */
  (function reveals() {
    var targets = all('[data-reveal], [data-reveal-mask], [data-mask-media]');
    if (!targets.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var pending = targets.slice();

    function play(el) {
      el.classList.add('is-in');
      io.unobserve(el);
      var i = pending.indexOf(el);
      if (i > -1) pending.splice(i, 1);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) play(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    targets.forEach(function (el) { io.observe(el); });

    function sweep() {
      if (!pending.length) return;
      var limit = window.innerHeight * 0.96;
      for (var i = pending.length - 1; i >= 0; i--) {
        var rect = pending[i].getBoundingClientRect();
        if (rect.top < limit && rect.bottom > 0) play(pending[i]);
      }
    }

    scrollTasks.push(sweep);
    requestAnimationFrame(sweep);
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
