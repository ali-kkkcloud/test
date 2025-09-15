// ====================================
// CAUTIO DASHBOARD - MAIN SCRIPT - COMPLETE FIXED VERSION
// ====================================

// 🔒 SECURE Configuration (Replace with your actual values)
const supabaseUrl = 'https://jcmjazindwonrplvjwxl.supabase.co'; // Replace this
const supabaseKey = 'your-anon-key-here'; // Replace this
const supabase = window.supabase?.createClient ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// Global variables
let sidebarExpanded = false;
let customers = [];
let leads = [];
let credentials = [];
let scheduledEmails = [];
let pendingApprovals = [];
let approvedCustomers = [];
let filteredCustomers = [];
let filteredLeads = [];
let currentFilter = '';
let currentPOCAction = null;
let currentEmailTarget = null;
let userSession = null;
let searchTimeout = null;
let currentActiveTab = 'allTab';
let customerDropdownOpen = false;
let addMenuOpen = false;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Cautio Dashboard...');
    
    // Show login page initially
    showLoginPage();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for existing session
    checkUserSession();
    
    console.log('✅ Dashboard initialized successfully');
});

// ====================================
// AUTHENTICATION & SESSION MANAGEMENT
// ====================================

function showLoginPage() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('dashboardContainer').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
    
    // Initialize dashboard
    updateTabHighlight('allTab');
    loadData();
    checkExpiredPOCs();
    setupRealtimeListeners();
    checkPOCReminders();
    startEmailScheduler();
    setupClickOutsideListeners();
    
    // Initialize modules
    if (typeof initializeInventoryManagement === 'function') {
        initializeInventoryManagement();
    }
    if (typeof initializeStockManagement === 'function') {
        initializeStockManagement();
    }
    
    // Auto-save session every 30 seconds
    setInterval(saveUserSession, 30000);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    // Mock authentication for demo
    if (email && password) {
        userSession = {
            email: email,
            full_name: email.split('@')[0],
            role: 'admin'
        };
        
        saveUserSession();
        showDashboard();
        showEmailToast('Login successful!');
    } else {
        showEmailToast('Please enter valid credentials', 'error');
    }
}

function saveUserSession() {
    if (userSession) {
        localStorage.setItem('cautio_user_session', JSON.stringify({
            user: userSession,
            timestamp: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000)
        }));
    }
}

function checkUserSession() {
    const savedSession = localStorage.getItem('cautio_user_session');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            if (sessionData.expires > Date.now()) {
                userSession = sessionData.user;
                showDashboard();
                showEmailToast(`Welcome back, ${userSession.full_name}!`);
            } else {
                localStorage.removeItem('cautio_user_session');
            }
        } catch (error) {
            console.error('Error parsing session:', error);
            localStorage.removeItem('cautio_user_session');
        }
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        userSession = null;
        localStorage.removeItem('cautio_user_session');
        showLoginPage();
        showEmailToast('Logged out successfully');
    }
}

// ====================================
// EVENT LISTENERS SETUP
// ====================================

function setupEventListeners() {
    // Hamburger button
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleSidebar);
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Add forms
    const addLeadForm = document.getElementById('addLeadForm');
    if (addLeadForm) {
        addLeadForm.addEventListener('submit', handleAddLead);
    }

    const addCustomerForm = document.getElementById('addCustomerForm');
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', handleAddCustomer);
    }
}

function setupClickOutsideListeners() {
    document.addEventListener('click', function(e) {
        // Close customer dropdown if clicked outside
        const customerDropdown = document.getElementById('customerDropdown');
        const customerDropdownBtn = e.target.closest('[onclick*="toggleCustomerDropdown"]');
        
        if (customerDropdownOpen && customerDropdown && !customerDropdown.contains(e.target) && !customerDropdownBtn) {
            closeCustomerDropdown();
        }
        
        // Close add menu if clicked outside
        const addMenu = document.getElementById('addMenu');
        const addButton = e.target.closest('#addButton');
        
        if (addMenuOpen && addMenu && !addMenu.contains(e.target) && !addButton) {
            closeAddMenu();
        }
    });
}

// ====================================
// NAVIGATION FUNCTIONS
// ====================================

function showCustomersOverview() {
    hideAllContent();
    document.getElementById('customersOverviewContent').classList.remove('hidden');
    updateMenuHighlight('customers');
}

function showStock() {
    hideAllContent();
    document.getElementById('stockContent').classList.remove('hidden');
    updateMenuHighlight('stock');
    if (typeof loadStockData === 'function') {
        loadStockData();
    }
}

function showFinance() {
    hideAllContent();
    document.getElementById('financeContent').classList.remove('hidden');
    updateMenuHighlight('finance');
    updateFinanceTab();
}

function showGroundOperations() {
    hideAllContent();
    document.getElementById('groundOperationsContent').classList.remove('hidden');
    updateMenuHighlight('ground');
}

function showInventoryManagement() {
    hideAllContent();
    document.getElementById('inventoryManagementContent').classList.remove('hidden');
    updateMenuHighlight('inventory');
    if (typeof loadInventoryData === 'function') {
        loadInventoryData();
    }
}

function showAddCredentials() {
    hideAllContent();
    document.getElementById('addCredentialsContent').classList.remove('hidden');
    updateMenuHighlight('credentials');
}

function hideAllContent() {
    document.getElementById('customersOverviewContent').classList.add('hidden');
    document.getElementById('stockContent').classList.add('hidden');
    document.getElementById('financeContent').classList.add('hidden');
    document.getElementById('groundOperationsContent').classList.add('hidden');
    document.getElementById('inventoryManagementContent').classList.add('hidden');
    document.getElementById('addCredentialsContent').classList.add('hidden');
}

