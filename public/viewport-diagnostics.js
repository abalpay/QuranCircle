(() => {
  "use strict";

  if (window.__QC_VIEWPORT_DIAGNOSTICS__) {
    return;
  }

  const MAX_ENTRIES = 300;
  const SCHEMA_VERSION = 1;
  const entries = [];
  const pendingEvents = new Set();
  let sequence = 0;
  let startedAt = performance.now();
  let animationFrame = null;

  const round = (value) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value * 100) / 100
      : null;

  const getRect = (element) => {
    const rect = element?.getBoundingClientRect();
    return {
      top: round(rect?.top),
      bottom: round(rect?.bottom),
      height: round(rect?.height),
    };
  };

  const getElementMetrics = (element) => {
    if (!element) {
      return null;
    }

    const styles = window.getComputedStyle(element);
    return {
      ...getRect(element),
      display: styles.display,
      position: styles.position,
      minHeight: styles.minHeight,
      overflowX: styles.overflowX,
      overflowY: styles.overflowY,
    };
  };

  const parsePixels = (value) => round(Number.parseFloat(value));

  const style = document.createElement("style");
  style.textContent = `
    #qc-viewport-diagnostics {
      background: rgb(2 6 23 / 0.96);
      border: 1px solid rgb(110 231 183);
      border-radius: 1rem;
      box-shadow: 0 24px 64px rgb(0 0 0 / 0.45);
      color: rgb(248 250 252);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      max-width: calc(100vw - 1rem);
      position: fixed;
      right: 0.5rem;
      top: calc(env(safe-area-inset-top, 0px) + 0.5rem);
      width: 26rem;
      z-index: 2147483647;
    }
    #qc-viewport-diagnostics button {
      appearance: none;
      font: inherit;
      touch-action: manipulation;
    }
    #qc-vd-toggle {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 1rem;
      color: inherit;
      cursor: pointer;
      display: flex;
      font-size: 0.875rem;
      font-weight: 700;
      gap: 0.75rem;
      justify-content: space-between;
      min-height: 44px;
      padding: 0.5rem 1rem;
      text-align: left;
      width: 100%;
    }
    #qc-vd-toggle:focus-visible,
    .qc-vd-action:focus-visible {
      outline: 2px solid rgb(110 231 183);
      outline-offset: 2px;
    }
    .qc-vd-title {
      align-items: center;
      display: flex;
      gap: 0.5rem;
    }
    .qc-vd-dot {
      background: rgb(52 211 153);
      border-radius: 999px;
      box-shadow: 0 0 10px rgb(52 211 153);
      height: 0.5rem;
      width: 0.5rem;
    }
    #qc-vd-count {
      color: rgb(148 163 184);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.75rem;
    }
    #qc-vd-body {
      border-top: 1px solid rgb(51 65 85);
      max-height: min(70dvh, 36rem);
      overflow-y: auto;
      padding: 0.75rem 1rem;
    }
    #qc-vd-body[hidden] {
      display: none;
    }
    .qc-vd-help {
      color: rgb(203 213 225);
      font-size: 0.75rem;
      line-height: 1.25rem;
      margin: 0;
    }
    .qc-vd-metrics {
      display: grid;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.75rem;
      gap: 0.5rem 1rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 0.75rem 0 0;
    }
    .qc-vd-metrics div {
      min-width: 0;
    }
    .qc-vd-metrics dt {
      color: rgb(148 163 184);
    }
    .qc-vd-metrics dd {
      margin: 0.125rem 0 0;
      overflow-wrap: anywhere;
    }
    .qc-vd-actions {
      display: grid;
      gap: 0.5rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 1rem;
    }
    .qc-vd-action {
      align-items: center;
      background: transparent;
      border: 1px solid rgb(71 85 105);
      border-radius: 0.75rem;
      color: inherit;
      cursor: pointer;
      display: flex;
      font-size: 0.875rem;
      font-weight: 600;
      justify-content: center;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
    }
    #qc-vd-mark {
      background: rgb(253 224 71);
      border-color: rgb(253 224 71);
      color: rgb(2 6 23);
    }
    #qc-vd-copy {
      background: rgb(52 211 153);
      border-color: rgb(52 211 153);
      color: rgb(2 6 23);
    }
    #qc-vd-status {
      color: rgb(110 231 183);
      font-size: 0.75rem;
      margin: 0.75rem 0 0;
    }
  `;
  document.head.appendChild(style);

  const createProbe = (name, cssText) => {
    const probe = document.createElement("div");
    probe.dataset.viewportDiagnosticsProbe = name;
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = `box-sizing:border-box;pointer-events:none;position:fixed;visibility:hidden;${cssText}`;
    document.body.appendChild(probe);
    return probe;
  };

  const probes = {
    dvh: createProbe("dvh", "height:100dvh;width:0"),
    svh: createProbe("svh", "height:100svh;width:0"),
    lvh: createProbe("lvh", "height:100lvh;width:0"),
    safeArea: createProbe(
      "safe-area",
      "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)"
    ),
  };

  const panel = document.createElement("aside");
  panel.id = "qc-viewport-diagnostics";
  panel.setAttribute("aria-label", "Viewport diagnostics");
  panel.dataset.testid = "viewport-diagnostics";
  panel.innerHTML = `
    <button id="qc-vd-toggle" type="button" aria-expanded="false" data-testid="viewport-diagnostics-toggle">
      <span class="qc-vd-title">
        <span class="qc-vd-dot" aria-hidden="true"></span>
        Viewport debug
        <span id="qc-vd-count">0</span>
      </span>
      <span id="qc-vd-chevron" aria-hidden="true">⌄</span>
    </button>
    <div id="qc-vd-body" hidden>
      <p class="qc-vd-help">
        Reproduce the blank scroll, tap Mark issue while it is visible, then copy
        or download the trace. No form values are recorded or uploaded.
      </p>
      <dl class="qc-vd-metrics">
        <div><dt>inner / visual</dt><dd id="qc-vd-heights" data-testid="viewport-diagnostics-heights">waiting</dd></div>
        <div><dt>document height</dt><dd id="qc-vd-document-height">waiting</dd></div>
        <div><dt>scroll / max</dt><dd id="qc-vd-scroll">waiting</dd></div>
        <div><dt>nav gap L / V</dt><dd id="qc-vd-nav-gaps" data-testid="viewport-diagnostics-nav-gaps">waiting</dd></div>
        <div><dt>dvh / svh / lvh</dt><dd id="qc-vd-units">waiting</dd></div>
        <div><dt>safe bottom</dt><dd id="qc-vd-safe-bottom">waiting</dd></div>
        <div><dt>focus</dt><dd id="qc-vd-focus">none</dd></div>
        <div><dt>last event</dt><dd id="qc-vd-last-event">waiting</dd></div>
      </dl>
      <div class="qc-vd-actions">
        <button id="qc-vd-mark" class="qc-vd-action" type="button" data-testid="viewport-diagnostics-mark">Mark issue</button>
        <button id="qc-vd-copy" class="qc-vd-action" type="button" data-testid="viewport-diagnostics-copy">Copy log</button>
        <button id="qc-vd-download" class="qc-vd-action" type="button" data-testid="viewport-diagnostics-download">Download</button>
        <button id="qc-vd-clear" class="qc-vd-action" type="button" data-testid="viewport-diagnostics-clear">Clear</button>
      </div>
      <p id="qc-vd-status" aria-live="polite">Recording</p>
    </div>
  `;
  document.body.appendChild(panel);

  const byId = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const element = byId(id);
    if (element) {
      element.textContent = String(value);
    }
  };

  const captureSnapshot = () => {
    const root = document.documentElement;
    const body = document.body;
    const scrollingElement = document.scrollingElement;
    const visualViewport = window.visualViewport;
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const appShellMetrics = getElementMetrics(
      document.querySelector("[data-app-shell]")
    );
    const navigationMetrics = getElementMetrics(
      document.querySelector("[data-mobile-navigation]")
    );
    const safeAreaStyles = window.getComputedStyle(probes.safeArea);
    const visualBottom = visualViewport
      ? visualViewport.offsetTop + visualViewport.height
      : null;
    const appShellAbsoluteBottom =
      appShellMetrics?.bottom != null
        ? appShellMetrics.bottom + window.scrollY
        : null;
    const bodyMetrics = getElementMetrics(body);

    return {
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        scrollX: round(window.scrollX) ?? 0,
        scrollY: round(window.scrollY) ?? 0,
        devicePixelRatio: round(window.devicePixelRatio) ?? 1,
      },
      visualViewport: {
        width: round(visualViewport?.width),
        height: round(visualViewport?.height),
        offsetLeft: round(visualViewport?.offsetLeft),
        offsetTop: round(visualViewport?.offsetTop),
        pageLeft: round(visualViewport?.pageLeft),
        pageTop: round(visualViewport?.pageTop),
        scale: round(visualViewport?.scale),
      },
      document: {
        clientWidth: root.clientWidth,
        clientHeight: root.clientHeight,
        scrollWidth: root.scrollWidth,
        scrollHeight: root.scrollHeight,
        scrollTop: round(scrollingElement?.scrollTop) ?? 0,
        maxScrollY: Math.max(0, root.scrollHeight - window.innerHeight),
        scrollingElement: scrollingElement?.tagName.toLowerCase() ?? null,
      },
      body: {
        ...bodyMetrics,
        scrollHeight: body.scrollHeight,
      },
      appShell: appShellMetrics,
      contentShell: getElementMetrics(
        document.querySelector("[data-content-shell]")
      ),
      main: getElementMetrics(document.querySelector("main")),
      footer: getElementMetrics(document.querySelector("footer")),
      mobileNavigation: navigationMetrics,
      viewportProbes: {
        dvh: round(probes.dvh.getBoundingClientRect().height),
        svh: round(probes.svh.getBoundingClientRect().height),
        lvh: round(probes.lvh.getBoundingClientRect().height),
        safeAreaTop: parsePixels(safeAreaStyles.paddingTop),
        safeAreaRight: parsePixels(safeAreaStyles.paddingRight),
        safeAreaBottom: parsePixels(safeAreaStyles.paddingBottom),
        safeAreaLeft: parsePixels(safeAreaStyles.paddingLeft),
      },
      derived: {
        layoutMinusVisualHeight:
          visualViewport?.height != null
            ? round(window.innerHeight - visualViewport.height)
            : null,
        navigationGapFromLayoutBottom:
          navigationMetrics?.bottom != null
            ? round(window.innerHeight - navigationMetrics.bottom)
            : null,
        navigationGapFromVisualBottom:
          navigationMetrics?.bottom != null && visualBottom != null
            ? round(visualBottom - navigationMetrics.bottom)
            : null,
        documentTailAfterAppShell:
          appShellAbsoluteBottom != null
            ? round(root.scrollHeight - appShellAbsoluteBottom)
            : null,
      },
      focus: {
        tag: activeElement?.tagName.toLowerCase() ?? null,
        id: activeElement?.id || null,
        type:
          activeElement instanceof HTMLInputElement ? activeElement.type : null,
        role: activeElement?.getAttribute("role") ?? null,
      },
      dialogCount: document.querySelectorAll('[role="dialog"]').length,
      visibilityState: document.visibilityState,
      orientation: {
        angle: round(window.screen.orientation?.angle),
        type: window.screen.orientation?.type ?? null,
      },
    };
  };

  const renderSnapshot = (entry) => {
    const snapshot = entry.snapshot;
    setText("qc-vd-count", entries.length);
    setText(
      "qc-vd-heights",
      `${snapshot.window.innerHeight} / ${snapshot.visualViewport.height ?? "n/a"}`
    );
    setText("qc-vd-document-height", snapshot.document.scrollHeight);
    setText(
      "qc-vd-scroll",
      `${snapshot.window.scrollY} / ${snapshot.document.maxScrollY}`
    );
    setText(
      "qc-vd-nav-gaps",
      `${snapshot.derived.navigationGapFromLayoutBottom ?? "n/a"} / ${snapshot.derived.navigationGapFromVisualBottom ?? "n/a"}`
    );
    setText(
      "qc-vd-units",
      `${snapshot.viewportProbes.dvh ?? "n/a"} / ${snapshot.viewportProbes.svh ?? "n/a"} / ${snapshot.viewportProbes.lvh ?? "n/a"}`
    );
    setText(
      "qc-vd-safe-bottom",
      snapshot.viewportProbes.safeAreaBottom ?? "n/a"
    );
    setText(
      "qc-vd-focus",
      snapshot.focus.tag
        ? `${snapshot.focus.tag}${snapshot.focus.id ? `#${snapshot.focus.id}` : ""}`
        : "none"
    );
    setText("qc-vd-last-event", entry.event);
  };

  const pushEntry = (entry) => {
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) {
      entries.splice(0, entries.length - MAX_ENTRIES);
    }
  };

  const capture = (event) => {
    const entry = {
      sequence: ++sequence,
      event,
      elapsedMs: round(performance.now() - startedAt) ?? 0,
      snapshot: captureSnapshot(),
    };
    pushEntry(entry);
    renderSnapshot(entry);
  };

  const scheduleCapture = (event) => {
    pendingEvents.add(event);
    if (animationFrame != null) {
      return;
    }

    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = null;
      const events = Array.from(pendingEvents);
      pendingEvents.clear();
      capture(events.join("+"));
    });
  };

  const scheduleDelayedCapture = (event, delay) => {
    window.setTimeout(() => scheduleCapture(`${event}+${delay}ms`), delay);
  };

  const redactPathname = (pathname) =>
    pathname.replace(/\/s\/[^/]+(?=\/|$)/, "/s/:shortCode");

  const buildLog = () => ({
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    route: redactPathname(window.location.pathname),
    environment: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      standalone:
        ("standalone" in navigator && Boolean(navigator.standalone)) ||
        window.matchMedia("(display-mode: standalone)").matches,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
      },
      cssSupport: {
        dvh: CSS.supports("height", "100dvh"),
        svh: CSS.supports("height", "100svh"),
        lvh: CSS.supports("height", "100lvh"),
      },
    },
    entryCount: entries.length,
    entries,
  });

  const setStatus = (status) => setText("qc-vd-status", status);

  const copyLog = async () => {
    capture("manual.copy");
    const value = JSON.stringify(buildLog(), null, 2);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.readOnly = true;
        textarea.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(textarea);
        try {
          textarea.select();
          if (!document.execCommand("copy")) {
            throw new Error("Clipboard copy was not available.");
          }
        } finally {
          textarea.remove();
        }
      }
      setStatus("Copied");
    } catch {
      setStatus("Copy failed — use Download");
    }
  };

  const downloadLog = () => {
    capture("manual.download");
    const blob = new Blob([JSON.stringify(buildLog(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qurancircle-viewport-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus("Downloaded");
  };

  byId("qc-vd-toggle")?.addEventListener("click", () => {
    const body = byId("qc-vd-body");
    const toggle = byId("qc-vd-toggle");
    if (!body || !toggle) {
      return;
    }

    const expanded = body.hidden;
    body.hidden = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    setText("qc-vd-chevron", expanded ? "⌃" : "⌄");
  });
  byId("qc-vd-mark")?.addEventListener("click", () => {
    capture("manual.issue-visible");
    setStatus("Issue marked");
  });
  byId("qc-vd-copy")?.addEventListener("click", () => void copyLog());
  byId("qc-vd-download")?.addEventListener("click", downloadLog);
  byId("qc-vd-clear")?.addEventListener("click", () => {
    entries.length = 0;
    sequence = 0;
    startedAt = performance.now();
    capture("manual.clear");
    setStatus("Cleared");
  });

  window.addEventListener("resize", () => scheduleCapture("window.resize"), {
    passive: true,
  });
  window.addEventListener("scroll", () => scheduleCapture("window.scroll"), {
    passive: true,
  });
  window.addEventListener(
    "orientationchange",
    () => scheduleCapture("orientationchange"),
    { passive: true }
  );
  window.addEventListener("pageshow", (event) =>
    scheduleCapture(event.persisted ? "pageshow.persisted" : "pageshow")
  );
  window.addEventListener("pagehide", (event) =>
    capture(event.persisted ? "pagehide.persisted" : "pagehide")
  );
  document.addEventListener("visibilitychange", () =>
    scheduleCapture("visibilitychange")
  );
  document.addEventListener("focusin", () => {
    scheduleCapture("focusin");
    scheduleDelayedCapture("focusin", 300);
  });
  document.addEventListener("focusout", () => {
    scheduleCapture("focusout");
    scheduleDelayedCapture("focusout", 100);
    scheduleDelayedCapture("focusout", 500);
    scheduleDelayedCapture("focusout", 1000);
  });
  window.visualViewport?.addEventListener(
    "resize",
    () => scheduleCapture("visualViewport.resize"),
    { passive: true }
  );
  window.visualViewport?.addEventListener(
    "scroll",
    () => scheduleCapture("visualViewport.scroll"),
    { passive: true }
  );
  window.visualViewport?.addEventListener(
    "scrollend",
    () => scheduleCapture("visualViewport.scrollend"),
    { passive: true }
  );

  let lastDialogCount = document.querySelectorAll('[role="dialog"]').length;
  new MutationObserver(() => {
    const dialogCount = document.querySelectorAll('[role="dialog"]').length;
    if (dialogCount !== lastDialogCount) {
      lastDialogCount = dialogCount;
      scheduleCapture("dialog-count-change");
    }
  }).observe(document.body, { childList: true, subtree: true });

  window.__QC_VIEWPORT_DIAGNOSTICS__ = {
    capture,
    exportLog: buildLog,
  };

  scheduleCapture("init");
})();
