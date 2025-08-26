import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Star, Target, TrendingUp, Award, Zap, Medal, Crown, Flame, BarChart3 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface BadgeDisplayProps {
  userId: string;
  showTitle?: boolean;
  compact?: boolean;
}

type UserBadge = {
  id: string;
  userId: string;
  badgeType: string;
  badgeName: string;
  badgeDescription: string;
  monthYear: string;
  rank?: number;
  totalScore?: number;
  metadata?: Record<string, any>;
  createdAt: string;
};

export default function BadgeDisplay({ userId, showTitle = true, compact = false }: BadgeDisplayProps) {
  const { t } = useLanguage();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: badgesData, isLoading } = useQuery<UserBadge[]>({
    queryKey: [`/api/users/${userId}/badges`],
    enabled: !!userId,
  });

  useEffect(() => {
    if (badgesData) {
      setBadges(badgesData);
      setLoading(false);
    }
  }, [badgesData]);

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
    }
  }, [isLoading]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("badge.no_badges") || "No badges yet"}
      </div>
    );
  }

  const getBadgeIcon = (badgeType: string) => {
    if (badgeType.startsWith('1st_place') || badgeType.startsWith('2nd_place') || badgeType.startsWith('3rd_place') || badgeType.startsWith('4th_place')) {
      return <Trophy className="h-4 w-4" />;
    }
    
    switch (badgeType) {
      case 'starter':
        return <Star className="h-4 w-4" />;
      case 'streak_3':
      case 'streak_5':
      case 'streak_10':
        return <Flame className="h-4 w-4" />;
      case 'accuracy_70':
      case 'accuracy_80':
      case 'accuracy_90':
        return <Target className="h-4 w-4" />;
      case 'volume_10':
      case 'volume_25':
      case 'volume_50':
      case 'volume_100':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (badgeType: string) => {
    if (badgeType.startsWith('1st_place')) return 'text-yellow-500';
    if (badgeType.startsWith('2nd_place')) return 'text-gray-400';
    if (badgeType.startsWith('3rd_place')) return 'text-amber-600';
    if (badgeType.startsWith('4th_place')) return 'text-orange-500';
    
    switch (badgeType) {
      case 'starter':
        return 'text-blue-500';
      case 'streak_3':
      case 'streak_5':
      case 'streak_10':
        return 'text-orange-500';
      case 'accuracy_70':
      case 'accuracy_80':
      case 'accuracy_90':
        return 'text-green-500';
      case 'volume_10':
      case 'volume_25':
      case 'volume_50':
      case 'volume_100':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const getBadgeVariant = (badgeType: string) => {
    if (badgeType.startsWith('1st_place')) return 'default';
    if (badgeType.startsWith('2nd_place')) return 'secondary';
    if (badgeType.startsWith('3rd_place')) return 'outline';
    if (badgeType.startsWith('4th_place')) return 'outline';
    
    switch (badgeType) {
      case 'starter':
        return 'default';
      case 'streak_3':
      case 'streak_5':
      case 'streak_10':
        return 'destructive';
      case 'accuracy_70':
      case 'accuracy_80':
      case 'accuracy_90':
        return 'default';
      case 'volume_10':
      case 'volume_25':
      case 'volume_50':
      case 'volume_100':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatBadgeName = (badge: UserBadge) => {
    if (badge.badgeType.startsWith('1st_place') || badge.badgeType.startsWith('2nd_place') || 
        badge.badgeType.startsWith('3rd_place') || badge.badgeType.startsWith('4th_place')) {
      return badge.badgeName;
    }
    
    // For other badges, show the name with metadata if available
    let displayName = badge.badgeName;
    
    if (badge.metadata) {
      if (badge.metadata.streakCount) {
        displayName += ` (${badge.metadata.streakCount})`;
      } else if (badge.metadata.milestone) {
        displayName += ` (${badge.metadata.milestone})`;
      } else if (badge.metadata.accuracyThreshold) {
        displayName += ` (${badge.metadata.accuracyThreshold}%)`;
      }
    }
    
    return displayName;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {badges.slice(0, 3).map((badge) => (
          <TooltipProvider key={badge.id}>
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant={getBadgeVariant(badge.badgeType) as any}
                  className={`flex items-center gap-1 text-xs ${getBadgeColor(badge.badgeType)}`}
                >
                  {getBadgeIcon(badge.badgeType)}
                  {formatBadgeName(badge)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{badge.badgeName}</p>
                <p className="text-sm text-muted-foreground">{badge.badgeDescription}</p>
                {badge.monthYear !== 'lifetime' && (
                  <p className="text-xs text-muted-foreground">Earned: {badge.monthYear}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {badges.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{badges.length - 3} more
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {showTitle ? (t("badge.title") || "Badges") : `${badges.length} Badge${badges.length !== 1 ? 's' : ''}`}
        </CardTitle>
        <CardDescription>
          {t("badge.description") || "Achievements earned through predictions"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {badges.map((badge) => (
            <TooltipProvider key={badge.id}>
              <Tooltip>
                <TooltipTrigger>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${getBadgeColor(badge.badgeType)}`}>
                    <div className={`p-2 rounded-full bg-muted ${getBadgeColor(badge.badgeType)}`}>
                      {getBadgeIcon(badge.badgeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {formatBadgeName(badge)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {badge.badgeDescription}
                      </p>
                      {badge.monthYear !== 'lifetime' && (
                        <p className="text-xs text-muted-foreground">
                          {badge.monthYear}
                        </p>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-medium">{badge.badgeName}</p>
                    <p className="text-sm text-muted-foreground">{badge.badgeDescription}</p>
                    {badge.monthYear !== 'lifetime' && (
                      <p className="text-xs text-muted-foreground">
                        Earned in {badge.monthYear}
                      </p>
                    )}
                    {badge.metadata && Object.keys(badge.metadata).length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <p>Details:</p>
                        <ul className="list-disc list-inside">
                          {Object.entries(badge.metadata).map(([key, value]) => (
                            <li key={key}>{key}: {value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}