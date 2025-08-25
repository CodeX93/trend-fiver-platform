import { Asset } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, ChevronRight, Coins, LineChart, DollarSign } from "lucide-react";

interface AssetCardProps {
  asset: Asset;
}

export default function AssetCard({ asset }: AssetCardProps) {
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

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>{asset.name}</span>
          <span className="text-sm font-medium text-muted-foreground">{asset.symbol}</span>
        </CardTitle>
        <CardDescription className="flex items-center">
          {getAssetIcon(asset.type)}
          <span className="ml-2">{getAssetTypeLabel(asset.type)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="h-5 w-5 rounded-full bg-blue-100 mr-2 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            </div>
            <span className="text-sm font-medium">
              {asset.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {asset.apiSource}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/assets/${encodeURIComponent(asset.symbol)}`}>
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
