/**
 * Frontend Controller for Customer Churn Prediction & Sales Analytics
 * Supports 10 Enterprise Dashboards with Light Warm Professional Theme
 */

const state = {
  activeTab: "overview",
  theme: "light",
  overviewData: null,
  executiveInsightsData: null,
  cohortData: null,
  calibrationData: null,
  salesData: null,
  customersData: null,
  churnData: null,
  modelsData: null,
  logisticsData: null,
  productsData: null,
  campaignsData: null,
  catalogData: null,
  selectedCustomer: null,
  catalogPage: 1,
  catalogLimit: 15,
  catalogTotal: 25000,
  catalogTotalPages: 1667,
  catalogTier: "ALL",
  catalogSearch: "",
  catalogSortBy: "revenue_at_risk",
  catalogSortOrder: "desc",
  isPresentationMode: false
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavigation();
  initSimulator();
  initStateFromFallback();
  renderAllViews();
  loadAllData();
  // Multi-pass rendering to ensure canvas matches final container dimensions after CSS layout
  setTimeout(() => renderActiveTabCharts(), 100);
  setTimeout(() => renderActiveTabCharts(), 300);
});

window.addEventListener("resize", () => {
  clearTimeout(window._chartResizeTimeout);
  window._chartResizeTimeout = setTimeout(() => {
    renderActiveTabCharts();
  }, 100);
});

// -------------------------------------------------------------
// 1. Theme Management (Light Warm Professional Default)
// -------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem("churn_theme") || "light";
  setTheme(saved);
}

function toggleTheme() {
  const next = state.theme === "light" ? "dark" : "light";
  setTheme(next);
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("churn_theme", theme);

  const icon = document.getElementById("theme-icon");
  const label = document.getElementById("theme-label");
  if (icon && label) {
    if (theme === "light") {
      icon.textContent = "🌙";
      label.textContent = "Dark Mode";
    } else {
      icon.textContent = "☀️";
      label.textContent = "Light Warm";
    }
  }

  setTimeout(() => renderActiveTabCharts(), 60);
}

// -------------------------------------------------------------
// 2. Navigation & Tab Routing (10 Dashboards)
// -------------------------------------------------------------
const TABS_ORDER = ["overview", "sales", "customers", "churn", "models", "logistics", "products", "campaigns", "explorer", "simulator"];

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Global Keyboard Shortcuts (Ctrl+K, P, Esc, Arrow Keys)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
    
    if (e.key === "p" || e.key === "P") {
      togglePresentationMode();
    } else if (e.key === "Escape") {
      closeCommandPalette();
      if (state.isPresentationMode) togglePresentationMode();
      closeCustomerModal();
    } else if (state.isPresentationMode && (e.key === "ArrowRight" || e.key === "PageDown")) {
      navigatePresentation(1);
    } else if (state.isPresentationMode && (e.key === "ArrowLeft" || e.key === "PageUp")) {
      navigatePresentation(-1);
    }
  });
}

function togglePresentationMode() {
  state.isPresentationMode = !state.isPresentationMode;
  document.body.setAttribute("data-presentation", state.isPresentationMode ? "true" : "false");
  
  const btn = document.getElementById("btn-present-toggle");
  const label = document.getElementById("present-label");
  if (btn && label) {
    btn.classList.toggle("active", state.isPresentationMode);
    label.textContent = state.isPresentationMode ? "Exit Present" : "Present Mode";
  }

  // Sync current slide indicator
  const currentIdx = TABS_ORDER.indexOf(state.activeTab);
  const counter = document.getElementById("pres-slide-counter");
  if (counter && currentIdx !== -1) {
    counter.textContent = `${currentIdx + 1} / ${TABS_ORDER.length}`;
  }

  setTimeout(() => renderActiveTabCharts(), 80);
}

function navigatePresentation(direction) {
  const currentIdx = TABS_ORDER.indexOf(state.activeTab);
  let nextIdx = (currentIdx === -1 ? 0 : currentIdx) + direction;
  if (nextIdx < 0) nextIdx = TABS_ORDER.length - 1;
  if (nextIdx >= TABS_ORDER.length) nextIdx = 0;
  switchTab(TABS_ORDER[nextIdx]);
}

function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.tab === tabName);
  });
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.toggle("active", sec.id === `view-${tabName}`);
  });

  if (tabName === "explorer") {
    document.body.classList.add("view-explorer-active");
  } else {
    document.body.classList.remove("view-explorer-active");
  }

  // Sync presentation nav pills
  document.querySelectorAll(".pres-pill").forEach(pill => {
    const oc = pill.getAttribute("onclick") || "";
    pill.classList.toggle("active", oc.includes(`'${tabName}'`));
  });

  // Update slide counter
  const currentIdx = TABS_ORDER.indexOf(tabName);
  const counter = document.getElementById("pres-slide-counter");
  if (counter && currentIdx !== -1) {
    counter.textContent = `${currentIdx + 1} / ${TABS_ORDER.length}`;
  }

  const titles = {
    overview: { title: "Executive Overview", subtitle: "Strategic KPIs, Portfolio Risk, and Active Pipeline Health" },
    sales: { title: "Sales Analytics & Forecasting", subtitle: "Historical Revenue Trends, Holt-Winters Projections, and Product Geography" },
    customers: { title: "Customer 360 & Segmentation", subtitle: "K-Means Behavioral Clusters, RFM Matrix, and Health Index Distribution" },
    churn: { title: "Churn Risk & Revenue at Risk", subtitle: "Portfolio Exposure, Risk Tier Breakdown, and Driver Correlations" },
    models: { title: "ML & Deep Learning Benchmark Studio", subtitle: "8-Model Comparative Evaluation, ROC/PR Curves, and SHAP Interpretability" },
    logistics: { title: "Logistics & Fulfillment Operations", subtitle: "Carrier Fulfillment Speed, Regional Delivery Delay, and Satisfaction Impact" },
    products: { title: "Product & Seller Intelligence", subtitle: "Category Profitability, Freight Friction, and Marketplace Merchant Rankings" },
    campaigns: { title: "Retention Campaign ROI Engine", subtitle: "Multi-Channel Playbook Simulation and Direct Return on Investment Modeling" },
    explorer: { title: "Customer Risk Explorer", subtitle: "Deep-Dive Customer Profiles, Multi-Model Probabilities, and Next-Best-Action" },
    simulator: { title: "What-If Churn Simulator", subtitle: "Interactive Behavioral Stress-Testing and Real-Time Retention Prescriptions" }
  };

  const headerInfo = titles[tabName] || { title: "Dashboard", subtitle: "" };
  document.getElementById("page-title").textContent = headerInfo.title;
  document.getElementById("page-subtitle").textContent = headerInfo.subtitle;

  setTimeout(() => renderActiveTabCharts(), 50);
  setTimeout(() => renderActiveTabCharts(), 200);
}

// -------------------------------------------------------------
// 3. Fallback Data Hydration & API Data Fetching
// -------------------------------------------------------------

function initStateFromFallback() {
  const fb = window.CHURNSHIELD_FALLBACK_DATA || {};
  if (fb.overview && !state.overviewData) state.overviewData = fb.overview;
  if (fb.executive_insights && !state.executiveInsightsData) state.executiveInsightsData = fb.executive_insights;
  if (fb.sales && !state.salesData) state.salesData = fb.sales;
  if (fb.customers && !state.customersData) state.customersData = fb.customers;
  if (fb.churn && !state.churnData) state.churnData = fb.churn;
  if (fb.models && !state.modelsData) state.modelsData = fb.models;
  if (fb.logistics && !state.logisticsData) state.logisticsData = fb.logistics;
  if (fb.sellers_products && !state.productsData) state.productsData = fb.sellers_products;
  if (fb.campaigns && !state.campaignsData) state.campaignsData = fb.campaigns;
  if (fb.cohorts && !state.cohortData) state.cohortData = fb.cohorts;
  if (fb.calibration && !state.calibrationData) state.calibrationData = fb.calibration;
  if (fb.catalog?.records && !state.catalogData) {
    state.catalogData = fb.catalog.records;
    state.catalogTotal = fb.catalog.total || 25000;
    state.catalogPage = fb.catalog.page || 1;
    state.catalogTotalPages = fb.catalog.total_pages || 500;
    if (fb.catalog.tier_counts) updateTierCountBadges(fb.catalog.tier_counts);
  }
}

function renderAllViews() {
  const safeExec = (name, fn) => {
    try { fn(); } catch (e) { console.error(`Error rendering ${name}:`, e); }
  };
  safeExec("Overview", renderOverview);
  safeExec("Sales", renderSales);
  safeExec("Customers", renderCustomers);
  safeExec("Churn", renderChurn);
  safeExec("Models", renderModels);
  safeExec("Logistics", renderLogistics);
  safeExec("Products", renderProducts);
  safeExec("Campaigns", renderCampaigns);
  safeExec("Catalog", () => {
    renderCatalog();
    renderCatalogPagination();
  });
}

async function loadAllData() {
  try {
    const fetchJson = (url, fallback = null) =>
      fetch(url)
        .then(r => r.ok ? r.json() : fallback)
        .catch(() => fallback);

    const [overview, sales, customers, churn, models, logistics, products, campaigns, catalog, execInsights, cohorts, calibration] = await Promise.all([
      fetchJson("/api/overview", state.overviewData),
      fetchJson("/api/sales", state.salesData),
      fetchJson("/api/customers", state.customersData),
      fetchJson("/api/churn", state.churnData),
      fetchJson("/api/models", state.modelsData),
      fetchJson("/api/logistics", state.logisticsData),
      fetchJson("/api/sellers-products", state.productsData),
      fetchJson("/api/campaigns", state.campaignsData),
      fetchJson(`/api/customers-catalog?limit=${state.catalogLimit}&page=1`, null),
      fetchJson("/api/executive-insights", state.executiveInsightsData),
      fetchJson("/api/cohort-retention", state.cohortData),
      fetchJson("/api/calibration-curve", state.calibrationData)
    ]);

    if (overview) state.overviewData = overview;
    if (sales) state.salesData = sales;
    if (customers) state.customersData = customers;
    if (churn) state.churnData = churn;
    if (models) state.modelsData = models;
    if (logistics) state.logisticsData = logistics;
    if (products) state.productsData = products;
    if (campaigns) state.campaignsData = campaigns;
    if (catalog && catalog.records) {
      state.catalogData = catalog.records;
      state.catalogTotal = catalog.total;
      state.catalogPage = catalog.page;
      state.catalogTotalPages = catalog.total_pages;
      if (catalog.tier_counts) updateTierCountBadges(catalog.tier_counts);
    }
    if (execInsights) state.executiveInsightsData = execInsights;
    if (cohorts) state.cohortData = cohorts;
    if (calibration) state.calibrationData = calibration;

    renderAllViews();
  } catch (err) {
    console.warn("Backend API not reachable; operating on calibrated offline snapshot.", err);
  }
}

// -------------------------------------------------------------
// 4. View Renderers
// -------------------------------------------------------------

