import * as Actions from './actions'
import * as Attributes from './attributes'
import ActionDefinitions from './actions.json'

// Standard definitions of team affinity
export enum Team {
  None,
  Party,
  Enemy,
}

// Character that can take part in a combat encounter
export class Combatant {
  id: number;

  attributes: Attributes.List;
  team: Team;
  name: string;

  actions: Array<Actions.Action>;
  actionHooks: Array<() => void>;

  isSimulated: boolean;

  level: number;
  xp: number;
  maxXP: number;

  hp: number;
  maxHP: number;
  mp: number;
  maxMP: number;

  protected constructor (name: string, attributes: Attributes.List | Attributes.ValueList) {
    this.id = Math.random()

    this.level = 1
    this.xp = 0
    this.maxXP = 100

    this.hp = this.maxHP = 100
    this.mp = this.maxMP = 10

    this.name = name

    this.team = Team.None
    this.isSimulated = true

    // Use the given attributes as is, or convert their values into attribute
    // objects if necessary
    if (typeof attributes.phy === 'object') {
      this.attributes = attributes as Attributes.List
    } else {
      this.attributes = {
        phy: new Attributes.Attribute('Physical', attributes.phy as number),
        mag: new Attributes.Attribute('Magic', attributes.mag as number),
        end: new Attributes.Attribute('Endurance', attributes.end as number),
        agl: new Attributes.Attribute('Agility', attributes.agl as number),
        ldr: new Attributes.Attribute('Leadership', attributes.ldr as number),
        lck: new Attributes.Attribute('Luck', attributes.lck as number)
      }
    }

    // Add basic actions
    this.actions = ActionDefinitions as Array<Actions.Action>
    this.actionHooks = []
  }

  public getAttributeAffinities (): Array<Attributes.Name> {
    // Filter our attributes to those that have some value, then return their
    // names sorted by value, highest to lowest
    const aNames = Object.keys(this.attributes) as Array<Attributes.Name>
    return aNames.filter(a => this.attributes[a].value > 0).sort((a, b) => {
      if (this.attributes[a].value > this.attributes[b].value) {
        return -1
      }
      if (this.attributes[b].value > this.attributes[a].value) {
        return 1
      }
      return 0
    })
  }

  public getPrimaryAttributeAffinity (): Attributes.Name {
    const list = this.getAttributeAffinities()
    if (list.length > 0) {
      return list[0]
    } else {
      return 'phy'
    }
  }

  public takeAction (action: Actions.Action, targets: Array<Combatant>, ignoreCost = false): Array<Actions.Result> {
    const results = []

    // Honor the cost of the action
    if (!ignoreCost && action.cost !== null) {
      this[action.cost.pool] -= action.cost.value
    }

    // Perform our action on all specified targets
    for (const target of targets) {
      switch (action.type as Actions.Type) {
        case 'Attack': {
          const a: Actions.Attack = action as Actions.Attack
          // Roll for hit
          const hitRate = a.rates.hit // TODO: Should be based on equipment
          let roll = Math.random()
          if (roll > hitRate) {
            results.push(Actions.Result.Miss)
            continue
          }

          // Roll for dodge
          const dodgeRate = a.rates.dodge // TODO: Should be based on equipment
          roll = Math.random()
          // - relative agility increases or decreases the roll
          const diff = this.attributes.agl.value - target.attributes.agl.value
          const maxChange = 1 - dodgeRate
          roll += (maxChange - (maxChange / (Math.abs(diff / 15) + 1))) * (diff / Math.abs(diff))
          if (roll < dodgeRate) {
            results.push(Actions.Result.Dodge)
            continue
          }

          // Roll for damage
          // - base damage is our primary attribute minus the target's defense
          let base = a.damage * Math.max(1, this.attributes[a.affinities[0]].value - target.attributes.end.value)
          // - randomize the base damage slightly
          base *= Math.max(0.9, Math.min(1.1, Math.random() + 0.5))
          // - increase our base damage by attribute factors
          for (let i = 0; i < a.affinities.length; i++) {
            const f = (1 / (i + 1)) * this.attributes[a.affinities[i]].value
            base *= 1 + (f * 0.05)
          }
          target.hp = Math.max(0, target.hp - Math.ceil(base))

          results.push(Actions.Result.Success)
          break
        }
        case 'Debuff':
        case 'Buff': {
          const a: Actions.Buff = action as Actions.Buff

          // TODO: Alter the buff based on attribute affinities

          // Alter the target's attributes
          for (const attr in a.attributes) {
            this.attributes[attr].value += a.attributes[attr] as number
          }

          // Queue the removal of the buff
          this.actionHooks.push(() => {
            for (const attr in a.attributes) {
              this.attributes[attr].value -= a.attributes[attr] as number
            }
          })
          break
        }
      }
    }

    return results
  }

