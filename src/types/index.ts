export * from './combatants'
export * from './encounters'

// Utility function to get a random int within a range
export function RandomIntBetween (min: number, max: number) {
  return Math.floor((Math.random() * (max - min + 1)) + min)
}
