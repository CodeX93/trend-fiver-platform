import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Heart, UserPlus2, UserMinus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  userId: string; // Changed from number to string to match backend uuid
  username: string;
  initialFollowing?: boolean;
  variant?: "icon" | "button";
  size?: "sm" | "md" | "lg";
}

export default function FollowButton({ 
  userId, 
  username, 
  initialFollowing = false,
  variant = "button",
  size = "md"
}: FollowButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  
  // Sync with initialFollowing prop changes
  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);
  
  // Determine if this is the current user
  const isSelf = user?.id === userId;
  
  // Real API call for follow/unfollow
  const followMutation = useMutation({
    mutationFn: async ({ username, follow }: { username: string, follow: boolean }) => {
      const response = await apiRequest(
        follow ? 'POST' : 'DELETE',
        `/api/user/${username}/follow`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update follow status');
      }
      
      return response.json();
    },
    onMutate: ({ follow }) => {
      // Optimistically update the UI
      setIsFollowing(follow);
    },
    onSuccess: (_, { follow }) => {
      // Update queries that might depend on following status
      queryClient.invalidateQueries({ queryKey: [`/api/user/${username}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/user/${username}/followers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/user/${username}/following`] });
      
      // Also invalidate current user's profile to update their following count
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
        queryClient.invalidateQueries({ queryKey: [`/api/user/${user.username}/following`] });
        queryClient.invalidateQueries({ queryKey: [`/api/user/${user.username}/followers`] });
      }
      
      // Update the local state to ensure UI consistency
      setIsFollowing(follow);
      
      toast({
        title: follow ? `Following ${username}` : `Unfollowed ${username}`,
        description: follow 
          ? "You'll see their predictions in your feed" 
          : "You won't see their predictions anymore",
      });
    },
    onError: (error, { follow }) => {
      // Revert the optimistic update
      setIsFollowing(!follow);
      
      toast({
        variant: "destructive",
        title: follow ? "Failed to follow" : "Failed to unfollow",
        description: error instanceof Error ? error.message : "Please try again later",
      });
    }
  });
  
  // Handle follow/unfollow action
  const toggleFollow = () => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = "/auth";
      return;
    }
    
    followMutation.mutate({ username, follow: !isFollowing });
  };
  
  // Size classes based on the size prop
  const buttonSizeClass = size === "sm" ? "text-xs py-1 px-2" : size === "lg" ? "text-base py-2 px-4" : "text-sm py-1.5 px-3";
  const iconSizeClass = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const iconButtonSizeClass = size === "sm" ? "h-7 w-7 p-0" : size === "lg" ? "h-10 w-10 p-0" : "h-8 w-8 p-0";
  
  // If this is the current user, disable the button
  if (isSelf) {
    return null;
  }
  
  // Render icon variant
  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isFollowing ? "default" : "outline"}
              size="icon"
              className={iconButtonSizeClass}
              onClick={toggleFollow}
              disabled={followMutation.isPending || isSelf}
            >
              {isFollowing ? (
                <UserMinus2 className={iconSizeClass} />
              ) : (
                <UserPlus2 className={iconSizeClass} />
              )}
              <span className="sr-only">
                {isFollowing ? "Unfollow" : "Follow"} {username}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isFollowing ? "Unfollow" : "Follow"} {username}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Render button variant
  return (
    <Button
      variant={isFollowing ? "default" : "outline"}
      className={buttonSizeClass}
      onClick={toggleFollow}
      disabled={followMutation.isPending || isSelf}
    >
      {isFollowing ? (
        <>
          <UserMinus2 className={`${iconSizeClass} mr-2`} />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus2 className={`${iconSizeClass} mr-2`} />
          Follow
        </>
      )}
    </Button>
  );
}