"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { Check, X, FileText, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { toast } from "@/hooks/use-toast"
import { getCookie } from "@/lib/utils"


interface AccessRequest {
  _id: string
  documentId: string
  userId: string
  email: string
  requestMessage: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
  documentTitle?: string
}

export default function DocumentRequestResponsePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [request, setRequest] = useState<AccessRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRequestDetails()
  }, [])

  const fetchRequestDetails = async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)

      // Get token from localStorage
      const token = getCookie("token")

      if (!token) {
        setError("You must be logged in to view this request")
        return
      }

      const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/access/access-request/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setRequest(response.data.data)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Failed to fetch request details")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestAction = async (status: "accepted" | "rejected") => {
    if (!id) return

    try {
      setIsProcessing(true)

      // Get token from localStorage
      const token = getCookie("token")

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to process this request",
          variant: "destructive",
        })
        return
      }

      await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/access/access-status`, {
        id,
        status,
        token,
      })

      // Update local state
      setRequest((prev) => (prev ? { ...prev, status } : null))

      toast({
        title: "Success",
        description: `Request ${status === "accepted" ? "approved" : "declined"} successfully`,
      })

      // Redirect after a short delay
      setTimeout(() => {
        navigate(`/documents/${request?.documentId}`) 
      }, 2000)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast({
          title: "Error",
          description: error.response?.data?.message || `Failed to ${status} request`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading request details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-md mx-auto py-12 px-4">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate("/access-requests")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Requests
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="container max-w-md mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Request Not Found</CardTitle>
            <CardDescription>
              The document access request you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate("/access-requests")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Requests
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const isDecided = request.status === "accepted" || request.status === "rejected"

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Button variant="ghost" onClick={() => navigate("/access-requests")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Requests
      </Button>

      <Card className="overflow-hidden">
        <div className="h-2 bg-primary w-full"></div>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Document Access Request</CardTitle>
              <CardDescription className="mt-2">
                Request from <span className="font-medium">{request.email}</span> on{" "}
                {new Date(request.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                request.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : request.status === "accepted"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-start space-x-4 p-4 bg-muted/40 rounded-lg">
            <FileText className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-medium">Document</h3>
              <p className="text-sm text-muted-foreground">
                {request.documentTitle || `Document ID: ${request.documentId}`}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Request Message:</h3>
            <div className="p-4 bg-muted/40 rounded-lg">
              <p className="text-sm whitespace-pre-line">{request.requestMessage}</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className={`flex ${isDecided ? "justify-center" : "justify-between"} gap-4 pt-2 pb-6`}>
          {isDecided ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">This request has already been {request.status}.</p>
              <Button variant="outline" onClick={() => navigate("/access-requests")}>
                View All Requests
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleRequestAction("rejected")}
                disabled={isProcessing}
              >
                <X className="mr-2 h-4 w-4" />
                Decline Access
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleRequestAction("accepted")}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Approve Access
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

