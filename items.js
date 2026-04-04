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

// Utility function to generate a random date within the last 'daysBack' days
function getRandomReceiptDate(daysBack) {
    const date = new Date();
    date.setDate(date.getDate() - getRandomInt(0, daysBack));
    date.setHours(getRandomInt(8, 20), getRandomInt(0, 59));
    return date;
}

// Function to create a dummy receipt with random items for demonstration
function createDummyReceipt() {
    const receiptItems = [];
    const itemCount = getRandomInt(2, 5);

    for (let i = 0; i < itemCount; i++) {
        const useLaundry = Math.random() < 0.5;
        if (useLaundry) {
            const item = laundryFood[getRandomInt(0, laundryFood.length - 1)];
            const quantity = item.unit === "kg" ? (Math.random() < 0.5 ? 0.5 : getRandomInt(1, 3)) : getRandomInt(1, 2);
            const total = item.unit === "kg" && quantity < 1 ? 30000 : item.foodPrice * quantity;
            receiptItems.push({ ...item, quantity, total, type: "laundry" });
        } else {
            const item = food[getRandomInt(0, food.length - 1)];
            const quantity = getRandomInt(1, 3);
            const total = item.foodPrice * quantity;
            receiptItems.push({ ...item, quantity, total, type: "xoi", unit: "suất" });
        }
    }

    const totalAmount = receiptItems.reduce((sum, item) => sum + item.total, 0);
    const transactionCode = "TXN" + getRandomInt(100000, 999999);
    return {
        items: receiptItems,
        total: totalAmount,
        date: getRandomReceiptDate(10).toLocaleString("vi-VN"),
        transactionCode: transactionCode
    };
}

// Global variables for cart and paid receipts
let cart = [];
let paidReceipts = JSON.parse(localStorage.getItem("paidReceipts")) || Array.from({ length: 20 }, () => createDummyReceipt());

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
    function setAuthState(loggedIn) {
        isLoggedIn = loggedIn;
        localStorage.setItem("dungShopLoggedIn", loggedIn ? "true" : "false");
        updateAuthUI();
    }

    // Function to update the authentication UI based on login state
    function updateAuthUI() {
        if (authStatus) {
            authStatus.textContent = isLoggedIn ? "Đã đăng nhập: dung" : "Chưa đăng nhập";
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
        const receiptsToShow = dbReceipts !== null ? dbReceipts : paidReceipts;

        paidReceiptsList.innerHTML = "";
        if (receiptsToShow.length === 0) {
            paidReceiptsList.innerHTML = '<p class="empty-message">Chưa có hóa đơn nào được thanh toán.</p>';
            return;
        }

        receiptsToShow.forEach((receipt, receiptIndex) => {
            const receiptDiv = document.createElement("div");
            receiptDiv.classList.add("paid-receipt-card");
            receiptDiv.innerHTML = `
                <h3>Hóa đơn #${receiptIndex + 1}</h3>
                <p><strong>Ngày:</strong> ${receipt.date}</p>
                <p><strong>Người mua:</strong> ${receipt.customerName || "Khách lạ"}</p>
                <p><strong>Mã chuyển khoản:</strong> ${receipt.transactionCode}</p>
                <p><strong>Nội dung chuyển khoản:</strong> ${receipt.transactionContent || "Không có nội dung"}</p>
                <div class="paid-items"></div>
                <p class="paid-total"><strong>Tổng đã thanh toán:</strong> ${receipt.total} VND</p>
            `;

            const itemsContainer = receiptDiv.querySelector(".paid-items");
            (receipt.items || []).forEach(item => {
                const itemLine = document.createElement("p");
                const quantityLabel = item.type === "laundry" ? "Khối lượng" : "Số lượng";
                const unit = item.type === "laundry" ? ` ${item.unit}` : "";
                itemLine.textContent = `${item.foodName} - ${quantityLabel}: ${item.quantity}${unit} - ${item.total} VND`;
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
                <p>Giá: ${item.foodPrice} VND</p>
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
            <p>Giá/${item.unit}: ${item.foodPrice} VND</p>
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
        loginButton.addEventListener("click", function() {
            const username = loginUsername.value.trim();
            const password = loginPassword.value;
            if (username === "dung" && password === "dung1") {
                setAuthState(true);
                closeLoginModal();
            } else {
                loginError.textContent = "Username hoặc mật khẩu không đúng.";
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
                toppingsInfo = `<br><small>Toppings: ${item.selectedToppings.map(t => t.name).join(", ")} (+${item.toppingPrice} VND)</small>`;
            }
            itemDiv.innerHTML = `
                <p>${item.foodName} - ${quantityLabel}: ${item.quantity}${unit} - Tổng: ${item.total} VND${toppingsInfo}</p>
            `;
            cartItemsDiv.appendChild(itemDiv);
            total += item.total;
        });
        const totalDiv = document.createElement("div");
        totalDiv.innerHTML = `<h3>Tổng cộng: ${total} VND</h3>`;
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
                ? laundryItems.map(item => `${item.foodName}: ${item.quantity} ${item.unit} - ${item.total} VND`).join("; ")
                : "";
            const transactionContent = `${transactionCode} ${purchaserName}`.slice(0, 25);

            document.getElementById("transaction-info").innerHTML = `
                <p><strong>Mã đơn hàng:</strong> ${transactionCode}</p>
                <p><strong>Thời gian:</strong> ${transactionDateTime}</p>
                <p><strong>Người mua:</strong> ${purchaserName}</p>
                <p><strong>Số xôi:</strong> ${xoiItemsCount}</p>
                <p><strong>Giặt ủi:</strong> ${laundryInfo || "Không có"}</p>
                <p><strong>Số tiền:</strong> ${total} VND</p>
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