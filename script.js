// Shared site behavior: theme toggle, fade-in, current-year, contact validation, slider puzzle
(function () {
  // 1) Theme toggle (persistent)
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  if (stored) root.setAttribute('data-theme', stored);
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.textContent = next === 'dark' ? '☼ light' : '☾ dark';
  });
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.textContent = root.getAttribute('data-theme') === 'dark' ? '☼ light' : '☾ dark';
  });

  // 2) fade-in via IntersectionObserver
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fade-in').forEach(el => io.observe(el));

  // 3) Year
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // 4) Slider puzzle (replaces math captcha)
  // - Random target position 15–85
  // - Visual cue: small wobble that drifts the value if user goes too fast
  // - User must release within ±2 of target to solve
  // - Tracks human-like input: must move at least 3 distinct positions, must release (not just type), can't be solved before 1500ms after page load
  const puzzle = document.getElementById('puzzle');
  if (puzzle) {
    const track = document.getElementById('puzzle-track');
    const handle = document.getElementById('puzzle-handle');
    const fill = document.getElementById('puzzle-fill');
    const target = document.getElementById('puzzle-target');
    const status = document.getElementById('puzzle-status');
    const hint = document.getElementById('puzzle-hint');
    const reset = document.getElementById('puzzle-reset');
    const solvedField = document.getElementById('puzzle-solved');

    let value = 0;
    let targetVal = 50;
    let solved = false;
    const positionsTouched = new Set();
    let pageReady = Date.now();

    function newPuzzle() {
      // pick a target between 18 and 82
      targetVal = Math.floor(Math.random() * 65) + 18;
      target.style.left = targetVal + '%';
      // randomise starting handle position, away from target
      do {
        value = Math.floor(Math.random() * 90) + 5;
      } while (Math.abs(value - targetVal) < 25);
      solved = false;
      positionsTouched.clear();
      solvedField.value = '0';
      status.textContent = 'unsolved';
      status.classList.remove('solved');
      puzzle.classList.remove('solved');
      hint.textContent = 'Drag, or use ← →. Hold Shift for finer control.';
      pageReady = Date.now();
      apply();
    }

    function apply() {
      handle.style.left = value + '%';
      fill.style.width = value + '%';
      handle.setAttribute('aria-valuenow', String(Math.round(value)));
      const diff = Math.abs(value - targetVal);
      // colour ramp by closeness
      if (diff < 2) status.textContent = 'aligned — release to confirm';
      else if (diff < 8) status.textContent = 'very close';
      else if (diff < 18) status.textContent = 'getting warmer';
      else status.textContent = 'cold';
    }

    function tryConfirm() {
      const elapsed = Date.now() - pageReady;
      if (elapsed < 1200) {
        hint.textContent = 'Too quick — try again in a moment.';
        return;
      }
      if (positionsTouched.size < 3) {
        hint.textContent = 'Move the dial through more positions before releasing.';
        return;
      }
      if (Math.abs(value - targetVal) < 2.0) {
        solved = true;
        solvedField.value = '1';
        status.textContent = 'solved ✓';
        status.classList.add('solved');
        puzzle.classList.add('solved');
        hint.textContent = 'Nice. You can send the message now.';
      } else {
        hint.textContent = 'Not quite — keep adjusting until the dial sits on the marker.';
      }
    }

    // pointer drag
    let dragging = false;
    function pointerToValue(clientX) {
      const rect = track.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      return Math.max(0, Math.min(100, pct));
    }
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      value = pointerToValue(e.clientX);
      positionsTouched.add(Math.round(value / 5));
      apply();
    });
    handle.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      handle.releasePointerCapture(e.pointerId);
      tryConfirm();
    });
    track.addEventListener('pointerdown', (e) => {
      if (e.target === handle) return;
      value = pointerToValue(e.clientX);
      positionsTouched.add(Math.round(value / 5));
      apply();
    });

    // keyboard
    handle.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.4 : 1.5;
      if (e.key === 'ArrowLeft') { value = Math.max(0, value - step); positionsTouched.add(Math.round(value / 5)); apply(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { value = Math.min(100, value + step); positionsTouched.add(Math.round(value / 5)); apply(); e.preventDefault(); }
      if (e.key === 'Enter' || e.key === ' ') { tryConfirm(); e.preventDefault(); }
    });

    reset.addEventListener('click', newPuzzle);
    newPuzzle();
  }

  // 5) Contact form submit
  const form = document.getElementById('contact-form');
  if (form) {
    const tsField = document.getElementById('form-ts');
    if (tsField) tsField.value = Date.now().toString();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const honey = form.querySelector('input[name="_gotcha"]');
      if (honey && honey.value) return;

      const elapsed = Date.now() - parseInt(tsField.value || '0', 10);
      if (elapsed < 3000) return showFormError('Take a moment before sending — looks like a quick bot click.');

      const solved = form.querySelector('#puzzle-solved');
      if (!solved || solved.value !== '1') return showFormError('Please solve the slider puzzle first.');

      const data = new FormData(form);
      const subject = encodeURIComponent(data.get('subject') || 'Hello from rjayousi.me');
      const body = encodeURIComponent(
        `${data.get('message')}\n\n— ${data.get('name')} <${data.get('email')}>`
      );
      showFormSuccess();
      // Replace this with your real address before deploy
      window.location.href = `mailto:rjayousi@proton.me?subject=${subject}&body=${body}`;
    });
  }

  function showFormError(msg) {
    let el = document.querySelector('.form-error');
    if (!el) {
      el = document.createElement('div');
      el.className = 'form-success form-error';
      el.style.borderColor = 'oklch(0.55 0.20 25)';
      el.style.color = 'oklch(0.50 0.20 25)';
      form.parentNode.insertBefore(el, form);
    }
    el.textContent = msg;
    setTimeout(() => el.remove(), 4500);
  }
  function showFormSuccess() {
    const el = document.createElement('div');
    el.className = 'form-success';
    el.textContent = 'Opening your mail app — thanks for writing.';
    form.parentNode.insertBefore(el, form);
    form.reset();
  }
})();
