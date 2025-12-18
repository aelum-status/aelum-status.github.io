// script.js - Основная логика сайта Aelum Chat Status

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    STATS_URL: 'stat.json',
    AUTO_REFRESH_INTERVAL: 30000, // 30 секунд
    UPDATE_DEBOUNCE: 1000
};

// ===== СОСТОЯНИЕ ПРИЛОЖЕНИЯ =====
let appState = {
    members: [],
    lastUpdate: null,
    autoRefreshInterval: null,
    isDarkTheme: false
};

// ===== УТИЛИТЫ =====

/**
 * Форматирование времени
 */
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    // Если сегодня
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Если вчера
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера, ' + date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Если больше суток назад
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
        return `${diffDays} дн. назад`;
    }
    
    // Если больше недели
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Получение текста статуса на русском
 */
function getStatusText(status) {
    const statusMap = {
        'admin': 'Администратор',
        'active': 'Состоит',
        'banned': 'Заблокирован'
    };
    return statusMap[status] || status;
}

/**
 * Получение класса CSS для статуса
 */
function getStatusClass(status) {
    return `status-${status}`;
}

/**
 * Получение иконки для статуса
 */
function getStatusIcon(status) {
    const icons = {
        'admin': `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"/>
                <path d="M8 2.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 1 0V3a.5.5 0 0 0-.5-.5zM4.5 8a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0 0 1h1a.5.5 0 0 0 .5-.5zM8 13.5a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-1 0v1a.5.5 0 0 0 .5.5zM13 8.5h-1a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1z"/>
            </svg>
        `,
        'active': `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="4"/>
            </svg>
        `,
        'banned': `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"/>
                <path d="M4.5 4.5l7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
        `
    };
    return icons[status] || icons.active;
}

// ===== ОБРАБОТКА ДАННЫХ =====

/**
 * Загрузка данных из stat.json
 */
async function loadStatusData() {
    try {
        showLoading(true);
        
        // Добавляем timestamp для предотвращения кэширования
        const timestamp = new Date().getTime();
        const response = await fetch(`${CONFIG.STATS_URL}?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Сохраняем данные
        appState.members = data.members;
        appState.lastUpdate = data.last_updated;
        
        // Обновляем интерфейс
        updateStatistics(data.members);
        updateMembersList(data.members);
        updateLastUpdateTime(data.last_updated);
        
        showLoading(false);
        showError(null);
        
        return data;
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError(`Не удалось загрузить данные: ${error.message}`);
        showLoading(false);
        return null;
    }
}

/**
 * Обновление статистики
 */
function updateStatistics(members) {
    const total = members.length;
    const active = members.filter(m => m.status === 'active').length;
    const admins = members.filter(m => m.status === 'admin').length;
    const banned = members.filter(m => m.status === 'banned').length;
    
    document.getElementById('totalMembers').textContent = total;
    document.getElementById('activeMembers').textContent = active;
    document.getElementById('adminMembers').textContent = admins;
    document.getElementById('bannedMembers').textContent = banned;
}

/**
 * Обновление списка участников
 */
function updateMembersList(members) {
    const container = document.getElementById('membersContainer');
    
    if (!members || members.length === 0) {
        container.innerHTML = `
            <div class="empty-row">
                <p>Нет данных об участниках</p>
            </div>
        `;
        return;
    }
    
    // Сортируем: админы → активные → забаненные
    const sortedMembers = [...members].sort((a, b) => {
        const order = { admin: 0, active: 1, banned: 2 };
        return order[a.status] - order[b.status];
    });
    
    const rows = sortedMembers.map(member => createMemberRow(member)).join('');
    container.innerHTML = rows;
}

/**
 * Создание строки для участника
 */
function createMemberRow(member) {
    const statusClass = getStatusClass(member.status);
    const statusText = getStatusText(member.status);
    const statusIcon = getStatusIcon(member.status);
    const lastSeen = formatTime(member.last_seen);
    
    return `
        <div class="table-row">
            <div class="table-cell user-cell">
                <img src="${member.avatar}" 
                     alt="${member.username}" 
                     class="user-avatar"
                     onerror="this.src='https://avatars.githubusercontent.com/u/583231?s=64&v=4'">
                <div class="user-info">
                    <div class="username">${member.display_name}</div>
                    <div class="user-handle">@${member.username}</div>
                </div>
            </div>
            
            <div class="table-cell">
                <span class="status-badge ${statusClass}">
                    ${statusIcon}
                    ${statusText}
                </span>
                ${member.ban_reason ? `<div class="ban-reason">${member.ban_reason}</div>` : ''}
            </div>
            
            <div class="table-cell">
                ${lastSeen}
            </div>
            
            <div class="table-cell">
                ${member.role || 'Участник'}
            </div>
        </div>
    `;
}

/**
 * Обновление времени последнего обновления
 */
function updateLastUpdateTime(timestamp) {
    const element = document.getElementById('lastUpdateTime');
    if (!element) return;
    
    const time = new Date(timestamp);
    element.textContent = time.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ===== УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ =====

/**
 * Показать/скрыть загрузку
 */
function showLoading(isLoading) {
    const container = document.getElementById('membersContainer');
    const refreshBtn = document.querySelector('.refresh-btn');
    
    if (isLoading) {
        if (container && !container.querySelector('.loading-row')) {
            container.innerHTML = `
                <div class="loading-row">
                    <div class="loading-spinner"></div>
                    <p>Загрузка данных...</p>
                </div>
            `;
        }
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <path fill="currentColor" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                </svg>
                Загрузка...
            `;
        }
    } else {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <path fill="currentColor" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                </svg>
                Обновить
            `;
        }
    }
}

/**
 * Показать ошибку
 */
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (!errorElement) {
        // Создаем элемент для ошибок если его нет
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'errorMessage';
            errorDiv.className = 'error-message';
            container.prepend(errorDiv);
        }
    }
    
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        if (message) {
            errorDiv.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <path fill="currentColor" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"/>
                    <path fill="currentColor" d="M8 4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4A.5.5 0 0 1 8 4zm0 7a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/>
                </svg>
                ${message}
                <button onclick="this.parentElement.remove()" class="error-close">
                    ×
                </button>
            `;
            errorDiv.style.display = 'flex';
        } else {
            errorDiv.style.display = 'none';
        }
    }
}

