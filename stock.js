// ====================================
// STOCK MANAGEMENT - COMPLETE FIXED VERSION
// ====================================

// Global variables for stock
let stockDevices = [];
let filteredStockDevices = [];
let currentStockImportType = null;
let stockSearchTimeout = null;

// Stock status options
const STOCK_STATUSES = [
    { value: 'available', label: 'Available', class: 'available' },
    { value: 'assigned', label: 'Assigned', class: 'assigned' },
    { value: 'maintenance', label: 'Maintenance', class: 'maintenance' },
    { value: 'defective', label: 'Defective', class: 'defective' },
    { value: 'returned', label: 'Returned', class: 'returned' }
];

// Initialize stock management
function initializeStockManagement() {
    console.log('🔧 Initializing Stock Management...');
    setupStockEventListeners();
    loadStockData();
    setupStockRealtimeListeners();
}

// Setup stock event listeners
function setupStockEventListeners() {
    // Search functionality
    const stockSearchInput = document.getElementById('stockSearchInput');
    if (stockSearchInput) {
        stockSearchInput.addEventListener('input', handleStockSearch);
    }

    console.log('✅ Stock event listeners set up');
}

// Setup realtime listeners for stock
function setupStockRealtimeListeners() {
    // Listen for stock changes
    supabase
        .channel('stock')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, 
            (payload) => {
                console.log('📦 Stock change received!', payload);
                loadStockData();
            }
        )
        .subscribe();

    console.log('🔄 Stock realtime listeners set up');
}

// ====================================
// DATA LOADING FUNCTIONS
// ====================================

// Load stock data
async function loadStockData() {
    try {
        const { data, error } = await supabase
            .from('stock')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error loading stock data:', error);
            throw error;
        }

        stockDevices = data || [];
        filteredStockDevices = [...stockDevices];
        
        console.log(`📦 Loaded ${stockDevices.length} stock devices`);
        
        updateStockStats();
        updateStockTable();
        
    } catch (error) {
        console.error('❌ Error loading stock data:', error);
        // Create mock data for development
        stockDevices = [];
        filteredStockDevices = [];
        updateStockStats();
        updateStockTable();
        showStockToast('Error loading stock data. Using offline mode.', 'error');
    }
}

// ====================================
// UI UPDATE FUNCTIONS
// ====================================

// Update stock statistics
function updateStockStats() {
    const totalStock = stockDevices.length;
    const availableStock = stockDevices.filter(d => d.current_status === 'available').length;
    const allocatedStock = stockDevices.filter(d => d.current_status === 'assigned').length;
    const returnedStock = stockDevices.filter(d => d.current_status === 'returned').length;
    
    // Update stat cards
    const totalStockEl = document.getElementById('totalStockCount');
    const availableStockEl = document.getElementById('availableStockCount');
    const allocatedStockEl = document.getElementById('allocatedStockCount');
    const returnedStockEl = document.getElementById('returnedStockCount');
    
    if (totalStockEl) totalStockEl.textContent = totalStock;
    if (availableStockEl) availableStockEl.textContent = availableStock;
    if (allocatedStockEl) allocatedStockEl.textContent = allocatedStock;
    if (returnedStockEl) returnedStockEl.textContent = returnedStock;
}

// Update stock table
function updateStockTable() {
    const tableBody = document.getElementById('stockTableBody');
    const emptyState = document.getElementById('stockEmptyState');
    
    if (!tableBody || !emptyState) return;
    
    if (filteredStockDevices.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        tableBody.innerHTML = filteredStockDevices.map(device => createStockTableRow(device)).join('');
    }
}

