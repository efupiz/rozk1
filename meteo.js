// meteo.js - Використовує Open-Meteo Weather API та Nominatim Geocoding (без ключів)

// --- Глобальні змінні для зберігання даних ---
let fullForecastData = null;
let currentCityName = null;

// --- Глобальні змінні стану UI ---
let currentActiveIndex = 0;
let isDetailsViewOpen = false;

// --- КОНСТАНТИ ---
const DEFAULT_CITY = { name: "Кам'янець-Подільський", lat: 48.6833, lon: 26.5833, type: 'default' };

// --- ДОПОМІЖНІ ФУНКЦІЇ ---
// --- НОВА ФУНКЦІЯ: ЗАКРИТТЯ ДЕТАЛЬНОГО ПЕРЕГЛЯДУ ---
/**
 * Закриває детальний перегляд погоди та повертає активну вкладку до компактного вигляду,
 * коли користувач переходить в інший розділ.
 */
function closeWeatherDetails() {
    // Виходимо, якщо детальний перегляд вже закрито
    if (!isDetailsViewOpen) {
        return;
    }

    // 1. Знаходимо активну вкладку, яка має деталі (клас details-open)
    const activeTabWithDetails = document.querySelector('.daily-tab-compact.details-open');
    
    // Елемент детального перегляду
    const detailedDayViewEl = document.getElementById('detailed-day-view'); 
    
    // 2. Приховати детальний вміст
    if (detailedDayViewEl) {
        detailedDayViewEl.classList.add('hidden-details');
    }
    
    // 3. Скидання стану вкладки
    if (activeTabWithDetails) {
        const activeIndex = parseInt(activeTabWithDetails.dataset.index);
        
        // Знімаємо клас, який позначає відкриті деталі
        activeTabWithDetails.classList.remove('details-open');
        
        // Оновлюємо вміст вкладки.
        // renderTabContent(tabElement, index, isButtonActive = false)
        // isButtonActive = false повертає компактний вигляд (іконка/температура).
        if (typeof renderTabContent === 'function' && fullForecastData) {
            renderTabContent(activeTabWithDetails, activeIndex, false); 
        }
    }
    
    // 4. Оновити глобальний стан
    isDetailsViewOpen = false;
}
function getWeatherIconAndText(code, is_day = 1) {
    const isNight = is_day === 0;
    const iconData = { 
        0: { day: "icon-clear-day", night: "icon-clear-night", text: "Ясно" }, 1: { day: "icon-partly-cloudy-day", night: "icon-partly-cloudy-night", text: "Переважно ясно" }, 2: { day: "icon-scattered-clouds-day", night: "icon-scattered-clouds-night", text: "Мінлива хмарність" }, 3: { day: "icon-cloudy", night: "icon-cloudy", text: "Хмарно" }, 45: { day: "icon-fog-day", night: "icon-fog-night", text: "Туман" }, 48: { day: "icon-fog-day", night: "icon-fog-night", text: "Паморозь" }, 51: { day: "icon-drizzle", night: "icon-drizzle", text: "Мряка" }, 53: { day: "icon-drizzle", night: "icon-drizzle", text: "Мряка" }, 55: { day: "icon-drizzle", night: "icon-drizzle", text: "Мряка" }, 61: { day: "icon-light-rain", night: "icon-light-rain", text: "Слабкий дощ" }, 63: { day: "icon-rain", night: "icon-rain", text: "Дощ" }, 65: { day: "icon-heavy-rain", night: "icon-heavy-rain", text: "Сильний дощ" }, 66: { day: "icon-freezing-rain", night: "icon-freezing-rain", text: "Крижаний дощ" }, 67: { day: "icon-freezing-rain", night: "icon-freezing-rain", text: "Крижаний дощ" }, 71: { day: "icon-light-snow", night: "icon-light-snow", text: "Слабкий сніг" }, 73: { day: "icon-snow", night: "icon-snow", text: "Сніг" }, 75: { day: "icon-heavy-snow", night: "icon-heavy-snow", text: "Сильний сніг" }, 77: { day: "icon-snow-grains", night: "icon-snow-grains", text: "Снігові зерна" }, 80: { day: "icon-showers-day", night: "icon-showers-night", text: "Злива" }, 81: { day: "icon-showers-day", night: "icon-showers-night", text: "Злива" }, 82: { day: "icon-heavy-showers", night: "icon-heavy-showers", text: "Сильна злива" }, 85: { day: "icon-snow-showers", night: "icon-snow-showers", text: "Снігопад" }, 86: { day: "icon-snow-showers", night: "icon-snow-showers", text: "Сильний снігопад" }, 95: { day: "icon-thunderstorm", night: "icon-thunderstorm", text: "Гроза" }, 96: { day: "icon-thunderstorm-hail", night: "icon-thunderstorm-hail", text: "Гроза з градом" }, 99: { day: "icon-thunderstorm-hail", night: "icon-thunderstorm-hail", text: "Гроза з градом" },
    };
    const data = iconData[code];
    if (!data) return { icon: "icon-unknown", text: "Невідомо" };
    return { icon: isNight ? data.night : data.day, text: data.text };
}
function getCardinalDirection(angle) {
    const directions = ['Пн', 'Пн-Сх', 'Сх', 'Пд-Сх', 'Пд', 'Пд-Зх', 'Зх', 'Пн-Зх'];
    let index = Math.round((angle % 360) / 45);
    return directions[index % 8];
}
function formatHour(dateString) {
    return new Date(dateString).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}
