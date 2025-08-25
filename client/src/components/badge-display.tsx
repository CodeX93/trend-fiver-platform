import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrophyIcon, ShieldIcon, AwardIcon, MedalIcon, CrownIcon, Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/use-language";

interface BadgeDisplayProps {
  userId: number;
}

type UserBadge = {
  id: number;
  userId: number;
  username: string;
  badgeType: string;
  monthYear: string;
  accuracyPercentage: number;
  totalPredictions: number;
  createdAt: string;
};

export default function BadgeDisplay({ userId }: BadgeDisplayProps) {
  const { t } = useLanguage();
  const [isHistoryOpen, setHistoryOpen] = useState(false);

  // Fetch current badge
  const { data: currentBadge, isLoading: isCurrentLoading } = useQuery({
    queryKey: ['/api/users', userId, 'badge'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/badge`);
      if (!res.ok) return null;
      return res.json();
    }
  });

  // Fetch badge history
  const { data: badgeHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['/api/users', userId, 'badges'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/badges`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  if (isCurrentLoading || isHistoryLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user has no badges
  if (!currentBadge && (!badgeHistory || badgeHistory.length === 0)) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        {t("badges.noBadges")}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Current Badge Display */}
      {currentBadge && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-shrink-0">
            <BadgeIcon badgeType={currentBadge} size="large" />
          </div>
          <div>
            <h3 className="font-semibold">{t("badges.current")}</h3>
            <p className="text-sm text-muted-foreground">
              {t(`badges.${currentBadge}`)}
            </p>
          </div>
        </div>
      )}

      {/* Badge History Button */}
      {badgeHistory && badgeHistory.length > 0 && (
        <Dialog open={isHistoryOpen} onOpenChange={setHistoryOpen}>
          <DialogTrigger asChild>
            <button className="text-sm font-medium text-primary hover:underline">
              {t("badges.history")}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("badges.history")}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-2">
                {(Array.isArray(badgeHistory) ? badgeHistory : []).sort((a: UserBadge, b: UserBadge) => 
                  new Date(b.monthYear).getTime() - new Date(a.monthYear).getTime()
                ).map((badge: UserBadge) => (
                  <div key={badge.id} className="flex items-center gap-3 border-b pb-3">
                    <BadgeIcon badgeType={badge.badgeType} />
                    <div className="flex-1">
                      <h4 className="font-medium">{t(`badges.${badge.badgeType}`)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatMonthYear(badge.monthYear)}
                      </p>
                      <p className="text-xs">
                        {t("badges.accuracy", { value: typeof badge.accuracyPercentage === 'number' 
                          ? badge.accuracyPercentage.toFixed(1) 
                          : parseFloat(String(badge.accuracyPercentage)).toFixed(1) })}
                      </p>
                      <p className="text-xs">
                        {t("badges.predictions", { count: badge.totalPredictions })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface BadgeIconProps {
  badgeType: string;
  size?: "normal" | "large";
}

function BadgeIcon({ badgeType, size = "normal" }: BadgeIconProps) {
  const iconSize = size === "large" ? "h-10 w-10" : "h-6 w-6";
  const iconClass = `${iconSize} ${getBadgeColor(badgeType)}`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {badgeType === "top1" && (
            <div className="relative">
              <TrophyIcon className={`${iconClass} h-7 w-7`} />
              <span className="absolute top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold">1</span>
            </div>
          )}
          {badgeType === "top2" && (
            <div className="relative">
              <TrophyIcon className={`${iconClass} h-7 w-7`} />
              <span className="absolute top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold">2</span>
            </div>
          )}
          {badgeType === "top3" && (
            <div className="relative">
              <TrophyIcon className={`${iconClass} h-7 w-7`} />
              <span className="absolute top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold">3</span>
            </div>
          )}
          {badgeType === "top4" && (
            <div className="relative">
              <TrophyIcon className={`${iconClass} h-7 w-7`} />
              <span className="absolute top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold">4</span>
            </div>
          )}
          {badgeType === "top5" && (
            <div className="relative">
              <TrophyIcon className={`${iconClass} h-7 w-7`} />
              <span className="absolute top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold">5</span>
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getBadgeTitle(badgeType)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getBadgeTitle(badgeType: string): string {
  switch (badgeType) {
    case "top1": return "Diamond Predictor";
    case "top2": return "Platinum Predictor";
    case "top3": return "Gold Predictor";
    case "top4": return "Silver Predictor";
    case "top5": return "Bronze Predictor";
    default: return "";
  }
}

function getBadgeColor(badgeType: string): string {
  switch (badgeType) {
    case "top1": return "text-cyan-400"; // Diamond
    case "top2": return "text-slate-300"; // Platinum
    case "top3": return "text-yellow-500"; // Gold
    case "top4": return "text-zinc-400"; // Silver
    case "top5": return "text-amber-700"; // Bronze
    default: return "text-gray-500";
  }
}

function formatMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split("-");
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const monthIndex = parseInt(month) - 1;
  return `${monthNames[monthIndex]} ${year}`;
}