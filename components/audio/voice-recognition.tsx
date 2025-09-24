"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Volume2, Smartphone } from "lucide-react"

interface VoiceRecognitionProps {
  onCommand: (command: string) => void
  isListening: boolean
  availableCommands: string[]
  customCommands?: { [key: string]: string } // Custom commands per chapter
  enableWakeWord?: boolean
}

export function VoiceRecognition({
  onCommand,
  isListening,
  availableCommands,
  customCommands = {},
  enableWakeWord = false,
}: VoiceRecognitionProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [confidence, setConfidence] = useState(0)
  const [lastCommand, setLastCommand] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<string>("unknown")

  const recognitionRef = useRef<any | null>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(isMobileDevice)
      return isMobileDevice
    }

    const mobile = checkMobile()

    // Check for speech recognition support with better mobile detection
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)

      recognitionRef.current = new SpeechRecognition()
      const recognition = recognitionRef.current

      // Enhanced configuration for better mobile support
      recognition.continuous = !mobile // Continuous mode can be problematic on mobile
      recognition.interimResults = true
      recognition.lang = "en-US"
      recognition.maxAlternatives = 3 // Get multiple alternatives for better accuracy

      // Mobile-specific optimizations
      if (mobile) {
        recognition.continuous = false
        recognition.interimResults = false // Simpler processing for mobile
      }

      recognition.onstart = () => {
        console.log("[v0] Voice recognition started")
        setIsRecording(true)
        setPermissionStatus("granted")
      }

      recognition.onresult = (event) => {
        let finalTranscript = ""
        let interimTranscript = ""
        let bestConfidence = 0

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript
          const confidence = result[0].confidence || 0

          if (result.isFinal) {
            finalTranscript += transcript
            bestConfidence = Math.max(bestConfidence, confidence)
          } else {
            interimTranscript += transcript
          }
        }

        const fullTranscript = finalTranscript || interimTranscript
        setTranscript(fullTranscript)
        setConfidence(bestConfidence)

        if (finalTranscript) {
          console.log("[v0] Final transcript:", finalTranscript)
          setLastCommand(finalTranscript)

          // Enhanced command processing
          processVoiceCommand(finalTranscript)

          setTimeout(() => {
            setTranscript("")
          }, 2000)
        }
      }

      recognition.onerror = (event) => {
        console.error("[v0] Speech recognition error:", event.error)

        if (event.error === "not-allowed") {
          setPermissionStatus("denied")
        } else if (event.error === "no-speech") {
          setPermissionStatus("no-speech")
        }

        setIsRecording(false)
      }

      recognition.onend = () => {
        console.log("[v0] Voice recognition ended")
        setIsRecording(false)

        // Auto-restart logic with mobile considerations
        if (isListening && !mobile) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current)
          }

          restartTimeoutRef.current = setTimeout(
            () => {
              try {
                if (isListening && recognitionRef.current) {
                  console.log("[v0] Restarting voice recognition")
                  recognitionRef.current.start()
                }
              } catch (error) {
                console.error("[v0] Error restarting recognition:", error)
              }
            },
            mobile ? 1000 : 500,
          ) // Longer delay for mobile
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [])

  // Enhanced command processing with fuzzy matching and custom commands
  const processVoiceCommand = (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim()

    // Check custom commands first
    for (const [customCmd, action] of Object.entries(customCommands)) {
      if (lowerTranscript.includes(customCmd.toLowerCase())) {
        onCommand(action)
        return
      }
    }

    // Enhanced command matching with synonyms and fuzzy matching
    const commandMap: { [key: string]: string[] } = {
      play: ["play", "start", "begin", "resume", "go"],
      pause: ["pause", "stop", "halt", "wait"],
      back: ["back", "previous", "rewind", "backward", "earlier"],
      forward: ["forward", "next", "skip", "ahead", "fast forward"],
      "volume up": ["volume up", "louder", "increase volume"],
      "volume down": ["volume down", "quieter", "decrease volume", "lower volume"],
    }

    // Check standard commands with fuzzy matching
    for (const [command, synonyms] of Object.entries(commandMap)) {
      if (synonyms.some((synonym) => lowerTranscript.includes(synonym))) {
        onCommand(command)
        return
      }
    }

    // Check available commands with partial matching
    const matchingCommand = availableCommands.find((cmd) => {
      const cmdLower = cmd.toLowerCase()
      return (
        lowerTranscript.includes(cmdLower) ||
        cmdLower.includes(lowerTranscript) ||
        levenshteinDistance(lowerTranscript, cmdLower) <= 2
      )
    })

    if (matchingCommand) {
      onCommand(matchingCommand)
      return
    }

    // Fallback: send original transcript
    onCommand(transcript)
  }

  // Simple Levenshtein distance for fuzzy matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = []
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        }
      }
    }
    return matrix[str2.length][str1.length]
  }

  useEffect(() => {
    if (!recognitionRef.current) return

    if (isListening && isSupported) {
      try {
        console.log("[v0] Starting voice recognition")
        recognitionRef.current.start()
      } catch (error) {
        console.error("[v0] Error starting recognition:", error)
      }
    } else {
      console.log("[v0] Stopping voice recognition")
      recognitionRef.current.stop()
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [isListening, isSupported])

  if (!isSupported) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 sm:p-6 text-center">
          <MicOff className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-serif font-semibold mb-2 text-sm sm:text-base">Voice Recognition Not Supported</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
            Your browser doesn't support voice recognition. Please use a modern browser like Chrome or Edge.
          </p>
          {isMobile && (
            <p className="text-xs text-muted-foreground">
              On mobile devices, try using Chrome browser for better voice recognition support.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-2 transition-colors ${isRecording ? "border-primary bg-primary/5" : "border-border"}`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isRecording ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {isRecording ? <Mic className="h-4 w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-semibold text-sm sm:text-base">Voice Control</h3>
                {isMobile && <Smartphone className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isRecording
                  ? "Listening for commands..."
                  : isListening
                    ? isMobile
                      ? "Tap Voice Control to speak"
                      : "Click Voice Control to activate"
                    : "Voice recognition ready"}
              </p>
            </div>
          </div>
          <Badge variant={isRecording ? "default" : "secondary"} className="text-xs">
            {isRecording ? "Listening" : isListening ? "Active" : "Standby"}
          </Badge>
        </div>

        {permissionStatus === "denied" && (
          <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">
              Microphone access denied. Please enable microphone permissions in your browser settings.
            </p>
          </div>
        )}

        {transcript && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Heard:</span>
            </div>
            <p className="text-sm">{transcript}</p>
            {confidence > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Confidence: {Math.round(confidence * 100)}%</p>
            )}
          </div>
        )}

        {lastCommand && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                Last Command
              </Badge>
            </div>
            <p className="text-sm font-medium">{lastCommand}</p>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-3">Available Voice Commands:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableCommands.map((command, index) => (
              <Badge key={index} variant="outline" className="justify-center py-1 text-xs">
                "{command}"
              </Badge>
            ))}
            {Object.keys(customCommands).map((command, index) => (
              <Badge key={`custom-${index}`} variant="secondary" className="justify-center py-1 text-xs">
                "{command}"
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p>
            💡 <strong>Tip:</strong>{" "}
            {isMobile
              ? "On mobile, speak clearly after tapping Voice Control. The system will process your command automatically."
              : "Speak clearly and wait for the system to process your command. Voice control will continue listening for new commands."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
