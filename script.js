    // =========================================================
    // PHASE 1 — INTERACTION CONTROLLERS
    // =========================================================

    // Loading screen auto dismiss after 2 seconds
    window.addEventListener("load", () => {
      const loader = document.getElementById("loaderScreen");
      setTimeout(() => {
        loader.classList.add("is-hidden");
      }, 2000);
    });

    // Scroll depth progress bar
    const progressBar = document.getElementById("scrollProgressBar");
    const updateProgressBar = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    };
    window.addEventListener("scroll", updateProgressBar, { passive: true });
    window.addEventListener("resize", updateProgressBar);
    updateProgressBar();

    // Hero animated sine-wave background (Canvas API)
    (() => {
      const canvas = document.getElementById("heroCanvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let animationId;
      let t = 0;

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      // Build the wave path and return it (shared by fill + stroke passes)
      const buildWavePath = (width, height, amplitude, frequency, speed, offsetY, phase) => {
        const path = new Path2D();
        path.moveTo(0, height);
        for (let x = 0; x <= width; x += 4) {
          const y = offsetY + Math.sin(x * frequency + t * speed + phase) * amplitude;
          path.lineTo(x, y);
        }
        path.lineTo(width, height);
        path.closePath();
        return path;
      };

      const drawWave = (fillColor, amplitude, frequency, speed, offsetY, phase,
                        glowColor = null, glowBlur = 0) => {
        const { width, height } = canvas.getBoundingClientRect();
        const path = buildWavePath(width, height, amplitude, frequency, speed, offsetY, phase);

        // Fill pass
        ctx.shadowBlur = 0;
        ctx.fillStyle = fillColor;
        ctx.fill(path);

        // Optional glow stroke pass
        if (glowColor) {
          ctx.shadowBlur    = glowBlur;
          ctx.shadowColor   = glowColor;
          ctx.strokeStyle   = glowColor;
          ctx.lineWidth     = 1.5;
          ctx.stroke(path);
          ctx.shadowBlur    = 0;  // reset immediately
          ctx.shadowColor   = "transparent";
        }
      };

      const render = () => {
        const { width, height } = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, width, height);

        // ── Subtle radial gradient background ──────────────────
        const grad = ctx.createRadialGradient(
          width * 0.35, height * 0.4, 0,
          width * 0.35, height * 0.4, width * 0.75
        );
        grad.addColorStop(0,   "rgba(200, 215, 255, 0.25)");
        grad.addColorStop(0.6, "rgba(210, 220, 255, 0.10)");
        grad.addColorStop(1,   "rgba(240, 244, 255, 0.00)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // ── Wave layers (back → front) ──────────────────────────
        // Layer 1 — deep blue, slow, large amplitude (no glow — back layer)
        drawWave(
          "rgba(26, 35, 126, 0.15)",  // fillColor
          55, 0.011, 0.018,            // amplitude, frequency, speed
          height * 0.70, 2.8           // offsetY, phase
        );

        // Layer 2 — orange mid-wave with glow
        drawWave(
          "rgba(255, 111, 0, 0.18)",  // fillColor
          42, 0.019, 0.032,
          height * 0.76, 1.4,
          "rgba(255, 111, 0, 0.55)",  // glowColor
          14                           // glowBlur
        );

        // Layer 3 — blue front wave with glow
        drawWave(
          "rgba(26, 35, 126, 0.26)",  // fillColor
          65, 0.014, 0.022,
          height * 0.82, 0,
          "rgba(26, 35, 126, 0.60)",  // glowColor
          14                           // glowBlur
        );

        // Layer 4 — light accent, fast, shallow (topmost depth layer)
        drawWave(
          "rgba(200, 215, 255, 0.20)", // fillColor
          35, 0.022, 0.038,
          height * 0.88, 3.7
        );

        t += 1;
        animationId = requestAnimationFrame(render);
      };

      resize();
      render();
      window.addEventListener("resize", resize);

      window.addEventListener("beforeunload", () => {
        if (animationId) cancelAnimationFrame(animationId);
      });
    })();

    // =========================================================
    // PHASE X — PWA (Service Worker)
    // =========================================================
    (() => {
      if (!('serviceWorker' in navigator)) return;

      const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const isSecure = location.protocol === 'https:' || isLocalhost;
      if (!isSecure) return;

      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./service-worker.js')
          .then((registration) => {
            // Proactively check for updates on each page load.
            registration.update().catch(() => {});

            // If there's already a waiting worker, activate it.
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            // When a new SW is found, activate it as soon as it's installed.
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            });

            // Reload once the new SW takes control so fresh CSS/JS apply.
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              window.location.reload();
            });
          })
          .catch(() => {
            // Silent fail: PWA is optional.
          });
      });
    })();

    // Navbar active-state indicator
    // Multi-page mode: active class is hardcoded per page in HTML.
    // Single-page fallback: IntersectionObserver for anchor-based nav.
    (() => {
      const navAnchors = [...document.querySelectorAll(".nav-links a")];
      // If any link already has is-active (set in HTML), skip the observer.
      const hasHardcodedActive = navAnchors.some(a => a.classList.contains("is-active"));
      if (hasHardcodedActive) return;

      const sections = [...document.querySelectorAll("[data-section]")];
      const navById = new Map(
        navAnchors.map((anchor) => [anchor.getAttribute("href")?.replace("#", ""), anchor])
      );

      const setActiveLink = (id) => {
        navAnchors.forEach((a) => a.classList.remove("is-active"));
        const active = navById.get(id);
        if (active) active.classList.add("is-active");
      };

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

          if (visible.length > 0) {
            setActiveLink(visible[0].target.id);
          }
        },
        {
          root: null,
          threshold: [0.2, 0.45, 0.7],
          rootMargin: "-15% 0px -60% 0px"
        }
      );

      sections.forEach((section) => observer.observe(section));
    })();

    // Close mobile menu when link is clicked
    (() => {
      const menuToggle = document.getElementById("menuToggle");
      const links = document.querySelectorAll(".nav-links a");
      links.forEach((link) => {
        link.addEventListener("click", () => {
          if (menuToggle) menuToggle.checked = false;
        });
      });
    })();

    // =========================================================
    // PHASE 2 — MATERI MODULE CONTROLLERS
    // =========================================================

    // ── Tab Controller ────────────────────────────────────────
    (() => {
      const tabBtns = document.querySelectorAll(".tab-btn");
      const tabPanels = document.querySelectorAll(".tab-panel");

      if (tabBtns.length === 0 || tabPanels.length === 0) return;

      const activateTab = (targetId) => {
        tabBtns.forEach((btn) => {
          const isTarget = btn.dataset.tab === targetId;
          btn.classList.toggle("is-active", isTarget);
          btn.setAttribute("aria-selected", isTarget ? "true" : "false");
        });

        tabPanels.forEach((panel) => {
          const isTarget = panel.id === targetId;
          if (isTarget) {
            // Force a reflow to restart the transition
            panel.style.display = "block";
            // Small delay so the display:block registers before opacity kicks in
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                panel.classList.add("is-active");
              });
            });
          } else {
            panel.classList.remove("is-active");
            // Hide after transition completes
            panel.addEventListener("transitionend", function onEnd() {
              if (!panel.classList.contains("is-active")) panel.style.display = "";
              panel.removeEventListener("transitionend", onEnd);
            });
          }
        });
      };

      tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => activateTab(btn.dataset.tab));
        btn.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activateTab(btn.dataset.tab);
          }
        });
      });

      // Deep-link support: materi.html?tab=tab-k3#materi
      const allowed = new Set([...tabPanels].map(p => p.id));
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('tab');
      const fromHash = (window.location.hash || '').replace('#', '');
      const fromSession = (() => {
        try { return sessionStorage.getItem('openTab') || ''; } catch (_) { return ''; }
      })();

      const desired = fromQuery || fromHash || fromSession;
      if (desired && allowed.has(desired)) {
        activateTab(desired);
      } else {
        // Ensure first active tab is properly applied on load
        const activeBtn = [...tabBtns].find(b => b.classList.contains('is-active'));
        if (activeBtn?.dataset?.tab) activateTab(activeBtn.dataset.tab);
      }

      if (fromSession) {
        try { sessionStorage.removeItem('openTab'); } catch (_) {}
      }
    })();

    // ── Oscilloscope Canvas — AC Sine Wave ────────────────────
    (() => {
      const canvas = document.getElementById("canvasAC");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const Vm = 60;      // amplitude px
      const f = 50;       // frequency Hz (visual)
      let phase = 0;

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(canvas.offsetWidth * dpr);
        canvas.height = Math.floor(canvas.offsetHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const drawGrid = (w, h) => {
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        const cols = 10, rows = 6;
        for (let i = 0; i <= cols; i++) {
          ctx.beginPath();
          ctx.moveTo((w / cols) * i, 0);
          ctx.lineTo((w / cols) * i, h);
          ctx.stroke();
        }
        for (let j = 0; j <= rows; j++) {
          ctx.beginPath();
          ctx.moveTo(0, (h / rows) * j);
          ctx.lineTo(w, (h / rows) * j);
          ctx.stroke();
        }
        // Center axis
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w * 0.05, 0);
        ctx.lineTo(w * 0.05, h);
        ctx.stroke();
      };

      const drawLabels = (w, h) => {
        ctx.fillStyle = "rgba(200,180,120,0.85)";
        ctx.font = "bold 9px monospace";
        // Amplitude label
        ctx.fillText(`Vm=${Vm}px`, 8, h / 2 - Vm - 4);
        ctx.fillText(`-Vm`, 8, h / 2 + Vm + 12);
        // Period marker
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = "9px monospace";
        ctx.fillText("T", w * 0.21, h - 4);
        // Axis labels
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "8px monospace";
        ctx.fillText("Volt", 8, 12);
        ctx.fillText("Waktu ▶", w - 55, h - 4);
        // Legend
        ctx.fillStyle = "#ff6f00";
        ctx.font = "bold 9px monospace";
        ctx.fillText("V(t)=Vm·sin(2πft)", w / 2 - 60, 12);
      };

      const render = () => {
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        ctx.clearRect(0, 0, w, h);

        drawGrid(w, h);

        // Draw sine wave
        ctx.beginPath();
        ctx.strokeStyle = "#ff6f00";
        ctx.lineWidth = 2.5;
        const cy = h / 2;
        for (let x = 0; x <= w; x++) {
          const t = (x / w) * 4 * Math.PI;
          const y = cy - Vm * Math.sin(t + phase);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        drawLabels(w, h);
        phase += 0.045;
        requestAnimationFrame(render);
      };

      resize();
      render();
      window.addEventListener("resize", resize);
    })();

    // ── Oscilloscope Canvas — DC Line with Noise ──────────────
    (() => {
      const canvas = document.getElementById("canvasDC");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(canvas.offsetWidth * dpr);
        canvas.height = Math.floor(canvas.offsetHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const drawGrid = (w, h) => {
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        const cols = 10, rows = 6;
        for (let i = 0; i <= cols; i++) {
          ctx.beginPath();
          ctx.moveTo((w / cols) * i, 0);
          ctx.lineTo((w / cols) * i, h);
          ctx.stroke();
        }
        for (let j = 0; j <= rows; j++) {
          ctx.beginPath();
          ctx.moveTo(0, (h / rows) * j);
          ctx.lineTo(w, (h / rows) * j);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w * 0.05, 0);
        ctx.lineTo(w * 0.05, h);
        ctx.stroke();
      };

      const drawLabels = (w, h) => {
        ctx.fillStyle = "rgba(200,180,120,0.85)";
        ctx.font = "bold 9px monospace";
        ctx.fillText("V= Konstan", 10, h / 2 - 30);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "8px monospace";
        ctx.fillText("Volt", 8, 12);
        ctx.fillText("Waktu ▶", w - 55, h - 4);
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 9px monospace";
        ctx.fillText("V(t)=Konstan (DC)", w / 2 - 65, 12);
      };

      const render = () => {
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        ctx.clearRect(0, 0, w, h);

        drawGrid(w, h);

        // DC line with ±2px random noise
        ctx.beginPath();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5;
        const cy = h / 2 - 24; // slightly above center
        for (let x = 0; x <= w; x += 3) {
          const noise = (Math.random() - 0.5) * 4;
          const y = cy + noise;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        drawLabels(w, h);
        requestAnimationFrame(render);
      };

      resize();
      render();
      window.addEventListener("resize", resize);
    })();

    // ── Scale Factor Calculator ───────────────────────────────
    (() => {
      const batasEl = document.getElementById("batasUkur");
      const skalaEl = document.getElementById("skalapenuh");
      const sliderEl = document.getElementById("penunjukan");
      const sliderDisplay = document.getElementById("sliderDisplay");
      const resultFormula = document.getElementById("resultFormula");
      const resultMain = document.getElementById("resultMain");
      const resultCard = document.getElementById("calcResult");

      if (!batasEl) return;

      const update = () => {
        const batas = parseFloat(batasEl.value);
        const skala = parseFloat(skalaEl.value);
        const max = skala;

        // Sync slider max to selected skala penuh
        sliderEl.max = max;
        if (parseFloat(sliderEl.value) > max) sliderEl.value = max;

        const penunjukan = parseFloat(sliderEl.value);
        sliderDisplay.textContent = penunjukan;

        const faktorSkala = batas / skala;
        const hasil = faktorSkala * penunjukan;
        const isOverRange = penunjukan > max;

        resultFormula.textContent =
          `Hasil = (${batas} ÷ ${skala}) × ${penunjukan} = ${faktorSkala.toFixed(2)} × ${penunjukan}`;
        resultMain.textContent = `${hasil.toFixed(2)} Volt`;

        resultCard.classList.toggle("is-error", isOverRange);
        resultMain.style.color = isOverRange ? "var(--danger)" : "var(--success)";
      };

      batasEl.addEventListener("input", update);
      skalaEl.addEventListener("input", update);
      sliderEl.addEventListener("input", update);
      update(); // initialise on load
    })();

    // =========================================================
    // PHASE 3 — PROSEDUR & TABEL PENGAMATAN CONTROLLERS
    // =========================================================

    // ── Stepper Engine ────────────────────────────────────────
    const stepperState = { ac: 0, dc: 0 };
    const STEPPER_TOTAL = 6;

    const stepperIcons = ['<i class="fas fa-wrench"></i>','<i class="fas fa-cog"></i>','<i class="fas fa-plug"></i>','<i class="fas fa-chalkboard-teacher"></i>','<i class="fas fa-chart-bar"></i>','<i class="fas fa-check-circle"></i>'];

    const buildDots = (id, key) => {
      const container = document.getElementById(id);
      if (!container) return;
      container.innerHTML = '';
      for (let i = 0; i < STEPPER_TOTAL; i++) {
        const dot = document.createElement('button');
        dot.className = 'stepper-dot' + (i === 0 ? ' is-active' : '');
        dot.textContent = i + 1;
        dot.setAttribute('aria-label', `Langkah ${i + 1}`);
        dot.addEventListener('click', () => goToStep(key, i));
        container.appendChild(dot);
      }
    };

    const refreshStepper = (key) => {
      const idx = stepperState[key];
      const prefix = key === 'ac' ? 'ac' : 'dc';
      const attrKey = `data-stepper-${key}`;

      // Update panes
      document.querySelectorAll(`[${attrKey}]`).forEach(pane => {
        const paneIdx = parseInt(pane.getAttribute(attrKey));
        pane.classList.toggle('is-active', paneIdx === idx);
      });

      // Update dots
      const dotsContainer = document.getElementById(`${prefix}Dots`);
      if (dotsContainer) {
        [...dotsContainer.children].forEach((dot, i) => {
          dot.classList.remove('is-active', 'is-done');
          if (i < idx)  dot.classList.add('is-done');
          if (i === idx) dot.classList.add('is-active');
        });
      }

      // Update progress
      const label = document.getElementById(`${prefix}StepLabel`);
      const fill  = document.getElementById(`${prefix}ProgressFill`);
      if (label) label.textContent = `Langkah ${idx + 1} dari ${STEPPER_TOTAL}`;
      if (fill)  fill.style.width = `${((idx + 1) / STEPPER_TOTAL) * 100}%`;

      // Update buttons
      const prevBtn = document.getElementById(`${prefix}Prev`);
      const nextBtn = document.getElementById(`${prefix}Next`);
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) {
        nextBtn.textContent = idx === STEPPER_TOTAL - 1 ? 'Selesai' : 'Selanjutnya →';
        nextBtn.disabled = false;
      }
    };

    const goToStep = (key, idx) => {
      stepperState[key] = Math.max(0, Math.min(STEPPER_TOTAL - 1, idx));
      refreshStepper(key);
    };

    // Global function called by inline onclick
    window.stepperNav = (key, dir) => {
      const delta = dir === 'next' ? 1 : -1;
      goToStep(key, stepperState[key] + delta);
    };

    // Initialise both steppers
    buildDots('acDots', 'ac');
    buildDots('dcDots', 'dc');
    refreshStepper('ac');
    refreshStepper('dc');

    // ── Table 1 — AC Observation Table ────────────────────────
    (() => {
      const AC_ROWS = [
        { terminal: 'Jalur 1 — CT–6',    batas: 10  },
        { terminal: 'Jalur 1 — CT–12',   batas: 50  },
        { terminal: 'Jalur 1 — 6–12',    batas: 50  },
        { terminal: 'Jalur 2 — CT–6',    batas: 10  },
        { terminal: 'Jalur 2 — CT–12',   batas: 50  },
        { terminal: 'Jalur 2 — 6–12',    batas: 50  },
        { terminal: 'Jalur 1-2 — 6–6',   batas: 50  },
        { terminal: 'Jalur 1-2 — 6–12',  batas: 50  },
        { terminal: 'Jalur 1-2 — 12–12', batas: 50  },
        { terminal: 'Jalur 2-1 — 6–6',   batas: 50  },
        { terminal: 'Jalur 2-1 — 6–12',  batas: 50  },
        { terminal: 'Jalur 2-1 — 12–12', batas: 50  },
      ];

      // Determine skala penuh from batas
      const skalaFromBatas = (b) => b <= 10 ? 10 : 50;

      const tbody = document.getElementById('tbodyAC');
      if (!tbody) return;

      AC_ROWS.forEach((row, i) => {
        const skala = skalaFromBatas(row.batas);
        const fs = (row.batas / skala).toFixed(2);

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="cell-no">${i + 1}</td>
          <td class="cell-fixed">${row.terminal}</td>
          <td class="cell-fixed">${row.batas}</td>
          <td>
            <input type="number" class="obs-input" min="0" max="${skala}"
              step="0.5" placeholder="0.00"
              data-batas="${row.batas}" data-skala="${skala}"
              aria-label="Penunjukan jarum baris ${i + 1}" />
          </td>
          <td class="cell-auto" data-fs-cell>${fs}</td>
          <td class="cell-auto" data-hasil-cell>—</td>
        `;
        tbody.appendChild(tr);
      });

      tbody.addEventListener('input', (e) => {
        if (!e.target.classList.contains('obs-input')) return;
        const input  = e.target;
        const batas  = parseFloat(input.dataset.batas);
        const skala  = parseFloat(input.dataset.skala);
        const val    = parseFloat(input.value);
        const tr     = input.closest('tr');
        const fsCell = tr.querySelector('[data-fs-cell]');
        const hCell  = tr.querySelector('[data-hasil-cell]');

        if (!isNaN(val) && val >= 0) {
          const fs    = batas / skala;
          const hasil = fs * val;
          fsCell.textContent = fs.toFixed(2);
          hCell.textContent  = hasil.toFixed(3) + ' V';
          input.classList.remove('is-error');
          input.classList.add(val > batas ? 'is-error' : 'is-valid');
        } else {
          fsCell.textContent = (batas / skala).toFixed(2);
          hCell.textContent  = '—';
          input.classList.remove('is-valid', 'is-error');
        }
      });
    })();

    // ── Table 2 — DC Observation Table ────────────────────────
    (() => {
      const BATAS_DC   = 50;
      const SKALA_DC   = 50;
      const DC_ROWS    = 10;
      const tbody      = document.getElementById('tbodyDC');
      if (!tbody) return;

      for (let i = 0; i < DC_ROWS; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="cell-no">${i + 1}</td>
          <td>
            <input type="number" class="obs-input" min="0" max="${BATAS_DC}"
              step="0.5" placeholder="0.00"
              data-role="psu"
              aria-label="Output PSU baris ${i + 1}" />
          </td>
          <td class="cell-fixed">${BATAS_DC}</td>
          <td>
            <input type="number" class="obs-input" min="0" max="${SKALA_DC}"
              step="0.5" placeholder="0.00"
              data-role="jarum"
              data-batas="${BATAS_DC}" data-skala="${SKALA_DC}"
              aria-label="Penunjukan jarum baris ${i + 1}" />
          </td>
          <td class="cell-auto" data-fs-cell>${(BATAS_DC / SKALA_DC).toFixed(2)}</td>
          <td class="cell-auto" data-hasil-cell>—</td>
        `;
        tbody.appendChild(tr);
      }

      tbody.addEventListener('input', (e) => {
        const input = e.target;
        if (!input.classList.contains('obs-input')) return;
        const tr     = input.closest('tr');
        const jarum  = tr.querySelector('[data-role="jarum"]');
        const hCell  = tr.querySelector('[data-hasil-cell]');
        const jarumVal = parseFloat(jarum?.value);

        if (!isNaN(jarumVal) && jarumVal >= 0) {
          const fs    = BATAS_DC / SKALA_DC;
          const hasil = fs * jarumVal;
          hCell.textContent = hasil.toFixed(3) + ' V';
          jarum.classList.remove('is-error');
          jarum.classList.add(jarumVal > BATAS_DC ? 'is-error' : 'is-valid');
        } else {
          hCell.textContent = '—';
          jarum?.classList.remove('is-valid', 'is-error');
        }

        // Validate PSU input
        if (input.dataset.role === 'psu') {
          const v = parseFloat(input.value);
          input.classList.remove('is-valid','is-error');
          if (!isNaN(v) && v >= 0) input.classList.add(v > BATAS_DC ? 'is-error' : 'is-valid');
        }
      });
    })();

    // ── Reset Table Utility ────────────────────────────────────
    window.resetTable = (tableId) => {
      const ok = window.confirm(
        'Apakah Anda yakin ingin mereset tabel? Semua data yang diisi akan dihapus.'
      );
      if (!ok) return;

      const table = document.getElementById(tableId);
      if (!table) return;

      table.querySelectorAll('.obs-input').forEach(input => {
        input.value = '';
        input.classList.remove('is-valid', 'is-error');
      });

      table.querySelectorAll('[data-hasil-cell]').forEach(cell => {
        cell.textContent = '—';
      });

      // Restore default Faktor Skala for AC table
      if (tableId === 'tableAC') {
        const AC_BATAS = [10,50,50,10,50,50,50,50,50,50,50,50];
        const skalaFromBatas = (b) => b <= 10 ? 10 : 50;
        table.querySelectorAll('[data-fs-cell]').forEach((cell, i) => {
          const b = AC_BATAS[i];
          cell.textContent = (b / skalaFromBatas(b)).toFixed(2);
        });
      }
    };

    // =========================================================
    // PHASE 4 — SIMULASI INTERAKTIF CONTROLLERS
    // =========================================================

    // ── Sim A — Meter Canvas Game ───────────────────────────────
    (() => {
      const canvas  = document.getElementById('meterCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      /* ---- state ---- */
      const state = {
        batas      : 10,
        skalaMax   : 10,
        targetPos  : 0.5,   // 0–1 normalised position
        currentPos : 0.5,   // animated
        score      : 0,
        round      : 0,
        correct    : 0,
        active     : false,
        answerLocked: false,
        animId     : null
      };

      /* ---- canvas geometry ---- */
      const CW = 420, CH = 260;
      const cx = CW / 2;
      const cy = 210;          // pivot y
      const R  = 155;          // arc radius
      const ARC_START = Math.PI;       // 180° (left)
      const ARC_END   = 2 * Math.PI;   // 360° (right) = 0°

      const posToAngle = (pos) => ARC_START + pos * Math.PI;

      /* ---- draw helpers ---- */
      const drawFace = () => {
        // Background
        const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, R + 30);
        grad.addColorStop(0, '#fafafa');
        grad.addColorStop(1, '#e8eaf0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CW, CH);

        // Outer housing
        ctx.strokeStyle = '#2c2f3f';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, CW - 8, CH - 8);

        // Mirror strip (anti-parallax arc)
        ctx.beginPath();
        ctx.arc(cx, cy, R - 18, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(180,180,210,0.55)';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Scale arc (back)
        ctx.beginPath();
        ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Scale arc (Ohm top, tiny)
        ctx.beginPath();
        ctx.arc(cx, cy, R - 10, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(100,60,180,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Scale arc (mA bottom)
        ctx.beginPath();
        ctx.arc(cx, cy, R - 22, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(16,185,129,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Tick marks + labels
        const DIVS = 10;
        for (let i = 0; i <= DIVS; i++) {
          const frac    = i / DIVS;
          const angle   = posToAngle(frac);
          const isMajor = i % 2 === 0;
          const inner   = R - (isMajor ? 16 : 9);
          const outer   = R;

          ctx.beginPath();
          ctx.moveTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
          ctx.lineTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
          ctx.strokeStyle = '#333';
          ctx.lineWidth = isMajor ? 2 : 1;
          ctx.stroke();

          // Labels for major ticks
          if (isMajor) {
            const labelR = R - 28;
            const lx = cx + labelR * Math.cos(angle);
            const ly = cy + labelR * Math.sin(angle);
            ctx.save();
            ctx.translate(lx, ly);
            ctx.fillStyle = '#222';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String((frac * state.skalaMax).toFixed(frac === 1 ? 0 : 1)), 0, 0);
            ctx.restore();
          }
        }
        // Minor ticks (/5 subdivisions)
        for (let i = 0; i < 50; i++) {
          if (i % 5 === 0) continue; // already drawn
          const frac  = i / 50;
          const angle = posToAngle(frac);
          ctx.beginPath();
          ctx.moveTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
          ctx.lineTo(cx + (R - 6) * Math.cos(angle), cy + (R - 6) * Math.sin(angle));
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // SANWA brand
        ctx.fillStyle = '#1a237e';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SANWA', cx, cy - 80);

        // Scale type labels
        ctx.font = '8px sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText('ACV / DCV', cx, cy - 65);

        // Batas ukur display
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#ff6f00';
        ctx.fillText(`Batas Ukur: ${state.batas} V`, cx, cy - 50);
      };

      const drawNeedle = (pos) => {
        const angle   = posToAngle(pos);
        const needleR = R - 10;
        const nx      = cx + needleR * Math.cos(angle);
        const ny      = cy + needleR * Math.sin(angle);

        // Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur  = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Needle line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // Pivot circle
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#c0392b';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
      };

      const render = () => {
        ctx.clearRect(0, 0, CW, CH);
        drawFace();
        drawNeedle(state.currentPos);
      };

      /* ---- smooth needle animation ---- */
      const animateNeedle = () => {
        const diff = state.targetPos - state.currentPos;
        if (Math.abs(diff) < 0.0008) {
          state.currentPos = state.targetPos;
          render();
          return;
        }
        state.currentPos += diff * 0.12;
        render();
        state.animId = requestAnimationFrame(animateNeedle);
      };

      const setNeedle = (pos) => {
        state.targetPos = pos;
        if (state.animId) cancelAnimationFrame(state.animId);
        animateNeedle();
      };

      /* ---- AudioContext beeps ---- */
      const playBeep = (freq, dur, type = 'sine') => {
        try {
          const ac  = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.15, ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
          osc.start(ac.currentTime);
          osc.stop(ac.currentTime + dur);
        } catch (_) {}
      };

      /* ---- UI helpers ---- */
      const setFeedback = (type, text) => {
        const card = document.getElementById('gameFeedback');
        const icon = document.getElementById('gameFeedbackIcon');
        const msg  = document.getElementById('gameFeedbackText');
        if (!card) return;
        card.className = `feedback-card ${type}`;
        icon.innerHTML = type === 'correct' ? '<i class="fas fa-check-circle"></i>' : type === 'wrong' ? '<i class="fas fa-times-circle"></i>' : '<i class="fas fa-chart-bar"></i>';
        msg.textContent = text;
      };

      const updateScoreboard = () => {
        const scoreEl    = document.getElementById('gameScore');
        const roundEl    = document.getElementById('gameRound');
        const accuracyEl = document.getElementById('gameAccuracy');
        if (scoreEl) scoreEl.textContent = state.score;
        if (roundEl) roundEl.textContent = `${state.round}/10`;
        if (accuracyEl) {
          const pct = state.round > 0 ? Math.round((state.correct / state.round) * 100) : 0;
          accuracyEl.textContent = `${pct}%`;
        }
      };

      const showResultModal = () => {
        const pct = state.round > 0 ? Math.round((state.correct / state.round) * 100) : 0;
        let emoji, title, sub;
        if (pct >= 90)      { emoji = '<i class="fas fa-trophy"></i>'; title = 'Sangat Terampil'; sub = 'Excellent! Kamu sangat mahir membaca skala.'; }
        else if (pct >= 70) { emoji = '<i class="fas fa-star"></i>'; title = 'Cukup Terampil'; sub = 'Good Job! Terus tingkatkan latihan.'; }
        else                { emoji = '<i class="fas fa-book"></i>'; title = 'Perlu Lebih Banyak Latihan'; sub = 'Jangan menyerah, ulangi latihan lagi!'; }

        const overlay = document.getElementById('resultModalOverlay');
        if (overlay) {
          document.getElementById('modalEmoji').innerHTML    = emoji;
          document.getElementById('modalTitle').textContent   = title;
          document.getElementById('modalSub').textContent     = sub;
          document.getElementById('modalAccuracy').textContent = `Akurasi: ${pct}% (${state.correct}/${state.round} benar)`;
          overlay.classList.add('is-visible');
        }
      };

      /* ---- Game functions (exposed globally) ---- */
      window.simANewQuestion = () => {
        if (state.round >= 10) { showResultModal(); return; }
        state.round++;
        state.active       = true;
        state.answerLocked = false;
        const pos = 0.1 + Math.random() * 0.8;
        state.targetPos    = pos;
        state.correctAnswer = pos * state.skalaMax;
        setNeedle(pos);

        const inp = document.getElementById('gameInput');
        if (inp) { inp.value = ''; inp.focus(); }
        setFeedback('neutral', `Soal ${state.round}/10 — Berapa nilai yang ditunjuk jarum? (Batas ukur ${state.batas} V)`);
        updateScoreboard();
      };

      window.simACheckAnswer = () => {
        if (!state.active || state.answerLocked) return;
        const inp = document.getElementById('gameInput');
        if (!inp || inp.value === '') return;
        const userVal   = parseFloat(inp.value);
        const correct   = state.correctAnswer;
        const tolerance = state.batas * 0.02;
        const isCorrect = Math.abs(userVal - correct) <= tolerance;

        state.answerLocked = true;
        if (isCorrect) {
          state.score   += 10;
          state.correct += 1;
          setFeedback('correct', `Benar! Nilai yang tepat: ${correct.toFixed(2)} V`);
          playBeep(880, 0.1);
        } else {
          setFeedback('wrong', `Salah. Nilai yang benar: ${correct.toFixed(2)} V (Toleransi ±${tolerance.toFixed(2)} V)`);
          playBeep(220, 0.2);
        }
        updateScoreboard();
        if (state.round >= 10) {
          setTimeout(showResultModal, 1200);
        }
      };

      window.simAReset = () => {
        Object.assign(state, {
          score: 0, round: 0, correct: 0,
          active: false, answerLocked: false, targetPos: 0.5
        });
        setNeedle(0.5);
        updateScoreboard();
        setFeedback('neutral', 'Klik "Soal Baru" untuk memulai latihan membaca jarum multimeter.');
        const inp = document.getElementById('gameInput');
        if (inp) inp.value = '';
        const overlay = document.getElementById('resultModalOverlay');
        if (overlay) overlay.classList.remove('is-visible');
        document.getElementById('gameInstruction').textContent =
          'Klik “Soal Baru” untuk memulai latihan membaca jarum multimeter.';
      };

      /* ---- Batas ukur switcher ---- */
      document.querySelectorAll('.batas-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.batas-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.batas    = parseInt(btn.dataset.batas);
          state.skalaMax = state.batas;
          window.simAReset();
          render();
        });
      });

      /* ---- Result modal close ("Main Lagi") ---- */
      const mainLagiBtn = document.getElementById('btnMainLagi');
      if (mainLagiBtn) mainLagiBtn.addEventListener('click', () => window.simAReset());

      /* ---- initial render ---- */
      render();
      updateScoreboard();
    })();

    // ── Sim B — CRO Oscilloscope Simulator ─────────────────────
    (() => {
      const canvas = document.getElementById('croCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const state = {
        running  : true,
        coupling : 'AC',
        vpos     : 0,       // divisions offset
        phase    : 0,
        animId   : null
      };

      const CW = 500, CH = 300;
      const COLS = 10, ROWS = 8;
      const cellW = CW / COLS;
      const cellH = CH / ROWS;

      const getParams = () => ({
        freq  : parseFloat(document.getElementById('croFreq')?.value  || 3),
        amp   : parseFloat(document.getElementById('croAmp')?.value   || 2),
        vdiv  : parseFloat(document.getElementById('croVdiv')?.value  || 2),
        tdiv  : parseFloat(document.getElementById('croTdiv')?.value  || 5),
      });

      /* ---- Draw CRO Screen ---- */
      const drawGrid = () => {
        // Screen background
        ctx.fillStyle = '#0a0f1e';
        ctx.fillRect(0, 0, CW, CH);

        // Minor grid
        ctx.strokeStyle = 'rgba(0,220,100,0.12)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= COLS; i++) {
          ctx.beginPath(); ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, CH); ctx.stroke();
        }
        for (let j = 0; j <= ROWS; j++) {
          ctx.beginPath(); ctx.moveTo(0, j * cellH); ctx.lineTo(CW, j * cellH); ctx.stroke();
        }

        // Center axis (brighter)
        ctx.strokeStyle = 'rgba(0,220,100,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(CW/2, 0); ctx.lineTo(CW/2, CH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, CH/2); ctx.lineTo(CW, CH/2); ctx.stroke();

        // Center tick marks on axes
        ctx.strokeStyle = 'rgba(0,220,100,0.5)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i <= COLS*5; i++) {
          const x = i * (cellW / 5);
          const tickH = (i % 5 === 0) ? 8 : 4;
          ctx.beginPath(); ctx.moveTo(x, CH/2 - tickH/2); ctx.lineTo(x, CH/2 + tickH/2); ctx.stroke();
        }
        for (let j = 0; j <= ROWS*5; j++) {
          const y = j * (cellH / 5);
          const tickW = (j % 5 === 0) ? 8 : 4;
          ctx.beginPath(); ctx.moveTo(CW/2 - tickW/2, y); ctx.lineTo(CW/2 + tickW/2, y); ctx.stroke();
        }
      };

      const drawWave = () => {
        const { freq, amp, vdiv } = getParams();
        const cy = CH / 2;
        // amp in divisions → pixels
        const ampPx = amp * cellH;
        // DC offset: +2 div up if DC coupling
        const dcOffset = state.coupling === 'DC' ? 2 * cellH : 0;
        const vposPx   = state.vpos * cellH;

        // Glow pass
        ctx.save();
        ctx.shadowColor = 'rgba(57,255,122,0.6)';
        ctx.shadowBlur  = 8;
        ctx.strokeStyle = 'rgba(57,255,122,0.25)';
        ctx.lineWidth   = 6;
        ctx.beginPath();
        for (let x = 0; x <= CW; x++) {
          const t = (x / CW) * freq * 2 * Math.PI + state.phase;
          const y = cy - ampPx * Math.sin(t) - dcOffset - vposPx;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        // Sharp pass
        ctx.save();
        ctx.shadowColor = 'rgba(57,255,122,0.7)';
        ctx.shadowBlur  = 4;
        ctx.strokeStyle = '#39ff7a';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        for (let x = 0; x <= CW; x++) {
          const t = (x / CW) * freq * 2 * Math.PI + state.phase;
          const y = cy - ampPx * Math.sin(t) - dcOffset - vposPx;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      };

      /* ---- Readout update ---- */
      const updateReadout = () => {
        const { freq, amp, vdiv, tdiv } = getParams();
        const vpp  = amp * 2 * vdiv;
        const vrms = vpp * 0.7071;
        // Screen shows `freq` cycles across 10 div
        const T    = (10 / freq) * tdiv;   // ms
        const f    = 1000 / T;             // Hz

        const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
        set('rdVpp',  `${vpp.toFixed(2)} V`);
        set('rdVrms', `${vrms.toFixed(2)} V`);
        set('rdT',    `${T.toFixed(1)} ms`);
        set('rdF',    `${f.toFixed(1)} Hz`);

        // Sync labels
        const fv = document.getElementById('croFreqVal'); if(fv) fv.textContent = freq;
        const av = document.getElementById('croAmpVal');  if(av) av.textContent = amp;
      };

      const renderCRO = () => {
        drawGrid();
        drawWave();
        updateReadout();
        if (state.running) {
          state.phase += 0.05;
          state.animId = requestAnimationFrame(renderCRO);
        }
      };

      /* ---- Exposed control functions ---- */
      window.setCoupling = (mode) => {
        state.coupling = mode;
        document.getElementById('coupAC')?.classList.toggle('active', mode === 'AC');
        document.getElementById('coupDC')?.classList.toggle('active', mode === 'DC');
      };

      window.croBtnToggleRun = () => {
        state.running = !state.running;
        const btn = document.getElementById('btnCroRunFreeze');
        if (btn) {
          btn.textContent = state.running ? '▶ Run' : '⏸ Freeze';
          btn.classList.toggle('running', state.running);
        }
        if (state.running) renderCRO();
      };

      window.croVposAdj = (delta) => {
        state.vpos = Math.max(-3, Math.min(3, state.vpos + delta));
        if (!state.running) renderCRO();
      };

      /* ---- Live control listeners ---- */
      ['croFreq','croAmp','croVdiv','croTdiv'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
          if (!state.running) renderCRO();
          else updateReadout();
        });
      });

      /* ---- start ---- */
      renderCRO();
    })();

    // =========================================================
    // PHASE 5 — QUIZ ENGINE & GLOBAL POLISH
    // =========================================================

    const QUIZ_QUESTION_COUNT = 25;
    const QUIZ_MAX_SCORE = 100;
    const QUIZ_TIME_SECONDS = 25 * 60;

    // ── Question Bank ──────────────────────────────────────────
    const QUESTION_BANK = [
      {
        q: "Tegangan AC berbeda dari DC karena...",
        options: [
          "Nilai tegangannya selalu lebih besar",
          "Bentuk gelombangnya sinusoidal dan bolak-balik",
          "Hanya bisa digunakan pada perangkat digital",
          "Tidak memiliki nilai frekuensi"
        ],
        answer: 1,
        explanation: "Tegangan AC (Alternating Current) memiliki bentuk gelombang sinusoidal yang berubah arah secara periodik, sedangkan DC (Direct Current) memiliki polaritas tetap."
      },
      {
        q: "Posisi selektor multimeter yang benar untuk mengukur tegangan AC 6V dari trafo adalah...",
        options: [
          "DCV dengan batas ukur 10V",
          "ACV dengan batas ukur 10V",
          "ACV dengan batas ukur 50V",
          "DCmA dengan batas ukur 5mA"
        ],
        answer: 1,
        explanation: "Untuk mengukur tegangan AC, selektor harus pada posisi ACV. Batas ukur dipilih 10V karena lebih besar dari 6V namun paling mendekati agar pembacaan akurat."
      },
      {
        q: "Jika batas ukur 50V, skala penuh 50, dan jarum menunjuk angka 30, maka hasil ukur adalah...",
        options: ["15 Volt", "25 Volt", "30 Volt", "60 Volt"],
        answer: 2,
        explanation: "Faktor Skala = Batas Ukur ÷ Skala Penuh = 50 ÷ 50 = 1. Hasil Ukur = Faktor Skala × Penunjukan = 1 × 30 = 30 Volt."
      },
      {
        q: "Voltmeter dihubungkan secara ___ pada rangkaian yang diukur.",
        options: ["Seri", "Paralel", "Seri-Paralel", "Bebas / sembarang"],
        answer: 1,
        explanation: "Voltmeter selalu dihubungkan secara paralel (sejajar) dengan beban atau sumber yang diukur tegangannya, agar tidak mengubah arus rangkaian."
      },
      {
        q: "Nilai Vrms jika Vm = 141.4 Volt adalah...",
        options: ["141.4 Volt", "200 Volt", "100 Volt", "70.7 Volt"],
        answer: 2,
        explanation: "Vrms = 0.707 × Vm = 0.707 × 141.4 ≈ 100 Volt. Vrms adalah nilai efektif yang terbaca pada voltmeter AC."
      },
      {
        q: "APD yang wajib digunakan saat praktikum pengukuran listrik adalah...",
        options: [
          "Hanya helm dan sepatu",
          "Jas lab, sarung tangan isolasi, dan kacamata pelindung",
          "Hanya jas laboratorium",
          "Tidak perlu APD untuk tegangan rendah"
        ],
        answer: 1,
        explanation: "APD lengkap di laboratorium listrik minimal terdiri dari jas laboratorium, sarung tangan isolasi, dan kacamata pelindung untuk keselamatan kerja."
      },
      {
        q: "Yang akan terjadi jika batas ukur multimeter lebih kecil dari tegangan yang diukur adalah...",
        options: [
          "Hasil ukur menjadi lebih akurat",
          "Tidak terjadi apa-apa",
          "Jarum melampaui batas skala dan berpotensi merusak alat",
          "Multimeter akan otomatis menyesuaikan"
        ],
        answer: 2,
        explanation: "Jika batas ukur terlalu kecil, jarum akan melampaui skala maksimum (over-range) yang dapat merusak mekanisme jarum dan komponen internal multimeter."
      },
      {
        q: "Center Tap (CT) pada transformator berfungsi sebagai...",
        options: [
          "Terminal output tegangan tertinggi",
          "Terminal input tegangan primer",
          "Titik tengah / referensi tegangan sekunder",
          "Titik pembumian (grounding) wajib"
        ],
        answer: 2,
        explanation: "CT (Center Tap) adalah titik tengah pada kumparan sekunder trafo yang berfungsi sebagai referensi nol, sehingga tersedia dua tegangan sekunder yang simetris."
      },
      {
        q: "Langkah pertama yang harus dilakukan setelah selesai melakukan pengukuran adalah...",
        options: [
          "Langsung mencabut kabel dari stop kontak",
          "Matikan sumber tegangan / saklar OFF terlebih dahulu",
          "Biarkan rangkaian tetap terhubung",
          "Pindahkan multimeter ke tempat lain"
        ],
        answer: 1,
        explanation: "Prosedur keselamatan mengharuskan saklar sumber dimatikan terlebih dahulu sebelum melepas rangkaian untuk menghindari bahaya sengatan listrik."
      },
      {
        q: "Frekuensi listrik PLN yang digunakan di Indonesia adalah...",
        options: ["25 Hz", "60 Hz", "100 Hz", "50 Hz"],
        answer: 3,
        explanation: "Jaringan listrik PLN Indonesia menggunakan frekuensi standar 50 Hz, sesuai standar IEC yang berlaku di Asia dan Eropa."
      },
      {
        q: "Rumus tegangan sesaat AC yang benar adalah...",
        options: [
          "V(t) = Vm × cos(ωt)",
          "V(t) = Vm ÷ sin(ωt)",
          "V(t) = Vm × sin(ωt)",
          "V(t) = Vrms × sin(ωt)"
        ],
        answer: 2,
        explanation: "Tegangan sesaat AC dinyatakan dengan V(t) = Vm × sin(ωt), di mana Vm adalah tegangan maksimum dan ω = 2πf adalah frekuensi sudut."
      },
      {
        q: "Untuk mengukur tegangan DC sebesar 8V, batas ukur DCV yang paling tepat adalah...",
        options: ["2.5V", "50V", "10V", "250V"],
        answer: 2,
        explanation: "Batas ukur harus lebih besar dari tegangan yang diukur (8V) dan dipilih yang paling mendekati agar defleksi jarum optimal. Batas ukur 10V adalah yang paling tepat."
      },
      {
        q: "Perbedaan utama antara multimeter analog dan multimeter digital adalah...",
        options: [
          "Analog lebih mahal dari digital",
          "Analog menggunakan jarum penunjuk; digital menampilkan angka LCD",
          "Digital tidak bisa mengukur tegangan AC",
          "Analog memiliki akurasi yang lebih tinggi"
        ],
        answer: 1,
        explanation: "Multimeter analog menggunakan defleksi jarum pada skala cetak, sedangkan digital menampilkan pembacaan secara langsung dalam bentuk angka pada layar LCD."
      },
      {
        q: "Kalibrasi ohmmeter (pengukur hambatan) dilakukan dengan cara...",
        options: [
          "Menghubungkan ke sumber tegangan referensi",
          "Mempertemukan kedua probe dan mengatur jarum ke angka 0Ω",
          "Mengukur resistor 1kΩ terlebih dahulu",
          "Tidak perlu kalibrasi, sudah terkalibrasi dari pabrik"
        ],
        answer: 1,
        explanation: "Sebelum mengukur hambatan, kedua probe dihubungkan (short-circuit) kemudian tombol ADJ diputar hingga jarum tepat menunjuk angka 0 pada skala Ω."
      },
      {
        q: "Sebelum menghubungkan rangkaian ke sumber tegangan, langkah wajib yang harus dilakukan adalah...",
        options: [
          "Langsung hidupkan sumber agar hemat waktu",
          "Pastikan semua kabel sudah terhubung",
          "Konsultasikan rangkaian ke dosen/teknisi pembimbing",
          "Dokumentasikan rangkaian dengan foto"
        ],
        answer: 2,
        explanation: "Sesuai prosedur K3 laboratorium, setiap rangkaian yang akan dihubungkan ke sumber tegangan wajib diperiksa dan disetujui oleh dosen atau teknisi pembimbing."
      },

      {
        q: "Jika sebuah gelombang AC memiliki Vpp = 20 V, maka nilai puncaknya (Vm) adalah...",
        options: ["20 V", "10 V", "14,14 V", "7,07 V"],
        answer: 1,
        explanation: "Vpp (peak-to-peak) = 2 × Vm, sehingga Vm = Vpp/2 = 20/2 = 10 V."
      },
      {
        q: "Jika periode gelombang AC adalah 20 ms, frekuensinya adalah...",
        options: ["20 Hz", "50 Hz", "60 Hz", "100 Hz"],
        answer: 1,
        explanation: "f = 1/T. Dengan T = 20 ms = 0,02 s, maka f = 1/0,02 = 50 Hz."
      },
      {
        q: "Jika frekuensi f = 50 Hz, maka frekuensi sudut ω adalah...",
        options: ["50 rad/s", "100 rad/s", "314 rad/s", "628 rad/s"],
        answer: 2,
        explanation: "ω = 2πf = 2π(50) ≈ 314 rad/s."
      },
      {
        q: "Mengapa voltmeter ideal memiliki hambatan internal yang sangat besar?",
        options: [
          "Agar arus yang lewat voltmeter besar",
          "Agar tidak membebani rangkaian (loading effect kecil)",
          "Agar bisa dipasang seri",
          "Agar selalu membaca nol"
        ],
        answer: 1,
        explanation: "Voltmeter dipasang paralel. Jika hambatannya besar, arus yang diambil kecil sehingga tidak mengganggu kondisi rangkaian yang diukur."
      },
      {
        q: "Alat ukur yang dipasang SERI pada rangkaian untuk mengukur arus adalah...",
        options: ["Voltmeter", "Ammeter", "Ohmmeter", "Wattmeter"],
        answer: 1,
        explanation: "Ammeter (amperemeter) dipasang seri agar seluruh arus rangkaian melewati alat ukur."
      },
      {
        q: "Saat mengukur tegangan DC pada PSU, sambungan probe yang benar adalah...",
        options: [
          "Probe merah ke negatif, hitam ke positif",
          "Probe merah ke positif (+), hitam ke negatif (−)",
          "Probe merah ke ground, hitam ke AC",
          "Tidak berpengaruh, boleh dibalik"
        ],
        answer: 1,
        explanation: "Untuk pengukuran DC, probe merah biasanya ke titik berpolaritas positif dan probe hitam ke negatif."
      },
      {
        q: "Pada trafo 6V CT (6-CT-6), tegangan antara ujung ke ujung sekunder adalah...",
        options: ["6 V", "12 V", "3 V", "220 V"],
        answer: 1,
        explanation: "Trafo 6-CT-6 berarti dari CT ke masing-masing ujung 6 V, sehingga ujung-ke-ujung adalah 12 V AC."
      },
      {
        q: "Saat belum tahu besar tegangan yang akan diukur dengan multimeter analog, langkah aman yang benar adalah...",
        options: [
          "Langsung pilih batas ukur terkecil",
          "Mulai dari batas ukur terbesar, lalu turunkan",
          "Mulai dari mode ohm",
          "Tidak perlu atur batas ukur"
        ],
        answer: 1,
        explanation: "Mulai dari range terbesar mencegah over-range (jarum mentok/merusak), lalu turunkan agar pembacaan lebih akurat."
      },
      {
        q: "Apa risiko jika polaritas probe dibalik pada multimeter analog saat mengukur DC?",
        options: [
          "Jarum tetap bergerak ke kanan",
          "Jarum cenderung bergerak ke kiri (negatif) dan berpotensi merusak mekanik",
          "Pembacaan jadi lebih akurat",
          "Tidak ada efek sama sekali"
        ],
        answer: 1,
        explanation: "Pada analog, pembalikan polaritas membuat defleksi ke arah negatif (kiri). Jika dipaksa, mekanik jarum dapat terganggu."
      },
      {
        q: "Dalam praktik, mengapa pembacaan multimeter analog bisa berbeda antar orang?",
        options: [
          "Karena skala selalu berubah",
          "Karena error paralaks (sudut pandang membaca skala)",
          "Karena voltmeter harus seri",
          "Karena frekuensi tidak stabil"
        ],
        answer: 1,
        explanation: "Jika mata tidak sejajar dengan jarum/skala, terjadi parallax error yang membuat angka terbaca bergeser."
      },
      {
        q: "Saat mengukur hambatan (Ω) komponen pada rangkaian, kondisi yang benar adalah...",
        options: [
          "Rangkaian harus dalam keadaan ON",
          "Sumber tegangan harus dimatikan (OFF) dan komponen sebaiknya dilepas dari rangkaian",
          "Probe dipasang paralel pada sumber AC",
          "Tidak perlu mengatur nol ohm"
        ],
        answer: 1,
        explanation: "Ohmmeter memiliki sumber internal. Jika rangkaian masih bertegangan, hasil salah dan bisa merusak alat."
      },
      {
        q: "Jika Vrms = 12 V (gelombang sinus), maka Vm mendekati...",
        options: ["8,5 V", "12 V", "16,97 V", "24 V"],
        answer: 2,
        explanation: "Untuk sinus: Vm = √2 × Vrms ≈ 1,414 × 12 = 16,97 V."
      },
      {
        q: "Pada osiloskop, jika VOLTS/DIV = 2 V dan tinggi gelombang dari puncak ke lembah adalah 5 div, maka Vpp adalah...",
        options: ["2 V", "5 V", "10 V", "20 V"],
        answer: 2,
        explanation: "Vpp = (jumlah div) × (V/div) = 5 × 2 = 10 V."
      },
      {
        q: "Pada osiloskop, jika TIME/DIV = 5 ms dan satu periode gelombang menempati 4 div, maka periode T adalah...",
        options: ["1 ms", "10 ms", "20 ms", "50 ms"],
        answer: 2,
        explanation: "T = (jumlah div) × (time/div) = 4 × 5 ms = 20 ms."
      },
      {
        q: "Jika osiloskop memakai probe 10× tetapi pembacaan belum dikompensasi, tegangan yang tampil di layar akan...",
        options: [
          "10× lebih besar",
          "10× lebih kecil dari tegangan sebenarnya",
          "Tetap sama",
          "Menjadi nol"
        ],
        answer: 1,
        explanation: "Probe 10× mereduksi tegangan masuk menjadi 1/10. Jika skala belum diset 10×, pembacaan terlihat 10× lebih kecil."
      },
      {
        q: "Klip ground (massa) pada probe osiloskop sebaiknya dihubungkan ke...",
        options: [
          "Titik yang aman sebagai referensi ground rangkaian",
          "Ujung positif PSU",
          "Terminal fasa PLN",
          "Terminal output tertinggi"
        ],
        answer: 0,
        explanation: "Ground clip osiloskop biasanya terhubung ke ground pelindung. Pasang di titik referensi ground rangkaian untuk mencegah short/kerusakan."
      },
      {
        q: "Jika batas ukur 10 V, skala penuh 50, dan jarum menunjuk 35, maka hasil ukur adalah...",
        options: ["3,5 V", "7 V", "35 V", "17,5 V"],
        answer: 1,
        explanation: "Faktor skala = 10/50 = 0,2. Hasil = 0,2 × 35 = 7 V."
      },
      {
        q: "Jika multimeter disetel ke ACV namun yang diukur adalah DC murni, pembacaan yang paling mungkin adalah...",
        options: ["Mendekati nol atau tidak stabil", "Selalu tepat", "Selalu 2× lebih besar", "Selalu negatif"],
        answer: 0,
        explanation: "Mode AC umumnya mengukur komponen AC (nilai efektif). Pada DC murni, pembacaan bisa mendekati nol atau tidak sesuai tergantung alat."
      },
      {
        q: "Tujuan utama penggunaan rheostat pada percobaan DC adalah...",
        options: [
          "Mengubah frekuensi sumber",
          "Mengubah beban (hambatan) sehingga arus/tegangan rangkaian berubah",
          "Mengubah jenis arus menjadi AC",
          "Mengkalibrasi voltmeter"
        ],
        answer: 1,
        explanation: "Rheostat adalah resistor variabel yang dipakai sebagai beban untuk mengatur besar arus/tegangan pada titik pengukuran."
      },
      {
        q: "Salah satu aturan keselamatan saat bekerja dengan rangkaian bertegangan adalah...",
        options: [
          "Pegang kedua probe dengan dua tangan sekaligus",
          "Gunakan satu tangan (one-hand rule) bila memungkinkan",
          "Basahi tangan agar probe mudah menempel",
          "Bekerja di lantai yang basah"
        ],
        answer: 1,
        explanation: "One-hand rule mengurangi kemungkinan arus melewati dada/jantung jika terjadi kontak tidak sengaja."
      },
      {
        q: "Mengapa kita dianjurkan memastikan tangan/kondisi kerja kering saat praktikum listrik?",
        options: [
          "Agar jarum multimeter bergerak cepat",
          "Karena air menurunkan resistansi kulit sehingga risiko sengatan meningkat",
          "Agar tegangan menjadi stabil",
          "Tidak ada hubungannya"
        ],
        answer: 1,
        explanation: "Kulit basah memiliki resistansi lebih rendah sehingga arus yang dapat mengalir saat tersentuh tegangan menjadi lebih besar (lebih berbahaya)."
      },
      {
        q: "Fungsi sekering (fuse) pada alat ukur atau rangkaian adalah...",
        options: [
          "Menaikkan tegangan",
          "Memutus rangkaian saat arus berlebih untuk proteksi",
          "Menambah frekuensi",
          "Menghaluskan gelombang"
        ],
        answer: 1,
        explanation: "Fuse melindungi alat/rangkaian dengan cara putus ketika arus melebihi rating, sehingga mencegah kerusakan lebih parah."
      },
      {
        q: "Rumus dasar yang menghubungkan tegangan, arus, dan hambatan (Hukum Ohm) adalah...",
        options: ["P = VI", "V = IR", "I = PR", "V = I/R"],
        answer: 1,
        explanation: "Hukum Ohm: V = I × R. Dari sini bisa diturunkan I = V/R dan R = V/I."
      },
      {
        q: "Daya listrik pada beban dapat dihitung dengan rumus...",
        options: ["P = V + I", "P = V/I", "P = VI", "P = V − I"],
        answer: 2,
        explanation: "Daya: P = V × I. Untuk resistor juga bisa: P = I²R atau P = V²/R."
      },
      {
        q: "Perintah 'reset tabel' pada tabel pengamatan berfungsi untuk...",
        options: [
          "Menghapus semua data isian agar bisa diisi ulang",
          "Mengubah warna tabel",
          "Menyimpan data ke PDF otomatis",
          "Mengirim hasil ke WhatsApp"
        ],
        answer: 0,
        explanation: "Reset tabel mengosongkan data yang sudah diinput sehingga praktikan bisa mengulang pengisian dari awal."
      },
      {
        q: "Jika pada pengukuran DC, jarum multimeter analog tidak bergerak sama sekali, kemungkinan pertama yang perlu dicek adalah...",
        options: [
          "Frekuensi sumber",
          "Posisi selektor (apakah DCV) dan batas ukur",
          "Warna kabel listrik PLN",
          "Skala penuh selalu 250"
        ],
        answer: 1,
        explanation: "Jika selektor salah (misalnya ACV atau range terlalu besar/kecil), pembacaan bisa tidak sesuai. Mulai cek mode dan range terlebih dahulu."
      },
      {
        q: "Mengapa probe voltmeter tidak boleh dipasang seri pada rangkaian?",
        options: [
          "Karena voltmeter memiliki hambatan besar sehingga menghambat arus",
          "Karena voltmeter menaikkan frekuensi",
          "Karena voltmeter hanya untuk arus",
          "Karena akan membuat tegangan selalu nol"
        ],
        answer: 0,
        explanation: "Voltmeter memiliki hambatan internal besar. Jika dipasang seri, arus menjadi sangat kecil dan rangkaian tidak bekerja normal."
      },
      {
        q: "Pada pengukuran AC dari trafo, satuan yang umum terbaca pada multimeter AC adalah...",
        options: ["Vpp", "Vm", "Vrms", "Vdc"],
        answer: 2,
        explanation: "Multimeter AC umumnya menampilkan nilai efektif (Vrms) untuk gelombang sinus, karena setara efek pemanasan/daya."
      },
      {
        q: "Manakah tindakan yang paling benar jika menemukan kabel probe retak/terkelupas saat praktikum?",
        options: [
          "Tetap gunakan karena tegangan rendah",
          "Bungkus seadanya lalu lanjut",
          "Laporkan dan ganti kabel/probe sebelum digunakan",
          "Celupkan ke air agar tidak panas"
        ],
        answer: 2,
        explanation: "Isolasi rusak meningkatkan risiko short/sengatan. Prosedur K3: hentikan pemakaian dan ganti alat yang rusak."
      },
      {
        q: "Jika hasil ukur AC tidak stabil pada multimeter analog, salah satu penyebab yang mungkin adalah...",
        options: [
          "Kontak probe kurang baik/longgar",
          "Tegangan DC selalu stabil",
          "Skala penuh tidak ada",
          "Voltmeter harus dipasang seri"
        ],
        answer: 0,
        explanation: "Kontak yang tidak baik atau koneksi longgar dapat membuat jarum bergetar dan hasil sulit dibaca. Periksa sambungan/probe."
      }
    ];

    // ── Quiz State ─────────────────────────────────────────────
    const QuizState = {
      bank      : QUESTION_BANK,
      questions : [],
      current   : 0,
      score     : 0,
      answers   : [],
      timer     : QUIZ_TIME_SECONDS,
      intervalId: null,
      isActive  : false,
      userName  : '',
      lastFinishWasUserGesture: false,
      waAutoOpenedOnce: false,
      pointsPerCorrect: Math.round(QUIZ_MAX_SCORE / QUIZ_QUESTION_COUNT)
    };

    const QUIZ_USER_NAME_KEY = 'quizUserName';

    const quizGetWaTarget = () => {
      const section = document.getElementById('kuis');
      const raw = section?.dataset?.waTarget || '';
      // Accept formats: "62812..." or "+62812..." and strip non-digits
      return String(raw).replace(/\D/g, '');
    };

    const quizGetUserName = () => {
      const input = document.getElementById('quizUserName');
      const fromInput = input?.value?.trim();
      const fromStore = localStorage.getItem(QUIZ_USER_NAME_KEY)?.trim();
      return fromInput || fromStore || '';
    };

    const quizSetUserName = (name) => {
      QuizState.userName = name;
      try { localStorage.setItem(QUIZ_USER_NAME_KEY, name); } catch (_) {}
    };

    const quizHydrateNameField = () => {
      const input = document.getElementById('quizUserName');
      if (!input) return;
      const stored = localStorage.getItem(QUIZ_USER_NAME_KEY);
      if (stored && !input.value) input.value = stored;
    };

    const quizBuildResultPayload = () => {
      const correct  = QuizState.answers.filter(a => a.correct).length;
      const total    = QuizState.questions.length;
      const wrong    = total - correct;
      const accuracy = Math.round((correct / total) * 100);
      const score    = QuizState.score;

      let grade;
      if (score >= 90)      grade = 'A';
      else if (score >= 75) grade = 'B';
      else if (score >= 60) grade = 'C';
      else                   grade = 'D';

      const userName = QuizState.userName || quizGetUserName();

      return { userName, correct, wrong, total, accuracy, score, grade };
    };

    const quizBuildResultText = () => {
      const { userName, score, grade, correct, total, accuracy } = quizBuildResultPayload();
      const when = new Date().toLocaleString('id-ID');
      const who = userName ? `Nama: ${userName}\n` : '';
      return (
        `Hasil Kuis Job 3 Pengukuran Tegangan AC & DC\n` +
        `${who}` +
        `Skor: ${score}/100 (Grade ${grade})\n` +
        `Benar: ${correct}/${total} — Akurasi: ${accuracy}%\n` +
        `Waktu: ${when}\n` +
        `FT-UNP 2026`
      );
    };

    const quizOpenWhatsApp = () => {
      const text = quizBuildResultText();
      const phone = quizGetWaTarget();
      const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
      const url = `${base}?text=${encodeURIComponent(text)}`;
      // Best effort: new tab/window. (WhatsApp still requires the user to tap Send.)
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    const quizEnsureWhatsAppButton = () => {
      // Find the results action row (works with both old/new HTML ordering)
      const actions = document.querySelector('#screenResult .result-actions');
      if (!actions) return;

      // Already exists?
      const existing = actions.querySelector('[data-quiz-wa-btn="1"], [onclick="quizSendWhatsApp()"]');
      if (existing) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-primary';
      btn.setAttribute('data-quiz-wa-btn', '1');
      btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Kirim ke WhatsApp';
      btn.addEventListener('click', () => window.quizSendWhatsApp());

      // Insert after "Ulangi Kuis" if possible, else append
      const resetBtn = actions.querySelector('[onclick="quizReset()"]');
      if (resetBtn && resetBtn.nextSibling) actions.insertBefore(btn, resetBtn.nextSibling);
      else actions.appendChild(btn);
    };

    window.quizSendWhatsApp = () => {
      quizOpenWhatsApp();
    };

    // ── Helpers ───────────────────────────────────────────────
    const shuffleArray = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const quizShowScreen = (id) => {
      ['screenPre','screenQuiz','screenResult'].forEach(s => {
        const el = document.getElementById(s);
        if (!el) return;
        el.classList.remove('is-active');
      });
      const target = document.getElementById(id);
      if (target) target.classList.add('is-active');
    };

    const formatTime = (s) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    };

    // ── Timer ──────────────────────────────────────────────────
    const startTimer = () => {
      const timerEl = document.getElementById('quizTimer');
      QuizState.intervalId = setInterval(() => {
        QuizState.timer--;
        if (timerEl) {
          timerEl.textContent = formatTime(QuizState.timer);
          timerEl.classList.toggle('urgent', QuizState.timer < 60);
        }
        if (QuizState.timer <= 0) {
          clearInterval(QuizState.intervalId);
          // Auto-submit: mark unanswered questions as wrong
          while (QuizState.current < QuizState.questions.length) {
            QuizState.answers.push({
              qIndex  : QuizState.current,
              userAns : -1,
              correct : false
            });
            QuizState.current++;
          }
          quizShowResults();
        }
      }, 1000);
    };

    // ── Render Question ──────────────────────────────────────────
    const LABELS = ['A','B','C','D'];

    const renderQuestion = () => {
      const idx = QuizState.current;
      const total = QuizState.questions.length;
      const q = QuizState.questions[idx];

      // Progress
      const pFill = document.getElementById('qProgressFill');
      const pLabel = document.getElementById('qProgressLabel');
      if (pFill)  pFill.style.width  = `${((idx + 1) / total) * 100}%`;
      if (pLabel) pLabel.textContent = `Soal ${idx + 1} dari ${total}`;

      // Badge + text
      const badge = document.getElementById('qBadge');
      const text  = document.getElementById('qText');
      if (badge) badge.textContent = `Soal ${idx + 1}`;
      if (text)  text.textContent  = q.q;

      // Options
      const optContainer = document.getElementById('qOptions');
      if (!optContainer) return;
      optContainer.innerHTML = '';
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'q-option';
        btn.innerHTML = `<span class="opt-label">${LABELS[i]}</span><span>${opt}</span>`;
        btn.setAttribute('aria-label', `Pilihan ${LABELS[i]}: ${opt}`);
        btn.addEventListener('click', () => quizSelectAnswer(i));
        optContainer.appendChild(btn);
      });

      // Hide next button
      const nextBtn = document.getElementById('qNextBtn');
      if (nextBtn) nextBtn.classList.remove('is-visible');

      // Animate card
      const card = document.getElementById('questionCard');
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
        });
      }
    };

    // ── Answer selection ─────────────────────────────────────────
    const quizSelectAnswer = (selectedIdx) => {
      const q = QuizState.questions[QuizState.current];
      const isCorrect = selectedIdx === q.answer;

      if (isCorrect) QuizState.score += QuizState.pointsPerCorrect;

      QuizState.answers.push({
        qIndex  : QuizState.current,
        userAns : selectedIdx,
        correct : isCorrect
      });

      // Disable all options, reveal correct/wrong
      const optContainer = document.getElementById('qOptions');
      if (optContainer) {
        [...optContainer.children].forEach((btn, i) => {
          btn.disabled = true;
          if (i === q.answer)    btn.classList.add('is-correct');
          if (i === selectedIdx && !isCorrect) btn.classList.add('is-wrong');
        });
      }

      // Show next button
      const nextBtn = document.getElementById('qNextBtn');
      if (nextBtn) {
        nextBtn.classList.add('is-visible');
        nextBtn.textContent =
          QuizState.current >= QuizState.questions.length - 1
            ? 'Lihat Hasil →'
            : 'Soal Berikutnya →';
      }
    };

    // ── Next question ──────────────────────────────────────────
    window.quizNextQuestion = () => {
      QuizState.current++;
      if (QuizState.current >= QuizState.questions.length) {
        QuizState.lastFinishWasUserGesture = true;
        clearInterval(QuizState.intervalId);
        quizShowResults();
      } else {
        renderQuestion();
      }
    };

    // ── Results ───────────────────────────────────────────────
    const quizShowResults = () => {
      const correct  = QuizState.answers.filter(a => a.correct).length;
      const total    = QuizState.questions.length;
      const wrong    = total - correct;
      const accuracy = Math.round((correct / total) * 100);
      const score    = QuizState.score;

      // Store score in localStorage for report generation
      try { localStorage.setItem('lastQuizScore', score); } catch (_) {}

      // Grade
      let grade, gradeClass;
      if (score >= 90)      { grade = 'A — Sangat Baik';    gradeClass = 'grade-A'; }
      else if (score >= 75) { grade = 'B — Baik';           gradeClass = 'grade-B'; }
      else if (score >= 60) { grade = 'C — Cukup Baik';    gradeClass = 'grade-C'; }
      else                   { grade = 'D — Perlu Belajar'; gradeClass = 'grade-D'; }

      quizShowScreen('screenResult');

      // Animated score counter
      const scoreEl = document.getElementById('resultScoreVal');
      if (scoreEl) {
        let n = 0;
        const step = Math.ceil(score / 60);
        const counter = setInterval(() => {
          n = Math.min(n + step, score);
          scoreEl.textContent = n;
          if (n >= score) clearInterval(counter);
        }, 25);
      }

      // Grade badge
      const gradeBadge = document.getElementById('gradeBadge');
      if (gradeBadge) {
        gradeBadge.textContent = grade;
        gradeBadge.className   = `grade-badge ${gradeClass}`;
      }

      // Stats
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('rCorrect',  correct);
      set('rWrong',    wrong);
      set('rAccuracy', `${accuracy}%`);

      // User label
      const userEl = document.getElementById('resultUser');
      if (userEl) userEl.textContent = `Nama: ${QuizState.userName || '-'}`;

      // Ensure WA button exists even if HTML is stale
      quizEnsureWhatsAppButton();

      // Build review accordion
      const reviewList = document.getElementById('reviewList');
      if (!reviewList) return;
      reviewList.innerHTML = '';

      QuizState.answers.forEach((ans, i) => {
        const q      = QuizState.questions[ans.qIndex];
        const uLabel = ans.userAns >= 0 ? `${LABELS[ans.userAns]}. ${q.options[ans.userAns]}` : '(Tidak dijawab)';
        const cLabel = `${LABELS[q.answer]}. ${q.options[q.answer]}`;

        const item = document.createElement('div');
        item.className = 'review-item';
        item.innerHTML = `
          <button class="review-toggle" aria-expanded="false" aria-controls="rev-detail-${i}">
            <span>
              ${ans.correct ? '[B]' : '[S]'} Soal ${i + 1}: ${q.q.slice(0, 55)}${q.q.length > 55 ? '...' : ''}
            </span>
            <span class="r-icon">▼</span>
          </button>
          <div class="review-detail" id="rev-detail-${i}" role="region">
            <div class="review-detail-inner">
              <p class="r-label">Pertanyaan</p>
              <p style="margin:0 0 0.6rem;font-size:0.92rem">${q.q}</p>
              <p class="r-label">Jawaban Kamu</p>
              <p class="${ans.correct ? 'r-correct' : 'r-wrong'}" style="margin:0 0 0.4rem">${uLabel}</p>
              ${!ans.correct ? `<p class="r-label">Jawaban Benar</p><p class="r-correct" style="margin:0 0 0.4rem">${cLabel}</p>` : ''}
              <p class="r-label">Penjelasan</p>
              <p class="r-explain" style="margin:0">${q.explanation}</p>
            </div>
          </div>`;

        // Accordion toggle
        const toggle = item.querySelector('.review-toggle');
        const detail = item.querySelector('.review-detail');
        toggle.addEventListener('click', () => {
          const isOpen = detail.classList.contains('open');
          detail.classList.toggle('open', !isOpen);
          toggle.classList.toggle('open', !isOpen);
          toggle.setAttribute('aria-expanded', String(!isOpen));
        });

        reviewList.appendChild(item);
      });

      // Best-effort auto-open WhatsApp ONLY when results reached via a user click
      if (QuizState.lastFinishWasUserGesture && !QuizState.waAutoOpenedOnce) {
        QuizState.waAutoOpenedOnce = true;
        try { quizOpenWhatsApp(); } catch (_) {}
      }
    };

    // ── Start / Reset ────────────────────────────────────────────
    window.quizStart = () => {
      quizHydrateNameField();
      const name = quizGetUserName();
      if (!name) {
        alert('Isi nama pengguna dulu sebelum mulai kuis.');
        const input = document.getElementById('quizUserName');
        input?.focus();
        return;
      }
      quizSetUserName(name);

      QuizState.questions = shuffleArray(QUESTION_BANK).slice(0, QUIZ_QUESTION_COUNT);
      QuizState.current   = 0;
      QuizState.score     = 0;
      QuizState.answers   = [];
      QuizState.timer     = QUIZ_TIME_SECONDS;
      QuizState.isActive  = true;
      QuizState.pointsPerCorrect = Math.round(QUIZ_MAX_SCORE / QUIZ_QUESTION_COUNT);
      QuizState.lastFinishWasUserGesture = false;
      clearInterval(QuizState.intervalId);
      quizShowScreen('screenQuiz');
      renderQuestion();
      startTimer();
      const timerEl = document.getElementById('quizTimer');
      if (timerEl) { timerEl.textContent = formatTime(QUIZ_TIME_SECONDS); timerEl.classList.remove('urgent'); }
    };

    window.quizReset = () => {
      clearInterval(QuizState.intervalId);
      QuizState.isActive = false;
      QuizState.lastFinishWasUserGesture = false;
      quizShowScreen('screenPre');
      quizHydrateNameField();
    };

    window.quizCopyResult = () => {
      const text = quizBuildResultText().replace(/\n/g, ' — ');
      navigator.clipboard?.writeText(text).then(() => {
        const btn = document.querySelector('[onclick="quizCopyResult()"]');
        if (btn) { const orig = btn.textContent; btn.textContent = 'Disalin!'; setTimeout(() => btn.textContent = orig, 2000); }
      }).catch(() => {
        prompt('Salin teks berikut:', text);
      });
    };

    // Pre-fill name when arriving on the quiz page
    (() => {
      quizHydrateNameField();
      const input = document.getElementById('quizUserName');
      if (!input) return;
      input.addEventListener('input', () => {
        const v = input.value.trim();
        if (v) quizSetUserName(v);
      });

      // If user reloads on result screen for any reason, keep button present
      quizEnsureWhatsAppButton();
    })();

    // ── Scroll reveal (IntersectionObserver) ────────────────────
    (() => {
      // Add .reveal to card-like elements in sections
      const targets = document.querySelectorAll(
        '.card, .stat-card, .member-card, .formula-card, .apd-card, ' +
        '.stepper-block, .obs-table-wrap, .sim-block, .pre-quiz-card'
      );

      targets.forEach((el, i) => {
        el.classList.add('reveal');
        el.style.animationDelay = `${(i % 6) * 0.07}s`;
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      targets.forEach(el => observer.observe(el));
    })();

    // ── Back to Top ─────────────────────────────────────────────
    (() => {
      const btn = document.getElementById('backToTop');
      if (!btn) return;

      window.addEventListener('scroll', () => {
        btn.classList.toggle('is-visible', window.scrollY > 300);
      }, { passive: true });

      btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    })();

    // =========================================================
    // PHASE 6 — LAPORAN PRAKTIKUM (Report Generation)
    // =========================================================

    const getReportData = () => {
      const today = new Date();
      const dateStr = today.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      // Get student name from quiz or localStorage
      let studentName = quizGetUserName();
      if (!studentName) {
        studentName = prompt('Masukkan nama praktikan:') || '(Tidak diisi)';
      }

      // Extract AC table data
      const acTable = document.getElementById('tableAC');
      const acData = [];
      if (acTable) {
        acTable.querySelectorAll('tbody tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            acData.push({
              no: cells[0]?.textContent?.trim() || '',
              terminal: cells[1]?.textContent?.trim() || '',
              batas: cells[2]?.textContent?.trim() || '',
              penunjukan: cells[3]?.querySelector('input')?.value || '—',
              faktorSkala: cells[4]?.textContent?.trim() || '—',
              hasil: cells[5]?.textContent?.trim() || '—'
            });
          }
        });
      }

      // Extract DC table data
      const dcTable = document.getElementById('tableDC');
      const dcData = [];
      if (dcTable) {
        dcTable.querySelectorAll('tbody tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            dcData.push({
              no: cells[0]?.textContent?.trim() || '',
              psuOutput: cells[1]?.querySelector('input')?.value || '—',
              batas: cells[2]?.textContent?.trim() || '',
              penunjukan: cells[3]?.querySelector('input')?.value || '—',
              faktorSkala: cells[4]?.textContent?.trim() || '—',
              hasil: cells[5]?.textContent?.trim() || '—'
            });
          }
        });
      }

      // Get last quiz score
      let quizScore = '—';
      let quizGrade = '—';
      const quizScoreStored = localStorage.getItem('lastQuizScore');
      if (quizScoreStored) {
        quizScore = quizScoreStored;
        quizGrade = quizScoreStored >= 80 ? 'A (Sangat Baik)' : quizScoreStored >= 70 ? 'B (Baik)' : quizScoreStored >= 60 ? 'C (Cukup)' : 'D (Kurang)';
      }

      return { dateStr, studentName, acData, dcData, quizScore, quizGrade };
    };

    window.generateReport = () => {
      const { dateStr, studentName, acData, dcData, quizScore, quizGrade } = getReportData();

      let acTableHtml = `
        <table style="width:100%; border-collapse:collapse; margin:1rem 0; font-size:12px">
          <thead>
            <tr style="background:#ff6f00; color:white">
              <th style="border:1px solid #ddd; padding:8px">No</th>
              <th style="border:1px solid #ddd; padding:8px">Terminal</th>
              <th style="border:1px solid #ddd; padding:8px">Batas Ukur (V)</th>
              <th style="border:1px solid #ddd; padding:8px">Penunjukan (V)</th>
              <th style="border:1px solid #ddd; padding:8px">Faktor Skala</th>
              <th style="border:1px solid #ddd; padding:8px">Hasil Ukur (V)</th>
            </tr>
          </thead>
          <tbody>
      `;
      acData.forEach(row => {
        acTableHtml += `
          <tr>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.no}</td>
            <td style="border:1px solid #ddd; padding:8px">${row.terminal}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.batas}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.penunjukan}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.faktorSkala}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.hasil}</td>
          </tr>
        `;
      });
      acTableHtml += `</tbody></table>`;

      let dcTableHtml = `
        <table style="width:100%; border-collapse:collapse; margin:1rem 0; font-size:12px">
          <thead>
            <tr style="background:#ff6f00; color:white">
              <th style="border:1px solid #ddd; padding:8px">No</th>
              <th style="border:1px solid #ddd; padding:8px">Output PSU (V)</th>
              <th style="border:1px solid #ddd; padding:8px">Batas Ukur (V)</th>
              <th style="border:1px solid #ddd; padding:8px">Penunjukan (V)</th>
              <th style="border:1px solid #ddd; padding:8px">Faktor Skala</th>
              <th style="border:1px solid #ddd; padding:8px">Hasil Ukur (V)</th>
            </tr>
          </thead>
          <tbody>
      `;
      dcData.forEach(row => {
        dcTableHtml += `
          <tr>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.no}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.psuOutput}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.batas}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.penunjukan}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.faktorSkala}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center">${row.hasil}</td>
          </tr>
        `;
      });
      dcTableHtml += `</tbody></table>`;

      // Create modal/overlay for report preview
      const reportContent = `
        <div id="reportModal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:10000; padding:20px">
          <div style="background:white; border-radius:8px; padding:40px; max-height:90vh; overflow-y:auto; max-width:900px; width:100%; box-shadow:0 10px 40px rgba(0,0,0,0.2)">
            <div style="text-align:center; margin-bottom:2rem; border-bottom:2px solid #ff6f00; padding-bottom:1rem">
              <h2 style="margin:0; font-size:24px; color:#111">LAPORAN PRAKTIKUM</h2>
              <p style="margin:0.5rem 0 0 0; color:#666; font-size:14px">Praktek Pengukuran Listrik — Job 3: Pengukuran Tegangan AC & DC</p>
            </div>

            <div style="margin-bottom:2rem; display:grid; grid-template-columns:1fr 1fr; gap:2rem; font-size:14px">
              <div>
                <p style="margin:0.5rem 0"><strong>Nama Praktikan:</strong> ${studentName}</p>
                <p style="margin:0.5rem 0"><strong>Tanggal:</strong> ${dateStr}</p>
              </div>
              <div style="text-align:right">
                <p style="margin:0.5rem 0"><strong>Nilai Kuis Terakhir:</strong> ${quizScore}/100</p>
                <p style="margin:0.5rem 0"><strong>Nilai Akhir:</strong> ${quizGrade}</p>
              </div>
            </div>

            <h3 style="margin:2rem 0 1rem 0; color:#111; border-bottom:2px solid #ff6f00; padding-bottom:0.5rem">Pengamatan 1 — Pengukuran Tegangan AC</h3>
            ${acTableHtml}

            <h3 style="margin:2rem 0 1rem 0; color:#111; border-bottom:2px solid #ff6f00; padding-bottom:0.5rem">Pengamatan 2 — Pengukuran Tegangan DC</h3>
            ${dcTableHtml}

            <div style="margin-top:2rem; padding-top:2rem; border-top:1px solid #ddd; text-align:center; font-size:12px; color:#666">
              <p>Laporan ini dibuat melalui Media Pembelajaran Interaktif Praktek Pengukuran Listrik</p>
              <p style="margin-top:0.5rem">Tanggal Cetak: ${new Date().toLocaleString('id-ID')}</p>
            </div>

            <div style="display:flex; gap:1rem; margin-top:2rem; justify-content:center">
              <button onclick="printReport()" style="padding:10px 20px; background:#ff6f00; color:white; border:none; border-radius:4px; cursor:pointer; font-size:14px">
                <i class="fas fa-print"></i> Cetak
              </button>
              <button onclick="downloadReportPDF('${studentName.replace(/['"]/g, '')}', '${dateStr}')" style="padding:10px 20px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-size:14px">
                <i class="fas fa-download"></i> Download PDF
              </button>
              <button onclick="closeReportModal()" style="padding:10px 20px; background:#999; color:white; border:none; border-radius:4px; cursor:pointer; font-size:14px">
                <i class="fas fa-times"></i> Tutup
              </button>
            </div>
          </div>
        </div>
      `;

      // Remove old modal if exists
      const oldModal = document.getElementById('reportModal');
      if (oldModal) oldModal.remove();

      // Inject and show
      document.body.insertAdjacentHTML('beforeend', reportContent);

      // Store for print/download
      window.currentReportData = { dateStr, studentName, acTableHtml, dcTableHtml, quizScore, quizGrade };
    };

    window.printReport = () => {
      const data = window.currentReportData;
      if (!data) return alert('Silakan buat laporan terlebih dahulu');

      const printWindow = window.open('', 'PrintWindow', 'width=900,height=600');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Laporan Praktikum</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
              .header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #ff6f00; padding-bottom: 1rem; }
              .header h2 { margin: 0; font-size: 24px; }
              .header p { margin: 0.5rem 0 0 0; color: #666; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; font-size: 14px; }
              .info-grid div:last-child { text-align: right; }
              h3 { margin: 2rem 0 1rem 0; color: #111; border-bottom: 2px solid #ff6f00; padding-bottom: 0.5rem; }
              table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 12px; }
              th { background: #ff6f00; color: white; padding: 8px; border: 1px solid #ddd; }
              td { border: 1px solid #ddd; padding: 8px; }
              .footer { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
              @media print { body { margin: 0; padding: 10px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>LAPORAN PRAKTIKUM</h2>
              <p>Praktek Pengukuran Listrik — Job 3: Pengukuran Tegangan AC & DC</p>
            </div>
            <div class="info-grid">
              <div>
                <p><strong>Nama Praktikan:</strong> ${data.studentName}</p>
                <p><strong>Tanggal:</strong> ${data.dateStr}</p>
              </div>
              <div>
                <p><strong>Nilai Kuis Terakhir:</strong> ${data.quizScore}/100</p>
                <p><strong>Nilai Akhir:</strong> ${data.quizGrade}</p>
              </div>
            </div>
            <h3>Pengamatan 1 — Pengukuran Tegangan AC</h3>
            ${data.acTableHtml}
            <h3>Pengamatan 2 — Pengukuran Tegangan DC</h3>
            ${data.dcTableHtml}
            <div class="footer">
              <p>Laporan ini dibuat melalui Media Pembelajaran Interaktif Praktek Pengukuran Listrik</p>
              <p style="margin-top:0.5rem">Tanggal Cetak: ${new Date().toLocaleString('id-ID')}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    window.downloadReportPDF = (studentName, dateStr) => {
      const data = window.currentReportData;
      if (!data) return alert('Silakan buat laporan terlebih dahulu');

      // Simple HTML-to-image approach: use canvas + image export
      // For a more robust PDF, would need html2pdf library, but this uses only built-ins
      const element = document.getElementById('reportModal')?.querySelector('div > div');
      if (!element) return alert('Laporan tidak ditemukan');

      // Fallback: convert to canvas then image (requires html2canvas library ideally)
      // For now, we'll create a text-based approach or offer print-to-PDF
      alert('Untuk download PDF, gunakan fitur "Cetak" kemudian pilih "Simpan sebagai PDF" di browser Anda.');
    };

    window.closeReportModal = () => {
      const modal = document.getElementById('reportModal');
      if (modal) modal.remove();
    };

    // =========================================================
    // PHASE 7 — SIMULASI KESALAHAN UMUM (Error Scenarios)
    // =========================================================

    const KESALAHAN_SCENARIOS = [
      {
        title: 'Kesalahan 1: Batas Ukur Terlalu Kecil',
        icon: '<i class="fas fa-exclamation-triangle" style="font-size:48px; color:#ef4444"></i>',
        situasi: `
          Anda akan mengukur tegangan dari trafo 220/6V CT menggunakan multimeter analog. 
          Tanpa tahu pasti berapa tegangan outputnya, Anda langsung memilih batas ukur 2.5V 
          untuk mendapatkan pembacaan yang akurat.
        `,
        dampak: `
          <div style="background:#fee2e2; border-left:4px solid #ef4444; padding:1rem; border-radius:4px; margin:1rem 0">
            <p style="margin:0; color:#991b1b"><strong>Dampak Negatif:</strong></p>
            <ul style="margin:0.5rem 0 0 0; padding-left:1.5rem; color:#991b1b">
              <li><strong>Jarum melampaui skala (over-range)</strong> — Jarum akan mentok ke kanan melampaui 2.5V</li>
              <li><strong>Merusak mekanik jarum</strong> — Tekanan berlebih dapat melenturkan atau merusak jarum permanen</li>
              <li><strong>Kerusakan internal alat</strong> — Arus berlebih dapat merusak resistor/komponen internal</li>
              <li><strong>Pembacaan mustahil</strong> — Tidak bisa membaca nilai dengan akurat</li>
            </ul>
          </div>
        `,
        solusi: `
          <div style="background:#dcfce7; border-left:4px solid #10b981; padding:1rem; border-radius:4px; margin:1rem 0">
            <p style="margin:0; color:#166534"><strong>Solusi Yang Benar:</strong></p>
            <ol style="margin:0.5rem 0 0 0; padding-left:1.5rem; color:#166534">
              <li><strong>Mulai dari range terbesar</strong> — Pilih batas ukur 50V terlebih dahulu</li>
              <li><strong>Hubungkan ke rangkaian</strong> — Lihat defleksi jarum untuk estimasi tegangan</li>
              <li><strong>Turunkan range bertahap</strong> — Setelah tahu kisaran tegangan, turunkan ke 10V atau 2.5V</li>
              <li><strong>Prioritaskan keselamatan alat</strong> — Lebih baik pembacaan kurang akurat daripada merusak alat</li>
            </ol>
          </div>
        `,
        tips: 'Ingat aturan emas: <strong>Mulai dari range tertinggi, turunkan sesuai kebutuhan!</strong>'
      },
      {
        title: 'Kesalahan 2: Mode Pengukuran Salah',
        icon: '<i class="fas fa-right-left" style="font-size:48px; color:#ef4444"></i>',
        situasi: `
          Praktikan perlu mengukur tegangan dari trafo AC 6V. Namun secara tidak sengaja 
          memutar selektor multimeter ke posisi DCV (DC Voltage) padahal sumber adalah AC. 
          Praktikan tetap melanjutkan pengukuran tanpa menyadari kesalahan ini.
        `,
        dampak: `
          <div style="background:#fee2e2; border-left:4px solid #ef4444; padding:1rem; border-radius:4px; margin:1rem 0">
            <p style="margin:0; color:#991b1b"><strong>Dampak Negatif:</strong></p>
            <ul style="margin:0.5rem 0 0 0; padding-left:1.5rem; color:#991b1b">
              <li><strong>Pembacaan tidak valid</strong> — Multimeter DCV tidak akan membaca tegangan AC dengan benar</li>
              <li><strong>Hasil pengamatan salah</strong> — Data praktikum menjadi tidak sesuai teori</li>
              <li><strong>Laporan tidak akurat</strong> — Analisis dan kesimpulan praktikum berdasarkan data salah</li>
              <li><strong>Nilai praktikum berkurang</strong> — Dosen akan mendeteksi kesalahan sistematis</li>
            </ul>
          </div>
        `,
        solusi: `
          <div style="background:#dcfce7; border-left:4px solid #10b981; padding:1rem; border-radius:4px; margin:1rem 0">
            <p style="margin:0; color:#166534"><strong>Solusi Yang Benar:</strong></p>
            <ol style="margin:0.5rem 0 0 0; padding-left:1.5rem; color:#166534">
              <li><strong>Identifikasi jenis sumber terlebih dahulu</strong> — AC atau DC?</li>
              <li><strong>Untuk trafo/sumber AC</strong> → Pilih mode <strong>ACV</strong> (AC Voltage)</li>
              <li><strong>Untuk PSU/battery</strong> → Pilih mode <strong>DCV</strong> (DC Voltage)</li>
              <li><strong>Periksa label/datasheet</strong> — Sumber listrik biasanya tertera labelnya</li>
              <li><strong>Minta verifikasi dosen</strong> — Sebelum pengukuran, konfirmasi mode yang tepat</li>
            </ol>
          </div>
        `,
        tips: 'Cek jenis sumber dulu: <strong>Trafo/Listrik Rumah = AC (ACV), PSU/Baterai = DC (DCV)</strong>'
      },
      {
        title: 'Kesalahan 3: Probe Terbalik pada DC',
        icon: '<i class="fas fa-plug" style="font-size:48px; color:#ef4444"></i>',
        situasi: `
          Saat mengukur tegangan DC dari PSU, praktikan tidak memperhatikan polaritas probe. 
          Probe merah (seharusnya ke +) justru ditempel ke terminal negatif PSU, 
          dan probe hitam ke terminal positif (sebaliknya).
        `,
        dampak: `
          <div style="background:#fee2e2; border-left:4px solid #ef4444; padding:1rem; border-radius:4px; margin:1rem 0">
            <p style="margin:0; color:#991b1b"><strong>Dampak Negatif:</strong></p>
            <ul style="margin:0.5rem 0 0 0; padding-left:1.5rem; color:#991b1b">
              <li><strong>Pada multimeter analog</strong> — Jarum akan defleksi ke arah kiri (negatif)</li>
              <li><strong>Potensi merusak mekanik</strong> — Jarum dipaksa ke negatif bisa merusak stop mekanik</li>
              <li><strong>Pembacaan negatif</strong> — Nilai yang terbaca jadi negatif (tidak sesuai realitas)</li>
              <li><strong>Kesalahpahaman data</strong> — Praktikan jadi bingung mengapa nilai negatif</li>
            </ul>
          </div>
        `,
        solusi: `
          <div style="background:#dcfce7; border-left:4px solid #10b981; padding:1rem; border-radius:4px; margin:1rem 0">
            <p style="margin:0; color:#166534"><strong>Solusi Yang Benar:</strong></p>
            <ol style="margin:0.5rem 0 0 0; padding-left:1.5rem; color:#166534">
              <li><strong>Ingat standar warna probe</strong> — Merah = Positif (+), Hitam = Negatif (-)</li>
              <li><strong>Probe merah → Terminal + PSU</strong> — Selalu ke terminal positif</li>
              <li><strong>Probe hitam → Terminal - PSU</strong> — Selalu ke terminal negatif</li>
              <li><strong>Jika sudah terbalik, jangan dipaksa</strong> — Lepas dan pasang dengan benar</li>
              <li><strong>Pada multimeter digital</strong> — Biasanya aman, tapi tetap perhatikan polaritas</li>
            </ol>
          </div>
        `,
        tips: '<strong>Merah ke Merah (+), Hitam ke Bumi (-)</strong> — Mudah diingat dengan warna!'
      },
      {
        title: 'Kesalahan 4: Terminal CT Trafo Salah',
        icon: '<i class="fas fa-sitemap" style="font-size:48px; color:#ef4444"></i>',
        situasi: `
          Pada trafo 6V CT (Center Tap), terdapat 3 terminal: CT (tengah), dan dua ujung (6V). 
          Praktikan ingin mengukur tegangan 6V dari CT ke salah satu ujung, 
          namun salah menghubungkan probe dan mengukur dari ujung ke ujung 
          (seharusnya 12V, bukan 6V).
        `,
        dampak: `
          <div style="background:#fee2e2; border-left:4px solid #ef4444; padding:1rem; border-radius:4px; margin:1rem 0">
            <p style="margin:0; color:#991b1b"><strong>Dampak Negatif:</strong></p>
            <ul style="margin:0.5rem 0 0 0; padding-left:1.5rem; color:#991b1b">
              <li><strong>Tegangan yang terukur 2x lebih besar</strong> — Bisa terukur ~12V bukan 6V</li>
              <li><strong>Batas ukur mungkin tidak cukup</strong> — Jika memilih batas 10V, jarum bisa over-range</li>
              <li><strong>Data hasil pengamatan salah</strong> — Tabel pengamatan menjadi tidak sesuai spesifikasi</li>
              <li><strong>Teori tidak sesuai praktik</strong> — Analisis berdasarkan data yang keliru</li>
            </ul>
          </div>
        `,
        solusi: `
          <div style="background:#dcfce7; border-left:4px solid #10b981; padding:1rem; border-radius:4px; margin:1rem 0">
            <p style="margin:0; color:#166534"><strong>Solusi Yang Benar:</strong></p>
            <ol style="margin:0.5rem 0 0 0; padding-left:1.5rem; color:#166534">
              <li><strong>Pahami konfigurasi trafo 6V CT</strong> — Ada 3 terminal: CT (tengah), A (6V), B (6V)</li>
              <li><strong>Untuk mengukur 6V</strong> — Probe ke CT dan salah satu ujung (A atau B)</li>
              <li><strong>Untuk mengukur 12V</strong> — Probe ke ujung A dan ujung B (ujung ke ujung)</li>
              <li><strong>Beri label di trafo</strong> — Tulis "CT", "6V-A", "6V-B" agar tidak bingung</li>
              <li><strong>Konsultasi diagram skematik</strong> — Lihat prosedur praktikum sebelum mengukur</li>
            </ol>
          </div>
        `,
        tips: '<strong>CT trafo 6-CT-6 punya 3 terminal:</strong> Dari CT ke ujung = 6V; Ujung ke ujung = 12V'
      }
    ];

    let currentScenarioIdx = 0;

    const renderScenario = (idx) => {
      if (idx < 0 || idx >= KESALAHAN_SCENARIOS.length) return;
      currentScenarioIdx = idx;

      const scenario = KESALAHAN_SCENARIOS[idx];
      const content = document.getElementById('scenarioContent');
      if (!content) return;

      content.innerHTML = `
        <div style="display:flex; gap:2rem; align-items:flex-start; margin-bottom:2rem; flex-wrap:wrap">
          <div style="flex-shrink:0">${scenario.icon}</div>
          <div style="flex:1">
            <h3 style="margin:0 0 1rem 0; color:#111">${scenario.title}</h3>
            <p style="margin:0; color:#666; line-height:1.6"><strong>Situasi:</strong></p>
            <p style="margin:0.5rem 0 0 0; color:#555; line-height:1.6">${scenario.situasi}</p>
          </div>
        </div>

        <div style="margin:2rem 0">
          <h4 style="margin:0 0 1rem 0; color:#111">Dampak Jika Kesalahan Terjadi:</h4>
          ${scenario.dampak}
        </div>

        <div style="margin:2rem 0">
          <h4 style="margin:0 0 1rem 0; color:#111">Cara Menghindari & Solusi:</h4>
          ${scenario.solusi}
        </div>

        <div style="background:#f0f9ff; border-left:4px solid #0284c7; padding:1rem; border-radius:4px; margin:2rem 0">
          <p style="margin:0; color:#0c4a6e"><i class="fas fa-lightbulb"></i> <strong>Tip Penting:</strong> ${scenario.tips}</p>
        </div>
      `;

      // Update button states
      const btnPrev = document.getElementById('btnPrev');
      const btnNext = document.getElementById('btnNext');
      if (btnPrev) btnPrev.disabled = idx === 0;
      if (btnNext) {
        btnNext.innerHTML = idx === KESALAHAN_SCENARIOS.length - 1
          ? 'Selesai <i class="fas fa-check" aria-hidden="true"></i>'
          : 'Selanjutnya <i class="fas fa-chevron-right" aria-hidden="true"></i>';
      }

      // Update scenario buttons
      document.querySelectorAll('.scenario-btn').forEach((btn, i) => {
        btn.classList.toggle('is-active', i === idx);
      });

      // Scroll to top
      document.getElementById('scenarioContent')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.selectScenario = (idx) => renderScenario(idx);
    window.nextScenario = () => renderScenario(currentScenarioIdx + 1);
    window.previousScenario = () => renderScenario(currentScenarioIdx - 1);
    window.resetScenario = () => renderScenario(0);

    // Initialize on page load
    if (document.getElementById('scenarioContent')) {
      renderScenario(0);
    }

    // =========================================================
    // PHASE 8 — GLOBAL SEARCH (Ctrl+K)
    // =========================================================

    (() => {
      const navbar = document.querySelector('.container.navbar');
      if (!navbar) return;

      if (!document.getElementById('globalSearchBtn')) {
        const btn = document.createElement('button');
        btn.id = 'globalSearchBtn';
        btn.type = 'button';
        btn.className = 'global-search-btn';
        btn.innerHTML = '<i class="fas fa-search" aria-hidden="true"></i><span class="label">Cari</span><span class="kbd">Ctrl K</span>';
        btn.addEventListener('click', () => openSearch());
        navbar.appendChild(btn);
      }

      if (!document.getElementById('globalSearchOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'globalSearchOverlay';
        overlay.className = 'search-overlay';
        overlay.innerHTML = `
          <div class="search-modal" role="dialog" aria-modal="true" aria-label="Pencarian Materi">
            <div class="search-modal-header">
              <i class="fas fa-search" aria-hidden="true" style="color:#666"></i>
              <input id="globalSearchInput" class="search-input" type="search" placeholder="Cari: AC, DC, Vrms, CT, CRO, prosedur, kuis..." autocomplete="off" />
              <button id="globalSearchClose" class="search-close" type="button" aria-label="Tutup">ESC</button>
            </div>
            <div id="globalSearchResults" class="search-results" role="listbox" aria-label="Hasil pencarian"></div>
            <div class="search-hint">Tip: tekan <strong>Enter</strong> untuk membuka hasil pertama.</div>
          </div>
        `;
        document.body.appendChild(overlay);
      }

      const INDEX = [
        {
          title: 'Materi — Konsep Dasar AC/DC',
          desc: 'Pengertian AC vs DC, gelombang, Vrms, Vpp, frekuensi.',
          href: 'materi.html?tab=tab-konsep#materi',
          keywords: 'materi konsep ac dc sinus vrms vpp vm frekuensi periode omega'
        },
        {
          title: 'Materi — Multimeter Analog',
          desc: 'Batas ukur, skala penuh, faktor skala, paralaks, kalibrasi ohm.',
          href: 'materi.html?tab=tab-multimeter#materi',
          keywords: 'multimeter analog batas ukur skala penuh faktor skala paralaks ohmmeter kalibrasi'
        },
        {
          title: 'Materi — K3 & APD',
          desc: 'Aturan keselamatan, APD, prosedur aman di lab.',
          href: 'materi.html?tab=tab-k3#materi',
          keywords: 'k3 apd keselamatan bahaya prosedur lab one-hand rule'
        },
        {
          title: 'Prosedur — Langkah Kerja (AC & DC)',
          desc: 'Stepper percobaan 1 (AC) dan percobaan 2 (DC).',
          href: 'prosedur.html#prosedur',
          keywords: 'prosedur langkah kerja percobaan ac dc acv dcv trafo psu rheostat'
        },
        {
          title: 'Prosedur — Tabel Pengamatan AC',
          desc: 'Isi tabel terminal CT–6, CT–12, 6–12 dan hasil ukur.',
          href: 'prosedur.html#tableAC',
          keywords: 'tabel ac pengamatan terminal ct 6 12 faktor skala hasil ukur'
        },
        {
          title: 'Prosedur — Tabel Pengamatan DC',
          desc: 'Isi tabel output PSU, penunjukan jarum, hasil ukur DC.',
          href: 'prosedur.html#tableDC',
          keywords: 'tabel dc pengamatan psu output jarum faktor skala hasil ukur'
        },
        {
          title: 'Prosedur — Laporan Praktikum',
          desc: 'Buat laporan & cetak (bisa simpan sebagai PDF).',
          href: 'prosedur.html#prosedur',
          keywords: 'laporan praktikum cetak pdf print'
        },
        {
          title: 'Simulasi — Baca Skala Multimeter',
          desc: 'Latihan membaca jarum dan skala.',
          href: 'simulasi.html#simulasi',
          keywords: 'simulasi multimeter jarum skala latihan batas ukur'
        },
        {
          title: 'Simulasi — CRO / Osiloskop',
          desc: 'CRO simulator: volts/div, time/div, Vpp, Vrms.',
          href: 'simulasi.html#simulasi',
          keywords: 'cro osiloskop volts div time div vpp vrms freeze run'
        },
        {
          title: 'Kuis',
          desc: 'Kerjakan kuis dan kirim hasil ke WhatsApp.',
          href: 'kuis.html#kuis',
          keywords: 'kuis soal nilai whatsapp nama pengguna'
        },
        {
          title: 'Simulasi Kesalahan Umum',
          desc: 'Batas ukur salah, mode salah, probe terbalik, terminal CT salah.',
          href: 'simulasi-kesalahan.html#kesalahan',
          keywords: 'kesalahan batas ukur mode acv dcv probe terbalik ct trafo'
        },
        {
          title: 'Tentang',
          desc: 'Informasi media pembelajaran dan tim.',
          href: 'tentang.html#tentang',
          keywords: 'tentang media pembelajaran tim teknologi'
        }
      ];

      const overlay = document.getElementById('globalSearchOverlay');
      const input = document.getElementById('globalSearchInput');
      const results = document.getElementById('globalSearchResults');
      const closeBtn = document.getElementById('globalSearchClose');
      const openBtn = document.getElementById('globalSearchBtn');

      if (!overlay || !input || !results || !closeBtn || !openBtn) return;

      const normalize = (s) => String(s || '').toLowerCase().trim();

      const scoreItem = (item, q) => {
        if (!q) return 0;
        const title = normalize(item.title);
        const desc = normalize(item.desc);
        const kw = normalize(item.keywords);
        const tokens = q.split(/\s+/).filter(Boolean);
        let score = 0;

        if (title.includes(q)) score += 6;
        if (desc.includes(q)) score += 3;
        if (kw.includes(q)) score += 2;

        tokens.forEach(t => {
          if (title.includes(t)) score += 3;
          if (desc.includes(t)) score += 2;
          if (kw.includes(t)) score += 1;
        });
        return score;
      };

      const renderResults = (q) => {
        const query = normalize(q);
        if (!query) {
          results.innerHTML = '<div class="search-empty">Mulai ketik untuk mencari materi...</div>';
          results.dataset.firstHref = '';
          return;
        }

        const ranked = INDEX
          .map(item => ({ item, score: scoreItem(item, query) }))
          .filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 9);

        if (ranked.length === 0) {
          results.innerHTML = '<div class="search-empty">Tidak ada hasil. Coba kata kunci lain.</div>';
          results.dataset.firstHref = '';
          return;
        }

        results.dataset.firstHref = ranked[0].item.href;
        results.innerHTML = ranked.map((r, idx) => `
          <button class="search-item" role="option" data-href="${r.item.href}" aria-selected="${idx === 0 ? 'true' : 'false'}">
            <div class="search-item-title">${r.item.title}</div>
            <div class="search-item-desc">${r.item.desc}</div>
          </button>
        `).join('');
      };

      const openSearch = () => {
        overlay.classList.add('is-open');
        renderResults(input.value);
        setTimeout(() => input.focus(), 0);
      };

      const closeSearch = () => {
        overlay.classList.remove('is-open');
        openBtn.focus();
      };

      // Expose for button click created earlier
      window.openGlobalSearch = openSearch;

      // Wire up
      closeBtn.addEventListener('click', closeSearch);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSearch();
      });
      input.addEventListener('input', () => renderResults(input.value));

      results.addEventListener('click', (e) => {
        const btn = e.target.closest('.search-item');
        const href = btn?.dataset?.href;
        if (!href) return;
        closeSearch();
        window.location.href = href;
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeSearch();
          return;
        }
        if (e.key === 'Enter') {
          const first = results.dataset.firstHref;
          if (first) {
            e.preventDefault();
            closeSearch();
            window.location.href = first;
          }
        }
      });

      document.addEventListener('keydown', (e) => {
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
        const metaOrCtrl = isMac ? e.metaKey : e.ctrlKey;
        if (metaOrCtrl && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          openSearch();
        }
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
          e.preventDefault();
          closeSearch();
        }
      });
    })();
