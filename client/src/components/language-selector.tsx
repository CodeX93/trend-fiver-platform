import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LanguageSelectorButton() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1">
          <Globe className="h-4 w-4" />
          <span>{language === "en" ? "EN" : "IT"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className={cn(language === "en" && "bg-muted")}
          onClick={() => setLanguage("en")}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn(language === "it" && "bg-muted")}
          onClick={() => setLanguage("it")}
        >
          Italiano
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSelectorCard() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{t("home.language_selector")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            variant={language === "en" ? "default" : "outline"}
            onClick={() => setLanguage("en")}
            className="flex-1"
          >
            {t("home.language_en")}
          </Button>
          <Button
            variant={language === "it" ? "default" : "outline"}
            onClick={() => setLanguage("it")}
            className="flex-1"
          >
            {t("home.language_it")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}