  public getSelectedAction (combatants: Array<Combatant>): Actions.Selection {
    // 0. Gather some preliminary information about our situation
    const attributeAffinities = this.getAttributeAffinities()
    const primaryAttributeAffinity = this.getPrimaryAttributeAffinity()

    // 1. Determine target priority, weighted with points. The team-based "All"
    // groups are added as aggregates of the individual targets.
    interface ActionOption {
      action: Actions.Action;
      weight: number;
    }
    interface TargetOption {
      type: Actions.TargetType;
      targets: Array<Combatant>;
      weight: number;
      actionOptions: Array<ActionOption>;
    }
    const targetOptions: Array<TargetOption> = []
    // - determine our single-target options
    combatants.filter(c => c.hp > 0).forEach((c) => {
      let weight = 0

      // * Subject of previous buff/debuff
      if (c.actionHooks.length > 0) {
        weight++
      }

      // * Lowness of health
      weight += Math.floor(((c.maxHP - c.hp) / c.maxHP) * 10)

      // * Vulnerability
      if (c.id !== this.id) {
        weight += this.attributes[primaryAttributeAffinity].value - c.attributes.end.value
      }

      // Add our target option
      targetOptions.push({
        type: (c.id === this.id) ? 'Self' : 'Single',
        targets: [c],
        weight: weight,
        actionOptions: []
      })
    })
    // - aggregate our all-target options
    const teams = [Team.Party, Team.Enemy]
    teams.forEach((team) => {
      targetOptions.push({
        type: 'All',
        targets: combatants.filter(c => c.team === team),
        weight: targetOptions.filter(o => o.type !== 'All' && o.targets[0].team === team).reduce((c, o) => c + o.weight, 0),
        actionOptions: []
      })
    })
    // - sort our target options randomly so they're not always in the same order
    targetOptions.sort(() => { return Math.random() - 0.5 })

    // 2. For each possible target, determine action priority, weighted and
    // sorted with the best action first
    targetOptions.forEach((to) => {
      // Go through any actions that we are actually able to perform on this target
      this.actions.filter((a) => {
        // Make sure it's compatible with the target type
        if (a.targetType !== to.type) {
          // Special exception for 'Single' actions, which can apply to 'Self'
          if (!(a.targetType === 'Single' && to.type === 'Self')) {
            return false
          }
        }

        // Make sure we have enough to cover its cost
        if (a.cost !== null && this[a.cost.pool] < a.cost.value) {
          return false
        }

        // Make sure it won't help the other team
        if (to.targets[0].team !== this.team && a.type === 'Buff') {
          return false
        }

        // Make sure it won't harm our team
        if (to.targets[0].team === this.team && (a.type === 'Attack' || a.type === 'Debuff')) {
          return false
        }

        // Otherwise, fine to include
        return true
      }).forEach((a) => {
        let weight = 0
        const avgExecutions = Math.floor(a.executionCount.min + a.executionCount.max / 2)

        // * Minimization of cost (i.e., prefer free or low-cost actions)
        if (a.cost !== null) {
          weight -= a.cost.value
        }

        // * Maximization of affinity (most affinity matches)
        a.affinities.forEach((af) => {
          // Give more weight to our stronger affinities
          const index = attributeAffinities.indexOf(af)
          if (index !== -1) {
            weight += (Object.keys(this.attributes).length - index)
          }
        })

        // Factors that apply only to attacks:
        if (a.type === 'Attack') {
          const aa = a as Actions.Attack
          // * Maximization of damage (base value, but considering execution count)
          weight += aa.damage * avgExecutions

          // * Maximization of hit rate (considering execution count)
          weight += Math.floor(aa.rates.hit * 5 * avgExecutions)

          // * Minimization of dodge rate (considering execution count)
          weight -= Math.floor(aa.rates.dodge * 5 * avgExecutions)
        }

        // Add the final option information
        to.actionOptions.push({
          action: a,
          weight: weight
        })
      })

      // Sort our action options by weight
      to.actionOptions.sort((a, b) => {
        if (a.weight > b.weight) {
          return -1
        }
        if (b.weight > a.weight) {
          return 1
        }
        return 0
      })
    })

    // 3. Final selection is the highest combined target+action weight
    // evaluation, so we need to start by filtering out any targets that don't
    // have any valid action options
    const variance = 0.75
    const bestOption = targetOptions.filter(o => o.actionOptions.length > 0).reduce((c, to) => {
      // Compare the combined weight of this target and its best option against
      // the other best combinations
      if (to.weight + to.actionOptions[0].weight > c.weight + c.actionOptions[0].weight) {
        // Normally this would mean that 'to' is better than 'c', but if we pass
        // a roll against the variance value, we act like it was worse
        if (Math.random() > variance) {
          return c
        } else {
          return to
        }
      } else {
        return c
      }
    })

    return [bestOption.actionOptions[0].action, bestOption.targets]
  }

  public increaseAttribute (name: Attributes.Name, increase: number, sideEffectsOnly = false): void {
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
        this.increaseAttribute(a as Attributes.Name, diff, true)
      }

      totalDiff += diff
    }

    return totalDiff
  }
}

// Standard interface for defining enemy types
export interface EnemyCombatantType {
  name: string;
  attributes: Attributes.List | Attributes.ValueList;
}

// Allows enemy types to be defined dynamically and still viewed as valid
export interface EnemyCombatantTypeList {
  [index: string]: EnemyCombatantType;
}

// Non-party combatants
export class EnemyCombatant extends Combatant {
  type: string;

  constructor (type: string, name: string, atLevel = 1, attributes: Attributes.List | Attributes.ValueList) {
    super(name, attributes)
    this.type = type
    this.team = Team.Enemy

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

  constructor (name: string, attributes: Attributes.List | Attributes.ValueList, atLevel = 1) {
    super(name, attributes)
    this.team = Team.Party
    this.isSimulated = false

    this.encountersUntilAvailable = 0
    this.attributePointsAvailable = 0

    // Make sure we benefit from the side effects of our initial attributes
    for (const name in this.attributes) {
      if (this.attributes[name].value > 0) {
        this.increaseAttribute(name as Attributes.Name, this.attributes[name].value, true)
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

          this.increaseAttribute(a as Attributes.Name, 1)

          pts--
        }
      }
    }

    // Clean up
    this.attributePointsAvailable = 0
  }
}