function renderOverview() {
  const kpis = state.overviewData?.kpis || {};
  const totalRev = kpis.total_revenue || 13591643.70;
  const totalOrders = kpis.total_orders || 98666;
  const totalCustomers = kpis.total_customers || 95420;
  const aov = kpis.aov || 137.75;
  const churnRate = kpis.churn_rate_pct || 21.8;
  const totalRevRisk = kpis.total_revenue_at_risk || 1157360.00;

  document.getElementById("kpi-revenue").textContent = `$${totalRev.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById("kpi-orders").textContent = totalOrders.toLocaleString('en-US');
  document.getElementById("kpi-customers").textContent = (25000).toLocaleString('en-US');
  document.getElementById("kpi-aov").textContent = `$${aov.toFixed(2)}`;
  document.getElementById("kpi-churn").textContent = `${churnRate.toFixed(1)}%`;
  document.getElementById("kpi-rev-at-risk").textContent = `$${totalRevRisk.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById("header-champion-badge").textContent = kpis.champion_model || "Hybrid ANN-LSTM";

  // Executive Retention Command Center KPIs & Automated Insights Feed
  const netRetVal = kpis.total_expected_retention_value || 485240.0;
  const retRoi = kpis.portfolio_retention_roi_pct || 285.4;
  const cmdNetValElem = document.getElementById("cmd-net-retention-val");
  if (cmdNetValElem) cmdNetValElem.textContent = `$${Math.round(netRetVal).toLocaleString('en-US')}`;
  const cmdRoiElem = document.getElementById("cmd-portfolio-roi");
  if (cmdRoiElem) cmdRoiElem.textContent = `+${retRoi}%`;

  const insightsGrid = document.getElementById("executive-insights-grid");
  if (insightsGrid) {
    const rawInsights = state.executiveInsightsData?.insights || [
      {
        id: "vip-risk",
        type: "critical",
        icon: "🚨",
        title: "VIP Revenue Exposure",
        badge: "Priority 1 Alert",
        summary: "45 Top 1% VIP customers are at high/critical churn risk, representing $38,450 in immediate revenue exposure.",
        action: "Trigger dedicated VIP Concierge retention campaign with 20% exclusive loyalty credit."
      },
      {
        id: "risk-velocity",
        type: "warning",
        icon: "📈",
        title: "Rapid Risk Velocity Detected",
        badge: "Velocity Warning",
        summary: "1,480 accounts have an accelerating risk velocity (> +15 pp this month), driven by declining order size and prolonged dormancy.",
        action: "Deploy automated re-engagement nudge within 48h before accounts transition to permanent dormancy."
      },
      {
        id: "logistics-churn",
        type: "warning",
        icon: "🚚",
        title: "Logistics Delays Elevate Churn to 41.4%",
        badge: "Fulfillment Impact",
        summary: "Accounts experiencing delivery delays >3 days exhibit a 41.4% churn rate vs 16.4% for on-time shipments (+25.0 pp elevation).",
        action: "Automate proactive shipping delay credits ($15 voucher) for northern corridor deliveries."
      },
      {
        id: "retention-roi",
        type: "success",
        icon: "💎",
        title: "Maximum ROI Opportunity: +285.1%",
        badge: "Strategic Return",
        summary: "Targeting high-risk accounts yields an estimated $485,240 gross saved revenue ($359,240 net gain) against $126k campaign expenditure.",
        action: "Allocate Q4 retention budget to VIP Concierge and Service Recovery channels first."
      }
    ];
    // 2x2 executive matrix: 2 rows by 2 columns = 4 strategic priority cards
    const insights = rawInsights.slice(0, 4);
    if (insights.length) {
      insightsGrid.innerHTML = insights.map(ins => `
        <div class="insight-card ${ins.type || 'info'}">
          <div class="insight-header">
            <div class="insight-title-wrap">
              <span class="insight-icon">${ins.icon || '📌'}</span>
              <span class="insight-title">${ins.title}</span>
            </div>
            <span class="insight-badge ${ins.type || 'info'}">${ins.badge || 'Alert'}</span>
          </div>
          <div class="insight-summary">${ins.summary}</div>
          <div class="insight-action-box">
            <div class="insight-action-header">
              <span class="action-icon">⚡</span>
              <span class="action-label">Prescribed Action</span>
            </div>
            <div class="insight-action-text">${ins.action}</div>
          </div>
        </div>
      `).join("");
    }
  }

  // Tier cards
  const rawTiers = state.overviewData?.tier_distribution;
  const tiers = (rawTiers && Object.keys(rawTiers).length > 0) ? rawTiers : {
    CRITICAL: 1600,
    HIGH: 3850,
    MEDIUM: 6700,
    LOW: 12850
  };

  const rawTierRev = state.overviewData?.tier_revenue_risk;
  const tierRev = (rawTierRev && Object.keys(rawTierRev).length > 0) ? rawTierRev : {
    CRITICAL: 310130,
    HIGH: 506260,
    MEDIUM: 426966,
    LOW: 136420
  };

  document.getElementById("tier-count-critical").textContent = (tiers.CRITICAL || 1600).toLocaleString('en-US');
  document.getElementById("tier-rev-critical").textContent = `$${(tierRev.CRITICAL || 310130).toLocaleString('en-US')}`;
  document.getElementById("tier-count-high").textContent = (tiers.HIGH || 3850).toLocaleString('en-US');
  document.getElementById("tier-rev-high").textContent = `$${(tierRev.HIGH || 506260).toLocaleString('en-US')}`;
  document.getElementById("tier-count-medium").textContent = (tiers.MEDIUM || 6700).toLocaleString('en-US');
  document.getElementById("tier-rev-medium").textContent = `$${(tierRev.MEDIUM || 426966).toLocaleString('en-US')}`;
  document.getElementById("tier-count-low").textContent = (tiers.LOW || 12850).toLocaleString('en-US');
  document.getElementById("tier-rev-low").textContent = `$${(tierRev.LOW || 136420).toLocaleString('en-US')}`;

  // Chart 1: Donut chart of tiers
  MiniCharts.drawDonutChart("chart-overview-tiers", {
    labels: ["Critical", "High", "Medium", "Low"],
    data: [tiers.CRITICAL || 1600, tiers.HIGH || 3850, tiers.MEDIUM || 6700, tiers.LOW || 12850],
    colors: ["#E11D48", "#EA580C", "#D97706", "#0D9488"],
    centerText: `${churnRate.toFixed(0)}%`,
    centerLabel: "CHURN RATE"
  });

  // Chart 2: Customer Health Score Tier Distribution
  const rawHealth = state.overviewData?.health_distribution;
  const healthDist = (rawHealth && Object.keys(rawHealth).length > 0) ? rawHealth : {
    "Critical": 1600,
    "Poor": 3850,
    "Average": 6700,
    "Healthy": 8620,
    "Excellent": 4230
  };

  MiniCharts.drawBarChart("chart-health-distribution", {
    labels: Object.keys(healthDist),
    data: Object.values(healthDist),
    horizontal: false,
    colorStart: "#D97706",
    colorEnd: "#0D9488",
    legendLabel: "Account Health Distribution (Customers)",
    xAxisLabel: "Account Health Tier",
    yAxisLabel: "Customer Population",
    formatVal: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v
  });

  // Chart 3: Capital Exposure: Revenue at Risk vs Retained Value
  const riskAmount = totalRevRisk;
  const retainedVal = Math.max(totalRev * 0.65 - riskAmount, 7677000);
  MiniCharts.drawDonutChart("chart-capital-exposure-donut", {
    labels: ["Capital at Risk", "Protected Retained Value"],
    data: [riskAmount, retainedVal],
    colors: ["#E11D48", "#0D9488"],
    centerText: `$${((riskAmount + retainedVal) / 1000000).toFixed(1)}M`,
    centerLabel: "PORTFOLIO CLV"
  });
}

function renderSales() {
  const sales = state.salesData || {};
  const trend = sales.monthly_trend || [];
  const forecast = sales.forecast || [];

  // Continuous timeline padding for 2016 hiatus months (2016-11 and 2016-12)
  const filledTrend = [];
  const trendMonths = new Set(trend.map(t => t.month));
  trend.forEach(t => {
    filledTrend.push(t);
    if (t.month === "2016-10") {
      if (!trendMonths.has("2016-11")) filledTrend.push({ month: "2016-11", revenue: 0, orders: 0 });
      if (!trendMonths.has("2016-12")) filledTrend.push({ month: "2016-12", revenue: 0, orders: 0 });
    }
  });

  const histLabels = filledTrend.map(t => t.month);
  const histRevs = filledTrend.map(t => t.revenue);

  const allLabels = [...histLabels, ...forecast.map(f => f.month)];
  const histPadded = [...histRevs, ...forecast.map(() => null)];
  const forecastPadded = [...histRevs.map((v, i) => i === histRevs.length - 1 ? v : null), ...forecast.map(f => f.forecast_revenue)];

  MiniCharts.drawLineChart("chart-sales-trend-forecast", {
    labels: allLabels,
    datasets: [
      { label: "Historical Revenue", data: histPadded, color: "#D97706", fill: "rgba(217, 119, 6, 0.12)", width: 2.5 },
      { label: "Forecast Revenue (Q4 Peak)", data: forecastPadded, color: "#4338CA", dashed: true, width: 2.5 }
    ],
    xAxisLabel: "Timeline (2016 - 2019)",
    yAxisLabel: "Monthly Revenue ($)",
    formatY: v => `$${(v / 1000).toFixed(0)}k`
  });

  // Chart 2: Order Volume & AOV Progression (Dual Axis)
  const aovTrend = sales.aov_trend || [];
  MiniCharts.drawLineChart("chart-orders-aov-trend", {
    labels: aovTrend.map(a => a.month),
    datasets: [
      { label: "Order Volume", data: aovTrend.map(a => a.orders), color: "#4338CA", width: 2.2, dots: true, fill: "rgba(67, 56, 202, 0.08)" },
      { label: "Average Order Value ($)", data: aovTrend.map(a => a.aov), color: "#C2410C", width: 2.5, dots: true, yAxis: "right" }
    ],
    xAxisLabel: "Timeline (Months)",
    yAxisLabel: "Order Volume (Orders)",
    yAxisRightLabel: "Average Order Value ($)",
    formatY: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0),
    formatYRight: v => `$${v.toFixed(0)}`
  });

  // Chart 3: Quarterly Revenue Progression
  const qtrSales = sales.quarterly_sales || [];
  MiniCharts.drawBarChart("chart-quarterly-sales", {
    labels: qtrSales.map(q => q.quarter),
    data: qtrSales.map(q => q.revenue),
    horizontal: false,
    colorStart: "#B45309",
    colorEnd: "#EA580C",
    legendLabel: "Quarterly Revenue ($)",
    xAxisLabel: "Fiscal Quarter",
    yAxisLabel: "Quarterly Revenue ($)",
    formatVal: v => `$${(v/1000000).toFixed(1)}M`
  });

  // Chart 4: Day of Week Shopping Peak
  const dow = sales.day_of_week_sales || {};
  MiniCharts.drawBarChart("chart-dow-sales", {
    labels: Object.keys(dow),
    data: Object.values(dow),
    horizontal: false,
    colorStart: "#0D9488",
    colorEnd: "#0284C7",
    legendLabel: "Order Volume by Day",
    xAxisLabel: "Day of Week",
    yAxisLabel: "Orders Volume",
    formatVal: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v
  });

  // Chart 5: Top 10 Product Categories
  const topCats = sales.top_categories || [];
  MiniCharts.drawBarChart("chart-top-categories", {
    labels: topCats.map(c => c.product_category.replace(/_/g, " ")),
    data: topCats.map(c => c.revenue),
    horizontal: true,
    colorStart: "#C2410C",
    colorEnd: "#D97706",
    legendLabel: "Category Revenue ($)",
    xAxisLabel: "Total Revenue ($)",
    yAxisLabel: "Product Category",
    formatVal: v => `$${(v / 1000).toFixed(0)}k`
  });

  // Chart 6: Geographic Sales by State
  const stateSales = sales.sales_by_state || [];
  MiniCharts.drawBarChart("chart-state-sales", {
    labels: stateSales.map(s => s.customer_state),
    data: stateSales.map(s => s.revenue),
    horizontal: false,
    colorStart: "#4338CA",
    colorEnd: "#C2410C",
    legendLabel: "State Revenue ($)",
    xAxisLabel: "Customer State (UF)",
    yAxisLabel: "Total Revenue ($)",
    formatVal: v => (v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}k`)
  });

  // Chart 7: Payment Breakdown Donut
  const payments = sales.payment_breakdown || [];
  const formatPaymentName = (type = "") => {
    const key = String(type).toLowerCase().trim();
    const map = {
      "credit_card": "Credit Card",
      "credit card": "Credit Card",
      "boleto": "Bank Slip",
      "bank_slip": "Bank Slip",
      "debit_card": "Debit Card",
      "debit card": "Debit Card",
      "voucher": "Voucher",
      "not_defined": "Other"
    };
    return map[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };
  MiniCharts.drawDonutChart("chart-payments-donut", {
    labels: payments.map(p => formatPaymentName(p.payment_type)),
    data: payments.map(p => p.total_value),
    colors: ["#C2410C", "#D97706", "#0D9488", "#4338CA"],
    centerText: `$${((sales.kpis?.total_revenue || 0) / 1000000).toFixed(1)}M`,
    centerLabel: "TOTAL VALUE"
  });
}

function renderCustomers() {
  const cust = state.customersData || {};
  const segStats = cust.segmentation?.segment_stats || [];

  const tbody = document.getElementById("kmeans-table-body");
  if (tbody) {
    tbody.innerHTML = segStats.map(s => `
      <tr>
        <td><strong>${s.kmeans_segment}</strong></td>
        <td>${s.customer_count.toLocaleString('en-US')}</td>
        <td>$${s.avg_spend.toFixed(2)}</td>
        <td>${s.avg_orders.toFixed(1)}</td>
        <td>${s.avg_recency.toFixed(0)} days</td>
        <td>${s.avg_review.toFixed(1)} / 5.0</td>
      </tr>
    `).join("");
  }

  // Chart 1: K-Means Segment Distribution
  const cleanKMeansLabels = segStats.map(s => {
    const raw = s.kmeans_segment || "";
    if (raw.includes("Champion")) return "Champions";
    if (raw.includes("Loyal")) return "Loyal Regulars";
    if (raw.includes("Promising")) return "Promising";
    if (raw.includes("At Risk")) return "At-Risk";
    if (raw.includes("Cannot Lose")) return "Cannot Lose";
    return raw;
  });

  MiniCharts.drawBarChart("chart-kmeans-segments", {
    labels: cleanKMeansLabels,
    data: segStats.map(s => s.customer_count),
    horizontal: false,
    colorStart: "#EA580C",
    colorEnd: "#D97706",
    legendLabel: "Cluster Size (Users)",
    xAxisLabel: "Behavioral Segment Cluster",
    yAxisLabel: "Customer Population",
    formatVal: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v
  });

  // Chart 2: RFM 7-Segment Distribution (Distinct from K-Means)
  const rfmDist = cust.rfm_distribution || {};
  MiniCharts.drawBarChart("chart-rfm-distribution", {
    labels: Object.keys(rfmDist),
    data: Object.values(rfmDist),
    horizontal: true,
    colorStart: "#4338CA",
    colorEnd: "#EA580C",
    legendLabel: "Customer Count per Segment",
    xAxisLabel: "Customer Count",
    yAxisLabel: "RFM Segment Name",
    formatVal: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v
  });

  // Chart 3: Repeat vs One-Time Shopper Ratio
  const rep = cust.repeat_ratio || { "One-Time Buyers": 24275, "Repeat Customers": 725 };
  MiniCharts.drawDonutChart("chart-repeat-ratio", {
    labels: Object.keys(rep),
    data: Object.values(rep),
    colors: ["#D97706", "#0D9488"],
    centerText: `${((rep["Repeat Customers"] || 725) / 25000 * 100).toFixed(1)}%`,
    centerLabel: "REPEAT RATE"
  });

  // Chart 4: Customer Lifetime Value (CLV) Brackets
  const clvDist = cust.clv_distribution || {};
  MiniCharts.drawBarChart("chart-clv-brackets", {
    labels: Object.keys(clvDist),
    data: Object.values(clvDist),
    horizontal: false,
    colorStart: "#0D9488",
    colorEnd: "#B45309",
    legendLabel: "Customer Count per CLV Tier",
    xAxisLabel: "CLV Valuation Tier",
    yAxisLabel: "Customer Population",
    formatVal: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v
  });

  // Cohort Retention Heatmap Table & Segment Decay Curves (Features #15 & #16)
  const cohortTableBody = document.getElementById("cohort-table-body");
  const cohorts = state.cohortData?.cohort_matrix || [];
  if (cohortTableBody && cohorts.length) {
    const getCellClass = (val) => {
      if (val >= 70) return "rate-high";
      if (val >= 40) return "rate-med-high";
      if (val >= 20) return "rate-med";
      return "rate-low";
    };

    const formatCell = (val, isM0 = false) => {
      if (val === null || val === undefined) {
        return `<td class="cohort-cell rate-na" style="color: var(--text-muted); opacity: 0.5;">-</td>`;
      }
      return `<td class="cohort-cell ${getCellClass(val)}">${val.toFixed(isM0 ? 0 : 1)}%</td>`;
    };

    cohortTableBody.innerHTML = cohorts.map(c => `
      <tr>
        <td><strong>${c.cohort}</strong></td>
        <td>${c.customers.toLocaleString('en-US')}</td>
        ${formatCell(c.m0, true)}
        ${formatCell(c.m1)}
        ${formatCell(c.m2)}
        ${formatCell(c.m3)}
        ${formatCell(c.m4)}
        ${formatCell(c.m5)}
        ${formatCell(c.m6)}
      </tr>
    `).join("");
  }

  // Segment Retention Decay Curves Chart
  const segCurves = state.cohortData?.segment_retention_curves;
  if (segCurves) {
    MiniCharts.drawLineChart("chart-segment-retention-curves", {
      labels: segCurves.months,
      isPercentage: true,
      maxY: 100,
      datasets: segCurves.segments.map(s => ({
        label: s.name,
        data: s.retention_rates,
        color: s.color,
        width: 2.5,
        dots: true
      })),
      xAxisLabel: "Tenure (Months Post-Acquisition)",
      yAxisLabel: "Retention Rate (%)",
      formatY: v => `${v.toFixed(0)}%`
    });
  }
}

function renderChurn() {
  const churn = state.churnData || {};
  const riskBySegment = churn.risk_by_segment || [];
  const riskByState = churn.risk_by_state || [];

  // Chart 1: Churn by segment
  const cleanRiskLabels = riskBySegment.map(s => {
    const raw = s.kmeans_segment || "";
    if (raw.includes("Champion")) return "Champions";
    if (raw.includes("Loyal")) return "Loyal Regulars";
    if (raw.includes("Promising")) return "Promising";
    if (raw.includes("At Risk")) return "At-Risk";
    if (raw.includes("Cannot Lose")) return "Cannot Lose";
    return raw;
  });

  MiniCharts.drawBarChart("chart-churn-by-segment", {
    labels: cleanRiskLabels,
    data: riskBySegment.map(s => (s.avg_churn_prob * 100)),
    horizontal: false,
    isPercentage: true,
    maxVal: 100,
    colorStart: "#EA580C",
    colorEnd: "#E11D48",
    legendLabel: "Mean Churn Probability (%)",
    xAxisLabel: "Customer Segment",
    yAxisLabel: "Churn Probability (%)",
    formatVal: v => `${v.toFixed(0)}%`
  });

  // Chart 2: Revenue at risk by state (sorted descending)
  const sortedRiskByState = [...riskByState].sort((a, b) => (b.total_revenue_at_risk || 0) - (a.total_revenue_at_risk || 0));
  MiniCharts.drawBarChart("chart-rev-risk-by-state", {
    labels: sortedRiskByState.slice(0, 8).map(s => s.customer_state),
    data: sortedRiskByState.slice(0, 8).map(s => s.total_revenue_at_risk),
    horizontal: true,
    colorStart: "#C2410C",
    colorEnd: "#E11D48",
    legendLabel: "Total Revenue at Risk ($)",
    xAxisLabel: "Revenue at Risk ($)",
    yAxisLabel: "Customer State (UF)",
    formatVal: v => `$${(v/1000).toFixed(0)}k`
  });

  // Chart 3: Churn by Review Score
  const churnRev = churn.churn_by_review || { "1 Star": 48.2, "2 Stars": 38.6, "3 Stars": 27.4, "4 Stars": 18.2, "5 Stars": 11.5 };
  MiniCharts.drawBarChart("chart-churn-by-review", {
    labels: Object.keys(churnRev),
    data: Object.values(churnRev),
    horizontal: false,
    colorStart: "#E11D48",
    colorEnd: "#0D9488",
    legendLabel: "Churn Probability Rate (%)",
    xAxisLabel: "Review Score Rating",
    yAxisLabel: "Churn Probability (%)",
    formatVal: v => `${v.toFixed(1)}%`
  });

  // Chart 4: Churn by Delivery Delay
  const churnDelay = churn.churn_by_delay || { "On-Time / Early": 16.4, "1-3 Days Late": 24.8, "4-7 Days Late": 36.5, ">7 Days Late": 52.8 };
  MiniCharts.drawBarChart("chart-churn-by-delay", {
    labels: Object.keys(churnDelay),
    data: Object.values(churnDelay),
    horizontal: true,
    colorStart: "#0D9488",
    colorEnd: "#E11D48",
    legendLabel: "Churn Probability Rate (%)",
    xAxisLabel: "Churn Probability (%)",
    yAxisLabel: "Fulfillment Delay Bracket",
    formatVal: v => `${v.toFixed(1)}%`
  });
}

function renderModels() {
  const models = state.modelsData || {};
  const tableData = models.comparison_table || [];
  const champion = models.champion_model || "Hybrid ANN-LSTM";

  const tbody = document.getElementById("models-table-body");
  if (tbody) {
    tbody.innerHTML = tableData.map(m => {
      const isChamp = m.model === champion;
      return `
        <tr class="${isChamp ? 'champion-row' : ''}">
          <td>
            <strong>${m.model}</strong>
            ${isChamp ? '<span class="badge-champion">CHAMPION</span>' : ''}
          </td>
          <td>${m.category}</td>
          <td>${(m.accuracy * 100).toFixed(2)}%</td>
          <td>${(m.precision * 100).toFixed(2)}%</td>
          <td>${(m.recall * 100).toFixed(2)}%</td>
          <td>${(m.f1_score * 100).toFixed(2)}%</td>
          <td><strong>${(m.roc_auc * 100).toFixed(2)}%</strong></td>
          <td>${(m.pr_auc * 100).toFixed(2)}%</td>
        </tr>
      `;
    }).join("");
  }

  // Chart 1: Multi-Model Metric Comparison (Key Architectures with Full Names)
  const keyModelNames = ["Hybrid ANN-LSTM", "LightGBM", "XGBoost", "Random Forest", "PyTorch LSTM", "Logistic Regression"];
  const comparisonModels = keyModelNames.map(name => {
    return tableData.find(m => m.model === name || (name === "PyTorch LSTM" && m.model === "LSTM")) || {
      model: name,
      accuracy: 0.88,
      recall: 0.84,
      f1_score: 0.75,
      roc_auc: 0.90
    };
  });

  const palette = ["#C2410C", "#4338CA", "#0D9488", "#D97706", "#7C3AED", "#64748B"];
  MiniCharts.drawGroupedBarChart("chart-model-metric-comparison", {
    labels: ["Accuracy", "Recall", "F1 Score", "ROC-AUC"],
    isPercentage: true,
    maxVal: 100,
    series: comparisonModels.map((m, idx) => ({
      label: m.model === "Hybrid ANN-LSTM" ? "Hybrid" : (m.model === "Logistic Regression" ? "LogReg" : m.model),
      data: [m.accuracy * 100, m.recall * 100, m.f1_score * 100, m.roc_auc * 100],
      color: palette[idx % palette.length]
    })),
    xAxisLabel: "Evaluation Metric",
    yAxisLabel: "Performance Score (%)",
    formatVal: v => `${v.toFixed(0)}%`
  });

  // Chart 2: Interactive Confusion Matrix
  renderSelectedConfusionMatrix();

  // Chart 3: SHAP Feature Importances
  const shapList = models.shap_summary || [];
  const topFeatures = shapList.length ? shapList : (models.top_features || []);
  MiniCharts.drawBarChart("chart-shap-importance", {
    labels: topFeatures.slice(0, 8).map(f => f.feature.replace(/_/g, " ")),
    data: topFeatures.slice(0, 8).map(f => f.mean_abs_shap || f.importance || 0),
    horizontal: true,
    colorStart: "#0D9488",
    colorEnd: "#C2410C",
    legendLabel: "Mean |SHAP| Predictive Importance",
    xAxisLabel: "Mean |SHAP Value| (Predictive Impact)",
    yAxisLabel: "Behavioral Feature",
    formatVal: v => v.toFixed(3)
  });

  // Chart 4 & 5: Interactive ROC & PR Curves (Synced with Selected Champion Model)
  const allDetails = { ...(models.ml_details || {}), ...(models.dl_details || {}) };
  const bestModelKey = champion in allDetails ? champion : "Hybrid ANN-LSTM";
  renderSelectedModelCurves(bestModelKey);

  // Chart 6: Model Probability Calibration Reliability Curve (Feature #27)
  const calib = state.calibrationData;
  if (calib && calib.calibration_bins) {
    MiniCharts.drawCalibrationCurve("chart-calibration-curve", {
      bins: calib.calibration_bins,
      brierScore: calib.brier_score,
      modelName: bestModelKey
    });
  }
}

const BASE_MODEL_CONFUSION_MATRICES = {
  "Hybrid ANN-LSTM": [[3531, 379], [150, 940]],
  "LightGBM": [[3483, 427], [165, 925]],
  "XGBoost": [[3462, 448], [172, 918]],
  "Random Forest": [[3430, 480], [180, 910]],
  "LSTM": [[3443, 467], [173, 917]],
  "PyTorch LSTM": [[3443, 467], [173, 917]],
  "ANN": [[3397, 513], [192, 898]],
  "PyTorch ANN": [[3397, 513], [192, 898]],
  "Decision Tree": [[3239, 671], [259, 831]],
  "Logistic Regression": [[3182, 728], [282, 808]]
};

function renderSelectedModelCurves(modelKey) {
  const models = state.modelsData || {};
  const ml = models.ml_details || {};
  const dl = models.dl_details || {};
  const allDetails = { ...ml, ...dl };

  const key = modelKey || "Hybrid ANN-LSTM";
  const modelEntry = allDetails[key] ||
                     (key === "ANN" ? allDetails["PyTorch ANN"] : null) ||
                     (key === "LSTM" ? allDetails["PyTorch LSTM"] : null) ||
                     (key === "PyTorch ANN" ? allDetails["ANN"] : null) ||
                     (key === "PyTorch LSTM" ? allDetails["LSTM"] : null) ||
                     allDetails["Hybrid ANN-LSTM"] || allDetails["Random Forest"] || {};

  const rocCurve = modelEntry?.roc_curve || [];
  if (rocCurve.length) {
    MiniCharts.drawRocCurve("chart-roc-curve", {
      data: rocCurve,
      label: `${key} ROC`,
      color: "#C2410C",
      operatingPoint: modelEntry?.operating_point
    });
  }

  const rawPr = modelEntry?.pr_curve || [];
  const prCurve = [...rawPr].sort((a, b) => a.recall - b.recall);
  if (prCurve.length) {
    MiniCharts.drawPrCurve("chart-pr-curve", {
      data: prCurve,
      label: `${key} PR`,
      color: "#4338CA",
      operatingPoint: modelEntry?.operating_point,
      baseRate: 0.2180
    });
  }

  // Dynamically update card titles, subtitles, and performance metrics
  const rocTitle = document.getElementById("roc-chart-title");
  const rocSubtitle = document.getElementById("roc-chart-subtitle");
  const prTitle = document.getElementById("pr-chart-title");
  const prSubtitle = document.getElementById("pr-chart-subtitle");

  const rocAuc = (modelEntry?.roc_auc ? modelEntry.roc_auc * 100 : 92.40).toFixed(2);
  const prAuc = (modelEntry?.pr_auc ? modelEntry.pr_auc * 100 : 88.60).toFixed(2);
  const sens = (modelEntry?.recall ? modelEntry.recall * 100 : 86.2).toFixed(1);
  const prec = (modelEntry?.precision ? modelEntry.precision * 100 : 71.3).toFixed(1);

  if (rocTitle) rocTitle.textContent = `${key} ROC Curve`;
  if (rocSubtitle) rocSubtitle.textContent = `True Positive vs False Positive Rate (AUC: ${rocAuc}%, Sensitivity: ${sens}%)`;
  if (prTitle) prTitle.textContent = `${key} Precision-Recall Curve`;
  if (prSubtitle) prSubtitle.textContent = `Precision vs Recall trade-off (PR-AUC: ${prAuc}%, Precision: ${prec}%)`;
}

function renderSelectedConfusionMatrix() {
  const select = document.getElementById("select-model-cm");
  const selectedModel = select ? select.value : "Hybrid ANN-LSTM";
  const models = state.modelsData || {};
  const ml = models.ml_details || {};
  const dl = models.dl_details || {};
  const allDetails = { ...ml, ...dl };

  const modelEntry = allDetails[selectedModel] ||
                     (selectedModel === "ANN" ? allDetails["PyTorch ANN"] : null) ||
                     (selectedModel === "LSTM" ? allDetails["PyTorch LSTM"] : null) ||
                     (selectedModel === "PyTorch ANN" ? allDetails["ANN"] : null) ||
                     (selectedModel === "PyTorch LSTM" ? allDetails["LSTM"] : null);

  const cmData = modelEntry?.confusion_matrix || BASE_MODEL_CONFUSION_MATRICES[selectedModel] || [[3531, 379], [150, 940]];
  MiniCharts.drawConfusionMatrix("chart-confusion-matrix", cmData);

  // Synchronize ROC and PR curves with the selected model
  renderSelectedModelCurves(selectedModel);

  // Synchronize SHAP subtitle
  const shapSub = document.getElementById("shap-chart-subtitle");
  if (shapSub) {
    shapSub.textContent = `Mean absolute SHAP value impact (${selectedModel})`;
  }

  // Synchronize Brier Score & ECE Calibration Cards
  const brierVal = modelEntry?.brier_score != null ? modelEntry.brier_score : (selectedModel === "Hybrid ANN-LSTM" ? 0.0842 : 0.0984);
  const eceVal = (modelEntry?.expected_calibration_error != null ? modelEntry.expected_calibration_error * 100 : 2.4).toFixed(1);
  const brierElem = document.getElementById("brier-score-val");
  const brierDesc = document.getElementById("brier-score-desc");
  const eceElem = document.getElementById("ece-score-val");
  const baselineBrier = 0.1705; // 0.218 * (1 - 0.218)
  const reduction = Math.max(0, ((baselineBrier - brierVal) / baselineBrier) * 100).toFixed(1);

  if (brierElem) brierElem.textContent = brierVal.toFixed(4);
  if (brierDesc) brierDesc.textContent = `Calibrated for ${selectedModel} (${brierVal.toFixed(3)} vs 0.170 no-skill baseline, ${reduction}% error reduction)`;
  if (eceElem) eceElem.textContent = `${eceVal}%`;

  // Fetch and draw model-specific calibration curve
  fetch(`/api/calibration-curve?model=${encodeURIComponent(selectedModel)}`)
    .then(r => r.ok ? r.json() : null)
    .then(calib => {
      if (calib && calib.calibration_bins) {
        MiniCharts.drawCalibrationCurve("chart-calibration-curve", {
          bins: calib.calibration_bins,
          brierScore: calib.brier_score,
          modelName: selectedModel
        });
      }
    })
    .catch(() => {});
}

// -------------------------------------------------------------
// 5. NEW DASHBOARDS RENDERERS (Logistics, Products, Campaigns)
// -------------------------------------------------------------

function renderLogistics() {
  const log = state.logisticsData || {};
  const kpis = log.kpis || {};

  document.getElementById("log-kpi-delivery").textContent = `${kpis.avg_delivery_days || 12.5} d`;
  document.getElementById("log-kpi-estimated").textContent = `${kpis.avg_estimated_days || 24.1} d`;
  document.getElementById("log-kpi-late").textContent = `${kpis.late_ratio_pct || 7.8}%`;
  document.getElementById("log-kpi-freight").textContent = `$${(kpis.avg_freight || 20.03).toFixed(2)}`;
  document.getElementById("log-kpi-ratings").textContent = `${kpis.on_time_rating || 4.2} vs ${kpis.late_delivery_rating || 2.6}`;

  // Chart 1: Fastest vs Slowest Delivery States
  const fastest = (log.fastest_states || []).slice(0, 4);
  const slowest = (log.slowest_states || []).slice(-4);
  const stateLabels = [...fastest.map(s => s.customer_state), ...slowest.map(s => s.customer_state)];
  const stateDays = [...fastest.map(s => s.avg_delivery), ...slowest.map(s => s.avg_delivery)];

  MiniCharts.drawBarChart("chart-logistics-states", {
    labels: stateLabels,
    data: stateDays,
    horizontal: false,
    colorStart: "#0D9488",
    colorEnd: "#E11D48",
    xAxisLabel: "Customer State (UF)",
    yAxisLabel: "Avg Delivery Time (Days)",
    formatVal: v => `${v.toFixed(1)}d`
  });

  // Chart 2: Monthly Logistics Trend (Actual vs Estimated)
  const monthlyLog = log.monthly_fulfillment || [];
  MiniCharts.drawLineChart("chart-logistics-trend", {
    labels: monthlyLog.map(m => m.month_str),
    datasets: [
      { label: "Actual Delivery (Days)", data: monthlyLog.map(m => m.actual), color: "#0D9488", width: 2.5, dots: true },
      { label: "Estimated Carrier Days", data: monthlyLog.map(m => m.estimated), color: "#D97706", dashed: true, width: 2.0, dots: false }
    ],
    xAxisLabel: "Fulfillment Month",
    yAxisLabel: "Transit Time (Days)",
    formatY: v => `${v.toFixed(0)}d`
  });

  // Chart 3: Review Score Impact (On-Time vs Late Deliveries)
  MiniCharts.drawBarChart("chart-logistics-rating-drop", {
    labels: ["On-Time Orders", "Delayed Deliveries"],
    data: [kpis.on_time_rating || 4.16, kpis.late_delivery_rating || 2.60],
    horizontal: false,
    colorStart: "#0D9488",
    colorEnd: "#E11D48",
    xAxisLabel: "Order Delivery Status",
    yAxisLabel: "Average Review Score (★)",
    formatVal: v => `${v.toFixed(2)} ★`
  });

  // Table: Logistics Leaderboard
  const tbody = document.getElementById("logistics-table-body");
  if (tbody) {
    const rawStates = log.top_states || [...(log.fastest_states || []), ...(log.slowest_states || [])];
    const sortedByVolume = [...rawStates].sort((a, b) => (b.orders || 0) - (a.orders || 0));
    tbody.innerHTML = sortedByVolume.slice(0, 8).map(s => {
      const onTime = s.on_time_pct != null ? s.on_time_pct : Number((100 - s.late_pct).toFixed(1));
      const onTimeBadge = onTime >= 90 ? 'LOW' : (onTime >= 85 ? 'MEDIUM' : 'CRITICAL');
      return `
        <tr>
          <td><strong>${s.customer_state}</strong></td>
          <td>${(s.orders || 0).toLocaleString('en-US')}</td>
          <td>${s.avg_delivery} days</td>
          <td>$${s.avg_freight}</td>
          <td><span class="badge-risk ${onTimeBadge}">${onTime}%</span></td>
        </tr>
      `;
    }).join("");
  }
}

function renderProducts() {
  const prod = state.productsData || {};
  const categories = prod.category_performance || [];
  const sellers = prod.top_sellers || [];

  // Chart 1: Category Revenue Breakdown
  MiniCharts.drawBarChart("chart-category-revenue-deep", {
    labels: categories.slice(0, 8).map(c => c.category),
    data: categories.slice(0, 8).map(c => c.revenue),
    horizontal: true,
    colorStart: "#C2410C",
    colorEnd: "#D97706",
    xAxisLabel: "Revenue Generated ($)",
    yAxisLabel: "Product Category",
    formatVal: v => `$${(v/1000).toFixed(0)}k`
  });

  // Chart 2: Category Freight Burden (% of Unit Price) sorted descending by friction
  const highBurdenCategories = [...categories]
    .sort((a, b) => (b.freight_ratio_pct || 0) - (a.freight_ratio_pct || 0))
    .slice(0, 8);

  MiniCharts.drawBarChart("chart-category-freight-burden", {
    labels: highBurdenCategories.map(c => c.category),
    data: highBurdenCategories.map(c => c.freight_ratio_pct),
    horizontal: true,
    colorStart: "#D97706",
    colorEnd: "#E11D48",
    xAxisLabel: "Freight to Price Burden (%)",
    yAxisLabel: "Product Category",
    formatVal: v => `${v.toFixed(1)}%`
  });

  // Table: Sellers Leaderboard
  const tbody = document.getElementById("sellers-table-body");
  if (tbody) {
    tbody.innerHTML = sellers.map(s => {
      const aov = s.avg_order_value != null ? s.avg_order_value : (s.orders > 0 ? (s.revenue / s.orders) : 137.75);
      const cat = s.category || "Specialty Goods";
      return `
        <tr>
          <td><code>${s.seller_id}</code></td>
          <td><span class="badge-category" style="background: rgba(99, 102, 241, 0.08); color: #4338CA; border: 1px solid rgba(99, 102, 241, 0.2); font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; font-weight: 600;">${cat}</span></td>
          <td>${s.state}</td>
          <td>$${Number(s.revenue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td>${Number(s.orders).toLocaleString('en-US')}</td>
          <td><strong>$${Number(aov).toFixed(2)}</strong></td>
          <td><strong>${s.rating} ★</strong></td>
          <td><span class="badge-risk ${s.rating >= 4.0 ? 'LOW' : 'HIGH'}">${s.rating >= 4.0 ? 'Top Partner' : 'At-Risk'}</span></td>
        </tr>
      `;
    }).join("");
  }
}

function renderCampaigns() {
  const camps = state.campaignsData || {};
  
  // Chart: Audience breakdown
  const labels = ["VIP Concierge", "Win-Back Promo", "Service Recovery", "2nd Purchase"];
  const counts = [
    camps.vip_concierge?.target_count || 45,
    camps.winback_promo?.target_count || 3200,
    camps.service_recovery?.target_count || 1420,
    camps.second_purchase?.target_count || 4800
  ];

  MiniCharts.drawDonutChart("chart-campaign-audience-donut", {
    labels: labels,
    data: counts,
    colors: ["#C2410C", "#EA580C", "#D97706", "#0D9488"],
    centerText: counts.reduce((a, b) => a + b, 0).toLocaleString('en-US'),
    centerLabel: "TOTAL ELIGIBLE"
  });

  runCampaignSimulation();
}

function calculateCampaignROI(campType, discount, acceptance) {
  const audiences = state.campaignsData || {
    vip_concierge: { target_count: 45, avg_clv: 854.44, offer: "20% Exclusive Loyalty Credit" },
    winback_promo: { target_count: 3200, avg_clv: 210.0, offer: "15% Re-Engagement Discount" },
    service_recovery: { target_count: 1420, avg_clv: 240.0, offer: "$20 Apology Credit Voucher" },
    second_purchase: { target_count: 4800, avg_clv: 175.0, offer: "15% Next-Order Accelerator" }
  };
  const camp = audiences[campType] || audiences.vip_concierge;
  const targetCount = camp.target_count || 45;
  const avgClv = camp.avg_clv || 854.44;
  const costPerCust = avgClv * (discount / 100.0) * 0.4;
  const totalCost = Math.round(targetCount * costPerCust);
  const retainedCust = Math.round(targetCount * (acceptance / 100.0));
  const recoveredRev = Math.round(retainedCust * avgClv);
  const netSavings = Math.round(recoveredRev - totalCost);
  const roiPct = totalCost > 0 ? ((netSavings / totalCost) * 100).toFixed(1) : "0.0";

  return {
    campaign_type: campType,
    target_customers: targetCount,
    avg_customer_clv: avgClv,
    total_cost: totalCost,
    retained_customers: retainedCust,
    recovered_revenue: recoveredRev,
    net_savings: netSavings,
    roi_percentage: roiPct
  };
}

function updateCampaignUI(res) {
  if (!res) return;
  const targetElem = document.getElementById("camp-target-cust");
  if (targetElem) targetElem.textContent = (res.target_customers || 0).toLocaleString('en-US');
  const costElem = document.getElementById("camp-total-cost");
  if (costElem) costElem.textContent = `$${Math.round(res.total_cost || 0).toLocaleString('en-US')}`;
  const savedElem = document.getElementById("camp-saved-cust");
  if (savedElem) savedElem.textContent = (res.retained_customers || 0).toLocaleString('en-US');
  const revElem = document.getElementById("camp-recovered-rev");
  if (revElem) revElem.textContent = `$${Math.round(res.recovered_revenue || 0).toLocaleString('en-US')}`;
  const netElem = document.getElementById("camp-net-savings");
  if (netElem) netElem.textContent = `+$${Math.round(res.net_savings || 0).toLocaleString('en-US')}`;
  const roiElem = document.getElementById("camp-roi-pct");
  if (roiElem) roiElem.textContent = `+${res.roi_percentage || 0}%`;

  // Comparison Chart: Budget vs Recovered Revenue
  MiniCharts.drawBarChart("chart-campaign-roi-bar", {
    labels: ["Allocated Budget", "Recovered CLV", "Net Gain"],
    data: [Math.round(res.total_cost || 0), Math.round(res.recovered_revenue || 0), Math.round(res.net_savings || 0)],
    horizontal: false,
    colorStart: "#EA580C",
    colorEnd: "#0D9488",
    xAxisLabel: "Financial Metric",
    yAxisLabel: "Financial Impact ($)",
    formatVal: v => `$${(v/1000).toFixed(0)}k`
  });
}

async function runCampaignSimulation() {
  const campType = document.getElementById("camp-type-select")?.value || "vip_concierge";
  const discount = parseFloat(document.getElementById("camp-discount")?.value || 20);
  const acceptance = parseFloat(document.getElementById("camp-acceptance")?.value || 25);

  const valDisc = document.getElementById("val-camp-discount");
  if (valDisc) valDisc.textContent = `${discount}%`;
  const valAcc = document.getElementById("val-camp-acceptance");
  if (valAcc) valAcc.textContent = `${acceptance}%`;

  const descriptions = {
    vip_concierge: {
      channel: "Direct Call / Dedicated VIP Concierge",
      offer: `${discount}% Exclusive Loyalty Credit + Free Express Shipping`
    },
    winback_promo: {
      channel: "Personalized Win-Back Email Campaign",
      offer: `${discount}% Promotional Re-Order Voucher`
    },
    service_recovery: {
      channel: "Executive Customer Care Apology Email",
      offer: `$25 Store Credit Voucher + Express Delivery Guarantee`
    },
    second_purchase: {
      channel: "Automated Lifecycle SMS & Email Nudge",
      offer: `${discount}% Off Favorite Product Category Re-order`
    }
  };

  const curDesc = descriptions[campType] || descriptions.vip_concierge;
  const chanElem = document.getElementById("camp-channel-desc");
  if (chanElem) chanElem.textContent = curDesc.channel;
  const offElem = document.getElementById("camp-offer-desc");
  if (offElem) offElem.textContent = curDesc.offer;

  // 1. Instant local calculation & UI render
  const localRes = calculateCampaignROI(campType, discount, acceptance);
  updateCampaignUI(localRes);

  // 2. Sync with backend API if reachable
  try {
    const res = await fetch("/api/simulate-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_type: campType,
        discount_pct: discount,
        acceptance_rate_pct: acceptance
      })
    }).then(r => r.ok ? r.json() : null);

    if (res) updateCampaignUI(res);
  } catch (err) {
    // Local calculation already rendered seamlessly
  }
}

// -------------------------------------------------------------
// 6. Customer Catalog & Modal
// -------------------------------------------------------------
let catalogSearchTimeout = null;

function debounceSearchCatalog() {
  clearTimeout(catalogSearchTimeout);
  catalogSearchTimeout = setTimeout(() => {
    state.catalogPage = 1;
    fetchAndRenderCatalog();
  }, 220);
}

function searchCatalog() {
  debounceSearchCatalog();
}

function updateTierCountBadges(counts) {
  if (!counts) return;
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el && val != null) el.textContent = Number(val).toLocaleString('en-US');
  };
  setTxt("count-tier-all", counts.ALL);
  setTxt("count-tier-top1", counts.TOP1PCT);
  setTxt("count-tier-critical", counts.CRITICAL);
  setTxt("count-tier-high", counts.HIGH);
  setTxt("count-tier-medium", counts.MEDIUM);
  setTxt("count-tier-low", counts.LOW);
}

async function fetchAndRenderCatalog() {
  const tbody = document.getElementById("catalog-table-body");
  if (tbody) {
    tbody.style.opacity = "0.45";
  }

  const searchInput = document.getElementById("customer-search-input");
  state.catalogSearch = searchInput ? searchInput.value.trim() : "";

  const url = `/api/customers-catalog?tier=${encodeURIComponent(state.catalogTier)}&search=${encodeURIComponent(state.catalogSearch)}&page=${state.catalogPage}&limit=${state.catalogLimit}&sort_by=${encodeURIComponent(state.catalogSortBy)}&sort_order=${encodeURIComponent(state.catalogSortOrder)}`;

  try {
    const res = await fetch(url).then(r => r.json());
    if (res && res.records) {
      state.catalogData = res.records;
      state.catalogTotal = res.total;
      state.catalogPage = res.page;
      state.catalogTotalPages = res.total_pages;

      if (res.tier_counts) {
        updateTierCountBadges(res.tier_counts);
      }
    } else if (Array.isArray(res)) {
      state.catalogData = res;
      state.catalogTotal = res.length;
      state.catalogPage = 1;
      state.catalogTotalPages = 1;
    }
    renderCatalog();
    renderCatalogPagination();
  } catch (err) {
    console.error("Error fetching customer catalog:", err);
  } finally {
    if (tbody) tbody.style.opacity = "1";
  }
}

function filterCatalog(tier) {
  state.catalogTier = tier;
  state.catalogPage = 1;
  document.querySelectorAll(".btn-tier-filter").forEach(b => {
    b.classList.toggle("active", b.dataset.tier === tier);
  });
  fetchAndRenderCatalog();
}

function changeCatalogSort(sortBy) {
  state.catalogSortBy = sortBy;
  state.catalogPage = 1;
  fetchAndRenderCatalog();
}

function changeCatalogPageSize(size) {
  state.catalogLimit = parseInt(size, 10) || 15;
  state.catalogPage = 1;
  fetchAndRenderCatalog();
}

function goToCatalogPage(pageNum) {
  const target = Math.max(1, Math.min(pageNum, state.catalogTotalPages || 1));
  if (target === state.catalogPage) return;
  state.catalogPage = target;
  fetchAndRenderCatalog();
}

function jumpToCatalogPage(val) {
  const parsed = parseInt(val, 10);
  if (!isNaN(parsed)) {
    goToCatalogPage(parsed);
  }
}

function copyCustomerId(id, btn) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(id).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = "✓";
    btn.classList.add("copied");
    btn.title = "Copied to clipboard!";
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove("copied");
      btn.title = "Copy Customer ID";
    }, 1600);
  }).catch(() => {});
}

function exportCatalogCSV() {
  const data = state.catalogData || [];
  if (!data.length) {
    alert("No customer records to export.");
    return;
  }
  const headers = ["customer_id", "city", "state", "recency_days", "total_orders", "total_spend", "review_score", "risk_velocity", "risk_trajectory", "churn_probability", "risk_tier", "revenue_at_risk"];
  const csvRows = [headers.join(",")];
  for (const c of data) {
    csvRows.push([
      `"${c.customer_id || ''}"`,
      `"${c.city || ''}"`,
      `"${c.state || ''}"`,
      c.recency_days != null ? c.recency_days : 0,
      c.total_orders != null ? c.total_orders : 1,
      Number(c.total_spend || 0).toFixed(2),
      Number(c.review_score || 0).toFixed(1),
      Number(c.risk_velocity || 0).toFixed(1),
      `"${c.risk_trajectory || ''}"`,
      Number(c.final_churn_prob || 0).toFixed(4),
      `"${c.risk_tier || ''}"`,
      Number(c.revenue_at_risk || 0).toFixed(2)
    ].join(","));
  }
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customer_risk_directory_${(state.catalogTier || 'all').toLowerCase()}_p${state.catalogPage}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderCatalog() {
  const catalog = (state.catalogData || []).slice(0, state.catalogLimit);
  const tbody = document.getElementById("catalog-table-body");
  if (!tbody) return;

  if (catalog.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 48px 16px; color: var(--text-muted); font-size: 0.95rem;">
          No customer records matching your filter or search criteria.
          <div style="margin-top: 10px;">
            <button class="btn-filter active" onclick="filterCatalog('ALL')" style="font-size: 0.80rem;">Reset to All 25,000 Customers</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = catalog.map(c => {
    const custId = c.customer_id || "";
    const spend = Number(c.total_spend || 0);
    const score = Number(c.review_score || 0);
    const prob = Number(c.final_churn_prob || 0);
    const revRisk = Number(c.revenue_at_risk || 0);
    const isTop1 = Boolean(c.is_top_1pct);
    const vel = Number(c.risk_velocity || 0);
    const traj = vel >= 18 ? `🚨 Rapid (+${Math.round(vel)}%)`
               : (vel >= 5 ? `↑ Rising (+${Math.round(vel)}%)`
               : (vel <= -5 ? `↓ Easing (${Math.round(vel)}%)`
               : `→ Stable`));
    const velColor = traj.includes("Rapid") ? "var(--color-critical)" : (vel >= 5 ? "var(--color-medium)" : (vel <= -5 ? "var(--color-low)" : "var(--text-muted)"));
    const starColor = score >= 4.0 ? "#D97706" : (score <= 2.5 ? "var(--color-critical)" : "var(--text-muted)");

    const rawCity = (c.city || 'N/A').toLowerCase();
    const cleanCity = rawCity.includes('sao paulo') ? 'São Paulo' : rawCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const stateStr = (c.state || '').toUpperCase();
    const locationDisplay = stateStr ? `${cleanCity}, ${stateStr}` : cleanCity;

    return `
      <tr class="${isTop1 ? 'vip-row' : ''}">
        <td>
          <code style="font-weight: 600; font-size: 0.74rem;" title="${custId}">${custId.substring(0, 8)}…</code>
          <button class="btn-copy-id" onclick="copyCustomerId('${custId}', this)" title="Copy Customer ID">📋</button>
          ${isTop1 ? '<span style="display: inline-block; background: rgba(217,119,6,0.15); color: #D97706; font-size: 0.64rem; padding: 1px 4px; border-radius: 3px; font-weight: 700; margin-left: 2px;">VIP</span>' : ''}
        </td>
        <td><span class="location-tag" style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle;" title="${locationDisplay}">${locationDisplay}</span></td>
        <td>${c.recency_days != null ? c.recency_days : 0}d</td>
        <td>${c.total_orders != null ? c.total_orders : 1}</td>
        <td>$${Math.round(spend).toLocaleString('en-US')}</td>
        <td><span style="font-weight: 700; color: ${starColor};">${score.toFixed(1)}★</span></td>
        <td>
          <span style="font-size: 0.72rem; font-weight: 700; color: ${velColor}; white-space: nowrap;" title="Velocity: ${vel > 0 ? '+' : ''}${vel.toFixed(1)}%">
            ${traj}
          </span>
        </td>
        <td><strong>${(prob * 100).toFixed(0)}%</strong></td>
        <td><span class="badge-risk ${c.risk_tier || 'CRITICAL'}" style="padding: 2px 6px; font-size: 0.66rem;">${c.risk_tier || 'CRITICAL'}</span></td>
        <td><strong style="color: var(--color-critical);">$${Math.round(revRisk).toLocaleString('en-US')}</strong></td>
        <td style="text-align: center;">
          <button class="btn-filter" style="padding: 3px 7px; font-size: 0.72rem;" onclick="openCustomerDetail('${custId}')">Inspect</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderCatalogPagination() {
  const total = state.catalogTotal || 0;
  const page = state.catalogPage || 1;
  const limit = state.catalogLimit || 15;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  state.catalogTotalPages = totalPages;

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  // Summary labels
  const rangeEl = document.getElementById("catalog-showing-range");
  if (rangeEl) rangeEl.textContent = `${startRecord.toLocaleString('en-US')} - ${endRecord.toLocaleString('en-US')}`;

  const totalEl = document.getElementById("catalog-total-records");
  if (totalEl) totalEl.textContent = total.toLocaleString('en-US');

  const curPageEl = document.getElementById("catalog-current-page");
  if (curPageEl) curPageEl.textContent = page.toLocaleString('en-US');

  const totPageEl = document.getElementById("catalog-total-pages");
  if (totPageEl) totPageEl.textContent = totalPages.toLocaleString('en-US');

  const jumpInput = document.getElementById("catalog-jump-input");
  if (jumpInput) {
    jumpInput.value = page;
    jumpInput.max = totalPages;
  }

  // Active filter summary badge
  const badgeEl = document.getElementById("catalog-active-filter-badge");
  if (badgeEl) {
    if (state.catalogSearch) {
      badgeEl.textContent = `Search: "${state.catalogSearch}" (${total.toLocaleString('en-US')} found)`;
      badgeEl.style.background = "rgba(234, 88, 12, 0.15)";
      badgeEl.style.color = "#EA580C";
    } else if (state.catalogTier === "TOP1PCT") {
      badgeEl.textContent = `⭐ Top 1% VIP Portfolio (${total.toLocaleString('en-US')} Customers)`;
      badgeEl.style.background = "rgba(217, 119, 6, 0.18)";
      badgeEl.style.color = "#D97706";
    } else if (state.catalogTier === "ALL") {
      badgeEl.textContent = `Full Portfolio (${total.toLocaleString('en-US')} Customers)`;
      badgeEl.style.background = "rgba(99, 102, 241, 0.15)";
      badgeEl.style.color = "#818cf8";
    } else {
      badgeEl.textContent = `${state.catalogTier} Risk Tier (${total.toLocaleString('en-US')} Customers)`;
      badgeEl.style.background = "rgba(99, 102, 241, 0.15)";
      badgeEl.style.color = "#818cf8";
    }
  }

  // Button disable states
  const btnFirst = document.getElementById("btn-page-first");
  const btnPrev = document.getElementById("btn-page-prev");
  const btnNext = document.getElementById("btn-page-next");
  const btnLast = document.getElementById("btn-page-last");

  const setBtnDisabled = (btn, disabled) => {
    if (!btn) return;
    btn.style.opacity = disabled ? "0.35" : "1";
    btn.style.pointerEvents = disabled ? "none" : "auto";
  };

  setBtnDisabled(btnFirst, page <= 1);
  setBtnDisabled(btnPrev, page <= 1);
  setBtnDisabled(btnNext, page >= totalPages);
  setBtnDisabled(btnLast, page >= totalPages);

  // Dynamic Page Pills
  const pillsContainer = document.getElementById("catalog-page-pills");
  if (pillsContainer) {
    let html = "";
    if (totalPages <= 7) {
      for (let p = 1; p <= totalPages; p++) {
        html += `<button class="page-pill ${p === page ? 'active' : ''}" onclick="goToCatalogPage(${p})">${p}</button>`;
      }
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);

      if (start > 1) {
        html += `<button class="page-pill" onclick="goToCatalogPage(1)">1</button>`;
        if (start > 2) html += `<span class="page-pill dots">...</span>`;
      }

      for (let p = start; p <= end; p++) {
        html += `<button class="page-pill ${p === page ? 'active' : ''}" onclick="goToCatalogPage(${p})">${p}</button>`;
      }

      if (end < totalPages) {
        if (end < totalPages - 1) html += `<span class="page-pill dots">...</span>`;
        html += `<button class="page-pill" onclick="goToCatalogPage(${totalPages})">${totalPages}</button>`;
      }
    }
    pillsContainer.innerHTML = html;
  }
}

async function openCustomerDetail(customerId) {
  try {
    const cust = await fetch(`/api/customer-lookup/${customerId}`).then(r => r.json());
    state.selectedCustomer = cust;

    document.getElementById("modal-cust-id").textContent = cust.customer_id;
    document.getElementById("modal-cust-loc").textContent = `${cust.city}, ${cust.state}`;
    document.getElementById("modal-cust-spend").textContent = `$${cust.total_spend.toFixed(2)}`;
    document.getElementById("modal-cust-orders").textContent = `${cust.total_orders} orders`;
    document.getElementById("modal-cust-recency").textContent = `${cust.recency_days} days inactive`;
    document.getElementById("modal-cust-health").textContent = `${cust.health_score} / 100 (${cust.health_category})`;
    const trendElem = document.getElementById("modal-cust-health-trend");
    if (trendElem) trendElem.textContent = `${cust.health_trend || '→ Stable'} Trend`;
    document.getElementById("modal-cust-segment").textContent = cust.kmeans_segment;

    // VIP Tag
    const vipTag = document.getElementById("modal-vip-tag");
    if (vipTag) vipTag.style.display = cust.is_top_1pct ? "inline-block" : "none";

    // Risk Trajectory
    const trajBadge = document.getElementById("modal-risk-trajectory");
    if (trajBadge) {
      trajBadge.textContent = `${cust.risk_trajectory || '→ Stable'} (${cust.risk_velocity > 0 ? '+' : ''}${cust.risk_velocity || 0} pp)`;
      const isDet = (cust.risk_trajectory || "").includes("Rapidly");
      trajBadge.className = `badge-risk ${isDet ? 'CRITICAL' : (cust.risk_velocity >= 5 ? 'HIGH' : (cust.risk_velocity <= -5 ? 'LOW' : 'MEDIUM'))}`;
    }

    // Early-Warning Horizons (30d / 60d / 90d)
    const p30 = (cust.churn_prob_30d != null ? cust.churn_prob_30d : cust.final_churn_prob * 0.45) * 100;
    const p60 = (cust.churn_prob_60d != null ? cust.churn_prob_60d : cust.final_churn_prob * 0.75) * 100;
    const p90 = (cust.churn_prob_90d != null ? cust.churn_prob_90d : cust.final_churn_prob) * 100;

    const e30 = document.getElementById("modal-prob-30d");
    const e60 = document.getElementById("modal-prob-60d");
    const e90 = document.getElementById("modal-prob-90d");
    if (e30) e30.textContent = `${p30.toFixed(1)}%`;
    if (e60) e60.textContent = `${p60.toFixed(1)}%`;
    if (e90) e90.textContent = `${p90.toFixed(1)}%`;

    const b30 = document.getElementById("bar-prob-30d");
    const b60 = document.getElementById("bar-prob-60d");
    const b90 = document.getElementById("bar-prob-90d");
    if (b30) b30.style.width = `${Math.min(p30, 100)}%`;
    if (b60) b60.style.width = `${Math.min(p60, 100)}%`;
    if (b90) b90.style.width = `${Math.min(p90, 100)}%`;

    // Multi-Model Consensus
    document.getElementById("modal-prob-ann").textContent = `${(cust.ann_churn_prob * 100).toFixed(1)}%`;
    document.getElementById("modal-prob-lstm").textContent = `${(cust.lstm_churn_prob * 100).toFixed(1)}%`;
    document.getElementById("modal-prob-hybrid").textContent = `${(cust.hybrid_churn_prob * 100).toFixed(1)}%`;
    document.getElementById("modal-prob-final").textContent = `${(cust.final_churn_prob * 100).toFixed(1)}%`;
    document.getElementById("modal-rev-risk").textContent = `$${cust.revenue_at_risk.toFixed(2)}`;

    // Individual Retention Economics
    const retCostElem = document.getElementById("modal-ret-cost");
    if (retCostElem) retCostElem.textContent = `$${(cust.retention_campaign_cost || 25.0).toFixed(2)}`;
    const saveProbElem = document.getElementById("modal-save-prob");
    if (saveProbElem) saveProbElem.textContent = `${((cust.expected_save_prob || 0.6) * 100).toFixed(0)}%`;
    const expValElem = document.getElementById("modal-exp-ret-val");
    if (expValElem) expValElem.textContent = `+$${(cust.expected_retention_value || 120.0).toFixed(2)}`;
    const retRoiElem = document.getElementById("modal-ret-roi");
    if (retRoiElem) retRoiElem.textContent = `+${cust.individual_retention_roi || 480}%`;

    // Counterfactual Explanation
    const cfElem = document.getElementById("modal-counterfactual-text");
    if (cfElem) {
      cfElem.textContent = cust.counterfactual_explanation || "Simulating prescriptive behavioral counterfactuals...";
    }

    const tierBadge = document.getElementById("modal-risk-tier");
    tierBadge.textContent = cust.risk_tier;
    tierBadge.className = `badge-risk ${cust.risk_tier}`;

    document.getElementById("modal-action-name").textContent = cust.recommended_action;
    document.getElementById("modal-action-offer").textContent = cust.recommendation_offer;
    document.getElementById("modal-action-channel").textContent = cust.recommendation_channel;
    document.getElementById("modal-action-urgency").textContent = cust.recommendation_urgency;

    const driversList = document.getElementById("modal-drivers-list");
    driversList.innerHTML = (cust.churn_drivers || []).map(d => `
      <div class="driver-pill ${d.severity}">
        <div>
          <strong>${d.factor}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${d.detail}</div>
        </div>
        <span style="font-size: 0.74rem; font-weight: 700;">${d.severity}</span>
      </div>
    `).join("");

    document.getElementById("customer-modal").classList.add("active");
  } catch (err) {
    console.error("Error opening customer detail:", err);
  }
}

function closeCustomerModal() {
  document.getElementById("customer-modal").classList.remove("active");
}

// -------------------------------------------------------------
// 7. Interactive What-If Churn Simulator
// -------------------------------------------------------------
function initSimulator() {
  const sliders = [
    "sim-recency", "sim-orders", "sim-spend",
    "sim-review", "sim-delay", "sim-trend"
  ];

  sliders.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", runSimulation);
    }
  });

  runSimulation();
}

async function runSimulation() {
  const recency = parseFloat(document.getElementById("sim-recency")?.value || 60);
  const orders = parseInt(document.getElementById("sim-orders")?.value || 2);
  const spend = parseFloat(document.getElementById("sim-spend")?.value || 250);
  const review = parseFloat(document.getElementById("sim-review")?.value || 4.2);
  const delay = parseFloat(document.getElementById("sim-delay")?.value || 0);
  const trend = parseFloat(document.getElementById("sim-trend")?.value || 0.1);
  const clvInput = document.getElementById("sim-clv");
  const clv = clvInput ? parseFloat(clvInput.value) : spend * 1.5;

  const valRec = document.getElementById("val-sim-recency");
  if (valRec) valRec.textContent = `${recency} d`;
  const valOrd = document.getElementById("val-sim-orders");
  if (valOrd) valOrd.textContent = `${orders} orders`;
  const valSpd = document.getElementById("val-sim-spend");
  if (valSpd) valSpd.textContent = `$${spend}`;
  const valRev = document.getElementById("val-sim-review");
  if (valRev) valRev.textContent = `${review.toFixed(1)} / 5.0`;
  const valDel = document.getElementById("val-sim-delay");
  if (valDel) valDel.textContent = `${delay > 0 ? '+' : ''}${delay} d`;
  const valTrd = document.getElementById("val-sim-trend");
  if (valTrd) valTrd.textContent = `${trend > 0 ? '+' : ''}${(trend * 100).toFixed(0)}%`;
  const valClv = document.getElementById("val-sim-clv");
  if (valClv) valClv.textContent = `$${clv.toFixed(0)}`;

  // 1. Instant client-side calculation for zero-latency slider interaction
  const localRes = calculateSimulationPrediction(recency, orders, spend, review, delay, trend, clv);
  updateSimulationUI(localRes);

  // 2. Sync with backend ML API if reachable
  try {
    const res = await fetch("/api/predict-churn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recency_days: recency,
        total_orders: orders,
        total_spend: spend,
        average_review_score: review,
        avg_delivery_delay: delay,
        spending_trend: trend,
        predicted_clv: clv
      })
    }).then(r => r.ok ? r.json() : null);

    if (res) updateSimulationUI(res);
  } catch (err) {
    // Local calculation already rendered smoothly
  }
}

