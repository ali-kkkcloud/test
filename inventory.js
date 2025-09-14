// ====================================
// INVENTORY MANAGEMENT FUNCTIONS
// ====================================

// Global variables for inventory
let inwardDevices = [];
let outwardDevices = [];
let filteredInwardDevices = [];
let filteredOutwardDevices = [];
let currentInventoryTab = 'inward';
let currentImportType = null;

// Device condition options
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
    // Add forms
    const addInwardForm = document.getElementById('addInwardForm');
    if (addInwardForm) {
        addInwardForm.addEventListener('submit', handleAddInwardDevice);
    }

    const addOutwardForm = document.getElementById('addOutwardForm');
    if (addOutwardForm) {
        addOutwardForm.addEventListener('submit', handleAddOutwardDevice);
    }

    // CSV import forms
    const importInwardCSVForm = document.getElementById('importInwardCSVForm');
    if (importInwardCSVForm) {
        importInwardCSVForm.addEventListener('submit', handleImportInwardCSV);
    }

    const importOutwardCSVForm = document.getElementById('importOutwardCSVForm');
    if (importOutwardCSVForm) {
        importOutwardCSVForm.addEventListener('submit', handleImportOutwardCSV);
    }

    // File input handlers
    const inwardCSVFile = document.getElementById('inwardCSVFile');
    if (inwardCSVFile) {
        inwardCSVFile.addEventListener('change', handleInwardCSVFileSelect);
    }

    const outwardCSVFile = document.getElementById('outwardCSVFile');
    if (outwardCSVFile) {
        outwardCSVFile.addEventListener('change', handleOutwardCSVFileSelect);
    }

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
        throw error;
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
        throw error;
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

// Show/hide inventory tabs
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
    document.getElementById('inwardTabContent').classList.add('hidden');
    document.getElementById('outwardTabContent').classList.add('hidden');
}

