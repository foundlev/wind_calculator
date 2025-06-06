let gesturesEnabled = true; // По умолчанию жесты включены
let selectedLimit = 100;
let selectedMode = 'takeoff'; // По умолчанию режим взлёта

// Функция для предзагрузки изображений
function preloadImages(imageUrls) {
    const promises = [];

    imageUrls.forEach((url) => {
        promises.push(
            new Promise((resolve, reject) => {
                const img = new Image();
                img.src = url;
                img.onload = resolve;
                img.onerror = reject;
            })
        );
    });

    return Promise.all(promises);
}

function formatNumber(num) {
    return String(num).padStart(3, '0');
}

document.addEventListener('DOMContentLoaded', () => {
    // Список изображений для предзагрузки
    const imageUrls = [
        'pics/action_table.png',
        'pics/action_table_dark.png',
        'pics/coeff_table.png',
        'pics/coeff_table_dark.png',
        'pics/info.png',
        'pics/info_dark.png',
    ];

    // Предзагрузка изображений
    preloadImages(imageUrls);
});

document.addEventListener('DOMContentLoaded', () => {
    const fields = document.querySelectorAll('.field input[type="text"], .field select');
    const keyboardKeys = document.querySelectorAll('.key');
    const calculateButton = document.getElementById('calculate_button');
    const windTableButton = document.getElementById('wind_table_button');
    const toLimitField = document.getElementById('to_limit');
    const ldgLimitField = document.getElementById('ldg_limit');
    const longitudinalComponentField = document.getElementById('longitudinal_component');
    const lateralComponentField = document.getElementById('lateral_component');
    const windAdditiveField = document.getElementById('wind_additive');

    const longitudinalComponentLabel = document.getElementById('longitudinal_component_label');
    const lateralComponentLabel = document.getElementById('lateral_component_label');
    const windAdditiveLabel = document.getElementById('wind_additive_label');

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
        'wind_gust': 2,
        'friction_coeff': 2
    };

    // Максимальные значения для полей (если применимо)
    const maxValues = {
        'runway': 36,
        'runway_course': 360,
        'wind_direction': 360,
        'wind_speed': 99,
        'wind_gust': 99,
        'friction_coeff': 99
    };

    // Коэффициенты сцепления.
    const reportedBrakingActions = {
        takeoff: {
            dry: {
                kts: 34,
                mps: 17.5
            },
            good: {
                kts: 25,
                mps: 12.9
            },
            good_to_medium: {
                kts: 22,
                mps: 11.3
            },
            medium: {
                kts: 20,
                mps: 10.3
            },
            medium_to_poor: {
                kts: 15,
                mps: 7.7
            },
            poor: {
                kts: 13,
                mps: 6.7
            }
        },
        landing: {
            dry: {
                kts: 40,
                mps: 20.6
            },
            good: {
                kts: 40,
                mps: 20.6
            },
            good_to_medium: {
                kts: 35,
                mps: 18.0
            },
            medium: {
                kts: 25,
                mps: 12.9
            },
            medium_to_poor: {
                kts: 17,
                mps: 8.7
            },
            poor: {
                kts: 15,
                mps: 7.7
            }
        }
    };
    const coefficientBrakingActions = {
        normative: {
            takeoff: {
                0.5: {
                    kts: 34,
                    mps: 17.5
                },
                0.42: {
                    kts: 25,
                    mps: 12.9
                },
                0.4: {
                    kts: 22,
                    mps: 11.3
                },
                0.37: {
                    kts: 20,
                    mps: 10.3
                },
                0.35: {
                    kts: 15,
                    mps: 7.7
                },
                0.3: {
                    kts: 13,
                    mps: 6.7
                }
            },
            landing: {
                0.5: {
                    kts: 40,
                    mps: 20.6
                },
                0.42: {
                    kts: 40,
                    mps: 20.6
                },
                0.4: {
                    kts: 35,
                    mps: 18.0
                },
                0.37: {
                    kts: 25,
                    mps: 12.9
                },
                0.35: {
                    kts: 17,
                    mps: 8.7
                },
                0.3: {
                    kts: 15,
                    mps: 7.7
                }
            }
        },
        by_sft: {
            takeoff: {
                0.51: {
                    kts: 34,
                    mps: 17.5
                },
                0.4: {
                    kts: 25,
                    mps: 12.9
                },
                0.36: {
                    kts: 22,
                    mps: 11.3
                },
                0.3: {
                    kts: 20,
                    mps: 10.3
                },
                0.26: {
                    kts: 15,
                    mps: 7.7
                },
                0.17: {
                    kts: 13,
                    mps: 6.7
                }
            },
            landing: {
                0.51: {
                    kts: 40,
                    mps: 20.6
                },
                0.4: {
                    kts: 40,
                    mps: 20.6
                },
                0.36: {
                    kts: 35,
                    mps: 18.0
                },
                0.3: {
                    kts: 25,
                    mps: 12.9
                },
                0.26: {
                    kts: 17,
                    mps: 8.7
                },
                0.17: {
                    kts: 15,
                    mps: 7.7
                }
            }
        }
    };

    function updateKeyboardButtons() {
        const keyboardFields = document.querySelectorAll('.keyboard .key-row .key');
        keyboardFields.forEach((field) => {
            if (activeField) {
                field.disabled = false;
            } else {
                field.disabled = true;
            }
        });
    }

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
            'to_limit', 'ldg_limit', 'wind_additive'
        ];
        if (ignoreIds.includes(field.id)) return;

        if (field.tagName.toLowerCase() === 'input') {
            field.addEventListener('click', () => {
                if (activeField) {
                    activeField.classList.remove('selected');
                }
                activeField = field;
                field.classList.add('selected');
                updateKeyboardButtons();
            });
        }

        if (field.tagName.toLowerCase() === 'select') {
            field.addEventListener('click', () => {
                if (activeField) {
                    activeField.classList.remove('selected');
                }
                activeField = field;
                field.classList.add('selected');
                updateKeyboardButtons();
            });
        }

        // Сохранение при изменении select
        if (field.tagName.toLowerCase() === 'select') {
            field.addEventListener('change', () => {
                clearCalculations();
                clearMaxWindItems();
                saveData(field.id, field.value);
            });
            updateKeyboardButtons();
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
            if (activeField.id === "runway") {
                clearMaxWindItems();
            }

            if (key.id === 'clear_key') {
                clearCalculations();
                // Сброс поля
                activeField.value = '0'.repeat(maxLength);
                saveData(fieldId, '0'.repeat(maxLength));
            } else if (key.id === 'backspace_key') {
                clearCalculations();
                // Удаление последнего символа
                currentValue = currentValue.slice(0, -1);
                activeField.value = padValue(currentValue, maxLength);
                saveData(fieldId, activeField.value);
            } else {
                // Ввод цифры
                const digit = keyValue;
                if (!/^\d$/.test(digit)) return; // Только цифры
                clearCalculations();

                if (currentValue.length >= maxLength) {
                    currentValue = currentValue.substring(1);
                }
                currentValue += digit;

                // Проверка максимального значения
                let numericValue = parseInt(currentValue, 10);
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

            if (inputId === 'runway_course') {
                clearMaxWindItems();
            }

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

        longitudinalComponentLabel.textContent = '---';
        lateralComponentLabel.textContent = '---';
        windAdditiveLabel.textContent = '---';

        // Поля для сброса
        const fieldsToClear = [
            document.getElementById('longitudinal_component'),
            document.getElementById('lateral_component'),
            document.getElementById('to_limit'),
            document.getElementById('ldg_limit'),
            document.getElementById('wind_additive')
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

    const limitButtons = document.querySelectorAll('.limit-button');

    limitButtons.forEach(button => {
        button.addEventListener('click', () => {
            clearMaxWindItems();
            // Убираем активный класс у всех кнопок
            limitButtons.forEach(btn => btn.classList.remove('active'));
            // Добавляем активный класс к выбранной кнопке
            button.classList.add('active');

            // Обновляем выбранное значение предела
            selectedLimit = parseInt(button.dataset.limit, 10);
        });
    });

    const modeButtons = document.querySelectorAll('.mode-button');

    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            clearMaxWindItems();
            // Убираем активный класс у всех кнопок
            modeButtons.forEach(btn => btn.classList.remove('active'));
            // Добавляем активный класс к выбранной кнопке
            button.classList.add('active');

            // Обновляем выбранный режим
            selectedMode = button.dataset.mode;
        });
    });

    function clearMaxWindItems() {
        document.getElementById('plane-heading').textContent = '000°';
        document.getElementById('max-wind-value').innerHTML = '<b>00</b> XXX';

        const items = document.querySelectorAll('.wind-angle-item');
        items.forEach(item => {
            if (item.classList.contains('highlight-angle')) {
                item.classList.remove('highlight-angle');
            }

            item.innerHTML = `000° <i class="fa-solid fa-arrow-right"></i> 00 XXX`;
            item.innerHTML = `<b>000°</b><span class="simAngle">/000°</span> <i class="fa-solid fa-arrow-right"></i> <b>00</b> XXX`;
        });
    }

    calculateButton.addEventListener('click', () => {
        const speedUnit = document.getElementById('speed_unit').value.toLowerCase(); // kts или mps

        const runwayConditionField = document.getElementById('runway_condition');
        const coeffMode = document.getElementById('coeff-mode');
        const frictionCoeffField = document.getElementById('friction_coeff');
        const measureTypeField = document.getElementById('measure_type');

        if (activeField) {
            activeField.classList.remove('selected');
            activeField = null;
        }
        updateKeyboardButtons();

        let toFullLimit = null;
        let to80Limit = null;
        let toHalfLimit = null;

        let ldgFullLimit = null;
        let ldg80Limit = null;
        let ldgHalfLimit = null;

        let conditionsDict = {};

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

            conditionsDict = {
                runwayConditionType: "RBA",
                runwayCondition: runwayCondition,
                toLimit: toFullLimit,
                ldgLimit: ldgFullLimit,
                speedUnit: speedUnit
            }
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
                return {
                    kts: 0,
                    mps: 0
                }; // Если коэффициент меньше минимального
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

            conditionsDict = {
                runwayConditionType: "FRC",
                frictionCoeff: frictionCoeff,
                measureType: measureType,
                toLimit: toFullLimit,
                ldgLimit: ldgFullLimit,
                speedUnit: speedUnit
            }
        }

        const runwayCourse = parseFloat(document.getElementById('runway_course').value) || 0; // Курс ВПП в градусах
        const windDirection = parseFloat(document.getElementById('wind_direction').value) || 0; // Направление ветра в градусах
        const windSpeed = parseFloat(document.getElementById('wind_speed').value) || 0; // Скорость ветра
        const windGust = parseFloat(document.getElementById('wind_gust').value) || 0; // Порывы ветра

        let calcWind = windGust;

        // Если порывы меньше скорости ветра, исправляем их.
        if (windGust < windSpeed) {
            document.getElementById('wind_gust').value = '00';
            localStorage.removeItem('wind_gust');
            calcWind = windSpeed;
        }

        // Рассчитываем углы
        const windAngle = ((windDirection - runwayCourse + 360) % 360) * (Math.PI / 180); // В радианах

        // Продольная составляющая
        const longitudinalComponent = Math.round(calcWind * Math.cos(windAngle) * 10) / 10; // Округляем до 1 знака
        let longitudinalText = longitudinalComponent > 0 ?
            `H ${longitudinalComponent} ${speedUnit.toUpperCase()}` :
            longitudinalComponent < 0 ?
            `T ${Math.abs(longitudinalComponent)} ${speedUnit.toUpperCase()}` :
            "0";

        // Постоянная продольная составляющая
        let longitudinalComponentSpeed = Math.round(windSpeed * Math.cos(windAngle) * 10) / 10; // Округляем до 1 знака
        longitudinalComponentLabel.textContent = longitudinalComponentSpeed > 0 ?
            `Steady: ${longitudinalComponentSpeed} ${speedUnit.toUpperCase()}` :
            longitudinalComponent < 0 ?
            `Steady: ${Math.abs(longitudinalComponentSpeed)} ${speedUnit.toUpperCase()}` :
            "Steady: 0";

        let windAdditive = 0;
        let gustAdditive = 0;

        // Если ветер встречный
        if (longitudinalComponent >= 0) {
            if (windGust > windSpeed) {
                gustAdditive = windGust - windSpeed;
            }
        }

        if (speedUnit === "mps") {
            windAdditive = (longitudinalComponentSpeed / 2 + gustAdditive) * 1.94;
        } else {
            windAdditive = longitudinalComponentSpeed / 2 + gustAdditive;
        }

        if (windAdditive < 7) {
            windAdditive = 7;
        } else if (windAdditive > 15) {
            windAdditive = 15;
        }

        windAdditiveField.value = '+ ' + windAdditive.toFixed(0) + ' KTS';

        let windAdditiveSpeed = 0;

        if (speedUnit === "mps") {
            windAdditiveSpeed = (longitudinalComponentSpeed / 2) * 1.94;
        } else {
            windAdditiveSpeed = longitudinalComponentSpeed / 2;
        }

        if (windAdditiveSpeed < 7) {
            windAdditiveSpeed = 7;
        } else if (windAdditiveSpeed > 15) {
            windAdditiveSpeed = 15;
        }
        windAdditiveLabel.textContent = `Steady: + ${windAdditiveSpeed.toFixed(0)} KTS`;

        // Боковая составляющая
        const lateralComponent = Math.round(calcWind * Math.sin(windAngle) * 10) / 10; // Округляем до 1 знака
        let lateralText = lateralComponent > 0 ?
            `R ${lateralComponent} ${speedUnit.toUpperCase()}` :
            lateralComponent < 0 ?
            `L ${Math.abs(lateralComponent)} ${speedUnit.toUpperCase()}` :
            "0";

        // Постоянная боковая составляющая
        let lateralComponentSpeed = Math.round(windSpeed * Math.sin(windAngle) * 10) / 10; // Округляем до 1 знака
        lateralComponentLabel.textContent = lateralComponentSpeed > 0 ?
            `Steady: ${lateralComponentSpeed} ${speedUnit.toUpperCase()}` :
            lateralComponent < 0 ?
            `Steady: ${Math.abs(lateralComponentSpeed)} ${speedUnit.toUpperCase()}` :
            "Steady: 0";

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

        const toPercentage = Math.round(lateralComponentValue / toFullLimit * 100);
        toLimitLabel.textContent = `Limit T/O (${toPercentage}%)`;

        // Проверяем боковую составляющую против взлетных ограничений
        if (lateralComponentValue >= toHalfLimit && lateralComponentValue < to80Limit) {
            updateFieldClass(toLimitField, 1);
        } else if (lateralComponentValue >= to80Limit && lateralComponentValue < toFullLimit) {
            updateFieldClass(toLimitField, 2);
        } else if (lateralComponentValue >= toFullLimit) {
            updateFieldClass(toLimitField, 3);
        } else {
            updateFieldClass(toLimitField, 0);
        }

        const ldgPercentage = Math.round(lateralComponentValue / ldgFullLimit * 100);
        ldgLimitLabel.textContent = `Limit LDG (${ldgPercentage}%)`;

        // Проверяем боковую составляющую против посадочных ограничений
        if (lateralComponentValue >= ldgHalfLimit && lateralComponentValue < ldg80Limit) {
            updateFieldClass(ldgLimitField, 1);
        } else if (lateralComponentValue >= ldg80Limit && lateralComponentValue < ldgFullLimit) {
            updateFieldClass(ldgLimitField, 2);
        } else if (lateralComponentValue >= ldgFullLimit) {
            updateFieldClass(ldgLimitField, 3);
        } else {
            updateFieldClass(ldgLimitField, 0);
        }

        // Проверяем продольную составляющую
        if (
            (speedUnit === "kts" && longitudinalComponent <= -15) ||
            (speedUnit === "mps" && longitudinalComponent <= -7.72)
        ) {
            longitudinalComponentField.style.backgroundColor = "red";
            longitudinalComponentField.style.color = "white";
        }

        // 1) Очищаем предыдущие данные таблицы
        document.getElementById('plane-heading').textContent = '';
        document.getElementById('wind-left-angles').innerHTML = '';
        document.getElementById('wind-right-angles').innerHTML = '';

        // 2) Считаем курс ВПП, округляем
        let rounded = Math.round(runwayCourse / 10) * 10;
        if (rounded === 360) {
            rounded = 0;
        }
        document.getElementById('plane-heading').textContent = `${formatNumber(rounded)}°`;

        // 3) Берём актуальные ограничения (to_limit / ldg_limit) из полей
        function parseLimit(textVal) {
            if (!textVal || textVal === '---') return 0;
            const parts = textVal.split(' ');
            return parseFloat(parts[0]) || 0;
        }
        // Здесь решите, какой лимит использовать. Допустим берем полный:
        const limits = selectedMode === 'takeoff' ? toFullLimit : ldgFullLimit;
        const chosenLimit = limits * (selectedLimit / 100);

        // 4) Генерируем углы (слева -90°, справа +90°)
        let leftAngles = [];
        for (let angle = rounded - 10; angle >= rounded - 90; angle -= 10) {
            let normAngle = (angle + 360) % 360;
            leftAngles.push(normAngle);
        }
        let rightAngles = [];
        for (let angle = rounded + 10; angle <= rounded + 90; angle += 10) {
            let normAngle = angle % 360;
            rightAngles.push(normAngle);
        }

        // 5) Функция для определения max бокового ветра
        function getMaxWindForAngle(angleDeg) {
            let diff = Math.abs(runwayCourse - angleDeg);
            if (diff > 180) diff = 360 - diff;
            if (diff === 0) return '∞';

            const sinVal = Math.sin(diff * Math.PI / 180);
            if (sinVal === 0) return '∞';

            const resultVal = Math.floor(chosenLimit / sinVal)
            if (resultVal > 99) return 99;

            return resultVal;
        }

        function getSymmetricalAngle(angleDeg, mode = 1) {
            // Центр симметрии
            let center = null;
            let symmetricalAngle = null;

            if (mode === 1) {
                center = rounded + 90; // Симметрия для правой стороны
                symmetricalAngle = (2 * center - angleDeg + 360) % 360;
            } else {
                center = rounded - 90; // Симметрия для левой стороны
                symmetricalAngle = (2 * center - angleDeg + 360) % 360;
            }

            symmetricalAngle = symmetricalAngle < 0 ? symmetricalAngle + 360 : symmetricalAngle;

            return symmetricalAngle;
        }

        function isWithinDegrees(course1, course2, N) {
            // Нормализуем курсы к диапазону от 0 до 360
            course1 = course1 % 360;
            course2 = course2 % 360;

            // Вычисляем разницу между курсами
            let difference = Math.abs(course1 - course2);

            // Учёт циклической природы курсов
            difference = Math.min(difference, 360 - difference);

            // Проверяем, попадает ли разница в диапазон
            return difference <= N;
        }

        // 6) Рисуем списки
        const leftAnglesContainer = document.getElementById('wind-left-angles');
        const rightAnglesContainer = document.getElementById('wind-right-angles');
        const maxWindItem = document.getElementById('max-wind-value');

        const highlightAngleWithin = 20;
        let maxWindValue = 99;

        leftAngles.forEach(a => {
            const div = document.createElement('div');
            div.className = 'wind-angle-item';
            const val = getMaxWindForAngle(a);

            if (val < maxWindValue) {
                maxWindValue = val;
            }

            const symA = getSymmetricalAngle(a, 0)
            div.innerHTML = `<b>${formatNumber(a)}°</b><span class="simAngle">/${formatNumber(symA)}°</span> <i class="fa-solid fa-arrow-right"></i> <b>${val}</b> ${speedUnit.toUpperCase()}`;

            if (isWithinDegrees(windDirection, a, highlightAngleWithin) || isWithinDegrees(windDirection, symA, highlightAngleWithin)) {
                div.classList.add('highlight-angle');
            }

            leftAnglesContainer.appendChild(div);
        });

        rightAngles.forEach(a => {
            const div = document.createElement('div');
            div.className = 'wind-angle-item';
            const val = getMaxWindForAngle(a);

            if (val < maxWindValue) {
                maxWindValue = val;
            }

            const symA = getSymmetricalAngle(a, 1);
            div.innerHTML = `<b>${formatNumber(a)}°</b><span class="simAngle">/${formatNumber(symA)}°</span> <i class="fa-solid fa-arrow-right"></i> <b>${val}</b> ${speedUnit.toUpperCase()}`;

            if (isWithinDegrees(windDirection, a, highlightAngleWithin) || isWithinDegrees(windDirection, symA, highlightAngleWithin)) {
                div.classList.add('highlight-angle');
            }

            rightAnglesContainer.appendChild(div);
        });

        maxWindItem.innerHTML = `<b>${maxWindValue}</b> ${speedUnit.toUpperCase()}`;
    });

    windTableButton.addEventListener('click', () => {
        const windTableResult = document.getElementById('wind-table-result');
        const tableShowbox = document.getElementById('table-showbox');
        const componentSection = document.getElementById('component-section');

        // если сейчас wind-table-result скрыт, значит хотим показать его и скрыть showbox
        if (windTableResult.classList.contains('hidden')) {
            windTableResult.classList.remove('hidden');
            tableShowbox.classList.add('hidden');
            componentSection.classList.add('hidden');
        } else {
            // иначе прячем таблицу и показываем showbox
            windTableResult.classList.add('hidden');
            tableShowbox.classList.remove('hidden');
            componentSection.classList.remove('hidden');
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
        'image1': {
            scale: 1,
            currentX: 0,
            currentY: 0
        },
        'image2': {
            scale: 1,
            currentX: 0,
            currentY: 0
        }
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
        if (!gesturesEnabled) {
            return
        }

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
        if (!gesturesEnabled) {
            return
        }

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
        if (!gesturesEnabled) {
            return
        }
        if (event.touches.length === 0) {
            isDragging = false;
            lastTouchDistance = 0;
        }
    });

    // Обработчик кнопки сброса
    resetButton.addEventListener('click', () => {
        const key = getCurrentImageKey();
        // Сбрасываем положение только для текущей картинки
        imagePositions[key] = {
            scale: 1,
            currentX: 0,
            currentY: 0
        };
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
    const blockButton = document.getElementById('block_button');

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

    // Загружаем состояние при старте
    loadGesturesState();

    // Обновляем изображение при загрузке
    updateImageVisibility();

    // Применяем положение при загрузке страницы
    applyImagePosition();
});

document.addEventListener('DOMContentLoaded', () => {
    // Загрузка информации о версии из info.json
    fetch('info.json')
        .then(response => response.json())
        .then(data => {
            const versionInfo = `Версия: <code>v${data.version}</code><br>Обновлено: <code>${data.updatedDate}</code>`;
            document.getElementById('version-info').innerHTML = versionInfo;
        })
        .catch(error => {
            console.error('Ошибка при загрузке версии:', error);
            document.getElementById('version-info').textContent = 'Не удалось загрузить информацию о версии.';
        });

    // Функциональность модального окна версии
    const infoButton = document.getElementById('info-version');
    const versionModal = document.getElementById('version-modal');
    const closeVersionModal = document.getElementById('close-version-modal');

    infoButton.addEventListener('click', () => {
        versionModal.style.display = 'block';
    });

    closeVersionModal.addEventListener('click', () => {
        versionModal.style.display = 'none';
    });

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (event) => {
        if (event.target == versionModal) {
            versionModal.style.display = 'none';
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Функциональность для кнопки "Обновить"
    const updateButton = document.getElementById('update-modal');

    updateButton.addEventListener('click', () => {
        if (navigator.onLine) {
            // Если есть интернет, обновляем страницу
            location.reload(true); // Параметр 'true' форсирует перезагрузку с сервера
        } else {
            // Если нет интернета, отображаем предупреждение
            showOfflineWarning();
        }
    });

    function showOfflineWarning() {
        // Создаём элемент предупреждения, если его ещё нет
        let offlineWarning = document.getElementById('offline-warning');
        if (!offlineWarning) {
            offlineWarning = document.createElement('div');
            offlineWarning.id = 'offline-warning';
            offlineWarning.className = 'offline-warning';
            offlineWarning.textContent = 'Нет интернет соединения. Пожалуйста, проверьте ваше подключение.';
            document.body.appendChild(offlineWarning);

            // Скрываем предупреждение через несколько секунд
            setTimeout(() => {
                offlineWarning.classList.add('hide');
                // Удаляем элемент после завершения анимации
                offlineWarning.addEventListener('transitionend', () => {
                    offlineWarning.remove();
                });
            }, 3000);
        }
    }
});

function getTimestampInSeconds() {
    return Math.floor(Date.now() / 1000);
}

// Функция для получения массива calculations из localStorage
function getActions() {
    let calculations = localStorage.getItem('actions');
    if (calculations) {
        return JSON.parse(calculations);
    } else {
        return [];
    }
}

// Функция для сохранения массива calculations в localStorage
function saveActions(actions) {
    localStorage.setItem('actions', JSON.stringify(actions));
}

function addAction(newAction) {
    let actions = getActions();
    actions.push(newAction);
    saveActions(actions);
}

// Функция для логирования нажатия кнопки
function logCalculation(runwayCourse, windDirection, windSpeed, windGust, longitudinalComponent, lateralComponent, conditionsDict) {
    const newAction = {
        type: 'calculation',
        data: {
            runwayCourse: runwayCourse,
            windDirection: windDirection,
            windSpeed: windSpeed,
            windGust: windGust,
            longitudinalComponent: longitudinalComponent,
            lateralComponent: lateralComponent,
            conditionsDict: conditionsDict
        },
        time: getTimestampInSeconds()
    };

    addAction(newAction);
}

function generateUID() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    let uid = '';
    for (let i = 0; i < 6; i++) {
        uid += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return uid;
}

// Функция для генерации буквенного 6-ми символьного UID и сохранения в localStorage
function getUID() {
    // Проверяем, сохранен ли уже UID в localStorage
    let uid = localStorage.getItem('uid');
    if (uid) {
        return uid;
    }

    const newUid = generateUID();

    localStorage.setItem('uid', newUid);
    return newUid;
}

function getDeviceInfo() {
    const deviceInfo = {
        // Информация о браузере
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localDate: new Date().toString(),
    };
    return deviceInfo;
}

function sendActionsToServer() {
    // Получаем текущий timestamp
    const currentTimestamp = getTimestampInSeconds();
    // Получаем сохраненный timestamp
    const savedTimestamp = parseInt(localStorage.getItem('last_send_timestamp'));
    // Если прошло меньше 20 минут, то ничего не делаем.
    if (currentTimestamp - savedTimestamp < 1200) {
        return;
    }

    // Сохраняем текущий timestamp в localStorage
    localStorage.setItem('last_send_timestamp', currentTimestamp.toString());

    // Проверяем, есть ли подключение к интернету
    if (navigator.onLine) {
        // Проверяем, существует ли ключ 'actions' в localStorage
        if (localStorage.getItem('actions')) {
            const payload = {
                actions: JSON.parse(localStorage.getItem('actions')),
                deviceInfo: getDeviceInfo(),
                uid: getUID()
            }

            // Отправляем POST-запрос на сервер
            fetch('https://myapihelper.na4u.ru/wind_calc/api.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        // Удаляем ключ 'actions' из localStorage
                        localStorage.removeItem('actions');
                    } else {
                        console.error('Ошибка сервера:', response.statusText);
                    }
                })
                .catch(error => {
                    console.error('Ошибка отправки данных:', error);
                });
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const html = document.documentElement;

    // Функция для установки темы
    function setTheme(mode) {
        if (mode === "dark") {
            html.setAttribute("dark-theme", "true");
        } else {
            html.removeAttribute("dark-theme");
        }
    }

    // Применяем тему автоматически
    function applyAutoTheme() {
        if (darkModeMediaQuery.matches) {
            setTheme("dark");
        } else {
            setTheme("light");
        }
    }

    // Инициализация
    const button = document.getElementById("theme_button");
    const icon = button.querySelector("i");

    // Получаем сохранённое состояние из localStorage
    const savedMode = localStorage.getItem("themeMode") || "auto";

    if (savedMode === "dark") {
        setTheme("dark");
        icon.className = "fas fa-moon";
    } else if (savedMode === "light") {
        setTheme("light");
        icon.className = "fas fa-sun";
    } else {
        applyAutoTheme();
        icon.className = "fas fa-adjust";
    }

    // Обновление темы при изменении системных настроек
    darkModeMediaQuery.addEventListener("change", () => {
        if (icon.classList.contains("fa-adjust")) {
            applyAutoTheme();
        }
    });

    // Обработчик переключения темы
    button.addEventListener("click", () => {
        if (icon.classList.contains("fa-adjust")) {
            setTheme("light");
            icon.className = "fas fa-sun";
            localStorage.setItem("themeMode", "light");
        } else if (icon.classList.contains("fa-sun")) {
            setTheme("dark");
            icon.className = "fas fa-moon";
            localStorage.setItem("themeMode", "dark");
        } else {
            applyAutoTheme();
            icon.className = "fas fa-adjust";
            localStorage.setItem("themeMode", "auto");
        }
    });
});

// Запускаем функцию каждые 5 минут (300,000 миллисекунд)
//setInterval(sendActionsToServer, 300000);

// Запускаем функцию сразу при загрузке страницы
//sendActionsToServer();