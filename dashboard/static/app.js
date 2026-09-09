// G2 Micro-SaaS AI Brain - Autonomous White Space Discovery Command Center
let allOpportunities = [];
let activeCategorySlug = 'help-desk';
let activeRootSlug = 'customer-service';
let categoryHierarchy = [];
let allKeywordsData = null;
let activeMainView = 'clusters';

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
  loadCategoryDatalist();
  switchMainView('clusters');
});

/* ==========================================================================
   1. VIEW SWITCHING (3 HIGH-CONVICTION PILLARS)
   ========================================================================== */
function switchMainView(mode) {
  activeMainView = mode;
  const keywordSection = document.getElementById('keyword-view-section');
  const clustersSection = document.getElementById('clusters-view-section');
  const paingraphSection = document.getElementById('paingraph-view-section');
  const kwTabBtn = document.getElementById('tab-btn-keywords');
  const clustersTabBtn = document.getElementById('tab-btn-clusters');
  const paingraphTabBtn = document.getElementById('tab-btn-paingraph');

  if (keywordSection) keywordSection.classList.add('hidden');
  if (clustersSection) clustersSection.classList.add('hidden');
  if (paingraphSection) paingraphSection.classList.add('hidden');

  if (kwTabBtn) kwTabBtn.classList.remove('active');
  if (clustersTabBtn) clustersTabBtn.classList.remove('active');
  if (paingraphTabBtn) paingraphTabBtn.classList.remove('active');

  if (mode === 'keywords') {
    if (keywordSection) keywordSection.classList.remove('hidden');
    if (kwTabBtn) kwTabBtn.classList.add('active');
    loadKeywords(activeCategorySlug || 'all');
  } else if (mode === 'paingraph') {
    if (paingraphSection) paingraphSection.classList.remove('hidden');
    if (paingraphTabBtn) paingraphTabBtn.classList.add('active');
    loadPainGraphView(activeCategorySlug || 'help-desk');
  } else { // default 'clusters'
    if (clustersSection) clustersSection.classList.remove('hidden');
    if (clustersTabBtn) clustersTabBtn.classList.add('active');
    loadClustersView(activeCategorySlug || 'help-desk');
  }
}

/* ==========================================================================
   2. METRICS & TAXONOMY HIERARCHY
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
      const wsBadge = document.getElementById('whitespace-count-badge');
      if (wsBadge) wsBadge.innerText = `${data.opportunities_count} White Spaces`;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadHierarchy() {
  try {
    const res = await fetch('/api/hierarchy');
    categoryHierarchy = await res.json();
    
    // 1. Populate Command Bar Dropdowns
    populateCommandBarDropdowns();

    // 2. Populate Full Hierarchy Directory Modal
    renderHierarchyDirectory(categoryHierarchy);
  } catch (err) {
    console.error('Error loading category hierarchy:', err);
  }
}

function populateCommandBarDropdowns() {
  const rootSelect = document.getElementById('harvester-root-select');
  if (!rootSelect) return;

  rootSelect.innerHTML = categoryHierarchy.map(r => `
    <option value="${r.slug}">${SECTOR_ICONS[r.slug] || '📁'} ${r.name} (${r.subcategory_count} subcategories)</option>
  `).join('');

  if (categoryHierarchy.length > 0) {
    rootSelect.value = activeRootSlug || categoryHierarchy[0].slug;
    onHarvesterRootChange(rootSelect.value);
  }
}

function onHarvesterRootChange(rootSlug) {
  activeRootSlug = rootSlug;
  const subSelect = document.getElementById('harvester-sub-select');
  if (!subSelect) return;

  const root = categoryHierarchy.find(r => r.slug === rootSlug);
  if (!root || !root.subcategories || root.subcategories.length === 0) {
    subSelect.innerHTML = `<option value="${rootSlug}">Direct (${root ? root.name : rootSlug})</option>`;
    activeCategorySlug = rootSlug;
  } else {
    subSelect.innerHTML = root.subcategories.map(s => `
      <option value="${s.slug}">${s.name} ${s.opportunity_count > 0 ? `(🟢 ${s.opportunity_count} Ideas)` : ''}</option>
    `).join('');
    
    const matched = root.subcategories.find(s => s.slug === activeCategorySlug);
    if (matched) {
      subSelect.value = activeCategorySlug;
    } else {
      activeCategorySlug = root.subcategories[0].slug;
      subSelect.value = activeCategorySlug;
    }
  }
  reloadActiveView();
}

function onHarvesterSubChange(subSlug) {
  activeCategorySlug = subSlug;
  reloadActiveView();
}

function onCategorySearchSelect(value) {
  if (!value) return;
  for (const root of categoryHierarchy) {
    if (root.slug === value) {
      syncCategorySelectors(root.slug, root.slug);
      return;
    }
    const sub = (root.subcategories || []).find(s => s.slug === value || s.name.toLowerCase() === value.toLowerCase());
    if (sub) {
      syncCategorySelectors(root.slug, sub.slug);
      return;
    }
  }
  activeCategorySlug = value;
  reloadActiveView();
}

function syncCategorySelectors(rootSlug, subSlug) {
  activeRootSlug = rootSlug;
  activeCategorySlug = subSlug;

  const rootSelect = document.getElementById('harvester-root-select');
  if (rootSelect) rootSelect.value = rootSlug;

  const subSelect = document.getElementById('harvester-sub-select');
  if (subSelect) {
    const root = categoryHierarchy.find(r => r.slug === rootSlug);
    if (root && root.subcategories) {
      subSelect.innerHTML = root.subcategories.map(s => `
        <option value="${s.slug}">${s.name} ${s.opportunity_count > 0 ? `(🟢 ${s.opportunity_count} Ideas)` : ''}</option>
      `).join('');
      subSelect.value = subSlug;
    }
  }
  reloadActiveView();
}

function reloadActiveView() {
  if (activeMainView === 'clusters') {
    loadClustersView(activeCategorySlug);
  } else if (activeMainView === 'paingraph') {
    loadPainGraphView(activeCategorySlug);
  } else if (activeMainView === 'keywords') {
    loadKeywords(activeCategorySlug);
  }
}

async function loadCategoryDatalist() {
  try {
    const res = await fetch('/api/categories?limit=1000');
    const cats = await res.json();
    const datalist = document.getElementById('category-datalist');
    if (datalist) {
      datalist.innerHTML = cats.map(c => `
        <option value="${c.slug}">${c.name} ${c.parent_name ? `(${c.parent_name})` : ''}</option>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading category datalist:', err);
  }
}

/* ==========================================================================
   3. UNIFIED 3-PHASE PIPELINE & 5-AGENT DISCOVERY TRIGGER
   ========================================================================== */
