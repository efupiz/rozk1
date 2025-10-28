// ОНОВЛЕНИЙ script.js — версія з викликами API (замінює тестові дані)
document.addEventListener('DOMContentLoaded', () => {
    // ===============================================================
    // КОНФІГУРАЦІЯ API
    // ===============================================================
    const SERVICE_BASE = 'https://vnz.osvita.net:443/WidgetSchedule.asmx/';
    const VUZ_ID = 11571;

    // ===============================================================
    // ЕЛЕМЕНТИ ІНТЕРФЕЙСУ
    // ===============================================================
    const daySelector = document.querySelector('.day-selector');
    const mainDayElement = document.querySelector('.main-day');
    const dateElement = document.querySelector('.date');
    const scheduleList = document.querySelector('.schedule-list');
    const appContainer = document.querySelector('.app-container');
    const bottomNav = document.querySelector('.bottom-nav');
    const calendarModal = document.getElementById('calendar-modal');
    const currentMonthYearElement = document.getElementById('current-month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // Фільтри (стекові елементи)
    const facultyStack = document.getElementById('faculty-stack');
    const facultyDisplay = facultyStack ? facultyStack.querySelector('.selected-display') : null;
    const facultyOptions = document.getElementById('faculty-options');
    const facultySelectHidden = document.getElementById('faculty-select');

    const educationFormStack = document.getElementById('education-form-stack');
    const educationFormDisplay = educationFormStack ? educationFormStack.querySelector('.selected-display') : null;
    const educationFormOptions = document.getElementById('education-form-options');
    const educationFormSelectHidden = document.getElementById('education-form-select');

    const courseStack = document.getElementById('course-stack');
    const courseDisplay = courseStack ? courseStack.querySelector('.selected-display') : null;
    const courseOptions = document.getElementById('course-options');
    const courseSelectHidden = document.getElementById('course-select');

    const groupStack = document.getElementById('group-stack');
    const groupDisplay = groupStack ? groupStack.querySelector('.selected-display') : null;
    const groupOptions = document.getElementById('group-options');
    const groupSelectHidden = document.getElementById('group-select');

    // Дати — якщо на сторінці є інпути з такими id
    const startDateInput = document.getElementById('start-date-input') || document.querySelector('#start-date-input');
    const endDateInput = document.getElementById('end-date-input') || document.querySelector('#end-date-input');

    // Кнопка пошуку — в HTML у тебе клас .search-submit-btn, тому вибираю через селектор
    const searchSubmitBtn = document.querySelector('.search-submit-btn');

    // Навігація, локалізація
    const navMap = {
        'search': 'search-view',
        'format_list_bulleted': 'schedule-view',
        'notifications': 'notifications-view',
        'grid_view': 'grid-view',
        'menu': 'menu-view'
    };

    const monthNamesUK = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
    const dayNamesUK = ['Неділя','Понеділок','Вівторок','Середа','Четвер','П\'ятниця','Субота'];

	// ===============================================================
	// СТАН ДОДАТКУ
	// ===============================================================
	let currentDisplayDate = new Date();
	let currentCalendarDate = new Date(currentDisplayDate);
	let allScheduleData = [];
	let currentGroupName = 'Завантаження...';

	let currentFacultyID = null;
	let currentEducationFormID = null;
	let currentCourseID = null;
	let currentGroupID = null; // поки не вибрано

	// ДОДАЙТЕ ЦІ РЯДКИ
	let currentLoadedStartDate = null; // Початок завантаженого діапазону
	let currentLoadedEndDate = null;   // Кінець завантаженого діапазону

    // ===============================================================
    // ХЕЛПЕР ДЛЯ АКТИВАЦІЇ В'Ю ПОШУКУ (НОВА ФУНКЦІЯ)
    // ===============================================================
    function activateSearcherView() {
        const searchView = document.getElementById('search-view');
        // Знаходимо елемент навігації пошуку
        const searchNavItem = document.querySelector('.bottom-nav [data-icon="search"]')?.closest('.nav-item');

        // 1. Деактивуємо поточну вкладку та навігацію
        document.querySelector('.view.active-view')?.classList.remove('active-view');
        document.querySelector('.nav-item.active-nav')?.classList.remove('active-nav');
        appContainer?.classList.remove('is-schedule');

        // 2. Активуємо вкладку "Пошук" та навігацію
        searchView?.classList.add('active-view');
        searchNavItem?.classList.add('active-nav');
    }
    
    // ===============================================================
    // JSONP ФУНКЦІЯ (залишена — вона формує callback та робить запит)
    // ===============================================================
    function fetchJsonp(method, params = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + Date.now() + Math.random().toString(36).substring(2,9);
            params.aVuzID = VUZ_ID;

            const urlParams = Object.keys(params).map(key => {
                let value = params[key];
                if (typeof value === 'string') {
                    value = `"${value}"`; // API очікує рядки в лапках у query
                } else if (value === null) {
                    value = 'null';
                } else if (value === undefined || value === '') {
                    return '';
                }
                return `${key}=${value}`;
            }).filter(p => p).join('&');

            const url = `${SERVICE_BASE}${method}?callback=${callbackName}&_=${Date.now()}&${urlParams}`;

            const script = document.createElement('script');
            script.src = url;

            window[callbackName] = (response) => {
                delete window[callbackName];
                script.remove();
                // У schedule.min.js дані лежать в response.d; тут узгоджено — повертаємо response.d
                resolve(response.d);
            };

            script.onerror = () => {
                delete window[callbackName];
                script.remove();
                reject(new Error(`JSONP request failed for method: ${method}`));
            };

            document.head.appendChild(script);
        });
    }

    // ===============================================================
    // УНІФІКОВАНЕ РЕНДЕРЕННЯ ОПЦІЙ ДЛЯ СТЕКУ
    // Підтримує об'єкти формату {Key, Value} або {ID, Name}
    // ===============================================================
    function populateFilterOptions(optionsElement, data, filterName) {
        if (!optionsElement) return;
        optionsElement.innerHTML = '';

        if (!data || data.length === 0) {
            optionsElement.innerHTML = '<div class="filter-option-item disabled">Дані не знайдено.</div>';
            return;
        }

        data.forEach(item => {
            const key = item.Key ?? item.ID ?? item.StudyGroupID ?? item.Id ?? item.id ?? '';
            const value = item.Value ?? item.Name ?? item.DisplayName ?? item.NameUa ?? '';
            const div = document.createElement('div');
            div.className = 'filter-option-item';
            div.textContent = value || '(без назви)';
            div.dataset.key = key;
            div.dataset.value = value;
            div.dataset.filter = filterName;
            optionsElement.appendChild(div);
        });
    }

    function updateFilterDisplay(stackElement, key, value, placeholder) {
        if (!stackElement) return;
        const display = stackElement.querySelector('.selected-display');
        const hiddenInput = stackElement.querySelector('input[type="hidden"]');
        const expandIcon = stackElement.querySelector('.expand-icon');

        if (key && value) {
            display.textContent = value;
            if (hiddenInput) hiddenInput.value = key;
            stackElement.classList.add('selected');
        } else {
            if (display) display.textContent = placeholder || '';
            if (hiddenInput) hiddenInput.value = '';
            stackElement.classList.remove('selected');
        }

        stackElement.classList.remove('expanded');
        if (expandIcon) expandIcon.textContent = 'expand_more';
    }

    // ===============================================================
    // ФУНКЦІЇ ДЛЯ ОТРИМАННЯ ДАНИХ З API (заміна тестових масивів)
    // - loadFilters() -> GetStudentScheduleFiltersData
    // - getStudyGroupsFromApi(...) -> GetStudyGroups
    // ===============================================================
    async function loadFilters() {
        // Показати тимчасовий стан завантаження
        if (facultyOptions) facultyOptions.innerHTML = '<div class="filter-option-item disabled">Завантаження...</div>';
        if (educationFormOptions) educationFormOptions.innerHTML = '<div class="filter-option-item disabled">Завантаження...</div>';
        if (courseOptions) courseOptions.innerHTML = '<div class="filter-option-item disabled">Завантаження...</div>';

        try {
            const data = await fetchJsonp('GetStudentScheduleFiltersData', {}); // повертає { faculties, educForms, courses, ... }
            if (!data) throw new Error('Порожня відповідь від GetStudentScheduleFiltersData');

            // Відповідь очікується у вигляді data.faculties, data.educForms, data.courses
            populateFilterOptions(facultyOptions, data.faculties || [], 'faculty');
            populateFilterOptions(educationFormOptions, data.educForms || [], 'education-form');
            populateFilterOptions(courseOptions, data.courses || [], 'course');

            // Скидаємо відображення
            updateFilterDisplay(facultyStack, null, null, 'Оберіть факультет');
            updateFilterDisplay(educationFormStack, null, null, 'Оберіть форму');
            updateFilterDisplay(courseStack, null, null, 'Оберіть курс');

            // Група — поки вимкнена
            groupOptions.innerHTML = '<div class="filter-option-item disabled">Оберіть Факультет, Форму та Курс</div>';
            groupStack.classList.add('disabled');
            updateFilterDisplay(groupStack, null, null, 'Оберіть групу');

        } catch (err) {
            console.error('Помилка при завантаженні фільтрів:', err);
            if (facultyOptions) facultyOptions.innerHTML = '<div class="filter-option-item disabled">Помилка завантаження</div>';
            if (educationFormOptions) educationFormOptions.innerHTML = '<div class="filter-option-item disabled">Помилка завантаження</div>';
            if (courseOptions) courseOptions.innerHTML = '<div class="filter-option-item disabled">Помилка завантаження</div>';
        }
    }

    async function getStudyGroupsFromApi(facultyID, educFormID, courseID) {
        if (!facultyID || !educFormID || !courseID) return [];

        try {
            const params = {
                aFacultyID: facultyID,
                aEducationForm: educFormID,
                aCourse: courseID,
                aGiveStudyTimes: false
            };
            const res = await fetchJsonp('GetStudyGroups', params);
            // Очікуємо, що res має властивість studyGroups (як у schedule.min.js)
            if (res && res.studyGroups) return res.studyGroups;
            // Якщо повернулися одразу масив
            if (Array.isArray(res)) return res;
            return [];
        } catch (err) {
            console.error('Помилка GetStudyGroups:', err);
            return [];
        }
    }

    // ===============================================================
    // ОБРОБНИКИ СТЕКІВ / ОПЦІЙ
    // ===============================================================
    function handleStackToggle(event) {
        const headerElement = event.target.closest('.filter-stack-header');
        if (!headerElement) return;
        const stackContainer = headerElement.closest('.filter-stack-container');
        
        // КЛЮЧОВЕ ВИПРАВЛЕННЯ: Якщо контейнер вимкнений, миттєво виходимо, 
        // щоб запобігти анімації іконки
        if (stackContainer.classList.contains('disabled')) return; 

        const isCurrentlyExpanded = stackContainer.classList.contains('expanded');

        document.querySelectorAll('.filter-stack-container.expanded').forEach(openStack => {
            if (openStack !== stackContainer) {
                openStack.classList.remove('expanded');
                openStack.querySelector('.expand-icon').textContent = 'expand_more';
            }
        });

        stackContainer.classList.toggle('expanded');
        const expandIcon = stackContainer.querySelector('.expand-icon');
        expandIcon && (expandIcon.textContent = isCurrentlyExpanded ? 'expand_less' : 'expand_more');
    }

    async function handleOptionSelect(event) {
        const option = event.target.closest('.filter-option-item');
        if (!option || option.classList.contains('disabled')) return;

        const stackContainer = option.closest('.filter-stack-container');
        const filterName = stackContainer.dataset.filterName;
        const key = option.dataset.key;
        const value = option.dataset.value;

        updateFilterDisplay(stackContainer, key, value, '');

        // Оновлюємо стан для каскаду
        currentFacultyID = facultySelectHidden?.value || (facultyStack?.querySelector('.selected-display')?.dataset?.key) || currentFacultyID;
        currentEducationFormID = educationFormSelectHidden?.value || (educationFormStack?.querySelector('.selected-display')?.dataset?.key) || currentEducationFormID;
        currentCourseID = courseSelectHidden?.value || (courseStack?.querySelector('.selected-display')?.dataset?.key) || currentCourseID;

        // Якщо було вибрано один із трьох базових фільтрів — оновлюємо групи
        if (['faculty', 'education-form', 'course'].includes(filterName)) {
            // читабельний варіант: беремо hidden values, але якщо вони пусті - беремо dataset.key в дисплеї
            currentFacultyID = facultySelectHidden?.value || facultyStack.querySelector('.selected-display')?.dataset?.key || null;
            currentEducationFormID = educationFormSelectHidden?.value || educationFormStack.querySelector('.selected-display')?.dataset?.key || null;
            currentCourseID = courseSelectHidden?.value || courseStack.querySelector('.selected-display')?.dataset?.key || null;

            await updateGroups();
            return;
        }

        // Якщо обрали групу
        if (filterName === 'group') {
            currentGroupID = key;
            if (searchSubmitBtn) searchSubmitBtn.disabled = false;
        }
    }

    // Каскадне оновлення груп
    async function updateGroups() {
        const allSelected = currentFacultyID && currentEducationFormID && currentCourseID;

        groupStack.classList.remove('disabled');
        groupOptions.innerHTML = '<div class="filter-option-item disabled">Завантаження груп...</div>';
        if (searchSubmitBtn) searchSubmitBtn.disabled = true;
        updateFilterDisplay(groupStack, null, null, 'Оберіть групу');

        if (!allSelected) {
            groupOptions.innerHTML = '<div class="filter-option-item disabled">Оберіть Факультет, Форму та Курс</div>';
            groupStack.classList.add('disabled');
            return;
        }

        try {
            const groups = await getStudyGroupsFromApi(currentFacultyID, currentEducationFormID, currentCourseID);
            if (groups && groups.length > 0) {
                populateFilterOptions(groupOptions, groups, 'group');
                groupStack.classList.remove('disabled');
            } else {
                groupOptions.innerHTML = '<div class="filter-option-item disabled">Групи не знайдено.</div>';
                groupStack.classList.add('disabled');
            }
        } catch (err) {
            console.error('Помилка при завантаженні груп:', err);
            groupOptions.innerHTML = '<div class="filter-option-item disabled">Помилка завантаження.</div>';
            groupStack.classList.add('disabled');
        }
    }

    // Додаємо слухачі
    function setupFilterListeners() {
        document.querySelectorAll('.filter-stack-container').forEach(stack => {
            const header = stack.querySelector('.filter-stack-header');
            if (header) header.addEventListener('click', handleStackToggle);
        });

        document.querySelectorAll('.filter-stack-options').forEach(options => {
            options.addEventListener('click', handleOptionSelect);
        });

        if (searchSubmitBtn) searchSubmitBtn.addEventListener('click', handleSearchSubmit);
    }

	// ===============================================================
	// ХЕЛПЕР ДЛЯ ДІАПАЗОНУ ДАТ
	// ===============================================================
	/**
	 * Розраховує діапазон завантаження: 
	 * (1-й день місяця refDate - 7 днів) до (останній день місяця refDate + 7 днів)
	 * @param {Date} referenceDate - Дата, на основі місяця якої будується діапазон
	 * @returns {{startDate: Date, endDate: Date}}
	 */
	function getScheduleDateRange(referenceDate) {
		const year = referenceDate.getFullYear();
		const month = referenceDate.getMonth();

		// Перший день місяця, на який клікнули
		const monthStart = new Date(year, month, 1);
		// Останній день місяця (через new Date(year, month + 1, 0))
		const monthEnd = new Date(year, month + 1, 0);

		// Клонуємо дати, щоб не змінити оригінали
		const startDate = new Date(monthStart);
		startDate.setDate(monthStart.getDate() - 7); // 7 днів до початку місяця

		const endDate = new Date(monthEnd);
		endDate.setDate(monthEnd.getDate() + 7); // 7 днів після кінця місяця

		return { startDate, endDate };
	}

    // ===============================================================
    // РЕНДЕР РОЗКЛАДУ (використовує вже наявні функції transform / render)
    // (збережено логіку з твого початкового скрипту)
    // ===============================================================
    function transformScheduleData(rawData) {
        return rawData.map(lesson => {
            const [day, month, year] = lesson.full_date.split('.');
            const isoDate = `${year}-${month}-${day}`;
            return {
                date: isoDate,
                time: lesson.study_time_begin || lesson.study_time,
                subject: lesson.discipline,
                type: lesson.study_type,
                teacher: lesson.employee_short || lesson.employee,
                group: (lesson.contingent || '').replace('Група: ', ''),
                classroom: lesson.cabinet
            };
        });
    }

    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }
    function formatDateIso(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    }
    function getDayName(date) { return dayNamesUK[date.getDay()]; }
    function isSameDay(d1,d2){ return d1.getDate()===d2.getDate() && d1.getMonth()===d2.getMonth() && d1.getFullYear()===d2.getFullYear(); }

    function updateDaySelector(currentDay) {
        const yesterday = new Date(currentDay); yesterday.setDate(currentDay.getDate()-1);
        const tomorrow = new Date(currentDay); tomorrow.setDate(currentDay.getDate()+1);
        mainDayElement.textContent = getDayName(currentDay);
        dateElement.textContent = formatDate(currentDay);
        daySelector.innerHTML = `
            <span class="day-item prev-day" data-date-offset="-1">${getDayName(yesterday)}</span>
            <span class="day-item next-day" data-date-offset="1">${getDayName(tomorrow)}</span>
        `;
    }

    function createCardHTML(lesson, statusClass) {
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

    function createStackHTML(lessons) {
        const count = lessons.length;
        const reversedLessons = [...lessons].reverse();
        const stackedCardsHTML = reversedLessons.map((lesson) => {
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
                <div class="stack-cards-wrapper">${stackedCardsHTML}</div>
            </div>
        `;
    }
    function toggleStack(event){ const stack = event.currentTarget; stack.classList.toggle('expanded'); const icon = stack.querySelector('.expand-icon'); icon && (icon.textContent = stack.classList.contains('expanded') ? 'expand_less' : 'expand_more'); }
    function addStackClickListener(){ document.querySelectorAll('.past-stack-container').forEach(s=>{ s.removeEventListener('click', toggleStack); s.addEventListener('click', toggleStack); }); }

async function renderSchedule(date) {
        currentDisplayDate = date;
        const selectedDateIso = formatDateIso(date);
        updateDaySelector(date); // Оновлюємо селектор дня одразу

        // 1. Перевірка: чи потрібно завантажувати нові дані?
        // (true якщо: (1) перший запуск АБО (2) обрана дата раніше завантаженої АБО (3) обрана дата пізніше завантаженої)
        const needsFetch = !currentLoadedStartDate || !currentLoadedEndDate || 
                           date.getTime() < currentLoadedStartDate.getTime() || 
                           date.getTime() > currentLoadedEndDate.getTime();

        if (needsFetch) {
            // Якщо групи НЕМАЄ (початкове завантаження) - ми НЕ МОЖЕМО нічого завантажити.
            if (!currentGroupID) {
                // АВТОМАТИЧНО ПЕРЕКЛЮЧАЄМО НА ВКЛАДКУ "ПОШУК"
                activateSearcherView();
                scheduleList.innerHTML = '<p style="text-align:center;color:var(--color-primary);opacity:0.8;padding:40px;">Будь ласка, оберіть групу.</p>';
                return; // Нічого не завантажуємо
            }

            // Якщо група Є (або це перезавантаження по кліку на календар),
            // показуємо лоадер і завантажуємо новий діапазон.
				scheduleList.innerHTML = `
					<div class="loader-container">
						<div class="spinner"></div>
						<p class="loader-text">Завантаження розкладу (новий діапазон)...</p>
					</div>`;

				try {
                // 1. Розрахувати новий діапазон на основі обраної дати
                const newRange = getScheduleDateRange(date);
                
                // 2. Сформувати дати для API (ДД.ММ.РРРР)
                const apiStartDate = formatDate(newRange.startDate);
                const apiEndDate = formatDate(newRange.endDate);

                // 3. Завантажити дані
                const rawData = await fetchJsonp('GetScheduleDataX', {
                    aStudyGroupID: currentGroupID,
                    aStartDate: apiStartDate,
                    aEndDate: apiEndDate,
                    aStudyTypeID: null
                });

                // 4. ОНОВИТИ СТАН
                allScheduleData = transformScheduleData(rawData || []);
                currentLoadedStartDate = newRange.startDate; // Зберігаємо нові межі
                currentLoadedEndDate = newRange.endDate;

                if (allScheduleData.length > 0) {
                    currentGroupName = allScheduleData[0].group || currentGroupName;
                } else {
                    currentGroupName = 'Група не знайдена';
                }
                
                // Дані завантажено, allScheduleData оновлено.
                // Тепер можна приступати до рендерингу (логіка нижче)

            } catch (err) {
                console.error('Помилка завантаження розкладу (новий діапазон):', err);
                scheduleList.innerHTML = '<p style="text-align:center;color:red;padding:40px;">Помилка під час завантаження розкладу.</p>';
                return; // Зупинити виконання, якщо завантаження не вдалося
            }
        }

        // 2. РЕНДЕРИНГ (виконується, якщо needsFetch=false АБО needsFetch=true і завантаження пройшло успішно)
        
        // Фільтруємо дані, які вже лежать у allScheduleData
        const daySchedule = allScheduleData.filter(l => l.date === selectedDateIso).sort((a,b)=> (a.time||'').localeCompare(b.time||''));

		if (daySchedule.length === 0) {
            // Перевіряємо, чи ми не знайшли дані саме тому, що не обрано групу
            if (allScheduleData.length === 0 && !currentGroupID) {
                 // АВТОМАТИЧНО ПЕРЕКЛЮЧАЄМО НА ВКЛАДКУ "ПОШУК"
                 activateSearcherView();
                 scheduleList.innerHTML = '<p style="text-align:center;color:var(--color-primary);opacity:0.8;padding:40px;">Будь ласка, оберіть групу.</p>';
            } else {
                 // Фінальне, покращене повідомлення про відсутність занять
                 scheduleList.innerHTML = `
                    <div class="no-schedule-message">
                        <p class="no-schedule-main-text">Занять немає на цю дату.</p>
                        <p class="no-schedule-sub-text">
                            На жаль, інформація тимчасово відсутня або розклад ще не сформований.
                        </p>
                    </div>`;
            }
            return;
        }

        // (Уся ваша логіка для `now`, `isToday`, `groupedElements`, `pastStack`... залишається тут)
        const now = new Date();
        const isToday = isSameDay(date, now);
        const currentMinutesFromMidnight = now.getHours()*60 + now.getMinutes();
        const isPastDayFlag = date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const groupedElements = [];
        let pastStack = [];

        daySchedule.forEach((lesson, index) => {
            let statusClass;
            const [h,m] = (lesson.time||'00:00').split(':').map(Number);
            const lessonDurationMinutes = 90;
            const currentWindowBeforeStart = 15;
            const lessonStartMinutes = h*60 + m;
            const lessonEndMinutes = lessonStartMinutes + lessonDurationMinutes;

            if (isPastDayFlag) statusClass = 'past';
            else if (!isToday) statusClass = 'future';
            else {
                if (currentMinutesFromMidnight >= lessonEndMinutes) statusClass = 'past';
                else if (currentMinutesFromMidnight >= lessonStartMinutes - currentWindowBeforeStart) statusClass = 'current';
                else statusClass = 'future';
            }

            if (statusClass === 'past') {
                pastStack.push(lesson);
            } else {
                if (pastStack.length >= 2) groupedElements.push(createStackHTML(pastStack));
                else if (pastStack.length === 1) groupedElements.push(createCardHTML(pastStack[0],'past'));
                pastStack = [];
                groupedElements.push(createCardHTML(lesson, statusClass));
            }

            if (index === daySchedule.length - 1 && pastStack.length > 0) {
                if (pastStack.length >= 2) groupedElements.push(createStackHTML(pastStack));
                else if (pastStack.length === 1) groupedElements.push(createCardHTML(pastStack[0],'past'));
                pastStack = [];
            }
        });

        scheduleList.innerHTML = groupedElements.join('');
        addStackClickListener();
    }

// ===============================================================
    // Обробник натискання кнопки "Вивести" (ОНОВЛЕНО)
    // ===============================================================
    async function handleSearchSubmit() {
        if (!currentGroupID && groupSelectHidden && groupSelectHidden.value) currentGroupID = groupSelectHidden.value;
        if (!currentGroupID) {
            alert('Будь ласка, оберіть навчальну групу.');
            return;
        }

        // --- Логіка визначення діапазону ---
        const startInputVal = startDateInput?.value;
        const endInputVal = endDateInput?.value;
        let apiStartDate, apiEndDate, rangeStartDate, rangeEndDate;
        
        // Дата, яку ми покажемо після завантаження
        let dateToRender; 

        if (startInputVal && endInputVal) {
            // 1. Використовуємо дати з інпутів, якщо вони є
            apiStartDate = startInputVal.split('-').reverse().join('.');
            apiEndDate = endInputVal.split('-').reverse().join('.');
            rangeStartDate = new Date(startInputVal);
            rangeEndDate = new Date(endInputVal);
            dateToRender = new Date(rangeStartDate); // Покажемо перший день обраного діапазону
        } else {
            // 2. Якщо інпути порожні, розраховуємо діапазон від СЬОГОДНІ
            dateToRender = new Date(); // Покажемо сьогодні
            const newRange = getScheduleDateRange(dateToRender);
            
            apiStartDate = formatDate(newRange.startDate);
            apiEndDate = formatDate(newRange.endDate);
            rangeStartDate = newRange.startDate;
            rangeEndDate = newRange.endDate;
        }
        // --- Кінець логіки діапазону ---

        // Скидаємо старі дані та показуємо лоадер
        allScheduleData = [];
        currentLoadedStartDate = null; // Скидаємо межі
        currentLoadedEndDate = null;
        const scheduleView = document.getElementById('schedule-view');
        scheduleList.innerHTML = `
            <div class="loader-container">
                <div class="spinner"></div>
                <p class="loader-text">Завантаження нових даних розкладу...</p>
            </div>`;

        try {
            // Завантажуємо дані з визначеним діапазоном
            const rawData = await fetchJsonp('GetScheduleDataX', {
                aStudyGroupID: currentGroupID,
                aStartDate: apiStartDate,
                aEndDate: apiEndDate,
                aStudyTypeID: null
            });

            // ЗБЕРІГАЄМО НОВИЙ СТАН
            allScheduleData = transformScheduleData(rawData || []);
            currentLoadedStartDate = rangeStartDate; // Встановлюємо нові завантажені межі
            currentLoadedEndDate = rangeEndDate;
            
            // Оновлюємо поточні дати в інтерфейсі
            currentDisplayDate = new Date(dateToRender); 
            currentCalendarDate = new Date(currentDisplayDate);

            // Перемикаємося на вкладку розкладу
            document.querySelector('.view.active-view')?.classList.remove('active-view');
            scheduleView?.classList.add('active-view');
            appContainer?.classList.add('is-schedule');

            document.querySelector('.nav-item.active-nav')?.classList.remove('active-nav');
            document.querySelector('.bottom-nav [data-icon="format_list_bulleted"]')?.closest('.nav-item')?.classList.add('active-nav');

            // Тепер викликаємо renderSchedule. 
            // Вона НЕ буде робити повторний fetch (needsFetch=false),
            // бо ми щойно заповнили allScheduleData і currentLoadedStartDate/EndDate,
            // а currentDisplayDate гарантовано входить у цей діапазон.
            // Вона просто відфільтрує дані і покаже їх.
            await renderSchedule(currentDisplayDate);

        } catch (err) {
            console.error('Помилка при виводі розкладу:', err);
            scheduleList.innerHTML = '<p class="error-message">Не вдалося завантажити розклад з новими параметрами.</p>';
            // Скидаємо межі, якщо сталася помилка
            currentLoadedStartDate = null;
            currentLoadedEndDate = null;
        }
    }

    // ===============================================================
    // Календар / нижня навігація (скорочено — збережено основні обробники)
    // ===============================================================
    function renderCalendar() {
        if (!currentMonthYearElement || !calendarGrid) return;
        currentMonthYearElement.textContent = `${monthNamesUK[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
        calendarGrid.innerHTML = '';

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDayOfMonth; i++) calendarGrid.insertAdjacentHTML('beforeend', '<span class="calendar-day inactive"></span>');
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            let classes = 'calendar-day';
            if (isSameDay(date, currentDisplayDate)) classes += ' selected';
            calendarGrid.insertAdjacentHTML('beforeend', `<span class="${classes}" data-date="${date.toISOString()}">${day}</span>`);
        }
    }

    function setupBottomNavigation() {
        if (!bottomNav || !appContainer) return;
        document.querySelectorAll('.bottom-nav .active-nav').forEach(item => item.classList.remove('active-nav'));
        const initialActiveNav = bottomNav.querySelector(`[data-icon="format_list_bulleted"]`)?.closest('.nav-item');
        if (initialActiveNav) initialActiveNav.classList.add('active-nav');
        appContainer.classList.add('is-schedule');

        bottomNav.addEventListener('click', (event) => {
            const navItem = event.target.closest('.nav-item');
            if (!navItem || navItem.classList.contains('active-nav')) return;
            const iconName = navItem.querySelector('.material-icons')?.textContent.trim();
            const targetViewId = navMap[iconName];
            if (!targetViewId) return;
            document.querySelector('.nav-item.active-nav')?.classList.remove('active-nav');
            navItem.classList.add('active-nav');
            document.querySelector('.view.active-view')?.classList.remove('active-view');
            document.getElementById(targetViewId)?.classList.add('active-view');
            if (targetViewId === 'schedule-view') {
                appContainer.classList.add('is-schedule');
                renderSchedule(currentDisplayDate);
            } else {
                appContainer.classList.remove('is-schedule');
            }
        });

        daySelector?.addEventListener('click', (event) => {
            const item = event.target.closest('.day-item');
            if (item && (item.classList.contains('prev-day') || item.classList.contains('next-day'))) {
                const offset = parseInt(item.dataset.dateOffset, 10);
                const newDate = new Date(currentDisplayDate);
                newDate.setDate(currentDisplayDate.getDate() + offset);
                currentCalendarDate = new Date(newDate);
                renderSchedule(newDate);
            }
        });

        dateElement?.addEventListener('click', () => {
            calendarModal?.classList.add('open');
            currentCalendarDate = new Date(currentDisplayDate);
            renderCalendar();
        });

        closeModalBtn?.addEventListener('click', () => calendarModal?.classList.remove('open'));
        prevMonthBtn?.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); renderCalendar(); });
        nextMonthBtn?.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); renderCalendar(); });

        calendarGrid?.addEventListener('click', (event) => {
            const dayElement = event.target.closest('.calendar-day');
            if (dayElement && !dayElement.classList.contains('inactive')) {
                const selectedDateString = dayElement.dataset.date;
                if (selectedDateString) {
                    const selectedDate = new Date(selectedDateString);
                    renderSchedule(selectedDate);
                    calendarModal?.classList.remove('open');
                }
            }
        });
    }

// ===============================================================
    // ПОЧАТКОВЕ ЗАВАНТАЖЕННЯ
    // ===============================================================
    setupBottomNavigation();
    setupFilterListeners();
    loadFilters(); 
    
    // Цей виклик тепер спрацює коректно:
    // 1. `currentDisplayDate` = new Date() (сьогодні)
    // 2. `renderSchedule` буде викликано
    // 3. `needsFetch` буде true (бо `currentLoadedStartDate` = null)
    // 4. `currentGroupID` = null, тому функція викличе activateSearcherView() і вийде.
    renderSchedule(currentDisplayDate); 
});
