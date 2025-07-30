document.addEventListener('DOMContentLoaded', () => {
    // === PEMILIHAN ELEMEN DOM ===
    const balance = document.getElementById('balance');
    const totalIncome = document.getElementById('total-income');
    const totalExpense = document.getElementById('total-expense');
    const transactionList = document.getElementById('transaction-list');
    const form = document.getElementById('form');
    const textInput = document.getElementById('text');
    const amountInput = document.getElementById('amount');
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // === STATE APLIKASI ===
    // Coba ambil transaksi dari localStorage, atau gunakan array kosong jika tidak ada
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
                // Jika pengeluaran, buat jumlahnya menjadi negatif
                amount: type === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue)
            };

            transactions.push(transaction);
            addTransactionToDOM(transaction);
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

    // 4. Fungsi untuk menghapus transaksi berdasarkan ID
    window.removeTransaction = function(id) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        updateLocalStorage();
        init(); // Inisialisasi ulang tampilan
    }

    // 5. Fungsi untuk memperbarui saldo, pemasukan, dan pengeluaran
    function updateValues() {
        const amounts = transactions.map(transaction => transaction.amount);

        const total = amounts.reduce((acc, item) => (acc += item), 0);
        const income = amounts
            .filter(item => item > 0)
            .reduce((acc, item) => (acc += item), 0);
        const expense = amounts
            .filter(item => item < 0)
            .reduce((acc, item) => (acc += item), 0) * -1; // dikali -1 agar jadi positif

        balance.innerText = formatMoney(total);
        totalIncome.innerText = formatMoney(income);
        totalExpense.innerText = formatMoney(expense);
    }
    
    // 6. Fungsi untuk format uang ke Rupiah
    function formatMoney(number) {
        return 'Rp ' + number.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    // 7. Fungsi untuk menyimpan transaksi ke localStorage
    function updateLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }
    
    // 8. Fungsi untuk menginisialisasi aplikasi
    function init() {
        transactionList.innerHTML = '';
        transactions.forEach(addTransactionToDOM);
        updateValues();
    }
    
    // === PENGATURAN TEMA (LIGHT/DARK MODE) ===
    function switchTheme() {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update ikon tombol
        themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    // Cek tema yang tersimpan di localStorage saat halaman dimuat
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';


    // === EVENT LISTENERS ===
    form.addEventListener('submit', addTransaction);
    themeToggle.addEventListener('click', switchTheme);

    // === JALANKAN APLIKASI ===
    init();
});

// Pastikan fungsi removeTransaction bisa diakses secara global
// karena dipanggil dari string HTML
window.removeTransaction = window.removeTransaction || {};