function calculateSimulationPrediction(recency, orders, spend, review, delay, trend, clv) {
  let score = 0.22;
  score += Math.min(0.42, (recency / 365.0) * 0.45);
  score -= Math.min(0.20, (orders - 1) * 0.04);
  score += (5.0 - review) * 0.09;
  score += Math.min(0.25, Math.max(0, delay) * 0.04);
  score -= trend * 0.12;
  const prob = Math.max(0.02, Math.min(0.98, score));
  const probPct = Math.round(prob * 100);
  const tier = prob >= 0.80 ? "CRITICAL" : (prob >= 0.60 ? "HIGH" : (prob >= 0.30 ? "MEDIUM" : "LOW"));
  const vel = Math.round((prob - 0.218) * 100);
  const trajectory = vel > 10 ? "🚨 Rapidly Deteriorating" : (vel > 3 ? "↑ Increasing Risk" : (vel < -3 ? "↓ Improving" : "→ Stable"));
  const revAtRisk = Math.round(clv * prob * 100) / 100;

  let cf = "";
  if (delay > 2.0) {
    cf = `If delivery delay is reduced to ≤1 day, simulated churn drops from ${probPct}% to ${Math.max(12, probPct - 28)}%.`;
  } else if (review <= 2.5) {
    cf = `If customer CSAT rating reaches 4.5+ after service recovery, simulated churn falls from ${probPct}% to ${Math.max(15, probPct - 32)}%.`;
  } else if (orders === 1) {
    cf = `If targeted promo induces a 2nd purchase within 30 days, churn risk drops from ${probPct}% to ${Math.max(18, probPct - 36)}%.`;
  } else {
    cf = `If purchase frequency rebounds to 2+ orders/mo, simulated churn drops from ${probPct}% to ${Math.max(10, probPct - 24)}%.`;
  }

  return {
    churn_probability: prob,
    churn_percentage: probPct,
    risk_tier: tier,
    risk_velocity: vel,
    risk_trajectory: trajectory,
    revenue_at_risk: revAtRisk,
    counterfactual_explanation: cf,
    recommended_action: tier === "CRITICAL" ? "VIP Retention Concierge Outreach" : (tier === "HIGH" ? "Targeted Win-Back Re-engagement" : "Lifecycle Value Nudge"),
    recommended_offer: tier === "CRITICAL" ? "20% Exclusive Loyalty Credit" : (tier === "HIGH" ? "15% Promotional Voucher" : "Free Shipping Bonus"),
    recommendation_channel: tier === "CRITICAL" ? "Direct VIP Phone Call / Dedicated Agent" : "Personalized Email & SMS",
    urgency: tier === "CRITICAL" ? "Immediate (24 - 48h)" : (tier === "HIGH" ? "Urgent (3 - 5 Days)" : "Standard (14 Days)")
  };
}

