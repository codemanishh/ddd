import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Calendar,
  Clock,
  Users,
  Percent,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Timer,
  Layers,
  Receipt,
  BadgePercent,
  CreditCard,
  Smartphone,
  Banknote,
  Wallet,
  UtensilsCrossed,
  Wine,
  Coffee,
  FileText,
  IndianRupee
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SalesHistory } from "@shared/schema";

type TimeRange = 'today' | 'week' | 'month' | 'year';

interface DetailedAnalytics {
  quickActions: {
    pendingOrdersCount: number;
    tablesAwaitingBill: number;
    activeTables: number;
    totalTables: number;
  };
  timeBased: {
    hourlyData: { hour: number; label: string; orders: number; revenue: number }[];
    dayOfWeekData: { day: number; label: string; orders: number; revenue: number }[];
    peakHour: { hour: number; orders: number; revenue: number } | null;
  };
  financial: {
    totalSubtotal: number;
    totalDiscount: number;
    totalServiceCharge: number;
    totalRevenue: number;
    discountPercentage: string;
  };
  customerAnalytics: {
    avgItemsPerOrder: string;
    popularCombos: { combo: string; count: number }[];
    tableTurnoverRate: string;
    totalCompletedOrders: number;
  };
  paymentModes: {
    cash: { count: number; amount: number };
    upi: { count: number; amount: number };
    card: { count: number; amount: number };
    wallet: { count: number; amount: number };
  };
  categoryRevenue: {
    food: number;
    liquor: number;
    beverages: number;
    desserts: number;
  };
  gstSummary: {
    totalTaxableAmount: number;
    cgst: number;
    sgst: number;
    totalGst: number;
  };
  comparison: {
    previousPeriodRevenue: number;
    currentPeriodRevenue: number;
    growthPercentage: number;
    isPositiveGrowth: boolean;
  };
}

