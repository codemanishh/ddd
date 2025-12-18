import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { 
  Settings, 
  Building2, 
  TableProperties, 
  Save,
  Smartphone,
  QrCode,
  Trash2
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { Restaurant } from "@shared/schema";

const settingsSchema = z.object({
  restaurantName: z.string().min(1, "Restaurant name is required"),
  address: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  upiId: z.string().optional(),
  tableCount: z.number().min(1, "Must have at least 1 table").max(100, "Maximum 100 tables"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function AdminSettings() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const { admin, isAuthenticated, isLoading: authLoading, login, token } = useAuth();
  const { toast } = useToast();
  const [liveUpiId, setLiveUpiId] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation(`/admin/${adminUid}`);
    }
  }, [authLoading, isAuthenticated, adminUid, setLocation]);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      restaurantName: admin?.restaurantName || "",
      address: admin?.address || "",
      email: admin?.email || "",
      phone: admin?.phone || "",
      gstNumber: admin?.gstNumber || "",
      upiId: admin?.upiId || "",
      tableCount: admin?.tableCount || 10,
    },
  });

  useEffect(() => {
    if (admin) {
      form.reset({
        restaurantName: admin.restaurantName,
        address: admin.address || "",
        email: admin.email,
        phone: admin.phone || "",
        gstNumber: admin.gstNumber || "",
        upiId: admin.upiId || "",
        tableCount: admin.tableCount,
      });
      setLiveUpiId(admin.upiId || "");
    }
  }, [admin, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return apiRequest("PATCH", `/api/restaurants/${adminUid}`, data);
    },
    onSuccess: (data: Restaurant) => {
      if (token) {
        login(data, token);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/tables', adminUid] });
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  const generateUpiQrString = (upiId: string, amount?: number) => {
    const merchantName = admin?.restaurantName?.replace(/[^a-zA-Z0-9 ]/g, '') || 'Restaurant';
    let qrString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}`;
    if (amount && amount > 0) {
      qrString += `&am=${amount}`;
    }
    return qrString;
  };

  const handleUpiChange = (value: string) => {
    setLiveUpiId(value);
    form.setValue('upiId', value);
  };

  const handleClearUpi = () => {
    setLiveUpiId("");
    form.setValue('upiId', "");
  };

  if (authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Manage your restaurant profile and configuration.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Restaurant Details
                </CardTitle>
                <CardDescription>
                  Update your restaurant information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="restaurantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., The Rustic Pub" data-testid="input-restaurant-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full address" data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="restaurant@email.com" data-testid="input-email" />
                      </FormControl>
                      <FormDescription>Used for password reset and notifications</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+91 98765 43210" data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 22AAAAA0000A1Z5" data-testid="input-gst" />
                      </FormControl>
                      <FormDescription>Will be displayed on bills</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    UPI Payment
                  </CardTitle>
                  <CardDescription>
                    Add your UPI ID for customer payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="upiId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UPI ID</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input 
                              {...field}
                              value={liveUpiId}
                              onChange={(e) => handleUpiChange(e.target.value)}
                              placeholder="yourname@upi or 9876543210@paytm" 
                              data-testid="input-upi-id" 
                            />
                          </FormControl>
                          {liveUpiId && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={handleClearUpi}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <FormDescription>
                          Enter your UPI ID (GPay, PhonePe, Paytm, etc.)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {liveUpiId && (
                    <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Live QR Preview</span>
                      </div>
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <QRCodeSVG 
                          value={generateUpiQrString(liveUpiId)}
                          size={140}
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground text-center">
                        {liveUpiId}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        This QR will appear on bills when UPI is selected
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TableProperties className="h-5 w-5" />
                    Table Configuration
                  </CardTitle>
                  <CardDescription>
                    Set up the number of tables in your restaurant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tableCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Tables *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="1"
                            max="100"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-table-count" 
                          />
                        </FormControl>
                        <FormDescription>
                          This will automatically create table entries for your dashboard.
                          Currently configured: {admin?.tableCount || 0} tables
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <h4 className="font-medium mb-2">Admin ID</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your unique admin identifier (cannot be changed)
                    </p>
                    <code className="px-3 py-2 bg-muted rounded-md text-sm block" data-testid="text-admin-uid">
                      {adminUid}
                    </code>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
