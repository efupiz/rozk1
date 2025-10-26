document.addEventListener('DOMContentLoaded', () => {
    // Елементи для відображення розкладу
    const daySelector = document.querySelector('.day-selector');
    const mainDayElement = document.querySelector('.main-day');
	const dateElement = document.querySelector('.date'); // Елемент для кліку
	const scheduleList = document.querySelector('.schedule-list'); // Залишаємо для рендерингу карток
	const appContainer = document.querySelector('.app-container'); // <<< НОВА КОНСТАНТА
    // Елементи календаря
	const bottomNav = document.querySelector('.bottom-nav');
    const calendarModal = document.getElementById('calendar-modal');
    const currentMonthYearElement = document.getElementById('current-month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const closeModalBtn = document.getElementById('close-modal-btn');
	// Карта для зв'язку іконок та ID екранів
    const navMap = {
        'search': 'search-view',
        'format_list_bulleted': 'schedule-view',
        'notifications': 'notifications-view',
        'grid_view': 'grid-view',
        'menu': 'menu-view'
    };
    // Назви місяців та днів
    const monthNamesUK = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
    const dayNamesUK = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];

    // 1. ДАНІ РОЗКЛАДУ (Імітація)
    const scheduleData = [
        // Понеділок (27.10.2025) - Приклад для демонстрації стеку (якщо це минулий день)
        { date: '2025-10-27', time: '10:00', subject: 'Менеджмент', type: 'Лекція', teacher: 'Іванов П.С.', group: 'FK-B17 (1)', classroom: 'Ауд. №101' },
        { date: '2025-10-27', time: '11:30', subject: 'Програмування', type: 'Практичні', teacher: 'Петренко С.І.', group: 'FK-B17 (1)', classroom: 'Ауд. №46' },
        { date: '2025-10-27', time: '13:00', subject: 'Філософія', type: 'Лекція', teacher: 'Коваль В.В.', group: 'FK-B17 (1)', classroom: 'Ауд. №300' },
        // Вівторок (28.10.2025) - Приклад для поточного дня
        { date: '2025-10-28', time: '09:00', subject: 'Дискретна математика', type: 'Лекція', teacher: 'Сидоренко А.А.', group: 'FK-B17 (1)', classroom: 'Ауд. №205' },
        { date: '2025-10-23', time: '10:30', subject: 'Алгоритми', type: 'Практичні', teacher: 'Іванов П.С.', group: 'FK-B17 (1)', classroom: 'Ауд. №46' },
        { date: '2025-10-23', time: '12:00', subject: 'Веб-дизайн', type: 'Лабораторна', teacher: 'Стасюк В.А.', group: 'FK-B17 (1)', classroom: 'Ауд. №110' },
        { date: '2025-10-23', time: '14:00', subject: 'Програмування мобільних додатків', type: 'Практичні заняття', teacher: 'Стасюк В.А.', group: 'FK-B17 (1)', classroom: 'Ауд. №46' },
        // Середа (29.10.2025)
        { date: '2025-10-23', time: '16:30', subject: 'Програмування мобільних додатків', type: 'Практичні заняття', teacher: 'Стасюк В.А.', group: 'FK-B17 (1)', classroom: 'Ауд. №46' },
    ];
    
    // Зберігає поточну відображувану дату
    let currentDisplayDate = new Date();
    // Встановлюємо дату для тестування (наприклад, 28.10.2025 11:45)
    // currentDisplayDate = new Date(2025, 9, 28, 11, 45, 0); // Розкоментуйте для тестування
    currentDisplayDate.setHours(11, 45, 0, 0); 

    let currentCalendarDate = new Date(currentDisplayDate); 

    // 2. ДОПОМІЖНІ ФУНКЦІЇ ДАТИ
    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function formatDateIso(date) {
        return date.toISOString().split('T')[0];
    }
    
    function getDayName(date) {
        return dayNamesUK[date.getDay()];
    }

    function isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }
    
    // 3. ФУНКЦІЯ ОНОВЛЕННЯ СЕЛЕКТОРІВ ДНІВ (без змін)
    function updateDaySelector(currentDay) { 
        const yesterday = new Date(currentDay);
        yesterday.setDate(currentDay.getDate() - 1);
        const tomorrow = new Date(currentDay);
        tomorrow.setDate(currentDay.getDate() + 1);

        const yesterdayName = getDayName(yesterday);
        const tomorrowName = getDayName(tomorrow);
        const currentDayName = getDayName(currentDay);

        mainDayElement.textContent = currentDayName;
        dateElement.textContent = formatDate(currentDay);

        daySelector.innerHTML = `
            <span class="day-item prev-day" data-date-offset="-1">${yesterdayName}</span>
            <span class="day-item next-day" data-date-offset="1">${tomorrowName}</span>
        `;
    }

    // 4. ДОПОМІЖНА ФУНКЦІЯ: Створення HTML для однієї картки
    function createCardHTML(lesson, statusClass) {
        // Додаємо декоративні форми тільки для окремих карток
        const decorativeShapes = (statusClass !== 'past' || statusClass === 'current' || statusClass === 'future') ? `
            <div class="decorative-shape-1"></div>
            <div class="decorative-shape-2"></div>
        ` : '';

        return `
            <div class="lesson-card ${statusClass}">
                ${decorativeShapes}
                <h2 class="subject">${lesson.subject}</h2>
                <div class="details-row">
                    <span class="time">${lesson.time}</span>
                    <span class="group">${lesson.group}</span>
                    <span class="classroom">${lesson.classroom}</span>
                </div>
                <div class="details-row secondary">
                    <span class="type">${lesson.type}</span>
                    <span class="teacher">${lesson.teacher}</span>
                </div>
            </div>
        `;
    }

    // 5. ДОПОМІЖНА ФУНКЦІЯ: Створення HTML для стеку пройдених занять
    function createStackHTML(lessons) {
        const count = lessons.length;
        
        // Зворотний порядок, щоб остання пройдена картка була на "вершині" візуального стеку
        const reversedLessons = [...lessons].reverse(); 
        
        const stackedCardsHTML = reversedLessons.map((lesson) => {
            // Картки у стеку не мають декоративних форм, щоб не заважати візуалу
            return `
                <div class="lesson-card past stack-item">
                    <h2 class="subject">${lesson.subject}</h2>
                    <div class="details-row">
                        <span class="time">${lesson.time}</span>
                        <span class="group">${lesson.group}</span>
                        <span class="classroom">${lesson.classroom}</span>
                    </div>
                    <div class="details-row secondary">
                        <span class="type">${lesson.type}</span>
                        <span class="teacher">${lesson.teacher}</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="past-stack-container" data-count="${count}">
                <div class="stack-header">
                    <span class="material-icons">history</span>
                    <span>${count} пройдених занять. Натисніть, щоб розгорнути.</span>
                    <span class="material-icons expand-icon">expand_more</span>
                </div>
                <div class="stack-cards-wrapper">
                    ${stackedCardsHTML}
                </div>
            </div>
        `;
    }

    // 6. ФУНКЦІЯ: Перемикання стану стеку
    function toggleStack(event) {
        const stack = event.currentTarget;
        stack.classList.toggle('expanded');
        
        const expandIcon = stack.querySelector('.expand-icon');
        if (stack.classList.contains('expanded')) {
            expandIcon.textContent = 'expand_less';
        } else {
            expandIcon.textContent = 'expand_more';
        }
    }

    // 7. ФУНКЦІЯ: Додавання обробника подій до стеку
    function addStackClickListener() {
        document.querySelectorAll('.past-stack-container').forEach(stack => {
            // Видаляємо попередні, щоб уникнути дублювання
            stack.removeEventListener('click', toggleStack); 
            stack.addEventListener('click', toggleStack);
        });
    }
    
    // 8. ОСНОВНА ФУНКЦІЯ РЕНДЕРИНГУ РОЗКЛАДУ
    function renderSchedule(date) {
        currentDisplayDate = date; 
        const selectedDateIso = formatDateIso(date);
        
        const daySchedule = scheduleData
            .filter(lesson => lesson.date === selectedDateIso)
            .sort((a, b) => a.time.localeCompare(b.time)); 
        
        const hasSchedule = daySchedule.length > 0;
        updateDaySelector(date);

        scheduleList.innerHTML = ''; 

        if (!hasSchedule) {
            scheduleList.innerHTML = '<p style="text-align: center; color: var(--color-primary); opacity: 0.7; padding: 40px;">Занять немає на цю дату.</p>';
            return;
        }

        const now = new Date();
        const isToday = isSameDay(date, now);
        const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();
        const isPastDayFlag = date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        // Масив для зберігання HTML-елементів для рендерингу
        const groupedElements = [];
        // Тимчасовий масив для накопичення пройдених занять
        let pastStack = [];

        daySchedule.forEach((lesson, index) => {
            // 1. Визначення статусу (стара логіка)
            let statusClass;
            const [lessonHour, lessonMinute] = lesson.time.split(':').map(Number);
            const lessonDurationMinutes = 90; 
            const currentWindowBeforeStart = 15; 
            const lessonStartMinutes = lessonHour * 60 + lessonMinute;
            const lessonEndMinutes = lessonStartMinutes + lessonDurationMinutes;

            if (isPastDayFlag) {
                statusClass = 'past';
            } else if (!isToday && !isPastDayFlag) {
                statusClass = 'future';
            } else { // Це сьогодні
                if (currentMinutesFromMidnight >= lessonEndMinutes) {
                    statusClass = 'past';
                } else if (currentMinutesFromMidnight >= lessonStartMinutes - currentWindowBeforeStart) { 
                    statusClass = 'current';
                } else {
                    statusClass = 'future';
                }
            }

            // 2. Логіка групування
            if (statusClass === 'past') {
                pastStack.push(lesson);
            } else {
                // Якщо зустріли інший статус, спочатку рендеримо накопичений стек (якщо він є)
                if (pastStack.length >= 2) {
                    groupedElements.push(createStackHTML(pastStack));
                } else if (pastStack.length === 1) {
                    // Якщо тільки одне минуле заняття, рендеримо його як окрему картку
                    groupedElements.push(createCardHTML(pastStack[0], 'past'));
                }
                pastStack = []; // Скидаємо стек
                
                // Рендеримо поточне/майбутнє заняття
                groupedElements.push(createCardHTML(lesson, statusClass));
            }

            // Обробка останнього елемента в циклі
            if (index === daySchedule.length - 1 && pastStack.length > 0) {
                if (pastStack.length >= 2) {
                    groupedElements.push(createStackHTML(pastStack));
                } else if (pastStack.length === 1) {
                    groupedElements.push(createCardHTML(pastStack[0], 'past'));
                }
                pastStack = [];
            }
        });

        // 3. Фінальний рендеринг та додавання слухачів
        scheduleList.innerHTML = groupedElements.join('');
        addStackClickListener(); // Додаємо слухача кліку для новоствореного стеку
    }

    // 9. ЛОГІКА КАЛЕНДАРЯ (без змін)
    function renderCalendar() {
        // Заголовок: Місяць і Рік
        currentMonthYearElement.textContent = `${monthNamesUK[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
        calendarGrid.innerHTML = '';

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();

        // 1. Отримати перший день місяця (0 - неділя, 1 - понеділок ...)
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        
        // 2. Отримати кількість днів у поточному місяці
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Додавання порожніх комірок для зміщення першого дня
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.insertAdjacentHTML('beforeend', '<span class="calendar-day inactive"></span>');
        }

        // Додавання днів місяця
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            let classes = 'calendar-day';
            
            // Якщо день відповідає відображуваному дню розкладу
            if (isSameDay(date, currentDisplayDate)) {
                classes += ' selected';
            }

            // Додавання HTML дня
            calendarGrid.insertAdjacentHTML('beforeend', `<span class="${classes}" data-date="${date.toISOString()}">${day}</span>`);
        }
    }
// 10. ФУНКЦІЯ: Налаштування нижньої навігації
    function setupBottomNavigation() {
		// 1. Спочатку видаляємо всі активні класи з усіх елементів (НАДІЙНИЙ СПОСІБ)
        document.querySelectorAll('.bottom-nav .active-nav').forEach(item => {
            item.classList.remove('active-nav');
        });
		// 2. Встановлюємо початковий активний екран (Розклад)
        let activeIcon = 'format_list_bulleted';
        let activeViewId = navMap[activeIcon];
		// Визначаємо початковий активний екран (розклад)
        const initialActiveIcon = 'format_list_bulleted'; 
        const initialViewId = navMap[initialActiveIcon];
        // 3. Встановлюємо активний клас на вибраний елемент
        const initialActiveNav = bottomNav.querySelector(`[data-icon="${activeIcon}"]`).closest('.nav-item');
        initialActiveNav.classList.add('active-nav');
        // Встановлюємо початковий активний клас на елементі
        bottomNav.querySelector(`[data-icon="${activeIcon}"]`).closest('.nav-item').classList.add('active-nav');
        // Спочатку видаляємо активні класи, щоб уникнути дублювання, якщо вони є в HTML

        if (initialActiveNav) {
            initialActiveNav.classList.add('active-nav');
        }
        
        // ВСТАНОВЛЕННЯ ПОЧАТКОВОГО КЛАСУ РОЗКЛАДУ
        if (initialViewId === 'schedule-view') {
            appContainer.classList.add('is-schedule'); // <<< ДОДАТИ ПОЧАТКОВИЙ КЛАС
        } else {
            appContainer.classList.remove('is-schedule');
        }
		bottomNav.addEventListener('click', (event) => {
            const navItem = event.target.closest('.nav-item');
            if (!navItem) return;

            const iconName = navItem.querySelector('.material-icons').textContent.trim();
            const targetViewId = navMap[iconName];

            if (navItem.classList.contains('active-nav')) return; // Клік на активному

            // 1. Оновити активний стан навігації
            document.querySelector('.nav-item.active-nav').classList.remove('active-nav');
            navItem.classList.add('active-nav');

            // 2. Перемкнути екран
            document.querySelector('.view.active-view').classList.remove('active-view');
            document.getElementById(targetViewId).classList.add('active-view');
            
            // 3. УПРАВЛІННЯ ВИДИМІСТЮ HEADER
            if (targetViewId === 'schedule-view') {
                appContainer.classList.add('is-schedule'); // Показати header
                renderSchedule(currentDisplayDate);
            } else {
                appContainer.classList.remove('is-schedule'); // Приховати header
            }
        });
    }
    // 11. ОБРОБНИК ПОДІЙ (без змін)
    // Перемикання дня (Попередній/Наступний)
    daySelector.addEventListener('click', (event) => {
        const item = event.target.closest('.day-item');
        if (item && (item.classList.contains('prev-day') || item.classList.contains('next-day'))) {
            // Класи prev-day та next-day мають data-date-offset
            const offset = parseInt(item.dataset.dateOffset, 10);
            
            // Визначаємо нову дату
            const newDate = new Date(currentDisplayDate);
            newDate.setDate(currentDisplayDate.getDate() + offset);
            newDate.setHours(currentDisplayDate.getHours(), currentDisplayDate.getMinutes(), 0, 0); 

            currentCalendarDate = new Date(newDate); // Оновлюємо дату календаря
            renderSchedule(newDate);
        }
    });

    // Відкриття модального вікна календаря (без змін)
    dateElement.addEventListener('click', () => {
        calendarModal.classList.add('open');
        currentCalendarDate = new Date(currentDisplayDate); // Встановлюємо поточну дату розкладу як початкову для календаря
        renderCalendar();
    });

    // Закриття модального вікна (без змін)
    closeModalBtn.addEventListener('click', () => {
        calendarModal.classList.remove('open');
    });

    // Перемикання місяців (без змін)
    prevMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    // Вибір дня в календарі (без змін)
    calendarGrid.addEventListener('click', (event) => {
        const dayElement = event.target.closest('.calendar-day');
        if (dayElement && !dayElement.classList.contains('inactive')) {
            const selectedDateString = dayElement.dataset.date;
            if (selectedDateString) {
                const selectedDate = new Date(selectedDateString);
                
                // Встановлюємо час як у поточний момент, щоб при рендері сьогоднішнього дня коректно спрацював statusClass
                selectedDate.setHours(currentDisplayDate.getHours(), currentDisplayDate.getMinutes(), 0, 0); 
                
                // Оновити розклад
                renderSchedule(selectedDate);
                
                // Закрити модальне вікно
                calendarModal.classList.remove('open');
            }
        }
    });

    // 12. Початкове завантаження
    renderSchedule(currentDisplayDate);
	setupBottomNavigation(); // <<< Викликаємо нову функцію
});