'use client'

import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AddBeneficiaryDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    firstName: string
    lastName: string
    relationship: string
    email: string
    sharePercent: string
    isPending: boolean
    onFirstNameChange: (value: string) => void
    onLastNameChange: (value: string) => void
    onRelationshipChange: (value: string) => void
    onEmailChange: (value: string) => void
    onSharePercentChange: (value: string) => void
    onSubmit: () => void
}

export function AddBeneficiaryDialog({
    open,
    onOpenChange,
    firstName,
    lastName,
    relationship,
    email,
    sharePercent,
    isPending,
    onFirstNameChange,
    onLastNameChange,
    onRelationshipChange,
    onEmailChange,
    onSharePercentChange,
    onSubmit,
}: AddBeneficiaryDialogProps) {
    const submitDisabled =
        !firstName.trim() ||
        !lastName.trim() ||
        !relationship.trim() ||
        isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Add Beneficiary
                    </DialogTitle>
                    <DialogDescription>
                        Create a beneficiary record. A portal account is
                        separate — link one later from the Users page.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="addBenFirstName">First Name</Label>
                            <Input
                                id="addBenFirstName"
                                value={firstName}
                                onChange={(e) =>
                                    onFirstNameChange(e.target.value)
                                }
                                placeholder="First name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="addBenLastName">Last Name</Label>
                            <Input
                                id="addBenLastName"
                                value={lastName}
                                onChange={(e) =>
                                    onLastNameChange(e.target.value)
                                }
                                placeholder="Last name"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="addBenRelationship">Relationship</Label>
                        <Input
                            id="addBenRelationship"
                            value={relationship}
                            onChange={(e) =>
                                onRelationshipChange(e.target.value)
                            }
                            placeholder="Child, Spouse, etc."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="addBenEmail">Email (optional)</Label>
                        <Input
                            id="addBenEmail"
                            type="email"
                            value={email}
                            onChange={(e) => onEmailChange(e.target.value)}
                            placeholder="user@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="addBenShare">Share % (optional)</Label>
                        <Input
                            id="addBenShare"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            max="100"
                            value={sharePercent}
                            onChange={(e) =>
                                onSharePercentChange(e.target.value)
                            }
                            placeholder="0.00"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={onSubmit} disabled={submitDisabled}>
                            {isPending ? 'Adding...' : 'Add Beneficiary'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
