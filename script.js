// ====================================
// CAUTIO DASHBOARD - MAIN SCRIPT - COMPLETE FIXED VERSION
// ====================================

// Supabase Configuration
const supabaseUrl = 'https://jcmjazindwonrplvjwxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbWphemluZHdvbnJwbHZqd3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDEyNjMsImV4cCI6MjA3Mjg3NzI2M30.1B6sKnzrzdNFhvQUXVnRzzQnItFMaIFL0Y9WK_Gie9g';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Global variables
let sidebarExpanded = false;
let customers = [];
let leads = [];
let credentials = [];
let scheduledEmails = [];
let pendingApprovals = [];
let approvedCustomers = []; // Only approved customers
let filteredCustomers = [];
let filteredLeads = [];
let currentFilter = '';
let currentPOCAction = null;
let currentEmailTarget = null;
let userSession = null;
let searchTimeout = null;
let currentActiveTab = 'allTab'; // Track active tab
let customerDropdownOpen = false; // Track dropdown state
let addMenuOpen = false; // Track add menu state

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    updateTabHighlight('allTab'); // Start with All tab
    
    // Check for existing session
    checkUserSession();
    
    loadData();
    checkExpiredPOCs();
    setupEventListeners();
    setupRealtimeListeners();
    checkPOCReminders();
    
    // Start email scheduler
    startEmailScheduler();
    
    // Auto-save session every 30 seconds
    setInterval(saveUserSession, 30000);

    // Setup click outside listeners
    setupClickOutsideListeners();
    
    // Initialize inventory and stock modules
    if (typeof initializeInventoryManagement === 'function') {
        initializeInventoryManagement();
    }
    if (typeof initializeStockManagement === 'function') {
        initializeStockManagement();
    }
});

// Setup click outside listeners for dropdowns and menus
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
// CUSTOMER DROPDOWN FUNCTIONS - FIXED
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
    
    // Populate customer list
    populateCustomerDropdownList();
    
    // Focus search input
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
    
    // Clear search
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
    
    // Show customer details or perform action
    showEmailToast(`Selected: ${customer.customer_name}`);
    closeCustomerDropdown();
    
    // You can add more functionality here like showing customer details modal
}

// Setup customer search
document.addEventListener('DOMContentLoaded', function() {
    const customerSearchInput = document.getElementById('customerSearchInput');
    if (customerSearchInput) {
        customerSearchInput.addEventListener('input', function() {
            populateCustomerDropdownList();
        });
    }
});

// ====================================
// ADD MENU FUNCTIONS - FIXED
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
// NAVIGATION FUNCTIONS - FIXED
// ====================================

function showCustomersOverview() {
    hideAllContent();
    document.getElementById('customersOverviewContent').classList.remove('hidden');
    updateMenuHighlight('customers');
}

// FIXED: Missing showStock function
function showStock() {
    hideAllContent();
    document.getElementById('stockContent').classList.remove('hidden');
    updateMenuHighlight('stock');
    // Load stock data when showing
    if (typeof loadStockData === 'function') {
        loadStockData();
    }
}

