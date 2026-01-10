import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ASSET_TYPES } from "@/lib/public-form-config"

interface AssetTypeSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function AssetTypeSelector({ value, onChange }: AssetTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="asset-type">What would you like to submit? *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="asset-type">
          <SelectValue placeholder="Select an asset or liability type" />
        </SelectTrigger>
        <SelectContent>
          {ASSET_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              <div>
                <div className="font-medium">{type.label}</div>
                <div className="text-xs text-muted-foreground">{type.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
