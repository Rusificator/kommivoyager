// ============================================================
// script.js — TSP-клиент: persistent matrix, вкладки и два графа
// ============================================================
'use strict';

const MAX_N = 15;
const MIN_N = 3;
const STORAGE_MATRIX = 'tsp.matrix.v2';
const STORAGE_N = 'tsp.n.v2';

let n = MIN_N;
let matrixStore = createEmptyStore();
let matrix = [];
let activeTask = 'tour';

let network = null;
let nodesDS = null;
let edgesDS = null;
let pathNetwork = null;
let pathNodesDS = null;
let pathEdgesDS = null;

let currentOptimalPath = null;
let currentView = 'all';
let pathOptimalPath = null;

const timerState = {
    tour: { interval: null, startedAt: 0 },
    path: { interval: null, startedAt: 0 }
};

const viewportHomes = new WeakMap();

// ---------- DOM ----------
const nInput = document.getElementById('n');
const nDisplay = document.getElementById('nDisplay');
const nUpBtn = document.getElementById('nUpBtn');
const nDownBtn = document.getElementById('nDownBtn');
const randomBtn = document.getElementById('randomBtn');
const resetBtn = document.getElementById('resetBtn');
const solveBtn = document.getElementById('solveBtn');
const solvePathBtn = document.getElementById('solvePathBtn');
const matrixContainer = document.getElementById('matrix-container');
const matrixSizeBadge = document.getElementById('matrixSizeBadge');

const tourTabBtn = document.getElementById('tourTabBtn');
const pathTabBtn = document.getElementById('pathTabBtn');
const pathConfig = document.getElementById('pathConfig');
const tourWorkspace = document.getElementById('tourWorkspace');
const pathWorkspace = document.getElementById('pathWorkspace');

const resultSection = document.getElementById('result-section');
const resultDiv = document.getElementById('result');
const tourResultAnchor = document.getElementById('tourResultAnchor');
const pathResultSection = document.getElementById('path-result-section');
const pathResultTitle = document.getElementById('pathResultTitle');
const pathResultDiv = document.getElementById('path-result');

const tourStopwatch = document.getElementById('tourStopwatch');
const tourStopwatchValue = document.getElementById('tourStopwatchValue');
const pathStopwatch = document.getElementById('pathStopwatch');
const pathStopwatchLabel = document.getElementById('pathStopwatchLabel');
const pathStopwatchValue = document.getElementById('pathStopwatchValue');

const startInput = document.getElementById('startCity');
const endInput = document.getElementById('endCity');
const startPicker = document.querySelector('[data-city-picker="start"]');
const endPicker = document.querySelector('[data-city-picker="end"]');

const graphDiv = document.getElementById('graph');
const pathGraphDiv = document.getElementById('pathGraph');
const pathGraphSection = document.getElementById('path-graph-section');
const pathGraphTitle = document.getElementById('pathGraphTitle');
const mainGraphTitle = document.getElementById('mainGraphTitle');
const mainFullscreenTitle = document.getElementById('mainFullscreenTitle');
const pathFullscreenTitle = document.getElementById('pathFullscreenTitle');
const viewAllBtn = document.getElementById('viewAllBtn');
const viewOptimalBtn = document.getElementById('viewOptimalBtn');

const resetModal = document.getElementById('resetModal');
const confirmResetYes = document.getElementById('confirmResetYes');
const confirmResetNo = document.getElementById('confirmResetNo');

const mainGraphFrame = document.getElementById('mainGraphFrame');
const pathGraphFrame = document.getElementById('pathGraphFrame');
const mainFullscreenBtn = document.getElementById('mainFullscreenBtn');
const pathFullscreenBtn = document.getElementById('pathFullscreenBtn');
const mainFullscreenBack = document.getElementById('mainFullscreenBack');
const pathFullscreenBack = document.getElementById('pathFullscreenBack');
const mainFindGraphBtn = document.getElementById('mainFindGraphBtn');
const pathFindGraphBtn = document.getElementById('pathFindGraphBtn');

