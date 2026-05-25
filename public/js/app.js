/* ══════════════════════════════════════════════════
   findscholarshipforme.com — App JS v2
══════════════════════════════════════════════════ */

'use strict';

/* ─── STATE ──────────────────────────────────────── */
var state = {
  profile: null,
  history: [],
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

/* ─── UTILS ──────────────────────────────────────── */
var $ = function(id){ return document.getElementById(id); };
function esc(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }
function show(id){ $(id) && ($(id).style.display = ''); $(id) && $(id).classList.remove('pg-hidden'); }
function hide(id){ $(id) && $(id).classList.add('pg-hidden'); }
function now(){ return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function greet(){
  var h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function saveProfile(p){ try{ localStorage.setItem('fsmf_v2', JSON.stringify(p)); }catch(e){} }
function loadProfile(){ try{ var s=localStorage.getItem('fsmf_v2'); return s?JSON.parse(s):null; }catch(e){ return null; } }
function clearProfile(){ try{ localStorage.removeItem('fsmf_v2'); }catch(e){} }

/* ─── APP ────────────────────────────────────────── */
var APP = {
  startOnboarding: function(){
    hide('pg-landing');
    show('pg-onboard');
    OB.reset();
    window.scrollTo(0,0);
  },
  backToLanding: function(){
    hide('pg-onboard');
    show('pg-landing');
  },
  launch: function(){
    var p = OB.collect();
    if(!p){ alert('Please fill in all fields.'); return; }
    state.profile = p;
    saveProfile(p);
    hide('pg-onboard');
    show('pg-agent');
    DASH.init();
    window.scrollTo(0,0);
  },
  reset: function(){
    if(!confirm('Reset your profile and start over?')) return;
    clearProfile();
    state.profile = null;
    state.history = [];
    hide('pg-agent');
    show('pg-landing');
    window.scrollTo(0,0);
  }
};

/* ─── ONBOARDING ─────────────────────────────────── */
var OB = {
  reset: function(){
    state.obStep = 0;
    document.querySelectorAll('.ob-step').forEach(function(s){ s.classList.remove('active'); });
    var s0 = $('obs-0'); if(s0) s0.classList.add('active');
    OB.updatePips(0);
  },
  go: function(n){
    $('obs-'+state.obStep) && $('obs-'+state.obStep).classList.remove('active');
    state.obStep = n;
    $('obs-'+n) && $('obs-'+n).classList.add('active');
    OB.updatePips(n);
    var whys = [
      'We use your profile to find scholarships you actually qualify for.',
      'Your academic score and qualifications determine which scholarships you are eligible for.',
      'Country and degree preferences narrow down the best opportunities for you specifically.',
      'Your agent\'s name makes the experience personal and memorable.'
    ];
    var wt = $('ob-why-text'); if(wt) wt.textContent = whys[n] || whys[0];
  },
  updatePips: function(current){
    var pips = document.querySelectorAll('.ob-pip');
    pips.forEach(function(p,i){ p.classList.toggle('ob-pip-active', i <= current); });
  },
  getChip: function(groupId){ var el=document.querySelector('#'+groupId+' .chip.on'); return el?el.textContent.trim():''; },
  getChips: function(groupId){ var els=document.querySelectorAll('#'+groupId+' .chip.on'); return Array.from(els).map(function(e){return e.textContent.trim();}); },
  collect: function(){
    var name = ($('f-name')||{}).value || '';
    if(!name.trim()){ alert('Please enter your name.'); return null; }
    var dests = OB.getChips('cg-dest');
    var initials = name.trim().split(' ').map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2) || 'ST';
    return {
      name:      name.trim(),
      age:       ($('f-age')||{}).value || '21',
      country:   ($('f-country')||{}).value || 'Pakistan',
      finance:   ($('f-finance')||{}).value || 'low',
      qual:      ($('f-qual')||{}).value || "Bachelor's degree",
      field:     ($('f-field')||{}).value || 'Engineering',
      gpa:       ($('f-gpa')||{}).value || '75',
      eng:       OB.getChip('cg-eng') || 'IELTS 6.0-7.0',
      level:     OB.getChip('cg-level') || "Bachelor's",
      dests:     dests.length ? dests.join(', ') : 'Open to any',
      agentName: ($('f-agent')||{}).value || 'Nova',
      initials:  initials
    };
  }
};

/* ─── CHIPS ─────────────────────────────────────── */
var CHIPS = {
  solo: function(el, gid){
    document.querySelectorAll('#'+gid+' .chip').forEach(function(c){ c.classList.remove('on'); });
    el.classList.add('on');
  },
  multi: function(el){ el.classList.toggle('on'); }
};

/* ─── FAQ ────────────────────────────────────────── */
var FAQ = {
  toggle: function(btn){
    var ans = btn.nextElementSibling;
    var open = btn.classList.toggle('open');
    if(ans){ ans.classList.toggle('open', open); }
  }
};

/* ─── DASHBOARD ──────────────────────────────────── */
var DASH = {
  init: function(){
    var p = state.profile;
    if(!p) return;
    $('as-av').textContent = p.initials;
    $('as-name').textContent = p.name;
    $('dash-greet').textContent = greet() + ', ' + p.name + '!';
    $('dash-sub').textContent = 'Your agent ' + p.agentName + ' is ready. Here\'s your scholarship roadmap.';
    DASH.renderTasks();
    DASH.renderSchols();
    CHAT.init();
  },
  tab: function(name){
    document.querySelectorAll('.agent-tab').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.as-item').forEach(function(i){ i.classList.remove('active'); });
    var tab = $('tab-'+name); if(tab) tab.classList.add('active');
    var nav = $('sn-'+name); if(nav) nav.classList.add('active');
    var titles = { home:'Dashboard', chat:'Chat with '+state.profile.agentName, profile:'My profile' };
    var subs   = { home:'Your scholarship overview', chat:'Your personal AI scholarship guide', profile:'Your saved information' };
    $('atb-title').textContent = titles[name] || name;
    $('atb-sub').textContent   = subs[name] || '';
    if(name === 'chat'){ var b=$('chat-dot'); if(b) b.style.display='none'; setTimeout(CHAT.scroll, 50); }
    if(name === 'profile') DASH.renderProfile();
    // close mobile sidebar
    var sb = document.querySelector('.agent-sidebar'); if(sb) sb.classList.remove('open');
  },
  toggleSidebar: function(){
    var sb = document.querySelector('.agent-sidebar'); if(sb) sb.classList.toggle('open');
  },
  quick: function(msg){
    DASH.tab('chat');
    setTimeout(function(){
      var inp = $('chat-input'); if(inp){ inp.value = msg; }
      CHAT.send();
    }, 150);
  },
  renderTasks: function(){
    var remaining = state.tasks.filter(function(t){ return !t.done; }).length;
    $('ds-tasks').textContent = remaining;
    var pct = Math.round((state.tasks.filter(function(t){ return t.done; }).length / state.tasks.length) * 100);
    $('prog-fill').style.width = pct + '%';
    $('prog-pct').textContent = pct + '% complete';
    $('task-list').innerHTML = state.tasks.map(function(t, i){
      var bc = t.due==='urgent'?'t-urgent':t.due==='soon'?'t-soon':'t-ok';
      var bl = t.due==='urgent'?'Urgent':t.due==='soon'?'This week':'On track';
      return '<div class="t-item">'+
        '<div class="t-check '+(t.done?'done':'')+'" onclick="DASH.toggleTask('+i+')" role="checkbox" aria-checked="'+(t.done?'true':'false')+'" tabindex="0" onkeydown="if(event.key===\'Enter\') DASH.toggleTask('+i+')">'+
          (t.done?'<i class="ti ti-check" aria-hidden="true"></i>':'')+
        '</div>'+
        '<span class="t-text '+(t.done?'done':'')+'">'+esc(t.text)+'</span>'+
        '<span class="t-badge '+bc+'">'+bl+'</span>'+
      '</div>';
    }).join('');
  },
  toggleTask: function(i){ state.tasks[i].done = !state.tasks[i].done; DASH.renderTasks(); },
  renderSchols: function(){
    var schols = [
      { name:'DAAD Research Grant', country:'🇩🇪 Germany', match:'92%', dl:'Oct 2025' },
      { name:'Türkiye Burslari (YTB)', country:'🇹🇷 Turkey', match:'88%', dl:'Feb 2026' },
      { name:'Commonwealth Scholarship', country:'🇬🇧 UK', match:'79%', dl:'Nov 2025' },
      { name:'Heinrich Böll Foundation', country:'🇩🇪 Germany', match:'74%', dl:'Sep 2025' }
    ];
    $('schol-list').innerHTML = schols.map(function(s){
      return '<div class="sc-card">'+
        '<div class="sc-top"><div class="sc-name">'+esc(s.name)+'</div><span class="sc-match">'+s.match+'</span></div>'+
        '<div class="sc-country">'+s.country+'</div>'+
        '<div class="sc-dl"><i class="ti ti-calendar" style="font-size:12px" aria-hidden="true"></i> Deadline: '+s.dl+'</div>'+
      '</div>';
    }).join('');
  },
  renderProfile: function(){
    var p = state.profile; if(!p) return;
    var finLabels = { low:'Full funding needed', mid:'Partial support', ok:'Can cover some costs', self:'Self-funded' };
    $('profile-body').innerHTML =
      '<div style="margin-bottom:1.25rem"><div style="font-family:Sora,sans-serif;font-size:1.1rem;font-weight:600">'+esc(p.name)+'\'s profile</div>'+
      '<div style="font-size:13px;color:var(--text-3)">Managed by agent '+esc(p.agentName)+'</div></div>'+
      DASH.pfCard('Personal details','<span class="pf-edit" onclick="APP.reset()">Edit</span>',
        [['Name',p.name],['Age',p.age],['Country',p.country],['Finances',finLabels[p.finance]||p.finance]])+
      DASH.pfCard('Academic background','',
        [['Qualification',p.qual],['Field',p.field],['Score',p.gpa+'%'],['English',p.eng]])+
      DASH.pfCard('Study preferences','',
        [['Target level',p.level],['Countries',p.dests]]);
  },
  pfCard: function(title, extra, fields){
    return '<div class="pf-card">'+
      '<div class="pf-hdr"><div class="pf-title">'+title+'</div>'+extra+'</div>'+
      '<div class="pf-grid">'+
        fields.map(function(f){
          return '<div class="pf-field"><div class="pf-label">'+f[0]+'</div><div class="pf-value">'+esc(f[1]||'—')+'</div></div>';
        }).join('')+
      '</div></div>';
  }
};

/* ─── CHAT ───────────────────────────────────────── */
var CHAT = {
  init: function(){
    state.history = [];
    $('chat-msgs').innerHTML = '';
    var p = state.profile;
    var opening = 'Hi ' + p.name + '! I\'m ' + p.agentName + ', your personal scholarship agent. 👋\n\n' +
      'I\'ve got your full profile — ' + p.field + ' from ' + p.country + ', targeting ' + p.level + ' in ' + p.dests + '.\n\n' +
      'I\'m here for everything: finding scholarships, application steps, documents checklist, SOP writing, visa info, deadlines, and keeping you motivated all the way.\n\n' +
      'What would you like to work on first?';
    CHAT.addAgent(opening);
    var dot = $('chat-dot'); if(dot) dot.style.display = '';
  },
  addAgent: function(text){
    var p = state.profile;
    var div = document.createElement('div');
    div.className = 'chat-msg agent';
    div.innerHTML = '<div class="chat-av agent">'+esc(p.agentName[0])+'</div>'+
      '<div class="chat-bw"><div class="chat-bubble">'+esc(text)+'</div>'+
      '<div class="chat-time">'+p.agentName+' · '+now()+'</div></div>';
    $('chat-msgs').appendChild(div);
    CHAT.scroll();
  },
  addUser: function(text){
    var p = state.profile;
    var div = document.createElement('div');
    div.className = 'chat-msg user';
    div.innerHTML = '<div class="chat-av user">'+esc(p.initials)+'</div>'+
      '<div class="chat-bw"><div class="chat-bubble">'+esc(text)+'</div>'+
      '<div class="chat-time">You · '+now()+'</div></div>';
    $('chat-msgs').appendChild(div);
    CHAT.scroll();
  },
  showTyping: function(){
    var p = state.profile;
    var div = document.createElement('div');
    div.className = 'chat-msg agent'; div.id = 'typing-ind';
    div.innerHTML = '<div class="chat-av agent">'+esc(p.agentName[0])+'</div>'+
      '<div class="chat-bw"><div class="chat-bubble"><div class="t-dots">'+
      '<div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div></div></div></div>';
    $('chat-msgs').appendChild(div);
    CHAT.scroll();
  },
  removeTyping: function(){ var el=$('typing-ind'); if(el) el.remove(); },
  scroll: function(){ var m=$('chat-msgs'); if(m) m.scrollTop=m.scrollHeight; },
  key: function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); CHAT.send(); } },
  send: function(){
    var inp = $('chat-input');
    var text = inp ? inp.value.trim() : '';
    if(!text || !state.profile) return;
    inp.value = '';
    CHAT.addUser(text);
    state.history.push({ role:'user', content:text });
    CHAT.showTyping();
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ message:text, profile:state.profile, history:state.history.slice(-12) })
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      CHAT.removeTyping();
      var reply = d.reply || d.error || 'Sorry, something went wrong. Please try again.';
      state.history.push({ role:'assistant', content:reply });
      CHAT.addAgent(reply);
    })
    .catch(function(){
      CHAT.removeTyping();
      CHAT.addAgent('Connection issue — please check your internet and try again!');
    });
  }
};

/* ─── NAV SCROLL EFFECT ──────────────────────────── */
window.addEventListener('scroll', function(){
  var nav = $('main-nav');
  if(nav) nav.style.boxShadow = window.scrollY > 10 ? '0 2px 12px rgba(0,0,0,.08)' : '';
});

/* ─── AUTO-LOAD SAVED PROFILE ────────────────────── */
(function(){
  var saved = loadProfile();
  if(saved){
    state.profile = saved;
    hide('pg-landing');
    show('pg-agent');
    DASH.init();
  }
})();
