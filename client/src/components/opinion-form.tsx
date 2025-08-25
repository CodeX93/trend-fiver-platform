import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface OpinionFormProps {
  assetId: number;
  assetSymbol: string;
  userId: number;
}

const opinionSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  prediction: z.coerce.number().min(-100).max(1000),
  comment: z.string().max(500).optional(),
});

type OpinionFormData = z.infer<typeof opinionSchema>;

export default function OpinionForm({ assetId, assetSymbol, userId }: OpinionFormProps) {
  const { toast } = useToast();

  const form = useForm<OpinionFormData>({
    resolver: zodResolver(opinionSchema),
    defaultValues: {
      sentiment: "neutral",
      prediction: 0,
      comment: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: OpinionFormData) => {
      const payload = {
        ...data,
        assetId,
        userId,
      };
      const encodedSymbol = encodeURIComponent(assetSymbol);
      const res = await apiRequest("POST", `/api/assets/${encodedSymbol}/opinions`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Opinion submitted",
        description: "Your opinion has been successfully shared.",
      });
      form.reset();
      const encodedSymbol = encodeURIComponent(assetSymbol);
      queryClient.invalidateQueries({ queryKey: [`/api/assets/${encodedSymbol}/opinions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/assets/${encodedSymbol}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OpinionFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="sentiment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your sentiment</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="positive" />
                    </FormControl>
                    <FormLabel className="font-normal text-green-600">Positive</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="neutral" />
                    </FormControl>
                    <FormLabel className="font-normal text-blue-600">Neutral</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="negative" />
                    </FormControl>
                    <FormLabel className="font-normal text-red-600">Negative</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="prediction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price prediction (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter your price prediction"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter your percentage prediction (e.g. 5.25 for +5.25%)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comment (optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add your thoughts on why..." 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Max 500 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Share Opinion"
          )}
        </Button>
      </form>
    </Form>
  );
}
