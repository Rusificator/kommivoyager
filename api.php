<?php
header('Content-Type: application/json; charset=utf-8');

// Пользователь управляет длительностью вычисления: искусственный лимит 40 секунд удалён.
// На хостинге всё ещё могут действовать внешние ограничения PHP/FPM/веб-сервера.
set_time_limit(0);

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || !isset($data['matrix']) || !isset($data['n'])) {
    echo json_encode(['error' => 'Некорректные данные'], JSON_UNESCAPED_UNICODE);
    exit;
}

$n = (int)$data['n'];
$matrix = $data['matrix'];
$mode = $data['mode'] ?? 'tour';

if ($n < 3 || $n > 15) {
    echo json_encode(['error' => 'Размерность должна быть от 3 до 15'], JSON_UNESCAPED_UNICODE);
    exit;
}
if (count($matrix) !== $n) {
    echo json_encode(['error' => 'Неверный размер матрицы'], JSON_UNESCAPED_UNICODE);
    exit;
}
foreach ($matrix as $row) {
    if (!is_array($row) || count($row) !== $n) {
        echo json_encode(['error' => 'Матрица должна быть N×N'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    foreach ($row as $val) {
        if (!is_numeric($val) || $val < 0) {
            echo json_encode(['error' => 'Все элементы должны быть неотрицательными числами'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

$startTime = microtime(true);

if ($mode === 'path') {
    $start = (int)($data['start'] ?? 0);
    $end = (int)($data['end'] ?? $n - 1);
    if ($start < 0 || $start >= $n || $end < 0 || $end >= $n) {
        echo json_encode(['error' => 'Неверные индексы городов'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($start === $end) {
        echo json_encode(['error' => 'Начальный и конечный города должны различаться'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $result = solveTSPPath($matrix, $n, $start, $end);
} else {
    $result = solveTSPTour($matrix, $n);
}

$result['time'] = round(microtime(true) - $startTime, 4);
$result['mode'] = $mode;
$result['isOptimal'] = !isset($result['error']);
$result['timedOut'] = false;
echo json_encode($result, JSON_UNESCAPED_UNICODE);

function solveTSPTour($matrix, $n) {
    $best = ['cost' => PHP_INT_MAX, 'path' => []];
    $visited = array_fill(0, $n, false);
    $visited[0] = true;
    $path = [0];
    bbSearchTour($matrix, $n, 0, $path, $visited, 0, $best);

    if (empty($best['path'])) return ['error' => 'Маршрут не найден'];
    $best['path'][] = 0;
    return ['path' => $best['path'], 'cost' => $best['cost'], 'n' => $n];
}

function bbSearchTour($matrix, $n, $current, &$path, &$visited, $cost, &$best) {
    if ($cost >= $best['cost']) return;

    if (count($path) === $n) {
        $total = $cost + $matrix[$current][0];
        if ($total < $best['cost']) {
            $best['cost'] = $total;
            $best['path'] = $path;
        }
        return;
    }

    $lb = $cost;
    $minFromCurrent = PHP_INT_MAX;
    for ($j = 0; $j < $n; $j++) {
        if (!$visited[$j] && $matrix[$current][$j] < $minFromCurrent) $minFromCurrent = $matrix[$current][$j];
    }
    if ($minFromCurrent !== PHP_INT_MAX) $lb += $minFromCurrent;

    for ($i = 0; $i < $n; $i++) {
        if (!$visited[$i]) {
            $minOut = PHP_INT_MAX;
            for ($j = 0; $j < $n; $j++) {
                if ($i !== $j && ($j === 0 || !$visited[$j])) {
                    if ($matrix[$i][$j] < $minOut) $minOut = $matrix[$i][$j];
                }
            }
            if ($minOut !== PHP_INT_MAX) $lb += $minOut;
        }
    }
    if ($lb >= $best['cost']) return;

    $candidates = [];
    for ($j = 0; $j < $n; $j++) if (!$visited[$j]) $candidates[] = [$j, $matrix[$current][$j]];
    usort($candidates, fn($a, $b) => $a[1] <=> $b[1]);

    foreach ($candidates as $c) {
        $j = $c[0];
        $visited[$j] = true;
        $path[] = $j;
        bbSearchTour($matrix, $n, $j, $path, $visited, $cost + $matrix[$current][$j], $best);
        array_pop($path);
        $visited[$j] = false;
    }
}

function solveTSPPath($matrix, $n, $start, $end) {
    $best = ['cost' => PHP_INT_MAX, 'path' => []];
    $visited = array_fill(0, $n, false);
    $visited[$start] = true;
    $path = [$start];
    bbSearchPath($matrix, $n, $start, $end, $path, $visited, 0, $best);

    if (empty($best['path'])) return ['error' => 'Путь между заданными городами не найден'];
    return ['path' => $best['path'], 'cost' => $best['cost'], 'n' => $n];
}

function bbSearchPath($matrix, $n, $current, $end, &$path, &$visited, $cost, &$best) {
    if ($cost >= $best['cost']) return;

    if (count($path) === $n) {
        if ($current === $end && $cost < $best['cost']) {
            $best['cost'] = $cost;
            $best['path'] = $path;
        }
        return;
    }

    $lb = $cost;
    $minFromCurrent = PHP_INT_MAX;
    for ($j = 0; $j < $n; $j++) {
        if (!$visited[$j] && $matrix[$current][$j] < $minFromCurrent) $minFromCurrent = $matrix[$current][$j];
    }
    if ($minFromCurrent !== PHP_INT_MAX) $lb += $minFromCurrent;

    for ($i = 0; $i < $n; $i++) {
        if ($visited[$i] || $i === $end) continue;
        $minOut = PHP_INT_MAX;
        for ($j = 0; $j < $n; $j++) {
            if ($i !== $j && !$visited[$j] && $matrix[$i][$j] < $minOut) $minOut = $matrix[$i][$j];
        }
        if ($minOut !== PHP_INT_MAX) $lb += $minOut;
    }
    if ($lb >= $best['cost']) return;

    $unvisitedCount = 0;
    for ($j = 0; $j < $n; $j++) if (!$visited[$j]) $unvisitedCount++;

    if ($unvisitedCount === 1) {
        if (!$visited[$end]) {
            $path[] = $end;
            $visited[$end] = true;
            $newCost = $cost + $matrix[$current][$end];
            if ($newCost < $best['cost']) {
                $best['cost'] = $newCost;
                $best['path'] = $path;
            }
            array_pop($path);
            $visited[$end] = false;
        }
        return;
    }

    $candidates = [];
    for ($j = 0; $j < $n; $j++) {
        if (!$visited[$j] && $j !== $end) $candidates[] = [$j, $matrix[$current][$j]];
    }
    usort($candidates, fn($a, $b) => $a[1] <=> $b[1]);

    foreach ($candidates as $c) {
        $j = $c[0];
        $visited[$j] = true;
        $path[] = $j;
        bbSearchPath($matrix, $n, $j, $end, $path, $visited, $cost + $matrix[$current][$j], $best);
        array_pop($path);
        $visited[$j] = false;
    }
}
