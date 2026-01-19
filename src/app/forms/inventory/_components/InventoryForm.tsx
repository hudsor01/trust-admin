'use client'

import {
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Loader2,
    Sparkles,
    Upload,
    X,
} from 'lucide-react'
import Image from 'next/image'
import { useActionState, useCallback, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
    type InventoryFormState,
    submitInventoryItem,
} from '../../_actions/submitInventoryItem'

const CATEGORIES = [
    { value: 'FURNITURE', label: 'Furniture' },
    { value: 'ELECTRONICS', label: 'Electronics' },
    { value: 'JEWELRY', label: 'Jewelry' },
    { value: 'ART', label: 'Art / Decor' },
    { value: 'COLLECTIBLES', label: 'Collectibles' },
    { value: 'OTHER', label: 'Other' },
] as const

const CONDITIONS = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
] as const

type AnalysisResult = {
    name: string
    category: string
    dbCategory: string
    brand: string | null
    model: string | null
    materials: string[]
    era: string | null
    estimatedValue: string
    valueRangeLow: string
    valueRangeHigh: string
    condition: 'excellent' | 'good' | 'fair' | 'poor'
    conditionNotes: string
    description: string
    valuationRationale: string
    confidence: 'high' | 'medium' | 'low'
    confidenceNotes: string
}

