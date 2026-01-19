'use client'

import { CheckCircle2, Loader2, Sparkles, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useActionState, useCallback, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
    estimatedValue: string
    condition: 'excellent' | 'good' | 'fair' | 'poor'
    description: string
    confidence: 'high' | 'medium' | 'low'
}

export function InventoryForm() {
    const [state, formAction, isPending] = useActionState<
        InventoryFormState,
        FormData
    >(submitInventoryItem, { success: false })

    const [photos, setPhotos] = useState<File[]>([])
    const [photoPaths, setPhotoPaths] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

    const handlePhotoSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || [])
            if (files.length + photos.length > 5) {
                alert('Maximum 5 photos allowed')
                return
            }
            setPhotos((prev) => [...prev, ...files])
        },
        [photos.length],
    )

    const removePhoto = useCallback((index: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index))
        setPhotoPaths((prev) => prev.filter((_, i) => i !== index))
    }, [])

    const uploadPhotos = async () => {
        if (photos.length === 0) return

        setUploading(true)
        try {
            const formData = new FormData()
            photos.forEach((photo) => formData.append('photos', photo))

            const res = await fetch('/api/inventory/upload', {
                method: 'POST',
                body: formData,
            })
            const data = await res.json()

            if (data.success) {
                setPhotoPaths(data.paths)
            } else {
                alert(data.error || 'Upload failed')
            }
        } catch {
            alert('Upload failed')
        } finally {
            setUploading(false)
        }
    }

    const analyzePhotos = async () => {
        if (photos.length === 0) return

        setAnalyzing(true)
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
                alert(data.error || 'Analysis failed')
            }
        } catch {
            alert('Analysis failed')
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
                        Photos (Optional)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                    {photos.length > 0 && (
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={uploadPhotos}
                                disabled={uploading || photoPaths.length > 0}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : photoPaths.length > 0 ? (
                                    'Uploaded'
                                ) : (
                                    'Upload Photos'
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={analyzePhotos}
                                disabled={analyzing || !photoPaths.length}
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        AI Suggest
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Hidden inputs for photo paths */}
                    {photoPaths.map((path, i) => (
                        <input
                            key={i}
                            type="hidden"
                            name={`photoPath${i + 1}`}
                            value={path}
                        />
                    ))}
                </CardContent>
            </Card>

            {/* Item Details Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Item Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {analysis && (
                        <Alert>
                            <Sparkles className="h-4 w-4" />
                            <AlertDescription>
                                AI suggested values below (confidence:{' '}
                                {analysis.confidence}). Please review and adjust
                                as needed.
                            </AlertDescription>
                        </Alert>
                    )}

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

                    <div className="space-y-2">
                        <Label htmlFor="estimatedValue">Estimated Value</Label>
                        <Input
                            id="estimatedValue"
                            name="estimatedValue"
                            type="text"
                            defaultValue={analysis?.estimatedValue?.replace(
                                /[^0-9.]/g,
                                '',
                            )}
                            placeholder="e.g., 150.00"
                        />
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
                    'Submit Item'
                )}
            </Button>
        </form>
    )
}
