// Import our submodules and re-export them using module names
import * as Attributes from './attributes'
import * as Combatants from './combatants'
import * as Actions from './actions'
import * as Encounters from './encounters'

export {
  Attributes,
  Combatants,
  Actions,
  Encounters
}

// Utility function to get a random int within a range
export function getRandomIntBetween (min: number, max: number) {
  return Math.floor((Math.random() * (max - min + 1)) + min)
}
