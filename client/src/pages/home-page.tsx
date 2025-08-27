import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import AppHeader from "@/components/app-header";
import AssetList from "@/components/asset-list";
import AssetSearch from "@/components/asset-search";
import SuggestAssetForm from "@/components/suggest-asset-form";
import ShareApp from "@/components/share-app";
import { useQuery } from "@tanstack/react-query";
import { Asset } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, BarChart3, Coins, LineChart, Search, Plus, ListPlus, Globe, Trophy, DollarSign, Bitcoin } from "lucide-react";
import AssetCard from "@/components/asset-card";
import SentimentSummaryChart from "@/components/sentiment-summary-chart";
import { Button } from "@/components/ui/button";
import { LanguageSelectorCard } from "@/components/language-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MonthCountdown } from '../components/month-countdown';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);

  const { data: assets, isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  // Filter assets by type
  const cryptoAssets = assets?.filter(asset => asset.type === "crypto") || [];
  const stockAssets = assets?.filter(asset => asset.type === "stock") || [];
  const forexAssets = assets?.filter(asset => asset.type === "forex") || [];



  // Calculate overall statistics
  const totalAssets = assets?.length || 0;
  const activeAssets = assets?.filter(asset => asset.isActive).length || 0;
  const cryptoCount = cryptoAssets.length;
  const stocksCount = stockAssets.length;
  const forexCount = forexAssets.length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <section className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                {user ? t("home.welcome_user", {username: user.username}) : t("home.welcome")}
              </h1>
              <p className="text-muted-foreground">
                {t("home.subtitle")}
                {!user && (
                  <span className="ml-2">
                    - <a href="/auth" className="text-primary hover:underline">{t("auth.signin")}</a> {t("home.login_prompt")}
                  </span>
                )}
              </p>
            </div>

            {/* Suggest Asset Dialog */}
            <Dialog open={suggestDialogOpen} onOpenChange={setSuggestDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <ListPlus className="h-4 w-4 mr-2" />
                  {t("asset.suggest")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("asset.suggest_title")}</DialogTitle>
                  <DialogDescription>
                    {t("asset.suggest_description")}
                  </DialogDescription>
                </DialogHeader>
                <SuggestAssetForm />
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Search Section */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2 text-primary" />
                {t("search.title")}
              </CardTitle>
              <CardDescription>
                {t("search.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetSearch />
            </CardContent>
          </Card>
        </section>

        {/* Asset Statistics */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAssets}</div>
                <p className="text-xs text-muted-foreground">
                  {activeAssets} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  Cryptocurrencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cryptoCount}</div>
                <p className="text-xs text-muted-foreground">
                  {cryptoAssets.filter(asset => asset.isActive).length} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-blue-500" />
                  Stocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stocksCount}</div>
                <p className="text-xs text-muted-foreground">
                  {stockAssets.filter(asset => asset.isActive).length} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Forex Pairs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{forexCount}</div>
                <p className="text-xs text-muted-foreground">
                  {forexAssets.filter(asset => asset.isActive).length} active
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Current Month Progress */}
        <section className="mb-8">
          <MonthCountdown />
        </section>

        {/* App Info Section */}
        <section className="mb-8">
          <Card className="bg-gradient-to-r from-background to-muted">
            <CardHeader>
              <CardTitle className="text-xl">{t("home.how_it_works")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{t("home.track_assets")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.track_description")}
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{t("home.make_predictions")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.predictions_description")}
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{t("home.earn_badges")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.badges_description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Language Section */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-primary" />
                  {t("language.title")}
                </CardTitle>
                <CardDescription>
                  {t("language.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LanguageSelectorCard />
              </CardContent>
            </Card>
            
            {/* Share App Section */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  {t("share.share_with_friends")}
                </CardTitle>
                <CardDescription>
                  {t("share.invite_friends")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ShareApp size="lg" />
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* Crypto Assets Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Coins className="h-6 w-6 mr-2 text-primary" />
            {t("asset.crypto_title")}
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-[180px]">
                  <CardHeader>
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cryptoAssets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cryptoAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              {t("asset.no_crypto")}
            </div>
          )}
        </section>

        {/* Stock Assets Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <LineChart className="h-6 w-6 mr-2 text-primary" />
            {t("asset.stock_title")}
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-[180px]">
                  <CardHeader>
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stockAssets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stockAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              {t("asset.no_stock")}
            </div>
          )}
        </section>

        {/* Forex Assets Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <DollarSign className="h-6 w-6 mr-2 text-primary" />
            {t("asset.forex_title") || "Forex Pairs"}
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-[180px]">
                  <CardHeader>
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : forexAssets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forexAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              {t("asset.no_forex") || "No forex pairs available"}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
