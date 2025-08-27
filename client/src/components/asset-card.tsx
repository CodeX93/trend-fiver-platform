import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, LineChart, DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Asset } from "@shared/schema";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface AssetCardProps {
  asset: Asset;
}

export default function AssetCard({ asset }: AssetCardProps) {
  // Fetch real-time price for this asset
  const { data: priceData, isLoading: isLoadingPrice } = useQuery<{ symbol: string; price: number }>({
    queryKey: [`/api/assets/${asset.symbol}/price`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch price history for sparkline
  const { data: priceHistory } = useQuery<Array<{ price: number; timestamp: string; source: string }>>({
    queryKey: [`/api/assets/${asset.symbol}/history`, 7], // Last 7 days
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "crypto":
        return <Coins className="h-5 w-5 text-yellow-500" />;
      case "stock":
        return <LineChart className="h-5 w-5 text-blue-500" />;
      case "forex":
        return <DollarSign className="h-5 w-5 text-green-500" />;
      default:
        return <TrendingUp className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case "crypto":
        return "Cryptocurrency";
      case "stock":
        return "Stock";
      case "forex":
        return "Forex";
      default:
        return type;
    }
  };

  const getPriceChangeIndicator = () => {
    if (!priceHistory || priceHistory.length < 2) return <Minus className="h-4 w-4 text-gray-400" />;
    
    const currentPrice = priceHistory[0]?.price;
    const previousPrice = priceHistory[priceHistory.length - 1]?.price;
    
    if (!currentPrice || !previousPrice) return <Minus className="h-4 w-4 text-gray-400" />;
    
    const change = currentPrice - previousPrice;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const formatPrice = (price: number) => {
    if (asset.type === 'forex') {
      return price.toFixed(4);
    } else if (asset.type === 'crypto') {
      return price < 1 ? price.toFixed(6) : price.toFixed(2);
    } else {
      return price.toFixed(2);
    }
  };

  const getPriceChangePercentage = () => {
    if (!priceHistory || priceHistory.length < 2) return null;
    
    const currentPrice = priceHistory[0]?.price;
    const previousPrice = priceHistory[priceHistory.length - 1]?.price;
    
    if (!currentPrice || !previousPrice) return null;
    
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    return change;
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">{asset.name}</span>
          <span className="text-sm font-medium text-muted-foreground">{asset.symbol}</span>
        </CardTitle>
        <CardDescription className="flex items-center">
          {getAssetIcon(asset.type)}
          <span className="ml-2">{getAssetTypeLabel(asset.type)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Real-time Price Display */}
        <div className="mb-4">
          {isLoadingPrice ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ) : priceData ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">${formatPrice(priceData.price)}</span>
                {getPriceChangeIndicator()}
              </div>
              {(() => {
                const changePercent = getPriceChangePercentage();
                if (changePercent !== null) {
                  const isPositive = changePercent >= 0;
                  return (
                    <div className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{changePercent.toFixed(2)}% (7d)
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Price unavailable</div>
          )}
        </div>

        {/* Asset Status */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full mr-2 ${asset.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium">
              {asset.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {asset.apiSource}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 space-y-2">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/assets/${encodeURIComponent(asset.symbol)}`}>
            View Details
          </Link>
        </Button>
        <Button asChild className="w-full">
          <Link href={`/predict/${encodeURIComponent(asset.symbol)}`}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Make Prediction
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
