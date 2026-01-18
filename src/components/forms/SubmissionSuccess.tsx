import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface SubmissionSuccessProps {
    itemsCreated: number
    itemType: string
    onSubmitAnother: () => void
}

export function SubmissionSuccess({
    itemsCreated,
    itemType,
    onSubmitAnother,
}: SubmissionSuccessProps) {
    return (
        <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">
                            Submission Successful
                        </h3>
                        <p className="text-muted-foreground mt-2">
                            {itemsCreated} {itemType}{' '}
                            {itemsCreated === 1 ? 'record' : 'records'}{' '}
                            submitted successfully
                        </p>
                    </div>
                    <div className="pt-4">
                        <Button onClick={onSubmitAnother}>
                            Submit Another Item
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
