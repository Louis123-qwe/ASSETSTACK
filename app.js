// ============================================
// ASSET STACK v3 — High-Converting Funnel JS
// ============================================

import { initializeApp }            from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
    apiKey:            "AIzaSyDzqvg6xz-acaxKrKEQ7Ht5M9mzcrGAIhw",
    authDomain:        "asset-stack.firebaseapp.com",
    databaseURL:       "https://asset-stack-default-rtdb.firebaseio.com",
    projectId:         "asset-stack",
    storageBucket:     "asset-stack.firebasestorage.app",
    messagingSenderId: "324975878662",
    appId:             "1:324975878662:web:91f270faa2d57151ad9987"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ── State ──
let allAssets    = [];
let activeFilter = 'All';
let activeSort   = 'newest';

// ── Category emoji/path map ──
const catEmoji = { 'Financial Utility':'💰','Tech Stack':'💻','Marketing Tool':'📣','Bounty':'🎯' };
const pathMap  = {
    beginners: ['Financial Utility','Marketing Tool'],
    affiliate:  ['Marketing Tool','Bounty'],
    developers: ['Tech Stack'],
    passive:    ['Marketing Tool','Financial Utility']
};

// ── ROI labels per category ──
const roiLabels = {
    'Financial Utility': 'High ROI',
    'Tech Stack':        'Dev Pick',
    'Marketing Tool':    'Top Earner',
    'Bounty':            'Quick Win'
};

// ── DOM refs ──
const container    = document.getElementById('product-container');
const countDisplay = document.getElementById('asset-count');
const showingEl    = document.getElementById('showing-count');

