const express = require("express");
const path = require("path");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

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

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Get all receipts ─────────────────────────────────────────────────────────
app.get("/api/receipts", async (req, res) => {
    const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching receipts:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// ─── Save a receipt ───────────────────────────────────────────────────────────
app.post("/api/receipts", async (req, res) => {
    const { items, total, date, transactionCode, customerName, transactionContent } = req.body;

    if (!transactionCode || !total) {
        return res.status(400).json({ error: "transactionCode and total are required." });
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
        console.error("Error saving receipt:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, receipt: data });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