function updateMenuHighlight(activeMenu) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('dark:bg-brand-blue-600', 'dark:text-utility-white', 'active');
        item.classList.add('hover:dark:bg-dark-fill-base-600');
    });
    
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if ((activeMenu === 'customers' && onclick && onclick.includes('showCustomersOverview')) ||
            (activeMenu === 'stock' && onclick && onclick.includes('showStock')) ||
            (activeMenu === 'finance' && onclick && onclick.includes('showFinance')) ||
            (activeMenu === 'ground' && onclick && onclick.includes('showGroundOperations')) ||
            (activeMenu === 'inventory' && onclick && onclick.includes('showInventoryManagement')) ||
            (activeMenu === 'credentials' && onclick && onclick.includes('showAddCredentials'))) {
            item.classList.add('dark:bg-brand-blue-600', 'dark:text-utility-white', 'active');
            item.classList.remove('hover:dark:bg-dark-fill-base-600');
        }
    });
}

// ====================================
// SIDEBAR MANAGEMENT
// ====================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (!sidebar || !mainContent) return;
    
    sidebarExpanded = !sidebarExpanded;
    
    if (sidebarExpanded) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('expanded');
        mainContent.classList.remove('sidebar-collapsed');
        mainContent.classList.add('sidebar-expanded');
    } else {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        mainContent.classList.remove('sidebar-expanded');
        mainContent.classList.add('sidebar-collapsed');
    }
}

// ====================================
// TAB FUNCTIONS
// ====================================

function showAllTab() {
    hideAllTabContent();
    document.getElementById('allTabContent').classList.remove('hidden');
    updateTabHighlight('allTab');
    currentActiveTab = 'allTab';
    updateAllTab();
}

function showPOCTab() {
    hideAllTabContent();
    document.getElementById('pocTabContent').classList.remove('hidden');
    updateTabHighlight('pocTab');
    currentActiveTab = 'pocTab';
    updatePOCTab();
}

function showOnboardedTab() {
    hideAllTabContent();
    document.getElementById('onboardedTabContent').classList.remove('hidden');
    updateTabHighlight('onboardedTab');
    currentActiveTab = 'onboardedTab';
    updateOnboardedTab();
}

function showClosedTab() {
    hideAllTabContent();
    document.getElementById('closedTabContent').classList.remove('hidden');
    updateTabHighlight('closedTab');
    currentActiveTab = 'closedTab';
    updateClosedTab();
}

function showOngoingLeadsTab() {
    hideAllTabContent();
    document.getElementById('ongoingLeadsTabContent').classList.remove('hidden');
    updateTabHighlight('ongoingLeadsTab');
    currentActiveTab = 'ongoingLeadsTab';
    updateOngoingLeadsTab();
}

function hideAllTabContent() {
    document.getElementById('allTabContent').classList.add('hidden');
    document.getElementById('pocTabContent').classList.add('hidden');
    document.getElementById('onboardedTabContent').classList.add('hidden');
    document.getElementById('closedTabContent').classList.add('hidden');
    document.getElementById('ongoingLeadsTabContent').classList.add('hidden');
}

function updateTabHighlight(activeTabId) {
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (activeTabId) {
        const activeTab = document.getElementById(activeTabId);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }
}

// ====================================
// DATA LOADING & UPDATE FUNCTIONS
// ====================================

async function loadData() {
    try {
        // Mock data for demo
        customers = generateMockCustomers();
        leads = generateMockLeads();
        credentials = [];
        
        // Separate approved and pending customers
        approvedCustomers = customers.filter(c => c.approval_status === 'approved');
        pendingApprovals = customers.filter(c => c.approval_status === 'pending');
        
        // Initialize filtered arrays
        filteredCustomers = [...approvedCustomers];
        filteredLeads = [...leads];
        
        updateCustomerCounts();
        updateTabsContent();
        
        console.log(`✅ Loaded ${customers.length} customers (${approvedCustomers.length} approved)`);
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showEmailToast('Error loading data. Using demo mode.', 'error');
        
        // Fallback to empty data
        customers = [];
        leads = [];
        approvedCustomers = [];
        pendingApprovals = [];
        filteredCustomers = [];
        filteredLeads = [];
        
        updateCustomerCounts();
        updateTabsContent();
    }
}

function generateMockCustomers() {
    return [
        {
            id: 1,
            customer_name: "Acme Corp",
            customer_email: "contact@acmecorp.com",
            customer_mobile: "+91 9876543210",
            poc_type: "free_poc",
            status: "active",
            approval_status: "approved",
            account_manager_name: "John Doe",
            lead_sources: ["digital_marketing"],
            requirements: ["vehicle_tracking"],
            poc_start_date: "2024-01-15",
            poc_end_date: "2024-02-15",
            created_at: "2024-01-10"
        },
        {
            id: 2,
            customer_name: "TechStart Solutions",
            customer_email: "info@techstart.com",
            customer_mobile: "+91 9876543211",
            poc_type: "paid_poc",
            status: "active",
            approval_status: "approved",
            account_manager_name: "Jane Smith",
            lead_sources: ["referral"],
            requirements: ["fleet_management"],
            poc_start_date: "2024-01-20",
            poc_end_date: "2024-02-20",
            created_at: "2024-01-15"
        },
        {
            id: 3,
            customer_name: "Global Logistics",
            customer_email: "admin@globallogistics.com",
            customer_mobile: "+91 9876543212",
            poc_type: "direct_onboarding",
            status: "onboarded",
            approval_status: "approved",
            account_manager_name: "Mike Johnson",
            lead_sources: ["trade_show"],
            requirements: ["driver_behavior"],
            onboard_source: "direct",
            created_at: "2024-01-05"
        },
        {
            id: 4,
            customer_name: "Pending Customer",
            customer_email: "pending@example.com",
            customer_mobile: "+91 9876543213",
            poc_type: "free_poc",
            status: "active",
            approval_status: "pending",
            account_manager_name: "Sarah Wilson",
            lead_sources: ["cold_calling"],
            requirements: ["vehicle_tracking"],
            created_at: "2024-01-25"
        }
    ];
}