// ── Firebase listener ──
onValue(ref(db, 'products'), (snap) => {
    const data = snap.val();
    if (data) {
        allAssets = Object.keys(data).map(k => ({ id: k, ...data[k] })).reverse();
        countDisplay.innerText = allAssets.length;
        updateFilterCounts();
        renderAssets(getFilteredSorted());
    } else {
        container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>No tools live yet</h3><p>Check back soon or visit the Admin panel.</p></div>`;
        countDisplay.innerText = '0';
    }
});

// ── Filtering + Sorting ──
function getFilteredSorted() {
    let assets = activeFilter === 'All'
        ? [...allAssets]
        : allAssets.filter(a => a.category === activeFilter);

    const q = document.getElementById('search-input').value.toLowerCase().trim();
    if (q) assets = assets.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.category||'').toLowerCase().includes(q) ||
        (a.description||'').toLowerCase().includes(q)
    );

    if (activeSort === 'oldest')  assets.reverse();
    if (activeSort === 'name')    assets.sort((a,b) => a.name.localeCompare(b.name));
    if (activeSort === 'rating')  assets.sort((a,b) => {
        const ra = (a.ratingSum && a.ratingCount) ? a.ratingSum/a.ratingCount : (a.defaultRating||0);
        const rb = (b.ratingSum && b.ratingCount) ? b.ratingSum/b.ratingCount : (b.defaultRating||0);
        return rb - ra;
    });

    return assets;
}

// ── Render cards ──
function renderAssets(assets) {
    showingEl.innerText = `Showing ${assets.length} tool${assets.length !== 1 ? 's' : ''}`;

    if (!assets.length) {
        container.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><h3>No results found</h3><p>Try a different search or filter.</p></div>`;
        return;
    }

    container.innerHTML = assets.map(p => {
        const avgRating = (p.ratingSum && p.ratingCount)
            ? Math.round(p.ratingSum / p.ratingCount)
            : (p.defaultRating || 0);
        const totalVotes = p.ratingCount || 0;
        const stars = [1,2,3,4,5].map(i =>
            `<span class="star ${avgRating >= i ? 'filled':''}" onclick="rateAsset('${p.id}',${i})">★</span>`
        ).join('');
        const voteLabel = totalVotes > 0
            ? `${(p.ratingSum/p.ratingCount).toFixed(1)} · ${totalVotes} vote${totalVotes>1?'s':''}`
            : 'Rate this tool';

        const imgHtml = p.image
            ? `<img class="card-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : '';
        const placeholder = `<div class="card-placeholder" ${p.image?'style="display:none"':''}>${catEmoji[p.category]||'📦'}</div>`;

        // Click tracking
        const trackedLink = `javascript:trackAndOpen('${p.id}','${p.link}')`;

        return `
        <div class="tool-card" id="card-${p.id}">
            <div class="card-image-wrap">
                ${imgHtml}${placeholder}
                <span class="card-category-badge">${p.category}</span>
                <span class="card-roi-badge">${roiLabels[p.category]||'Audited'}</span>
            </div>
            <div class="card-body">
                <div class="card-header">
                    <h3 class="card-name">${p.name}</h3>
                    <span class="card-price">${p.price}</span>
                </div>
                <p class="card-desc">${p.description || 'No description provided.'}</p>
                <div class="card-stars-row">
                    ${stars}
                    <span class="card-vote-label">${voteLabel}</span>
                </div>
                <div class="card-footer">
                    <button class="btn-roi" onclick="openModal('${p.id}')">View ROI Breakdown →</button>
                    <button class="btn-share-icon" onclick="shareAsset('${p.name}','${p.link}')" title="Share">↗</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Click tracking ──
window.trackAndOpen = (id, link) => {
    // Track clicks in Firebase
    runTransaction(ref(db, `products/${id}/clicks`), c => (c||0) + 1).catch(()=>{});
    window.open(link, '_blank', 'noopener');
};

// ── Filter ──
window.filterAssets = (cat, btn) => {
    activeFilter = cat;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('search-input').value = '';
    renderAssets(getFilteredSorted());
};

// ── Path filter (Start Here) ──
window.filterByPath = (path) => {
    const cats = pathMap[path];
    if (!cats) return;
    const filtered = allAssets.filter(a => cats.includes(a.category));
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    renderAssets(filtered);
    document.getElementById('tools').scrollIntoView({ behavior:'smooth' });
    showingEl.innerText = `Showing ${filtered.length} tools for your goal`;
};

// ── Sort ──
window.sortAssets = (val) => {
    activeSort = val;
    renderAssets(getFilteredSorted());
};

// ── Filter counts ──
function updateFilterCounts() {
    ['Financial Utility','Tech Stack','Marketing Tool','Bounty'].forEach(cat => {
        const el = document.getElementById(`count-${cat.replace(/\s/g,'-')}`);
        if (el) el.textContent = allAssets.filter(a => a.category === cat).length;
    });
    const allEl = document.getElementById('count-All');
    if (allEl) allEl.textContent = allAssets.length;
}

// ── Search ──
document.getElementById('search-input').addEventListener('input', () => renderAssets(getFilteredSorted()));
document.getElementById('search-input').addEventListener('keydown', e => { if(e.key==='Escape') { document.getElementById('search-input').value=''; renderAssets(getFilteredSorted()); }});

// ── ROI Modal ──
window.openModal = (id) => {
    const p = allAssets.find(a => a.id === id);
    if (!p) return;

    // Track modal opens
    runTransaction(ref(db, `products/${id}/modalOpens`), c => (c||0) + 1).catch(()=>{});

    const avgRating = (p.ratingSum && p.ratingCount)
        ? (p.ratingSum/p.ratingCount).toFixed(1)
        : (p.defaultRating || '—');

    const imgHtml = p.image
        ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`
        : `<div class="modal-img-placeholder">${catEmoji[p.category]||'📦'}</div>`;

    document.getElementById('modal-content').innerHTML = `
        <div class="modal-img-wrap">${imgHtml}</div>
        <div class="modal-body">
            <div class="modal-badges">
                <span class="modal-cat">${p.category}</span>
                <span class="modal-roi">${roiLabels[p.category]||'Audited'}</span>
            </div>
            <h2 class="modal-title">${p.name}</h2>
            <div class="modal-price">Starting at ${p.price}</div>

            <div class="modal-section-title">ROI Breakdown</div>
            <div class="modal-roi-grid">
                <div class="roi-box">
                    <div class="roi-box-label">Expert Rating</div>
                    <div class="roi-box-val positive">⭐ ${avgRating}/5</div>
                </div>
                <div class="roi-box">
                    <div class="roi-box-label">Price Point</div>
                    <div class="roi-box-val">${p.price}</div>
                </div>
            </div>

            <div class="modal-section-title">Expert Analysis</div>
            <p class="modal-desc">${p.description || 'No description provided.'}</p>

            <div class="modal-section-title">Who This Is Best For</div>
            <p class="modal-desc">Developers, entrepreneurs and finance professionals looking to maximise the value of every dollar spent on tools and infrastructure.</p>

            <div class="modal-footer">
                <a href="${p.link}" target="_blank" rel="noopener" class="modal-cta" onclick="trackAndOpen('${p.id}','${p.link}');return false;">
                    Get Started — ${p.price} →
                </a>
                <button class="modal-close" onclick="closeModal()">Close</button>
            </div>
        </div>`;

    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
};

window.handleModalClick = (e) => {
    if (e.target === e.currentTarget) window.closeModal();
};

document.addEventListener('keydown', e => { if(e.key==='Escape') window.closeModal(); });

// ── Star ratings ──
window.rateAsset = async (id, score) => {
    const card = document.getElementById(`card-${id}`);
    if (card) card.querySelectorAll('.star').forEach((s,i) => s.classList.toggle('filled', i < score));
    showToast(`Rated ${score} star${score>1?'s':''} ⭐`);
    try {
        await runTransaction(ref(db, `products/${id}/ratingSum`),   c => (c||0) + score);
        await runTransaction(ref(db, `products/${id}/ratingCount`), c => (c||0) + 1);
    } catch(e) { console.warn('Rating failed', e); }
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
    showToast('✅ Subscribed! Weekly ROI report incoming.');
    document.getElementById('nl-email').value = '';
};

// ── Toast ──
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Sticky CTA + Nav scroll ──
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 60) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');

    const stickyCta = document.getElementById('sticky-cta');
    if (window.scrollY > 400) stickyCta.style.display = 'block';
    else stickyCta.style.display = 'none';
});

// ── Dark / Light mode ──
const savedTheme = localStorage.getItem('as_theme') || 'dark';
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
    navigator.serviceWorker.register('sw.js').catch(()=>{});
}