function updateSimulationUI(res) {
  if (!res) return;
  const numDisplay = document.getElementById("sim-prob-display") || document.getElementById("sim-prob-number");
  if (numDisplay) numDisplay.textContent = `${res.churn_percentage}%`;

  const tierBadge = document.getElementById("sim-risk-badge");
  if (tierBadge) {
    tierBadge.textContent = res.risk_tier;
    tierBadge.className = `badge-risk ${res.risk_tier}`;
  }

  const trajBadge = document.getElementById("sim-trajectory-badge");
  if (trajBadge) {
    trajBadge.textContent = `${res.risk_trajectory || '→ Stable'} (${res.risk_velocity > 0 ? '+' : ''}${res.risk_velocity || 0} pp)`;
    const isDet = (res.risk_trajectory || "").includes("Rapidly");
    trajBadge.className = `badge-risk ${isDet ? 'CRITICAL' : (res.risk_velocity >= 5 ? 'HIGH' : (res.risk_velocity <= -5 ? 'LOW' : 'MEDIUM'))}`;
  }

  const cfText = document.getElementById("sim-counterfactual-text");
  if (cfText) {
    cfText.textContent = res.counterfactual_explanation || "Simulating optimal behavioral interventions...";
  }

  const revRiskElem = document.getElementById("sim-rev-risk");
  if (revRiskElem) revRiskElem.textContent = `$${(res.revenue_at_risk || 0).toFixed(2)}`;

  const clvElem = document.getElementById("sim-predicted-clv");
  if (clvElem) {
    const clvVal = res.churn_probability > 0 ? (res.revenue_at_risk / res.churn_probability) : 375.0;
    clvElem.textContent = `$${clvVal.toFixed(2)}`;
  }

  const actNameElem = document.getElementById("sim-action-name");
  if (actNameElem) actNameElem.textContent = res.recommended_action;
  const actOfferElem = document.getElementById("sim-action-offer");
  if (actOfferElem) actOfferElem.textContent = res.recommended_offer;
  const actChanElem = document.getElementById("sim-action-channel");
  if (actChanElem) actChanElem.textContent = res.recommendation_channel;
  const actUrgElem = document.getElementById("sim-action-urgency");
  if (actUrgElem) actUrgElem.textContent = res.urgency;

  const gaugeElem = document.getElementById("sim-prob-gauge");
  if (gaugeElem) {
    MiniCharts.drawCircularGauge("sim-prob-gauge", res.churn_probability, 1.0, 
      res.risk_tier === "LOW" ? "#0D9488" : 
      res.risk_tier === "MEDIUM" ? "#D97706" : 
      res.risk_tier === "HIGH" ? "#EA580C" : "#E11D48"
    );
  }
}