// ============================================================
//  МАТРИЦА И LOCALSTORAGE
// ============================================================
function createEmptyStore() {
    return Array.from({ length: MAX_N }, () => Array(MAX_N).fill(0));
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_MATRIX));
        if (Array.isArray(saved) && saved.length === MAX_N && saved.every(row => Array.isArray(row) && row.length === MAX_N)) {
            matrixStore = saved.map((row, i) => row.map((value, j) => i === j ? 0 : Math.max(0, Number(value) || 0)));
        }

        const savedN = Number(localStorage.getItem(STORAGE_N));
        n = Number.isInteger(savedN) && savedN >= MIN_N && savedN <= MAX_N ? savedN : MIN_N;
    } catch (_) {
        matrixStore = createEmptyStore();
        n = MIN_N;
    }
}

function persistState() {
    try {
        localStorage.setItem(STORAGE_MATRIX, JSON.stringify(matrixStore));
        localStorage.setItem(STORAGE_N, String(n));
    } catch (_) {
        // Если хранилище браузера отключено, калькулятор продолжит работать в памяти вкладки.
    }
}

function syncVisibleMatrix() {
    matrix = matrixStore.slice(0, n).map(row => row.slice(0, n));
}

function setN(nextN) {
    const value = Math.max(MIN_N, Math.min(MAX_N, Number(nextN) || MIN_N));
    if (value === n) return;

    n = value;
    persistState();
    invalidateAllSolutions();
    renderForDimension();
}

function renderForDimension() {
    syncVisibleMatrix();
    nInput.value = String(n);
    nDisplay.textContent = String(n);
    matrixSizeBadge.textContent = `${n} × ${n}`;
    nUpBtn.disabled = n >= MAX_N;
    nDownBtn.disabled = n <= MIN_N;

    renderMatrix();
    populateCityPickers();
    rebuildGraph();
}

function renderMatrix() {
    let html = '<table class="matrix-table"><thead><tr><th class="matrix-corner"></th>';
    for (let j = 0; j < n; j++) html += `<th class="matrix-col-head" scope="col">${j + 1}</th>`;
    html += '</tr></thead><tbody>';

    for (let i = 0; i < n; i++) {
        html += `<tr><th class="matrix-row-head" scope="row">${i + 1}</th>`;
        for (let j = 0; j < n; j++) {
            if (i === j) {
                html += '<td><input type="number" class="cell readonly" value="0" readonly tabindex="-1" aria-label="Диагональ, значение 0"></td>';
            } else {
                html += `<td><input type="number" inputmode="decimal" class="cell" data-i="${i}" data-j="${j}" value="${matrixStore[i][j]}" min="0" aria-label="Расстояние из города ${i + 1} в город ${j + 1}"></td>`;
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    matrixContainer.innerHTML = html;

    matrixContainer.querySelectorAll('input.cell:not(.readonly)').forEach(input => {
        input.addEventListener('input', event => {
            const i = Number(event.target.dataset.i);
            const j = Number(event.target.dataset.j);
            let value = Number(event.target.value);
            if (!Number.isFinite(value) || value < 0) value = 0;

            matrixStore[i][j] = value;
            matrixStore[j][i] = value;

            const mirror = matrixContainer.querySelector(`input[data-i="${j}"][data-j="${i}"]`);
            if (mirror && document.activeElement !== mirror) mirror.value = String(value);

            persistState();
            syncVisibleMatrix();
            invalidateAllSolutions();
            rebuildGraph();
        });
    });
}

nUpBtn.addEventListener('click', () => setN(n + 1));
nDownBtn.addEventListener('click', () => setN(n - 1));
nInput.addEventListener('change', () => setN(parseInt(nInput.value, 10)));
nInput.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        setN(n + 1);
    }
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        setN(n - 1);
    }
});

randomBtn.addEventListener('click', () => {
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const weight = Math.floor(Math.random() * 90) + 10;
            matrixStore[i][j] = weight;
            matrixStore[j][i] = weight;
        }
    }
    persistState();
    invalidateAllSolutions();
    renderForDimension();
});

// ============================================================
//  ВКЛАДКИ ЗАДАЧИ
// ============================================================
function setActiveTask(task) {
    activeTask = task === 'path' ? 'path' : 'tour';
    const isTour = activeTask === 'tour';

    tourTabBtn.classList.toggle('active', isTour);
    pathTabBtn.classList.toggle('active', !isTour);
    tourTabBtn.setAttribute('aria-selected', String(isTour));
    pathTabBtn.setAttribute('aria-selected', String(!isTour));

    tourWorkspace.classList.toggle('hidden', !isTour);
    pathWorkspace.classList.toggle('hidden', isTour);
    pathConfig.classList.toggle('hidden', isTour);
    solveBtn.classList.toggle('hidden', !isTour);
    solvePathBtn.classList.toggle('hidden', isTour);

    closeAllCityPickers();

    requestAnimationFrame(() => {
        if (isTour) {
            network?.redraw();
        } else {
            pathNetwork?.redraw();
        }
    });
}

