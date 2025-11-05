let deferredPrompt; 
const installBanner = document.getElementById('install-banner');
const installButton = document.getElementById('install-btn');
// const closeBannerButton = ... - ВИДАЛЕНО

// Функція для показу банера (додає клас 'visible')
function showInstallBanner() {
    installBanner.style.display = 'flex'; 
    setTimeout(() => {
        installBanner.classList.add('visible');
    }, 10); // Мікро-затримка для запуску CSS transition
}

// Функція для приховування банера (запускає анімацію приховування)
function hideInstallBanner() {
    installBanner.classList.remove('visible'); 
    setTimeout(() => {
        installBanner.style.display = 'none';
    }, 400); // Час має відповідати transition-duration (0.4s)
}

// 1. Зберігаємо подію 'beforeinstallprompt'
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner(); // Показуємо наш банер
});

// 2. Клік на кнопку "Встановити"
installButton.addEventListener('click', () => {
    if (deferredPrompt) {
        hideInstallBanner(); // Приховуємо банер
        
        // Запускаємо системний діалог встановлення
        deferredPrompt.prompt();
        
        // Обробляємо вибір користувача
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Користувач встановив додаток');
            } else {
                console.log('Користувач скасував встановлення');
                // Оскільки кнопки "Закрити" немає, 
                // банер залишиться прихованим до перезавантаження сторінки.
            }
            deferredPrompt = null;
        });
    }
});

// 3. Обробник кнопки "Закрити" - ВИДАЛЕНО

// 4. Приховуємо банер, якщо додаток вже встановлено
window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    deferredPrompt = null;
});