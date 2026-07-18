import { config } from 'dotenv'
config({ path: '.env.test' })

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// happy-dom + component tests: without explicit cleanup, DOM from one test
// leaks into the next (vitest globals are off, so @testing-library/react's
// auto-cleanup hook never registers).
afterEach(() => cleanup())
