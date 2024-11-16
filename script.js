document.addEventListener('DOMContentLoaded', () => {
    const fields = document.querySelectorAll('.field input[type="text"], .field select');
    const keyboardKeys = document.querySelectorAll('.key');
    const calculateButton = document.getElementById('calculate_button');
    let activeField = null;

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
        'wind_speed': 99, // предполагается, что максимальное значение для скорости ветра не более 99
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
                if (maxValue !== null && !isNaN(numericValue) && numericValue > maxValue) {
                    return; // Превышено максимальное значение
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

    calculateButton.addEventListener('click', () => {
        const speedUnit = document.getElementById('speed_unit').value.toLowerCase(); // kts или mps
        const toLimitField = document.getElementById('to_limit');
        const ldgLimitField = document.getElementById('ldg_limit');

        const runwayConditionField = document.getElementById('runway_condition');
        const coeffMode = document.getElementById('coeff-mode');
        const frictionCoeffField = document.getElementById('friction_coeff');
        const measureTypeField = document.getElementById('measure_type');

        // Проверяем, какое поле активно: состояние ВПП или коэффициент сцепления
        if (!coeffMode.classList.contains('hidden')) {
            // Берем значение состояния ВПП
            const runwayCondition = runwayConditionField.value.toLowerCase();

            // Получаем ограничения из reportedBrakingActions
            const takeoffLimits = reportedBrakingActions["takeoff"][runwayCondition];
            const landingLimits = reportedBrakingActions["landing"][runwayCondition];

            // Форматируем и выводим значения
            const toLimitValue = speedUnit === "mps" ? takeoffLimits["mps"] : takeoffLimits["kts"];
            const toHalfValue = Math.round((toLimitValue / 2) * 10 - 1) / 10; // Округляем до 1 знака
            toLimitField.value = `${toLimitValue} / ${toHalfValue} ${speedUnit.toUpperCase()}`;

            const ldgLimitValue = speedUnit === "mps" ? landingLimits["mps"] : landingLimits["kts"];
            const ldgHalfValue = Math.round((ldgLimitValue / 2) * 10 - 1) / 10; // Округляем до 1 знака
            ldgLimitField.value = `${ldgLimitValue} / ${ldgHalfValue} ${speedUnit.toUpperCase()}`;
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
            const toLimitValue = speedUnit === "mps" ? takeoffLimit["mps"] : takeoffLimit["kts"];
            const toHalfValue = Math.round((toLimitValue / 2) * 10 - 1) / 10; // Округляем до 1 знака
            toLimitField.value = `${toLimitValue} / ${toHalfValue} ${speedUnit.toUpperCase()}`;

            const ldgLimitValue = speedUnit === "mps" ? landingLimit["mps"] : landingLimit["kts"];
            const ldgHalfValue = Math.round((ldgLimitValue / 2) * 10 - 1) / 10; // Округляем до 1 знака
            ldgLimitField.value = `${ldgLimitValue} / ${ldgHalfValue} ${speedUnit.toUpperCase()}`;
        }
    });

    // Загрузка данных при старте
    loadData();
});