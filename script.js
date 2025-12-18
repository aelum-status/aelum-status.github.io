// Основной скрипт сайта
let autoRefreshInterval = null;

// Функция для форматирования времени
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Функция для отображения времени относительно текущего момента
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'только что';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} мин. назад`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ч. назад`;
    return `${Math.floor(diffInSeconds / 86400)} дн. назад`;
}

// Функция для получения перевода статуса
function getStatusText(status) {
    const statusMap = {
        'admin': 'Администратор',
        'online': 'В сети',
        'offline': 'Не в сети',
        'banned': 'Заблокирован'
    };
    return statusMap[status] || status;
}

// Функция для отображения списка участников
function renderMembers(members) {
    const membersContainer = document.getElementById('members-container');
    membersContainer.innerHTML = '';
    
    // Сортируем участников: админы → онлайн → офлайн → забанены
    const sortedMembers = [...members].sort((a, b) => {
        const statusOrder = { admin: 0, online: 1, offline: 2, banned: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
    });
    
    sortedMembers.forEach(member => {
        const memberElement = document.createElement('div');
        memberElement.className = 'member-item';
        
        // Определяем иконку статуса
        let statusIcon = '';
        let statusClass = '';
        
        switch(member.status) {
            case 'admin':
                statusIcon = '<svg class="octicon octicon-shield-check" width="16" height="16" fill="#0969DA"><path d="M8.533.133a1.75 1.75 0 0 0-1.066 0l-5.25 1.68A1.75 1.75 0 0 0 1 3.48V7c0 1.566.32 3.182 1.303 4.682.983 1.498 2.585 2.813 5.032 3.855a1.7 1.7 0 0 0 .327.087l.18.033.181-.033a1.75 1.75 0 0 0 .327-.087c2.447-1.042 4.049-2.357 5.032-3.855C14.68 10.182 15 8.566 15 7V3.48a1.75 1.75 0 0 0-1.217-1.667L8.533.133Zm-.61 1.429a.25.25 0 0 1 .153 0l5.25 1.68a.25.25 0 0 1 .174.238V7c0 1.358-.275 2.666-1.057 3.86-.784 1.194-2.121 2.34-4.366 3.297a.2.2 0 0 1-.154 0c-2.245-.956-3.582-2.104-4.366-3.298C2.775 9.666 2.5 8.36 2.5 7V3.48a.25.25 0 0 1 .174-.238l5.25-1.68Z"></path></svg>';
                statusClass = 'status-admin';
                break;
            case 'online':
                statusIcon = '<svg class="octicon octicon-dot-fill" width="16" height="16" fill="#1F883D"><path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"></path></svg>';
                statusClass = 'status-online';
                break;
            case 'offline':
                statusIcon = '<svg class="octicon octicon-dot-fill" width="16" height="16" fill="#9A6700"><path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"></path></svg>';
                statusClass = 'status-offline';
                break;
            case 'banned':
                statusIcon = '<svg class="octicon octicon-circle-slash" width="16" height="16" fill="#D1242F"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z"></path><path d="M11.28 4.72 4.72 11.28a.75.75 0 0 1-1.06-1.06l6.56-6.56a.75.75 0 1 1 1.06 1.06Z"></path></svg>';
                statusClass = 'status-banned';
                break;
        }
        
        memberElement.innerHTML = `
            <img src="${member.avatar}" alt="${member.username}" class="avatar" loading="lazy">
            <div class="member-info">
                <div class="member-name">
                    ${member.display_name}
                    ${member.status === 'admin' ? ' 👑' : ''}
                </div>
                <div class="member-username">@${member.username}</div>
                <div class="member-meta">
                    Участник с ${formatTime(member.joined_at)}
                    ${member.status === 'online' ? ` • Был(а) в сети ${timeAgo(member.last_seen)}` : ''}
                    ${member.banned_at ? ` • Заблокирован ${formatTime(member.banned_at)}` : ''}
                </div>
            </div>
            <div class="status-badge ${statusClass}">
                ${statusIcon}
                ${getStatusText(member.status)}
            </div>
        `;
        
        membersContainer.appendChild(memberElement);
    });
}

// Функция загрузки данных
async function loadStatusData() {
    const membersContainer = document.getElementById('members-container');
    const updateTimeElement = document.getElementById('update-time');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    try {
        errorMessage.style.display = 'none';
        
        // Добавляем timestamp для предотвращения кэширования
        const response = await fetch('stat.json?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Обновляем время последнего обновления
        updateTimeElement.textContent = formatTime(data.last_updated);
        
        // Отображаем участников
        renderMembers(data.members);
        
    } catch (error) {
        console.error('Error loading status data:', error);
        errorText.textContent = `Ошибка загрузки данных: ${error.message}`;
        errorMessage.style.display = 'flex';
        
        // Показываем заглушку при ошибке
        membersContainer.innerHTML = `
            <div class="p-3 text-center color-fg-muted">
                <svg class="octicon octicon-alert" width="24" height="24" viewBox="0 0 16 16">
                    <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
                </svg>
                <p class="mt-2">Не удалось загрузить данные о статусах</p>
                <button onclick="loadStatusData()" class="btn mt-2" style="background-color: #0969DA; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                    Повторить попытку
                </button>
            </div>
        `;
    }
}

// Функция запуска автоматического обновления
function startAutoRefresh() {
    // Очищаем предыдущий интервал, если есть
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Устанавливаем автоматическое обновление каждые 30 секунд
    autoRefreshInterval = setInterval(loadStatusData, 30000);
    
    // Также обновляем при возвращении на вкладку
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            loadStatusData();
        }
    });
}

// Добавляем функцию в глобальную область видимости
window.loadStatusData = loadStatusData;
window.startAutoRefresh = startAutoRefresh;

// Если проверка на бота уже пройдена, запускаем загрузку данных
if (document.getElementById('main-content').style.display === 'block') {
    loadStatusData();
    startAutoRefresh();
}
