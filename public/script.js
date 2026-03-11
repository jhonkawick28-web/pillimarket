/* ============================================================
   Pillimarket — script.js
   Homepage: load polls, vote, auto-refresh, search, sort
   ============================================================ */

const API = '/api/polls';
const VOTED_KEY = 'pillimarket_voted'; // localStorage key → object { pollId: optionIndex }

let currentSort = 'newest';
let allPolls = [];
let searchQuery = '';
let autoRefreshInterval;

// ── Retrieve voted map from localStorage
function getVotedMap() {
  try { return JSON.parse(localStorage.getItem(VOTED_KEY)) || {}; }
  catch { return {}; }
}

function setVoted(pollId, optionIndex) {
  const map = getVotedMap();
  map[pollId] = optionIndex;
  localStorage.setItem(VOTED_KEY, JSON.stringify(map));
}

function hasVoted(pollId) {
  return getVotedMap()[pollId] !== undefined;
}

function votedIndex(pollId) {
  return getVotedMap()[pollId];
}

// ── Format numbers nicely
function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Category color
const catColors = {
  Crypto: '#f59e0b', Politics: '#ef4444', Tech: '#0080ff',
  Sports: '#10b981', Science: '#8b5cf6', Entertainment: '#ec4899',
  Economy: '#f97316', General: '#00e5a0'
};
function catColor(cat) { return catColors[cat] || '#00e5a0'; }

// ── Build a poll card element
function buildPollCard(poll, mini = false) {
  const total = poll.options.reduce((s, o) => s + o.votes, 0);
  const voted = hasVoted(poll._id);
  const myVote = votedIndex(poll._id);
  const color = catColor(poll.category || 'General');

  const optionsHTML = poll.options.map((opt, i) => {
    const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
    const isMyVote = voted && myVote === i;
    return `
      <div class="poll-option ${isMyVote ? 'voted' : ''}"
           data-poll="${poll._id}" data-index="${i}"
           title="${voted ? 'Already voted' : 'Click to vote'}">
        <div class="poll-option-bar" style="width:${pct}%"></div>
        <div class="poll-option-content">
          <div class="poll-option-text">
            <span class="voted-check">✓</span>
            ${escHtml(opt.text)}
          </div>
          <div>
            <span class="poll-option-pct">${pct}%</span>
            <span class="poll-option-votes">(${fmt(opt.votes)})</span>
          </div>
        </div>
      </div>`;
  }).join('');

  const card = document.createElement('div');
  card.className = 'poll-card';
  card.dataset.pollId = poll._id;
  if (mini) card.style.padding = '1rem';

  card.innerHTML = `
    <div class="poll-card-header">
      <div class="poll-question">${escHtml(poll.question)}</div>
      <div class="poll-badge" style="color:${color};border-color:${color}22;background:${color}18">
        ${escHtml(poll.category || 'General')}
      </div>
    </div>
    <div class="poll-options">${optionsHTML}</div>
    <div class="poll-footer">
      <div class="poll-meta">
        <span class="poll-meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          ${fmt(total)} vote${total !== 1 ? 's' : ''}
        </span>
        <span class="poll-meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${timeAgo(poll.createdAt)}
        </span>
      </div>
      <div class="poll-actions">
        ${voted ? `<span class="poll-meta-item" style="color:var(--accent)">✓ Voted</span>` : ''}
      </div>
    </div>`;

  // Vote listener
  card.querySelectorAll('.poll-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      const pollId = opt.dataset.poll;
      const idx = parseInt(opt.dataset.index);
      if (hasVoted(pollId)) { showToast('Already voted on this market!', 'info'); return; }
      await castVote(pollId, idx);
    });
  });

  return card;
}

