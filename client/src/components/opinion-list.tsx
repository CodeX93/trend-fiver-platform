import { Opinion } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import SentimentBadge from "./sentiment-badge";
import PercentageDisplay from "./percentage-display";
import { formatDistanceToNow } from "date-fns";

interface OpinionListProps {
  opinions: Opinion[];
}

export default function OpinionList({ opinions }: OpinionListProps) {
  // Sort opinions by date (newest first)
  const sortedOpinions = [...(opinions || [])].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (sortedOpinions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No opinions yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedOpinions.map((opinion) => (
        <Card key={opinion.id}>
          <CardHeader className="py-3 flex flex-row items-start justify-between">
            <div>
              <div className="font-semibold">{opinion.username}</div>
              <div className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(opinion.createdAt), { addSuffix: true })}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <SentimentBadge sentiment={opinion.sentiment} size="sm" />
              <PercentageDisplay value={opinion.prediction} size="sm" />
            </div>
          </CardHeader>
          {opinion.comment && (
            <CardContent className="py-2">
              <p className="text-sm">{opinion.comment}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