function generateMockLeads() {
    return [
        {
            id: 1,
            type: "Inbound",
            customer_name: "New Lead Corp",
            contact: "lead@newlead.com",
            fleet_size: 50,
            status: "New",
            created_at: "2024-01-20"
        },
        {
            id: 2,
            type: "Outbound",
            customer_name: "Prospect Industries",
            contact: "+91 9876543220",
            fleet_size: 25,
            status: "In Progress",
            created_at: "2024-01-18"
        }
    ];
}

function updateCustomerCounts() {
    const totalCustomers = approvedCustomers.length;
    
    // Count different categories from approved customers only
    const leadsCount = leads.filter(lead => lead.status !== 'Closed').length;
    const pocCount = approvedCustomers.filter(customer => 
        (customer.poc_type === 'free_poc' || customer.poc_type === 'paid_poc') && 
        customer.status !== 'closed'
    ).length;
    const onboardedCount = approvedCustomers.filter(customer => 
        customer.poc_type === 'direct_onboarding' || customer.status === 'onboarded'
    ).length;
    const closedCount = approvedCustomers.filter(customer => customer.status === 'closed').length;
    
    // Update main display
    const totalDisplay = document.getElementById('totalCustomersDisplay');
    if (totalDisplay) totalDisplay.textContent = totalCustomers;
    
    // Update tab counts
    updateTabCount('allCount', totalCustomers);
    updateTabCount('pocCount', pocCount);
    updateTabCount('onboardedCount', onboardedCount);
    updateTabCount('closedCount', closedCount);
    updateTabCount('ongoingLeadsCount', leadsCount);
    
    // Update finance stats
    updateFinanceStats();
}

function updateTabCount(elementId, newCount) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentCount = parseInt(element.textContent) || 0;
    
    if (currentCount !== newCount) {
        element.style.transform = 'scale(1.2)';
        element.style.transition = 'transform 0.2s ease';
        
        setTimeout(() => {
            element.textContent = newCount;
            element.style.transform = 'scale(1)';
        }, 100);
    }
}

function updateFinanceStats() {
    const pendingCount = pendingApprovals.length;
    const approvedCount = approvedCustomers.length;
    const rejectedCount = customers.filter(c => c.approval_status === 'rejected').length;
    
    const pendingElement = document.getElementById('pendingApprovalsCount');
    const approvedElement = document.getElementById('totalApprovedCount');
    const rejectedElement = document.getElementById('totalRejectedCount');
    
    if (pendingElement) pendingElement.textContent = pendingCount;
    if (approvedElement) approvedElement.textContent = approvedCount;
    if (rejectedElement) rejectedElement.textContent = rejectedCount;
}

function updateTabsContent() {
    updateAllTab();
    updatePOCTab();
    updateOnboardedTab();
    updateClosedTab();
    updateOngoingLeadsTab();
}

// ====================================
// TAB CONTENT UPDATE FUNCTIONS
// ====================================

function updateAllTab() {
    const allList = document.getElementById('allCustomersList');
    const allEmpty = document.getElementById('allEmptyState');

    if (!allList || !allEmpty) return;

    if (filteredCustomers.length === 0) {
        allList.innerHTML = '';
        allEmpty.style.display = 'block';
    } else {
        allEmpty.style.display = 'none';
        allList.innerHTML = filteredCustomers.map(customer => createCustomerRow(customer)).join('');
    }
}

function updatePOCTab() {
    const pocCustomers = filteredCustomers.filter(customer => 
        (customer.poc_type === 'free_poc' || customer.poc_type === 'paid_poc') && 
        customer.status !== 'closed' &&
        customer.approval_status === 'approved'
    );

    const pocList = document.getElementById('pocCustomersList');
    const pocEmpty = document.getElementById('pocEmptyState');

    if (!pocList || !pocEmpty) return;

    if (pocCustomers.length === 0) {
        pocList.innerHTML = '';
        pocEmpty.style.display = 'block';
    } else {
        pocEmpty.style.display = 'none';
        pocList.innerHTML = pocCustomers.map(customer => createCustomerRow(customer, true)).join('');
    }
}

function updateOnboardedTab() {
    const onboardedCustomers = filteredCustomers.filter(customer => 
        (customer.poc_type === 'direct_onboarding' || customer.status === 'onboarded') &&
        customer.approval_status === 'approved'
    );

    const onboardedList = document.getElementById('onboardedCustomersList');
    const onboardedEmpty = document.getElementById('onboardedEmptyState');

    if (!onboardedList || !onboardedEmpty) return;

    if (onboardedCustomers.length === 0) {
        onboardedList.innerHTML = '';
        onboardedEmpty.style.display = 'block';
    } else {
        onboardedEmpty.style.display = 'none';
        onboardedList.innerHTML = onboardedCustomers.map(customer => createCustomerRow(customer, false, true)).join('');
    }
}

