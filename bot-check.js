// Система проверки на бота
document.addEventListener('DOMContentLoaded', function() {
    const botCheck = document.getElementById('bot-check');
    const mainContent = document.getElementById('main-content');
    const captchaDisplay = document.getElementById('captcha-display');
    const captchaInput = document.getElementById('captcha-input');
    const verifyBtn = document.getElementById('verify-btn');
    const captchaError = document.getElementById('captcha-error');
    const attemptsWarning = document.getElementById('attempts-warning');
    const btnText = document.getElementById('btn-text');
    
    // Настройки CAPTCHA
    const captchaConfig = {
        length: 6,
        characters: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // Исключаем похожие символы
        maxAttempts: 5,
        sessionKey: 'aelum_bot_check_passed',
        attemptsKey: 'aelum_bot_check_attempts'
    };
    
    // Переменные состояния
    let currentCaptcha = '';
    let attemptsLeft = captchaConfig.maxAttempts;
    let isVerifying = false;
    
    // Инициализация
    function init() {
        // Проверяем, прошел ли пользователь проверку ранее в этой сессии
        if (sessionStorage.getItem(captchaConfig.sessionKey) === 'true') {
            grantAccess();
            return;
        }
        
        // Восстанавливаем количество попыток
        const savedAttempts = sessionStorage.getItem(captchaConfig.attemptsKey);
        if (savedAttempts) {
            attemptsLeft = parseInt(savedAttempts);
            updateAttemptsDisplay();
        }
        
        // Генерируем первую CAPTCHA
        generateCaptcha();
        
        // Настраиваем обработчики событий
        setupEventListeners();
    }
    
    // Генерация CAPTCHA
    function generateCaptcha() {
        currentCaptcha = '';
        const chars = captchaConfig.characters;
        
        for (let i = 0; i < captchaConfig.length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            currentCaptcha += chars[randomIndex];
        }
        
        // Добавляем визуальные искажения через CSS
        captchaDisplay.textContent = currentCaptcha;
        applyCaptchaStyles();
    }
    
    // Применение визуальных эффектов к CAPTCHA
    function applyCaptchaStyles() {
        // Случайные трансформации для каждого символа
        let html = '';
        for (let i = 0; i < currentCaptcha.length; i++) {
            const rotation = (Math.random() * 20 - 10); // -10 до +10 градусов
            const scale = 0.9 + Math.random() * 0.2; // 0.9 до 1.1
            const colorVariance = Math.floor(Math.random() * 40);
            
            html += `<span style="
                display: inline-block;
                transform: rotate(${rotation}deg) scale(${scale});
                color: rgb(${40 + colorVariance}, ${40 + colorVariance}, ${40 + colorVariance});
                margin: 0 2px;
                font-family: 'Courier New', monospace;
            ">${currentCaptcha[i]}</span>`;
        }
        
        captchaDisplay.innerHTML = html;
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        // Кнопка проверки
        verifyBtn.addEventListener('click', verifyCaptcha);
        
        // Нажатие Enter в поле ввода
        captchaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyCaptcha();
            }
        });
        
        // Обновление CAPTCHA по клику
        captchaDisplay.addEventListener('click', function() {
            if (!isVerifying) {
                generateCaptcha();
                captchaInput.value = '';
                captchaInput.focus();
            }
        });
        
        // Автофокус на поле ввода
        setTimeout(() => {
            captchaInput.focus();
        }, 100);
    }
    
    // Проверка CAPTCHA
    function verifyCaptcha() {
        if (isVerifying) return;
        
        const userInput = captchaInput.value.trim().toUpperCase();
        
        // Проверка на пустой ввод
        if (!userInput) {
            showError('Введите код с картинки');
            captchaInput.focus();
            return;
        }
        
        // Проверка длины
        if (userInput.length !== currentCaptcha.length) {
            showError(`Код должен содержать ${currentCaptcha.length} символов`);
            return;
        }
        
        isVerifying = true;
        verifyBtn.disabled = true;
        btnText.innerHTML = '<div class="loading-spinner"></div>';
        
        // Имитация задержки проверки (защита от ботов)
        setTimeout(() => {
            // Сравнение введенного кода (без учета регистра)
            if (userInput === currentCaptcha) {
                // Успешная проверка
                sessionStorage.setItem(captchaConfig.sessionKey, 'true');
                sessionStorage.removeItem(captchaConfig.attemptsKey);
                grantAccess();
            } else {
                // Неверный код
                attemptsLeft--;
                sessionStorage.setItem(captchaConfig.attemptsKey, attemptsLeft.toString());
                
                if (attemptsLeft <= 0) {
                    // Превышено количество попыток
                    showError('Превышено количество попыток. Обновите страницу.');
                    verifyBtn.disabled = true;
                    verifyBtn.textContent = 'Доступ заблокирован';
                } else {
                    // Показываем ошибку и генерируем новую CAPTCHA
                    showError(`Неверный код. Осталось попыток: ${attemptsLeft}`);
                    generateCaptcha();
                    captchaInput.value = '';
                    captchaInput.focus();
                    updateAttemptsDisplay();
                }
                
                isVerifying = false;
                verifyBtn.disabled = false;
                btnText.textContent = 'Продолжить';
            }
        }, 800 + Math.random() * 400); // Случайная задержка 800-1200ms
    }
    
    // Предоставление доступа к сайту
    function grantAccess() {
        // Плавное скрытие экрана проверки
        botCheck.style.opacity = '1';
        botCheck.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            botCheck.style.opacity = '0';
            setTimeout(() => {
                botCheck.style.display = 'none';
                mainContent.style.display = 'block';
                
                // Запускаем загрузку данных статусов
                if (typeof loadStatusData === 'function') {
                    loadStatusData();
                }
                
                // Запускаем автоматическое обновление
                if (typeof startAutoRefresh === 'function') {
                    startAutoRefresh();
                }
            }, 500);
        }, 300);
    }
    
    // Показать ошибку
    function showError(message) {
        captchaError.textContent = message;
        captchaError.style.display = 'block';
        
        // Автоматическое скрытие ошибки через 5 секунд
        setTimeout(() => {
            captchaError.style.display = 'none';
        }, 5000);
    }
    
    // Обновление отображения оставшихся попыток
    function updateAttemptsDisplay() {
        attemptsWarning.textContent = `Осталось попыток: ${attemptsLeft}`;
        
        if (attemptsLeft <= 2) {
            attemptsWarning.style.color = '#d1242f';
        } else if (attemptsLeft <= 3) {
            attemptsWarning.style.color = '#9a6700';
        }
    }
    
    // Дополнительные методы защиты от ботов
    function setupBotDetection() {
        // Защита от автозаполнения
        captchaInput.autocomplete = 'off';
        captchaInput.spellcheck = false;
        
        // Защита от копирования CAPTCHA
        captchaDisplay.style.userSelect = 'none';
        captchaDisplay.style.webkitUserSelect = 'none';
        
        // Отслеживание подозрительной активности
        let rapidClicks = 0;
        let lastClickTime = 0;
        
        verifyBtn.addEventListener('click', function() {
            const now = Date.now();
            if (now - lastClickTime < 500) { // Быстрые повторные клики
                rapidClicks++;
                if (rapidClicks > 3) {
                    // Слишком много быстрых кликов - генерируем новую CAPTCHA
                    generateCaptcha();
                    captchaInput.value = '';
                    rapidClicks = 0;
                }
            } else {
                rapidClicks = 0;
            }
            lastClickTime = now;
        });
        
        // Проверка на отключенный JavaScript (если JS отключен, показываем ошибку)
        document.documentElement.classList.remove('no-js');
    }
    
    // Начало инициализации
    setupBotDetection();
    init();
});