tourTabBtn.addEventListener('click', () => setActiveTask('tour'));
pathTabBtn.addEventListener('click', () => setActiveTask('path'));

// ============================================================
//  СОБСТВЕННЫЕ ТЁМНЫЕ ВЫПАДАЮЩИЕ СПИСКИ ГОРОДОВ
// ============================================================
function populateCityPickers() {
    const oldStart = Math.min(Number(startInput.value) || 0, n - 1);
    let oldEnd = Math.min(Number(endInput.value), n - 1);
    if (!Number.isInteger(oldEnd) || oldEnd < 0) oldEnd = n - 1;
    if (oldStart === oldEnd) oldEnd = oldStart === n - 1 ? 0 : n - 1;

    startInput.value = String(oldStart);
    endInput.value = String(oldEnd);
    renderCityPicker(startPicker, startInput, oldStart);
    renderCityPicker(endPicker, endInput, oldEnd);
}

function renderCityPicker(picker, input, selected) {
    const valueNode = picker.querySelector('.city-picker__value');
    const menu = picker.querySelector('.city-picker__menu');
    const trigger = picker.querySelector('.city-picker__trigger');

    valueNode.textContent = `Город ${selected + 1}`;
    menu.innerHTML = '';

    for (let i = 0; i < n; i++) {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'city-picker__option';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(i === selected));
        option.dataset.value = String(i);
        option.textContent = `Город ${i + 1}`;
        if (i === selected) option.classList.add('selected');

        option.addEventListener('click', () => {
            input.value = String(i);
            valueNode.textContent = `Город ${i + 1}`;
            renderCityPicker(picker, input, i);
            closeCityPicker(picker);
            invalidatePathSolution();
        });

        menu.appendChild(option);
    }

    if (!trigger.dataset.bound) {
        trigger.dataset.bound = '1';
        trigger.addEventListener('click', event => {
            event.stopPropagation();
            const shouldOpen = menu.classList.contains('hidden');
            closeAllCityPickers();
            if (shouldOpen) openCityPicker(picker);
        });
    }
}

function openCityPicker(picker) {
    picker.classList.add('open');
    picker.querySelector('.city-picker__menu').classList.remove('hidden');
    picker.querySelector('.city-picker__trigger').setAttribute('aria-expanded', 'true');
}

function closeCityPicker(picker) {
    picker.classList.remove('open');
    picker.querySelector('.city-picker__menu').classList.add('hidden');
    picker.querySelector('.city-picker__trigger').setAttribute('aria-expanded', 'false');
}

function closeAllCityPickers() {
    [startPicker, endPicker].forEach(closeCityPicker);
}

document.addEventListener('click', event => {
    if (!event.target.closest('.city-picker')) closeAllCityPickers();
});

// ============================================================
//  СБРОС И ИНВАЛИДАЦИЯ РЕЗУЛЬТАТОВ
// ============================================================
resetBtn.addEventListener('click', openResetModal);
confirmResetNo.addEventListener('click', closeResetModal);
confirmResetYes.addEventListener('click', () => {
    matrixStore = createEmptyStore();
    persistState();
    invalidateAllSolutions();
    renderForDimension();
    closeResetModal();
});
resetModal.addEventListener('click', event => {
    if (event.target === resetModal) closeResetModal();
});

function openResetModal() {
    resetModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    confirmResetNo.focus();
}

function closeResetModal() {
    resetModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function invalidateAllSolutions() {
    currentOptimalPath = null;
    currentView = 'all';
    viewAllBtn.classList.add('active');
    viewOptimalBtn.classList.remove('active');
    viewOptimalBtn.disabled = true;
    resultSection.classList.add('hidden');
    tourStopwatch.classList.add('hidden');
    stopTimer('tour');
    setMainGraphTitle('Весь граф');

    invalidatePathSolution();
}

function invalidatePathSolution() {
    pathOptimalPath = null;
    pathResultSection.classList.add('hidden');
    pathGraphSection.classList.add('hidden');
    pathStopwatch.classList.add('hidden');
    stopTimer('path');
}

// ============================================================
//  ГРАФЫ VIS-NETWORK
// ============================================================
function graphOptions() {
    return {
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
                hover: { background: '#0d3b52', border: '#00e0ff' }
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
            tooltipDelay: 200,
            zoomSpeed: 0.55
        }
    };
}