function updateClosedTab() {
    const closedCustomers = filteredCustomers.filter(customer => 
        customer.status === 'closed' &&
        customer.approval_status === 'approved'
    );

    const closedList = document.getElementById('closedCustomersList');
    const closedEmpty = document.getElementById('closedEmptyState');

    if (!closedList || !closedEmpty) return;

    if (closedCustomers.length === 0) {
        closedList.innerHTML = '';
        closedEmpty.style.display = 'block';
    } else {
        closedEmpty.style.display = 'none';
        closedList.innerHTML = closedCustomers.map(customer => createCustomerRow(customer)).join('');
    }
}

function updateOngoingLeadsTab() {
    const activeLeads = filteredLeads.filter(lead => lead.status !== 'Closed');
    const leadsList = document.getElementById('ongoingLeadsList');
    const leadsEmpty = document.getElementById('ongoingLeadsEmptyState');

    if (!leadsList || !leadsEmpty) return;

    if (activeLeads.length === 0) {
        leadsList.innerHTML = '';
        leadsEmpty.style.display = 'block';
    } else {
        leadsEmpty.style.display = 'none';
        leadsList.innerHTML = activeLeads.map(lead => createLeadRow(lead)).join('');
    }
}

function updateFinanceTab() {
    const financeList = document.getElementById('pendingApprovalsList');
    const financeEmpty = document.getElementById('financeEmptyState');
    
    if (!financeList || !financeEmpty) return;
    
    if (pendingApprovals.length === 0) {
        financeList.innerHTML = '';
        financeEmpty.style.display = 'block';
    } else {
        financeEmpty.style.display = 'none';
        financeList.innerHTML = pendingApprovals.map(customer => createApprovalRow(customer)).join('');
    }
}

// ====================================
// ROW CREATION FUNCTIONS
// ====================================

function createCustomerRow(customer, showTimeRemaining = false, showOnboardSource = false) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status, pocType) => {
        if (status === 'closed') return '<span class="status-badge closed">Closed</span>';
        if (pocType === 'direct_onboarding') return '<span class="status-badge onboarded">Onboarded</span>';
        if (pocType === 'free_poc') return '<span class="status-badge poc">Free POC</span>';
        if (pocType === 'paid_poc') return '<span class="status-badge poc">Paid POC</span>';
        return '<span class="status-badge">Active</span>';
    };

    const getTimeRemainingBadge = (endDate) => {
        if (!endDate) return '';
        const now = new Date();
        const end = new Date(endDate);
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) return '<span class="status-badge danger">Expired</span>';
        if (diffDays <= 7) return `<span class="status-badge danger">${diffDays} days left</span>`;
        if (diffDays <= 30) return `<span class="status-badge warning">${diffDays} days left</span>`;
        return `<span class="status-badge success">${diffDays} days left</span>`;
    };

    return `
        <div class="customer-row">
            <div class="customer-info">
                <div class="device-field">
                    <div class="device-field-label">Customer Name</div>
                    <div class="device-field-value">${customer.customer_name}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Email</div>
                    <div class="device-field-value">${customer.customer_email}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Mobile</div>
                    <div class="device-field-value">${customer.customer_mobile || 'N/A'}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Status</div>
                    <div class="device-field-value">${getStatusBadge(customer.status, customer.poc_type)}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">${showOnboardSource ? 'Onboard Source' : 'POC Type'}</div>
                    <div class="device-field-value">${showOnboardSource ? (customer.onboard_source || 'N/A') : (customer.poc_type || 'N/A')}</div>
                </div>
                ${showTimeRemaining ? `
                <div class="device-field">
                    <div class="device-field-label">Time Remaining</div>
                    <div class="device-field-value">${getTimeRemainingBadge(customer.poc_end_date)}</div>
                </div>
                ` : ''}
            </div>
            <div class="device-actions">
                ${customer.status !== 'closed' && (customer.poc_type === 'free_poc' || customer.poc_type === 'paid_poc') ? `
                    <button onclick="showPOCActionModal(${JSON.stringify(customer).replace(/"/g, '&quot;')})" class="device-action-btn primary">
                        Manage POC
                    </button>
                ` : ''}
                ${customer.status !== 'closed' ? `
                    <button onclick="showManualEmailModal(${JSON.stringify(customer).replace(/"/g, '&quot;')})" class="device-action-btn success">
                        📧 Email
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function createLeadRow(lead) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString();
    };

    const getLeadStatusBadge = (status) => {
        const statusClasses = {
            'New': 'status-badge lead-new',
            'In Progress': 'status-badge lead-progress',
            'Qualified': 'status-badge lead-qualified',
            'Not Qualified': 'status-badge lead-not-qualified',
            'Converted': 'status-badge lead-converted',
            'Closed': 'status-badge lead-closed'
        };
        
        return `<span class="${statusClasses[status] || 'status-badge'}">${status}</span>`;
    };

    return `
        <div class="lead-row">
            <div class="lead-info">
                <div class="device-field">
                    <div class="device-field-label">Customer Name</div>
                    <div class="device-field-value">${lead.customer_name}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Contact</div>
                    <div class="device-field-value">${lead.contact}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Fleet Size</div>
                    <div class="device-field-value">${lead.fleet_size || 'N/A'}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Status</div>
                    <div class="device-field-value">${getLeadStatusBadge(lead.status)}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Type</div>
                    <div class="device-field-value">${lead.type}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Created</div>
                    <div class="device-field-value">${formatDate(lead.created_at)}</div>
                </div>
            </div>
            <div class="lead-actions">
                <button onclick="convertLeadToCustomer(${lead.id})" class="device-action-btn success">
                    Add to Customer
                </button>
                <button onclick="closeLeadAction(${lead.id})" class="device-action-btn danger">
                    Close Lead
                </button>
            </div>
        </div>
    `;
}

