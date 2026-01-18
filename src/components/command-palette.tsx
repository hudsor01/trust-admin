'use client'

import {
    Banknote,
    Building,
    Calculator,
    Car,
    ClipboardList,
    FileText,
    Home,
    LayoutDashboard,
    Settings,
    UserCog,
    Users,
    Wallet,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import { trpc } from '@/lib/trpc'

interface NavigationItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    keywords?: string[]
}

const navigationItems: NavigationItem[] = [
    // Main
    {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        keywords: ['home', 'overview', 'main'],
    },
    // Administration
    {
        name: 'Trustees',
        href: '/trustees',
        icon: UserCog,
        keywords: ['admin', 'trustee', 'fiduciary'],
    },
    {
        name: 'Beneficiaries',
        href: '/beneficiaries',
        icon: Users,
        keywords: ['people', 'heirs', 'recipients'],
    },
    {
        name: 'Contacts',
        href: '/contacts',
        icon: Users,
        keywords: ['people', 'attorney', 'accountant', 'advisor'],
    },
    // Distributions
    {
        name: 'Review Queue',
        href: '/hems-queue',
        icon: ClipboardList,
        keywords: ['hems', 'pending', 'approval', 'requests'],
    },
    {
        name: 'Distribution History',
        href: '/hems',
        icon: Banknote,
        keywords: ['hems', 'distributions', 'payments', 'history'],
    },
    {
        name: 'Specific Bequests',
        href: '/bequests',
        icon: FileText,
        keywords: ['gifts', 'bequests', 'items'],
    },
    // Financial
    {
        name: 'Trust Accounting',
        href: '/accounting',
        icon: Calculator,
        keywords: ['ledger', 'income', 'expense', 'entries'],
    },
    {
        name: 'Properties',
        href: '/properties',
        icon: Home,
        keywords: ['real estate', 'homestead', 'rental', 'land'],
    },
    {
        name: 'Accounts',
        href: '/accounts',
        icon: Building,
        keywords: ['bank', 'investment', 'brokerage', 'savings'],
    },
    {
        name: 'Vehicles',
        href: '/vehicles',
        icon: Car,
        keywords: ['cars', 'automobiles', 'transport'],
    },
    {
        name: 'Liabilities',
        href: '/liabilities',
        icon: Wallet,
        keywords: ['debts', 'loans', 'mortgage', 'payments'],
    },
    {
        name: 'Activity Log',
        href: '/activity-log',
        icon: ClipboardList,
        keywords: ['audit', 'history', 'changes', 'log'],
    },
    // Settings
    {
        name: 'Settings',
        href: '/settings',
        icon: Settings,
        keywords: ['preferences', 'config', 'options'],
    },
]

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    // Fetch entities for quick-switch
    const { data: entities = [] } = trpc.entity.list.useQuery()

    // Keyboard shortcut: Cmd+K or Ctrl+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((prev) => !prev)
            }
        }

        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    const runCommand = useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Navigation">
                    {navigationItems.map((item) => (
                        <CommandItem
                            key={item.href}
                            value={`${item.name} ${item.keywords?.join(' ') ?? ''}`}
                            onSelect={() =>
                                runCommand(() => router.push(item.href))
                            }
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.name}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>

                {entities.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Switch Entity">
                            {entities.map((entity) => (
                                <CommandItem
                                    key={entity.id}
                                    value={`entity ${entity.name}`}
                                    onSelect={() =>
                                        runCommand(() => {
                                            // Update URL with entity parameter
                                            const url = new URL(
                                                window.location.href,
                                            )
                                            url.searchParams.set(
                                                'entity',
                                                entity.id,
                                            )
                                            router.push(
                                                url.pathname + url.search,
                                            )
                                        })
                                    }
                                >
                                    <Building className="mr-2 h-4 w-4" />
                                    <span>{entity.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    )
}
