(function () {
  'use strict';

  /* ==========================================================================
     ConvertKit configuration
     ==========================================================================
     Setup (one-time, ~5 min):
       1. Sign up at https://app.convertkit.com (free plan covers 10k subs).
       2. Grow → Landing Pages & Forms → New Form → create one (any type,
          e.g. "Inline") named something like "Household Ledger Quiz".
          Open it and copy the numeric Form ID shown in its settings URL
          (app.convertkit.com/forms/designers/<FORM_ID>/edit).
       3. Settings → Advanced → API → copy the "API Key" (the public key —
          NOT "API Secret". The public key is safe to ship in client-side
          JS; it's the same one ConvertKit's own embeddable form widgets
          expose in the page source).
       4. Settings → Advanced → Custom Fields → add a field with the key
          "archetype". This lets you segment/trigger automations on which
          of the 4 results (Manager/Ghost/Martyr/Default) each lead got.
       5. Optional but worth it: build a Visual Automation per archetype
          ("when custom field archetype is updated & equals Manager" →
          send a follow-up sequence nudging toward the paid offer).
       6. Paste the Form ID and API Key below. Until you do, the form still
          works end-to-end (validates, unlocks the Ledger) — it just skips
          the network call and logs a console warning instead.
     ========================================================================== */
  var CONVERTKIT_CONFIG = {
    formId: '9889675',
    apiKey: 'TnIsvopsbWfXbjj1Pm2MZQ'
  };

  function isConvertKitConfigured() {
    return CONVERTKIT_CONFIG.formId !== 'YOUR_CONVERTKIT_FORM_ID' &&
      CONVERTKIT_CONFIG.apiKey !== 'YOUR_CONVERTKIT_PUBLIC_API_KEY';
  }

  function subscribeToConvertKit(email, archetypeLabel) {
    if (!isConvertKitConfigured()) {
      console.warn('[Household Ledger] ConvertKit not configured yet — skipping subscribe. See CONVERTKIT_CONFIG at the top of script.js.');
      return;
    }
    fetch('https://api.convertkit.com/v3/forms/' + CONVERTKIT_CONFIG.formId + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: CONVERTKIT_CONFIG.apiKey,
        email: email,
        fields: { archetype: archetypeLabel }
      })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        trackEvent(result.ok ? 'convertkit_subscribed' : 'convertkit_error', { archetype: archetypeLabel, detail: result.data });
      })
      .catch(function (err) {
        trackEvent('convertkit_error', { archetype: archetypeLabel, detail: String(err) });
      });
  }

  /* ==========================================================================
     Lightweight funnel analytics
     V2 note: this pushes to window.dataLayer (GA4/GTM convention) when present
     and always logs to localStorage so drop-off is inspectable without a
     backend. Wire a real analytics provider by initializing gtag/GTM (or
     posting this same event shape to Segment/PostHog) before this script runs.
     ========================================================================== */
  function trackEvent(name, data) {
    var payload = Object.assign({ event: name, ts: Date.now() }, data || {});
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
    } catch (err) { /* analytics is best-effort, never block the UI */ }
    try {
      var log = JSON.parse(localStorage.getItem('hhl_funnel') || '[]');
      log.push(payload);
      localStorage.setItem('hhl_funnel', JSON.stringify(log));
    } catch (err) { /* localStorage unavailable — non-critical */ }
  }

  /* ==========================================================================
     Quiz content — 8 forced-choice scenarios.
     Each option's `arch` always maps to the same archetype so scoring is a
     simple tally; display order is shuffled per question so the pattern
     isn't visually obvious.
     ========================================================================== */
  var QUESTIONS = [
    {
      text: "The pediatrician calls with a reschedule. What actually happens?",
      options: [
        { arch: 'manager', text: "I already knew it might happen and had a backup slot in mind." },
        { arch: 'ghost', text: "I handle it without my partner ever knowing it happened." },
        { arch: 'martyr', text: "I could ask my partner to handle it, but I know I'll just redo it after." },
        { arch: 'default', text: "Whoever's phone rings deals with it — usually mine." }
      ]
    },
    {
      text: "Your kid needs new shoes. Who notices first?",
      options: [
        { arch: 'manager', text: "Me — I've already got a replacement pair bookmarked." },
        { arch: 'ghost', text: "Me — and I just quietly order them, no discussion needed." },
        { arch: 'martyr', text: "Me — I'd rather pick them myself than risk the wrong ones." },
        { arch: 'default', text: "Me, by default — nobody else tracks sizes." }
      ]
    },
    {
      text: "It's your partner's turn to plan the birthday party. What actually happens?",
      options: [
        { arch: 'manager', text: "I send reminders and a checklist so it doesn't slip." },
        { arch: 'ghost', text: "I end up doing it quietly so the date doesn't get missed." },
        { arch: 'martyr', text: "I \"let\" them try, then redo half of it myself." },
        { arch: 'default', text: "It doesn't happen until I step in at the last minute." }
      ]
    },
    {
      text: "Dinner needs to happen tonight. How does that get decided?",
      options: [
        { arch: 'manager', text: "I've already planned the week and assigned who's cooking what." },
        { arch: 'ghost', text: "I just make it happen — no one else clocks the planning involved." },
        { arch: 'martyr', text: "I could ask for help, but it's faster if I just do it myself." },
        { arch: 'default', text: "Whoever gets hungry first ends up figuring it out — usually me." }
      ]
    },
    {
      text: "The school sends home a form that needs signing by Friday.",
      options: [
        { arch: 'manager', text: "I flag it immediately and follow up if it's not done." },
        { arch: 'ghost', text: "I fill it out and turn it in without mentioning it." },
        { arch: 'martyr', text: "I could hand it off, but I don't trust it'll get done right." },
        { arch: 'default', text: "It sits until I notice it buried in a backpack." }
      ]
    },
    {
      text: "A gift needs to be bought for a family birthday or holiday.",
      options: [
        { arch: 'manager', text: "I've got it listed, budgeted, and delegated to someone to order." },
        { arch: 'ghost', text: "I just buy and wrap it — nobody else knows a gift was needed." },
        { arch: 'martyr', text: "I let my partner pick once, didn't love it, now I just handle it." },
        { arch: 'default', text: "It becomes \"our\" gift the moment I remember it's needed." }
      ]
    },
    {
      text: "Kid wakes up at 2am. What happens next?",
      options: [
        { arch: 'manager', text: "We have a rotation and I know whose night it is." },
        { arch: 'ghost', text: "I get up so my partner can keep sleeping — they don't always know." },
        { arch: 'martyr', text: "My partner offers, but I go anyway since I know the routine better." },
        { arch: 'default', text: "Whoever's already half-awake goes — that's usually me." }
      ]
    },
    {
      text: "Packing the daycare or school bag for tomorrow.",
      options: [
        { arch: 'manager', text: "I run through the checklist and confirm everything's in." },
        { arch: 'ghost', text: "I pack it after everyone's asleep; no one sees it happen." },
        { arch: 'martyr', text: "I could ask for help, but I know exactly how it needs to be packed." },
        { arch: 'default', text: "It gets packed whenever someone realizes it hasn't been — usually me." }
      ]
    }
  ];

  /* ==========================================================================
     Archetype content — drives the result reveal, task board (dynamic
     filtering — a v2 item), and the personalized + partner-facing scripts.
     ========================================================================== */
  var ARCHETYPES = {
    manager: {
      name: 'The Manager',
      emoji: '🗂️',
      accent: '#C4562D',
      tagline: 'High ownership · High visibility',
      teaser: "You don't just do the work — you assign it, track it, and follow up when it doesn't happen. Enter your email to see exactly what that's costing you, and the script to fix it.",
      cost: "Since you've been back at work, you've become the household's unpaid project manager — not just doing the work, but assigning it, tracking it, and following up when it doesn't happen. That's a second full-time job stacked on top of your actual one, and it's exactly why you're tired even on days you \"didn't do much.\"",
      tasks: {
        keep: ["Tracking medical & school appointments", "Owning the shared family calendar"],
        delegate: ["Assigning and tracking weekly chores", "Planning meals for the week", "Coordinating gifts for birthdays & holidays"],
        letGo: ["Double-checking delegated tasks got done", "Mentally \"managing\" your partner's to-do list"]
      },
      script: {
        self: "I've been the one planning, assigning, and following up on almost everything at home — and it's exhausting, even on the days you're helping. I don't want to be the household's project manager anymore. Starting this week, I'm handing you full ownership of {{task}} — not just doing it, but noticing it needs to happen and tracking it yourself. I'm not going to remind you or double-check. If it slips, that's a sign we need to adjust, not a reason for me to take it back.",
        partner: "Hey — I want to hand you full ownership of {{task}}, not just the doing but the remembering too. I'm going to stop reminding you or checking in on it, even if that means it happens differently than I'd do it. Didn't want it to feel like it came out of nowhere."
      }
    },
    ghost: {
      name: 'The Ghost',
      emoji: '👻',
      accent: '#5B6E8C',
      tagline: 'High ownership · Low visibility',
      teaser: "You're carrying more than anyone realizes — including your partner. Enter your email to see exactly what that's costing you, and the script to fix it.",
      cost: "Since you've been back at work, you've quietly absorbed everything that used to get split — the appointments, the forms, the restocking — without ever naming it out loud. Your partner has no idea how much is happening, because you've made sure it never becomes a problem for them. That invisibility is exactly what's exhausting you.",
      tasks: {
        keep: ["The one thing only you currently know how to do"],
        delegate: ["Daycare & school forms / permission slips", "Restocking household supplies", "Scheduling kids' appointments"],
        letGo: ["Quietly doing tasks without mentioning them", "Covering your partner's share to avoid a conversation"]
      },
      script: {
        self: "There's a lot happening at home that you probably don't realize I'm handling — including {{task}}. I've been doing it quietly because it felt faster, but it's made my load invisible, and that's a big part of why I'm exhausted. Starting now, I'm going to say out loud when something needs doing instead of just absorbing it — and I need you to take it from there.",
        partner: "I want to tell you about something I've been quietly handling: {{task}}. I haven't mentioned it before, but I'd like it to be your thing going forward — I'll flag it once, and then it's yours."
      }
    },
    martyr: {
      name: 'The Martyr',
      emoji: '🎯',
      accent: '#8A6BAF',
      tagline: "High ownership · Won't release control",
      teaser: "You could hand things off — but something's stopping you. Enter your email to see exactly what that's costing you, and the script to fix it.",
      cost: "Since you've been back at work, you've held onto control even when you didn't have the bandwidth for it — because handing something off feels riskier than just doing it yourself. That instinct made sense when you had more time. Now it's the reason you're carrying a full household on top of a full job.",
      tasks: {
        keep: ["Tasks with real safety or health stakes, for now"],
        delegate: ["Packing the school or daycare bag, no redo-checks", "Bedtime routine on your partner's nights, no check-ins"],
        letGo: ["Redoing tasks after your partner does them", "Perfectionism on tasks that don't actually matter"]
      },
      script: {
        self: "I know I've made it hard to hand things off — I've redone things after you or jumped back in early. That's on me, but it means I'm carrying everything, and it's not sustainable. I'm giving you full ownership of {{task}}. Even if it's not how I'd do it, I'm not going to redo it. I need to actually let go, not just say I will.",
        partner: "I'd like to give you full ownership of {{task}}. I know I haven't made that easy before, but I want to actually let go this time, even if you do it differently than I would."
      }
    },
    default: {
      name: 'The Default',
      emoji: '📥',
      accent: '#3E8E7E',
      tagline: 'Owner of everything unclaimed',
      teaser: "If nobody claims it, it becomes yours. Enter your email to see exactly what that's costing you, and the script to fix it.",
      cost: "Since you've been back at work, anything nobody explicitly claims has quietly become yours — not because you're better at it, but because you're the fallback. Every unassigned task defaults to you by exhaustion, not by choice, and that's the pattern that's wearing you down.",
      tasks: {
        keep: ["Tasks that genuinely need you specifically, right now"],
        delegate: ["Restocking diapers, wipes, and snacks", "Tracking when the recycling and trash go out"],
        letGo: ["Being the automatic fallback for anything unassigned", "Absorbing tasks because asking feels slower"]
      },
      script: {
        self: "I've noticed that anything nobody explicitly owns quietly becomes mine by default. I don't want to keep operating that way. I need us to actually name who owns {{task}} instead of leaving it unassigned — and going forward, if something isn't explicitly someone else's job, I need us to decide together instead of it landing on me automatically.",
        partner: "Can we name an owner for {{task}} instead of leaving it unassigned? I keep ending up with anything nobody claims, and I'd like that to change starting with this one."
      }
    }
  };

  var ARCH_KEYS = ['manager', 'ghost', 'martyr', 'default'];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ==========================================================================
     Quiz engine state
     ========================================================================== */
  var state = {
    index: 0,
    answers: [], // archetype key picked per question, in question order
    resultArch: null
  };

  try {
    var saved = JSON.parse(sessionStorage.getItem('hhl_quiz_state') || 'null');
    if (saved && Array.isArray(saved.answers)) state = saved;
  } catch (err) { /* ignore corrupt/blocked storage */ }

  function persistState() {
    try { sessionStorage.setItem('hhl_quiz_state', JSON.stringify(state)); }
    catch (err) { /* non-critical */ }
  }

  var screenIntro = document.getElementById('screenIntro');
  var screenQuestion = document.getElementById('screenQuestion');
  var screenResult = document.getElementById('screenResult');
  var startQuizBtn = document.getElementById('startQuizBtn');
  var quizOptionsEl = document.getElementById('quizOptions');
  var quizQuestionTextEl = document.getElementById('quizQuestionText');
  var quizCountEl = document.getElementById('quizCount');
  var progressBar = document.getElementById('progressBar');
  var quizBackBtn = document.getElementById('quizBackBtn');

  function showScreen(el) {
    [screenIntro, screenQuestion, screenResult].forEach(function (s) {
      if (s) s.hidden = (s !== el);
    });
  }

  function renderQuestion() {
    var q = QUESTIONS[state.index];
    quizCountEl.textContent = 'Question ' + (state.index + 1) + ' of ' + QUESTIONS.length;
    quizQuestionTextEl.textContent = q.text;
    progressBar.style.width = (((state.index) / QUESTIONS.length) * 100) + '%';
    document.getElementById('quizProgressWrap').setAttribute('aria-valuenow', Math.round((state.index / QUESTIONS.length) * 100));

    quizOptionsEl.innerHTML = '';
    shuffle(q.options).forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt';
      btn.setAttribute('data-arch', opt.arch);
      btn.textContent = opt.text;
      btn.addEventListener('click', function () { selectAnswer(opt.arch); });
      quizOptionsEl.appendChild(btn);
    });

    quizBackBtn.hidden = state.index === 0;
    showScreen(screenQuestion);
  }

  function selectAnswer(arch) {
    state.answers[state.index] = arch;
    trackEvent('question_answered', { question_index: state.index, archetype: arch });
    persistState();

    if (state.index < QUESTIONS.length - 1) {
      state.index += 1;
      persistState();
      renderQuestion();
    } else {
      progressBar.style.width = '100%';
      finishQuiz();
    }
  }

  function tally() {
    var counts = { manager: 0, ghost: 0, martyr: 0, default: 0 };
    state.answers.forEach(function (a) { if (counts[a] !== undefined) counts[a] += 1; });
    var top = ARCH_KEYS.slice().sort(function (a, b) { return counts[b] - counts[a]; })[0];
    return { counts: counts, top: top };
  }

  function finishQuiz() {
    var result = tally();
    state.resultArch = result.top;
    persistState();
    trackEvent('quiz_completed', { archetype: result.top, counts: result.counts });
    renderResult(result.top);
  }

  function renderResult(archKey) {
    var arch = ARCHETYPES[archKey];
    document.getElementById('resultBadge').textContent = arch.emoji;
    document.getElementById('resultTitle').innerHTML = "You're " + arch.name + '.';
    document.getElementById('resultTeaser').textContent = arch.teaser;
    showScreen(screenResult);
    trackEvent('result_viewed', { archetype: archKey });
  }

  if (startQuizBtn) {
    startQuizBtn.addEventListener('click', function () {
      trackEvent('quiz_started', {});
      if (state.resultArch && state.answers.length === QUESTIONS.length) {
        // resuming a completed session
        renderResult(state.resultArch);
      } else {
        state.index = 0;
        persistState();
        renderQuestion();
      }
    });
  }

  if (quizBackBtn) {
    quizBackBtn.addEventListener('click', function () {
      if (state.index > 0) {
        state.index -= 1;
        persistState();
        renderQuestion();
      }
    });
  }

  /* ==========================================================================
     Email gate → unlock Ledger
     ========================================================================== */
  var emailForm = document.getElementById('emailForm');
  var emailInput = document.getElementById('emailInput');
  var emailError = document.getElementById('emailError');
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

      var archetypeLabel = ARCHETYPES[state.resultArch].name.replace('The ', '');
      subscribeToConvertKit(value, archetypeLabel);

      // Local backup log — useful if the ConvertKit call fails (offline,
      // not yet configured, etc.) so no lead is silently lost.
      try {
        var stored = JSON.parse(localStorage.getItem('hhl_leads') || '[]');
        stored.push({ email: value, archetype: state.resultArch, ts: Date.now() });
        localStorage.setItem('hhl_leads', JSON.stringify(stored));
      } catch (err) { /* non-critical */ }

      trackEvent('email_submitted', { archetype: state.resultArch });
      unlockLedger(state.resultArch);
    });

    emailInput.addEventListener('input', function () {
      if (!emailError.hidden) {
        emailError.hidden = true;
        emailInput.removeAttribute('aria-invalid');
      }
    });
  }

  /* ==========================================================================
     Ledger — the personalized deliverable (dynamic task filtering, editable
     Keep/Delegate/Let Go board, script with partner-facing toggle, PDF export)
     ========================================================================== */
  var ledgerSection = document.getElementById('ledger');
  var scriptTextEl = document.getElementById('scriptText');
  var currentTaskForScript = '';
  var activeScriptTab = 'self';

  function buildBoardColumn(containerId, items, column) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';
    items.forEach(function (label) {
      container.appendChild(buildBoardItem(label, column));
    });
  }

  function buildBoardItem(label, column) {
    var row = document.createElement('div');
    row.className = 'board-item';

    var span = document.createElement('span');
    span.textContent = label;
    row.appendChild(span);

    var select = document.createElement('select');
    select.setAttribute('aria-label', 'Move "' + label + '"');
    [['keep', 'Keep'], ['delegate', 'Delegate'], ['letGo', 'Let Go']].forEach(function (pair) {
      var o = document.createElement('option');
      o.value = pair[0];
      o.textContent = pair[1];
      if (pair[0] === column) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', function () {
      row.remove();
      var targetId = { keep: 'colKeep', delegate: 'colDelegate', letGo: 'colLetGo' }[select.value];
      document.getElementById(targetId).appendChild(buildBoardItem(label, select.value));
      trackEvent('task_moved', { task: label, to: select.value });
    });
    row.appendChild(select);
    return row;
  }

  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  function renderScript() {
    var arch = ARCHETYPES[state.resultArch];
    var template = arch.script[activeScriptTab];
    scriptTextEl.textContent = template.replace('{{task}}', lowerFirst(currentTaskForScript));
  }

  function unlockLedger(archKey) {
    var arch = ARCHETYPES[archKey];
    currentTaskForScript = arch.tasks.delegate[0] || arch.tasks.keep[0];

    document.getElementById('ledgerTitle').textContent = "You're " + arch.name;
    document.getElementById('ledgerCost').textContent = arch.cost;

    buildBoardColumn('colKeep', arch.tasks.keep, 'keep');
    buildBoardColumn('colDelegate', arch.tasks.delegate, 'delegate');
    buildBoardColumn('colLetGo', arch.tasks.letGo, 'letGo');

    activeScriptTab = 'self';
    Array.prototype.forEach.call(document.querySelectorAll('.script-tab'), function (t) {
      var isActive = t.getAttribute('data-tab') === 'self';
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    renderScript();

    var upsellLine = document.getElementById('ledgerUpsellLine');
    if (upsellLine) {
      upsellLine.textContent = "You're " + arch.name + " — the Full System gives you all 150 tasks, a 90-day hand-off plan, and a partner-facing version built for this exact conversation.";
    }

    ledgerSection.hidden = false;
    trackEvent('ledger_unlocked', { archetype: archKey });
    ledgerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.script-tab'), function (tab) {
    tab.addEventListener('click', function () {
      activeScriptTab = tab.getAttribute('data-tab');
      Array.prototype.forEach.call(document.querySelectorAll('.script-tab'), function (t) {
        var isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      renderScript();
      trackEvent('script_tab_viewed', { tab: activeScriptTab });
    });
  });

  var copyScriptBtn = document.getElementById('copyScriptBtn');
  if (copyScriptBtn) {
    copyScriptBtn.addEventListener('click', function () {
      var text = scriptTextEl.textContent;
      var done = function () {
        var original = copyScriptBtn.textContent;
        copyScriptBtn.textContent = 'Copied!';
        setTimeout(function () { copyScriptBtn.textContent = original; }, 1800);
        trackEvent('script_copied', { archetype: state.resultArch, tab: activeScriptTab });
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    });
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (err) { /* clipboard unavailable */ }
    document.body.removeChild(ta);
  }

  /* ---------- "Download as PDF" ----------
     V2 note: true server-generated PDFs (Puppeteer/Docs-merge, per build spec
     section 7) need a backend to render and email a file — out of scope for
     a static site. This gives the same end result client-side: a print
     stylesheet formats the Ledger as a clean document, and "Save as PDF" in
     the browser's print dialog produces the file. */
  var downloadPdfBtn = document.getElementById('downloadPdfBtn');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', function () {
      trackEvent('pdf_download_clicked', { archetype: state.resultArch });
      window.print();
    });
  }

  var upsellCta = document.querySelector('.upsell a.btn');
  if (upsellCta) {
    upsellCta.addEventListener('click', function () {
      trackEvent('upsell_cta_clicked', { archetype: state.resultArch });
    });
  }

  /* ==========================================================================
     Resume in-progress/completed sessions on reload
     ========================================================================== */
  if (state.resultArch && state.answers.length === QUESTIONS.length) {
    renderResult(state.resultArch);
  } else if (state.answers.length > 0) {
    renderQuestion();
  }

  /* ==========================================================================
     Sticky mobile CTA: show after hero is scrolled past
     ========================================================================== */
  var stickyCta = document.getElementById('stickyCta');
  var hero = document.querySelector('.hero');
  var quizSection = document.getElementById('quiz');

  if (stickyCta && hero) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.target === hero) {
            stickyCta.classList.toggle('visible', !entry.isIntersecting);
          }
        });
      },
      { threshold: 0 }
    );
    revealObserver.observe(hero);

    if (quizSection) {
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
      hideObserver.observe(quizSection);
    }
  }
})();