function showFinance() {
    hideAllContent();
    document.getElementById('financeContent').classList.remove('hidden');
    updateMenuHighlight('finance');
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
    // Load inventory data when showing
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
// TAB FUNCTIONS - FIXED
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

// FIXED: Complete showOngoingLeadsTab function
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
                <div class="device-field">
                    <div class="device-field-label">Time Remaining</div>
                    <div class="device-field-value">${showTimeRemaining ? getTimeRemainingBadge(customer.poc_end_date) : ''}</div>
                </div>
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

// ====================================
// SESSION MANAGEMENT
// ====================================

function saveUserSession() {
    if (userSession) {
        localStorage.setItem('cautio_user_session', JSON.stringify({
            user: userSession,
            timestamp: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
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
                navigateToDashboard();
                showSessionRestored();
            } else {
                localStorage.removeItem('cautio_user_session');
            }
        } catch (error) {
            console.error('Error parsing session:', error);
            localStorage.removeItem('cautio_user_session');
        }
    }
}

function clearUserSession() {
    userSession = null;
    localStorage.removeItem('cautio_user_session');
}

function showSessionRestored() {
    showEmailToast(`Welcome back, ${userSession.full_name || userSession.email}!`);
}

// ====================================
// SIDEBAR MANAGEMENT
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
// AUTHENTICATION
// ====================================

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            alert('Login failed: ' + error.message);
            return;
        }

        userSession = data.user;
        saveUserSession();
        navigateToDashboard();
        showEmailToast('Login successful!');
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

function navigateToDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        clearUserSession();
        document.getElementById('dashboardContainer').classList.add('hidden');
        document.getElementById('loginPage').classList.remove('hidden');
        showEmailToast('Logged out successfully');
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
        // Filter customers
        filteredCustomers = approvedCustomers.filter(customer => {
            return (
                customer.customer_name.toLowerCase().includes(searchTerm) ||
                customer.customer_email.toLowerCase().includes(searchTerm) ||
                customer.customer_mobile.toLowerCase().includes(searchTerm) ||
                customer.account_manager_name.toLowerCase().includes(searchTerm) ||
                (customer.lead_sources && customer.lead_sources.some(source => 
                    source.toLowerCase().includes(searchTerm)
                )) ||
                (customer.requirements && customer.requirements.some(req => 
                    req.toLowerCase().includes(searchTerm)
                )) ||
                customer.poc_type.toLowerCase().includes(searchTerm) ||
                (customer.status && customer.status.toLowerCase().includes(searchTerm))
            );
        });

        // Filter leads
        filteredLeads = leads.filter(lead => {
            return (
                lead.customer_name.toLowerCase().includes(searchTerm) ||
                lead.contact.toLowerCase().includes(searchTerm) ||
                lead.status.toLowerCase().includes(searchTerm) ||
                lead.type.toLowerCase().includes(searchTerm) ||
                (lead.fleet_size && lead.fleet_size.toString().includes(searchTerm))
            );
        });

        showSearchResults(searchTerm);
    }
    
    // Update all tabs content
    updateTabsContent();
}

function showSearchResults(searchTerm) {
    const totalResults = filteredCustomers.length + filteredLeads.length;
    
    if (totalResults === 0) {
        showEmailToast(`No results found for "${searchTerm}"`);
    } else {
        showEmailToast(`Found ${totalResults} result(s) for "${searchTerm}"`);
    }
    
    // Add visual feedback to search input
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
    
    // Show All tab
    showAllTab();
}

// ====================================
// DATA LOADING FUNCTIONS
// ====================================

async function loadData() {
    try {
        await Promise.all([
            loadCustomers(),
            loadLeads(),
            loadCredentials()
        ]);
        
        // Initialize filtered arrays
        filteredCustomers = [...approvedCustomers];
        filteredLeads = [...leads];
        
        updateCustomerCounts();
        updateTabsContent();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showEmailToast('Error loading data. Please refresh the page.', 'error');
    }
}

async function loadCustomers() {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        customers = data || [];
        
        // Separate approved and pending customers
        approvedCustomers = customers.filter(c => c.approval_status === 'approved');
        pendingApprovals = customers.filter(c => c.approval_status === 'pending');
        
        console.log(`Loaded ${customers.length} customers (${approvedCustomers.length} approved)`);
        
    } catch (error) {
        console.error('Error loading customers:', error);
        throw error;
    }
}

async function loadLeads() {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        leads = data || [];
        console.log(`Loaded ${leads.length} leads`);
        
    } catch (error) {
        console.error('Error loading leads:', error);
        throw error;
    }
}

async function loadCredentials() {
    try {
        const { data, error } = await supabase
            .from('credentials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        credentials = data || [];
        console.log(`Loaded ${credentials.length} credentials`);
        
    } catch (error) {
        console.error('Error loading credentials:', error);
        throw error;
    }
}

// ====================================
// CUSTOMER COUNTS AND UPDATES
// ====================================

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
    document.getElementById('totalCustomersDisplay').textContent = totalCustomers;
    
    // Update tab counts with animation
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
// FORM HANDLING
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

// Step navigation functions
function goToStep2() {
    // Simple validation - just check if key fields have something
    const form = document.getElementById('addCustomerForm');
    
    // Get field values using a safer method
    const managerNameField = form.querySelector('input[name="accountManagerName"]');
    const managerIdField = form.querySelector('input[name="accountManagerId"]');
    const custNameField = form.querySelector('input[name="customerName"]');
    const custMobileField = form.querySelector('input[name="customerMobile"]');
    const custEmailField = form.querySelector('input[name="customerEmail"]');
    
    // Get values safely
    const managerName = managerNameField ? managerNameField.value.trim() : '';
    const managerId = managerIdField ? managerIdField.value.trim() : '';
    const custName = custNameField ? custNameField.value.trim() : '';
    const custMobile = custMobileField ? custMobileField.value.trim() : '';
    const custEmail = custEmailField ? custEmailField.value.trim() : '';
    
    // Simple validation
    if (!managerName || !managerId || !custName || !custMobile || !custEmail) {
        alert('Please fill in all required fields before proceeding to step 2.');
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(custEmail)) {
        alert('Please enter a valid email address.');
        return;
    }
    
    // Proceed to step 2
    document.getElementById('step1Content').classList.add('hidden');
    document.getElementById('step2Content').classList.remove('hidden');
    
    // Update step indicator
    document.getElementById('step1Indicator').classList.remove('active');
    document.getElementById('step1Indicator').classList.add('completed');
    document.getElementById('step2Indicator').classList.add('active');
}

function goToStep1() {
    document.getElementById('step2Content').classList.add('hidden');
    document.getElementById('step1Content').classList.remove('hidden');
    
    // Update step indicator
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
        type: formData.get('type'),
        customer_name: formData.get('customerName'),
        contact: formData.get('contact'),
        fleet_size: parseInt(formData.get('fleetSize')),
        status: formData.get('status'),
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('leads')
            .insert([leadData]);

        if (error) {
            console.error('Error saving lead:', error);
            alert('Error saving lead: ' + error.message);
        } else {
            alert('Lead saved successfully!');
            closeAddLeadForm();
            loadData();
            showEmailToast(`Lead "${leadData.customer_name}" added successfully`);
        }
    } catch (error) {
        console.error('Error saving lead:', error);
        alert('Error saving lead');
    }
}

