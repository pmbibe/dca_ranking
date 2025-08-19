let rankingData = [];
let currentFilter = 'all';
let sortColumn = 0;
let sortDirection = 'desc';
let activityInterval;
let isScanning = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    startActivityMonitoring();
    addLogEntry('System initialized successfully', 'success');
    console.log('DCA Ranking App initialized');
});
// Start DCA Scan
function startDCAScan() {
    const startBtn = document.getElementById('startScanButton');
    const refreshBtn = document.getElementById('refreshButton');
    
    if (isScanning) {
        showNotification('Scan is already in progress!', 'warning');
        return;
    }
    
    isScanning = true;
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Scanning...';
    startBtn.classList.add('scanning');
    
    refreshBtn.disabled = false;
    
    // Show log display
    document.getElementById('logDisplay').style.display = 'block';
    addLogEntry('Starting DCA analysis scan...', 'info');
    
    // Clear previous data
    document.getElementById('rankingTableBody').innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-5">
                <div class="loading-state">
                    <i class="bi bi-hourglass-split loading-spinner"></i>
                    <h5>Scanning in progress...</h5>
                    <p class="text-muted">Analyzing DCA performance for USDT futures</p>
                </div>
            </td>
        </tr>
    `;
    
    // Start the scan
    refreshRanking();
}

// Enhanced activity monitoring
function startActivityMonitoring() {
    fetchActivityStatus();
    activityInterval = setInterval(fetchActivityStatus, 1000); // Update every second during scan
}

function fetchActivityStatus() {
    fetch('/api/activity-status')
        .then(response => response.json())
        .then(data => {
            updateActivityDisplay(data);
        })
        .catch(error => {
            console.error('Error fetching activity status:', error);
            showActivityError();
        });
}

function updateActivityDisplay(data) {
    const statusIndicator = document.getElementById('statusIndicator');
    const activityStatus = document.getElementById('activityStatus');
    const activityOperation = document.getElementById('activityOperation');
    
    statusIndicator.className = 'status-indicator ' + data.status;
    
    let statusText = '';
    let iconClass = 'bi-circle-fill';
    
    switch(data.status) {
        case 'idle':
            statusText = 'System Ready';
            iconClass = 'bi-circle-fill text-success';
            if (isScanning) {
                resetScanButtons();
            }
            break;
        case 'calculating':
            statusText = 'Analyzing DCA Performance';
            iconClass = 'bi-cpu text-warning';
            break;
        case 'fetching':
            statusText = 'Fetching Market Data';
            iconClass = 'bi-download text-info';
            break;
        case 'starting':
            statusText = 'Initializing Scan';
            iconClass = 'bi-play-circle text-primary';
            break;
        case 'completed':
            statusText = 'Scan Completed';
            iconClass = 'bi-check-circle-fill text-success';
            addLogEntry('DCA analysis completed successfully!', 'success');
            break;
        case 'error':
            statusText = 'System Error';
            iconClass = 'bi-exclamation-triangle-fill text-danger';
            addLogEntry('Error occurred during scan: ' + data.current_operation, 'error');
            resetScanButtons();
            break;
    }
    
    statusIndicator.innerHTML = `<i class="${iconClass}"></i>`;
    activityStatus.textContent = statusText;
    activityOperation.textContent = data.current_operation || 'No active operations';
    
    // Update progress if available
    if (data.progress && data.progress.total > 0) {
        updateProgressDisplay(data.progress);
    }
    
    // Update stats
    updateStatWithAnimation('totalRequests', data.stats.total_requests);
    updateStatWithAnimation('successfulCalcs', data.stats.successful_calculations);
    updateStatWithAnimation('apiCalls', data.stats.api_calls);
    updateStatWithAnimation('errorCount', data.progress.errors);
    
    // Update uptime
    document.getElementById('systemUptime').textContent = `Uptime: ${data.stats.uptime}`;
}

function updateProgressDisplay(progress) {
    const progressContainer = document.getElementById('activityProgress');
    
    if (progress.total > 0) {
        progressContainer.style.display = 'block';
        
        // Update current symbol
        if (progress.current_symbol) {
            document.getElementById('currentSymbolActivity').textContent = progress.current_symbol;
            addLogEntry(`Processing ${progress.current_symbol}... (${progress.processed}/${progress.total})`, 'info');
        }
        
        // Update progress bar
        const progressBar = document.getElementById('activityProgressBar');
        progressBar.style.width = `${progress.percentage}%`;
        document.getElementById('progressText').textContent = `${progress.percentage}%`;
        
        // Update counts
        document.getElementById('processedSymbols').textContent = progress.processed;
        document.getElementById('totalSymbols').textContent = progress.total;
        
        // Update ETA
        document.getElementById('estimatedTime').textContent = progress.eta || 'Calculating...';
    } else {
        progressContainer.style.display = 'none';
    }
}

function resetScanButtons() {
    const startBtn = document.getElementById('startScanButton');
    
    isScanning = false;
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="bi bi-play-circle"></i> Start DCA Scan';
    startBtn.classList.remove('scanning');
}

// Update stat with animation
function updateStatWithAnimation(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent) || 0;
    
    if (newValue !== currentValue) {
        element.classList.add('updated');
        element.textContent = newValue;
        
        // Remove animation class after animation completes
        setTimeout(() => {
            element.classList.remove('updated');
        }, 500);
    }
}

// Show activity error
function showActivityError() {
    const statusIndicator = document.getElementById('statusIndicator');
    const activityStatus = document.getElementById('activityStatus');
    const activityOperation = document.getElementById('activityOperation');
    
    if (statusIndicator) statusIndicator.innerHTML = '<i class="bi-wifi-off text-danger"></i>';
    if (activityStatus) activityStatus.textContent = 'Connection Error';
    if (activityOperation) activityOperation.textContent = 'Unable to fetch activity status';
}


// Enhanced refresh function
function refreshRanking() {
    const refreshBtn = document.getElementById('refreshButton');
    const statusElement = document.getElementById('status');
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
    statusElement.innerHTML = '<i class="bi bi-circle-fill text-warning"></i> Loading...';
    
    addLogEntry('Requesting DCA ranking data...', 'info');
    
    fetch('/api/dca-ranking')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                rankingData = data.data;
                updateSummaryStats(data.summary);
                updateRankingTable(rankingData);
                updateLastUpdate(data.last_update);
                statusElement.innerHTML = '<i class="bi bi-circle-fill text-success"></i> Updated';
                addLogEntry(`Loaded ${data.data.length} symbols successfully`, 'success');
                showNotification('DCA ranking updated successfully!', 'success');
                resetScanButtons();
            } else {
                addLogEntry('Error: ' + data.message, 'error');
                showNotification('Error: ' + data.message, 'error');
                statusElement.innerHTML = '<i class="bi bi-circle-fill text-danger"></i> Error';
                resetScanButtons();
            }
        })
        .catch(error => {
            console.error('Error fetching ranking:', error);
            addLogEntry('Network error: ' + error.message, 'error');
            showNotification('Failed to fetch ranking data', 'error');
            statusElement.innerHTML = '<i class="bi bi-circle-fill text-danger"></i> Error';
            resetScanButtons();
        })
        .finally(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
        });
}

// Add log entry function
function addLogEntry(message, type = 'info') {
    const logContainer = document.getElementById('logContainer');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `
        <span class="log-time">[${timestamp}]</span>
        <span class="log-message">${message}</span>
    `;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight; // Auto scroll to bottom
    
    // Keep only last 50 log entries
    const entries = logContainer.querySelectorAll('.log-entry');
    if (entries.length > 100) {
        entries[0].remove();
    }
}
// Update summary statistics
function updateSummaryStats(summary) {
    const hoursElement = document.getElementById('hoursTracked');
    const investedElement = document.getElementById('totalInvested');
    const valueElement = document.getElementById('totalValue');
    const pnlElement = document.getElementById('totalPnL');
    const avgPnlElement = document.getElementById('avgPnLPct');
    const profitableElement = document.getElementById('profitableRate');
    
    if (hoursElement) hoursElement.textContent = summary.hours_passed || 0;
    if (investedElement) investedElement.textContent = formatCurrency(summary.total_invested);
    if (valueElement) valueElement.textContent = formatCurrency(summary.total_current_value);
    
    // P&L with color
    if (pnlElement) {
        pnlElement.textContent = formatCurrency(summary.total_pnl, true);
        pnlElement.className = summary.total_pnl >= 0 ? 'text-success' : 'text-danger';
    }
    
    // P&L percentage with color
    if (avgPnlElement) {
        avgPnlElement.textContent = summary.avg_pnl_percentage + '%';
        avgPnlElement.className = summary.avg_pnl_percentage >= 0 ? 'text-success' : 'text-danger';
    }
    
    if (profitableElement) profitableElement.textContent = summary.profitable_rate + '%';
}

// Update ranking table
function updateRankingTable(data) {
    const tbody = document.getElementById('rankingTableBody');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <i class="bi bi-inbox"></i>
                    <h5>No data available</h5>
                    <p>Make sure at least 1 hour has passed since 00:00 UTC</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const filteredData = filterData(data);
    
    tbody.innerHTML = filteredData.map(item => {
        const rankClass = item.rank <= 3 ? `rank-${item.rank}` : '';
        const pnlClass = item.pnl_percentage > 0 ? 'pnl-positive' : 
                        item.pnl_percentage < 0 ? 'pnl-negative' : 'pnl-neutral';
        
        const winRateClass = item.win_rate >= 70 ? 'win-rate-high' :
                            item.win_rate >= 50 ? 'win-rate-medium' : 'win-rate-low';
        
        const actionClass = item.action.includes('BUY') ? 'action-buy' :
                           item.action.includes('SELL') ? 'action-sell' : 'action-hold';
        
        return `
            <tr class="fade-in">
                <td class="rank-cell ${rankClass}">#${item.rank}</td>
                <td class="symbol-cell">${item.symbol}</td>
                <td class="${pnlClass}">${item.pnl_percentage}%</td>
                <td class="${pnlClass}">${formatCurrency(item.total_pnl, true)}</td>
                <td class="${winRateClass}">${item.win_rate}%</td>
                <td>${item.hours_tracked}h</td>
                <td class="${item.avg_hourly_pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">
                    ${formatCurrency(item.avg_hourly_pnl, true)}
                </td>
                <td>
                    <span class="${actionClass}">${item.action}</span>
                </td>
                <td>
                    <button class="btn details-btn" onclick="showSymbolDetails('${item.symbol}')">
                        <i class="bi bi-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter data based on current filter
function filterData(data) {
    let filtered = data;
    
    // Apply action filter
    switch(currentFilter) {
        case 'buy':
            filtered = data.filter(item => item.action.includes('BUY'));
            break;
        case 'sell':
            filtered = data.filter(item => item.action.includes('SELL'));
            break;
        case 'profitable':
            filtered = data.filter(item => item.pnl_percentage > 0);
            break;
        default:
            filtered = data;
    }
    
    // Apply search filter
    const searchElement = document.getElementById('searchSymbol');
    if (searchElement) {
        const searchTerm = searchElement.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(item => 
                item.symbol.toLowerCase().includes(searchTerm)
            );
        }
    }
    
    return filtered;
}

