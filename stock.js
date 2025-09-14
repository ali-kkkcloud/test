// ====================================
// STOCK MANAGEMENT FUNCTIONS
// ====================================

// Global variables for stock
let stockDevices = [];
let filteredStockDevices = [];
let stockSearchTimeout = null;
let currentStockImportType = null;

// Initialize stock management
function initializeStockManagement() {
    console.log('📦 Initializing Stock Management...');
    setupStockEventListeners();
    loadStockData();
    setupStockRealtimeListeners();
}

// Setup stock event listeners
function setupStockEventListeners() {
    // Add single device form
    const addStockForm = document.getElementById('addStockForm');
    if (addStockForm) {
        addStockForm.addEventListener('submit', handleAddSingleStock);
    }

    // CSV import form
    const importStockCSVForm = document.getElementById('importStockCSVForm');
    if (importStockCSVForm) {
        importStockCSVForm.addEventListener('submit', handleImportStockCSV);
    }

    // File input handler
    const stockCSVFile = document.getElementById('stockCSVFile');
    if (stockCSVFile) {
        stockCSVFile.addEventListener('change', handleStockCSVFileSelect);
    }

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

// Show stock content
function showStock() {
    hideAllContent();
    document.getElementById('stockContent').classList.remove('hidden');
    updateMenuHighlight('stock');
    loadStockData();
}

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
        
        updateStockStats();
        updateStockTable();
        
        console.log(`📦 Loaded ${stockDevices.length} stock devices`);
    } catch (error) {
        console.error('❌ Error loading stock data:', error);
        showStockToast('Error loading stock data', 'error');
    }
}

// Update stock statistics
function updateStockStats() {
    const totalStock = stockDevices.length;
    const availableStock = stockDevices.filter(device => device.current_status === 'available').length;
    const allocatedStock = stockDevices.filter(device => device.current_status === 'allocated').length;
    const returnedStock = stockDevices.filter(device => device.current_status === 'returned').length;
    
    // Update stat displays
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
    const tableContainer = document.querySelector('.stock-table-container');
    
    if (!tableBody || !emptyState) return;

    if (filteredStockDevices.length === 0) {
        if (tableContainer) tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        if (tableContainer) tableContainer.style.display = 'block';
        emptyState.style.display = 'none';
        tableBody.innerHTML = filteredStockDevices.map(device => createStockTableRow(device)).join('');
    }
}

// Create stock table row
function createStockTableRow(device) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        const statusClasses = {
            'available': 'stock-status-badge available',
            'allocated': 'stock-status-badge allocated',
            'returned': 'stock-status-badge returned'
        };
        
        return `<span class="${statusClasses[status] || 'stock-status-badge'}">${status}</span>`;
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

// Show add stock form
function showAddStockForm() {
    const modal = document.getElementById('addStockModal');
    if (!modal) {
        createAddStockModal();
    } else {
        modal.classList.remove('hidden');
    }
}

