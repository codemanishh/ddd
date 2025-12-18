import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { 
  Receipt, 
  Calculator,
  RotateCcw,
  Download,
  Printer,
  AlertCircle,
  QrCode,
  Smartphone,
  History,
  Calendar,
  Clock,
  FileText,
  Filter,
  X
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Table, Order, Bill, BillItem } from "@shared/schema";

export default function AdminBilling() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const { admin, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [discountPercentage, setDiscountPercentage] = useState<string>("0");
  const [serviceChargePercentage, setServiceChargePercentage] = useState<string>("0");
  const [paymentMode, setPaymentMode] = useState<string>("cash");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [billPreview, setBillPreview] = useState<Bill | null>(null);
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<Bill | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("today");
  const [selectedHistoryBill, setSelectedHistoryBill] = useState<Bill | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation(`/admin/${adminUid}`);
    }
  }, [authLoading, isAuthenticated, adminUid, setLocation]);

  const { data: tables } = useQuery<Table[]>({
    queryKey: ['/api/tables', adminUid],
    enabled: isAuthenticated,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders', adminUid],
    enabled: isAuthenticated && !!selectedTable,
  });

  const { data: existingBills } = useQuery<Bill[]>({
    queryKey: ['/api/bills', adminUid, selectedTable],
    enabled: isAuthenticated && !!selectedTable,
  });

  const { data: billHistory } = useQuery<Bill[]>({
    queryKey: ['/api/bills/history', adminUid],
    queryFn: async () => {
      return apiRequest<Bill[]>("GET", `/api/bills/history/${adminUid}`);
    },
    enabled: isAuthenticated && showHistoryDialog,
  });

  const filteredBillHistory = useMemo(() => {
    if (!billHistory) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);
    
    return billHistory.filter(bill => {
      const billDate = new Date(bill.generatedAt!);
      switch (historyFilter) {
        case 'today':
          return billDate >= today;
        case 'week':
          return billDate >= thisWeek;
        case 'month':
          return billDate >= thisMonth;
        case 'year':
          return billDate >= thisYear;
        case 'all':
        default:
          return true;
      }
    }).sort((a, b) => new Date(b.generatedAt!).getTime() - new Date(a.generatedAt!).getTime());
  }, [billHistory, historyFilter]);

  const historyStats = useMemo(() => {
    if (!filteredBillHistory.length) return { count: 0, total: 0 };
    return {
      count: filteredBillHistory.length,
      total: filteredBillHistory.reduce((sum, bill) => sum + parseFloat(bill.totalAmount), 0)
    };
  }, [filteredBillHistory]);

  const activeTables = tables?.filter(t => t.status === 'active' || t.status === 'billing') || [];
  const selectedTableData = tables?.find(t => t.tableNumber.toString() === selectedTable);

  const tableOrders = useMemo(() => {
    if (!selectedTable || !orders) return [];
    return orders.filter(o => 
      o.tableNumber.toString() === selectedTable && 
      o.orderStatus === 'active'
    );
  }, [selectedTable, orders]);

  const billableItems = useMemo(() => {
    const items: BillItem[] = [];
    tableOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.status === 'completed' || item.status === 'accepted' || item.status === 'processing') {
          const existingItem = items.find(i => i.menuItemId === item.menuItemId);
          if (existingItem) {
            existingItem.quantity += item.quantity;
          } else {
            items.push({
              menuItemId: item.menuItemId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            });
          }
        }
      });
    });
    return items;
  }, [tableOrders]);

  const subtotal = useMemo(() => {
    return billableItems.reduce((sum, item) => 
      sum + parseFloat(item.price) * item.quantity, 0
    );
  }, [billableItems]);

  const discountAmount = useMemo(() => {
    const discount = parseFloat(discountPercentage) || 0;
    return (subtotal * discount) / 100;
  }, [subtotal, discountPercentage]);

  const serviceChargeAmount = useMemo(() => {
    const charge = parseFloat(serviceChargePercentage) || 0;
    return ((subtotal - discountAmount) * charge) / 100;
  }, [subtotal, discountAmount, serviceChargePercentage]);

  const totalAmount = useMemo(() => {
    return subtotal - discountAmount + serviceChargeAmount;
  }, [subtotal, discountAmount, serviceChargeAmount]);

  const generateUpiQrString = (upiId: string, amount?: number) => {
    const merchantName = admin?.restaurantName?.replace(/[^a-zA-Z0-9 ]/g, '') || 'Restaurant';
    let qrString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}`;
    if (amount && amount > 0) {
      qrString += `&am=${amount.toFixed(2)}`;
    }
    return qrString;
  };

  const generateBillMutation = useMutation({
    mutationFn: async (): Promise<Bill> => {
      return apiRequest<Bill>("POST", "/api/bills", {
        adminUid,
        sessionId: selectedTableData?.activeSessionId || `session-${Date.now()}`,
        tableNumber: parseInt(selectedTable),
        items: billableItems,
        discountPercentage: parseFloat(discountPercentage) || 0,
        serviceChargePercentage: parseFloat(serviceChargePercentage) || 0,
        paymentMode: paymentMode,
      });
    },
    onSuccess: (data: Bill) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bills', adminUid] });
      setBillPreview(data);
      setGeneratedBill(data);
      setShowBillDialog(true);
      toast({ title: "Bill generated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate bill", description: error.message, variant: "destructive" });
    },
  });

  const resetTableMutation = useMutation({
    mutationFn: async () => {
      const billToFinalize = generatedBill || billPreview || currentBill;
      if (billToFinalize) {
        return apiRequest("POST", `/api/bills/${billToFinalize.id}/finalize`, {});
      }
      throw new Error("No bill to finalize");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables', adminUid] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', adminUid] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills', adminUid] });
      toast({ title: "Table reset successfully" });
      setSelectedTable("");
      setResetConfirmOpen(false);
      setBillPreview(null);
      setGeneratedBill(null);
      setShowBillDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reset table", description: error.message, variant: "destructive" });
    },
  });

  const currentBill = existingBills?.find(b => 
    b.tableNumber.toString() === selectedTable && !b.isFinal
  );

  const downloadBillPdf = async (bill: Bill) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 25;
    const marginRight = pageWidth - 25;
    const contentWidth = marginRight - marginLeft;
    let y = 20;
    
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(admin?.restaurantName || "Restaurant", pageWidth / 2, 20, { align: "center" });
    
    let headerY = 28;
    if (admin?.address) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(admin.address, pageWidth / 2, headerY, { align: "center" });
      headerY += 6;
    }
    if (admin?.phone) {
      doc.setFontSize(9);
      doc.text(`Tel: ${admin.phone}`, pageWidth / 2, headerY, { align: "center" });
      headerY += 5;
    }
    if (admin?.gstNumber) {
      doc.setFontSize(9);
      doc.text(`GSTIN: ${admin.gstNumber}`, pageWidth / 2, headerY, { align: "center" });
    }
    
    doc.setTextColor(0, 0, 0);
    y = 55;
    
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(marginLeft - 5, y - 5, contentWidth + 10, 28, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", marginLeft, y + 5);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`#${bill.billNumber}`, marginLeft, y + 14);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Table #${bill.tableNumber}`, marginRight, y + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const billDate = new Date(bill.generatedAt!);
    doc.text(billDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), marginRight, y + 14, { align: "right" });
    doc.text(billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), marginRight, y + 20, { align: "right" });
    
    y += 35;
    
    doc.setFillColor(124, 58, 237);
    doc.roundedRect(marginLeft - 5, y, contentWidth + 10, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ITEM", marginLeft, y + 7);
    doc.text("QTY", pageWidth / 2, y + 7, { align: "center" });
    doc.text("AMOUNT", marginRight, y + 7, { align: "right" });
    
    y += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    bill.items.forEach((item, index) => {
      const amount = parseFloat(item.price) * item.quantity;
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(marginLeft - 5, y - 4, contentWidth + 10, 10, 'F');
      }
      
      doc.setFontSize(10);
      const itemName = item.name.length > 28 ? item.name.substring(0, 28) + '...' : item.name;
      doc.text(itemName, marginLeft, y + 2);
      doc.text(item.quantity.toString(), pageWidth / 2, y + 2, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(`Rs.${amount.toLocaleString('en-IN')}`, marginRight, y + 2, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 10;
    });
    
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(marginLeft, y, marginRight, y);
    doc.setLineDashPattern([], 0);
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Subtotal", marginLeft, y);
    doc.setTextColor(0, 0, 0);
    doc.text(`Rs.${parseFloat(bill.subtotal).toLocaleString('en-IN')}`, marginRight, y, { align: "right" });
    y += 8;
    
    if (parseFloat(bill.discountAmount) > 0) {
      doc.setTextColor(34, 197, 94);
      doc.text(`Discount (${bill.discountPercentage}%)`, marginLeft, y);
      doc.text(`-Rs.${parseFloat(bill.discountAmount).toLocaleString('en-IN')}`, marginRight, y, { align: "right" });
      y += 8;
    }
    
    if (parseFloat(bill.serviceChargeAmount) > 0) {
      doc.setTextColor(100, 100, 100);
      doc.text(`Service Charge (${bill.serviceChargePercentage}%)`, marginLeft, y);
      doc.setTextColor(0, 0, 0);
      doc.text(`+Rs.${parseFloat(bill.serviceChargeAmount).toLocaleString('en-IN')}`, marginRight, y, { align: "right" });
      y += 8;
    }
    
    y += 3;
    doc.setFillColor(124, 58, 237);
    doc.roundedRect(marginLeft - 5, y, contentWidth + 10, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", marginLeft, y + 10);
    doc.setFontSize(14);
    doc.text(`Rs.${parseFloat(bill.totalAmount).toLocaleString('en-IN')}`, marginRight, y + 10, { align: "right" });
    
    y += 22;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    if (bill.paymentMode) {
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(marginLeft - 5, y, contentWidth + 10, 10, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Payment Mode:", marginLeft, y + 7);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(bill.paymentMode.toUpperCase(), marginRight, y + 7, { align: "right" });
      y += 18;
    }
    
    if (admin?.upiId) {
      doc.setFillColor(252, 251, 255);
      doc.setDrawColor(124, 58, 237);
      doc.roundedRect(marginLeft - 5, y, contentWidth + 10, 65, 3, 3, 'FD');
      
      doc.setTextColor(124, 58, 237);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Scan to Pay", pageWidth / 2, y + 10, { align: "center" });
      
      const qrCanvas = document.getElementById('pdf-qr-canvas') as HTMLCanvasElement;
      if (qrCanvas) {
        const qrDataUrl = qrCanvas.toDataURL('image/png');
        const qrSize = 32;
        const qrX = (pageWidth - qrSize) / 2;
        doc.addImage(qrDataUrl, 'PNG', qrX, y + 14, qrSize, qrSize);
      }
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`UPI ID: ${admin.upiId}`, pageWidth / 2, y + 55, { align: "center" });
      y += 72;
    }
    
    y += 8;
    doc.setFillColor(124, 58, 237);
    doc.roundedRect(marginLeft + 20, y, contentWidth - 40, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Thank you for dining with us!", pageWidth / 2, y + 12, { align: "center" });
    
    y += 28;
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Powered by TableServe", pageWidth / 2, y, { align: "center" });
    
    doc.save(`bill-${bill.billNumber}.pdf`);
    toast({ title: "Bill downloaded successfully" });
  };

  if (authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold" data-testid="text-billing-title">Billing</h1>
          <p className="text-muted-foreground">Generate bills and process payments for tables.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowHistoryDialog(true)}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          Bill History
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="w-full sm:w-64" data-testid="select-billing-table">
            <SelectValue placeholder="Select a table to bill" />
          </SelectTrigger>
          <SelectContent>
            {activeTables.length === 0 ? (
              <SelectItem value="none" disabled>No active tables</SelectItem>
            ) : (
              activeTables.map((table) => (
                <SelectItem key={table.id} value={table.tableNumber.toString()}>
                  Table #{table.tableNumber} ({table.status})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedTable ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Order Items - Table #{selectedTable}
              </CardTitle>
              <CardDescription>
                Items ready for billing (accepted, processing, or completed)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billableItems.length > 0 ? (
                <div className="space-y-3">
                  {billableItems.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/30"
                      data-testid={`billing-item-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">x{item.quantity}</Badge>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="font-semibold">
                        ₹{(parseFloat(item.price) * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No billable items for this table yet.</p>
                  <p className="text-sm">Accept and complete orders first.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Bill Summary
              </CardTitle>
              <CardDescription>
                Calculate totals with discounts and service charges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount">Discount (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                      data-testid="input-discount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="service">Service Charge (%)</Label>
                    <Input
                      id="service"
                      type="number"
                      min="0"
                      max="100"
                      value={serviceChargePercentage}
                      onChange={(e) => setServiceChargePercentage(e.target.value)}
                      data-testid="input-service-charge"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger id="paymentMode" data-testid="select-payment-mode">
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI (GPay, PhonePe, Paytm)</SelectItem>
                      <SelectItem value="card">Card (Debit/Credit)</SelectItem>
                      <SelectItem value="wallet">Wallet (Amazon Pay, etc)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMode === 'upi' && admin?.upiId && (
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Scan to Pay ₹{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-md">
                      <QRCodeSVG 
                        value={generateUpiQrString(admin.upiId, totalAmount)}
                        size={120}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      UPI: {admin.upiId}
                    </p>
                  </div>
                )}

                {paymentMode === 'upi' && !admin?.upiId && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">
                        UPI ID not configured. Go to Settings to add your UPI ID.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="text-subtotal">₹{subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({discountPercentage}%)</span>
                    <span data-testid="text-discount">-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Charge ({serviceChargePercentage}%)</span>
                    <span data-testid="text-service">+₹{serviceChargeAmount.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-bold pt-2">
                  <span>Total</span>
                  <span data-testid="text-total">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  disabled={billableItems.length === 0 || generateBillMutation.isPending}
                  onClick={() => generateBillMutation.mutate()}
                  data-testid="button-generate-bill"
                >
                  {generateBillMutation.isPending ? "Generating..." : "Generate Bill"}
                </Button>
                
                {(currentBill || billPreview || generatedBill) && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setResetConfirmOpen(true)}
                    data-testid="button-reset-table"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Table (Payment Complete)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">Select a Table</CardTitle>
            <CardDescription className="text-center">
              Choose an active table from the dropdown above to view and generate bills.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Generated</DialogTitle>
            <DialogDescription>
              Bill #{billPreview?.billNumber} for Table #{billPreview?.tableNumber}
            </DialogDescription>
          </DialogHeader>
          {billPreview && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold mb-2">{admin?.restaurantName}</h4>
                <p className="text-sm text-muted-foreground">{admin?.address}</p>
                {admin?.gstNumber && (
                  <p className="text-sm text-muted-foreground">GST: {admin.gstNumber}</p>
                )}
              </div>
              
              <div className="space-y-2">
                {billPreview.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>₹{(parseFloat(item.price) * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{parseFloat(billPreview.subtotal).toLocaleString()}</span>
                </div>
                {parseFloat(billPreview.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-₹{parseFloat(billPreview.discountAmount).toLocaleString()}</span>
                  </div>
                )}
                {parseFloat(billPreview.serviceChargeAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Service Charge</span>
                    <span>+₹{parseFloat(billPreview.serviceChargeAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total</span>
                  <span>₹{parseFloat(billPreview.totalAmount).toLocaleString()}</span>
                </div>
              </div>

              {admin?.upiId && (
                <div className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Scan to Pay via UPI</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <QRCodeSVG 
                      value={generateUpiQrString(admin.upiId, parseFloat(billPreview.totalAmount))}
                      size={100}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">UPI: {admin.upiId}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowBillDialog(false)}>
              Close
            </Button>
            {billPreview && (
              <Button onClick={() => downloadBillPdf(billPreview)} data-testid="button-download-pdf">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Table?</DialogTitle>
            <DialogDescription>
              This will mark the bill as final and reset Table #{selectedTable} for new customers.
              All order data will be archived to sales history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => resetTableMutation.mutate()}
              disabled={resetTableMutation.isPending}
              data-testid="button-confirm-reset"
            >
              {resetTableMutation.isPending ? "Resetting..." : "Reset Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Bill History
            </DialogTitle>
            <DialogDescription>
              View all completed bills from your restaurant
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={historyFilter} onValueChange={setHistoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{historyStats.count}</span>
                <span className="text-muted-foreground">bills</span>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <span className="font-bold">₹{historyStats.total.toLocaleString('en-IN')}</span>
                <span className="text-muted-foreground">total</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
            {filteredBillHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">No bills found</p>
                <p className="text-sm">Bills appear here after payment is completed</p>
              </div>
            ) : (
              filteredBillHistory.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedHistoryBill(bill)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{bill.billNumber}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Table #{bill.tableNumber}</span>
                        <span>•</span>
                        <span>{new Date(bill.generatedAt!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span>•</span>
                        <span>{new Date(bill.generatedAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{parseFloat(bill.totalAmount).toLocaleString('en-IN')}</p>
                    <Badge variant="outline" className="text-xs">
                      {bill.paymentMode?.toUpperCase() || 'N/A'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Detail Dialog from History */}
      <Dialog open={!!selectedHistoryBill} onOpenChange={(open) => !open && setSelectedHistoryBill(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
            <DialogDescription>
              {selectedHistoryBill?.billNumber} - Table #{selectedHistoryBill?.tableNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedHistoryBill && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(selectedHistoryBill.generatedAt!).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(selectedHistoryBill.generatedAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Items</p>
                {selectedHistoryBill.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span>{item.name} x{item.quantity}</span>
                    <span className="font-medium">₹{(parseFloat(item.price) * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{parseFloat(selectedHistoryBill.subtotal).toLocaleString('en-IN')}</span>
                </div>
                {parseFloat(selectedHistoryBill.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({selectedHistoryBill.discountPercentage}%)</span>
                    <span>-₹{parseFloat(selectedHistoryBill.discountAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {parseFloat(selectedHistoryBill.serviceChargeAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Charge ({selectedHistoryBill.serviceChargePercentage}%)</span>
                    <span>+₹{parseFloat(selectedHistoryBill.serviceChargeAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total</span>
                  <span>₹{parseFloat(selectedHistoryBill.totalAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Payment Mode</span>
                <Badge>{selectedHistoryBill.paymentMode?.toUpperCase() || 'N/A'}</Badge>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedHistoryBill(null)}>
              Close
            </Button>
            {selectedHistoryBill && (
              <Button onClick={() => downloadBillPdf(selectedHistoryBill)}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for PDF QR code generation - always render if UPI ID is configured */}
      {(billPreview || selectedHistoryBill) && admin?.upiId && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <QRCodeCanvas 
            id="pdf-qr-canvas"
            value={generateUpiQrString(admin.upiId, parseFloat((billPreview || selectedHistoryBill)!.totalAmount))}
            size={200}
            level="M"
            includeMargin={true}
          />
        </div>
      )}
    </div>
  );
}
