// Content script for chatgpt.com/codex/settings/usage
// Extracts: 5-hour limit %, weekly limit %, code review %, reset time

(function() {
  'use strict';

  function extract() {
    const data = { name: 'ChatGPT Codex', plan: 'Plus', metrics: [] };

    try {
      const text = document.body.innerText;

      // Chinese UI: "X% 剩余" appears multiple times
      // Order: 5小时使用限额, 每周使用限额, 代码审查
      const remainAll = [...text.matchAll(/(\d+)%\s*剩余/g)];
      
      // Reset time: "重置时间：2026年4月2日 9:54" or "重置时间: ..."
      const resetMatch = text.match(/重置时间[：:]\s*(.+?)(?:\n|$)/i);
      const resetInfo = resetMatch ? resetMatch[1].trim() : '';

      const labels = ['本窗口剩余', '每周剩余', '代码审查'];

      remainAll.forEach((m, i) => {
        const remain = parseInt(m[1]);
        data.metrics.push({
          label: labels[i] || `限额 ${i + 1}`,
          usedPercent: 100 - remain,
          remainPercent: remain,
          resetInfo: i === 1 ? resetInfo : '' // weekly gets the reset time
        });
      });

      // English fallback: "X% used" / "X% remaining"
      if (data.metrics.length === 0) {
        const usedAll = [...text.matchAll(/(\d+)%\s*(used|remaining)/gi)];
        usedAll.forEach((m, i) => {
          const val = parseInt(m[1]);
          const isRemain = /remaining/i.test(m[2]);
          data.metrics.push({
            label: labels[i] || `Limit ${i + 1}`,
            usedPercent: isRemain ? 100 - val : val,
            remainPercent: isRemain ? val : 100 - val,
            resetInfo: ''
          });
        });
      }

      // Detect plan
      if (/Pro\b/.test(text) && !/Pro 剩余/.test(text)) data.plan = 'Pro';
      if (/Team\b/.test(text)) data.plan = 'Team';
      if (/Enterprise/i.test(text)) data.plan = 'Enterprise';

    } catch (e) {
      console.error('[AI Usage Monitor] Codex extract error:', e);
    }
    return data;
  }

  function send() {
    const data = extract();
    if (data.metrics.length > 0) {
      chrome.runtime.sendMessage({ type: 'USAGE_DATA', service: 'codex', data });
      console.log('[AI Usage Monitor] Codex →', data);
    } else {
      console.warn('[AI Usage Monitor] Codex: no data, retrying…');
      setTimeout(send, 5000);
    }
  }

  setTimeout(send, 3000);
})();
