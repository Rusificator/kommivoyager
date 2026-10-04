// ============================================================
//  script.js — логика TSP-клиента
//  Использует vis-network для визуализации в стиле Neo4j
// ============================================================

// ====== Состояние ======
let matrix = [];
let n = 0;
let network = null;
let nodesDS = null;
let edgesDS = null;

let currentOptimalPath = null;    // последний найденный путь/тур
let currentPathIsClosed = true;   // true для тура, false для открытого пути
let currentView = 'all';          // 'all' | 'optimal'

// ====== DOM ======
const nInput          = document.getElementById('n');
const createBtn       = document.getElementById('createBtn');
const randomBtn       = document.getElementById('randomBtn');
const solveBtn        = document.getElementById('solveBtn');
const matrixSection   = document.getElementById('matrix-section');
const matrixContainer = document.getElementById('matrix-container');
const resultSection   = document.getElementById('result-section');
const resultDiv       = document.getElementById('result');
const graphSection    = document.getElementById('graph-section');
const graphDiv        = document.getElementById('graph');
const pathSection     = document.getElementById('path-section');
const startSelect     = document.getElementById('startCity');
const endSelect       = document.getElementById('endCity');
const solvePathBtn    = document.getElementById('solvePathBtn');
const pathResultDiv   = document.getElementById('path-result');

const viewAllBtn      = document.getElementById('viewAllBtn');
const viewOptimalBtn  = document.getElementById('viewOptimalBtn');
const progressBox      = document.getElementById('search-progress');
const progressText     = document.getElementById('progress-text');
const progressFill     = document.getElementById('progress-fill');

const SERVER_TIME_LIMIT = 40;
const CLIENT_TIMEOUT = 50000;
let progressInterval = null;
let progressStartedAt = 0;

function confirmLongSearch() {
    return n <= 12 || confirm('Для N > 12 поиск может занять до 40 секунд. Продолжить?');
}

function startProgress() {
    if (!progressBox) return;
    progressStartedAt = Date.now();
    progressBox.classList.remove('hidden');
    const update = () => {
        const elapsed = Math.floor((Date.now() - progressStartedAt) / 1000);
        const shown = Math.min(elapsed, SERVER_TIME_LIMIT);
        progressText.textContent = `Идёт поиск... прошло ${shown} сек / ${SERVER_TIME_LIMIT} сек`;
        progressFill.style.width = `${Math.min(100, elapsed / SERVER_TIME_LIMIT * 100)}%`;
    };
    update();
    clearInterval(progressInterval);
    progressInterval = setInterval(update, 1000);
}

function stopProgress() {
    clearInterval(progressInterval);
    progressInterval = null;
    if (progressBox) progressBox.classList.add('hidden');
    if (progressFill) progressFill.style.width = '0%';
}

function timeoutWarning(result) {
    if (result.isOptimal !== false) return '';
    return `<div class="timeout-warning">⚠️ За ${result.timeLimit || 40} секунд не удалось доказать оптимальность. Показано лучшее найденное решение. Возможно, оно не оптимально. Уменьшите N для точного результата.</div>`;
}

// ============================================================
//  СОЗДАНИЕ МАТРИЦЫ
// ============================================================
createBtn.addEventListener('click', () => {
    const size = parseInt(nInput.value);
    if (isNaN(size) || size < 3 || size > 15) {
        alert('Введите число от 3 до 15');
        return;
    }
    n = size;
    matrix = Array.from({ length: n }, () => Array(n).fill(0));

    // Сброс состояния решения
    resetSolutionState();

    renderMatrix();
    populateSelects();
    showSectionsAfterMatrix();
    rebuildGraph();
});

// ============================================================
//  СЛУЧАЙНАЯ МАТРИЦА
// ============================================================
randomBtn.addEventListener('click', () => {
    if (n === 0) {
        createBtn.click();
        return;
    }
    matrix = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const w = Math.floor(Math.random() * 90) + 10;
            matrix[i][j] = w;
            matrix[j][i] = w;
        }
    }

    // Сброс состояния решения
    resetSolutionState();

    renderMatrix();
    rebuildGraph();
});