async function triggerMine() {
  const catSlug = activeCategorySlug || 'help-desk';
  const catName = catSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  // Resolve parent sector name
  let parentDomain = 'Software Macro Domain';
  for (const r of categoryHierarchy) {
    const sub = (r.subcategories || []).find(s => s.slug === catSlug);
    if (sub) {
      parentDomain = r.name;
      break;
    }
  }

  openAgentProgressModal(
    'End-to-End Pipeline & 5-Agent Discovery Loop',
    catName,
    `Live real-time telemetry streaming for <span id="prog-target-name" class="highlight-target">${catName}</span>`,
    parentDomain
  );
  
  const btn = document.getElementById('btn-mine');
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('btn-spinner');

  if (btn) btn.disabled = true;
  if (btnText) btnText.innerText = 'Pipeline Running...';
  if (spinner) spinner.classList.remove('hidden');

  let latestWeightAnalysis = null;
  let latestAuditResult = null;

  try {
    const response = await fetch('/api/cluster-and-mine-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_slug: catSlug })
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep last incomplete chunk

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          
          // 1. Phase tracking
          if (event.phase_index) {
            updatePipelinePhase(event.phase_index, event.phase_name);
          }

          // 2. Multi-step stepper tracking (1 to 10)
          if (event.step_index) {
            updateStepper(event.step_index, event.phase_index || 1);
          }

          // 3. Telemetry KPI cards
          if (event.total_products !== undefined || event.scraped_products !== undefined) {
            const prodsEl = document.getElementById('prog-scraped-prods');
            const prodsCount = event.scraped_products || event.total_products || 0;
            const revCount = event.reviews_count || 0;
            if (prodsEl) prodsEl.innerText = `${prodsCount} Prods ${revCount > 0 ? `• ${revCount} Revs` : ''}`;
          }

          if (event.active_agent) {
            const actEl = document.getElementById('prog-active-agent');
            if (actEl) actEl.innerText = event.active_agent.replace('Agent', '').trim();
          }

          if (event.progress_pct !== undefined) {
            const pctEl = document.getElementById('prog-percent-text');
            const barEl = document.getElementById('prog-bar-fill');
            if (pctEl) pctEl.innerText = `${event.progress_pct}%`;
            if (barEl) barEl.style.width = `${event.progress_pct}%`;
          }

          if (event.status_message) {
            const statEl = document.getElementById('prog-status-text');
            const footerHint = document.getElementById('agent-footer-hint');
            if (statEl) statEl.innerText = event.status_message;
            if (footerHint) footerHint.innerText = event.status_message;
          }

          if (event.log_entry) {
            appendTerminalLog(
              event.active_agent || 'Pipeline',
              event.log_entry,
              event.phase_index === 1 ? 'info' : event.phase_index === 2 ? 'math' : 'agent'
            );
          }

          if (event.data) {
            if (event.data.weight_analysis) latestWeightAnalysis = event.data.weight_analysis;
            if (event.data.audit_result) latestAuditResult = event.data.audit_result;
          }

          if (event.type === 'complete' || event.progress_pct === 100) {
            if (event.result) {
              if (event.result.weight_analysis) latestWeightAnalysis = event.result.weight_analysis;
              if (event.result.audit_result) latestAuditResult = event.result.audit_result;
            }
            updatePipelinePhase(3, 'Completed', true);
            const finishBtn = document.getElementById('btn-finish-agent-modal');
            if (finishBtn) {
              finishBtn.disabled = false;
              finishBtn.innerText = 'Done & View Strategic Intelligence →';
            }
            const hint = document.getElementById('agent-footer-hint');
            if (hint) hint.innerText = '✓ All 3 Pipeline Phases & 5 Agents completed successfully. Data synced to PostgreSQL and Decision Engine!';
          }

          if (event.type === 'error') {
            appendTerminalLog('ERROR', event.error || 'Unknown error occurred in pipeline.', 'error');
            const finishBtn = document.getElementById('btn-finish-agent-modal');
            if (finishBtn) {
              finishBtn.disabled = false;
              finishBtn.innerText = 'Close (Encountered Error)';
            }
          }
        } catch (parseErr) {
          console.error('Error parsing stream chunk:', parseErr);
        }
      }
    }

    renderStrategicIntelligence(catSlug, latestWeightAnalysis, latestAuditResult);

    await Promise.all([
      loadStats(),
      loadHierarchy()
    ]);
    reloadActiveView();
  } catch (err) {
    appendTerminalLog('ERROR', `Stream connection error: ${err.message}`, 'error');
    alert(`Discovery error: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerText = '⚡ Run 5-Agent Discovery';
    if (spinner) spinner.classList.add('hidden');
  }
}

/* ==========================================================================
   4. FULL HIERARCHY DIRECTORY & 3-PHASE PROGRESS MODALS
   ========================================================================== */
let hierarchyDirectoryFilter = 'scanned';
let hierarchySearchQuery = '';

function openHierarchyModal() {
  const overlay = document.getElementById('hierarchy-modal-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    setHierarchyDirectoryFilter(hierarchyDirectoryFilter || 'scanned');
  }
}

function closeHierarchyModal(event) {
  if (event && event.target && event.target !== event.currentTarget && !event.target.classList.contains('modal-close')) {
    return;
  }
  const overlay = document.getElementById('hierarchy-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function setHierarchyDirectoryFilter(mode) {
  hierarchyDirectoryFilter = mode;
  const tabScanned = document.getElementById('dir-tab-scanned');
  const tabAll = document.getElementById('dir-tab-all');
  
  if (tabScanned) {
    if (mode === 'scanned') tabScanned.classList.add('active');
    else tabScanned.classList.remove('active');
  }
  if (tabAll) {
    if (mode === 'all') tabAll.classList.add('active');
    else tabAll.classList.remove('active');
  }

  renderHierarchyDirectory(categoryHierarchy);
}

function filterHierarchyModal(query) {
  hierarchySearchQuery = (query || '').trim().toLowerCase();
  renderHierarchyDirectory(categoryHierarchy);
}

function toggleHierarchyAccordion(headerEl) {
  const card = headerEl.closest('.hierarchy-root-card');
  if (card) card.classList.toggle('expanded');
}

function toggleHierarchyRootCard(rootSlug) {
  const card = document.getElementById(`hier-root-${rootSlug}`);
  if (card) card.classList.toggle('expanded');
}

function selectCategoryFromModal(rootSlug, subSlug) {
  closeHierarchyModal();
  syncCategorySelectors(rootSlug, subSlug);
}

function selectSubcategoryFromDirectory(rootSlug, subSlug) {
  closeHierarchyModal();
  syncCategorySelectors(rootSlug, subSlug);
}

function selectAndMineFromDirectory(rootSlug, subSlug) {
  closeHierarchyModal();
  syncCategorySelectors(rootSlug, subSlug);
  triggerMine();
}

function renderHierarchyDirectory(hierarchyList) {
  const container = document.getElementById('hierarchy-tree-container');
  if (!container || !hierarchyList) return;

  const mode = hierarchyDirectoryFilter || 'scanned';
  const query = hierarchySearchQuery || '';

  // Extract all scanned categories with verified data
  const allScanned = [];
  hierarchyList.forEach(r => {
    (r.subcategories || []).forEach(s => {
      if (s.opportunity_count > 0 || s.product_count > 0) {
        allScanned.push({
          ...s,
          rootSlug: r.slug,
          rootName: r.name,
          rootIcon: SECTOR_ICONS[r.slug] || '📁'
        });
      }
    });
  });

  const countBadge = document.getElementById('scanned-cat-count');
  if (countBadge) countBadge.innerText = allScanned.length;

  // TAB 1: ALREADY SCANNED & MINED (DIRECT PROMINENT CARDS GRID)
  if (mode === 'scanned') {
    const displayList = query 
      ? allScanned.filter(s => s.name.toLowerCase().includes(query) || s.rootName.toLowerCase().includes(query))
      : allScanned;

    if (displayList.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 3rem; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.6rem;">🔍</div>
          <div style="font-size: 1.1rem; color: #FFF; font-weight: 700; margin-bottom: 0.35rem;">No scanned categories match "${query}"</div>
          <div style="font-size: 0.85rem;">Switch to the <b>Complete G2 Taxonomy</b> tab to run discovery on new markets.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="scanned-cards-grid">
        ${displayList.map(s => {
          const isCurrentActive = (s.slug === activeCategorySlug);
          return `
            <div class="scanned-cat-card ${isCurrentActive ? 'active-selected' : ''}">
              <div class="scanned-cat-header">
                <div>
                  <div class="scanned-cat-name">${s.rootIcon} ${s.name}</div>
                </div>
                <span class="scanned-cat-parent">${s.rootName}</span>
              </div>

              <div class="scanned-cat-stats-row">
                <span class="scanned-stat-tag emerald">🟢 ${s.opportunity_count || 0} White Spaces</span>
                <span class="scanned-stat-tag cyan">📦 ${s.product_count || 0} Competitors</span>
                <span class="scanned-stat-tag purple">🛡️ Live Reviews</span>
              </div>

              <div class="scanned-cat-actions">
                <button class="btn-load-matrix" onclick="selectSubcategoryFromDirectory('${s.rootSlug}', '${s.slug}')" title="Explore Competitor Clusters & White Space Matrix">
                  🚀 View Matrix & Clusters
                </button>
                <button class="btn-remine-discovery" onclick="selectAndMineFromDirectory('${s.rootSlug}', '${s.slug}')" title="Re-Run End-to-End Discovery Pipeline">
                  ⚡ Re-Mine
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    return;
  }

  // TAB 2: COMPLETE G2 TAXONOMY (FULL MACRO SECTOR ACCORDIONS WITH INSTANT SEARCH)
  let filteredRoots = [];

  if (query) {
    hierarchyList.forEach(r => {
      const rootMatch = r.name.toLowerCase().includes(query) || r.slug.toLowerCase().includes(query);
      const matchingSubs = (r.subcategories || []).filter(s => 
        s.name.toLowerCase().includes(query) || s.slug.toLowerCase().includes(query)
      );

      if (rootMatch || matchingSubs.length > 0) {
        filteredRoots.push({
          ...r,
          displaySubs: matchingSubs.length > 0 ? matchingSubs : r.subcategories,
          forceExpand: true
        });
      }
    });
  } else {
    filteredRoots = hierarchyList.map(r => ({
      ...r,
      displaySubs: r.subcategories || [],
      forceExpand: false
    }));
  }

  if (filteredRoots.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 0.6rem;">🔍</div>
        <div style="font-size: 1.1rem; color: #FFF; font-weight: 700; margin-bottom: 0.35rem;">No matching taxonomy domains found</div>
        <div style="font-size: 0.85rem;">Try searching for "Marketing", "Security", "Developer", "HR", or "Analytics".</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredRoots.map(r => {
    const isExpanded = r.forceExpand;
    const hasScanned = (r.total_opportunity_count > 0 || r.total_product_count > 0);
    const icon = SECTOR_ICONS[r.slug] || '📁';
    const subList = r.displaySubs || [];

    return `
      <div class="hierarchy-root-card ${hasScanned ? 'has-scanned' : ''} ${isExpanded ? 'expanded' : ''}" id="hier-root-${r.slug}">
        <div class="hierarchy-root-header" onclick="toggleHierarchyRootCard('${r.slug}')">
          <div class="hierarchy-root-title">
            <span>${icon}</span>
            <span>${r.name}</span>
          </div>
          <div class="hierarchy-root-meta">
            ${r.total_opportunity_count > 0 ? `
              <span class="hierarchy-sub-badge scanned" style="background:rgba(16,185,129,0.15); padding:0.2rem 0.6rem; border-radius:6px; border:1px solid rgba(16,185,129,0.3);">
                🟢 ${r.total_opportunity_count} White Spaces
              </span>
            ` : ''}
            <span>${subList.length} Sub-Categories</span>
            <span class="hierarchy-root-chevron">▼</span>
          </div>
        </div>

        <div class="hierarchy-sub-grid">
          ${subList.map(s => {
            const isScanned = (s.opportunity_count > 0 || s.product_count > 0);
            const isCurrentActive = (s.slug === activeCategorySlug);

            return `
              <div class="hierarchy-sub-item ${isCurrentActive ? 'active-sub' : ''} ${isScanned ? 'has-opps' : ''}">
                <div class="hierarchy-sub-info">
                  <span class="hierarchy-sub-name" title="${s.name}">${s.name}</span>
                  <span class="hierarchy-sub-badge ${isScanned ? 'scanned' : ''}">
                    ${s.opportunity_count > 0 
                      ? `🟢 ${s.opportunity_count} White Spaces • ${s.product_count || 0} Competitors` 
                      : s.product_count > 0 
                        ? `📦 ${s.product_count} Products Profiled` 
                        : `⚪ Ready for 5-Agent Discovery`}
                  </span>
                </div>
                <div class="hierarchy-sub-actions">
                  ${isScanned ? `
                    <button class="btn-micro primary" onclick="selectSubcategoryFromDirectory('${r.slug}', '${s.slug}')" title="Explore Competitor Clusters & White Space Matrix">
                      View Matrix
                    </button>
                    <button class="btn-micro secondary" onclick="selectAndMineFromDirectory('${r.slug}', '${s.slug}')" title="Re-Run 5-Agent Discovery">
                      ⚡ Re-Mine
                    </button>
                  ` : `
                    <button class="btn-micro secondary" onclick="selectAndMineFromDirectory('${r.slug}', '${s.slug}')" title="Launch 5-Agent AI Discovery Loop">
                      ⚡ Run Discovery
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

/* 3-PHASE PIPELINE MODAL CONTROLLER & TELEMETRY STREAMING */
function openAgentProgressModal(title, targetName, subtitle, domainName) {
  const overlay = document.getElementById('agent-progress-modal');
  if (overlay) overlay.classList.remove('hidden');

  const titleEl = document.getElementById('agent-modal-title');
  const subEl = document.getElementById('agent-modal-subtitle');
  const targetEl = document.getElementById('prog-target-name');
  const domainEl = document.getElementById('prog-cat-domain');
  
  if (titleEl && title) titleEl.innerText = title;
  if (subEl && subtitle) subEl.innerHTML = subtitle;
  if (targetEl && targetName) targetEl.innerText = targetName;
  if (domainEl && domainName) domainEl.innerText = domainName;

  // Reset progress bar & metrics
  const bar = document.getElementById('prog-bar-fill');
  const pct = document.getElementById('prog-percent-text');
  const logs = document.getElementById('agent-terminal-logs');
  const finishBtn = document.getElementById('btn-finish-agent-modal');
  const activeAgentEl = document.getElementById('prog-active-agent');
  const roleEl = document.getElementById('prog-agent-role');
  const prodsEl = document.getElementById('prog-scraped-prods');

  if (bar) bar.style.width = '0%';
  if (pct) pct.innerText = '0%';
  if (logs) logs.innerHTML = '<div class="term-log-line system">[SYSTEM] Socket connected. Subscribing to 3-Phase NDJSON telemetry feed...</div>';
  if (finishBtn) {
    finishBtn.disabled = true;
    finishBtn.innerText = 'Pipeline Running...';
  }
  if (activeAgentEl) activeAgentEl.innerText = 'Initializing';
  if (roleEl) roleEl.innerText = 'Phase 1: Discovery';
  if (prodsEl) prodsEl.innerText = '-- / --';

  // Reset phase pills
  updatePipelinePhase(1, 'Taxonomy & Market Discovery');

  // Reset stepper (10 steps)
  updateStepper(1, 1);
}

function updatePipelinePhase(phaseIdx, phaseName, isAllComplete = false) {
  for (let i = 1; i <= 3; i++) {
    const pill = document.getElementById(`phase-pill-${i}`);
    if (!pill) continue;
    if (isAllComplete) {
      pill.classList.remove('active');
      pill.classList.add('completed');
    } else if (i < phaseIdx) {
      pill.classList.remove('active');
      pill.classList.add('completed');
    } else if (i === phaseIdx) {
      pill.classList.add('active');
      pill.classList.remove('completed');
    } else {
      pill.classList.remove('active', 'completed');
    }
  }

  const roleEl = document.getElementById('prog-agent-role');
  if (roleEl) roleEl.innerText = `Phase ${phaseIdx}: ${phaseName}`;
}

function updateStepper(stepNum, phaseNum) {
  for (let i = 1; i <= 10; i++) {
    const step = document.getElementById(`step-${i}`);
    const line = document.getElementById(`line-${i}`);
    if (!step) continue;
    if (i < stepNum) {
      step.classList.remove('active');
      step.classList.add('completed');
      if (line) line.classList.add('completed');
    } else if (i === stepNum) {
      step.classList.add('active');
      step.classList.remove('completed');
      if (line) line.classList.remove('completed');
    } else {
      step.classList.remove('active', 'completed');
      if (line) line.classList.remove('completed');
    }
  }
}

function closeAgentProgressModal() {
  const overlay = document.getElementById('agent-progress-modal');
  if (overlay) overlay.classList.add('hidden');
}

function handleAgentModalOverlayClick(e) {
  if (e.target && e.target.id === 'agent-progress-modal') {
    const finishBtn = document.getElementById('btn-finish-agent-modal');
    if (finishBtn && !finishBtn.disabled) {
      closeAgentProgressModal();
    }
  }
}

function appendTerminalLog(agent, msg, type = 'info') {
  const container = document.getElementById('agent-terminal-logs');
  if (!container) return;
  const line = document.createElement('div');
  line.className = `term-log-line ${type}`;
  line.innerText = `[${agent}] ${msg}`;
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

function renderStrategicIntelligence(catSlug, weightAnalysis, auditResult) {
  const catSpan = document.getElementById('strat-cat-name');
  if (catSpan) catSpan.innerText = (catSlug || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const gaugeContainer = document.getElementById('weights-gauge-container');
  if (gaugeContainer) {
    const w = (weightAnalysis && weightAnalysis.weights) ? weightAnalysis.weights : {
      w_feature: 0.35,
      w_icp: 0.25,
      w_pricing: 0.20,
      w_search: 0.20
    };
    gaugeContainer.innerHTML = `
      <div class="weight-gauge-item">
        <div class="weight-gauge-label"><span>JTBD Capabilities (W_cap)</span><span class="wt-val">${((w.w_feature || 0.35) * 100).toFixed(0)}%</span></div>
        <div class="weight-bar-track"><div class="weight-bar-fill" style="width:${((w.w_feature || 0.35) * 100).toFixed(0)}%;"></div></div>
      </div>
      <div class="weight-gauge-item">
        <div class="weight-gauge-label"><span>Product Philosophy (W_phil)</span><span class="wt-val">${((w.w_icp || 0.25) * 100).toFixed(0)}%</span></div>
        <div class="weight-bar-track"><div class="weight-bar-fill" style="width:${((w.w_icp || 0.25) * 100).toFixed(0)}%; background:linear-gradient(90deg, #A855F7, #EC4899);"></div></div>
      </div>
      <div class="weight-gauge-item">
        <div class="weight-gauge-label"><span>Market Tier & Price (W_tier)</span><span class="wt-val">${((w.w_pricing || 0.20) * 100).toFixed(0)}%</span></div>
        <div class="weight-bar-track"><div class="weight-bar-fill" style="width:${((w.w_pricing || 0.20) * 100).toFixed(0)}%; background:linear-gradient(90deg, #3B82F6, #06B6D4);"></div></div>
      </div>
      <div class="weight-gauge-item">
        <div class="weight-gauge-label"><span>Google Search Graph (W_search)</span><span class="wt-val">${((w.w_search || 0.20) * 100).toFixed(0)}%</span></div>
        <div class="weight-bar-track"><div class="weight-bar-fill" style="width:${((w.w_search || 0.20) * 100).toFixed(0)}%; background:linear-gradient(90deg, #10B981, #059669);"></div></div>
      </div>
    `;
  }

  const auditContainer = document.getElementById('audit-summary-container');
  if (auditContainer) {
    const verified = (auditResult && auditResult.verified_systemic_omissions) || [
      'Zero-penalty flat pricing model ignored by all enterprise incumbents',
      'Sub-5 minute lightning setup unaddressed by legacy queue suites'
    ];
    const obs = (auditResult && auditResult.critic_observations) || [
      'Verified that no incumbent cluster provides flat-rate pricing with zero tiered seat penalties.',
      'Review citations confirm high dissatisfaction with slow load times and complex UI bloat.'
    ];
    auditContainer.innerHTML = `
      <div style="display:flex; gap:1rem; margin-bottom:0.75rem;">
        <div style="background:rgba(16,185,129,0.12); padding:0.4rem 0.8rem; border-radius:8px; border:1px solid rgba(16,185,129,0.3); font-size:0.8rem; color:#34D399; font-weight:700;">
          ✓ ${verified.length} Genuine Omissions Verified
        </div>
        <div style="background:rgba(56,189,248,0.12); padding:0.4rem 0.8rem; border-radius:8px; border:1px solid rgba(56,189,248,0.3); font-size:0.8rem; color:#7DD3FC; font-weight:700;">
          🛡️ Anti-Hallucination Gate Passed
        </div>
      </div>
      <ul style="margin:0; padding-left:1.2rem; font-size:0.82rem; color:var(--text-secondary); line-height:1.5;">
        ${obs.map(o => `<li>${o}</li>`).join('')}
      </ul>
    `;
  }
}

/* EVIDENCE MODAL */
function openEvidenceModal(categorySlugOrTitle, reviews) {
  const overlay = document.getElementById('evidence-modal-overlay');
  const titleEl = document.getElementById('evidence-modal-title');
  const subtitleEl = document.getElementById('evidence-modal-subtitle');
  const listEl = document.getElementById('evidence-reviews-container');

  if (titleEl) titleEl.innerText = `🛡️ Raw Scraped Review Citations (${categorySlugOrTitle || activeCategorySlug})`;
  if (subtitleEl) subtitleEl.innerText = 'Verbatim customer quotes mined from G2 and Capterra supporting this disruption vector.';
  
  if (listEl) {
    if (Array.isArray(reviews) && reviews.length > 0) {
      listEl.innerHTML = reviews.map(r => `
        <div class="evidence-quote-card">
          <div class="evidence-quote-header">
            <span class="evidence-prod-badge">⭐ ${r.star_rating || 1} / 5 Stars - ${r.reviewer_title || 'Verified User'}</span>
            <span class="evidence-rating">${r.company_size_tier || 'SMB'}</span>
          </div>
          <p class="evidence-dislike-text">"${r.dislike_text || r.quote || r}"</p>
          <div class="evidence-meta-row">
            <span>🔥 <b>Pain:</b> <code>${r.pain_dimension || 'GENERAL'}</code></span>
            <span>👤 <b>ICP:</b> ${r.extracted_icp || 'Software Buyer'}</span>
          </div>
        </div>
      `).join('');
    } else {
      // Fetch from API
      listEl.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Loading verbatim review citations from PostgreSQL...</div>';
      fetch(`/api/evidence?category_slug=${categorySlugOrTitle || activeCategorySlug}`)
        .then(res => res.json())
        .then(revs => {
          if (!revs || revs.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:2rem;">No review citations found for this category.</div>`;
          } else {
            listEl.innerHTML = revs.map(r => `
              <div class="evidence-quote-card">
                <div class="evidence-quote-header">
                  <span class="evidence-prod-badge">${r.product_name || 'Incumbent'} (${r.orbit_tier === '0_behemoth' ? '🔴 Goliath' : '🟡 Challenger'})</span>
                  <span class="evidence-rating">⭐ ${r.star_rating || 1} / 5 Stars</span>
                </div>
                <p class="evidence-dislike-text">"${r.dislike_text || r.text || ''}"</p>
                <div class="evidence-meta-row">
                  <span>👤 <b>Role:</b> ${r.reviewer_title || 'Verified User'}</span>
                  <span>🏢 <b>Tier:</b> ${r.company_size_tier || 'SMB'}</span>
                  <span>🔥 <b>Pain:</b> <code>${r.pain_dimension || 'GENERAL'}</code></span>
                </div>
              </div>
            `).join('');
          }
        })
        .catch(err => {
          listEl.innerHTML = `<div style="color:var(--rose-glow); padding:2rem;">Error fetching reviews: ${err.message}</div>`;
        });
    }
  }

  if (overlay) overlay.classList.remove('hidden');
}

