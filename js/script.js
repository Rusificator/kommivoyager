// ============================================================
// script.js — TSP-клиент: persistent matrix + две визуализации
// ============================================================
'use strict';

const MAX_N = 15;
const MIN_N = 3;
const STORAGE_MATRIX = 'tsp.matrix.v2';
const STORAGE_N = 'tsp.n.v2';

let n = MIN_N;
let matrixStore = createEmptyStore();
let matrix = [];

let network = null;
let nodesDS = null;
let edgesDS = null;
let pathNetwork = null;
let pathNodesDS = null;
let pathEdgesDS = null;

let currentOptimalPath = null;
let currentView = 'all';
let pathOptimalPath = null;
let stopwatchTimer = null;
let stopwatchStartedAt = 0;

const nInput = document.getElementById('n');
const nDisplay = document.getElementById('nDisplay');
const nUpBtn = document.getElementById('nUpBtn');
const nDownBtn = document.getElementById('nDownBtn');
const randomBtn = document.getElementById('randomBtn');
const resetBtn = document.getElementById('resetBtn');
const solveBtn = document.getElementById('solveBtn');
const matrixContainer = document.getElementById('matrix-container');
const matrixSection = document.getElementById('matrix-section');
const matrixSizeBadge = document.getElementById('matrixSizeBadge');
const resultSection = document.getElementById('result-section');
const resultDiv = document.getElementById('result');
const graphSection = document.getElementById('graph-section');
const graphDiv = document.getElementById('graph');
const pathSection = document.getElementById('path-section');
const startSelect = document.getElementById('startCity');
const endSelect = document.getElementById('endCity');
const solvePathBtn = document.getElementById('solvePathBtn');
const pathResultDiv = document.getElementById('path-result');
const pathGraphSection = document.getElementById('path-graph-section');
const pathGraphDiv = document.getElementById('pathGraph');
const pathGraphTitle = document.getElementById('pathGraphTitle');
const mainGraphTitle = document.getElementById('mainGraphTitle');
const mainFullscreenTitle = document.getElementById('mainFullscreenTitle');
const pathFullscreenTitle = document.getElementById('pathFullscreenTitle');
const viewAllBtn = document.getElementById('viewAllBtn');
const viewOptimalBtn = document.getElementById('viewOptimalBtn');
const calculatorContainer = document.getElementById('calculatorContainer');

const stopwatch = document.getElementById('stopwatch');
const stopwatchLabel = document.getElementById('stopwatchLabel');
const stopwatchValue = document.getElementById('stopwatchValue');

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

function createEmptyStore() {
    return Array.from({ length: MAX_N }, (_, i) =>
        Array.from({ length: MAX_N }, (_, j) => i === j ? 0 : 0)
    );
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_MATRIX));
        if (Array.isArray(saved) && saved.length === MAX_N && saved.every(row => Array.isArray(row) && row.length === MAX_N)) {
            matrixStore = saved.map((row, i) => row.map((v, j) => i === j ? 0 : Math.max(0, Number(v) || 0)));
        }
        const savedN = Number(localStorage.getItem(STORAGE_N));
        n = Number.isInteger(savedN) && savedN >= MIN_N && savedN <= MAX_N ? savedN : MIN_N;
    } catch (_) {
        matrixStore = createEmptyStore();
        n = MIN_N;
    }
}

function persistState() {
    localStorage.setItem(STORAGE_MATRIX, JSON.stringify(matrixStore));
    localStorage.setItem(STORAGE_N, String(n));
}

function syncVisibleMatrix() {
    matrix = matrixStore.slice(0, n).map(row => row.slice(0, n));
}

function setN(nextN) {
    const value = Math.max(MIN_N, Math.min(MAX_N, Number(nextN) || MIN_N));
    if (value === n) return;
    n = value;
    persistState();
    resetSolutionState();
    renderForDimension();
}

function renderForDimension() {
    syncVisibleMatrix();
    nInput.value = String(n);
    nDisplay.textContent = String(n);
    matrixSizeBadge.textContent = `${n} × ${n}`;
    nUpBtn.disabled = n >= MAX_N;
    nDownBtn.disabled = n <= MIN_N;
    calculatorContainer.classList.toggle('matrix-wide', n >= 13);
    calculatorContainer.classList.toggle('matrix-medium', n >= 10 && n < 13);
    renderMatrix();
    populateSelects();
    rebuildGraph();
}

