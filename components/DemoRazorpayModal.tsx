"use client";
import React, { useState } from "react";
import { inr } from "@/lib/format";

export type DemoRazorpayModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (details: { paymentId: string; orderId: string; signature: string }) => void;
  amount: number;
  title: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
};

export default function DemoRazorpayModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  title,
  description,
  customerName = "Valued Member",
  customerPhone = "9811000001",
}: DemoRazorpayModalProps) {
  const [tab, setTab] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("champions.member@okaxis");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handlePay() {
    setProcessing(true);
    // Simulate real gateway latency
    await new Promise((r) => setTimeout(r, 800));
    setProcessing(false);
    setSuccess(true);
    await new Promise((r) => setTimeout(r, 600));

    const dummyOrderId = "order_rp_" + Math.random().toString(36).substring(2, 9);
    const dummyPayId = "pay_test_" + Math.random().toString(36).substring(2, 10);
    const dummySignature = "sig_" + Math.random().toString(36).substring(2, 12);

    onSuccess({
      paymentId: dummyPayId,
      orderId: dummyOrderId,
      signature: dummySignature,
    });
    setSuccess(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 25, 18, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !processing) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#ffffff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        {/* Razorpay Brand Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0b1a30 0%, #0d2a54 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  background: "#3395ff",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  fontSize: 16,
                  color: "#fff",
                }}
              >
                R
              </div>
              <span style={{ fontWeight: 800, letterSpacing: "0.02em", fontSize: 16 }}>Razorpay</span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(223, 255, 69, 0.2)",
                color: "#dfff45",
                border: "1px solid rgba(223, 255, 69, 0.4)",
                padding: "2px 8px",
                borderRadius: 999,
                letterSpacing: "0.05em",
              }}
            >
              TEST MODE
            </span>
          </div>

          <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 2px" }}>The Champions Club · {title}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{inr(amount)}</span>
            {description && <span style={{ fontSize: 12, opacity: 0.85 }}>{description}</span>}
          </div>
        </div>

        {/* Payment Methods Navigation */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          {[
            { id: "upi", label: "UPI / QR", icon: "⚡" },
            { id: "card", label: "Cards", icon: "💳" },
            { id: "netbanking", label: "NetBanking", icon: "🏛️" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as any)}
              style={{
                padding: "10px 8px",
                fontSize: 12,
                fontWeight: tab === item.id ? 700 : 500,
                background: tab === item.id ? "#fff" : "transparent",
                color: tab === item.id ? "#0d2a54" : "#64748b",
                border: "none",
                borderBottom: tab === item.id ? "2px solid #3395ff" : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: 20 }}>
          {tab === "upi" && (
            <div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px dashed #cbd5e1",
                  background: "#f8fafc",
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 4 }}>📱</div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1e293b" }}>Scan with any UPI App</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>
                  Google Pay, PhonePe, Paytm, BHIM, CRED
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Or enter Virtual Payment Address (VPA)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: 14,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                  }}
                />
              </div>
            </div>
          )}

          {tab === "card" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Test Card Number
                </label>
                <input
                  type="text"
                  readOnly
                  value="4111 2222 3333 4242"
                  style={{
                    width: "100%",
                    fontSize: 14,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    fontFamily: "monospace",
                    letterSpacing: 1,
                  }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Expiry
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="12 / 28"
                    style={{
                      width: "100%",
                      fontSize: 14,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      textAlign: "center",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    CVV
                  </label>
                  <input
                    type="password"
                    readOnly
                    value="123"
                    style={{
                      width: "100%",
                      fontSize: 14,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      textAlign: "center",
                    }}
                  />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "#166534", fontWeight: 500 }}>
                ✓ Razorpay test card prefilled. Ready to simulate.
              </p>
            </div>
          )}

          {tab === "netbanking" && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#475569" }}>
                Select popular test bank:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"].map((b, i) => (
                  <button
                    key={b}
                    type="button"
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: i === 0 ? "2px solid #3395ff" : "1px solid #e2e8f0",
                      background: i === 0 ? "#eff6ff" : "#fff",
                      fontSize: 12,
                      fontWeight: i === 0 ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                      color: "#0f172a",
                    }}
                  >
                    🏦 {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer summary */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#64748b",
            }}
          >
            <span>Customer: <strong style={{ color: "#0f172a" }}>{customerName}</strong></span>
            <span>Phone: <strong style={{ color: "#0f172a" }}>{customerPhone}</strong></span>
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
            <button
              type="button"
              disabled={processing || success}
              onClick={handlePay}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: success ? "#10b981" : "linear-gradient(135deg, #3395ff 0%, #1772eb 100%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 15,
                cursor: processing || success ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 12px rgba(51, 149, 255, 0.35)",
                transition: "all 0.15s ease",
              }}
            >
              {success ? (
                <>✓ Payment Authorized ({inr(amount)})</>
              ) : processing ? (
                <>Verifying with Razorpay...</>
              ) : (
                <>🔒 Pay {inr(amount)} (Demo Razorpay)</>
              )}
            </button>

            <button
              type="button"
              disabled={processing || success}
              onClick={onClose}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: "#64748b",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cancel Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