// ── Escape HTML
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Cast vote
async function castVote(pollId, optionIndex) {
  try {
    const res = await fetch(`${API}/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionIndex })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    setVoted(pollId, optionIndex);
    showToast('Vote cast! 🎯', 'success');

    // Update card in place
    updateCard(data.poll);
    updateStats();

  } catch (err) {
    showToast(err.message || 'Vote failed', 'error');
  }
}

// ── Update a single card in the grid
function updateCard(poll) {
  const existing = document.querySelector(`[data-poll-id="${poll._id}"]`);
  if (!existing) return;
  const fresh = buildPollCard(poll);
  fresh.style.animationDuration = '0s'; // skip animation on update
  existing.replaceWith(fresh);
}

// Function completely removed

function checkEmpty() {
  const container = document.getElementById('polls-container');
  if (!container) return;
  const cards = container.querySelectorAll('.poll-card');
  if (cards.length === 0) renderEmpty(container);
}

// ── Fetch and render all polls
async function loadPolls(silent = false) {
  const container = document.getElementById('polls-container');
  if (!container) return;

  if (!silent) {
    container.innerHTML = '<div class="loading-spinner"></div>';
  }

  try {
    const res = await fetch(`${API}?sort=${currentSort}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    allPolls = data.polls;
    renderPolls(allPolls);
    updateStats();
    renderTrending();

  } catch (err) {
    if (!silent) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load polls</div>
        <p>${err.message}</p>
      </div>`;
    }
  }
}

// ── Render polls to grid
function renderPolls(polls) {
  const container = document.getElementById('polls-container');
  if (!container) return;

  let filtered = polls;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = polls.filter(p =>
      p.question.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    renderEmpty(container);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'polls-grid';

  filtered.forEach((poll, i) => {
    const card = buildPollCard(poll);
    card.style.animationDelay = `${i * 0.05}s`;
    grid.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

function renderEmpty(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔮</div>
      <div class="empty-title">${searchQuery ? 'No results found' : 'No polls yet'}</div>
      <p>${searchQuery ? 'Try a different search term' : 'Be the first to create a prediction market!'}</p>
      ${!searchQuery ? `<a href="/create.html" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">Create First Poll</a>` : ''}
    </div>`;
}

// ── Render trending section
function renderTrending() {
  const section = document.getElementById('trending-section');
  const grid = document.getElementById('trending-grid');
  if (!section || !grid) return;

  const top3 = [...allPolls].sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 3);

  if (top3.length === 0 || top3[0].totalVotes === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  grid.innerHTML = '';

  top3.forEach((poll, i) => {
    const card = document.createElement('div');
    card.className = 'trending-card';
    card.innerHTML = `
      <div class="trending-rank">${i + 1}</div>
      <div class="trending-content">
        <div class="trending-q">${escHtml(poll.question)}</div>
        <div class="trending-votes">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          ${fmt(poll.totalVotes)} votes
        </div>
      </div>
      <div class="trending-indicator"></div>`;
    card.addEventListener('click', () => {
      const el = document.querySelector(`[data-poll-id="${poll._id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    grid.appendChild(card);
  });
}

// ── Update stats bar
function updateStats() {
  const totalVotes = allPolls.reduce((s, p) => s + p.totalVotes, 0);
  const active = allPolls.filter(p => p.totalVotes > 0).length;

  const sp = document.getElementById('stat-polls');
  const sv = document.getElementById('stat-votes');
  const sa = document.getElementById('stat-active');

  if (sp) animateNum(sp, allPolls.length);
  if (sv) animateNum(sv, totalVotes);
  if (sa) animateNum(sa, active);
}

function animateNum(el, target) {
  const current = parseInt(el.textContent.replace(/[^0-9]/g, '')) || 0;
  if (current === target) return;
  el.textContent = fmt(target);
}

// ── Sort tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    if (currentSort === 'popular') {
      allPolls.sort((a, b) => b.totalVotes - a.totalVotes);
    } else {
      allPolls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    renderPolls(allPolls);
  });
});

// ── Search
let searchTimeout;
document.getElementById('search-input')?.addEventListener('input', e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.trim();
    renderPolls(allPolls);
  }, 250);
});

// ── Toast
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Auto-refresh every 5 seconds (silent)
autoRefreshInterval = setInterval(() => loadPolls(true), 5000);

// ── Init
loadPolls();
