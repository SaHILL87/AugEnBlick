"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { getCookie } from "@/lib/utils"
import axios from "axios"

interface RequestAccessProps {
  documentId: string
}

export function RequestAccess({ documentId }: RequestAccessProps) {
  const [requestMessage, setRequestMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!requestMessage.trim()) {
      toast({
        title: "Error",
        description: "Please provide a request message",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      // Get token from localStorage or wherever you store it
      const token = getCookie("token")

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to request access",
          variant: "destructive",
        })
        return
      }

      const response = await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/access/request-access`, {
            documentId,
            requestMessage,
            token,
        }
        )

      const data = await response.data

      if (!data.success) {
        throw new Error(data.message || "Failed to create access request")
      }

      toast({
        title: "Request Sent",
        description: "Your access request has been submitted successfully",
      })

      setRequestMessage("")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Request Document Access</CardTitle>
        <CardDescription>Provide a reason why you need access to this document</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid w-full gap-4">
            <Textarea
              placeholder="Explain why you need access to this document..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Sending..." : "Request Access"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

