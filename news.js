// 💻 JAVASCRIPT ЛОГІКА ДЛЯ БЛОКУ НОВИН (news.js)

const BASE_API_URL = 'https://meridian.kpnu.edu.ua/wp-json/wp/v2/posts';
const newsList = document.getElementById('news-list');
const loadingMessage = document.getElementById('loading-msg');
const loadMoreMessage = document.getElementById('load-more-msg'); 
let currentPage = 1;
const PER_PAGE = 5; 
let isLoading = false;
let allPostsLoaded = false;
const CACHE_KEY = 'meridian_news_cache';
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const closeModalBtn = document.querySelector('#image-modal .close-image');
// --- Допоміжні функції (залишаються без змін) ---

function formatNewsDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('uk-UA', options);
}

function getThumbnailUrl(post) {
    try {
        const featuredMedia = post._embedded && post._embedded['wp:featuredmedia'];
        if (featuredMedia && featuredMedia[0]) {
            const sizes = featuredMedia[0].media_details.sizes;
            return (sizes.large || sizes.medium_large || sizes.full).source_url;
        }
        return 'https://via.placeholder.com/600x400?text=No+Image';
    } catch (e) {
        return 'https://via.placeholder.com/600x400?text=Error';
    }
}

// --- Функції кешування Local Storage (змінена логіка збереження) ---

function saveToCache(posts, page) {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        let existingPosts = cachedData ? JSON.parse(cachedData) : [];
        
        // Якщо це перша сторінка, ми повністю оновлюємо кеш, 
        // або вставляємо нові пости на початок, зберігаючи старі
        if (page === 1) {
            // Для фонового оновлення ми додаємо нові пости на початок
            if (existingPosts.length > 0) {
                 const newPostIds = new Set(posts.map(p => p.id));
                 // Фільтруємо нові пости, яких ще немає в кеші
                 const uniqueNewPosts = posts.filter(p => !existingPosts.some(ep => ep.id === p.id));
                 existingPosts = [...uniqueNewPosts, ...existingPosts]; // Додаємо нові на початок
            } else {
                 existingPosts = posts; // Якщо кеш порожній
            }
            
        } else {
            // Пагінація: додаємо нові пости в кінець
            const uniqueNewPosts = posts.filter(p => !existingPosts.some(ep => ep.id === p.id));
            existingPosts = [...existingPosts, ...uniqueNewPosts];
        }

        // Обмежуємо розмір кешу, наприклад, 50-ма останніми постами, щоб не забивати storage
        const MAX_CACHE_SIZE = 50; 
        if (existingPosts.length > MAX_CACHE_SIZE) {
            existingPosts = existingPosts.slice(0, MAX_CACHE_SIZE);
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(existingPosts));
        
    } catch (e) {
        console.error('Помилка збереження в кеш:', e);
    }
}

function loadFromCache() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        return null;
    } catch (e) {
        console.error('Помилка завантаження з кешу:', e);
        return null;
    }
}

function createNewsCard(post) {
    const listItem = document.createElement('li');
    listItem.className = 'news-card';
    listItem.id = `post-${post.id}`; 
    const thumbnailUrl = getThumbnailUrl(post);

    listItem.innerHTML = `
        <img src="${thumbnailUrl}" alt="${post.title.rendered}" class="news-card-thumbnail">
        
        <div class="news-card-footer">
            <span class="news-card-meta">${formatNewsDate(post.date)}</span>
            <button class="read-more-btn">
                <span>Читати статтю</span>
                <span class="material-icons expand-icon">expand_more</span>
            </button>
        </div>
        
        <div class="news-card-content">
            <h3 class="article-title">${post.title.rendered}</h3>
            <div class="article-body">${post.content.rendered}</div>
        </div>
    `;
    
    // 1. Обробник для розгортання/згортання картки (СПРОЩЕНО)
    const footer = listItem.querySelector('.news-card-footer');
    footer.addEventListener('click', () => {
        
        // **Видалено:** closeAllExpandedCards()
        // **Видалено:** Вся логіка прокручування scrollIntoView()
        
        // Тільки перемикання класу, що запускає CSS-анімацію max-height
        listItem.classList.toggle('expanded'); 
    });

    // 2. Обробник для перегляду зображень (Без змін)
    const contentContainer = listItem.querySelector('.news-card-content');
    contentContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault(); 
            e.stopPropagation(); 
            openImageModal(e.target.src);
        }
    });

    // 3. Обробник для титульного зображення (Без змін)
    const thumbnail = listItem.querySelector('.news-card-thumbnail');
    if (thumbnail) {
        thumbnail.addEventListener('click', (e) => {
            e.preventDefault();
            openImageModal(e.target.src);
        });
    }

    return listItem;
}
// --- НОВА ФУНКЦІЯ: Відкриття модального вікна ---

