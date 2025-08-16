// Admin-specific JavaScript functionality
class AdminDashboard {
    constructor() {
        this.socket = null;
        this.autoRefresh = true;
        this.refreshInterval = null;
        this.stats = {};
        
        this.init();
    }
    
    init() {
        this.setupSocket();
        this.setupEventListeners();
        this.startAutoRefresh();
        
        console.log('🎛️ Admin Dashboard initialized');
    }
    
    setupSocket() {
        this.socket = io('/admin', {
            transports: ['websocket', 'polling']
        });
        
        this.socket.on('connect', () => {
            console.log('🔌 Admin socket connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('🔌 Admin socket disconnected');
            showWarning('Admin connection lost. Reconnecting...');
        });
        
        this.socket.on('stats-update', (data) => {
            this.updateDashboardStats(data);
        });
        
        this.socket.on('user-activity', (data) => {
            this.addActivityItem(data);
        });
        
        this.socket.on('bet-placed', (data) => {
            this.handleNewBet(data);
        });
        
        this.socket.on('round-completed', (data) => {
            this.handleRoundCompletion(data);
        });
    }
    
    setupEventListeners() {
        // Auto-refresh toggle
        const autoRefreshBtn = document.getElementById('autoRefreshToggle');
        if (autoRefreshBtn) {
            autoRefreshBtn.addEventListener('click', () => {
                this.toggleAutoRefresh();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'r': // Ctrl+R - Refresh
                        e.preventDefault();
                        this.refreshDashboard();
                        break;
                    case '1': // Ctrl+1 - Go to Round 1
                        e.preventDefault();
                        this.focusRound(1);
                        break;
                    case '2': // Ctrl+2 - Go to Round 2
                        e.preventDefault();
                        this.focusRound(2);
                        break;
                    case '3': // Ctrl+3 - Go to Round 3
                        e.preventDefault();
                        this.focusRound(3);
                        break;
                }
            }
        });
        
        // Form submissions
        this.setupFormHandlers();
    }
    
