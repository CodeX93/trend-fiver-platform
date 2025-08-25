import { Asset } from "@shared/schema";
import AssetCard from "./asset-card";

interface AssetListProps {
  assets: Asset[];
}

export default function AssetList({ assets }: AssetListProps) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No assets found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
