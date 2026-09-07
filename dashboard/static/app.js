// G2 Micro-SaaS AI Brain - Orbital Universe & Hierarchical Discovery Command Center
let allOpportunities = [];
let activeFilter = 'all';
let activeSectorFilter = 'all';
let activeCategorySlug = 'help-desk';
let activeRootSlug = 'customer-service';
let categoryHierarchy = [];
let currentOrbitData = null;
let isOrbitSpinning = true;
let currentSpeedMultiplier = 1;
let areLasersActive = true;
let allKeywordsData = null;
let harvesterMode = 'subcategory'; // 'subcategory' or 'root_sector'
let renderedCanvasNodes = []; // Tracks cosmic objects for canvas collision and click interactions

const SECTOR_ICONS = {
  'customer-service': '🎧',
  'sales-tools': '📊',
  'erp': '💰',
  'marketing': '✉️',
  'collaboration-productivity': '⚡',
  'security': '🛡️',
  'artificial-intelligence': '🤖',
  'analytics-tools-software': '📈',
  'content-management': '📝',
  'commerce': '🛒',
  'hr': '👥',
  'it-management': '💻',
  'development': '⚙️',
  'design': '🎨'
};

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadHierarchy();
  loadOpportunities();
  loadCategoryDatalist();
  loadKeywords('all');
  initCanvasInteractions();
});

/* ==========================================================================
   VIEW SWITCHING
   ========================================================================== */
function switchMainView(mode) {
  const orbitSection = document.getElementById('orbit-view-section');
  const gridSection = document.getElementById('grid-view-section');
  const keywordSection = document.getElementById('keyword-view-section');
  const orbitTabBtn = document.getElementById('tab-btn-orbit');
  const gridTabBtn = document.getElementById('tab-btn-grid');
  const kwTabBtn = document.getElementById('tab-btn-keywords');

  orbitSection.classList.add('hidden');
  gridSection.classList.add('hidden');
  keywordSection.classList.add('hidden');

  orbitTabBtn.classList.remove('active');
  gridTabBtn.classList.remove('active');
  kwTabBtn.classList.remove('active');

  if (mode === 'orbit') {
    orbitSection.classList.remove('hidden');
    orbitTabBtn.classList.add('active');
    if (activeCategorySlug) {
      loadOrbitData(activeCategorySlug);
    }
  } else if (mode === 'grid') {
    gridSection.classList.remove('hidden');
    gridTabBtn.classList.add('active');
    applyOpportunityFilters();
  } else if (mode === 'keywords') {
    keywordSection.classList.remove('hidden');
    kwTabBtn.classList.add('active');
    loadKeywords(activeCategorySlug || 'all');
  }
}