function formatDay(dateString) {
    return new Date(dateString).toLocaleDateString('uk-UA', { weekday: 'long' });
}
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('uk-UA', { day: '2-digit' });
}
function formatMonth(dateString) {
    return new Date(dateString).toLocaleDateString('uk-UA', { month: 'long' });
}
function getCurrentHourIndex(hourly, current) {
    const currentTime = current ? current.time : hourly.time[0];
    const now = new Date(currentTime);
    const nextHourIndex = hourly.time.findIndex(timeStr => new Date(timeStr) > now); 
    return (nextHourIndex > 0) 
        ? nextHourIndex - 1 
        : (nextHourIndex === -1 ? hourly.time.length - 1 : 0);
}
function scrollToActiveHourlyCard() {
    const hourlyForecastEl = document.getElementById('hourly-forecast');
    const detailedDayViewEl = document.getElementById('detailed-day-view');
    if (isDetailsViewOpen && !detailedDayViewEl.classList.contains('hidden-details')) {
        const activeCard = hourlyForecastEl.querySelector('.hourly-card.active');
        if (activeCard) { 
            requestAnimationFrame(() => {
                activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            });
        }
    }
}
function getTemperatureTrend(hourlyData, dayIndex, currentHourIndex, actualCurrentTemp) {
    const startIndex = dayIndex * 24;
    const endIndex = startIndex + 24;
    const dayTemps = hourlyData.temperature_2m.slice(startIndex, endIndex);
    const dayTimes = hourlyData.time.slice(startIndex, endIndex);

    let maxTemp = -Infinity;
    let maxTime = '00:00';
    let minTemp = Infinity;
    let minTime = '00:00';

    dayTemps.forEach((temp, index) => {
        if (temp > maxTemp) {
            maxTemp = temp;
            maxTime = formatHour(dayTimes[index]);
        }
        if (temp < minTemp) {
            minTemp = temp;
            minTime = formatHour(dayTimes[index]);
        }
    });

    let currentTemp;
    let trend = 'Стабільна';
    let trendClass = 'trend-steady';

    if (dayIndex === 0 && actualCurrentTemp !== undefined) {
        currentTemp = actualCurrentTemp;
        if (currentHourIndex !== -1 && currentHourIndex < hourlyData.temperature_2m.length - 1) {
            const nextTemp = hourlyData.temperature_2m[currentHourIndex + 1];
            if (nextTemp > currentTemp + 0.5) {
                trend = 'Зростає';
                trendClass = 'trend-rising';
            } else if (nextTemp < currentTemp - 0.5) {
                trend = 'Падає';
                trendClass = 'trend-falling';
            }
        }
    } else {
        currentTemp = actualCurrentTemp; 
        trend = 'Прогноз';
        trendClass = 'trend-steady';
    }

    let description = `Протягом доби очікується пік ${Math.round(maxTemp)}°C о ${maxTime}. `;
    description += `Найнижча температура ${Math.round(minTemp)}°C очікується о ${minTime}.`;


    return {
        currentTemp: Math.round(currentTemp),
        trend,
        trendClass,
        maxTemp: Math.round(maxTemp),
        maxTime,
        minTemp: Math.round(minTemp),
        minTime,
        description,
        tempData24h: dayTemps
    };
}


// --- ЛОГІКА ЗБЕРЕЖЕННЯ МІСТ (localStorage) ---
function getSavedCities() {
    try {
        const cities = JSON.parse(localStorage.getItem('savedCities')) || [];
        // Фільтруємо, щоб упевнитися, що стандартне місто не продубльовано
        return cities.filter(city => city.type !== 'default');
    } catch (e) {
        console.error("Помилка завантаження міст з localStorage:", e);
        return [];
    }
}

function saveCities(cities) {
    try {
        localStorage.setItem('savedCities', JSON.stringify(cities));
        // renderSavedCities() тут викликати не можна, бо вона визначена пізніше
        // Виклик renderSavedCities() перенесено у manageSavedCities та removeSavedCity
    } catch (e) {
        console.error("Помилка збереження міст у localStorage:", e);
    }
}

