const coins = [
    { name: 'Dogecoin', symbol: 'DOGE', id: 'dogecoin', price: 0 },
    { name: 'Cardano', symbol: 'ADA', id: 'cardano', price: 0 },
    { name: 'VeChain', symbol: 'VET', id: 'vechain', price: 0 }
];

let usd = 10000;
let portfolio = { DOGE: 0, ADA: 0, VET: 0 };
let history = [];
let currentChart = null;
let currentCoinId = 'dogecoin'; // По умолчанию DOGE

async function updatePrices() {
    try {
        const ids = coins.map(c => c.id).join(',');
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        const data = await response.json();

        coins.forEach(coin => {
            coin.price = data[coin.id]?.usd || coin.price;
        });

        renderMarket();
        updateTotalValue();
    } catch (error) {
        console.error('Ошибка цен:', error);
    }
}

function renderMarket() {
    const tbody = document.querySelector('#market-table tbody');
    tbody.innerHTML = '';

    coins.forEach(coin => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${coin.name}</strong><br><small>${coin.symbol}</small></td>
            <td>${coin.price.toFixed(4)} USD</td>
            <td>${portfolio[coin.symbol].toFixed(4)}</td>
            <td>
                <input type="number" id="amount-${coin.symbol}" placeholder="Количество" min="0" step="0.0001">
                <button onclick="buy('${coin.symbol}')">Купить</button>
                <button onclick="sell('${coin.symbol}')">Продать</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateTotalValue() {
    let total = usd;
    coins.forEach(coin => {
        total += portfolio[coin.symbol] * coin.price;
    });
    document.getElementById('usd-balance').textContent = usd.toFixed(2);
    document.getElementById('total-value').textContent = total.toFixed(2);
}

function addHistory(text) {
    const ul = document.getElementById('history');
    const li = document.createElement('li');
    li.textContent = `${new Date().toLocaleTimeString('ru-RU')}: ${text}`;
    ul.prepend(li);
}

function buy(symbol) {
    const coin = coins.find(c => c.symbol === symbol);
    const input = document.getElementById(`amount-${symbol}`);
    const amount = parseFloat(input.value);

    if (!amount || amount <= 0) return alert('Введите количество!');
    const cost = amount * coin.price;
    if (cost > usd) return alert('Недостаточно денег!');

    usd -= cost;
    portfolio[symbol] += amount;
    addHistory(`Купил ${amount.toFixed(4)} ${symbol} за ${cost.toFixed(2)} USD`);
    updateTotalValue();
    input.value = '';
}

function sell(symbol) {
    const coin = coins.find(c => c.symbol === symbol);
    const input = document.getElementById(`amount-${symbol}`);
    const amount = parseFloat(input.value);

    if (!amount || amount <= 0) return alert('Введите количество!');
    if (amount > portfolio[symbol]) return alert('Нет столько монет!');

    const revenue = amount * coin.price;
    usd += revenue;
    portfolio[symbol] -= amount;
    addHistory(`Продал ${amount.toFixed(4)} ${symbol} за ${revenue.toFixed(2)} USD`);
    updateTotalValue();
    input.value = '';
}

// Смена монеты на графике
async function changeChart(coinId, coinName) {
    currentCoinId = coinId;

    // Подсветка активной кнопки
    document.querySelectorAll('.coin-buttons button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${coinId === 'dogecoin' ? 'doge' : coinId === 'cardano' ? 'ada' : 'vet'}`).classList.add('active');

    document.getElementById('chart-coin').textContent = `${coinName} (${coinId === 'dogecoin' ? 'DOGE' : coinId === 'cardano' ? 'ADA' : 'VET'})`;

    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1&interval=hourly`);
        const data = await response.json();
        const prices = data.prices;

        const labels = prices.map(p => new Date(p[0]).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
        const values = prices.map(p => p[1]);

        const ctx = document.getElementById('price-chart').getContext('2d');
        if (currentChart) currentChart.destroy();

        currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Цена USD',
                    data: values,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { maxTicksLimit: 8 } }
                }
            }
        });
    } catch (error) {
        console.error('Ошибка графика:', error);
    }
}

// Запуск
updatePrices();
changeChart('dogecoin', 'Dogecoin'); // Первый график сразу

setInterval(updatePrices, 30000); // Цены каждые 30 сек
