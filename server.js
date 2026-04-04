const express = require("express");
const path = require("path");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const {
    VNPay, ProductCode, VnpLocale, ignoreLogger,
    IpnFailChecksum, InpOrderAlreadyConfirmed, IpnUnknownError, IpnSuccess
} = require("vnpay");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve main.html at root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "main.html"));
});

// Serve paid.html
app.get("/paid", (req, res) => {
    res.sendFile(path.join(__dirname, "paid.html"));
});

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── VNPay ────────────────────────────────────────────────────────────────────
const vnpay = new VNPay({
    tmnCode: process.env.VNPAY_TMN_CODE,
    secureSecret: process.env.VNPAY_SECURE_SECRET,
    vnpayHost: process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn",
    testMode: process.env.NODE_ENV !== "production",
    hashAlgorithm: "SHA512",
    enableLog: false,
    loggerFn: ignoreLogger,
});

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-memory payment status store
const paymentStatuses = new Map();

// ─── Create VNPay Payment URL ─────────────────────────────────────────────────
app.post("/api/create-payment", (req, res) => {
    const { orderCode, amount, description } = req.body;

    if (!orderCode || !amount || !description) {
        return res.status(400).json({ error: "orderCode, amount, description la bat buoc." });
    }

    try {
        const ipAddr = (
            req.headers["x-forwarded-for"] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            req.ip ||
            "127.0.0.1"
        ).split(",")[0].trim();

        // VNPay: Vietnamese without accents, no special chars
        const orderInfo = String(description)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .slice(0, 255);

        const paymentUrl = vnpay.buildPaymentUrl({
            vnp_Amount: Number(amount),
            vnp_IpAddr: ipAddr,
            vnp_TxnRef: String(orderCode),
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: ProductCode.Other,
            vnp_ReturnUrl: `${BASE_URL}/api/vnpay-return`,
            vnp_Locale: VnpLocale.VN,
        });

        paymentStatuses.set(String(orderCode), "PENDING");
        res.json({ paymentUrl });
    } catch (err) {
        console.error("Loi tao payment URL:", err);
        res.status(500).json({ error: "Khong the tao link thanh toan." });
    }
});

// ─── Check Payment Status ─────────────────────────────────────────────────────
app.get("/api/payment-status/:orderCode", (req, res) => {
    const status = paymentStatuses.get(req.params.orderCode) || "NOT_FOUND";
    res.json({ status });
});

// ─── Receipts: Get all ────────────────────────────────────────────────────────
app.get("/api/receipts", async (req, res) => {
    const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Loi lay receipts:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// ─── Receipts: Save one ───────────────────────────────────────────────────────
app.post("/api/receipts", async (req, res) => {
    const { items, total, date, transactionCode, customerName, transactionContent } = req.body;

    if (!transactionCode || !total) {
        return res.status(400).json({ error: "transactionCode va total la bat buoc." });
    }

    const { data, error } = await supabase
        .from("receipts")
        .insert([{
            items,
            total,
            date,
            transaction_code: transactionCode,
            customer_name: customerName,
            transaction_content: transactionContent
        }])
        .select()
        .single();

    if (error) {
        console.error("Loi luu receipt:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, receipt: data });
});

// ─── VNPay IPN (server-to-server notification from VNPay) ────────────────────
app.get("/api/vnpay-ipn", async (req, res) => {
    try {
        const verify = vnpay.verifyIpnCall(req.query);

        if (!verify.isVerified) {
            return res.json(IpnFailChecksum);
        }

        const orderCode = String(verify.vnp_TxnRef);

        if (!verify.isSuccess) {
            paymentStatuses.set(orderCode, "FAILED");
            return res.json(IpnUnknownError);
        }

        if (paymentStatuses.get(orderCode) === "PAID") {
            return res.json(InpOrderAlreadyConfirmed);
        }

        paymentStatuses.set(orderCode, "PAID");
        console.log(`VNPay IPN: Don hang ${orderCode} da thanh toan ${verify.vnp_Amount} VND`);

        const { error } = await supabase.from("receipts").upsert([{
            transaction_code: orderCode,
            total: verify.vnp_Amount,
            date: new Date().toISOString(),
            customer_name: "Khach la",
            transaction_content: verify.vnp_OrderInfo || "",
            items: [],
            raw_webhook: JSON.parse(JSON.stringify(verify))
        }], { onConflict: "transaction_code" });

        if (error) console.error("Loi luu IPN receipt:", error.message);

        return res.json(IpnSuccess);
    } catch (err) {
        console.error("VNPay IPN error:", err);
        return res.json(IpnUnknownError);
    }
});

// ─── VNPay Return URL (browser redirect after payment) ───────────────────────
app.get("/api/vnpay-return", (req, res) => {
    try {
        const verify = vnpay.verifyReturnUrl(req.query);
        const orderCode = verify.vnp_TxnRef || "";

        if (!verify.isVerified || !verify.isSuccess) {
            return res.redirect(`/?payment=failed&order=${encodeURIComponent(orderCode)}`);
        }

        paymentStatuses.set(String(orderCode), "PAID");
        return res.redirect(`/?payment=success&order=${encodeURIComponent(orderCode)}`);
    } catch {
        return res.redirect("/?payment=failed");
    }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server chay tai ${BASE_URL}`);
    console.log(`VNPay IPN: ${BASE_URL}/api/vnpay-ipn`);
    console.log(`VNPay Return: ${BASE_URL}/api/vnpay-return`);
});
