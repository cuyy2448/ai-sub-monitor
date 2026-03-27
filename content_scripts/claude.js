// Content script for claude.ai/settings/usage
// Extracts: session usage %, weekly usage %, reset times

(function() {
  'use strict';

  function extract() {
    const data = { name: 'Claude', plan: 'Pro', metrics: [] };

    try {
      const text = document.body.innerText;

      // "X% used" appears twice: first for session, second for weekly
      const usedAll = [...text.matchAll(/(\d+)%\s*used/gi)];
      // "Resets in X hr Y min" or "Resets Mon 10:00 PM"
      const resetAll = [...text.matchAll(/Resets?\s+(?:in\s+)?(.+?)(?:\n|$)/gi)];

      // Session (Current session)
      if (usedAll[0]) {
        const pct = parseInt(usedAll[0][1]);
        const reset = resetAll[0] ? resetAll[0][1].trim() : '';
        data.metrics.push({
          label: '本窗口剩余',
          usedPercent: pct,
          remainPercent: 100 - pct,
          resetInfo: reset
        });
      }

      // Weekly (All models)
      if (usedAll[1]) {
        const pct = parseInt(usedAll[1][1]);
        const reset = resetAll[1] ? resetAll[1][1].trim() : '';
        data.metrics.push({
          label: '每周剩余',
          usedPercent: pct,
          remainPercent: 100 - pct,
          resetInfo: reset
        });
      }

      // Fallback: progress bars
      if (data.metrics.length === 0) {
        document.querySelectorAll('[role="progressbar"]').forEach((bar, i) => {
          const val = parseFloat(bar.getAttribute('aria-valuenow') || bar.style.width);
          if (!isNaN(val)) {
            data.metrics.push({
              label: i === 0 ? '本窗口剩余' : '每周剩余',
              usedPercent: val,
              remainPercent: 100 - val,
              resetInfo: ''
            });
          }
        });
      }

      // Try to detect plan tier
      if (/Max\b/.test(text)) data.plan = 'Max';
      else if (/Team\b/.test(text)) data.plan = 'Team';

    } catch (e) {
      console.error('[AI Usage Monitor] Claude extract error:', e);
    }
    return data;
  }

  function send() {
    const data = extract();
    if (data.metrics.length > 0) {
      chrome.runtime.sendMessage({ type: 'USAGE_DATA', service: 'claude', data });
      console.log('[AI Usage Monitor] Claude →', data);
    } else {
      console.warn('[AI Usage Monitor] Claude: no data found, retrying in 5s…');
      setTimeout(send, 5000);
    }
  }

  // SPA needs time to render
  setTimeout(send, 3000);
})();
