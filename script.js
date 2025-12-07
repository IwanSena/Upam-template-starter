/**
 * UPAM TEMPLATE ENGINE
 * Handles: Config loading, Routing, Markdown Rendering
 */

const el = (id) => document.getElementById(id);

// 1. INIT
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    
    // Simple Router
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (slug) {
        loadArticle(slug);
    } else {
        loadHome();
    }
});

// 2. CONFIG LOADER
async function loadConfig() {
    try {
        const res = await fetch('config.json');
        const conf = await res.json();
        
        document.title = conf.title;
        el('nav-brand').innerText = conf.title;
        el('hero-title').innerText = conf.hero_title || conf.title;
        el('hero-desc').innerText = conf.hero_desc || conf.description;
        el('footer-text').innerHTML = conf.footer || "&copy; 2025 Upam Site";
        
        // CSS Variable Injection
        if(conf.color) document.documentElement.style.setProperty('--primary', conf.color);
    } catch(e) { console.log("Config default loaded"); }
}

// 3. HOME LOADER
async function loadHome() {
    try {
        const res = await fetch('index.json');
        if(!res.ok) throw new Error("Index not found");
        
        const posts = await res.json();
        renderPosts(posts);
        renderSidebar(posts);
    } catch(e) {
        el('content-area').innerHTML = `<div style="text-align:center; padding:50px;">
            <h3>Belum ada konten</h3>
            <p>Gunakan Upam Pro untuk menerbitkan artikel pertama Anda.</p>
        </div>`;
    }
}

function renderPosts(posts) {
    const container = el('content-area');
    container.innerHTML = '<div class="posts-grid"></div>';
    const grid = container.querySelector('.posts-grid');

    // Filter: Hide drafts
    const published = posts.filter(p => !p.draft);

    published.forEach(p => {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <small class="post-meta">${p.date} • ${p.tags ? p.tags.join(', ') : 'General'}</small>
            <h2 class="post-title"><a href="?slug=${p.slug}">${p.title}</a></h2>
            <a href="?slug=${p.slug}" class="btn-read">Baca Selengkapnya &rarr;</a>
        `;
        grid.appendChild(card);
    });
}

// 4. ARTICLE LOADER
async function loadArticle(slug) {
    // Hide Hero on Article Page
    el('hero-section').classList.add('hidden');
    const container = el('content-area');
    container.innerHTML = '<div class="loader">Memuat artikel...</div>';

    try {
        const res = await fetch(`posts/${slug}.md`);
        if(!res.ok) throw new Error("Artikel tidak ditemukan");
        const text = await res.text();

        // Separate Frontmatter (--- ... ---) from Body
        const parts = text.split('---');
        const bodyMarkdown = parts.slice(2).join('---'); // Content after second ---
        const metaRaw = parts[1]; // Content between ---

        // Extract Title from Frontmatter
        const titleMatch = metaRaw.match(/title:\s*"(.*?)"/);
        const title = titleMatch ? titleMatch[1] : 'Tanpa Judul';
        const dateMatch = metaRaw.match(/date:\s*"(.*?)"/);
        const date = dateMatch ? dateMatch[1] : '';

        // Render
        document.title = title;
        container.innerHTML = `
            <article>
                <header class="article-header">
                    <div class="article-date">${date}</div>
                    <h1 class="article-title">${title}</h1>
                </header>
                <div class="markdown-body">
                    ${marked.parse(bodyMarkdown)}
                </div>
                <div style="margin-top:50px; border-top:1px solid #eee; padding-top:20px;">
                    <a href="index.html" style="font-weight:bold; color:var(--primary)">&larr; Kembali ke Beranda</a>
                </div>
            </article>
        `;

        // Load sidebar for consistency
        const idxRes = await fetch('index.json');
        const posts = await idxRes.json();
        renderSidebar(posts);

    } catch(e) {
        container.innerHTML = `<h3>404 Error</h3><p>Artikel tidak ditemukan.</p><a href="index.html">Kembali</a>`;
    }
}

// 5. SIDEBAR WIDGETS
function renderSidebar(posts) {
    // Recent Posts
    const recent = posts.slice(0, 5);
    const list = el('widget-recent');
    list.innerHTML = '';
    recent.forEach(p => {
        list.innerHTML += `<li><a href="?slug=${p.slug}">${p.title}</a></li>`;
    });

    // Tags Cloud
    const tags = new Set();
    posts.forEach(p => {
        if(p.tags) p.tags.forEach(t => tags.add(t));
    });
    const tagBox = el('widget-tags');
    tagBox.innerHTML = '';
    tags.forEach(t => {
        tagBox.innerHTML += `<span class="tag">#${t}</span>`;
    });
}
