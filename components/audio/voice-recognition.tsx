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
  const [performanceMetrics, setPerformanceMetrics] = useState({
    startTime: 0,
    responseTime: 0,
    errorCount: 0,
  })
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online')
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)

  const recognitionRef = useRef<any | null>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout>()
  const gestureTimeoutRef = useRef<NodeJS.Timeout>()

  // Network status handler
  const updateNetworkStatus = () => {
    setNetworkStatus(navigator.onLine ? 'online' : 'offline')
  }

  // Gesture handling for iOS Safari
  const handleUserGesture = () => {
    if (isMobile && !isSupported) {
      // Clear any existing gesture timeout
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current)
      }
      // Set a flag that user has interacted
      localStorage.setItem('userGestureGranted', 'true')
    }
  }

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(isMobileDevice)
      return isMobileDevice
    }

    const mobile = checkMobile()

    // Monitor network status
    updateNetworkStatus()
    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    // Monitor battery status (if available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level * 100)
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level * 100)
        })
      })
    }

    if (mobile) {
      document.addEventListener('touchstart', handleUserGesture, { once: true })
      document.addEventListener('click', handleUserGesture, { once: true })
    }

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
        setPerformanceMetrics(prev => ({ ...prev, startTime: Date.now() }))
      }

      recognition.onresult = (event: any) => {
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

          // Performance tracking
          const responseTime = Date.now() - performanceMetrics.startTime
          setPerformanceMetrics(prev => ({
            ...prev,
            responseTime: (prev.responseTime + responseTime) / 2, // Average response time
          }))

          // Enhanced command processing
          processVoiceCommand(finalTranscript)

          setTimeout(() => {
            setTranscript("")
          }, 2000)
        }
      }

      recognition.onerror = (event: any) => {
        console.error("[v0] Speech recognition error:", event.error)

        // Performance tracking
        setPerformanceMetrics(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1,
        }))

        if (event.error === "not-allowed") {
          setPermissionStatus("denied")
        } else if (event.error === "no-speech") {
          setPermissionStatus("no-speech")
        } else if (event.error === "network") {
          setPermissionStatus("network-error")
        }

        setIsRecording(false)
      }

      recognition.onend = () => {
        console.log("[v0] Voice recognition ended")
        setIsRecording(false)

        // Auto-restart logic with mobile, battery, and network considerations
        const shouldAutoRestart = isListening && (
          !mobile || // Always auto-restart on desktop
          (mobile && networkStatus === 'online' && (batteryLevel === null || batteryLevel > 20)) // On mobile, only if online and battery > 20%
        )

        if (shouldAutoRestart) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current)
          }

          // Adjust delay based on battery and network
          let delay = mobile ? 1000 : 500
          if (batteryLevel !== null && batteryLevel < 30) {
            delay *= 2 // Double delay on low battery
          }
          if (networkStatus === 'offline') {
            delay *= 3 // Triple delay when offline
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
            delay,
          )
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
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current)
      }
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
      if (mobile) {
        document.removeEventListener('touchstart', handleUserGesture)
        document.removeEventListener('click', handleUserGesture)
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
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                On mobile devices, try using Chrome browser for better voice recognition support.
              </p>
              {networkStatus === 'offline' && (
                <p className="text-xs text-amber-600">
                  ⚠️ You're offline. Voice recognition requires an internet connection.
                </p>
              )}
              {batteryLevel !== null && batteryLevel < 20 && (
                <p className="text-xs text-amber-600">
                  🔋 Battery low ({Math.round(batteryLevel)}%). Voice recognition may be limited.
                </p>
              )}
            </div>
          )}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Fallback:</strong> Use manual controls or keyboard input for audio commands.
            </p>
          </div>
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

        {permissionStatus === "network-error" && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              Network error detected. Voice recognition requires an internet connection.
            </p>
          </div>
        )}

        {networkStatus === 'offline' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              ⚠️ You're currently offline. Voice recognition features are limited.
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

        <div className="mt-4 space-y-3">
          <div className="text-xs text-muted-foreground">
            <p>
              💡 <strong>Tip:</strong>{" "}
              {isMobile
                ? "On mobile, speak clearly after tapping Voice Control. The system will process your command automatically."
                : "Speak clearly and wait for the system to process your command. Voice control will continue listening for new commands."}
            </p>
          </div>

          {/* Performance Metrics */}
          {performanceMetrics.errorCount > 0 && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <div className="flex items-center gap-2">
                <span className="text-amber-600">⚠️ Performance Issues Detected</span>
              </div>
              <div className="mt-1 text-amber-700">
                <p>Avg Response: {performanceMetrics.responseTime.toFixed(0)}ms</p>
                <p>Errors: {performanceMetrics.errorCount}</p>
                {batteryLevel !== null && <p>Battery: {Math.round(batteryLevel)}%</p>}
                <p>Network: {networkStatus}</p>
              </div>
            </div>
          )}

          {/* Manual Command Input Fallback */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs font-medium mb-2">Manual Command Input:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a command..."
                className="flex-1 px-2 py-1 text-xs border rounded"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    onCommand(e.currentTarget.value.trim())
                    e.currentTarget.value = ''
                  }
                }}
              />
              <button
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement
                  if (input.value.trim()) {
                    onCommand(input.value.trim())
                    input.value = ''
                  }
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
