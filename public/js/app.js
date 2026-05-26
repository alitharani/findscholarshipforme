'use strict';

// ── Groq API key (free — get from console.groq.com) ──
var GROQ_KEY = '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';

// ── STATE ─────────────────────────────────────────
var state = {
  profile: null,
  history: [],
  plan: 'free',
  usage: { used: 0, limit: 5 },
  tasks: [
    { text: 'Register for IELTS / English test', due: 'urgent', done: false },
    { text: 'Request official transcripts', due: 'urgent', done: false },
    { text: 'Get 2 recommendation letters', due: 'soon', done: false },
    { text: 'Draft Statement of Purpose', due: 'soon', done: false },
    { text: 'Scan passport + ID documents', due: 'ok', done: true },
    { text: 'Shortlist top 3 scholarships', due: 'ok', done: true }
  ],
  obStep: 0
};

var PLAN_LIMITS = { free: 5, pro: 999999, elite: 999999 };
var PLAN_LABELS = { free: 'Free', pro: 'Pro', elite: 'Elite' };

// ── UTILS ─────────────────────────────────────────
var $ = function(id) { return document.getElementById(id); };
function esc(t) { return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }
function show(id) { var el=$(id); if(el){ el.style.display=''; el.classList.remove('pg-hidden'); } }
function hide(id) { var el=$(id); if(el) el.classList.add('pg-hidden'); }
function now() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function greet() { var h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; }
function saveProfile(p) { try{ localStorage.setItem('fsmf_v3',JSON.stringify(p)); }catch(e){} }
function loadProfile() { try{ var s=localStorage.getItem('fsmf_v3'); return s?JSON.parse(s):null; }catch(e){ return null; } }
function clearProfile() { try{ localStorage.removeItem('fsmf_v3'); }catch(e){} }
function loadPlan() { try{ return localStorage.getItem('fsmf_plan')||'free'; }catch(e){ return 'free'; } }

// ── GROQ API CALL ─────────────────────────────────
function callGroq(messages, onReply) {
  fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_KEY
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: messages
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if(d.choices && d.choices[0]) {
      onReply(null, d.choices[0].message.content);
    } else {
      onReply('No response from AI');
    }
  })
  .catch(function(e) {
    onReply(e.message || 'Connection error');
  });
}

// ── USAGE TRACKING (localStorage) ────────────────
function getTodayKey() {
  return 'usage_' + new Date().toISOString().split('T')[0];
}
function getUsed() {
  try { return parseInt(localStorage.getItem(getTodayKey()) || '0'); } catch(e) { return 0; }
}
function incrementUsed() {
  try { localStorage.setItem(getTodayKey(), getUsed() + 1); } catch(e) {}
}

// ── APP ───────────────────────────────────────────
var APP = {
  startOnboarding: function() {
    hide('pg-landing'); show('pg-onboard');
    OB.reset(); window.scrollTo(0,0);
  },
  backToLanding: function() {
    hide('pg-onboard'); show('pg-landing');
  },
  launch: function() {
    var p = OB.collect();
    if(!p) { alert('Please fill in all fields.'); return; }
    state.profile = p;
    saveProfile(p);
    hide('pg-onboard'); show('pg-agent');
    DASH.init(); window.scrollTo(0,0);
  },
  reset: function() {
    if(!confirm('Reset your profile and start over?')) return;
    clearProfile(); state.profile=null; state.history=[];
    hide('pg-agent'); show('pg-landing'); window.scrollTo(0,0);
  }
};