function initNetwork() {
    nodesDS = new vis.DataSet([]);
    edgesDS = new vis.DataSet([]);
    network = new vis.Network(graphDiv, { nodes: nodesDS, edges: edgesDS }, graphOptions());
    installViewportGuard(network, mainFindGraphBtn);
}

function initPathNetwork() {
    pathNodesDS = new vis.DataSet([]);
    pathEdgesDS = new vis.DataSet([]);
    pathNetwork = new vis.Network(pathGraphDiv, { nodes: pathNodesDS, edges: pathEdgesDS }, graphOptions());
    installViewportGuard(pathNetwork, pathFindGraphBtn);
}

function rebuildGraph() {
    syncVisibleMatrix();
    if (!network) initNetwork();

    const nodes = Array.from({ length: n }, (_, i) => ({ id: i, label: String(i + 1) }));
    const edges = [];

    if (currentView === 'optimal' && currentOptimalPath) {
        for (let k = 0; k < currentOptimalPath.length - 1; k++) {
            const a = currentOptimalPath[k];
            const b = currentOptimalPath[k + 1];
            edges.push({
                id: `o${k}-${a}-${b}`,
                from: a,
                to: b,
                label: String(matrix[a][b]),
                color: { color: '#00e0ff' },
                width: 4,
                font: { color: '#00e0ff', size: 13, strokeWidth: 0 }
            });
        }
    } else {
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                edges.push({ id: `e${i}-${j}`, from: i, to: j, label: String(matrix[i][j]) });
            }
        }
    }

    nodesDS.clear();
    nodesDS.add(nodes);
    edgesDS.clear();
    edgesDS.add(edges);

    network.stabilize();
    network.once('stabilizationIterationsDone', () => resetViewport(network, mainFindGraphBtn, true));
}

function rebuildPathGraph(path) {
    if (!pathNetwork) initPathNetwork();

    const ids = [...new Set(path)];
    pathNodesDS.clear();
    pathNodesDS.add(ids.map(id => ({ id, label: String(id + 1) })));

    const edges = [];
    for (let k = 0; k < path.length - 1; k++) {
        const a = path[k];
        const b = path[k + 1];
        edges.push({
            id: `p${k}-${a}-${b}`,
            from: a,
            to: b,
            label: String(matrix[a][b]),
            color: { color: '#51cf66' },
            width: 4,
            font: { color: '#9fffb1', size: 13, strokeWidth: 0 }
        });
    }

    pathEdgesDS.clear();
    pathEdgesDS.add(edges);
    pathNodesDS.update({ id: path[0], color: { background: '#0a5a2a', border: '#51cf66' }, borderWidth: 4 });
    pathNodesDS.update({ id: path[path.length - 1], color: { background: '#5a0a0a', border: '#ff6b6b' }, borderWidth: 4 });

    pathNetwork.stabilize();
    pathNetwork.once('stabilizationIterationsDone', () => resetViewport(pathNetwork, pathFindGraphBtn, true));
}

function installViewportGuard(net, findButton) {
    let correcting = false;

    const inspect = () => {
        if (correcting) return;

        const scale = net.getScale();
        const position = net.getViewPosition();
        const home = viewportHomes.get(net) || { position: { x: 0, y: 0 }, scale: 1 };
        const distance = Math.hypot(position.x - home.position.x, position.y - home.position.y);
        const tooFar = scale < Math.max(0.42, home.scale * 0.48) || distance > 760;

        findButton.classList.toggle('hidden', !tooFar);

        // Жёсткие пределы не дают полностью потерять граф.
        if (scale < 0.24 || scale > 2.9 || distance > 1500) {
            correcting = true;
            const safeScale = Math.min(2.6, Math.max(0.34, scale));
            const factor = distance > 1500 ? 760 / distance : 1;
            const safePosition = {
                x: home.position.x + (position.x - home.position.x) * factor,
                y: home.position.y + (position.y - home.position.y) * factor
            };

            net.moveTo({
                position: safePosition,
                scale: safeScale,
                animation: { duration: 280, easingFunction: 'easeInOutQuad' }
            });

            window.setTimeout(() => { correcting = false; }, 320);
        }
    };

    net.on('zoom', inspect);
    net.on('dragEnd', inspect);
    net.on('animationFinished', inspect);
    findButton.addEventListener('click', () => resetViewport(net, findButton, false));
}

