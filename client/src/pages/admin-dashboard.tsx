import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Clock,
  Bell,
  UserPlus,
  Key,
  RefreshCw,
  Copy,
  Check,
  Filter,
  XCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Table, Order } from "@shared/schema";

interface TableActivity {
  tableNumber: number;
  type: 'joined' | 'order' | 'reset';
  timestamp: Date;
}

export default function AdminDashboard() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const { admin, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [recentlyActiveTables, setRecentlyActiveTables] = useState<Set<number>>(new Set());
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
  const previousTablesRef = useRef<Table[] | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation(`/admin/${adminUid}`);
    }
  }, [authLoading, isAuthenticated, adminUid, setLocation]);

  const { data: tables, isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ['/api/tables', adminUid],
    enabled: isAuthenticated,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders', adminUid],
    enabled: isAuthenticated,
    refetchInterval: 3000,
  });

  const { data: todaySales } = useQuery<{ total: number; count: number }>({
    queryKey: ['/api/analytics/today', adminUid],
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const regenerateOtpMutation = useMutation({
    mutationFn: async (tableId: string) => {
      return await apiRequest("POST", `/api/tables/${tableId}/regenerate-otp`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables', adminUid] });
      toast({ title: "OTP Regenerated", description: "New OTP has been generated for this table" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to regenerate OTP", variant: "destructive" });
    },
  });

  const cancelTableMutation = useMutation({
    mutationFn: async (tableId: string) => {
      return await apiRequest("POST", `/api/tables/${tableId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables', adminUid] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', adminUid] });
      toast({ title: "Table Cancelled", description: "All orders have been cancelled and the table is now vacant." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel table", variant: "destructive" });
    },
  });

  // Track table status changes for notifications
  useEffect(() => {
    if (!tables || !previousTablesRef.current) {
      previousTablesRef.current = tables || null;
      return;
    }

    const prevTables = previousTablesRef.current;
    const newlyActiveTables: number[] = [];

    tables.forEach((table) => {
      const prevTable = prevTables.find(t => t.id === table.id);
      
      // Table just became active (customer joined)
      if (prevTable && prevTable.status === 'vacant' && table.status === 'active') {
        newlyActiveTables.push(table.tableNumber);
        toast({
          title: `Table #${table.tableNumber} Active`,
          description: "A customer has joined this table and started ordering.",
        });
      }
    });

    if (newlyActiveTables.length > 0) {
      setRecentlyActiveTables(prev => {
        const updated = new Set(prev);
        newlyActiveTables.forEach(n => updated.add(n));
        return updated;
      });

      // Clear the "recently active" indicator after 30 seconds
      setTimeout(() => {
        setRecentlyActiveTables(prev => {
          const updated = new Set(prev);
          newlyActiveTables.forEach(n => updated.delete(n));
          return updated;
        });
      }, 30000);
    }

    previousTablesRef.current = tables;
  }, [tables, toast]);

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

  const activeTables = tables?.filter(t => t.status === 'active').length || 0;
  const totalTables = tables?.length || admin?.tableCount || 0;
  const pendingOrders = orders?.filter(o => 
    o.items.some(item => item.status === 'pending')
  ).length || 0;
  const processingOrders = orders?.filter(o => 
    o.items.some(item => item.status === 'processing' || item.status === 'accepted')
  ).length || 0;

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'billing':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getTableStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Active</Badge>;
      case 'billing':
        return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">Billing</Badge>;
      default:
        return <Badge variant="secondary">Vacant</Badge>;
    }
  };

  const getTableOrders = (tableNumber: number) => {
    return orders?.filter(o => o.tableNumber === tableNumber && o.orderStatus === 'active') || [];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tables</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-tables">
              {activeTables} / {totalTables}
            </div>
            <p className="text-xs text-muted-foreground">
              Tables currently occupied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-orders">
              {pendingOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting acceptance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-processing-orders">
              {processingOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Orders being prepared
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-sales">
              ₹{todaySales?.total?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {todaySales?.count || 0} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold">Table Overview</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                size="sm"
                variant={tableFilter === 'all' ? 'default' : 'ghost'}
                onClick={() => setTableFilter('all')}
                className="h-8"
              >
                All ({tables?.length || 0})
              </Button>
              <Button
                size="sm"
                variant={tableFilter === 'occupied' ? 'default' : 'ghost'}
                onClick={() => setTableFilter('occupied')}
                className="h-8"
              >
                Occupied ({tables?.filter(t => t.status !== 'vacant').length || 0})
              </Button>
              <Button
                size="sm"
                variant={tableFilter === 'vacant' ? 'default' : 'ghost'}
                onClick={() => setTableFilter('vacant')}
                className="h-8"
              >
                Vacant ({tables?.filter(t => t.status === 'vacant').length || 0})
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation(`/admin/${adminUid}/orders`)}
              data-testid="button-view-all-orders"
            >
              View All Orders
            </Button>
          </div>
        </div>

        {tablesLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : tables && tables.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...tables]
              .sort((a, b) => a.tableNumber - b.tableNumber)
              .filter((table) => {
                if (tableFilter === 'occupied') return table.status !== 'vacant';
                if (tableFilter === 'vacant') return table.status === 'vacant';
                return true;
              })
              .map((table) => {
              const tableOrders = getTableOrders(table.tableNumber);
              const pendingCount = tableOrders.reduce(
                (acc, order) => acc + order.items.filter(i => i.status === 'pending').length,
                0
              );

              const isRecentlyActive = recentlyActiveTables.has(table.tableNumber);
              
              return (
                <Card 
                  key={table.id} 
                  className={`hover-elevate transition-all ${isRecentlyActive ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                  data-testid={`card-table-${table.tableNumber}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Table #{table.tableNumber}</CardTitle>
                        {isRecentlyActive && (
                          <Badge className="bg-green-500 text-white animate-pulse text-xs">
                            <UserPlus className="h-3 w-3 mr-1" />
                            NEW
                          </Badge>
                        )}
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getTableStatusColor(table.status)}`} />
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      {getTableStatusBadge(table.status)}
                      <div className="flex items-center gap-1">
                        <Key className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-sm font-bold tracking-wider text-primary">
                          {table.otp}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(table.otp);
                            setCopiedOtp(table.id);
                            setTimeout(() => setCopiedOtp(null), 2000);
                            toast({ title: "OTP Copied", description: `OTP ${table.otp} copied to clipboard` });
                          }}
                        >
                          {copiedOtp === table.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={table.status !== 'vacant' || regenerateOtpMutation.isPending}
                          title={table.status !== 'vacant' ? "Cannot refresh OTP while table is in use" : "Refresh OTP"}
                          onClick={(e) => {
                            e.stopPropagation();
                            regenerateOtpMutation.mutate(table.id);
                          }}
                        >
                          <RefreshCw className={`h-3 w-3 ${regenerateOtpMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {table.status !== 'vacant' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Orders:</span>
                          <span className="font-medium">{tableOrders.length}</span>
                        </div>
                        {pendingCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {pendingCount} pending
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => setLocation(`/admin/${adminUid}/orders?table=${table.tableNumber}`)}
                        >
                          View Orders
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full"
                              disabled={cancelTableMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel Table
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Table #{table.tableNumber}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel all orders ({tableOrders.length} orders) on this table and make it vacant. 
                                The customer will need to re-enter the table number to order again.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Table Active</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelTableMutation.mutate(table.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Cancel Table
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No active session</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">No Tables Configured</CardTitle>
              <CardDescription>
                Configure your tables in the settings to start receiving orders.
              </CardDescription>
              <Button 
                className="mt-4"
                onClick={() => setLocation(`/admin/${adminUid}/settings`)}
                data-testid="button-configure-tables"
              >
                Configure Tables
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
