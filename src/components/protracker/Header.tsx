import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dumbbell } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background/95 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-3">
        <Dumbbell className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground font-headline">
          ProTracker
        </h1>
      </div>
      <Avatar>
        <AvatarImage src="https://placehold.co/40x40.png" alt="@user" />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </header>
  );
}
