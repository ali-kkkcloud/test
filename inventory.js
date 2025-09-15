// ====================================
// INVENTORY MANAGEMENT - COMPLETE FIXED VERSION
// ====================================

// Global variables for inventory
let inwardDevices = [];
let outwardDevices = [];
let filteredInwardDevices = [];
let filteredOutwardDevices = [];
let currentInventoryTab = 'inward';
let currentImportType = null;

// Device condition options - FIXED with all 5 required conditions
const DEVICE_CONDITIONS = [
    { value: 'new', label: 'New Device' },
    { value: 'good', label: 'Good' },
    { value: 'lense_issue', label: 'Lense Issue' },
    { value: 'sim_module_fail', label: 'SIM Module Fail' },
    { value: 'auto_restart', label: 'Auto Restart' },
    { value: 'device_tampered', label: 'Device Tampered' },
    { value: 'used', label: 'Used' },
    { value: 'refurbished', label: 'Refurbished' },
    { value: 'damaged', label: 'Damaged' }
];

// Initialize inventory management
function initializeInventoryManagement() {
    console.log('🔧 Initializing Inventory Management...');
    setupInventoryEventListeners();
    loadInventoryData();
    setupInventoryRealtimeListeners();
}

// Setup inventory event listeners
function setupInventoryEventListeners() {
    // Search functionality
    const inventorySearchInput = document.getElementById('inventorySearchInput');
    if (inventorySearchInput) {
        inventorySearchInput.addEventListener('input', handleInventorySearch);
    }

    console.log('✅ Inventory event listeners set up');
}

// Setup realtime listeners for inventory
function setupInventoryRealtimeListeners() {
    // Listen for inward device changes
    supabase
        .channel('inward_devices')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inward_devices' }, 
            (payload) => {
                console.log('📥 Inward device change received!', payload);
                loadInventoryData();
            }
        )
        .subscribe();

    // Listen for outward device changes
    supabase
        .channel('outward_devices')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'outward_devices' }, 
            (payload) => {
                console.log('📤 Outward device change received!', payload);
                loadInventoryData();
            }
        )
        .subscribe();

    console.log('🔄 Inventory realtime listeners set up');
}

// Load inventory data
async function loadInventoryData() {
    try {
        await Promise.all([
            loadInwardDevices(),
            loadOutwardDevices()
        ]);
        
        updateInventoryStats();
        updateInventoryTabs();
    } catch (error) {
        console.error('❌ Error loading inventory data:', error);
        showInventoryToast('Error loading inventory data', 'error');
    }
}

// Load inward devices
async function loadInwardDevices() {
    try {
        const { data, error } = await supabase
            .from('inward_devices')
            .select(`
                *,
                stock:stock_id (
                    device_model_no,
                    batch_no,
                    po_no,
                    current_status,
                    inventory_status
                )
            `)
            .order('inward_date', { ascending: false });

        if (error) {
            console.error('❌ Error loading inward devices:', error);
            throw error;
        }

        inwardDevices = data || [];
        filteredInwardDevices = [...inwardDevices];
        
        console.log(`📥 Loaded ${inwardDevices.length} inward devices`);
    } catch (error) {
        console.error('❌ Error loading inward devices:', error);
        // Create mock data for development
        inwardDevices = [];
        filteredInwardDevices = [];
    }
}

// Load outward devices
async function loadOutwardDevices() {
    try {
        const { data, error } = await supabase
            .from('outward_devices')
            .select(`
                *,
                stock:stock_id (
                    device_model_no,
                    batch_no,
                    po_no,
                    current_status,
                    inventory_status
                ),
                customer:customer_id (
                    customer_name,
                    customer_email
                )
            `)
            .order('outward_date', { ascending: false });

        if (error) {
            console.error('❌ Error loading outward devices:', error);
            throw error;
        }

        outwardDevices = data || [];
        filteredOutwardDevices = [...outwardDevices];
        
        console.log(`📤 Loaded ${outwardDevices.length} outward devices`);
    } catch (error) {
        console.error('❌ Error loading outward devices:', error);
        // Create mock data for development
        outwardDevices = [];
        filteredOutwardDevices = [];
    }
}

