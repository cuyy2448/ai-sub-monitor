// background.js - Service worker
// Stores usage data, checks thresholds, and fires browser notifications.

const THRESHOLDS = [20, 10, 5];

const SVC_NAMES = {
  claude: 'Claude',
  codex: 'ChatGPT Codex',
  kimi: 'Kimi Code'
};

const SVC_URLS = {
  claude: 'https://claude.ai/settings/usage',
  codex: 'https://chatgpt.com/codex/settings/usage',
  kimi: 'https://kimi.com/code/console?from=kfc_overview_topbar'
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('staleCheck', { periodInMinutes: 30 });
  chrome.storage.local.get(['notifyEnabled', 'notifiedAlerts', 'alertHistory'], (r) => {
    const defaults = {};
    if (r.notifyEnabled === undefined) defaults.notifyEnabled = true;
    if (!r.notifiedAlerts) defaults.notifiedAlerts = {};
    if (!r.alertHistory) defaults.alertHistory = [];
    if (Object.keys(defaults).length) chrome.storage.local.set(defaults);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'staleCheck') return;

  chrome.storage.local.get(['lastUpdated'], (r) => {
    if ((Date.now() - (r.lastUpdated || 0)) > 3600000) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#facc15' });
    }
  });
});

function checkThresholds(serviceKey, metric, notified, enabled, history) {
  if (!enabled) return;

  const remain = metric.remainPercent;
  const name = SVC_NAMES[serviceKey] || serviceKey;

  for (const threshold of THRESHOLDS) {
    const key = `${serviceKey}|${metric.label}|${threshold}`;

    if (remain <= threshold && !notified[key]) {
      let icon = '⚠️';
      let priority = 1;

      if (threshold <= 5) {
        icon = '🔴';
        priority = 2;
      } else if (threshold <= 10) {
        icon = '🟠';
        priority = 2;
      }

      const nid = `alert-${serviceKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const resetLine = metric.resetInfo ? `\n重置: ${metric.resetInfo}` : '';

      chrome.notifications.create(nid, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `${icon} ${name} 用量告警`,
        message: `「${metric.label}」仅剩 ${remain}%\n告警阈值: ${threshold}%${resetLine}`,
        priority
      });

      notified[key] = Date.now();
      history.push({
        ts: Date.now(),
        service: serviceKey,
        label: metric.label,
        remain,
        threshold
      });

      if (history.length > 30) {
        history.splice(0, history.length - 30);
      }
    }

    if (remain > threshold + 2 && notified[key]) {
      delete notified[key];
    }
  }
}

function updateBadge(usageData) {
  let worst = 100;

  for (const key of Object.keys(usageData)) {
    for (const metric of usageData[key]?.metrics || []) {
      if (metric.remainPercent < worst) worst = metric.remainPercent;
    }
  }

  if (worst <= 10) {
    chrome.action.setBadgeText({ text: `${worst}%` });
    chrome.action.setBadgeBackgroundColor({ color: '#fb7185' });
  } else if (worst <= 20) {
    chrome.action.setBadgeText({ text: `${worst}%` });
    chrome.action.setBadgeBackgroundColor({ color: '#facc15' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === 'USAGE_DATA') {
    chrome.storage.local.get(['usageData', 'notifiedAlerts', 'notifyEnabled', 'alertHistory'], (r) => {
      const usage = r.usageData || {};
      const notified = r.notifiedAlerts || {};
      const enabled = r.notifyEnabled !== false;
      const history = r.alertHistory || [];

      usage[msg.service] = { ...msg.data, fetchedAt: Date.now() };

      for (const metric of msg.data.metrics || []) {
        checkThresholds(msg.service, metric, notified, enabled, history);
      }

      updateBadge(usage);

      chrome.storage.local.set({
        usageData: usage,
        notifiedAlerts: notified,
        alertHistory: history,
        lastUpdated: Date.now()
      }, () => reply({ ok: true }));
    });
    return true;
  }

  if (msg.type === 'TOGGLE_NOTIFY') {
    chrome.storage.local.set({ notifyEnabled: msg.enabled }, () => reply({ ok: true }));
    return true;
  }

  if (msg.type === 'RESET_ALERTS') {
    chrome.storage.local.set({ notifiedAlerts: {}, alertHistory: [] }, () => reply({ ok: true }));
    return true;
  }

  if (msg.type === 'GET_HISTORY') {
    chrome.storage.local.get(['alertHistory'], (r) => reply({ history: r.alertHistory || [] }));
    return true;
  }

  if (msg.type === 'REFRESH_ALL') {
    const tabIds = [];
    let opened = 0;
    const urls = msg.urls || [];

    urls.forEach((url) => {
      chrome.tabs.create({ url, active: false }, (tab) => {
        if (tab?.id !== undefined) tabIds.push(tab.id);
        opened += 1;

        if (opened === urls.length) {
          chrome.storage.local.set({ refreshTabIds: tabIds });

          setTimeout(() => {
            chrome.storage.local.get(['refreshTabIds'], (r) => {
              for (const id of r.refreshTabIds || []) {
                chrome.tabs.remove(id, () => {
                  if (chrome.runtime.lastError) {}
                });
              }
              chrome.storage.local.remove('refreshTabIds');
            });
          }, 30000);

          reply({ ok: true, tabIds });
        }
      });
    });

    return true;
  }

  if (msg.type === 'CLOSE_REFRESH_TABS') {
    chrome.storage.local.get(['refreshTabIds'], (r) => {
      for (const id of r.refreshTabIds || []) {
        chrome.tabs.remove(id, () => {
          if (chrome.runtime.lastError) {}
        });
      }
      chrome.storage.local.remove('refreshTabIds');
      reply({ ok: true });
    });
    return true;
  }
});

chrome.notifications.onClicked.addListener((nid) => {
  for (const [key, url] of Object.entries(SVC_URLS)) {
    if (nid.includes(key)) {
      chrome.tabs.create({ url });
      return;
    }
  }
});