function openImageModal(imageUrl) {
    modalImage.src = imageUrl;
    imageModal.style.display = 'block';
}

// --- НОВА ФУНКЦІЯ: Ініціалізація модального вікна (один раз) ---

function initializeImageModal() {
    // Закриття по кліку на кнопку "х"
    closeModalBtn.onclick = function() {
        imageModal.style.display = "none";
    }

    // Закриття по кліку поза межами зображення
    window.onclick = function(event) {
        if (event.target == imageModal) {
            imageModal.style.display = "none";
        }
    }
    
    // Закриття по натисканню клавіші ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            imageModal.style.display = "none";
        }
    });
}

function renderPosts(posts, append = false, prepend = false) {
    if (!append && !prepend) {
        newsList.innerHTML = '';
    }
    
    posts.forEach(post => {
        // Перевіряємо, чи пост вже є на сторінці
        if (!document.getElementById(`post-${post.id}`)) {
            const card = createNewsCard(post);
            if (prepend) {
                 newsList.prepend(card); // Додаємо на початок (для нових статей)
                 card.classList.add('new-post-highlight'); // Опціонально: підсвічування
            } else {
                 newsList.appendChild(card); // Додаємо в кінець (для пагінації)
            }
        }
    });

    // Прибираємо клас підсвічування через кілька секунд
    setTimeout(() => {
        document.querySelectorAll('.new-post-highlight').forEach(el => el.classList.remove('new-post-highlight'));
    }, 5000);

    
}

// --- Функція легкого запиту для перевірки оновлень ---

async function fetchLatestPostMetadata() {
    // Отримуємо лише ID та Date для швидкої перевірки
    const LATEST_POST_URL = `${BASE_API_URL}?per_page=1&fields=id,date`; 
    
    try {
        const response = await fetch(LATEST_POST_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const posts = await response.json();
        return posts.length > 0 ? posts[0] : null; 
    } catch (error) {
        console.warn('Не вдалося отримати метадані останньої новини. Фонова перевірка провалена.', error);
        return null; 
    }
}

// --- Головна функція завантаження та рендерингу ---

async function fetchAndRenderNews(page = 1, append = false) {
    if (isLoading || (allPostsLoaded && append)) return;
    isLoading = true;
    
    // Показуємо індикатор тільки при пагінації, початкове завантаження приховано за кешем
    if (append) {
       loadMoreMessage.style.display = 'block';
    }

    const API_URL = `${BASE_API_URL}?_embed&per_page=${PER_PAGE}&page=${page}`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const posts = await response.json();
        
        // Зберігаємо в кеш (змінена логіка saveToCache тепер обробляє вставку на початок)
        saveToCache(posts, page);
        
        loadMoreMessage.style.display = 'none';

        if (posts.length === 0 && page > 1) {
            allPostsLoaded = true;
            console.log('Усі новини завантажено.');
        } else {
            // Для пагінації (append=true) або якщо це перше завантаження, але кеш був порожній
            if (append || newsList.children.length === 0) {
                 renderPosts(posts, append);
            }
            // Якщо це повне оновлення, але не пагінація, нові пости будуть вставлені на початок
            else if (page === 1) {
                 renderPosts(posts, false, true); // Вставка на початок
            }
             
            currentPage = page; 
        }

    } catch (error) {
        console.error('Помилка при завантаженні новин з сервера:', error);
        
        loadMoreMessage.style.display = 'none';
        
        // Резерв при невдачі пагінації або першого завантаження без кешу
        if (page === 1 && newsList.children.length === 0) {
            newsList.innerHTML = `<p class="placeholder-text" style="color: red;">Не вдалося завантажити новини. Спробуйте пізніше.</p>`;
        }
    }
    
    isLoading = false;
}