// Create stock table row - ENHANCED
function createStockTableRow(device) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        const statusInfo = STOCK_STATUSES.find(s => s.value === status) || 
                          { class: 'available', label: status };
        return `<span class="stock-status-badge ${statusInfo.class}">${statusInfo.label}</span>`;
    };

    return `
        <tr class="stock-table-row">
            <td>${device.sl_no || 'N/A'}</td>
            <td>${device.po_no || 'N/A'}</td>
            <td>${device.batch_no || 'N/A'}</td>
            <td>${formatDate(device.inward_date)}</td>
            <td>${device.device_model_no}</td>
            <td>${device.device_registration_number}</td>
            <td>${device.device_imei}</td>
            <td>${getStatusBadge(device.current_status)}</td>
            <td>
                <div class="flex gap-2">
                    <button onclick="editStockDevice(${device.id})" class="stock-action-btn primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                    </button>
                    <button onclick="deleteStockDevice(${device.id})" class="stock-action-btn danger">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// ====================================
// ADD STOCK DEVICE FUNCTIONS
// ====================================

function showAddStockForm() {
    const modalHTML = `
        <div id="addStockModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 stock-modal">
            <div class="stock-modal-content rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-heading-6 dark:text-dark-base-600">Add Stock Device</h2>
                    <button onclick="closeAddStockForm()" class="p-2 rounded-lg hover:dark:bg-dark-fill-base-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-base-600">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="addStockForm" class="stock-form space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="stock-form-field">
                            <label class="stock-form-label">Sl. No.</label>
                            <input type="number" name="slNo" class="stock-form-input" placeholder="Enter serial number">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">PO No</label>
                            <input type="text" name="poNo" class="stock-form-input" placeholder="Enter PO number">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Batch No.</label>
                            <input type="text" name="batchNo" class="stock-form-input" placeholder="Enter batch number">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Inward Date</label>
                            <input type="date" name="inwardDate" class="stock-form-input">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Device Model No. *</label>
                            <input type="text" name="deviceModelNo" class="stock-form-input" placeholder="Enter device model number" required>
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Device Registration Number *</label>
                            <input type="text" name="deviceRegistrationNumber" class="stock-form-input" placeholder="Enter device registration number" required>
                        </div>
                        
                        <div class="stock-form-field md:col-span-2">
                            <label class="stock-form-label">Device IMEI *</label>
                            <input type="text" name="deviceImei" class="stock-form-input" placeholder="Enter device IMEI (15 digits)" pattern="[0-9]{15}" maxlength="15" required>
                            <small class="text-body-s-regular dark:text-dark-base-500">Must be exactly 15 digits</small>
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary">Add Stock Device</button>
                        <button type="button" onclick="closeAddStockForm()" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('addStockModal').classList.remove('hidden');
    
    // Set today's date as default
    const dateInput = document.querySelector('#addStockForm input[name="inwardDate"]');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Set up form handler
    const form = document.getElementById('addStockForm');
    if (form) {
        form.addEventListener('submit', handleAddStockDevice);
    }
}

function closeAddStockForm() {
    const modal = document.getElementById('addStockModal');
    if (modal) {
        modal.remove();
    }
}

// ====================================
// FORM HANDLERS
// ====================================