// Filter by action
function filterByAction(action) {
    currentFilter = action;
    
    // Update button states
    document.querySelectorAll('.btn-group button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update table
    updateRankingTable(rankingData);
}

// Filter table by search
function filterTable() {
    updateRankingTable(rankingData);
}

// Sort table
function sortTable(columnIndex) {
    if (sortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = columnIndex;
        sortDirection = 'desc';
    }
    
    const sortedData = [...rankingData].sort((a, b) => {
        let aVal, bVal;
        
        switch(columnIndex) {
            case 0: // Rank
                aVal = a.rank;
                bVal = b.rank;
                break;
            case 1: // Symbol
                aVal = a.symbol;
                bVal = b.symbol;
                break;
            case 2: // P&L %
                aVal = a.pnl_percentage;
                bVal = b.pnl_percentage;
                break;
            case 3: // Total P&L
                aVal = a.total_pnl;
                bVal = b.total_pnl;
                break;
            case 4: // Win Rate
                aVal = a.win_rate;
                bVal = b.win_rate;
                break;
            case 5: // Hours
                aVal = a.hours_tracked;
                bVal = b.hours_tracked;
                break;
            case 6: // Avg/Hour
                aVal = a.avg_hourly_pnl;
                bVal = b.avg_hourly_pnl;
                break;
            default:
                return 0;
        }
        
        if (typeof aVal === 'string') {
            return sortDirection === 'asc' ? 
                aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
    });
    
    updateRankingTable(sortedData);
}

// Show symbol details
function showSymbolDetails(symbol) {
    const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
    const content = document.getElementById('detailsContent');
    
    // Show loading
    content.innerHTML = `
        <div class="text-center py-4">
            <i class="bi bi-hourglass-split loading-spinner"></i>
            <h5>Loading details for ${symbol}...</h5>
        </div>
    `;
    
    modal.show();
    
    // Fetch details
    fetch(`/api/dca-symbol/${symbol}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                displaySymbolDetails(data.data);
            } else {
                content.innerHTML = `
                    <div class="text-center py-4">
                        <i class="bi bi-exclamation-triangle text-danger"></i>
                        <h5>Error loading details</h5>
                        <p>${data.message || 'Unknown error'}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            content.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-wifi-off text-danger"></i>
                    <h5>Network Error</h5>
                    <p>Failed to load symbol details</p>
                </div>
            `;
        });
}

// Display symbol details
function displaySymbolDetails(details) {
    const content = document.getElementById('detailsContent');
    
    const hourlyDetailsHtml = details.hourly_details.map((hour, index) => `
        <div class="hourly-detail-card ${hour.is_winning ? 'winning' : 'losing'}">
            <div class="row">
                <div class="col-md-2">
                    <strong>Hour ${hour.hour}</strong>
                    <br><small>${hour.hour}:00 UTC</small>
                </div>
                <div class="col-md-2">
                    <strong>Buy Price</strong>
                    <br>${hour.buy_price}
                </div>
                <div class="col-md-2">
                    <strong>Tokens Bought</strong>
                    <br>${hour.tokens_bought}
                </div>
                <div class="col-md-2">
                    <strong>Investment</strong>
                    <br>$${hour.investment}
                </div>
                <div class="col-md-2">
                    <strong>Current Value</strong>
                    <br>$${hour.current_value}
                </div>
                <div class="col-md-2">
                    <strong>P&L</strong>
                    <br><span class="${hour.pnl >= 0 ? 'text-success' : 'text-danger'}">
                        ${formatCurrency(hour.pnl, true)} (${hour.pnl_percentage}%)
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    content.innerHTML = `
        <div class="symbol-details">
            <h4 class="mb-4">${details.symbol} - DCA Performance Details</h4>
            
            <!-- Summary Cards -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">Total P&L</h5>
                            <h3 class="${details.pnl_percentage >= 0 ? 'text-success' : 'text-danger'}">
                                ${formatCurrency(details.total_pnl, true)}
                            </h3>
                            <small class="text-muted">${details.pnl_percentage}%</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">Win Rate</h5>
                            <h3 class="${details.win_rate >= 50 ? 'text-success' : 'text-danger'}">
                                ${details.win_rate}%
                            </h3>
                            <small class="text-muted">${details.winning_buys}/${details.total_buys} wins</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">Avg Buy Price</h5>
                            <h3 class="text-primary">${details.avg_buy_price}</h3>
                            <small class="text-muted">Current: ${details.current_price}</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">Total Tokens</h5>
                            <h3 class="text-info">${details.total_tokens}</h3>
                            <small class="text-muted">Worth: ${formatCurrency(details.current_value)}</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Action Recommendation -->
            <div class="alert ${details.action.includes('BUY') ? 'alert-success' : 
                               details.action.includes('SELL') ? 'alert-danger' : 'alert-warning'} text-center">
                <h5><i class="bi bi-lightbulb"></i> Recommendation: ${details.action}</h5>
            </div>
            
            <!-- Hourly Breakdown -->
            <h5 class="mb-3">
                <i class="bi bi-clock-history"></i> Hourly DCA Breakdown
            </h5>
            <div class="hourly-breakdown">
                ${hourlyDetailsHtml}
            </div>
            
            <!-- Quick Actions -->
            <div class="mt-4 text-center">
                <button class="btn btn-primary me-2" onclick="openChart('${details.symbol}')">
                    <i class="bi bi-graph-up"></i> View Chart
                </button>
                <button class="btn btn-secondary" onclick="copySymbolData('${details.symbol}')">
                    <i class="bi bi-clipboard"></i> Copy Data
                </button>
            </div>
        </div>
    `;
}

// Utility functions
function formatCurrency(amount, showSign = false) {
    if (amount === undefined || amount === null) return '-';
    
    const formatted = Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    if (showSign) {
        return amount >= 0 ? `+$${formatted}` : `-$${formatted}`;
    }
    return `$${formatted}`;
}

function openChart(symbol) {
    window.open(`https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}.P`, '_blank');
}

function copySymbolData(symbol) {
    const symbolData = rankingData.find(item => item.symbol === symbol);
    if (symbolData) {
        const text = `${symbol}: ${symbolData.pnl_percentage}% P&L, ${symbolData.win_rate}% Win Rate, ${symbolData.action}`;
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Symbol data copied to clipboard!', 'success');
        });
    }
}

function updateLastUpdate(timestamp) {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (timestamp && lastUpdateElement) {
        const date = new Date(timestamp);
        lastUpdateElement.textContent = `Last Update: ${date.toLocaleString()}`;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 
                             type === 'error' ? 'danger' : 
                             type === 'warning' ? 'warning' : 'info'} 
                             position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : 
                          type === 'error' ? 'exclamation-triangle' : 
                          type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Stop activity monitoring when page unloads
window.addEventListener('beforeunload', function() {
    if (activityInterval) {
        clearInterval(activityInterval);
    }
});

// Auto refresh every 5 minutes
setInterval(() => {
    refreshRanking();
}, 5 * 60 * 1000);

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // F5 or Ctrl+R to refresh
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        refreshRanking();
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        const modal = bootstrap.Modal.getInstance(document.getElementById('detailsModal'));
        if (modal) {
            modal.hide();
        }
    }
});