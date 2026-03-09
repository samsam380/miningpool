const stratumUrl = document.getElementById('stratumUrl');
const workerName = document.getElementById('workerName');
const btcAddress = document.getElementById('btcAddress');
const minerPass = document.getElementById('minerPass');
const cliExample = document.getElementById('cliExample');
const formMessage = document.getElementById('formMessage');

const poolModeBtn = document.getElementById('poolModeBtn');
const soloModeBtn = document.getElementById('soloModeBtn');

const modeStat = document.getElementById('modeStat');
const poolHashrateStat = document.getElementById('poolHashrateStat');
const workerCountStat = document.getElementById('workerCountStat');
const networkHeightStat = document.getElementById('networkHeightStat');
const apiStatus = document.getElementById('apiStatus');

const chartCanvas = document.getElementById('hashrateChart');

const ENDPOINTS = {
  pool: 'stratum+tcp://161.97.137.172:3333',
  solo: 'stratum+tcp://161.97.137.172:3334'
};

let selectedMode = 'pool';
const history = [];
const maxSamples = 30;

function formatHashrate(value) {
  let hash = Number(value) || 0;
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
  let idx = 0;

  while (hash >= 1000 && idx < units.length - 1) {
    hash /= 1000;
    idx += 1;
  }

  return `${hash.toFixed(2)} ${units[idx]}`;
}

function updateCliExample() {
  const url = stratumUrl.value.trim() || ENDPOINTS.pool;
  const worker = workerName.value.trim() || 'worker01';
  const address = btcAddress.value.trim() || 'bc1YOURADDRESS';
  const pass = minerPass.value.trim() || 'x';

  cliExample.textContent = `cgminer -o ${url} -u ${address}.${worker} -p ${pass}`;
}

function syncModeUI() {
  poolModeBtn.classList.toggle('active', selectedMode === 'pool');
  soloModeBtn.classList.toggle('active', selectedMode === 'solo');
  modeStat.textContent = selectedMode === 'solo' ? 'Solo Mining' : 'Pool Mining';
  stratumUrl.value = selectedMode === 'solo' ? ENDPOINTS.solo : ENDPOINTS.pool;
  updateCliExample();
}

function drawChart() {
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext('2d');
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const padding = 24;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i++) {
    const y = padding + ((height - padding * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  if (history.length < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText('Waiting for enough data points...', padding, height / 2);
    return;
  }

  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = Math.max(max - min, max * 0.05, 1);

  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f3b232';

  history.forEach((value, index) => {
    const x = padding + (index / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  const last = history[history.length - 1];
  const lastX = width - padding;
  const lastY = height - padding - ((last - min) / range) * (height - padding * 2);

  ctx.beginPath();
  ctx.fillStyle = '#f3b232';
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fill();
}

async function refreshPoolStats() {
  try {
    const response = await fetch('/api/pools', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Pool API unavailable');
    }

    const payload = await response.json();
    const pools = payload?.pools ?? [];
    const poolId = selectedMode === 'solo' ? 'btc-solo' : 'btc-pool';
    const activePool = pools.find((pool) => pool.id === poolId) ?? pools[0];

    if (!activePool) {
      poolHashrateStat.textContent = 'No pool stats yet';
      workerCountStat.textContent = 'N/A';
      networkHeightStat.textContent = 'N/A';
      apiStatus.textContent = 'API connected, waiting for first shares';
      drawChart();
      return;
    }

    const hashrate = Number(activePool.poolStats?.poolHashrate ?? 0);
    const connectedMiners = activePool.poolStats?.connectedMiners ?? 0;
    const blockHeight = activePool.networkStats?.blockHeight ?? 'N/A';

    poolHashrateStat.textContent = formatHashrate(hashrate);
    workerCountStat.textContent = String(connectedMiners);
    networkHeightStat.textContent = String(blockHeight);
    apiStatus.textContent = 'API connected';

    if (Number.isFinite(hashrate) && hashrate >= 0) {
      history.push(hashrate);
      if (history.length > maxSamples) history.shift();
    }

    drawChart();
  } catch (err) {
    poolHashrateStat.textContent = 'API offline';
    workerCountStat.textContent = 'API offline';
    networkHeightStat.textContent = 'API offline';
    apiStatus.textContent = 'API not reachable yet';
    drawChart();
  }
}

poolModeBtn.addEventListener('click', () => {
  selectedMode = 'pool';
  syncModeUI();
  refreshPoolStats();
});

soloModeBtn.addEventListener('click', () => {
  selectedMode = 'solo';
  syncModeUI();
  refreshPoolStats();
});

stratumUrl.addEventListener('input', updateCliExample);
workerName.addEventListener('input', updateCliExample);
btcAddress.addEventListener('input', updateCliExample);
minerPass.addEventListener('input', updateCliExample);

document.getElementById('miningForm').addEventListener('submit', (event) => {
  event.preventDefault();
  updateCliExample();
  formMessage.textContent = 'Configuration preview updated below.';
});

syncModeUI();
updateCliExample();
drawChart();
refreshPoolStats();
setInterval(refreshPoolStats, 15000);