    setupFormHandlers() {
        // Round result forms
        ['round1Result', 'round2Result'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const round = id.includes('1') ? 1 : 2;
                        this.setRoundResult(round);
                    }
                });
            }
        });
        
        // Fight result form
        const fightSelect = document.getElementById('round3Result');
        if (fightSelect) {
            fightSelect.addEventListener('change', () => {
                if (fightSelect.value) {
                    setTimeout(() => this.setFightResult(), 100);
                }
            });
        }
    }
    
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            if (this.autoRefresh) {
                this.refreshStats();
            }
        }, 5000); // Refresh every 5 seconds
    }
    
    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        const btn = document.getElementById('autoRefreshToggle');
        
        if (btn) {
            if (this.autoRefresh) {
                btn.innerHTML = '<i class="fas fa-pause me-1"></i> Pause Refresh';
                btn.classList.replace('btn-outline-warning', 'btn-outline-success');
                showInfo('Auto-refresh enabled');
            } else {
                btn.innerHTML = '<i class="fas fa-play me-1"></i> Resume Refresh';
                btn.classList.replace('btn-outline-success', 'btn-outline-warning');
                showWarning('Auto-refresh disabled');
            }
        }
    }
    
    async refreshStats() {
        try {
            const response = await fetch('/admin/api/stats');
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboardStats(data.stats);
            }
        } catch (error) {
            console.error('Error refreshing stats:', error);
        }
    }
    
    updateDashboardStats(stats) {
        // Update stat cards with animation
        this.animateStatUpdate('totalUsers', stats.activeUsers);
        this.animateStatUpdate('totalBets', stats.totalBets);
        this.animateStatUpdate('round1Bets', stats.round1Bets);
        this.animateStatUpdate('round2Bets', stats.round2Bets);
        
        // Update round player counts
        this.updateRoundStats(stats);
        
        this.stats = stats;
    }
    
    animateStatUpdate(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        
        if (currentValue !== newValue) {
            // Animate the change
            gsap.fromTo(element, 
                { scale: 1, color: '#ffffff' },
                { 
                    scale: 1.2, 
                    color: '#28a745',
                    duration: 0.3,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        element.textContent = newValue;
                    }
                }
            );
        }
    }
    
    updateRoundStats(stats) {
        // Update round-specific statistics
        const rounds = {
            1: { players: 'round1Players', bets: 'round1Bets' },
            2: { players: 'round2Players', bets: 'round2Bets' },
            3: { players: 'round3Players', bets: 'round3Bets' }
        };
        
        Object.entries(rounds).forEach(([round, elements]) => {
            const playersElement = document.getElementById(elements.players);
            const betsElement = document.getElementById(elements.bets);
            
            if (playersElement) {
                playersElement.textContent = stats[`round${round}Players`] || 0;
            }
            if (betsElement) {
                betsElement.textContent = stats[`round${round}Bets`] || 0;
            }
        });
    }
    
    async setRoundResult(round) {
        try {
            let result, endpoint, payload;
            
            if (round === 1) {
                result = parseInt(document.getElementById('round1Result').value);
                if (!result || result < 1 || result > 5) {
                    showError('Please enter a valid rocket number (1-5)');
                    return;
                }
                endpoint = '/admin/results/round1';
                payload = { winningRocket: result };
            } else if (round === 2) {
                result = parseInt(document.getElementById('round2Result').value);
                if (isNaN(result) || result < 0 || result > 1000) {
                    showError('Please enter a valid range (0-1000 meters)');
                    return;
                }
                endpoint = '/admin/results/round2';
                payload = { actualRange: result };
            }
            
            const confirmed = await this.showConfirmDialog(
                `Set Round ${round} Result`,
                `Are you sure you want to set the result to: ${result}?`,
                'This will affect all pending bets and cannot be undone.'
            );
            
            if (!confirmed) return;
            
            showLoading('Processing round results...');
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess(data.message);
                this.addActivityItem({
                    type: 'round_completed',
                    message: `Round ${round} result set to: ${result}`,
                    timestamp: new Date()
                });
                
                // Clear the input
                document.getElementById(`round${round}Result`).value = '';
                
                // Refresh stats
                this.refreshStats();
            } else {
                showError(data.error);
            }
        } catch (error) {
            console.error('Error setting round result:', error);
            showError('Network error occurred');
        } finally {
            hideLoading();
        }
    }
    
    async setFightResult() {
        try {
            const winner = document.getElementById('round3Result').value;
            if (!winner) {
                showError('Please select a fighter winner');
                return;
            }
            
            const currentFight = this.getCurrentFight();
            
            const confirmed = await this.showConfirmDialog(
                `Set Fight ${currentFight} Result`,
                `Set Fighter ${winner} as the winner?`,
                'This will process all bets for this fight.'
            );
            
            if (!confirmed) {
                document.getElementById('round3Result').value = '';
                return;
            }
            
            showLoading('Processing fight result...');
            
            // In a real implementation, you'd track the current sub-round
            const response = await fetch('/admin/results/round3', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    winner,
                    subRound: currentFight
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess(`Fight ${currentFight} result set!`);
                this.addActivityItem({
                    type: 'fight_completed',
                    message: `Fight ${currentFight} winner: Fighter ${winner}`,
                    timestamp: new Date()
                });
                
                // Update current fight display
                this.updateCurrentFight(currentFight + 1);
                
                // Clear selection
                document.getElementById('round3Result').value = '';
                
                this.refreshStats();
            } else {
                showError(data.error);
            }
        } catch (error) {
            console.error('Error setting fight result:', error);
            showError('Network error occurred');
        } finally {
            hideLoading();
        }
    }
    
    getCurrentFight() {
        const fightElement = document.getElementById('currentFight');
        if (fightElement) {
            const fightText = fightElement.textContent;
            const current = parseInt(fightText.split('/')[0]);
            return current || 1;
        }
        return 1;
    }
    
    updateCurrentFight(fightNumber) {
        const fightElement = document.getElementById('currentFight');
        if (fightElement) {
            fightElement.textContent = `${Math.min(fightNumber, 20)}/20`;
        }
    }
    
    addActivityItem(activity) {
        const activityFeed = document.getElementById('activityFeed');
        if (!activityFeed) return;
        
        const iconMap = {
            bet_placed: { icon: 'fa-coins', color: 'bg-info' },
            round_completed: { icon: 'fa-flag-checkered', color: 'bg-success' },
            fight_completed: { icon: 'fa-trophy', color: 'bg-warning' },
            user_joined: { icon: 'fa-user-plus', color: 'bg-primary' },
            user_left: { icon: 'fa-user-minus', color: 'bg-secondary' }
        };
        
        const config = iconMap[activity.type] || { icon: 'fa-info', color: 'bg-info' };
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon ${config.color}">
                <i class="fas ${config.icon}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-text">${activity.message}</p>
                <small class="activity-time text-muted">
                    ${new Date(activity.timestamp).toLocaleTimeString()}
                </small>
            </div>
        `;
        
        // Add with animation
        activityItem.style.opacity = '0';
        activityItem.style.transform = 'translateX(-20px)';
        activityFeed.insertBefore(activityItem, activityFeed.firstChild);
        
        gsap.to(activityItem, {
            opacity: 1,
            x: 0,
            duration: 0.5,
            ease: "back.out(1.7)"
        });
        
        // Remove old items
        while (activityFeed.children.length > 15) {
            activityFeed.removeChild(activityFeed.lastChild);
        }
    }
    
    async showConfirmDialog(title, message, details = '') {
        return new Promise((resolve) => {
            const modalHtml = `
                <div class="modal fade" id="confirmModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content bg-dark">
                            <div class="modal-header border-secondary">
                                <h5 class="modal-title text-light">${title}</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p class="text-light">${message}</p>
                                ${details ? `<small class="text-muted">${details}</small>` : ''}
                            </div>
                            <div class="modal-footer border-secondary">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="window.adminConfirmResolve(false)">Cancel</button>
                                <button type="button" class="btn admin-btn" onclick="window.adminConfirmResolve(true)" data-bs-dismiss="modal">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal
            const existingModal = document.getElementById('confirmModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add new modal
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Set up resolve function
            window.adminConfirmResolve = resolve;
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
            modal.show();
            
            // Clean up when modal is hidden
            document.getElementById('confirmModal').addEventListener('hidden.bs.modal', () => {
                delete window.adminConfirmResolve;
                document.getElementById('confirmModal').remove();
            });
        });
    }
    
    focusRound(roundNumber) {
        const roundCard = document.querySelector(`.round-control-card:nth-child(${roundNumber})`);
        if (roundCard) {
            roundCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight the card briefly
            gsap.fromTo(roundCard, 
                { backgroundColor: 'transparent' },
                { 
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    duration: 0.5,
                    yoyo: true,
                    repeat: 1
                }
            );
        }
    }
    
    handleNewBet(data) {
        this.addActivityItem({
            type: 'bet_placed',
            message: `${data.userName} bet ${data.amount} credits on Round ${data.round}`,
            timestamp: new Date()
        });
        
        // Update bet counts
        this.refreshStats();
    }
    
    handleRoundCompletion(data) {
        this.addActivityItem({
            type: 'round_completed',
            message: `Round ${data.round} completed! ${data.winners} winners, ${data.losers} losers`,
            timestamp: new Date()
        });
        
        showSuccess(`Round ${data.round} processing complete!`);
    }
    
    refreshDashboard() {
        showLoading('Refreshing dashboard...');
        
        Promise.all([
            this.refreshStats(),
            this.refreshUserList(),
            this.refreshActivity()
        ]).then(() => {
            hideLoading();
            showSuccess('Dashboard refreshed!');
        }).catch(error => {
            hideLoading();
            showError('Failed to refresh dashboard');
            console.error('Dashboard refresh error:', error);
        });
    }
    
    async refreshUserList() {
        try {
            const response = await fetch('/admin/users');
            const data = await response.json();
            
            if (data.users) {
                this.updateUserTable(data.users);
            }
        } catch (error) {
            console.error('Error refreshing user list:', error);
        }
    }
    
    async refreshActivity() {
        // In a real implementation, you'd fetch recent activity
        console.log('Activity refreshed');
    }
    
    updateUserTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.setAttribute('data-user-id', user._id);
            
            row.innerHTML = `
                <td>
                    ${user.name}
                    ${!user.isActive ? '<span class="badge bg-danger ms-1">Inactive</span>' : ''}
                </td>
                <td class="user-credits">${user.credits}</td>
                <td>Round ${user.currentRound}</td>
                <td><small>${user.ipAddress || 'N/A'}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" 
                            onclick="editUserCredits('${user._id}', '${user.name}', ${user.credits})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="toggleUserStatus('${user._id}', ${user.isActive})">
                        <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        console.log('🎛️ Admin Dashboard destroyed');
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('/admin/dashboard')) {
        window.adminDashboard = new AdminDashboard();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.adminDashboard) {
        window.adminDashboard.destroy();
    }
});
