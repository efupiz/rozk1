// ПОВНИЙ, ВИПРАВЛЕНИЙ script.js — Версія з надійним кешуванням розкладу та виправленням Багів 1 і 2
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

    const educationFormStack = document.getElementById('education-form-stack');
    const educationFormDisplay = educationFormStack ? educationFormStack.querySelector('.selected-display') : null;
    const educationFormOptions = document.getElementById('education-form-options');

    const courseStack = document.getElementById('course-stack');
    const courseDisplay = courseStack ? courseStack.querySelector('.selected-display') : null;
    const courseOptions = document.getElementById('course-options');

    const groupStack = document.getElementById('group-stack');
    const groupDisplay = groupStack ? groupStack.querySelector('.selected-display') : null;
    const groupOptions = document.getElementById('group-options');
    const groupSelectHidden = document.getElementById('group-select'); 

    // Дати 
    const startDateInput = document.getElementById('start-date-input') || document.querySelector('#start-date-input');
    const endDateInput = document.getElementById('end-date-input') || document.querySelector('#end-date-input');

    // Кнопка пошуку
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
	let currentGroupID = null; 

	let currentLoadedStartDate = null; 
	let currentLoadedEndDate = null;   
    let currentLoadedGroupID = null; 
    // Кеш для часу розкладу поточного дня (для time.card.js)
    let lastDayScheduleTimes = null;
    // Слухач на випадок, якщо time.card.js завантажиться пізніше
    document.addEventListener('bellScheduleReady', () => {
        if (lastDayScheduleTimes && typeof window.updateBellScheduleVisibility === 'function') {
            // ТЕПЕР ПЕРЕДАЄМО ОБ'ЄКТ З ЧАСОМ ТА ДАТОЮ
            window.updateBellScheduleVisibility(lastDayScheduleTimes.times, lastDayScheduleTimes.date);
        }
    });
    // ===============================================================
    // ФУНКЦІЇ LOCAL STORAGE: ФІЛЬТРИ
    // ===============================================================

    function saveFiltersToLocalStorage() {
        const fName = facultyDisplay?.dataset.key ? facultyDisplay.textContent : null;
        const eName = educationFormDisplay?.dataset.key ? educationFormDisplay.textContent : null;
        const cName = courseDisplay?.dataset.key ? courseDisplay.textContent : null;

        const filtersState = {
            facultyID: currentFacultyID,
            educationFormID: currentEducationFormID,
            courseID: currentCourseID,
            groupID: currentGroupID,
            groupName: currentGroupName,
            facultyName: fName, 
            educationFormName: eName,
            courseName: cName,
        };
        try {
            if (currentGroupID) {
                localStorage.setItem('scheduleFiltersState', JSON.stringify(filtersState));
            } else {
                localStorage.removeItem('scheduleFiltersState');
            }
        } catch (e) {
            console.error("Помилка при збереженні фільтрів у LocalStorage", e);
        }
    }

    function loadFiltersFromLocalStorage() {
        try {
            const storedState = localStorage.getItem('scheduleFiltersState');
            if (storedState) {
                const state = JSON.parse(storedState);
                currentFacultyID = state.facultyID || null;
                currentEducationFormID = state.educationFormID || null;
                currentCourseID = state.courseID || null;
                currentGroupID = state.groupID || null;
                currentGroupName = state.groupName || 'Група не обрана'; 

                if (currentFacultyID && facultyStack && state.facultyName) {
                    updateFilterDisplay(facultyStack, currentFacultyID, state.facultyName, null, true);
                }
                if (currentEducationFormID && educationFormStack && state.educationFormName) {
                    updateFilterDisplay(educationFormStack, currentEducationFormID, state.educationFormName, null, true);
                }
                if (currentCourseID && courseStack && state.courseName) {
                    updateFilterDisplay(courseStack, currentCourseID, state.courseName, null, true);
                }
                if (currentGroupID && groupStack && state.groupName) {
                    updateFilterDisplay(groupStack, currentGroupID, state.groupName, null, true);
                }

                return true; 
            }
        } catch (e) {
            console.error("Помилка при завантаженні фільтрів з LocalStorage", e);
            localStorage.removeItem('scheduleFiltersState'); 
        }
        return false; 
    }

    // ===============================================================
    // ФУНКЦІЇ LOCAL STORAGE: РОЗКЛАД
    // ===============================================================

    function saveScheduleToLocalStorage() {
        if (!allScheduleData || allScheduleData.length === 0 || !currentGroupID) return;

        const scheduleState = {
            data: allScheduleData,
            startDate: currentLoadedStartDate ? currentLoadedStartDate.toISOString() : null,
            endDate: currentLoadedEndDate ? currentLoadedEndDate.toISOString() : null,
            groupID: currentGroupID,
            groupName: currentGroupName
        };
        try {
            localStorage.setItem('scheduleDataState', JSON.stringify(scheduleState));
            currentLoadedGroupID = currentGroupID;
        } catch (e) {
            console.warn("Помилка при збереженні розкладу у LocalStorage. Може бути перевищено ліміт.", e);
        }
    }

    function loadScheduleFromLocalStorage() {
        try {
            const storedState = localStorage.getItem('scheduleDataState');
            if (storedState) {
                const state = JSON.parse(storedState);

                allScheduleData = state.data || [];
                currentLoadedStartDate = state.startDate ? new Date(state.startDate) : null;
                currentLoadedEndDate = state.endDate ? new Date(state.endDate) : null;
                currentLoadedGroupID = state.groupID || null;

                if (currentLoadedGroupID && currentLoadedGroupID === currentGroupID && allScheduleData.length > 0) {
                    currentGroupName = state.groupName || currentGroupName;
                    return true;
                }
            }
        } catch (e) {
            console.error("Помилка при завантаженні розкладу з LocalStorage", e);
            localStorage.removeItem('scheduleDataState');
        }
        return false;
    }
    
    // ===============================================================
    // ХЕЛПЕР ДЛЯ АКТИВАЦІЇ В'Ю ПОШУКУ
    // ===============================================================
    function activateSearcherView() {
        const searchView = document.getElementById('search-view');
        const searchNavItem = document.querySelector('.bottom-nav [data-icon="search"]')?.closest('.nav-item');

        document.querySelector('.view.active-view')?.classList.remove('active-view');
        document.querySelector('.nav-item.active-nav')?.classList.remove('active-nav');
        appContainer?.classList.remove('is-schedule');

        searchView?.classList.add('active-view');
        searchNavItem?.classList.add('active-nav');
    }
    
    // ===============================================================
    // JSONP ФУНКЦІЯ 
    // ===============================================================
    function fetchJsonp(method, params = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + Date.now() + Math.random().toString(36).substring(2,9);
            params.aVuzID = VUZ_ID;

            const urlParams = Object.keys(params).map(key => {
                let value = params[key];
                if (typeof value === 'string') {
                    value = `"${value}"`; 
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
    // ===============================================================
    function populateFilterOptions(optionsElement, data, filterName, autoSelectKey = null) {
        if (!optionsElement) return;
        optionsElement.innerHTML = '';
        const stackContainer = optionsElement.closest('.filter-stack-container');

        if (!data || data.length === 0) {
            optionsElement.innerHTML = '<div class="filter-option-item disabled">Дані не знайдено.</div>';
            updateFilterDisplay(stackContainer, null, null, null, false);
            return;
        }

        let autoSelected = false;
        let autoSelectedValue = null; 
        
        data.forEach(item => {
            const key = item.Key ?? item.ID ?? item.StudyGroupID ?? item.Id ?? item.id ?? '';
            const value = item.Value ?? item.Name ?? item.DisplayName ?? item.NameUa ?? '';
            
            const div = document.createElement('div');
            div.className = 'filter-option-item';
            div.textContent = value || '(без назви)';
            div.dataset.key = key;
            div.dataset.value = value;
            div.dataset.filter = filterName;
            
            if (autoSelectKey && String(key) === String(autoSelectKey)) {
                div.classList.add('selected');
                autoSelected = true;
                autoSelectedValue = value; 
            }
            
            optionsElement.appendChild(div);
        });

        if (autoSelected) {
            updateFilterDisplay(stackContainer, autoSelectKey, autoSelectedValue, null, true);
            
            if (filterName === 'group' && searchSubmitBtn) {
                searchSubmitBtn.disabled = false;
                groupStack.classList.remove('disabled');
            }
        } else {
            if (autoSelectKey) {
                if (filterName === 'faculty') currentFacultyID = null;
                if (filterName === 'education-form') currentEducationFormID = null;
                if (filterName === 'course') currentCourseID = null;
            }
            updateFilterDisplay(stackContainer, null, null, null, false);
        }
    }

    function updateFilterDisplay(stackElement, key, value, placeholder, isSelected) {
        if (!stackElement) return;
        const display = stackElement.querySelector('.selected-display');
        const hiddenInput = stackElement.querySelector('input[type="hidden"]');
        const expandIcon = stackElement.querySelector('.expand-icon');

        if (isSelected && key && value) {
            display.textContent = value;
            display.dataset.key = key;
            if (hiddenInput) hiddenInput.value = key; 
            stackElement.classList.add('selected');
        } else {
            delete display.dataset.key;
            if (hiddenInput) hiddenInput.value = ''; 
            stackElement.classList.remove('selected');
        }

        stackElement.classList.remove('expanded');
        if (expandIcon) expandIcon.textContent = 'expand_more';
    }

    // ===============================================================
    // ФУНКЦІЇ ДЛЯ ОТРИМАННЯ ДАНИХ З API
    // ===============================================================
    async function loadFilters() {
        if (facultyOptions) facultyOptions.innerHTML = '<div class="filter-option-item disabled">Завантаження...</div>';
        if (educationFormOptions) educationFormOptions.innerHTML = '<div class="filter-option-item disabled">Завантаження...</div>';
        if (courseOptions) courseOptions.innerHTML = '<div class="filter-option-item disabled">Завантаження...</div>';

        try {
            const data = await fetchJsonp('GetStudentScheduleFiltersData', {}); 
            if (!data) throw new Error('Порожня відповідь від GetStudentScheduleFiltersData');

            populateFilterOptions(facultyOptions, data.faculties || [], 'faculty', currentFacultyID);
            populateFilterOptions(educationFormOptions, data.educForms || [], 'education-form', currentEducationFormID);
            populateFilterOptions(courseOptions, data.courses || [], 'course', currentCourseID);

            if (currentFacultyID && currentEducationFormID && currentCourseID) {
                await updateGroups(true); 
            } else {
                groupOptions.innerHTML = '<div class="filter-option-item disabled">Оберіть Факультет, Форму та Курс</div>';
                groupStack.classList.add('disabled');
                updateFilterDisplay(groupStack, null, null, null, false);
            }

        } catch (err) {
            console.error('Помилка при завантаженні фільтрів:', err);
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
            if (res && res.studyGroups) return res.studyGroups;
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

        option.parentNode.querySelectorAll('.filter-option-item.selected').forEach(item => item.classList.remove('selected'));
        option.classList.add('selected'); 

        updateFilterDisplay(stackContainer, key, value, null, true); 
        
        const newFacultyID = (filterName === 'faculty' ? key : currentFacultyID) || null;
        const newEducationFormID = (filterName === 'education-form' ? key : currentEducationFormID) || null;
        const newCourseID = (filterName === 'course' ? key : currentCourseID) || null;

        if (['faculty', 'education-form', 'course'].includes(filterName)) {
            if (newFacultyID !== currentFacultyID || newEducationFormID !== currentEducationFormID || newCourseID !== currentCourseID) {
                 currentGroupID = null; 
                 currentGroupName = 'Група не обрана';
                 updateFilterDisplay(groupStack, null, null, null, false);
                 if (searchSubmitBtn) searchSubmitBtn.disabled = true;
            }
            
            currentFacultyID = newFacultyID;
            currentEducationFormID = newEducationFormID;
            currentCourseID = newCourseID;
            
            await updateGroups(false); 
            saveFiltersToLocalStorage(); 
            return;
        }

        if (filterName === 'group') {
            currentGroupID = key;
            currentGroupName = value;
            if (searchSubmitBtn) searchSubmitBtn.disabled = false;
            
            saveFiltersToLocalStorage(); 
        }
    }

    async function updateGroups(isAutoSelect = false) { 
        const allSelected = currentFacultyID && currentEducationFormID && currentCourseID;

        groupStack.classList.remove('disabled');
        groupOptions.innerHTML = '<div class="filter-option-item disabled">Завантаження груп...</div>';
        if (searchSubmitBtn) searchSubmitBtn.disabled = true;
        
        if (!isAutoSelect) {
            updateFilterDisplay(groupStack, null, null, null, false);
            currentGroupID = null;
            currentGroupName = 'Група не обрана';
        }

        if (!allSelected) {
            groupOptions.innerHTML = '<div class="filter-option-item disabled">Оберіть Факультет, Форму та Курс</div>';
            groupStack.classList.add('disabled');
            return;
        }

        try {
            const groups = await getStudyGroupsFromApi(currentFacultyID, currentEducationFormID, currentCourseID);
            
            if (groups && groups.length > 0) {
                populateFilterOptions(groupOptions, groups, 'group', currentGroupID);
                groupStack.classList.remove('disabled');
                
                if (isAutoSelect && currentGroupID) {
                     if (searchSubmitBtn) searchSubmitBtn.disabled = false;
                }
                
            } else {
                groupOptions.innerHTML = '<div class="filter-option-item disabled">Групи не знайдено.</div>';
                groupStack.classList.add('disabled');
                if (searchSubmitBtn) searchSubmitBtn.disabled = true;
                
                currentGroupID = null;
                currentGroupName = 'Група не обрана';
                saveFiltersToLocalStorage();
            }
        } catch (err) {
            console.error('Помилка при завантаженні груп:', err);
            groupOptions.innerHTML = '<div class="filter-option-item disabled">Помилка завантаження.</div>';
            groupStack.classList.add('disabled');
        }
    }
    
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
	function getScheduleDateRange(referenceDate) {
		const year = referenceDate.getFullYear();
		const month = referenceDate.getMonth();

		const monthStart = new Date(year, month, 1);
		const monthEnd = new Date(year, month + 1, 0);

		const startDate = new Date(monthStart);
		startDate.setDate(monthStart.getDate() - 7); 

		const endDate = new Date(monthEnd);
		endDate.setDate(monthEnd.getDate() + 7); 

		return { startDate, endDate };
	}

    // ===============================================================
    // РЕНДЕР РОЗКЛАДУ 
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

    function formatDateForBellSchedule(date) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        // Додаємо рік, тільки якщо це не поточний рік, щоб не захаращувати інтерфейс
        if (date.getFullYear() !== new Date().getFullYear()) {
             options.year = 'numeric';
        }
        
        // Використовуємо українську локаль для форматування
        const formattedDate = date.toLocaleDateString('uk-UA', options);
        
        // Робимо першу літеру великою
        return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }

    async function renderSchedule(date) {
        currentDisplayDate = date;
        const selectedDateIso = formatDateIso(date);
        updateDaySelector(date); 

        const needsFetch = !currentLoadedStartDate || !currentLoadedEndDate || 
                           date.getTime() < currentLoadedStartDate.getTime() || 
                           date.getTime() > currentLoadedEndDate.getTime() ||
                           currentLoadedGroupID !== currentGroupID; 

        // Змінна, що відстежує, чи відновлено дані з кешу після помилки мережі
        let isCacheRecovery = false;

        // 1. ПЕРЕВІРКА І ЗАВАНТАЖЕННЯ З АРІ АБО LOCAL STORAGE
        if (needsFetch) {
            if (!currentGroupID) {
                activateSearcherView();
                scheduleList.innerHTML = '<p style="text-align:center;color:var(--color-primary);opacity:0.8;padding:40px;">Будь ласка, оберіть групу.</p>';
                return; 
            }

            // Показуємо анімацію завантаження перед запитом
            scheduleList.innerHTML = `<div class="loader-container" id="schedule-loader"><div class="spinner"></div><p class="loader-text">Завантаження розкладу (новий діапазон)...</p></div>`;

			try {
                const newRange = getScheduleDateRange(date);
                
                const apiStartDate = formatDate(newRange.startDate);
                const apiEndDate = formatDate(newRange.endDate);

                const rawData = await fetchJsonp('GetScheduleDataX', {
                    aStudyGroupID: currentGroupID,
                    aStartDate: apiStartDate,
                    aEndDate: apiEndDate,
                    aStudyTypeID: null
                });

                allScheduleData = transformScheduleData(rawData || []);
                currentLoadedStartDate = newRange.startDate; 
                currentLoadedEndDate = newRange.endDate;
                currentLoadedGroupID = currentGroupID; 

                if (allScheduleData.length > 0) {
                    currentGroupName = allScheduleData[0].group || currentGroupName;
                    saveScheduleToLocalStorage(); 
                } else {
                    currentGroupName = 'Група не знайдена';
                }

            } catch (err) {
                console.error('Помилка завантаження розкладу (новий діапазон):', err);
                
                const isLoadedFromLS = loadScheduleFromLocalStorage();
                
                if (!isLoadedFromLS || currentLoadedGroupID !== currentGroupID) {
                    // Критична помилка, немає кешу для цієї групи
                    scheduleList.innerHTML = '<p style="text-align:center;color:red;padding:40px;">Помилка під час завантаження розкладу.</p>';
                    return; 
                } else {
                    // Успішне відновлення з кешу
                    isCacheRecovery = true;
                }
            }
        }

        // 2. РЕНДЕРИНГ
        
        scheduleList.innerHTML = ''; 
        
        const daySchedule = allScheduleData.filter(l => l.date === selectedDateIso).sort((a,b)=> (a.time||'').localeCompare(b.time||''));

        const dayStartTimes = daySchedule.map(l => l.time);
        
        // Форматуємо дату для передачі
        const formattedDate = formatDateForBellSchedule(date); 

        // 1. Кешуємо цей масив та дату
        lastDayScheduleTimes = { times: dayStartTimes, date: formattedDate }; 

        // 2. Якщо time.card.js вже готовий, викликаємо його функцію
        if (typeof window.updateBellScheduleVisibility === 'function') {
            // ТЕПЕР ПЕРЕДАЄМО ОБ'ЄКТ З ЧАСОМ ТА ДАТОЮ
            window.updateBellScheduleVisibility(dayStartTimes, formattedDate);
        }
        
        // *Обробка повідомлень про відновлення з кешу*
        if (isCacheRecovery) {
            if (daySchedule.length > 0) {
                // Випадок 1: Помилка мережі, але розклад для цього дня в кеші є.
                scheduleList.innerHTML = `
                    <p style="text-align:center;color:orange;padding:20px;">
                        Помилка мережі. Показано останній збережений розклад.
                    </p>`;
            } else {
                // Випадок 2: Помилка мережі І розкладу для цього дня в кеші немає.
                // *ВИПРАВЛЕНО: Баг 1* - Залишаємо лише одне, точне повідомлення.
                scheduleList.innerHTML = `
                    <div class="no-schedule-message">
                        <p class="no-schedule-main-text">На жаль, у кеші немає занять на цю дату.</p>
                    </div>`;
                return; // Нічого більше рендерити не потрібно
            }
        }

		if (daySchedule.length === 0) {
            // Стандартне повідомлення, якщо не спрацював isCacheRecovery (тобто, був успішний fetch, але розклад порожній)
            if (scheduleList.innerHTML === '') {
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

        const now = new Date();
        const isToday = isSameDay(date, now);
        const currentMinutesFromMidnight = now.getHours()*60 + now.getMinutes();
        const isPastDayFlag = date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0).getTime();

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

        const cardsHTML = groupedElements.join('');
        
        // Додаємо картки. Якщо scheduleList вже містить попередження, картки додаються після нього.
        scheduleList.innerHTML += cardsHTML;
        
        addStackClickListener();
    }

// ===============================================================
    // Обробник натискання кнопки "Вивести"
    // ===============================================================
    async function handleSearchSubmit() {
        if (!currentGroupID) {
            alert('Будь ласка, оберіть навчальну групу.');
            return;
        }

        saveFiltersToLocalStorage(); 

        const startInputVal = startDateInput?.value;
        const endInputVal = endDateInput?.value;
        let apiStartDate, apiEndDate, rangeStartDate, rangeEndDate;
        let dateToRender; 

        if (startInputVal && endInputVal) {
            apiStartDate = startInputVal.split('-').reverse().join('.');
            apiEndDate = endInputVal.split('-').reverse().join('.');
            rangeStartDate = new Date(startInputVal);
            rangeEndDate = new Date(endInputVal);
            dateToRender = new Date(rangeStartDate); 
        } else {
            dateToRender = new Date(); 
            const newRange = getScheduleDateRange(dateToRender);
            
            apiStartDate = formatDate(newRange.startDate);
            apiEndDate = formatDate(newRange.endDate);
            rangeStartDate = newRange.startDate;
            rangeEndDate = newRange.endDate;
        }

        allScheduleData = [];
        currentLoadedStartDate = null; 
        currentLoadedEndDate = null;
        currentLoadedGroupID = null;
        
        const scheduleView = document.getElementById('schedule-view');
        scheduleList.innerHTML = `
            <div class="loader-container">
                <div class="spinner"></div>
                <p class="loader-text">Завантаження нових даних розкладу...</p>
            </div>`;

        try {
            const rawData = await fetchJsonp('GetScheduleDataX', {
                aStudyGroupID: currentGroupID,
                aStartDate: apiStartDate,
                aEndDate: apiEndDate,
                aStudyTypeID: null
            });

            allScheduleData = transformScheduleData(rawData || []);
            currentLoadedStartDate = rangeStartDate; 
            currentLoadedEndDate = rangeEndDate;
            currentLoadedGroupID = currentGroupID; 
            
             if (allScheduleData.length > 0 && allScheduleData[0].group) {
                currentGroupName = allScheduleData[0].group;
                saveScheduleToLocalStorage(); 
            } else {
                 currentGroupName = 'Група не знайдена';
            }

            currentDisplayDate = new Date(dateToRender); 
            currentCalendarDate = new Date(currentDisplayDate);

            document.querySelector('.view.active-view')?.classList.remove('active-view');
            scheduleView?.classList.add('active-view');
            appContainer?.classList.add('is-schedule');

            document.querySelector('.nav-item.active-nav')?.classList.remove('active-nav');
            document.querySelector('.bottom-nav [data-icon="format_list_bulleted"]')?.closest('.nav-item')?.classList.add('active-nav');

            await renderSchedule(currentDisplayDate);

        } catch (err) {
            console.error('Помилка при виводі розкладу:', err);
            
            const isLoadedFromLS = loadScheduleFromLocalStorage();

            if (!isLoadedFromLS || currentLoadedGroupID !== currentGroupID) {
                // Критична помилка, немає кешу для цієї групи
                scheduleList.innerHTML = '<p class="error-message">Не вдалося завантажити розклад з новими параметрами.</p>';
            } else {
                // Відновлення з кешу. Переходимо до в'ю та викликаємо renderSchedule.
                // renderSchedule самостійно відобразить попередження про мережу.
                currentDisplayDate = new Date(dateToRender); 
                currentCalendarDate = new Date(currentDisplayDate);
                document.querySelector('.view.active-view')?.classList.remove('active-view');
                scheduleView?.classList.add('active-view');
                appContainer?.classList.add('is-schedule');
                await renderSchedule(currentDisplayDate);
            }
        }
    }

    // ===============================================================
    // Календар / нижня навігація 
    // ===============================================================
    function renderCalendar() {
        if (!currentMonthYearElement || !calendarGrid) return;
        currentMonthYearElement.textContent = `${monthNamesUK[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
        calendarGrid.innerHTML = '';

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const correctedFirstDay = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1; 

        for (let i = 0; i < correctedFirstDay; i++) calendarGrid.insertAdjacentHTML('beforeend', '<span class="calendar-day inactive"></span>');
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            let classes = 'calendar-day';
            if (isSameDay(date, currentDisplayDate)) classes += ' selected';
            calendarGrid.insertAdjacentHTML('beforeend', `<span class="${classes}" data-date="${date.toISOString()}">${day}</span>`);
        }
    }

    function setupBottomNavigation() {
        if (!bottomNav || !appContainer) return;

        let initialView = currentGroupID ? 'schedule-view' : 'search-view';

        document.querySelectorAll('.bottom-nav .active-nav').forEach(item => item.classList.remove('active-nav'));
        document.querySelector('.view.active-view')?.classList.remove('active-view');

        const initialActiveNav = bottomNav.querySelector(`[data-icon="${initialView === 'schedule-view' ? 'format_list_bulleted' : 'search'}"]`)?.closest('.nav-item');
        if (initialActiveNav) initialActiveNav.classList.add('active-nav');
        document.getElementById(initialView)?.classList.add('active-view');

        if (initialView === 'schedule-view') {
            appContainer.classList.add('is-schedule');
        } else {
            appContainer.classList.remove('is-schedule');
        }

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
    
    // 1. Завантажуємо фільтри
    loadFiltersFromLocalStorage(); 
    // 2. Завантажуємо останній розклад (якщо є)
    loadScheduleFromLocalStorage();

    // 3. Налаштовуємо навігацію та слухачів
    setupBottomNavigation();
    setupFilterListeners();
    
    // 4. Завантажуємо опції фільтрів з API
    loadFilters(); 
    
    // 5. Запускаємо рендер розкладу, якщо група обрана
    if (currentGroupID) {
        renderSchedule(currentDisplayDate); 
    } else {
        scheduleList.innerHTML = '<p style="text-align:center;color:var(--color-primary);opacity:0.8;padding:40px;">Будь ласка, оберіть групу.</p>';
    }
});
