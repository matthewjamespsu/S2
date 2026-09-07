(function () {
  'use strict';

  /* ---------- Sticky mobile CTA: show after hero is scrolled past ---------- */
  var stickyCta = document.getElementById('stickyCta');
  var hero = document.querySelector('.hero');
  var startSection = document.getElementById('start');

  if (stickyCta && hero) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          // Show once hero has scrolled out of view; hide again once the
          // email capture section itself is on screen (CTA already there).
          if (entry.target === hero) {
            if (!entry.isIntersecting) {
              stickyCta.classList.add('visible');
            } else {
              stickyCta.classList.remove('visible');
            }
          }
        });
      },
      { threshold: 0 }
    );
    revealObserver.observe(hero);

    if (startSection) {
      var hideObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              stickyCta.classList.remove('visible');
            } else if (hero.getBoundingClientRect().bottom < 0) {
              stickyCta.classList.add('visible');
            }
          });
        },
        { threshold: 0.3 }
      );
      hideObserver.observe(startSection);
    }
  }

  /* ---------- Mini quiz demo ---------- */
  var demoOptions = document.getElementById('demoOptions');
  var demoResult = document.getElementById('demoResult');
  var demoResultText = document.getElementById('demoResultText');

  var archetypeLines = {
    Manager: "That's a Manager instinct — you're already three steps ahead, which is exactly why everyone still checks with you first.",
    Ghost: "That's a Ghost instinct — you absorbed it so smoothly no one even clocked there was a problem to solve.",
    Martyr: "That's a Martyr instinct — you could hand it off, but you already know you'd end up redoing it.",
    Default: "That's a Default instinct — it landed on you simply because nobody else claimed it first."
  };

  if (demoOptions) {
    demoOptions.addEventListener('click', function (e) {
      var btn = e.target.closest('.demo-opt');
      if (!btn) return;

      Array.prototype.forEach.call(demoOptions.querySelectorAll('.demo-opt'), function (b) {
        b.classList.remove('selected');
        b.disabled = true;
      });
      btn.classList.add('selected');

      var arch = btn.getAttribute('data-arch');
      demoResultText.textContent = archetypeLines[arch] || archetypeLines.Default;
      demoResult.hidden = false;
    });
  }

  /* ---------- Email capture form ---------- */
  var emailForm = document.getElementById('emailForm');
  var emailInput = document.getElementById('emailInput');
  var emailError = document.getElementById('emailError');
  var emailSuccess = document.getElementById('emailSuccess');
  var successEmail = document.getElementById('successEmail');

  // Basic RFC-5322-lite check — good enough for client-side gating.
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailForm) {
    emailForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = emailInput.value.trim();

      if (!EMAIL_RE.test(value)) {
        emailError.hidden = false;
        emailInput.setAttribute('aria-invalid', 'true');
        emailInput.focus();
        return;
      }

      emailError.hidden = true;
      emailInput.removeAttribute('aria-invalid');

      // NOTE: this is a front-end-only capture. Wire this fetch() call to
      // your real list provider (e.g. ConvertKit, Mailchimp, Formspree) or
      // a serverless webhook before launch — see build spec section 7.
      // Example:
      // fetch('https://your-endpoint.example.com/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: value, source: 'household-ledger-landing' })
      // });

      try {
        var stored = JSON.parse(localStorage.getItem('hhl_leads') || '[]');
        stored.push({ email: value, ts: Date.now() });
        localStorage.setItem('hhl_leads', JSON.stringify(stored));
      } catch (err) {
        /* localStorage unavailable — non-critical, continue silently */
      }

      successEmail.textContent = value;
      emailForm.hidden = true;
      emailSuccess.hidden = false;
      emailSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    emailInput.addEventListener('input', function () {
      if (!emailError.hidden) {
        emailError.hidden = true;
        emailInput.removeAttribute('aria-invalid');
      }
    });
  }
})();
