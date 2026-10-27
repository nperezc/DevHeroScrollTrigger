/* ============================================================
   HALCÓN AGROINDUSTRIAL — GSAP Scroll-Driven Engine
   ─────────────────────────────────────────────────────────────
   • Hero video is loaded as a Blob → seekable on every host
   • ScrollTrigger pins the hero; scroll position maps directly
     to video.currentTime (frame-accurate scrub)
   • Video never autoplays — it only advances when the user scrolls
   • At progress=1.0 the section fades to black (600ms) and the
     next section slides in naturally
   • Navbar pill is transparent over the hero and switches to
     glassmorphism once the user leaves the pinned region
   • Active section is highlighted via .active on the matching
     nav link (2px lime bar)
   • Ripple on every .btn and .nav-cta
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Reduced-motion fallback ───────────────────────────── */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  /* ══════════════════════════════════════════════════════════
     1. HERO — Blob-load → pin → scrub → fade-out
     ══════════════════════════════════════════════════════════ */
  const hero       = document.getElementById('hero');
  const heroPin    = hero ? hero.querySelector('.hero-pin')  : null;
  const heroVideo  = document.getElementById('hero-video');
  const heroFade   = document.getElementById('hero-fade');
  const heroFill   = document.getElementById('hero-progress-fill');
  const heroScroll = document.querySelector('.hero-scroll');

  if (hero && heroVideo && heroPin) {

    /* Wrap the hero contents in a pinned inner section.
       We can't move DOM nodes around here (the layout CSS already
       declares .hero-pin as the pinned unit), so we just verify it. */
    if (!heroPin.contains(heroVideo.parentElement)) {
      // video wrap is sibling of pin — still safe to pin the outer #hero
    }

    /* ── Blob-load the video so currentTime seeking always works
           even when the host doesn't serve HTTP byte ranges. */
    let videoReady = false;
    let videoDuration = 10; // safe default until metadata arrives
    const loadVideoAsBlob = (src) => fetch(src)
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        heroVideo.src = url;
        return new Promise((resolve, reject) => {
          heroVideo.addEventListener('loadedmetadata', () => {
            videoDuration = heroVideo.duration || videoDuration;
            videoReady = true;
            /* Keep video paused — scrub is the only driver */
            heroVideo.pause();
            resolve();
          }, { once: true });
          heroVideo.addEventListener('error', reject, { once: true });
        });
      })
      .catch(err => {
        console.warn('[hero] blob load failed, falling back to direct src:', err);
        videoReady = true;
      });

    loadVideoAsBlob(heroVideo.getAttribute('src'));

    /* ── Pin the hero. Scroll position 0..1 maps to currentTime.
           .hero-pin stays fixed for 100vh of scroll travel;
           ScrollTrigger adds its own spacer (pinSpacing default = true). */
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end:   '+=300%',           // Total distance to scrub the video
      pin:   true,               // Pin the entire #hero section
      scrub: 0.3,                // Snappier but smooth scrub
      pinSpacing: true,         // Push other sections down until pin releases
      anticipatePin: 1,
      onUpdate: (self) => {
        if (!videoReady) return;
        const p = self.progress;

        // Mapping scroll progress exactly to video duration
        const t = Math.min(Math.max(p * videoDuration, 0), videoDuration - 0.05);
        if (Math.abs(heroVideo.currentTime - t) > 0.04) {
          heroVideo.currentTime = t;
        }

        // Cinematic Zoom: subtle scale increase as video progresses
        gsap.to(heroVideo, { scale: 1 + (p * 0.1), duration: 0.1 });

        if (heroFill) heroFill.style.width = (p * 100) + '%';

        /* Fade out ONLY at the very end of the video (98%+) */
        if (heroFade) {
          if (p >= 0.98) {
            heroFade.classList.add('is-fading');
            heroFade.style.opacity = (p - 0.98) / 0.02;
          } else {
            heroFade.classList.remove('is-fading');
            heroFade.style.opacity = 0;
          }
        }
        /* Hide scroll-mouse as soon as the user starts scrolling */
        if (heroScroll) {
          heroScroll.style.opacity = p > 0.02 ? '0' : '';
          heroScroll.style.transition = 'opacity 0.4s ease-out';
        }
      }
    });

    /* When the pin releases and the next section enters, hide the fade */
    ScrollTrigger.create({
      trigger: hero,
      start:  'bottom bottom',
      onEnter: () => heroFade && heroFade.classList.remove('is-fading'),
    });
  }

  /* ══════════════════════════════════════════════════════════
     2. NAVBAR — transparent over hero → glassmorphism when scrolled
     ══════════════════════════════════════════════════════════ */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    ScrollTrigger.create({
      /* Toggle once the user scrolls past the visible hero (≈100vh) */
      start: 'top -80',
      end:   'max',
      toggleClass: { targets: navbar, className: 'scrolled' },
    });
  }

  /* ══════════════════════════════════════════════════════════
     3. ACTIVE NAV LINK — IntersectionObserver style with ScrollTrigger
     ══════════════════════════════════════════════════════════ */
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const setActiveNav = (id) => {
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  };
  const navSections = ['hero','about','products','coverage','crops','contact'];
  navSections.forEach(id => {
    ScrollTrigger.create({
      trigger: '#' + id,
      start:   'top 50%',
      end:     'bottom 50%',
      onEnter:      () => setActiveNav(id),
      onEnterBack:  () => setActiveNav(id),
    });
  });

  /* ══════════════════════════════════════════════════════════
     4. RIPPLE EFFECT — on every .btn and .nav-cta
     ══════════════════════════════════════════════════════════ */
  const attachRipple = (el) => {
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.addEventListener('pointerdown', (e) => {
      if (reduceMotion) return;
      const rect   = el.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height) * 1.2;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width  = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  };
  document.querySelectorAll('.btn, .nav-cta').forEach(attachRipple);

  /* ══════════════════════════════════════════════════════════
     5. MAGNETIC HOVER ON BUTTONS — gentle nudge
     ══════════════════════════════════════════════════════════ */
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width  / 2) * 0.12;
      const y = (e.clientY - rect.top  - rect.height / 2) * 0.12;
      gsap.to(btn, { x, y, duration: 0.4, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    });
  });

  /* ══════════════════════════════════════════════════════════
     6. HERO ENTRY TIMELINE — eyebrow → title → sub → buttons → card
     ══════════════════════════════════════════════════════════ */
  if (!reduceMotion) {
    const heroTl = gsap.timeline({ delay: 0.4 });
    heroTl
      .from('.hero-eyebrow', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out' })
      .from('.hero-title',   { opacity: 0, y: 40, duration: 1.0, ease: 'power3.out' }, '-=0.5')
      .from('.hero-sub',      { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .from('.hero-buttons .btn', { opacity: 0, y: 20, stagger: 0.15, duration: 0.7, ease: 'power3.out' }, '-=0.5')
      .from('.hero-card',     { opacity: 0, x: 40, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .from('.hero-scroll',   { opacity: 0, y: -10, duration: 0.6, ease: 'power2.out' }, '-=0.3');
  }

  /* �═════════════════════════════════════════════════════════
     7. SECTION REVEALS — about / products / coverage / crops / contact / footer
     ══════════════════════════════════════════════════════════ */
  gsap.from('.trusted-header', {
    opacity: 0, y: 30, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '#trusted', start: 'top 85%' }
  });

  const aboutLeft  = document.querySelector('.about-left');
  const aboutRight = document.querySelector('.about-right');
  if (aboutLeft)  gsap.from(aboutLeft.children,  { opacity: 0, x: -50, stagger: 0.15, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '#about', start: 'top 72%' } });
  if (aboutRight) gsap.from(aboutRight.children, { opacity: 0, x:  50, stagger: 0.15, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '#about', start: 'top 72%' } });

  /* About stat counters */
  document.querySelectorAll('.about-stat-num[data-count]').forEach(el => {
    const target = parseFloat(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const decimals = el.getAttribute('data-decimals') || 0;
    const counter = { val: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(counter, {
        val: target, duration: 2.2, ease: 'power2.out',
        onUpdate: () => { el.textContent = counter.val.toFixed(decimals) + suffix; }
      })
    });
  });

  gsap.from('.products-header', {
    opacity: 0, y: 40, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#products', start: 'top 75%' }
  });
  /* ── Grid reveals (products / crops) ─────────────────────────────
     1. Each card is hidden ONCE at init — before the first paint — so it is
        already in its resting pose while off-screen. Nothing ever snaps
        back to opacity 0 while the visitor is looking at it (no jump).
     2. The tween always runs TO the visible state (opacity 1, y 0, scale 1),
        so even if the batch fires twice the card always lands fully visible.
     3. Safety net on refresh: any card at/above the viewport that never got
        an onEnter is revealed, so a card can never stay stuck hidden. */
  const revealGrids = [
    { els: '.product-card', from: { opacity: 0, y: 32 },
      to: { duration: 0.75, ease: 'power3.out', stagger: 0.09 } },
    { els: '.crop-item', from: { opacity: 0, y: 22, scale: 0.96 },
      to: { duration: 0.6, ease: 'power3.out', stagger: 0.05 } },
  ];

  if (!reduceMotion) {
    revealGrids.forEach(grid => {
      const els = gsap.utils.toArray(grid.els);
      if (!els.length) return;
      gsap.set(els, grid.from);

      let pending = els.slice();
      const show = (targets) => {
        pending = pending.filter(el => !targets.includes(el));
        gsap.to(targets, { ...grid.to, opacity: 1, y: 0, scale: 1, overwrite: 'auto' });
      };

      ScrollTrigger.batch(els, { start: 'top 88%', onEnter: show });

      ScrollTrigger.addEventListener('refresh', () => {
        const stuck = pending.filter(el => el.getBoundingClientRect().top < window.innerHeight * 0.9);
        if (stuck.length) show(stuck);
      });
    });
  }

  gsap.from('.coverage-left > *', { opacity: 0, x: -50, stagger: 0.12, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '#coverage', start: 'top 72%' } });
  gsap.from('.coverage-right',     { opacity: 0, x:  60, duration: 1.0, ease: 'power3.out',           scrollTrigger: { trigger: '#coverage', start: 'top 72%' } });
  document.querySelectorAll('.bar-fill[data-width]').forEach(bar => {
    ScrollTrigger.create({
      trigger: bar, start: 'top 85%', once: true,
      onEnter: () => { bar.style.width = bar.getAttribute('data-width'); }
    });
  });

  gsap.from('.crops-header', { opacity: 0, y: 40, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '#crops', start: 'top 75%' } });

  gsap.from('.contact-left > *', { opacity: 0, x: -50, stagger: 0.12, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '#contact', start: 'top 72%' } });
  gsap.from('.contact-form',     { opacity: 0, x:  60, duration: 1.0, ease: 'power3.out',            scrollTrigger: { trigger: '#contact', start: 'top 72%' } });
  gsap.from('.footer-top > *',   { opacity: 0, y: 30, stagger: 0.1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '#footer',  start: 'top 85%' } });

  /* ══════════════════════════════════════════════════════════
     8. SMOOTH SCROLL ON NAV CLICK
     ══════════════════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      gsap.to(window, {
        duration: 1.2,
        scrollTo: { y: target, offsetY: 76 },
        ease: 'power4.inOut',
      });
    });
  });

  /* ══════════════════════════════════════════════════════════
     9. MOBILE NAV TOGGLE
     ══════════════════════════════════════════════════════════ */
  const mobileToggle = document.querySelector('.nav-mobile-toggle');
  const navMenu      = document.querySelector('.nav-links');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const open = navMenu.classList.toggle('nav-open');
      mobileToggle.classList.toggle('active', open);
      mobileToggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* ══════════════════════════════════════════════════════════
     10. CUSTOM CURSOR (desktop with fine pointer only)
     ══════════════════════════════════════════════════════════ */
  if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    const cursor    = document.createElement('div');
    const cursorDot = document.createElement('div');
    cursor.id = 'cursor-ring';
    cursorDot.id = 'cursor-dot';
    document.body.appendChild(cursor);
    document.body.appendChild(cursorDot);

    window.addEventListener('mousemove', e => {
      gsap.to(cursorDot, { x: e.clientX, y: e.clientY, duration: 0.1 });
      gsap.to(cursor,    { x: e.clientX, y: e.clientY, duration: 0.45, ease: 'power3.out' });
    });
    document.querySelectorAll('a, button, .product-card, .crop-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        gsap.to(cursor,    { scale: 1.8, opacity: 0.6, duration: 0.3 });
        gsap.to(cursorDot, { scale: 0,   duration: 0.3 });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(cursor,    { scale: 1, opacity: 1, duration: 0.3 });
        gsap.to(cursorDot, { scale: 1, duration: 0.3 });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     11. CONTACT FORM PREMIUM SUBMIT
     ══════════════════════════════════════════════════════════ */
  const contactForm = document.getElementById('contact-form');
  const contactBtn = document.getElementById('contact-submit-btn');
  if (contactForm && contactBtn) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const originalContent = contactBtn.innerHTML;

      // 1. Enter Loading State
      contactBtn.disabled = true;
      contactBtn.innerHTML = 'Enviando... <span class="btn-icon loader"></span>';
      contactBtn.classList.add('btn-loading');

      try {
        // Simulate API call (1.5s delay)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Enter Success State
        contactBtn.innerHTML = '✅ Mensaje enviado';
        contactBtn.classList.remove('btn-loading');
        contactBtn.classList.add('btn-success');
        contactBtn.style.background = 'var(--green-rich)';
        contactBtn.style.borderColor = 'var(--green-rich)';
      } catch (err) {
        contactBtn.innerHTML = '❌ Error al enviar';
      } finally {
        // 3. Reset to Original State after 4s
        setTimeout(() => {
          contactBtn.innerHTML = originalContent;
          contactBtn.style.background = '';
          contactBtn.style.borderColor = '';
          contactBtn.classList.remove('btn-success');
          contactBtn.disabled = false;
        }, 4000);
      }
    });
  }
});