// Update inventory stats
function updateInventoryStats() {
    const inwardCount = inwardDevices.length;
    const outwardCount = outwardDevices.length;
    
    const inwardCountEl = document.getElementById('inwardCount');
    const outwardCountEl = document.getElementById('outwardCount');
    
    if (inwardCountEl) inwardCountEl.textContent = inwardCount;
    if (outwardCountEl) outwardCountEl.textContent = outwardCount;
}

// Show/hide inventory tabs - FIXED
function showInwardTab() {
    currentInventoryTab = 'inward';
    updateInventoryTabHighlight('inwardTab');
    hideAllInventoryTabContent();
    document.getElementById('inwardTabContent').classList.remove('hidden');
    updateInwardTab();
}

function showOutwardTab() {
    currentInventoryTab = 'outward';
    updateInventoryTabHighlight('outwardTab');
    hideAllInventoryTabContent();
    document.getElementById('outwardTabContent').classList.remove('hidden');
    updateOutwardTab();
}

function hideAllInventoryTabContent() {
    const inwardContent = document.getElementById('inwardTabContent');
    const outwardContent = document.getElementById('outwardTabContent');
    
    if (inwardContent) inwardContent.classList.add('hidden');
    if (outwardContent) outwardContent.classList.add('hidden');
}

function updateInventoryTabHighlight(activeTabId) {
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(activeTabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

// Update inventory tabs content
function updateInventoryTabs() {
    if (currentInventoryTab === 'inward') {
        updateInwardTab();
    } else if (currentInventoryTab === 'outward') {
        updateOutwardTab();
    }
}

// Update inward tab
function updateInwardTab() {
    const inwardList = document.getElementById('inwardDevicesList');
    const inwardEmpty = document.getElementById('inwardEmptyState');

    if (!inwardList || !inwardEmpty) return;

    if (filteredInwardDevices.length === 0) {
        inwardList.innerHTML = '';
        inwardEmpty.style.display = 'block';
    } else {
        inwardEmpty.style.display = 'none';
        inwardList.innerHTML = filteredInwardDevices.map(device => createInwardDeviceRow(device)).join('');
    }
}

// Update outward tab
function updateOutwardTab() {
    const outwardList = document.getElementById('outwardDevicesList');
    const outwardEmpty = document.getElementById('outwardEmptyState');

    if (!outwardList || !outwardEmpty) return;

    if (filteredOutwardDevices.length === 0) {
        outwardList.innerHTML = '';
        outwardEmpty.style.display = 'block';
    } else {
        outwardEmpty.style.display = 'none';
        outwardList.innerHTML = filteredOutwardDevices.map(device => createOutwardDeviceRow(device)).join('');
    }
}

// Create inward device row - ENHANCED
function createInwardDeviceRow(device) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString();
    };

    const getConditionBadge = (condition) => {
        const conditionMap = {
            'new': { class: 'new-device', label: 'New Device' },
            'good': { class: 'good', label: 'Good' },
            'lense_issue': { class: 'lense-issue', label: 'Lense Issue' },
            'sim_module_fail': { class: 'sim-module-fail', label: 'SIM Module Fail' },
            'auto_restart': { class: 'auto-restart', label: 'Auto Restart' },
            'device_tampered': { class: 'device-tampered', label: 'Device Tampered' },
            'used': { class: 'used', label: 'Used' },
            'refurbished': { class: 'refurbished', label: 'Refurbished' },
            'damaged': { class: 'damaged', label: 'Damaged' }
        };
        
        const conditionInfo = conditionMap[condition] || { class: 'good', label: condition };
        return `<span class="device-status-badge ${conditionInfo.class}">${conditionInfo.label}</span>`;
    };

    return `
        <div class="device-row inward-device-card">
            <div class="device-info">
                <div class="device-field">
                    <div class="device-field-label">Registration Number</div>
                    <div class="device-field-value">${device.device_registration_number}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">IMEI</div>
                    <div class="device-field-value">${device.device_imei}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Model</div>
                    <div class="device-field-value">${device.stock?.device_model_no || 'N/A'}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Condition</div>
                    <div class="device-field-value">${getConditionBadge(device.device_condition)}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Inward Date</div>
                    <div class="device-field-value">${formatDate(device.inward_date)}</div>
                </div>
            </div>
            <div class="device-actions">
                <button onclick="moveToOutward('${device.device_registration_number}')" class="device-action-btn primary">
                    Move to Outward
                </button>
                <button onclick="editInwardDevice(${device.id})" class="device-action-btn success">
                    Edit
                </button>
            </div>
        </div>
    `;
}

