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
     Gains its backing bar once the page scrolls, hides on the way down,
     returns on the way up, and retires entirely once the closing contact
     block reaches the top of the viewport, so it never sits on top of the
     footer. */
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

      // Only retire once the reader is genuinely near the foot of the page.
      // Testing the contact block alone made a freshly-loaded page hide its
      // header, because at first paint the images have not laid out yet and
      // that block still sits close to the top.
      var wantRetired = false;
      if (closing && y > window.innerHeight * 0.6) {
        wantRetired = closing.getBoundingClientRect().top <= el.offsetHeight + 8;
      }

      if (wantRetired !== retired) {
        retired = wantRetired;
        el.classList.toggle('is-retired', retired);
      }

      // The smoked backing bar only once the page has moved off the hero.
      el.classList.toggle('is-scrolled', y > 40);

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
    on(window, 'load', update);
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

  /* --- Copy the email address ------------------------------------------
     The address itself is a mailto link; this is the fallback for anyone
     without a mail app. Falls back again to selecting the text. */
  all('[data-copy]').forEach(function (btn) {
    var status = btn.parentNode.querySelector('.contact-copy__status');
    function say(msg) {
      if (!status) return;
      status.textContent = msg;
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { status.textContent = ''; }, 2400);
    }
    function selectIt() {
      var mail = btn.closest('.contact-block') && btn.closest('.contact-block').querySelector('.contact-mail');
      if (!mail) return;
      var r = document.createRange(); r.selectNodeContents(mail);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }
    on(btn, 'click', function () {
      var text = btn.getAttribute('data-copy');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say('Copied'); }, function () { selectIt(); say('Address selected'); });
      } else { selectIt(); say('Address selected'); }
    });
  });

  /* --- Homepage: the big word -------------------------------------------
     Sized so the word spans the stage whatever its length, and never taller
     than the stage can carry. CSS holds a clamp() fallback. */
  (function heroWord() {
    var word = document.querySelector('.home-hero__word');
    if (!word) return;
    var stage = word.parentNode;
    function fit() {
      word.style.fontSize = '100px';
      var w = word.getBoundingClientRect().width;
      word.style.fontSize = '';
      if (!w) return;
      var size = Math.min(100 * stage.clientWidth * 0.97 / w, stage.clientHeight * 0.62);
      stage.style.setProperty('--word-size', size.toFixed(1) + 'px');
    }
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    on(window, 'resize', fit);
  })();

  /* --- Homepage: pages and emails ----------------------------------------
     Each screen knows how far its long page has to travel inside the frame.
     Mouse: hover plays it, click opens the full view. Touch: the first tap
     plays it, the second opens it. */
  (function screenWall() {
    var shots = all('.home-shot');
    var dialog = document.querySelector('.home-viewer');
    if (!shots.length || !dialog) return;

    function measure(btn) {
      var img = btn.querySelector('img');
      if (!img.naturalWidth) return;
      var shown = btn.clientWidth * img.naturalHeight / img.naturalWidth;
      var travel = Math.max(0, shown - (btn.clientHeight - 20));
      btn.style.setProperty('--travel', travel.toFixed(0) + 'px');
      btn.style.setProperty('--dur', Math.min(14, Math.max(3, travel / 160)).toFixed(1) + 's');
    }

    shots.forEach(function (btn) {
      var img = btn.querySelector('img');
      if (img.complete) measure(btn); else on(img, 'load', function () { measure(btn); });
    });
    on(window, 'resize', function () { shots.forEach(measure); });

    var image = dialog.querySelector('[data-viewer-img]');
    var live = dialog.querySelector('[data-viewer-open]');
    var canHover = window.matchMedia('(hover: hover)');

    function openFull(btn) {
      image.src = btn.getAttribute('data-full');
      image.alt = btn.querySelector('img').alt || btn.getAttribute('data-title');
      live.href = btn.getAttribute('data-href');
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
      dialog.querySelector('.home-viewer__scroll').scrollTop = 0;
    }

    function close() { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); }

    shots.forEach(function (btn) {
      on(btn, 'click', function () {
        if (!canHover.matches && !btn.classList.contains('is-playing')) {
          shots.forEach(function (b) { b.classList.remove('is-playing'); });
          btn.classList.add('is-playing');
          return;
        }
        openFull(btn);
      });
    });

    on(dialog.querySelector('[data-viewer-close]'), 'click', close);
    on(dialog, 'click', function (e) { if (e.target === dialog) close(); });
  })();

  /* --- Homepage: the pile of photos --------------------------------------
     Tapping the pile sends the top print to the back and steps the story on.
     The first page of the story is real markup; the other two live in
     <template>s, so without script the section still reads. */
  (function photoPile() {
    var pile = document.querySelector('.home-pile');
    if (!pile) return;
    var prints = all('.home-print', pile);
    var title = document.querySelector('[data-story-title]');
    var text = document.querySelector('[data-story-text]');
    var swap = document.querySelector('.home-story__swap');
    var count = document.querySelector('[data-story-count]');
    var bars = all('.home-story__bars span');

    var pages = [{ title: title.innerHTML, text: text.textContent }];
    all('template[data-story]').forEach(function (t) {
      pages.push({ title: t.content.querySelector('h2').innerHTML, text: t.content.querySelector('p').textContent });
    });

    var index = 0;
    var busy = false;

    on(pile, 'click', function () {
      if (busy) return;
      busy = true;
      var top = prints.filter(function (p) { return p.getAttribute('data-pos') === '0'; })[0];
      top.classList.add('is-leaving');
      swap.classList.add('is-fading');
      index = (index + 1) % pages.length;

      setTimeout(function () {
        prints.forEach(function (p) {
          var pos = +p.getAttribute('data-pos');
          p.setAttribute('data-pos', String((pos + prints.length - 1) % prints.length));
        });
        top.classList.remove('is-leaving');
        title.innerHTML = pages[index].title;
        text.textContent = pages[index].text;
        count.textContent = '0' + (index + 1) + ' / 0' + pages.length;
        bars.forEach(function (b, i) { b.classList.toggle('is-on', i === index); });
        swap.classList.remove('is-fading');
        busy = false;
      }, reduceMotion.matches ? 0 : 380);
    });
  })();

  /* --- Current year in the footer ---------------------------------------- */
  all('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