async function handleAddStockDevice(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const deviceModelNo = formData.get('deviceModelNo').trim();
    const deviceRegistrationNumber = formData.get('deviceRegistrationNumber').trim();
    const deviceImei = formData.get('deviceImei').trim();
    
    // Validation
    if (!deviceModelNo || !deviceRegistrationNumber || !deviceImei) {
        showStockToast('Please fill in all required fields', 'error');
        return;
    }
    
    // IMEI validation - must be exactly 15 digits
    if (!/^\d{15}$/.test(deviceImei)) {
        showStockToast('IMEI must be exactly 15 digits', 'error');
        return;
    }
    
    try {
        // Check for duplicate registration number
        const { data: existingDevice } = await supabase
            .from('stock')
            .select('*')
            .eq('device_registration_number', deviceRegistrationNumber)
            .single();

        if (existingDevice) {
            showStockToast(`Device with registration number "${deviceRegistrationNumber}" already exists`, 'error');
            return;
        }
        
        // Check for duplicate IMEI
        const { data: existingImei } = await supabase
            .from('stock')
            .select('*')
            .eq('device_imei', deviceImei)
            .single();

        if (existingImei) {
            showStockToast(`Device with IMEI "${deviceImei}" already exists`, 'error');
            return;
        }
        
        // Prepare stock data
        const stockData = {
            sl_no: parseInt(formData.get('slNo')) || null,
            po_no: formData.get('poNo').trim() || '',
            batch_no: formData.get('batchNo').trim() || '',
            inward_date: formData.get('inwardDate') || new Date().toISOString().split('T')[0],
            device_model_no: deviceModelNo,
            device_registration_number: deviceRegistrationNumber,
            device_imei: deviceImei,
            device_condition: 'new',
            current_status: 'available',
            inventory_status: 'in_stock',
            imported_by: window.userSession?.email || 'admin'
        };
        
        const { data: stockDevice, error } = await supabase
            .from('stock')
            .insert([stockData])
            .select()
            .single();

        if (error) {
            console.error('❌ Error adding stock device:', error);
            showStockToast('Error adding device: ' + error.message, 'error');
            return;
        }
        
        showStockToast('Stock device added successfully', 'success');
        closeAddStockForm();
        loadStockData();
        
        // Auto-add to inward inventory
        await autoAddToInward(stockDevice, stockData);
        
    } catch (error) {
        console.error('❌ Error adding stock device:', error);
        showStockToast('Error adding device', 'error');
    }
}

// Auto-add device to inward inventory when added to stock
async function autoAddToInward(stockDevice, stockData) {
    try {
        // Add to inward inventory
        const { error: inwardError } = await supabase
            .from('inward_devices')
            .insert([{
                device_registration_number: stockData.device_registration_number,
                device_imei: stockData.device_imei,
                device_condition: stockData.device_condition,
                inward_date: stockData.inward_date || new Date().toISOString().split('T')[0],
                stock_id: stockDevice.id,
                processed_by: window.userSession?.email || 'admin',
                notes: 'Auto-added from stock'
            }]);

        if (inwardError) {
            console.error('❌ Error auto-adding to inward:', inwardError);
        } else {
            console.log('✅ Device automatically added to inward inventory');
        }
        
    } catch (error) {
        console.error('❌ Error in auto-add to inward:', error);
    }
}

// ====================================
// CSV IMPORT FUNCTIONS - ENHANCED
// ====================================

function showImportStockCSV() {
    currentStockImportType = 'stock';
    showStockCSVImportModal();
}

