// KBLI Categories definition
const KBLI_CATEGORIES = {
  "A": "Pertanian, Kehutanan, dan Perikanan",
  "B": "Pertambangan dan Penggalian",
  "C": "Industri Pengolahan",
  "D": "Pengadaan Listrik dan Gas",
  "E": "Pengadaan Air dan Pengelolaan Limbah",
  "F": "Konstruksi",
  "G": "Perdagangan Besar dan Eceran",
  "H": "Transportasi dan Pergudangan",
  "I": "Penyediaan Akomodasi dan Makan Minum",
  "J": "Informasi dan Komunikasi",
  "K": "Aktivitas Keuangan dan Asuransi",
  "L": "Real Estat",
  "M": "Aktivitas Profesional, Ilmiah, dan Teknis",
  "N": "Aktivitas Penyewaan dan Jasa Penunjang",
  "O": "Administrasi Pemerintahan",
  "P": "Pendidikan",
  "Q": "Aktivitas Kesehatan dan Sosial",
  "R": "Kesenian, Hiburan, dan Rekreasi",
  "S": "Aktivitas Jasa Lainnya",
  "T": "Aktivitas Rumah Tangga sebagai Pemberi Kerja",
  "U": "Aktivitas Badan Internasional",
  "V": "Other / Future Extension"
};

// Global state
let kbliData = [];
let fuse = null;
let activeAutocompleteIndex = -1;

// DOM Elements
const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-btn');
const autocompleteList = document.getElementById('autocomplete-list');
const categoryFilter = document.getElementById('category-filter');
const resultsGrid = document.getElementById('results');
const resultCountSpan = document.getElementById('result-count');
const totalEntriesSpan = document.getElementById('total-entries');
const emptyState = document.getElementById('empty-state');

// Initialization
async function init() {
  renderCategoryFilter();
  showLoading();
  
  try {
    const response = await fetch('kbli.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    kbliData = await response.json();
    totalEntriesSpan.textContent = kbliData.length;
    
    // Initialize Fuse.js
    const options = {
      keys: [
        { name: 'kode', weight: 0.4 },
        { name: 'judul', weight: 0.35 },
        { name: 'keyword', weight: 0.15 },
        { name: 'deskripsi', weight: 0.1 }
      ],
      threshold: 0.4, // Lower is stricter, 0.4 is a good balance for fuzzy search
      includeMatches: true,
      minMatchCharLength: 2
    };
    fuse = new Fuse(kbliData, options);
    
    // Initial render
    performSearch();
  } catch (error) {
    console.error('Gagal memuat data KBLI:', error);
    resultCountSpan.textContent = 'Gagal memuat data. Silakan refresh halaman.';
    hideLoading();
  }

  // Event Listeners
  searchInput.addEventListener('input', handleSearchInput);
  searchInput.addEventListener('keydown', handleSearchKeydown);
  clearBtn.addEventListener('click', clearSearch);
  categoryFilter.addEventListener('change', () => performSearch());
  
  // Close autocomplete on clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
      hideAutocomplete();
    }
  });
}

// Render the Category Dropdown options
function renderCategoryFilter() {
  for (const [code, label] of Object.entries(KBLI_CATEGORIES)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${code} — ${label}`;
    categoryFilter.appendChild(option);
  }
}

// Show/Hide Loading
function showLoading() {
  resultsGrid.innerHTML = `
    <div class="loader">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
}

function hideLoading() {
  const loader = resultsGrid.querySelector('.loader');
  if (loader) loader.remove();
}

// Search Logic
function performSearch(useQuery = null) {
  let query = (useQuery !== null ? useQuery : searchInput.value).trim();
  const selectedCategory = categoryFilter.value;
  
  // Toggle clear button
  if (query.length > 0) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }

  let filteredResults = [];

  if (query.length >= 2) {
    // Perform fuzzy search
    const searchResults = fuse.search(query);
    
    // Extract items and apply category filter if set
    filteredResults = searchResults
      .map(result => ({
        ...result.item,
        matches: result.matches // pass matches for highlighting
      }))
      .filter(item => !selectedCategory || item.kategori === selectedCategory);
  } else {
    // Show all or filter by category if no query
    filteredResults = kbliData.filter(item => !selectedCategory || item.kategori === selectedCategory);
  }

  renderResults(filteredResults, query);
}

// Handle search input events (with Autocomplete generation)
function handleSearchInput() {
  const query = searchInput.value.trim();
  performSearch();
  
  if (query.length >= 2 && fuse) {
    const searchResults = fuse.search(query);
    // Limit to top 5 results for autocomplete
    const topResults = searchResults.slice(0, 5).map(r => r.item);
    renderAutocomplete(topResults, query);
  } else {
    hideAutocomplete();
  }
}

