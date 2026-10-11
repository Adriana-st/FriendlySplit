/** Converts a "YYYY-MM-DD" string (already validated by Zod) into a Date at UTC midnight. */
export const toDate = (isoDate: string): Date => 
    new Date(`${isoDate}T00:00:00.000Z`);