async function handleAddCustomer(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Get selected lead sources
    const leadSources = [];
    const leadSourceCheckboxes = document.querySelectorAll('input[name="leadSource"]:checked');
    leadSourceCheckboxes.forEach(checkbox => {
        leadSources.push(checkbox.value);
    });

    // Get selected requirements
    const requirements = [];
    const requirementCheckboxes = document.querySelectorAll('input[name="requirements"]:checked');
    requirementCheckboxes.forEach(checkbox => {
        requirements.push(checkbox.value);
    });

    // Get POC duration
    let pocDuration = parseInt(formData.get('pocDuration'));
    if (formData.get('pocDuration') === 'custom') {
        pocDuration = parseInt(formData.get('customDuration')) || 30;
    }

    const customerData = {
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
        poc_end_date: null, // Will be set after approval
        status: formData.get('pocType') === 'direct_onboarding' ? 'onboarded' : 'active',
        onboard_source: formData.get('pocType') === 'direct_onboarding' ? 'direct' : 'poc_conversion',
        approval_status: 'pending',
        extension_count: 0,
        poc_extended_days: 0,
        email_notifications_sent: 0,
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('customers')
            .insert([customerData])
            .select();

        if (error) {
            console.error('Error saving customer:', error);
            alert('Error saving customer: ' + error.message);
        } else {
            alert('Customer submitted successfully! Awaiting finance approval.');
            closeAddCustomerForm();
            loadData();
            
            // Navigate to Finance tab to show the pending approval
            showFinance();
            
            showEmailToast(`Customer "${customerData.customer_name}" submitted for approval`);
        }
    } catch (error) {
        console.error('Error saving customer:', error);
        alert('Error saving customer');
    }
}

// ====================================
// LEAD MANAGEMENT
// ====================================

async function convertLeadToCustomer(leadId) {
    try {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;

        // Create customer from lead data with pending approval status
        const customerData = {
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

        const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert([customerData])
            .select()
            .single();

        if (customerError) {
            console.error('Error creating customer:', customerError);
            alert('Error creating customer: ' + customerError.message);
            return;
        }

        // Mark lead as converted
        const { error: leadError } = await supabase
            .from('leads')
            .update({ status: 'Converted' })
            .eq('id', leadId);

        if (leadError) {
            console.error('Error updating lead:', leadError);
        }

        loadData();
        
        // Navigate to Finance tab to show the pending approval
        showFinance();
        
        showEmailToast(`Lead converted to customer: ${lead.customer_name}. Awaiting approval.`);
        
    } catch (error) {
        console.error('Error converting lead:', error);
        alert('Error converting lead');
    }
}

async function closeLeadAction(leadId) {
    if (confirm('Are you sure you want to close this lead?')) {
        try {
            const { error } = await supabase
                .from('leads')
                .update({ status: 'Closed' })
                .eq('id', leadId);

            if (error) {
                console.error('Error closing lead:', error);
                alert('Error closing lead: ' + error.message);
            } else {
                loadData();
                showEmailToast('Lead closed successfully');
            }
        } catch (error) {
            console.error('Error closing lead:', error);
            alert('Error closing lead');
        }
    }
}

// ====================================
// REALTIME LISTENERS
// ====================================

function setupRealtimeListeners() {
    // Listen for customer changes
    supabase
        .channel('customers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, 
            (payload) => {
                console.log('Customer change received!', payload);
                loadData();
            }
        )
        .subscribe();

    // Listen for lead changes
    supabase
        .channel('leads')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, 
            (payload) => {
                console.log('Lead change received!', payload);
                loadData();
            }
        )
        .subscribe();
}

