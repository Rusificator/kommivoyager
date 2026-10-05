<?php declare(strict_types=1); ?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0a0c24">
    <title>Коммивояжёр — точный расчёт</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js" defer></script>
    <script src="js/site.js" defer></script>
    <script src="js/script.js" defer></script>
</head>
<body class="site-body">
<header class="site-header">
    <div class="site-header__inner">
        <a class="brand" href="index.php" aria-label="TSP Lab — на главную">
            <span class="brand__mark">●</span><span>TSP Lab</span>
        </a>

        <nav id="siteNav" class="site-nav" aria-label="Основная навигация" data-mobile-nav>
            <a href="index.php">Главная</a>
            <a class="active" href="calculator-exact.php">Точный метод</a>
            <a href="calculator-heuristic.php">Быстрый метод</a>
        </nav>

        <button class="nav-toggle" type="button" aria-label="Открыть меню" aria-controls="siteNav" aria-expanded="false" data-nav-toggle>
            <span></span><span></span><span></span>
        </button>
    </div>
</header>
<div class="nav-backdrop" data-nav-backdrop></div>

<main id="calculatorContainer" class="container calculator-container">
    <header class="calculator-hero">
        <a href="index.php" class="back-link">← На главную</a>
        <h1><span class="title-dot"></span>Коммивояжёр</h1>
        <p class="subtitle">Решение задачи методом ветвей и границ</p>

        <div class="task-tabs" role="tablist" aria-label="Тип задачи">
            <button id="tourTabBtn" class="task-tab active" type="button" role="tab" aria-selected="true" aria-controls="tourWorkspace" data-task-tab="tour">Замкнутый тур</button>
            <button id="pathTabBtn" class="task-tab" type="button" role="tab" aria-selected="false" aria-controls="pathWorkspace" data-task-tab="path">Путь между городами</button>
        </div>
    </header>

    <section id="pathConfig" class="path-config hidden" aria-label="Выбор начального и конечного города">
        <div class="path-config__heading">
            <h2>Выберите города</h2>
            <p class="hint">Маршрут пройдёт через каждый город ровно один раз: от выбранного A до выбранного B.</p>
        </div>
        <div class="city-picker-row">
            <div class="city-picker" data-city-picker="start">
                <label for="startCityTrigger">Город A</label>
                <button id="startCityTrigger" class="city-picker__trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
                    <span class="city-picker__value">Город 1</span><span class="city-picker__chevron">⌄</span>
                </button>
                <div class="city-picker__menu hidden" role="listbox" aria-label="Начальный город"></div>
                <input id="startCity" type="hidden" value="0">
            </div>

            <div class="city-picker" data-city-picker="end">
                <label for="endCityTrigger">Город B</label>
                <button id="endCityTrigger" class="city-picker__trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
                    <span class="city-picker__value">Город 3</span><span class="city-picker__chevron">⌄</span>
                </button>
                <div class="city-picker__menu hidden" role="listbox" aria-label="Конечный город"></div>
                <input id="endCity" type="hidden" value="2">
            </div>
        </div>
    </section>

    <section class="controls calculator-controls">
        <div class="dimension-control">
            <label for="n">Количество городов</label>
            <div class="number-stepper" aria-label="Количество городов от 3 до 15">
                <div id="nDisplay" class="number-stepper__value" aria-live="polite">3</div>
                <div class="number-stepper__buttons">
                    <button id="nUpBtn" type="button" aria-label="Увеличить количество городов">▲</button>
                    <button id="nDownBtn" type="button" aria-label="Уменьшить количество городов">▼</button>
                </div>
                <input type="number" id="n" min="3" max="15" value="3" aria-label="Количество городов">
            </div>
        </div>

        <div class="control-actions">
            <button id="randomBtn" type="button">Случайная матрица</button>
            <button id="resetBtn" type="button" class="btn-danger-soft">Сбросить значения</button>
            <button id="solveBtn" type="button" class="btn-primary task-solve-btn">Решить тур</button>
            <button id="solvePathBtn" type="button" class="btn-primary task-solve-btn hidden">Найти путь</button>
        </div>
    </section>

    <section id="matrix-section" class="matrix-section">
        <div class="section-title-row">
            <h2>Матрица расстояний</h2>
            <span id="matrixSizeBadge" class="size-badge">3 × 3</span>
        </div>
        <p class="hint">Значения автоматически сохраняются на этом устройстве. При уменьшении N скрытые строки и столбцы не удаляются.</p>
        <p class="matrix-swipe-hint">↔ На больших матрицах проведите по таблице влево или вправо.</p>
        <div id="matrix-container" class="matrix-scroll" tabindex="0" aria-label="Матрица расстояний"></div>
    </section>

    <div id="tourWorkspace" class="task-workspace" role="tabpanel" aria-labelledby="tourTabBtn">
        <section id="result-section" class="result-section hidden">
            <h2 id="tourResultAnchor">Результат обхода</h2>
            <section id="tourStopwatch" class="stopwatch hidden" aria-live="polite">
                <span class="stopwatch__icon">◷</span>
                <span>Время поиска тура:</span>
                <strong id="tourStopwatchValue">0.0 сек</strong>
            </section>
            <div id="result"></div>
        </section>

        <section id="graph-section" class="graph-section">
            <div class="section-title-row graph-title-row">
                <div>
                    <h2 id="mainGraphTitle">Весь граф</h2>
                    <p class="hint">Перетаскивайте узлы, масштабируйте колесом и перемещайте поле мышью или касанием.</p>
                </div>
            </div>

            <div class="graph-toolbar">
                <button id="viewAllBtn" class="toggle-btn active" type="button">🌐 Весь граф</button>
                <button id="viewOptimalBtn" class="toggle-btn" type="button" disabled>✨ Только оптимальный маршрут</button>
            </div>

            <div class="graph-shell">
                <div id="mainGraphFrame" class="graph-frame">
                    <div class="fullscreen-bar">
                        <button id="mainFullscreenBack" class="fullscreen-back" type="button">← Назад</button>
                        <strong id="mainFullscreenTitle">Весь граф</strong>
                    </div>
                    <button id="mainFindGraphBtn" class="find-graph-btn hidden" type="button">⌖ Найти граф</button>
                    <div id="graph" class="graph-container"></div>
                </div>
                <button id="mainFullscreenBtn" class="fullscreen-launch" type="button">⛶ На весь экран</button>
            </div>
        </section>
    </div>

    <div id="pathWorkspace" class="task-workspace hidden" role="tabpanel" aria-labelledby="pathTabBtn">
        <section id="path-result-section" class="result-section hidden">
            <h2 id="pathResultTitle">Оптимальный маршрут между городами</h2>
            <section id="pathStopwatch" class="stopwatch hidden" aria-live="polite">
                <span class="stopwatch__icon">◷</span>
                <span id="pathStopwatchLabel">Время поиска пути:</span>
                <strong id="pathStopwatchValue">0.0 сек</strong>
            </section>
            <div id="path-result"></div>
        </section>

        <section id="path-graph-section" class="path-graph-section hidden">
            <div class="section-title-row graph-title-row">
                <div>
                    <h2 id="pathGraphTitle">Оптимальный маршрут</h2>
                    <p class="hint">Независимая визуализация только найденного открытого маршрута.</p>
                </div>
            </div>

            <div class="graph-shell">
                <div id="pathGraphFrame" class="graph-frame path-graph-frame">
                    <div class="fullscreen-bar">
                        <button id="pathFullscreenBack" class="fullscreen-back" type="button">← Назад</button>
                        <strong id="pathFullscreenTitle">Оптимальный маршрут</strong>
                    </div>
                    <button id="pathFindGraphBtn" class="find-graph-btn hidden" type="button">⌖ Найти граф</button>
                    <div id="pathGraph" class="graph-container graph-container--path"></div>
                </div>
                <button id="pathFullscreenBtn" class="fullscreen-launch" type="button">⛶ На весь экран</button>
            </div>
        </section>
    </div>
</main>

<div id="resetModal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="resetModalTitle">
    <div class="confirm-modal">
        <div class="confirm-modal__icon">↺</div>
        <h3 id="resetModalTitle">Сбросить все значения в полях?</h3>
        <p>Будут очищены все сохранённые значения матрицы 15×15 на этом устройстве.</p>
        <div class="confirm-modal__actions">
            <button id="confirmResetYes" class="confirm-yes" type="button">Да</button>
            <button id="confirmResetNo" class="confirm-no" type="button">Нет</button>
        </div>
    </div>
</div>

<footer class="site-footer">
    <div class="site-footer__inner">
        <div><strong>🧭 TSP Lab</strong><span>Дискретная оптимизация без фреймворков</span></div>
        <nav aria-label="Навигация в подвале"><a href="index.php">Главная</a><a href="calculator-exact.php">Точный метод</a><a href="calculator-heuristic.php">Быстрый метод</a></nav>
        <span class="footer-note">PHP · JavaScript · vis-network</span>
    </div>
</footer>
</body>
</html>
