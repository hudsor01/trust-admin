/**
 * Amortization calculations: payment splitting, monthly payment, payoff estimation,
 * and loan position analysis. All money values are strings for DB compatibility.
 */

export interface PaymentSplitResult {
    /** May be negative if payment < interest */
    principal: string
    interest: string
    escrow: string
    newBalance: string
}

export interface PayoffEstimate {
    monthsRemaining: number
    payoffDate: string
    totalInterest: string
}

export interface LoanPosition {
    paymentsMade: number
    paymentsRemaining: number
    principalPaid: string
    interestPaid: string
}

/**
 * Split a payment into principal, interest, and escrow.
 * Interest = Balance x (AnnualRate / 12); Principal = Payment - Interest - Escrow.
 */
export function calculatePaymentSplit(
    currentBalance: string,
    annualRate: string,
    paymentAmount: string,
    escrowAmount?: string,
): PaymentSplitResult | null {
    const balance = parseFloat(currentBalance)
    const rate = parseFloat(annualRate)
    const payment = parseFloat(paymentAmount)
    const escrow = escrowAmount ? parseFloat(escrowAmount) : 0

    if (
        Number.isNaN(balance) ||
        Number.isNaN(rate) ||
        Number.isNaN(payment) ||
        balance < 0 ||
        rate < 0 ||
        payment <= 0
    ) {
        return null
    }

    const monthlyRate = rate / 12
    const interestDue = balance * monthlyRate
    const interestRounded = Math.round(interestDue * 100) / 100
    const principalPaid = payment - interestRounded - escrow
    const principalRounded = Math.round(principalPaid * 100) / 100
    const newBalance = balance - principalRounded
    const newBalanceRounded = Math.round(newBalance * 100) / 100

    return {
        principal: principalRounded.toFixed(2),
        interest: interestRounded.toFixed(2),
        escrow: escrow.toFixed(2),
        newBalance: newBalanceRounded.toFixed(2),
    }
}

/**
 * Estimate payoff date. Returns null if payment does not exceed interest
 * (loan can never be paid off). Formula: n = -log(1 - Br/M) / log(1+r)
 */
export function estimatePayoffDate(
    balance: string,
    annualRate: string,
    monthlyPayment: string,
    escrowMonthly?: string,
    startDate?: string,
): PayoffEstimate | null {
    const balanceNum = parseFloat(balance)
    const rate = parseFloat(annualRate)
    const payment = parseFloat(monthlyPayment)
    const escrow = escrowMonthly ? parseFloat(escrowMonthly) : 0

    if (balanceNum <= 0) {
        const today = startDate ?? new Date().toISOString().split('T')[0] ?? ''
        return {
            monthsRemaining: 0,
            payoffDate: today,
            totalInterest: '0.00',
        }
    }

    // Escrow is set aside; only the remainder goes toward P&I
    const effectivePayment = payment - escrow

    if (rate === 0) {
        const monthsRemaining = Math.ceil(balanceNum / effectivePayment)
        const start = startDate ? new Date(startDate) : new Date()
        const payoffDate = new Date(start)
        payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining)
        const payoffDateStr = payoffDate.toISOString().split('T')[0] ?? ''

        return {
            monthsRemaining,
            payoffDate: payoffDateStr,
            totalInterest: '0.00',
        }
    }

    const monthlyRate = rate / 12
    const interestDue = balanceNum * monthlyRate

    if (effectivePayment <= interestDue) {
        return null
    }

    const n =
        -Math.log(1 - (balanceNum * monthlyRate) / effectivePayment) /
        Math.log(1 + monthlyRate)

    const monthsRemaining = Math.ceil(n)

    const start = startDate ? new Date(startDate) : new Date()
    const payoffDate = new Date(start)
    payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining)
    const payoffDateStr = payoffDate.toISOString().split('T')[0] ?? ''

    const totalPayments = monthsRemaining * effectivePayment
    const totalInterest = totalPayments - balanceNum

    return {
        monthsRemaining,
        payoffDate: payoffDateStr,
        totalInterest: Math.max(0, totalInterest).toFixed(2),
    }
}