// ── ONBOARDING ────────────────────────────────────
var OB = {
  reset: function() {
    state.obStep = 0;
    document.querySelectorAll('.ob-step').forEach(function(s) { s.classList.remove('active'); });
    var s0 = $('obs-0'); if(s0) s0.classList.add('active');
    OB.updatePips(0);
  },
  go: function(n) {
    $('obs-'+state.obStep) && $('obs-'+state.obStep).classList.remove('active');
    state.obStep = n;
    $('obs-'+n) && $('obs-'+n).classList.add('active');
    OB.updatePips(n);
    var whys = [
      'We use your profile to find scholarships you actually qualify for.',
      'Your academic score determines which scholarships you are eligible for.',
      'Country and degree preferences narrow down the best opportunities.',
      'Your agent name makes the experience personal and memorable.'
    ];
    var wt = $('ob-why-text'); if(wt) wt.textContent = whys[n] || whys[0];
  },
  updatePips: function(current) {
    document.querySelectorAll('.ob-pip').forEach(function(p,i) {
      p.classList.toggle('ob-pip-active', i <= current);
    });
  },
  getChip: function(gid) {
    var el = document.querySelector('#'+gid+' .chip.on');
    return el ? el.textContent.trim() : '';
  },
  getChips: function(gid) {
    return Array.from(document.querySelectorAll('#'+gid+' .chip.on')).map(function(e) { return e.textContent.trim(); });
  },
  collect: function() {
    var name = ($('f-name')||{}).value || '';
    if(!name.trim()) { alert('Please enter your name.'); return null; }
    var dests = OB.getChips('cg-dest');
    var initials = name.trim().split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2) || 'ST';
    return {
      name: name.trim(),
      age: ($('f-age')||{}).value || '21',
      country: ($('f-country')||{}).value || 'Pakistan',
      finance: ($('f-finance')||{}).value || 'low',
      qual: ($('f-qual')||{}).value || "Bachelor's degree",
      field: ($('f-field')||{}).value || 'Engineering',
      gpa: ($('f-gpa')||{}).value || '75',
      eng: OB.getChip('cg-eng') || 'IELTS 6.0-7.0',
      level: OB.getChip('cg-level') || "Bachelor's",
      dests: dests.length ? dests.join(', ') : 'Open to any',
      agentName: ($('f-agent')||{}).value || 'Nova',
      initials: initials
    };
  }
};

// ── CHIPS ─────────────────────────────────────────
var CHIPS = {
  solo: function(el, gid) {
    document.querySelectorAll('#'+gid+' .chip').forEach(function(c) { c.classList.remove('on'); });
    el.classList.add('on');
  },
  multi: function(el) { el.classList.toggle('on'); }
};

// ── FAQ ───────────────────────────────────────────
var FAQ = {
  toggle: function(btn) {
    btn.classList.toggle('open');
    btn.nextElementSibling.classList.toggle('open');
  }
};

