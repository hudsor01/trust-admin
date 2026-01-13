import { Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface QuantityInputProps {
  value: number
  onChange: (value: number) => void
}

export function QuantityInput({ value, onChange }: QuantityInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="quantity">Quantity</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                If you have multiple identical items (e.g., 12 forks), enter the quantity here.
                We'll create separate records for each item.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        id="quantity"
        type="number"
        min="1"
        max="100"
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
      />
      <p className="text-xs text-muted-foreground">
        Create {value} {value === 1 ? "record" : "records"} with this information
      </p>
    </div>
  )
}