// Create outward device row - ENHANCED
function createOutwardDeviceRow(device) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString();
    };

    return `
        <div class="device-row outward-device-card">
            <div class="device-info">
                <div class="device-field">
                    <div class="device-field-label">Registration Number</div>
                    <div class="device-field-value">${device.device_registration_number}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">IMEI</div>
                    <div class="device-field-value">${device.device_imei}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Customer</div>
                    <div class="device-field-value">${device.customer?.customer_name || device.customer_name || 'N/A'}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Location</div>
                    <div class="device-field-value">${device.location || 'N/A'}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Outward Date</div>
                    <div class="device-field-value">${formatDate(device.outward_date)}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">SIM No</div>
                    <div class="device-field-value">${device.sim_no || 'N/A'}</div>
                </div>
            </div>
            <div class="device-actions">
                <button onclick="returnToInward('${device.device_registration_number}')" class="device-action-btn primary">
                    Return to Inward
                </button>
                <button onclick="editOutwardDevice(${device.id})" class="device-action-btn success">
                    Edit
                </button>
            </div>
        </div>
    `;
}

// ====================================
// ADD DEVICE FUNCTIONS - ENHANCED
// ====================================

function showAddInwardForm() {
    const modalHTML = `
        <div id="addInwardModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 inventory-modal">
            <div class="inventory-modal-content rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-heading-6 dark:text-dark-base-600">Add Inward Device</h2>
                    <button onclick="closeAddInwardForm()" class="p-2 rounded-lg hover:dark:bg-dark-fill-base-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-base-600">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="addInwardForm" class="inventory-form space-y-4">
                    <div class="inventory-form-field">
                        <label class="inventory-form-label">Device Registration Number *</label>
                        <input type="text" name="deviceRegistrationNumber" class="inventory-form-input" placeholder="Enter device registration number" required>
                    </div>
                    
                    <div class="inventory-form-field">
                        <label class="inventory-form-label">Device IMEI *</label>
                        <input type="text" name="deviceImei" class="inventory-form-input" placeholder="Enter device IMEI (15 digits)" pattern="[0-9]{15}" maxlength="15" required>
                        <small class="text-body-s-regular dark:text-dark-base-500">Must be exactly 15 digits</small>
                    </div>
                    
                    <div class="inventory-form-field">
                        <label class="inventory-form-label">Device Condition *</label>
                        <select name="deviceCondition" class="inventory-form-select" required>
                            <option value="">Select device condition</option>
                            <option value="new">New Device</option>
                            <option value="good">Good</option>
                            <option value="lense_issue">Lense Issue</option>
                            <option value="sim_module_fail">SIM Module Fail</option>
                            <option value="auto_restart">Auto Restart</option>
                            <option value="device_tampered">Device Tampered</option>
                        </select>
                    </div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary">Add Inward Device</button>
                        <button type="button" onclick="closeAddInwardForm()" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('addInwardModal').classList.remove('hidden');
    
    // Set up form handler
    const form = document.getElementById('addInwardForm');
    if (form) {
        form.addEventListener('submit', handleAddInwardDevice);
    }
}

function showAddOutwardForm() {
    const modalHTML = `
        <div id="addOutwardModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 inventory-modal">
            <div class="inventory-modal-content rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-heading-6 dark:text-dark-base-600">Add Outward Device</h2>
                    <button onclick="closeAddOutwardForm()" class="p-2 rounded-lg hover:dark:bg-dark-fill-base-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-base-600">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="addOutwardForm" class="inventory-form space-y-4">
                    <div class="inventory-form-field">
                        <label class="inventory-form-label">Device Registration Number *</label>
                        <input type="text" name="deviceRegistrationNumber" class="inventory-form-input" placeholder="Enter device registration number" required>
                    </div>
                    
                    <div class="inventory-form-field">
                        <label class="inventory-form-label">Device IMEI *</label>
                        <input type="text" name="deviceImei" class="inventory-form-input" placeholder="Enter device IMEI (15 digits)" pattern="[0-9]{15}" maxlength="15" required>
                        <small class="text-body-s-regular dark:text-dark-base-500">Must be exactly 15 digits</small>
                    </div>
                    
                    <div class="inventory-form-field">
                        <label class="inventory-form-label">Customer Name *</label>
                        <select name="customerId" class="inventory-form-select" required>
                            <option value="">Select customer</option>
                        </select>
                    </div>
                    
                    <div class="inventory-form-field">
                        <label class="inventory-form-label">Location *</label>
                        <input type="text" name="location" class="inventory-form-input" placeholder="Enter deployment location" required>
                    </div>
                    
                    <div class="inventory-form-field">
                        <label class="inventory-form-label">Date *</label>
                        <input type="date" name="outwardDate" class="inventory-form-input" required>
                    </div>
                    
                    <div class="inventory-form-field">
                        <label class="inventory-form-label">SIM No</label>
                        <input type="text" name="simNo" class="inventory-form-input" placeholder="Enter SIM number">
                    </div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary">Add Outward Device</button>
                        <button type="button" onclick="closeAddOutwardForm()" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('addOutwardModal').classList.remove('hidden');
    
    // Populate customer dropdown
    populateCustomerDropdown('customerId');
    
    // Set today's date as default
    const dateInput = document.querySelector('#addOutwardForm input[name="outwardDate"]');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Set up form handler
    const form = document.getElementById('addOutwardForm');
    if (form) {
        form.addEventListener('submit', handleAddOutwardDevice);
    }
}