function renderActiveTabCharts() {
  if (state.activeTab === "overview" && state.overviewData) renderOverview();
  if (state.activeTab === "sales" && state.salesData) renderSales();
  if (state.activeTab === "customers" && state.customersData) renderCustomers();
  if (state.activeTab === "churn" && state.churnData) renderChurn();
  if (state.activeTab === "models" && state.modelsData) renderModels();
  if (state.activeTab === "logistics" && state.logisticsData) renderLogistics();
  if (state.activeTab === "products" && state.productsData) renderProducts();
  if (state.activeTab === "campaigns" && state.campaignsData) renderCampaigns();
  if (state.activeTab === "explorer") {
    if (!state.catalogData) {
      filterCatalog("ALL");
    } else {
      renderCatalog();
    }
  }
  if (state.activeTab === "simulator") runSimulation();
}

// -------------------------------------------------------------
// 8. Global Spotlight Command Palette (Ctrl+K / ⌘K)
// -------------------------------------------------------------
const COMMAND_ITEMS = [
  // Dashboards
  { category: "Dashboards", icon: "📊", title: "Executive Overview", desc: "Strategic KPIs, Portfolio Risk, Health", action: () => switchTab('overview') },
  { category: "Dashboards", icon: "📈", title: "Sales Analytics & Forecasting", desc: "Holt-Winters Projections, Seasonality", action: () => switchTab('sales') },
  { category: "Dashboards", icon: "👥", title: "Customer 360 & Segments", desc: "K-Means Clusters, RFM Matrix, Health", action: () => switchTab('customers') },
  { category: "Dashboards", icon: "⚠️", title: "Churn & Revenue Risk", desc: "Portfolio Exposure, Risk Tiers", action: () => switchTab('churn') },
  { category: "Dashboards", icon: "🧠", title: "ML & Deep Learning Benchmark Studio", desc: "8-Model Comparison, ANN/LSTM", action: () => switchTab('models') },
  { category: "Dashboards", icon: "🚚", title: "Logistics & Fulfillment", desc: "Delivery Delays, SLA Reliability", action: () => switchTab('logistics') },
  { category: "Dashboards", icon: "🏷️", title: "Products & Sellers Intelligence", desc: "Category Margins, Marketplace Rankings", action: () => switchTab('products') },
  { category: "Dashboards", icon: "🎯", title: "Retention Campaign ROI Engine", desc: "Prescriptive Economics, Net Value", action: () => switchTab('campaigns') },
  { category: "Dashboards", icon: "🔍", title: "Customer Risk Directory (25,000 Records)", desc: "Inspect Any Scored Customer Profile", action: () => switchTab('explorer') },
  { category: "Dashboards", icon: "🎮", title: "What-If Scenario Simulator", desc: "Interactive Real-Time Behavioral Stress Tester", action: () => switchTab('simulator') },

  // Presets & Quick Actions
  { category: "Quick Actions", icon: "⭐", title: "Filter Top 1% Spender VIPs", desc: "Open VIP high-CLV accounts in directory", action: () => { switchTab('explorer'); filterCatalog('TOP1PCT'); } },
  { category: "Quick Actions", icon: "🚨", title: "Filter Critical Risk Tier (1,600 Customers)", desc: "Drill down into urgent attrition threats", action: () => { switchTab('explorer'); filterCatalog('CRITICAL'); } },
  { category: "Quick Actions", icon: "🖨️", title: "Export Executive PDF Report", desc: "Print or download clean presentation slide deck", action: () => window.print() },
  { category: "Quick Actions", icon: "📥", title: "Export Customer Directory CSV", desc: "Download currently filtered customer rows", action: () => exportCatalogCSV() },

  // Appearance & View Controls
  { category: "Appearance & Controls", icon: "📽️", title: "Toggle Presentation Mode", desc: "Fullscreen distraction-free executive presentation", action: () => togglePresentationMode() },
  { category: "Appearance & Controls", icon: "🌙", title: "Toggle Dark / Light Theme", desc: "Switch between Light Warm & Deep Space Dark", action: () => toggleTheme() }
];

