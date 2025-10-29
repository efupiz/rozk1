document.addEventListener("DOMContentLoaded", () => {
    // === 1. Ініціалізація та нормалізація ===

    const notificationsView = document.getElementById('notifications-view');
    if (!notificationsView) {
        console.error("Секція #notifications-view не знайдена.");
        return;
    }

    const scheduleWrapper = notificationsView.querySelector('.schedule-wrapper');

    // Елементи керування
    const toggleBellsBtn = document.getElementById('toggle-bells-btn');
    const toggleBellsIcon = toggleBellsBtn ? toggleBellsBtn.querySelector('.material-icons') : null;
    const toggleBellsText = toggleBellsBtn ? toggleBellsBtn.querySelector('span:last-child') : null;
    const currentBellDateEl = document.getElementById('current-bell-date');

    const statusContainerTemplate = notificationsView.querySelector('.status-container')?.cloneNode(true);
    const svgPatternTemplate = notificationsView.querySelector('.svg-pattern')?.cloneNode(true);
    
    notificationsView.querySelector('.status-container')?.remove();
    notificationsView.querySelector('.svg-pattern')?.remove();

    const exampleActiveCard = notificationsView.querySelector('.schedule-card.card-first');
    if (exampleActiveCard) {
        exampleActiveCard.classList.remove('card-first');
        exampleActiveCard.classList.add('card-second');
        exampleActiveCard.querySelector('.time-new')?.classList.remove('time-new');
    }

    const noBellsMessage = document.createElement('p');
    noBellsMessage.className = 'placeholder-text';
    noBellsMessage.textContent = 'Для обраного дня немає розкладу дзвінків.';
    noBellsMessage.style.display = 'none'; 
    if (scheduleWrapper) {
        scheduleWrapper.appendChild(noBellsMessage);
    }

    // === 2. Допоміжні функції ===
    function parseTime(timeStr) {
        if (timeStr && timeStr.trim() === '–') { return null; }
        try {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        } catch (e) { return null; }
    }

    function getStatusLabel(period, currentTimeInMinutes) {
        const PStart = period.overallStart;
        const PEnd = period.overallEnd;
        if (currentTimeInMinutes >= PStart - 5 && currentTimeInMinutes < PStart) { return "Підготовка"; }
        if (currentTimeInMinutes >= PStart && currentTimeInMinutes < PStart + 10) { return "Початок"; }
        if (currentTimeInMinutes >= PEnd - 2 && currentTimeInMinutes < PEnd + 2) { return "Закінчилася"; }
        if (currentTimeInMinutes >= PEnd - 10 && currentTimeInMinutes < PEnd - 2) { return "Закінчується"; }
        for (let i = 0; i < period.timePoints.length - 1; i++) {
            const currentPoint = period.timePoints[i];
            const nextPoint = period.timePoints[i + 1];
            if (currentPoint.type === 'end' && nextPoint.type === 'start') {
                if (currentTimeInMinutes >= currentPoint.time && currentTimeInMinutes < nextPoint.time) {
                    return "Перерва";
                }
            }
        }
        return "Триває";
    }

    // === 3. Збір даних ===

    const allCards = notificationsView.querySelectorAll('.schedule-card');
    const cardPeriods = [];

    allCards.forEach(card => {
        const timeSpans = card.querySelectorAll('.time-start, .time-pouse-start, .time-pouse-end, .time-end');
        if (timeSpans.length === 0) return;
        const mainStartTimeEl = card.querySelector('.time-start');
        const mainStartTimeString = mainStartTimeEl ? mainStartTimeEl.textContent.trim() : null;
        const timePoints = [];
        timeSpans.forEach(span => {
            const time = parseTime(span.textContent);
            if (time !== null) {
                timePoints.push({
                    time: time,
                    element: span,
                    type: span.classList.contains('time-start') || span.classList.contains('time-pouse-end') ? 'start' : 'end' 
                });
            }
        });
        timePoints.sort((a, b) => a.time - b.time);
        if (timePoints.length > 0) {
            cardPeriods.push({
                card: card,
                mainStartTime: mainStartTimeString,
                overallStart: timePoints[0].time,
                overallEnd: timePoints[timePoints.length - 1].time,
                timePoints: timePoints 
            });
        }
    });

    // === 4. Функції DOM ===
    function updatePills(card, statusText, countdownEndTime) {
        const statusContainer = card.querySelector('.status-container'); 
        const timePill = card.querySelector('.status-time-pill');
        const labelPill = card.querySelector('.status-label-pill');
        if (labelPill) labelPill.textContent = statusText;
        if (countdownEndTime !== null) {
            const now = new Date();
            const currentTimeInSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            const countdownEndTimeInSeconds = countdownEndTime * 60;
            const remainingSecondsTotal = countdownEndTimeInSeconds - currentTimeInSeconds;
            if (remainingSecondsTotal > 0) {
                const minutes = Math.floor(remainingSecondsTotal / 60);
                const seconds = remainingSecondsTotal % 60;
                const minutesStr = String(minutes).padStart(2, '0');
                const secondsStr = String(seconds).padStart(2, '0');
                const newTimeHtml = `${minutesStr}<div class="animated-clok">:</div>${secondsStr}`;
                if (timePill && timePill.innerHTML !== newTimeHtml) { timePill.innerHTML = newTimeHtml; }
            } else {
                 if (timePill) timePill.innerHTML = `00<div class="animated-clok">:</div>00`;
            }
        } else {
             if (timePill) timePill.innerHTML = `---<div class="animated-clok">:</div>---`;
        }
        const statusWidths = { "Перерва": "165px", "Підготовка": "185px", "Триває": "150px", "Початок": "162px", "Закінчилася": "190px", "Закінчується": "195px" };
        if (statusContainer && statusWidths[statusText]) { statusContainer.style.minWidth = statusWidths[statusText]; }
    }
    function activateCard(card, statusText, countdownEndTime) {
        if (!card) return;
        card.classList.remove('card-second'); card.classList.add('card-first');
        if (statusContainerTemplate && !card.querySelector('.status-container')) {
            const newStatusContainer = statusContainerTemplate.cloneNode(true); 
            const header = card.querySelector('.card-info-header');
            if (header) { header.appendChild(newStatusContainer); } 
            else { card.querySelector('.card-info')?.appendChild(newStatusContainer); }
        }
        if (svgPatternTemplate && !card.querySelector('.svg-pattern')) {
            const newSvgPattern = svgPatternTemplate.cloneNode(true);
            card.appendChild(newSvgPattern);
        }
        updatePills(card, statusText, countdownEndTime);
    }
    function deactivateCard(card) {
        if (!card) return;
        card.classList.remove('card-first'); card.classList.add('card-second');
        card.querySelectorAll('.time-new').forEach(el => el.classList.remove('time-new'));
        card.querySelector('.status-container')?.remove();
        card.querySelector('.svg-pattern')?.remove();
    }

    // === 5. Головна функція оновлення статусу ===
    function updateScheduleStatus() {
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
        let targetCardPeriod = null;
        targetCardPeriod = cardPeriods.find(p => {
            if (p.card.style.display === 'none') return false; 
            const activeStart = p.overallStart - 5; 
            const activeEnd = p.overallEnd + 2; 
            return currentTimeInMinutes >= activeStart && currentTimeInMinutes < activeEnd;
        });
        if (!targetCardPeriod) {
            const completedPeriods = cardPeriods
                .filter(p => p.card.style.display !== 'none' && currentTimeInMinutes >= p.overallEnd)
                .sort((a, b) => b.overallEnd - a.overallEnd);
            if (completedPeriods.length > 0) {
                targetCardPeriod = completedPeriods[0];
                const indexOfLastCompleted = cardPeriods.indexOf(targetCardPeriod);
                const nextPeriod = cardPeriods[indexOfLastCompleted + 1];
                if (nextPeriod && nextPeriod.card.style.display !== 'none') {
                    const nextPreparationStart = nextPeriod.overallStart - 5; 
                    if (currentTimeInMinutes >= nextPreparationStart) {
                        targetCardPeriod = nextPeriod;
                    }
                }
            }
        }
        const currentlyActiveCard = notificationsView.querySelector('.schedule-card.card-first');
        if (targetCardPeriod) {
            const targetCard = targetCardPeriod.card;
            let statusText = getStatusLabel(targetCardPeriod, currentTimeInMinutes);
            if (currentTimeInMinutes >= targetCardPeriod.overallEnd + 2) {
                 const indexOfCurrent = cardPeriods.indexOf(targetCardPeriod);
                 const nextPeriod = cardPeriods[indexOfCurrent + 1];
                 if (nextPeriod && nextPeriod.card.style.display !== 'none') {
                     const nextPreparationStart = nextPeriod.overallStart - 5;
                     if (currentTimeInMinutes < nextPreparationStart) { statusText = "Перерва"; }
                 }
            }
            let countdownEndTime = null;
            const PStart = targetCardPeriod.overallStart; const PEnd = targetCardPeriod.overallEnd; const timePoints = targetCardPeriod.timePoints;
            if (currentTimeInMinutes >= PStart - 5 && currentTimeInMinutes < PStart) {
                countdownEndTime = PStart;
            } else if (currentTimeInMinutes >= PEnd || statusText === "Перерва") {
                const indexOfCurrent = cardPeriods.indexOf(targetCardPeriod);
                const nextPeriod = cardPeriods[indexOfCurrent + 1];
                if (statusText === "Перерва" && targetCard === currentlyActiveCard) {
                    for (let i = 0; i < timePoints.length - 1; i++) {
                        const currentPoint = timePoints[i]; const nextPoint = timePoints[i + 1];
                        if (currentPoint.type === 'end' && nextPoint.type === 'start') {
                            if (currentTimeInMinutes >= currentPoint.time && currentTimeInMinutes < nextPoint.time) {
                                countdownEndTime = nextPoint.time; break;
                            }
                        }
                    }
                }
                if (countdownEndTime === null && nextPeriod && nextPeriod.card.style.display !== 'none') {
                    countdownEndTime = nextPeriod.overallStart;
                }
            } else if (currentTimeInMinutes >= PStart && currentTimeInMinutes < PEnd) {
                let foundNextTime = null;
                for (const point of timePoints) { if (point.time > currentTimeInMinutes) { foundNextTime = point; break; } }
                if (foundNextTime) { countdownEndTime = foundNextTime.time; } else { countdownEndTime = PEnd; }
            }
            if (!currentlyActiveCard || currentlyActiveCard !== targetCard) {
                if (currentlyActiveCard) { deactivateCard(currentlyActiveCard); }
                activateCard(targetCard, statusText, countdownEndTime);
            } else if (currentlyActiveCard === targetCard) {
                updatePills(targetCard, statusText, countdownEndTime);
            }
            let targetElementToHighlight = null;
            if (statusText === "Закінчилася" || statusText === "Перерва") { 
                targetCard.querySelectorAll('.time-new').forEach(el => el.classList.remove('time-new'));
            } else {
                if (statusText === "Підготовка" || statusText === "Початок") { targetElementToHighlight = targetCardPeriod.timePoints[0].element; } 
                else {
                    for (let i = targetCardPeriod.timePoints.length - 1; i >= 0; i--) {
                        const point = targetCardPeriod.timePoints[i];
                        if (currentTimeInMinutes >= point.time) { targetElementToHighlight = point.element; break; }
                    }
                }
                targetCard.querySelectorAll('.time-new').forEach(el => { if (el !== targetElementToHighlight) { el.classList.remove('time-new'); } });
                if (targetElementToHighlight && !targetElementToHighlight.classList.contains('time-new')) { targetElementToHighlight.classList.add('time-new'); }
            }
        } else {
            if (currentlyActiveCard) { deactivateCard(currentlyActiveCard); }
        }
    }

    // === 6. Запуск: забезпечуємо реальний час ===

    updateScheduleStatus();
    setInterval(updateScheduleStatus, 1000); 

    // === 7. ЛОГІКА ФІЛЬТРАЦІЇ ТА КНОПКИ ===

    // --- Стан фільтрації ---
    let lastReceivedDayTimes = null; 
    let lastReceivedDate = null;
    let isFilteredMode = true;      

    /**
     * Внутрішня функція, яка застосовує фільтрацію на основі поточного стану.
     */
    function applyBellFilter() {
        let visibleTimesSet;
        let visibleCount = 0;

        if (isFilteredMode && lastReceivedDayTimes) {
            // РЕЖИМ ФІЛЬТРАЦІЇ: Використовуємо кешований список часу
            visibleTimesSet = new Set(lastReceivedDayTimes);
        } else {
            // РЕЖИМ "ПОКАЗАТИ ВСІ": Створюємо Set з усього часу
            const allTimes = cardPeriods.map(p => p.mainStartTime);
            visibleTimesSet = new Set(allTimes);
        }

        // Проходимо по всіх зібраних картках
        cardPeriods.forEach(period => {
            if (visibleTimesSet.has(period.mainStartTime)) {
                period.card.style.display = ''; // Показуємо
                visibleCount++;
            } else {
                period.card.style.display = 'none'; // Ховаємо
            }
        });

        // Показуємо або ховаємо повідомлення-заповнювач
        if (noBellsMessage) {
            if (visibleCount === 0 && isFilteredMode) {
                noBellsMessage.style.display = '';
            } else {
                noBellsMessage.style.display = 'none';
            }
        }

        const currentlyActiveCard = notificationsView.querySelector('.schedule-card.card-first');
        if (currentlyActiveCard && currentlyActiveCard.style.display === 'none') {
             deactivateCard(currentlyActiveCard);
        }

        updateScheduleStatus(); 
    }

    /**
     * Отримує дані від script.js, зберігає їх і викликає applyBellFilter.
     * @param {string[]} visibleStartTimes - Масив рядків часу (напр. ["10:10", "12:00"]).
     * @param {string} dateString - Відформатований рядок дати (напр. "Вт, 29 жовт").
     */
    function updateBellVisibility(visibleStartTimes, dateString) {
        // 1. Зберігаємо отриманий список часу та дату
        lastReceivedDayTimes = visibleStartTimes;
        lastReceivedDate = dateString;
        
        // 2. Оновлюємо відображення дати
        if (currentBellDateEl && dateString) {
             currentBellDateEl.textContent = dateString;
        }

        // 3. Застосовуємо фільтр
        applyBellFilter();
    }

    // "Експортуємо" функцію в глобальний об'єкт window
    window.updateBellScheduleVisibility = updateBellVisibility;

    // --- Обробник кнопки ---
    if (toggleBellsBtn) {
        toggleBellsBtn.addEventListener('click', () => {
            // 1. Інвертуємо режим
            isFilteredMode = !isFilteredMode;

            // 2. Оновлюємо кнопку
            if (isFilteredMode) {
                toggleBellsBtn.dataset.mode = 'filtered';
                if (toggleBellsIcon) toggleBellsIcon.textContent = 'visibility_off';
                if (toggleBellsText) toggleBellsText.textContent = 'Показати всі дзвінки';
            } else {
                toggleBellsBtn.dataset.mode = 'all';
                if (toggleBellsIcon) toggleBellsIcon.textContent = 'visibility';
                if (toggleBellsText) toggleBellsText.textContent = 'Тільки за розкладом';
            }

            // 3. Повторно застосовуємо фільтр
            applyBellFilter();
        });
    }

    // Повідомляємо script.js, що ми готові приймати дані
    document.dispatchEvent(new CustomEvent('bellScheduleReady'));
});
