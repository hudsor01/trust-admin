import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Send } from "lucide-react"
import { AssetTypeSelector } from "@/components/forms/AssetTypeSelector"
import { DynamicFormFields } from "@/components/forms/DynamicFormFields"
import { QuantityInput } from "@/components/forms/QuantityInput"
import { SubmissionSuccess } from "@/components/forms/SubmissionSuccess"
import { ASSET_TYPES } from "@/lib/public-form-config"

type FormState = "editing" | "submitting" | "success" | "error"

export function PublicDataCollectionForm() {
  const [state, setState] = useState<FormState>("editing")
  const [selectedType, setSelectedType] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ itemsCreated: number; itemType: string } | null>(null)

  const selectedConfig = ASSET_TYPES.find((t) => t.value === selectedType)

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleReset = () => {
    setState("editing")
    setSelectedType("")
    setQuantity(1)
    setFormData({})
    setError(null)
    setResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedType) {
      setError("Please select an asset or liability type")
      return
    }

    // Client-side validation: check required fields
    const config = ASSET_TYPES.find((t) => t.value === selectedType)
    if (!config) return

    const missingFields = config.fields
      .filter((f) => f.required && !formData[f.name]?.trim())
      .map((f) => f.label)

    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(", ")}`)
      return
    }

    setState("submitting")

    try {
      const res = await fetch("/api/public/submit-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: selectedType,
          quantity,
          data: formData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || "Failed to submit")
      }

      const data = await res.json()
      setResult({ itemsCreated: data.itemsCreated, itemType: config.label })
      setState("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setState("error")
    }
  }

  if (state === "success" && result) {
    return (
      <div className="min-h-screen bg-background p-6">
        <SubmissionSuccess
          itemsCreated={result.itemsCreated}
          itemType={result.itemType}
          onSubmitAnother={handleReset}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Submit Asset or Liability Information</CardTitle>
          <CardDescription>
            Help us collect information about assets and liabilities for the Hudson Living Trust.
            All submissions are reviewed by the trustee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <AssetTypeSelector value={selectedType} onChange={setSelectedType} />

            {selectedConfig && (
              <>
                <QuantityInput value={quantity} onChange={setQuantity} />
                <div className="border-t pt-4">
                  <DynamicFormFields
                    config={selectedConfig}
                    values={formData}
                    onChange={handleFieldChange}
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={state === "submitting"}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={state === "submitting" || !selectedType}
                className="flex-1"
              >
                {state === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