nUpBtn.addEventListener('click', () => setN(n + 1));
nDownBtn.addEventListener('click', () => setN(n - 1));
nInput.addEventListener('change', () => setN(parseInt(nInput.value, 10)));
nInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); setN(n + 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setN(n - 1); }
});

randomBtn.addEventListener('click', () => {
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const w = Math.floor(Math.random() * 90) + 10;
            matrixStore[i][j] = w;
            matrixStore[j][i] = w;
        }
    }
    persistState();
    resetSolutionState();
    renderForDimension();
});

resetBtn.addEventListener('click', () => openResetModal());
confirmResetNo.addEventListener('click', closeResetModal);
confirmResetYes.addEventListener('click', () => {
    matrixStore = createEmptyStore();
    persistState();
    resetSolutionState();
    renderForDimension();
    closeResetModal();
});
resetModal.addEventListener('click', e => { if (e.target === resetModal) closeResetModal(); });

function openResetModal() {
    resetModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    confirmResetNo.focus();
}
function closeResetModal() {
    resetModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function resetSolutionState() {
    currentOptimalPath = null;
    pathOptimalPath = null;
    currentView = 'all';
    viewAllBtn.classList.add('active');
    viewOptimalBtn.classList.remove('active');
    viewOptimalBtn.disabled = true;
    resultSection.classList.add('hidden');
    pathResultDiv.classList.add('hidden');
    pathGraphSection.classList.add('hidden');
    setMainGraphTitle('Весь граф');
}

function renderMatrix() {
    let html = '<table class="matrix-table"><thead><tr><th></th>';
    for (let j = 0; j < n; j++) html += `<th>${j + 1}</th>`;
    html += '</tr></thead><tbody>';

    for (let i = 0; i < n; i++) {
        html += `<tr><th>${i + 1}</th>`;
        for (let j = 0; j < n; j++) {
            if (i === j) {
                html += '<td><input type="number" class="cell readonly" value="0" readonly tabindex="-1"></td>';
            } else {
                html += `<td><input type="number" inputmode="decimal" class="cell" data-i="${i}" data-j="${j}" value="${matrixStore[i][j]}" min="0"></td>`;
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    matrixContainer.innerHTML = html;

    matrixContainer.querySelectorAll('input.cell:not(.readonly)').forEach(inp => {
        inp.addEventListener('input', e => {
            const i = Number(e.target.dataset.i);
            const j = Number(e.target.dataset.j);
            let v = Number(e.target.value);
            if (!Number.isFinite(v) || v < 0) v = 0;
            matrixStore[i][j] = v;
            matrixStore[j][i] = v;
            const mirror = matrixContainer.querySelector(`input[data-i="${j}"][data-j="${i}"]`);
            if (mirror && document.activeElement !== mirror) mirror.value = String(v);
            persistState();
            syncVisibleMatrix();
            invalidateSolutionsAfterEdit();
        });
    });
}

function invalidateSolutionsAfterEdit() {
    currentOptimalPath = null;
    pathOptimalPath = null;
    currentView = 'all';
    viewOptimalBtn.disabled = true;
    viewAllBtn.classList.add('active');
    viewOptimalBtn.classList.remove('active');
    resultSection.classList.add('hidden');
    pathResultDiv.classList.add('hidden');
    pathGraphSection.classList.add('hidden');
    setMainGraphTitle('Весь граф');
    rebuildGraph();
}

function populateSelects() {
    const oldStart = Math.min(Number(startSelect.value) || 0, n - 1);
    const oldEnd = Math.min(Number(endSelect.value) || n - 1, n - 1);
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    for (let i = 0; i < n; i++) {
        startSelect.add(new Option(`Город ${i + 1}`, String(i)));
        endSelect.add(new Option(`Город ${i + 1}`, String(i)));
    }
    startSelect.value = String(oldStart);
    endSelect.value = String(oldEnd === oldStart ? (oldStart === n - 1 ? 0 : n - 1) : oldEnd);
}

function graphOptions() {
    return {
        physics: {
            enabled: true,
            barnesHut: { gravitationalConstant: -4000, centralGravity: 0.3, springLength: 180, springConstant: 0.05, damping: 0.09 },
            stabilization: { iterations: 250 }
        },
        nodes: {
            shape: 'circle', size: 26,
            color: { background: '#1a1a2e', border: '#42dcff', highlight: { background: '#0d3b52', border: '#00e0ff' }, hover: { background: '#0d3b52', border: '#00e0ff' } },
            font: { color: '#fff', size: 16, face: 'Segoe UI' }, borderWidth: 2
        },
        edges: { color: { color: 'rgba(160,180,200,0.25)', highlight: '#42dcff', hover: '#42dcff' }, width: 1, font: { color: '#8a8aa3', size: 11, strokeWidth: 0, align: 'middle' }, smooth: false },
        interaction: { hover: true, dragNodes: true, dragView: true, zoomView: true, tooltipDelay: 200, zoomSpeed: 0.7 }
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
            const a = currentOptimalPath[k], b = currentOptimalPath[k + 1];
            edges.push({ id: `o${k}-${a}-${b}`, from: a, to: b, label: String(matrix[a][b]), color: { color: '#00e0ff' }, width: 4, font: { color: '#00e0ff', size: 13, strokeWidth: 0 } });
        }
    } else {
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push({ id: `e${i}-${j}`, from: i, to: j, label: String(matrix[i][j]) });
    }

    nodesDS.clear(); nodesDS.add(nodes);
    edgesDS.clear(); edgesDS.add(edges);
    network.stabilize();
    network.once('stabilizationIterationsDone', () => resetViewport(network, mainFindGraphBtn));
}

function rebuildPathGraph(path) {
    if (!pathNetwork) initPathNetwork();
    const ids = [...new Set(path)];
    pathNodesDS.clear();
    pathNodesDS.add(ids.map(id => ({ id, label: String(id + 1) })));
    const edges = [];
    for (let k = 0; k < path.length - 1; k++) {
        const a = path[k], b = path[k + 1];
        edges.push({ id: `p${k}-${a}-${b}`, from: a, to: b, label: String(matrix[a][b]), color: { color: '#51cf66' }, width: 4, font: { color: '#9fffb1', size: 13, strokeWidth: 0 } });
    }
    pathEdgesDS.clear(); pathEdgesDS.add(edges);
    pathNodesDS.update({ id: path[0], color: { background: '#0a5a2a', border: '#51cf66' }, borderWidth: 4 });
    pathNodesDS.update({ id: path[path.length - 1], color: { background: '#5a0a0a', border: '#ff6b6b' }, borderWidth: 4 });
    pathNetwork.stabilize();
    pathNetwork.once('stabilizationIterationsDone', () => resetViewport(pathNetwork, pathFindGraphBtn));
}

// Ограничиваем экстремальный zoom. Сильное смещение не блокируем резко — показываем
// кнопку возврата, а при совсем большом уходе мягко возвращаем камеру ближе к графу.
function installViewportGuard(net, findButton) {
    let correcting = false;
    const inspect = () => {
        if (correcting) return;
        const scale = net.getScale();
        const pos = net.getViewPosition();
        const distance = Math.hypot(pos.x, pos.y);
        const far = scale < 0.48 || distance > 850;
        findButton.classList.toggle('hidden', !far);

        if (scale < 0.28 || scale > 2.8 || distance > 1800) {
            correcting = true;
            const safeScale = Math.min(2.5, Math.max(0.38, scale));
            const factor = distance > 1800 ? 850 / distance : 1;
            net.moveTo({ position: { x: pos.x * factor, y: pos.y * factor }, scale: safeScale, animation: { duration: 280, easingFunction: 'easeInOutQuad' } });
            setTimeout(() => { correcting = false; }, 320);
        }
    };
    net.on('zoom', inspect);
    net.on('dragEnd', inspect);
    net.on('animationFinished', inspect);
    findButton.addEventListener('click', () => resetViewport(net, findButton));
}

function resetViewport(net, findButton) {
    if (!net) return;
    net.fit({ animation: { duration: 450, easingFunction: 'easeInOutQuad' }, maxZoomLevel: 1.15 });
    findButton.classList.add('hidden');
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

function startStopwatch(label) {
    clearInterval(stopwatchTimer);
    stopwatch.classList.remove('hidden');
    stopwatchLabel.textContent = label;
    stopwatchStartedAt = performance.now();
    stopwatchValue.textContent = '0.0 сек';
    stopwatchTimer = setInterval(() => {
        stopwatchValue.textContent = `${((performance.now() - stopwatchStartedAt) / 1000).toFixed(1)} сек`;
    }, 100);
}

function stopStopwatch(serverTime) {
    clearInterval(stopwatchTimer);
    stopwatchTimer = null;
    const elapsed = serverTime != null ? Number(serverTime) : (performance.now() - stopwatchStartedAt) / 1000;
    stopwatchValue.textContent = `${elapsed.toFixed(elapsed < 10 ? 3 : 1)} сек`;
}

solveBtn.addEventListener('click', async () => {
    syncVisibleMatrix();
    solveBtn.disabled = true;
    solveBtn.textContent = 'Решение...';
    resultSection.classList.add('hidden');
    startStopwatch('Время поиска тура:');

    try {
        const response = await fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ n, matrix, mode: 'tour' }) });
        const result = await response.json();
        stopStopwatch(result.time);
        if (result.error) throw new Error(result.error);

        currentOptimalPath = result.path;
        currentView = 'all';
        viewOptimalBtn.disabled = false;
        viewAllBtn.classList.add('active');
        viewOptimalBtn.classList.remove('active');
        setMainGraphTitle('Весь граф');

        const pathStr = result.path.map(c => c + 1).join(' → ');
        resultDiv.innerHTML = `<div class="result-card"><p><strong>Оптимальный тур:</strong></p><p class="path">${pathStr}</p><p><strong>Стоимость:</strong> <span class="cost">${result.cost}</span></p><p class="time">Время решения: ${result.time} сек</p></div>`;
        resultSection.classList.remove('hidden');
        rebuildGraph();
    } catch (err) {
        stopStopwatch();
        resultDiv.innerHTML = `<p class="error">Ошибка: ${escapeHtml(err.message)}</p>`;
        resultSection.classList.remove('hidden');
    } finally {
        solveBtn.disabled = false;
        solveBtn.textContent = 'Решить (тур)';
    }
});