function resetViewport(net, findButton, rememberHome = false) {
    if (!net) return;

    net.fit({
        animation: { duration: 450, easingFunction: 'easeInOutQuad' },
        maxZoomLevel: 1.15
    });

    findButton.classList.add('hidden');

    window.setTimeout(() => {
        if (rememberHome || !viewportHomes.has(net)) {
            viewportHomes.set(net, {
                position: net.getViewPosition(),
                scale: net.getScale()
            });
        }
    }, 500);
}

viewAllBtn.addEventListener('click', () => {
    currentView = 'all';
    viewAllBtn.classList.add('active');
    viewOptimalBtn.classList.remove('active');
    setMainGraphTitle('Весь граф');
    rebuildGraph();
});

viewOptimalBtn.addEventListener('click', () => {
    if (!currentOptimalPath) return;
    currentView = 'optimal';
    viewOptimalBtn.classList.add('active');
    viewAllBtn.classList.remove('active');
    setMainGraphTitle('Оптимальный тур');
    rebuildGraph();
});

function setMainGraphTitle(text) {
    mainGraphTitle.textContent = text;
    mainFullscreenTitle.textContent = text;
}

// ============================================================
//  ДВА НЕЗАВИСИМЫХ СЕКУНДОМЕРА
// ============================================================
function startTimer(kind) {
    const state = timerState[kind];
    const box = kind === 'tour' ? tourStopwatch : pathStopwatch;
    const value = kind === 'tour' ? tourStopwatchValue : pathStopwatchValue;

    clearInterval(state.interval);
    state.startedAt = performance.now();
    value.textContent = '0.0 сек';
    box.classList.remove('hidden');

    state.interval = window.setInterval(() => {
        value.textContent = `${((performance.now() - state.startedAt) / 1000).toFixed(1)} сек`;
    }, 100);
}

function stopTimer(kind, serverTime = null) {
    const state = timerState[kind];
    const value = kind === 'tour' ? tourStopwatchValue : pathStopwatchValue;

    if (state.interval) clearInterval(state.interval);
    state.interval = null;

    if (serverTime !== null && Number.isFinite(Number(serverTime))) {
        const elapsed = Number(serverTime);
        value.textContent = `${elapsed.toFixed(elapsed < 10 ? 3 : 1)} сек`;
    } else if (state.startedAt > 0) {
        const elapsed = (performance.now() - state.startedAt) / 1000;
        value.textContent = `${elapsed.toFixed(elapsed < 10 ? 3 : 1)} сек`;
    }
}

function scrollToElement(element) {
    requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// ============================================================
//  РЕШЕНИЕ ЗАМКНУТОГО ТУРА
// ============================================================
solveBtn.addEventListener('click', async () => {
    syncVisibleMatrix();
    solveBtn.disabled = true;
    solveBtn.textContent = 'Решение...';

    resultSection.classList.remove('hidden');
    resultDiv.innerHTML = '<div class="result-card result-card--pending">Выполняется поиск оптимального тура…</div>';
    startTimer('tour');
    scrollToElement(tourResultAnchor);

    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n, matrix, mode: 'tour' })
        });
        const result = await response.json();
        stopTimer('tour', result.time);

        if (result.error) throw new Error(result.error);

        currentOptimalPath = result.path;
        currentView = 'all';
        viewOptimalBtn.disabled = false;
        viewAllBtn.classList.add('active');
        viewOptimalBtn.classList.remove('active');
        setMainGraphTitle('Весь граф');

        const pathStr = result.path.map(city => city + 1).join(' → ');
        resultDiv.innerHTML = `
            <div class="result-card">
                <p><strong>Оптимальный тур:</strong></p>
                <p class="path">${pathStr}</p>
                <p><strong>Стоимость:</strong> <span class="cost">${result.cost}</span></p>
            </div>`;

        rebuildGraph();
    } catch (error) {
        stopTimer('tour');
        resultDiv.innerHTML = `<p class="error">Ошибка: ${escapeHtml(error.message)}</p>`;
    } finally {
        solveBtn.disabled = false;
        solveBtn.textContent = 'Решить тур';
    }
});

