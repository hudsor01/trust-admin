/**
 * Amortization Calculation Utilities
 *
 * Provides precise loan calculations for:
 * - Payment splitting (principal/interest/escrow)
 * - Monthly payment calculation from loan terms
 * - Payoff date estimation
 * - Current loan position analysis
 *
 * All money values use string inputs/outputs for database compatibility.
 * Uses dinero.js for precision-safe money math.
 *
 * @example
 * // Split a mortgage payment
 * const split = calculatePaymentSplit("250000.00", "0.065", "1800.00", "350.00")
 * // { principal: "95.83", interest: "1354.17", escrow: "350.00", newBalance: "249904.17" }
 *
 * @example
 * // Calculate monthly payment for a loan
 * const payment = calculateMonthlyPayment("250000.00", "0.065", 360)
 * // "1580.17"
 */

// Note: Using native JavaScript math for amortization calculations
// dinero.js is available via ./money if needed for future enhancements

/**
 * Result of splitting a payment into components
 */
export interface PaymentSplitResult {
    /** Amount applied to principal (may be negative if payment < interest) */
    principal: string
    /** Interest portion of payment */
    interest: string
    /** Escrow portion (taxes/insurance) */
    escrow: string
    /** New loan balance after payment */
    newBalance: string
}

/**
 * Payoff estimation result
 */
export interface PayoffEstimate {
    /** Number of months until loan is paid off */
    monthsRemaining: number
    /** Projected payoff date (ISO format YYYY-MM-DD) */
    payoffDate: string
    /** Total interest that will be paid over remaining life */
    totalInterest: string
}

/**
 * Current position in loan lifecycle
 */
export interface LoanPosition {
    /** Estimated number of payments made */
    paymentsMade: number
    /** Number of payments remaining */
    paymentsRemaining: number
    /** Total principal paid to date */
    principalPaid: string
    /** Total interest paid to date */
    interestPaid: string
}

/**
 * Split a loan payment into principal, interest, and escrow components.
 *
 * Formula: Interest = Balance × (AnnualRate / 12)
 *          Principal = Payment - Interest - Escrow
 *
 * @param currentBalance - Current loan balance (e.g., "250000.00")
 * @param annualRate - Annual interest rate as decimal (e.g., "0.065" for 6.5%)
 * @param paymentAmount - Total payment amount (e.g., "1800.00")
 * @param escrowAmount - Optional escrow portion (e.g., "350.00")
 * @returns Payment split result, or null for invalid inputs
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

    // Calculate monthly interest
    const monthlyRate = rate / 12
    const interestDue = balance * monthlyRate

    // Round interest to cents
    const interestRounded = Math.round(interestDue * 100) / 100

    // Principal is what's left after interest and escrow
    const principalPaid = payment - interestRounded - escrow

    // Round principal to cents
    const principalRounded = Math.round(principalPaid * 100) / 100

    // Calculate new balance
    const newBalance = balance - principalRounded

    // Round new balance to cents
    const newBalanceRounded = Math.round(newBalance * 100) / 100

    return {
        principal: principalRounded.toFixed(2),
        interest: interestRounded.toFixed(2),
        escrow: escrow.toFixed(2),
        newBalance: newBalanceRounded.toFixed(2),
    }
}

/**
 * Estimate when a loan will be paid off.
 *
 * Formula: n = -log(1 - (Balance × r / Payment)) / log(1 + r)
 * where r = monthly rate, n = months remaining
 *
 * @param balance - Current loan balance
 * @param annualRate - Annual interest rate as decimal
 * @param monthlyPayment - Monthly payment amount
 * @param escrowMonthly - Optional monthly escrow amount (subtracted from payment for P&I)
 * @param startDate - Optional start date for payoff calculation (defaults to today)
 * @returns Payoff estimate, or null if loan can never be paid off
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

    // If balance is zero, already paid off
    if (balanceNum <= 0) {
        const today = startDate ?? new Date().toISOString().split('T')[0] ?? ''
        return {
            monthsRemaining: 0,
            payoffDate: today,
            totalInterest: '0.00',
        }
    }

    // Effective payment toward principal + interest (excludes escrow)
    const effectivePayment = payment - escrow

    // Handle zero interest rate (simple division)
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

    // If payment does not exceed interest, loan can never be paid off
    if (effectivePayment <= interestDue) {
        return null
    }

    // Calculate months remaining using amortization formula
    // n = -log(1 - (P * r / M)) / log(1 + r)
    // where P = principal, r = monthly rate, M = monthly payment
    const n =
        -Math.log(1 - (balanceNum * monthlyRate) / effectivePayment) /
        Math.log(1 + monthlyRate)

    const monthsRemaining = Math.ceil(n)

    // Calculate payoff date
    const start = startDate ? new Date(startDate) : new Date()
    const payoffDate = new Date(start)
    payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining)
    const payoffDateStr = payoffDate.toISOString().split('T')[0] ?? ''

    // Calculate total interest (total payments - principal)
    const totalPayments = monthsRemaining * effectivePayment
    const totalInterest = totalPayments - balanceNum

    return {
        monthsRemaining,
        payoffDate: payoffDateStr,
        totalInterest: Math.max(0, totalInterest).toFixed(2),
    }
}

/**
 * Calculate the monthly payment for a loan using standard amortization formula.
 *
 * Formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
 * where P = principal, r = monthly rate, n = term in months
 *
 * @param principal - Loan principal amount
 * @param annualRate - Annual interest rate as decimal
 * @param termMonths - Loan term in months
 * @returns Monthly payment amount, or null for invalid inputs
 */
