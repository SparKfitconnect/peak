'use strict';

// ── Realtime sync ─────────────────────────────────────────────────────────────

let jobs              = [];
let _ws               = null;
let _wsOk             = false;
let _pendingChanges   = false;   // true when a save happened while WS was down
let _reconnectDelay   = 1000;    // starts at 1s, doubles on each failure, caps at 30s

function load() { return jobs; }

function save(updated) {
  jobs = updated;
  if (_ws && _ws.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify({ type: 'set', payload: jobs }));
    _pendingChanges = false;
  } else {
    // WS is down — hold the change in memory and push it the moment we reconnect
    _pendingChanges = true;
  }
}

function setDot(color) {
  const d = document.getElementById('ws-dot');
  if (d) d.style.background = color;
}

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  _ws = new WebSocket(`${proto}//${location.host}`);

  _ws.onopen = () => {
    setDot('#34c759');
    _reconnectDelay = 1000; // reset backoff on clean connect
  };

  _ws.onmessage = ({ data }) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type !== 'sync') return;

      if (_pendingChanges) {
        // We made changes while offline — push ours, don't overwrite with server state
        _pendingChanges = false;
        _ws.send(JSON.stringify({ type: 'set', payload: jobs }));
      } else {
        jobs = msg.jobs;
      }

      const sheetOpen = document.getElementById('sheet-overlay')?.classList.contains('open');
      if (!_wsOk) {
        _wsOk = true;
        if (jobs.length === 0) seed(); else paint();
      } else if (!sheetOpen) {
        paint();
      }
    } catch {}
  };

  _ws.onclose = () => {
    _wsOk = false;
    setDot('#ff3b30');
    setTimeout(connectWS, _reconnectDelay);
    _reconnectDelay = Math.min(_reconnectDelay * 2, 30_000); // exponential backoff, max 30s
  };

  _ws.onerror = () => setDot('#ff9500');
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function localDate(d = new Date()) {
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
}
function pad(n) { return String(n).padStart(2, '0'); }

// ── Seed ──────────────────────────────────────────────────────────────────────

