let gesturesEnabled = true; // По умолчанию жесты включены

document.addEventListener('DOMContentLoaded', () => {
    const fields = document.querySelectorAll('.field input[type="text"], .field select');
    const keyboardKeys = document.querySelectorAll('.key');
    const calculateButton = document.getElementById('calculate_button');
    const toLimitField = document.getElementById('to_limit');
    const ldgLimitField = document.getElementById('ldg_limit');
    const longitudinalComponentField = document.getElementById('longitudinal_component');
    const lateralComponentField = document.getElementById('lateral_component');

    const toLimitLabel = document.getElementById('to_limit_label');
    const ldgLimitLabel = document.getElementById('ldg_limit_label');

    let activeField = null;

    const levelClasses = ['level-0', 'level-1', 'level-2', 'level-3'];

    // Поля, на которые можно вводить данные с клавиатуры
    const inputFields = {
        'runway': 2,
        'runway_course': 3,
        'wind_direction': 3,
        'wind_speed': 2,
        'friction_coeff': 2
    };

    // Максимальные значения для полей (если применимо)
    const maxValues = {
        'runway': 36,
        'runway_course': 360,
        'wind_direction': 360,
        'wind_speed': 99,
        'friction_coeff': 99
    };

    // Коэффициенты сцепления.
    const reportedBrakingActions = {
        takeoff: {
            dry: { kts: 34, mps: 17.5 },
            good: { kts: 25, mps: 12.9 },
            good_to_medium: { kts: 22, mps: 11.3 },
            medium: { kts: 20, mps: 10.3 },
            medium_to_poor: { kts: 15, mps: 7.7 },
            poor: { kts: 13, mps: 6.7 }
        },
        landing: {
            dry: { kts: 40, mps: 20.6 },
            good: { kts: 40, mps: 20.6 },
            good_to_medium: { kts: 35, mps: 18.0 },
            medium: { kts: 25, mps: 12.9 },
            medium_to_poor: { kts: 17, mps: 8.7 },
            poor: { kts: 15, mps: 7.7 }
        }
    };
    const coefficientBrakingActions = {
        normative: {
            takeoff: {
                0.5: { kts: 34, mps: 17.5 },
                0.42: { kts: 25, mps: 12.9 },
                0.4: { kts: 22, mps: 11.3 },
                0.37: { kts: 20, mps: 10.3 },
                0.35: { kts: 15, mps: 7.7 },
                0.3: { kts: 13, mps: 6.7 }
            },
            landing: {
                0.5: { kts: 40, mps: 20.6 },
                0.42: { kts: 40, mps: 20.6 },
                0.4: { kts: 35, mps: 18.0 },
                0.37: { kts: 25, mps: 12.9 },
                0.35: { kts: 17, mps: 8.7 },
                0.3: { kts: 15, mps: 7.7 }
            }
        },
        by_sft: {
            takeoff: {
                0.51: { kts: 34, mps: 17.5 },
                0.4: { kts: 25, mps: 12.9 },
                0.36: { kts: 22, mps: 11.3 },
                0.3: { kts: 20, mps: 10.3 },
                0.26: { kts: 15, mps: 7.7 },
                0.17: { kts: 13, mps: 6.7 }
            },
            landing: {
                0.51: { kts: 40, mps: 20.6 },
                0.4: { kts: 40, mps: 20.6 },
                0.36: { kts: 35, mps: 18.0 },
                0.3: { kts: 25, mps: 12.9 },
                0.26: { kts: 17, mps: 8.7 },
                0.17: { kts: 15, mps: 7.7 }
            }
        }
    };

    // Функция для загрузки данных из localStorage
    function loadData() {
        for (const key in inputFields) {
            const storedValue = localStorage.getItem(key);
            if (storedValue !== null) {
                document.getElementById(key).value = padValue(storedValue, inputFields[key]);
            }
        }

        // Загрузка других полей
        const runway_condition = localStorage.getItem('runway_condition');
        if (runway_condition) {
            document.getElementById('runway_condition').value = runway_condition;
        }

        const measure_type = localStorage.getItem('measure_type');
        if (measure_type) {
            document.getElementById('measure_type').value = measure_type;
        }

        const speed_unit = localStorage.getItem('speed_unit');
        if (speed_unit) {
            document.getElementById('speed_unit').value = speed_unit;
        }

        const toggle_state = localStorage.getItem('toggle_state');
        if (toggle_state === 'true') {
            toggleFields(true);
        }
    }

    // Функция для сохранения данных в localStorage
    function saveData(fieldId, value) {
        localStorage.setItem(fieldId, value);
    }

    // Функция для заполнения нулями
    function padValue(value, length) {
        value = value.toString().padStart(length, '0');
        if (value.length > length) {
            value = value.slice(-length);
        }
        return value;
    }

    // Функция для обновления runway_course на основе runway
    function updateRunwayCourse() {
        const runwayInput = document.getElementById('runway');
        const runwayValue = parseInt(runwayInput.value, 10) || 0;
        const runwayCourseValue = Math.round(runwayValue * 10);
        const runwayCourseInput = document.getElementById('runway_course');
        runwayCourseInput.value = padValue(runwayCourseValue, 3);
        saveData('runway_course', runwayCourseInput.value);
    }

    // Выделение выбранного поля
    fields.forEach(field => {
        const ignoreIds = ['runway_course', 'longitudinal_component', 'lateral_component',
                           'to_limit', 'ldg_limit'];
        if (ignoreIds.includes(field.id)) return;

        if (field.tagName.toLowerCase() === 'input') {
            field.addEventListener('click', () => {
                if (activeField) {
                    activeField.classList.remove('selected');
                }
                activeField = field;
                field.classList.add('selected');
            });
        }

        if (field.tagName.toLowerCase() === 'select') {
            field.addEventListener('click', () => {
                if (activeField) {
                    activeField.classList.remove('selected');
                }
                activeField = field;
                field.classList.add('selected');
            });
        }

        // Сохранение при изменении select
        if (field.tagName.toLowerCase() === 'select') {
            field.addEventListener('change', () => {
                clearCalculations();
                saveData(field.id, field.value);
            });
        }
    });

    // Обработка нажатий на клавиши
    keyboardKeys.forEach(key => {
        key.addEventListener('click', () => {
            if (!activeField) return;

            const keyValue = key.textContent.trim();
            const fieldId = activeField.id;
            const maxLength = inputFields[fieldId];
            let maxValue = maxValues[fieldId];
            const notClearCalculationsIds = ['reset_button', 'arrow-up', 'arrow-down', 'block_button', 'help']

            clearCalculations();

            let currentValue = activeField.value.replace(/^0+/, '');

            if (key.id === 'clear_key') {
                // Сброс поля
                activeField.value = '0'.repeat(maxLength);
                saveData(fieldId, '0'.repeat(maxLength));
            } else if (key.id === 'backspace_key') {
                // Удаление последнего символа
                currentValue = currentValue.slice(0, -1);
                activeField.value = padValue(currentValue, maxLength);
                saveData(fieldId, activeField.value);
            } else {
                // Ввод цифры
                const digit = keyValue;
                if (!/^\d$/.test(digit)) return; // Только цифры

                if (currentValue.length >= maxLength) {
                    currentValue = currentValue.substring(1);
                }
                currentValue += digit;

                // Проверка максимального значения
                let numericValue = parseInt(currentValue, 10);
                console.log(currentValue);
                if (maxValue !== null && !isNaN(numericValue) && numericValue > maxValue) {
                    // Заменяем первую цифру на нуль в строке currentValue.
                    currentValue = '0' + currentValue.slice(1);
                }

                activeField.value = padValue(currentValue, maxLength);
                saveData(fieldId, activeField.value);
            }

            if (fieldId === 'runway') {
                updateRunwayCourse();
            }
        });

        // Добавление классов для сенсорных экранов
        key.addEventListener('touchstart', () => {
            key.classList.add('active');
        });

        key.addEventListener('touchend', () => {
            key.classList.remove('active');
        });
    });

    // Переключение между состоянием ВПП и коэф. сцепления
    const toggleButton = document.getElementById('toggle_button');
    const stateField = document.getElementById('runway_condition').parentElement;
    const coefField = document.getElementById('coef_field');
    const measureTypeField = document.getElementById('measure_type_field');

    toggleButton.addEventListener('click', () => {
        clearCalculations();
        const isHidden = stateField.classList.contains('hidden');
        toggleFields(!isHidden); // Передаём противоположное значение
        localStorage.setItem('toggle_state', !isHidden); // Сохраняем новое состояние
    });

    function toggleFields(showFriction) {
        if (showFriction) {
            stateField.classList.add('hidden');
            coefField.classList.remove('hidden');
            measureTypeField.classList.remove('hidden');
        } else {
            stateField.classList.remove('hidden');
            coefField.classList.add('hidden');
            measureTypeField.classList.add('hidden');
        }
    }

    // Обработка кнопок "+" и "-"
    const adjustButtons = document.querySelectorAll('.input-with-buttons .plus, .input-with-buttons .minus');

    adjustButtons.forEach(button => {
        button.addEventListener('click', () => {
            clearCalculations();
            const fieldId = button.getAttribute('data-field');
            const input = document.getElementById(fieldId);
            const inputId = input.id;
            const maxLength = inputFields[fieldId];
            const maxValue = maxValues[fieldId];
            let currentValue = parseInt(input.value, 10) || 0;

            // Список со значениями, на которые изменяется величина
            const deltaValues = {
                'wind_direction': 10
            }
            // Получаем значения по id, по умолчанию 1.
            const deltaValue = deltaValues[inputId] || 1;

            // Определяем по id можно ли делать переход через 0.
            const canGoZero = ['wind_direction', 'runway_course'];
            const canGoZeroField = canGoZero.includes(inputId);

            if (button.classList.contains('plus')) {
                currentValue += deltaValue;
                if (maxValue !== null && currentValue > maxValue) {
                    if (canGoZeroField) {
                        currentValue = 0;
                    } else {
                        currentValue = maxValue;
                    }
                }
            } else {
                currentValue -= deltaValue;
                if (currentValue < 0) {
                    if (canGoZeroField) {
                        currentValue = maxValue;
                    } else {
                        currentValue = 0;
                    }
                }
            }

            input.value = padValue(currentValue, maxLength);
            saveData(fieldId, input.value);
        });
    });

    // Функция для сброса цвета фона
    function resetBackgrounds(...fields) {
        fields.forEach(field => {
            field.classList.remove(...levelClasses);
            field.style.cssText = '';
        });
    }
    // Функция для очистки полей вычислений
    function clearCalculations() {
        resetBackgrounds(toLimitField, ldgLimitField, longitudinalComponentField);

        toLimitLabel.textContent = 'Limit T/O';
        ldgLimitLabel.textContent = 'Limit LDG';

        // Поля для сброса
        const fieldsToClear = [
            document.getElementById('longitudinal_component'),
            document.getElementById('lateral_component'),
            document.getElementById('to_limit'),
            document.getElementById('ldg_limit')
        ];

        // Сбрасываем значения и очищаем стили
        fieldsToClear.forEach(field => {
            field.value = "---";
            field.classList.remove(...levelClasses);
        });
    }

    function updateFieldClass(field, level) {
        field.classList.remove(...levelClasses);
        field.classList.add(`level-${level}`);
    }

    calculateButton.addEventListener('click', () => {
        const speedUnit = document.getElementById('speed_unit').value.toLowerCase(); // kts или mps

        const runwayConditionField = document.getElementById('runway_condition');
        const coeffMode = document.getElementById('coeff-mode');
        const frictionCoeffField = document.getElementById('friction_coeff');
        const measureTypeField = document.getElementById('measure_type');

        let toFullLimit = null;
        let to80Limit = null;
        let toHalfLimit = null;

        let ldgFullLimit = null;
        let ldg80Limit = null;
        let ldgHalfLimit = null;

        // Проверяем, какое поле активно: состояние ВПП или коэффициент сцепления
        if (!coeffMode.classList.contains('hidden')) {
            // Берем значение состояния ВПП
            const runwayCondition = runwayConditionField.value.toLowerCase();

            // Получаем ограничения из reportedBrakingActions
            const takeoffLimits = reportedBrakingActions["takeoff"][runwayCondition];
            const landingLimits = reportedBrakingActions["landing"][runwayCondition];

            // Форматируем и выводим значения
            toFullLimit = speedUnit === "mps" ? takeoffLimits["mps"] : takeoffLimits["kts"];
            to80Limit = Math.round((toFullLimit * 0.8) * 10 - 1) / 10; // Округляем до 1 знака
            toHalfLimit = Math.round((toFullLimit / 2) * 10 - 1) / 10; // Округляем до 1 знака
            toLimitField.value = `${toFullLimit} ${speedUnit.toUpperCase()}`;

            ldgFullLimit = speedUnit === "mps" ? landingLimits["mps"] : landingLimits["kts"];
            ldg80Limit = Math.round((ldgFullLimit * 0.8) * 10 - 1) / 10; // Округляем до 1 знака
            ldgHalfLimit = Math.round((ldgFullLimit / 2) * 10 - 1) / 10; // Округляем до 1 знака
            ldgLimitField.value = `${ldgFullLimit} ${speedUnit.toUpperCase()}`;
        } else if (!frictionCoeffField.classList.contains('hidden')) {
            // Берем коэффициент сцепления и тип измерения
            const frictionCoeff = parseFloat(frictionCoeffField.value) / 100; // Переводим в десятичное число
            const measureType = measureTypeField.value.toLowerCase(); // normative или by_sft

            // Получаем соответствующий ключ коэффициента
            const brakingActions = coefficientBrakingActions[measureType];
            const takeoffKeys = Object.keys(brakingActions["takeoff"]).map(parseFloat).sort((a, b) => b - a);
            const landingKeys = Object.keys(brakingActions["landing"]).map(parseFloat).sort((a, b) => b - a);

            const getLimit = (keys, coeff, limits) => {
                for (const key of keys) {
                    if (coeff >= key) {
                        return limits[key];
                    }
                }
                return { kts: 0, mps: 0 }; // Если коэффициент меньше минимального
            };

            const takeoffLimit = getLimit(takeoffKeys, frictionCoeff, brakingActions["takeoff"]);
            const landingLimit = getLimit(landingKeys, frictionCoeff, brakingActions["landing"]);

            // Форматируем и выводим значения
            toFullLimit = speedUnit === "mps" ? takeoffLimit["mps"] : takeoffLimit["kts"];
            to80Limit = Math.round((toFullLimit * 0.8) * 10 - 1) / 10; // Округляем до 1 знака
            toHalfLimit = Math.round((toFullLimit / 2) * 10 - 1) / 10; // Округляем до 1 знака
            toLimitField.value = `${toFullLimit} ${speedUnit.toUpperCase()}`;

            ldgFullLimit = speedUnit === "mps" ? landingLimit["mps"] : landingLimit["kts"];
            ldg80Limit = Math.round((ldgFullLimit * 0.8) * 10 - 1) / 10; // Округляем до 1 знака
            ldgHalfLimit = Math.round((ldgFullLimit / 2) * 10 - 1) / 10; // Округляем до 1 знака
            ldgLimitField.value = `${ldgFullLimit} ${speedUnit.toUpperCase()}`;
        }

        const runwayCourse = parseFloat(document.getElementById('runway_course').value) || 0; // Курс ВПП в градусах
        const windDirection = parseFloat(document.getElementById('wind_direction').value) || 0; // Направление ветра в градусах
        const windSpeed = parseFloat(document.getElementById('wind_speed').value) || 0; // Скорость ветра

        // Рассчитываем углы
        const windAngle = ((windDirection - runwayCourse + 360) % 360) * (Math.PI / 180); // В радианах

        // Продольная составляющая
        const longitudinalComponent = Math.round(windSpeed * Math.cos(windAngle) * 10) / 10; // Округляем до 1 знака
        let longitudinalText = longitudinalComponent > 0
            ? `HW ${longitudinalComponent} ${speedUnit.toUpperCase()}`
            : longitudinalComponent < 0
            ? `TW ${Math.abs(longitudinalComponent)} ${speedUnit.toUpperCase()}`
            : "0";

        // Боковая составляющая
        const lateralComponent = Math.round(windSpeed * Math.sin(windAngle) * 10) / 10; // Округляем до 1 знака
        let lateralText = lateralComponent > 0
            ? `(R) ${lateralComponent} ${speedUnit.toUpperCase()}`
            : lateralComponent < 0
            ? `(L) ${Math.abs(lateralComponent)} ${speedUnit.toUpperCase()}`
            : "0";

        // Устанавливаем значения
        longitudinalComponentField.value = longitudinalText;
        lateralComponentField.value = lateralText;

        // Сброс цветов фона
        resetBackgrounds(toLimitField, ldgLimitField, longitudinalComponentField);

        // Извлекаем боковую составляющую ветра
        const lateralComponentText = lateralComponentField.value;
        const lateralComponentValue = parseFloat(lateralComponentText.match(/[\d.]+/)) || 0;

        // Получаем ограничения из полей
        const toLimitText = toLimitField.value;
        const ldgLimitText = ldgLimitField.value;

        // Проверяем боковую составляющую против взлетных ограничений
        if (lateralComponentValue >= toHalfLimit && lateralComponentValue < to80Limit) {
            updateFieldClass(toLimitField, 1);
            toLimitLabel.textContent = 'Limit T/O (≥ 50%)';
        } else if (lateralComponentValue >= to80Limit && lateralComponentValue < toFullLimit) {
            updateFieldClass(toLimitField, 2);
            toLimitLabel.textContent = 'Limit T/O (≥ 80%)';
        } else if (lateralComponentValue >= toFullLimit) {
            updateFieldClass(toLimitField, 3);
            toLimitLabel.textContent = 'Limit T/O (≥ 100%)';
        } else {
            updateFieldClass(toLimitField, 0);
            toLimitLabel.textContent = 'Limit T/O';
        }

        // Проверяем боковую составляющую против посадочных ограничений
        if (lateralComponentValue >= ldgHalfLimit && lateralComponentValue < ldg80Limit) {
            updateFieldClass(ldgLimitField, 1);
            ldgLimitLabel.textContent = 'Limit LDG (≥ 50%)';
        } else if (lateralComponentValue >= ldg80Limit && lateralComponentValue < ldgFullLimit) {
            updateFieldClass(ldgLimitField, 2);
            ldgLimitLabel.textContent = 'Limit LDG (≥ 80%)';
        } else if (lateralComponentValue >= ldgFullLimit) {
            updateFieldClass(ldgLimitField, 3);
            ldgLimitLabel.textContent = 'Limit LDG (≥ 100%)';
        } else {
            updateFieldClass(ldgLimitField, 0);
            ldgLimitLabel.textContent = 'Limit LDG';
        }

        // Проверяем продольную составляющую
        if (
            (speedUnit === "kts" && longitudinalComponent <= -15) ||
            (speedUnit === "mps" && longitudinalComponent <= -7.72)
        ) {
            longitudinalComponentField.style.backgroundColor = "red";
            longitudinalComponentField.style.color = "white";
        }
    });

    // Загрузка данных при старте
    loadData();
});

