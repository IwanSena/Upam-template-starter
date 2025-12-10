/**
 * UPAM TEMPLATE ENGINE V2
 * Updates: Regex Frontmatter Fix, Search Logic, Safety Guards
 */

const el = (id) => document.getElementById(id);
let allPostsData = []; // Menyimpan data untuk fitur search

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
    
    // Init Search Listener
    const searchInput = el('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    }
});

// 2. CONFIG LOADER
async function loadConfig() {
    try {
        const res = await fetch('config.json');
        if(res.ok) {
            const conf = await res.json();
            document.title = conf.title || "My Blog";
            if(el('nav-brand')) el('nav-brand').innerText = conf.title || "My Site";
            if(el('hero-title')) el('hero-title').innerText = conf.hero_title || conf.title;
            if(el('hero-desc')) el('hero-desc').innerText = conf.hero_desc || conf.description;
            if(el('footer-text')) el('footer-text').innerHTML = conf.footer || "&copy; 2025 Upam Site";
            if(conf.color) document.documentElement.style.setProperty('--primary', conf.color);
        }
    } catch(e) { console.log("Config load failed, using defaults"); }
}

// 3. HOME LOADER
async function loadHome() {
    try {
        // Cache Buster agar user selalu dapat update terbaru
        const res = await fetch('index.json?t=' + new Date().getTime());
        if(!res.ok) throw new Error("Index not found");
        
        const posts = await res.json();
        
        // Simpan ke variabel global untuk fitur search
        allPostsData = posts.filter(p => !p.draft); 
        
        renderPosts(allPostsData);
        renderSidebar(allPostsData);
    } catch(e) {
        el('content-area').innerHTML = `<div style="text-align:center; padding:50px; color:#64748b;">
            <i class="fas fa-book-open" style="font-size:40px; margin-bottom:20px;"></i>
            <h3>Siap untuk Menulis?</h3>
            <p>Gunakan Ekstensi <b>Upam Pro</b> untuk menerbitkan artikel pertama Anda.</p>
        </div>`;
    }
}

function renderPosts(posts) {
    const container = el('content-area');
    if(posts.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">Tidak ada artikel ditemukan.</p>';
        return;
    }

    container.innerHTML = '<div class="posts-grid"></div>';
    const grid = container.querySelector('.posts-grid');

    posts.forEach(p => {
        const card = document.createElement('div');
        card.className = 'post-card';
        // Handle tags array or string
        let tagsHtml = 'General';
        if(Array.isArray(p.tags)) tagsHtml = p.tags.join(', ');
        
        card.innerHTML = `
            <small class="post-meta"><i class="far fa-calendar"></i> ${p.date || 'Today'} • <i class="fas fa-tag"></i> ${tagsHtml}</small>
            <h2 class="post-title"><a href="?slug=${p.slug}">${p.title}</a></h2>
            <a href="?slug=${p.slug}" class="btn-read">Baca Selengkapnya &rarr;</a>
        `;
        grid.appendChild(card);
    });
}

// 4. ARTICLE LOADER (FIXED REGEX)
async function loadArticle(slug) {
    el('hero-section').classList.add('hidden'); // Sembunyikan Hero Header
    const container = el('content-area');
    container.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Memuat artikel...</div>';

    try {
        const res = await fetch(`posts/${slug}.md`);
        if(!res.ok) throw new Error("Artikel tidak ditemukan");
        const text = await res.text();

        // --- NEW ROBUST PARSING LOGIC ---
        // Regex ini memisahkan Frontmatter (di antara ---) dan Body
        const yamlRegex = /^---\n([\s\S]+?)\n---\n([\s\S]*)$/;
        const match = text.match(yamlRegex);

        let bodyMarkdown = text; 
        let title = 'Tanpa Judul';
        let date = '';

        if (match) {
            const metaRaw = match[1];
            bodyMarkdown = match[2];
            
            // Extract Title & Date manually from raw string
            const titleMatch = metaRaw.match(/title:\s*"(.*?)"/);
            const dateMatch = metaRaw.match(/date:\s*"(.*?)"/);
            if(titleMatch) title = titleMatch[1];
            if(dateMatch) date = dateMatch[1];
        } 
        // --------------------------------

        document.title = title;
        container.innerHTML = `
            <article>
                <header class="article-header">
                    <div class="article-date"><i class="far fa-calendar-alt"></i> ${date}</div>
                    <h1 class="article-title">${title}</h1>
                </header>
                <div class="markdown-body">
                    ${marked.parse(bodyMarkdown)}
                </div>
                <div style="margin-top:50px; border-top:1px solid #eee; padding-top:20px;">
                    <a href="index.html" style="font-weight:bold; color:var(--primary); text-decoration:none;">
                        &larr; Kembali ke Beranda
                    </a>
                </div>
            </article>
        `;

        // Load sidebar juga di halaman artikel
        const idxRes = await fetch('index.json');
        if(idxRes.ok) {
            const posts = await idxRes.json();
            renderSidebar(posts.filter(p => !p.draft));
        }

    } catch(e) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px;">
                <h3>404 Not Found</h3>
                <p>Maaf, artikel yang Anda cari tidak ditemukan.</p>
                <a href="index.html" class="btn-read">Kembali ke Depan</a>
            </div>`;
    }
}

// 5. SIDEBAR & SEARCH LOGIC
function renderSidebar(posts) {
    // Recent Posts Widget
    const recent = posts.slice(0, 5);
    const list = el('widget-recent');
    if(list) {
        list.innerHTML = '';
        recent.forEach(p => {
            list.innerHTML += `<li><a href="?slug=${p.slug}">${p.title}</a></li>`;
        });
    }

    // Tags Cloud Widget
    const tags = new Set();
    posts.forEach(p => {
        if(Array.isArray(p.tags)) p.tags.forEach(t => tags.add(t));
    });
    const tagBox = el('widget-tags');
    if(tagBox) {
        tagBox.innerHTML = '';
        if(tags.size === 0) tagBox.innerHTML = '<small>No tags</small>';
        tags.forEach(t => {
            tagBox.innerHTML += `<span class="tag">#${t}</span>`;
        });
    }
}

function handleSearch(keyword) {
    if(!keyword) {
        renderPosts(allPostsData); // Tampilkan semua jika kosong
        return;
    }
    const term = keyword.toLowerCase();
    const filtered = allPostsData.filter(p => 
        p.title.toLowerCase().includes(term)
    );
    renderPosts(filtered);
}
