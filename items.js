// Data for xoi (sticky rice) items
let xoi = [{
    xoiID: "xoi1",
    xoiName:"Xôi Xéo Chà Bông",
    xoiPrice: 15000,
},
{
    xoiID: "xoi2",
    xoiName:"Xôi Xéo Chà Bông + Chả Lụa",
    xoiPrice: 20000,
},
{
    xoiID: "xoi3",
    xoiName:"Xôi Xéo Chà Bông + Chả Lụa + Chả Mỡ",
    xoiPrice: 25000,
},
{
    xoiID: "xoi4",
    xoiName:"Xôi Xéo Chà Bông + Chả + Lạp Xuởng",
    xoiPrice: 30000,
},]

// Toppings for xoi
let xoiToppings = [
    { id: "topping1", name: "Thêm lạp xưởng", price: 5000 },
    { id: "topping2", name: "Thêm chả lụa/chả mỡ", price: 5000 },
    { id: "topping3", name: "Thêm chà bông", price: 5000 }
]

// Data for laundry services
let laundry = [{
    laundryID: "laundry1",
    laundryName:"Giặt Quần Áo",
    laundryPricePerKG: 10000,
    unit: "kg"
},
{
    laundryID: "laundry2",
    laundryName:"Giặt Chăn Ga Gối",
    laundryPricePerKG: 20000,
    unit: "kg"
},
{
    laundryID: "laundry3",
    laundryName:"Giặt Giày",
    laundryPricePerKG: 40000,
    unit: "đôi"
},
{
    laundryID: "laundry4",
    laundryName:"Giặt Gấu Bông",
    laundryPricePerKG: 30000,
    unit: "con"
},
{
    laundryID: "laundry5",
    laundryName:"Giặt Áo Khoác",
    laundryPricePerKG: 40000,
    unit: "cái"
}
,
{
    laundryID: "laundry5",
    laundryName:"Giặt Sơ Mi/ Quần Tây",
    laundryPricePerKG: 20000,
    unit: "cái"
},
{
    laundryID: "laundry5",
    laundryName:"Giặt Váy Đầm",
    laundryPricePerKG: 30000,
    unit: "cái"
}]

// Data for food items (derived from xoi for rendering)
let food = xoi.map(item => ({
    id: item.xoiID,
    foodPicture: item.xoiPicture,
    foodName: item.xoiName,
    foodPrice: item.xoiPrice,
    toppings: xoiToppings
}));

// Data for laundry items (derived from laundry for rendering)
let laundryFood = laundry.map(item => ({
    id: item.laundryID,
    foodPicture: item.laundryPicture,
    foodName: item.laundryName,
    foodPrice: item.laundryPricePerKG,
    unit: item.unit
}));

// Utility function to generate a random integer between min and max (inclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCurrency(amount) {
    return Number(amount).toLocaleString("vi-VN");
}

// Global variables for cart and paid receipts
let cart = [];
let paidReceipts = JSON.parse(localStorage.getItem("paidReceipts")) || [];

// ─── Supabase receipt helpers ─────────────────────────────────────────────────
async function saveReceiptToSupabase(receipt) {
    const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receipt)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function loadReceiptsFromSupabase() {
    try {
        const res = await fetch("/api/receipts");
        if (!res.ok) return null;
        const data = await res.json();
        return data.map(r => ({
            items: r.items || [],
            total: r.total,
            date: r.date,
            transactionCode: r.transaction_code,
            customerName: r.customer_name,
            transactionContent: r.transaction_content
        }));
    } catch (_) {
        return null;
    }
}

// Polling handle for payment status (unused, kept for future use)
let paymentPollingInterval = null;