function seed() {
  if (load().length) return;
  const t   = new Date();
  const ago = (days) => localDate(new Date(t.getTime() - days * 86400000));
  const fwd = (days) => localDate(new Date(t.getTime() + days * 86400000));
  const mo  = (months, day) => {
    const d = new Date(t.getFullYear(), t.getMonth() - months, day);
    return localDate(d);
  };

  save([
    { id:uid(), customer:'John Smith',    phone:'555-123-4567', address:'123 Oak St',      service:'Driveway Wash',   price:150, date:ago(0), time:'09:00', status:'scheduled', notes:'Gate code 4321', soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Sarah Lee',     phone:'555-234-5678', address:'456 Maple Ave',   service:'House Washing',   price:375, date:ago(0), time:'13:00', status:'completed', notes:'',               soldBy:'Peak' },
    { id:uid(), customer:'Mike Torres',   phone:'555-345-6789', address:'789 Pine Rd',     service:'Deck Cleaning',   price:200, date:ago(1), time:'10:00', status:'paid',      notes:'',               soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Amy Chen',      phone:'555-456-7890', address:'321 Elm Blvd',    service:'Fence Cleaning',  price:175, date:ago(1), time:'14:00', status:'paid',      notes:'',               soldBy:'Peak' },
    { id:uid(), customer:'Bob Johnson',   phone:'555-567-8901', address:'654 Cedar Ln',    service:'Roof Cleaning',   price:425, date:ago(2), time:'08:00', status:'paid',      notes:'Two-story',      soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Linda Park',    phone:'555-678-9012', address:'987 Birch Way',   service:'House Washing',   price:310, date:fwd(1), time:'09:30', status:'scheduled', notes:'',               soldBy:'Peak' },
    { id:uid(), customer:'James Wilson',  phone:'555-789-0123', address:'147 Spruce Dr',   service:'Driveway Wash',   price:130, date:fwd(1), time:'15:00', status:'scheduled', notes:'',               soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Emma Davis',    phone:'555-890-1234', address:'258 Willow Ct',   service:'Deck Cleaning',   price:245, date:fwd(5), time:'10:00', status:'scheduled', notes:'Large wrap-around deck', soldBy:'Peak' },
    { id:uid(), customer:'Ryan Hall',     phone:'555-901-2345', address:'369 Ash Lane',    service:'Patio Cleaning',  price:185, date:ago(3), time:'11:00', status:'paid',      notes:'',               soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Megan Scott',   phone:'555-012-3456', address:'741 Hickory St',  service:'Gutter Cleaning', price:220, date:ago(5), time:'09:00', status:'paid',      notes:'',               soldBy:'Peak' },
    { id:uid(), customer:'John Smith',    phone:'555-123-4567', address:'123 Oak St',      service:'Deck Cleaning',   price:200, date:mo(1,5),  time:'10:00', status:'paid', notes:'', soldBy:'Peak' },
    { id:uid(), customer:'Sarah Lee',     phone:'555-234-5678', address:'456 Maple Ave',   service:'Driveway Wash',   price:140, date:mo(1,12), time:'09:00', status:'paid', notes:'', soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Kevin Green',   phone:'555-111-2222', address:'502 Walnut Blvd', service:'House Washing',   price:325, date:mo(1,18), time:'11:00', status:'paid', notes:'', soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Susan Clark',   phone:'555-222-3333', address:'88 Rosewood Dr',  service:'Roof Cleaning',   price:480, date:mo(1,22), time:'08:00', status:'paid', notes:'', soldBy:'Peak' },
    { id:uid(), customer:'Bob Johnson',   phone:'555-567-8901', address:'654 Cedar Ln',    service:'Gutter Cleaning', price:180, date:mo(2,8),  time:'14:00', status:'paid', notes:'', soldBy:'Peak' },
    { id:uid(), customer:'David Brown',   phone:'555-333-4444', address:'12 Oakwood Ave',  service:'Deck Cleaning',   price:260, date:mo(2,14), time:'10:00', status:'paid', notes:'', soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Karen White',   phone:'555-444-5555', address:'77 Fern St',      service:'House Washing',   price:350, date:mo(2,20), time:'09:30', status:'paid', notes:'', soldBy:'Peak' },
    { id:uid(), customer:'Tom Baker',     phone:'555-555-6666', address:'230 River Rd',    service:'Patio Cleaning',  price:190, date:mo(3,6),  time:'13:00', status:'paid', notes:'', soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Emily Stone',   phone:'555-666-7777', address:'445 Creek Ln',    service:'Driveway Wash',   price:160, date:mo(3,15), time:'10:00', status:'paid', notes:'', soldBy:'Peak' },
    { id:uid(), customer:'Kevin Green',   phone:'555-111-2222', address:'502 Walnut Blvd', service:'Fence Cleaning',  price:210, date:mo(3,25), time:'11:00', status:'completed', notes:'', soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Linda Park',    phone:'555-678-9012', address:'987 Birch Way',   service:'Roof Cleaning',   price:410, date:mo(4,10), time:'08:00', status:'paid', notes:'', soldBy:'Peak' },
    { id:uid(), customer:'David Brown',   phone:'555-333-4444', address:'12 Oakwood Ave',  service:'House Washing',   price:330, date:mo(4,20), time:'09:00', status:'paid', notes:'', soldBy:'Caden Bouchard' },
    { id:uid(), customer:'Tom Baker',     phone:'555-555-6666', address:'230 River Rd',    service:'Deck Cleaning',   price:280, date:mo(5,8),  time:'10:00', status:'paid', notes:'', soldBy:'Peak' },
    { id:uid(), customer:'Susan Clark',   phone:'555-222-3333', address:'88 Rosewood Dr',  service:'Driveway Wash',   price:145, date:mo(5,18), time:'14:00', status:'paid', notes:'', soldBy:'Peak' },
    { id:uid(), customer:'Emily Stone',   phone:'555-666-7777', address:'445 Creek Ln',    service:'Gutter Cleaning', price:200, date:mo(6,5),  time:'09:00', status:'paid', notes:'', soldBy:'Peak' },
    { id:uid(), customer:'Ryan Hall',     phone:'555-901-2345', address:'369 Ash Lane',    service:'House Washing',   price:360, date:mo(6,15), time:'11:00', status:'paid', notes:'', soldBy:'Caden Bouchard' },
  ]);
}

// ── Format ────────────────────────────────────────────────────────────────────

function fmt$(n) {
  if (!n) return '$0';
  return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(n);
}
function fmtDate(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function fmtTime(t) {
  if (!t) return '';
  const [h,m] = t.split(':').map(Number);
  return `${h%12||12}:${pad(m)} ${h>=12?'PM':'AM'}`;
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── State ─────────────────────────────────────────────────────────────────────

let view           = 'dashboard';
let jobFilter      = 'all';
let searchQ        = '';
let calMonthOffset = 0;
let selectedCalDay = localDate();
let activeCharts   = [];
let dashMonthIdx   = 0;
let tickerMode     = 'month';
let weekDaySel     = localDate(); // currently selected day in the weekly widget

// ── App shell ─────────────────────────────────────────────────────────────────

const app = document.getElementById('app');
function render(html) { app.innerHTML = `<div class="fade-in">${html}</div>`; }

// ── Navigation ────────────────────────────────────────────────────────────────

function go(v) {
  if (v === 'dashboard') weekDaySel = localDate();
  view = v;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`nav-${v}`);
  if (btn) btn.classList.add('active');
  paint();
}

function paint() {
  activeCharts.forEach(c => { try { c.destroy(); } catch {} });
  activeCharts = [];
  switch (view) {
    case 'dashboard': showDashboard(); break;
    case 'jobs':      showJobs();      break;
    case 'calendar':  showCalendar();  break;
    case 'sales':     showSales();     break;
  }
}

// ── Weekly schedule widget helpers ───────────────────────────────────────────

function weekPills(jobs) {
  const today = localDate();
  const now   = new Date();
  const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  // Build the 7 days of the current week (Sun–Sat)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d    = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const ds   = localDate(d);
    const sel  = ds === weekDaySel;
    const isToday = ds === today;
    const hasJobs = jobs.some(j => j.date === ds);
    return `
      <button data-week-day="${ds}" style="
        display:flex;flex-direction:column;align-items:center;gap:2px;
        padding:7px 10px;border-radius:12px;border:none;cursor:pointer;flex-shrink:0;
        background:${sel ? '#0066cc' : 'var(--g100)'};
        color:${sel ? '#fff' : isToday ? '#0066cc' : 'var(--g600)'};
        font-family:inherit;transition:all .15s;min-width:44px;">
        <span style="font-size:10px;font-weight:600;letter-spacing:.2px;">${DAY_LABELS[d.getDay()]}</span>
        <span style="font-size:15px;font-weight:${isToday||sel?'800':'500'};">${d.getDate()}</span>
        <span style="width:4px;height:4px;border-radius:50%;background:${sel?'rgba(255,255,255,.6)':hasJobs?'#0066cc':'transparent'};"></span>
      </button>`;
  }).join('');
}

function weekJobPanel(jobs, dateStr) {
  const dayJobs = jobs
    .filter(j => j.date === dateStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (dayJobs.length === 0) {
    return `<div style="padding:20px 0 18px;text-align:center;color:var(--g400);font-size:14px;font-weight:500;">No jobs this day</div>`;
  }
  return dayJobs.map(j => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid var(--g100);">
      <div style="min-width:42px;text-align:center;">
        <div style="font-size:12px;font-weight:700;color:#0066cc;">${j.time ? fmtTime(j.time) : '—'}</div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:700;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(j.customer)}</div>
        <div style="font-size:12px;color:var(--g500);margin-bottom:1px;">${esc(j.service||'')}</div>
        <div style="font-size:12px;color:var(--g400);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📍 ${esc(j.address)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:14px;font-weight:800;">${fmt$(j.price)}</div>
        <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;background:${j.status==='paid'?'#e8e8e8':j.status==='completed'?'#e0e8ff':'#f0f0f0'};color:#000;">${j.status}</span>
      </div>
    </div>`).join('');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function showDashboard() {
  const jobs  = load();
  const today = localDate();
  const now   = new Date();

  const wStart = new Date(now); wStart.setDate(now.getDate() - now.getDay());
  const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
  const wS = localDate(wStart), wE = localDate(wEnd);
  const mS = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;

  const isPaid  = j => j.status === 'paid';
  const sum     = arr => arr.reduce((s,j) => s+(j.price||0), 0);
  const inRange = (j,a,b) => j.date >= a && j.date <= b;

  const monthJobs    = jobs.filter(j => j.date >= mS);
  const monthTotal   = sum(monthJobs);
  const monthPaid    = sum(monthJobs.filter(isPaid));
  const monthPending = monthTotal - monthPaid;
  const weekTotal    = sum(jobs.filter(j => inRange(j, wS, wE)));
  const weekPaid     = sum(jobs.filter(j => isPaid(j) && inRange(j, wS, wE)));
  const allPaid      = sum(jobs.filter(isPaid));
  const todayJobs    = jobs.filter(j => j.date === today).sort((a,b) => (a.time||'').localeCompare(b.time||''));
  const todayTotal   = sum(todayJobs);
  const todayPaid    = sum(todayJobs.filter(isPaid));
  const nSched       = jobs.filter(j => j.status === 'scheduled').length;
  const nComp        = jobs.filter(j => j.status === 'completed').length;

  // Ticker
  const tickerOpts = {
    month: { lbl: 'Month Revenue',  val: monthTotal, sub: `${fmt$(monthPaid)} paid · ${fmt$(monthPending)} pending` },
    week:  { lbl: 'Week Revenue',   val: weekTotal,  sub: `${fmt$(weekPaid)} paid this week` },
    all:   { lbl: 'All Revenue',    val: allPaid,    sub: 'total collected all time' },
  };
  const tk = tickerOpts[tickerMode];

  // Goal
  const GOAL        = 60000;
  const goalPct     = Math.min(100, Math.round(allPaid / GOAL * 100));
  const goalLeft    = Math.max(0, GOAL - allPaid);

  render(`
    <div class="hero" id="dash-hero" style="background:linear-gradient(135deg,#1a1a2e 0%,#0055cc 100%);position:relative;">
      <button class="hero-toggle" id="ticker-toggle">
        <span class="hero-lbl" style="margin-bottom:0;">${tk.lbl}</span>
        <span class="hero-chev" id="ticker-chev">▾</span>
      </button>
      <div class="hero-val">${fmt$(tk.val)}</div>
      <div class="hero-sub">${tk.sub}</div>
      <div class="hero-drop" id="ticker-menu" style="display:none;">
        <button class="hero-opt${tickerMode==='month'?' active':''}" data-tmode="month">Month Revenue</button>
        <button class="hero-opt${tickerMode==='week'?' active':''}" data-tmode="week">Week Revenue</button>
        <button class="hero-opt${tickerMode==='all'?' active':''}" data-tmode="all">All Revenue</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-lbl">Today's Jobs</div>
        <div class="stat-val">${fmt$(todayTotal)}</div>
        <div class="stat-sub">${todayJobs.length} job${todayJobs.length!==1?'s':''} · ${fmt$(todayPaid)} paid</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Jobs</div>
        <div class="stat-val">${jobs.length}</div>
        <div class="stat-sub">${nSched} scheduled · ${nComp} done</div>
      </div>
    </div>

    <div class="sec-hd">
      <span class="sec-title">This Week</span>
      <button class="sec-link" data-go="calendar">Calendar →</button>
    </div>
    <div class="card" style="padding:14px 14px 0;">
      <div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:14px;">
        ${weekPills(jobs)}
      </div>
      <div id="week-jobs">
        ${weekJobPanel(jobs, weekDaySel)}
      </div>
    </div>

    <div class="sec-hd" style="margin-top:4px;">
      <span class="sec-title">Monthly Revenue</span>
    </div>
    <div class="card">
      <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;">
        ${[{lbl:'May',m:4},{lbl:'June',m:5},{lbl:'July',m:6},{lbl:'August',m:7}].map((t,i) =>
          `<button style="padding:5px 14px;border-radius:100px;font-size:13px;font-weight:600;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0;background:${i===dashMonthIdx?'#0066cc':'#e5e5ea'};color:${i===dashMonthIdx?'#fff':'#636366'};transition:all .15s;" data-dash-month="${i}">${t.lbl}</button>`
        ).join('')}
      </div>
      <div class="chart-wrap-lg"><canvas id="dash-chart"></canvas></div>
    </div>

    <div class="sec-hd" style="margin-top:4px;">
      <span class="sec-title">Revenue Goal</span>
    </div>
    <div class="card" style="padding-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:2px;">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:4px;">$60,000 Target</div>
          <div style="font-size:26px;font-weight:900;letter-spacing:-.8px;">${fmt$(allPaid)}</div>
        </div>
        <div style="text-align:right;padding-bottom:2px;">
          <div style="font-size:28px;font-weight:900;letter-spacing:-1px;color:${goalPct>=100?'#00c853':'#0066cc'};">${goalPct}%</div>
        </div>
      </div>
      <div class="goal-bar-track">
        <div class="goal-bar-fill" style="width:${goalPct}%;"></div>
      </div>
      <div style="font-size:12px;color:var(--g400);margin-top:4px;">
        ${goalPct >= 100
          ? '🎉 Goal reached! Amazing work.'
          : `${fmt$(goalLeft)} to go`}
      </div>
    </div>
  `);

  bindSwipe();

  // Weekly widget — instant day switching
  document.querySelectorAll('[data-week-day]').forEach(btn => {
    btn.addEventListener('click', () => {
      weekDaySel = btn.dataset.weekDay;
      // Swap pill styles instantly
      document.querySelectorAll('[data-week-day]').forEach(b => {
        const sel   = b.dataset.weekDay === weekDaySel;
        const isToday = b.dataset.weekDay === localDate();
        b.style.background = sel ? '#0066cc' : 'var(--g100)';
        b.style.color      = sel ? '#fff' : isToday ? '#0066cc' : 'var(--g600)';
        const dot = b.querySelector('span:last-child');
        if (dot) dot.style.background = sel ? 'rgba(255,255,255,.6)' : (load().some(j => j.date === b.dataset.weekDay) ? '#0066cc' : 'transparent');
      });
      // Swap job list instantly
      const panel = document.getElementById('week-jobs');
      if (panel) panel.innerHTML = weekJobPanel(load(), weekDaySel);
    });
  });

  // Hero ticker dropdown
  const tickerToggle = document.getElementById('ticker-toggle');
  const tickerMenu   = document.getElementById('ticker-menu');
  const tickerChev   = document.getElementById('ticker-chev');
  if (tickerToggle) {
    tickerToggle.addEventListener('click', e => {
      e.stopPropagation();
      const open = tickerMenu.style.display !== 'none';
      tickerMenu.style.display = open ? 'none' : 'block';
      tickerChev.classList.toggle('open', !open);
      if (!open) {
        setTimeout(() => document.addEventListener('click', () => {
          tickerMenu.style.display = 'none';
          tickerChev.classList.remove('open');
        }, { once: true }), 0);
      }
    });
  }
  document.querySelectorAll('[data-tmode]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      tickerMode = btn.dataset.tmode;
      showDashboard();
    });
  });

  const monthMap  = [{lbl:'May',m:4},{lbl:'June',m:5},{lbl:'July',m:6},{lbl:'August',m:7}];
  const selMonth  = monthMap[dashMonthIdx] || monthMap[0];
  const selYear   = now.getFullYear();
  const selDate   = new Date(selYear, selMonth.m, 1);
  const daysInMo  = new Date(selYear, selMonth.m + 1, 0).getDate();
  const dayLabels = Array.from({length: daysInMo}, (_, i) => i + 1);
  const paidArr   = dayLabels.map(d => {
    const ds = `${selYear}-${pad(selMonth.m+1)}-${pad(d)}`;
    return sum(jobs.filter(j => j.date === ds && isPaid(j)));
  });
  const schedArr  = dayLabels.map(d => {
    const ds = `${selYear}-${pad(selMonth.m+1)}-${pad(d)}`;
    return sum(jobs.filter(j => j.date === ds && !isPaid(j)));
  });

  activeCharts.push(new Chart(document.getElementById('dash-chart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: dayLabels.map(d => `${d}`),
      datasets: [
        { label:'Paid',      data:paidArr,  backgroundColor:'#0066cc', borderRadius:4 },
        { label:'Pending',   data:schedArr, backgroundColor:'#99c4f5', borderRadius:4 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${fmt$(ctx.raw)}`}} },
      scales:{
        x:{ stacked:true, grid:{display:false}, ticks:{font:{size:10}, maxTicksLimit:16} },
        y:{ stacked:true, beginAtZero:true, grid:{color:'#f5f5f7'}, ticks:{callback:v=>`$${v}`,font:{size:10}} }
      }
    }
  }));
}

// ── Jobs view ─────────────────────────────────────────────────────────────────

function showJobs() {
  const all     = load();
  const clients = buildClients(all);
  const counts  = { all:all.length, scheduled:0, completed:0, paid:0, clients:clients.length };
  all.forEach(j => counts[j.status]++);

  const tabs   = ['all','scheduled','completed','paid','clients'];
  const labels = ['All','Scheduled','Completed','Paid','Clients'];

  if (jobFilter === 'clients') {
    render(`
      <div class="page-title">Jobs</div>
      <div class="tabs">
        ${tabs.map((f,i) => `<button class="tab${jobFilter===f?' active':''}" data-filter="${f}">${labels[i]}${f==='clients'?` (${counts.clients})`:` (${counts[f]??''})`}</button>`).join('')}
      </div>
      ${clients.length === 0
        ? `<div class="empty"><div class="empty-icon">👥</div><div class="empty-text">No clients yet</div></div>`
        : clients.map(c => clientCard(c)).join('')
      }
    `);
    return;
  }

  let list = all;
  if (jobFilter !== 'all') list = list.filter(j => j.status === jobFilter);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    list = list.filter(j =>
      j.customer.toLowerCase().includes(q) ||
      j.address.toLowerCase().includes(q) ||
      (j.service||'').toLowerCase().includes(q) ||
      (j.phone||'').includes(q)
    );
  }

  const order = {scheduled:0, completed:1, paid:2};
  list.sort((a,b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    const diff = a.date.localeCompare(b.date);
    return a.status === 'paid' ? -diff : diff;
  });

  render(`
    <div class="page-title">Jobs</div>

    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input class="search-input" id="job-search" placeholder="Search by name, address, service…" value="${esc(searchQ)}" autocomplete="off">
    </div>

    <div class="tabs">
      ${tabs.map((f,i) => `<button class="tab${jobFilter===f?' active':''}" data-filter="${f}">${labels[i]}${f==='clients'?` (${counts.clients})`:` (${counts[f]??''})`}</button>`).join('')}
    </div>

    ${list.length === 0
      ? `<div class="empty"><img src="/assets/mountain.png" style="width:140px;display:block;margin:0 auto 10px;mix-blend-mode:darken;"><div class="empty-text">No jobs found</div></div>`
      : list.map(j => jobCard(j)).join('')
    }
  `);

  bindSwipe();

  const inp = document.getElementById('job-search');
  if (inp) {
    inp.addEventListener('input', e => {
      searchQ = e.target.value;
      const pos = e.target.selectionStart;
      showJobs();
      const next = document.getElementById('job-search');
      if (next) { next.focus(); next.setSelectionRange(pos, pos); }
    });
  }
}

