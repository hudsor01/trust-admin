import { Home, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center space-y-6 max-w-md px-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Page not found
                    </h1>
                    <p className="text-muted-foreground">
                        The page you're looking for doesn't exist or has been
                        moved.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/">
                        <Home className="mr-2 h-4 w-4" />
                        Go home
                    </Link>
                </Button>
            </div>
        </div>
    )
}