// ============================================================
//  РЕШЕНИЕ ОТКРЫТОГО ПУТИ
// ============================================================
solvePathBtn.addEventListener('click', async () => {
    syncVisibleMatrix();
    const start = Number(startInput.value);
    const end = Number(endInput.value);

    if (start === end) {
        alert('Начальный и конечный города должны различаться');
        return;
    }

    const title = `Оптимальный маршрут между городом ${start + 1} и ${end + 1}`;
    pathResultTitle.textContent = title;
    pathGraphTitle.textContent = title;
    pathFullscreenTitle.textContent = title;
    pathStopwatchLabel.textContent = `Время поиска пути: город ${start + 1} → город ${end + 1}`;

    solvePathBtn.disabled = true;
    solvePathBtn.textContent = 'Поиск...';
    pathResultSection.classList.remove('hidden');
    pathGraphSection.classList.add('hidden');
    pathResultDiv.innerHTML = '<div class="result-card result-card--pending">Выполняется поиск оптимального пути…</div>';
    startTimer('path');
    scrollToElement(pathResultTitle);

    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n, matrix, mode: 'path', start, end })
        });
        const result = await response.json();
        stopTimer('path', result.time);

        if (result.error) throw new Error(result.error);

        pathOptimalPath = result.path;
        const pathStr = result.path.map(city => city + 1).join(' → ');
        pathResultDiv.innerHTML = `
            <div class="result-card">
                <p><strong>Оптимальный путь:</strong></p>
                <p class="path">${pathStr}</p>
                <p><strong>Длина пути:</strong> <span class="cost">${result.cost}</span></p>
            </div>`;

        pathGraphSection.classList.remove('hidden');
        rebuildPathGraph(result.path);
    } catch (error) {
        stopTimer('path');
        pathResultDiv.innerHTML = `<p class="error">Ошибка: ${escapeHtml(error.message)}</p>`;
    } finally {
        solvePathBtn.disabled = false;
        solvePathBtn.textContent = 'Найти путь';
    }
});

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
}

// ============================================================
//  FULLSCREEN
// ============================================================
function enterFullscreen(frame, net) {
    if (frame.requestFullscreen) {
        frame.requestFullscreen().catch(() => frame.classList.add('fullscreen-fallback'));
    } else {
        frame.classList.add('fullscreen-fallback');
    }

    document.body.classList.add('graph-fullscreen-open');
    window.setTimeout(() => {
        net?.redraw();
        resetViewport(net, frame === mainGraphFrame ? mainFindGraphBtn : pathFindGraphBtn, false);
    }, 180);
}

function exitFullscreen(frame, net) {
    if (document.fullscreenElement) document.exitFullscreen();
    frame.classList.remove('fullscreen-fallback');
    document.body.classList.remove('graph-fullscreen-open');

    window.setTimeout(() => {
        net?.redraw();
        resetViewport(net, frame === mainGraphFrame ? mainFindGraphBtn : pathFindGraphBtn, false);
    }, 180);
}

mainFullscreenBtn.addEventListener('click', () => enterFullscreen(mainGraphFrame, network));
pathFullscreenBtn.addEventListener('click', () => enterFullscreen(pathGraphFrame, pathNetwork));
mainFullscreenBack.addEventListener('click', () => exitFullscreen(mainGraphFrame, network));
pathFullscreenBack.addEventListener('click', () => exitFullscreen(pathGraphFrame, pathNetwork));

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        mainGraphFrame.classList.remove('fullscreen-fallback');
        pathGraphFrame.classList.remove('fullscreen-fallback');
        document.body.classList.remove('graph-fullscreen-open');
        window.setTimeout(() => {
            network?.redraw();
            pathNetwork?.redraw();
        }, 120);
    }
});

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;

    closeAllCityPickers();
    if (!resetModal.classList.contains('hidden')) closeResetModal();
    if (mainGraphFrame.classList.contains('fullscreen-fallback')) exitFullscreen(mainGraphFrame, network);
    if (pathGraphFrame.classList.contains('fullscreen-fallback')) exitFullscreen(pathGraphFrame, pathNetwork);
});

// ---------- Инициализация ----------
loadState();
renderForDimension();
setActiveTask('tour');
