const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const date = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

export function formatMoney(value: string): string {
  return currency.format(Number(value))
}

export function formatDate(value: string): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? value : date.format(parsed)
}

const categoryLabels: Record<string, string> = {
  FUEL: 'Combustível',
  FEED_AND_SUPPLEMENT: 'Ração e suplemento',
  FERTILIZER_AND_SEED: 'Adubo e semente',
  PESTICIDE: 'Defensivos',
  ANIMAL_HEALTH: 'Saúde animal',
  PASTURE_AND_CROP_WORK: 'Pasto e lavoura',
  MACHINERY_AND_MAINTENANCE: 'Máquinas',
  LABOR: 'Mão de obra',
  OTHER: 'Outros',
}

export function categoryLabel(value: string): string {
  return categoryLabels[value] ?? value.replaceAll('_', ' ').toLocaleLowerCase('pt-BR')
}

export const expenseCategories = Object.entries(categoryLabels)
