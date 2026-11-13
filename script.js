/* ============================================================
   vdoxxy — інтерактив
   ============================================================ */
document.documentElement.classList.add('js');

(function () {
  'use strict';

  const header = document.getElementById('header');
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const progressBar = document.getElementById('progressBar');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Мобільне меню ---------- */
  function closeMenu() {
    nav.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Відкрити меню');
  }

  burger.addEventListener('click', function () {
    const isOpen = nav.classList.toggle('is-open');
    burger.classList.toggle('is-open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    burger.setAttribute('aria-label', isOpen ? 'Закрити меню' : 'Відкрити меню');
  });

  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', function (event) {
    if (!nav.classList.contains('is-open')) return;
    if (nav.contains(event.target) || burger.contains(event.target)) return;
    closeMenu();
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) closeMenu();
    window.requestAnimationFrame(updateParallax);
  });

  /* ---------- Плавний скрол до секцій ---------- */
  const root = document.documentElement;
  let scrollFrame = null;

  function stopScroll() {
    if (scrollFrame === null) return;
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
    root.style.scrollBehavior = '';
  }

  function headerOffset() {
    return header ? header.offsetHeight + 16 : 16;
  }

  // easeInOutCubic — м'який старт, розгін і гальмування
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function scrollToY(destination) {
    stopScroll();

    const from = window.scrollY;
    const distance = destination - from;

    if (Math.abs(distance) < 2) return;

    if (reduceMotion) {
      window.scrollTo(0, destination);
      return;
    }

    // Швидкість залежить від відстані: короткі переходи не тягнуться,
    // довгі (наприклад «нагору» з футера) не пролітають за мить.
    const duration = Math.min(1600, Math.max(700, Math.abs(distance) * 0.75));
    const start = performance.now();

    // Вимикаємо CSS smooth, щоб він не бився з покадровою анімацією
    root.style.scrollBehavior = 'auto';

    function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      window.scrollTo(0, from + distance * easeInOut(progress));

      if (progress < 1) {
        scrollFrame = window.requestAnimationFrame(step);
      } else {
        scrollFrame = null;
        root.style.scrollBehavior = '';
      }
    }

    scrollFrame = window.requestAnimationFrame(step);
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;

    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    event.preventDefault();
    closeMenu();

    const destination = hash === '#top'
      ? 0
      : Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset());

    // «Перейти до вмісту» має спрацьовувати одразу, без анімації
    if (link.classList.contains('skip')) {
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, destination);
      root.style.scrollBehavior = '';
    } else {
      scrollToY(destination);
    }

    if (history.replaceState) {
      history.replaceState(null, '', hash);
    }

    // Переносимо фокус на секцію, щоб працювала навігація з клавіатури
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // Будь-який ручний скрол скасовує анімацію — без боротьби з користувачем
  ['wheel', 'touchstart', 'keydown'].forEach(function (type) {
    window.addEventListener(type, stopScroll, { passive: true });
  });

  /* ---------- Шапка, прогрес і паралакс ---------- */
  const parallaxItems = Array.from(document.querySelectorAll('[data-parallax]'));
  let ticking = false;

  function documentTop(el) {
    let top = 0;
    while (el) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return top;
  }

  function updateParallax() {
    const allow = !reduceMotion && window.innerWidth > 900;

    if (!allow) {
      parallaxItems.forEach(function (el) { el.style.removeProperty('--py'); });
      return;
    }

    const center = window.scrollY + window.innerHeight / 2;

    parallaxItems.forEach(function (el) {
      const speed = parseFloat(el.dataset.parallax) || 0.06;
      const offset = (center - (documentTop(el) + el.offsetHeight / 2)) * speed;
      const clamped = Math.max(-46, Math.min(46, offset));
      el.style.setProperty('--py', clamped.toFixed(1) + 'px');
    });
  }

  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);

    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = Math.min(100, Math.max(0, ratio)) + '%';

    updateParallax();
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });

  onScroll();

  // Після завантаження шрифтів і фото позиції могли зміститися
  window.addEventListener('load', updateParallax);

  /* ---------- Поява блоків ---------- */
  const revealItems = Array.from(document.querySelectorAll('.reveal'));

  // Невелика затримка для сусідніх блоків — поява йде «хвилею»
  const groups = new Map();
  revealItems.forEach(function (el) {
    const parent = el.parentElement;
    const index = groups.get(parent) || 0;
    el.style.setProperty('--i', String(Math.min(index, 5)));
    groups.set(parent, index + 1);
  });

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach(function (item) { observer.observe(item); });
  } else {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
  }

  /* ---------- Активний пункт навігації ---------- */
  const navLinks = Array.from(nav.querySelectorAll('a[href^="#"]:not(.nav__ext)'));
  const sections = navLinks
    .map(function (link) {
      const section = document.getElementById(link.getAttribute('href').slice(1));
      return section ? { link: link, section: section } : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) { link.classList.remove('is-active'); });
        const match = sections.find(function (item) { return item.section === entry.target; });
        if (match) match.link.classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    sections.forEach(function (item) { spy.observe(item.section); });
  }

  /* ---------- Світло за курсором ---------- */
  const spot = document.querySelector('.bg__spot');
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  if (spot && finePointer && !reduceMotion) {
    const root = document.documentElement;
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.3;
    let x = targetX;
    let y = targetY;
    let frame = null;

    spot.classList.add('is-on');

    document.addEventListener('pointermove', function (event) {
      targetX = event.clientX;
      targetY = event.clientY;

      if (frame) return;

      frame = window.requestAnimationFrame(function step() {
        x += (targetX - x) * 0.12;
        y += (targetY - y) * 0.12;

        spot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
        root.style.setProperty('--mx', ((x / window.innerWidth) - 0.5).toFixed(3));
        root.style.setProperty('--my', ((y / window.innerHeight) - 0.5).toFixed(3));

        if (Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5) {
          frame = window.requestAnimationFrame(step);
        } else {
          frame = null;
        }
      });
    }, { passive: true });
  }

  /* ---------- Дощ на фоні ---------- */
  const rainCanvas = document.getElementById('rain');

  if (rainCanvas && !reduceMotion) {
    const rainCtx = rainCanvas.getContext('2d');

    if (rainCtx) {
      let rainWidth = 0;
      let rainHeight = 0;
      let drops = [];
      let sparks = [];
      let rainFrame = null;
      let lastTime = 0;

      function createDrop(initial) {
        const len = 7 + Math.random() * 16;

        return {
          x: Math.random() * rainWidth,
          y: initial ? Math.random() * rainHeight : -30 - Math.random() * 120,
          len: len,
          speed: 140 + Math.random() * 240,
          tilt: -(2 + Math.random() * 7),
          alpha: 0.04 + Math.random() * 0.14,
          cream: Math.random() < 0.22,
          width: Math.random() < 0.18 ? 1.2 : 0.7
        };
      }

      function createSpark(initial) {
        return {
          x: Math.random() * rainWidth,
          y: initial ? Math.random() * rainHeight : -40 - Math.random() * 80,
          size: 9 + Math.random() * 9,
          speed: 26 + Math.random() * 36,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.9,
          alpha: 0.07 + Math.random() * 0.13,
          char: Math.random() < 0.6 ? '✳' : '+'
        };
      }

      function resizeRain() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        rainWidth = rainCanvas.clientWidth || window.innerWidth;
        rainHeight = rainCanvas.clientHeight || window.innerHeight;
        rainCanvas.width = Math.floor(rainWidth * dpr);
        rainCanvas.height = Math.floor(rainHeight * dpr);
        rainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.round(Math.min(130, Math.max(38, rainWidth / 12)));
        drops = Array.from({ length: count }, function () { return createDrop(true); });
        sparks = Array.from(
          { length: rainWidth > 900 ? 5 : 3 },
          function () { return createSpark(true); }
        );
      }

      function drawRain(time) {
        if (!lastTime) lastTime = time;
        const dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        rainCtx.clearRect(0, 0, rainWidth, rainHeight);

        drops.forEach(function (drop) {
          drop.y += drop.speed * dt;
          drop.x += (drop.tilt / drop.len) * drop.speed * dt;

          if (drop.y - drop.len > rainHeight || drop.x < -40) {
            const next = createDrop(false);
            Object.assign(drop, next);
          }

          rainCtx.beginPath();
          rainCtx.lineWidth = drop.width;
          rainCtx.strokeStyle = drop.cream
            ? 'rgba(242, 240, 233, ' + (drop.alpha * 0.65).toFixed(3) + ')'
            : 'rgba(217, 255, 75, ' + drop.alpha.toFixed(3) + ')';
          rainCtx.moveTo(drop.x, drop.y);
          rainCtx.lineTo(drop.x - drop.tilt, drop.y - drop.len);
          rainCtx.stroke();
        });

        rainCtx.textAlign = 'center';
        rainCtx.textBaseline = 'middle';

        sparks.forEach(function (spark) {
          spark.y += spark.speed * dt;
          spark.angle += spark.spin * dt;
          spark.x += Math.sin(spark.angle) * 6 * dt;

          if (spark.y > rainHeight + 40) {
            Object.assign(spark, createSpark(false));
          }

          rainCtx.save();
          rainCtx.translate(spark.x, spark.y);
          rainCtx.rotate(spark.angle);
          rainCtx.font = '500 ' + spark.size.toFixed(1) + 'px "IBM Plex Mono", monospace';
          rainCtx.fillStyle = 'rgba(217, 255, 75, ' + spark.alpha.toFixed(3) + ')';
          rainCtx.fillText(spark.char, 0, 0);
          rainCtx.restore();
        });

        rainFrame = window.requestAnimationFrame(drawRain);
      }

      function startRain() {
        if (rainFrame !== null || document.hidden) return;
        lastTime = 0;
        rainFrame = window.requestAnimationFrame(drawRain);
      }

      function stopRain() {
        if (rainFrame === null) return;
        window.cancelAnimationFrame(rainFrame);
        rainFrame = null;
        rainCtx.clearRect(0, 0, rainWidth, rainHeight);
      }

      resizeRain();
      startRain();

      window.addEventListener('resize', resizeRain);

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          stopRain();
        } else {
          startRain();
        }
      });
    }
  }

  /* ---------- Рік у футері ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
