// ===============================================================
// SETTINGS.JS - Логіка для вкладки "Налаштування" (menu-view)
// ===============================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Елементи Налаштувань ---
    const navToSearchBtn = document.getElementById('nav-to-search-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const themeToggle = document.getElementById('dark-mode-toggle');
    const installToggle = document.getElementById('toggle-install-banner');

    // --- 1. Кнопка "Змінити групу" ---
    if (navToSearchBtn) {
        navToSearchBtn.addEventListener('click', () => {
            // activateViewById() - це глобальна функція з script.js
            if (typeof activateViewById === 'function') {
                activateViewById('search-view');
            } else {
                console.error('Core function activateViewById not found.');
            }
        });
    }

    // --- 2. Кнопка "Очистити кеш" ---
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            if (confirm('Ви впевнені, що хочете скинути всі налаштування та дані?')) {
                // Ключі, що використовуються в script.js та install.js
                localStorage.removeItem('scheduleAppState'); 
                localStorage.removeItem('scheduleDataState'); // (Цей ключ з вашого попереднього коду, якщо ви його використовуєте)
                localStorage.removeItem('showInstallBanner'); // З install.js
                localStorage.removeItem('scheduleAppTheme');  // З script.js (тема)
                
                window.location.reload();
            }
        });
    }

    // --- 3. Перемикач "Темна тема" ---
    if (themeToggle) {
        // THEME_STORAGE_KEY та applyTheme() - глобальні з script.js
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            
            if (typeof applyTheme === 'function' && typeof THEME_STORAGE_KEY === 'string') {
                applyTheme(newTheme);
                localStorage.setItem(THEME_STORAGE_KEY, newTheme);
            } else {
                 console.error('Core theme functions not found.');
            }
        });
    }

    // --- 4. Перемикач "Банер встановлення" ---
    if (installToggle) {
        // LOCAL_STORAGE_KEY - глобальна змінна з install.js
        // showInstallBanner / hideInstallBanner - глобальні з install.js

        // Ініціалізуємо стан перемикача
        const isChecked = localStorage.getItem('showInstallBanner') !== 'false';
        installToggle.checked = isChecked;

        // Додаємо слухач
        installToggle.addEventListener('change', () => {
            const newState = installToggle.checked;
            localStorage.setItem('showInstallBanner', newState ? 'true' : 'false');

            // Якщо банер готовий до показу (deferredPrompt існує)
            if (window.deferredPrompt) {
                if (newState) {
                    if (typeof showInstallBanner === 'function') showInstallBanner();
                } else {
                    if (typeof hideInstallBanner === 'function') hideInstallBanner();
                }
            }
        });
    }
});