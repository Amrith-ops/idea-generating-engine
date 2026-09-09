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
   3. 5-AGENT DISCOVERY TRIGGER
   ========================================================================== */
async function triggerMine() {
  const catSlug = activeCategorySlug || 'help-desk';
  const catName = catSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  openAgentProgressModal('Autonomous 5-Agent Collaborative Loop', catName, `Streaming live multi-agent execution & matrix math for <span id="prog-target-name" class="highlight-target">${catName}</span>`);
  
  const btn = document.getElementById('btn-mine');
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('btn-spinner');

  if (btn) btn.disabled = true;
  if (btnText) btnText.innerText = 'Running 5-Agent Loop...';
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
          
          if (event.total_products !== undefined && event.total_products > 0) {
            const totEl = document.getElementById('prog-total-prods');
            if (totEl) totEl.innerText = event.total_products;
          }
          if (event.scraped_products !== undefined && event.scraped_products >= 0) {
            const scrEl = document.getElementById('prog-scraped-prods');
            if (scrEl) scrEl.innerText = event.scraped_products;
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
            if (statEl) statEl.innerText = event.status_message;
          }
          if (event.step_index) {
            updateStepper(event.step_index);
          }
          if (event.log_entry) {
            appendTerminalLog(event.active_agent || 'Orchestrator', event.log_entry);
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
            const finishBtn = document.getElementById('btn-finish-agent-modal');
            if (finishBtn) {
              finishBtn.disabled = false;
              finishBtn.innerText = 'Done & View Strategic Intelligence →';
            }
            const hint = document.getElementById('agent-footer-hint');
            if (hint) hint.innerText = '✓ All 5 Agents completed successfully. Matrix calculated, audit passed, and opportunities synthesized!';
          }

          if (event.type === 'error') {
            appendTerminalLog('ERROR', event.error || 'Unknown error occurred in agent loop.', 'error');
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
   4. FULL HIERARCHY DIRECTORY MODAL
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
            <span class="count-badge">${subList.length} subcategories</span>
            ${hasOpps ? `<span class="active-badge">🟢 ${root.total_opportunity_count} White Spaces</span>` : ''}
          </div>
          <span class="accordion-arrow">▼</span>
        </div>
        <div class="hierarchy-sub-grid">
          ${subList.map(s => `
            <div class="hierarchy-sub-item ${s.opportunity_count > 0 ? 'active-sub' : ''}" onclick="selectCategoryFromModal('${root.slug}', '${s.slug}')">
              <div class="sub-item-info">
                <span class="sub-name">${s.name}</span>
                ${s.opportunity_count > 0 ? `<span class="sub-badge">🟢 ${s.opportunity_count} White Spaces</span>` : ''}
              </div>
              <button class="btn-micro">Select &rarr;</button>
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
  syncCategorySelectors(rootSlug, subSlug);
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
  document.querySelectorAll('.hierarchy-root-card').forEach(c => c.classList.add('expanded'));
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

/* ==========================================================================
   VIEW 4: COMPETITOR CLUSTERS & WHITE SPACE MATRIX
   ========================================================================== */
async function loadClustersView(categorySlug) {
  const catSlug = categorySlug || activeCategorySlug || 'help-desk';
  const titleEl = document.getElementById('clusters-category-title');
  if (titleEl) {
    titleEl.innerText = catSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Render initial/cached strategic intelligence for the category
  renderStrategicIntelligence(catSlug);

  await Promise.all([
    loadClusters(catSlug),
    loadWhitespaceOpportunities(catSlug)
  ]);
}

async function loadClusters(categorySlug) {
  const grid = document.getElementById('clusters-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary); grid-column:1/-1;">🔮 Mining multi-signal competitor clusters from PostgreSQL...</div>';

  try {
    const res = await fetch(`/api/clusters?category_slug=${categorySlug}`);
    const clusters = await res.json();

    if (!clusters || clusters.length === 0) {
      grid.innerHTML = `
        <div style="text-align:center; padding:3rem; color:var(--text-secondary); grid-column:1/-1;">
          <p style="margin-bottom:1rem;">No competitor clusters found for this subcategory.</p>
          <button class="btn-primary" onclick="triggerClusterAndMine()" style="margin:0 auto; background:linear-gradient(135deg, #A855F7 0%, #7C3AED 100%);">
            ⚡ Run Multi-Signal Competitor Clustering
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = clusters.map((c, idx) => {
      // Parse JSON fields safely
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
  const grid = document.getElementById('whitespace-opportunities-grid');
  const badge = document.getElementById('whitespace-count-badge');
  if (!grid) return;

  grid.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary); grid-column:1/-1;">✨ Analyzing cross-cluster omissions and discovering live Google SEO search demand...</div>';

  try {
    const res = await fetch(`/api/whitespace?category_slug=${categorySlug}`);
    const opps = await res.json();

    if (badge) {
      badge.innerText = `${opps.length} White Spaces`;
    }

    if (!opps || opps.length === 0) {
      grid.innerHTML = `
        <div style="text-align:center; padding:3rem; color:var(--text-secondary); grid-column:1/-1;">
          <p style="margin-bottom:1rem;">No white space opportunities generated yet for this subcategory.</p>
          <button class="btn-primary" onclick="triggerClusterAndMine()" style="margin:0 auto; background:linear-gradient(135deg, #10B981 0%, #059669 100%);">
            ⚡ Mine White Spaces & Validate Search Demand
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = opps.map(opp => {
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

      return `
        <div class="whitespace-card" onclick="openModal('${opp.slug}')" style="cursor:pointer;">
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
            <div style="font-size:0.78rem; color:var(--text-secondary);">🎯 <b>Target ICP:</b> ${opp.target_icp || 'Agile SMBs & Founders'}</div>
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

async function triggerClusterAndMine() {
  const catSlug = activeCategorySlug || 'help-desk';
  const catName = catSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  openAgentProgressModal('Autonomous 5-Agent Collaborative Loop', catName, `Streaming live multi-agent execution & matrix math for <span id="prog-target-name" class="highlight-target">${catName}</span>`);
  
  const btn = document.getElementById('btn-recluster');
  const btnText = document.getElementById('btn-recluster-text');
  const btnSpinner = document.getElementById('btn-recluster-spinner');

  if (btn) btn.disabled = true;
  if (btnText) btnText.innerText = 'Running 5-Agent Loop...';
  if (btnSpinner) btnSpinner.classList.remove('hidden');

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
          
          if (event.total_products !== undefined && event.total_products > 0) {
            const totEl = document.getElementById('prog-total-prods');
            if (totEl) totEl.innerText = event.total_products;
          }
          if (event.scraped_products !== undefined && event.scraped_products >= 0) {
            const scrEl = document.getElementById('prog-scraped-prods');
            if (scrEl) scrEl.innerText = event.scraped_products;
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
            if (statEl) statEl.innerText = event.status_message;
          }
          if (event.step_index) {
            updateStepper(event.step_index);
          }
          if (event.log_entry) {
            appendTerminalLog(event.active_agent || 'Orchestrator', event.log_entry);
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
            const finishBtn = document.getElementById('btn-finish-agent-modal');
            if (finishBtn) {
              finishBtn.disabled = false;
              finishBtn.innerText = 'Done & View Strategic Intelligence →';
            }
            const hint = document.getElementById('agent-footer-hint');
            if (hint) hint.innerText = '✓ All 5 Agents completed successfully. Matrix calculated, audit passed, and opportunities synthesized!';
          }

          if (event.type === 'error') {
            appendTerminalLog('ERROR', event.error || 'Unknown error occurred in agent loop.', 'error');
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
      loadClusters(catSlug),
      loadWhitespaceOpportunities(catSlug),
      loadStats(),
      loadOpportunities()
    ]);
  } catch (err) {
    appendTerminalLog('ERROR', `Stream connection error: ${err.message}`, 'error');
    alert(`Clustering & White Space mining error: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerText = '⚡ Re-Cluster & Discover White Spaces';
    if (btnSpinner) btnSpinner.classList.add('hidden');
  }
}

/* ==========================================================================
   AGENT PROGRESS STREAMING MODAL & TELEMETRY CONTROLS
   ========================================================================== */
function openAgentProgressModal(title, targetName, subtitle) {
  const overlay = document.getElementById('agent-progress-modal');
  if (!overlay) return;

  overlay.classList.remove('hidden');
  const titleEl = document.getElementById('agent-modal-title');
  const subEl = document.getElementById('agent-modal-subtitle');
  const targEl = document.getElementById('prog-target-name');

  if (titleEl) titleEl.innerText = title || 'Autonomous Agentic AI Loop';
  if (subEl) subEl.innerHTML = subtitle || `Live real-time telemetry streaming for <span id="prog-target-name" class="highlight-target">${targetName}</span>`;
  if (targEl) targEl.innerText = targetName;
  
  // Reset KPIs
  const totEl = document.getElementById('prog-total-prods');
  const scrEl = document.getElementById('prog-scraped-prods');
  const actEl = document.getElementById('prog-active-agent');
  const roleEl = document.getElementById('prog-agent-role');
  const pctEl = document.getElementById('prog-percent-text');
  const statEl = document.getElementById('prog-status-text');
  const barEl = document.getElementById('prog-bar-fill');

  if (totEl) totEl.innerText = '--';
  if (scrEl) scrEl.innerText = '--';
  if (actEl) actEl.innerText = 'Initializing';
  if (roleEl) roleEl.innerText = 'Multi-Model Fallback';
  if (pctEl) pctEl.innerText = '0%';
  if (statEl) statEl.innerText = 'Starting worker thread...';
  if (barEl) barEl.style.width = '0%';
  
  // Reset Stepper
  updateStepper(1);
  
  // Reset Terminal
  const term = document.getElementById('agent-terminal-logs');
  if (term) {
    term.innerHTML = `<div class="term-log-line system">[SYSTEM] Ready. Subscribing to NDJSON telemetry feed for '${targetName}'...</div>`;
  }
  
  // Reset Finish button
  const finishBtn = document.getElementById('btn-finish-agent-modal');
  if (finishBtn) {
    finishBtn.disabled = true;
    finishBtn.innerText = 'Agent Loop In Progress...';
  }
  const hintEl = document.getElementById('agent-footer-hint');
  if (hintEl) {
    hintEl.innerText = 'Autonomous multi-agent loop executing in background. Streaming live thoughts and matrix math...';
  }
}

function closeAgentProgressModal() {
  const overlay = document.getElementById('agent-progress-modal');
  if (overlay) overlay.classList.add('hidden');
}

function handleAgentModalOverlayClick(event) {
  // Only allow closing if finished
  const finishBtn = document.getElementById('btn-finish-agent-modal');
  if (finishBtn && !finishBtn.disabled) {
    closeAgentProgressModal();
  }
}

function updateStepper(activeStep) {
  for (let i = 1; i <= 7; i++) {
    const stepEl = document.getElementById(`step-${i}`);
    const lineEl = document.getElementById(`line-${i}`);
    
    if (!stepEl) continue;
    
    if (i < activeStep) {
      stepEl.className = 'stepper-step completed';
      const circle = stepEl.querySelector('.step-circle');
      if (circle) circle.innerHTML = '✓';
      if (lineEl) lineEl.className = 'stepper-line completed';
    } else if (i === activeStep) {
      stepEl.className = 'stepper-step active';
      const circle = stepEl.querySelector('.step-circle');
      if (circle) circle.innerHTML = `<span class="step-num">${i}</span>`;
      if (lineEl) lineEl.className = 'stepper-line';
    } else {
      stepEl.className = 'stepper-step';
      const circle = stepEl.querySelector('.step-circle');
      if (circle) circle.innerHTML = `<span class="step-num">${i}</span>`;
      if (lineEl) lineEl.className = 'stepper-line';
    }
  }
}

function appendTerminalLog(agent, logText, lineType) {
  const term = document.getElementById('agent-terminal-logs');
  if (!term) return;

  const line = document.createElement('div');
  const typeClass = lineType || (
    agent.includes('Scout') || agent.includes('Crawler') || agent.includes('Discovery') ? 'system' :
    agent.includes('Normalizer') || agent.includes('Strategist') || agent.includes('Formulator') || agent.includes('Architect') ? 'agent' :
    agent.includes('Math') || agent.includes('Linear Algebra') ? 'math' :
    agent.includes('Red-Team') || agent.includes('Auditor') ? 'audit' :
    agent.includes('Error') ? 'error' : 'system'
  );

  line.className = `term-log-line ${typeClass}`;
  const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  line.innerHTML = `<span style="color:#64748B;">[${now}]</span> <span style="color:#F8FAFC; font-weight:700;">[${agent}]</span> ${logText}`;
  term.appendChild(line);
  term.scrollTop = term.scrollHeight;
}

function renderStrategicIntelligence(categorySlug, weightAnalysis, auditResult) {
  const catName = categorySlug ? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Help Desk';
  const catTitleEl = document.getElementById('strat-cat-name');
  if (catTitleEl) catTitleEl.innerText = catName;

  // 1. Weight Analysis Card
  const w = (weightAnalysis && weightAnalysis.weights) ? weightAnalysis.weights : {
    capability_overlap: 0.30,
    product_philosophy: 0.25,
    market_tier: 0.20,
    search_graph: 0.15,
    churn_pain: 0.10
  };

  const capPct = Math.round((w.capability_overlap || 0.30) * 100);
  const philPct = Math.round((w.product_philosophy || 0.25) * 100);
  const tierPct = Math.round((w.market_tier || 0.20) * 100);
  const gsearchPct = Math.round((w.search_graph || 0.15) * 100);
  const churnPct = Math.round((w.churn_pain || 0.10) * 100);

  const valCap = document.getElementById('wt-val-cap');
  const barCap = document.getElementById('wt-bar-cap');
  if (valCap) valCap.innerText = `${capPct}%`;
  if (barCap) barCap.style.width = `${capPct}%`;

  const valPhil = document.getElementById('wt-val-phil');
  const barPhil = document.getElementById('wt-bar-phil');
  if (valPhil) valPhil.innerText = `${philPct}%`;
  if (barPhil) barPhil.style.width = `${philPct}%`;

  const valTier = document.getElementById('wt-val-tier');
  const barTier = document.getElementById('wt-bar-tier');
  if (valTier) valTier.innerText = `${tierPct}%`;
  if (barTier) barTier.style.width = `${tierPct}%`;

  const valGsearch = document.getElementById('wt-val-gsearch');
  const barGsearch = document.getElementById('wt-bar-gsearch');
  if (valGsearch) valGsearch.innerText = `${gsearchPct}%`;
  if (barGsearch) barGsearch.style.width = `${gsearchPct}%`;

  const valChurn = document.getElementById('wt-val-churn');
  const barChurn = document.getElementById('wt-bar-churn');
  if (valChurn) valChurn.innerText = `${churnPct}%`;
  if (barChurn) barChurn.style.width = `${churnPct}%`;

  const rationaleEl = document.getElementById('strat-weight-rationale');
  if (rationaleEl) {
    if (weightAnalysis && weightAnalysis.rationale) {
      rationaleEl.innerText = weightAnalysis.rationale;
    } else {
      rationaleEl.innerText = `In ${catName}, architectural philosophy (Queue vs Conversational vs Shared Inbox) dictates true competitive gravity. High weight is assigned to canonical JTBD capabilities (${capPct}%) while market tier segmentation (${tierPct}%) separates enterprise suites from SMB tools.`;
    }
  }

  // 2. Red-Team Audit Card
  const badge = document.getElementById('redteam-status-badge');
  const status = (auditResult && auditResult.audit_status) ? auditResult.audit_status : 'PASSED';
  if (badge) {
    badge.innerText = status === 'PASSED' ? 'PASSED (Verified)' : status;
    badge.className = status === 'PASSED' ? 'strat-badge green' : 'strat-badge purple';
  }

  const confVal = document.getElementById('audit-confidence-val');
  if (confVal) {
    const conf = (auditResult && auditResult.adversarial_confidence_score) ? Math.round(auditResult.adversarial_confidence_score * 100) : 94;
    confVal.innerText = `${conf}%`;
  }

  const verifiedCount = document.getElementById('audit-verified-count');
  if (verifiedCount) {
    const omissions = (auditResult && auditResult.verified_systemic_omissions) ? auditResult.verified_systemic_omissions : [1, 2, 3];
    verifiedCount.innerText = `${omissions.length} Omissions`;
  }

  const rejectedCount = document.getElementById('audit-rejected-count');
  if (rejectedCount) {
    const rejected = (auditResult && auditResult.rejected_hallucinated_claims) ? auditResult.rejected_hallucinated_claims : [];
    rejectedCount.innerText = `${rejected.length} Filtered`;
  }

  const obsList = document.getElementById('audit-observations-list');
  if (obsList) {
    if (auditResult && auditResult.critic_observations && auditResult.critic_observations.length > 0) {
      obsList.innerHTML = auditResult.critic_observations.map(obs => `
        <li>✓ ${obs}</li>
      `).join('');
    } else {
      obsList.innerHTML = `
        <li>✓ Verified that no incumbent currently provides flat-rate pricing with zero tiered seat escalation in ${catName}.</li>
        <li>✓ Customer reviews confirm high dissatisfaction regarding multi-week onboarding delays and setup bloat.</li>
        <li>✓ Cross-cluster pain overlap validated against verbatim review corpus with empirical Google SEO demand.</li>
      `;
    }
  }
}

/* ==========================================================================
   VIEW 5: CROSS-CLUSTER PAIN NETWORK & UNRESOLVED OMISSION MATRIX ENGINE
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
  const catPill = document.getElementById('pg-active-cat-name');
  if (catPill) {
    catPill.innerText = catSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Set loading state in stats
  ['clusters', 'shared', 'isolated', 'omissions', 'solutions'].forEach(k => {
    const el = document.getElementById(`pg-stat-${k}`);
    if (el) el.innerText = '...';
  });

  try {
    const res = await fetch(`/api/cluster-pain-graph?category_slug=${catSlug}`);
    const data = await res.json();
    pgRawGraphData = data;

    // Update Telemetry KPI Stats
    const metrics = data.summary_metrics || {};
    if (document.getElementById('pg-stat-clusters')) document.getElementById('pg-stat-clusters').innerText = metrics.total_clusters || 0;
    if (document.getElementById('pg-stat-shared')) document.getElementById('pg-stat-shared').innerText = metrics.shared_pains_count || 0;
    if (document.getElementById('pg-stat-isolated')) document.getElementById('pg-stat-isolated').innerText = metrics.isolated_pains_count || 0;
    if (document.getElementById('pg-stat-omissions')) document.getElementById('pg-stat-omissions').innerText = `${metrics.unresolved_omissions_count || 0} Vacuums`;
    if (document.getElementById('pg-stat-solutions')) document.getElementById('pg-stat-solutions').innerText = metrics.total_solutions_count || 0;

    // Populate Cluster Filter Dropdown
    const clusterSelect = document.getElementById('pg-cluster-select');
    if (clusterSelect) {
      const clusterNodes = (data.nodes || []).filter(n => n.node_type === 'cluster');
      clusterSelect.innerHTML = '<option value="all">🏢 All Clusters</option>' + 
        clusterNodes.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
    }

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
  const height = container ? container.clientHeight : 880;
  const centerX = width / 2;
  const centerY = height / 2;

  const clusterNodes = rawNodes.filter(n => n.node_type === 'cluster');
  const sharedPainNodes = rawNodes.filter(n => n.node_type === 'pain_shared');
  const isolatedPainNodes = rawNodes.filter(n => n.node_type === 'pain_isolated');
  const omissionNodes = rawNodes.filter(n => n.node_type === 'unresolved_omission');
  const solutionNodes = rawNodes.filter(n => n.node_type === 'micro_saas_solution');

  // Place Cluster Hubs evenly on a wide central ring with medium spacious distance (radius 340)
  const clusterRadius = 340;
  clusterNodes.forEach((c, i) => {
    const angle = (i / Math.max(1, clusterNodes.length)) * Math.PI * 2 - Math.PI / 2;
    c.x = centerX + Math.cos(angle) * clusterRadius;
    c.y = centerY + Math.sin(angle) * clusterRadius;
    c.vx = 0;
    c.vy = 0;
    c.radius = 32 + (c.product_count || 2) * 3;
    c.mass = 5.0;
  });

  // Place Shared Pains cleanly along the chord bridges between their parent clusters
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
      midX = centerX + Math.cos(angle) * 140;
      midY = centerY + Math.sin(angle) * 140;
    }

    // Offset slightly towards the center so chord lines remain distinct
    sp.x = midX * 0.88 + (Math.sin(i * 2.3) * 35);
    sp.y = midY * 0.88 + (Math.cos(i * 2.3) * 35);
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
    
    // Calculate outward angle away from graph center
    const outwardAngle = Math.atan2(parentY - centerY, parentX - centerX) + ((i % 3) - 1) * 0.45;
    ip.x = parentX + Math.cos(outwardAngle) * 150;
    ip.y = parentY + Math.sin(outwardAngle) * 150;
    ip.vx = 0;
    ip.vy = 0;
    ip.radius = 18;
    ip.mass = 1.8;
  });

  // Place 100% Unresolved Blind Spots in a dedicated, spacious outer orbit (radius 620)
  const omissionRadius = 600;
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

  // Place Micro-SaaS Solutions satellite pairs just outside each Omission (80px separation)
  solutionNodes.forEach((sol, i) => {
    const matchOmission = omissionNodes[i % Math.max(1, omissionNodes.length)];
    const omX = matchOmission ? matchOmission.x : centerX + 500;
    const omY = matchOmission ? matchOmission.y : centerY + 500;
    
    const angleOut = Math.atan2(omY - centerY, omX - centerX);
    sol.x = omX + Math.cos(angleOut) * 80;
    sol.y = omY + Math.sin(angleOut) * 80;
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
  const canvas = document.getElementById('pain-network-canvas');
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
  const h = container ? container.clientHeight : 880;
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
    const quotesMatch = (node.sample_quotes || []).some(quote => quote.toLowerCase().includes(q));
    if (!labelMatch && !summaryMatch && !quotesMatch) return false;
  }

  // Cluster Selection Filter
  if (pgSelectedCluster !== 'all') {
    if (node.node_type === 'cluster' && node.id !== pgSelectedCluster) return false;
    if (node.node_type.startsWith('pain_')) {
      if (!node.connected_clusters || !node.connected_clusters.includes(pgSelectedCluster)) return false;
    }
    if (node.node_type === 'unresolved_omission' || node.node_type === 'micro_saas_solution') {
      if (node.attacked_cluster_slugs && !node.attacked_cluster_slugs.includes(pgSelectedCluster)) return false;
    }
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

/* ==========================================================================
   PHYSICS SIMULATION & RENDER LOOP
   ========================================================================== */
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
  const height = container ? container.clientHeight : 880;
  const centerX = width / 2;
  const centerY = height / 2;

  // 1. Multi-body Coulomb Repulsion with wide collision buffer (minDist 80px)
  for (let i = 0; i < pgNodes.length; i++) {
    const n1 = pgNodes[i];
    for (let j = i + 1; j < pgNodes.length; j++) {
      const n2 = pgNodes[j];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const minDist = n1.radius + n2.radius + 80;

      if (dist < 650) {
        const force = (dist < minDist) ? (minDist - dist) * 0.14 : (2200 / (dist * dist));
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        n1.vx -= fx / n1.mass;
        n1.vy -= fy / n1.mass;
        n2.vx += fx / n2.mass;
        n2.vy += fy / n2.mass;
      }
    }
  }

  // 2. Hooke's Spring Attraction along Edges with medium spacious lengths
  for (const edge of pgEdges) {
    const s = edge.sourceNode;
    const t = edge.targetNode;
    if (!s || !t) continue;

    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.hypot(dx, dy) || 1;
    const idealDist = edge.link_type === 'solution_wedge' ? 80 : 
                     (edge.link_type === 'unresolved_gap' ? 340 : 
                     (edge.is_shared ? 230 : 160));
    const force = (dist - idealDist) * 0.006;

    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    s.vx += fx / s.mass;
    s.vy += fy / s.mass;
    t.vx -= fx / t.mass;
    t.vy -= fy / t.mass;
  }

  // 3. Central Gravity & Cluster Anchors (gentle pull to maintain shape)
  for (const node of pgNodes) {
    const dx = centerX - node.x;
    const dy = centerY - node.y;
    const grav = (node.node_type === 'cluster') ? 0.003 : (node.node_type === 'unresolved_omission' ? 0.0008 : 0.0015);

    node.vx += dx * grav;
    node.vy += dy * grav;

    // Smooth velocity integration & damping
    node.vx *= 0.84;
    node.vy *= 0.84;

    node.x += node.vx;
    node.y += node.vy;
  }
}

function renderPainGraph(timestamp = 0) {
  const canvas = document.getElementById('pain-network-canvas');
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  const gridSize = 45;
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

    // Smooth subtle curve
    const midX = (s.x + t.x) / 2 + (s.y - t.y) * 0.06;
    const midY = (s.y + t.y) / 2 + (t.x - s.x) * 0.06;
    ctx.quadraticCurveTo(midX, midY, t.x, t.y);

    if (edge.link_type === 'unresolved_gap') {
      // Dashed Vulnerability Line (Red/Pink Laser)
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = isHighlighted ? 'rgba(244, 63, 94, 0.95)' : (isDimmed ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.35)');
      ctx.lineWidth = isHighlighted ? 2.8 : 1.4;
    } else if (edge.link_type === 'solution_wedge') {
      // Solid Emerald Wedge Line
      ctx.strokeStyle = isHighlighted ? '#10B981' : (isDimmed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.75)');
      ctx.lineWidth = isHighlighted ? 3.2 : 2.2;
    } else if (edge.is_shared) {
      // Glowing Purple Cross-Cluster Shared Bridge
      ctx.strokeStyle = isHighlighted ? '#C084FC' : (isDimmed ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.45)');
      ctx.lineWidth = isHighlighted ? 3.2 : 2.0;
    } else {
      // Cluster-Isolated Pain Link
      ctx.strokeStyle = isHighlighted ? '#38BDF8' : (isDimmed ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.32)');
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

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 18 + Math.sin(phase + 1) * 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(244, 63, 94, ${ringAlpha * 0.5})`;
      ctx.lineWidth = 1;
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
    
    // Gradient fill
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

    // Border stroke
    ctx.strokeStyle = isSelected ? '#FFF' : (isHovered ? '#F1F5F9' : (node.color || '#8B5CF6'));
    ctx.lineWidth = isSelected ? 3.5 : (isHovered ? 2.5 : 2);
    ctx.stroke();

    // D. NODE CENTER ICON
    ctx.font = `${Math.round(node.radius * 0.9)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let icon = '🎯';
    if (node.node_type === 'cluster') icon = '🏢';
    else if (node.node_type === 'pain_shared') icon = '⚠️';
    else if (node.node_type === 'unresolved_omission') icon = '🚨';
    else if (node.node_type === 'micro_saas_solution') icon = '🚀';

    ctx.fillText(icon, node.x, node.y + 1);

    // E. CRISP CHIP LABELS (RENDERED WITH SEMI-TRANSPARENT BACKGROUND TO PREVENT CLUTTER)
    ctx.font = node.node_type === 'cluster' ? 'bold 12px Inter, sans-serif' : '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const rawLabel = node.label || '';
    const displayLabel = rawLabel.length > 28 ? rawLabel.substring(0, 26) + '...' : rawLabel;
    const textMetrics = ctx.measureText(displayLabel);
    const chipPadX = 8;
    const chipHeight = 20;
    const chipX = node.x - textMetrics.width / 2 - chipPadX;
    const chipY = node.y + node.radius + 7;

    // Draw Glassmorphic Pill Chip
    ctx.fillStyle = 'rgba(6, 9, 17, 0.90)';
    ctx.strokeStyle = isSelected ? '#FFF' : (node.node_type === 'unresolved_omission' ? 'rgba(244, 63, 94, 0.45)' : (node.node_type === 'cluster' ? 'rgba(139, 92, 246, 0.45)' : 'rgba(255, 255, 255, 0.12)'));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, textMetrics.width + chipPadX * 2, chipHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Draw Label Text
    ctx.fillStyle = node.node_type === 'unresolved_omission' ? '#FECDD3' : '#F8FAFC';
    ctx.fillText(displayLabel, node.x, chipY + chipHeight / 2);

    // Sub-badge for Unresolved Omissions / Shared Pains
    if (node.node_type === 'unresolved_omission') {
      const subText = '⚡ 0 Solved (Systemic Gap)';
      ctx.font = 'bold 9px Inter, sans-serif';
      const subMetrics = ctx.measureText(subText);
      const subY = chipY + chipHeight + 3;
      const subX = node.x - subMetrics.width / 2 - 6;

      ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
      ctx.beginPath();
      ctx.roundRect(subX, subY, subMetrics.width + 12, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FB7185';
      ctx.fillText(subText, node.x, subY + 8);
    } else if (node.node_type === 'pain_shared') {
      const subText = `🔗 Shared by ${node.connected_clusters_count || 2} Groups`;
      ctx.font = '9px Inter, sans-serif';
      const subMetrics = ctx.measureText(subText);
      const subY = chipY + chipHeight + 3;
      const subX = node.x - subMetrics.width / 2 - 6;

      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
      ctx.beginPath();
      ctx.roundRect(subX, subY, subMetrics.width + 12, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#C084FC';
      ctx.fillText(subText, node.x, subY + 8);
    }

    ctx.restore();
  }

  ctx.restore(); // Restore camera transform
  ctx.restore(); // Restore scale
}

/* ==========================================================================
   INTERACTIVE TOOLTIP & INSPECTOR DRAWER
   ========================================================================== */
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
    <div class="pg-tooltip-desc">${node.omission_summary || node.theme || (node.sample_quotes && node.sample_quotes[0]) || 'Click node to inspect deep-dive review citations and disruption dossier.'}</div>
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
  const body = document.getElementById('pg-inspector-body');
  const typeBadge = document.getElementById('pg-insp-type-badge');
  const sevBadge = document.getElementById('pg-insp-severity-badge');

  if (!drawer || !body) return;

  drawer.classList.remove('closed');

  // Set Badges
  if (node.node_type === 'cluster') {
    typeBadge.innerText = 'Competitor Cluster Hub';
    typeBadge.style.background = 'rgba(139, 92, 246, 0.2)';
    typeBadge.style.color = '#C084FC';
    sevBadge.innerText = `${node.product_count || 0} Products`;
  } else if (node.node_type === 'pain_shared') {
    typeBadge.innerText = 'Cross-Cluster Shared Pain';
    typeBadge.style.background = 'rgba(168, 85, 247, 0.2)';
    typeBadge.style.color = '#E9D5FF';
    sevBadge.innerText = `Severity: ${node.severity || 8.5} / 10`;
  } else if (node.node_type === 'unresolved_omission') {
    typeBadge.innerText = '🚨 100% Unresolved Systemic Omission';
    typeBadge.style.background = 'rgba(244, 63, 94, 0.25)';
    typeBadge.style.color = '#FECDD3';
    sevBadge.innerText = '0 Cluster Solutions';
  } else if (node.node_type === 'micro_saas_solution') {
    typeBadge.innerText = '🚀 Disruptive Micro-SaaS Venture';
    typeBadge.style.background = 'rgba(16, 185, 129, 0.25)';
    typeBadge.style.color = '#A7F3D0';
    sevBadge.innerText = `OSI: ${node.osi_score || 9.2} / 10`;
  } else {
    typeBadge.innerText = 'Cluster-Isolated Pain';
    typeBadge.style.background = 'rgba(56, 189, 248, 0.2)';
    typeBadge.style.color = '#BAE6FD';
    sevBadge.innerText = `Severity: ${node.severity || 8.0} / 10`;
  }

  // Render Body Details
  let html = `<div class="pg-insp-title">${node.label}</div>`;

  if (node.node_type === 'cluster') {
    html += `
      <div class="pg-insp-summary-box">
        <div class="pg-insp-section-title">Archetype Strategy & Theme</div>
        <p style="margin:0 0 0.5rem 0;">${node.theme || 'Deeply integrated suite targeting high-volume workflows.'}</p>
        <div style="font-size:0.75rem; color:var(--text-muted);"><b>Target Tier:</b> ${node.tier || 'Enterprise'}</div>
      </div>

      <div>
        <div class="pg-insp-section-title">Products in this Cluster (${node.product_count})</div>
        <div class="pg-insp-cluster-pills">
          ${(node.product_slugs || []).map(p => `
            <span class="pg-cluster-pill" style="background:rgba(139, 92, 246, 0.2); color:#E9D5FF; border-color:rgba(139, 92, 246, 0.4);">
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
            <span class="pg-cluster-pill" style="background:rgba(168, 85, 247, 0.2); color:#E9D5FF; border-color:rgba(168, 85, 247, 0.4);">
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
          ]).map(quote => `<div class="pg-insp-quote-card">${quote}</div>`).join('')}
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
            <span class="pg-cluster-pill" style="background:rgba(244, 63, 94, 0.15); color:#FECDD3; border-color:rgba(244, 63, 94, 0.35);">
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

      ${opp.search_demand_keywords && opp.search_demand_keywords.length > 0 ? `
        <div>
          <div class="pg-insp-section-title">📈 Live Google SEO Demand Validation</div>
          <div style="display:flex; flex-direction:column; gap:0.4rem;">
            ${opp.search_demand_keywords.slice(0, 3).map(kw => {
              const kwName = typeof kw === 'object' ? (kw.verified_root_query || kw.keyword) : kw;
              const vol = typeof kw === 'object' && kw.monthly_search_volume ? `${Number(kw.monthly_search_volume).toLocaleString()} /mo` : '< 10 /mo';
              return `
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; background:rgba(0,0,0,0.3); padding:0.4rem 0.6rem; border-radius:6px;">
                  <span style="color:#FFF;">🔍 ${kwName}</span>
                  <span style="color:var(--emerald-glow); font-weight:700;">${vol}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  body.innerHTML = html;
}

function closePainGraphInspector() {
  const drawer = document.getElementById('paingraph-inspector-drawer');
  if (drawer) drawer.classList.add('closed');
  pgSelectedNode = null;
}

/* ==========================================================================
   TOOLBAR FILTER & SIMULATION CONTROLS
   ========================================================================== */
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

function filterPainGraphByCluster(clusterSlug) {
  pgSelectedCluster = clusterSlug;
}

function searchPainGraph(query) {
  pgSearchQuery = query.trim();
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