function createApprovalRow(customer) {
    return `
        <div class="approval-row" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 12px;">
            <div class="approval-info" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 16px;">
                <div class="device-field">
                    <div class="device-field-label">Customer Name</div>
                    <div class="device-field-value">${customer.customer_name}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Email</div>
                    <div class="device-field-value">${customer.customer_email}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">POC Type</div>
                    <div class="device-field-value">${customer.poc_type}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Account Manager</div>
                    <div class="device-field-value">${customer.account_manager_name}</div>
                </div>
            </div>
            <div class="approval-actions" style="display: flex; gap: 8px;">
                <button onclick="approveCustomer(${customer.id})" class="device-action-btn success">
                    ✅ Approve
                </button>
                <button onclick="rejectCustomer(${customer.id})" class="device-action-btn danger">
                    ❌ Reject
                </button>
            </div>
        </div>
    `;
}

// ====================================
// CUSTOMER DROPDOWN FUNCTIONS
// ====================================

function toggleCustomerDropdown() {
    const dropdown = document.getElementById('customerDropdown');
    if (!dropdown) return;
    
    if (customerDropdownOpen) {
        closeCustomerDropdown();
    } else {
        openCustomerDropdown();
    }
}

function openCustomerDropdown() {
    const dropdown = document.getElementById('customerDropdown');
    if (!dropdown) return;
    
    dropdown.classList.remove('hidden');
    customerDropdownOpen = true;
    
    populateCustomerDropdownList();
    
    const searchInput = document.getElementById('customerSearchInput');
    if (searchInput) {
        setTimeout(() => searchInput.focus(), 100);
    }
}