document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.querySelector('.image-container');
    const img = imageContainer.querySelector('img');
    const resetButton = document.getElementById('reset_button');

    const upArrow = document.getElementById('arrow-up');
    const downArrow = document.getElementById('arrow-down');

    const runwayCondition = document.getElementById("runway_condition");
    const imageElement = document.querySelector(".image-container img");

    // Объект для хранения положений изображений
    let imagePositions = {
        'image1': { scale: 1, currentX: 0, currentY: 0 },
        'image2': { scale: 1, currentX: 0, currentY: 0 }
    };

    let scale = 1;
    let currentX = 0;
    let currentY = 0;
    let lastX = 0;
    let lastY = 0;
    let isDragging = false;
    let lastTouchDistance = 0;
    const step = 100; // Шаг перемещения изображения

    // Функция для расчета расстояния между двумя точками
    function getDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Загрузка положений из localStorage
    const savedPositions = localStorage.getItem('imagePositions');
    if (savedPositions) {
        imagePositions = JSON.parse(savedPositions);
    }

    // Функция для сохранения положений в localStorage
    function saveImagePositions() {
        localStorage.setItem('imagePositions', JSON.stringify(imagePositions));
    }

    // Функция для определения текущей картинки
    function getCurrentImageKey() {
        const isImage1 = img.getAttribute('data-condition-visible') === 'true';
        return isImage1 ? 'image1' : 'image2';
    }

    // Функция для применения сохранённого положения к текущему изображению
    function applyImagePosition() {
        const key = getCurrentImageKey();
        const pos = imagePositions[key];
        scale = pos.scale;
        currentX = pos.currentX;
        currentY = pos.currentY;
        img.style.transform = `scale(${scale}) translate(${currentX}px, ${currentY}px)`;
    }

    // Функция для обработки touchmove
    imageContainer.addEventListener('touchmove', (event) => {
        if (!gesturesEnabled) { return }

        if (event.touches.length === 2) {
            // Масштабирование двумя пальцами
            event.preventDefault();
            const distance = getDistance(event.touches);

            if (lastTouchDistance) {
                const delta = distance - lastTouchDistance;
                scale = Math.min(Math.max(scale + delta / 300, 0.5), 5); // Ограничение масштаба
                img.style.transform = `scale(${scale}) translate(${currentX}px, ${currentY}px)`;

                // Сохраняем положение
                const key = getCurrentImageKey();
                imagePositions[key].scale = scale;
                saveImagePositions();
            }

            lastTouchDistance = distance;
        } else if (event.touches.length === 1 && isDragging) {
            // Перетаскивание одним пальцем
            event.preventDefault();
            const touch = event.touches[0];
            const deltaX = touch.clientX - lastX;
            const deltaY = touch.clientY - lastY;

            currentX += deltaX;
            currentY += deltaY;

            lastX = touch.clientX;
            lastY = touch.clientY;

            img.style.transform = `scale(${scale}) translate(${currentX}px, ${currentY}px)`;

            // Сохраняем положение
            const key = getCurrentImageKey();
            imagePositions[key].currentX = currentX;
            imagePositions[key].currentY = currentY;
            saveImagePositions();
        }
    });

    // Функция для обработки touchstart
    imageContainer.addEventListener('touchstart', (event) => {
        if (!gesturesEnabled) { return }

        if (event.touches.length === 1) {
            // Начало перетаскивания
            isDragging = true;
            lastX = event.touches[0].clientX;
            lastY = event.touches[0].clientY;
        } else if (event.touches.length === 2) {
            // Начало масштабирования
            lastTouchDistance = getDistance(event.touches);
        }
    });

    // Функция для обработки touchend
    imageContainer.addEventListener('touchend', (event) => {
        if (!gesturesEnabled) { return }
        if (event.touches.length === 0) {
            isDragging = false;
            lastTouchDistance = 0;
        }
    });

    // Обработчик кнопки сброса
    resetButton.addEventListener('click', () => {
        const key = getCurrentImageKey();
        // Сбрасываем положение только для текущей картинки
        imagePositions[key] = { scale: 1, currentX: 0, currentY: 0 };
        saveImagePositions();

        // Применяем сброшенное положение
        applyImagePosition();
    });

    // Обработчики для стрелок
    downArrow.addEventListener('click', () => {
        currentY -= step;
        img.style.transform = `translateY(${currentY}px)`;

        // Сохраняем положение
        const key = getCurrentImageKey();
        imagePositions[key].currentY = currentY;
        saveImagePositions();
    });

    upArrow.addEventListener('click', () => {
        currentY += step;
        img.style.transform = `translateY(${currentY}px)`;

        // Сохраняем положение
        const key = getCurrentImageKey();
        imagePositions[key].currentY = currentY;
        saveImagePositions();
    });

    const updateImageVisibility = () => {
        const isVisible = !runwayCondition.parentElement.classList.contains("hidden");
        imageElement.setAttribute("data-condition-visible", isVisible);

        // После изменения изображения применяем положение
        applyImagePosition();
    };

    // Слушаем события изменения состояния поля
    const toggleButton = document.getElementById("toggle_button");
    toggleButton.addEventListener("click", updateImageVisibility);

    // Слушаем изменения темы (тёмная/светлая)
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', () => {
            updateImageVisibility();
        });
    } else if (darkModeMediaQuery.addListener) {
        // Для более старых браузеров
        darkModeMediaQuery.addListener(() => {
            updateImageVisibility();
        });
    }

    // Обновляем изображение при загрузке
    updateImageVisibility();

    // Применяем положение при загрузке страницы
    applyImagePosition();
});

