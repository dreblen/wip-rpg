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
export interface AttributeValueList {
  [index: string]: number | undefined;
  phy?: number;
  mag?: number;
  end?: number;
  agl?: number;
  ldr?: number;
  lck?: number;
}
export type AttributeName = 'phy' | 'mag' | 'end' | 'agl' | 'ldr' | 'lck';

export interface EnemyCombatantSet {
  type: string;
  name?: string;
  min: number;
  max: number;
}

export interface EncounterSet {
  enemies: Array<EnemyCombatantSet>;
}

export enum EncounterActionResult {
  Success,
  Miss,
  Dodge
}

// Describes an action that a Combatant can take during an encounter
export interface EncounterAction {
  name: string;
  affinities: Array<AttributeName>;
  cost: { pool: 'hp' | 'mp'; value: number } | null;
  actor: Combatant;
  action: (targets: Array<Combatant>) => Array<EncounterActionResult>;
}

export type ActionSelection = [EncounterAction, Array<Combatant>]

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
    this.actions = [
      {
        name: 'Attack',
        cost: null,
        affinities: ['phy'],
        actor: this,
        action: function (targets: Array<Combatant>): Array<EncounterActionResult> {
          const results = []

          // Perform our action on all specified targets
          for (const target of targets) {
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
            const diff = this.actor.attributes.agl.value - target.attributes.agl.value
            const maxChange = 1 - dodgeRate
            roll += (maxChange - (maxChange / (Math.abs(diff / 15) + 1))) * (diff / Math.abs(diff))
            if (roll < dodgeRate) {
              results.push(EncounterActionResult.Dodge)
              continue
            }

            // Roll for damage
            // - base damage is our primary attribute minus the target's defense
            let base = 5 * Math.max(1, this.actor.attributes[this.affinities[0]].value - target.attributes.end.value)
            // - increase our base damage by attribute factors
            for (let i = 0; i < this.affinities.length; i++) {
              const f = (1 / (i + 1)) * this.actor.attributes[this.affinities[i]].value
              base += f * 5
            }
            target.hp -= Math.ceil(base)

            results.push(EncounterActionResult.Success)
          }

          return results
        }
      }
    ]
  }

  public getSelectedAction (combatants: Array<Combatant>): ActionSelection {
    // Select an action
    const action = this.actions[0] // XXX: improve

    // Select a target
    const opposingCombatants = combatants.filter(c => c.team !== this.team && c.hp > 0)

    return [action, [opposingCombatants[0]]]
  }
}

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

    for (const a in this.attributes) {
      const diff = this.attributes[a].scale(numLevels * 1.25)
      // See if there are side effects to changing this attribute
      switch (a as AttributeName) {
        case 'end':
          // Increase HP and MP
          for (let i = this.attributes[a].value - diff; i < this.attributes[a].value; i++) {
            this.maxHP += Math.max(5, Math.floor(i * 0.75))
            this.maxMP += Math.max(5, Math.floor(i * 0.75))
          }
          break
      }
    }
  }
}

// Standard interface for defining enemy types
export interface EnemyCombatantType {
  name: string;
  attributes: AttributeList | AttributeValueList;
}

export interface EnemyCombatantTypeList {
  [index: string]: EnemyCombatantType;
}

export class PartyCombatant extends Combatant {
  constructor (name: string, attributes: AttributeList | AttributeValueList) {
    super(name, attributes)
    this.team = CombatantTeam.Party
    this.isSimulated = false
  }
}