/* ==========================================================================
   METRICS & HIERARCHICAL CATEGORY DATA
   ========================================================================== */
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.categories_count) document.getElementById('stat-categories').innerText = Number(data.categories_count).toLocaleString();
    if (data.products_count) document.getElementById('stat-products').innerText = data.products_count;
    if (data.reviews_count) document.getElementById('stat-reviews').innerText = data.reviews_count;
    if (data.opportunities_count) {
      document.getElementById('stat-opportunities').innerText = data.opportunities_count;
      const gridBadge = document.getElementById('grid-count-badge');
      if (gridBadge) gridBadge.innerText = `${data.opportunities_count} Ideas`;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadHierarchy() {
  try {
    const res = await fetch('/api/hierarchy');
    categoryHierarchy = await res.json();
    
    // 1. Populate Harvester Root Dropdown
    populateHarvesterDropdowns();

    // 2. Populate Root Sector Tabs in Orbit View
    renderRootSectorTabs();

    // 3. Populate Grid Sector Filter
    populateGridSectorFilter();

    // 4. Populate Full Hierarchy Directory
    renderHierarchyDirectory(categoryHierarchy);

  } catch (err) {
    console.error('Error loading category hierarchy:', err);
  }
}

function renderRootSectorTabs() {
  const tabsRow = document.getElementById('root-sector-tabs');
  if (!tabsRow || !categoryHierarchy.length) return;

  // Find root with active opportunities first
  let defaultRoot = categoryHierarchy.find(r => r.slug === activeRootSlug) || categoryHierarchy[0];
  activeRootSlug = defaultRoot.slug;

  tabsRow.innerHTML = categoryHierarchy.slice(0, 10).map((root) => {
    const icon = SECTOR_ICONS[root.slug] || '📁';
    const isActive = root.slug === activeRootSlug;
    const oppBadge = root.total_opportunity_count > 0 
      ? `<span class="pill-count active">${root.total_opportunity_count} Satellites</span>`
      : `<span class="pill-count">${root.subcategory_count} Subs</span>`;

    return `
      <button class="root-tab ${isActive ? 'active' : ''}" data-slug="${root.slug}" onclick="selectRootSector('${root.slug}', this)">
        <span>${icon} ${root.name}</span>
        ${oppBadge}
      </button>
    `;
  }).join('');

  renderSubcategoryPills(defaultRoot);
}

function selectRootSector(rootSlug, btnElement) {
  activeRootSlug = rootSlug;
  document.querySelectorAll('.root-tab').forEach(t => t.classList.remove('active'));
  if (btnElement) {
    btnElement.classList.add('active');
  } else {
    const tab = document.querySelector(`.root-tab[data-slug="${rootSlug}"]`);
    if (tab) tab.classList.add('active');
  }

  const root = categoryHierarchy.find(r => r.slug === rootSlug);
  if (root) {
    renderSubcategoryPills(root);
  }
}

function renderSubcategoryPills(root) {
  const titleEl = document.getElementById('active-root-title');
  const countEl = document.getElementById('active-subcat-count');
  const pillsRow = document.getElementById('active-subcat-pills');

  if (titleEl) titleEl.innerText = `Sub-Categories in ${root.name}:`;
  if (countEl) countEl.innerText = `${root.subcategory_count} Available`;

  if (!root.subcategories || root.subcategories.length === 0) {
    pillsRow.innerHTML = `
      <button class="cat-pill active" onclick="selectOrbitCategory('${root.slug}', this)">
        <span>🌟 ${root.name} (Direct)</span>
      </button>
    `;
    selectOrbitCategory(root.slug);
    return;
  }

  // Find subcategory with active opportunities or first one
  const activeSub = root.subcategories.find(s => s.opportunity_count > 0) || root.subcategories[0];

  pillsRow.innerHTML = root.subcategories.map((sub) => {
    const isActive = sub.slug === activeSub.slug;
    const badge = sub.opportunity_count > 0 
      ? `<span class="pill-count active">🟢 ${sub.opportunity_count} Satellites</span>` 
      : `<span class="pill-count">Unmined</span>`;

    return `
      <button class="cat-pill ${isActive ? 'active' : ''}" data-slug="${sub.slug}" onclick="selectOrbitCategory('${sub.slug}', this)">
        <span>${sub.name}</span>
        ${badge}
      </button>
    `;
  }).join('');

  selectOrbitCategory(activeSub.slug);
}

function selectOrbitCategory(slug, btnElement) {
  activeCategorySlug = slug;
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  if (btnElement) {
    btnElement.classList.add('active');
  } else {
    const pill = document.querySelector(`.cat-pill[data-slug="${slug}"]`);
    if (pill) pill.classList.add('active');
  }
  loadOrbitData(slug);
}

function onCategorySearchSelect(value) {
  if (!value) return;
  
  // Find which root sector this category belongs to
  for (const root of categoryHierarchy) {
    if (root.slug === value) {
      selectRootSector(root.slug);
      return;
    }
    const sub = (root.subcategories || []).find(s => s.slug === value || s.name.toLowerCase() === value.toLowerCase());
    if (sub) {
      selectRootSector(root.slug);
      selectOrbitCategory(sub.slug);
      return;
    }
  }
  
  // Fallback direct load
  selectOrbitCategory(value);
}

async function loadCategoryDatalist() {
  try {
    const res = await fetch('/api/categories?limit=1000');
    const cats = await res.json();
    const orbitDatalist = document.getElementById('orbit-cat-datalist');
    if (orbitDatalist) {
      orbitDatalist.innerHTML = cats.map(c => `
        <option value="${c.slug}">${c.name} ${c.parent_name ? `(${c.parent_name})` : ''}</option>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading category datalist:', err);
  }
}

/* ==========================================================================
   HARVESTER CONTROLS & DUAL-MODE LOGIC
   ========================================================================== */
function setHarvesterMode(mode) {
  harvesterMode = mode;
  const btnSub = document.getElementById('btn-mode-sub');
  const btnRoot = document.getElementById('btn-mode-root');
  const subGroup = document.getElementById('subcat-control-group');
  const btnText = document.getElementById('btn-text');

  if (mode === 'root_sector') {
    btnRoot.classList.add('active');
    btnSub.classList.remove('active');
    subGroup.style.opacity = '0.5';
    subGroup.style.pointerEvents = 'none';
    btnText.innerText = '🌳 Run Root Sector Batch Scan';
  } else {
    btnSub.classList.add('active');
    btnRoot.classList.remove('active');
    subGroup.style.opacity = '1';
    subGroup.style.pointerEvents = 'auto';
    btnText.innerText = '🎯 Run Sub-Category Deep Mine';
  }
}

function populateHarvesterDropdowns() {
  const rootSelect = document.getElementById('harvester-root-select');
  if (!rootSelect) return;

  rootSelect.innerHTML = categoryHierarchy.map(r => `
    <option value="${r.slug}">${r.name} (${r.subcategory_count} sub-categories)</option>
  `).join('');

  if (categoryHierarchy.length > 0) {
    rootSelect.value = categoryHierarchy[0].slug;
    onHarvesterRootChange(categoryHierarchy[0].slug);
  }
}

function onHarvesterRootChange(rootSlug) {
  const subSelect = document.getElementById('harvester-sub-select');
  if (!subSelect) return;

  const root = categoryHierarchy.find(r => r.slug === rootSlug);
  if (!root || !root.subcategories || root.subcategories.length === 0) {
    subSelect.innerHTML = `<option value="${rootSlug}">Direct (${root ? root.name : rootSlug})</option>`;
    return;
  }

  subSelect.innerHTML = root.subcategories.map(s => `
    <option value="${s.slug}">${s.name} ${s.opportunity_count > 0 ? `(🟢 ${s.opportunity_count} Ideas)` : ''}</option>
  `).join('');
}

function onHarvesterSubChange(subSlug) {
  // Optional callback
}

async function triggerMine() {
  const rootSelect = document.getElementById('harvester-root-select');
  const subSelect = document.getElementById('harvester-sub-select');
  const btn = document.getElementById('btn-mine');
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('btn-spinner');
  const status = document.getElementById('miner-status');

  let targetSlug = '';
  if (harvesterMode === 'root_sector') {
    targetSlug = rootSelect.value;
  } else {
    targetSlug = subSelect.value || rootSelect.value;
  }

  if (!targetSlug) {
    alert('Please select a category to harvest.');
    return;
  }

  btn.disabled = true;
  btnText.innerText = harvesterMode === 'root_sector' ? 'Batch Harvesting Root Sector...' : 'AI Harvesting Live Reviews...';
  spinner.classList.remove('hidden');
  status.classList.remove('hidden');
  status.innerText = `🔍 Autonomous Harvester active in ${harvesterMode === 'root_sector' ? 'ROOT SECTOR BATCH' : 'SUB-CATEGORY'} mode for '${targetSlug}'... Scraping reviews & running Gemini 3 Flash...`;

  try {
    const res = await fetch('/api/mine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_slug: targetSlug,
        mode: harvesterMode,
        max_subcategories: 3
      })
    });
    const result = await res.json();
    
    status.innerText = `🎉 Complete! ${result.message || 'Mined and synced to database!'}`;
    await loadStats();
    await loadHierarchy();
    await loadOpportunities();
    selectOrbitCategory(targetSlug);
  } catch (err) {
    status.innerText = `❌ Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btnText.innerText = harvesterMode === 'root_sector' ? '🌳 Run Root Sector Batch Scan' : '🎯 Run Sub-Category Deep Mine';
    spinner.classList.add('hidden');
  }
}

/* ==========================================================================
   FULL HIERARCHY DIRECTORY MODAL
   ========================================================================== */
function openHierarchyModal() {
  document.getElementById('hierarchy-modal-overlay').classList.remove('hidden');
  renderHierarchyDirectory(categoryHierarchy);
}

function closeHierarchyModal(event) {
  document.getElementById('hierarchy-modal-overlay').classList.add('hidden');
}

function renderHierarchyDirectory(hierarchyList) {
  const container = document.getElementById('hierarchy-tree-container');
  if (!container) return;

  container.innerHTML = hierarchyList.map(root => {
    const icon = SECTOR_ICONS[root.slug] || '📁';
    const subList = root.subcategories || [];
    const hasOpps = root.total_opportunity_count > 0;

    return `
      <div class="hierarchy-root-card ${hasOpps ? 'has-opps' : ''}">
        <div class="hierarchy-root-header" onclick="toggleHierarchyAccordion(this)">
          <div class="root-header-title">
            <span class="icon">${icon}</span>
            <span class="name">${root.name}</span>
            <span class="count-badge">${subList.length} sub-categories</span>
            ${hasOpps ? `<span class="active-badge">🟢 ${root.total_opportunity_count} Satellites Active</span>` : ''}
          </div>
          <span class="accordion-arrow">▼</span>
        </div>
        <div class="hierarchy-sub-grid">
          ${subList.map(s => `
            <div class="hierarchy-sub-item ${s.opportunity_count > 0 ? 'active-sub' : ''}" onclick="selectCategoryFromModal('${root.slug}', '${s.slug}')">
              <div class="sub-item-info">
                <span class="sub-name">${s.name}</span>
                ${s.opportunity_count > 0 ? `<span class="sub-badge">🟢 ${s.opportunity_count} Satellites</span>` : ''}
              </div>
              <button class="btn-micro">Explore Orbit &rarr;</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function toggleHierarchyAccordion(headerEl) {
  const card = headerEl.closest('.hierarchy-root-card');
  card.classList.toggle('expanded');
}

function selectCategoryFromModal(rootSlug, subSlug) {
  closeHierarchyModal();
  selectRootSector(rootSlug);
  selectOrbitCategory(subSlug);
}

function filterHierarchyModal(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderHierarchyDirectory(categoryHierarchy);
    return;
  }

  const filtered = categoryHierarchy.map(root => {
    const rootMatches = root.name.toLowerCase().includes(q) || root.slug.includes(q);
    const matchingSubs = (root.subcategories || []).filter(s => 
      s.name.toLowerCase().includes(q) || s.slug.includes(q)
    );

    if (rootMatches || matchingSubs.length > 0) {
      return {
        ...root,
        subcategories: rootMatches ? root.subcategories : matchingSubs
      };
    }
    return null;
  }).filter(Boolean);

  renderHierarchyDirectory(filtered);

  // Auto expand matched cards
  document.querySelectorAll('.hierarchy-root-card').forEach(c => c.classList.add('expanded'));
}

/* ==========================================================================
   ORBIT SYSTEM VISUAL ENGINE (HTML5 CANVAS WITH PHYSICS & LASERS)
   ========================================================================== */
async function loadOrbitData(slug) {
  try {
    const res = await fetch(`/api/orbit?category_slug=${slug}`);
    const data = await res.json();
    currentOrbitData = data;
    renderOrbitSystem(data);
  } catch (err) {
    console.error(`Error loading orbit data for ${slug}:`, err);
  }
}

function renderOrbitSystem(data) {
  const systemTitle = document.getElementById('orbit-system-title');
  if (systemTitle) {
    const parentName = data.category.parent_name ? `${data.category.parent_name} / ` : '';
    systemTitle.innerText = `${parentName}${data.category.name} Gravity Well`;
  }

  // 1. Populate Right Telemetry Panels
  renderTelemetryHUD(data);

  // 2. Populate Bottom Pulse Deck
  renderBottomPulseDeck(data);

  // 3. Start Canvas Engine
  initOrbitCanvas(data);
}

function renderTelemetryHUD(data) {
  // 1. Competitors List (Clickable with full personas and pain breakdown)
  const compList = document.getElementById('hud-competitors-list');
  const allProds = data.all_products || [];
  document.getElementById('hud-competitor-count').innerText = `${allProds.length} Tracked`;

  compList.innerHTML = allProds.map(p => {
    const isBehemoth = p.orbit_tier === '0_behemoth';
    const tag = isBehemoth ? '<span class="tier-tag red">Orbit 0: Goliath</span>' : '<span class="tier-tag yellow">Orbit 1: Challenger</span>';
    return `
      <div class="hud-item ${isBehemoth ? 'behemoth-item' : ''}" onclick="openCompetitorModal('${p.slug}')" title="Click to view personas and verbatim negative reviews">
        <div class="hud-item-header">
          <span class="prod-name">${p.name}</span>
          ${tag}
        </div>
        <p class="prod-vuln">⚠️ <b>Vulnerability:</b> ${p.primary_vulnerability}</p>
        <div class="prod-meta">
          <span>⭐ ${p.rating_avg}</span>
          <span>👥 ${p.pricing_model || 'Per-Seat'}</span>
          <span>🏢 ${p.market_segment || 'Enterprise'}</span>
          <span style="color:var(--cyan-glow); font-weight:600; margin-left:auto;">Deep Dossier &rarr;</span>
        </div>
      </div>
    `;
  }).join('');

  // 2. Pain List (Clickable to view full quotes & personas)
  const painList = document.getElementById('hud-pain-list');
  const pains = data.pain_clusters || [];
  painList.innerHTML = pains.map(pc => `
    <div class="hud-item pain-item" onclick="openPainClusterModal('${pc.slug}')" title="Click to view verbatim user quotes & personas">
      <div class="hud-item-header">
        <span class="pain-title">${pc.title}</span>
        <span class="severity-badge">${pc.severity_score}/10 Severity</span>
      </div>
      <p class="pain-desc">${pc.summary}</p>
      <div class="pain-bar-bg">
        <div class="pain-bar-fill" style="width:${Math.min(100, Number(pc.severity_score) * 10)}%;"></div>
      </div>
    </div>
  `).join('');

  // 3. Satellites List (Clickable to view complete blueprint)
  const satList = document.getElementById('hud-satellites-list');
  const opps = data.orbit_2_satellites || [];
  document.getElementById('hud-satellite-count').innerText = `${opps.length} Satellites`;

  satList.innerHTML = opps.map((opp, idx) => {
    const wedge = opp.unbundling_wedge || opp.value_proposition || 'Direct wedge';
    const mrr = opp.target_mrr || opp.mrr_potential || '$15k MRR';
    const devDays = opp.dev_timeline_days || (opp.dev_complexity ? opp.dev_complexity * 7 : 14);

    return `
      <div class="satellite-hud-item" onclick="openOpportunityModal(${opp.id})">
        <div class="sat-header">
          <span class="sat-badge">🛰️ Orbit 2 Moon #${idx + 1}</span>
          <span class="sat-osi">OSI: ${opp.osi_score}</span>
        </div>
        <div class="sat-title">${opp.title}</div>
        <p class="sat-wedge">🎯 <b>Wedge Play:</b> ${wedge}</p>
        <div class="sat-meta-row">
          <span>💰 ${mrr}</span>
          <span>⏱️ ${devDays}d Build</span>
          <span class="sat-cta">View Full Blueprint &rarr;</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderBottomPulseDeck(data) {
  // 1. Attack Mapping
  const attackGrid = document.getElementById('pulse-attack-mapping');
  const opps = data.orbit_2_satellites || [];
  const goliaths = data.orbit_0_behemoths || [];
  const mainIncumbent = goliaths.length > 0 ? goliaths[0].name : 'Legacy Incumbents';

  if (attackGrid) {
    if (opps.length === 0) {
      attackGrid.innerHTML = `
        <div style="grid-column:1/-1; color:var(--text-muted); font-size:0.85rem; padding:1rem; text-align:center;">
          No satellites currently in orbit. Run the AI Harvester above to synthesize attack vectors.
        </div>
      `;
    } else {
      attackGrid.innerHTML = opps.slice(0, 4).map(opp => `
        <div class="attack-mapping-card" onclick="openOpportunityModal(${opp.id})">
          <div class="attack-card-target">🎯 TARGETING: ${mainIncumbent}</div>
          <div class="attack-card-title">${opp.title}</div>
          <p class="attack-card-wedge">${opp.unbundling_wedge || opp.value_proposition}</p>
        </div>
      `).join('');
    }
  }

  // 2. Keyword preview
  const kwPreview = document.getElementById('pulse-keywords-preview');
  if (kwPreview) {
    fetch(`/api/keywords?category_slug=${data.category.slug}`)
      .then(res => res.json())
      .then(kwData => {
        const keywords = kwData.all || [];
        if (keywords.length === 0) {
          kwPreview.innerHTML = `<div style="color:var(--text-muted); font-size:0.82rem;">No keywords synced for this subcategory yet.</div>`;
          return;
        }
        kwPreview.innerHTML = keywords.slice(0, 4).map(k => `
          <div class="pulse-kw-item">
            <div>
              <code>${k.keyword}</code>
            </div>
            <div class="pulse-kw-stats">
              <span class="vol-badge">${Number(k.monthly_search_volume).toLocaleString()}/mo</span>
              <span class="growth-badge ${k.growth_yoy_pct >= 100 ? 'high' : ''}">+${k.growth_yoy_pct}% YoY</span>
              <b>$${Number(k.cpc_usd).toFixed(2)}</b>
            </div>
          </div>
        `).join('');
      })
      .catch(() => {});
  }
}

/* ==========================================================================
   CANVAS ORBIT SIMULATION WITH COLLISION & CLICK SUPPORT
   ========================================================================== */
let orbitAnimFrame = null;
let orbitAngle = 0;

function initCanvasInteractions() {
  const canvas = document.getElementById('orbit-canvas');
  if (!canvas) return;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const hovered = renderedCanvasNodes.find(node => {
      const dx = mx - node.x;
      const dy = my - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });

    if (hovered) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const clicked = renderedCanvasNodes.find(node => {
      const dx = mx - node.x;
      const dy = my - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });

    if (clicked) {
      if (clicked.type === 'goliath' || clicked.type === 'challenger') {
        openCompetitorModal(clicked.data.slug);
      } else if (clicked.type === 'satellite') {
        openOpportunityModal(clicked.data.id);
      }
    }
  });
}

function initOrbitCanvas(data) {
  const canvas = document.getElementById('orbit-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (orbitAnimFrame) {
    cancelAnimationFrame(orbitAnimFrame);
  }

  const goliaths = data.orbit_0_behemoths || [];
  const challengers = data.orbit_1_challengers || [];
  const satellites = data.orbit_2_satellites || [];

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    renderedCanvasNodes = []; // Reset node tracking for this frame

    if (isOrbitSpinning) {
      orbitAngle += 0.008 * currentSpeedMultiplier;
    }

    // 1. Cosmic Star Background
    drawStars(ctx, canvas.width, canvas.height);

    // 2. Orbit Track Rings
    drawOrbitRing(ctx, centerX, centerY, 150, 'rgba(234, 179, 8, 0.15)', 'Orbit 1: Challenger Track');
    drawOrbitRing(ctx, centerX, centerY, 270, 'rgba(16, 185, 129, 0.2)', 'Orbit 2: Micro-SaaS Satellites');

    // 3. Orbit 0 Goliath (Sun)
    const goliathProd = goliaths.length > 0 ? goliaths[0] : { name: 'Incumbent Sun', slug: 'incumbent' };
    drawGoliathSun(ctx, centerX, centerY, goliathProd.name);
    renderedCanvasNodes.push({
      type: 'goliath',
      x: centerX,
      y: centerY,
      radius: 45,
      data: goliathProd
    });

    // 4. Orbit 1 Challengers (Planets)
    challengers.forEach((chal, i) => {
      const angle = orbitAngle + (i * (2 * Math.PI / Math.max(1, challengers.length)));
      const x = centerX + Math.cos(angle) * 150;
      const y = centerY + Math.sin(angle) * 150;
      drawChallengerPlanet(ctx, x, y, chal.name);
      renderedCanvasNodes.push({
        type: 'challenger',
        x: x,
        y: y,
        radius: 25,
        data: chal
      });
    });

    // 5. Orbit 2 Satellites (Moons) with Laser Beams
    satellites.forEach((sat, i) => {
      const satAngle = -orbitAngle * 1.5 + (i * (2 * Math.PI / Math.max(1, satellites.length)));
      const satX = centerX + Math.cos(satAngle) * 270;
      const satY = centerY + Math.sin(satAngle) * 270;

      // Disruption Laser toward Sun or nearest Challenger
      if (areLasersActive) {
        drawDisruptionLaser(ctx, satX, satY, centerX, centerY, 'rgba(56, 189, 248, 0.6)');
      }

      drawSatelliteNode(ctx, satX, satY, sat.title, sat.osi_score);
      renderedCanvasNodes.push({
        type: 'satellite',
        x: satX,
        y: satY,
        radius: 24,
        data: sat
      });
    });

    orbitAnimFrame = requestAnimationFrame(draw);
  }

  draw();
}

function drawStars(ctx, w, h) {
  ctx.fillStyle = '#060B18';
  ctx.fillRect(0, 0, w, h);
}

function drawOrbitRing(ctx, cx, cy, radius, strokeStyle, label) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.restore();
}

function drawGoliathSun(ctx, cx, cy, name) {
  ctx.save();
  // Outer glow
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 70);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
  grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.4)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 70, 0, Math.PI * 2);
  ctx.fill();

  // Core
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, cx, cy + 50);
  ctx.fillStyle = '#FCA5A5';
  ctx.font = '10px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('🔴 Orbit 0: Goliath', cx, cy + 64);
  ctx.restore();
}

function drawChallengerPlanet(ctx, x, y, name) {
  ctx.save();
  // Glow
  ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  // Core
  ctx.fillStyle = '#EAB308';
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#FEF08A';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, x, y + 26);
  ctx.restore();
}

function drawSatelliteNode(ctx, x, y, title, osi) {
  ctx.save();
  // Glow
  ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();

  // Core
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();

  // Label
  const shortTitle = title.length > 22 ? title.substring(0, 20) + '...' : title;
  ctx.fillStyle = '#A7F3D0';
  ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shortTitle, x, y + 22);

  ctx.fillStyle = '#34D399';
  ctx.font = '9px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`OSI: ${osi}`, x, y + 33);
  ctx.restore();
}

function drawDisruptionLaser(ctx, x1, y1, x2, y2, color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 8]);
  ctx.stroke();
  ctx.restore();
}

function toggleOrbitSpin() {
  isOrbitSpinning = !isOrbitSpinning;
  const icon = document.getElementById('spin-icon');
  const btn = document.getElementById('btn-toggle-spin');
  if (isOrbitSpinning) {
    icon.innerText = '⏸️';
    btn.innerHTML = '<span id="spin-icon">⏸️</span> Pause Orbit';
  } else {
    icon.innerText = '▶️';
    btn.innerHTML = '<span id="spin-icon">▶️</span> Resume Orbit';
  }
}

function setOrbitSpeed(multiplier) {
  currentSpeedMultiplier = multiplier;
  document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

function toggleLasers() {
  areLasersActive = !areLasersActive;
  const btn = document.getElementById('btn-toggle-lasers');
  btn.innerText = areLasersActive ? '⚡ Lasers: ON' : '⚡ Lasers: OFF';
}

/* ==========================================================================
   OPPORTUNITY GRID VIEW
   ========================================================================== */
async function loadOpportunities() {
  try {
    const res = await fetch('/api/opportunities');
    allOpportunities = await res.json();
    renderOpportunityCards(allOpportunities);
  } catch (err) {
    console.error('Error loading opportunities:', err);
  }
}

function populateGridSectorFilter() {
  const select = document.getElementById('grid-sector-filter');
  if (!select) return;

  select.innerHTML = `<option value="all">All Root Sectors & Categories (${allOpportunities.length} Ideas)</option>` +
    categoryHierarchy.map(r => `
      <option value="${r.slug}">${r.name} (${r.total_opportunity_count || 0} Ideas)</option>
    `).join('');
}

function filterOpportunitiesBySector(sectorSlug) {
  activeSectorFilter = sectorSlug;
  applyOpportunityFilters();
}

function filterOpportunities(bucket, btnElement) {
  activeFilter = bucket;
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  applyOpportunityFilters();
}

function applyOpportunityFilters() {
  let filtered = [...allOpportunities];

  if (activeSectorFilter && activeSectorFilter !== 'all') {
    filtered = filtered.filter(o => o.root_sector_slug === activeSectorFilter || o.category_slug === activeSectorFilter);
  }

  if (activeFilter && activeFilter !== 'all') {
    filtered = filtered.filter(o => (o.bucket || '').toLowerCase().includes(activeFilter.toLowerCase()));
  }

  renderOpportunityCards(filtered);
}

function renderOpportunityCards(opps) {
  const container = document.getElementById('opportunities-container');
  if (!container) return;

  if (opps.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:4rem; color:var(--text-secondary);">
        <h3>No opportunities found for this filter</h3>
        <p>Try selecting another sector or run the AI Harvester above to generate ideas.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = opps.map(opp => {
    const features = Array.isArray(opp.core_features) ? opp.core_features : [];
    const wedge = opp.unbundling_wedge || opp.value_proposition || 'Targeted unbundling wedge against incumbent complexity';
    const mrr = opp.target_mrr || opp.mrr_potential || '$15k - $30k/mo';
    const devDays = opp.dev_timeline_days || (opp.dev_complexity ? opp.dev_complexity * 7 : 14);
    const persona = opp.target_persona || opp.target_icp_title || 'SMB Founders & Operators';

    return `
      <div class="opportunity-card" onclick="openOpportunityModal(${opp.id})">
        <div class="opp-card-header">
          <div>
            <span class="sector-tag">${opp.root_sector_name || 'Software Sector'}</span>
            <h3 class="opp-card-title">${opp.title}</h3>
          </div>
          <div class="osi-badge-card">
            <span class="osi-val">${opp.osi_score}</span>
            <span class="osi-lbl">OSI Score</span>
          </div>
        </div>

        <p class="opp-card-wedge">🎯 <b>Wedge Play:</b> ${wedge}</p>

        <div class="opp-card-metrics">
          <div class="opp-metric-box">
            <span class="lbl">Target MRR</span>
            <span class="val highlight">${mrr}</span>
          </div>
          <div class="opp-metric-box">
            <span class="lbl">Dev Time</span>
            <span class="val">${devDays} Days</span>
          </div>
          <div class="opp-metric-box">
            <span class="lbl">Target ICP</span>
            <span class="val">${persona}</span>
          </div>
        </div>

        <div class="opp-card-features">
          <span class="feat-title">Core MVP Unbundling Features:</span>
          <ul>
            ${features.slice(0, 3).map(f => `<li>• ${f}</li>`).join('')}
          </ul>
        </div>

        <div class="opp-card-footer">
          <span class="badge-bucket">${opp.bucket || 'Unbundler'}</span>
          <span class="view-blueprint-btn">Explore Blueprint &rarr;</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   KEYWORD SEARCH VOLUME VIEW
   ========================================================================== */
async function loadKeywords(categorySlug) {
  try {
    const url = (categorySlug && categorySlug !== 'all') ? `/api/keywords?category_slug=${categorySlug}` : '/api/keywords';
    const res = await fetch(url);
    const data = await res.json();
    allKeywordsData = data;

    document.getElementById('kw-total-count').innerText = (data.all || []).length;

    // 1. Highest Volume Table
    const highTable = document.getElementById('table-highest-volume');
    highTable.innerHTML = (data.highest_volume || []).map(k => `
      <tr>
        <td><b><code>${k.keyword}</code></b></td>
        <td><span class="vol-badge">${Number(k.monthly_search_volume).toLocaleString()}/mo</span></td>
        <td><span class="growth-badge ${k.growth_yoy_pct >= 100 ? 'high' : ''}">+${k.growth_yoy_pct}%</span></td>
        <td><b>$${Number(k.cpc_usd).toFixed(2)}</b></td>
        <td><span class="intent-pill ${k.intent_type}">${k.intent_type}</span></td>
      </tr>
    `).join('');

    // 2. Fastest Growing Table
    const fastTable = document.getElementById('table-fastest-growing');
    fastTable.innerHTML = (data.fastest_growing || []).map(k => `
      <tr>
        <td><b><code>${k.keyword}</code></b></td>
        <td><span class="growth-badge high">🔥 +${k.growth_yoy_pct}% YoY</span></td>
        <td><b>${Number(k.monthly_search_volume).toLocaleString()}/mo</b></td>
        <td><b>$${Number(k.cpc_usd).toFixed(2)}</b></td>
        <td><span class="intent-pill ${k.intent_type}">${k.pain_signal || k.intent_type}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading keywords:', err);
  }
}

/* ==========================================================================
   MODAL 1: OPPORTUNITY DOSSIER
   ========================================================================== */
function openOpportunityModal(oppId) {
  const opp = allOpportunities.find(o => o.id === oppId);
  if (!opp) return;

  const content = document.getElementById('modal-content');
  const features = Array.isArray(opp.core_features) ? opp.core_features : [];
  const wedge = opp.unbundling_wedge || opp.value_proposition || 'Targeted unbundling wedge against incumbent complexity';
  const mrr = opp.target_mrr || opp.mrr_potential || '$15k - $30k/mo';
  const devDays = opp.dev_timeline_days || (opp.dev_complexity ? opp.dev_complexity * 7 : 14);
  const persona = opp.target_persona || opp.target_icp_title || 'SMB Founders & Teams';
  const difficulty = opp.dev_difficulty || (opp.dev_complexity <= 2 ? 'Low (1-2 wks)' : 'Medium (2-3 wks)');

  content.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
      <div>
        <span class="sector-tag" style="margin-bottom:0.5rem; display:inline-block;">${opp.root_sector_name || 'Software Sector'} / ${opp.category_slug}</span>
        <h2 style="font-size:1.6rem; color:#FFF; margin-bottom:0.4rem;">${opp.title}</h2>
        <p style="color:var(--text-secondary); font-size:0.95rem;">${opp.problem_statement || opp.value_proposition}</p>
      </div>
      <div class="osi-badge-card" style="padding:0.8rem 1.2rem;">
        <span class="osi-val" style="font-size:1.8rem;">${opp.osi_score}</span>
        <span class="osi-lbl">OSI Score</span>
      </div>
    </div>

    <div style="background:rgba(56,189,248,0.06); padding:1.2rem; border-radius:14px; border:1px solid rgba(56,189,248,0.2); margin-bottom:2rem;">
      <h4 style="color:var(--cyan-glow); font-size:0.9rem; margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:1px;">🎯 The Unbundling Wedge</h4>
      <p style="color:var(--text-primary); font-size:1.05rem; font-weight:500;">${wedge}</p>
    </div>

    <div class="opp-card-metrics" style="margin-bottom:2rem;">
      <div class="opp-metric-box"><span class="lbl">Target MRR</span><span class="val highlight">${mrr}</span></div>
      <div class="opp-metric-box"><span class="lbl">Dev Timeline</span><span class="val">${devDays} Days</span></div>
      <div class="opp-metric-box"><span class="lbl">Complexity</span><span class="val">${difficulty}</span></div>
      <div class="opp-metric-box"><span class="lbl">Target ICP</span><span class="val">${persona}</span></div>
    </div>

    <div style="margin-bottom:2rem;">
      <h4 style="color:var(--cyan-glow); font-size:0.9rem; margin-bottom:0.8rem; text-transform:uppercase; letter-spacing:1px;">🛠️ MVP Core Feature Checklist</h4>
      <ul class="modal-feature-list">
        ${features.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>

    <div style="margin-bottom:2rem; background:rgba(168,85,247,0.06); padding:1.2rem; border-radius:14px; border:1px solid rgba(168,85,247,0.2);">
      <h4 style="color:var(--purple-glow); font-size:0.9rem; margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:1px;">💰 Pricing & Monetization</h4>
      <p style="font-size:1.1rem; font-weight:bold; color:#FFF; margin-bottom:0.3rem;">${opp.pricing_strategy}</p>
      <p style="color:var(--text-secondary); font-size:0.85rem;">Eliminates per-seat penalties with transparent flat pricing.</p>
    </div>

    <div style="margin-bottom:2rem;">
      <h4 style="color:var(--cyan-glow); font-size:0.9rem; margin-bottom:0.8rem; text-transform:uppercase; letter-spacing:1px;">📣 Launch & Distribution Channels</h4>
      <p style="color:var(--text-primary);">${opp.distribution_channel}</p>
    </div>

    <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
      <button class="btn-primary" style="background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.4); color:#FDA4AF;" onclick="openEvidenceModal('${opp.category_slug}')">
        🛡️ View Raw Scraped Review Citations &rarr;
      </button>
      <button class="btn-primary" onclick="closeModal()" style="padding:0.5rem 1.2rem; font-size:0.85rem;">Done</button>
    </div>
  `;

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal(event) {
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ==========================================================================
   MODAL 2: COMPETITOR INTELLIGENCE & PERSONAS DOSSIER
   ========================================================================== */
async function openCompetitorModal(productSlug) {
  const overlay = document.getElementById('competitor-modal-overlay');
  const content = document.getElementById('competitor-modal-content');
  overlay.classList.remove('hidden');
  content.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-secondary);">Loading deep competitor intelligence, complaining personas & reviews...</div>';

  try {
    const res = await fetch(`/api/competitor?product_slug=${productSlug}`);
    const data = await res.json();
    const prod = data.product;
    const cat = data.category || {};
    const personas = data.personas || [];
    const pains = data.pain_clusters || [];
    const reviews = data.reviews || [];
    const satellites = data.attacking_satellites || [];

    const isBehemoth = prod.orbit_tier === '0_behemoth';
    const tierBadge = isBehemoth ? '<span class="tier-tag red">Orbit 0: Goliath</span>' : '<span class="tier-tag yellow">Orbit 1: Challenger</span>';

    content.innerHTML = `
      <div class="comp-modal-header">
        <div>
          <span class="sector-tag">${cat.name || 'Category'}</span>
          <h2 class="comp-modal-title">${prod.name}</h2>
          <div class="comp-meta-badges">
            ${tierBadge}
            <span class="comp-meta-badge">⭐ ${prod.rating_avg} / 5 Stars (${Number(prod.review_count || 0).toLocaleString()} Reviews)</span>
            <span class="comp-meta-badge">👥 Pricing: ${prod.pricing_model || 'Per-Seat'}</span>
            <span class="comp-meta-badge">🏢 Market: ${prod.market_segment || 'Enterprise'}</span>
          </div>
        </div>
      </div>

      <!-- Vulnerability Banner -->
      <div class="comp-vuln-box">
        <h4>⚠️ Primary Vulnerability Identified by AI Brain</h4>
        <p>${prod.primary_vulnerability}</p>
      </div>

      <!-- User Personas Facing the Problem -->
      <div style="margin-bottom:1.8rem;">
        <div class="section-label">👥 User Personas Suffering the Problem (Mined from G2 Reviews)</div>
        <div class="personas-grid">
          ${personas.length > 0 ? personas.map(p => `
            <div class="persona-card">
              <div class="persona-title">${p.extracted_icp || p.reviewer_title || 'Verified Operator'}</div>
              <div class="persona-tier">
                <span>🏢 ${p.company_size_tier || 'SMB'} • ${p.reviewer_industry || 'Tech'}</span>
                <span style="color:var(--rose-glow); font-weight:700;">${p.review_count} Negative Complaints</span>
              </div>
            </div>
          `).join('') : '<div style="color:var(--text-muted); font-size:0.85rem;">No extracted personas yet for this competitor.</div>'}
        </div>
      </div>

      <!-- Associated Pain Vectors -->
      <div style="margin-bottom:1.8rem;">
        <div class="section-label">🔥 Top Pain Clusters Suffered by ${prod.name} Users</div>
        <div class="hud-list" style="max-height:220px;">
          ${pains.map(pc => `
            <div class="hud-item pain-item" style="cursor:pointer;" onclick="openPainClusterModal('${pc.slug}')">
              <div class="hud-item-header">
                <span class="pain-title">${pc.title}</span>
                <span class="severity-badge">${pc.severity_score}/10 Severity</span>
              </div>
              <p class="pain-desc">${pc.summary}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Counter-Offensive Orbit 2 Micro-SaaS Blueprints -->
      ${satellites.length > 0 ? `
        <div style="margin-bottom:1.8rem;">
          <div class="section-label">🛰️ Orbit 2 Micro-SaaS Satellites Attacking ${prod.name}</div>
          <div class="comp-satellites-grid">
            ${satellites.map(sat => `
              <div class="comp-sat-card" onclick="openOpportunityModal(${sat.id})">
                <div class="sat-title">${sat.title} (OSI: ${sat.osi_score})</div>
                <p class="sat-wedge">🎯 ${sat.unbundling_wedge || sat.value_proposition}</p>
                <div style="color:var(--cyan-glow); font-size:0.75rem; font-weight:700; margin-top:0.4rem;">Open Full Blueprint &rarr;</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Verbatim Negative Reviews -->
      <div>
        <div class="section-label">💬 Verbatim 1-Star & 2-Star Discontent Citations (${reviews.length} Citations Mined)</div>
        <div class="evidence-reviews-list" style="max-height:260px;">
          ${reviews.map(r => `
            <div class="evidence-quote-card">
              <div class="evidence-quote-header">
                <span class="evidence-prod-badge">⭐ ${r.star_rating} / 5 Stars - ${r.reviewer_title || 'Verified User'}</span>
                <span class="evidence-rating">${r.company_size_tier || 'SMB'}</span>
              </div>
              <p class="evidence-dislike-text">"${r.dislike_text}"</p>
              <div class="evidence-meta-row">
                <span>🔥 <b>Pain:</b> <code>${r.pain_dimension || 'GENERAL'}</code></span>
                <span>👤 <b>ICP:</b> ${r.extracted_icp || 'Buyer'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div style="color:var(--rose-glow); padding:2rem;">Error fetching competitor intelligence: ${err.message}</div>`;
  }
}

function closeCompetitorModal(event) {
  document.getElementById('competitor-modal-overlay').classList.add('hidden');
}

/* ==========================================================================
   MODAL 3: PAIN CLUSTER DOSSIER
   ========================================================================== */
async function openPainClusterModal(slug) {
  const overlay = document.getElementById('pain-modal-overlay');
  const content = document.getElementById('pain-modal-content');
  overlay.classList.remove('hidden');
  content.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-secondary);">Loading pain cluster breakdown & verbatim buyer evidence...</div>';

  try {
    const res = await fetch(`/api/pain-cluster?slug=${slug}`);
    const data = await res.json();
    const pain = data.pain_cluster;
    const reviews = data.reviews || [];
    const opps = data.solving_opportunities || [];

    content.innerHTML = `
      <div class="comp-modal-header">
        <div>
          <span class="sector-tag" style="background:rgba(239,68,68,0.15); color:var(--rose-glow);">Pain Dimension: ${pain.dimension || 'GENERAL'}</span>
          <h2 class="comp-modal-title" style="margin-top:0.4rem;">${pain.title}</h2>
          <div class="comp-meta-badges">
            <span class="comp-meta-badge" style="color:var(--rose-glow); font-weight:700;">🔥 ${pain.severity_score}/10 Severity Score</span>
            <span class="comp-meta-badge">👥 Affected ICP: ${pain.affected_tier || 'Small Business'}</span>
          </div>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:12px; padding:1.2rem; margin-bottom:1.5rem;">
        <h4 style="color:var(--cyan-glow); font-size:0.85rem; text-transform:uppercase; margin-bottom:0.4rem;">Summary of Buyer Dissatisfaction</h4>
        <p style="color:var(--text-primary); font-size:0.95rem; line-height:1.45;">${pain.summary}</p>
      </div>

      ${opps.length > 0 ? `
        <div style="margin-bottom:1.5rem;">
          <div class="section-label">🛰️ Micro-SaaS Blueprints Solving This Pain</div>
          <div class="comp-satellites-grid">
            ${opps.map(sat => `
              <div class="comp-sat-card" onclick="openOpportunityModal(${sat.id})">
                <div class="sat-title">${sat.title} (OSI: ${sat.osi_score})</div>
                <p class="sat-wedge">🎯 ${sat.unbundling_wedge || sat.value_proposition}</p>
                <div style="color:var(--cyan-glow); font-size:0.75rem; font-weight:700; margin-top:0.4rem;">Open Full Blueprint &rarr;</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div>
        <div class="section-label">💬 Verbatim User Dissatisfaction Quotes (${reviews.length} Reviews)</div>
        <div class="evidence-reviews-list" style="max-height:300px;">
          ${reviews.map(r => `
            <div class="evidence-quote-card">
              <div class="evidence-quote-header">
                <span class="evidence-prod-badge">${r.product_name || 'Incumbent'} (${r.orbit_tier === '0_behemoth' ? '🔴 Goliath' : '🟡 Challenger'})</span>
                <span class="evidence-rating">⭐ ${r.star_rating} / 5 Stars</span>
              </div>
              <p class="evidence-dislike-text">"${r.dislike_text}"</p>
              <div class="evidence-meta-row">
                <span>👤 <b>Role:</b> ${r.reviewer_title || 'Verified User'}</span>
                <span>🏢 <b>Tier:</b> ${r.company_size_tier || 'SMB'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div style="color:var(--rose-glow); padding:2rem;">Error fetching pain cluster: ${err.message}</div>`;
  }
}

function closePainModal(event) {
  document.getElementById('pain-modal-overlay').classList.add('hidden');
}

/* ==========================================================================
   MODAL 4: REVIEW EVIDENCE
   ========================================================================== */
async function openEvidenceModal(categorySlug) {
  const overlay = document.getElementById('evidence-modal-overlay');
  const container = document.getElementById('evidence-reviews-container');
  const title = document.getElementById('evidence-modal-title');
  const subtitle = document.getElementById('evidence-modal-subtitle');

  overlay.classList.remove('hidden');
  container.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Loading verbatim review citations from PostgreSQL...</div>';

  try {
    const res = await fetch(`/api/evidence?category_slug=${categorySlug}`);
    const reviews = await res.json();

    title.innerText = `🛡️ Raw Scraped Review Citations (${categorySlug})`;
    subtitle.innerText = `Verbatim customer dissatisfaction statements mined across G2/Capterra proving unbundling demand.`;

    if (reviews.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">No review citations found for this category.</div>';
      return;
    }

    container.innerHTML = reviews.map(r => `
      <div class="evidence-quote-card">
        <div class="evidence-quote-header">
          <span class="evidence-prod-badge">${r.product_name || 'Incumbent'} (${r.orbit_tier === '0_behemoth' ? '🔴 Goliath' : '🟡 Challenger'})</span>
          <span class="evidence-rating">⭐ ${r.star_rating} / 5 Stars</span>
        </div>
        <p class="evidence-dislike-text">"${r.dislike_text}"</p>
        <div class="evidence-meta-row">
          <span>👤 <b>Role:</b> ${r.reviewer_title || 'Verified User'}</span>
          <span>🏢 <b>Tier:</b> ${r.company_size_tier || 'SMB'}</span>
          <span>🔥 <b>Pain:</b> <code>${r.pain_dimension || 'GENERAL'}</code></span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:var(--rose-glow); padding:2rem;">Error fetching reviews: ${err.message}</div>`;
  }
}

function closeEvidenceModal(event) {
  document.getElementById('evidence-modal-overlay').classList.add('hidden');
}