solvePathBtn.addEventListener('click', async () => {
    syncVisibleMatrix();
    const start = Number(startSelect.value), end = Number(endSelect.value);
    if (start === end) { alert('Начальный и конечный города должны различаться'); return; }

    solvePathBtn.disabled = true;
    solvePathBtn.textContent = 'Поиск...';
    pathResultDiv.classList.add('hidden');
    startStopwatch(`Время поиска пути ${start + 1} → ${end + 1}:`);

    try {
        const response = await fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ n, matrix, mode: 'path', start, end }) });
        const result = await response.json();
        stopStopwatch(result.time);
        if (result.error) throw new Error(result.error);

        pathOptimalPath = result.path;
        const pathStr = result.path.map(c => c + 1).join(' → ');
        pathResultDiv.innerHTML = `<div class="result-card"><p><strong>Оптимальный путь:</strong></p><p class="path">${pathStr}</p><p><strong>Длина пути:</strong> <span class="cost">${result.cost}</span></p><p class="time">Время решения: ${result.time} сек</p></div>`;
        pathResultDiv.classList.remove('hidden');

        const title = `Оптимальный маршрут между городом ${start + 1} и ${end + 1}`;
        pathGraphTitle.textContent = title;
        pathFullscreenTitle.textContent = title;
        pathGraphSection.classList.remove('hidden');
        rebuildPathGraph(result.path);
    } catch (err) {
        stopStopwatch();
        pathResultDiv.innerHTML = `<p class="error">Ошибка: ${escapeHtml(err.message)}</p>`;
        pathResultDiv.classList.remove('hidden');
    } finally {
        solvePathBtn.disabled = false;
        solvePathBtn.textContent = 'Найти путь';
    }
});

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function enterFullscreen(frame, net) {
    if (frame.requestFullscreen) {
        frame.requestFullscreen().catch(() => frame.classList.add('fullscreen-fallback'));
    } else {
        frame.classList.add('fullscreen-fallback');
    }
    document.body.classList.add('graph-fullscreen-open');
    setTimeout(() => { net?.redraw(); resetViewport(net, frame === mainGraphFrame ? mainFindGraphBtn : pathFindGraphBtn); }, 180);
}

function exitFullscreen(frame, net) {
    if (document.fullscreenElement) document.exitFullscreen();
    frame.classList.remove('fullscreen-fallback');
    document.body.classList.remove('graph-fullscreen-open');
    setTimeout(() => { net?.redraw(); resetViewport(net, frame === mainGraphFrame ? mainFindGraphBtn : pathFindGraphBtn); }, 180);
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
        setTimeout(() => { network?.redraw(); pathNetwork?.redraw(); }, 120);
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (!resetModal.classList.contains('hidden')) closeResetModal();
        if (mainGraphFrame.classList.contains('fullscreen-fallback')) exitFullscreen(mainGraphFrame, network);
        if (pathGraphFrame.classList.contains('fullscreen-fallback')) exitFullscreen(pathGraphFrame, pathNetwork);
    }
});

loadState();
renderForDimension();
