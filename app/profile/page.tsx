"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Crown, User, Calendar, CreditCard, Upload, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { redirect } from "next/navigation"

interface UserProfile {
  id: string
  full_name: string
  email: string
  subscription_tier: string
  subscription_expires_at: string | null
  created_at: string
  logo_url?: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fullName, setFullName] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        redirect("/auth/login")
        return
      }

      setUser(user)
      await fetchProfile(user.id)
    } catch (error) {
      console.error("Error checking user:", error)
      redirect("/auth/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      console.log("[v0] Fetching profile for user:", userId)
      const { data, error } = await supabase.rpc("get_user_profile_safe", { user_id: userId })

      if (error) {
        console.log("[v0] Error fetching profile:", error)
        throw error
      }

      if (data && data.length > 0) {
        const profileData = data[0]
        setProfile(profileData)
        setFullName(profileData.full_name || "")
        console.log("[v0] Profile loaded successfully")
      } else {
        console.log("[v0] No profile data found")
        throw new Error("Profile not found")
      }
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
      // Profile will remain null, triggering the "Profile not found" UI
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !profile) return

    setSaving(true)
    try {
      console.log("[v0] Updating profile for user:", user.id)
      const { data, error } = await supabase.rpc("update_user_profile_safe", {
        user_id: user.id,
        new_full_name: fullName,
      })

      if (error) throw error

      if (data === true) {
        setProfile({ ...profile, full_name: fullName })
        alert("Profile updated successfully!")
        console.log("[v0] Profile updated successfully")
      } else {
        throw new Error("Failed to update profile")
      }
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
      alert("Error updating profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !profile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      if (data.url) {
        // Update profile logo_url
        const { error } = await supabase
          .from('profiles')
          .update({ logo_url: data.url })
          .eq('id', user.id)

        if (error) throw error

        setProfile({ ...profile, logo_url: data.url })
        alert("Avatar updated successfully!")
      }
    } catch (error) {
      console.error("Error uploading avatar:", error)
      alert("Error uploading avatar. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Profile not found</p>
          <Button onClick={() => router.push("/library")} className="mt-4">
            Back to Library
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push("/library")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Overview */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.logo_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {getInitials(profile.full_name || "User")}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">{profile.full_name || "User"}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>

                <div className="flex justify-center mt-4">
                  {profile.subscription_tier === "premium" ? (
                    <Badge className="bg-accent text-accent-foreground">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium Member
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Free Member</Badge>
                  )}
                </div>

                {profile.role === 'admin' && (
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" onClick={() => router.push("/admin")} className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(profile.created_at)}</span>
                </div>

                {profile.subscription_tier === "premium" && profile.subscription_expires_at && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>Premium until {formatDate(profile.subscription_expires_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profile Settings */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal information and preferences</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar">Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile.logo_url} />
                      <AvatarFallback>{getInitials(profile.full_name || "User")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Max 5MB, image files only</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || fullName === profile.full_name}
                  className="w-full sm:w-auto"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Subscription Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription
                </CardTitle>
                <CardDescription>Manage your subscription and billing</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {profile.subscription_tier === "premium" ? "Premium Plan" : "Free Plan"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile.subscription_tier === "premium"
                        ? "Access to all premium content and features"
                        : "Limited access to free content"}
                    </p>
                  </div>

                  <Button variant="outline" onClick={() => router.push("/subscription")}>
                    {profile.subscription_tier === "premium" ? "Manage" : "Upgrade"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