function manageSavedCities(cityData) {
    if (cityData.type === 'default' || cityData.name === "Ваше місцезнаходження") {
        return; 
    }

    const savedCities = getSavedCities();
    
    // Створюємо унікальний ключ для міста (координати + ім'я)
    const key = `${cityData.lat.toFixed(4)},${cityData.lon.toFixed(4)},${cityData.name}`;

    // Перевіряємо, чи місто вже існує
    const exists = savedCities.some(city => 
        `${city.lat.toFixed(4)},${city.lon.toFixed(4)},${city.name}` === key
    );

    if (!exists) {
        savedCities.unshift(cityData);
        // Обмежуємо кількість збережених міст до 5
        const uniqueCities = savedCities.slice(0, 5); 
        saveCities(uniqueCities);
    } else {
        // Якщо місто вже є, переміщуємо його на початок (робить його останнім використаним)
        const index = savedCities.findIndex(city => 
            `${city.lat.toFixed(4)},${city.lon.toFixed(4)},${city.name}` === key
        );
        const [movedCity] = savedCities.splice(index, 1);
        savedCities.unshift(movedCity);
        saveCities(savedCities);
    }
    // Оновлюємо список після збереження
    if (typeof renderSavedCities === 'function') {
        renderSavedCities(); 
    }
}

function removeSavedCity(indexToRemove) {
    const savedCities = getSavedCities();
    savedCities.splice(indexToRemove, 1);
    saveCities(savedCities);
    // Оновлюємо список після видалення
    if (typeof renderSavedCities === 'function') {
        renderSavedCities(); 
    }
}


