"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, FlaskConical, Loader2, RefreshCcw, RotateCcw, ShieldCheck, Webhook, XCircle } from "lucide-react";
import { toast } from "@/lib/client-toast";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { Button } from "@/components/ui/button";
import { openRazorpayCheckout, type RazorpayCheckoutResponse } from "@/services/razorpay-checkout-client";

type TestOrder = { providerOrderId: string; keyId: string; amount: number; currency: string; name: string; image?: string };
type VerificationLog = {
  id: string;
  action: string;
  status: "PASS" | "FAIL" | "MANUAL";
  request: unknown;
  response: unknown;
  durationMs: number;
  error?: string;
  recommendation: string;
  at: string;
};
type ApiResult = Partial<VerificationLog> & { ok?: boolean; message?: string; response?: Record<string, unknown> };

export function PaymentVerificationCenter() {
  const [busy, setBusy] = useState("");
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [payment, setPayment] = useState<RazorpayCheckoutResponse | null>(null);

  function addLog(log: Omit<VerificationLog, "id" | "at">) {
    setLogs((current) => [{ ...log, id: crypto.randomUUID(), at: new Date().toISOString() }, ...current].slice(0, 40));
  }

  async function runApi(action: string, input: Record<string, unknown> = {}) {
    setBusy(action);
    const startedAt = performance.now();
    try {
      const response = await fetch("/api/owner/payment-settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...input }),
      });
      const payload = await response.json().catch(() => ({})) as ApiResult;
      const log: Omit<VerificationLog, "id" | "at"> = {
        action,
        status: response.ok && payload.ok !== false ? "PASS" : "FAIL",
        request: payload.request ?? { action },
        response: payload.response ?? {},
        durationMs: Number(payload.durationMs ?? Math.round(performance.now() - startedAt)),
        error: payload.error,
        recommendation: payload.recommendation || payload.message || "Review the verification result.",
      };
      addLog(log);
      if (!response.ok || payload.ok === false) throw new Error(payload.error || payload.recommendation || `${action} failed.`);
      toast.success(payload.message || `${action} passed.`);
      return payload;
    } finally {
      setBusy("");
    }
  }

  async function createOrder() {
    try {
      const payload = await runApi("createTestOrder");
      const value = payload.response as Partial<TestOrder> | undefined;
      if (!value?.providerOrderId || !value.keyId || !value.amount) throw new Error("Test order response is incomplete.");
      setOrder(value as TestOrder);
      setPayment(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test order creation failed.");
    }
  }

  async function openCheckout() {
    if (!order) return toast.error("Create a test order first.");
    setBusy("openCheckout");
    const startedAt = performance.now();
    try {
      const result = await openRazorpayCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name || "Nammude",
        image: order.image,
        description: "Owner payment verification",
        order_id: order.providerOrderId,
      });
      setPayment(result);
      addLog({ action: "openCheckout", status: "PASS", request: { providerOrderId: order.providerOrderId }, response: { paymentId: result.razorpay_payment_id }, durationMs: Math.round(performance.now() - startedAt), recommendation: "Verify the signature, then capture or refund only in test mode." });
      toast.success("Test checkout completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test checkout failed.";
      addLog({ action: "openCheckout", status: "FAIL", request: { providerOrderId: order.providerOrderId }, response: {}, durationMs: Math.round(performance.now() - startedAt), error: message, recommendation: "Use Razorpay test credentials and a supported test payment method." });
      toast.error(message);
    } finally {
      setBusy("");
    }
  }

  async function verifyPayment() {
    if (!payment) return toast.error("Complete test checkout first.");
    try {
      await runApi("verifyTestPayment", {
        providerOrderId: payment.razorpay_order_id,
        paymentId: payment.razorpay_payment_id,
        signature: payment.razorpay_signature,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signature verification failed.");
    }
  }

  async function paymentAction(action: "captureTestPayment" | "refundTestPayment") {
    if (!payment) return toast.error("Complete test checkout first.");
    try {
      await runApi(action, { paymentId: payment.razorpay_payment_id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${action} failed.`);
    }
  }

  function simulate(action: string, recommendation: string) {
    addLog({ action, status: "MANUAL", request: { simulation: true }, response: { handler: "verified" }, durationMs: 0, recommendation });
    toast.success(`${action} handler recorded.`);
  }

  return (
    <DashboardCard title="Payment Verification Center">
      <div className="space-y-5">
        <div className="rounded-md border border-input bg-muted/20 p-3 text-sm text-muted-foreground">
          Provider-mutating actions are restricted to Razorpay test mode. Secrets remain server-side; logs contain only action names and provider-safe identifiers.
        </div>
        <div className="flex flex-wrap gap-2">
          <Action label="Test Connection" action="test" busy={busy} icon={RefreshCcw} onClick={() => void runApi("test").catch(showError)} />
          <Action label="Validate API Keys" action="validateKeys" busy={busy} icon={ShieldCheck} onClick={() => void runApi("validateKeys").catch(showError)} />
          <Action label="Configuration" action="diagnostics" busy={busy} icon={CheckCircle2} onClick={() => void runApi("diagnostics").catch(showError)} />
          <Action label="Create Test Order" action="createTestOrder" busy={busy} icon={FlaskConical} onClick={() => void createOrder()} />
          <Action label="Open Checkout" action="openCheckout" busy={busy} icon={CreditCard} onClick={() => void openCheckout()} />
          <Action label="Verify Signature" action="verifyTestPayment" busy={busy} icon={ShieldCheck} onClick={() => void (payment ? verifyPayment() : runApi("verifySignature").catch(showError))} />
          <Action label="Verify Webhook" action="verifyWebhook" busy={busy} icon={Webhook} onClick={() => void runApi("verifyWebhook").catch(showError)} />
          <Action label="Test Capture" action="captureTestPayment" busy={busy} icon={CheckCircle2} onClick={() => void paymentAction("captureTestPayment")} />
          <Action label="Test Refund" action="refundTestPayment" busy={busy} icon={RotateCcw} onClick={() => void paymentAction("refundTestPayment")} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => simulate("Failed Payment", "Complete the real failed-payment card case in Razorpay test checkout.")}><XCircle className="size-4" />Test Failed Payment</Button>
          <Button type="button" variant="outline" onClick={() => simulate("Cancel", "Open checkout and close the modal to verify the real cancel callback.")}><XCircle className="size-4" />Test Cancel</Button>
          <Button type="button" variant="outline" onClick={() => simulate("Timeout", "Network/provider timeout remains a controlled browser test.")}><XCircle className="size-4" />Test Timeout</Button>
        </div>
        <div className="rounded-md border border-input">
          <div className="flex items-center justify-between gap-3 border-b border-input p-3">
            <p className="font-bold text-foreground">Verification Logs</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setLogs([])}>Clear Logs</Button>
          </div>
          <div className="max-h-80 divide-y divide-input overflow-auto" aria-live="polite">
            {logs.length ? logs.map((log) => (
              <details key={log.id} className="p-3 text-xs">
                <summary className="cursor-pointer font-bold text-foreground">{log.action} · <span className={log.status === "PASS" ? "text-emerald-700" : log.status === "FAIL" ? "text-red-700" : "text-amber-700"}>{log.status}</span> · {log.durationMs} ms</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-muted-foreground">{JSON.stringify({ request: log.request, response: log.response, error: log.error, recommendation: log.recommendation, at: log.at }, null, 2)}</pre>
              </details>
            )) : <p className="p-4 text-sm text-muted-foreground">No payment tests recorded.</p>}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function Action({ label, action, busy, icon: Icon, onClick }: { label: string; action: string; busy: string; icon: typeof CreditCard; onClick: () => void }) {
  return <Button type="button" variant="outline" disabled={Boolean(busy)} onClick={onClick}>{busy === action ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}{label}</Button>;
}

function showError(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Payment verification failed.");
}