export default function AdminAnalytics() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation(`/admin/${adminUid}`);
    }
  }, [authLoading, isAuthenticated, adminUid, setLocation]);

  const getDateRange = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    let start = new Date(now);
    switch (timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  const dateRange = getDateRange();

  const { data: salesResponse, isLoading } = useQuery<{ sales: Record<string, any>; totalSales: number; totalOrders: number }>({
    queryKey: [`/api/analytics/${adminUid}/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    enabled: isAuthenticated,
  });

  const { data: detailedData, isLoading: detailedLoading } = useQuery<DetailedAnalytics>({
    queryKey: [`/api/analytics/${adminUid}/detailed?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const stats = useMemo(() => {
    if (!salesResponse) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        topItems: [] as { name: string; quantity: number; revenue: number }[],
      };
    }

    const totalRevenue = salesResponse.totalSales || 0;
    const totalOrders = salesResponse.totalOrders || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const itemMap = new Map<string, { quantity: number; revenue: number }>();
    Object.values(salesResponse.sales || {}).forEach((dayData: any) => {
      Object.entries(dayData.items || {}).forEach(([name, quantity]) => {
        const existing = itemMap.get(name) || { quantity: 0, revenue: 0 };
        itemMap.set(name, {
          quantity: existing.quantity + (quantity as number),
          revenue: existing.revenue + (dayData.totalSales / Object.keys(dayData.items).length) * (quantity as number) / dayData.orderCount,
        });
      });
    });

    const topItems = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return { totalRevenue, totalOrders, averageOrderValue, topItems };
  }, [salesResponse]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today': return "Today's";
      case 'week': return "This Week's";
      case 'month': return "This Month's";
      case 'year': return "This Year's";
    }
  };

  if (authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Analytics</h1>
          <p className="text-muted-foreground">Track your sales performance and trends.</p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList>
            <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
            <TabsTrigger value="week" data-testid="tab-week">Week</TabsTrigger>
            <TabsTrigger value="month" data-testid="tab-month">Month</TabsTrigger>
            <TabsTrigger value="year" data-testid="tab-year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-revenue">
                  ₹{stats.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">{getTimeRangeLabel()} total</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-orders">{stats.totalOrders}</div>
                <p className="text-xs text-muted-foreground">Completed transactions</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-avg-order">
                  ₹{stats.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground">Per transaction</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Items/Order</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {detailedLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{detailedData?.customerAnalytics.avgItemsPerOrder || '0'}</div>
                <p className="text-xs text-muted-foreground">Items per order</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time-Based Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Peak Hours
            </CardTitle>
            <CardDescription>
              Busiest time: {detailedData?.timeBased.peakHour 
                ? `${String(detailedData.timeBased.peakHour.hour).padStart(2, '0')}:00 (${detailedData.timeBased.peakHour.orders} orders)`
                : 'No data'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detailedLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-6" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {detailedData?.timeBased.hourlyData
                  .filter(h => h.orders > 0)
                  .sort((a, b) => b.orders - a.orders)
                  .slice(0, 8)
                  .map((hour) => {
                    const maxOrders = Math.max(...(detailedData?.timeBased.hourlyData.map(h => h.orders) || [1]));
                    const percentage = maxOrders > 0 ? (hour.orders / maxOrders) * 100 : 0;
                    return (
                      <div key={hour.hour} className="flex items-center gap-3">
                        <span className="w-14 text-sm font-medium">{hour.label}</span>
                        <Progress value={percentage} className="flex-1 h-2" />
                        <span className="w-20 text-sm text-right text-muted-foreground">
                          {hour.orders} orders
                        </span>
                      </div>
                    );
                  })}
                {(!detailedData?.timeBased.hourlyData.some(h => h.orders > 0)) && (
                  <p className="text-center text-muted-foreground py-4">No data for this period</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Day of Week Performance
            </CardTitle>
            <CardDescription>Revenue by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            {detailedLoading ? (
              <div className="space-y-2">
                {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-6" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {detailedData?.timeBased.dayOfWeekData.map((day) => {
                  const maxRevenue = Math.max(...(detailedData?.timeBased.dayOfWeekData.map(d => d.revenue) || [1]));
                  const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={day.day} className="flex items-center gap-3">
                      <span className="w-10 text-sm font-medium">{day.label}</span>
                      <Progress value={percentage} className="flex-1 h-2" />
                      <span className="w-24 text-sm text-right text-muted-foreground">
                        ₹{day.revenue.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Financial Breakdown
          </CardTitle>
          <CardDescription>Discounts, service charges, and revenue analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">₹{detailedData?.financial.totalSubtotal.toLocaleString() || '0'}</p>
              <p className="text-xs text-muted-foreground">Subtotal</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <BadgePercent className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-600">-₹{detailedData?.financial.totalDiscount.toLocaleString() || '0'}</p>
              <p className="text-xs text-muted-foreground">Discounts ({detailedData?.financial.discountPercentage || '0'}%)</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <Percent className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">+₹{detailedData?.financial.totalServiceCharge.toLocaleString() || '0'}</p>
              <p className="text-xs text-muted-foreground">Service Charges</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 text-center border-2 border-primary/20">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-primary">₹{detailedData?.financial.totalRevenue.toLocaleString() || '0'}</p>
              <p className="text-xs text-muted-foreground">Net Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Mode & Category Revenue - India Focused */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Mode Analysis
            </CardTitle>
            <CardDescription>Track payments by UPI, Cash, Card & Wallet</CardDescription>
          </CardHeader>
          <CardContent>
            {detailedLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <Smartphone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">UPI</p>
                      <p className="text-sm text-muted-foreground">{detailedData?.paymentModes?.upi?.count || 0} transactions</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600">₹{(detailedData?.paymentModes?.upi?.amount || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <Banknote className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Cash</p>
                      <p className="text-sm text-muted-foreground">{detailedData?.paymentModes?.cash?.count || 0} transactions</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-600">₹{(detailedData?.paymentModes?.cash?.amount || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Card</p>
                      <p className="text-sm text-muted-foreground">{detailedData?.paymentModes?.card?.count || 0} transactions</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-purple-600">₹{(detailedData?.paymentModes?.card?.amount || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
                      <Wallet className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Wallet</p>
                      <p className="text-sm text-muted-foreground">{detailedData?.paymentModes?.wallet?.count || 0} transactions</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-orange-600">₹{(detailedData?.paymentModes?.wallet?.amount || 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Category-wise Revenue
            </CardTitle>
            <CardDescription>Revenue breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            {detailedLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const categories = [
                    { label: 'Food (Veg & Non-Veg)', value: detailedData?.categoryRevenue?.food || 0, icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900' },
                    { label: 'Liquor & Alcohol', value: detailedData?.categoryRevenue?.liquor || 0, icon: Wine, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' },
                    { label: 'Beverages & Drinks', value: detailedData?.categoryRevenue?.beverages || 0, icon: Coffee, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
                    { label: 'Cakes & Desserts', value: detailedData?.categoryRevenue?.desserts || 0, icon: ShoppingBag, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900' },
                  ];
                  const total = categories.reduce((sum, c) => sum + c.value, 0);
                  return categories.map((cat, idx) => {
                    const percentage = total > 0 ? (cat.value / total) * 100 : 0;
                    const Icon = cat.icon;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${cat.bg}`}>
                              <Icon className={`h-4 w-4 ${cat.color}`} />
                            </div>
                            <span className="text-sm font-medium">{cat.label}</span>
                          </div>
                          <span className={`font-bold ${cat.color}`}>₹{cat.value.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground w-12 text-right">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GST Summary & Period Comparison - India Compliance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              GST Summary
            </CardTitle>
            <CardDescription>CGST & SGST breakdown for compliance</CardDescription>
          </CardHeader>
          <CardContent>
            {detailedLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Taxable Amount</span>
                    <span className="font-semibold">₹{(detailedData?.gstSummary?.totalTaxableAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-center">
                    <p className="text-xs text-muted-foreground mb-1">CGST (2.5%)</p>
                    <p className="text-lg font-bold text-blue-600">₹{(detailedData?.gstSummary?.cgst || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-center">
                    <p className="text-xs text-muted-foreground mb-1">SGST (2.5%)</p>
                    <p className="text-lg font-bold text-green-600">₹{(detailedData?.gstSummary?.sgst || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total GST Collected</span>
                    <span className="text-xl font-bold text-primary">₹{(detailedData?.gstSummary?.totalGst || 0).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  *GST calculated at 5% (2.5% CGST + 2.5% SGST) for restaurant services
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={detailedData?.comparison?.isPositiveGrowth ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {detailedData?.comparison?.isPositiveGrowth ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              Period Comparison
            </CardTitle>
            <CardDescription>Compare with previous {timeRange}</CardDescription>
          </CardHeader>
          <CardContent>
            {detailedLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Previous Period</p>
                    <p className="text-xl font-bold">₹{(detailedData?.comparison?.previousPeriodRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Current Period</p>
                    <p className="text-xl font-bold">₹{(detailedData?.comparison?.currentPeriodRevenue || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className={`p-4 rounded-lg text-center ${detailedData?.comparison?.isPositiveGrowth ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                  <div className="flex items-center justify-center gap-2">
                    {detailedData?.comparison?.isPositiveGrowth ? (
                      <ArrowUp className="h-6 w-6 text-green-600" />
                    ) : (
                      <ArrowDown className="h-6 w-6 text-red-600" />
                    )}
                    <span className={`text-3xl font-bold ${detailedData?.comparison?.isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(detailedData?.comparison?.growthPercentage || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {detailedData?.comparison?.isPositiveGrowth ? 'Growth' : 'Decline'} vs previous {timeRange}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Analytics & Top Items */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Analytics
            </CardTitle>
            <CardDescription>Order patterns and table turnover</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xl font-bold">{detailedData?.customerAnalytics.avgItemsPerOrder || '0'}</p>
                <p className="text-xs text-muted-foreground">Avg Items/Order</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xl font-bold">{detailedData?.customerAnalytics.tableTurnoverRate || '0'}</p>
                <p className="text-xs text-muted-foreground">Table Turnover Rate</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Popular Combos</h4>
              {detailedData?.customerAnalytics.popularCombos.length ? (
                <div className="space-y-2">
                  {detailedData.customerAnalytics.popularCombos.map((combo, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                      <span className="text-sm truncate flex-1">{combo.combo}</span>
                      <Badge variant="secondary">{combo.count}x</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No combo data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
            <CardDescription>Best performing menu items by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : stats.topItems.length > 0 ? (
              <div className="space-y-3">
                {stats.topItems.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} sold</p>
                      </div>
                    </div>
                    <span className="font-semibold">₹{item.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No items sold in this period.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