// Create add stock modal
function createAddStockModal() {
    const modalHTML = `
        <div id="addStockModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="dark:bg-dark-fill-base-300 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-heading-6 dark:text-dark-base-600">Add Single Device to Stock</h2>
                    <button onclick="closeAddStockForm()" class="p-2 rounded-lg hover:dark:bg-dark-fill-base-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-dark-base-600">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="addStockForm" class="stock-form">
                    <div class="stock-form-grid">
                        <div class="stock-form-field">
                            <label class="stock-form-label">Sl. No.</label>
                            <input type="number" name="slNo" class="stock-form-input" placeholder="Enter serial number">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">PO No</label>
                            <input type="text" name="poNo" class="stock-form-input" placeholder="Enter PO number">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Batch No</label>
                            <input type="text" name="batchNo" class="stock-form-input" placeholder="Enter batch number">
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Inward Date</label>
                            <input type="date" name="inwardDate" class="stock-form-input" required>
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Device Model No *</label>
                            <input type="text" name="deviceModelNo" class="stock-form-input" placeholder="Enter device model number" required>
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Device Registration Number *</label>
                            <input type="text" name="deviceRegistrationNumber" class="stock-form-input" placeholder="Enter device registration number" required>
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Device IMEI *</label>
                            <input type="text" name="deviceImei" class="stock-form-input" placeholder="Enter device IMEI" required>
                        </div>
                        
                        <div class="stock-form-field">
                            <label class="stock-form-label">Device Condition</label>
                            <select name="deviceCondition" class="stock-form-select">
                                <option value="new">New Device</option>
                                <option value="good">Good</option>
                                <option value="lense_issue">Lense Issue</option>
                                <option value="sim_module_fail">SIM Module Fail</option>
                                <option value="auto_restart">Auto Restart</option>
                                <option value="device_tampered">Device Tampered</option>
                                <option value="used">Used</option>
                                <option value="refurbished">Refurbished</option>
                                <option value="damaged">Damaged</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="flex gap-4 mt-6">
                        <button type="submit" class="stock-action-btn success">Add to Stock</button>
                        <button type="button" onclick="closeAddStockForm()" class="stock-action-btn secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('addStockModal').classList.remove('hidden');
    
    // Set default date to today
    const dateInput = document.querySelector('input[name="inwardDate"]');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Set up form handler
    const form = document.getElementById('addStockForm');
    if (form) {
        form.addEventListener('submit', handleAddSingleStock);
    }
}

// Close add stock form
function closeAddStockForm() {
    const modal = document.getElementById('addStockModal');
    if (modal) {
        modal.classList.add('hidden');
        const form = document.getElementById('addStockForm');
        if (form) form.reset();
    }
}

// Handle add single stock device
async function handleAddSingleStock(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const stockData = {
        sl_no: parseInt(formData.get('slNo')) || null,
        po_no: formData.get('poNo'),
        batch_no: formData.get('batchNo'),
        inward_date: formData.get('inwardDate'),
        device_model_no: formData.get('deviceModelNo'),
        device_registration_number: formData.get('deviceRegistrationNumber'),
        device_imei: formData.get('deviceImei'),
        device_condition: formData.get('deviceCondition') || 'new',
        current_status: 'available',
        inventory_status: 'in_stock',
        imported_by: userSession?.email || 'admin'
    };

    try {
        showStockToast('Adding device to stock...', 'info');
        
        // Check for duplicate registration number
        const { data: existingDevice, error: checkError } = await supabase
            .from('stock')
            .select('*')
            .eq('device_registration_number', stockData.device_registration_number)
            .single();

        if (existingDevice) {
            showStockToast('Device with this registration number already exists', 'error');
            return;
        }

        // Check for duplicate IMEI
        const { data: existingImei, error: imeiError } = await supabase
            .from('stock')
            .select('*')
            .eq('device_imei', stockData.device_imei)
            .single();

        if (existingImei) {
            showStockToast('Device with this IMEI already exists', 'error');
            return;
        }

        const { data, error } = await supabase
            .from('stock')
            .insert([stockData]);

        if (error) {
            console.error('❌ Error adding stock device:', error);
            showStockToast('Error adding device: ' + error.message, 'error');
            return;
        }

        showStockToast('Device added to stock successfully!', 'success');
        closeAddStockForm();
        loadStockData();
        
        // Automatically add to inward if device was added to stock
        await autoAddToInward(stockData);
        
    } catch (error) {
        console.error('❌ Error adding stock device:', error);
        showStockToast('Error adding device to stock', 'error');
    }
}

// Automatically add device to inward when added to stock
async function autoAddToInward(stockData) {
    try {
        // Get the stock device that was just created
        const { data: stockDevice, error: stockError } = await supabase
            .from('stock')
            .select('*')
            .eq('device_registration_number', stockData.device_registration_number)
            .single();

        if (stockError || !stockDevice) {
            console.error('❌ Error finding created stock device:', stockError);
            return;
        }

        // Add to inward devices automatically
        const { error: inwardError } = await supabase
            .from('inward_devices')
            .insert([{
                device_registration_number: stockData.device_registration_number,
                device_imei: stockData.device_imei,
                device_condition: stockData.device_condition,
                inward_date: stockData.inward_date || new Date().toISOString().split('T')[0],
                stock_id: stockDevice.id,
                processed_by: userSession?.email || 'admin',
                notes: 'Auto-added from stock'
            }]);

        if (inwardError) {
            console.error('❌ Error auto-adding to inward:', inwardError);
            // Don't show error to user as the main operation (adding to stock) was successful
        } else {
            console.log('✅ Device automatically added to inward inventory');
        }
        
    } catch (error) {
        console.error('❌ Error in auto-add to inward:', error);
    }
}

// Show import stock CSV
function showImportStockCSV() {
    currentStockImportType = 'stock';
    showStockCSVImportModal();
}

// Show stock CSV import modal
function showStockCSVImportModal() {
    const modal = document.getElementById('importStockCSVModal');
    if (!modal) {
        createStockCSVImportModal();
    } else {
        modal.classList.remove('hidden');
    }
}

// Create stock CSV import modal
function createStockCSVImportModal() {
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
                    <p class="text-body-m-regular dark:text-dark-base-500 mb-2">Your CSV file should contain the following columns:</p>
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
                                <h4 id="stockFileName"></h4>
                                <p id="stockFileSize"></p>
                            </div>
                        </div>
                        <button type="button" onclick="clearStockSelectedFile()" class="file-remove-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m18 6-12 12"/>
                                <path d="m6 6 12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div id="stockImportProgress" class="import-progress hidden">
                        <div class="progress-bar">
                            <div class="progress-bar-fill" id="stockProgressFill" style="width: 0%"></div>
                        </div>
                        <p class="progress-text" id="stockProgressText">Processing...</p>
                    </div>
                    
                    <div id="stockImportResults" class="import-results hidden">
                        <!-- Results will be populated here -->
                    </div>
                    
                    <div class="flex gap-4">
                        <button type="submit" class="stock-action-btn success" id="stockImportBtn" disabled>Import CSV</button>
                        <button type="button" onclick="closeStockCSVImportModal()" class="stock-action-btn secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('importStockCSVModal').classList.remove('hidden');
    
    // Set up event handlers
    setupStockCSVImportHandlers();
}

// Setup stock CSV import handlers
function setupStockCSVImportHandlers() {
    const fileInput = document.getElementById('stockCSVFile');
    const form = document.getElementById('importStockCSVForm');
    const dropArea = document.getElementById('stockCSVDropArea');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleStockCSVFileSelect);
    }
    
    if (form) {
        form.addEventListener('submit', handleImportStockCSV);
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
                handleStockCSVFileSelect({ target: fileInput });
            }
        });
    }
}

// Handle stock CSV file selection
function handleStockCSVFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showStockToast('Please select a valid CSV file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showStockToast('File size must be less than 10MB', 'error');
        return;
    }
    
    // Show file info
    document.getElementById('stockFileName').textContent = file.name;
    document.getElementById('stockFileSize').textContent = formatStockFileSize(file.size);
    document.getElementById('stockFileInfo').classList.remove('hidden');
    document.getElementById('stockImportBtn').disabled = false;
}

// Clear selected file
function clearStockSelectedFile() {
    document.getElementById('stockCSVFile').value = '';
    document.getElementById('stockFileInfo').classList.add('hidden');
    document.getElementById('stockImportBtn').disabled = true;
    document.getElementById('stockImportResults').classList.add('hidden');
}

// Close stock CSV import modal
function closeStockCSVImportModal() {
    const modal = document.getElementById('importStockCSVModal');
    if (modal) {
        modal.classList.add('hidden');
        clearStockSelectedFile();
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
        
        await processStockCSV(parsedData);
        
    } catch (error) {
        console.error('❌ Error importing stock CSV:', error);
        showStockToast(`Error importing CSV: ${error.message}`, 'error');
        hideStockImportProgress();
    }
}

// Process stock CSV data
async function processStockCSV(data) {
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
        imported_by: userSession?.email || 'admin'
    };
    
    const { data: stockDevice, error } = await supabase
        .from('stock')
        .insert([stockData])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }
    
    // Auto-add to inward devices
    await supabase
        .from('inward_devices')
        .insert([{
            device_registration_number: deviceRegistrationNumber,
            device_imei: deviceImei,
            device_condition: 'new',
            inward_date: inwardDate || new Date().toISOString().split('T')[0],
            stock_id: stockDevice.id,
            processed_by: userSession?.email || 'admin',
            notes: 'Auto-added from stock CSV import'
        }]);
    
    results.successful++;
}

// Utility functions for stock
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
    
    let html = '<h4 class="import-results-title">Import Results</h4>';
    
    // Summary
    html += `
        <div class="import-results-grid">
            <div class="import-result-stat success">
                <div class="import-result-number" style="color: #10b981;">${results.successful}</div>
                <div class="import-result-label" style="color: #10b981;">Successful</div>
            </div>
            <div class="import-result-stat error">
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
                imported_by: userSession?.email || 'admin'
            }]);
    } catch (error) {
        console.error('❌ Error logging CSV import:', error);
    }
}

