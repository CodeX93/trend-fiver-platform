import { useState } from "react";
import { Twitter, Facebook, Linkedin, Link2, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface SocialShareProps {
  assetSymbol: string;
  assetName: string;
  sentiment: string;
  prediction: number;
  size?: "sm" | "md" | "lg";
}

export default function SocialShare({ 
  assetSymbol, 
  assetName, 
  sentiment, 
  prediction,
  size = "md" 
}: SocialShareProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Create share message
  const shareMessage = `I'm predicting ${sentiment} sentiment for ${assetName} (${assetSymbol}) with ${prediction >= 0 ? '+' : ''}${prediction.toFixed(2)}% change on Trend! Check it out.`;
  
  // Create share URLs
  const encodedMessage = encodeURIComponent(shareMessage);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodedMessage}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
  
  // Button size classes based on size prop
  const buttonSize = size === "sm" ? "h-7 w-7 p-0" : size === "lg" ? "h-10 w-10 p-0" : "h-8 w-8 p-0";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  
  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(shareMessage).then(() => {
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "You can now paste this message anywhere",
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please try again",
      });
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={buttonSize}
              onClick={() => window.open(twitterUrl, '_blank')}
            >
              <Twitter className={iconSize} />
              <span className="sr-only">Share on Twitter</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share on Twitter</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={buttonSize}
              onClick={() => window.open(facebookUrl, '_blank')}
            >
              <Facebook className={iconSize} />
              <span className="sr-only">Share on Facebook</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share on Facebook</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={buttonSize}
              onClick={() => window.open(linkedinUrl, '_blank')}
            >
              <Linkedin className={iconSize} />
              <span className="sr-only">Share on LinkedIn</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share on LinkedIn</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={buttonSize}
              onClick={handleCopy}
            >
              {copied ? <CheckCheck className={iconSize} /> : <Copy className={iconSize} />}
              <span className="sr-only">Copy to clipboard</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}