"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Play, Heart, MessageCircle, Users } from "lucide-react"

interface Series {
  id: string
  title: string
  description: string
  cover_image_url: string
  author: string
  narrator: string
  genre: string
  is_premium: boolean
  play_count: number
}

interface Audiobook {
  id: string
  title: string
  description: string
  audio_file_url: string
  duration_seconds: number
  chapter_number: number
  is_premium: boolean
}

export default function SeriesPage() {
  const params = useParams()
  const router = useRouter()
  const [series, setSeries] = useState<Series | null>(null)
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [comments, setComments] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchSeries()
      fetchAudiobooks()
      checkLikeStatus()
      fetchComments()
    }
  }, [params.id])

  const fetchSeries = async () => {
    try {
      const { data, error } = await supabase
        .from("series")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) throw error
      setSeries(data)
    } catch (error) {
      console.error("Error fetching series:", error)
    }
  }

  const fetchAudiobooks = async () => {
    try {
      const { data, error } = await supabase
        .from("audiobooks")
        .select("*")
        .eq("series_id", params.id)
        .order("chapter_number")

      if (error) throw error
      setAudiobooks(data || [])
    } catch (error) {
      console.error("Error fetching audiobooks:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkLikeStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("likes")
        .select("*")
        .eq("user_id", user.id)
        .eq("series_id", params.id)
        .single()

      if (data && !error) {
        setLiked(true)
      }

      // Get likes count
      const { count } = await supabase
        .from("likes")
        .select("*", { count: 'exact', head: true })
        .eq("series_id", params.id)

      setLikesCount(count || 0)
    } catch (error) {
      console.error("Error checking like status:", error)
    }
  }

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("series_id", params.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      if (liked) {
        // Unlike
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("series_id", params.id)

        if (error) throw error
        setLiked(false)
        setLikesCount(prev => prev - 1)
      } else {
        // Like
        const { error } = await supabase
          .from("likes")
          .insert({
            user_id: user.id,
            series_id: params.id
          })

        if (error) throw error
        setLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  const handlePlay = async (audiobookId: string) => {
    // Increment play count
    try {
      await supabase.rpc("increment_play_count", { series_uuid: params.id })
      setSeries(prev => prev ? { ...prev, play_count: prev.play_count + 1 } : null)
    } catch (error) {
      console.error("Error incrementing play count:", error)
    }

    // Navigate to player
    router.push(`/player/${audiobookId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading series...</p>
        </div>
      </div>
    )
  }

  if (!series) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Series not found</p>
          <Button onClick={() => router.push("/library")} className="mt-4">
            Back to Library
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push("/library")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </div>

        {/* Series Header */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-1">
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-4">
              <img
                src={series.cover_image_url || "/placeholder.svg"}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Social Stats */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={liked ? "default" : "outline"}
                  size="sm"
                  onClick={handleLike}
                  className="flex items-center gap-2"
                >
                  <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                  {likesCount}
                </Button>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {series.play_count} listeners
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                {comments.length} comments
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{series.title}</h1>
                <p className="text-muted-foreground mb-4">{series.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">By {series.author}</Badge>
                  <Badge variant="secondary">Narrated by {series.narrator}</Badge>
                  <Badge variant="outline">{series.genre}</Badge>
                  {series.is_premium && <Badge>Premium</Badge>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Chapters</h2>
          {audiobooks.map((audiobook) => (
            <Card key={audiobook.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline">Chapter {audiobook.chapter_number}</Badge>
                      <h3 className="font-semibold">{audiobook.title}</h3>
                      {audiobook.is_premium && <Badge>Premium</Badge>}
                    </div>
                    {audiobook.description && (
                      <p className="text-sm text-muted-foreground mb-2">{audiobook.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Duration: {Math.floor(audiobook.duration_seconds / 60)}:{(audiobook.duration_seconds % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <Button onClick={() => handlePlay(audiobook.id)} className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Play
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comments Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Comments</h2>
          <Card>
            <CardContent className="p-6">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet. Be the first to comment!</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profiles?.avatar_url} />
                        <AvatarFallback>
                          {comment.profiles?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.profiles?.full_name || 'Anonymous'}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.comment_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}