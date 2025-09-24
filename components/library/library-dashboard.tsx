"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SeriesGrid } from "./series-grid"
import { FavoritesGrid } from "./favorites-grid"
import { ListeningProgress } from "./listening-progress"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Search, LogOut, Crown, CreditCard, LogIn } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface UserProfile {
  full_name: string
  email: string
  subscription_tier: string
  logo_url?: string
  role?: string
}

interface LibraryDashboardProps {
  user?: any
}

export function LibraryDashboard({ user }: LibraryDashboardProps) {
   const [searchQuery, setSearchQuery] = useState("")
   const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
   const router = useRouter()
   const supabase = createClient()

   useEffect(() => {
     if (user) {
       fetchUserProfile()
     }
   }, [user])

   const fetchUserProfile = async () => {
     try {
       if (!user) return

       const { data, error } = await supabase.rpc("get_user_profile_safe", { user_id: user.id })

       if (error) {
         // Create fallback profile
         const fallbackProfile = {
           full_name: user.user_metadata?.full_name || "User",
           email: user.email || "",
           subscription_tier: "free",
           role: user.email === "rdcpulido@gmail.com" ? "admin" : "user"
         }
         setUserProfile(fallbackProfile)
         return
       }
       if (data && data.length > 0) {
         setUserProfile(data[0])
       } else {
         // Create fallback profile
         const fallbackProfile = {
           full_name: user.user_metadata?.full_name || "User",
           email: user.email || "",
           subscription_tier: "free",
           role: user.email === "rdcpulido@gmail.com" ? "admin" : "user"
         }
         setUserProfile(fallbackProfile)
       }
     } catch (error) {
       console.error("Error fetching user profile:", error)
       // Create fallback profile on any error
       const fallbackProfile = {
         full_name: user?.user_metadata?.full_name || "User",
         email: user?.email || "",
         subscription_tier: "free",
         role: user?.email === "rdcpulido@gmail.com" ? "admin" : "user"
       }
       setUserProfile(fallbackProfile)
     }
   }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                {userProfile?.logo_url ? (
                  <img
                    src={userProfile.logo_url || "/placeholder.svg"}
                    alt="Brand Logo"
                    className="h-16 w-auto max-w-[200px] object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-lg">AS</span>
                    </div>
                  </div>
                )}
                <div className="hidden sm:block">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                    {userProfile?.logo_url ? "AudioStory" : "AudioStory"}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">Interactive Audiobook Platform</p>
                </div>
              </div>

              {/* Search - Hidden on mobile, shown in separate row */}
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search series, authors, narrators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 xl:w-80 bg-background/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {!user && (
                <Badge variant="secondary" className="hidden sm:flex">
                  Guest Mode
                </Badge>
              )}

              {userProfile?.subscription_tier === "premium" && (
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-accent/20 rounded-full">
                  <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
                  <span className="text-xs sm:text-sm font-medium text-accent hidden sm:inline">Premium</span>
                </div>
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                          {userProfile?.full_name ? getInitials(userProfile.full_name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{userProfile?.full_name || "User"}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">{userProfile?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/subscription")}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Subscription
                    </DropdownMenuItem>
                    {userProfile?.role === "admin" && (
                      <DropdownMenuItem onClick={() => router.push("/admin")}>
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => router.push("/auth/login")} size="sm" className="text-xs sm:text-sm">
                  <LogIn className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Search */}
          <div className="relative lg:hidden mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search series, authors, narrators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>

          {!user && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Welcome!</strong> You're browsing as a guest.
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 underline ml-1"
                  onClick={() => router.push("/auth/signup")}
                >
                  Create an account
                </Button>{" "}
                to save your progress and access premium content.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Tabs defaultValue="browse" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit">
            <TabsTrigger value="browse" className="text-xs sm:text-sm">
              Browse
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs sm:text-sm" disabled={!user}>
              <span className="hidden sm:inline">Continue Listening</span>
              <span className="sm:hidden">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs sm:text-sm" disabled={!user}>
              Favorites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 sm:space-y-6">
            <SeriesGrid searchQuery={searchQuery} user={user} />
          </TabsContent>

          <TabsContent value="progress" className="space-y-4 sm:space-y-6">
            {user ? (
              <ListeningProgress />
            ) : (
              <div className="text-center text-muted-foreground">Sign in to view your progress</div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4 sm:space-y-6">
            {user ? (
              <FavoritesGrid />
            ) : (
              <div className="text-center text-muted-foreground">Sign in to view your favorites</div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
