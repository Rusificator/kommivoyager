<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0a0c24">
    <title>Быстрый расчёт — в разработке</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="js/site.js" defer></script>
</head>
<body class="site-body">
<header class="site-header">
    <div class="site-header__inner">
        <a class="brand" href="index.php" aria-label="TSP Lab — на главную"><span class="brand__mark">●</span><span>TSP Lab</span></a>
        <nav id="siteNav" class="site-nav" aria-label="Основная навигация" data-mobile-nav>
            <a href="index.php">Главная</a>
            <a href="calculator-exact.php">Точный метод</a>
            <a class="active" href="calculator-heuristic.php">Быстрый метод</a>
        </nav>
        <button class="nav-toggle" type="button" aria-label="Открыть меню" aria-controls="siteNav" aria-expanded="false" data-nav-toggle><span></span><span></span><span></span></button>
    </div>
</header>
<div class="nav-backdrop" data-nav-backdrop></div>

<main class="container">
    <section class="placeholder-card">
        <div class="placeholder-icon">⚡</div>
        <h1>Быстрый расчёт</h1>
        <p>Эвристический калькулятор для N ≤ 40 находится в разработке.</p>
        <a class="btn-primary inline-btn" href="calculator-exact.php">Открыть точный расчёт</a>
    </section>
</main>

<footer class="site-footer">
    <div class="site-footer__inner">
        <div><strong>🧭 TSP Lab</strong><span>Дискретная оптимизация без фреймворков</span></div>
        <nav aria-label="Навигация в подвале"><a href="index.php">Главная</a><a href="calculator-exact.php">Точный метод</a><a href="calculator-heuristic.php">Быстрый метод</a></nav>
        <span class="footer-note">PHP · JavaScript · vis-network</span>
    </div>
</footer>
</body>
</html>