/**
 * Переключение темы
 */
function toggleTheme() {
    appState.isDarkTheme = !appState.isDarkTheme;
    document.body.classList.toggle('dark-theme', appState.isDarkTheme);
    
    // Сохраняем в localStorage
    localStorage.setItem('theme', appState.isDarkTheme ? 'dark' : 'light');
    
    // Обновляем иконку
    updateThemeIcon();
}

/**
 * Обновление иконки темы
 */
function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    
    if (appState.isDarkTheme) {
        icon.innerHTML = `
            <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 22c-5.514 0-10-4.486-10-10s4.486-10 10-10 10 4.486 10 10-4.486 10-10 10zm0-18c-4.411 0-8 3.589-8 8s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8z"/>
        `;
    } else {
        icon.innerHTML = `
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
        `;
    }
}

// ===== АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ =====

/**
 * Запуск автоматического обновления
 */
function startAutoRefresh() {
    // Останавливаем предыдущий интервал
    if (appState.autoRefreshInterval) {
        clearInterval(appState.autoRefreshInterval);
    }
    
    // Запускаем новый
    appState.autoRefreshInterval = setInterval(() => {
        loadStatusData();
    }, CONFIG.AUTO_REFRESH_INTERVAL);
}

/**
 * Остановка автоматического обновления
 */
function stopAutoRefresh() {
    if (appState.autoRefreshInterval) {
        clearInterval(appState.autoRefreshInterval);
        appState.autoRefreshInterval = null;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

/**
 * Инициализация приложения
 */
async function initApp() {
    try {
        // Загружаем сохраненную тему
        const savedTheme = localStorage.getItem('theme');
        appState.isDarkTheme = savedTheme === 'dark';
        document.body.classList.toggle('dark-theme', appState.isDarkTheme);
        updateThemeIcon();
        
        // Загружаем данные
        await loadStatusData();
        
        // Запускаем автообновление
        startAutoRefresh();
        
        // Обновляем при возвращении на вкладку
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                loadStatusData();
            }
        });
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка загрузки приложения');
    }
}

// ===== ГЛОБАЛЬНЫЙ ЭКСПОРТ =====

// Делаем функции доступными глобально
window.loadStatusData = loadStatusData;
window.toggleTheme = toggleTheme;

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', initApp);
