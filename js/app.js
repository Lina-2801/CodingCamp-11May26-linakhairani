const form = document.getElementById('transaction-form');
const itemNameInput = document.getElementById('item-name');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const customCategoryLabel = document.getElementById('custom-category-label');
const customCategoryInput = document.getElementById('custom-category');
const balanceEl = document.getElementById('balance');
const listEl = document.getElementById('transaction-list');
const itemCountEl = document.getElementById('item-count');
const removeAllBtn = document.getElementById('remove-all-btn');
const sortSelect = document.getElementById('sort-select');
const chartCanvas = document.getElementById('spending-chart');

const STORAGE_KEY = 'expenseBudgetTransactions';
let transactions = [];
let currentSort = 'date-desc';
let spendingChart;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function loadTransactions() {
  const stored = localStorage.getItem(STORAGE_KEY);
  transactions = stored ? JSON.parse(stored) : [];
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function getCategoryTotals() {
  return transactions.reduce((totals, item) => {
    totals[item.category] = (totals[item.category] || 0) + item.amount;
    return totals;
  }, {});
}

function updateBalance() {
  const total = transactions.reduce((sum, item) => sum + item.amount, 0);
  balanceEl.textContent = formatCurrency(total);
}

function updateItemCount() {
  const count = transactions.length;
  itemCountEl.textContent = `${count} item${count === 1 ? '' : 's'}`;
}

function sortTransactions(transactions, sortBy) {
  const sorted = [...transactions];
  
  switch (sortBy) {
    case 'date-desc':
      return sorted.sort((a, b) => new Date(b.id) - new Date(a.id));
    case 'date-asc':
      return sorted.sort((a, b) => new Date(a.id) - new Date(b.id));
    case 'category':
      return sorted.sort((a, b) => a.category.localeCompare(b.category));
    case 'amount-desc':
      return sorted.sort((a, b) => b.amount - a.amount);
    case 'amount-asc':
      return sorted.sort((a, b) => a.amount - b.amount);
    default:
      return sorted;
  }
}

function renderTransactions() {
  listEl.innerHTML = '';

  if (transactions.length === 0) {
    const emptyNote = document.createElement('div');
    emptyNote.textContent = 'No transactions yet. Add one to start tracking spending.';
    emptyNote.style.color = '#6b7280';
    emptyNote.style.padding = '18px';
    listEl.appendChild(emptyNote);
    return;
  }

  const sortedTransactions = sortTransactions(transactions, currentSort);

  sortedTransactions.forEach((transaction) => {
    const item = document.createElement('div');
    item.className = 'transaction-item';

    const info = document.createElement('div');
    info.className = 'transaction-info';

    const name = document.createElement('div');
    name.className = 'transaction-name';
    name.textContent = transaction.name;

    const meta = document.createElement('div');
    meta.className = 'transaction-meta';
    meta.innerHTML = `
      <span>${formatCurrency(transaction.amount)}</span>
      <span class="category-badge">${transaction.category}</span>
    `;

    info.append(name, meta);

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-btn';
    removeButton.type = 'button';
    removeButton.textContent = 'Delete';
    removeButton.addEventListener('click', () => removeTransaction(transaction.id));

    item.append(info, removeButton);
    listEl.appendChild(item);
  });
}

function createChart() {
  const categoryTotals = getCategoryTotals();
  const categories = Object.keys(categoryTotals);
  const categoryColors = {
    Food: '#3f40ae',
    Transport: '#14b8a6',
    Fun: '#efec3a',
    default: '#d83f2e',
  };
  const data = categories.map((category) => categoryTotals[category]);
  const colors = categories.map((category) => categoryColors[category] || categoryColors.default);
  const totalSpent = data.reduce((sum, value) => sum + value, 0);
  const placeholderId = 'chart-placeholder';
  let placeholder = document.getElementById(placeholderId);

  if (totalSpent === 0) {
    if (spendingChart) {
      spendingChart.destroy();
      spendingChart = null;
    }

    chartCanvas.style.display = 'none';

    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.id = placeholderId;
      placeholder.className = 'chart-placeholder';
      placeholder.textContent = 'Add a transaction to see your spending chart.';
      chartCanvas.parentNode.appendChild(placeholder);
    }

    return;
  }

  chartCanvas.style.display = '';
  if (placeholder) {
    placeholder.remove();
  }

  if (spendingChart) {
    spendingChart.data.datasets[0].data = data;
    spendingChart.update();
    return;
  }

  spendingChart = new Chart(chartCanvas, {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${formatCurrency(context.parsed)}`,
          },
        },
      },
    },
  });
}

function updateApp() {
  saveTransactions();
  updateBalance();
  updateItemCount();
  renderTransactions();
  createChart();
  if (removeAllBtn) {
    removeAllBtn.disabled = transactions.length === 0;
  }
}

categorySelect.addEventListener('change', () => {
  if (categorySelect.value === 'Custom') {
    customCategoryLabel.classList.remove('hidden');
    customCategoryInput.required = true;
  } else {
    customCategoryLabel.classList.add('hidden');
    customCategoryInput.required = false;
    customCategoryInput.value = '';
  }
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  renderTransactions();
});

function addTransaction(name, amount, category) {
  transactions.push({
    id: Date.now().toString(),
    name,
    amount,
    category,
  });
  updateApp();
}

function removeTransaction(id) {
  transactions = transactions.filter((transaction) => transaction.id !== id);
  updateApp();
}

function removeAllTransactions() {
  transactions = [];
  updateApp();
}

function clearForm() {
  itemNameInput.value = '';
  amountInput.value = '';
  categorySelect.value = '';
  itemNameInput.focus();
}

function playCoinClink() {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const now = audioContext.currentTime;
  for (let i = 0; i < 3; i += 1) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520 + i * 90, now + i * 0.03);
    gain.gain.setValueAtTime(0, now + i * 0.03);
    gain.gain.linearRampToValueAtTime(0.16, now + i * 0.03 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.18);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(now + i * 0.03);
    osc.stop(now + i * 0.03 + 0.2);
  }

  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let j = 0; j < data.length; j += 1) {
    data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (audioContext.sampleRate * 0.1));
  }
  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.12, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  noise.connect(noiseGain).connect(audioContext.destination);
  noise.start(now);
  noise.stop(now + 0.1);
}

function animateButtonCoins(button) {
  const totalCoins = 12;
  const totalSparkles = 8;
  const originLeft = button.clientWidth * 0.2;
  const originRight = button.clientWidth * 0.8;

  for (let index = 0; index < totalCoins; index += 1) {
    const coin = document.createElement('span');
    coin.className = 'coin-dot';
    const left = originLeft + Math.random() * (originRight - originLeft);
    const size = 8 + Math.random() * 8;
    const delay = Math.random() * 0.16;
    coin.style.left = `${left}px`;
    coin.style.bottom = '8px';
    coin.style.width = `${size}px`;
    coin.style.height = `${size}px`;
    coin.style.animationDelay = `${delay}s`;
    coin.style.opacity = '0';

    button.appendChild(coin);
    coin.addEventListener('animationend', () => coin.remove());
  }

  for (let index = 0; index < totalSparkles; index += 1) {
    const sparkle = document.createElement('span');
    sparkle.className = 'sparkle-dot';
    const left = originLeft + Math.random() * (originRight - originLeft);
    const size = 4 + Math.random() * 4;
    const delay = Math.random() * 0.16;
    sparkle.style.left = `${left}px`;
    sparkle.style.bottom = '10px';
    sparkle.style.width = `${size}px`;
    sparkle.style.height = `${size}px`;
    sparkle.style.animationDelay = `${delay}s`;
    sparkle.style.opacity = '0';

    button.appendChild(sparkle);
    sparkle.addEventListener('animationend', () => sparkle.remove());
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = itemNameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  let category = categorySelect.value;

  if (category === 'Custom') {
    category = customCategoryInput.value.trim();
  }

  if (!name || !amount || !category) {
    alert('Please fill in all fields before adding a transaction.');
    return;
  }

  playCoinClink();
  animateButtonCoins(event.submitter || event.target.querySelector('button'));
  addTransaction(name, amount, category);
  clearForm();
});

if (removeAllBtn) {
  removeAllBtn.addEventListener('click', removeAllTransactions);
}

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const THEME_STORAGE_KEY = 'expenseBudgetTheme';

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  setTheme(savedTheme);
}

if (themeToggle) {
  themeToggle.addEventListener('click', toggleTheme);
}

window.addEventListener('DOMContentLoaded', () => {
  loadTransactions();
  loadTheme();
  updateApp();
});
