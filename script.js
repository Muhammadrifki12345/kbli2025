// script.js — SiBaku KBLI 2025 Search Application
// Full-featured: Fuse.js fuzzy search, category sidebar, grid/list toggle,
// search history, dark mode, copy/share, autocomplete, and modal details.

(() => {
  'use strict';

  // ── Constants ──
  const DATA_URL = 'kbli.json';
  const HISTORY_KEY = 'sibaku_search_history';
  const THEME_KEY = 'sibaku_theme';
  const MAX_HISTORY = 15;

  // Full KBLI Category Map A–V (KBLI 2025)
  const KATEGORI_MAP = {
    A: 'Pertanian, Kehutanan, dan Perikanan',
    B: 'Pertambangan dan Penggalian',
    C: 'Industri Pengolahan',
    D: 'Pengadaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin',
    E: 'Pengadaan Air, Pengelolaan Air Limbah, Penanganan Limbah, dan Aktivitas Remediasi',
    F: 'Konstruksi',
    G: 'Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor',
    H: 'Transportasi dan Pergudangan',
    I: 'Penyediaan Akomodasi dan Makanan Minuman',
    J: 'Penerbitan, Penyiaran, dan Produksi Konten',
    K: 'Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputer, dan Jasa Informasi',
    L: 'Aktivitas Keuangan dan Asuransi',
    M: 'Aktivitas Real Estat',
    N: 'Aktivitas Profesional, Ilmiah, dan Teknis',
    O: 'Aktivitas Administratif dan Penunjang Usaha',
    P: 'Administrasi Pemerintahan, Pertahanan, dan Jaminan Sosial Wajib',
    Q: 'Pendidikan',
    R: 'Aktivitas Kesehatan Manusia dan Pekerjaan Sosial',
    S: 'Kesenian, Hiburan, dan Rekreasi',
    T: 'Aktivitas Jasa Lainnya',
    U: 'Aktivitas Rumah Tangga sebagai Pemberi Kerja dan Aktivitas Produksi Barang/Jasa untuk Keperluan Sendiri',
    V: 'Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya',
  };

  // ── DOM References ──
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-btn');
  const autocompleteList = document.getElementById('autocomplete-list');
  const categoryList = document.getElementById('category-list');
  const resultsContainer = document.getElementById('results');
  const resultCount = document.getElementById('result-count');
  const totalEntriesSpan = document.getElementById('total-entries');
  const emptyState = document.getElementById('empty-state');
  const modal = document.getElementById('details-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCopyBtn = document.getElementById('modal-copy-btn');
  const modalShareBtn = document.getElementById('modal-share-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const historyBtn = document.getElementById('nav-history-btn');
  const historyPanel = document.getElementById('history-panel');
  const historyCloseBtn = document.getElementById('history-close-btn');
  const historyListEl = document.getElementById('history-list');
  const historyClearBtn = document.getElementById('history-clear-btn');
  const sidebarToggle = document.getElementById('sidebar-toggle-mobile');
  const viewGridBtn = document.getElementById('view-grid-btn');
  const viewListBtn = document.getElementById('view-list-btn');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');

  // ── State ──
  let data = [];
  let fuse = null;
  let activeCategory = '';
  let currentModalItem = null;
  let viewMode = 'grid';

  // ── Utility ──
  const debounce = (fn, delay = 200) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const showToast = (msg, duration = 2500) => {
    toastMsg.textContent = msg;
    toast.classList.remove('hidden');
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 250);
    }, duration);
  };

  // ── Theme ──
  const initTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') {
      document.body.classList.add('dark');
      updateThemeIcons(true);
    }
  };

  const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
  };

  const updateThemeIcons = (isDark) => {
    const sunIcon = themeToggleBtn.querySelector('.icon-sun');
    const moonIcon = themeToggleBtn.querySelector('.icon-moon');
    if (isDark) {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    } else {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    }
  };

  // ── Data Loading ──
  const loadData = async () => {
    try {
      const resp = await fetch(DATA_URL);
      data = await resp.json();
      totalEntriesSpan.textContent = data.length;
      initFuse();
      buildCategorySidebar();
      renderResults(data);
    } catch (e) {
      console.error('Failed to load KBLI data:', e);
      resultCount.textContent = 'Gagal memuat data';
    }
  };

  // ── Fuse.js ──
  const initFuse = () => {
    fuse = new Fuse(data, {
      keys: [
        { name: 'kode', weight: 3 },
        { name: 'judul', weight: 2 },
        { name: 'keyword', weight: 1.5 },
        { name: 'deskripsi', weight: 1 },
      ],
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
    });
  };

  // ── Category Sidebar ──
  const buildCategorySidebar = () => {
    // Count items per category
    const counts = {};
    data.forEach(item => {
      counts[item.kategori] = (counts[item.kategori] || 0) + 1;
    });

    // Update "Semua" count
    const allCountEl = document.getElementById('cat-count-all');
    if (allCountEl) allCountEl.textContent = data.length;

    // Build category items from KATEGORI_MAP
    const fragment = document.createDocumentFragment();
    Object.keys(KATEGORI_MAP).sort().forEach(letter => {
      const count = counts[letter] || 0;
      const li = document.createElement('li');
      li.className = 'cat-item';
      li.dataset.cat = letter;
      li.innerHTML = `
        <span class="cat-letter kat-${letter}">${letter}</span>
        <span class="cat-name" title="${KATEGORI_MAP[letter]}">${KATEGORI_MAP[letter]}</span>
        <span class="cat-count">${count}</span>
      `;
      li.addEventListener('click', () => selectCategory(letter));
      fragment.appendChild(li);
    });

    // Keep the "All" item
    const allItem = categoryList.querySelector('.cat-item[data-cat=""]');
    categoryList.innerHTML = '';
    if (allItem) {
      allItem.addEventListener('click', () => selectCategory(''));
      categoryList.appendChild(allItem);
    }
    categoryList.appendChild(fragment);
  };

  const selectCategory = (cat) => {
    activeCategory = cat;
    // Update active state in sidebar
    categoryList.querySelectorAll('.cat-item').forEach(el => {
      el.classList.toggle('active', el.dataset.cat === cat);
    });
    performSearch();
  };

  // ── Search ──
  const performSearch = () => {
    const query = searchInput.value.trim();
    let results;

    if (query === '') {
      results = activeCategory
        ? data.filter(item => item.kategori === activeCategory)
        : data;
    } else {
      results = fuse.search(query).map(r => r.item);
      if (activeCategory) {
        results = results.filter(item => item.kategori === activeCategory);
      }
    }

    renderResults(results);

    // Autocomplete
    if (query.length >= 1) {
      const suggestions = fuse.search(query);
      updateAutocomplete(suggestions);
    } else {
      autocompleteList.classList.add('hidden');
    }
  };

  // ── Render Results ──
  const renderResults = (list) => {
    resultsContainer.innerHTML = '';
    if (!list || list.length === 0) {
      emptyState.classList.remove('hidden');
      resultCount.textContent = '0 hasil ditemukan';
      return;
    }
    emptyState.classList.add('hidden');
    resultCount.textContent = `${list.length} hasil ditemukan`;

    const fragment = document.createDocumentFragment();
    list.forEach((item, i) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.tabIndex = 0;
      card.style.animationDelay = `${Math.min(i * 30, 300)}ms`;

      const keywordTags = (item.keyword || []).slice(0, 4)
        .map(k => `<span class="tag">${k}</span>`)
        .join('');

      card.innerHTML = `
        <div class="card-header">
          <span class="card-kode">${item.kode}</span>
          <span class="card-kategori kat-${item.kategori}">${item.kategori}</span>
        </div>
        <h2 class="card-judul">${item.judul}</h2>
        <p class="card-desc">${item.deskripsi}</p>
        <div class="card-keywords">${keywordTags}</div>
      `;
      card.addEventListener('click', () => openModal(item));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openModal(item);
      });
      fragment.appendChild(card);
    });
    resultsContainer.appendChild(fragment);
  };

  // ── Autocomplete ──
  const updateAutocomplete = (suggestions) => {
    autocompleteList.innerHTML = '';
    if (!suggestions || suggestions.length === 0) {
      autocompleteList.classList.add('hidden');
      return;
    }
    const fragment = document.createDocumentFragment();
    suggestions.slice(0, 6).forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="ac-kode">${s.item.kode}</span>
        <span class="ac-judul">${s.item.judul}</span>
      `;
      li.addEventListener('mousedown', e => {
        e.preventDefault();
        searchInput.value = s.item.judul;
        addToHistory(s.item.judul);
        performSearch();
        autocompleteList.classList.add('hidden');
      });
      fragment.appendChild(li);
    });
    autocompleteList.appendChild(fragment);
    autocompleteList.classList.remove('hidden');
  };

  // ── Modal ──
  const openModal = (item) => {
    currentModalItem = item;
    document.getElementById('modal-kode').textContent = item.kode;
    const katBadge = document.getElementById('modal-kategori-badge');
    katBadge.textContent = item.kategori;
    katBadge.className = `modal-kategori-badge kat-${item.kategori}`;
    document.getElementById('modal-title').textContent = item.judul;
    document.getElementById('modal-kategori-name').textContent =
      `Kategori ${item.kategori} — ${KATEGORI_MAP[item.kategori] || ''}`;
    document.getElementById('modal-desc').textContent = item.deskripsi;

    const mencakupList = document.getElementById('modal-mencakup-list');
    const tidakList = document.getElementById('modal-tidak-mencakup-list');
    const keywordsDiv = document.getElementById('modal-keywords');

    mencakupList.innerHTML = (item.mencakup || [])
      .map(v => `<li>${v}</li>`).join('');
    tidakList.innerHTML = (item.tidak_mencakup || [])
      .map(v => `<li>${v}</li>`).join('');
    keywordsDiv.innerHTML = (item.keyword || [])
      .map(k => `<span class="tag">${k}</span>`).join('');

    // Show/hide sections if empty
    document.getElementById('modal-mencakup-section')
      .classList.toggle('hidden', !(item.mencakup && item.mencakup.length));
    document.getElementById('modal-tidak-mencakup-section')
      .classList.toggle('hidden', !(item.tidak_mencakup && item.tidak_mencakup.length));

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    modalCloseBtn.focus();
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    currentModalItem = null;
  };

  // ── Copy & Share ──
  const copyCode = () => {
    if (!currentModalItem) return;
    const text = `${currentModalItem.kode} — ${currentModalItem.judul}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Kode berhasil disalin! ✓');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Kode berhasil disalin! ✓');
    });
  };

  const shareCode = () => {
    if (!currentModalItem) return;
    const shareData = {
      title: `KBLI ${currentModalItem.kode}`,
      text: `${currentModalItem.kode} — ${currentModalItem.judul}\n${currentModalItem.deskripsi}`,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.text).then(() => {
        showToast('Detail disalin ke clipboard untuk dibagikan!');
      });
    }
  };

  // ── Search History ──
  const getHistory = () => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch { return []; }
  };

  const saveHistory = (list) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  };

  const addToHistory = (query) => {
    if (!query || query.trim().length < 2) return;
    let hist = getHistory();
    hist = hist.filter(h => h !== query);
    hist.unshift(query);
    if (hist.length > MAX_HISTORY) hist = hist.slice(0, MAX_HISTORY);
    saveHistory(hist);
  };

  const renderHistory = () => {
    const hist = getHistory();
    historyListEl.innerHTML = '';
    if (hist.length === 0) {
      historyListEl.innerHTML = '<li class="history-empty">Belum ada riwayat pencarian.</li>';
      historyClearBtn.classList.add('hidden');
      return;
    }
    historyClearBtn.classList.remove('hidden');
    hist.forEach(q => {
      const li = document.createElement('li');
      li.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>${q}</span>
      `;
      li.addEventListener('click', () => {
        searchInput.value = q;
        historyPanel.classList.add('hidden');
        performSearch();
      });
      historyListEl.appendChild(li);
    });
  };

  // ── View Toggle ──
  const setViewMode = (mode) => {
    viewMode = mode;
    resultsContainer.classList.toggle('list-view', mode === 'list');
    viewGridBtn.classList.toggle('active', mode === 'grid');
    viewListBtn.classList.toggle('active', mode === 'list');
  };

  // ── Event Listeners ──
  const onInput = debounce(() => {
    const val = searchInput.value.trim();
    clearBtn.classList.toggle('hidden', !val);
    if (val.length >= 2) addToHistory(val);
    performSearch();
  }, 250);

  searchInput.addEventListener('input', onInput);

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      autocompleteList.classList.add('hidden');
    }
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) performSearch();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    autocompleteList.classList.add('hidden');
    performSearch();
    searchInput.focus();
  });

  // Modal
  modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  modalCopyBtn.addEventListener('click', copyCode);
  modalShareBtn.addEventListener('click', shareCode);

  // Theme
  themeToggleBtn.addEventListener('click', toggleTheme);

  // History
  historyBtn.addEventListener('click', () => {
    renderHistory();
    historyPanel.classList.toggle('hidden');
  });
  historyCloseBtn.addEventListener('click', () => {
    historyPanel.classList.add('hidden');
  });
  historyClearBtn.addEventListener('click', () => {
    saveHistory([]);
    renderHistory();
    showToast('Riwayat pencarian dihapus');
  });

  // Sidebar mobile toggle
  sidebarToggle.addEventListener('click', () => {
    categoryList.classList.toggle('expanded');
    sidebarToggle.style.transform = categoryList.classList.contains('expanded')
      ? 'rotate(180deg)' : '';
  });

  // View toggle
  viewGridBtn.addEventListener('click', () => setViewMode('grid'));
  viewListBtn.addEventListener('click', () => setViewMode('list'));

  // Close panels on outside click
  document.addEventListener('click', e => {
    if (!autocompleteList.contains(e.target) && e.target !== searchInput) {
      autocompleteList.classList.add('hidden');
    }
    if (!historyPanel.contains(e.target) && !historyBtn.contains(e.target)) {
      historyPanel.classList.add('hidden');
    }
  });

  // Keyboard: Escape to close modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!modal.classList.contains('hidden')) closeModal();
      if (!historyPanel.classList.contains('hidden')) historyPanel.classList.add('hidden');
    }
  });

  // ── Init ──
  initTheme();
  loadData();
})();
