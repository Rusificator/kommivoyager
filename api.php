<?php
header('Content-Type: application/json; charset=utf-8');
set_time_limit(50);
$timeLimit = 40;

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || !isset($data['matrix']) || !isset($data['n'])) {
    echo json_encode(['error' => 'Некорректные данные']);
    exit;
}

$n = (int)$data['n'];
$matrix = $data['matrix'];
$mode = $data['mode'] ?? 'tour';

// --- Валидация ---
if ($n < 3 || $n > 15) {
    echo json_encode(['error' => 'Размерность должна быть от 3 до 15']);
    exit;
}
if (count($matrix) !== $n) {
    echo json_encode(['error' => 'Неверный размер матрицы']);
    exit;
}
foreach ($matrix as $row) {
    if (count($row) !== $n) {
        echo json_encode(['error' => 'Матрица должна быть N×N']);
        exit;
    }
    foreach ($row as $val) {
        if (!is_numeric($val) || $val < 0) {
            echo json_encode(['error' => 'Все элементы должны быть неотрицательными числами']);
            exit;
        }
    }
}

$startTime = microtime(true);

if ($mode === 'path') {
    $start = (int)($data['start'] ?? 0);
    $end   = (int)($data['end'] ?? $n - 1);
    if ($start < 0 || $start >= $n || $end < 0 || $end >= $n) {
        echo json_encode(['error' => 'Неверные индексы городов']);
        exit;
    }
    if ($start === $end) {
        echo json_encode(['error' => 'Начальный и конечный города должны различаться']);
        exit;
    }
    $result = solveTSPPath($matrix, $n, $start, $end, $startTime, $timeLimit);
} else {
    $result = solveTSPTour($matrix, $n, $startTime, $timeLimit);
}

$result['time'] = round(microtime(true) - $startTime, 4);
$result['mode'] = $mode;
$result['timeLimit'] = $timeLimit;
echo json_encode($result);

// ============================================================
//   РЕЖИМ 1: замкнутый тур (классический TSP)
// ============================================================
function solveTSPTour($matrix, $n, $startTime, $timeLimit) {
    $best = ['cost' => PHP_INT_MAX, 'path' => []];
    $visited = array_fill(0, $n, false);
    $visited[0] = true;
    $path = [0];
    $timedOut = false;
    try {
        bbSearchTour($matrix, $n, 0, $path, $visited, 0, $best, $startTime, $timeLimit);
    } catch (Exception $e) {
        if ($e->getMessage() !== 'TIMEOUT') throw $e;
        $timedOut = true;
    }

    if (empty($best['path'])) {
        return ['error' => $timedOut ? 'За 40 секунд маршрут не найден. Уменьшите N и повторите попытку.' : 'Маршрут не найден'];
    }
    $best['path'][] = 0; // замыкаем
    return [
        'path' => $best['path'], 'cost' => $best['cost'], 'n' => $n,
        'isOptimal' => !$timedOut, 'timedOut' => $timedOut,
        'message' => $timedOut ? 'За 40 секунд не удалось доказать оптимальность. Показано лучшее найденное решение.' : null
    ];
}

function bbSearchTour($matrix, $n, $current, &$path, &$visited, $cost, &$best, $startTime, $timeLimit) {
    static $calls = 0;
    $calls++;
    if ($calls % 500 === 0 && microtime(true) - $startTime > $timeLimit) {
        throw new Exception('TIMEOUT');
    }
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
        if (!$visited[$j] && $matrix[$current][$j] < $minFromCurrent) {
            $minFromCurrent = $matrix[$current][$j];
        }
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
    for ($j = 0; $j < $n; $j++) {
        if (!$visited[$j]) $candidates[] = [$j, $matrix[$current][$j]];
    }
    usort($candidates, fn($a, $b) => $a[1] - $b[1]);

    foreach ($candidates as $c) {
        $j = $c[0];
        $visited[$j] = true;
        $path[] = $j;
        bbSearchTour($matrix, $n, $j, $path, $visited, $cost + $matrix[$current][$j], $best, $startTime, $timeLimit);
        array_pop($path);
        $visited[$j] = false;
    }
}