// Render autocomplete list
function renderAutocomplete(items, query) {
  if (items.length === 0) {
    hideAutocomplete();
    return;
  }
  
  autocompleteList.innerHTML = '';
  activeAutocompleteIndex = -1;
  
  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.dataset.index = index;
    li.dataset.judul = item.judul;
    
    // Highlight matching part in autocomplete
    const highlightedJudul = highlightText(item.judul, query);
    const highlightedKode = highlightText(item.kode, query);
    
    li.innerHTML = `
      <span class="ac-kode">${highlightedKode}</span>
      <span class="ac-judul">${highlightedJudul}</span>
    `;
    
    li.addEventListener('click', () => {
      selectAutocompleteItem(item.judul);
    });
    
    autocompleteList.appendChild(li);
  });
  
  autocompleteList.classList.remove('hidden');
}

function selectAutocompleteItem(value) {
  searchInput.value = value;
  hideAutocomplete();
  performSearch();
}

function hideAutocomplete() {
  autocompleteList.classList.add('hidden');
  autocompleteList.innerHTML = '';
  activeAutocompleteIndex = -1;
}

// Key navigation for autocomplete list
function handleSearchKeydown(e) {
  const items = autocompleteList.querySelectorAll('li');
  if (autocompleteList.classList.contains('hidden') || items.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeAutocompleteIndex = (activeAutocompleteIndex + 1) % items.length;
    updateActiveAutocomplete(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeAutocompleteIndex = (activeAutocompleteIndex - 1 + items.length) % items.length;
    updateActiveAutocomplete(items);
  } else if (e.key === 'Enter') {
    if (activeAutocompleteIndex >= 0 && activeAutocompleteIndex < items.length) {
      e.preventDefault();
      const selectedJudul = items[activeAutocompleteIndex].dataset.judul;
      selectAutocompleteItem(selectedJudul);
    }
  } else if (e.key === 'Escape') {
    hideAutocomplete();
  }
}

function updateActiveAutocomplete(items) {
  items.forEach((item, index) => {
    if (index === activeAutocompleteIndex) {
      item.classList.add('active');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

// Clear Search Input
function clearSearch() {
  searchInput.value = '';
  clearBtn.classList.add('hidden');
  hideAutocomplete();
  performSearch();
  searchInput.focus();
}

// Highlight helper function for simple text matching
function highlightText(text, query) {
  if (!query) return text;
  // Escape regex special chars
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Highlight exact matches returned by Fuse.js
function fuseHighlight(text, matches, key) {
  if (!matches) return text;
  
  const match = matches.find(m => m.key === key);
  if (!match) return text;

  // We sort match indices in reverse to modify the string from end to start without breaking indices
  const indices = [...match.indices].sort((a, b) => b[0] - a[0]);
  let highlighted = text;

  indices.forEach(([start, end]) => {
    const partToHighlight = highlighted.slice(start, end + 1);
    highlighted = highlighted.slice(0, start) + `<mark>${partToHighlight}</mark>` + highlighted.slice(end + 1);
  });

  return highlighted;
}

// Render Results Grid
function renderResults(results, query) {
  resultsGrid.innerHTML = '';
  
  if (results.length === 0) {
    emptyState.classList.remove('hidden');
    resultCountSpan.textContent = 'Menampilkan 0 entri';
    return;
  }
  
  emptyState.classList.add('hidden');
  resultCountSpan.textContent = `Menampilkan ${results.length} entri`;

  results.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    
    // Get highlighted text if there is active search query
    let highlightedJudul = item.judul;
    let highlightedKode = item.kode;
    let highlightedDeskripsi = item.deskripsi;
    
    if (query.length >= 2 && item.matches) {
      highlightedJudul = fuseHighlight(item.judul, item.matches, 'judul');
      highlightedKode = fuseHighlight(item.kode, item.matches, 'kode');
      highlightedDeskripsi = fuseHighlight(item.deskripsi, item.matches, 'deskripsi');
    }

    const categoryLabel = KBLI_CATEGORIES[item.kategori] || "Lainnya";

    // Keywords chips
    const tagsHTML = item.keyword.map(kw => {
      // Simple match highlight on tags
      const highlightedTag = highlightText(kw, query);
      return `<span class="tag">${highlightedTag}</span>`;
    }).join('');

    card.innerHTML = `
      <div class="card-header">
        <span class="card-kode">${highlightedKode}</span>
        <span class="card-kategori kat-${item.kategori}" title="Kategori ${item.kategori}: ${categoryLabel}">${item.kategori}</span>
      </div>
      <h3 class="card-judul">${highlightedJudul}</h3>
      <p class="card-desc">${highlightedDeskripsi}</p>
      <div class="card-keywords">
        ${tagsHTML}
      </div>
    `;
    
    resultsGrid.appendChild(card);
  });
}

// Start the app when content is loaded
document.addEventListener('DOMContentLoaded', init);
