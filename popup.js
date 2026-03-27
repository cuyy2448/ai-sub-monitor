// popup.js - Dashboard renderer

const SVCS = {
  claude: {
    name: 'Claude',
    icon: 'C',
    cls: 'claude',
    url: 'https://claude.ai/settings/usage',
    plan: 'Pro'
  },
  codex: {
    name: 'ChatGPT Codex',
    icon: 'G',
    cls: 'codex',
    url: 'https://chatgpt.com/codex/settings/usage',
    plan: 'Plus'
  },
  kimi: {
    name: 'Kimi Code',
    icon: 'K',
    cls: 'kimi',
    url: 'https://kimi.com/code/console?from=kfc_overview_topbar',
    plan: 'Pro'
  }
};

const esc = (s) => {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
};

function color(remain) {
  if (remain <= 5) return 'red';
  if (remain <= 20) return 'amber';
  return 'green';
}

function ago(ts) {
  if (!ts) return '从未';
  const s = (Date.now() - ts) / 1000 | 0;
  if (s < 60) return '刚刚';
  const m = s / 60 | 0;
  if (m < 60) return `${m} 分钟前`;
  const h = m / 60 | 0;
  if (h < 24) return `${h} 小时前`;
  return `${(h / 24) | 0} 天前`;
}

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('zh-CN', {
    hour12: false,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function pickSession(metrics) {
  return metrics.find((m) => /session|窗口|5.*小时|频限|频率|current/i.test(m.label)) || null;
}

function pickWeekly(metrics) {
  return metrics.find((m) => /week|每周|周|本周/i.test(m.label)) || null;
}

function renderCard(key, data) {
  const cfg = SVCS[key];
  const metrics = data?.metrics || [];
  const plan = data?.plan || cfg.plan;
  const fetchedAt = data?.fetchedAt || null;
  const hasData = metrics.length > 0;

  const sess = pickSession(metrics);
  const week = pickWeekly(metrics);
  const m0 = metrics[0] || null;
  const m1 = metrics[1] || null;
  const dispSess = sess || m0;
  const dispWeek = week || (sess ? m1 : null) || m1;

  let worst = 100;
  metrics.forEach((m) => {
    if (m.remainPercent < worst) worst = m.remainPercent;
  });
  const lampCls = hasData ? color(worst) : 'green';

  let badgeCls = 'ok';
  let badgeTxt = '正常';
  if (worst <= 5) {
    badgeCls = 'crit';
    badgeTxt = '紧急';
  } else if (worst <= 20) {
    badgeCls = 'warn';
    badgeTxt = '注意';
  }

  const sRemain = dispSess ? dispSess.remainPercent : null;
  const sUsed = dispSess ? dispSess.usedPercent : 0;
  const sColor = sRemain !== null ? color(sRemain) : '';
  const sLabel = dispSess ? esc(dispSess.label) : '本窗口剩余';

  const wRemain = dispWeek ? dispWeek.remainPercent : null;
  const wUsed = dispWeek ? dispWeek.usedPercent : 0;
  const wColor = wRemain !== null ? color(wRemain) : '';
  const wLabel = dispWeek ? esc(dispWeek.label) : '周度剩余';

  const resetStr = (dispWeek?.resetInfo || dispSess?.resetInfo || '').trim();

  if (!hasData) {
    return `
    <div class="card">
      <div class="c-head">
        <div class="c-svc">
          <div class="lamp green"></div>
          <div class="c-ico ${cfg.cls}">${cfg.icon}</div>
          <div class="c-info">
            <div class="c-name">${cfg.name}</div>
            <div class="c-plan">${esc(plan)}</div>
          </div>
        </div>
        <a class="c-link" data-url="${cfg.url}">打开 →</a>
      </div>
      <div class="c-empty">尚未抓取 — <a data-url="${cfg.url}">访问 usage 页面自动获取</a></div>
      <div class="c-foot">
        <span class="c-foot-l">抓取：从未</span>
        <span class="c-badge ok">等待</span>
      </div>
    </div>`;
  }

  return `
  <div class="card">
    <div class="c-head">
      <div class="c-svc">
        <div class="lamp ${lampCls}"></div>
        <div class="c-ico ${cfg.cls}">${cfg.icon}</div>
        <div class="c-info">
          <div class="c-name">${cfg.name}</div>
          <div class="c-plan">${esc(plan)}</div>
        </div>
      </div>
      <a class="c-link" data-url="${cfg.url}">打开 →</a>
    </div>

    <div class="c-grid">
      <div class="g-cell">
        <div class="g-lbl">${sLabel}</div>
        <div class="g-val ${sColor}">${sRemain !== null ? `${sRemain}%` : '—'}</div>
        ${sRemain !== null ? `<div class="g-bar"><div class="g-fill ${sColor}" style="width:${sUsed}%"></div></div>` : ''}
      </div>

      <div class="g-cell">
        <div class="g-lbl">${wLabel}</div>
        <div class="g-val ${wColor}">${wRemain !== null ? `${wRemain}%` : '—'}</div>
        ${wRemain !== null ? `<div class="g-bar"><div class="g-fill ${wColor}" style="width:${wUsed}%"></div></div>` : ''}
      </div>

      <div class="g-cell">
        <div class="g-lbl">下次重置</div>
        <div class="g-val mute">${resetStr || '—'}</div>
      </div>

      <div class="g-cell">
        <div class="g-lbl">最近抓取</div>
        <div class="g-val mute">${ago(fetchedAt)}</div>
        ${fetchedAt ? `<div class="g-sub">${fmtDate(fetchedAt)}</div>` : ''}
      </div>

      <div class="g-cell">
        <div class="g-lbl">状态灯</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
          <div class="lamp ${lampCls}" style="position:static"></div>
          <span class="g-val mute">${lampCls === 'green' ? '正常' : lampCls === 'amber' ? '注意' : '紧急'}</span>
        </div>
      </div>

      <div class="g-cell">
        <div class="g-lbl">当前套餐</div>
        <div class="g-val mute">${esc(plan)}</div>
      </div>
    </div>

    <div class="c-foot">
      <span class="c-foot-l">更新于 ${ago(fetchedAt)}</span>
      <span class="c-badge ${badgeCls}">${badgeTxt}</span>
    </div>
  </div>`;
}

function render() {
  chrome.storage.local.get(['usageData', 'notifyEnabled'], (r) => {
    const usage = r.usageData || {};
    const notifyOn = r.notifyEnabled !== false;

    document.getElementById('cards').innerHTML =
      Object.keys(SVCS).map((k) => renderCard(k, usage[k] || null)).join('');

    const connected = Object.keys(usage).filter((k) => usage[k]?.metrics?.length).length;
    const total = Object.keys(SVCS).length;
    let worst = 100;
    let worstName = '';

    for (const k of Object.keys(usage)) {
      for (const m of usage[k]?.metrics || []) {
        if (m.remainPercent < worst) {
          worst = m.remainPercent;
          worstName = SVCS[k]?.name || k;
        }
      }
    }

    let st = `${connected}/${total} 服务已连接`;
    if (!connected) st = '尚无数据，请访问各平台 usage 页面';
    else if (worst <= 20) st += ` · ${worstName} 剩余 ${worst}%`;
    document.getElementById('statusText').textContent = st;

    const pulse = document.getElementById('globalPulse');
    pulse.className = `hdr-pulse ${!connected ? 'ok' : worst <= 10 ? 'err' : worst <= 20 ? 'warn' : 'ok'}`;

    const notifyBtn = document.getElementById('notifyBtn');
    notifyBtn.className = notifyOn ? 't-btn on' : 't-btn';
    notifyBtn.textContent = notifyOn ? '🔔 告警' : '🔕 静音';
  });
}

function renderAlertLog() {
  chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (res) => {
    const history = (res?.history || []).slice().reverse();
    const log = document.getElementById('alLog');
    if (!history.length) {
      log.innerHTML = '<div class="al-none">暂无告警记录</div>';
      return;
    }

    log.innerHTML = history.map((h) => {
      const name = SVCS[h.service]?.name || h.service;
      const dotCls = h.threshold <= 5 ? 't5' : h.threshold <= 10 ? 't10' : 't20';
      const time = fmtDate(h.ts);
      return `<div class="al-item">
        <div class="al-dot ${dotCls}"></div>
        <span>${time} · ${name} · ${esc(h.label)} 剩余 ${h.remain}%（阈值 ${h.threshold}%）</span>
      </div>`;
    }).join('');
  });
}

document.getElementById('notifyBtn').addEventListener('click', () => {
  chrome.storage.local.get(['notifyEnabled'], (r) => {
    const next = !(r.notifyEnabled !== false);
    chrome.runtime.sendMessage({ type: 'TOGGLE_NOTIFY', enabled: next }, () => {
      chrome.storage.local.set({ notifyEnabled: next }, render);
    });
  });
});

document.getElementById('resetBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'RESET_ALERTS' }, () => {
    const btn = document.getElementById('resetBtn');
    btn.textContent = '✓ 已重置';
    btn.style.color = 'var(--grn)';
    setTimeout(() => {
      btn.textContent = '↻ 重置';
      btn.style.color = '';
    }, 1500);
    renderAlertLog();
  });
});