// ── Client helpers ────────────────────────────────────────────────────────────

function buildClients(jobs) {
  const map = {};
  jobs.forEach(j => {
    const key = j.customer.trim().toLowerCase();
    if (!map[key]) {
      map[key] = { key, name:j.customer, phone:j.phone, address:j.address,
                   service:j.service, latestDate:j.date,
                   totalJobs:0, completedJobs:0, totalRevenue:0 };
    }
    const c = map[key];
    c.totalJobs++;
    if (j.status === 'completed' || j.status === 'paid') c.completedJobs++;
    if (j.status === 'paid') c.totalRevenue += (j.price || 0);
    if (j.date > c.latestDate) {
      c.latestDate = j.date;
      c.phone   = j.phone;
      c.address = j.address;
      c.service = j.service;
    }
  });
  return Object.values(map).sort((a,b) => b.totalRevenue - a.totalRevenue);
}

function clientCard(c) {
  const initials = c.name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return `
    <div class="client-card">
      <div class="cc-head">
        <div class="cc-avatar">${esc(initials)}</div>
        <div>
          <div class="cc-name">${esc(c.name)}</div>
          <div class="cc-stats">
            ${c.totalJobs} job${c.totalJobs!==1?'s':''} total ·
            ${c.completedJobs} completed ·
            <strong>${fmt$(c.totalRevenue)}</strong> paid
          </div>
        </div>
      </div>
      <div class="cc-detail">
        <a class="cc-detail-item" href="tel:${esc(c.phone)}">📞 ${esc(c.phone)}</a>
        <a class="cc-detail-item" href="https://maps.google.com/?q=${encodeURIComponent(c.address)}" target="_blank" rel="noopener">
          📍 ${esc(c.address)}
        </a>
      </div>
      <div class="cc-actions">
        <button class="btn btn-dark" style="font-size:13px;width:100%;" data-recurring="${esc(c.key)}">＋ Add Recurring Job</button>
      </div>
    </div>
  `;
}

