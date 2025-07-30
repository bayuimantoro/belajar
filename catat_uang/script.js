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

    // === APP STATE ===
    let transactions = JSON.parse(localStorage.getItem('transactions_v2')) || [];
    let currentWallet = localStorage.getItem('activeWallet_v2') || 'tunai';
    let currentFilter = 'all';
    let editingID = null;

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
    }

    // Renders the transaction list
    function renderTransactions() {
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

    // Adds a single transaction item to the DOM
    function addTransactionToDOM(transaction) {
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
    
    // Handles form submission for both adding and editing
    function handleFormSubmit(e) {
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
            // Update existing transaction
            const index = transactions.findIndex(t => t.id === editingID);
            const originalDate = transactions[index].date; // Keep original date
            transactions[index] = { ...transactions[index], ...transactionData, date: originalDate };
        } else {
            // Add new transaction
            transactions.push({ ...transactionData, id: generateID() });
        }
        
        closeModal();
        updateLocalStorage();
        init();
    }
    
    // Updates balance card
    function updateBalanceAndSummary() {
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

    // === HELPER & UI FUNCTIONS ===

    window.prepareEditTransaction = (id) => {
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

    function switchWallet(e) {
        if (e.target.classList.contains('wallet-btn')) {
            currentWallet = e.target.dataset.wallet;
            updateLocalStorage();
            init();
        }
    }
    
    function updateWalletUI() {
        document.querySelectorAll('.wallet-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.wallet-btn[data-wallet="${currentWallet}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        balanceTitleEl.innerText = `SALDO ${currentWallet.toUpperCase()}`;
    }

    function openModal() {
        modalContainer.classList.add('show');
    }

    function closeModal() {
        modalContainer.classList.remove('show');
        form.reset();
        populateCategoryOptions('income'); // Reset to default
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

    // === UTILITY FUNCTIONS ===
    
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

    // === INITIALIZATION ===
    loadInitialTheme();
    populateCategoryOptions('income');
    init();
});