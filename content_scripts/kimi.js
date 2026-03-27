// Content script for kimi.com/code/console
// Extracts: weekly usage %, rate limit %, plan tier, reset times
//
// Actual page innerText structure (as of 2026-03):
//   ...本周用量\n更多权益\n9%\n26小时后重置\n频限明细\n更多权益\n3%\n1小时后重置\n
//   我的权益\n查看权益\nAllegrett...\n...模型权限\nK2.5\n旗舰模型...

(function() {
  'use strict';

  function extract() {
    const data = { name: 'Kimi Code', plan: '', metrics: [] };

    try {
      const text = document.body.innerText;
      const lines = text.split(/\n/);

      const planMatch = text.match(/(Allegrett[eo]|Andante|Moderato|Vivace|Presto|Largo)/i);
      data.plan = planMatch ? planMatch[0] : 'Pro';

      function grabSection(anchorLabel) {
        let pct = null, reset = '';
        let found = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(anchorLabel)) {
            found = true;
            for (let j = i + 1; j < Math.min(i + 7, lines.length); j++) {
              const line = lines[j].trim();
              if (pct === null) {
                const pm = line.match(/^(\d+)%$/);
                if (pm) pct = parseInt(pm[1]);
              }
              if (!reset) {
                const rm = line.match(/(\d+)\s*小时后重置/);
                if (rm) reset = rm[1] + '小时后';
              }
              if (!reset) {
                const dm = line.match(/(\d+)\s*天后重置/);
                if (dm) reset = dm[1] + '天后';
              }
              if (pct !== null && reset) break;
            }
            break;
          }
        }
        return found ? { pct, reset } : null;
      }

      const weekly = grabSection('本周用量');
      if (weekly && weekly.pct !== null) {
        data.metrics.push({
          label: '本周用量',
          usedPercent: weekly.pct,
          remainPercent: 100 - weekly.pct,
          resetInfo: weekly.reset
        });
      }

      const rateLimit = grabSection('频限明细');
      if (rateLimit && rateLimit.pct !== null) {
        data.metrics.push({
          label: '频率限制',
          usedPercent: rateLimit.pct,
          remainPercent: 100 - rateLimit.pct,
          resetInfo: rateLimit.reset
        });
      }

      if (data.metrics.length === 0) {
        const allPcts = [...text.matchAll(/(\d+)%/g)];
        allPcts.slice(0, 2).forEach((m, i) => {
          const val = parseInt(m[1]);
          data.metrics.push({
            label: i === 0 ? '本周用量' : '频率限制',
            usedPercent: val,
            remainPercent: 100 - val,
            resetInfo: ''
          });
        });
      }

    } catch (e) {
      console.error('[AI Usage Monitor] Kimi extract error:', e);
    }
    return data;
  }

  console.log('[AI Usage Monitor] Kimi script loaded on:', location.href);

  if (!location.pathname.startsWith('/code/console')) {
    console.log('[AI Usage Monitor] Kimi: not on console page, skipping.');
    return;
  }

  let retries = 0;
  function send() {
    const data = extract();
    if (data.metrics.length > 0) {
      chrome.runtime.sendMessage({ type: 'USAGE_DATA', service: 'kimi', data });
      console.log('[AI Usage Monitor] Kimi ✓ data sent:', data);
    } else if (retries < 8) {
      retries++;
      console.warn(`[AI Usage Monitor] Kimi: no data (attempt ${retries}/8), retrying in 3s…`);
      setTimeout(send, 3000);
    } else {
      console.error('[AI Usage Monitor] Kimi: failed after 8 attempts. Page text sample:', document.body.innerText.slice(0, 200));
    }
  }

  setTimeout(send, 2000);
})();
