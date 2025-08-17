let rankingData = [];
let currentFilter = 'all';
let sortColumn = 0;
let sortDirection = 'desc';
let activityInterval;

// Initialize activity monitoring
document.addEventListener('DOMContentLoaded', function() {
    startActivityMonitoring();
    console.log('Activity monitoring started');
});

// Start activity monitoring
function startActivityMonitoring() {
    // Update immediately
    fetchActivityStatus();
    
    // Update every 2 seconds
    activityInterval = setInterval(fetchActivityStatus, 2000);
}

// Fetch activity status
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

// Update activity display
function updateActivityDisplay(data) {
    // Update status indicator
    const statusIndicator = document.getElementById('statusIndicator');
    const activityStatus = document.getElementById('activityStatus');
    const activityOperation = document.getElementById('activityOperation');
    
    // Remove all status classes
    statusIndicator.className = 'status-indicator ' + data.status;
    
    // Update status text and icon
    let statusText = '';
    let iconClass = 'bi-circle-fill';
    
    switch(data.status) {
        case 'idle':
            statusText = 'System Ready';
            iconClass = 'bi-circle-fill text-success';
            break;
        case 'calculating':
            statusText = 'Calculating DCA Rankings';
            iconClass = 'bi-hourglass-split text-warning';
            break;
        case 'fetching':
            statusText = 'Fetching Data';
            iconClass = 'bi-download text-info';
            break;
        case 'starting':
            statusText = 'Starting Calculation';
            iconClass = 'bi-play-circle text-primary';
            break;
        case 'completed':
            statusText = 'Calculation Completed';
            iconClass = 'bi-check-circle-fill text-success';
            break;
        case 'error':
            statusText = 'System Error';
            iconClass = 'bi-exclamation-triangle-fill text-danger';
            break;
        case 'waiting':
            statusText = 'Waiting for Data';
            iconClass = 'bi-clock text-secondary';
            break;
        default:
            statusText = 'Unknown Status';
            iconClass = 'bi-question-circle text-muted';
    }
    
    statusIndicator.innerHTML = `<i class="${iconClass}"></i>`;
    activityStatus.textContent = statusText;
    activityOperation.textContent = data.current_operation || 'No active operations';
    
    // Update uptime
    document.getElementById('systemUptime').textContent = `Uptime: ${data.stats.uptime}`;
    
    // Update last activity
    if (data.last_activity) {
        const lastActivity = new Date(data.last_activity);
        const now = new Date();
        const diffSeconds = Math.floor((now - lastActivity) / 1000);
        
        let lastActivityText = '';
        if (diffSeconds < 60) {
            lastActivityText = `${diffSeconds}s ago`;
        } else if (diffSeconds < 3600) {
            lastActivityText = `${Math.floor(diffSeconds / 60)}m ago`;
        } else {
            lastActivityText = lastActivity.toLocaleTimeString();
        }
        
        document.getElementById('lastActivity').textContent = `Last activity: ${lastActivityText}`;
    }
    
    // Show/hide progress bar
    const progressContainer = document.getElementById('activityProgress');
    if (data.status === 'calculating' && data.progress.total > 0) {
        progressContainer.style.display = 'block';
        updateProgressBar(data.progress);
    } else {
        progressContainer.style.display = 'none';
    }
    
    // Update system stats with animation
    updateStatWithAnimation('totalRequests', data.stats.total_requests);
    updateStatWithAnimation('successfulCalcs', data.stats.successful_calculations);
    updateStatWithAnimation('apiCalls', data.stats.api_calls);
    updateStatWithAnimation('errorCount', data.progress.errors);
}

// Update progress bar
function updateProgressBar(progress) {
    const currentSymbol = document.getElementById('currentSymbolActivity');
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('activityProgressBar');
    const processedSymbols = document.getElementById('processedSymbols');
    const totalSymbols = document.getElementById('totalSymbols');
    const estimatedTime = document.getElementById('estimatedTime');
    
    // Update current symbol with highlight
    if (progress.current_symbol && progress.current_symbol !== currentSymbol.textContent) {
        currentSymbol.textContent = progress.current_symbol;
        currentSymbol.style.animation = 'none';
        setTimeout(() => {
            currentSymbol.style.animation = 'statUpdate 0.3s ease-in-out';
        }, 10);
    }
    
    // Update progress bar
    progressBar.style.width = `${progress.percentage}%`;
    progressText.textContent = `${progress.percentage}%`;
    
    // Update counts
    processedSymbols.textContent = progress.processed;
    totalSymbols.textContent = progress.total;
    
    // Update ETA
    estimatedTime.textContent = progress.eta || 'Calculating...';
    
    // Change progress bar color based on percentage
    if (progress.percentage < 30) {
        progressBar.style.background = 'linear-gradient(90deg, #dc3545, #fd7e14)';
    } else if (progress.percentage < 70) {
        progressBar.style.background = 'linear-gradient(90deg, #fd7e14, #ffc107)';
    } else {
        progressBar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
    }
}