function updateInventoryTabHighlight(activeTabId) {
    document.querySelectorAll('.inventory-tab-button').forEach(tab => {
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

// Create inward device row
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
                <button onclick="moveToOutward('${device.device_registration_number}')" class="device-action-btn success">
                    Move to Outward
                </button>
                <button onclick="removeFromInward(${device.id})" class="device-action-btn danger">
                    Remove
                </button>
            </div>
        </div>
    `;
}

// Create outward device row
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
                    <div class="device-field-value">${device.customer_name}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Location</div>
                    <div class="device-field-value">${device.location}</div>
                </div>
                <div class="device-field">
                    <div class="device-field-label">Outward Date</div>
                    <div class="device-field-value">${formatDate(device.outward_date)}</div>
                </div>
            </div>
            <div class="device-actions">
                <button onclick="returnToInward('${device.device_registration_number}')" class="device-action-btn primary">
                    Return to Inward
                </button>
                <button onclick="removeFromOutward(${device.id})" class="device-action-btn danger">
                    Remove
                </button>
            </div>
        </div>
    `;
}

// Show add inward form
function showAddInwardForm() {
    const modal = document.getElementById('addInwardModal');
    if (!modal) {
        createAddInwardModal();
    } else {
        modal.classList.remove('hidden');
    }
    populateDeviceConditionOptions('inwardDeviceCondition');
}

// Show add outward form
function showAddOutwardForm() {
    const modal = document.getElementById('addOutwardModal');
    if (!modal) {
        createAddOutwardModal();
    } else {
        modal.classList.remove('hidden');
    }
    populateCustomerDropdown('outwardCustomerId');
}

// Create add inward modal
function createAddInwardModal() {
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
                
                <form id="addInwardForm" class="space-y-4">
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Device Registration Number</label>
                        <input type="text" name="deviceRegistrationNumber" class="inventory-form-input w-full rounded-lg border p-3 outline-none dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600" placeholder="Enter device registration number" required>
                    </div>
                    
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Device IMEI</label>
                        <input type="text" name="deviceImei" class="inventory-form-input w-full rounded-lg border p-3 outline-none dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600" placeholder="Enter device IMEI" required>
                    </div>
                    
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Device Condition</label>
                        <select name="deviceCondition" id="inwardDeviceCondition" class="inventory-form-select w-full rounded-lg border p-3 outline-none dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600" required>
                            <!-- Options will be populated by JavaScript -->
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

// Create add outward modal
function createAddOutwardModal() {
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
                
                <form id="addOutwardForm" class="space-y-4">
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Device Registration Number</label>
                        <input type="text" name="deviceRegistrationNumber" class="inventory-form-input w-full rounded-lg border p-3 outline-none dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600" placeholder="Enter device registration number" required>
                    </div>
                    
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Device IMEI</label>
                        <input type="text" name="deviceImei" class="inventory-form-input w-full rounded-lg border p-3 outline-none dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600" placeholder="Enter device IMEI" required>
                    </div>
                    
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Customer</label>
                        <select name="customerId" id="outwardCustomerId" class="inventory-form-select w-full rounded-lg border p-3 outline-none dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600" required>
                            <!-- Options will be populated by JavaScript -->
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Location</label>
                        <input type="text" name="location" class="inventory-form-input w-full rounded-lg border p-3 outline-none dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600" placeholder="Enter location" required>
                    </div>
                    
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">Date</label>
                        <div class="date-picker-wrapper">
                            <input type="date" name="outwardDate" class="inventory-form-input w-full rounded-lg border p-3 outline-none dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600" required>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-body-l-semibold dark:text-dark-base-600 mb-2">SIM No</label>
                        <input type="text" name="simNo" class="inventory-form-input w-full rounded-lg border p-3 outline-none dark:border-dark-stroke-contrast-400 dark:bg-dark-fill-base-400 dark:text-dark-base-600 dark:focus:border-brand-blue-600" placeholder="Enter SIM number">
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
    
    // Set up form handler
    const form = document.getElementById('addOutwardForm');
    if (form) {
        form.addEventListener('submit', handleAddOutwardDevice);
    }
}

// Populate device condition options
function populateDeviceConditionOptions(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Select device condition</option>';
    DEVICE_CONDITIONS.forEach(condition => {
        const option = document.createElement('option');
        option.value = condition.value;
        option.textContent = condition.label;
        select.appendChild(option);
    });
}

// Populate customer dropdown
async function populateCustomerDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
        // Get approved customers from global variable
        const customers = approvedCustomers || [];
        
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
        modal.classList.add('hidden');
        const form = document.getElementById('addInwardForm');
        if (form) form.reset();
    }
}

function closeAddOutwardForm() {
    const modal = document.getElementById('addOutwardModal');
    if (modal) {
        modal.classList.add('hidden');
        const form = document.getElementById('addOutwardForm');
        if (form) form.reset();
    }
}

// Handle add inward device
async function handleAddInwardDevice(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const deviceRegistrationNumber = formData.get('deviceRegistrationNumber');
    const deviceImei = formData.get('deviceImei');
    const deviceCondition = formData.get('deviceCondition');
    
    try {
        showInventoryToast('Adding inward device...', 'info');
        
        // Check if device exists in stock
        const { data: stockDevice, error: stockError } = await supabase
            .from('stock')
            .select('*')
            .eq('device_registration_number', deviceRegistrationNumber)
            .single();

        if (stockError || !stockDevice) {
            showInventoryToast('Device not found in stock database', 'error');
            return;
        }

        // Check if device is already in inward
        const { data: existingInward, error: existingInwardError } = await supabase
            .from('inward_devices')
            .select('*')
            .eq('device_registration_number', deviceRegistrationNumber)
            .single();

        if (existingInward) {
            showInventoryToast('Device already exists in inward inventory', 'error');
            return;
        }

        // Verify IMEI matches
        if (stockDevice.device_imei !== deviceImei) {
            showInventoryToast('IMEI does not match stock database', 'error');
            return;
        }

        // Add to inward devices
        const { data, error } = await supabase
            .from('inward_devices')
            .insert([{
                device_registration_number: deviceRegistrationNumber,
                device_imei: deviceImei,
                device_condition: deviceCondition,
                inward_date: new Date().toISOString().split('T')[0],
                stock_id: stockDevice.id,
                processed_by: userSession?.email || 'admin'
            }]);

        if (error) {
            console.error('❌ Error adding inward device:', error);
            showInventoryToast('Error adding inward device: ' + error.message, 'error');
            return;
        }

        showInventoryToast('Inward device added successfully!', 'success');
        closeAddInwardForm();
        loadInventoryData();
        
    } catch (error) {
        console.error('❌ Error adding inward device:', error);
        showInventoryToast('Error adding inward device', 'error');
    }
}

// Handle add outward device
async function handleAddOutwardDevice(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const deviceRegistrationNumber = formData.get('deviceRegistrationNumber');
    const deviceImei = formData.get('deviceImei');
    const customerId = formData.get('customerId');
    const location = formData.get('location');
    const outwardDate = formData.get('outwardDate');
    const simNo = formData.get('simNo');
    
    try {
        showInventoryToast('Adding outward device...', 'info');
        
        // Check if device exists in stock
        const { data: stockDevice, error: stockError } = await supabase
            .from('stock')
            .select('*')
            .eq('device_registration_number', deviceRegistrationNumber)
            .single();

        if (stockError || !stockDevice) {
            showInventoryToast('Device not found in stock database', 'error');
            return;
        }

        // Verify IMEI matches
        if (stockDevice.device_imei !== deviceImei) {
            showInventoryToast('IMEI does not match stock database', 'error');
            return;
        }

        // Check if device is already in outward
        const { data: existingOutward, error: existingOutwardError } = await supabase
            .from('outward_devices')
            .select('*')
            .eq('device_registration_number', deviceRegistrationNumber)
            .single();

        if (existingOutward) {
            showInventoryToast('Device already exists in outward inventory', 'error');
            return;
        }

        // Get customer name
        const customer = approvedCustomers.find(c => c.id == customerId);
        if (!customer) {
            showInventoryToast('Customer not found', 'error');
            return;
        }

        // Add to outward devices
        const { data, error } = await supabase
            .from('outward_devices')
            .insert([{
                device_registration_number: deviceRegistrationNumber,
                device_imei: deviceImei,
                customer_id: customerId,
                customer_name: customer.customer_name,
                location: location,
                outward_date: outwardDate,
                sim_no: simNo,
                stock_id: stockDevice.id,
                processed_by: userSession?.email || 'admin'
            }]);

        if (error) {
            console.error('❌ Error adding outward device:', error);
            showInventoryToast('Error adding outward device: ' + error.message, 'error');
            return;
        }

        showInventoryToast('Outward device added successfully!', 'success');
        closeAddOutwardForm();
        loadInventoryData();
        
    } catch (error) {
        console.error('❌ Error adding outward device:', error);
        showInventoryToast('Error adding outward device', 'error');
    }
}

// Move device from inward to outward
async function moveToOutward(deviceRegistrationNumber) {
    try {
        // Get inward device
        const inwardDevice = inwardDevices.find(d => d.device_registration_number === deviceRegistrationNumber);
        if (!inwardDevice) {
            showInventoryToast('Device not found in inward inventory', 'error');
            return;
        }

        // Show outward form with pre-filled data
        showAddOutwardForm();
        
        // Pre-fill form
        setTimeout(() => {
            const form = document.getElementById('addOutwardForm');
            if (form) {
                form.deviceRegistrationNumber.value = deviceRegistrationNumber;
                form.deviceImei.value = inwardDevice.device_imei;
                form.outwardDate.value = new Date().toISOString().split('T')[0];
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Error moving device to outward:', error);
        showInventoryToast('Error moving device to outward', 'error');
    }
}

// Return device from outward to inward
async function returnToInward(deviceRegistrationNumber) {
    try {
        // Get outward device
        const outwardDevice = outwardDevices.find(d => d.device_registration_number === deviceRegistrationNumber);
        if (!outwardDevice) {
            showInventoryToast('Device not found in outward inventory', 'error');
            return;
        }

        // Remove from outward
        const { error: removeError } = await supabase
            .from('outward_devices')
            .delete()
            .eq('device_registration_number', deviceRegistrationNumber);

        if (removeError) {
            console.error('❌ Error removing from outward:', removeError);
            showInventoryToast('Error removing from outward: ' + removeError.message, 'error');
            return;
        }

        // Add to inward
        const { error: addError } = await supabase
            .from('inward_devices')
            .insert([{
                device_registration_number: deviceRegistrationNumber,
                device_imei: outwardDevice.device_imei,
                device_condition: 'used', // Set as used when returned
                inward_date: new Date().toISOString().split('T')[0],
                stock_id: outwardDevice.stock_id,
                processed_by: userSession?.email || 'admin',
                notes: `Returned from customer: ${outwardDevice.customer_name}`
            }]);

        if (addError) {
            console.error('❌ Error adding to inward:', addError);
            showInventoryToast('Error adding to inward: ' + addError.message, 'error');
            return;
        }

        showInventoryToast('Device returned to inward successfully!', 'success');
        loadInventoryData();
        
    } catch (error) {
        console.error('❌ Error returning device to inward:', error);
        showInventoryToast('Error returning device to inward', 'error');
    }
}

// Remove device from inward
async function removeFromInward(deviceId) {
    if (!confirm('Are you sure you want to remove this device from inward inventory?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('inward_devices')
            .delete()
            .eq('id', deviceId);

        if (error) {
            console.error('❌ Error removing from inward:', error);
            showInventoryToast('Error removing from inward: ' + error.message, 'error');
            return;
        }

        showInventoryToast('Device removed from inward successfully!', 'success');
        loadInventoryData();
        
    } catch (error) {
        console.error('❌ Error removing from inward:', error);
        showInventoryToast('Error removing from inward', 'error');
    }
}

// Remove device from outward
async function removeFromOutward(deviceId) {
    if (!confirm('Are you sure you want to remove this device from outward inventory?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('outward_devices')
            .delete()
            .eq('id', deviceId);

        if (error) {
            console.error('❌ Error removing from outward:', error);
            showInventoryToast('Error removing from outward: ' + error.message, 'error');
            return;
        }

        showInventoryToast('Device removed from outward successfully!', 'success');
        loadInventoryData();
        
    } catch (error) {
        console.error('❌ Error removing from outward:', error);
        showInventoryToast('Error removing from outward', 'error');
    }
}

// CSV Import Functions
function showImportInwardCSV() {
    currentImportType = 'inward';
    showCSVImportModal('inward');
}

function showImportOutwardCSV() {
    currentImportType = 'outward';
    showCSVImportModal('outward');
}

function showCSVImportModal(type) {
    const modalId = `import${type.charAt(0).toUpperCase() + type.slice(1)}CSVModal`;
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        const modalHTML = createCSVImportModalHTML(type);
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById(modalId);
        
        // Set up file input and form handlers
        setupCSVImportHandlers(type);
    }
    
    modal.classList.remove('hidden');
}

function createCSVImportModalHTML(type) {
    const isInward = type === 'inward';
    const title = isInward ? 'Import Inward Devices CSV' : 'Import Outward Devices CSV';
    const sampleColumns = isInward 
        ? 'Device Registration Number, Device IMEI, Device Condition'
        : 'Device Registration Number, Device IMEI, Customer Name, Location, Date, SIM No';
    
    return `
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
                        <h3 class="text-body-l-semibold dark:text-dark-base-600 mb-2">Drop CSV file here or click to select</h3>
                        <p class="text-body-m-regular dark:text-dark-base-500 mb-4">Maximum file size: 5MB</p>
                        <input type="file" id="${type}CSVFile" name="csvFile" accept=".csv" class="hidden">
                        <button type="button" onclick="document.getElementById('${type}CSVFile').click()" class="px-6 py-3 rounded-lg dark:bg-brand-blue-600 dark:text-utility-white hover:dark:bg-brand-blue-500 text-body-s-semibold">
                            Select File
                        </button>
                    </div>
                    
                    <div id="${type}FileInfo" class="hidden">
                        <div class="flex items-center justify-between p-3 rounded-lg dark:bg-dark-fill-base-400">
                            <div class="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                                <div>
                                    <p class="text-body-m-semibold dark:text-dark-base-600" id="${type}FileName"></p>
                                    <p class="text-body-s-regular dark:text-dark-base-500" id="${type}FileSize"></p>
                                </div>
                            </div>
                            <button type="button" onclick="clearSelectedFile('${type}')" class="text-red-500 hover:text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="m18 6-12 12"/>
                                    <path d="m6 6 12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div id="${type}ImportProgress" class="hidden">
                        <div class="progress-bar">
                            <div class="progress-bar-fill" id="${type}ProgressFill" style="width: 0%"></div>
                        </div>
                        <p class="text-body-s-regular dark:text-dark-base-500 mt-2" id="${type}ProgressText">Processing...</p>
                    </div>
                    
                    <div id="${type}ImportResults" class="hidden">
                        <!-- Results will be populated here -->
                    </div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary" id="${type}ImportBtn" disabled>Import CSV</button>
                        <button type="button" onclick="closeCSVImportModal('${type}')" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupCSVImportHandlers(type) {
    const fileInput = document.getElementById(`${type}CSVFile`);
    const form = document.getElementById(`import${type.charAt(0).toUpperCase() + type.slice(1)}CSVForm`);
    const dropArea = document.getElementById(`${type}CSVDropArea`);
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleCSVFileSelect(e, type));
    }
    
    if (form) {
        form.addEventListener('submit', (e) => handleCSVImport(e, type));
    }
    
    if (dropArea) {
        // Drag and drop handlers
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('dragover');
        });
        
        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('dragover');
        });
        
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleCSVFileSelect({ target: fileInput }, type);
            }
        });
    }
}

function handleCSVFileSelect(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showInventoryToast('Please select a valid CSV file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showInventoryToast('File size must be less than 5MB', 'error');
        return;
    }
    
    // Show file info
    document.getElementById(`${type}FileName`).textContent = file.name;
    document.getElementById(`${type}FileSize`).textContent = formatFileSize(file.size);
    document.getElementById(`${type}FileInfo`).classList.remove('hidden');
    document.getElementById(`${type}ImportBtn`).disabled = false;
}

function clearSelectedFile(type) {
    document.getElementById(`${type}CSVFile`).value = '';
    document.getElementById(`${type}FileInfo`).classList.add('hidden');
    document.getElementById(`${type}ImportBtn`).disabled = true;
    document.getElementById(`${type}ImportResults`).classList.add('hidden');
}

function closeCSVImportModal(type) {
    const modalId = `import${type.charAt(0).toUpperCase() + type.slice(1)}CSVModal`;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        clearSelectedFile(type);
    }
}

async function handleCSVImport(e, type) {
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
        
        // Process CSV based on type
        if (type === 'inward') {
            await processInwardCSV(parsedData, type);
        } else if (type === 'outward') {
            await processOutwardCSV(parsedData, type);
        }
        
    } catch (error) {
        console.error(`❌ Error importing ${type} CSV:`, error);
        showInventoryToast(`Error importing CSV: ${error.message}`, 'error');
        hideImportProgress(type);
    }
}

async function processInwardCSV(data, type) {
    const results = {
        total: data.length,
        successful: 0,
        failed: 0,
        errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const progress = 20 + (i / data.length) * 60;
        showImportProgress(type, progress, `Processing row ${i + 1} of ${data.length}...`);
        
        try {
            await processInwardRow(row, i + 1, results);
        } catch (error) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: ${error.message}`);
        }
        
        // Small delay to prevent overwhelming the database
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    showImportResults(type, results);
    showImportProgress(type, 100, 'Import completed!');
    
    // Refresh data
    await loadInventoryData();
}

async function processOutwardCSV(data, type) {
    const results = {
        total: data.length,
        successful: 0,
        failed: 0,
        errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const progress = 20 + (i / data.length) * 60;
        showImportProgress(type, progress, `Processing row ${i + 1} of ${data.length}...`);
        
        try {
            await processOutwardRow(row, i + 1, results);
        } catch (error) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: ${error.message}`);
        }
        
        // Small delay to prevent overwhelming the database
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    showImportResults(type, results);
    showImportProgress(type, 100, 'Import completed!');
    
    // Refresh data
    await loadInventoryData();
}

async function processInwardRow(row, rowNumber, results) {
    const registrationNumber = row['Device Registration Number'] || row['device_registration_number'];
    const imei = row['Device IMEI'] || row['device_imei'];
    const condition = row['Device Condition'] || row['device_condition'] || 'good';
    
    if (!registrationNumber || !imei) {
        throw new Error('Missing required fields: Device Registration Number and Device IMEI');
    }
    
    // Check if device exists in stock
    const { data: stockDevice, error: stockError } = await supabase
        .from('stock')
        .select('*')
        .eq('device_registration_number', registrationNumber)
        .single();

    if (stockError || !stockDevice) {
        throw new Error('Device not found in stock database');
    }
    
    // Verify IMEI
    if (stockDevice.device_imei !== imei) {
        throw new Error('IMEI does not match stock database');
    }
    
    // Check if already in inward
    const { data: existingInward } = await supabase
        .from('inward_devices')
        .select('*')
        .eq('device_registration_number', registrationNumber)
        .single();

    if (existingInward) {
        throw new Error('Device already exists in inward inventory');
    }
    
    // Add to inward
    const { error } = await supabase
        .from('inward_devices')
        .insert([{
            device_registration_number: registrationNumber,
            device_imei: imei,
            device_condition: condition,
            inward_date: new Date().toISOString().split('T')[0],
            stock_id: stockDevice.id,
            processed_by: userSession?.email || 'admin',
            notes: `Imported from CSV`
        }]);

    if (error) {
        throw new Error(error.message);
    }
    
    results.successful++;
}

async function processOutwardRow(row, rowNumber, results) {
    const registrationNumber = row['Device Registration Number'] || row['device_registration_number'];
    const imei = row['Device IMEI'] || row['device_imei'];
    const customerName = row['Customer Name'] || row['customer_name'];
    const location = row['Location'] || row['location'];
    const date = row['Date'] || row['date'] || new Date().toISOString().split('T')[0];
    const simNo = row['SIM No'] || row['sim_no'] || '';
    
    if (!registrationNumber || !imei || !customerName || !location) {
        throw new Error('Missing required fields');
    }
    
    // Check if device exists in stock
    const { data: stockDevice, error: stockError } = await supabase
        .from('stock')
        .select('*')
        .eq('device_registration_number', registrationNumber)
        .single();

    if (stockError || !stockDevice) {
        throw new Error('Device not found in stock database');
    }
    
    // Verify IMEI
    if (stockDevice.device_imei !== imei) {
        throw new Error('IMEI does not match stock database');
    }
    
    // Find customer by name
    const customer = approvedCustomers.find(c => 
        c.customer_name.toLowerCase() === customerName.toLowerCase()
    );
    
    if (!customer) {
        throw new Error(`Customer "${customerName}" not found in approved customers`);
    }
    
    // Check if already in outward
    const { data: existingOutward } = await supabase
        .from('outward_devices')
        .select('*')
        .eq('device_registration_number', registrationNumber)
        .single();

    if (existingOutward) {
        throw new Error('Device already exists in outward inventory');
    }
    
    // Add to outward
    const { error } = await supabase
        .from('outward_devices')
        .insert([{
            device_registration_number: registrationNumber,
            device_imei: imei,
            customer_id: customer.id,
            customer_name: customer.customer_name,
            location: location,
            outward_date: date,
            sim_no: simNo,
            stock_id: stockDevice.id,
            processed_by: userSession?.email || 'admin',
            notes: `Imported from CSV`
        }]);

    if (error) {
        throw new Error(error.message);
    }
    
    results.successful++;
}

// Utility functions
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

function showImportResults(type, results) {
    const resultsDiv = document.getElementById(`${type}ImportResults`);
    if (!resultsDiv) return;
    
    let html = '<h4 class="text-body-l-semibold dark:text-dark-base-600 mb-3">Import Results</h4>';
    
    // Summary
    html += `
        <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="import-result success">
                <div class="text-body-s-semibold text-green-600">Successful</div>
                <div class="text-heading-6 text-green-600">${results.successful}</div>
            </div>
            <div class="import-result error">
                <div class="text-body-s-semibold text-red-600">Failed</div>
                <div class="text-heading-6 text-red-600">${results.failed}</div>
            </div>
            <div class="import-result">
                <div class="text-body-s-semibold dark:text-dark-base-600">Total</div>
                <div class="text-heading-6 dark:text-dark-base-600">${results.total}</div>
            </div>
        </div>
    `;
    
    // Errors
    if (results.errors.length > 0) {
        html += '<h5 class="text-body-m-semibold dark:text-dark-base-600 mb-2">Errors:</h5>';
        html += '<div class="max-h-32 overflow-y-auto space-y-1">';
        results.errors.forEach(error => {
            html += `<div class="error-message">${error}</div>`;
        });
        html += '</div>';
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.classList.remove('hidden');
}

// Search functionality
function handleInventorySearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredInwardDevices = [...inwardDevices];
        filteredOutwardDevices = [...outwardDevices];
    } else {
        filteredInwardDevices = inwardDevices.filter(device => {
            return (
                device.device_registration_number.toLowerCase().includes(searchTerm) ||
                device.device_imei.toLowerCase().includes(searchTerm) ||
                device.device_condition.toLowerCase().includes(searchTerm) ||
                (device.stock?.device_model_no && device.stock.device_model_no.toLowerCase().includes(searchTerm))
            );
        });
        
        filteredOutwardDevices = outwardDevices.filter(device => {
            return (
                device.device_registration_number.toLowerCase().includes(searchTerm) ||
                device.device_imei.toLowerCase().includes(searchTerm) ||
                device.customer_name.toLowerCase().includes(searchTerm) ||
                device.location.toLowerCase().includes(searchTerm) ||
                (device.stock?.device_model_no && device.stock.device_model_no.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    updateInventoryTabs();
}

// Show inventory toast
function showInventoryToast(message, type = 'info') {
    // Use the existing toast system
    showEmailToast(message);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize inventory management after a short delay to ensure other systems are ready
    setTimeout(() => {
        initializeInventoryManagement();
    }, 1000);
});
