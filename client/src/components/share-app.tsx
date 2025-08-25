import { Facebook, Twitter, Linkedin, Mail, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

interface ShareAppProps {
  variant?: "button" | "icon";
  size?: "sm" | "md" | "lg";
}

export default function ShareApp({ variant = "button", size = "md" }: ShareAppProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { t } = useLanguage();
  
  const appUrl = window.location.origin;
  
  // Generate direct links to various sections of the app
  const links = {
    home: appUrl,
    leaderboard: `${appUrl}/leaderboard`,
    // Add more links as needed
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: t("share.copied"),
      description: t("share.link_copied"),
    });
  };

  const handleSocialShare = (platform: string) => {
    let shareUrl = "";
    const text = t("share.message");
    
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent(t("share.email_subject"))}&body=${encodeURIComponent(text + " " + appUrl)}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, "_blank");
  };

  const buttonSizeClass = 
    size === "sm" ? "h-8 px-3 text-xs" : 
    size === "lg" ? "h-12 px-6 text-base" : 
    "h-10 px-4 text-sm";

  const iconSizeClass =
    size === "sm" ? "h-4 w-4" : 
    size === "lg" ? "h-6 w-6" : 
    "h-5 w-5";

  if (variant === "icon") {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-accent transition-colors duration-200"
          >
            <Share2 className={iconSizeClass} />
          </Button>
        </DialogTrigger>
        <ShareContent
          links={links}
          handleCopyLink={handleCopyLink}
          handleSocialShare={handleSocialShare}
        />
      </Dialog>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={`${buttonSizeClass} flex items-center gap-2 hover:bg-accent transition-colors duration-200`}
        >
          <Share2 className={iconSizeClass} />
          {t("share.share_app")}
        </Button>
      </DialogTrigger>
      <ShareContent
        links={links}
        handleCopyLink={handleCopyLink}
        handleSocialShare={handleSocialShare}
      />
    </Dialog>
  );
}

function ShareContent({ 
  links, 
  handleCopyLink, 
  handleSocialShare 
}: { 
  links: Record<string, string>; 
  handleCopyLink: (link: string) => void; 
  handleSocialShare: (platform: string) => void; 
}) {
  const { t } = useLanguage();
  
  return (
    <DialogContent className="sm:max-w-lg bg-background border-border">
      <DialogHeader className="space-y-3 pb-4">
        <DialogTitle className="text-xl font-semibold text-foreground">
          {t("share.share_with_friends")}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-base leading-relaxed">
          {t("share.invite_friends")}
        </DialogDescription>
      </DialogHeader>
      
      {/* Social Media Buttons */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-foreground mb-3">
          Share via social media
        </div>
        <div className="flex items-center justify-center space-x-4">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full bg-[#1877F2] hover:bg-[#0E63CE] text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => handleSocialShare("facebook")}
          >
            <Facebook className="h-6 w-6" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full bg-[#1DA1F2] hover:bg-[#0C85D0] text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => handleSocialShare("twitter")}
          >
            <Twitter className="h-6 w-6" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full bg-[#0A66C2] hover:bg-[#084E96] text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => handleSocialShare("linkedin")}
          >
            <Linkedin className="h-6 w-6" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full bg-[#D44638] hover:bg-[#B23121] text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => handleSocialShare("email")}
          >
            <Mail className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      
      {/* Copy Links Section */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-foreground">
          Copy direct links
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors duration-200">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground mb-1">
                {t("share.homepage")}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {links.home}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-3 h-8 w-8 p-0 hover:bg-accent"
              onClick={() => handleCopyLink(links.home)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors duration-200">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground mb-1">
                {t("share.leaderboard")}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {links.leaderboard}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-3 h-8 w-8 p-0 hover:bg-accent"
              onClick={() => handleCopyLink(links.leaderboard)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}