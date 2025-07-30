document.addEventListener('DOMContentLoaded', () => {
    // === PEMILIHAN ELEMEN DOM ===
    const balanceTitle = document.getElementById('balance-title'); // MODIFIKASI
    const balance = document.getElementById('balance');
    const totalIncome = document.getElementById('total-income');
    const totalExpense = document.getElementById('total-expense');
    const transactionList = document.getElementById('transaction-list');
    const form = document.getElementById('form');
    const textInput = document.getElementById('text');
    const amountInput = document.getElementById('amount');
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    // BARU: Elemen untuk pemilih dompet
    const walletSwitcher = document.querySelector('.wallet-switcher');
    const btnTunai = document.getElementById('btn-tunai');
    const btnBank = document.getElementById('btn-bank');

    // === STATE APLIKASI ===
    // BARU: State untuk melacak dompet yang aktif
    let currentWallet = localStorage.getItem('activeWallet') || 'tunai';

    const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));
    let transactions = localStorage.getItem('transactions') !== null ? localStorageTransactions : [];

    // === FUNGSI-FUNGSI ===

    // 1. Fungsi untuk menambah transaksi
    function addTransaction(e) {
        e.preventDefault();

        const type = document.querySelector('input[name="transaction-type"]:checked').value;
        const amountValue = +amountInput.value;

        if (textInput.value.trim() === '' || amountInput.value.trim() === '') {
            alert('Mohon isi deskripsi dan jumlah transaksi.');
        } else {
            const transaction = {
                id: generateID(),
                text: textInput.value,
                amount: type === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue),
                wallet: currentWallet // BARU: Menambahkan info dompet ke transaksi
            };

            transactions.push(transaction);
            // MODIFIKASI: Hanya tambahkan ke DOM jika sesuai dengan dompet aktif
            if (transaction.wallet === currentWallet) {
                addTransactionToDOM(transaction);
            }
            updateValues();
            updateLocalStorage();

            textInput.value = '';
            amountInput.value = '';
        }
    }
    
    // 2. Fungsi untuk membuat ID unik
    function generateID() {
        return Math.floor(Math.random() * 1000000000);
    }

    // 3. Fungsi untuk menampilkan transaksi di DOM
    function addTransactionToDOM(transaction) {
        const sign = transaction.amount < 0 ? '-' : '+';
        const item = document.createElement('li');
        item.classList.add(transaction.amount < 0 ? 'expense' : 'income');
        item.innerHTML = `
            ${transaction.text} <span>${sign}${formatMoney(Math.abs(transaction.amount))}</span>
            <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
        `;
        transactionList.appendChild(item);
    }

    // 4. Fungsi untuk menghapus transaksi
    window.removeTransaction = function(id) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        updateLocalStorage();
        init();
    }

    // 5. Fungsi untuk memperbarui saldo, pemasukan, dan pengeluaran
    function updateValues() {
        // MODIFIKASI: Filter transaksi berdasarkan dompet yang aktif saat ini
        const filteredTransactions = transactions.filter(t => t.wallet === currentWallet);
        
        const amounts = filteredTransactions.map(transaction => transaction.amount);

        const total = amounts.reduce((acc, item) => (acc += item), 0);
        const income = amounts
            .filter(item => item > 0)
            .reduce((acc, item) => (acc += item), 0);
        const expense = amounts
            .filter(item => item < 0)
            .reduce((acc, item) => (acc += item), 0) * -1;

        balance.innerText = formatMoney(total);
        totalIncome.innerText = formatMoney(income);
        totalExpense.innerText = formatMoney(expense);
    }
    
    // 6. Fungsi untuk format uang ke Rupiah
    function formatMoney(number) {
        return 'Rp ' + number.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    // 7. Fungsi untuk menyimpan data ke localStorage
    function updateLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        // BARU: Simpan juga dompet yang aktif
        localStorage.setItem('activeWallet', currentWallet);
    }
    
    // 8. Fungsi untuk menginisialisasi aplikasi
    function init() {
        transactionList.innerHTML = '';
        
        // MODIFIKASI: Tampilkan UI sesuai dompet yang aktif
        updateWalletUI();

        // MODIFIKASI: Filter dan tampilkan transaksi untuk dompet yang aktif
        transactions
            .filter(t => t.wallet === currentWallet)
            .forEach(addTransactionToDOM);
        
        updateValues();
    }

    // BARU: Fungsi untuk mengubah dompet
    function switchWallet(e) {
        if (e.target.classList.contains('wallet-btn')) {
            currentWallet = e.target.dataset.wallet;
            init(); // Inisialisasi ulang seluruh UI
        }
    }
    
    // BARU: Fungsi untuk memperbarui tampilan pemilih dompet
    function updateWalletUI() {
        if (currentWallet === 'tunai') {
            balanceTitle.innerText = 'SALDO TUNAI';
            btnTunai.classList.add('active');
            btnBank.classList.remove('active');
        } else {
            balanceTitle.innerText = 'SALDO BANK';
            btnBank.classList.add('active');
            btnTunai.classList.remove('active');
        }
    }
    
    // --- PENGATURAN TEMA (LIGHT/DARK MODE) ---
    function switchTheme() {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

    // === EVENT LISTENERS ===
    form.addEventListener('submit', addTransaction);
    themeToggle.addEventListener('click', switchTheme);
    walletSwitcher.addEventListener('click', switchWallet); // BARU

    // === JALANKAN APLIKASI ===
    init();
});

// Pastikan fungsi removeTransaction bisa diakses secara global
window.removeTransaction = window.removeTransaction || {};