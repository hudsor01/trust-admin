export default function FormsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-muted/30">
            <header className="border-b bg-background">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="text-xl font-semibold">
                        Hudson Living Trust
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Estate Inventory Submission
                    </p>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
    )
}