function showStockCSVImportModal() {
    const modalHTML = `
        <div id="importStockCSVModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="dark:bg-dark-fill-base-300 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-heading-6 dark:text-dark-base-600">Import Stock CSV</h2>
                    <button onclick="closeStockCSVImportModal()" class="p-2 rounded-lg hover:dark:bg-dark-fill-base-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-base-600">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                </div>
                
                <div class="mb-6">
                    <h3 class="text-body-l-semibold dark:text-dark-base-600 mb-2">CSV Format Requirements</h3>
                    <p class="text-body-m-regular dark:text-dark-base-500 mb-2">Your CSV file should contain the following columns (in this exact order):</p>
                    <code class="bg-gray-100 dark:bg-dark-fill-base-400 p-2 rounded text-sm block">
                        Sl. No., PO No, Batch No., Inward Date, Device Model No., Device Registration Number, Device IMEI
                    </code>
                </div>
                
                <form id="importStockCSVForm" class="space-y-4">
                    <div class="csv-import-container" id="stockCSVDropArea">
                        <div class="csv-import-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                        </div>
                        <h3 class="csv-import-title">Drop CSV file here or click to select</h3>
                        <p class="csv-import-subtitle">Maximum file size: 10MB</p>
                        <input type="file" id="stockCSVFile" name="csvFile" accept=".csv" class="hidden">
                        <button type="button" onclick="document.getElementById('stockCSVFile').click()" class="csv-upload-button">
                            Select File
                        </button>
                    </div>
                    
                    <div id="stockFileInfo" class="file-info hidden">
                        <div class="file-info-content">
                            <div class="file-info-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                            </div>
                            <div class="file-info-details">
                                <div class="file-info-name"></div>
                                <div class="file-info-size"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="stockImportProgress" class="hidden">
                        <div class="progress-bar">
                            <div id="stockProgressFill" class="progress-bar-fill" style="width: 0%"></div>
                        </div>
                        <p id="stockProgressText" class="text-center text-body-m-regular dark:text-dark-base-600 mt-2">Processing...</p>
                    </div>
                    
                    <div id="stockImportResults" class="import-results hidden">
                        <!-- Results will be populated here -->
                    </div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary">Import CSV</button>
                        <button type="button" onclick="closeStockCSVImportModal()" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set up file input handler
    const fileInput = document.getElementById('stockCSVFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleStockCSVFileSelect);
    }
    
    // Set up form handler
    const form = document.getElementById('importStockCSVForm');
    if (form) {
        form.addEventListener('submit', handleImportStockCSV);
    }
    
    // Set up drag and drop
    setupStockCSVDragDrop();
}

function setupStockCSVDragDrop() {
    const dropArea = document.getElementById('stockCSVDropArea');
    if (!dropArea) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });
    
    dropArea.addEventListener('drop', handleStockCSVDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleStockCSVDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        const fileInput = document.getElementById('stockCSVFile');
        if (fileInput) {
            fileInput.files = files;
            handleStockCSVFileSelect({ target: fileInput });
        }
    }
}

function handleStockCSVFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showStockToast('Please select a CSV file', 'error');
        clearStockSelectedFile();
        return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        showStockToast('File size too large. Maximum 10MB allowed.', 'error');
        clearStockSelectedFile();
        return;
    }
    
    // Show file info
    const fileInfo = document.getElementById('stockFileInfo');
    const fileName = fileInfo.querySelector('.file-info-name');
    const fileSize = fileInfo.querySelector('.file-info-size');
    
    if (fileInfo && fileName && fileSize) {
        fileName.textContent = file.name;
        fileSize.textContent = formatStockFileSize(file.size);
        fileInfo.classList.remove('hidden');
    }
}

function clearStockSelectedFile() {
    const fileInput = document.getElementById('stockCSVFile');
    const fileInfo = document.getElementById('stockFileInfo');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.classList.add('hidden');
}

function closeStockCSVImportModal() {
    const modal = document.getElementById('importStockCSVModal');
    if (modal) {
        modal.remove();
    }
}

// Handle import stock CSV
async function handleImportStockCSV(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('stockCSVFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showStockToast('Please select a CSV file', 'error');
        return;
    }
    
    try {
        showStockImportProgress(0, 'Reading CSV file...');
        
        const csvText = await readStockFileAsText(file);
        const parsedData = parseStockCSV(csvText);
        
        if (parsedData.length === 0) {
            showStockToast('CSV file is empty or invalid', 'error');
            hideStockImportProgress();
            return;
        }
        
        showStockImportProgress(20, 'Validating data...');
        
        await processStockCSV(parsedData, file);
        
    } catch (error) {
        console.error('❌ Error importing stock CSV:', error);
        showStockToast(`Error importing CSV: ${error.message}`, 'error');
        hideStockImportProgress();
    }
}

// Process stock CSV data
async function processStockCSV(data, file) {
    const results = {
        total: data.length,
        successful: 0,
        failed: 0,
        errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const progress = 20 + (i / data.length) * 60;
        showStockImportProgress(progress, `Processing row ${i + 1} of ${data.length}...`);
        
        try {
            await processStockRow(row, i + 1, results);
        } catch (error) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: ${error.message}`);
        }
        
        // Small delay to prevent overwhelming the database
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    showStockImportResults(results);
    showStockImportProgress(100, 'Import completed!');
    
    // Log import to database
    await logCSVImport('stock', file.name, results);
    
    // Refresh data
    await loadStockData();
}

