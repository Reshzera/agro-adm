export type Farm = {
  id: string
  name: string | null
  totalAreaHa: string | null
  primaryActivity: string | null
  location: string | null
  mainCrops: string | null
  approximateAnimalCount: number | null
  agentContext: string | null
  latitude: string | null
  longitude: string | null
  onboardingCompleted: boolean
}
