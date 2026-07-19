// Single source of truth for academic-year dropdowns across the app.
// Every form that sends academicYear to the backend must pick from this list.
export const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027'] as const

export type AcademicYear = (typeof ACADEMIC_YEARS)[number]

export const DEFAULT_ACADEMIC_YEAR: AcademicYear = '2025-2026'
