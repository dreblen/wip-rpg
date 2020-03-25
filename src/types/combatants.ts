import {
  ActionSelection,
  EncounterAction,
  EncounterActionType,
  EncounterActionAttack,
  EncounterActionResult
} from './encounters'

import EncounterActions from '@/types/actions.json'

// Basic character attribute
export class Attribute {
  value: number;
  name: string;

  constructor (name: string, value = 0) {
    this.name = name
    this.value = value
  }

  // Scales the attribute by the given factor and returns the level of change
  scale (factor: number): number {
    const first = this.value
    this.value = Math.floor(this.value * factor)

    return this.value - first
  }
}

// Standard list of character attributes
export interface AttributeList {
  [index: string]: Attribute;
  phy: Attribute; // physical
  mag: Attribute; // magic
  end: Attribute; // endurance
  agl: Attribute; // agility
  ldr: Attribute; // leadership
  lck: Attribute; // luck
}

// Same as AttributeList but with numerical values only
export interface AttributeValueList {
  [index: string]: number | undefined;
  phy?: number;
  mag?: number;
  end?: number;
  agl?: number;
  ldr?: number;
  lck?: number;
}

// Attribute short names
export type AttributeName = 'phy' | 'mag' | 'end' | 'agl' | 'ldr' | 'lck';

// Standard definitions of team affinity
export enum CombatantTeam {
  None,
  Party,
  Enemy,
}

// Character that can take part in a combat encounter
export class Combatant {
  id: number;

  attributes: AttributeList;
  team: CombatantTeam;
  name: string;

  actions: Array<EncounterAction>;

  isSimulated: boolean;

  level: number;
  xp: number;
  maxXP: number;

  hp: number;
  maxHP: number;
  mp: number;
  maxMP: number;

  protected constructor (name: string, attributes: AttributeList | AttributeValueList) {
    this.id = Math.random()

    this.level = 1
    this.xp = 0
    this.maxXP = 100

    this.hp = this.maxHP = 100
    this.mp = this.maxMP = 10

    this.name = name

    this.team = CombatantTeam.None
    this.isSimulated = true

    // Use the given attributes as is, or convert their values into attribute
    // objects if necessary
    if (typeof attributes.phy === 'object') {
      this.attributes = attributes as AttributeList
    } else {
      this.attributes = {
        phy: new Attribute('Physical', attributes.phy as number),
        mag: new Attribute('Magic', attributes.mag as number),
        end: new Attribute('Endurance', attributes.end as number),
        agl: new Attribute('Agility', attributes.agl as number),
        ldr: new Attribute('Leadership', attributes.ldr as number),
        lck: new Attribute('Luck', attributes.lck as number)
      }
    }

    // Add basic actions
    this.actions = EncounterActions as Array<EncounterAction>
  }

  public takeAction (action: EncounterAction, targets: Array<Combatant>, ignoreCost = false): Array<EncounterActionResult> {
    const results = []

    // Honor the cost of the action
    if (!ignoreCost && action.cost !== null) {
      this[action.cost.pool] -= action.cost.value
    }

    // Perform our action on all specified targets
    for (const target of targets) {
      switch (action.type as EncounterActionType) {
        case 'EncounterActionAttack': {
          const a: EncounterActionAttack = action as EncounterActionAttack
          // Roll for hit
          const hitRate = 0.95 // TODO: Should be based on equipment
          let roll = Math.random()
          if (roll > hitRate) {
            results.push(EncounterActionResult.Miss)
            continue
          }

          // Roll for dodge
          const dodgeRate = 0.05 // TODO: Should be based on equipment
          roll = Math.random()
          // - relative agility increases or decreases the roll
          const diff = this.attributes.agl.value - target.attributes.agl.value
          const maxChange = 1 - dodgeRate
          roll += (maxChange - (maxChange / (Math.abs(diff / 15) + 1))) * (diff / Math.abs(diff))
          if (roll < dodgeRate) {
            results.push(EncounterActionResult.Dodge)
            continue
          }

          // Roll for damage
          // - base damage is our primary attribute minus the target's defense
          let base = 5 * Math.max(1, this.attributes[a.affinities[0]].value - target.attributes.end.value)
          // - randomize the base damage slightly
          base *= Math.max(0.9, Math.min(1.1, Math.random() + 0.5))
          // - increase our base damage by attribute factors
          for (let i = 0; i < a.affinities.length; i++) {
            const f = (1 / (i + 1)) * this.attributes[a.affinities[i]].value
            base *= 1 + (f * 0.05)
          }
          target.hp = Math.max(0, target.hp - Math.ceil(base))

          results.push(EncounterActionResult.Success)
          break
        }
      }
    }

    return results
  }

  public getSelectedAction (combatants: Array<Combatant>): ActionSelection {
    // Select an action
    const actions = this.actions.filter((a) => {
      if (a.cost === null) {
        return true
      } else {
        return this[a.cost.pool] >= a.cost.value
      }
    })
    const action = actions[0] // XXX: improve

    // Select a target
    const opposingCombatants = combatants.filter(c => c.team !== this.team && c.hp > 0)

    return [action, [opposingCombatants[0]]]
  }