document.getElementById('alToggle').addEventListener('click', () => {
  const btn = document.getElementById('alToggle');
  const log = document.getElementById('alLog');
  const open = log.classList.toggle('show');
  btn.classList.toggle('open', open);
  if (open) renderAlertLog();
});

function tick() {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

tick();
setInterval(tick, 1000);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.usageData) render();
});

document.getElementById('cards').addEventListener('click', (e) => {
  const link = e.target.closest('[data-url]');
  if (!link || !link.dataset.url) return;
  e.preventDefault();
  e.stopPropagation();
  chrome.tabs.create({ url: link.dataset.url });
});

const refreshController = {
  busy: false,
  runId: 0,
  countdownTimer: null,
  pollTimer: null,
  restoreTimer: null
};

function refreshBtn() {
  return document.getElementById('refreshAllBtn');
}

function resetRefreshTimers() {
  if (refreshController.countdownTimer) {
    clearInterval(refreshController.countdownTimer);
    refreshController.countdownTimer = null;
  }
  if (refreshController.pollTimer) {
    clearInterval(refreshController.pollTimer);
    refreshController.pollTimer = null;
  }
  if (refreshController.restoreTimer) {
    clearTimeout(refreshController.restoreTimer);
    refreshController.restoreTimer = null;
  }
}