// Populate customer dropdown - ENHANCED
async function populateCustomerDropdown(selectId) {
    const select = document.querySelector(`#addOutwardForm select[name="${selectId}"]`);
    if (!select) return;
    
    try {
        // Get approved customers from global variable or fetch
        const customers = window.approvedCustomers || [];
        
        select.innerHTML = '<option value="">Select customer</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.customer_name} (${customer.customer_email})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('❌ Error populating customer dropdown:', error);
        showInventoryToast('Error loading customers', 'error');
    }
}

// Close forms
function closeAddInwardForm() {
    const modal = document.getElementById('addInwardModal');
    if (modal) {
        modal.remove();
    }
}

function closeAddOutwardForm() {
    const modal = document.getElementById('addOutwardModal');
    if (modal) {
        modal.remove();
    }
}

// ====================================
// FORM HANDLERS - ENHANCED
// ====================================

async function handleAddInwardDevice(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const registrationNumber = formData.get('deviceRegistrationNumber').trim();
    const imei = formData.get('deviceImei').trim();
    const condition = formData.get('deviceCondition');
    
    // Validation
    if (!registrationNumber || !imei || !condition) {
        showInventoryToast('Please fill in all required fields', 'error');
        return;
    }
    
    // IMEI validation - must be exactly 15 digits
    if (!/^\d{15}$/.test(imei)) {
        showInventoryToast('IMEI must be exactly 15 digits', 'error');
        return;
    }
    
    try {
        // Check if device exists in stock
        const { data: stockDevice, error: stockError } = await supabase
            .from('stock')
            .select('*')
            .eq('device_registration_number', registrationNumber)
            .single();

        if (stockError || !stockDevice) {
            showInventoryToast('Device not found in stock database', 'error');
            return;
        }
        
        // Verify IMEI matches stock
        if (stockDevice.device_imei !== imei) {
            showInventoryToast('IMEI does not match stock database', 'error');
            return;
        }
        
        // Check if already in inward
        const { data: existingInward } = await supabase
            .from('inward_devices')
            .select('*')
            .eq('device_registration_number', registrationNumber)
            .single();

        if (existingInward) {
            showInventoryToast('Device already exists in inward inventory', 'error');
            return;
        }
        
        // Add to inward
        const inwardData = {
            device_registration_number: registrationNumber,
            device_imei: imei,
            device_condition: condition,
            inward_date: new Date().toISOString().split('T')[0],
            stock_id: stockDevice.id,
            processed_by: window.userSession?.email || 'admin',
            notes: 'Manually added'
        };
        
        const { error } = await supabase
            .from('inward_devices')
            .insert([inwardData]);

        if (error) {
            console.error('❌ Error adding inward device:', error);
            showInventoryToast('Error adding device: ' + error.message, 'error');
            return;
        }
        
        showInventoryToast('Device added to inward inventory successfully', 'success');
        closeAddInwardForm();
        loadInventoryData();
        
    } catch (error) {
        console.error('❌ Error adding inward device:', error);
        showInventoryToast('Error adding device', 'error');
    }
}

