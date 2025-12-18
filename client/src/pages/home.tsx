import { useLocation } from "wouter";
import { UtensilsCrossed, ArrowRight, Users, BarChart3, Receipt, Sparkles, ChefHat, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Users,
      title: "Table Management",
      description: "Real-time tracking of all your tables with status indicators and order counts.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: ChefHat,
      title: "Menu Management",
      description: "Easily add, edit, and organize your menu items with categories and availability controls.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Receipt,
      title: "Smart Billing",
      description: "Generate bills with customizable discounts and service charges seamlessly.",
      gradient: "from-orange-500 to-rose-500"
    },
    {
      icon: BarChart3,
      title: "Sales Analytics",
      description: "Track your revenue, top-selling items, and performance trends over time.",
      gradient: "from-emerald-500 to-teal-500"
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-950 dark:via-purple-950/30 dark:to-gray-950">
      <header className="sticky top-0 z-50 glass border-b border-white/20 dark:border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">TableServe</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-16 md:py-24 px-4 md:px-6 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-300/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50 mb-6">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Restaurant Management Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight" data-testid="text-hero-title">
              Restaurant Management
              <br />
              <span className="gradient-text">Made Simple</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Complete solution for pubs and bars to manage orders, tables, billing, and analytics.
              Get your customers ordering in minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => setLocation("/admin/demo")} 
                data-testid="button-demo-login"
                className="btn-gradient text-lg px-8 py-6 rounded-2xl"
              >
                Demo Login
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setLocation("/user/demo/menu")} 
                data-testid="button-demo-menu"
                className="text-lg px-8 py-6 rounded-2xl border-2 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-300"
              >
                View Demo Menu
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Powerful features to streamline your restaurant operations
              </p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="group relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  <CardHeader className="text-center pb-2">
                    <div className={`mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <CardDescription className="text-gray-600 dark:text-gray-400">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 px-4 md:px-6 bg-gradient-to-br from-purple-100/50 via-pink-100/50 to-orange-100/50 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-gray-950">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-12">Get started in three simple steps</p>
            
            <div className="grid gap-8 md:grid-cols-3 mt-12">
              {[
                { step: 1, title: "Set Up Your Menu", desc: "Add your dishes with prices, categories, and descriptions.", icon: ChefHat },
                { step: 2, title: "Share Your Link", desc: "Customers scan QR or visit your unique menu URL to order.", icon: Zap },
                { step: 3, title: "Manage & Bill", desc: "Accept orders, track progress, and generate bills seamlessly.", icon: Receipt }
              ].map((item, index) => (
                <div key={index} className="relative">
                  <div className="relative z-10 p-6 rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border border-white/50 dark:border-white/10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 text-white font-bold text-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="glass border-t border-white/20 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="gradient-text font-semibold">TableServe</span> - Restaurant Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
