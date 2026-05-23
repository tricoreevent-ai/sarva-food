"use client";

import { Download, Edit3, FileText, Landmark, Printer, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/app-store";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID } from "@/lib/tenant";
import { formatCurrency } from "@/lib/utils";
import { saveAccountingEntry } from "@/services/production-data-service";

type AccountingEntryType = "income" | "expense";
type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";
type AccountingEntry = {
  id: string;
  type: AccountingEntryType;
  category: string;
  branchId: string;
  amount: number;
  gst: number;
  paymentMode: "cash" | "upi" | "card" | "bank";
  notes: string;
  attachment: string;
  createdBy: string;
  approvalStatus: ApprovalStatus;
  createdAt: string;
};

const incomeCategories = ["sales income", "online income", "other income", "delivery income", "catering income"];
const expenseCategories = ["employee salary", "contractor payment", "ingredient purchase", "gas/electricity", "rent", "maintenance", "internet", "packaging", "transport", "marketing", "miscellaneous"];

export default function AccountingPage() {
  const expenses = useAppStore((state) => state.expenses);
  const transactions = useAppStore((state) => state.transactions);
  const branches = useAppStore((state) => state.branches);
  const authUser = useAppStore((state) => state.authUser);
  const restaurantId = authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
  const [entries, setEntries] = useState<AccountingEntry[]>(() => [
    ...transactions.map((transaction) => ({
      id: transaction.id,
      type: "income" as const,
      category: transaction.type === "sale" ? "sales income" : "other income",
      branchId: transaction.branchId,
      amount: transaction.total,
      gst: transaction.taxData.gstAmount,
      paymentMode: transaction.paymentMethod === "cod" ? "cash" as const : transaction.paymentMethod,
      notes: transaction.orderId,
      attachment: "",
      createdBy: transaction.userId,
      approvalStatus: "approved" as const,
      createdAt: transaction.timestamp,
    })),
    ...expenses.map((expense) => ({
      id: expense.id,
      type: "expense" as const,
      category: "ingredient purchase",
      branchId: expense.branchId,
      amount: expense.amount,
      gst: expense.taxAmount,
      paymentMode: expense.paidBy === "cod" ? "cash" as const : expense.paidBy,
      notes: expense.note,
      attachment: "",
      createdBy: "staff-accountant",
      approvalStatus: "pending" as const,
      createdAt: expense.timestamp,
    })),
  ]);
  const [draft, setDraft] = useState<AccountingEntry>(() => emptyEntry(branches[0]?.id ?? DEFAULT_BRANCH_ID));
  const [editingId, setEditingId] = useState<string | null>(null);
  const income = entries.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = entries.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const gst = entries.reduce((sum, item) => sum + item.gst * (item.type === "income" ? 1 : -1), 0);
  const cashbookRows = useMemo(() => entries.filter((item) => item.paymentMode === "cash"), [entries]);
  const ledgerRows = useMemo(() => {
    const grouped = new Map<string, { id: string; category: string; debit: number; credit: number; gst: number; count: number }>();
    entries.forEach((entry) => {
      const row = grouped.get(entry.category) ?? { id: entry.category, category: entry.category, debit: 0, credit: 0, gst: 0, count: 0 };
      if (entry.type === "income") row.credit += entry.amount;
      else row.debit += entry.amount;
      row.gst += entry.gst;
      row.count += 1;
      grouped.set(entry.category, row);
    });
    return Array.from(grouped.values());
  }, [entries]);
  const columns: AdvancedColumn<AccountingEntry>[] = [
    { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleDateString() },
    { key: "type", label: "Type", render: (row) => <Badge variant={row.type === "income" ? "success" : "warning"}>{row.type}</Badge> },
    { key: "category", label: "Category" },
    { key: "branchId", label: "Branch", render: (row) => branches.find((branch) => branch.id === row.branchId)?.name ?? row.branchId },
    { key: "amount", label: "Amount", align: "right", render: (row) => formatCurrency(row.amount), exportValue: (row) => row.amount },
    { key: "gst", label: "GST", align: "right", render: (row) => formatCurrency(row.gst), exportValue: (row) => row.gst },
    { key: "paymentMode", label: "Mode" },
    { key: "approvalStatus", label: "Approval", render: (row) => <Badge variant={row.approvalStatus === "approved" ? "success" : row.approvalStatus === "rejected" ? "destructive" : "muted"}>{row.approvalStatus}</Badge> },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex min-w-44 gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingId(row.id); setDraft(row); }}><Edit3 className="size-3" />Edit</Button>
          <Button size="sm" variant="destructive" onClick={() => setEntries((current) => current.filter((entry) => entry.id !== row.id))}><Trash2 className="size-3" />Delete</Button>
        </div>
      ),
    },
  ];

  async function saveEntry() {
    if (!draft.amount || !draft.category) return;
    if (editingId) {
      setEntries((current) => current.map((entry) => entry.id === editingId ? draft : entry));
      await saveAccountingEntry({
        ...draft,
        id: editingId,
        attachmentUrl: draft.attachment,
        restaurantId,
      });
      setEditingId(null);
    } else {
      const next = { ...draft, id: `acc-${Date.now()}`, createdAt: new Date().toISOString() };
      setEntries((current) => [next, ...current]);
      await saveAccountingEntry({
        ...next,
        attachmentUrl: next.attachment,
        restaurantId,
      });
    }
    setDraft(emptyEntry(branches[0]?.id ?? DEFAULT_BRANCH_ID));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Accounting command center"
        description="Income, expenses, approvals, journal entries, ledger, cashbook, GST summary, analytics, exports, and print."
        action={<Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>}
      />
      <section className="dashboard-grid">
        <Metric title="Income" value={formatCurrency(income)} />
        <Metric title="Expenses" value={formatCurrency(expense)} />
        <Metric title="GST net" value={formatCurrency(gst)} />
        <Metric title="Gross profit" value={formatCurrency(income - expense)} />
      </section>
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-4">
          <label className="grid gap-1 text-sm font-bold">
            Type
            <select className="h-10 rounded-md border bg-background px-3" value={draft.type} onChange={(event) => {
              const type = event.target.value as AccountingEntryType;
              setDraft({ ...draft, type, category: type === "income" ? incomeCategories[0] : expenseCategories[0] });
            }}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Category
            <select className="h-10 rounded-md border bg-background px-3" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
              {(draft.type === "income" ? incomeCategories : expenseCategories).map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Branch
            <select className="h-10 rounded-md border bg-background px-3" value={draft.branchId} onChange={(event) => setDraft({ ...draft, branchId: event.target.value })}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Payment mode
            <select className="h-10 rounded-md border bg-background px-3" value={draft.paymentMode} onChange={(event) => setDraft({ ...draft, paymentMode: event.target.value as AccountingEntry["paymentMode"] })}>
              {["cash", "upi", "card", "bank"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </label>
          <Field label="Amount" value={String(draft.amount || "")} onChange={(value) => setDraft({ ...draft, amount: Number(value) || 0 })} type="number" />
          <Field label="GST" value={String(draft.gst || "")} onChange={(value) => setDraft({ ...draft, gst: Number(value) || 0 })} type="number" />
          <Field label="Created by" value={draft.createdBy} onChange={(value) => setDraft({ ...draft, createdBy: value })} />
          <label className="grid gap-1 text-sm font-bold">
            Approval
            <select className="h-10 rounded-md border bg-background px-3" value={draft.approvalStatus} onChange={(event) => setDraft({ ...draft, approvalStatus: event.target.value as ApprovalStatus })}>
              {["draft", "pending", "approved", "rejected"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <div className="lg:col-span-2"><Field label="Notes" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} /></div>
          <div className="lg:col-span-2"><Field label="Attachment URL" value={draft.attachment} onChange={(value) => setDraft({ ...draft, attachment: value })} /></div>
          <div className="flex flex-wrap gap-2 lg:col-span-4">
            <Button onClick={() => void saveEntry()}><Save className="size-4" />{editingId ? "Update entry" : "Create entry"}</Button>
            <Button variant="outline" onClick={() => { setEditingId(null); setDraft(emptyEntry(branches[0]?.id ?? DEFAULT_BRANCH_ID)); }}>Clear</Button>
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="journal">
        <TabsList className="customer-scroll w-full justify-start overflow-x-auto">
          {["journal", "ledger", "transactions", "cashbook", "gst", "expenses", "income"].map((tab) => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="journal" className="mt-4"><AdvancedDataTable title="Journal entries" columns={columns} rows={entries} exportFilename="journal-entries.csv" /></TabsContent>
        <TabsContent value="ledger" className="mt-4"><AdvancedDataTable title="Ledger view" columns={[
          { key: "category", label: "Ledger" }, { key: "count", label: "Entries", align: "right" }, { key: "debit", label: "Debit", align: "right", render: (row) => formatCurrency(Number(row.debit)) }, { key: "credit", label: "Credit", align: "right", render: (row) => formatCurrency(Number(row.credit)) }, { key: "gst", label: "GST", align: "right", render: (row) => formatCurrency(Number(row.gst)) },
        ]} rows={ledgerRows} /></TabsContent>
        <TabsContent value="transactions" className="mt-4"><AdvancedDataTable title="Transaction history" columns={columns} rows={entries} /></TabsContent>
        <TabsContent value="cashbook" className="mt-4"><AdvancedDataTable title="Cashbook" columns={columns} rows={cashbookRows} /></TabsContent>
        <TabsContent value="gst" className="mt-4"><AdvancedDataTable title="GST summary" columns={columns.filter((column) => ["createdAt", "type", "category", "gst", "approvalStatus"].includes(column.key))} rows={entries.filter((entry) => entry.gst > 0)} /></TabsContent>
        <TabsContent value="expenses" className="mt-4"><AdvancedDataTable title="Expense analytics" columns={columns} rows={entries.filter((entry) => entry.type === "expense")} /></TabsContent>
        <TabsContent value="income" className="mt-4"><AdvancedDataTable title="Income analytics" columns={columns} rows={entries.filter((entry) => entry.type === "income")} /></TabsContent>
      </Tabs>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => exportAccounting(entries)}><Download className="size-4" />Export accounting CSV</Button>
        <Button variant="outline" onClick={() => window.print()}><FileText className="size-4" />Print report</Button>
        <Button variant="outline"><Landmark className="size-4" />Cash/bank tracking</Button>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <Card><CardContent className="bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_12%,transparent),transparent)] p-5"><p className="text-sm font-bold text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-black">{value}</p></CardContent></Card>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-1 text-sm font-bold">{label}<Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function emptyEntry(branchId: string): AccountingEntry {
  return {
    id: "",
    type: "expense",
    category: expenseCategories[0],
    branchId,
    amount: 0,
    gst: 0,
    paymentMode: "upi",
    notes: "",
    attachment: "",
    createdBy: "staff-accountant",
    approvalStatus: "pending",
    createdAt: new Date().toISOString(),
  };
}

function exportAccounting(entries: AccountingEntry[]) {
  const rows = [
    ["Date", "Type", "Category", "Branch", "Amount", "GST", "Mode", "Created By", "Approval", "Notes"],
    ...entries.map((entry) => [entry.createdAt, entry.type, entry.category, entry.branchId, entry.amount, entry.gst, entry.paymentMode, entry.createdBy, entry.approvalStatus, entry.notes]),
  ];
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(rows.map((row) => row.join(",")).join("\n"))}`;
  const link = document.createElement("a");
  link.href = href;
  link.download = "accounting-entries.csv";
  link.click();
}