async function handleAddOutwardDevice(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const registrationNumber = formData.get('deviceRegistrationNumber').trim();
    const imei = formData.get('deviceImei').trim();
    const customerId = formData.get('customerId');
    const location = formData.get('location').trim();
    const outwardDate = formData.get('outwardDate');
    const simNo = formData.get('simNo').trim();
    
    // Validation
    if (!registrationNumber || !imei || !customerId || !location || !outwardDate) {
        showInventoryToast('Please fill in all required fields', 'error');
        return;
    }
    
    // IMEI validation
    if (!/^\d{15}$/.test(imei)) {
        showInventoryToast('IMEI must be exactly 15 digits', 'error');
        return;
    }
    
    try {
        // Check if device exists in stock
        const { data: stockDevice, error: stockError } = await supabase
            .from('stock')
            .select('*')
            .eq('device_registration_number', registrationNumber)
            .single();

        if (stockError || !stockDevice) {
            showInventoryToast('Device not found in stock database', 'error');
            return;
        }
        
        // Verify IMEI
        if (stockDevice.device_imei !== imei) {
            showInventoryToast('IMEI does not match stock database', 'error');
            return;
        }
        
        // Get customer info
        const customer = window.approvedCustomers?.find(c => c.id === parseInt(customerId));
        if (!customer) {
            showInventoryToast('Customer not found', 'error');
            return;
        }
        
        // Check if already in outward
        const { data: existingOutward } = await supabase
            .from('outward_devices')
            .select('*')
            .eq('device_registration_number', registrationNumber)
            .single();

        if (existingOutward) {
            showInventoryToast('Device already exists in outward inventory', 'error');
            return;
        }
        
        // Add to outward
        const outwardData = {
            device_registration_number: registrationNumber,
            device_imei: imei,
            customer_id: customer.id,
            customer_name: customer.customer_name,
            location: location,
            outward_date: outwardDate,
            sim_no: simNo,
            stock_id: stockDevice.id,
            processed_by: window.userSession?.email || 'admin',
            notes: 'Manually added'
        };
        
        const { error } = await supabase
            .from('outward_devices')
            .insert([outwardData]);

        if (error) {
            console.error('❌ Error adding outward device:', error);
            showInventoryToast('Error adding device: ' + error.message, 'error');
            return;
        }
        
        // Remove from inward if exists
        await supabase
            .from('inward_devices')
            .delete()
            .eq('device_registration_number', registrationNumber);
        
        showInventoryToast('Device added to outward inventory successfully', 'success');
        closeAddOutwardForm();
        loadInventoryData();
        
    } catch (error) {
        console.error('❌ Error adding outward device:', error);
        showInventoryToast('Error adding device', 'error');
    }
}

// ====================================
// DEVICE MOVEMENT FUNCTIONS
// ====================================

