// Import our submodules and re-export them using module names
import * as Combatants from './combatants'
import * as Encounters from './encounters'

export {
  Combatants,
  Encounters
}

// Utility function to get a random int within a range
export function getRandomIntBetween (min: number, max: number) {
  return Math.floor((Math.random() * (max - min + 1)) + min)
}
