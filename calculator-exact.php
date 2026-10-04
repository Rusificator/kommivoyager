<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Коммивояжёр — метод ветвей и границ</title>
    <link rel="stylesheet" href="css/style.css">
    <!-- Библиотека vis-network для графа в стиле Neo4j -->
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
</head>
<body>
    <div class="container">
        <a href="index.php" class="back-home">← На главную</a>
        <header>
            <h1>🧭 Коммивояжёр</h1>
            <p class="subtitle">Решение задачи методом ветвей и границ</p>
        </header>

        <section class="controls">
            <div class="control-group">
                <label for="n">Количество городов (3–15)</label>
                <input type="number" id="n" min="3" max="15" value="5">
                <button id="createBtn">Создать матрицу</button>
                <button id="randomBtn">Случайная матрица</button>
                <button id="solveBtn" class="btn-primary">Решить (тур)</button>
            </div>
        </section>

        <div id="search-progress" class="search-progress hidden" aria-live="polite">
            <div class="progress-spinner"></div>
            <div class="progress-content">
                <div id="progress-text">Идёт поиск... прошло 0 сек / 40 сек</div>
                <div class="progress-track"><div id="progress-fill" class="progress-fill"></div></div>
            </div>
        </div>

        <section id="matrix-section" class="matrix-section hidden">
            <h2>Матрица расстояний</h2>
            <div id="matrix-container"></div>
        </section>

        <section id="result-section" class="result-section hidden">
            <h2>Результат обхода</h2>
            <div id="result"></div>
        </section>

        <section id="graph-section" class="graph-section hidden">
          <h2>Визуализация графа</h2>
          <p class="hint">💡 Узлы можно перетаскивать, граф можно масштабировать (колесо мыши) и панорамировать (ЛКМ по пустому месту).</p>

          <div class="graph-toolbar">
              <button id="viewAllBtn" class="toggle-btn active">🌐 Весь граф</button>
              <button id="viewOptimalBtn" class="toggle-btn" disabled>✨ Только оптимальный путь</button>
          </div>

          <div id="graph" class="graph-container"></div>
      </section>

        <!-- НОВЫЙ РАЗДЕЛ: путь между двумя городами -->
        <section id="path-section" class="path-section hidden">
            <h2>🔎 Поиск оптимального пути между двумя городами</h2>
            <p class="hint">Найдите кратчайший маршрут, который начинается в выбранном городе и заканчивается в другом, проходя через все остальные города ровно один раз.</p>
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
                    <button id="solvePathBtn" class="btn-primary">Найти путь</button>
                </div>
            </div>
            <div id="path-result" class="result-section hidden"></div>
        </section>
    </div>

    <script src="js/script.js"></script>
</body>
</html>