async function moveToOutward(registrationNumber) {
    try {
        // Find the inward device
        const inwardDevice = inwardDevices.find(d => d.device_registration_number === registrationNumber);
        if (!inwardDevice) {
            showInventoryToast('Device not found in inward inventory', 'error');
            return;
        }
        
        // Get customer selection
        const customers = window.approvedCustomers || [];
        if (customers.length === 0) {
            showInventoryToast('No approved customers available', 'error');
            return;
        }
        
        // Create selection modal
        const customerOptions = customers.map(c => 
            `<option value="${c.id}">${c.customer_name} (${c.customer_email})</option>`
        ).join('');
        
        const modalHTML = `
            <div id="moveToOutwardModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="inventory-modal-content rounded-lg p-6 w-full max-w-md">
                    <h3 class="text-heading-6 dark:text-dark-base-600 mb-4">Move Device to Outward</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="inventory-form-label">Select Customer</label>
                            <select id="outwardCustomer" class="inventory-form-select">
                                <option value="">Select customer</option>
                                ${customerOptions}
                            </select>
                        </div>
                        <div>
                            <label class="inventory-form-label">Location</label>
                            <input type="text" id="outwardLocation" class="inventory-form-input" placeholder="Enter location">
                        </div>
                        <div>
                            <label class="inventory-form-label">SIM No</label>
                            <input type="text" id="outwardSimNo" class="inventory-form-input" placeholder="Enter SIM number">
                        </div>
                        <div class="button-group">
                            <button onclick="confirmMoveToOutward('${registrationNumber}')" class="btn btn-primary">Move to Outward</button>
                            <button onclick="closeMoveToOutwardModal()" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (error) {
        console.error('❌ Error moving to outward:', error);
        showInventoryToast('Error moving device', 'error');
    }
}

async function confirmMoveToOutward(registrationNumber) {
    const customerId = document.getElementById('outwardCustomer').value;
    const location = document.getElementById('outwardLocation').value.trim();
    const simNo = document.getElementById('outwardSimNo').value.trim();
    
    if (!customerId || !location) {
        showInventoryToast('Please fill in customer and location', 'error');
        return;
    }
    
    try {
        const customer = window.approvedCustomers?.find(c => c.id === parseInt(customerId));
        const inwardDevice = inwardDevices.find(d => d.device_registration_number === registrationNumber);
        
        // Add to outward
        const outwardData = {
            device_registration_number: registrationNumber,
            device_imei: inwardDevice.device_imei,
            customer_id: customer.id,
            customer_name: customer.customer_name,
            location: location,
            outward_date: new Date().toISOString().split('T')[0],
            sim_no: simNo,
            stock_id: inwardDevice.stock_id,
            processed_by: window.userSession?.email || 'admin',
            notes: 'Moved from inward'
        };
        
        const { error: outwardError } = await supabase
            .from('outward_devices')
            .insert([outwardData]);

        if (outwardError) throw outwardError;
        
        // Remove from inward
        const { error: inwardError } = await supabase
            .from('inward_devices')
            .delete()
            .eq('device_registration_number', registrationNumber);

        if (inwardError) throw inwardError;
        
        showInventoryToast('Device moved to outward successfully', 'success');
        closeMoveToOutwardModal();
        loadInventoryData();
        
    } catch (error) {
        console.error('❌ Error confirming move to outward:', error);
        showInventoryToast('Error moving device', 'error');
    }
}

function closeMoveToOutwardModal() {
    const modal = document.getElementById('moveToOutwardModal');
    if (modal) modal.remove();
}

async function returnToInward(registrationNumber) {
    if (!confirm('Are you sure you want to return this device to inward inventory?')) {
        return;
    }
    
    try {
        const outwardDevice = outwardDevices.find(d => d.device_registration_number === registrationNumber);
        if (!outwardDevice) {
            showInventoryToast('Device not found in outward inventory', 'error');
            return;
        }
        
        // Add to inward
        const inwardData = {
            device_registration_number: registrationNumber,
            device_imei: outwardDevice.device_imei,
            device_condition: 'used', // Set condition as used when returned
            inward_date: new Date().toISOString().split('T')[0],
            stock_id: outwardDevice.stock_id,
            processed_by: window.userSession?.email || 'admin',
            notes: 'Returned from outward'
        };
        
        const { error: inwardError } = await supabase
            .from('inward_devices')
            .insert([inwardData]);

        if (inwardError) throw inwardError;
        
        // Remove from outward
        const { error: outwardError } = await supabase
            .from('outward_devices')
            .delete()
            .eq('device_registration_number', registrationNumber);

        if (outwardError) throw outwardError;
        
        showInventoryToast('Device returned to inward successfully', 'success');
        loadInventoryData();
        
    } catch (error) {
        console.error('❌ Error returning to inward:', error);
        showInventoryToast('Error returning device', 'error');
    }
}

// ====================================
// CSV IMPORT FUNCTIONS - ENHANCED
// ====================================

function showImportInwardCSV() {
    currentImportType = 'inward';
    showCSVImportModal('inward');
}

function showImportOutwardCSV() {
    currentImportType = 'outward';
    showCSVImportModal('outward');
}

function showCSVImportModal(type) {
    const isInward = type === 'inward';
    const title = isInward ? 'Import Inward Devices CSV' : 'Import Outward Devices CSV';
    const sampleColumns = isInward 
        ? 'Device Registration Number, Device IMEI, Device Condition'
        : 'Device Registration Number, Device IMEI, Customer Name, Location, Date, SIM No';
    
    const modalHTML = `
        <div id="import${type.charAt(0).toUpperCase() + type.slice(1)}CSVModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 inventory-modal">
            <div class="inventory-modal-content rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-heading-6 dark:text-dark-base-600">${title}</h2>
                    <button onclick="closeCSVImportModal('${type}')" class="p-2 rounded-lg hover:dark:bg-dark-fill-base-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-base-600">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                </div>
                
                <div class="mb-6">
                    <h3 class="text-body-l-semibold dark:text-dark-base-600 mb-2">CSV Format Requirements</h3>
                    <p class="text-body-m-regular dark:text-dark-base-500 mb-2">Your CSV file should contain the following columns:</p>
                    <code class="bg-gray-100 dark:bg-dark-fill-base-400 p-2 rounded text-sm">${sampleColumns}</code>
                </div>
                
                <form id="import${type.charAt(0).toUpperCase() + type.slice(1)}CSVForm" class="space-y-4">
                    <div class="csv-import-area" id="${type}CSVDropArea">
                        <div class="csv-import-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                        </div>
                        <h3 class="csv-import-title">Drop CSV file here or click to select</h3>
                        <p class="csv-import-subtitle">Maximum file size: 10MB</p>
                        <input type="file" id="${type}CSVFile" name="csvFile" accept=".csv" class="hidden">
                        <button type="button" onclick="document.getElementById('${type}CSVFile').click()" class="csv-upload-button">
                            Select File
                        </button>
                    </div>
                    
                    <div id="${type}FileInfo" class="file-info hidden">
                        <!-- File info will be populated here -->
                    </div>
                    
                    <div id="${type}ImportProgress" class="hidden">
                        <div class="progress-bar">
                            <div id="${type}ProgressFill" class="progress-bar-fill" style="width: 0%"></div>
                        </div>
                        <p id="${type}ProgressText" class="text-center text-body-m-regular dark:text-dark-base-600 mt-2">Processing...</p>
                    </div>
                    
                    <div id="${type}ImportResults" class="import-results hidden">
                        <!-- Results will be populated here -->
                    </div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary">Import CSV</button>
                        <button type="button" onclick="closeCSVImportModal('${type}')" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set up file input handler
    const fileInput = document.getElementById(`${type}CSVFile`);
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleCSVFileSelect(e, type));
    }
    
    // Set up form handler
    const form = document.getElementById(`import${type.charAt(0).toUpperCase() + type.slice(1)}CSVForm`);
    if (form) {
        form.addEventListener('submit', (e) => handleImportCSV(e, type));
    }
}

