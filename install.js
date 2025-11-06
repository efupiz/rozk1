
let deferredPrompt; 
// Робимо доступним глобально для settings.js
window.deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installButton = document.getElementById('install-btn');

// НОВИЙ ЕЛЕМЕНТ
const installToggle = document.getElementById('toggle-install-banner'); // <-- (Ця константа тепер у settings.js)
const LOCAL_STORAGE_KEY = 'showInstallBanner';

// Функція для показу банера (додає клас 'visible')
function showInstallBanner() {
    // 1. ПЕРЕВІРКА: Якщо користувач вимкнув банер у налаштуваннях, не показуємо його
    const shouldShow = localStorage.getItem(LOCAL_STORAGE_KEY) !== 'false';
    if (!shouldShow) return; 
    
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

// =================================================================
// ЛОГІКА КЕРУВАННЯ ПЕРЕМИКАЧЕМ
// =================================================================

function initializeInstallToggle() {
    if (!installToggle) return;

    // 1. Завантажуємо стан з LocalStorage (за замовчуванням true)
    const isChecked = localStorage.getItem(LOCAL_STORAGE_KEY) !== 'false';
    installToggle.checked = isChecked;

    // 2. Додаємо слухач для збереження стану
    installToggle.addEventListener('change', () => {
        const newState = installToggle.checked;
        localStorage.setItem(LOCAL_STORAGE_KEY, newState ? 'true' : 'false');
        
        // Оновлюємо відображення банера
        if (deferredPrompt) {
            if (newState) {
                showInstallBanner(); 
            } else {
                hideInstallBanner();
            }
        }
    });
}

// 1. Зберігаємо подію 'beforeinstallprompt'
window.addEventListener('beforeinstallprompt', (e) => {
    // Якщо користувач вимкнув банер, не зберігаємо deferredPrompt і не показуємо
    const shouldShow = localStorage.getItem(LOCAL_STORAGE_KEY) !== 'false';
    if (!shouldShow) return; 

    e.preventDefault();
    deferredPrompt = e;
    window.deferredPrompt = e;
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
            }
            deferredPrompt = null;
            window.deferredPrompt = null;
        });
    }
});

// Ініціалізація перемикача після завантаження DOM
document.addEventListener('DOMContentLoaded', initializeInstallToggle);