export function calculateMonthlyPayment(
    principal: string,
    annualRate: string,
    termMonths: number,
): string | null {
    const principalNum = parseFloat(principal)
    const rate = parseFloat(annualRate)

    // Validate term
    if (termMonths <= 0) {
        return null
    }

    // Handle zero principal
    if (principalNum === 0) {
        return '0.00'
    }

    // Handle zero interest rate (simple division)
    if (rate === 0) {
        const payment = principalNum / termMonths
        return payment.toFixed(2)
    }

    // Standard amortization formula
    const monthlyRate = rate / 12
    const n = termMonths

    // M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const numerator = monthlyRate * (1 + monthlyRate) ** n
    const denominator = (1 + monthlyRate) ** n - 1
    const payment = principalNum * (numerator / denominator)

    return payment.toFixed(2)
}

/**
 * Analyze current position in a loan's lifecycle.
 *
 * Given original loan terms and current balance, estimates:
 * - How many payments have been made
 * - How many payments remain
 * - Total principal and interest paid to date
 *
 * @param originalAmount - Original loan amount
 * @param annualRate - Annual interest rate as decimal
 * @param termMonths - Original loan term in months
 * @param startDate - Loan start date (ISO format YYYY-MM-DD)
 * @param currentBalance - Current loan balance
 * @returns Loan position analysis
 */
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

    // Calculate what the monthly payment should be
    const monthlyPayment = calculateMonthlyPayment(
        originalAmount,
        annualRate,
        termMonths,
    )

    if (!monthlyPayment) {
        return null
    }

    const paymentNum = parseFloat(monthlyPayment)

    // Principal paid is simply original - current
    const principalPaid = originalNum - currentNum

    // Calculate months elapsed since start date
    const start = new Date(startDate)
    const now = new Date()
    const monthsElapsed = Math.max(
        0,
        (now.getFullYear() - start.getFullYear()) * 12 +
            (now.getMonth() - start.getMonth()),
    )

    // If fully paid
    if (currentNum <= 0) {
        // Simulate full amortization to get total interest
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

    // Handle zero interest rate
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

    // Simulate payments based on time elapsed from startDate
    // This gives us more accurate interest paid calculation
    let balance = originalNum
    let totalInterest = 0
    let paymentsMade = 0
    const monthlyRate = rate / 12

    // Simulate using the minimum of: time elapsed OR payments to reach current balance
    // This handles both on-schedule and ahead-of-schedule scenarios
    const maxPaymentsFromTime = Math.min(monthsElapsed, termMonths)

    while (balance > currentNum && paymentsMade < maxPaymentsFromTime) {
        const interest = balance * monthlyRate
        totalInterest += interest
        const principal = paymentNum - interest
        balance -= principal
        paymentsMade++
    }

    // If balance dropped faster than time (extra payments), continue simulating
    // to accurately calculate how many payments it took to reach current balance
    while (balance > currentNum && paymentsMade < termMonths) {
        const interest = balance * monthlyRate
        totalInterest += interest
        const principal = paymentNum - interest
        balance -= principal
        paymentsMade++
    }

    // Estimate remaining payments from current balance
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
