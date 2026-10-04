<?php declare(strict_types=1); ?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0a0c24">
    <title>Коммивояжёр — точный расчёт</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
</head>
<body class="site-body">
<header class="site-header">
    <div class="site-header__inner">
        <a class="brand" href="index.php" aria-label="На главную">
            <span class="brand__mark">●</span><span>Коммивояжёр</span>
        </a>
        <nav class="site-nav" aria-label="Основная навигация">
            <a href="index.php">Главная</a>
            <a class="active" href="calculator-exact.php">Точный расчёт</a>
            <a href="calculator-heuristic.php">Быстрый расчёт</a>
        </nav>
        <a class="mobile-home" href="index.php" aria-label="На главную">←</a>
    </div>
</header>

<main id="calculatorContainer" class="container calculator-container">
    <header class="calculator-hero">
        <a href="index.php" class="back-link">← На главную</a>
        <h1><span class="title-dot"></span>Коммивояжёр</h1>
        <p class="subtitle">Решение задачи методом ветвей и границ</p>
    </header>

    <section class="controls calculator-controls">
        <div class="dimension-control">
            <label for="n">Количество городов (3–15)</label>
            <div class="number-stepper" aria-label="Количество городов">
                <div id="nDisplay" class="number-stepper__value">3</div>
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
            <button id="solveBtn" type="button" class="btn-primary">Решить (тур)</button>
        </div>
    </section>

    <section id="stopwatch" class="stopwatch hidden" aria-live="polite">
        <span class="stopwatch__icon">◷</span>
        <span id="stopwatchLabel">Время поиска:</span>
        <strong id="stopwatchValue">0.0 сек</strong>
    </section>

    <section id="matrix-section" class="matrix-section">
        <div class="section-title-row">
            <h2>Матрица расстояний</h2>
            <span id="matrixSizeBadge" class="size-badge">3 × 3</span>
        </div>
        <p class="hint">Значения сохраняются автоматически на этом устройстве. При уменьшении N скрытые строки и столбцы не удаляются.</p>
        <div id="matrix-container" class="matrix-scroll"></div>
    </section>

    <section id="result-section" class="result-section hidden">
        <h2>Результат обхода</h2>
        <div id="result"></div>
    </section>

    <section id="graph-section" class="graph-section">
        <div class="section-title-row graph-title-row">
            <div>
                <h2 id="mainGraphTitle">Весь граф</h2>
                <p class="hint">Перетаскивайте узлы, масштабируйте колесом и перемещайте поле мышью или касанием.</p>
            </div>
            <button id="mainFullscreenBtn" class="icon-action" type="button">⛶ На весь экран</button>
        </div>

        <div class="graph-toolbar">
            <button id="viewAllBtn" class="toggle-btn active" type="button">🌐 Весь граф</button>
            <button id="viewOptimalBtn" class="toggle-btn" type="button" disabled>✨ Только оптимальный маршрут</button>
        </div>

        <div id="mainGraphFrame" class="graph-frame">
            <div class="fullscreen-bar">
                <button id="mainFullscreenBack" class="fullscreen-back" type="button">← Назад</button>
                <strong id="mainFullscreenTitle">Весь граф</strong>
            </div>
            <button id="mainFindGraphBtn" class="find-graph-btn hidden" type="button">⌖ Найти граф</button>
            <div id="graph" class="graph-container"></div>
        </div>
    </section>

    <section id="path-section" class="path-section">
        <h2>🔎 Поиск оптимального пути между двумя городами</h2>
        <p class="hint">Маршрут начинается в выбранном городе, проходит через все остальные ровно один раз и заканчивается в другом выбранном городе.</p>
        <div class="path-controls">
            <div class="control-group">
                <label for="startCity">Начальный город</label>
                <select id="startCity"></select>
            </div>
            <div class="control-group">
                <label for="endCity">Конечный город</label>
                <select id="endCity"></select>
            </div>
            <div class="control-group">
                <button id="solvePathBtn" class="btn-primary" type="button">Найти путь</button>
            </div>
        </div>
        <div id="path-result" class="result-section hidden"></div>

        <section id="path-graph-section" class="path-graph-section hidden">
            <div class="section-title-row graph-title-row">
                <div>
                    <h3 id="pathGraphTitle">Оптимальный маршрут</h3>
                    <p class="hint">Отдельная визуализация найденного открытого маршрута.</p>
                </div>
                <button id="pathFullscreenBtn" class="icon-action" type="button">⛶ На весь экран</button>
            </div>
            <div id="pathGraphFrame" class="graph-frame path-graph-frame">
                <div class="fullscreen-bar">
                    <button id="pathFullscreenBack" class="fullscreen-back" type="button">← Назад</button>
                    <strong id="pathFullscreenTitle">Оптимальный маршрут</strong>
                </div>
                <button id="pathFindGraphBtn" class="find-graph-btn hidden" type="button">⌖ Найти граф</button>
                <div id="pathGraph" class="graph-container graph-container--path"></div>
            </div>
        </section>
    </section>
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
        <nav><a href="index.php">Главная</a><a href="calculator-exact.php">Калькулятор</a></nav>
        <span class="footer-note">PHP · JavaScript · vis-network</span>
    </div>
</footer>

<script src="js/script.js"></script>
</body>
</html>
