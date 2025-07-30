document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const appWrapper = document.getElementById('app-wrapper');
    const html = document.documentElement;

    // === APP STATE ===
    let transactions = JSON.parse(localStorage.getItem('transactions_v2')) || [];
    let categories = JSON.parse(localStorage.getItem('categories_v2')) || {
        income: [{ id: 'gaji', text: 'Gaji', icon: 'fa-money-bill-wave' }, { id: 'uang-jajan', text: 'Uang Jajan', icon: 'fa-coins' }, { id: 'lain-pemasukan', text: 'Lainnya', icon: 'fa-receipt' }],
        expense: [{id:'makanan',text:'Makanan & Minuman',icon:'fa-utensils'},{id:'transportasi',text:'Transportasi',icon:'fa-bus'},{id:'belanja',text:'Belanja',icon:'fa-shopping-bag'},{id:'tagihan',text:'Tagihan',icon:'fa-file-invoice-dollar'},{id:'hiburan',text:'Hiburan',icon:'fa-film'},{id:'kesehatan',text:'Kesehatan',icon:'fa-heartbeat'},{id:'lain-pengeluaran',text:'Lainnya',icon:'fa-ellipsis-h'}],
        transfer: [{id:'transfer',text:'Transfer',icon:'fa-exchange-alt'}]
    };
    let currentWallet = localStorage.getItem('activeWallet_v2') || 'tunai';
    let currentFilter = 'all';
    let searchQuery = '';
    let startDate = null, endDate = null;
    let editingID = null;
    let expenseChart, incomeChart;
    // PIN State
    let pin = localStorage.getItem('app_pin') || null;
    let enteredPin = '';
    let isSettingPin = false;
    let pinToConfirm = '';

    // === DYNAMIC HTML INJECTION ===
    function injectModals() {
        document.getElementById('modal-container').innerHTML = `
            <div class="modal-content">
                <button class="close-modal">×</button>
                <h3 id="form-title">Tambah Transaksi Baru</h3>
                <form id="form">
                    <input type="hidden" id="transaction-id">
                    <div class="form-control"><label for="text">Deskripsi</label><input type="text" id="text" placeholder="Contoh: Makan siang" required></div>
                    <div class="form-control"><label for="amount">Jumlah (Rp)</label><input type="number" id="amount" placeholder="Contoh: 25000" required inputmode="numeric"></div>
                    <div class="form-control"><label for="category">Kategori</label><select id="category" required></select></div>
                    <div class="form-control radio-group"><input type="radio" id="income-radio" name="transaction-type" value="income" checked><label for="income-radio">Pemasukan</label><input type="radio" id="expense-radio" name="transaction-type" value="expense"><label for="expense-radio">Pengeluaran</label></div>
                    <button class="btn">Simpan Transaksi</button>
                </form>
            </div>`;
        
        document.getElementById('transfer-modal-container').innerHTML = `
            <div class="modal-content">
                <button class="close-modal">×</button>
                <h3>Transfer Antar Dompet</h3>
                <form id="transfer-form">
                    <div class="form-control"><label for="transfer-amount">Jumlah (Rp)</label><input type="number" id="transfer-amount" placeholder="Masukkan jumlah transfer" required></div>
                    <div class="transfer-wallets">
                        <div class="form-control"><label for="from-wallet">Dari</label><select id="from-wallet" required><option value="bank">Rekening Bank</option><option value="tunai">Dompet Tunai</option></select></div>
                        <i class="fas fa-arrow-right"></i>
                        <div class="form-control"><label for="to-wallet">Ke</label><select id="to-wallet" required><option value="tunai">Dompet Tunai</option><option value="bank">Rekening Bank</option></select></div>
                    </div>
                    <button class="btn">Lakukan Transfer</button>
                </form>
            </div>`;
        
        document.getElementById('settings-modal-container').innerHTML = `
            <div class="modal-content">
                <button class="close-modal">×</button>
                <h3>Pengaturan</h3>
                <div class="category-manager"><h4>Kategori Pemasukan</h4><ul id="income-category-list" class="category-list"></ul><form class="add-category-form" id="add-income-category-form"><input type="text" placeholder="Nama kategori baru..." required><button class="btn" type="submit">+</button></form></div>
                <div class="category-manager"><h4>Kategori Pengeluaran</h4><ul id="expense-category-list" class="category-list"></ul><form class="add-category-form" id="add-expense-category-form"><input type="text" placeholder="Nama kategori baru..." required><button class="btn" type="submit">+</button></form></div>
                <div class="pin-setting-section"><h4>Keamanan</h4><div class="form-control"><label for="pin-toggle">Kunci Aplikasi dengan PIN</label><label class="toggle-switch"><input type="checkbox" id="pin-toggle"><span class="slider"></span></label></div><button class="btn" id="change-pin-btn" style="display:none;">Ubah PIN</button></div>
            </div>`;
        
        document.getElementById('pin-lock-container').innerHTML = `
            <div class="pin-prompt">
                <h2 id="pin-prompt-title">Masukkan PIN</h2>
                <div class="pin-display" id="pin-display">
                    <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
                </div>
                <!-- PERBAIKAN: Menambahkan ID yang hilang -->
                <div class="pin-keypad" id="pin-keypad">
                    <button class="keypad-btn" data-key="1">1</button><button class="keypad-btn" data-key="2">2</button><button class="keypad-btn" data-key="3">3</button>
                    <button class="keypad-btn" data-key="4">4</button><button class="keypad-btn" data-key="5">5</button><button class="keypad-btn" data-key="6">6</button>
                    <button class="keypad-btn" data-key="7">7</button><button class="keypad-btn" data-key="8">8</button><button class="keypad-btn" data-key="9">9</button>
                    <button class="keypad-btn action"></button><button class="keypad-btn" data-key="0">0</button><button class="keypad-btn action" data-key="backspace"><i class="fas fa-backspace"></i></button>
                </div>
            </div>`;
    }
    
    // === PIN LOCK LOGIC ===
    function handlePinInput(key) {
        const pinDisplay = document.getElementById('pin-display');
        const pinPromptTitle = document.getElementById('pin-prompt-title');

        if (key === 'backspace') {
            if (enteredPin.length > 0) enteredPin = enteredPin.slice(0, -1);
        } else if (enteredPin.length < 4) {
            enteredPin += key;
        }

        updatePinDisplay();

        if (enteredPin.length === 4) {
            if (isSettingPin) {
                if (pinToConfirm === '') {
                    pinToConfirm = enteredPin;
                    enteredPin = '';
                    pinPromptTitle.innerText = 'Konfirmasi PIN Baru';
                    setTimeout(updatePinDisplay, 100);
                } else {
                    if (pinToConfirm === enteredPin) {
                        pin = enteredPin;
                        localStorage.setItem('app_pin', pin);
                        alert('PIN berhasil diatur!');
                        unlockApp();
                    } else {
                        pinDisplay.parentElement.parentElement.classList.add('error');
                        pinPromptTitle.innerText = 'PIN tidak cocok! Coba lagi.';
                        enteredPin = '';
                        pinToConfirm = '';
                        setTimeout(() => {
                            pinDisplay.parentElement.parentElement.classList.remove('error');
                            pinPromptTitle.innerText = 'Buat PIN Baru';
                            updatePinDisplay();
                        }, 800);
                    }
                }
            } else { // Check existing PIN
                if (enteredPin === pin) {
                    unlockApp();
                } else {
                    pinDisplay.parentElement.parentElement.classList.add('error');
                    enteredPin = '';
                    setTimeout(() => {
                        pinDisplay.parentElement.parentElement.classList.remove('error');
                        updatePinDisplay();
                    }, 800);
                }
            }
        }
    }

    function updatePinDisplay() {
        const dots = document.querySelectorAll('#pin-display .pin-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('filled', index < enteredPin.length);
        });
    }
    
    function showPinLockScreen(isSetting = false) {
        const pinLockContainer = document.getElementById('pin-lock-container');
        const pinPromptTitle = document.getElementById('pin-prompt-title');
        isSettingPin = isSetting;
        enteredPin = '';
        pinToConfirm = '';
        pinPromptTitle.innerText = isSetting ? 'Buat PIN Baru' : 'Masukkan PIN';
        updatePinDisplay();
        pinLockContainer.classList.add('show');
    }

    function unlockApp() {
        document.getElementById('pin-lock-container').classList.remove('show');
        main();
    }
    
    // === CATEGORY MANAGEMENT LOGIC ===
    function saveCategories() { localStorage.setItem('categories_v2', JSON.stringify(categories)); }
    function renderCategoryManager() {
        const incomeList = document.getElementById('income-category-list');
        const expenseList = document.getElementById('expense-category-list');
        incomeList.innerHTML = ''; expenseList.innerHTML = '';
        ['income', 'expense'].forEach(type => {
            const listEl = type === 'income' ? incomeList : expenseList;
            categories[type].forEach(cat => {
                const li = document.createElement('li');
                li.innerHTML = `<span><i class="fas ${cat.icon}"></i> ${cat.text}</span><div><button class="action-btn delete-btn" data-id="${cat.id}" data-type="${type}"><i class="fas fa-trash"></i></button></div>`;
                listEl.appendChild(li);
            });
        });
    }
    function handleAddCategory(e, type) {
        e.preventDefault();
        const input = e.target.querySelector('input');
        const text = input.value.trim();
        if (!text) return;
        categories[type].push({ id: text.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), text: text, icon: 'fa-tag' });
        input.value = '';
        saveCategories(); renderCategoryManager(); populateCategoryFilter();
    }
    function handleDeleteCategory(e) {
        if (!e.target.closest('.delete-btn')) return;
        const btn = e.target.closest('.delete-btn');
        const { id, type } = btn.dataset;
        if (confirm(`Yakin ingin menghapus kategori ini? Transaksi yang sudah ada akan tetap, tetapi kategori akan ditampilkan sebagai "N/A".`)) {
            categories[type] = categories[type].filter(cat => cat.id !== id);
            saveCategories(); renderCategoryManager(); populateCategoryFilter();
        }
    }
    
    // === MAIN APP LOGIC (encapsulated in a function) ===
    function main() {
        // Define DOM elements that are inside the main app
        const balanceEl=document.getElementById('balance'),balanceTitleEl=document.getElementById('balance-title'),totalIncomeEl=document.getElementById('total-income'),totalExpenseEl=document.getElementById('total-expense'),transactionListEl=document.getElementById('transaction-list'),emptyStateEl=document.getElementById('empty-state'),form=document.getElementById('form'),textInput=document.getElementById('text'),amountInput=document.getElementById('amount'),categorySelect=document.getElementById('category'),transactionIdInput=document.getElementById('transaction-id'),formTitle=document.getElementById('form-title'),fab=document.getElementById('fab'),modalContainer=document.getElementById('modal-container'),closeModalBtn=document.querySelector('#modal-container .close-modal'),walletSwitcher=document.querySelector('.wallet-switcher'),themeSelect=document.getElementById('theme-select'),categoryFilterEl=document.getElementById('category-filter'),expenseChartCanvas=document.getElementById('expense-chart').getContext('2d'),expenseChartEmptyMessage=document.getElementById('chart-empty-message-expense'),incomeChartCanvas=document.getElementById('income-chart').getContext('2d'),incomeChartEmptyMessage=document.getElementById('chart-empty-message-income'),transferFab=document.getElementById('transfer-fab'),transferModalContainer=document.getElementById('transfer-modal-container'),transferForm=document.getElementById('transfer-form'),fromWalletSelect=document.getElementById('from-wallet'),toWalletSelect=document.getElementById('to-wallet'),startDateInput=document.getElementById('start-date'),endDateInput=document.getElementById('end-date'),resetDateFilterBtn=document.getElementById('reset-date-filter'),searchInput=document.getElementById('search-input'),settingsBtn=document.getElementById('settings-btn'),settingsModalContainer=document.getElementById('settings-modal-container');
        
        // === UTILITY FUNCTIONS ===
        const findCategory=(id,type)=>(categories[type]||[]).find(c=>c.id===id)||(categories.transfer.find(c=>c.id===id))||{text:"N/A",icon:"fa-question-circle"};const generateID=()=>Math.floor(Math.random()*1e9);const formatMoney=number=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0}).format(number);const updateLocalStorage=()=>{localStorage.setItem("transactions_v2",JSON.stringify(transactions));localStorage.setItem("activeWallet_v2",currentWallet)};function formatDate(date){const today=(new Date).setHours(0,0,0,0);const yesterday=(new Date(today)).setDate((new Date(today)).getDate()-1);const transactionDate=(new Date(date)).setHours(0,0,0,0);if(transactionDate===today)return"Hari Ini";if(transactionDate===yesterday)return"Kemarin";return new Date(date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}function formatDateTime(isoString){const options={day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:!1};return new Date(isoString).toLocaleString('id-ID',options).replace(/\./g,':')}function animateValue(obj,start,end){let startTimestamp=null;const duration=500;const step=timestamp=>{if(!startTimestamp)startTimestamp=timestamp;const progress=Math.min((timestamp-startTimestamp)/duration,1);const val=progress*(end-start)+start;obj.innerHTML=formatMoney(val);if(progress<1){window.requestAnimationFrame(step)}else{obj.innerHTML=formatMoney(end)}};window.requestAnimationFrame(step)}
        
        // === UI & RENDER FUNCTIONS ===
        function addDateHeader(date){const li=document.createElement("li");li.classList.add("date-header");li.innerText=formatDate(date);transactionListEl.appendChild(li)}
        function addTransactionToDOM(transaction){let type=transaction.amount>0?"income":"expense";if(transaction.category==="transfer")type="transfer";const category=findCategory(transaction.category,type);const item=document.createElement("li");item.classList.add(transaction.amount>0?"income":"expense");item.innerHTML=`<div class="category-icon"><i class="fas ${category.icon}"></i></div><div class="transaction-details"><span class="transaction-text">${transaction.text}</span><span class="transaction-category">${category.text}</span><span class="transaction-timestamp">${formatDateTime(transaction.date)}</span></div><div class="transaction-amount">${formatMoney(transaction.amount)}</div><div class="transaction-actions">${transaction.category!=="transfer"?`<button class="action-btn edit-btn" onclick="prepareEditTransaction(${transaction.id})"><i class="fas fa-edit"></i></button>`:""}<button class="action-btn delete-btn" onclick="confirmRemoveTransaction(${transaction.id})"><i class="fas fa-trash"></i></button></div>`;transactionListEl.appendChild(item)}
        function renderTransactions(){transactionListEl.innerHTML="";const filteredTransactions=transactions.filter(t=>t.wallet===currentWallet).filter(t=>currentFilter==="all"||t.category===currentFilter).filter(t=>{const searchLower=searchQuery.toLowerCase();return t.text.toLowerCase().includes(searchLower)}).filter(t=>{if(!startDate||!endDate)return!0;const transactionDate=new Date(t.date);const endOfDay=new Date(endDate);endOfDay.setHours(23,59,59,999);return transactionDate>=new Date(startDate)&&transactionDate<=endOfDay}).sort((a,b)=>new Date(b.date)-new Date(a.date));if(filteredTransactions.length===0){emptyStateEl.style.display="block";transactionListEl.style.display="none"}else{emptyStateEl.style.display="none";transactionListEl.style.display="block";let lastDate=null;filteredTransactions.forEach(transaction=>{const transactionDate=(new Date(transaction.date)).setHours(0,0,0,0);if(transactionDate!==lastDate){addDateHeader(transaction.date);lastDate=transactionDate}addTransactionToDOM(transaction)})}}
        function updateBalanceAndSummary(){const walletTransactions=transactions.filter(t=>t.wallet===currentWallet);const amounts=walletTransactions.map(t=>t.amount);const total=amounts.reduce((acc,item)=>acc+=item,0);const income=amounts.filter(item=>item>0).reduce((acc,item)=>acc+=item,0);const expense=amounts.filter(item=>item<0).reduce((acc,item)=>acc+=item,0);animateValue(balanceEl,parseFloat(balanceEl.dataset.currentValue)||0,total);animateValue(totalIncomeEl,parseFloat(totalIncomeEl.dataset.currentValue)||0,income);animateValue(totalExpenseEl,parseFloat(totalExpenseEl.dataset.currentValue)||0,expense);balanceEl.dataset.currentValue=total;totalIncomeEl.dataset.currentValue=income;totalExpenseEl.dataset.currentValue=expense}
        
        // === CHART FUNCTIONS ===
        function updateChart(chartInstance,canvas,emptyMessage,transactions,type){const typeTransactions=transactions.filter(t=>t.wallet===currentWallet&&t.category!=="transfer"&&(type==="expense"?t.amount<0:t.amount>0));if(typeTransactions.length===0){canvas.canvas.style.display="none";emptyMessage.style.display="block";if(chartInstance){chartInstance.destroy()}return null}canvas.canvas.style.display="block";emptyMessage.style.display="none";const dataByCategory=typeTransactions.reduce((acc,t)=>{const amount=Math.abs(t.amount);acc[t.category]=(acc[t.category]||0)+amount;return acc},{});const labels=Object.keys(dataByCategory).map(id=>findCategory(id,type).text);const data=Object.values(dataByCategory);const chartColors=type==="expense"?["#e74c3c","#e67e22","#f1c40f","#8e44ad","#3498db","#1abc9c","#95a5a6"]:["#2ecc71","#3498db","#1abc9c","#27ae60","#2980b9"];const chartConfig={type:"doughnut",data:{labels,datasets:[{data,backgroundColor:chartColors,borderColor:getComputedStyle(html).getPropertyValue("--panel-bg-color").trim(),borderWidth:2}]},options:{responsive:!0,maintainAspectRatio:!0,plugins:{legend:{display:!1},tooltip:{padding:10,callbacks:{title:function(context){return context[0].label},label:function(context){const value=context.parsed||0;return` ${formatMoney(value)}`}}}}}};if(chartInstance){chartInstance.data.labels=labels;chartInstance.data.datasets[0].data=data;chartInstance.update();return chartInstance}else{return new Chart(canvas,chartConfig)}}
        
        // === EVENT HANDLER FUNCTIONS ===
        function handleFormSubmit(e){e.preventDefault();if(textInput.value.trim()===""||amountInput.value.trim()==="")return;const type=document.querySelector('input[name="transaction-type"]:checked').value;const amountValue=+amountInput.value;const transactionData={text:textInput.value,amount:type==="expense"?-Math.abs(amountValue):Math.abs(amountValue),category:categorySelect.value,wallet:currentWallet,date:(new Date).toISOString()};if(editingID){const index=transactions.findIndex(t=>t.id===editingID);const originalDate=transactions[index].date;transactions[index]={...transactions[index],...transactionData,date:originalDate}}else{transactions.push({...transactionData,id:generateID()})}closeModal(modalContainer);updateLocalStorage();init()}
        function handleTransferSubmit(e){e.preventDefault();const amount=+document.getElementById("transfer-amount").value;const fromWallet=fromWalletSelect.value;const toWallet=toWalletSelect.value;if(fromWallet===toWallet){alert("Dompet sumber dan tujuan tidak boleh sama!");return}const date=(new Date).toISOString();const transferId=generateID();const expenseTransaction={id:generateID(),text:`Transfer ke ${toWallet==="bank"?"Bank":"Tunai"}`,amount:-amount,category:"transfer",wallet:fromWallet,date:date,transferGroupId:transferId};const incomeTransaction={id:generateID(),text:`Transfer dari ${fromWallet==="bank"?"Bank":"Tunai"}`,amount:amount,category:"transfer",wallet:toWallet,date:date,transferGroupId:transferId};transactions.push(expenseTransaction,incomeTransaction);closeModal(transferModalContainer);updateLocalStorage();init()}
        window.confirmRemoveTransaction=id=>{if(confirm("Apakah Anda yakin ingin menghapus transaksi ini?")){const transactionToRemove=transactions.find(t=>t.id===id);if(transactionToRemove.category==="transfer"){transactions=transactions.filter(t=>t.transferGroupId!==transactionToRemove.transferGroupId)}else{transactions=transactions.filter(t=>t.id!==id)}updateLocalStorage();init()}}
        function openModal(modal){modal.classList.add("show")}
        function closeModal(modal){modal.classList.remove("show");if(modal===modalContainer){form.reset();populateCategoryOptions("income");editingID=null;formTitle.innerText="Tambah Transaksi Baru"}else if(modal===transferModalContainer){transferForm.reset()}}
        function applyDateFilter(){startDate=startDateInput.value;endDate=endDateInput.value;if(startDate&&endDate&&new Date(startDate)>new Date(endDate)){alert("Tanggal mulai tidak boleh lebih besar dari tanggal selesai.");return}renderTransactions()}
        function resetDateFilter(){startDateInput.value="";endDateInput.value="";startDate=null;endDate=null;renderTransactions()}
        window.prepareEditTransaction=id=>{editingID=id;const transaction=transactions.find(t=>t.id===id);formTitle.innerText="Edit Transaksi";textInput.value=transaction.text;amountInput.value=Math.abs(transaction.amount);const type=transaction.amount>0?"income":"expense";document.getElementById(`${type}-radio`).checked=!0;populateCategoryOptions(type);categorySelect.value=transaction.category;openModal(modalContainer)}
        function switchWallet(e){const targetBtn=e.target.closest(".wallet-btn");if(targetBtn){currentWallet=targetBtn.dataset.wallet;updateLocalStorage();init()}}
        function switchTheme(e){const selectedTheme=e.target.value;html.setAttribute("data-theme",selectedTheme);localStorage.setItem("theme_v2",selectedTheme);[expenseChart,incomeChart].forEach(chart=>{if(chart){chart.data.datasets[0].borderColor=getComputedStyle(html).getPropertyValue("--panel-bg-color").trim();chart.update()}})}
        function handleFilterChange(e){currentFilter=e.target.value;renderTransactions()}
        function handleSearchInput(e){searchQuery=e.target.value;renderTransactions()}
        
        // === POPULATE & SETUP FUNCTIONS ===
        function populateCategoryOptions(type){const catList=categories[type];categorySelect.innerHTML=catList.map(c=>`<option value="${c.id}">${c.text}</option>`).join("")}
        function populateCategoryFilter(){const allCats=[...categories.income,...categories.expense];categoryFilterEl.innerHTML=`<option value="all">Semua Kategori</option>${allCats.map(c=>`<option value="${c.id}">${c.text}</option>`).join("")}`;categoryFilterEl.value=currentFilter}
        function updateWalletUI(){document.querySelectorAll(".wallet-btn").forEach(btn=>btn.classList.remove("active"));document.querySelector(`.wallet-btn[data-wallet="${currentWallet}"]`)?.classList.add("active");balanceTitleEl.innerText=`SALDO ${currentWallet.toUpperCase()}`}
        function loadInitialTheme(){const savedTheme=localStorage.getItem("theme_v2")||"light";html.setAttribute("data-theme",savedTheme);themeSelect.value=savedTheme}
        
        // === MAIN INITIALIZATION FUNCTION ===
        function init(){updateWalletUI();renderTransactions();updateBalanceAndSummary();populateCategoryFilter();expenseChart=updateChart(expenseChart,expenseChartCanvas,expenseChartEmptyMessage,transactions,"expense");incomeChart=updateChart(incomeChart,incomeChartCanvas,incomeChartEmptyMessage,transactions,"income")}
        
        // === EVENT LISTENERS ===
        fab.addEventListener("click",()=>openModal(modalContainer));closeModalBtn.addEventListener("click",()=>closeModal(modalContainer));modalContainer.addEventListener("click",e=>(e.target===modalContainer)&&closeModal(modalContainer));form.addEventListener("submit",handleFormSubmit);transferFab.addEventListener("click",()=>openModal(transferModalContainer));document.querySelector("#transfer-modal-container .close-modal").addEventListener("click",()=>closeModal(transferModalContainer));transferModalContainer.addEventListener("click",e=>(e.target===transferModalContainer)&&closeModal(transferModalContainer));transferForm.addEventListener("submit",handleTransferSubmit);startDateInput.addEventListener("change",applyDateFilter);endDateInput.addEventListener("change",applyDateFilter);resetDateFilterBtn.addEventListener("click",resetDateFilter);walletSwitcher.addEventListener("click",switchWallet);themeSelect.addEventListener("change",switchTheme);categoryFilterEl.addEventListener("change",handleFilterChange);searchInput.addEventListener("input",handleSearchInput);document.querySelectorAll('input[name="transaction-type"]').forEach(radio=>{radio.addEventListener("change",e=>populateCategoryOptions(e.target.value))});
        
        // Settings Listeners
        settingsBtn.addEventListener('click', () => {
            renderCategoryManager();
            const pinToggle = document.getElementById('pin-toggle');
            const changePinBtn = document.getElementById('change-pin-btn');
            pinToggle.checked = !!pin;
            changePinBtn.style.display = pin ? 'block' : 'none';
            openModal(settingsModalContainer);
        });
        document.querySelector('#settings-modal-container .close-modal').addEventListener('click', () => closeModal(settingsModalContainer));
        settingsModalContainer.addEventListener('click', (e) => (e.target === settingsModalContainer) && closeModal(settingsModalContainer));
        document.getElementById('add-income-category-form').addEventListener('submit', (e) => handleAddCategory(e, 'income'));
        document.getElementById('add-expense-category-form').addEventListener('submit', (e) => handleAddCategory(e, 'expense'));
        settingsModalContainer.addEventListener('click', handleDeleteCategory);
        document.getElementById('pin-toggle').addEventListener('change', (e) => {
            if (e.target.checked) {
                showPinLockScreen(true); // Set new PIN
            } else {
                pin = null;
                localStorage.removeItem('app_pin');
                alert('PIN dinonaktifkan.');
                document.getElementById('change-pin-btn').style.display = 'none';
            }
        });
        document.getElementById('change-pin-btn').addEventListener('click', () => showPinLockScreen(true));

        // === START THE APP ===
        loadInitialTheme();populateCategoryOptions("income");init()
    }

    // === APP ENTRY POINT ===
    injectModals();
    if (pin) {
        showPinLockScreen();
    } else {
        unlockApp();
    }
    // PERBAIKAN: Memasang listener setelah injectModals dipanggil
    document.getElementById('pin-keypad').addEventListener('click', (e) => {
        const key = e.target.closest('.keypad-btn')?.dataset.key;
        if (key) {
            handlePinInput(key);
        }
    });

    // BARU: Listener untuk input keyboard
    document.addEventListener('keydown', (e) => {
        const pinLockContainer = document.getElementById('pin-lock-container');
        if (!pinLockContainer.classList.contains('show')) {
            return; // Lakukan hanya jika layar PIN aktif
        }
        e.preventDefault(); // Mencegah aksi default browser
        if (e.key >= '0' && e.key <= '9') {
            handlePinInput(e.key);
        } else if (e.key === 'Backspace') {
            handlePinInput('backspace');
        }
    });
});