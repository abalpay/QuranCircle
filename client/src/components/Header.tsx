import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Menu,
  LogOut,
  UserCircle,
  Globe,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { toast } = useToast();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className="bg-white border-b border-[hsl(var(--quran-border))] sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center md:py-2">
        {/* Left section - Menu on mobile, logo on desktop */}
        <div className="flex items-center md:w-1/3">
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-700 -ml-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <span className="w-full cursor-pointer">Home</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/circles">
                    <span className="w-full cursor-pointer">Browse Circles</span>
                  </Link>
                </DropdownMenuItem>
                {user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Hello, {user.username}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Logo - visible on all devices (mobile and desktop) */}
          <Link href="/">
            <span className="text-xl font-heading font-bold cursor-pointer text-[hsl(var(--quran-green))]">
              Quran<span className="text-black">Circle</span>
            </span>
          </Link>
        </div>
        
        {/* Center section - Empty now (logo has been moved to left) */}
        <div className="flex-1 md:w-1/3">
          {/* Intentionally empty */}
        </div>
        
        {/* Right section - Actions */}
        <div className="flex items-center justify-end space-x-2 md:w-1/3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-600 rounded-full hidden md:flex">
                <Globe className="h-4 w-4 mr-1" />
                <span className="text-sm">English</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({
                title: "Coming Soon",
                description: "Arabic language support will be available soon."
              })}>Arabic</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({
                title: "Coming Soon",
                description: "Turkish language support will be available soon."
              })}>Turkish</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({
                title: "Coming Soon",
                description: "Urdu language support will be available soon."
              })}>Urdu</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-700 hidden md:flex">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span className="text-sm">{user.username}</span>
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <span className="w-full cursor-pointer">My Circles</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-[hsl(var(--quran-green))] border-[hsl(var(--quran-green))] hidden md:flex"
              onClick={() => openAuthModal('login')}
            >
              <div className="flex items-center">
                <span className="text-sm">Sign In</span>
              </div>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
