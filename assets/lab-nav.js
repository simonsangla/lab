// lab-nav.js — shared top navigation bar for all lab apps.
//
// Reusable component, same contract as lab-theme.css: apps load it with
// <script src="/assets/lab-nav.js" defer></script> after their inline
// markup. It replaces the in-flow "← lab." text link with a fixed,
// safe-area-aware App Store-style bar (frosted glass, back affordance,
// app title on scroll), so content never collides with the iOS status
// bar / Dynamic Island. If the asset can't load (standalone file://
// opens), the inline link stays — same graceful fallback as the theme.
(function () {
  if (document.querySelector('.lab-nav')) return;

  var meta = document.querySelector('meta[name="app-name"]');
  var name = (meta && meta.content) || document.title.replace(/\s*[—-].*$/, '');

  var nav = document.createElement('nav');
  nav.className = 'lab-nav';
  nav.setAttribute('aria-label', 'lab. navigation');

  var inner = document.createElement('div');
  inner.className = 'lab-nav-inner';

  // inherit the inline fallback link's target so relative hosting works
  var old = document.querySelector('a.back');

  var back = document.createElement('a');
  back.className = 'lab-nav-back';
  back.href = (old && old.getAttribute('href')) || '/';
  back.setAttribute('aria-label', 'Back to lab. — all apps');
  back.innerHTML = '<span class="lab-nav-chevron" aria-hidden="true">&#8249;</span> lab.';

  var title = document.createElement('span');
  title.className = 'lab-nav-title';
  title.textContent = name;

  inner.appendChild(back);
  inner.appendChild(title);
  nav.appendChild(inner);

  document.body.insertBefore(nav, document.body.firstChild);
  document.body.classList.add('has-lab-nav');

  // the old in-flow link is replaced by the bar
  if (old) old.style.display = 'none';

  // iOS large-title behavior: the bar title appears once the page's own
  // heading scrolls out of view.
  var h1 = document.querySelector('h1');
  if (h1 && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('lab-nav-titled', !entries[0].isIntersecting);
    }, { rootMargin: '-56px 0px 0px 0px' }).observe(h1);
  } else {
    nav.classList.add('lab-nav-titled');
  }
})();
