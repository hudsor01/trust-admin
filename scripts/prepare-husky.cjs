#!/usr/bin/env node
/* eslint-env node */

const normalize = value =>
	value === undefined ? undefined : String(value).toLowerCase()

const shouldSkip = () => {
	const husky = normalize(process.env.HUSKY)
	if (husky === '0' || husky === 'false') {
		return true
	}

	const skipInstall = normalize(process.env.HUSKY_SKIP_INSTALL)
	if (skipInstall === '1' || skipInstall === 'true') {
		return true
	}

	// Skip in CI/production environments
	const isCI = process.env.CI === 'true' || process.env.CI === '1'
	const isVercel = process.env.VERCEL === '1'
	const isProduction = process.env.NODE_ENV === 'production'

	return isCI || isVercel || isProduction
}

let logger
;(async () => {
	const { createLogger } = await import('@repo/shared/lib/frontend-logger')
	logger = createLogger({ component: 'PrepareHuskyScript' })

	if (shouldSkip()) {
		logger.info('Skipping husky install: disabled via environment variable.')
		process.exit(0)
	}

	try {
		const huskyModule = require('husky')
		const husky =
			typeof huskyModule === 'function' ? huskyModule : huskyModule?.default

		if (typeof husky === 'function') {
			husky()
		} else if (typeof huskyModule?.install === 'function') {
			huskyModule.install()
		} else {
			logger.warn('Skipping husky install: no callable install entry found.')
		}
	} catch (error) {
		if (error && error.code === 'MODULE_NOT_FOUND') {
			logger.info(
				'Skipping husky install: dependency not present (likely production install).'
			)
			process.exit(0)
		}

		logger.error('Failed to run husky install', {
			metadata: { error: error?.message ?? String(error) }
		})
		process.exit(1)
	}
})().catch(error => {
	if (logger) {
		logger.error('Unexpected prepare-husky failure', {
			metadata: { error: error?.message ?? String(error) }
		})
	}
	process.exit(1)
})
