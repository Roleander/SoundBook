import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Validate file type (audio files only)
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json({ error: "File must be an audio file" }, { status: 400 })
    }

    // Upload to Vercel Blob with organized path structure
    const timestamp = Date.now()
    const filename = `audiobooks/${timestamp}-${file.name}`

    const blob = await put(filename, file, {
      access: "public",
    })

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
      duration: 0, // Will be calculated on frontend
    })
  } catch (error) {
    console.error("Audio upload error:", error)
    return NextResponse.json({ error: "Audio upload failed" }, { status: 500 })
  }
}
