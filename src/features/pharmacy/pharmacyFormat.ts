// The classic Pharmacy app prints amounts as "K85.00" (kwacha, 2 decimals, no space); -0 prints as 0.
export const kwacha = (v: number | string | null | undefined) => `K${(Math.round(Number(v ?? 0) * 100) / 100 || 0).toFixed(2)}`
