import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SentimentSummaryChartProps {
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  isLoading: boolean;
}

export default function SentimentSummaryChart({
  positivePercentage,
  negativePercentage,
  neutralPercentage,
  isLoading
}: SentimentSummaryChartProps) {
  const data = [
    { name: 'Positive', value: positivePercentage, color: '#10b981' }, // green-500
    { name: 'Neutral', value: neutralPercentage, color: '#6b7280' },   // gray-500
    { name: 'Negative', value: negativePercentage, color: '#ef4444' }  // red-500
  ].filter(item => item.value > 0); // Only show segments with values

  if (data.length === 0) {
    data.push({ name: 'No Data', value: 100, color: '#e5e7eb' }); // gray-200
  }

  const COLORS = data.map(item => item.color);
  
  const marketStatus = positivePercentage > negativePercentage 
    ? "Bullish Market" 
    : negativePercentage > positivePercentage 
      ? "Bearish Market" 
      : "Neutral Market";
  
  const marketStatusColor = positivePercentage > negativePercentage 
    ? "text-green-500" 
    : negativePercentage > positivePercentage 
      ? "text-red-500" 
      : "text-gray-500";

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Market Sentiment</CardTitle>
        <CardDescription>Overall market sentiment based on user opinions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
            <Skeleton className="h-8 w-40 mt-4" />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={`text-2xl font-bold mt-4 ${marketStatusColor}`}>
              {marketStatus}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}