  public increaseAttribute (name: AttributeName, increase: number, sideEffectsOnly = false): void {
    // Make sure we have a valid increase
    if (increase < 1) {
      throw new Error('Increase must be a positive number')
    }

    // Increase the value itself, unless we've been told not to
    if (!sideEffectsOnly) {
      this.attributes[name].value += increase
    }

    // Handle any side effects of increasing this attribute
    switch (name) {
      case 'end':
        // Increase HP and MP
        for (let i = this.attributes[name].value - increase; i < this.attributes[name].value; i++) {
          this.maxHP += Math.max(5, Math.floor(i * 0.75))
          this.maxMP += Math.max(5, Math.floor(i * 0.75))
        }

        this.hp = this.maxHP
        this.mp = this.maxMP
        break
    }
  }

  scaleAttributes (factor: number): number {
    let totalDiff = 0

    for (const a in this.attributes) {
      const diff = this.attributes[a].scale(factor)

      // See if there are side effects to changing this attribute
      if (diff > 0) {
        this.increaseAttribute(a as AttributeName, diff, true)
      }

      totalDiff += diff
    }

    return totalDiff
  }
}

// Standard interface for defining enemy types
export interface EnemyCombatantType {
  name: string;
  attributes: AttributeList | AttributeValueList;
}

// Allows enemy types to be defined dynamically and still viewed as valid
export interface EnemyCombatantTypeList {
  [index: string]: EnemyCombatantType;
}

// Non-party combatants
export class EnemyCombatant extends Combatant {
  type: string;

  constructor (type: string, name: string, atLevel = 1, attributes: AttributeList | AttributeValueList) {
    super(name, attributes)
    this.type = type
    this.team = CombatantTeam.Enemy

    // Increase our stats according to the desired level
    if (atLevel > 1) {
      this.levelUp(atLevel - 1)
    }
  }

  levelUp (numLevels: number): void {
    this.level += numLevels
    this.scaleAttributes(numLevels * 1.25)
  }
}

// Party combatants
export class PartyCombatant extends Combatant {
  encountersUntilAvailable: number;
  attributePointsAvailable: number;

  constructor (name: string, attributes: AttributeList | AttributeValueList, atLevel = 1) {
    super(name, attributes)
    this.team = CombatantTeam.Party
    this.isSimulated = false

    this.encountersUntilAvailable = 0
    this.attributePointsAvailable = 0

    // Make sure we benefit from the side effects of our initial attributes
    for (const name in this.attributes) {
      if (this.attributes[name].value > 0) {
        this.increaseAttribute(name as AttributeName, this.attributes[name].value, true)
      }
    }

    // Increase our stats according to the desired level
    if (atLevel > 1) {
      this.levelUp(atLevel - 1)
    }
  }

  public increaseXP (amount: number) {
    // Add the specified XP
    this.xp += amount

    // Increase the member's level if appropriate
    while (this.xp >= this.maxXP) {
      this.xp -= this.maxXP
      this.level++
      this.attributePointsAvailable += 2 + (this.level % 3)
      this.maxXP = 100 * this.level * 1.3
    }
  }

  public levelUp (numLevels: number, assignAttributes = true) {
    // Nothing to do if no real change is requested
    if (numLevels < 1) {
      return
    }

    // Increase our experience to the limit the requested number of times
    for (let i = 0; i < numLevels; i++) {
      this.increaseXP(this.maxXP - this.xp)
    }

    // Assign any earned attribute points if requested
    if (assignAttributes) {
      this.assignAttributePoints()
    }
  }

  public assignAttributePoints () {
    // Nothing to do if we have no points available
    if (this.attributePointsAvailable === 0) {
      return
    }

    // Calculate how much we can safely scale our attributes
    const total = Object.keys(this.attributes).reduce((c, a) => {
      return c + this.attributes[a].value
    }, 0)
    const factor = 1 + ((total === 0) ? 0 : (this.attributePointsAvailable / total))

    // Scale up our attributes
    const diff = this.scaleAttributes(factor)

    // Assign any leftovers that might exist as a result of using floor to scale
    // up the attributes
    if (diff < this.attributePointsAvailable) {
      // Find out how many points we have to work with
      let pts = this.attributePointsAvailable - diff

      // Find a corresponding number of attributes, sorted by current value
      let attrs = Object.keys(this.attributes).filter(a => this.attributes[a].value > 0).sort((a, b) => {
        if (this.attributes[a].value > this.attributes[b].value) {
          return -1
        }
        if (this.attributes[b].value > this.attributes[a].value) {
          return 1
        }
        return 0
      })
      // - if we haven't assigned any points, assign what we have randomly
      if (attrs.length === 0) {
        attrs = Object.keys(this.attributes).sort(() => {
          return Math.random() - 0.5
        })
      }
      // - assign points sequentially until we're out of points
      while (pts > 0) {
        for (const a of attrs) {
          if (pts === 0) {
            break
          }

          this.increaseAttribute(a as AttributeName, 1)

          pts--
        }
      }
    }

    // Clean up
    this.attributePointsAvailable = 0
  }
}