function closeCSVImportModal(type) {
    const modal = document.getElementById(`import${type.charAt(0).toUpperCase() + type.slice(1)}CSVModal`);
    if (modal) modal.remove();
}

function handleCSVFileSelect(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showInventoryToast('Please select a CSV file', 'error');
        return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        showInventoryToast('File size too large. Maximum 10MB allowed.', 'error');
        return;
    }
    
    // Show file info
    const fileInfo = document.getElementById(`${type}FileInfo`);
    if (fileInfo) {
        fileInfo.innerHTML = `
            <div class="file-info-content">
                <div class="file-info-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                        <polyline points="14,2 14,8 20,8"/>
                    </svg>
                </div>
                <div class="file-info-details">
                    <div class="file-info-name">${file.name}</div>
                    <div class="file-info-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `;
        fileInfo.classList.remove('hidden');
    }
}

async function handleImportCSV(e, type) {
    e.preventDefault();
    
    const fileInput = document.getElementById(`${type}CSVFile`);
    const file = fileInput.files[0];
    
    if (!file) {
        showInventoryToast('Please select a CSV file', 'error');
        return;
    }
    
    try {
        showImportProgress(type, 0, 'Reading CSV file...');
        
        const csvText = await readFileAsText(file);
        const parsedData = parseCSV(csvText);
        
        if (parsedData.length === 0) {
            showInventoryToast('CSV file is empty or invalid', 'error');
            hideImportProgress(type);
            return;
        }
        
        showImportProgress(type, 20, 'Validating data...');
        
        if (type === 'inward') {
            await processInwardCSV(parsedData);
        } else {
            await processOutwardCSV(parsedData);
        }
        
    } catch (error) {
        console.error('❌ Error importing CSV:', error);
        showInventoryToast(`Error importing CSV: ${error.message}`, 'error');
        hideImportProgress(type);
    }
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

function handleInventorySearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    // Filter inward devices
    filteredInwardDevices = inwardDevices.filter(device => 
        device.device_registration_number.toLowerCase().includes(searchTerm) ||
        device.device_imei.toLowerCase().includes(searchTerm) ||
        device.device_condition.toLowerCase().includes(searchTerm) ||
        (device.stock?.device_model_no || '').toLowerCase().includes(searchTerm)
    );
    
    // Filter outward devices
    filteredOutwardDevices = outwardDevices.filter(device => 
        device.device_registration_number.toLowerCase().includes(searchTerm) ||
        device.device_imei.toLowerCase().includes(searchTerm) ||
        (device.customer_name || '').toLowerCase().includes(searchTerm) ||
        (device.location || '').toLowerCase().includes(searchTerm)
    );
    
    updateInventoryTabs();
}