// ── UPGRADE MODAL ─────────────────────────────────
var MODAL = {
  show: function(reason) {
    var existing = $('upgrade-modal');
    if(existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'upgrade-modal';
    modal.innerHTML =
      '<div class="modal-overlay" onclick="MODAL.close()"></div>' +
      '<div class="modal-box">' +
        '<button class="modal-close" onclick="MODAL.close()"><i class="ti ti-x"></i></button>' +
        '<div class="modal-icon"><i class="ti ti-rocket"></i></div>' +
        '<h3 class="modal-title">You\'ve used all 5 free messages today</h3>' +
        '<p class="modal-desc">' + (reason || 'Upgrade to Pro for unlimited access.') + '</p>' +
        '<div class="modal-timer"><i class="ti ti-clock"></i> Free messages reset in: <strong id="reset-timer">--:--:--</strong></div>' +
        '<div class="modal-plans">' +
          '<div class="modal-plan"><div class="mp-name">Free</div><div class="mp-price">$0</div><div class="mp-detail">5 messages/day</div><button class="mp-btn mp-btn-ghost" onclick="MODAL.close()">Current plan</button></div>' +
          '<div class="modal-plan modal-plan-featured"><div class="mp-badge">Most popular</div><div class="mp-name">Pro</div><div class="mp-price">$9<span>/mo</span></div><div class="mp-detail">Unlimited messages</div><button class="mp-btn mp-btn-pro" onclick="MODAL.goPro()">Upgrade to Pro</button></div>' +
          '<div class="modal-plan"><div class="mp-name">Elite</div><div class="mp-price">$19<span>/mo</span></div><div class="mp-detail">Pro + human review</div><button class="mp-btn mp-btn-elite" onclick="MODAL.goElite()">Get Elite</button></div>' +
        '</div>' +
        '<p class="modal-footer-note">7-day money-back guarantee &middot; Cancel anytime</p>' +
      '</div>';
    document.body.appendChild(modal);
    MODAL.startTimer();
    setTimeout(function() { modal.classList.add('modal-visible'); }, 10);
  },
  close: function() {
    var m = $('upgrade-modal');
    if(m) { m.classList.remove('modal-visible'); setTimeout(function(){ m.remove(); }, 300); }
  },
  goPro: function() { MODAL.close(); window.open('/pricing.html', '_blank'); },
  goElite: function() { MODAL.close(); window.open('/pricing.html', '_blank'); },
  startTimer: function() {
    function update() {
      var diff = new Date().setHours(24,0,0,0) - Date.now();
      var h = Math.floor(diff/3600000);
      var m = Math.floor((diff%3600000)/60000);
      var s = Math.floor((diff%60000)/1000);
      var el = $('reset-timer');
      if(el) el.textContent = (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
    }
    update();
    setInterval(update, 1000);
  }
};

// ── DASHBOARD ─────────────────────────────────────
var DASH = {
  init: function() {
    var p = state.profile; if(!p) return;
    $('as-av') && ($('as-av').textContent = p.initials);
    $('as-name') && ($('as-name').textContent = p.name);
    $('dash-greet') && ($('dash-greet').textContent = greet() + ', ' + p.name + '!');
    $('dash-sub') && ($('dash-sub').textContent = 'Your agent ' + p.agentName + ' is ready. Here\'s your roadmap.');
    DASH.renderTasks();
    DASH.renderSchols();
    CHAT.init();
    // Update usage bar
    var used = getUsed();
    USAGE.update(used, 5, state.plan);
  },
  tab: function(name) {
    document.querySelectorAll('.agent-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.as-item').forEach(function(i) { i.classList.remove('active'); });
    var tab = $('tab-'+name); if(tab) tab.classList.add('active');
    var nav = $('sn-'+name); if(nav) nav.classList.add('active');
    var titles = { home:'Dashboard', chat:'Chat with '+(state.profile?state.profile.agentName:'Agent'), profile:'My profile' };
    var subs = { home:'Your scholarship overview', chat:'Your personal AI scholarship guide', profile:'Your saved information' };
    $('atb-title') && ($('atb-title').textContent = titles[name] || name);
    $('atb-sub') && ($('atb-sub').textContent = subs[name] || '');
    if(name === 'chat') { var b=$('chat-dot'); if(b) b.style.display='none'; setTimeout(CHAT.scroll, 50); }
    if(name === 'profile') DASH.renderProfile();
    var sb = document.querySelector('.agent-sidebar'); if(sb) sb.classList.remove('open');
  },
  toggleSidebar: function() {
    var sb = document.querySelector('.agent-sidebar'); if(sb) sb.classList.toggle('open');
  },
  quick: function(msg) {
    DASH.tab('chat');
    setTimeout(function() {
      var inp = $('chat-input'); if(inp) inp.value = msg;
      CHAT.send();
    }, 150);
  },
  renderTasks: function() {
    var remaining = state.tasks.filter(function(t){ return !t.done; }).length;
    $('ds-tasks') && ($('ds-tasks').textContent = remaining);
    var pct = Math.round((state.tasks.filter(function(t){ return t.done; }).length / state.tasks.length) * 100);
    $('prog-fill') && ($('prog-fill').style.width = pct + '%');
    $('prog-pct') && ($('prog-pct').textContent = pct + '% complete');
    var tl = $('task-list'); if(!tl) return;
    tl.innerHTML = state.tasks.map(function(t, i) {
      var bc = t.due==='urgent'?'t-urgent':t.due==='soon'?'t-soon':'t-ok';
      var bl = t.due==='urgent'?'Urgent':t.due==='soon'?'This week':'On track';
      return '<div class="t-item">' +
        '<div class="t-check ' + (t.done?'done':'') + '" onclick="DASH.toggleTask('+i+')">' + (t.done?'<i class="ti ti-check"></i>':'') + '</div>' +
        '<span class="t-text ' + (t.done?'done':'') + '">' + esc(t.text) + '</span>' +
        '<span class="t-badge ' + bc + '">' + bl + '</span>' +
      '</div>';
    }).join('');
  },
  toggleTask: function(i) { state.tasks[i].done = !state.tasks[i].done; DASH.renderTasks(); },
  renderSchols: function() {
    var sl = $('schol-list'); if(!sl) return;
    sl.innerHTML = [
      {name:'DAAD Research Grant', country:'Germany', match:'92%', dl:'Oct 2025'},
      {name:'Türkiye Burslari (YTB)', country:'Turkey', match:'88%', dl:'Feb 2026'},
      {name:'Commonwealth Scholarship', country:'UK', match:'79%', dl:'Nov 2025'},
      {name:'Heinrich Böll Foundation', country:'Germany', match:'74%', dl:'Sep 2025'}
    ].map(function(s) {
      return '<div class="sc-card">' +
        '<div class="sc-top"><div class="sc-name">' + esc(s.name) + '</div><span class="sc-match">' + s.match + '</span></div>' +
        '<div class="sc-country">' + s.country + '</div>' +
        '<div class="sc-dl"><i class="ti ti-calendar" style="font-size:12px"></i> Deadline: ' + s.dl + '</div>' +
      '</div>';
    }).join('');
  },
  renderProfile: function() {
    var p = state.profile; if(!p) return;
    var pb = $('profile-body'); if(!pb) return;
    var finLabels = {low:'Full funding needed', mid:'Partial support', ok:'Can cover some costs', self:'Self-funded'};
    pb.innerHTML =
      '<div style="margin-bottom:1.25rem">' +
        '<div style="font-family:Sora,sans-serif;font-size:1.1rem;font-weight:600">' + esc(p.name) + "'s profile</div>" +
        '<div style="font-size:13px;color:var(--text-3)">Agent: ' + esc(p.agentName) + '</div>' +
      '</div>' +
      DASH.pfCard('Personal details', '<span class="pf-edit" onclick="APP.reset()">Edit</span>',
        [['Name',p.name],['Age',p.age],['Country',p.country],['Finances',finLabels[p.finance]||p.finance]]) +
      DASH.pfCard('Academic background', '',
        [['Qualification',p.qual],['Field',p.field],['Score',p.gpa+'%'],['English',p.eng]]) +
      DASH.pfCard('Study preferences', '',
        [['Target level',p.level],['Countries',p.dests]]);
  },
  pfCard: function(title, extra, fields) {
    return '<div class="pf-card">' +
      '<div class="pf-hdr"><div class="pf-title">' + title + '</div>' + extra + '</div>' +
      '<div class="pf-grid">' + fields.map(function(f) {
        return '<div class="pf-field"><div class="pf-label">' + f[0] + '</div><div class="pf-value">' + esc(f[1]||'') + '</div></div>';
      }).join('') + '</div>' +
    '</div>';
  }
};

// ── USAGE BAR ─────────────────────────────────────
var USAGE = {
  update: function(used, limit, plan) {
    state.usage = { used: used, limit: limit };
    var bar = $('usage-bar-wrap'); if(!bar) return;
    if(plan !== 'free') { bar.style.display='none'; return; }
    bar.style.display = '';
    var pct = Math.min((used/limit)*100, 100);
    var fill = $('usage-bar-fill');
    if(fill) { fill.style.width = pct+'%'; fill.style.background = pct>=100?'#ef4444':pct>=80?'#f59e0b':'#3b82f6'; }
    var txt = $('usage-bar-text');
    if(txt) txt.textContent = used + ' / ' + limit + ' free messages used today';
    var btn = $('usage-upgrade-btn');
    if(btn) btn.style.display = pct>=80 ? '' : 'none';
  }
};

// ── CHAT ──────────────────────────────────────────
var CHAT = {
  init: function() {
    state.history = [];
    var cm = $('chat-msgs'); if(cm) cm.innerHTML = '';
    var p = state.profile;
    var used = getUsed();
    var opening = 'Hi ' + p.name + '! I\'m ' + p.agentName + ', your personal scholarship agent.\n\n' +
      'I know your full profile — ' + p.field + ' from ' + p.country + ', targeting ' + p.level + ' in ' + p.dests + '.\n\n' +
      (state.plan==='free' ? 'You are on the Free plan — ' + (5-used) + ' messages remaining today.\n\n' : '') +
      'What would you like to work on first?';
    CHAT.addAgent(opening);
    var dot = $('chat-dot'); if(dot) dot.style.display = '';
  },
  addAgent: function(text) {
    var p = state.profile; if(!p) return;
    var cm = $('chat-msgs'); if(!cm) return;
    var div = document.createElement('div');
    div.className = 'chat-msg agent';
    div.innerHTML =
      '<div class="chat-av agent">' + esc(p.agentName[0]) + '</div>' +
      '<div class="chat-bw"><div class="chat-bubble">' + esc(text) + '</div>' +
      '<div class="chat-time">' + p.agentName + ' ' + now() + '</div></div>';
    cm.appendChild(div);
    CHAT.scroll();
  },
  addUser: function(text) {
    var p = state.profile; if(!p) return;
    var cm = $('chat-msgs'); if(!cm) return;
    var div = document.createElement('div');
    div.className = 'chat-msg user';
    div.innerHTML =
      '<div class="chat-av user">' + esc(p.initials) + '</div>' +
      '<div class="chat-bw"><div class="chat-bubble">' + esc(text) + '</div>' +
      '<div class="chat-time">You ' + now() + '</div></div>';
    cm.appendChild(div);
    CHAT.scroll();
  },
  showTyping: function() {
    var p = state.profile; if(!p) return;
    var cm = $('chat-msgs'); if(!cm) return;
    var div = document.createElement('div');
    div.className = 'chat-msg agent'; div.id = 'typing-ind';
    div.innerHTML =
      '<div class="chat-av agent">' + esc(p.agentName[0]) + '</div>' +
      '<div class="chat-bw"><div class="chat-bubble"><div class="t-dots">' +
      '<div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div>' +
      '</div></div></div>';
    cm.appendChild(div);
    CHAT.scroll();
  },
  removeTyping: function() { var el=$('typing-ind'); if(el) el.remove(); },
  scroll: function() { var m=$('chat-msgs'); if(m) m.scrollTop = m.scrollHeight; },
  key: function(e) { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); CHAT.send(); } },
  send: function() {
    var inp = $('chat-input');
    var text = inp ? inp.value.trim() : '';
    if(!text || !state.profile) return;

    var used = getUsed();
    if(state.plan === 'free' && used >= 5) {
      MODAL.show('You have used all 5 free messages today. Upgrade to Pro for unlimited access!');
      return;
    }

    inp.value = '';
    CHAT.addUser(text);
    state.history.push({ role: 'user', content: text });
    CHAT.showTyping();

    var p = state.profile;
    var finMap = { low:'needs full funding', mid:'needs partial support', ok:'can cover some costs', self:'self-funded seeking merit' };
    var systemMsg = 'You are ' + p.agentName + ', a warm expert personal scholarship AI agent for FindScholarshipForMe.com.\n\n' +
      'Student: ' + p.name + ', ' + p.age + 'yo, from ' + p.country + '\n' +
      'Studies: ' + p.qual + ' in ' + p.field + ', score ' + p.gpa + '%, English: ' + p.eng + '\n' +
      'Target: ' + p.level + ' in ' + p.dests + '\n' +
      'Finances: ' + (finMap[p.finance] || p.finance) + '\n\n' +
      'Be warm, adaptive, and specific to this student. Help with scholarships, SOP, documents, visa, deadlines, motivation.';

    var messages = [{ role: 'system', content: systemMsg }]
      .concat(state.history.slice(-10));

    callGroq(messages, function(err, reply) {
      CHAT.removeTyping();
      if(err) {
        CHAT.addAgent('Sorry, something went wrong. Please try again!');
        return;
      }
      incrementUsed();
      var newUsed = getUsed();
      USAGE.update(newUsed, 5, state.plan);
      var remaining = 5 - newUsed;
      if(state.plan === 'free' && remaining <= 0) {
        setTimeout(function() {
          MODAL.show('You have used all your free messages today! Come back tomorrow or upgrade to Pro.');
        }, 800);
      } else if(state.plan === 'free' && remaining <= 2) {
        var warn = $('limit-warning');
        if(!warn) {
          warn = document.createElement('div');
          warn.id = 'limit-warning';
          warn.className = 'limit-warning';
          var sug = $('chat-suggestions');
          if(sug) sug.parentNode.insertBefore(warn, sug);
        }
        warn.innerHTML = '<i class="ti ti-alert-triangle"></i> Only <strong>' + remaining + ' message' + (remaining===1?'':'s') + '</strong> left today. <a href="/pricing.html" target="_blank">Upgrade to Pro</a>';
      }
      state.history.push({ role: 'assistant', content: reply });
      CHAT.addAgent(reply);
    });
  }
};

