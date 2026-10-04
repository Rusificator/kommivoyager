<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Задача коммивояжёра — методы решения</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
<header class="site-header"><div class="site-header__inner"><a class="brand" href="index.php"><span class="brand__mark">●</span><span>TSP Lab</span></a><nav class="site-nav"><a class="active" href="index.php">Главная</a><a href="calculator-exact.php">Точный расчёт</a><a href="calculator-heuristic.php">Быстрый расчёт</a></nav><span class="mobile-home">🧭</span></div></header>
<div class="container hub-container">
    <header class="hub-header">
        <h1>🧭 Задача коммивояжёра</h1>
        <p class="subtitle">Методы точного и приближённого решения TSP</p>
    </header>

    <section class="hub-intro">
        <p>Задача коммивояжёра (TSP, Traveling Salesman Problem) состоит в поиске маршрута минимальной стоимости, который проходит через заданные города. В классическом варианте требуется посетить каждый город ровно один раз и вернуться в исходную точку.</p>
        <p>TSP — одна из базовых задач дискретной и комбинаторной оптимизации. Она применяется в логистике и доставке, при планировании маршрутов, проектировании соединений в микроэлектронике, а также встречается в задачах биоинформатики, включая некоторые постановки секвенирования ДНК.</p>
        <p>Точные методы гарантируют оптимум, но быстро становятся вычислительно дорогими с ростом числа городов. Для больших задач используют эвристические, аппроксимационные и метаэвристические алгоритмы.</p>
    </section>

    <section class="methods-section">
        <h2>Сравнение методов</h2>
        <div class="methods-table-wrap">
            <table class="methods-table">
                <thead><tr><th>Метод</th><th>Тип</th><th>Сложность</th><th>Рекомендуемое N</th><th>Гарантия оптимума</th></tr></thead>
                <tbody>
                    <tr><td>Полный перебор</td><td>Точный</td><td>O(N!)</td><td>≤ 10</td><td><span class="method-badge yes">Да</span></td></tr>
                    <tr><td>Ветви и границы</td><td>Точный</td><td>O(N!) в худшем случае</td><td>≤ 15</td><td><span class="method-badge yes">Да*</span></td></tr>
                    <tr><td>Held–Karp (DP)</td><td>Точный</td><td>O(N²·2ᴺ)</td><td>≈ 20–25</td><td><span class="method-badge yes">Да</span></td></tr>
                    <tr><td>Ближайший сосед</td><td>Эвристический</td><td>O(N²)</td><td>Большие N</td><td><span class="method-badge no">Нет</span></td></tr>
                    <tr><td>2-opt / 3-opt</td><td>Локальный поиск</td><td>≈ O(N²) / O(N³) за проход</td><td>Большие N</td><td><span class="method-badge no">Нет</span></td></tr>
                    <tr><td>Кристофидес</td><td>Аппроксимационный</td><td>Полиномиальная</td><td>Средние и большие N</td><td><span class="method-badge approx">1.5× для metric TSP</span></td></tr>
                    <tr><td>Генетический / муравьиный</td><td>Метаэвристический</td><td>Зависит от параметров</td><td>Большие N</td><td><span class="method-badge no">Нет</span></td></tr>
                </tbody>
            </table>
        </div>
        <p class="hub-note">* Метод ветвей и границ гарантирует оптимум после полного завершения поиска. Время работы зависит от матрицы и размерности задачи.</p>
    </section>

    <section class="calculator-cards">
        <a class="calculator-card exact-card" href="calculator-exact.php">
            <span class="calculator-icon">🎯</span>
            <span class="calculator-copy"><strong>Точный расчёт (N ≤ 15)</strong><small>Метод ветвей и границ: замкнутый тур и открытый путь.</small></span>
            <span class="calculator-arrow">→</span>
        </a>
        <a class="calculator-card heuristic-card" href="calculator-heuristic.php">
            <span class="calculator-icon">⚡</span>
            <span class="calculator-copy"><strong>Быстрый расчёт (N ≤ 40)</strong><small>Эвристический калькулятор — в разработке.</small></span>
            <span class="soon-badge">Скоро</span>
        </a>
    </section>
</div>
<footer class="site-footer"><div class="site-footer__inner"><div><strong>🧭 TSP Lab</strong><span>Интерактивный проект по дискретной оптимизации</span></div><nav><a href="index.php">Главная</a><a href="calculator-exact.php">Калькулятор</a></nav><span class="footer-note">PHP · JavaScript · vis-network</span></div></footer>
</body>
</html>