/** Monthly payment via standard amortization: M = P[r(1+r)^n] / [(1+r)^n - 1]. */
export function calculateMonthlyPayment(
    principal: string,
    annualRate: string,
    termMonths: number,
): string | null {
    const principalNum = parseFloat(principal)
    const rate = parseFloat(annualRate)

    if (termMonths <= 0) {
        return null
    }

    if (principalNum === 0) {
        return '0.00'
    }

    if (rate === 0) {
        const payment = principalNum / termMonths
        return payment.toFixed(2)
    }

    const monthlyRate = rate / 12
    const n = termMonths
    const numerator = monthlyRate * (1 + monthlyRate) ** n
    const denominator = (1 + monthlyRate) ** n - 1
    const payment = principalNum * (numerator / denominator)

    return payment.toFixed(2)
}

/** Estimate current loan position (payments made/remaining, P&I paid to date). */
export function getCurrentLoanPosition(
    originalAmount: string,
    annualRate: string,
    termMonths: number,
    startDate: string,
    currentBalance: string,
): LoanPosition | null {
    const originalNum = parseFloat(originalAmount)
    const rate = parseFloat(annualRate)
    const currentNum = parseFloat(currentBalance)

    const monthlyPayment = calculateMonthlyPayment(
        originalAmount,
        annualRate,
        termMonths,
    )

    if (!monthlyPayment) {
        return null
    }

    const paymentNum = parseFloat(monthlyPayment)
    const principalPaid = originalNum - currentNum

    const start = new Date(startDate)
    const now = new Date()
    const monthsElapsed = Math.max(
        0,
        (now.getFullYear() - start.getFullYear()) * 12 +
            (now.getMonth() - start.getMonth()),
    )

    if (currentNum <= 0) {
        // Simulate full amortization to calculate total interest paid
        let totalInterest = 0
        let balance = originalNum
        const monthlyRate = rate / 12

        for (let i = 0; i < termMonths && balance > 0; i++) {
            const interest = balance * monthlyRate
            totalInterest += interest
            const principal = Math.min(paymentNum - interest, balance)
            balance -= principal
        }

        return {
            paymentsMade: termMonths,
            paymentsRemaining: 0,
            principalPaid: originalNum.toFixed(2),
            interestPaid: totalInterest.toFixed(2),
        }
    }

    if (rate === 0) {
        const paymentsMade = Math.round(principalPaid / paymentNum)
        const paymentsRemaining = Math.ceil(currentNum / paymentNum)

        return {
            paymentsMade,
            paymentsRemaining,
            principalPaid: principalPaid.toFixed(2),
            interestPaid: '0.00',
        }
    }

    // Simulate payments from startDate for accurate interest calculation
    let balance = originalNum
    let totalInterest = 0
    let paymentsMade = 0
    const monthlyRate = rate / 12

    // Handles both on-schedule and ahead-of-schedule scenarios
    const maxPaymentsFromTime = Math.min(monthsElapsed, termMonths)

    while (balance > currentNum && paymentsMade < maxPaymentsFromTime) {
        const interest = balance * monthlyRate
        totalInterest += interest
        const principal = paymentNum - interest
        balance -= principal
        paymentsMade++
    }

    // Extra payments: continue simulating to reach current balance
    while (balance > currentNum && paymentsMade < termMonths) {
        const interest = balance * monthlyRate
        totalInterest += interest
        const principal = paymentNum - interest
        balance -= principal
        paymentsMade++
    }

    const payoff = estimatePayoffDate(
        currentBalance,
        annualRate,
        monthlyPayment,
    )

    const paymentsRemaining = payoff
        ? payoff.monthsRemaining
        : termMonths - paymentsMade

    return {
        paymentsMade,
        paymentsRemaining,
        principalPaid: principalPaid.toFixed(2),
        interestPaid: totalInterest.toFixed(2),
    }
}