// ── NAV SCROLL ────────────────────────────────────
window.addEventListener('scroll', function() {
  var nav = $('main-nav');
  if(nav) nav.style.boxShadow = window.scrollY > 10 ? '0 2px 12px rgba(0,0,0,.08)' : '';
});

// ── INJECT STYLES ─────────────────────────────────
(function() {
  var css = '#upgrade-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;transition:opacity .3s}' +
    '#upgrade-modal.modal-visible{opacity:1}' +
    '.modal-overlay{position:absolute;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px)}' +
    '.modal-box{position:relative;background:#fff;border-radius:20px;padding:2rem;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2);transform:translateY(20px);transition:transform .3s}' +
    '#upgrade-modal.modal-visible .modal-box{transform:translateY(0)}' +
    '.modal-close{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:8px;background:#f1f5f9;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:#64748b}' +
    '.modal-icon{width:52px;height:52px;border-radius:14px;background:#eff6ff;display:flex;align-items:center;justify-content:center;margin-bottom:1rem}' +
    '.modal-icon i{font-size:26px;color:#2563eb}' +
    '.modal-title{font-family:Sora,sans-serif;font-size:1.1rem;font-weight:600;margin-bottom:.5rem;color:#0f172a}' +
    '.modal-desc{font-size:14px;color:#64748b;line-height:1.6;margin-bottom:1rem}' +
    '.modal-timer{font-size:13px;color:#64748b;display:flex;align-items:center;gap:6px;margin-bottom:1.5rem;padding:8px 12px;background:#f8fafc;border-radius:8px}' +
    '.modal-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1rem}' +
    '.modal-plan{border:1px solid #e2e8f0;border-radius:12px;padding:1rem;text-align:center;position:relative}' +
    '.modal-plan-featured{border-color:#2563eb;background:#eff6ff}' +
    '.mp-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#2563eb;color:#fff;font-size:10px;font-weight:600;padding:2px 10px;border-radius:10px;white-space:nowrap}' +
    '.mp-name{font-family:Sora,sans-serif;font-size:13px;font-weight:600;margin-bottom:3px}' +
    '.mp-price{font-family:Sora,sans-serif;font-size:1.4rem;font-weight:700;color:#0f172a;margin-bottom:3px}' +
    '.mp-price span{font-size:12px;color:#64748b;font-weight:400}' +
    '.mp-detail{font-size:11px;color:#64748b;margin-bottom:.75rem}' +
    '.mp-btn{width:100%;padding:7px;font-size:12px;font-weight:500;border-radius:8px;border:none;cursor:pointer}' +
    '.mp-btn-ghost{background:#f1f5f9;color:#64748b}' +
    '.mp-btn-pro{background:#2563eb;color:#fff}' +
    '.mp-btn-elite{background:#0f172a;color:#fff}' +
    '.modal-footer-note{font-size:11px;color:#94a3b8;text-align:center}' +
    '#usage-bar-wrap{padding:8px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px}' +
    '.usage-bar-track{flex:1;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden}' +
    '#usage-bar-fill{height:100%;border-radius:3px;transition:width .5s}' +
    '#usage-bar-text{font-size:11px;color:#64748b;white-space:nowrap}' +
    '#usage-upgrade-btn{font-size:11px;font-weight:500;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;display:none}' +
    '.limit-warning{padding:8px 14px;background:#fffbeb;border-top:1px solid #fde68a;font-size:13px;color:#92400e;display:flex;align-items:center;gap:7px}' +
    '.limit-warning i{font-size:15px;color:#f59e0b}' +
    '.limit-warning a{color:#2563eb;font-weight:500}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// ── INJECT USAGE BAR ──────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var chatShell = document.querySelector('.chat-shell');
  if(chatShell) {
    var bar = document.createElement('div');
    bar.id = 'usage-bar-wrap';
    bar.style.display = 'none';
    bar.innerHTML =
      '<div class="usage-bar-track"><div id="usage-bar-fill" style="width:0%"></div></div>' +
      '<span id="usage-bar-text">0 / 5 free messages used today</span>' +
      '<button id="usage-upgrade-btn" onclick="MODAL.show()">Upgrade</button>';
    chatShell.insertBefore(bar, chatShell.firstChild);
  }
});

// ── AUTO-LOAD ─────────────────────────────────────
(function() {
  state.plan = loadPlan();
  var saved = loadProfile();
  if(saved) {
    state.profile = saved;
    hide('pg-landing'); show('pg-agent');
    DASH.init();
  }
})();
