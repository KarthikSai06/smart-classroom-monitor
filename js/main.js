/* ============================================================
   SMART CLASSROOM — Main JS (shared across all pages)
   ============================================================ */

/* ---- Navbar scroll behaviour ---- */
const navbar = document.getElementById('navbar');
if (navbar) {
  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ---- Active nav-link highlighting ---- */
const markActiveNav = () => {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });
};
markActiveNav();

/* ---- Mobile menu ---- */
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobileMenu');
const mobileClose = document.getElementById('mobileClose');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => mobileMenu.classList.add('open'));
  mobileClose?.addEventListener('click', () => mobileMenu.classList.remove('open'));
  mobileMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

/* ---- Hamburger → X animation ---- */
if (hamburger) {
  hamburger.addEventListener('click', () => {
    const lines = hamburger.querySelectorAll('.ham-line');
    lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    lines[1].style.opacity   = '0';
    lines[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  });
  mobileClose?.addEventListener('click', () => {
    const lines = hamburger.querySelectorAll('.ham-line');
    lines[0].style.transform = '';
    lines[1].style.opacity   = '';
    lines[2].style.transform = '';
  });
}

/* ---- Intersection Observer — reveal on scroll ---- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll(
  '.reveal, .reveal-left, .reveal-right, .reveal-scale'
).forEach(el => revealObserver.observe(el));

/* ---- Ripple effect on .btn clicks ---- */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function (e) {
    const r = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.className = 'ripple';
    r.style.cssText = `width:${size}px;height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY - rect.top - size/2}px`;
    this.appendChild(r);
    setTimeout(() => r.remove(), 600);
  });
});

/* ---- Smooth scroll for anchor links ---- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ---- Counter animation ---- */
const animateCounter = (el) => {
  const target = +el.dataset.target;
  const suffix = el.dataset.suffix || '';
  const dur    = 1800;
  const step   = 16;
  const inc    = target / (dur / step);
  let current  = 0;
  const timer  = setInterval(() => {
    current = Math.min(current + inc, target);
    el.textContent = (Number.isInteger(target)
      ? Math.round(current)
      : current.toFixed(1)) + suffix;
    if (current >= target) clearInterval(timer);
  }, step);
};

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-counter]').forEach(el => {
  counterObserver.observe(el);
});

/* ---- Active section highlighting in nav (single-page sections) ---- */
const sections = document.querySelectorAll('section[id]');
if (sections.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        document.querySelectorAll('.nav-link[href*="#"]').forEach(l => {
          l.classList.toggle('active', l.getAttribute('href').includes(id));
        });
      }
    });
  }, { rootMargin: '-40% 0% -40% 0%' });

  sections.forEach(s => sectionObserver.observe(s));
}