// Process individual stock row
async function processStockRow(row, rowNumber, results) {
    const slNo = parseInt(row['Sl. No.'] || row['sl_no']) || null;
    const poNo = row['PO No'] || row['po_no'] || '';
    const batchNo = row['Batch No.'] || row['batch_no'] || '';
    const inwardDate = row['Inward Date'] || row['inward_date'] || '';
    const deviceModelNo = row['Device Model No.'] || row['device_model_no'];
    const deviceRegistrationNumber = row['Device Registration Number'] || row['device_registration_number'];
    const deviceImei = row['Device IMEI'] || row['device_imei'];
    
    if (!deviceModelNo || !deviceRegistrationNumber || !deviceImei) {
        throw new Error('Missing required fields: Device Model No., Device Registration Number, and Device IMEI');
    }
    
    // IMEI validation
    if (!/^\d{15}$/.test(deviceImei)) {
        throw new Error(`Invalid IMEI format: "${deviceImei}". Must be exactly 15 digits.`);
    }
    
    // Check for duplicate registration number
    const { data: existingDevice } = await supabase
        .from('stock')
        .select('*')
        .eq('device_registration_number', deviceRegistrationNumber)
        .single();

    if (existingDevice) {
        throw new Error(`Device with registration number "${deviceRegistrationNumber}" already exists`);
    }
    
    // Check for duplicate IMEI
    const { data: existingImei } = await supabase
        .from('stock')
        .select('*')
        .eq('device_imei', deviceImei)
        .single();

    if (existingImei) {
        throw new Error(`Device with IMEI "${deviceImei}" already exists`);
    }
    
    // Add to stock
    const stockData = {
        sl_no: slNo,
        po_no: poNo,
        batch_no: batchNo,
        inward_date: inwardDate || null,
        device_model_no: deviceModelNo,
        device_registration_number: deviceRegistrationNumber,
        device_imei: deviceImei,
        device_condition: 'new',
        current_status: 'available',
        inventory_status: 'in_stock',
        imported_by: window.userSession?.email || 'admin'
    };
    
    const { data: stockDevice, error } = await supabase
        .from('stock')
        .insert([stockData])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }
    
    // Auto-add to inward inventory
    try {
        await supabase
            .from('inward_devices')
            .insert([{
                device_registration_number: stockData.device_registration_number,
                device_imei: stockData.device_imei,
                device_condition: stockData.device_condition,
                inward_date: stockData.inward_date || new Date().toISOString().split('T')[0],
                stock_id: stockDevice.id,
                processed_by: window.userSession?.email || 'admin',
                notes: 'Auto-added from stock'
            }]);
    } catch (inwardError) {
        console.error('❌ Error auto-adding to inward:', inwardError);
    }
    
    results.successful++;
}

// ====================================
// STOCK ACTIONS
// ====================================

