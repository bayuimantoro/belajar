document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const balanceEl = document.getElementById('balance');
    const balanceTitleEl = document.getElementById('balance-title');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const transactionListEl = document.getElementById('transaction-list');
    const emptyStateEl = document.getElementById('empty-state');
    const form = document.getElementById('form');
    const textInput = document.getElementById('text');
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const transactionIdInput = document.getElementById('transaction-id');
    const formTitle = document.getElementById('form-title');
    const fab = document.getElementById('fab');
    const modalContainer = document.getElementById('modal-container');
    const closeModalBtn = document.getElementById('close-modal');
    const walletSwitcher = document.querySelector('.wallet-switcher');
    const themeSelect = document.getElementById('theme-select');
    const categoryFilterEl = document.getElementById('category-filter');
    const html = document.documentElement;
    // BARU: Elemen untuk grafik dan view switcher
    const showBalanceBtn = document.getElementById('show-balance-btn');
    const showChartBtn = document.getElementById('show-chart-btn');
    const balanceView = document.getElementById('balance-view');
    const chartView = document.getElementById('chart-view');

    // === APP STATE ===
    let transactions = JSON.parse(localStorage.getItem('transactions_v2')) || [];
    let currentWallet = localStorage.getItem('activeWallet_v2') || 'tunai';
    let currentFilter = 'all';
    let editingID = null;
    let expenseChart = null; // BARU: Variabel untuk menyimpan instance grafik

    // === CONFIGURATION ===
    const categories = {
        income: [
            { id: 'gaji', text: 'Gaji', icon: 'fa-money-bill-wave' },
            { id: 'hadiah', text: 'Hadiah', icon: 'fa-gift' },
            { id: 'lain-pemasukan', text: 'Lainnya', icon: 'fa-receipt' }
        ],
        expense: [
            { id: 'makanan', text: 'Makanan & Minuman', icon: 'fa-utensils' },
            { id: 'transportasi', text: 'Transportasi', icon: 'fa-bus' },
            { id: 'belanja', text: 'Belanja', icon: 'fa-shopping-bag' },
            { id: 'tagihan', text: 'Tagihan', icon: 'fa-file-invoice-dollar' },
            { id: 'hiburan', text: 'Hiburan', icon: 'fa-film' },
            { id: 'kesehatan', text: 'Kesehatan', icon: 'fa-heartbeat' },
            { id: 'lain-pengeluaran', text: 'Lainnya', icon: 'fa-ellipsis-h' }
        ]
    };
    
    // === MAIN FUNCTIONS ===

    // Renders everything based on current state
    function init() {
        updateWalletUI();
        renderTransactions();
        updateBalanceAndSummary();
        populateCategoryFilter();
        renderExpenseChart(); // MODIFIKASI: Panggil fungsi render grafik
    }

    // Renders the transaction list (Sama seperti sebelumnya)
    function renderTransactions() {
        // ... kode sama ...
        transactionListEl.innerHTML = '';
        
        let filteredTransactions = transactions
            .filter(t => t.wallet === currentWallet)
            .filter(t => currentFilter === 'all' || t.category === currentFilter)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredTransactions.length === 0) {
            emptyStateEl.style.display = 'block';
            transactionListEl.style.display = 'none';
        } else {
            emptyStateEl.style.display = 'none';
            transactionListEl.style.display = 'block';
            
            let lastDate = null;
            filteredTransactions.forEach(transaction => {
                const transactionDate = new Date(transaction.date).setHours(0, 0, 0, 0);
                if (transactionDate !== lastDate) {
                    addDateHeader(transactionDate);
                    lastDate = transactionDate;
                }
                addTransactionToDOM(transaction);
            });
        }
    }

    // Adds a single transaction item to the DOM (Sama seperti sebelumnya)
    function addTransactionToDOM(transaction) {
        // ... kode sama ...
        const type = transaction.amount > 0 ? 'income' : 'expense';
        const category = findCategory(transaction.category, type);

        const item = document.createElement('li');
        item.classList.add(type);
        item.innerHTML = `
            <div class="category-icon">
                <i class="fas ${category.icon}"></i>
            </div>
            <div class="transaction-details">
                <span>${transaction.text}</span>
                <span>${category.text}</span>
            </div>
            <div class="transaction-amount">
                ${formatMoney(transaction.amount)}
            </div>
            <div class="transaction-actions">
                <button class="action-btn edit-btn" onclick="prepareEditTransaction(${transaction.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" onclick="confirmRemoveTransaction(${transaction.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        transactionListEl.appendChild(item);
    }
    
    // Handles form submission (Sama, karena sudah memanggil init())
    function handleFormSubmit(e) {
        // ... kode sama ...
        e.preventDefault();
        
        const type = document.querySelector('input[name="transaction-type"]:checked').value;
        const amountValue = +amountInput.value;
        const transactionData = {
            text: textInput.value,
            amount: type === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue),
            category: categorySelect.value,
            wallet: currentWallet,
            date: new Date().toISOString()
        };

        if (editingID) {
            const index = transactions.findIndex(t => t.id === editingID);
            const originalDate = transactions[index].date;
            transactions[index] = { ...transactions[index], ...transactionData, date: originalDate };
        } else {
            transactions.push({ ...transactionData, id: generateID() });
        }
        
        closeModal();
        updateLocalStorage();
        init();
    }
    
    // Updates balance card (Sama seperti sebelumnya)
    function updateBalanceAndSummary() {
        // ... kode sama ...
        const walletTransactions = transactions.filter(t => t.wallet === currentWallet);
        const amounts = walletTransactions.map(t => t.amount);
        
        const total = amounts.reduce((acc, item) => (acc += item), 0);
        const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
        const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0);
        
        animateValue(balanceEl, parseFloat(balanceEl.dataset.currentValue) || 0, total);
        animateValue(totalIncomeEl, parseFloat(totalIncomeEl.dataset.currentValue) || 0, income);
        animateValue(totalExpenseEl, parseFloat(totalExpenseEl.dataset.currentValue) || 0, expense);

        balanceEl.dataset.currentValue = total;
        totalIncomeEl.dataset.currentValue = income;
        totalExpenseEl.dataset.currentValue = expense;
    }

    // BARU: Fungsi untuk merender atau memperbarui grafik pengeluaran
    function renderExpenseChart() {
        const walletTransactions = transactions.filter(t => t.wallet === currentWallet);
        const expenseData = walletTransactions
            .filter(t => t.amount < 0)
            .reduce((acc, t) => {
                const categoryInfo = findCategory(t.category, 'expense');
                acc[categoryInfo.text] = (acc[categoryInfo.text] || 0) + Math.abs(t.amount);
                return acc;
            }, {});

        const labels = Object.keys(expenseData);
        const data = Object.values(expenseData);

        if (expenseChart) {
            expenseChart.destroy();
        }

        const chartWrapper = chartView.querySelector('.chart-wrapper');
        if (labels.length === 0) {
            chartWrapper.innerHTML = '<p style="text-align:center; color: var(--text-secondary-color); padding-top: 50px;">Tidak ada data pengeluaran untuk ditampilkan.</p>';
            return;
        } else {
            chartWrapper.innerHTML = '<canvas id="expense-chart"></canvas>';
        }

        const chartColors = ['#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#2ecc71', '#e67e22', '#1abc9c'];

        expenseChart = new Chart(document.getElementById('expense-chart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pengeluaran',
                    data: data,
                    backgroundColor: chartColors,
                    borderColor: 'var(--panel-bg-color)',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-color)',
                            font: { family: "'Poppins', sans-serif" }
                        }
                    }
                }
            }
        });
    }

    // === HELPER & UI FUNCTIONS ===

    // ... (Fungsi prepareEditTransaction dan confirmRemoveTransaction sama, karena sudah memanggil init()) ...
    window.prepareEditTransaction = (id) => {
        // ... kode sama ...
        editingID = id;
        const transaction = transactions.find(t => t.id === id);
        
        formTitle.innerText = 'Edit Transaksi';
        transactionIdInput.value = transaction.id;
        textInput.value = transaction.text;
        amountInput.value = Math.abs(transaction.amount);
        
        const type = transaction.amount > 0 ? 'income' : 'expense';
        document.getElementById(`${type}-radio`).checked = true;
        
        populateCategoryOptions(type);
        categorySelect.value = transaction.category;
        
        openModal();
    }

    window.confirmRemoveTransaction = (id) => {
        if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
            transactions = transactions.filter(t => t.id !== id);
            updateLocalStorage();
            init();
        }
    }

    // ... (Fungsi switchWallet sama, karena sudah memanggil init()) ...
    function switchWallet(e) {
        if (e.target.classList.contains('wallet-btn')) {
            currentWallet = e.target.dataset.wallet;
            updateLocalStorage();
            init();
        }
    }
    
    // ... (Fungsi UI lainnya sama) ...
    function updateWalletUI() {
        document.querySelectorAll('.wallet-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.wallet-btn[data-wallet="${currentWallet}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        balanceTitleEl.innerText = `SALDO ${currentWallet.toUpperCase()}`;
    }

    function openModal() { modalContainer.classList.add('show'); }

    function closeModal() {
        modalContainer.classList.remove('show');
        form.reset();
        populateCategoryOptions('income');
        editingID = null;
        formTitle.innerText = 'Tambah Transaksi Baru';
        transactionIdInput.value = '';
    }
    
    function populateCategoryOptions(type) {
        const catList = categories[type];
        categorySelect.innerHTML = catList.map(c => `<option value="${c.id}">${c.text}</option>`).join('');
    }

    function populateCategoryFilter() {
        const allCats = [...categories.income, ...categories.expense];
        const options = allCats.map(c => `<option value="${c.id}">${c.text}</option>`).join('');
        categoryFilterEl.innerHTML = `<option value="all">Semua Kategori</option>${options}`;
        categoryFilterEl.value = currentFilter;
    }

    function handleFilterChange(e) {
        currentFilter = e.target.value;
        renderTransactions();
    }
    
    function switchTheme(e) {
        const selectedTheme = e.target.value;
        html.setAttribute('data-theme', selectedTheme);
        localStorage.setItem('theme_v2', selectedTheme);
    }
    
    function loadInitialTheme() {
        const savedTheme = localStorage.getItem('theme_v2') || 'light';
        html.setAttribute('data-theme', savedTheme);
        themeSelect.value = savedTheme;
    }

    // BARU: Fungsi untuk beralih antara tampilan Saldo dan Grafik
    function switchSummaryView(viewToShow) {
        if (viewToShow === 'chart') {
            balanceView.classList.remove('active');
            chartView.classList.add('active');
            showBalanceBtn.classList.remove('active');
            showChartBtn.classList.add('active');
        } else {
            chartView.classList.remove('active');
            balanceView.classList.add('active');
            showChartBtn.classList.remove('active');
            showBalanceBtn.classList.add('active');
        }
    }

    // === UTILITY FUNCTIONS ===
    // ... (Semua fungsi utility sama) ...
    const findCategory = (id, type) => categories[type].find(c => c.id === id) || { text: 'N/A', icon: 'fa-question-circle' };
    const generateID = () => Math.floor(Math.random() * 1000000000);
    const formatMoney = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
    
    function addDateHeader(date) {
        const li = document.createElement('li');
        li.classList.add('date-header');
        li.innerText = formatDate(date);
        transactionListEl.appendChild(li);
    }
    
    function formatDate(date) {
        const today = new Date().setHours(0, 0, 0, 0);
        const yesterday = new Date(today).setDate(new Date(today).getDate() - 1);
        if (date === today) return 'Hari Ini';
        if (date === yesterday) return 'Kemarin';
        return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function animateValue(obj, start, end) {
        let startTimestamp = null;
        const duration = 800;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentValue = progress * (end - start) + start;
            obj.innerHTML = formatMoney(currentValue);
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }
    
    const updateLocalStorage = () => {
        localStorage.setItem('transactions_v2', JSON.stringify(transactions));
        localStorage.setItem('activeWallet_v2', currentWallet);
    };

    // === EVENT LISTENERS ===
    fab.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    modalContainer.addEventListener('click', (e) => (e.target === modalContainer) && closeModal());
    form.addEventListener('submit', handleFormSubmit);
    walletSwitcher.addEventListener('click', switchWallet);
    themeSelect.addEventListener('change', switchTheme);
    categoryFilterEl.addEventListener('change', handleFilterChange);
    document.querySelectorAll('input[name="transaction-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => populateCategoryOptions(e.target.value));
    });
    // BARU: Event listener untuk tombol view switcher
    showBalanceBtn.addEventListener('click', () => switchSummaryView('balance'));
    showChartBtn.addEventListener('click', () => switchSummaryView('chart'));

    // === INITIALIZATION ===
    loadInitialTheme();
    populateCategoryOptions('income');
    init();
});