export function InventoryForm() {
    const [state, formAction, isPending] = useActionState<
        InventoryFormState,
        FormData
    >(submitInventoryItem, { success: false })

    const [photos, setPhotos] = useState<File[]>([])
    const [analyzing, setAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
    const [analysisError, setAnalysisError] = useState<string | null>(null)

    const handlePhotoSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || [])
            if (files.length + photos.length > 5) {
                alert('Maximum 5 photos allowed')
                return
            }
            setPhotos((prev) => [...prev, ...files])
            setAnalysis(null) // Clear previous analysis when photos change
            setAnalysisError(null)
        },
        [photos.length],
    )

    const removePhoto = useCallback((index: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index))
        setAnalysis(null)
        setAnalysisError(null)
    }, [])

    const analyzePhotos = async () => {
        if (photos.length === 0) return

        setAnalyzing(true)
        setAnalysisError(null)

        try {
            // Convert photos to base64
            const images = await Promise.all(
                photos.map(async (photo) => {
                    const buffer = await photo.arrayBuffer()
                    const base64 = Buffer.from(buffer).toString('base64')
                    return { base64, mimeType: photo.type }
                }),
            )

            const res = await fetch('/api/inventory/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images }),
            })
            const data = await res.json()

            if (data.success) {
                setAnalysis(data.data)
            } else {
                setAnalysisError(data.error || 'Analysis failed')
            }
        } catch {
            setAnalysisError('Failed to connect to analysis service')
        } finally {
            setAnalyzing(false)
        }
    }

    if (state.success) {
        return (
            <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                        <h2 className="text-2xl font-semibold">
                            Item Submitted
                        </h2>
                        <p className="text-muted-foreground">
                            Your inventory item has been submitted for review.
                            The trustee will review and process your submission.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Reference ID: #{state.itemId}
                        </p>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="mt-4"
                        >
                            Submit Another Item
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <form action={formAction} className="max-w-2xl mx-auto space-y-6">
            {/* Photo Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Photo Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Upload a photo and our AI will identify the item, assess
                        condition, and provide a fair market valuation.
                    </p>

                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            multiple
                            onChange={handlePhotoSelect}
                            className="hidden"
                            id="photo-input"
                        />
                        <label htmlFor="photo-input" className="cursor-pointer">
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Click to select photos (up to 5)
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Multiple angles help improve accuracy
                            </p>
                        </label>
                    </div>

                    {photos.length > 0 && (
                        <div className="grid grid-cols-5 gap-2">
                            {photos.map((photo, i) => (
                                <div key={i} className="relative aspect-square">
                                    <Image
                                        src={URL.createObjectURL(photo)}
                                        alt={`Uploaded item ${i + 1}`}
                                        fill
                                        unoptimized
                                        className="object-cover rounded"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(i)}
                                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {photos.length > 0 && !analysis && (
                        <Button
                            type="button"
                            onClick={analyzePhotos}
                            disabled={analyzing}
                            className="w-full"
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Analyzing with AI...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Analyze & Value Item
                                </>
                            )}
                        </Button>
                    )}

                    {analysisError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Analysis Failed</AlertTitle>
                            <AlertDescription>{analysisError}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* AI Analysis Results */}
            {analysis && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                AI Analysis
                            </span>
                            <Badge
                                variant={
                                    analysis.confidence === 'high'
                                        ? 'default'
                                        : analysis.confidence === 'medium'
                                          ? 'secondary'
                                          : 'outline'
                                }
                            >
                                {analysis.confidence} confidence
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Item Identification */}
                        <div>
                            <h3 className="font-semibold text-lg">
                                {analysis.name}
                            </h3>
                            <p className="text-muted-foreground">
                                {analysis.description}
                            </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {analysis.brand && (
                                <div>
                                    <span className="text-muted-foreground">
                                        Brand:
                                    </span>{' '}
                                    <span className="font-medium">
                                        {analysis.brand}
                                    </span>
                                </div>
                            )}
                            {analysis.model && (
                                <div>
                                    <span className="text-muted-foreground">
                                        Model:
                                    </span>{' '}
                                    <span className="font-medium">
                                        {analysis.model}
                                    </span>
                                </div>
                            )}
                            {analysis.era && (
                                <div>
                                    <span className="text-muted-foreground">
                                        Era:
                                    </span>{' '}
                                    <span className="font-medium">
                                        {analysis.era}
                                    </span>
                                </div>
                            )}
                            <div>
                                <span className="text-muted-foreground">
                                    Materials:
                                </span>{' '}
                                <span className="font-medium">
                                    {analysis.materials.join(', ')}
                                </span>
                            </div>
                        </div>

                        {/* Valuation */}
                        <div className="bg-background rounded-lg p-4 border">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-5 w-5 text-green-600" />
                                <span className="font-semibold">
                                    Fair Market Value
                                </span>
                            </div>
                            <div className="text-3xl font-bold text-green-600">
                                $
                                {Number(
                                    analysis.estimatedValue,
                                ).toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                Range: $
                                {Number(
                                    analysis.valueRangeLow,
                                ).toLocaleString()}{' '}
                                - $
                                {Number(
                                    analysis.valueRangeHigh,
                                ).toLocaleString()}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                {analysis.valuationRationale}
                            </p>
                        </div>

                        {/* Condition */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">Condition:</span>
                                <Badge
                                    variant={
                                        analysis.condition === 'excellent'
                                            ? 'default'
                                            : analysis.condition === 'good'
                                              ? 'secondary'
                                              : 'outline'
                                    }
                                >
                                    {analysis.condition}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {analysis.conditionNotes}
                            </p>
                        </div>

                        {/* Confidence Notes */}
                        {analysis.confidence !== 'high' && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {analysis.confidenceNotes}
                                </AlertDescription>
                            </Alert>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Review and adjust the values below before
                            submitting.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Item Details Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Item Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Item Name *</Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            defaultValue={analysis?.name}
                            placeholder="e.g., Oak Dining Table"
                        />
                        {state.errors?.name && (
                            <p className="text-sm text-destructive">
                                {state.errors.name[0]}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select
                                name="category"
                                required
                                defaultValue={analysis?.dbCategory}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem
                                            key={cat.value}
                                            value={cat.value}
                                        >
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="condition">Condition *</Label>
                            <Select
                                name="condition"
                                required
                                defaultValue={analysis?.condition}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CONDITIONS.map((cond) => (
                                        <SelectItem
                                            key={cond.value}
                                            value={cond.value}
                                        >
                                            {cond.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="estimatedValue">
                                Estimated Value
                            </Label>
                            <Input
                                id="estimatedValue"
                                name="estimatedValue"
                                type="text"
                                defaultValue={analysis?.estimatedValue}
                                placeholder="e.g., 150.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="valueRangeLow">Value Low</Label>
                            <Input
                                id="valueRangeLow"
                                name="valueRangeLow"
                                type="text"
                                defaultValue={analysis?.valueRangeLow}
                                placeholder="e.g., 100.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="valueRangeHigh">Value High</Label>
                            <Input
                                id="valueRangeHigh"
                                name="valueRangeHigh"
                                type="text"
                                defaultValue={analysis?.valueRangeHigh}
                                placeholder="e.g., 200.00"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            defaultValue={analysis?.description}
                            placeholder="Describe the item, including any notable features, damage, or history"
                            rows={3}
                        />
                    </div>

                    {/* Hidden AI metadata */}
                    {analysis && (
                        <>
                            <input
                                type="hidden"
                                name="aiConfidence"
                                value={analysis.confidence}
                            />
                            <input
                                type="hidden"
                                name="aiSuggested"
                                value="true"
                            />
                            <input
                                type="hidden"
                                name="aiBrand"
                                value={analysis.brand || ''}
                            />
                            <input
                                type="hidden"
                                name="aiModel"
                                value={analysis.model || ''}
                            />
                            <input
                                type="hidden"
                                name="aiEra"
                                value={analysis.era || ''}
                            />
                            <input
                                type="hidden"
                                name="aiMaterials"
                                value={analysis.materials.join(', ')}
                            />
                            <input
                                type="hidden"
                                name="aiValuationRationale"
                                value={analysis.valuationRationale}
                            />
                            <input
                                type="hidden"
                                name="aiConditionNotes"
                                value={analysis.conditionNotes}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Contact Info Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Contact Information (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Provide your contact info if you&apos;d like to be
                        notified about this submission.
                    </p>

                    <div className="space-y-2">
                        <Label htmlFor="submitterName">Name</Label>
                        <Input
                            id="submitterName"
                            name="submitterName"
                            placeholder="Your name"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="submitterEmail">Email</Label>
                            <Input
                                id="submitterEmail"
                                name="submitterEmail"
                                type="email"
                                placeholder="email@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="submitterPhone">Phone</Label>
                            <Input
                                id="submitterPhone"
                                name="submitterPhone"
                                type="tel"
                                placeholder="(555) 555-5555"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {state.error && (
                <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                    </>
                ) : (
                    'Submit for Review'
                )}
            </Button>
        </form>
    )
}