async function editStockDevice(deviceId) {
    const device = stockDevices.find(d => d.id === deviceId);
    if (!device) {
        showStockToast('Device not found', 'error');
        return;
    }
    
    const modalHTML = `
        <div id="editStockModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 stock-modal">
            <div class="stock-modal-content rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-heading-6 dark:text-dark-base-600">Edit Stock Device</h2>
                    <button onclick="closeEditStockForm()" class="p-2 rounded-lg hover:dark:bg-dark-fill-base-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-base-600">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="editStockForm" class="stock-form space-y-4">
                    <input type="hidden" name="deviceId" value="${device.id}">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="stock-form-field">
                            <label class="stock-form-label">Sl. No.</label>
                            <input type="number" name="slNo" class="stock-form-input" value="${device.sl_no || ''}">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">PO No</label>
                            <input type="text" name="poNo" class="stock-form-input" value="${device.po_no || ''}">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Batch No.</label>
                            <input type="text" name="batchNo" class="stock-form-input" value="${device.batch_no || ''}">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Inward Date</label>
                            <input type="date" name="inwardDate" class="stock-form-input" value="${device.inward_date || ''}">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Device Model No. *</label>
                            <input type="text" name="deviceModelNo" class="stock-form-input" value="${device.device_model_no}" required>
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Current Status</label>
                            <select name="currentStatus" class="stock-form-select">
                                ${STOCK_STATUSES.map(status => 
                                    `<option value="${status.value}" ${device.current_status === status.value ? 'selected' : ''}>${status.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="stock-form-field md:col-span-2">
                            <label class="stock-form-label">Device Registration Number *</label>
                            <input type="text" name="deviceRegistrationNumber" class="stock-form-input" value="${device.device_registration_number}" readonly>
                            <small class="text-body-s-regular dark:text-dark-base-500">Registration number cannot be changed</small>
                        </div>
                        
                        <div class="stock-form-field md:col-span-2">
                            <label class="stock-form-label">Device IMEI *</label>
                            <input type="text" name="deviceImei" class="stock-form-input" value="${device.device_imei}" readonly>
                            <small class="text-body-s-regular dark:text-dark-base-500">IMEI cannot be changed</small>
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary">Update Device</button>
                        <button type="button" onclick="closeEditStockForm()" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set up form handler
    const form = document.getElementById('editStockForm');
    if (form) {
        form.addEventListener('submit', handleEditStockDevice);
    }
}

function closeEditStockForm() {
    const modal = document.getElementById('editStockModal');
    if (modal) {
        modal.remove();
    }
}

async function handleEditStockDevice(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const deviceId = parseInt(formData.get('deviceId'));
    
    const updateData = {
        sl_no: parseInt(formData.get('slNo')) || null,
        po_no: formData.get('poNo').trim() || '',
        batch_no: formData.get('batchNo').trim() || '',
        inward_date: formData.get('inwardDate') || null,
        device_model_no: formData.get('deviceModelNo').trim(),
        current_status: formData.get('currentStatus')
    };
    
    try {
        const { error } = await supabase
            .from('stock')
            .update(updateData)
            .eq('id', deviceId);

        if (error) {
            console.error('❌ Error updating stock device:', error);
            showStockToast('Error updating device: ' + error.message, 'error');
            return;
        }
        
        showStockToast('Stock device updated successfully', 'success');
        closeEditStockForm();
        loadStockData();
        
    } catch (error) {
        console.error('❌ Error updating stock device:', error);
        showStockToast('Error updating device', 'error');
    }
}

async function deleteStockDevice(deviceId) {
    if (!confirm('Are you sure you want to delete this stock device? This action cannot be undone.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('stock')
            .delete()
            .eq('id', deviceId);

        if (error) {
            console.error('❌ Error deleting stock device:', error);
            showStockToast('Error deleting device: ' + error.message, 'error');
            return;
        }
        
        showStockToast('Stock device deleted successfully', 'success');
        loadStockData();
        
    } catch (error) {
        console.error('❌ Error deleting stock device:', error);
        showStockToast('Error deleting device', 'error');
    }
}

// ====================================
// CSV EXPORT FUNCTION
// ====================================

function exportStockCSV() {
    if (stockDevices.length === 0) {
        showStockToast('No stock data to export', 'error');
        return;
    }
    
    try {
        const headers = [
            'Sl. No.',
            'PO No',
            'Batch No.',
            'Inward Date',
            'Device Model No.',
            'Device Registration Number',
            'Device IMEI',
            'Current Status',
            'Device Condition',
            'Created At'
        ];
        
        const csvContent = [
            headers.join(','),
            ...stockDevices.map(device => [
                device.sl_no || '',
                device.po_no || '',
                device.batch_no || '',
                device.inward_date || '',
                device.device_model_no || '',
                device.device_registration_number || '',
                device.device_imei || '',
                device.current_status || '',
                device.device_condition || '',
                device.created_at ? new Date(device.created_at).toLocaleDateString() : ''
            ].map(field => `"${field}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `stock_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStockToast('Stock data exported successfully', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting stock CSV:', error);
        showStockToast('Error exporting data', 'error');
    }
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

function handleStockSearch(e) {
    clearTimeout(stockSearchTimeout);
    const searchTerm = e.target.value.toLowerCase();
    
    stockSearchTimeout = setTimeout(() => {
        // Filter stock devices
        filteredStockDevices = stockDevices.filter(device => 
            device.device_model_no.toLowerCase().includes(searchTerm) ||
            device.device_registration_number.toLowerCase().includes(searchTerm) ||
            device.device_imei.toLowerCase().includes(searchTerm) ||
            (device.po_no || '').toLowerCase().includes(searchTerm) ||
            (device.batch_no || '').toLowerCase().includes(searchTerm) ||
            device.current_status.toLowerCase().includes(searchTerm)
        );
        
        updateStockTable();
    }, 300);
}

function showStockToast(message, type = 'success') {
    // Use the main toast function if available
    if (typeof showEmailToast === 'function') {
        showEmailToast(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

function readStockFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

function parseStockCSV(csvText) {
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

function formatStockFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showStockImportProgress(percentage, text) {
    const progressDiv = document.getElementById('stockImportProgress');
    const progressFill = document.getElementById('stockProgressFill');
    const progressText = document.getElementById('stockProgressText');
    
    if (progressDiv) progressDiv.classList.remove('hidden');
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = text;
}

function hideStockImportProgress() {
    const progressDiv = document.getElementById('stockImportProgress');
    if (progressDiv) progressDiv.classList.add('hidden');
}

function showStockImportResults(results) {
    const resultsDiv = document.getElementById('stockImportResults');
    if (!resultsDiv) return;
    
    let html = `
        <h4 class="text-body-l-semibold dark:text-dark-base-600 mb-4">Import Results</h4>
        <div class="import-results-summary">
            <div class="import-result-stat success">
                <div class="import-result-number" style="color: #10b981;">${results.successful}</div>
                <div class="import-result-label" style="color: #10b981;">Successful</div>
            </div>
            <div class="import-result-stat failed">
                <div class="import-result-number" style="color: #ef4444;">${results.failed}</div>
                <div class="import-result-label" style="color: #ef4444;">Failed</div>
            </div>
            <div class="import-result-stat total">
                <div class="import-result-number" style="color: #3b82f6;">${results.total}</div>
                <div class="import-result-label" style="color: #3b82f6;">Total</div>
            </div>
        </div>
    `;
    
    // Errors
    if (results.errors.length > 0) {
        html += '<h5 style="color: rgba(220, 226, 229, 0.9); margin: 1rem 0 0.5rem 0;">Errors:</h5>';
        html += '<div class="import-errors">';
        results.errors.forEach(error => {
            html += `<div class="import-error-item">${error}</div>`;
        });
        html += '</div>';
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.classList.remove('hidden');
}

// Log CSV import
async function logCSVImport(type, filename, results) {
    try {
        await supabase
            .from('csv_import_logs')
            .insert([{
                filename: filename,
                import_type: type,
                total_rows: results.total,
                successful_imports: results.successful,
                failed_imports: results.failed,
                error_details: results.errors,
                imported_by: window.userSession?.email || 'admin'
            }]);
    } catch (error) {
        console.error('❌ Error logging CSV import:', error);
    }
}

// Make functions globally available
window.initializeStockManagement = initializeStockManagement;
window.showAddStockForm = showAddStockForm;
window.closeAddStockForm = closeAddStockForm;
window.showImportStockCSV = showImportStockCSV;
window.closeStockCSVImportModal = closeStockCSVImportModal;
window.exportStockCSV = exportStockCSV;
window.editStockDevice = editStockDevice;
window.deleteStockDevice = deleteStockDevice;
window.closeEditStockForm = closeEditStockForm;
