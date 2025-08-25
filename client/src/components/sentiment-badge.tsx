import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, Minus, TrendingDown } from "lucide-react";

interface SentimentBadgeProps {
  sentiment: string;
  size?: "sm" | "md" | "lg";
}

export default function SentimentBadge({ sentiment, size = "md" }: SentimentBadgeProps) {
  const getSentimentDetails = () => {
    switch (sentiment) {
      case "positive":
        return {
          label: "Positive",
          className: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-800 dark:text-green-100",
          icon: <TrendingUp className={cn("mr-1", size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5")} />
        };
      case "negative":
        return {
          label: "Negative",
          className: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-800 dark:text-red-100",
          icon: <TrendingDown className={cn("mr-1", size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5")} />
        };
      default:
        return {
          label: "Neutral",
          className: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-800 dark:text-blue-100",
          icon: <Minus className={cn("mr-1", size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5")} />
        };
    }
  };

  const { label, className, icon } = getSentimentDetails();

  return (
    <Badge 
      variant="outline" 
      className={cn(
        className, 
        size === "lg" && "text-base py-1.5 px-3"
      )}
    >
      {icon}
      {label}
    </Badge>
  );
}