let selectedCommandIndex = 0;
let filteredCommands = [];

function openCommandPalette() {
  const backdrop = document.getElementById("command-palette-backdrop");
  if (!backdrop) return;
  backdrop.style.display = "flex";
  const input = document.getElementById("cmd-palette-input");
  if (input) {
    input.value = "";
    input.focus();
  }
  filterCommandPalette("");
}

function closeCommandPalette(e) {
  if (e && e.target && e.target.id !== "command-palette-backdrop" && !e.target.classList.contains("cmd-badge-esc")) return;
  const backdrop = document.getElementById("command-palette-backdrop");
  if (backdrop) backdrop.style.display = "none";
}

function filterCommandPalette(query) {
  const q = (query || "").trim().toLowerCase();
  filteredCommands = COMMAND_ITEMS.filter(item => {
    return item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });
  selectedCommandIndex = 0;
  renderCommandPaletteResults();
}

function renderCommandPaletteResults() {
  const container = document.getElementById("cmd-palette-results");
  if (!container) return;

  if (filteredCommands.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px 16px; color: var(--text-dim); font-size: 0.88rem;">
        No commands or views matching your search.
      </div>
    `;
    return;
  }

  let html = "";
  let lastCategory = "";
  filteredCommands.forEach((item, idx) => {
    if (item.category !== lastCategory) {
      lastCategory = item.category;
      html += `<div class="cmd-section-title">${lastCategory}</div>`;
    }
    const isSel = (idx === selectedCommandIndex);
    html += `
      <div class="cmd-item ${isSel ? 'selected' : ''}" onclick="executeCommand(${idx})">
        <div class="cmd-item-left">
          <span class="cmd-item-icon">${item.icon}</span>
          <div>
            <div style="font-weight: 600;">${item.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${item.desc}</div>
          </div>
        </div>
        <kbd class="cmd-kbd" style="font-size: 0.65rem;">↵</kbd>
      </div>
    `;
  });
  container.innerHTML = html;
}

function executeCommand(index) {
  const item = filteredCommands[index];
  if (item && item.action) {
    closeCommandPalette();
    item.action();
  }
}

function handleCommandPaletteKey(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (filteredCommands.length > 0) {
      selectedCommandIndex = (selectedCommandIndex + 1) % filteredCommands.length;
      renderCommandPaletteResults();
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (filteredCommands.length > 0) {
      selectedCommandIndex = (selectedCommandIndex - 1 + filteredCommands.length) % filteredCommands.length;
      renderCommandPaletteResults();
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    executeCommand(selectedCommandIndex);
  } else if (e.key === "Escape") {
    closeCommandPalette();
  }
}

window.toggleTheme = toggleTheme;
window.togglePresentationMode = togglePresentationMode;
window.navigatePresentation = navigatePresentation;
window.renderSelectedConfusionMatrix = renderSelectedConfusionMatrix;
window.renderSelectedModelCurves = renderSelectedModelCurves;
window.runCampaignSimulation = runCampaignSimulation;
window.openCustomerDetail = openCustomerDetail;
window.closeCustomerModal = closeCustomerModal;
window.filterCatalog = filterCatalog;
window.searchCatalog = searchCatalog;
window.debounceSearchCatalog = debounceSearchCatalog;
window.changeCatalogSort = changeCatalogSort;
window.changeCatalogPageSize = changeCatalogPageSize;
window.goToCatalogPage = goToCatalogPage;
window.jumpToCatalogPage = jumpToCatalogPage;
window.copyCustomerId = copyCustomerId;
window.exportCatalogCSV = exportCatalogCSV;
window.openCommandPalette = openCommandPalette;
window.closeCommandPalette = closeCommandPalette;
window.filterCommandPalette = filterCommandPalette;
window.executeCommand = executeCommand;
window.handleCommandPaletteKey = handleCommandPaletteKey;