// ── Job card ──────────────────────────────────────────────────────────────────

function jobCard(j) {
  const badgeMap = { scheduled:'b-scheduled', completed:'b-completed', paid:'b-paid' };
  const labelMap = { scheduled:'Scheduled', completed:'Completed', paid:'Paid ✓' };

  let actions = '';
  if (j.status === 'scheduled') {
    actions = `<button class="btn btn-light" data-act="done" data-id="${j.id}">✓ Done</button>`;
  } else if (j.status === 'completed') {
    actions = `<button class="btn btn-green" data-act="paid" data-id="${j.id}">💰 Mark Paid</button>`;
  }

  const rightLabel = j.status === 'scheduled' ? '✓ Done'
                   : j.status === 'completed'  ? '💰 Paid'
                   : '';

  return `
    <div class="job-card" data-id="${j.id}">
      ${rightLabel ? `<div class="swipe-bg-right">${rightLabel}</div>` : ''}
      <div class="swipe-bg-left">🗑 Delete</div>
      <div class="swipe-inner">
        <div class="jc-head">
          <div>
            <div class="jc-name">${esc(j.customer)}</div>
            <div class="jc-svc">${esc(j.service||'')}</div>
          </div>
          <div class="jc-right">
            <div class="jc-price">${fmt$(j.price)}</div>
            <span class="badge ${badgeMap[j.status]||'b-scheduled'}">${labelMap[j.status]||j.status}</span>
          </div>
        </div>
        <div class="jc-meta">
          <span class="jc-meta-item">📅 ${fmtDate(j.date)}${j.time?' · '+fmtTime(j.time):''}</span>
          <a class="jc-meta-item" href="https://maps.google.com/?q=${encodeURIComponent(j.address)}" target="_blank" rel="noopener">
            📍 ${esc(j.address)}
          </a>
          <a class="jc-meta-item" href="tel:${esc(j.phone)}">📞 ${esc(j.phone)}</a>
          ${j.soldBy?`<span class="jc-meta-item">👤 ${esc(j.soldBy)}</span>`:''}
          ${j.notes?`<span class="jc-meta-item">📝 ${esc(j.notes)}</span>`:''}
        </div>
        <div class="jc-actions">
          ${actions}
          <button class="btn btn-light" data-act="edit" data-id="${j.id}">Edit</button>
          <button class="btn-danger" data-act="del" data-id="${j.id}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

// ── Swipe gestures ────────────────────────────────────────────────────────────

function bindSwipe() {
  document.querySelectorAll('.job-card:not([data-swipe-bound])').forEach(card => {
    card.dataset.swipeBound = '1';
    const inner = card.querySelector('.swipe-inner');
    if (!inner) return;

    let startX = 0, startY = 0, curX = 0, dragging = false, committed = false;
    const THRESHOLD = 72;

    card.addEventListener('touchstart', e => {
      if (committed) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      curX = 0; dragging = false;
      inner.style.transition = 'none';
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (committed) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (!dragging) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        if (Math.abs(dy) > Math.abs(dx)) return;
        dragging = true;
      }
      e.preventDefault();
      curX = dx;

      const clamp = Math.max(-120, Math.min(120, dx));
      inner.style.transform = `translateX(${clamp}px)`;

      const bgR = card.querySelector('.swipe-bg-right');
      const bgL = card.querySelector('.swipe-bg-left');
      if (bgR) bgR.style.opacity = dx > 0 ? String(Math.min(1, dx / THRESHOLD)) : '0';
      if (bgL) bgL.style.opacity = dx < 0 ? String(Math.min(1, -dx / THRESHOLD)) : '0';
    }, { passive: false });

    card.addEventListener('touchend', () => {
      if (!dragging || committed) return;

      const jobId = card.dataset.id;
      const jobs  = load();
      const idx   = jobs.findIndex(j => j.id === jobId);
      if (idx === -1) { springBack(); return; }
      const job = jobs[idx];

      inner.style.transition = 'transform .25s cubic-bezier(.25,1,.5,1)';

      if (curX > THRESHOLD) {
        if (job.status === 'scheduled' || job.status === 'completed') {
          committed = true;
          const bgR = card.querySelector('.swipe-bg-right');
          inner.style.transition = 'opacity .18s';
          inner.style.opacity    = '0';
          if (bgR) bgR.style.opacity = '1';
          setTimeout(() => {
            jobs[idx].status = job.status === 'scheduled' ? 'completed' : 'paid';
            save(jobs); paint();
          }, 200);
        } else {
          springBack();
        }
      } else if (curX < -THRESHOLD) {
        committed = true;
        inner.style.transform = 'translateX(-76px)';
        const bgL = card.querySelector('.swipe-bg-left');
        if (bgL) bgL.style.opacity = '1';
        setTimeout(() => {
          if (confirm(`Delete job for ${job.customer}?`)) {
            inner.style.transition = 'opacity .15s';
            inner.style.opacity    = '0';
            setTimeout(() => { jobs.splice(idx,1); save(jobs); paint(); }, 160);
          } else {
            committed = false;
            springBack();
          }
        }, 60);
      } else {
        springBack();
      }

      function springBack() {
        inner.style.transition = 'transform .3s cubic-bezier(.34,1.4,.64,1)';
        inner.style.transform  = 'translateX(0)';
        setTimeout(() => {
          card.querySelectorAll('.swipe-bg-right,.swipe-bg-left').forEach(el => el.style.opacity = '0');
        }, 180);
      }
    });
  });
}

// ── Calendar ──────────────────────────────────────────────────────────────────

function showCalendar() {
  const jobs    = load();
  const today   = localDate();
  const now     = new Date();
  const viewDate= new Date(now.getFullYear(), now.getMonth() + calMonthOffset, 1);
  const label   = viewDate.toLocaleDateString('en-US', { month:'long', year:'numeric' });

  const [sy,sm] = selectedCalDay.split('-').map(Number);
  if (sm-1 !== viewDate.getMonth() || sy !== viewDate.getFullYear()) {
    selectedCalDay = (now.getMonth() === viewDate.getMonth() && now.getFullYear() === viewDate.getFullYear())
      ? today : localDate(viewDate);
  }

  render(`
    <div style="background:var(--white);padding:14px 16px 12px;border-bottom:1px solid var(--g100);">
      <div class="cal-month-nav">
        <button class="week-nav-btn" data-mon="-1">‹</button>
        <span class="cal-month-label">${label}</span>
        <button class="week-nav-btn" data-mon="1">›</button>
      </div>
      <div class="cal-dow-row">
        ${['S','M','T','W','T','F','S'].map(n=>`<div class="cal-dow-cell">${n}</div>`).join('')}
      </div>
      <div class="cal-grid" id="cal-grid">
        ${calGridInner(jobs, today, viewDate)}
      </div>
    </div>
    <div id="cal-day-panel" style="padding-top:4px;">
      ${calDayPanelInner(selectedCalDay, jobs)}
    </div>
  `);

  bindSwipe();
}

function calGridInner(jobs, today, viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  let html = '';
  for (let i = 0; i < 42; i++) {
    const d   = new Date(start); d.setDate(start.getDate() + i);
    const s   = localDate(d);
    const inM = d.getMonth() === viewDate.getMonth();
    const dj  = jobs.filter(j => j.date === s);
    const sts = [...new Set(dj.map(j => j.status))];
    html += `
      <div class="cal-cell${!inM?' other-month':''}${s===today?' is-today':''}${s===selectedCalDay?' is-selected':''}" data-cal-sel="${s}">
        <div class="cal-cell-num">${d.getDate()}</div>
        ${dj.length?`<div class="cal-dots">${sts.map(st=>`<div class="cal-dot cal-dot-${st}"></div>`).join('')}</div>`:''}
      </div>`;
  }
  return html;
}

function calDayPanelInner(dateStr, jobs) {
  jobs = jobs || load();
  const dj     = jobs.filter(j => j.date === dateStr).sort((a,b) => (a.time||'').localeCompare(b.time||''));
  const [y,m,d] = dateStr.split('-').map(Number);
  const obj    = new Date(y,m-1,d);
  const isToday = dateStr === localDate();
  const lbl    = isToday ? 'Today' : obj.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const sum    = arr => arr.reduce((s,j) => s+(j.price||0), 0);
  const dayTotal = sum(dj);
  const dayPaid  = sum(dj.filter(j => j.status === 'paid'));

  return `
    <div class="cal-day-hd">
      <span class="cal-day-title">${lbl}</span>
      <button class="btn btn-dark" style="font-size:12px;padding:6px 12px;" data-cal-add="${dateStr}">+ Job</button>
    </div>
    ${dj.length === 0
      ? `<div class="empty" style="padding:28px 16px;"><img src="/assets/mountain.png" style="width:140px;display:block;margin:0 auto 10px;mix-blend-mode:darken;"><div class="empty-text">No jobs this day</div></div>`
      : dj.map(j => jobCard(j)).join('')}
  `;
}

// ── Sales ─────────────────────────────────────────────────────────────────────

function showSales() {
  const jobs  = load();
  const now   = new Date();
  const today = localDate();

  const ws  = new Date(now); ws.setDate(now.getDate() - now.getDay());
  const wS  = localDate(ws), wE = localDate(new Date(ws.getTime()+6*86400000));
  const mS  = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
  const yS  = `${now.getFullYear()}-01-01`;

  const paid     = jobs.filter(j => j.status === 'paid');
  const open     = jobs.filter(j => j.status === 'scheduled' || j.status === 'completed');
  const sum      = arr => arr.reduce((s,j)=>s+(j.price||0),0);
  const inR      = (j,a,b) => j.date>=a && (!b||j.date<=b);

  const totalRev      = sum(paid);
  const totalPipeline = sum(open);
  const allTimeTotal  = sum(jobs);
  const avgJob        = paid.length ? totalRev/paid.length : 0;
  const cntPaid       = (a,b) => paid.filter(j => inR(j,a,b)).length;

  const bySvc = {};
  paid.forEach(j => { const k=j.service||'Other'; bySvc[k]=(bySvc[k]||0)+(j.price||0); });
  const svcList = Object.entries(bySvc).sort((a,b)=>b[1]-a[1]);

  const months = Array.from({length:7}, (_,i) => {
    const d  = new Date(now.getFullYear(), now.getMonth()-6+i, 1);
    const mStart = localDate(d);
    const mEnd   = localDate(new Date(d.getFullYear(), d.getMonth()+1, 0));
    return { label: d.toLocaleDateString('en-US',{month:'short'}), mStart, mEnd };
  });

  const schedMonthly = months.map(m => sum(jobs.filter(j => j.date >= m.mStart && j.date <= m.mEnd)));
  const doneMonthly  = months.map(m => sum(jobs.filter(j => (j.status==='completed'||j.status==='paid') && j.date>=m.mStart && j.date<=m.mEnd)));

  const cadenPaid  = paid.filter(j => j.soldBy === 'Caden Bouchard');
  const peakPaid   = paid.filter(j => j.soldBy !== 'Caden Bouchard');
  const cadenSales = cadenPaid.reduce((s,j) => s + (j.price||0), 0);
  const peakSales  = peakPaid.reduce((s,j)  => s + (j.price||0), 0);
  const totalSales = cadenSales + peakSales;

  const commRate   = cadenSales >= 5000 ? 0.15 : cadenSales >= 2000 ? 0.12 : 0.10;
  const commLabel  = cadenSales >= 5000 ? '15% — Elite' : cadenSales >= 2000 ? '12% — Growth' : '10% — Base';
  const commEarned = cadenSales * commRate;
  const nextTierAmt = cadenSales < 2000 ? 2000 : cadenSales < 5000 ? 5000 : null;
  const nextTierPct = cadenSales < 2000 ? '12%' : cadenSales < 5000 ? '15%' : null;

  const tierCards = [
    { lbl:'Base',   pct:'10%', range:'< $2k',    active: cadenSales < 2000 },
    { lbl:'Growth', pct:'12%', range:'$2k–$5k',  active: cadenSales >= 2000 && cadenSales < 5000 },
    { lbl:'Elite',  pct:'15%', range:'> $5k',    active: cadenSales >= 5000 },
  ].map(t => `
    <div style="flex:1;padding:8px 6px;border-radius:8px;text-align:center;background:${t.active?'var(--black)':'var(--g100)'};color:${t.active?'#fff':'var(--g500)'};">
      <div style="font-size:11px;font-weight:700;">${t.lbl} ${t.pct}</div>
      <div style="font-size:10px;margin-top:2px;opacity:.75;">${t.range}</div>
    </div>`).join('');

  render(`
    <div class="page-title">Sales</div>

    <div class="hero" style="background:linear-gradient(135deg,#1a1a2e 0%,#0055cc 100%);">
      <div class="hero-lbl">All-Time Total</div>
      <div class="hero-val">${fmt$(allTimeTotal)}</div>
      <div class="hero-sub">${fmt$(totalRev)} collected · ${fmt$(totalPipeline)} in pipeline</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-lbl">Today</div>
        <div class="stat-val">${fmt$(sum(jobs.filter(j=>j.date===today)))}</div>
        <div class="stat-sub">${fmt$(sum(paid.filter(j=>j.date===today)))} paid · ${cntPaid(today,today)} paid jobs</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">This Week</div>
        <div class="stat-val">${fmt$(sum(jobs.filter(j=>inR(j,wS,wE))))}</div>
        <div class="stat-sub">${fmt$(sum(paid.filter(j=>inR(j,wS,wE))))} paid · ${cntPaid(wS,wE)} paid jobs</div>
      </div>
    </div>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-lbl">This Month</div>
        <div class="stat-val">${fmt$(sum(jobs.filter(j=>inR(j,mS))))}</div>
        <div class="stat-sub">${fmt$(sum(paid.filter(j=>inR(j,mS))))} paid · ${cntPaid(mS)} paid jobs</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">This Year</div>
        <div class="stat-val">${fmt$(sum(jobs.filter(j=>inR(j,yS))))}</div>
        <div class="stat-sub">${fmt$(sum(paid.filter(j=>inR(j,yS))))} paid · ${cntPaid(yS)} paid jobs</div>
      </div>
    </div>

    <div class="sec-hd"><span class="sec-title">Monthly Revenue — Scheduled</span></div>
    <div class="card" style="padding-bottom:14px;">
      <div style="font-size:11px;color:var(--g400);margin-bottom:8px;">All jobs scheduled per month</div>
      <div class="chart-wrap-lg"><canvas id="chart-sched"></canvas></div>
    </div>

    <div class="sec-hd"><span class="sec-title">Completed Revenue</span></div>
    <div class="card" style="padding-bottom:14px;">
      <div style="font-size:11px;color:var(--g400);margin-bottom:8px;">Jobs marked Completed or Paid per month</div>
      <div class="chart-wrap-lg"><canvas id="chart-done"></canvas></div>
    </div>

    ${svcList.length ? `
      <div class="sec-hd"><span class="sec-title">By Service</span></div>
      <div class="card">
        ${svcList.map(([svc,rev]) => {
          const pct = totalRev ? Math.round(rev/totalRev*100) : 0;
          return `
            <div class="svc-row">
              <div class="svc-row-hd">
                <span class="svc-name">${esc(svc)}</span>
                <span class="svc-amt">${fmt$(rev)}</span>
              </div>
              <div class="svc-bar"><div class="svc-fill" style="width:${pct}%"></div></div>
              <div class="svc-pct">${pct}% of revenue</div>
            </div>`;
        }).join('')}
      </div>
    ` : ''}

    <div class="sec-hd" style="margin-top:8px;"><span class="sec-title">Sales</span></div>

    <div class="hero" style="background:linear-gradient(135deg,#1a1a2e 0%,#0055cc 100%);">
      <div class="hero-lbl">Caden Bouchard · Total Sales Made</div>
      <div class="hero-val">${fmt$(cadenSales)}</div>
      <div class="hero-sub">Commission earned: <strong style="color:#fff;">${fmt$(commEarned)}</strong></div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-lbl">Caden's Sales</div>
        <div class="stat-val">${fmt$(cadenSales)}</div>
        <div class="stat-sub">${cadenPaid.length} paid job${cadenPaid.length!==1?'s':''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Peak Direct</div>
        <div class="stat-val">${fmt$(peakSales)}</div>
        <div class="stat-sub">${peakPaid.length} paid job${peakPaid.length!==1?'s':''}</div>
      </div>
    </div>

    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Commission Tiers</div>
      <div style="display:flex;gap:6px;margin-bottom:14px;">${tierCards}</div>
      ${nextTierAmt ? `
        <div style="font-size:12px;color:var(--g500);margin-bottom:6px;">
          ${fmt$(nextTierAmt - cadenSales)} more to reach ${nextTierPct} tier
        </div>
        <div style="height:6px;background:var(--g200);border-radius:3px;overflow:hidden;">
          <div style="height:100%;background:var(--black);border-radius:3px;width:${Math.min(100,Math.round(cadenSales/nextTierAmt*100))}%;transition:width .3s;"></div>
        </div>
      ` : `<div style="font-size:12px;color:var(--black);font-weight:600;">Top commission tier reached!</div>`}
    </div>

    ${totalSales > 0 ? `
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Sales Split</div>
        <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;margin-bottom:10px;">
          <div style="background:var(--black);width:${Math.round(cadenSales/totalSales*100)}%;"></div>
          <div style="background:var(--g300);flex:1;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:10px;height:10px;border-radius:50%;background:var(--black);flex-shrink:0;"></div>
            <span>Caden — ${Math.round(cadenSales/totalSales*100)}%</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:10px;height:10px;border-radius:50%;background:var(--g300);flex-shrink:0;"></div>
            <span>Peak — ${Math.round(peakSales/totalSales*100)}%</span>
          </div>
        </div>
      </div>
    ` : ''}
  `);

  const barOpts = () => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>fmt$(ctx.raw)}} },
    scales:{
      x:{ grid:{display:false}, ticks:{font:{size:11}} },
      y:{ beginAtZero:true, grid:{color:'#f5f5f7'}, ticks:{callback:v=>`$${v}`,font:{size:10}} }
    }
  });

  activeCharts.push(new Chart(document.getElementById('chart-sched').getContext('2d'), {
    type:'bar',
    data:{ labels:months.map(m=>m.label), datasets:[{ data:schedMonthly, backgroundColor:'#000', borderRadius:5 }] },
    options: barOpts()
  }));

  activeCharts.push(new Chart(document.getElementById('chart-done').getContext('2d'), {
    type:'bar',
    data:{ labels:months.map(m=>m.label), datasets:[{ data:doneMonthly, backgroundColor:'#000', borderRadius:5 }] },
    options: barOpts()
  }));
}

// ── Service picker ────────────────────────────────────────────────────────────

const SVC_LIST = ['Driveway','House','Full Wash','Deck','Fence','Roof','Gutter','Patio','Siding'];

function updateServiceValue() {
  const chips  = [...document.querySelectorAll('.svc-chip.active')].map(c => c.dataset.svc);
  const custom = (document.getElementById('f-service-custom')?.value || '').trim();
  const val    = [...chips, ...(custom ? [custom] : [])].join(', ');
  const el     = document.getElementById('f-service');
  if (el) el.value = val;

  const lbl = document.getElementById('svc-toggle-label');
  if (lbl) {
    lbl.textContent = val || 'Select services…';
    lbl.style.color = val ? 'var(--g900)' : 'var(--g400)';
  }
}

function initServicePicker(currentValue) {
  const parts    = currentValue ? currentValue.split(', ') : [];
  const selected = new Set(parts.filter(p => SVC_LIST.includes(p)));
  const custom   = parts.filter(p => !SVC_LIST.includes(p)).join(', ');

  document.querySelectorAll('.svc-chip').forEach(c => {
    c.classList.toggle('active', selected.has(c.dataset.svc));
    const fresh = c.cloneNode(true);
    c.replaceWith(fresh);
  });
  document.querySelectorAll('.svc-chip').forEach(c => {
    c.addEventListener('click', () => { c.classList.toggle('active'); updateServiceValue(); });
  });

  const customEl = document.getElementById('f-service-custom');
  if (customEl) {
    customEl.value = custom;
    const fresh = customEl.cloneNode(true);
    customEl.replaceWith(fresh);
    document.getElementById('f-service-custom').addEventListener('input', updateServiceValue);
  }

  const toggle = document.getElementById('svc-toggle');
  const dropdown = document.getElementById('svc-dropdown');
  const arrow = document.getElementById('svc-toggle-arrow');
  if (toggle && dropdown) {
    const fresh = toggle.cloneNode(true);
    toggle.replaceWith(fresh);
    document.getElementById('svc-toggle').addEventListener('click', () => {
      const open = dropdown.style.display === 'none';
      dropdown.style.display = open ? 'block' : 'none';
      document.getElementById('svc-toggle-arrow').style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  }

  updateServiceValue();
}

// ── Sheet (Add / Edit) ────────────────────────────────────────────────────────

function openSheet(jobId = null, prefillDate = null, prefillClient = null) {
  const overlay = document.getElementById('sheet-overlay');
  const sg      = document.getElementById('status-group');
  document.getElementById('job-form').reset();
  document.getElementById('f-id').value = '';
  document.getElementById('f-service-custom').value = '';
  document.querySelectorAll('.svc-chip').forEach(c => c.classList.remove('active'));
  sg.style.display = 'none';

  if (jobId) {
    const j = load().find(j => j.id === jobId);
    if (!j) return;
    document.getElementById('sheet-title').textContent = 'Edit Job';
    document.getElementById('form-btn').textContent    = 'Save Changes';
    sg.style.display = '';
    document.getElementById('f-id').value       = j.id;
    document.getElementById('f-customer').value = j.customer || '';
    document.getElementById('f-phone').value    = j.phone    || '';
    document.getElementById('f-address').value  = j.address  || '';
    document.getElementById('f-price').value    = j.price    || '';
    document.getElementById('f-date').value     = j.date     || '';
    document.getElementById('f-time').value     = j.time     || '';
    const statusLblMap = { scheduled:'Scheduled', completed:'Completed', paid:'Paid ✓' };
    setStatus(j.status || 'scheduled', statusLblMap[j.status] || 'Scheduled');
    setSoldBy(j.soldBy || 'Peak');
    document.getElementById('f-notes').value    = j.notes    || '';
    initServicePicker(j.service || '');
  } else {
    document.getElementById('sheet-title').textContent = prefillClient ? 'Add Recurring Job' : 'New Job';
    document.getElementById('form-btn').textContent    = prefillClient ? 'Add Recurring Job' : 'Add Job';
    document.getElementById('f-date').value = prefillDate || localDate();
    const h = new Date().getHours() + 1;
    document.getElementById('f-time').value = `${pad(Math.min(h,23))}:00`;
    if (prefillClient) {
      document.getElementById('f-customer').value = prefillClient.name    || '';
      document.getElementById('f-phone').value    = prefillClient.phone   || '';
      document.getElementById('f-address').value  = prefillClient.address || '';
      initServicePicker(prefillClient.service || '');
    } else {
      initServicePicker('');
    }
  }

  overlay.classList.add('open');
  setTimeout(() => {
    const focusEl = prefillClient
      ? document.getElementById('f-price')
      : document.getElementById('f-customer');
    if (focusEl) focusEl.focus();
  }, 350);
}

function closeSheet() {
  document.getElementById('sheet-overlay').classList.remove('open');
}

// ── Events ────────────────────────────────────────────────────────────────────

['dashboard','jobs','calendar','sales'].forEach(v =>
  document.getElementById(`nav-${v}`).addEventListener('click', () => go(v))
);
document.getElementById('nav-add').addEventListener('click', () => {
  const ring = document.querySelector('.nav-fab-ring');
  if (ring) {
    ring.classList.remove('popping');
    void ring.offsetWidth;
    ring.classList.add('popping');
    ring.addEventListener('animationend', () => ring.classList.remove('popping'), { once: true });
  }
  openSheet();
});
document.getElementById('hdr-add').addEventListener('click', () => openSheet());

// ── Status popup ──────────────────────────────────────────────────────────────

function setStatus(val, lbl) {
  document.getElementById('f-status').value = val;
  document.getElementById('f-status-label').textContent = lbl;
}

function openStatusPopup() {
  const overlay = document.getElementById('status-overlay');
  const popup   = document.getElementById('status-popup');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => {
    overlay.style.background = 'rgba(0,0,0,0.4)';
    popup.style.transform = 'scale(1)';
    popup.style.opacity   = '1';
  });
}

function closeStatusPopup() {
  const overlay = document.getElementById('status-overlay');
  const popup   = document.getElementById('status-popup');
  overlay.style.background = 'rgba(0,0,0,0)';
  popup.style.transform = 'scale(.92)';
  popup.style.opacity   = '0';
  setTimeout(() => { overlay.style.display = 'none'; }, 180);
}

document.getElementById('f-status-btn').addEventListener('click', openStatusPopup);
document.getElementById('status-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('status-overlay')) closeStatusPopup();
});
document.querySelectorAll('.status-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    setStatus(btn.dataset.val, btn.dataset.lbl);
    closeStatusPopup();
  });
});

// ── Sold By popup ─────────────────────────────────────────────────────────────

function setSoldBy(val) {
  document.getElementById('f-sold-by').value = val;
  document.getElementById('f-sold-by-label').textContent = val;
}

function openSoldByPopup() {
  const overlay = document.getElementById('sold-by-overlay');
  const popup   = document.getElementById('sold-by-popup');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => {
    overlay.style.background = 'rgba(0,0,0,0.4)';
    popup.style.transform = 'scale(1)';
    popup.style.opacity   = '1';
  });
}

function closeSoldByPopup() {
  const overlay = document.getElementById('sold-by-overlay');
  const popup   = document.getElementById('sold-by-popup');
  overlay.style.background = 'rgba(0,0,0,0)';
  popup.style.transform = 'scale(.92)';
  popup.style.opacity   = '0';
  setTimeout(() => { overlay.style.display = 'none'; }, 180);
}

document.getElementById('f-sold-by-btn').addEventListener('click', openSoldByPopup);
document.getElementById('sold-by-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('sold-by-overlay')) closeSoldByPopup();
});
document.querySelectorAll('.sold-by-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    setSoldBy(btn.dataset.val);
    closeSoldByPopup();
  });
});

document.getElementById('sheet-close').addEventListener('click', closeSheet);
document.getElementById('sheet-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('sheet-overlay')) closeSheet();
});

document.getElementById('job-form').addEventListener('submit', e => {
  e.preventDefault();
  const customer = document.getElementById('f-customer').value.trim();
  const phone    = document.getElementById('f-phone').value.trim();
  const address  = document.getElementById('f-address').value.trim();
  if (!customer || !phone || !address) {
    alert('Please fill in customer name, phone, and address.');
    return;
  }
  const jobs  = load();
  const jobId = document.getElementById('f-id').value;
  const data  = {
    customer, phone, address,
    service: document.getElementById('f-service').value,
    price:   parseFloat(document.getElementById('f-price').value) || 0,
    date:    document.getElementById('f-date').value || localDate(),
    time:    document.getElementById('f-time').value,
    soldBy:  document.getElementById('f-sold-by').value || 'Peak',
    notes:   document.getElementById('f-notes').value.trim(),
  };
  if (jobId) {
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx !== -1) jobs[idx] = { ...jobs[idx], ...data, status: document.getElementById('f-status').value };
  } else {
    jobs.push({ id:uid(), ...data, status:'scheduled' });
  }
  save(jobs); closeSheet(); paint();
});

app.addEventListener('click', e => {
  const goBtn = e.target.closest('[data-go]');
  if (goBtn) { go(goBtn.dataset.go); return; }

  const tabBtn = e.target.closest('[data-filter]');
  if (tabBtn) { jobFilter = tabBtn.dataset.filter; showJobs(); return; }

  const dashMonBtn = e.target.closest('[data-dash-month]');
  if (dashMonBtn) { dashMonthIdx = parseInt(dashMonBtn.dataset.dashMonth, 10); showDashboard(); return; }

  const monBtn = e.target.closest('[data-mon]');
  if (monBtn) { calMonthOffset += parseInt(monBtn.dataset.mon,10); showCalendar(); return; }

  const calSel = e.target.closest('[data-cal-sel]');
  if (calSel && !e.target.closest('[data-act]')) {
    selectedCalDay = calSel.dataset.calSel;
    const jobs = load();
    const vd   = new Date(new Date().getFullYear(), new Date().getMonth() + calMonthOffset, 1);
    const grid  = document.getElementById('cal-grid');
    const panel = document.getElementById('cal-day-panel');
    if (grid)  grid.innerHTML  = calGridInner(jobs, localDate(), vd);
    if (panel) { panel.innerHTML = calDayPanelInner(selectedCalDay, jobs); bindSwipe(); }
    return;
  }

  const calAdd = e.target.closest('[data-cal-add]');
  if (calAdd) { openSheet(null, calAdd.dataset.calAdd); return; }

  const recurBtn = e.target.closest('[data-recurring]');
  if (recurBtn) {
    const key     = recurBtn.dataset.recurring;
    const clients = buildClients(load());
    const c       = clients.find(cl => cl.key === key);
    if (c) openSheet(null, null, c);
    return;
  }

  const actBtn = e.target.closest('[data-act]');
  if (!actBtn) return;
  const { act, id } = actBtn.dataset;
  const jobs = load();
  const idx  = jobs.findIndex(j => j.id === id);
  if (idx === -1) return;

  if (act === 'done') {
    jobs[idx].status = 'completed'; save(jobs); paint();
  } else if (act === 'paid') {
    jobs[idx].status = 'paid'; save(jobs); paint();
  } else if (act === 'edit') {
    openSheet(id);
  } else if (act === 'del') {
    if (confirm(`Delete job for ${jobs[idx].customer}?`)) { jobs.splice(idx,1); save(jobs); paint(); }
  }
});

// ── Nav icon background removal ───────────────────────────────────────────────
// Draws the image into a canvas then zeroes out dark neutral (charcoal) pixels,
// leaving only the coloured icon pixels visible — no circular bg, no container.

function processNavIcon(canvasId, imgSrc) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d  = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (lum < 60 && sat < 35) {
          d[i+3] = 0;                                    // pure background → fully transparent
        } else if (lum < 85 && sat < 30) {
          d[i+3] = Math.round(((lum - 60) / 25) * 255); // soft edge fade
        }
      }
      ctx.putImageData(id, 0, 0);
    } catch(e) {}
  };
  img.src = imgSrc;
}

processNavIcon('icon-sales', '/assets/sales.png');

// ── Boot ──────────────────────────────────────────────────────────────────────

connectWS();