// ============================================================
//   РЕЖИМ 2: открытый путь из start в end (гамильтонов путь)
// ============================================================
function solveTSPPath($matrix, $n, $start, $end, $startTime, $timeLimit) {
    $best = ['cost' => PHP_INT_MAX, 'path' => []];
    $visited = array_fill(0, $n, false);
    $visited[$start] = true;
    $path = [$start];

    $timedOut = false;
    try {
        bbSearchPath($matrix, $n, $start, $end, $path, $visited, 0, $best, $startTime, $timeLimit);
    } catch (Exception $e) {
        if ($e->getMessage() !== 'TIMEOUT') throw $e;
        $timedOut = true;
    }

    if (empty($best['path'])) {
        return ['error' => $timedOut ? 'За 40 секунд путь не найден. Уменьшите N и повторите попытку.' : 'Путь между заданными городами не найден'];
    }
    return [
        'path' => $best['path'], 'cost' => $best['cost'], 'n' => $n,
        'isOptimal' => !$timedOut, 'timedOut' => $timedOut,
        'message' => $timedOut ? 'За 40 секунд не удалось доказать оптимальность. Показано лучшее найденное решение.' : null
    ];
}

function bbSearchPath($matrix, $n, $current, $end, &$path, &$visited, $cost, &$best, $startTime, $timeLimit) {
    static $calls = 0;
    $calls++;
    if ($calls % 500 === 0 && microtime(true) - $startTime > $timeLimit) {
        throw new Exception('TIMEOUT');
    }
    if ($cost >= $best['cost']) return;

    // База: все города посещены
    if (count($path) === $n) {
        if ($current === $end && $cost < $best['cost']) {
            $best['cost'] = $cost;
            $best['path'] = $path;
        }
        return;
    }

    // Нижняя оценка: минимальное ребро от текущего + минимальные исходящие для остальных (кроме end)
    $lb = $cost;
    $minFromCurrent = PHP_INT_MAX;
    for ($j = 0; $j < $n; $j++) {
        if (!$visited[$j] && $matrix[$current][$j] < $minFromCurrent) {
            $minFromCurrent = $matrix[$current][$j];
        }
    }
    if ($minFromCurrent !== PHP_INT_MAX) $lb += $minFromCurrent;

    for ($i = 0; $i < $n; $i++) {
        if ($visited[$i] || $i === $end) continue;
        $minOut = PHP_INT_MAX;
        for ($j = 0; $j < $n; $j++) {
            if ($i !== $j && !$visited[$j]) {
                if ($matrix[$i][$j] < $minOut) $minOut = $matrix[$i][$j];
            }
        }
        if ($minOut !== PHP_INT_MAX) $lb += $minOut;
    }
    if ($lb >= $best['cost']) return;

    // Если остался только end — обязаны идти в него
    $unvisitedCount = 0;
    for ($j = 0; $j < $n; $j++) if (!$visited[$j]) $unvisitedCount++;

    if ($unvisitedCount === 1) {
        if ($matrix[$current][$end] < PHP_INT_MAX) {
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

    // Кандидаты: все непосещённые, кроме end
    $candidates = [];
    for ($j = 0; $j < $n; $j++) {
        if (!$visited[$j] && $j !== $end) {
            $candidates[] = [$j, $matrix[$current][$j]];
        }
    }
    usort($candidates, fn($a, $b) => $a[1] - $b[1]);

    foreach ($candidates as $c) {
        $j = $c[0];
        $visited[$j] = true;
        $path[] = $j;
        bbSearchPath($matrix, $n, $j, $end, $path, $visited, $cost + $matrix[$current][$j], $best, $startTime, $timeLimit);
        array_pop($path);
        $visited[$j] = false;
    }
}