// Export stock CSV
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
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showStockToast('Stock data exported successfully!', 'success');
    } catch (error) {
        console.error('❌ Error exporting stock CSV:', error);
        showStockToast('Error exporting stock data', 'error');
    }
}

// Edit stock device
function editStockDevice(deviceId) {
    const device = stockDevices.find(d => d.id === deviceId);
    if (!device) {
        showStockToast('Device not found', 'error');
        return;
    }
    
    // TODO: Implement edit functionality
    showStockToast('Edit functionality coming soon', 'info');
}

// Delete stock device
async function deleteStockDevice(deviceId) {
    const device = stockDevices.find(d => d.id === deviceId);
    if (!device) {
        showStockToast('Device not found', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete device "${device.device_registration_number}" from stock?`)) {
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

        showStockToast('Device deleted from stock successfully!', 'success');
        loadStockData();
        
    } catch (error) {
        console.error('❌ Error deleting stock device:', error);
        showStockToast('Error deleting device from stock', 'error');
    }
}

// Search functionality
function handleStockSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Clear existing timeout
    if (stockSearchTimeout) {
        clearTimeout(stockSearchTimeout);
    }
    
    // Debounce search for 300ms
    stockSearchTimeout = setTimeout(() => {
        performStockSearch(searchTerm);
    }, 300);
}

function performStockSearch(searchTerm) {
    if (!searchTerm) {
        filteredStockDevices = [...stockDevices];
    } else {
        filteredStockDevices = stockDevices.filter(device => {
            return (
                (device.device_registration_number && device.device_registration_number.toLowerCase().includes(searchTerm)) ||
                (device.device_imei && device.device_imei.toLowerCase().includes(searchTerm)) ||
                (device.device_model_no && device.device_model_no.toLowerCase().includes(searchTerm)) ||
                (device.po_no && device.po_no.toLowerCase().includes(searchTerm)) ||
                (device.batch_no && device.batch_no.toLowerCase().includes(searchTerm)) ||
                (device.current_status && device.current_status.toLowerCase().includes(searchTerm)) ||
                (device.device_condition && device.device_condition.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    updateStockTable();
}

// Show stock toast notification
function showStockToast(message, type = 'info') {
    // Use the existing toast system
    showEmailToast(message);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize stock management after a short delay to ensure other systems are ready
    setTimeout(() => {
        initializeStockManagement();
    }, 1500);
});