// --- Логіка фонової перевірки та початкове відображення ---

async function checkNewsUpdates() {
    const cachedPosts = loadFromCache();
    
    // 1. Миттєве відображення кешу (для безшовності)
    if (cachedPosts && cachedPosts.length > 0) {
        renderPosts(cachedPosts);
        
        // Встановлюємо поточну сторінку для коректної пагінації
        currentPage = Math.ceil(cachedPosts.length / PER_PAGE);
        allPostsLoaded = cachedPosts.length < PER_PAGE; 
        loadingMessage.style.display = 'none';
        
        // Запускаємо фонову перевірку
        await backgroundUpdateCheck(cachedPosts[0].id);

    } else {
        // Якщо кешу немає взагалі, робимо повний запит, показуючи індикатор
        loadingMessage.style.display = 'block';
        await fetchAndRenderNews(1);
    }
}

async function backgroundUpdateCheck(latestCachedId) {
     console.log('Початок фонової перевірки оновлень...');
     const latestServerPost = await fetchLatestPostMetadata();
     
     if (latestServerPost && latestServerPost.id !== latestCachedId) {
         console.log('Знайдено нову новину! Динамічне оновлення UI...');
         
         // Запускаємо повне завантаження першої сторінки. 
         // Нова логіка renderPosts вставить нові статті на початок.
         await fetchAndRenderNews(1, false); 
         
         newsList.insertAdjacentHTML('afterbegin', '<p class="update-message" style="color: green; padding: 10px 15px;">З’явились нові статті!</p>');
     } else {
         console.log('Кеш актуальний. Фонова перевірка завершена.');
     }
}

// --- Логіка "Нескінченної Стрічки" з раннім завантаженням ---

function handleScroll() {
    const newsCards = newsList.querySelectorAll('.news-card');
    
    // Треба завантажувати, коли користувач бачить передостанній елемент (n-1)
    if (newsCards.length > 1) {
        // Визначаємо передостанній елемент
        const secondToLastCard = newsCards[newsCards.length - 2];
        
        // Визначаємо його позицію відносно viewport
        const rect = secondToLastCard.getBoundingClientRect();

        // Запускаємо завантаження, якщо передостанній елемент видно в межах вікна
        // (наприклад, верхня частина елемента вище 80% висоти вікна)
        if (rect.top <= window.innerHeight * 0.8 && !isLoading && !allPostsLoaded) {
            fetchAndRenderNews(currentPage + 1, true);
        }
    }
}
function closeAllExpandedCards() {
    // Шукаємо всі картки, які мають клас 'expanded'
    document.querySelectorAll('.news-card.expanded').forEach(card => {
        card.classList.remove('expanded');
    });
}


// --- ГЛОБАЛЬНА ЛОГІКА ЗАКРИТТЯ ПРИ ЗМІНІ РОЗДІЛУ ---

// знаходимо футер навігації
const bottomNavFooter = document.querySelector('.bottom-nav'); 
// Іконка для розділу новин/прогнозу - 'grid_view'
const NEWS_ICON = 'grid_view'; 

if (bottomNavFooter) {
    bottomNavFooter.addEventListener('click', (e) => {
        const clickedNav = e.target.closest('.nav-item');
        
        if (clickedNav) {
            const targetIcon = clickedNav.getAttribute('data-icon');
            
            // Якщо користувач натиснув на будь-яку кнопку, окрім кнопки новин/прогнозу,
            // ми згортаємо всі відкриті статті та закриваємо деталі прогнозу.
            if (targetIcon !== NEWS_ICON) {
                closeAllExpandedCards(); 
                
                // >>> НОВИЙ ВИКЛИК: Закриття детального перегляду погоди
                if (typeof closeWeatherDetails === 'function') {
                    closeWeatherDetails();
                }
            }
        }
    });
}
// --- Ініціалізація ---
initializeImageModal();

window.addEventListener('scroll', handleScroll);
checkNewsUpdates(); // Початкове відображення кешу + фонова перевірка