document.addEventListener('DOMContentLoaded', () => {
    const blockButton = document.getElementById('block_button');
    const imageContainer = document.querySelector('.image-container');

    // Функция для сохранения состояния в localStorage
    const saveGesturesState = () => {
        localStorage.setItem('gesturesEnabled', gesturesEnabled ? 'true' : 'false');
    };

    // Функция для загрузки состояния из localStorage
    const loadGesturesState = () => {
        const savedState = localStorage.getItem('gesturesEnabled');
        if (savedState !== null) {
            gesturesEnabled = savedState === 'true';
            updateGesturesState(); // Применяем состояние
        }
    };

    // Функция для обновления состояния
    const updateGesturesState = () => {
        blockButton.innerHTML = gesturesEnabled ? '<i class="fas fa-unlock-alt"></i>' : '<i class="fas fa-lock"></i>';
//        imageContainer.style.pointerEvents = gesturesEnabled ? 'auto' : 'none';
    };

    // Событие клика по кнопке
    blockButton.addEventListener('click', () => {
        gesturesEnabled = !gesturesEnabled; // Переключаем состояние
        updateGesturesState(); // Обновляем UI
        saveGesturesState(); // Сохраняем состояние
    });

    // Загружаем состояние при старте
    loadGesturesState();
});

document.addEventListener('DOMContentLoaded', () => {
    // Функциональность кнопки "Помощь"
    const helpButton = document.getElementById('help');
    const helpOverlay = document.getElementById('help-overlay');
    const closeHelpButton = document.getElementById('close-help');

    helpButton.addEventListener('click', () => {
        helpOverlay.style.display = 'flex';
    });

    closeHelpButton.addEventListener('click', () => {
        helpOverlay.style.display = 'none';
    });
});