// Update stat with animation (enhanced version)
function updateStatWithAnimation(elementId, newValue) {
    const element = document.getElementById(elementId);
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
    
    statusIndicator.innerHTML = '<i class="bi-wifi-off text-danger"></i>';
    activityStatus.textContent = 'Connection Error';
    activityOperation.textContent = 'Unable to fetch activity status';
}

// Enhanced refresh function with activity awareness
function refreshRanking() {
    const refreshBtn = document.getElementById('refreshButton');
    const statusElement = document.getElementById('status');
    
    // Don't allow refresh if already calculating
    const currentStatus = document.getElementById('activityStatus').textContent;
    if (currentStatus.includes('Calculating') || currentStatus.includes('Fetching')) {
        showNotification('System is busy! Please wait for current operation to complete.', 'warning');
        return;
    }
    
    // Continue with existing refresh logic...
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
    statusElement.innerHTML = '<i class="bi bi-circle-fill text-warning"></i> Loading...';
    
    fetch('/api/dca-ranking')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                rankingData = data.data;
                updateSummaryStats(data.summary);
                updateRankingTable(rankingData);
                updateLastUpdate(data.last_update);
                statusElement.innerHTML = '<i class="bi bi-circle-fill text-success"></i> Updated';
                showNotification('DCA ranking updated successfully!', 'success');
            } else {
                showNotification('Error: ' + data.message, 'error');
                statusElement.innerHTML = '<i class="bi bi-circle-fill text-danger"></i> Error';
            }
        })
        .catch(error => {
            console.error('Error fetching ranking:', error);
            showNotification('Failed to fetch ranking data', 'error');
            statusElement.innerHTML = '<i class="bi bi-circle-fill text-danger"></i> Error';
        })
        .finally(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
        });
}

// Stop activity monitoring when page unloads
window.addEventListener('beforeunload', function() {
    if (activityInterval) {
        clearInterval(activityInterval);
    }
});
// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('DCA Ranking App initialized');
});

// Refresh ranking data
function refreshRanking() {
    const refreshBtn = document.getElementById('refreshButton');
    const statusElement = document.getElementById('status');
    
    // Update UI to show loading
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
    statusElement.innerHTML = '<i class="bi bi-circle-fill text-warning"></i> Loading...';
    
    fetch('/api/dca-ranking')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                rankingData = data.data;
                updateSummaryStats(data.summary);
                updateRankingTable(rankingData);
                updateLastUpdate(data.last_update);
                statusElement.innerHTML = '<i class="bi bi-circle-fill text-success"></i> Updated';
                showNotification('DCA ranking updated successfully!', 'success');
            } else {
                showNotification('Error: ' + data.message, 'error');
                statusElement.innerHTML = '<i class="bi bi-circle-fill text-danger"></i> Error';
            }
        })
        .catch(error => {
            console.error('Error fetching ranking:', error);
            showNotification('Failed to fetch ranking data', 'error');
            statusElement.innerHTML = '<i class="bi bi-circle-fill text-danger"></i> Error';
        })
        .finally(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
        });
}

// Update summary statistics
function updateSummaryStats(summary) {
    document.getElementById('hoursTracked').textContent = summary.hours_passed || 0;
    
    // Format large numbers
    document.getElementById('totalInvested').textContent = formatCurrency(summary.total_invested);
    document.getElementById('totalValue').textContent = formatCurrency(summary.total_current_value);
    
    // P&L with color
    const totalPnLElement = document.getElementById('totalPnL');
    totalPnLElement.textContent = formatCurrency(summary.total_pnl, true);
    totalPnLElement.className = summary.total_pnl >= 0 ? 'text-success' : 'text-danger';
    
    // P&L percentage with color
    const avgPnLElement = document.getElementById('avgPnLPct');
    avgPnLElement.textContent = summary.avg_pnl_percentage + '%';
    avgPnLElement.className = summary.avg_pnl_percentage >= 0 ? 'text-success' : 'text-danger';
    
    document.getElementById('profitableRate').textContent = summary.profitable_rate + '%';
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
    // Continue từ updateRankingTable function
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
    const searchTerm = document.getElementById('searchSymbol').value.toLowerCase();
    if (searchTerm) {
    filtered = filtered.filter(item => 
        item.symbol.toLowerCase().includes(searchTerm)
    );
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
    window.open(`https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}`, '_blank');
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
    if (timestamp) {
    const date = new Date(timestamp);
    document.getElementById('lastUpdate').textContent = 
        `Last Update: ${date.toLocaleString()}`;
    }
    }

    function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 
                        type === 'error' ? 'danger' : 'info'} 
                        position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
    <i class="bi bi-${type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
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