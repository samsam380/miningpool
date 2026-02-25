const modeButtons = document.querySelectorAll('.mode-btn');
const modeStat = document.getElementById('modeStat');
const yieldStat = document.getElementById('yieldStat');
const nodeStat = document.getElementById('nodeStat');
const poolHashrateStat = document.getElementById('poolHashrateStat');
const apiStatus = document.getElementById('apiStatus');
const formMessage = document.getElementById('formMessage');
const form = document.getElementById('miningForm');

let selectedMode = 'pool';

function estimateDailyYield(hashrate, fee, mode) {
  const networkFactor = mode === 'solo' ? 0.00000035 : 0.0000005;
  const gross = hashrate * networkFactor;
  const net = gross * (1 - fee / 100);
  return net.toFixed(8);
}

function syncModeUI() {
  modeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === selectedMode);
  });

  modeStat.textContent = selectedMode === 'solo' ? 'Solo Mining' : 'Pool Mining';
  const defaultPort = selectedMode === 'solo' ? '3334' : '3333';
  const stratumInput = document.getElementById('stratumUrl');
  const current = stratumInput.value.trim();

  if (current.includes(':3333') || current.includes(':3334')) {
    stratumInput.value = current.replace(/:(3333|3334)$/, `:${defaultPort}`);
  }
}

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedMode = btn.dataset.mode;
    syncModeUI();
    form.dispatchEvent(new Event('submit'));
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const rpcHost = document.getElementById('rpcHost').value.trim();
  const hashrate = Number(document.getElementById('hashrate').value);
  const fee = Number(document.getElementById('fee').value);

  if (!rpcHost || Number.isNaN(hashrate) || Number.isNaN(fee)) {
    formMessage.textContent = 'Please fill all required fields.';
    return;
  }

  const dailyYield = estimateDailyYield(hashrate, fee, selectedMode);

  yieldStat.textContent = `${dailyYield} BTC`;
  nodeStat.textContent = rpcHost;

  const settings = {
    mode: selectedMode,
    rpcHost,
    stratumUrl: document.getElementById('stratumUrl').value.trim(),
    workerName: document.getElementById('workerName').value.trim(),
    btcAddress: document.getElementById('btcAddress').value.trim(),
    hashrate,
    fee,
  };

  localStorage.setItem('sam256MiningPreview', JSON.stringify(settings));
  formMessage.textContent = 'Configuration saved. Use this with your ASIC profile settings.';
});

function bootstrapFromStorage() {
  const raw = localStorage.getItem('sam256MiningPreview');
  if (!raw) {
    form.dispatchEvent(new Event('submit'));
    return;
  }

  try {
    const saved = JSON.parse(raw);

    if (saved.mode === 'pool' || saved.mode === 'solo') {
      selectedMode = saved.mode;
    }

    ['stratumUrl', 'rpcHost', 'workerName', 'btcAddress', 'hashrate', 'fee'].forEach((id) => {
      if (saved[id] !== undefined) {
        document.getElementById(id).value = saved[id];
      }
    });

    syncModeUI();
    form.dispatchEvent(new Event('submit'));
  } catch {
    form.dispatchEvent(new Event('submit'));
  }
}

function formatHashrate(value) {
  if (!value || Number.isNaN(Number(value))) {
    return '0 H/s';
  }

  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
  let hash = Number(value);
  let idx = 0;

  while (hash >= 1000 && idx < units.length - 1) {
    hash /= 1000;
    idx += 1;
  }

  return `${hash.toFixed(2)} ${units[idx]}`;
}

async function refreshPoolStats() {
  try {
    const response = await fetch('/api/pools');
    if (!response.ok) {
      throw new Error('Pool API unavailable');
    }

    const payload = await response.json();
    const pools = payload?.pools ?? [];
    const poolId = selectedMode === 'solo' ? 'btc-solo' : 'btc-pool';
    const activePool = pools.find((pool) => pool.id === poolId) ?? pools[0];

    if (!activePool) {
      poolHashrateStat.textContent = 'No pool stats yet';
      apiStatus.textContent = 'API connected, waiting for first shares';
      return;
    }

    poolHashrateStat.textContent = formatHashrate(activePool.poolStats?.poolHashrate ?? 0);
    apiStatus.textContent = 'API connected';
  } catch {
    poolHashrateStat.textContent = 'API offline';
    apiStatus.textContent = 'API not reachable yet';
  }
}

syncModeUI();
bootstrapFromStorage();
refreshPoolStats();
setInterval(refreshPoolStats, 30000);