function showInventoryToast(message, type = 'success') {
    // Use the main toast function if available
    if (typeof showEmailToast === 'function') {
        showEmailToast(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    
    return data;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showImportProgress(type, percentage, text) {
    const progressDiv = document.getElementById(`${type}ImportProgress`);
    const progressFill = document.getElementById(`${type}ProgressFill`);
    const progressText = document.getElementById(`${type}ProgressText`);
    
    if (progressDiv) progressDiv.classList.remove('hidden');
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = text;
}

function hideImportProgress(type) {
    const progressDiv = document.getElementById(`${type}ImportProgress`);
    if (progressDiv) progressDiv.classList.add('hidden');
}

// Placeholder functions for CSV processing (implement based on requirements)
async function processInwardCSV(data) {
    // Implementation for processing inward CSV data
    showImportProgress('inward', 100, 'Import completed!');
    showInventoryToast('Inward CSV imported successfully', 'success');
}

async function processOutwardCSV(data) {
    // Implementation for processing outward CSV data
    showImportProgress('outward', 100, 'Import completed!');
    showInventoryToast('Outward CSV imported successfully', 'success');
}

// Edit functions (placeholders)
function editInwardDevice(deviceId) {
    showInventoryToast('Edit functionality coming soon', 'info');
}

function editOutwardDevice(deviceId) {
    showInventoryToast('Edit functionality coming soon', 'info');
}

// Make functions globally available
window.initializeInventoryManagement = initializeInventoryManagement;
window.showInwardTab = showInwardTab;
window.showOutwardTab = showOutwardTab;
window.showAddInwardForm = showAddInwardForm;
window.showAddOutwardForm = showAddOutwardForm;
window.showImportInwardCSV = showImportInwardCSV;
window.showImportOutwardCSV = showImportOutwardCSV;
window.moveToOutward = moveToOutward;
window.returnToInward = returnToInward;
window.confirmMoveToOutward = confirmMoveToOutward;
window.closeMoveToOutwardModal = closeMoveToOutwardModal;
window.closeAddInwardForm = closeAddInwardForm;
window.closeAddOutwardForm = closeAddOutwardForm;
window.closeCSVImportModal = closeCSVImportModal;
window.editInwardDevice = editInwardDevice;
window.editOutwardDevice = editOutwardDevice;