// ====================================
// POC MANAGEMENT FUNCTIONS
// ====================================

function checkExpiredPOCs() {
    // Check for expired POCs every hour
    setInterval(async () => {
        try {
            const now = new Date();
            const expiredPOCs = approvedCustomers.filter(customer => {
                if (!customer.poc_end_date || customer.status === 'closed') return false;
                const endDate = new Date(customer.poc_end_date);
                return endDate <= now;
            });

            for (const customer of expiredPOCs) {
                // Send expiry notification
                await sendEmail('poc_expired', customer);
                
                // Update status
                await supabase
                    .from('customers')
                    .update({ status: 'expired' })
                    .eq('id', customer.id);
            }
            
            if (expiredPOCs.length > 0) {
                loadData();
                showEmailToast(`${expiredPOCs.length} POC(s) have expired`);
            }
            
        } catch (error) {
            console.error('Error checking expired POCs:', error);
        }
    }, 60 * 60 * 1000); // Check every hour
}

function checkPOCReminders() {
    // Check for POC reminders every day
    setInterval(async () => {
        try {
            const now = new Date();
            const reminderDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
            
            const upcomingExpiry = approvedCustomers.filter(customer => {
                if (!customer.poc_end_date || customer.status === 'closed') return false;
                const endDate = new Date(customer.poc_end_date);
                return endDate <= reminderDate && endDate > now;
            });

            for (const customer of upcomingExpiry) {
                await sendEmail('poc_reminder', customer);
            }
            
        } catch (error) {
            console.error('Error checking POC reminders:', error);
        }
    }, 24 * 60 * 60 * 1000); // Check daily
}

// ====================================
// EMAIL FUNCTIONS
// ====================================

function startEmailScheduler() {
    // Start email scheduler every 5 minutes
    setInterval(async () => {
        await processScheduledEmails();
    }, 5 * 60 * 1000);
}

async function processScheduledEmails() {
    try {
        const now = new Date();
        const { data: scheduledEmails, error } = await supabase
            .from('scheduled_emails')
            .select('*')
            .lte('scheduled_time', now.toISOString())
            .eq('status', 'pending');

        if (error) throw error;

        for (const email of scheduledEmails) {
            try {
                // Process email
                await sendEmail(email.email_type, JSON.parse(email.customer_data));
                
                // Mark as sent
                await supabase
                    .from('scheduled_emails')
                    .update({ status: 'sent', sent_at: now.toISOString() })
                    .eq('id', email.id);
                    
            } catch (emailError) {
                console.error('Error sending scheduled email:', emailError);
                
                // Mark as failed
                await supabase
                    .from('scheduled_emails')
                    .update({ status: 'failed', error_message: emailError.message })
                    .eq('id', email.id);
            }
        }
        
    } catch (error) {
        console.error('Error processing scheduled emails:', error);
    }
}

async function sendEmail(type, customer) {
    // Mock email sending - replace with actual email service
    console.log(`Sending ${type} email to ${customer.customer_email}`);
    
    const emailTemplates = {
        'poc_reminder': `POC Expiry Reminder for ${customer.customer_name}`,
        'poc_expired': `POC Expired for ${customer.customer_name}`,
        'poc_extended': `POC Extended for ${customer.customer_name}`,
        'customer_onboarded': `Welcome ${customer.customer_name}!`,
        'poc_ended': `POC Ended for ${customer.customer_name}`
    };
    
    const subject = emailTemplates[type] || 'Cautio Notification';
    
    // Log email to database
    try {
        await supabase
            .from('email_logs')
            .insert([{
                customer_id: customer.id,
                email_type: type,
                recipient: customer.customer_email,
                subject: subject,
                status: 'sent',
                sent_at: new Date().toISOString()
            }]);
    } catch (error) {
        console.error('Error logging email:', error);
    }
    
    return Promise.resolve();
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

function showEmailToast(message, type = 'success') {
    const toast = document.getElementById('emailToast');
    const messageEl = document.getElementById('toastMessage');
    
    if (!toast || !messageEl) return;
    
    messageEl.textContent = message;
    toast.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

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
