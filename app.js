// =============================================
// ASSET STACK — Main JS v2 (app.js)
// Images, Read More modal, Dark/Light mode
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzqvg6xz-acaxKrKEQ7Ht5M9mzcrGAIhw",
    authDomain: "asset-stack.firebaseapp.com",
    databaseURL: "https://asset-stack-default-rtdb.firebaseio.com",
    projectId: "asset-stack",
    storageBucket: "asset-stack.firebasestorage.app",
    messagingSenderId: "324975878662",
    appId: "1:324975878662:web:91f270faa2d57151ad9987"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ── State ──
let allAssets  = [];
let activeFilter = 'All';

const container    = document.getElementById('product-container');
const countDisplay = document.getElementById('asset-count');
const showingCount = document.getElementById('showing-count');

// ── Category emoji map ──
const catEmoji = {
    'Financial Utility': '💰',
    'Tech Stack':        '⚙️',
    'Marketing Tool':    '📣',
    'Bounty':            '🎯'
};
const catPlaceholder = {
    'Financial Utility': '💰',
    'Tech Stack':        '💻',
    'Marketing Tool':    '📣',
    'Bounty':            '🎯'
};

// ── Firebase listener ──
onValue(ref(db, 'products'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        allAssets = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
        countDisplay.innerText = allAssets.length;
        updateFilterCounts();
        renderAssets(allAssets);
    } else {
        container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>No assets live yet</h3><p>Check back soon or visit the Admin panel.</p></div>`;
        countDisplay.innerText = '0';
    }
});

// ── Render cards ──
function renderAssets(assets) {
    showingCount.innerText = `Showing ${assets.length} asset${assets.length !== 1 ? 's' : ''}`;
    if (!assets.length) {
        container.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><h3>No results found</h3><p>Try a different search or filter.</p></div>`;
        return;
    }
    container.innerHTML = assets.map(p => {
        const avgRating = (p.ratingSum && p.ratingCount) ? Math.round(p.ratingSum / p.ratingCount) : (p.defaultRating || 0);
        const totalVotes = p.ratingCount || 0;
        const stars = [1,2,3,4,5].map(i =>
            `<span class="star ${avgRating >= i ? 'filled':''}" onclick="rateAsset('${p.id}',${i})">★</span>`
        ).join('');
        const voteLabel = totalVotes > 0 ? `<span class="card-votes">${avgRating.toFixed(1)} · ${totalVotes} vote${totalVotes>1?'s':''}</span>` : '<span class="card-votes">Be first to rate</span>';
        const imgHtml = p.image
            ? `<img class="card-image" src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : '';
        const placeholder = `<div class="card-image-placeholder" ${p.image ? 'style="display:none"' : ''}>${catPlaceholder[p.category] || '📦'}</div>`;

        return `
        <div class="card" id="card-${p.id}">
            ${imgHtml}${placeholder}
            <div class="card-body">
                <div class="card-top">
                    <span class="card-category">${p.category}</span>
                    <span class="card-price">${p.price}</span>
                </div>
                <h3 class="card-name">${p.name}</h3>
                <p class="card-desc">${p.description || 'No description provided.'}</p>
                <button class="card-read-more" onclick="openModal('${p.id}')">Read more →</button>
                <div class="card-stars">${stars}${voteLabel}</div>
                <div class="card-footer">
                    <a href="${p.link}" target="_blank" rel="noopener" class="btn-primary">Analyze Deal →</a>
                    <button class="btn-share" onclick="shareAsset('${p.name}','${p.link}')" title="Share">↗</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Filter ──
window.filterAssets = (cat, btn) => {
    activeFilter = cat;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('search-input').value = '';
    renderAssets(cat === 'All' ? allAssets : allAssets.filter(a => a.category === cat));
};

// ── Update filter counts ──
function updateFilterCounts() {
    const cats = ['Financial Utility','Tech Stack','Marketing Tool','Bounty'];
    cats.forEach(cat => {
        const el = document.getElementById(`count-${cat.replace(/\s/g,'-')}`);
        if (el) el.textContent = allAssets.filter(a => a.category === cat).length;
    });
    const allEl = document.getElementById('count-All');
    if (allEl) allEl.textContent = allAssets.length;
}

// ── Search ──
window.doSearch = () => {
    const q = document.getElementById('search-input').value.toLowerCase().trim();
    const pool = activeFilter === 'All' ? allAssets : allAssets.filter(a => a.category === activeFilter);
    if (!q) { renderAssets(pool); return; }
    renderAssets(pool.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.category||'').toLowerCase().includes(q) ||
        (a.description||'').toLowerCase().includes(q)
    ));
};
document.getElementById('search-input').addEventListener('input', window.doSearch);
document.getElementById('search-input').addEventListener('keydown', e => { if(e.key==='Enter') window.doSearch(); });

// ── Sort ──
window.sortAssets = (val) => {
    let sorted = [...allAssets];
    if (val === 'oldest')  sorted = allAssets.slice().reverse();
    if (val === 'name')    sorted.sort((a,b) => a.name.localeCompare(b.name));
    renderAssets(sorted);
};

// ── Read More Modal ──
window.openModal = (id) => {
    const p = allAssets.find(a => a.id === id);
    if (!p) return;
    const overlay = document.getElementById('modal-overlay');
    const imgHtml = p.image
        ? `<img class="modal-img" src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : '';
    const placeholder = `<div class="modal-img-placeholder" ${p.image ? 'style="display:none"' : ''}>${catPlaceholder[p.category] || '📦'}</div>`;

    document.getElementById('modal-content').innerHTML = `
        ${imgHtml}${placeholder}
        <div class="modal-body">
            <span class="modal-cat">${p.category}</span>
            <h2 class="modal-title">${p.name}</h2>
            <div class="modal-price">${p.price}</div>
            <p class="modal-desc">${p.description || 'No description provided.'}</p>
            <div class="modal-footer">
                <a href="${p.link}" target="_blank" rel="noopener" class="btn-primary" style="flex:1;display:block;text-align:center;padding:13px;">Analyze Deal →</a>
                <button class="modal-close" onclick="closeModal()">Close</button>
            </div>
        </div>`;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
};
window.closeModal = () => {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
};
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) window.closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeModal(); });

// ── Star ratings — saved to Firebase, averaged across all visitors ──
window.rateAsset = async (id, score) => {
    // Optimistic UI update
    const card = document.getElementById(`card-${id}`);
    if (card) card.querySelectorAll('.star').forEach((s,i) => s.classList.toggle('filled', i < score));
    showToast(`Rated ${score} star${score > 1 ? 's':''} ⭐`);

    // Save to Firebase via transaction (thread-safe average)
    try {
        await runTransaction(ref(db, `products/${id}/ratingSum`), current => (current || 0) + score);
        await runTransaction(ref(db, `products/${id}/ratingCount`), current => (current || 0) + 1);
    } catch(e) {
        console.warn('Rating save failed:', e);
    }
};

// ── Share ──
window.shareAsset = (name, link) => {
    if (navigator.share) {
        navigator.share({ title: name, url: link });
    } else {
        navigator.clipboard.writeText(link).then(() => showToast('Link copied! 📋'));
    }
};

// ── Newsletter ──
window.subscribeNewsletter = () => {
    const email = document.getElementById('nl-email').value;
    if (!email || !email.includes('@')) { showToast('Please enter a valid email.'); return; }
    showToast("✅ Subscribed! Welcome to the Stack.");
    document.getElementById('nl-email').value = '';
};

// ── Toast ──
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Dark / Light mode ──
const savedTheme = localStorage.getItem('as_theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

window.toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('as_theme', next);
    updateThemeIcon(next);
};

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── PWA ──
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
