const modeButtons = document.querySelectorAll('.mode-btn');
const modeStat = document.getElementById('modeStat');
const yieldStat = document.getElementById('yieldStat');
const nodeStat = document.getElementById('nodeStat');
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
  formMessage.textContent = 'Configuration saved in browser storage (prototype mode).';
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

syncModeUI();
bootstrapFromStorage();
