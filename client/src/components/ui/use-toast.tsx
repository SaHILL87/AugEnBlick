"use client"

import { useState, useCallback } from "react"

type ToastVariant = "default" | "destructive"

interface ToastProps {
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastState extends ToastProps {
  id: string
  visible: boolean
}

// Simple toast implementation
export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const toast = useCallback(({ title, description, variant = "default" }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)

    setToasts((prev) => [...prev, { id, title, description, variant, visible: true }])

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)

    return id
  }, [])

  return { toast, toasts }
}

// Simple toast component
export function Toast({ title, description, variant = "default", onClose }: ToastProps & { onClose?: () => void }) {
  const bgColor = variant === "destructive" ? "bg-red-100 border-red-400" : "bg-green-100 border-green-400"
  const textColor = variant === "destructive" ? "text-red-800" : "text-green-800"

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-md border ${bgColor} shadow-md max-w-md z-50`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className={`font-medium ${textColor}`}>{title}</h3>
          {description && <p className={`text-sm mt-1 ${textColor}`}>{description}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className={`ml-4 ${textColor}`}>
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// This is a simplified version. In a real app, you'd want to use a context provider
export { toast } from "react-hot-toast"

