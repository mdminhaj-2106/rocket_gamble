// Main JavaScript file for global functionality
let socket;
let loadingOverlay;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize loading overlay
    loadingOverlay = document.getElementById('loadingOverlay');
    
    // Initialize global socket connection if user is logged in
    if (typeof userId !== 'undefined' && userId) {
        initializeSocket();
    }
    
    // Global event listeners
    setupGlobalEventListeners();
    
    // Initialize tooltips
    initializeTooltips();
});

function initializeSocket() {
    socket = io({
        transports: ['websocket', 'polling'], // Ensure compatibility
        upgrade: true,
        rememberUpgrade: true
    });
    
    socket.on('connect', function() {
        console.log('🔌 Connected to server');
        if (typeof userId !== 'undefined') {
            socket.emit('join-game', userId);
        }
    });
    
    socket.on('disconnect', function() {
        console.log('🔌 Disconnected from server');
        showNotification('Connection lost. Reconnecting...', 'warning');
    });
    
    socket.on('reconnect', function() {
        console.log('🔌 Reconnected to server');
        showNotification('Connection restored!', 'success');
        if (typeof userId !== 'undefined') {
            socket.emit('join-game', userId);
        }
    });
    
    // Global event listeners
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('bet-placed', handleBetPlaced);
    socket.on('round-completed', handleRoundCompleted);
    socket.on('leaderboard-update', handleLeaderboardUpdate);
    socket.on('credits-updated', handleCreditsUpdated);
    socket.on('game-reset', handleGameReset);
    socket.on('server-message', handleServerMessage);
    
    // Error handling
    socket.on('error', function(error) {
        console.error('Socket error:', error);
        showNotification('Connection error occurred', 'error');
    });
}

function setupGlobalEventListeners() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (socket) {
            if (document.hidden) {
                console.log('Page hidden - reducing socket activity');
            } else {
                console.log('Page visible - resuming normal activity');
                // Refresh data when user returns
                if (typeof refreshCurrentPageData === 'function') {
                    refreshCurrentPageData();
                }
            }
        }
    });
    
    // Handle network status
    window.addEventListener('online', function() {
        showNotification('Internet connection restored', 'success');
        if (socket && !socket.connected) {
            socket.connect();
        }
    });
    
    window.addEventListener('offline', function() {
        showNotification('Internet connection lost', 'error');
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + R for refresh (admin)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && window.location.pathname.includes('/admin/')) {
            e.preventDefault();
            if (typeof refreshDashboard === 'function') {
                refreshDashboard();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            });
        }
    });
}

function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Socket event handlers
function handleUserJoined(data) {
    console.log(`User joined: ${data.name}`);
    showNotification(`${data.name} joined the game!`, 'info');
    
    // Update player counts if elements exist
    updatePlayerCount();
}

function handleUserLeft(data) {
    console.log(`User left: ${data.userId}`);
    // Update UI accordingly
    updatePlayerCount();
}

function handleBetPlaced(data) {
    console.log(`Bet placed: ${data.userName} - ${data.amount} credits`);
    
    // Show notification for other users
    if (typeof userId !== 'undefined' && data.userId !== userId) {
        showNotification(`${data.userName} placed a bet!`, 'info');
    }
    
    // Update live stats
    if (typeof updateLiveStats === 'function') {
        updateLiveStats();
    }
}

function handleRoundCompleted(data) {
    console.log(`Round ${data.round} completed`);
    showNotification(`Round ${data.round} results are in!`, 'success');
    
    // Auto-redirect to leaderboard if on game page
    if (window.location.pathname.includes(`/round${data.round}`)) {
        setTimeout(() => {
            window.location.href = '/game/leaderboard';
        }, 3000);
    }
}

function handleLeaderboardUpdate(data) {
    console.log('Leaderboard updated');
    
    // Update leaderboard if on leaderboard page
    if (typeof handleLeaderboardUpdate !== 'undefined' && window.location.pathname.includes('/leaderboard')) {
        if (typeof updateLeaderboardData === 'function') {
            updateLeaderboardData(data.leaderboard);
        }
    }
}

function handleCreditsUpdated(data) {
    if (typeof userId !== 'undefined' && data.userId === userId) {
        // Update user's credits display
        const creditsElements = document.querySelectorAll('#userCredits, .credits-display span');
        creditsElements.forEach(element => {
            if (element) {
                element.textContent = data.newCredits;
                
                // Animate credit change
                gsap.fromTo(element.parentElement, 
                    { scale: 1, backgroundColor: 'transparent' },
                    { 
                        scale: 1.1, 
                        backgroundColor: 'rgba(40, 167, 69, 0.3)',
                        duration: 0.3,
                        yoyo: true,
                        repeat: 1,
                        onComplete: () => {
                            element.parentElement.style.backgroundColor = 'transparent';
                        }
                    }
                );
            }
        });
        
        showNotification(`Credits updated: ${data.newCredits}`, 'success');
    }
}

function handleGameReset() {
    showNotification('Game has been reset by administrator', 'warning');
    setTimeout(() => {
        window.location.href = '/auth/login';
    }, 3000);
}

function handleServerMessage(data) {
    showNotification(data.message, data.type || 'info');
}

// Utility functions
function showLoading(message = 'Loading...') {
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
    
    // Auto-hide after 30 seconds to prevent stuck loading
    setTimeout(hideLoading, 30000);
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

function showNotification(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification-toast`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${icons[type]} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        opacity: 0;
        transform: translateX(100%);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        border: none;
        border-radius: 10px;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    gsap.to(notification, {
        opacity: 1,
        x: 0,
        duration: 0.5,
        ease: "back.out(1.7)"
    });
    
    // Auto-remove
    setTimeout(() => {
        gsap.to(notification, {
            opacity: 0,
            x: 100,
            duration: 0.3,
            onComplete: () => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }
        });
    }, duration);
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showWarning(message) {
    showNotification(message, 'warning');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function updatePlayerCount() {
    // Update player count displays
    const playerCountElements = document.querySelectorAll('.player-count, #totalPlayers, #onlinePlayers');
    
    if (socket) {
        socket.emit('get-player-count', (count) => {
            playerCountElements.forEach(element => {
                if (element) {
                    element.textContent = count;
                }
            });
        });
    }
}

// API utility functions
async function apiCall(url, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Performance monitoring
function logPerformance(label, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    
    if (duration > 1000) {
        console.warn(`⚠️ Slow operation: ${label} took ${duration.toFixed(2)}ms`);
    }
}

// Error reporting
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    // Don't show error notifications for script loading failures
    if (!e.filename.includes('.js')) {
        showError('An unexpected error occurred');
    }
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showError('A network error occurred');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (socket) {
        socket.disconnect();
    }
});

// Export for use in other scripts
window.GameUtils = {
    showLoading,
    hideLoading,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    apiCall,
    logPerformance
};