function closeCustomerDropdown() {
    const dropdown = document.getElementById('customerDropdown');
    if (!dropdown) return;
    
    dropdown.classList.add('hidden');
    customerDropdownOpen = false;
    
    const searchInput = document.getElementById('customerSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
}

function populateCustomerDropdownList() {
    const listContainer = document.getElementById('customerDropdownList');
    if (!listContainer) return;
    
    const searchInput = document.getElementById('customerSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let customersToShow = approvedCustomers;
    
    if (searchTerm) {
        customersToShow = approvedCustomers.filter(customer => 
            customer.customer_name.toLowerCase().includes(searchTerm) ||
            customer.customer_email.toLowerCase().includes(searchTerm)
        );
    }
    
    if (customersToShow.length === 0) {
        listContainer.innerHTML = `
            <div class="p-4 text-center text-body-m-regular dark:text-dark-base-500">
                ${searchTerm ? 'No customers found' : 'No customers available'}
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = customersToShow.map(customer => `
        <div class="p-3 hover:dark:bg-dark-fill-base-600 cursor-pointer transition-colors duration-200" onclick="selectCustomerFromDropdown(${customer.id})">
            <div class="text-body-m-semibold dark:text-dark-base-600">${customer.customer_name}</div>
            <div class="text-body-s-regular dark:text-dark-base-500">${customer.customer_email}</div>
        </div>
    `).join('');
}

function selectCustomerFromDropdown(customerId) {
    const customer = approvedCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    showEmailToast(`Selected: ${customer.customer_name}`);
    closeCustomerDropdown();
}

// ====================================
// ADD MENU FUNCTIONS
// ====================================

function toggleAddMenu() {
    if (addMenuOpen) {
        closeAddMenu();
    } else {
        openAddMenu();
    }
}

function openAddMenu() {
    const addMenu = document.getElementById('addMenu');
    const addIcon = document.getElementById('addIcon');
    
    if (addMenu) {
        addMenu.classList.remove('hidden');
        addMenuOpen = true;
    }
    
    if (addIcon) {
        addIcon.style.transform = 'rotate(45deg)';
    }
}

function closeAddMenu() {
    const addMenu = document.getElementById('addMenu');
    const addIcon = document.getElementById('addIcon');
    
    if (addMenu) {
        addMenu.classList.add('hidden');
        addMenuOpen = false;
    }
    
    if (addIcon) {
        addIcon.style.transform = 'rotate(0deg)';
    }
}

// ====================================
// FORM HANDLING FUNCTIONS
// ====================================

function showAddLeadForm() {
    closeAddMenu();
    document.getElementById('addLeadModal').classList.remove('hidden');
}

function closeAddLeadForm() {
    document.getElementById('addLeadModal').classList.add('hidden');
    document.getElementById('addLeadForm').reset();
}

function showAddCustomerForm() {
    closeAddMenu();
    document.getElementById('addCustomerModal').classList.remove('hidden');
    goToStep1();
}

function closeAddCustomerForm() {
    document.getElementById('addCustomerModal').classList.add('hidden');
    document.getElementById('addCustomerForm').reset();
    const customDurationDiv = document.getElementById('customDurationDiv');
    if (customDurationDiv) {
        customDurationDiv.classList.add('hidden');
    }
    goToStep1();
}

function goToStep2() {
    const form = document.getElementById('addCustomerForm');
    
    const managerNameField = form.querySelector('input[name="accountManagerName"]');
    const managerIdField = form.querySelector('input[name="accountManagerId"]');
    const custNameField = form.querySelector('input[name="customerName"]');
    const custMobileField = form.querySelector('input[name="customerMobile"]');
    const custEmailField = form.querySelector('input[name="customerEmail"]');
    
    const managerName = managerNameField ? managerNameField.value.trim() : '';
    const managerId = managerIdField ? managerIdField.value.trim() : '';
    const custName = custNameField ? custNameField.value.trim() : '';
    const custMobile = custMobileField ? custMobileField.value.trim() : '';
    const custEmail = custEmailField ? custEmailField.value.trim() : '';
    
    if (!managerName || !managerId || !custName || !custMobile || !custEmail) {
        alert('Please fill in all required fields before proceeding to step 2.');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(custEmail)) {
        alert('Please enter a valid email address.');
        return;
    }
    
    document.getElementById('step1Content').classList.add('hidden');
    document.getElementById('step2Content').classList.remove('hidden');
    
    document.getElementById('step1Indicator').classList.remove('active');
    document.getElementById('step1Indicator').classList.add('completed');
    document.getElementById('step2Indicator').classList.add('active');
}

function goToStep1() {
    document.getElementById('step2Content').classList.add('hidden');
    document.getElementById('step1Content').classList.remove('hidden');
    
    document.getElementById('step2Indicator').classList.remove('active');
    document.getElementById('step1Indicator').classList.remove('completed');
    document.getElementById('step1Indicator').classList.add('active');
}

function toggleCustomDuration(select) {
    const customDiv = document.getElementById('customDurationDiv');
    if (customDiv) {
        if (select.value === 'custom') {
            customDiv.classList.remove('hidden');
        } else {
            customDiv.classList.add('hidden');
        }
    }
}

async function handleAddLead(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const leadData = {
        id: leads.length + 1,
        type: formData.get('type'),
        customer_name: formData.get('customerName'),
        contact: formData.get('contact'),
        fleet_size: parseInt(formData.get('fleetSize')),
        status: formData.get('status'),
        created_at: new Date().toISOString()
    };

    leads.push(leadData);
    filteredLeads = [...leads];
    
    showEmailToast(`Lead "${leadData.customer_name}" added successfully`);
    closeAddLeadForm();
    updateCustomerCounts();
    updateTabsContent();
}

async function handleAddCustomer(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    const leadSources = [];
    const leadSourceCheckboxes = document.querySelectorAll('input[name="leadSource"]:checked');
    leadSourceCheckboxes.forEach(checkbox => {
        leadSources.push(checkbox.value);
    });

    const requirements = [];
    const requirementCheckboxes = document.querySelectorAll('input[name="requirements"]:checked');
    requirementCheckboxes.forEach(checkbox => {
        requirements.push(checkbox.value);
    });

    let pocDuration = parseInt(formData.get('pocDuration'));
    if (formData.get('pocDuration') === 'custom') {
        pocDuration = parseInt(formData.get('customDuration')) || 30;
    }

    const customerData = {
        id: customers.length + 1,
        account_manager_name: formData.get('accountManagerName'),
        account_manager_id: formData.get('accountManagerId'),
        customer_name: formData.get('customerName'),
        customer_mobile: formData.get('customerMobile'),
        customer_email: formData.get('customerEmail'),
        lead_sources: leadSources,
        requirements: requirements,
        poc_type: formData.get('pocType'),
        poc_duration: pocDuration,
        poc_start_date: formData.get('pocStartDate') || null,
        poc_end_date: null,
        status: formData.get('pocType') === 'direct_onboarding' ? 'onboarded' : 'active',
        onboard_source: formData.get('pocType') === 'direct_onboarding' ? 'direct' : 'poc_conversion',
        approval_status: 'pending',
        extension_count: 0,
        poc_extended_days: 0,
        email_notifications_sent: 0,
        created_at: new Date().toISOString()
    };

    customers.push(customerData);
    pendingApprovals = customers.filter(c => c.approval_status === 'pending');
    
    showEmailToast(`Customer "${customerData.customer_name}" submitted for approval`);
    closeAddCustomerForm();
    updateCustomerCounts();
    updateTabsContent();
    showFinance();
}

// ====================================
// POC ACTION MODAL FUNCTIONS
// ====================================

function showPOCActionModal(customer) {
    const modalHTML = `
        <div id="pocActionModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="dark:bg-dark-fill-base-300 rounded-lg p-6 w-full max-w-md">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-heading-6 dark:text-dark-base-600">Manage POC</h2>
                    <button onclick="closePOCActionModal()" class="p-2 rounded-lg hover:dark:bg-dark-fill-base-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-base-600">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <h3 class="text-body-l-semibold dark:text-dark-base-600">${customer.customer_name}</h3>
                    <p class="text-body-m-regular dark:text-dark-base-500">POC Type: ${customer.poc_type}</p>
                    
                    <div class="space-y-2">
                        <button onclick="extendPOC(${customer.id})" class="w-full p-3 rounded-lg dark:bg-brand-blue-600 dark:text-utility-white hover:dark:bg-brand-blue-500 transition-colors duration-200">
                            📅 Extend POC
                        </button>
                        <button onclick="convertToOnboarded(${customer.id})" class="w-full p-3 rounded-lg dark:bg-dark-success-600 dark:text-utility-white hover:dark:bg-green-600 transition-colors duration-200">
                            ✅ Convert to Onboarded
                        </button>
                        <button onclick="endPOC(${customer.id})" class="w-full p-3 rounded-lg dark:bg-dark-semantic-danger-300 dark:text-utility-white hover:dark:bg-red-600 transition-colors duration-200">
                            ❌ End POC
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closePOCActionModal() {
    const modal = document.getElementById('pocActionModal');
    if (modal) modal.remove();
}

function showManualEmailModal(customer) {
    const modalHTML = `
        <div id="manualEmailModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="dark:bg-dark-fill-base-300 rounded-lg p-6 w-full max-w-lg">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-heading-6 dark:text-dark-base-600">Send Email</h2>
                    <button onclick="closeManualEmailModal()" class="p-2 rounded-lg hover:dark:bg-dark-fill-base-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-base-600">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="manualEmailForm" class="space-y-4">
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">To:</label>
                        <input type="email" value="${customer.customer_email}" readonly class="w-full p-3 rounded-lg border dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600">
                    </div>
                    
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Subject:</label>
                        <input type="text" name="subject" class="w-full p-3 rounded-lg border dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600 outline-none" placeholder="Enter email subject" required>
                    </div>
                    
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Message:</label>
                        <textarea name="message" rows="4" class="w-full p-3 rounded-lg border dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600 outline-none" placeholder="Enter your message" required></textarea>
                    </div>
                    
                    <div class="flex gap-4">
                        <button type="submit" class="flex-1 p-3 rounded-lg dark:bg-brand-blue-600 dark:text-utility-white hover:dark:bg-brand-blue-500 transition-colors duration-200">
                            📧 Send Email
                        </button>
                        <button type="button" onclick="closeManualEmailModal()" class="flex-1 p-3 rounded-lg dark:bg-dark-stroke-base-400 dark:text-dark-base-600 hover:dark:bg-dark-stroke-base-600 transition-colors duration-200">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('manualEmailForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        console.log('Sending email to:', customer.customer_email);
        console.log('Subject:', formData.get('subject'));
        console.log('Message:', formData.get('message'));
        
        showEmailToast(`Email sent to ${customer.customer_name}`);
        closeManualEmailModal();
    });
}

function closeManualEmailModal() {
    const modal = document.getElementById('manualEmailModal');
    if (modal) modal.remove();
}

// ====================================
// POC ACTIONS
// ====================================

function extendPOC(customerId) {
    const days = prompt('Enter extension days:', '30');
    if (!days) return;
    
    const customer = approvedCustomers.find(c => c.id === customerId);
    if (customer) {
        customer.extension_count = (customer.extension_count || 0) + 1;
        customer.poc_extended_days = (customer.poc_extended_days || 0) + parseInt(days);
        
        showEmailToast(`POC extended by ${days} days for ${customer.customer_name}`);
        closePOCActionModal();
        loadData();
    }
}

function convertToOnboarded(customerId) {
    if (!confirm('Convert this POC customer to onboarded?')) return;
    
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        customer.status = 'onboarded';
        customer.poc_type = 'converted_to_onboarded';
        
        approvedCustomers = customers.filter(c => c.approval_status === 'approved');
        filteredCustomers = [...approvedCustomers];
        
        showEmailToast(`${customer.customer_name} converted to onboarded customer`);
        closePOCActionModal();
        updateCustomerCounts();
        updateTabsContent();
    }
}

function endPOC(customerId) {
    if (!confirm('Are you sure you want to end this POC?')) return;
    
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        customer.status = 'closed';
        
        approvedCustomers = customers.filter(c => c.approval_status === 'approved');
        filteredCustomers = [...approvedCustomers];
        
        showEmailToast(`POC ended for ${customer.customer_name}`);
        closePOCActionModal();
        updateCustomerCounts();
        updateTabsContent();
    }
}

// ====================================
// FINANCE APPROVAL FUNCTIONS
// ====================================

function approveCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        customer.approval_status = 'approved';
        
        // Set POC end date if applicable
        if (customer.poc_start_date && customer.poc_duration) {
            const startDate = new Date(customer.poc_start_date);
            const endDate = new Date(startDate.getTime() + (customer.poc_duration * 24 * 60 * 60 * 1000));
            customer.poc_end_date = endDate.toISOString().split('T')[0];
        }
        
        approvedCustomers = customers.filter(c => c.approval_status === 'approved');
        pendingApprovals = customers.filter(c => c.approval_status === 'pending');
        filteredCustomers = [...approvedCustomers];
        
        showEmailToast(`Customer "${customer.customer_name}" approved successfully`);
        updateCustomerCounts();
        updateTabsContent();
        updateFinanceTab();
    }
}

function rejectCustomer(customerId) {
    if (!confirm('Are you sure you want to reject this customer?')) return;
    
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        customer.approval_status = 'rejected';
        
        pendingApprovals = customers.filter(c => c.approval_status === 'pending');
        
        showEmailToast(`Customer "${customer.customer_name}" rejected`);
        updateCustomerCounts();
        updateFinanceTab();
    }
}

// ====================================
// LEAD MANAGEMENT
// ====================================

function convertLeadToCustomer(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const customerData = {
        id: customers.length + 1,
        account_manager_name: 'Lead Converter',
        account_manager_id: 'LC001',
        customer_name: lead.customer_name,
        customer_mobile: lead.contact.includes('@') ? '' : lead.contact,
        customer_email: lead.contact.includes('@') ? lead.contact : `${lead.customer_name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        lead_sources: ['lead_conversion'],
        requirements: [],
        poc_type: 'free_poc',
        poc_duration: 30,
        poc_start_date: new Date().toISOString().split('T')[0],
        poc_end_date: null,
        status: 'active',
        onboard_source: 'lead_conversion',
        approval_status: 'pending',
        extension_count: 0,
        poc_extended_days: 0,
        email_notifications_sent: 0,
        created_at: new Date().toISOString()
    };

    customers.push(customerData);
    pendingApprovals = customers.filter(c => c.approval_status === 'pending');
    
    lead.status = 'Converted';
    filteredLeads = [...leads];
    
    showEmailToast(`Lead converted to customer: ${lead.customer_name}. Awaiting approval.`);
    updateCustomerCounts();
    updateTabsContent();
    showFinance();
}

function closeLeadAction(leadId) {
    if (confirm('Are you sure you want to close this lead?')) {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
            lead.status = 'Closed';
            filteredLeads = [...leads];
            
            showEmailToast('Lead closed successfully');
            updateCustomerCounts();
            updateTabsContent();
        }
    }
}

// ====================================
// SEARCH FUNCTIONALITY
// ====================================

function handleSearch(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300);
}

function performSearch(query) {
    currentFilter = query;
    const searchTerm = query.toLowerCase();
    
    if (!searchTerm) {
        filteredCustomers = [...approvedCustomers];
        filteredLeads = [...leads];
    } else {
        filteredCustomers = approvedCustomers.filter(customer => {
            return (
                customer.customer_name.toLowerCase().includes(searchTerm) ||
                customer.customer_email.toLowerCase().includes(searchTerm) ||
                customer.customer_mobile.toLowerCase().includes(searchTerm) ||
                customer.account_manager_name.toLowerCase().includes(searchTerm) ||
                customer.poc_type.toLowerCase().includes(searchTerm) ||
                (customer.status && customer.status.toLowerCase().includes(searchTerm))
            );
        });

        filteredLeads = leads.filter(lead => {
            return (
                lead.customer_name.toLowerCase().includes(searchTerm) ||
                lead.contact.toLowerCase().includes(searchTerm) ||
                lead.status.toLowerCase().includes(searchTerm) ||
                lead.type.toLowerCase().includes(searchTerm)
            );
        });

        showSearchResults(searchTerm);
    }
    
    updateTabsContent();
}

function showSearchResults(searchTerm) {
    const totalResults = filteredCustomers.length + filteredLeads.length;
    
    if (totalResults === 0) {
        showEmailToast(`No results found for "${searchTerm}"`);
    } else {
        showEmailToast(`Found ${totalResults} result(s) for "${searchTerm}"`);
    }
    
    const searchInput = document.getElementById('searchInput');
    searchInput.style.borderColor = totalResults > 0 ? '#10b981' : '#ef4444';
    
    setTimeout(() => {
        searchInput.style.borderColor = '';
    }, 2000);
}

function clearSearch() {
    currentFilter = '';
    document.getElementById('searchInput').value = '';
    filteredCustomers = [...approvedCustomers];
    filteredLeads = [...leads];
    
    updateTabsContent();
    showAllTab();
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

function showEmailToast(message, type = 'success') {
    // Create toast if it doesn't exist
    let toast = document.getElementById('emailToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'emailToast';
        toast.className = 'fixed top-4 right-4 z-50 hidden';
        toast.innerHTML = `
            <div class="dark:bg-dark-fill-base-300 dark:border dark:border-dark-stroke-contrast-400 rounded-lg p-4 shadow-lg max-w-sm">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-success-600">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p id="toastMessage" class="text-body-m-regular dark:text-dark-base-600"></p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(toast);
    }
    
    const messageEl = document.getElementById('toastMessage');
    if (messageEl) {
        messageEl.textContent = message;
    }
    
    // Update icon color based on type
    const icon = toast.querySelector('svg');
    if (icon) {
        if (type === 'error') {
            icon.className = 'dark:text-dark-semantic-danger-300';
            icon.innerHTML = '<path d="m21 21-9-9m0 0L3 3m9 9 9-9m-9 9-9 9"/>';
        } else {
            icon.className = 'dark:text-dark-success-600';
            icon.innerHTML = '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>';
        }
    }
    
    toast.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ====================================
// MOCK FUNCTIONS FOR MISSING FEATURES
// ====================================

function setupRealtimeListeners() {
    console.log('📡 Realtime listeners setup (demo mode)');
}

function checkExpiredPOCs() {
    console.log('⏰ Checking expired POCs (demo mode)');
}

function checkPOCReminders() {
    console.log('🔔 Checking POC reminders (demo mode)');
}

function startEmailScheduler() {
    console.log('📧 Email scheduler started (demo mode)');
}

// ====================================
// GLOBAL FUNCTION EXPORTS
// ====================================

// Make functions globally available
window.showCustomersOverview = showCustomersOverview;
window.showStock = showStock;
window.showFinance = showFinance;
window.showGroundOperations = showGroundOperations;
window.showInventoryManagement = showInventoryManagement;
window.showAddCredentials = showAddCredentials;
window.showAllTab = showAllTab;
window.showPOCTab = showPOCTab;
window.showOnboardedTab = showOnboardedTab;
window.showClosedTab = showClosedTab;
window.showOngoingLeadsTab = showOngoingLeadsTab;
window.toggleCustomerDropdown = toggleCustomerDropdown;
window.selectCustomerFromDropdown = selectCustomerFromDropdown;
window.toggleAddMenu = toggleAddMenu;
window.showAddLeadForm = showAddLeadForm;
window.closeAddLeadForm = closeAddLeadForm;
window.showAddCustomerForm = showAddCustomerForm;
window.closeAddCustomerForm = closeAddCustomerForm;
window.goToStep1 = goToStep1;
window.goToStep2 = goToStep2;
window.toggleCustomDuration = toggleCustomDuration;
window.convertLeadToCustomer = convertLeadToCustomer;
window.closeLeadAction = closeLeadAction;
window.clearSearch = clearSearch;
window.logout = logout;
window.showPOCActionModal = showPOCActionModal;
window.closePOCActionModal = closePOCActionModal;
window.showManualEmailModal = showManualEmailModal;
window.closeManualEmailModal = closeManualEmailModal;
window.extendPOC = extendPOC;
window.endPOC = endPOC;
window.convertToOnboarded = convertToOnboarded;
window.approveCustomer = approveCustomer;
window.rejectCustomer = rejectCustomer;
window.showEmailToast = showEmailToast;
