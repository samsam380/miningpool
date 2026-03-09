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

const chartCurrentHashrate = document.getElementById('chartCurrentHashrate');
const chartAvg5m = document.getElementById('chartAvg5m');
const chartAvg30m = document.getElementById('chartAvg30m');
const chartAvg60m = document.getElementById('chartAvg60m');

const chartCanvas = document.getElementById('hashrateChart');

const ENDPOINTS = {
  pool: 'stratum+tcp://161.97.137.172:3333',
  solo: 'stratum+tcp://161.97.137.172:3334'
};

let selectedMode = 'pool';
let hashrateChart = null;

const history = [];
const maxSamples = 60;
const refreshSeconds = 15;

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

function formatAxisHashrate(value) {
  const num = Number(value) || 0;

  if (num <= 0) return '0 H/s';

  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
  let scaled = num;
  let idx = 0;

  while (scaled >= 1000 && idx < units.length - 1) {
    scaled /= 1000;
    idx += 1;
  }

  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(decimals)} ${units[idx]}`;
}

function averageOfLastSeconds(seconds) {
  const cutoff = Date.now() - seconds * 1000;
  const relevant = history.filter((point) => point.timestamp >= cutoff);

  if (!relevant.length) return null;

  const sum = relevant.reduce((acc, point) => acc + point.hashrate, 0);
  return sum / relevant.length;
}

function updateAverageCards() {
  const current = history.length ? history[history.length - 1].hashrate : null;
  const avg5 = averageOfLastSeconds(5 * 60);
  const avg30 = averageOfLastSeconds(30 * 60);
  const avg60 = averageOfLastSeconds(60 * 60);

  if (chartCurrentHashrate) {
    chartCurrentHashrate.textContent = current === null ? 'Waiting for API' : formatHashrate(current);
  }
  if (chartAvg5m) {
    chartAvg5m.textContent = avg5 === null ? 'Waiting for API' : formatHashrate(avg5);
  }
  if (chartAvg30m) {
    chartAvg30m.textContent = avg30 === null ? 'Waiting for API' : formatHashrate(avg30);
  }
  if (chartAvg60m) {
    chartAvg60m.textContent = avg60 === null ? 'Waiting for API' : formatHashrate(avg60);
  }
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

function roundUpNice(value) {
  if (value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);

  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * Math.pow(10, exponent);
}

function buildChartSeries() {
  const slots = maxSamples;
  const padded = new Array(slots).fill(null);
  const startIndex = Math.max(0, slots - history.length);

  for (let i = 0; i < history.length; i += 1) {
    padded[startIndex + i] = history[i];
  }

  const labels = padded.map((point, index) => {
    if (!point) return '';
    const date = new Date(point.timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  });

  const currentSeries = padded.map((point) => (point ? point.hashrate : null));

  const rollingAverage = (windowSize) =>
    padded.map((point, index) => {
      if (!point) return null;

      const from = Math.max(0, index - windowSize + 1);
      const slice = padded.slice(from, index + 1).filter(Boolean);
      if (!slice.length) return null;

      const sum = slice.reduce((acc, item) => acc + item.hashrate, 0);
      return sum / slice.length;
    });

  // 15s refresh:
  // 5 min = 20 samples
  // 30 min = 120 samples, but capped by history length/maxSamples
  // 60 min = 240 samples, but capped by history length/maxSamples
  const avg5Series = rollingAverage(Math.max(1, Math.round((5 * 60) / refreshSeconds)));
  const avg30Series = rollingAverage(Math.max(1, Math.round((30 * 60) / refreshSeconds)));
  const avg60Series = rollingAverage(Math.max(1, Math.round((60 * 60) / refreshSeconds)));

  return {
    labels,
    currentSeries,
    avg5Series,
    avg30Series,
    avg60Series
  };
}

function getSuggestedYAxisMax(values) {
  const filtered = values.filter((v) => Number.isFinite(v) && v >= 0);
  const maxValue = filtered.length ? Math.max(...filtered) : 0;

  if (maxValue <= 0) {
    return 50 * 1e12;
  }

  return roundUpNice(maxValue * 1.25);
}

function ensureChart() {
  if (!chartCanvas || typeof Chart === 'undefined') return null;
  if (hashrateChart) return hashrateChart;

  const ctx = chartCanvas.getContext('2d');

  hashrateChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: new Array(maxSamples).fill(''),
      datasets: [
        {
          label: 'Current Hashrate',
          data: new Array(maxSamples).fill(null),
          borderColor: '#f2a65a',
          backgroundColor: 'rgba(242, 166, 90, 0.18)',
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#f2a65a',
          tension: 0.35,
          fill: false,
          spanGaps: false
        },
        {
          label: '5 Min Average',
          data: new Array(maxSamples).fill(null),
          borderColor: '#7cc4ff',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false,
          spanGaps: false
        },
        {
          label: '30 Min Average',
          data: new Array(maxSamples).fill(null),
          borderColor: '#c7d2da',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false,
          spanGaps: false
        },
        {
          label: '60 Min Average',
          data: new Array(maxSamples).fill(null),
          borderColor: '#8fe388',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false,
          spanGaps: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      layout: {
        padding: {
          left: 8,
          right: 12,
          top: 8,
          bottom: 0
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(9, 25, 33, 0.96)',
          borderColor: 'rgba(255,255,255,0.14)',
          borderWidth: 1,
          titleColor: '#ffffff',
          bodyColor: '#d8e6eb',
          padding: 12,
          displayColors: true,
          callbacks: {
            title(items) {
              const item = items?.[0];
              if (!item) return '';

              const point = history[item.dataIndex - Math.max(0, maxSamples - history.length)];
              if (!point) return 'Waiting for data';

              return new Date(point.timestamp).toLocaleString([], {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            },
            label(context) {
              const value = context.parsed.y;
              if (value === null || value === undefined) return `${context.dataset.label}: —`;
              return `${context.dataset.label}: ${formatHashrate(value)}`;
            }
          }
        }
      },
      scales: {
        x: {
          offset: false,
          grid: {
            color: 'rgba(255,255,255,0.06)',
            drawBorder: false
          },
          ticks: {
            color: 'rgba(220,235,240,0.72)',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          },
          border: {
            display: false
          }
        },
        y: {
          position: 'right',
          beginAtZero: true,
          min: 0,
          suggestedMax: 50 * 1e12,
          grid: {
            color: 'rgba(255,255,255,0.10)',
            drawBorder: false
          },
          ticks: {
            color: 'rgba(220,235,240,0.82)',
            count: 5,
            callback(value) {
              return formatAxisHashrate(value);
            }
          },
          border: {
            display: false
          }
        }
      }
    }
  });

  return hashrateChart;
}

function updateChart() {
  const chart = ensureChart();
  if (!chart) return;

  const { labels, currentSeries, avg5Series, avg30Series, avg60Series } = buildChartSeries();
  const allValues = [...currentSeries, ...avg5Series, ...avg30Series, ...avg60Series];
  const yMax = getSuggestedYAxisMax(allValues);

  chart.data.labels = labels;
  chart.data.datasets[0].data = currentSeries;
  chart.data.datasets[1].data = avg5Series;
  chart.data.datasets[2].data = avg30Series;
  chart.data.datasets[3].data = avg60Series;
  chart.options.scales.y.suggestedMax = yMax;
  chart.update('none');
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
      updateAverageCards();
      updateChart();
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
      history.push({
        timestamp: Date.now(),
        hashrate
      });

      if (history.length > maxSamples) {
        history.shift();
      }
    }

    updateAverageCards();
    updateChart();
  } catch (err) {
    poolHashrateStat.textContent = 'API offline';
    workerCountStat.textContent = 'API offline';
    networkHeightStat.textContent = 'API offline';
    apiStatus.textContent = 'API not reachable yet';

    if (chartCurrentHashrate) chartCurrentHashrate.textContent = 'Waiting for API';
    if (chartAvg5m) chartAvg5m.textContent = 'Waiting for API';
    if (chartAvg30m) chartAvg30m.textContent = 'Waiting for API';
    if (chartAvg60m) chartAvg60m.textContent = 'Waiting for API';

    updateChart();
  }
}

poolModeBtn.addEventListener('click', () => {
  selectedMode = 'pool';
  history.length = 0;
  syncModeUI();
  updateAverageCards();
  updateChart();
  refreshPoolStats();
});

soloModeBtn.addEventListener('click', () => {
  selectedMode = 'solo';
  history.length = 0;
  syncModeUI();
  updateAverageCards();
  updateChart();
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
updateAverageCards();
updateChart();
refreshPoolStats();
setInterval(refreshPoolStats, refreshSeconds * 1000);
