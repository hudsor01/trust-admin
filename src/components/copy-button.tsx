'use client'

/**
 * Copy Button Component
 *
 * Button that copies text to clipboard with visual feedback.
 */

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface CopyButtonProps {
    value: string
    className?: string
}

export function CopyButton({ value, className }: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={className || 'h-6 w-6'}
                        onClick={handleCopy}
                    >
                        {copied ? (
                            <Check className="h-3 w-3 text-success" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{copied ? 'Copied!' : 'Copy'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