// ============================================================
//  СБРОС СОСТОЯНИЯ РЕШЕНИЯ (при изменении матрицы)
// ============================================================
function resetSolutionState() {
    currentOptimalPath = null;
    currentPathIsClosed = true;
    currentView = 'all';

    if (viewAllBtn && viewOptimalBtn) {
        viewAllBtn.classList.add('active');
        viewOptimalBtn.classList.remove('active');
        viewOptimalBtn.disabled = true;
    }

    if (resultSection) resultSection.classList.add('hidden');
    if (pathResultDiv) pathResultDiv.classList.add('hidden');
}

// ============================================================
//  ПОКАЗ СЕКЦИЙ ПОСЛЕ СОЗДАНИЯ МАТРИЦЫ
// ============================================================
function showSectionsAfterMatrix() {
    matrixSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    graphSection.classList.remove('hidden');
    pathSection.classList.remove('hidden');
    pathResultDiv.classList.add('hidden');
}

// ============================================================
//  ОТРИСОВКА ТАБЛИЦЫ МАТРИЦЫ
// ============================================================
function renderMatrix() {
    let html = '<table class="matrix-table"><thead><tr><th></th>';
    for (let j = 0; j < n; j++) html += `<th>${j + 1}</th>`;
    html += '</tr></thead><tbody>';

    for (let i = 0; i < n; i++) {
        html += `<tr><th>${i + 1}</th>`;
        for (let j = 0; j < n; j++) {
            if (i === j) {
                html += `<td><input type="number" class="cell readonly" value="0" readonly></td>`;
            } else {
                html += `<td><input type="number" class="cell" data-i="${i}" data-j="${j}" value="${matrix[i][j]}" min="0"></td>`;
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    matrixContainer.innerHTML = html;

    matrixContainer.querySelectorAll('input.cell:not(.readonly)').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const i = parseInt(e.target.dataset.i);
            const j = parseInt(e.target.dataset.j);
            let v = parseInt(e.target.value);
            if (isNaN(v) || v < 0) { v = 0; e.target.value = 0; }
            matrix[i][j] = v;
            matrix[j][i] = v;

            // Синхронизируем зеркальную ячейку
            const mirror = matrixContainer.querySelector(`input[data-i="${j}"][data-j="${i}"]`);
            if (mirror) mirror.value = v;

            // Сбрасываем решение, так как матрица изменилась
            currentOptimalPath = null;
            currentView = 'all';
            if (viewAllBtn && viewOptimalBtn) {
                viewAllBtn.classList.add('active');
                viewOptimalBtn.classList.remove('active');
                viewOptimalBtn.disabled = true;
            }
        });
    });
}

// ============================================================
//  ЗАПОЛНЕНИЕ ВЫПАДАЮЩИХ СПИСКОВ ГОРОДОВ
// ============================================================
function populateSelects() {
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    for (let i = 0; i < n; i++) {
        startSelect.insertAdjacentHTML('beforeend', `<option value="${i}">Город ${i + 1}</option>`);
        endSelect.insertAdjacentHTML('beforeend', `<option value="${i}">Город ${i + 1}</option>`);
    }
    startSelect.value = 0;
    endSelect.value = n - 1;
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ vis-network (Neo4j-стиль)
// ============================================================
function initNetwork() {
    nodesDS = new vis.DataSet([]);
    edgesDS = new vis.DataSet([]);

    const options = {
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -4000,
                centralGravity: 0.3,
                springLength: 180,
                springConstant: 0.05,
                damping: 0.09
            },
            stabilization: { iterations: 250 }
        },
        nodes: {
            shape: 'circle',
            size: 26,
            color: {
                background: '#1a1a2e',
                border: '#42dcff',
                highlight: { background: '#0d3b52', border: '#00e0ff' },
                hover:     { background: '#0d3b52', border: '#00e0ff' }
            },
            font: { color: '#fff', size: 16, face: 'Segoe UI' },
            borderWidth: 2
        },
        edges: {
            color: { color: 'rgba(160,180,200,0.25)', highlight: '#42dcff', hover: '#42dcff' },
            width: 1,
            font: { color: '#8a8aa3', size: 11, strokeWidth: 0, align: 'middle' },
            smooth: false
        },
        interaction: {
            hover: true,
            dragNodes: true,
            dragView: true,
            zoomView: true,
            tooltipDelay: 200
        }
    };

    network = new vis.Network(graphDiv, { nodes: nodesDS, edges: edgesDS }, options);
}

