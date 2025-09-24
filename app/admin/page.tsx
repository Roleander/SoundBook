"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUserAndRole()
  }, [])

  const checkUserAndRole = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        throw authError
      }

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Allow access for admin email or check database role
      let isAdmin = user.email === "rdcpulido@gmail.com"

      if (!isAdmin) {
        const { data: adminCheck, error: adminError } = await supabase.rpc("check_user_admin_safe", {
          user_id: user.id,
        })

        if (adminError) {
          throw adminError
        }

        if (!adminCheck) {
          // Try to bootstrap first admin if no admins exist
          const { data: bootstrapResult, error: bootstrapError } = await supabase.rpc("bootstrap_first_admin", {
            user_id: user.id,
          })

          if (bootstrapError) {
            setError(`Access denied. Admin privileges required. Bootstrap error: ${bootstrapError.message}`)
            return
          }

          if (bootstrapResult) {
            // Re-check admin status after bootstrap
            const { data: newAdminCheck, error: newAdminError } = await supabase.rpc("check_user_admin_safe", {
              user_id: user.id,
            })

            if (newAdminError) {
              setError(`Failed to verify admin access after bootstrap: ${newAdminError.message}`)
              return
            }

            if (!newAdminCheck) {
              setError("Bootstrap succeeded but admin check still fails. Please contact support.")
              return
            }

            isAdmin = true
          } else {
            setError("Access denied. Admin privileges required.")
            return
          }
        } else {
          isAdmin = true
        }
      }

      // Fetch user profile (optional)
      const { data: profileData, error: profileError } = await supabase.rpc("get_user_profile_safe", {
        user_id: user.id,
      })

      if (!profileError && profileData && profileData.length > 0) {
        setUserProfile(profileData[0])
      }

    } catch (error: any) {
      console.error("Error checking admin access:", error)
      setError("Failed to verify admin access. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push("/library")} className="w-full" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
        </div>
      </div>
    )
  }

  if (userProfile?.role === "admin" || (!userProfile && !error)) {
    return <AdminDashboard />
  }

  return null
}