function paintRefreshButton(label, { busy = false, success = false } = {}) {
  const btn = refreshBtn();
  if (!btn) return;
  btn.textContent = label;
  btn.disabled = busy;
  btn.dataset.busy = busy ? '1' : '0';
  btn.style.opacity = busy ? '0.65' : '1';
  btn.style.color = success ? 'var(--grn)' : '';
}

function finishRefreshRun(runId, freshCount, totalCount) {
  if (runId !== refreshController.runId) return;

  console.log('[popup] done() freshCount=' + freshCount);
  resetRefreshTimers();
  refreshController.busy = false;

  chrome.runtime.sendMessage({ type: 'CLOSE_REFRESH_TABS' }, () => {
    if (chrome.runtime.lastError) {
      console.warn('[popup] CLOSE_REFRESH_TABS failed:', chrome.runtime.lastError.message);
    }
  });

  paintRefreshButton(
    freshCount >= totalCount ? '✅ 全部已刷新' : `✅ 已刷新 ${freshCount}/${totalCount}`,
    { success: true }
  );
  render();

  refreshController.restoreTimer = setTimeout(() => {
    if (runId !== refreshController.runId || refreshController.busy) return;
    paintRefreshButton('🔄 一键刷新');
  }, 2000);
}

function handleRefreshClick(event) {
  event.preventDefault();
  event.stopPropagation();

  console.log('[popup] doRefresh called, busy=' + refreshController.busy);
  if (refreshController.busy) {
    console.log('[popup] blocked - still busy');
    return;
  }

  resetRefreshTimers();
  refreshController.busy = true;
  refreshController.runId += 1;

  const runId = refreshController.runId;
  const svcKeys = Object.keys(SVCS);
  const urls = svcKeys.map((k) => SVCS[k].url);
  const startTime = Date.now();
  const deadline = startTime + 28000;

  const updateCountdown = () => {
    const secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    paintRefreshButton(`⏳ 刷新中 ${secondsLeft}s`, { busy: true });
    if (secondsLeft <= 0 && refreshController.countdownTimer) {
      clearInterval(refreshController.countdownTimer);
      refreshController.countdownTimer = null;
    }
  };

  updateCountdown();
  refreshController.countdownTimer = setInterval(() => {
    if (runId !== refreshController.runId) return;
    updateCountdown();
  }, 1000);

  refreshController.pollTimer = setInterval(() => {
    chrome.storage.local.get(['usageData'], (r) => {
      if (runId !== refreshController.runId) return;

      const usage = r.usageData || {};
      const fresh = svcKeys.filter((k) => usage[k]?.fetchedAt && usage[k].fetchedAt > startTime).length;
      console.log('[popup] poll: fresh=' + fresh + '/' + svcKeys.length);

      if (fresh >= svcKeys.length || Date.now() >= deadline) {
        finishRefreshRun(runId, fresh, svcKeys.length);
      }
    });
  }, 3000);

  chrome.runtime.sendMessage({ type: 'REFRESH_ALL', urls }, (res) => {
    if (runId !== refreshController.runId) return;
    if (chrome.runtime.lastError || !res?.ok) {
      console.warn('[popup] REFRESH_ALL failed:', chrome.runtime.lastError?.message || res);
      finishRefreshRun(runId, 0, svcKeys.length);
    }
  });
}

const refreshButton = refreshBtn();
if (refreshButton) {
  refreshButton.onclick = null;
  refreshButton.addEventListener('click', handleRefreshClick);
  paintRefreshButton('🔄 一键刷新');
}

render();