// ============================================================
//  ПЕРЕРИСОВКА ГРАФА С УЧЁТОМ РЕЖИМА ПРОСМОТРА
// ============================================================
function rebuildGraph() {
    if (!network) initNetwork();

    // ---- Узлы ----
    const nodes = [];
    for (let i = 0; i < n; i++) {
        nodes.push({ id: i, label: String(i + 1) });
    }
    nodesDS.clear();
    nodesDS.add(nodes);

    // ---- Рёбра ----
    const edges = [];

    if (currentView === 'optimal' && currentOptimalPath) {
        // Показываем только рёбра оптимального пути
        for (let k = 0; k < currentOptimalPath.length - 1; k++) {
            const a = currentOptimalPath[k];
            const b = currentOptimalPath[k + 1];
            edges.push({
                id: `e${a}-${b}`,
                from: a,
                to: b,
                label: String(matrix[a][b]),
                color: { color: '#00e0ff' },
                width: 4,
                font: { color: '#00e0ff', size: 13, strokeWidth: 0, align: 'middle' }
            });
        }
    } else {
        // Показываем все рёбра
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                edges.push({
                    id: `e${i}-${j}`,
                    from: i,
                    to: j,
                    label: String(matrix[i][j])
                });
            }
        }
    }

    edgesDS.clear();
    edgesDS.add(edges);

    // ---- Подсветка стартового/конечного узла в режиме optimal ----
    if (currentView === 'optimal' && currentOptimalPath) {
        // Стартовый узел — зелёный
        nodesDS.update({
            id: currentOptimalPath[0],
            color: { background: '#0a5a2a', border: '#51cf66' },
            borderWidth: 4
        });

        // Конечный узел для открытого пути — красный
        if (!currentPathIsClosed) {
            nodesDS.update({
                id: currentOptimalPath[currentOptimalPath.length - 1],
                color: { background: '#5a0a0a', border: '#ff6b6b' },
                borderWidth: 4
            });
        }
    }

    network.stabilize();
}

// ============================================================
//  ПЕРЕКЛЮЧАТЕЛЬ ВИДА: ВЕСЬ ГРАФ
// ============================================================
if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
        currentView = 'all';
        viewAllBtn.classList.add('active');
        viewOptimalBtn.classList.remove('active');
        rebuildGraph();
    });
}

// ============================================================
//  ПЕРЕКЛЮЧАТЕЛЬ ВИДА: ТОЛЬКО ОПТИМАЛЬНЫЙ ПУТЬ
// ============================================================
if (viewOptimalBtn) {
    viewOptimalBtn.addEventListener('click', () => {
        if (!currentOptimalPath) return;
        currentView = 'optimal';
        viewOptimalBtn.classList.add('active');
        viewAllBtn.classList.remove('active');
        rebuildGraph();
    });
}