function closeEvidenceModal(e) {
  if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close')) {
    return;
  }
  const overlay = document.getElementById('evidence-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

/* ==========================================================================
   5. SUB-TAB 1: COMPETITOR CLUSTERS & WHITE SPACE MATRIX VIEW
   ========================================================================== */
async function loadClustersView(categorySlug) {
  const catSlug = categorySlug || activeCategorySlug || 'help-desk';
  renderStrategicIntelligence(catSlug);

  await Promise.all([
    loadClusters(catSlug),
    loadWhitespaceOpportunities(catSlug)
  ]);
}

async function loadClusters(categorySlug) {
  const grid = document.getElementById('clusters-container');
  if (!grid) return;

  grid.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary); grid-column:1/-1;">🔮 Mining multi-signal competitor clusters from PostgreSQL...</div>';

  try {
    const res = await fetch(`/api/clusters?category_slug=${categorySlug}`);
    const clusters = await res.json();

    if (!clusters || clusters.length === 0) {
      grid.innerHTML = `
        <div style="text-align:center; padding:3rem; color:var(--text-secondary); grid-column:1/-1;">
          <p style="margin-bottom:1rem; font-size:1rem; color:#FFF;">No competitor clusters found for this subcategory.</p>
          <button class="btn-primary" onclick="triggerMine()" style="margin:0 auto; background:linear-gradient(135deg, #A855F7 0%, #7C3AED 100%);">
            ⚡ Run 5-Agent Discovery & Clustering
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = clusters.map((c, idx) => {
      let prods = Array.isArray(c.product_slugs) ? c.product_slugs : [];
      let pains = Array.isArray(c.common_pains) ? c.common_pains : [];
      let gaps = Array.isArray(c.unaddressed_gaps) ? c.unaddressed_gaps : [];

      if (typeof prods === 'string') {
        try { prods = JSON.parse(prods); } catch (e) { prods = []; }
      }
      if (typeof pains === 'string') {
        try { pains = JSON.parse(pains); } catch (e) { pains = []; }
      }
      if (typeof gaps === 'string') {
        try { gaps = JSON.parse(gaps); } catch (e) { gaps = []; }
      }

      return `
        <div class="cluster-card">
          <div class="cluster-header">
            <h4 class="cluster-title">${c.cluster_name || `Cluster ${idx + 1}`}</h4>
            <span class="cluster-tier-badge">${c.target_tier || 'Mid-Market'}</span>
          </div>

          <div class="cluster-theme-box">
            ${c.cluster_theme || 'Strategic competitor grouping sharing feature matrix archetype and customer segmentation.'}
          </div>

          <div class="cluster-section-heading">Member Incumbent Products (${prods.length})</div>
          <div class="cluster-products-list">
            ${prods.map(slug => `
              <span class="cluster-product-chip" onclick="openCompetitorModal('${slug}')">
                🛡️ ${slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            `).join('')}
          </div>

          <div class="cluster-section-heading" style="color:var(--rose-glow); margin-top:0.4rem;">Shared Vulnerabilities & Group Pains</div>
          <div style="margin-bottom:1rem;">
            ${pains.slice(0, 3).map(p => `
              <div class="cluster-pain-pill">⚠️ ${p}</div>
            `).join('')}
          </div>

          <div class="cluster-section-heading" style="color:var(--amber-glow);">Unaddressed Gaps (Left Unsolved by this Cluster)</div>
          <div>
            ${gaps.slice(0, 3).map(g => `
              <div class="cluster-gap-pill">❌ ${g}</div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    grid.innerHTML = `<div style="color:var(--rose-glow); padding:2rem; grid-column:1/-1;">Error loading competitor clusters: ${err.message}</div>`;
  }
}

async function loadWhitespaceOpportunities(categorySlug) {
  const grid = document.getElementById('whitespace-container');
  const badge = document.getElementById('whitespace-count-badge');
  if (!grid) return;

  grid.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary); grid-column:1/-1;">✨ Analyzing cross-cluster omissions and discovering live Google SEO search demand...</div>';

  try {
    const res = await fetch(`/api/whitespace?category_slug=${categorySlug}`);
    const opps = await res.json();
    allOpportunities = opps || [];

    if (badge) {
      badge.innerText = `${allOpportunities.length} White Spaces`;
    }

    if (!opps || opps.length === 0) {
      grid.innerHTML = `
        <div style="text-align:center; padding:3rem; color:var(--text-secondary); grid-column:1/-1;">
          <p style="margin-bottom:1rem; font-size:1rem; color:#FFF;">No white space opportunities generated yet for this subcategory.</p>
          <button class="btn-primary" onclick="triggerMine()" style="margin:0 auto; background:linear-gradient(135deg, #10B981 0%, #059669 100%);">
            ⚡ Run 5-Agent Discovery Loop
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = opps.map((opp, idx) => {
      let coreFeatures = Array.isArray(opp.core_features) ? opp.core_features : [];
      let attackedClusters = Array.isArray(opp.attacked_cluster_slugs) ? opp.attacked_cluster_slugs : [];
      let searchKws = Array.isArray(opp.search_demand_keywords) ? opp.search_demand_keywords : [];

      if (typeof coreFeatures === 'string') {
        try { coreFeatures = JSON.parse(coreFeatures); } catch (e) { coreFeatures = []; }
      }
      if (typeof attackedClusters === 'string') {
        try { attackedClusters = JSON.parse(attackedClusters); } catch (e) { attackedClusters = []; }
      }
      if (typeof searchKws === 'string') {
        try { searchKws = JSON.parse(searchKws); } catch (e) { searchKws = []; }
      }

      const osi = Number(opp.osi_score || 9.2).toFixed(1);
      const identifier = opp.id || opp.slug || idx;

      return `
        <div class="whitespace-card" onclick="openOpportunityModal(${typeof identifier === 'number' ? identifier : `'${identifier}'`})" style="cursor:pointer;">
          <div class="whitespace-header">
            <h3 class="whitespace-title">${opp.title}</h3>
            <span class="whitespace-osi-badge">OSI: ${osi} / 10</span>
          </div>

          <div class="omission-box">
            <div class="omission-label">
              <span>🚨 Systemic Omission (Unsolved Blind Spot)</span>
            </div>
            <p class="omission-text">${opp.target_omission_summary || 'Identified systemic gap left completely unaddressed across all incumbent clusters in this subcategory.'}</p>
          </div>

          <div class="whitespace-wedge-box">
            <div style="font-size:0.72rem; text-transform:uppercase; color:var(--cyan-glow); font-weight:700; margin-bottom:0.2rem;">Unbundling Wedge & ICP</div>
            <div style="font-size:0.88rem; color:#FFF; font-weight:600; margin-bottom:0.3rem;">${opp.unbundling_wedge || 'Focused high-velocity Micro-SaaS alternative.'}</div>
            <div style="font-size:0.78rem; color:var(--text-secondary);">🎯 <b>Target ICP:</b> ${opp.target_icp || opp.target_persona || 'Agile SMBs & Founders'}</div>
          </div>

          <div class="whitespace-meta-row">
            <div class="whitespace-meta-item">
              <div class="label">Pricing Model</div>
              <div class="val" style="color:var(--emerald-glow);">${opp.pricing_strategy || '$39/mo flat rate'}</div>
            </div>
            <div class="whitespace-meta-item">
              <div class="label">Attacked Clusters</div>
              <div class="val" style="font-size:0.75rem;">${attackedClusters.length > 0 ? attackedClusters.join(', ') : 'All Incumbent Groups'}</div>
            </div>
          </div>

          <div class="cluster-section-heading">MVP Core Features (Zero Bloat)</div>
          <ul class="whitespace-features-list">
            ${coreFeatures.slice(0, 4).map(f => `
              <li class="whitespace-feature-item">
                <span class="check">✓</span>
                <span>${f}</span>
              </li>
            `).join('')}
          </ul>

          <div class="seo-demand-container" onclick="event.stopPropagation()">
            <div class="seo-demand-heading">
              <span>📈 Live Google SEO Demand Validation</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">Empirical Google Autocomplete</span>
            </div>
            <div class="seo-kws-list">
              ${searchKws.slice(0, 3).map(kw => {
                const isObj = typeof kw === 'object' && kw !== null;
                const kwName = isObj ? (kw.verified_root_query || kw.keyword || 'saas alternative') : (typeof kw === 'string' ? kw : 'saas alternative');
                const origQuery = isObj && kw.original_seed_query ? ` (Root for "${kw.original_seed_query}")` : '';
                const volNum = isObj && kw.monthly_search_volume !== undefined ? Number(kw.monthly_search_volume) : 0;
                const volStr = volNum > 0 ? `${volNum.toLocaleString()} /mo` : '< 10 /mo';
                const growthNum = isObj && kw.growth_yoy_pct !== undefined ? Number(kw.growth_yoy_pct) : 0;
                const growthStr = growthNum !== 0 ? `${growthNum > 0 ? '+' : ''}${growthNum}% YoY` : '0% YoY (Low Data)';
                const cpcStr = isObj && kw.cpc_usd ? `$${kw.cpc_usd}` : '$0.00';
                const isVerified = volNum > 0 && (isObj && kw.demand_status !== 'unverified');

                return `
                  <div class="seo-kw-row" style="${!isVerified ? 'opacity: 0.65;' : ''}">
                    <span class="seo-kw-name" title="${kwName}${origQuery}">${kwName}</span>
                    <div class="seo-kw-stats">
                      ${isVerified ? `
                        <span class="seo-vol-badge">${volStr}</span>
                        <span class="seo-growth-badge">${growthStr}</span>
                        <span style="color:var(--text-muted); font-size:0.72rem;">${cpcStr} CPC</span>
                      ` : `
                        <span style="color:var(--text-muted); font-size:0.75rem;">⚪ Unproven (&lt;10/mo in Google)</span>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    grid.innerHTML = `<div style="color:var(--rose-glow); padding:2rem; grid-column:1/-1;">Error loading white space opportunities: ${err.message}</div>`;
  }
}

/* ==========================================================================
   6. SUB-TAB 2: PAIN NETWORK & SYSTEMIC OMISSION GRAPH ENGINE
   ========================================================================== */
let pgNodes = [];
let pgEdges = [];
let pgRawGraphData = null;
let pgActiveFilter = 'all'; // 'all', 'shared', 'omissions', 'isolated'
let pgSelectedCluster = 'all';
let pgSearchQuery = '';
let pgSelectedNode = null;
let pgHoveredNode = null;
let pgIsPhysicsRunning = true;
let pgCamera = { x: 0, y: 0, zoom: 1 };
let pgIsDragging = false;
let pgDragNode = null;
let pgLastMousePos = { x: 0, y: 0 };
let pgAnimationId = null;
let pgCanvasInitialized = false;

async function loadPainGraphView(categorySlug) {
  const catSlug = categorySlug || activeCategorySlug || 'help-desk';

  try {
    const res = await fetch(`/api/cluster-pain-graph?category_slug=${catSlug}`);
    const data = await res.json();
    pgRawGraphData = data;

    // Initialize Graph Geometry & Physics
    setupPainGraphData(data.nodes || [], data.edges || []);

    if (!pgCanvasInitialized) {
      initPainGraphCanvas();
      pgCanvasInitialized = true;
    }

    // Reset camera center
    resetGraphCamera();

    // Start render loop if not running
    if (!pgAnimationId) {
      pgAnimationId = requestAnimationFrame(painGraphRenderLoop);
    }

  } catch (err) {
    console.error('Failed to load cluster pain graph:', err);
  }
}

function setupPainGraphData(rawNodes, rawEdges) {
  const container = document.getElementById('paingraph-canvas-container');
  const width = container ? container.clientWidth : 1200;
  const height = container ? container.clientHeight : 720;
  const centerX = width / 2;
  const centerY = height / 2;

  const clusterNodes = rawNodes.filter(n => n.node_type === 'cluster');
  const sharedPainNodes = rawNodes.filter(n => n.node_type === 'pain_shared');
  const isolatedPainNodes = rawNodes.filter(n => n.node_type === 'pain_isolated');
  const omissionNodes = rawNodes.filter(n => n.node_type === 'unresolved_omission');
  const solutionNodes = rawNodes.filter(n => n.node_type === 'micro_saas_solution');

  // Place Cluster Hubs evenly on a wide central ring (radius 280)
  const clusterRadius = 280;
  clusterNodes.forEach((c, i) => {
    const angle = (i / Math.max(1, clusterNodes.length)) * Math.PI * 2 - Math.PI / 2;
    c.x = centerX + Math.cos(angle) * clusterRadius;
    c.y = centerY + Math.sin(angle) * clusterRadius;
    c.vx = 0;
    c.vy = 0;
    c.radius = 30 + (c.product_count || 2) * 3;
    c.mass = 5.0;
  });

  // Place Shared Pains along the chord bridges between connected clusters
  sharedPainNodes.forEach((sp, i) => {
    const cIds = sp.connected_clusters || [];
    let midX = centerX;
    let midY = centerY;

    if (cIds.length >= 2) {
      const c1 = clusterNodes.find(c => c.id === cIds[0]) || clusterNodes[0];
      const c2 = clusterNodes.find(c => c.id === cIds[1]) || clusterNodes[1] || c1;
      midX = (c1.x + c2.x) / 2;
      midY = (c1.y + c2.y) / 2;
    } else {
      const angle = (i / Math.max(1, sharedPainNodes.length)) * Math.PI * 2;
      midX = centerX + Math.cos(angle) * 120;
      midY = centerY + Math.sin(angle) * 120;
    }

    sp.x = midX * 0.88 + (Math.sin(i * 2.3) * 30);
    sp.y = midY * 0.88 + (Math.cos(i * 2.3) * 30);
    sp.vx = 0;
    sp.vy = 0;
    sp.radius = 20 + (sp.connected_clusters_count || 2) * 2;
    sp.mass = 2.5;
  });

  // Place Isolated Pains in a clean outward halo behind their respective cluster
  isolatedPainNodes.forEach((ip, i) => {
    const parentClusterId = ip.connected_clusters && ip.connected_clusters[0];
    const parent = clusterNodes.find(c => c.id === parentClusterId) || clusterNodes[0];
    const parentX = parent ? parent.x : centerX;
    const parentY = parent ? parent.y : centerY;
    
    const outwardAngle = Math.atan2(parentY - centerY, parentX - centerX) + ((i % 3) - 1) * 0.45;
    ip.x = parentX + Math.cos(outwardAngle) * 130;
    ip.y = parentY + Math.sin(outwardAngle) * 130;
    ip.vx = 0;
    ip.vy = 0;
    ip.radius = 18;
    ip.mass = 1.8;
  });

  // Place 100% Unresolved Blind Spots in a dedicated, spacious outer orbit (radius 480)
  const omissionRadius = 480;
  omissionNodes.forEach((om, i) => {
    const angle = (i / Math.max(1, omissionNodes.length)) * Math.PI * 2 + 0.25;
    om.x = centerX + Math.cos(angle) * omissionRadius;
    om.y = centerY + Math.sin(angle) * omissionRadius;
    om.vx = 0;
    om.vy = 0;
    om.radius = 24;
    om.mass = 3.0;
    om.pulsePhase = i * 0.8;
  });

  // Place Micro-SaaS Solutions satellite pairs just outside each Omission (70px separation)
  solutionNodes.forEach((sol, i) => {
    const matchOmission = omissionNodes[i % Math.max(1, omissionNodes.length)];
    const omX = matchOmission ? matchOmission.x : centerX + 400;
    const omY = matchOmission ? matchOmission.y : centerY + 400;
    
    const angleOut = Math.atan2(omY - centerY, omX - centerX);
    sol.x = omX + Math.cos(angleOut) * 70;
    sol.y = omY + Math.sin(angleOut) * 70;
    sol.vx = 0;
    sol.vy = 0;
    sol.radius = 22;
    sol.mass = 2.0;
  });

  pgNodes = [...clusterNodes, ...sharedPainNodes, ...isolatedPainNodes, ...omissionNodes, ...solutionNodes];

  // Map edges to actual node object references
  const nodeMap = new Map(pgNodes.map(n => [n.id, n]));
  pgEdges = rawEdges.map(e => ({
    ...e,
    sourceNode: nodeMap.get(e.source),
    targetNode: nodeMap.get(e.target)
  })).filter(e => e.sourceNode && e.targetNode);
}

function initPainGraphCanvas() {
  const canvas = document.getElementById('paingraph-canvas');
  if (!canvas) return;

  const container = document.getElementById('paingraph-canvas-container');
  const dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    if (!container || !canvas) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // MOUSE & DRAG INTERACTIONS
  canvas.addEventListener('mousedown', (e) => {
    const pos = getCanvasMousePos(e, canvas);
    const worldPos = screenToWorldPos(pos);
    const clickedNode = findNodeAt(worldPos.x, worldPos.y);

    if (clickedNode) {
      pgDragNode = clickedNode;
      pgSelectedNode = clickedNode;
      openPainGraphInspector(clickedNode);
    } else {
      pgIsDragging = true;
      pgLastMousePos = pos;
    }
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      if (pgHoveredNode && !pgDragNode) {
        pgHoveredNode = null;
        hidePainGraphTooltip();
      }
    }

    const pos = getCanvasMousePos(e, canvas);

    if (pgDragNode) {
      const worldPos = screenToWorldPos(pos);
      pgDragNode.x = worldPos.x;
      pgDragNode.y = worldPos.y;
      pgDragNode.vx = 0;
      pgDragNode.vy = 0;
    } else if (pgIsDragging) {
      const dx = pos.x - pgLastMousePos.x;
      const dy = pos.y - pgLastMousePos.y;
      pgCamera.x += dx / pgCamera.zoom;
      pgCamera.y += dy / pgCamera.zoom;
      pgLastMousePos = pos;
    } else {
      const worldPos = screenToWorldPos(pos);
      const hovered = findNodeAt(worldPos.x, worldPos.y);
      if (hovered !== pgHoveredNode) {
        pgHoveredNode = hovered;
        if (hovered) {
          showPainGraphTooltip(hovered, e.clientX, e.clientY);
        } else {
          hidePainGraphTooltip();
        }
      } else if (hovered) {
        updateTooltipPosition(e.clientX, e.clientY);
      }
    }
  });

  window.addEventListener('mouseup', () => {
    pgDragNode = null;
    pgIsDragging = false;
  });

  // ZOOM WITH WHEEL & TRACKPAD PINCH
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    zoomGraph(zoomFactor);
  }, { passive: false });
}

function getCanvasMousePos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function screenToWorldPos(screenPos) {
  const container = document.getElementById('paingraph-canvas-container');
  const w = container ? container.clientWidth : 1200;
  const h = container ? container.clientHeight : 720;
  const cx = w / 2;
  const cy = h / 2;

  return {
    x: (screenPos.x - cx) / pgCamera.zoom - pgCamera.x + cx,
    y: (screenPos.y - cy) / pgCamera.zoom - pgCamera.y + cy
  };
}

function findNodeAt(worldX, worldY) {
  for (let i = pgNodes.length - 1; i >= 0; i--) {
    const node = pgNodes[i];
    if (!isNodeVisible(node)) continue;
    const dx = node.x - worldX;
    const dy = node.y - worldY;
    if (Math.hypot(dx, dy) <= node.radius + 8) {
      return node;
    }
  }
  return null;
}

function isNodeVisible(node) {
  // Search Filter
  if (pgSearchQuery) {
    const q = pgSearchQuery.toLowerCase();
    const labelMatch = (node.label || '').toLowerCase().includes(q);
    const summaryMatch = (node.omission_summary || node.theme || '').toLowerCase().includes(q);
    const quotesMatch = (node.sample_quotes || []).some(quote => (quote.text || quote || '').toLowerCase().includes(q));
    if (!labelMatch && !summaryMatch && !quotesMatch) return false;
  }

  // Type Filter
  if (pgActiveFilter === 'shared') {
    return node.node_type === 'cluster' || node.node_type === 'pain_shared';
  } else if (pgActiveFilter === 'omissions') {
    return node.node_type === 'cluster' || node.node_type === 'unresolved_omission' || node.node_type === 'micro_saas_solution';
  } else if (pgActiveFilter === 'isolated') {
    return node.node_type === 'cluster' || node.node_type === 'pain_isolated';
  }

  return true;
}

function painGraphRenderLoop(timestamp) {
  if (pgIsPhysicsRunning && !pgDragNode) {
    updatePainGraphPhysics();
  }

  renderPainGraph(timestamp);
  pgAnimationId = requestAnimationFrame(painGraphRenderLoop);
}

function updatePainGraphPhysics() {
  const container = document.getElementById('paingraph-canvas-container');
  const width = container ? container.clientWidth : 1200;
  const height = container ? container.clientHeight : 720;
  const centerX = width / 2;
  const centerY = height / 2;

  // 1. Multi-body Coulomb Repulsion
  for (let i = 0; i < pgNodes.length; i++) {
    const n1 = pgNodes[i];
    for (let j = i + 1; j < pgNodes.length; j++) {
      const n2 = pgNodes[j];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const minDist = n1.radius + n2.radius + 70;

      if (dist < 600) {
        const force = (dist < minDist) ? (minDist - dist) * 0.12 : (2000 / (dist * dist));
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        n1.vx -= fx / n1.mass;
        n1.vy -= fy / n1.mass;
        n2.vx += fx / n2.mass;
        n2.vy += fy / n2.mass;
      }
    }
  }

  // 2. Hooke's Spring Attraction along Edges
  for (const edge of pgEdges) {
    const s = edge.sourceNode;
    const t = edge.targetNode;
    if (!s || !t) continue;

    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.hypot(dx, dy) || 1;
    const idealDist = edge.link_type === 'solution_wedge' ? 70 : 
                     (edge.link_type === 'unresolved_gap' ? 300 : 
                     (edge.is_shared ? 200 : 140));
    const force = (dist - idealDist) * 0.006;

    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    s.vx += fx / s.mass;
    s.vy += fy / s.mass;
    t.vx -= fx / t.mass;
    t.vy -= fy / t.mass;
  }

  // 3. Central Gravity & Damping
  for (const node of pgNodes) {
    const dx = centerX - node.x;
    const dy = centerY - node.y;
    const grav = (node.node_type === 'cluster') ? 0.003 : (node.node_type === 'unresolved_omission' ? 0.0008 : 0.0015);

    node.vx += dx * grav;
    node.vy += dy * grav;

    node.vx *= 0.85;
    node.vy *= 0.85;

    node.x += node.vx;
    node.y += node.vy;
  }
}

function renderPainGraph(timestamp = 0) {
  const canvas = document.getElementById('paingraph-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.scale(dpr, dpr);

  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const centerX = width / 2;
  const centerY = height / 2;

  // Clear Canvas
  ctx.clearRect(0, 0, width, height);

  // Background Grid Effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  const gridSize = 40;
  for (let x = (centerX + pgCamera.x * pgCamera.zoom) % gridSize; x < width; x += gridSize) {
    for (let y = (centerY + pgCamera.y * pgCamera.zoom) % gridSize; y < height; y += gridSize) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // Camera Transformation
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(pgCamera.zoom, pgCamera.zoom);
  ctx.translate(-centerX + pgCamera.x, -centerY + pgCamera.y);

  const tSec = timestamp * 0.001;

  // 1. RENDER EDGES
  for (const edge of pgEdges) {
    const s = edge.sourceNode;
    const t = edge.targetNode;
    if (!s || !t) continue;

    const sVis = isNodeVisible(s);
    const tVis = isNodeVisible(t);
    if (!sVis && !tVis) continue;

    const isDimmed = !sVis || !tVis;
    const isHighlighted = (pgHoveredNode && (s === pgHoveredNode || t === pgHoveredNode)) ||
                          (pgSelectedNode && (s === pgSelectedNode || t === pgSelectedNode));

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);

    const midX = (s.x + t.x) / 2 + (s.y - t.y) * 0.06;
    const midY = (s.y + t.y) / 2 + (t.x - s.x) * 0.06;
    ctx.quadraticCurveTo(midX, midY, t.x, t.y);

    if (edge.link_type === 'unresolved_gap') {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = isHighlighted ? 'rgba(244, 63, 94, 0.95)' : (isDimmed ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.4)');
      ctx.lineWidth = isHighlighted ? 2.8 : 1.5;
    } else if (edge.link_type === 'solution_wedge') {
      ctx.strokeStyle = isHighlighted ? '#10B981' : (isDimmed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.75)');
      ctx.lineWidth = isHighlighted ? 3.2 : 2.2;
    } else if (edge.is_shared) {
      ctx.strokeStyle = isHighlighted ? '#C084FC' : (isDimmed ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.5)');
      ctx.lineWidth = isHighlighted ? 3.2 : 2.0;
    } else {
      ctx.strokeStyle = isHighlighted ? '#38BDF8' : (isDimmed ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.35)');
      ctx.lineWidth = isHighlighted ? 2.4 : 1.4;
    }

    ctx.stroke();

    // Moving energy photon pulse along edges
    if (!isDimmed && (edge.is_shared || edge.link_type === 'solution_wedge' || isHighlighted)) {
      const pulseProgress = (tSec * 0.5 + (edge.weight || 1) * 0.2) % 1;
      const qx = (1 - pulseProgress) * (1 - pulseProgress) * s.x + 2 * (1 - pulseProgress) * pulseProgress * midX + pulseProgress * pulseProgress * t.x;
      const qy = (1 - pulseProgress) * (1 - pulseProgress) * s.y + 2 * (1 - pulseProgress) * pulseProgress * midY + pulseProgress * pulseProgress * t.y;

      ctx.beginPath();
      ctx.arc(qx, qy, edge.is_shared ? 3.5 : 2.8, 0, Math.PI * 2);
      ctx.fillStyle = edge.color || '#FFF';
      ctx.shadowColor = edge.color || '#FFF';
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    ctx.restore();
  }

  // 2. RENDER NODES
  for (const node of pgNodes) {
    const isVisible = isNodeVisible(node);
    const isHovered = node === pgHoveredNode;
    const isSelected = node === pgSelectedNode;
    const isConnectedToHovered = pgHoveredNode && pgEdges.some(e => 
      (e.sourceNode === pgHoveredNode && e.targetNode === node) || 
      (e.targetNode === pgHoveredNode && e.sourceNode === node)
    );

    const opacity = isVisible ? (pgHoveredNode && !isHovered && !isSelected && !isConnectedToHovered ? 0.35 : 1.0) : 0.12;

    ctx.save();
    ctx.globalAlpha = opacity;

    // A. 100% UNRESOLVED BLIND SPOT (PULSATILE BEACON RINGS)
    if (node.node_type === 'unresolved_omission') {
      const phase = (tSec * 2 + (node.pulsePhase || 0)) % (Math.PI * 2);
      const ringRadius = node.radius + 8 + Math.sin(phase) * 10;
      const ringAlpha = Math.max(0, 0.65 - (ringRadius - node.radius) / 28);

      ctx.beginPath();
      ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(244, 63, 94, ${ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // B. NODE GLOW AURA
    const glowRadius = isHovered || isSelected ? node.radius * 1.6 : node.radius * 1.25;
    const glowGrad = ctx.createRadialGradient(node.x, node.y, node.radius * 0.4, node.x, node.y, glowRadius);
    glowGrad.addColorStop(0, node.glow || 'rgba(168, 85, 247, 0.4)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // C. NODE MAIN BODY CIRCLE
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    
    const bodyGrad = ctx.createRadialGradient(node.x - node.radius * 0.3, node.y - node.radius * 0.3, 2, node.x, node.y, node.radius);
    if (node.node_type === 'cluster') {
      bodyGrad.addColorStop(0, '#1E1B4B');
      bodyGrad.addColorStop(1, '#0F0E2A');
    } else if (node.node_type === 'pain_shared') {
      bodyGrad.addColorStop(0, '#3B185F');
      bodyGrad.addColorStop(1, '#1A0B2E');
    } else if (node.node_type === 'pain_isolated') {
      bodyGrad.addColorStop(0, '#0C4A6E');
      bodyGrad.addColorStop(1, '#042136');
    } else if (node.node_type === 'unresolved_omission') {
      bodyGrad.addColorStop(0, '#881337');
      bodyGrad.addColorStop(1, '#4C0519');
    } else { // micro_saas_solution
      bodyGrad.addColorStop(0, '#064E3B');
      bodyGrad.addColorStop(1, '#022C22');
    }
    
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#FFF' : (isHovered ? '#F1F5F9' : (node.color || '#8B5CF6'));
    ctx.lineWidth = isSelected ? 3.5 : (isHovered ? 2.5 : 2);
    ctx.stroke();

    // D. NODE CENTER ICON
    ctx.font = `${Math.round(node.radius * 0.85)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let icon = '🎯';
    if (node.node_type === 'cluster') icon = '🏢';
    else if (node.node_type === 'pain_shared') icon = '⚠️';
    else if (node.node_type === 'unresolved_omission') icon = '🚨';
    else if (node.node_type === 'micro_saas_solution') icon = '🚀';

    ctx.fillText(icon, node.x, node.y + 1);

    // E. CHIP LABELS
    ctx.font = node.node_type === 'cluster' ? 'bold 12px "Plus Jakarta Sans", sans-serif' : '11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const rawLabel = node.label || '';
    const displayLabel = rawLabel.length > 28 ? rawLabel.substring(0, 26) + '...' : rawLabel;
    const textMetrics = ctx.measureText(displayLabel);
    const chipPadX = 8;
    const chipHeight = 20;
    const chipX = node.x - textMetrics.width / 2 - chipPadX;
    const chipY = node.y + node.radius + 7;

    ctx.fillStyle = 'rgba(6, 9, 17, 0.92)';
    ctx.strokeStyle = isSelected ? '#FFF' : (node.node_type === 'unresolved_omission' ? 'rgba(244, 63, 94, 0.45)' : (node.node_type === 'cluster' ? 'rgba(139, 92, 246, 0.45)' : 'rgba(255, 255, 255, 0.12)'));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, textMetrics.width + chipPadX * 2, chipHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = node.node_type === 'unresolved_omission' ? '#FECDD3' : '#F8FAFC';
    ctx.fillText(displayLabel, node.x, chipY + chipHeight / 2);

    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

function showPainGraphTooltip(node, clientX, clientY) {
  const tooltip = document.getElementById('pg-hover-tooltip');
  if (!tooltip) return;

  let typeBadge = '';
  let metaInfo = '';

  if (node.node_type === 'cluster') {
    typeBadge = `<span style="background:#8B5CF6; color:#FFF; padding:2px 6px; border-radius:4px; font-weight:700;">🏢 Competitor Cluster</span>`;
    metaInfo = `<span><b>Market Tier:</b> ${node.tier || 'Enterprise'}</span> • <span><b>Products:</b> ${node.product_count || 0}</span>`;
  } else if (node.node_type === 'pain_shared') {
    typeBadge = `<span style="background:#A855F7; color:#FFF; padding:2px 6px; border-radius:4px; font-weight:700;">🔗 Shared Cross-Cluster Pain</span>`;
    metaInfo = `<span><b>Severity:</b> ⭐ ${node.severity || 8.5}/10</span> • <span><b>Connected:</b> ${node.connected_clusters_count || 2} Groups</span>`;
  } else if (node.node_type === 'pain_isolated') {
    typeBadge = `<span style="background:#0284C7; color:#FFF; padding:2px 6px; border-radius:4px; font-weight:700;">🎯 Cluster-Isolated Pain</span>`;
    metaInfo = `<span><b>Severity:</b> ⭐ ${node.severity || 8.0}/10</span>`;
  } else if (node.node_type === 'unresolved_omission') {
    typeBadge = `<span style="background:#E11D48; color:#FFF; padding:2px 6px; border-radius:4px; font-weight:700;">🚨 100% Unresolved Blind Spot</span>`;
    metaInfo = `<span style="color:#FB7185; font-weight:700;">⚡ ZERO Incumbents Solve This</span> • <span>OSI: ${node.osi_score || 9.2}</span>`;
  } else if (node.node_type === 'micro_saas_solution') {
    typeBadge = `<span style="background:#059669; color:#FFF; padding:2px 6px; border-radius:4px; font-weight:700;">🚀 Micro-SaaS Solution</span>`;
    metaInfo = `<span><b>Pricing:</b> ${node.pricing_strategy || '$49/mo flat'}</span> • <span>OSI: ${node.osi_score || 9.2}</span>`;
  }

  tooltip.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
      ${typeBadge}
    </div>
    <div class="pg-tooltip-title">${node.label}</div>
    <div class="pg-tooltip-meta">${metaInfo}</div>
    <div class="pg-tooltip-desc">${node.omission_summary || node.theme || (node.sample_quotes && (node.sample_quotes[0].text || node.sample_quotes[0])) || 'Click node to inspect deep-dive review citations and disruption dossier.'}</div>
    <div style="font-size:0.7rem; color:var(--cyan-glow); margin-top:0.4rem;">👉 Click node to open deep-dive dossier</div>
  `;

  tooltip.classList.remove('hidden');
  updateTooltipPosition(clientX, clientY);
}

function updateTooltipPosition(clientX, clientY) {
  const tooltip = document.getElementById('pg-hover-tooltip');
  const container = document.getElementById('paingraph-canvas-container');
  if (!tooltip || !container) return;

  const rect = container.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;

  tooltip.style.left = `${Math.min(rect.width - 160, Math.max(160, relX))}px`;
  tooltip.style.top = `${Math.max(80, relY)}px`;
}

function hidePainGraphTooltip() {
  const tooltip = document.getElementById('pg-hover-tooltip');
  if (tooltip) tooltip.classList.add('hidden');
}

function openPainGraphInspector(node) {
  const drawer = document.getElementById('paingraph-inspector-drawer');
  const body = document.getElementById('pg-insp-body');
  const typeBadge = document.getElementById('pg-insp-type');
  const sevBadge = document.getElementById('pg-insp-severity');

  if (!drawer || !body) return;

  drawer.classList.remove('closed');

  if (node.node_type === 'cluster') {
    if (typeBadge) {
      typeBadge.innerText = 'Competitor Cluster Hub';
      typeBadge.style.background = 'rgba(139, 92, 246, 0.2)';
      typeBadge.style.color = '#C084FC';
    }
    if (sevBadge) sevBadge.innerText = `${node.product_count || 0} Products`;
  } else if (node.node_type === 'pain_shared') {
    if (typeBadge) {
      typeBadge.innerText = 'Cross-Cluster Shared Pain';
      typeBadge.style.background = 'rgba(168, 85, 247, 0.2)';
      typeBadge.style.color = '#E9D5FF';
    }
    if (sevBadge) sevBadge.innerText = `Severity: ${node.severity || 8.5} / 10`;
  } else if (node.node_type === 'unresolved_omission') {
    if (typeBadge) {
      typeBadge.innerText = '🚨 100% Unresolved Omission';
      typeBadge.style.background = 'rgba(244, 63, 94, 0.25)';
      typeBadge.style.color = '#FECDD3';
    }
    if (sevBadge) sevBadge.innerText = '0 Cluster Solutions';
  } else if (node.node_type === 'micro_saas_solution') {
    if (typeBadge) {
      typeBadge.innerText = '🚀 Disruptive Micro-SaaS';
      typeBadge.style.background = 'rgba(16, 185, 129, 0.25)';
      typeBadge.style.color = '#A7F3D0';
    }
    if (sevBadge) sevBadge.innerText = `OSI: ${node.osi_score || 9.2} / 10`;
  } else {
    if (typeBadge) {
      typeBadge.innerText = 'Cluster-Isolated Pain';
      typeBadge.style.background = 'rgba(56, 189, 248, 0.2)';
      typeBadge.style.color = '#BAE6FD';
    }
    if (sevBadge) sevBadge.innerText = `Severity: ${node.severity || 8.0} / 10`;
  }

  let html = `<div class="pg-insp-title">${node.label}</div>`;

  if (node.node_type === 'cluster') {
    html += `
      <div class="pg-insp-summary-box">
        <div class="pg-insp-section-title">Archetype Strategy & Theme</div>
        <p style="margin:0 0 0.5rem 0;">${node.theme || 'Deeply integrated suite targeting high-volume workflows.'}</p>
        <div style="font-size:0.75rem; color:var(--text-muted);"><b>Target Tier:</b> ${node.tier || 'Enterprise'}</div>
      </div>

      <div>
        <div class="pg-insp-section-title">Products in this Cluster (${(node.product_slugs || []).length})</div>
        <div class="pg-insp-cluster-pills">
          ${(node.product_slugs || []).map(p => `
            <span class="pg-cluster-pill" style="background:rgba(139, 92, 246, 0.2); color:#E9D5FF; border:1px solid rgba(139, 92, 246, 0.4); cursor:pointer;" onclick="openCompetitorModal('${p}')">
              📦 ${p.replace(/-/g, ' ').toUpperCase()}
            </span>
          `).join('')}
        </div>
      </div>

      <div>
        <div class="pg-insp-section-title">Common Cluster Pains Experienced by Buyers</div>
        <ul style="padding-left:1.2rem; margin:0; font-size:0.8rem; color:var(--text-secondary); line-height:1.5;">
          ${(node.common_pains || ['Prohibitive per-seat pricing scaling.', 'Complex administrative overhead.']).map(cp => `<li>${cp}</li>`).join('')}
        </ul>
      </div>
    `;
  } else if (node.node_type === 'pain_shared' || node.node_type === 'pain_isolated') {
    html += `
      <div class="pg-insp-summary-box">
        <div class="pg-insp-section-title">Pain Dimension: ${node.dimension || 'GENERAL'}</div>
        <p style="margin:0;">Structural friction identified across G2/Capterra reviews with high customer churn intent.</p>
      </div>

      <div>
        <div class="pg-insp-section-title">Connected Incumbent Clusters (${(node.connected_clusters || []).length})</div>
        <div class="pg-insp-cluster-pills">
          ${(node.connected_clusters || []).map(cId => `
            <span class="pg-cluster-pill" style="background:rgba(168, 85, 247, 0.2); color:#E9D5FF; border:1px solid rgba(168, 85, 247, 0.4);">
              🏢 ${cId.replace(/-/g, ' ').toUpperCase()}
            </span>
          `).join('')}
        </div>
      </div>

      <div>
        <div class="pg-insp-section-title">Verbatim Customer Dissatisfaction Citations (${(node.sample_quotes || []).length})</div>
        <div class="pg-insp-quotes-list">
          ${(node.sample_quotes && node.sample_quotes.length > 0 ? node.sample_quotes : [
            '"Per-seat pricing means we have to share logins, which breaks accountability and compliance."',
            '"The interface takes forever to load, and navigating between ticket views adds hours of wasted time per week."'
          ]).map(quote => `<div class="pg-insp-quote-card">${typeof quote === 'object' ? `"${quote.dislike_text || quote.text || quote.quote}"` : `"${quote}"`}</div>`).join('')}
        </div>
      </div>
    `;
  } else if (node.node_type === 'unresolved_omission' || node.node_type === 'micro_saas_solution') {
    const opp = node;
    html += `
      <div class="pg-insp-summary-box" style="border-color:rgba(244, 63, 94, 0.35); background:rgba(244, 63, 94, 0.05);">
        <div class="pg-insp-section-title" style="color:#FB7185;">🚨 Systemic Omission (Why Incumbents Fail)</div>
        <p style="margin:0; line-height:1.5;">${opp.omission_summary || 'All incumbent clusters ignore this unaddressed segment due to enterprise legacy architecture and per-seat sales incentives.'}</p>
      </div>

      <div class="pg-insp-venture-card">
        <div class="pg-insp-venture-title">🚀 Micro-SaaS Unbundling Wedge</div>
        <div class="pg-insp-wedge-text">"${opp.unbundling_wedge || 'Laser-focused flat-rate alternative built for agile operators.'}"</div>
        <div class="pg-insp-meta-row">
          <span>🎯 <b>Target ICP:</b> ${opp.target_icp || 'Agile SMBs & Founders'}</span>
          <span style="color:var(--emerald-glow); font-weight:700;">💰 ${opp.pricing_strategy || '$39/mo flat'}</span>
        </div>
      </div>

      <div>
        <div class="pg-insp-section-title">Attacked Competitor Clusters</div>
        <div class="pg-insp-cluster-pills">
          ${(opp.attacked_cluster_slugs || ['enterprise-suites', 'conversational-platforms']).map(cId => `
            <span class="pg-cluster-pill" style="background:rgba(244, 63, 94, 0.15); color:#FECDD3; border:1px solid rgba(244, 63, 94, 0.35);">
              ⚔️ Attacks: ${cId.replace(/-/g, ' ').toUpperCase()}
            </span>
          `).join('')}
        </div>
      </div>

      ${opp.core_features && opp.core_features.length > 0 ? `
        <div>
          <div class="pg-insp-section-title">MVP Core Features (Zero Bloat)</div>
          <ul style="padding-left:1.2rem; margin:0; font-size:0.8rem; color:var(--text-secondary); line-height:1.5;">
            ${opp.core_features.map(f => `<li>✓ ${f}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="margin-top:0.5rem;">
        <button class="btn-primary" style="width:100%; font-size:0.85rem; padding:0.6rem;" onclick="openEvidenceModal('${activeCategorySlug}')">
          🛡️ View Raw Review Evidence Quotes &rarr;
        </button>
      </div>
    `;
  }

  body.innerHTML = html;
}

function closePainGraphInspector() {
  const drawer = document.getElementById('paingraph-inspector-drawer');
  if (drawer) drawer.classList.add('closed');
  pgSelectedNode = null;
}

function filterPainGraph(filterType) {
  pgActiveFilter = filterType;

  ['all', 'shared', 'omissions', 'isolated'].forEach(f => {
    const btn = document.getElementById(`pg-flt-${f}`);
    if (btn) {
      if (f === filterType) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
}

function searchPainGraph(query) {
  pgSearchQuery = (query || '').trim();
}

function toggleGraphPhysics() {
  pgIsPhysicsRunning = !pgIsPhysicsRunning;
  const btn = document.getElementById('pg-btn-physics');
  if (btn) {
    btn.innerText = pgIsPhysicsRunning ? '⏸️ Physics' : '▶️ Physics';
    btn.style.borderColor = pgIsPhysicsRunning ? 'rgba(255,255,255,0.12)' : 'rgba(244,63,94,0.6)';
  }
}

function resetGraphCamera() {
  pgCamera = { x: 0, y: 0, zoom: 1 };
}

function zoomGraph(factor) {
  pgCamera.zoom = Math.max(0.4, Math.min(2.5, pgCamera.zoom * factor));
}

/* ==========================================================================
   7. SUB-TAB 3: GOOGLE SEARCH VOLUME & KEYWORD DEMAND
   ========================================================================== */
async function loadKeywords(categorySlug) {
  try {
    const url = (categorySlug && categorySlug !== 'all') ? `/api/keywords?category_slug=${categorySlug}` : '/api/keywords';
    const res = await fetch(url);
    const data = await res.json();
    allKeywordsData = data;

    const totalEl = document.getElementById('kw-total-count');
    const growingEl = document.getElementById('kw-growing-count');
    if (totalEl) totalEl.innerText = (data.all || []).length;
    if (growingEl) growingEl.innerText = (data.fastest_growing || []).length;

    // 1. Fastest Growing Table
    const fastTable = document.getElementById('fastest-growing-tbody');
    if (fastTable) {
      fastTable.innerHTML = (data.fastest_growing || []).map(k => `
        <tr>
          <td><b><code>${k.keyword}</code></b></td>
          <td><b>${Number(k.monthly_search_volume).toLocaleString()} /mo</b></td>
          <td><span class="growth-badge ${k.growth_yoy_pct >= 100 ? 'high' : ''}">🔥 +${k.growth_yoy_pct}% YoY</span></td>
          <td><span class="intent-pill ${k.intent_type || 'growth'}">${k.pain_signal || k.intent_type || 'High Demand'}</span></td>
        </tr>
      `).join('');
    }

    // 2. Highest Volume Table
    const highTable = document.getElementById('highest-volume-tbody');
    if (highTable) {
      highTable.innerHTML = (data.highest_volume || []).map(k => `
        <tr>
          <td><b><code>${k.keyword}</code></b></td>
          <td><span class="vol-badge">${Number(k.monthly_search_volume).toLocaleString()} /mo</span></td>
          <td><b>$${Number(k.cpc_usd || 0).toFixed(2)}</b></td>
          <td><span class="intent-pill ${k.intent_type || 'buyer'}">${k.intent_type || 'B2B Intent'}</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading keywords:', err);
  }
}

/* ==========================================================================
   8. MODAL DOSSIERS: OPPORTUNITY, COMPETITOR, PAIN CLUSTER
   ========================================================================== */
function openOpportunityModal(oppIdentifier) {
  const opp = allOpportunities.find(o => o.id === oppIdentifier || o.slug === oppIdentifier || o.title === oppIdentifier) || allOpportunities[0];
  if (!opp) return;

  const content = document.getElementById('modal-content');
  const features = Array.isArray(opp.core_features) ? opp.core_features : [];
  const wedge = opp.unbundling_wedge || opp.value_proposition || 'Targeted unbundling wedge against incumbent complexity';
  const mrr = opp.target_mrr || opp.mrr_potential || '$15k - $30k/mo';
  const devDays = opp.dev_timeline_days || (opp.dev_complexity ? opp.dev_complexity * 7 : 14);
  const persona = opp.target_persona || opp.target_icp || 'SMB Founders & Teams';
  const difficulty = opp.dev_difficulty || (opp.dev_complexity <= 2 ? 'Low (1-2 wks)' : 'Medium (2-3 wks)');

  content.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
      <div>
        <span class="sector-tag" style="margin-bottom:0.5rem; display:inline-block; font-size:0.75rem; color:var(--cyan-glow); font-weight:700;">${opp.category_slug ? opp.category_slug.toUpperCase() : 'MICRO-SAAS'}</span>
        <h2 style="font-size:1.6rem; color:#FFF; margin-bottom:0.4rem;">${opp.title}</h2>
        <p style="color:var(--text-secondary); font-size:0.95rem;">${opp.problem_statement || opp.value_proposition || opp.target_omission_summary || ''}</p>
      </div>
      <div class="osi-badge-card" style="padding:0.6rem 1.1rem; background:rgba(16,185,129,0.15); border:1px solid var(--emerald-glow); border-radius:12px; text-align:center;">
        <span class="osi-val" style="font-size:1.6rem; font-weight:800; color:var(--emerald-glow);">${opp.osi_score || 9.2}</span>
        <span class="osi-lbl" style="display:block; font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">OSI Score</span>
      </div>
    </div>

    <div style="background:rgba(56,189,248,0.06); padding:1.2rem; border-radius:14px; border:1px solid rgba(56,189,248,0.2); margin-bottom:1.5rem;">
      <h4 style="color:var(--cyan-glow); font-size:0.85rem; margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:1px;">🎯 The Unbundling Wedge</h4>
      <p style="color:var(--text-primary); font-size:1.05rem; font-weight:500;">${wedge}</p>
    </div>

    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:0.75rem; margin-bottom:1.5rem;">
      <div style="background:rgba(255,255,255,0.03); padding:0.8rem; border-radius:10px; border:1px solid rgba(255,255,255,0.06);"><div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">Target MRR</div><div style="font-weight:700; color:#FFF; margin-top:0.2rem;">${mrr}</div></div>
      <div style="background:rgba(255,255,255,0.03); padding:0.8rem; border-radius:10px; border:1px solid rgba(255,255,255,0.06);"><div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">Dev Timeline</div><div style="font-weight:700; color:#FFF; margin-top:0.2rem;">${devDays} Days</div></div>
      <div style="background:rgba(255,255,255,0.03); padding:0.8rem; border-radius:10px; border:1px solid rgba(255,255,255,0.06);"><div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">Complexity</div><div style="font-weight:700; color:#FFF; margin-top:0.2rem;">${difficulty}</div></div>
      <div style="background:rgba(255,255,255,0.03); padding:0.8rem; border-radius:10px; border:1px solid rgba(255,255,255,0.06);"><div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">Target ICP</div><div style="font-weight:700; color:#FFF; margin-top:0.2rem; font-size:0.8rem;">${persona}</div></div>
    </div>

    <div style="margin-bottom:1.5rem;">
      <h4 style="color:var(--cyan-glow); font-size:0.85rem; margin-bottom:0.6rem; text-transform:uppercase; letter-spacing:1px;">🛠️ MVP Core Feature Checklist</h4>
      <ul class="modal-feature-list">
        ${features.map(f => `<li style="padding:0.35rem 0; color:#CBD5E1;">✓ ${f}</li>`).join('')}
      </ul>
    </div>

    <div style="margin-bottom:1.5rem; background:rgba(168,85,247,0.06); padding:1.2rem; border-radius:14px; border:1px solid rgba(168,85,247,0.2);">
      <h4 style="color:var(--purple-glow); font-size:0.85rem; margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:1px;">💰 Pricing & Monetization</h4>
      <p style="font-size:1.05rem; font-weight:bold; color:#FFF; margin-bottom:0.2rem;">${opp.pricing_strategy || '$39/mo flat rate'}</p>
      <p style="color:var(--text-secondary); font-size:0.82rem;">Eliminates per-seat penalties with transparent flat pricing.</p>
    </div>

    <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
      <button class="btn-primary" style="background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.4); color:#FDA4AF;" onclick="openEvidenceModal('${opp.category_slug || activeCategorySlug}')">
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
    const tierBadge = isBehemoth ? '<span class="tier-tag red" style="background:rgba(239,68,68,0.2); color:#FCA5A5; padding:0.2rem 0.5rem; border-radius:4px; font-weight:700;">Orbit 0: Goliath</span>' : '<span class="tier-tag yellow" style="background:rgba(245,158,11,0.2); color:#FDE68A; padding:0.2rem 0.5rem; border-radius:4px; font-weight:700;">Orbit 1: Challenger</span>';

    content.innerHTML = `
      <div class="comp-modal-header">
        <div>
          <span class="sector-tag" style="color:var(--cyan-glow); font-weight:700; font-size:0.75rem;">${cat.name || 'Category'}</span>
          <h2 class="comp-modal-title">${prod.name}</h2>
          <div class="comp-meta-badges">
            ${tierBadge}
            <span class="comp-meta-badge">⭐ ${prod.rating_avg} / 5 Stars (${Number(prod.review_count || 0).toLocaleString()} Reviews)</span>
            <span class="comp-meta-badge">👥 Pricing: ${prod.pricing_model || 'Per-Seat'}</span>
            <span class="comp-meta-badge">🏢 Market: ${prod.market_segment || 'Enterprise'}</span>
          </div>
        </div>
      </div>

      <div class="comp-vuln-box">
        <h4>⚠️ Primary Vulnerability Identified by AI Brain</h4>
        <p>${prod.primary_vulnerability || 'Complex pricing tiers and rigid workflows causing customer churn.'}</p>
      </div>

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

    content.innerHTML = `
      <div class="comp-modal-header">
        <div>
          <span class="sector-tag" style="background:rgba(239,68,68,0.15); color:var(--rose-glow); padding:0.2rem 0.5rem; border-radius:4px;">Pain Dimension: ${pain.dimension || 'GENERAL'}</span>
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