function startPaymentPolling() {}
function stopPaymentPolling() {
    if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
        paymentPollingInterval = null;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    // Get references to DOM elements
    const xoiContainer = document.getElementById("xoi-container");
    const laundryContainer = document.getElementById("laundry-container");
    const receiptContainer = document.getElementById("receipt-container");
    const paidReceiptsContainer = document.getElementById("paid-receipts-container");
    const cartItemsDiv = document.getElementById("cart-items");
    const paidReceiptsList = document.getElementById("paid-receipts-list");
    const markPaidButton = document.getElementById("mark-paid-button");
    const receiptDate = document.getElementById("receipt-date");
    const mainCustomerNameInput = document.getElementById("main-customer-name");
    const customerNameSubmitButton = document.getElementById("customer-name-submit");
    const customerNameConfirmText = document.getElementById("customer-name-confirm");
    const loginModal = document.getElementById("login-modal");
    const loginUsername = document.getElementById("login-username");
    const loginPassword = document.getElementById("login-password");
    const loginError = document.getElementById("login-error");
    const loginButton = document.getElementById("login-button");
    const loginCancel = document.getElementById("login-cancel");
    const tabButtons = document.querySelectorAll(".tab-button");
    const authStatus = document.getElementById("auth-status");
    const authAction = document.getElementById("auth-action");
    const paidReceiptsLink = document.getElementById("paid-receipts-link");
    const loginWarning = document.getElementById("login-warning");
    const paidContent = document.getElementById("paid-content");
    const paidTab = document.getElementById("paid-tab");
    let isLoggedIn = localStorage.getItem("dungShopLoggedIn") === "true";
    const storedCustomerName = localStorage.getItem("dungShopCustomerName") || "";

    function getCustomerName() {
        const mainName = mainCustomerNameInput ? mainCustomerNameInput.value.trim() : "";
        return mainName || "Khách lạ";
    }

    function updateCustomerNameDisplay() {
        if (!customerNameConfirmText) return;
        const name = getCustomerName();
        customerNameConfirmText.textContent = `Tên khách hàng: ${name}`;
    }

    if (storedCustomerName && mainCustomerNameInput) {
        mainCustomerNameInput.value = storedCustomerName;
    }

    if (customerNameSubmitButton) {
        customerNameSubmitButton.addEventListener("click", function() {
            if (!mainCustomerNameInput) return;
            let enteredName = mainCustomerNameInput.value.trim();
            if (!enteredName) {
                enteredName = "Khách lạ";
                mainCustomerNameInput.value = enteredName;
            }
            localStorage.setItem("dungShopCustomerName", enteredName);
            updateCustomerNameDisplay();
            alert(`Tên khách hàng đã được xác nhận: ${enteredName}`);
        });
    }

    updateCustomerNameDisplay();

    // Helper function to close the login modal and reset fields
    function closeLoginModal() {
        loginModal.classList.add("hidden");
        loginError.textContent = "";
        loginUsername.value = "";
        loginPassword.value = "";
    }

    // Helper function to open the login modal
    function openLoginModal() {
        if (!loginModal) return;
        loginModal.classList.remove("hidden");
        loginUsername.focus();
    }

    // Function to set the authentication state and update UI
    function setAuthState(loggedIn, username = "") {
        isLoggedIn = loggedIn;
        localStorage.setItem("dungShopLoggedIn", loggedIn ? "true" : "false");
        if (loggedIn && username) localStorage.setItem("dungShopUsername", username);
        if (!loggedIn) localStorage.removeItem("dungShopUsername");
        updateAuthUI();
    }

    // Function to update the authentication UI based on login state
    function updateAuthUI() {
        const storedUser = localStorage.getItem("dungShopUsername") || "";
        if (authStatus) {
            authStatus.textContent = isLoggedIn ? `Đã đăng nhập: ${storedUser}` : "Chưa đăng nhập";
        }
        if (authAction) {
            authAction.textContent = isLoggedIn ? "Đăng xuất" : "Đăng nhập";
        }
        if (paidTab) {
            paidTab.style.display = isLoggedIn ? "inline-block" : "none";
        }
    }

    // Function to show the selected tab and update UI accordingly
    function showTab(tab) {
        tabButtons.forEach(btn => btn.classList.remove("active"));
        const activeButton = Array.from(tabButtons).find(btn => btn.getAttribute("data-tab") === tab);
        if (activeButton) {
            activeButton.classList.add("active");
        }
        document.querySelectorAll(".food-container").forEach(container => {
            container.classList.remove("active");
        });
        const container = document.getElementById(`${tab}-container`);
        if (container) {
            container.classList.add("active");
        }
        // Show/hide price lists based on active tab
        document.querySelectorAll(".price-list").forEach(priceList => {
            priceList.style.display = priceList.getAttribute("data-tab") === tab ? "block" : "none";
        });
        if (tab === "receipt") {
            renderCart();
        }
        if (tab === "paid-receipts") {
            renderPaidReceipts();
        }
    }

    // Function to update the paid receipts page view based on login state
    function updatePaidPageView() {
        if (!paidReceiptsList) return;
        if (!isLoggedIn) {
            if (paidContent) paidContent.classList.add("hidden");
            if (loginWarning) loginWarning.classList.remove("hidden");
            paidReceiptsList.innerHTML = "";
            return;
        }
        if (paidContent) paidContent.classList.remove("hidden");
        if (loginWarning) loginWarning.classList.add("hidden");
        renderPaidReceipts();
    }

    if (receiptDate) {
        const today = new Date();
        receiptDate.textContent = today.toLocaleString("vi-VN");
    }

    updateAuthUI();

    // Function to render the list of paid receipts
    async function renderPaidReceipts() {
        if (!paidReceiptsList) return;
        paidReceiptsList.innerHTML = '<p style="color:#aaa">⏳ Đang tải hóa đơn...</p>';

        // Try Supabase first, fall back to localStorage
        const dbReceipts = await loadReceiptsFromSupabase();
        const receiptsToShow = dbReceipts !== null ? dbReceipts : paidReceipts.slice().reverse();

        paidReceiptsList.innerHTML = "";
        if (receiptsToShow.length === 0) {
            paidReceiptsList.innerHTML = '<p class="empty-message">Chưa có hóa đơn nào được thanh toán.</p>';
            return;
        }

        receiptsToShow.forEach((receipt, receiptIndex) => {
            const receiptNumber = receiptsToShow.length - receiptIndex;
            const receiptDiv = document.createElement("div");
            receiptDiv.classList.add("paid-receipt-card");
            receiptDiv.innerHTML = `
                <h3>Hóa đơn #${receiptNumber}</h3>
                <p><strong>Ngày:</strong> ${receipt.date}</p>
                <p><strong>Người mua:</strong> ${receipt.customerName || "Khách lạ"}</p>
                <p><strong>Mã chuyển khoản:</strong> ${receipt.transactionCode}</p>
                <p><strong>Nội dung chuyển khoản:</strong> ${receipt.transactionContent || "Không có nội dung"}</p>
                <div class="paid-items"></div>
                <p class="paid-total"><strong>Tổng đã thanh toán:</strong> ${formatCurrency(receipt.total)} VND</p>
            `;

            const itemsContainer = receiptDiv.querySelector(".paid-items");
            (receipt.items || []).forEach(item => {
                const itemLine = document.createElement("p");
                const quantityLabel = item.type === "laundry" ? "Khối lượng" : "Số lượng";
                const unit = item.type === "laundry" ? ` ${item.unit}` : "";
                itemLine.textContent = `${item.foodName} - ${quantityLabel}: ${item.quantity}${unit} - ${formatCurrency(item.total)} VND`;
                itemsContainer.appendChild(itemLine);
            });

            paidReceiptsList.appendChild(receiptDiv);
        });
    }

    if (markPaidButton) {
        markPaidButton.addEventListener("click", function() {
            const total = cart.reduce((sum, item) => sum + item.total, 0);
            if (total === 0) {
                alert("Giỏ hàng trống. Vui lòng thêm món hoặc dịch vụ trước khi thanh toán.");
                return;
            }
            triggerPaymentSuccess();
        });
    }

    // Function to finalize payment, save receipt, and show success
    async function triggerPaymentSuccess() {
        const total = cart.reduce((sum, item) => sum + item.total, 0);
        if (total === 0) return;

        const receiptDateTime = window.currentTransactionDateTime || new Date().toLocaleString("vi-VN");
        const transactionCode = window.currentTransactionCode || "TXN" + getRandomInt(100000, 999999);
        const purchaserName = getCustomerName();
        const transactionContent = window.currentTransactionContent || [`Mã:${transactionCode}`, `Khách:${purchaserName}`].join(" | ");
        const receipt = {
            items: cart.map(item => ({ ...item })),
            total: total,
            date: receiptDateTime,
            transactionCode: transactionCode,
            customerName: purchaserName,
            transactionContent: transactionContent
        };
        paidReceipts.push(receipt);
        localStorage.setItem("paidReceipts", JSON.stringify(paidReceipts));
        try {
            await saveReceiptToSupabase(receipt);
        } catch (err) {
            console.error("Lỗi lưu Supabase:", err.message);
            alert("Lưu hóa đơn thất bại: " + err.message);
            return;
        }

        // Show success checkmark animation
        const qrCodeDisplay = document.getElementById("qr-code-display");
        qrCodeDisplay.innerHTML = '<div class="payment-success"><svg viewBox="0 0 100 100" class="checkmark"><circle cx="50" cy="50" r="45" class="circle"/><path d="M30 50 L45 65 L70 35" class="check"/></svg><p>Thanh toán thành công!</p></div>';

        // Show success alert
        alert("Giao dịch đã thành công!");

        cart = [];
        window.currentTransactionCode = null;
        window.currentTransactionDateTime = null;
        window.currentOrderCode = null;
        stopPaymentPolling();
        renderCart();
        renderPaidReceipts();
    }


    // Render xoi items in the xoi container
    if (xoiContainer) {
        food.forEach((item, index) => {
            const itemElement = document.createElement("div");
            itemElement.classList.add("item");
            let toppingsHTML = '<div class="toppings-section"><p><strong>Thêm toppings (+5,000 VND/item):</strong></p>';
            if (item.toppings) {
                item.toppings.forEach((topping) => {
                    toppingsHTML += `<label><input type="checkbox" class="topping-checkbox" value="${topping.id}" data-price="${topping.price}" data-name="${topping.name}"> ${topping.name}</label>`;
                });
            }
            toppingsHTML += '</div>';
            itemElement.innerHTML = `
                <h3>${item.foodName}</h3>
                <p>Giá: ${formatCurrency(item.foodPrice)} VND</p>
                ${toppingsHTML}
                <button type="button" data-type="xoi" data-index="${index}">Mua</button>
            `;
            xoiContainer.appendChild(itemElement);
        });
    }

    // Render laundry items in the laundry container
    if (laundryContainer) {
        laundryFood.forEach((item, index) => {
        const itemElement = document.createElement("div");
        itemElement.classList.add("item");
        const note = (item.unit === "kg" && item.id === "laundry1") ? '<p><small>Lưu ý: Nếu dưới 1kg, giá là 30.000 VND; trên 8kg, giá là 8.000 VND/kg</small></p>' : (item.unit === "kg" ? '<p><small>Lưu ý: Nếu dưới 1kg, giá là 30.000 VND</small></p>' : '');
        itemElement.innerHTML = `
            <h3>${item.foodName}</h3>
            <p>Giá/${item.unit}: ${formatCurrency(item.foodPrice)} VND</p>
            ${note}
            <input type="number" placeholder="Nhập ${item.unit}" min="0" step="0.1" class="kg-input">
            <button type="button" data-type="laundry" data-index="${index}">Giặt</button>
        `;
        laundryContainer.appendChild(itemElement);
        });
    }

    // Event listeners for tab switching
    tabButtons.forEach(button => {
        button.addEventListener("click", function(e) {
            const tab = this.getAttribute("data-tab");
            if (!tab) {
                return;
            }
            e.preventDefault();
            showTab(tab);
        });
    });

    // Event listener for login button
    if (loginButton) {
        loginButton.addEventListener("click", async function() {
            const username = loginUsername.value.trim();
            const password = loginPassword.value;
            if (!username || !password) {
                loginError.textContent = "Vui lòng nhập đầy đủ thông tin.";
                return;
            }
            loginButton.disabled = true;
            loginButton.textContent = "Đang kiểm tra...";
            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (res.ok) {
                    setAuthState(true, username);
                    closeLoginModal();
                } else {
                    loginError.textContent = data.error;
                }
            } catch (_) {
                loginError.textContent = "Không thể kết nối server.";
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = "Đăng nhập";
            }
        });
    }

    // Sign up handlers
    const signupModal = document.getElementById("signup-modal");
    const signupUsername = document.getElementById("signup-username");
    const signupPassword = document.getElementById("signup-password");
    const signupConfirm = document.getElementById("signup-confirm");
    const signupButton = document.getElementById("signup-button");
    const signupCancel = document.getElementById("signup-cancel");
    const signupError = document.getElementById("signup-error");
    const signupLink = document.getElementById("signup-link");

    function validatePassword(pw) {
        return {
            length: pw.length >= 8,
            upper: /[A-Z]/.test(pw),
            number: /[0-9]/.test(pw),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(pw)
        };
    }

    if (signupPassword) {
        signupPassword.addEventListener("input", function() {
            const rules = validatePassword(this.value);
            const set = (id, ok, text) => {
                const el = document.getElementById(id);
                if (el) { el.style.color = ok ? "green" : "#aaa"; el.textContent = (ok ? "✓ " : "✗ ") + text; }
            };
            set("rule-length", rules.length, "Ít nhất 8 ký tự");
            set("rule-upper", rules.upper, "Ít nhất 1 chữ hoa");
            set("rule-number", rules.number, "Ít nhất 1 số");
            set("rule-special", rules.special, "Ít nhất 1 ký tự đặc biệt (!@#$...)");
        });
    }

    if (signupLink) {
        signupLink.addEventListener("click", function(e) {
            e.preventDefault();
            closeLoginModal();
            if (signupModal) signupModal.classList.remove("hidden");
            if (signupUsername) signupUsername.focus();
        });
    }

    if (signupCancel) {
        signupCancel.addEventListener("click", function() {
            if (signupModal) signupModal.classList.add("hidden");
            if (signupUsername) signupUsername.value = "";
            if (signupPassword) signupPassword.value = "";
            if (signupConfirm) signupConfirm.value = "";
            if (signupError) signupError.textContent = "";
        });
    }

    if (signupButton) {
        signupButton.addEventListener("click", async function() {
            const username = signupUsername.value.trim();
            const password = signupPassword.value;
            const confirm = signupConfirm.value;
            signupError.textContent = "";
            if (!username || !password) {
                signupError.textContent = "Vui lòng nhập đầy đủ thông tin.";
                return;
            }
            const rules = validatePassword(password);
            if (!rules.length || !rules.upper || !rules.number || !rules.special) {
                signupError.textContent = "Mật khẩu chưa đáp ứng yêu cầu.";
                return;
            }
            if (password !== confirm) {
                signupError.textContent = "Mật khẩu xác nhận không khớp.";
                return;
            }
            signupButton.disabled = true;
            signupButton.textContent = "Đang đăng ký...";
            try {
                const res = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (res.ok) {
                    if (signupModal) signupModal.classList.add("hidden");
                    alert(`Đăng ký thành công! Hãy đăng nhập với username: ${username}`);
                    openLoginModal();
                } else {
                    signupError.textContent = data.error;
                }
            } catch (_) {
                signupError.textContent = "Không thể kết nối server.";
            } finally {
                signupButton.disabled = false;
                signupButton.textContent = "Đăng ký";
            }
        });
    }

    // Event listener for auth action (login/logout)
    if (authAction) {
        authAction.addEventListener("click", function() {
            if (isLoggedIn) {
                setAuthState(false);
                alert("Bạn đã đăng xuất.");
            } else {
                openLoginModal();
            }
        });
    }

    // Event listener for login cancel button
    if (loginCancel) {
        loginCancel.addEventListener("click", closeLoginModal);
    }

    // Event listener for adding items to cart
    document.addEventListener("click", function(e) {
        if (e.target.tagName === "BUTTON" && e.target.hasAttribute("data-type")) {
            const type = e.target.getAttribute("data-type");
            const index = parseInt(e.target.getAttribute("data-index"), 10);
            if (type === "xoi") {
                const item = food[index];
                // Get selected toppings
                const toppingCheckboxes = e.target.parentElement.querySelectorAll(".topping-checkbox:checked");
                const selectedToppings = [];
                let toppingPrice = 0;
                toppingCheckboxes.forEach(checkbox => {
                    selectedToppings.push({ id: checkbox.value, name: checkbox.getAttribute("data-name") });
                    toppingPrice += parseInt(checkbox.getAttribute("data-price"), 10);
                });
                const totalPrice = item.foodPrice + toppingPrice;
                cart.push({ ...item, quantity: 1, total: totalPrice, type: "xoi", selectedToppings: selectedToppings, toppingPrice: toppingPrice });
                alert("Đã thêm vào giỏ hàng!");
            } else if (type === "laundry") {
                const item = laundryFood[index];
                const quantity = parseFloat(e.target.previousElementSibling.value) || 0;
                if (quantity > 0) {
                    let total;
                    if (item.unit === "kg") {
                        if (quantity < 1) {
                            total = 30000;
                        } else if (item.id === "laundry1" && quantity > 8) {
                            total = 8000 * quantity;
                        } else {
                            total = item.foodPrice * quantity;
                        }
                    } else {
                        total = item.foodPrice * quantity;
                    }
                    cart.push({ ...item, quantity: quantity, total: total, type: "laundry" });
                    alert("Đã thêm yêu cầu giặt!");
                }
            }
        }
    });

    // Function to render the cart items and calculate total
    function renderCart() {
        cartItemsDiv.innerHTML = "";
        let total = 0;
        cart.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.classList.add("cart-item");
            const quantityLabel = item.type === "laundry" ? "Khối lượng" : "Số lượng";
            const unit = item.type === "laundry" ? ` ${item.unit}` : "";
            let toppingsInfo = "";
            if (item.type === "xoi" && item.selectedToppings && item.selectedToppings.length > 0) {
                toppingsInfo = `<br><small>Toppings: ${item.selectedToppings.map(t => t.name).join(", ")} (+${formatCurrency(item.toppingPrice)} VND)</small>`;
            }
            itemDiv.innerHTML = `
                <p>${item.foodName} - ${quantityLabel}: ${item.quantity}${unit} - Tổng: ${formatCurrency(item.total)} VND${toppingsInfo}</p>
            `;
            cartItemsDiv.appendChild(itemDiv);
            total += item.total;
        });
        const totalDiv = document.createElement("div");
        totalDiv.innerHTML = `<h3>Tổng cộng: ${formatCurrency(total)} VND</h3>`;
        cartItemsDiv.appendChild(totalDiv);
        if (markPaidButton) {
            markPaidButton.disabled = total === 0;
        }

        // Generate VietQR payment QR
        if (total > 0) {
            const orderCode = window.currentOrderCode || getRandomInt(100000, 999999);
            const transactionCode = "TXN" + orderCode;
            const transactionDateTime = window.currentTransactionDateTime || new Date().toLocaleString("vi-VN");
            const purchaserName = getCustomerName();
            const xoiItemsCount = cart.filter(item => item.type === "xoi").reduce((sum, item) => sum + item.quantity, 0);
            const laundryItems = cart.filter(item => item.type === "laundry");
            const laundryInfo = laundryItems.length > 0
                ? laundryItems.map(item => `${item.foodName}: ${item.quantity} ${item.unit} - ${formatCurrency(item.total)} VND`).join("; ")
                : "";
            const transactionContent = `${transactionCode} ${purchaserName}`.slice(0, 25);

            document.getElementById("transaction-info").innerHTML = `
                <p><strong>Mã đơn hàng:</strong> ${transactionCode}</p>
                <p><strong>Thời gian:</strong> ${transactionDateTime}</p>
                <p><strong>Người mua:</strong> ${purchaserName}</p>
                <p><strong>Số xôi:</strong> ${xoiItemsCount}</p>
                <p><strong>Giặt ủi:</strong> ${laundryInfo || "Không có"}</p>
                <p><strong>Số tiền:</strong> ${formatCurrency(total)} VND</p>
            `;

            window.currentTransactionCode = transactionCode;
            window.currentTransactionDateTime = transactionDateTime;
            window.currentTransactionContent = transactionContent;

            if (!window.currentOrderCode) {
                window.currentOrderCode = orderCode;
                const qrUrl = `https://api.vietqr.io/image/970422-310806130800-compact2.jpg?amount=${total}&addInfo=${encodeURIComponent(transactionContent)}&accountName=NGUYEN%20GIA%20DUNG`;
                document.getElementById("qr-code-display").innerHTML = `
                    <img src="${qrUrl}" alt="QR Thanh toán" style="max-width:260px;border-radius:12px;" />
                    <p style="margin-top:8px;color:#888;font-size:0.85rem;">Quét mã để chuyển khoản</p>
                `;
            }
        } else {
            document.getElementById("transaction-info").innerHTML = "";
            document.getElementById("qr-code-display").innerHTML = "";
            window.currentTransactionCode = null;
            window.currentTransactionDateTime = null;
            window.currentOrderCode = null;
            stopPaymentPolling();
        }
    }
});