// ============================================================
//  РЕШЕНИЕ ТУРА (замкнутый маршрут через все города)
// ============================================================
solveBtn.addEventListener('click', async () => {
    if (n === 0) { alert('Сначала создайте матрицу'); return; }

    if (!confirmLongSearch()) return;

    // Проверка заполнения
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j && (matrix[i][j] === '' || matrix[i][j] === null || matrix[i][j] < 0)) {
                alert('Заполните все ячейки неотрицательными числами');
                return;
            }
        }
    }

    solveBtn.disabled = true;
    startProgress();
    solveBtn.textContent = 'Решение...';
    resultSection.classList.add('hidden');

    try {
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT);
        let response;
        try {
            response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ n, matrix, mode: 'tour' }),
                signal: controller.signal
            });
        } finally {
            clearTimeout(abortTimer);
        }
        const result = await response.json();

        if (result.error) {
            resultDiv.innerHTML = `<p class="error">${result.error}</p>`;
            resultSection.classList.remove('hidden');
            return;
        }

        // Сохраняем найденный путь и включаем кнопку переключения вида
        currentOptimalPath = result.path;
        currentPathIsClosed = true;
        viewOptimalBtn.disabled = false;
        currentView = 'all';
        viewAllBtn.classList.add('active');
        viewOptimalBtn.classList.remove('active');

        const pathStr = result.path.map(c => c + 1).join(' → ');
        resultDiv.innerHTML = `
            ${timeoutWarning(result)}
            <div class="result-card">
                <p><strong>Оптимальный тур:</strong></p>
                <p class="path">${pathStr}</p>
                <p><strong>Стоимость:</strong> <span class="cost">${result.cost}</span></p>
                <p class="time">Время решения: ${result.time} сек</p>
            </div>
        `;
        resultSection.classList.remove('hidden');
        graphSection.classList.remove('hidden');
        rebuildGraph();
    } catch (err) {
        const message = err.name === 'AbortError'
            ? 'Клиент прекратил ожидание через 50 секунд. Уменьшите N и повторите попытку.'
            : `Ошибка соединения: ${err.message}`;
        resultDiv.innerHTML = `<p class="error">${message}</p>`;
        resultSection.classList.remove('hidden');
    } finally {
        stopProgress();
        solveBtn.disabled = false;
        solveBtn.textContent = 'Решить (тур)';
    }
});

// ============================================================
//  РЕШЕНИЕ ОТКРЫТОГО ПУТИ МЕЖДУ ДВУМЯ ГОРОДАМИ
// ============================================================
solvePathBtn.addEventListener('click', async () => {
    if (n === 0) { alert('Сначала создайте матрицу'); return; }

    if (!confirmLongSearch()) return;

    const start = parseInt(startSelect.value);
    const end   = parseInt(endSelect.value);
    if (start === end) {
        alert('Начальный и конечный города должны различаться');
        return;
    }

    solvePathBtn.disabled = true;
    startProgress();
    solvePathBtn.textContent = 'Поиск...';
    pathResultDiv.classList.add('hidden');

    try {
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT);
        let response;
        try {
            response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ n, matrix, mode: 'path', start, end }),
                signal: controller.signal
            });
        } finally {
            clearTimeout(abortTimer);
        }
        const result = await response.json();

        if (result.error) {
            pathResultDiv.innerHTML = `<p class="error">${result.error}</p>`;
            pathResultDiv.classList.remove('hidden');
            return;
        }

        // Сохраняем путь и включаем кнопку переключения вида
        currentOptimalPath = result.path;
        currentPathIsClosed = false;
        viewOptimalBtn.disabled = false;
        currentView = 'all';
        viewAllBtn.classList.add('active');
        viewOptimalBtn.classList.remove('active');

        const pathStr = result.path.map(c => c + 1).join(' → ');
        pathResultDiv.innerHTML = `
            ${timeoutWarning(result)}
            <div class="result-card">
                <p><strong>Оптимальный путь:</strong></p>
                <p class="path">${pathStr}</p>
                <p><strong>Длина пути:</strong> <span class="cost">${result.cost}</span></p>
                <p class="time">Время решения: ${result.time} сек</p>
            </div>
        `;
        pathResultDiv.classList.remove('hidden');
        rebuildGraph();
    } catch (err) {
        const message = err.name === 'AbortError'
            ? 'Клиент прекратил ожидание через 50 секунд. Уменьшите N и повторите попытку.'
            : `Ошибка соединения: ${err.message}`;
        pathResultDiv.innerHTML = `<p class="error">${message}</p>`;
        pathResultDiv.classList.remove('hidden');
    } finally {
        stopProgress();
        solvePathBtn.disabled = false;
        solvePathBtn.textContent = 'Найти путь';
    }
});