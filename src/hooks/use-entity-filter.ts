'use client'
import { parseAsString, useQueryState } from 'nuqs'

export function useEntityFilter() {
    return useQueryState('entity', parseAsString.withDefault(''))
}