// --- ОСНОВНА ЛОГІКА ---
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ЕЛЕМЕНТИ ---
    const loadingMsgEl = document.getElementById('loading-weather-msg'); 
    const weatherContainerEl = document.getElementById('weather-container');
    
    const searchOverlayEl = document.getElementById('search-overlay');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const cityInputEl = document.getElementById('city-input');
    const fetchWeatherBtn = document.getElementById('fetch-weather-btn');
    // НОВИЙ ЕЛЕМЕНТ
    const geoLocateBtn = document.getElementById('geo-locate-btn'); 
    
    const dailyTabsContainerEl = document.getElementById('daily-tabs-container'); 
    const detailedDayViewEl = document.getElementById('detailed-day-view'); 
    const hourlyForecastEl = document.getElementById('hourly-forecast');
    const weatherDetailsGridEl = document.getElementById('weather-details-grid');
    
    const savedCitiesListEl = document.getElementById('saved-cities-list');

    const timeEl = document.getElementById('detailed-time'); 
    const dateInfoEl = document.getElementById('detailed-date-info'); 
    const sunriseSunsetEl = document.getElementById('detailed-sunrise-sunset');
    const iconEl = document.getElementById('detailed-icon');
    const tempEl = document.getElementById('detailed-temp');
    const conditionEl = document.getElementById('detailed-condition'); 
    
    // --- ОБРОБНИКИ ПОДІЙ ---
    
    if (fetchWeatherBtn) {
        fetchWeatherBtn.addEventListener('click', () => {
            fetchWeatherByCityName(cityInputEl.value);
            toggleSearchOverlay(false);
        });
    }
    
    // НОВИЙ ОБРОБНИК: Виклик геолокації по кнопці
    if (geoLocateBtn) {
        geoLocateBtn.addEventListener('click', () => {
             fetchGeolocation();
        });
    }
    
    if (cityInputEl) {
        cityInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchWeatherByCityName(cityInputEl.value);
                toggleSearchOverlay(false);
            }
        });
    }

    if (searchToggleBtn) { 
        searchToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSearchOverlay(true);
        });
    }
    
    
    if (searchOverlayEl) {
        searchOverlayEl.addEventListener('click', (e) => {
            if (e.target === searchOverlayEl) {
                toggleSearchOverlay(false);
            }
        });
    }
    
    if (savedCitiesListEl) {
        savedCitiesListEl.addEventListener('click', (e) => {
            const targetCity = e.target.closest('.city-item');
            if (!targetCity) return;
            
            // Якщо натиснуто кнопку видалення
            if (e.target.classList.contains('delete-btn')) {
                const index = parseInt(targetCity.dataset.index);
                removeSavedCity(index);
                return; 
            }

            // Якщо натиснуто на сам елемент міста
            const type = targetCity.dataset.type;
            const index = parseInt(targetCity.dataset.index);

            let cityData = null;
            if (type === 'default') {
                cityData = DEFAULT_CITY;
            } else {
                const savedCities = getSavedCities();
                cityData = savedCities[index];
            }
            
            if (cityData) {
                // Переміщуємо місто на початок списку (якщо воно не 'default')
                manageSavedCities(cityData); 
                loadWeatherFromCoords(cityData.lat, cityData.lon, cityData.name, undefined, cityData.type);
                toggleSearchOverlay(false);
            }
        });
    }


    if (dailyTabsContainerEl) {
        dailyTabsContainerEl.addEventListener('click', handleTabClick);
    }

    // --- ФУНКЦІЇ ЗАВАНТАЖЕННЯ ---
    
    async function initWeatherApp() {
        try {
            if (loadingMsgEl) loadingMsgEl.style.display = 'block';
            if (weatherContainerEl) weatherContainerEl.classList.add('hidden');

            const saved = getSavedCities();
            let cityToLoad = DEFAULT_CITY;

            // Логіка ініціалізації: Завантажуємо останнє збережене місто або стандартне. 
            // Геолокацію *не* викликаємо автоматично.
            if (saved.length > 0) {
                cityToLoad = saved[0];
            } 

            await loadWeatherFromCoords(cityToLoad.lat, cityToLoad.lon, cityToLoad.name, undefined, cityToLoad.type);

        } catch (error) {
             if (loadingMsgEl) loadingMsgEl.textContent = `❌ Критична помилка: ${error.message}.`;
             if (weatherContainerEl) weatherContainerEl.classList.add('hidden');
        }
    }

    // НОВА ФУНКЦІЯ: Обробка натискання кнопки геолокації
    async function fetchGeolocation() {
        if (!navigator.geolocation) {
             alert("Геолокація не підтримується цим браузером.");
             return;
        }

        toggleSearchOverlay(false); // Приховуємо пошук, щоб показати лоадер
        loadingMsgEl.style.display = 'block';
        loadingMsgEl.textContent = `Очікуємо дозвіл на геолокацію...`;
        weatherContainerEl.classList.add('hidden');

        const geoOptions = {
            enableHighAccuracy: true, 
            timeout: 7000,           
            maximumAge: 0            
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const accuracyKm = (position.coords.accuracy / 1000).toFixed(1);
                console.log(`Geolocation Accuracy (approx. +/-): ${accuracyKm} km`);
                
                // Якщо отримали координати, викликаємо функцію для визначення назви та погоди
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude, position.coords.accuracy, 'geo');
            },
            (error) => {
                console.warn(`Помилка геолокації (${error.code}): ${error.message}.`);
                loadingMsgEl.textContent = `❌ Помилка геолокації: Доступ заборонено або неможливо визначити місце.`;
                
                // Повертаємо останнє відоме місто або стандартне після помилки
                initWeatherApp(); 
            },
            geoOptions
        );
    }
    
    // --- Функція для пошуку за НАЗВОЮ МІСТА (Open-Meteo) ---
    async function fetchWeatherByCityName(city) {
        const cityToFetch = city.trim(); 

        if (!cityToFetch) {
            alert("Будь ласка, введіть назву населеного пункту.");
            return;
        }

        loadingMsgEl.style.display = 'block';
        loadingMsgEl.textContent = `Шукаємо координати для: ${cityToFetch}...`;
        weatherContainerEl.classList.add('hidden');

        try {
            const coords = await getCoordinates(cityToFetch);
            // Тип 'manual' для збереження
            await loadWeatherFromCoords(coords.lat, coords.lon, coords.displayName, undefined, 'manual');

        } catch (error) {
            let errorMessage = error.message;
            if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
                errorMessage = "Помилка мережі. Не вдалося з'єднатися з сервером API.";
            } else if (errorMessage.includes("Місто не знайдено")) {
                errorMessage = `Не знайдено координат для "${cityToFetch}".`;
            }
            
            console.error("Помилка при пошуку міста:", error);
            loadingMsgEl.textContent = `❌ Помилка: ${errorMessage}`;
        }
    }
    
    // --- Функція для пошуку за КООРДИНАТАМИ (Nominatim) ---
    async function fetchWeatherByCoords(lat, lon, accuracyMeters, type = 'geo') {
        
        let accuracyText = '';
        if (accuracyMeters !== undefined && accuracyMeters > 500) {
            const accuracyKm = (accuracyMeters / 1000).toFixed(1);
            accuracyText = ` (Точність: ±${accuracyKm} км)`;
        }
        
        loadingMsgEl.style.display = 'block';
        loadingMsgEl.textContent = `Визначаємо ваше місцезнаходження${accuracyText}...`;
        weatherContainerEl.classList.add('hidden');
        
        let cityName = "Ваше місцезнаходження";

        try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&extratags=1&accept-language=uk`;
            
            const geoResponse = await fetch(nominatimUrl, { 
                headers: { 'User-Agent': 'MeteoApp/1.0 (contact@example.com)' } 
            });
            
            if (geoResponse.ok) {
                const geoData = await geoResponse.json();
                const address = geoData.address;

                if (address) {
                    const primaryName = address.city 
                      || address.town 
                      || address.village
                      || address.suburb 
                      || address.hamlet 
                      || address.county 
                      || address.state; 
                    
                    if (primaryName) {
                        cityName = primaryName;
                    } else if (geoData.display_name) {
                        cityName = geoData.display_name.split(',')[0].trim();
                    }
                } 

            } else {
                console.warn(`Помилка реверс-геокодування Nominatim (HTTP ${geoResponse.status}). Використовуємо резервну назву.`);
            }

        } catch (error) {
            console.warn(`Помилка реверс-геокодування (Nominatim): ${error.message}. Використовуємо резервну назву.`);
        
        } finally {
            await loadWeatherFromCoords(lat, lon, cityName, undefined, type);
        }
    }
    
    // --- Центральна функція завантаження погоди та збереження ---
    async function loadWeatherFromCoords(lat, lon, displayName, accuracyMeters, type = 'manual') {
        
        loadingMsgEl.textContent = `Отримуємо прогноз для ${displayName}...`;
        
        // --- Збереження міста (якщо не "Ваше місцезнаходження" і не стандартне) ---
        if (displayName !== "Ваше місцезнаходження" && type !== 'default') {
             manageSavedCities({ name: displayName, lat, lon, type });
        }
        
        // Оновлюємо поле вводу назвою міста
        if (cityInputEl) {
            if (displayName !== "Ваше місцезнаходження") {
                cityInputEl.value = displayName; 
            } else {
                cityInputEl.value = ""; 
            }
        }
        
        const CURRENT_PARAMS = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,pressure_msl,wind_speed_10m,weather_code,cloud_cover,wind_gusts_10m,wind_direction_10m,dew_point_2m,is_day';
        const HOURLY_PARAMS = 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m,pressure_msl,relative_humidity_2m,cloud_cover,wind_gusts_10m,wind_direction_10m,dew_point_2m,apparent_temperature,is_day';
        const DAILY_PARAMS = 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum';

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${CURRENT_PARAMS}&hourly=${HOURLY_PARAMS}&daily=${DAILY_PARAMS}&timezone=Europe%2FKiev&wind_speed_unit=ms&forecast_days=7`;

        try {
            const weatherResponse = await fetch(weatherUrl);
            
            if (!weatherResponse.ok) {
                 throw new Error(`Помилка запиту до API погоди (HTTP ${weatherResponse.status})`);
            }
            
            fullForecastData = await weatherResponse.json();
            
            currentCityName = displayName;
            
            renderDailyTabs(fullForecastData.daily);
            
            currentActiveIndex = 0;
            const initialActiveTab = dailyTabsContainerEl.querySelector(`[data-index="0"]`);
            if (initialActiveTab) {
                initialActiveTab.classList.add('active'); 
                renderTabContent(initialActiveTab, 0, false); 
            }

            renderDetailedView(0); 
            
            detailedDayViewEl.classList.add('hidden-details');
            isDetailsViewOpen = false;
            
            loadingMsgEl.style.display = 'none';
            weatherContainerEl.classList.remove('hidden');

        } catch(error) {
             console.error("Помилка завантаження погоди:", error);
             loadingMsgEl.textContent = `❌ Помилка: ${error.message}`;
             weatherContainerEl.classList.add('hidden');
        }
    }


    // --- ФУНКЦІЯ: ГЕОКОДУВАННЯ (для ручного пошуку - Open-Meteo) ---
    async function getCoordinates(city) {
        let cityToSearch = city.trim();
        let attempts = [];

        const safeCity = cityToSearch.replace(/['`’\-"]/g, ' ').replace(/\s+/g, ' ').trim();
        if (safeCity) {
            attempts.push(safeCity);
        }
        
        if (cityToSearch !== safeCity) {
            attempts.push(cityToSearch);
        }
        
        if (cityToSearch.toLowerCase().includes("кам'янець") || cityToSearch.toLowerCase().includes("kamianets")) {
            attempts.push("Kamianets-Podilskyi");
        }
        
        const uniqueAttempts = [...new Set(attempts.filter(a => a.length > 0))];

        for (const attemptCity of uniqueAttempts) {
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(attemptCity)}&count=1&language=uk`;
            
            try {
                const geoResponse = await fetch(geoUrl);
                
                if (!geoResponse.ok) {
                    console.warn(`Attempt for ${attemptCity} failed with HTTP ${geoResponse.status}`);
                    continue; 
                }
                
                const geoData = await geoResponse.json();

                if (geoData.results && geoData.results.length > 0) {
                    const firstResult = geoData.results[0];
                    const displayName = firstResult.name; 
                    currentCityName = displayName; 
                    return {
                        lat: firstResult.latitude,
                        lon: firstResult.longitude,
                        displayName: displayName 
                    };
                }
            } catch (error) {
                console.warn(`Attempt for ${attemptCity} failed:`, error.message);
            }
        }
        
        throw new Error("Місто не знайдено.");
    }
    
    // --- ЛОГІКА: Управління UI (Пошук, Збережені міста) ---

    function toggleSearchOverlay(show) { 
        if (!searchOverlayEl) return; 
        if (show) {
            renderSavedCities(); 
            searchOverlayEl.classList.remove('hidden');
            setTimeout(() => { if (cityInputEl) cityInputEl.focus(); }, 50);
        } else {
            searchOverlayEl.classList.add('hidden');
        }
    }
    
    // --- ВИПРАВЛЕНО: Функція перенесена всередину DOMContentLoaded ---
    function initSavedCities() {
        renderSavedCities(); 
    }
    // -----------------------------------------------------------------

    function renderSavedCities() {
        if (!savedCitiesListEl) return;

        const savedCities = getSavedCities();
        let html = '';
        
        // 1. Стандартне місто (завжди перше)
        html += `
            <div class="city-item" data-type="default" data-index="-1">
                <div class="city-info">
                    <span class="city-icon">📌</span>
                    <span>${DEFAULT_CITY.name}</span>
                </div>
            </div>
        `;
        
        // 2. Геолокація та вручну додані міста
        savedCities.forEach((city, index) => {
            const icon = city.type === 'geo' ? '🗺️' : '📍';
            const showDelete = city.type !== 'default';
            
            html += `
                <div class="city-item" data-type="${city.type}" data-index="${index}">
                    <div class="city-info">
                        <span class="city-icon">${icon}</span>
                        <span>${city.name}</span>
                    </div>
                    ${showDelete ? '<button class="delete-btn" data-index="'+index+'">×</button>' : ''}
                </div>
            `;
        });

        savedCitiesListEl.innerHTML = html;
    }
    
    // ... (решта функцій UI залишаються без змін) ...

    function handleTabClick(e) { 
        const clickedTab = e.target.closest('.daily-tab-compact');
        if (!clickedTab) return; 
        e.preventDefault();
        
        const clickedIndex = parseInt(clickedTab.dataset.index);

        if (clickedIndex === currentActiveIndex) {
            isDetailsViewOpen = !isDetailsViewOpen;
            toggleDetailsView(isDetailsViewOpen);
            renderTabContent(clickedTab, clickedIndex, isDetailsViewOpen); 
            
            if(isDetailsViewOpen && currentActiveIndex === 0) {
                scrollToActiveHourlyCard(); 
            }

        } else {
            const oldActiveTab = dailyTabsContainerEl.querySelector(`[data-index="${currentActiveIndex}"]`);
            if (oldActiveTab) {
                oldActiveTab.classList.remove('active', 'details-open');
                renderTabContent(oldActiveTab, currentActiveIndex, false); 
            }
            
            currentActiveIndex = clickedIndex;
            clickedTab.classList.add('active');
            
            if (!isDetailsViewOpen) {
                isDetailsViewOpen = true; 
            }
            toggleDetailsView(isDetailsViewOpen); 

            renderTabContent(clickedTab, currentActiveIndex, true); 
            renderDetailedView(currentActiveIndex); 
            
            if (isDetailsViewOpen && currentActiveIndex === 0) {
                 scrollToActiveHourlyCard();
            }
        }
    }

    function toggleDetailsView(show) { 
        const activeTab = dailyTabsContainerEl.querySelector(`[data-index="${currentActiveIndex}"]`);
        if (!activeTab) return;

        if (show) {
            detailedDayViewEl.classList.remove('hidden-details');
            activeTab.classList.add('details-open'); 
        } else {
            detailedDayViewEl.classList.add('hidden-details');
            activeTab.classList.remove('details-open'); 
        }
    }
    
    function renderDailyTabs(daily) { 
        dailyTabsContainerEl.innerHTML = '';
        
        daily.time.forEach((date, index) => {
            const tab = document.createElement('a');
            tab.href = "#";
            tab.dataset.index = index;
            tab.className = 'daily-tab-compact';
            
            renderTabContent(tab, index, false); 
            dailyTabsContainerEl.appendChild(tab);
        });
    }

    function renderTabContent(tabElement, index, isButtonActive) { 
        const { daily, current, hourly } = fullForecastData;
        const dateStr = daily.time[index];
        
        const dayName = (index === 0) ? "Сьогодні" : formatDay(dateStr).substring(0, 3);
        const dateNum = formatDate(dateStr);

        let innerHTML;

        if (isButtonActive) {
            innerHTML = `
                <div class="tab-day">${dayName}</div>
                <div class="tab-date">${dateNum}</div>
                <button class="tab-toggle-button">
                    <span class="arrow-icon"></span>
                </button>
            `;
            if (isDetailsViewOpen) {
                 tabElement.classList.add('details-open');
            } else {
                 tabElement.classList.remove('details-open');
            }
        } else {
            let iconClass, displayTemp, displayMinTemp;
            const currentHourIndex = getCurrentHourIndex(hourly, current);
            
            if (index === 0) {
                let weatherCode = current?.weather_code !== undefined ? current.weather_code : hourly.weather_code[currentHourIndex];
                let isDay = current?.is_day !== undefined ? current.is_day : hourly.is_day[currentHourIndex];
                const { icon: currentIconClass } = getWeatherIconAndText(weatherCode, isDay);
                iconClass = currentIconClass;
                
                let currentTemp = current?.temperature_2m !== undefined ? current.temperature_2m : hourly.temperature_2m[currentHourIndex];
                displayTemp = Math.round(currentTemp);
                
                const precipProb = currentHourIndex !== -1 ? hourly.precipitation_probability[currentHourIndex] : 0;
                displayMinTemp = `<span class="tab-precip-today">${precipProb}%</span>`; 
            } else {
                const { icon: dailyIconClass } = getWeatherIconAndText(daily.weather_code[index], 1);
                iconClass = dailyIconClass;
                displayTemp = Math.round(daily.temperature_2m_max[index]);
                displayMinTemp = `<span class="tab-temp-min">${Math.round(daily.temperature_2m_min[index])}°</span>`;
            }

            innerHTML = `
                <div class="tab-day">${dayName}</div>
                <div class="tab-date">${dateNum}</div>
                <div class="tab-icon weather-icon-small ${iconClass}"></div>
                <div class="tab-temp">
                    <span class="tab-temp-max">${displayTemp}°</span>
                    ${displayMinTemp}
                </div>
            `;
            tabElement.classList.remove('details-open');
        }
        tabElement.innerHTML = innerHTML;
    }


    function renderDetailedView(index) { 
        if (!fullForecastData) return;

        const { daily, hourly, current } = fullForecastData;
        let temp, iconClass, condition;
        let shortCityName = currentCityName.split(',')[0].trim(); 
        let dateInfoText = '';

        const currentHourIndex = getCurrentHourIndex(hourly, current); 

        if (index === 0 && current) {
            const { icon: currentIconClass, text: currentText } = getWeatherIconAndText(current.weather_code, current.is_day);
            temp = current.temperature_2m;
            iconClass = currentIconClass;
            condition = currentText;
            timeEl.textContent = shortCityName; 
            dateInfoText = `Сьогодні, ${formatHour(current.time)}`; 
            conditionEl.textContent = condition; 
        } else {
            const hourIndex = (index * 24) + 12; 
            const { icon: dailyIconClass, text: dailyText } = getWeatherIconAndText(daily.weather_code[index], 1);
            temp = hourly.temperature_2m[hourIndex];
            iconClass = dailyIconClass;
            condition = dailyText;
            timeEl.textContent = shortCityName; 
            dateInfoText = `${formatDay(daily.time[index])}, ${formatDate(daily.time[index])} ${formatMonth(daily.time[index])}`;
            conditionEl.textContent = condition; 
        }
        
        if (dateInfoEl) {
            dateInfoEl.textContent = dateInfoText;
        }

        sunriseSunsetEl.textContent = `Схід: ${formatHour(daily.sunrise[index])}, Захід: ${formatHour(daily.sunset[index])}`;
        iconEl.className = `weather-icon-large ${iconClass}`;
        iconEl.textContent = '';
        tempEl.textContent = `${Math.round(temp)}°`;
        
        renderHourlyForDay(hourly, index, currentHourIndex); 
        renderWeatherDetailsGrid(hourly, index, currentHourIndex);
    }

    function renderHourlyForDay(hourly, dayIndex, currentHourIndex) { 
        hourlyForecastEl.innerHTML = '';
        const startIndex = dayIndex * 24;
        const endIndex = startIndex + 24;

        for (let i = startIndex; i < endIndex; i++) {
            if (i >= hourly.temperature_2m.length) break;
            const { icon: iconClass, text: conditionText } = getWeatherIconAndText(hourly.weather_code[i], hourly.is_day[i]);
            const card = document.createElement('div');
            let cardClasses = 'hourly-card';
            
            if (dayIndex === 0 && i === currentHourIndex) {
                cardClasses += ' active';
            }
            card.className = cardClasses;

            card.innerHTML = `
                <div class="hourly-time">${formatHour(hourly.time[i])}</div>
                <div class="weather-icon-small ${iconClass}"></div>
                <div class="hourly-condition">${conditionText}</div>
                <div class="hourly-temp">${Math.round(hourly.temperature_2m[i])}°</div>
                <div class="hourly-precip">${hourly.precipitation_probability[i]}%</div>
            `;
            hourlyForecastEl.appendChild(card);
        }
    }

    function renderWeatherDetailsGrid(hourly, dayIndex, currentHourIndex) { 
        if (!fullForecastData) return;
        const { daily, current } = fullForecastData;
        let data;
        let actualCurrentTemp; 

        if (dayIndex === 0 && current) {
            data = current;
            actualCurrentTemp = current.temperature_2m; 
        } else {
            const hourIndex = (dayIndex * 24) + 12;
            data = {};
            Object.keys(hourly).forEach(key => {
                if (Array.isArray(hourly[key])) {
                    data[key] = hourly[key][hourIndex];
                }
            });
            data.precipitation = daily.precipitation_sum ? daily.precipitation_sum[dayIndex] : 0;
            actualCurrentTemp = hourly.temperature_2m[hourIndex]; 
        }

        const tempAnalysis = getTemperatureTrend(hourly, dayIndex, currentHourIndex, actualCurrentTemp);
        const feelsLikeValue = Math.round(data.apparent_temperature || 0);
        const windSpeed = (data.wind_speed_10m || 0).toFixed(1);
        const windGusts = (data.wind_gusts_10m || 0).toFixed(1);
        const windDirAngle = data.wind_direction_10m || 0;
        const windDirText = getCardinalDirection(windDirAngle);
        const humidityValue = Math.round(data.relative_humidity_2m || 0);
        const dewPointValue = Math.round(data.dew_point_2m || 0);
        const humidityLevel = humidityValue < 40 ? 'Сухо' : humidityValue > 70 ? 'Волого' : 'Помірно';
        const cloudCoverValue = Math.round(data.cloud_cover || 0);
        const cloudStatus = cloudCoverValue <= 10 ? 'Ясно' : cloudCoverValue <= 40 ? 'Мінлива хмарність' : 'Хмарно';
        const precipSum = (data.precipitation || 0).toFixed(1);
        let precipProb = 0;

        if (dayIndex === 0 && currentHourIndex !== -1) {
            precipProb = hourly.precipitation_probability[currentHourIndex];
        } else if (dayIndex !== 0) {
            precipProb = hourly.precipitation_probability[dayIndex * 24 + 12];
        }
        const precipDesc = (dayIndex === 0 && currentHourIndex !== -1)
            ? `Ймовірність опадів у поточну годину: ${precipProb || 0}%`
            : `Ймовірність опадів: ${precipProb || 0}% (о 12:00)`;

        const pressure_hPa = data.pressure_msl || 0;
        const pressure_mmHg = (pressure_hPa / 1.333).toFixed(0);
        const pressureStatus = pressure_hPa > 1020 ? 'Високий' : pressure_hPa < 1000 ? 'Низький' : 'Нормальний';

        const cards = [
            { content: `<div class="card-title">Температура</div><div class="temp-trend-box" style="padding-top: 10px;"><div class="card-value temp-value">${tempAnalysis.currentTemp}°</div><span class="trend-indicator ${tempAnalysis.trendClass}">${tempAnalysis.trend}</span></div><div class="card-description">Пік: ${tempAnalysis.maxTemp}° о ${tempAnalysis.maxTime}. Нічний мінімум: ${tempAnalysis.minTemp}° о ${tempAnalysis.minTime}.</div>` },
            { content: `<div class="card-title">Відчувається як</div><div class="card-value">${feelsLikeValue}°</div><div class="card-description">${(tempAnalysis.currentTemp - feelsLikeValue > 1) ? 'Відчутно холодніше' : (tempAnalysis.currentTemp - feelsLikeValue < -1) ? 'Відчутно тепліше' : 'Комфортно'}.</div>` },
            { content: `<div class="card-title">Вітер</div><div class="wind-value-box"><div class="wind-icon" style="--wind-direction: ${windDirAngle}deg;">➜</div><span class="card-value">${windSpeed}</span><span style="font-size:1em; color: #555;"> м/с</span></div><div class="card-description">${windDirText} (пориви: ${windGusts} м/с)</div>` },
            { content: `<div class="card-title">Хмарність</div><div class="card-value percentage">${cloudCoverValue}%</div><div class="card-description">${cloudStatus} покриття неба</div>` },
            { content: `<div class="card-title">Вологість</div><div class="card-value percentage">${humidityValue}%</div><div class="card-description">Точка роси: ${dewPointValue}°C (${humidityLevel})</div>` },
            { content: `<div class="card-title">Опади (сума за добу)</div><div class="card-value">${precipSum} мм</div><div class="card-description">${precipDesc}</div>` },
            { content: `<div class="card-title">Тиск</div><div class="card-value">${pressure_mmHg}</div><span style="font-size:1em; color: #555;"> мм рт. ст.</span><div class="card-description">${pressureStatus} (прибл. ${Math.round(pressure_hPa)} гПа)</div>` },
        ];

        weatherDetailsGridEl.innerHTML = cards.map(card =>
            `<div class="detail-card">${card.content}</div>`
        ).join('');
    }
    
    // --- ІНІЦІАЛІЗАЦІЯ ---
    initWeatherApp();
    initSavedCities();
});
