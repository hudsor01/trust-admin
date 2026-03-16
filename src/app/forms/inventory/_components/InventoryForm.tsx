'use client'

import {
    AlertCircle,
    Camera,
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
    confidenceScore: number
}

type ConsensusInfo = {
    status: 'agreed' | 'review' | 'divergent'
    primary: AnalysisResult
    secondary: AnalysisResult
    divergencePercent: number
}

/** Client-side resize (max 2048px) + JPEG compression to stay under Vercel's 4.5MB body limit. */
async function compressImageClientSide(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new globalThis.Image()
        img.onload = () => {
            const maxDim = 2048
            let { width, height } = img

            if (width > maxDim || height > maxDim) {
                const scale = maxDim / Math.max(width, height)
                width = Math.round(width * scale)
                height = Math.round(height * scale)
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Canvas context unavailable'))
                return
            }
            ctx.drawImage(img, 0, 0, width, height)

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
            const base64 = dataUrl.split(',')[1] ?? ''
            resolve(base64)
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = URL.createObjectURL(file)
    })
}

export function InventoryForm() {
    const [state, formAction, isPending] = useActionState<
        InventoryFormState,
        FormData
    >(submitInventoryItem, { success: false })

    const [photos, setPhotos] = useState<File[]>([])
    const [photoUrls, setPhotoUrls] = useState<string[]>([])
    const [analyzing, setAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
    const [analysisError, setAnalysisError] = useState<string | null>(null)
    const [consensus, setConsensus] = useState<ConsensusInfo | null>(null)
    const [validationWarnings, setValidationWarnings] = useState<string[]>([])

    // AI analysis pre-fills these; user can override before submit
    const [formValues, setFormValues] = useState({
        name: '',
        category: '',
        condition: '',
        estimatedValue: '',
        valueRangeLow: '',
        valueRangeHigh: '',
        description: '',
    })

    const handlePhotoSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || [])
            if (files.length + photos.length > 5) {
                alert('Maximum 5 photos allowed')
                return
            }
            setPhotos((prev) => [...prev, ...files])
            setAnalysis(null)
            setAnalysisError(null)
            setConsensus(null)
            setValidationWarnings([])
        },
        [photos.length],
    )

    const removePhoto = useCallback((index: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index))
        setPhotoUrls([])
        setAnalysis(null)
        setAnalysisError(null)
        setConsensus(null)
        setValidationWarnings([])
    }, [])

    const analyzePhotos = async () => {
        if (photos.length === 0) return

        setAnalyzing(true)
        setAnalysisError(null)

        try {
            const images = await Promise.all(
                photos.map(async (photo) => {
                    const base64 = await compressImageClientSide(photo)
                    return { base64, mimeType: 'image/jpeg' }
                }),
            )

            const res = await fetch('/api/inventory/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images }),
            })

            if (!res.ok) {
                let errorMsg = `Analysis failed (${res.status})`
                try {
                    const errData = await res.json()
                    if (errData.error) errorMsg = errData.error
                } catch {
                    if (res.status === 504)
                        errorMsg =
                            'Analysis timed out - try with fewer or smaller photos'
                    else if (res.status === 413)
                        errorMsg =
                            'Photos too large - try with fewer or smaller photos'
                }
                setAnalysisError(errorMsg)
                return
            }

            const data = await res.json()
            if (data.success) {
                setAnalysis(data.data)
                if (data.photoUrls && data.photoUrls.length > 0) {
                    setPhotoUrls(data.photoUrls)
                }
                if (data.consensus) {
                    setConsensus(data.consensus)
                }
                if (data.validationWarnings) {
                    setValidationWarnings(data.validationWarnings)
                }
                setFormValues({
                    name: data.data.name || '',
                    category: data.data.dbCategory || '',
                    condition: data.data.condition || '',
                    estimatedValue: data.data.estimatedValue || '',
                    valueRangeLow: data.data.valueRangeLow || '',
                    valueRangeHigh: data.data.valueRangeHigh || '',
                    description: data.data.description || '',
                })
            } else {
                setAnalysisError(data.error || 'Analysis failed')
            }
        } catch {
            setAnalysisError(
                'Failed to connect to analysis service. Check your network connection and try again.',
            )
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                onChange={handlePhotoSelect}
                                className="hidden"
                                id="camera-input"
                            />
                            <label
                                htmlFor="camera-input"
                                className="cursor-pointer"
                            >
                                <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Take Photo
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Use device camera
                                </p>
                            </label>
                        </div>

                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                multiple
                                onChange={handlePhotoSelect}
                                className="hidden"
                                id="photo-input"
                            />
                            <label
                                htmlFor="photo-input"
                                className="cursor-pointer"
                            >
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Upload Photos
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Select up to 5 images
                                </p>
                            </label>
                        </div>
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
                                    Analyzing with two AI models (2-4 min)...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Research & Value Item
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

            {analysis && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                AI Analysis
                            </span>
                            <div className="flex items-center gap-2">
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
                                {consensus && (
                                    <Badge
                                        variant={
                                            consensus.status === 'agreed'
                                                ? 'default'
                                                : consensus.status === 'review'
                                                  ? 'secondary'
                                                  : 'destructive'
                                        }
                                    >
                                        {consensus.status === 'agreed'
                                            ? 'Models Agree'
                                            : consensus.status === 'review'
                                              ? `Models Differ ${Math.round(consensus.divergencePercent)}%`
                                              : `Models Diverge ${Math.round(consensus.divergencePercent)}%`}
                                    </Badge>
                                )}
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg">
                                {analysis.name}
                            </h3>
                            <p className="text-muted-foreground">
                                {analysis.description}
                            </p>
                        </div>

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

                        {consensus && consensus.status !== 'agreed' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                        Model A (Opus)
                                    </p>
                                    <p className="text-lg font-bold">
                                        $
                                        {Number(
                                            consensus.primary.estimatedValue,
                                        ).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                                        {consensus.primary.valuationRationale}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                        Model B (Sonnet)
                                    </p>
                                    <p className="text-lg font-bold">
                                        $
                                        {Number(
                                            consensus.secondary.estimatedValue,
                                        ).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                                        {consensus.secondary.valuationRationale}
                                    </p>
                                </div>
                            </div>
                        )}

                        {validationWarnings.length > 0 && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Validation Warnings</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc pl-4 mt-1">
                                        {validationWarnings.map((w, i) => (
                                            <li key={i} className="text-sm">
                                                {w}
                                            </li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}

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
                            value={formValues.name}
                            onChange={(e) =>
                                setFormValues((v) => ({
                                    ...v,
                                    name: e.target.value,
                                }))
                            }
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
                                value={formValues.category}
                                onValueChange={(val) =>
                                    setFormValues((v) => ({
                                        ...v,
                                        category: val,
                                    }))
                                }
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
                                value={formValues.condition}
                                onValueChange={(val) =>
                                    setFormValues((v) => ({
                                        ...v,
                                        condition: val,
                                    }))
                                }
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
                                value={formValues.estimatedValue}
                                onChange={(e) =>
                                    setFormValues((v) => ({
                                        ...v,
                                        estimatedValue: e.target.value,
                                    }))
                                }
                                placeholder="e.g., 150.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="valueRangeLow">Value Low</Label>
                            <Input
                                id="valueRangeLow"
                                name="valueRangeLow"
                                type="text"
                                value={formValues.valueRangeLow}
                                onChange={(e) =>
                                    setFormValues((v) => ({
                                        ...v,
                                        valueRangeLow: e.target.value,
                                    }))
                                }
                                placeholder="e.g., 100.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="valueRangeHigh">Value High</Label>
                            <Input
                                id="valueRangeHigh"
                                name="valueRangeHigh"
                                type="text"
                                value={formValues.valueRangeHigh}
                                onChange={(e) =>
                                    setFormValues((v) => ({
                                        ...v,
                                        valueRangeHigh: e.target.value,
                                    }))
                                }
                                placeholder="e.g., 200.00"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            value={formValues.description}
                            onChange={(e) =>
                                setFormValues((v) => ({
                                    ...v,
                                    description: e.target.value,
                                }))
                            }
                            placeholder="Describe the item, including any notable features, damage, or history"
                            rows={3}
                        />
                    </div>

                    {/* AI metadata passed to server action via hidden fields */}
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

                    {/* Uploadthing URLs from analysis step, forwarded to server action */}
                    {photoUrls.map((url, index) => (
                        <input
                            key={`photo-${index}`}
                            type="hidden"
                            name={`photoPath${index + 1}`}
                            value={url}
                        />
                    ))}
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
                    'Submit'
                )}
            </Button>
        </form>
    )
}
