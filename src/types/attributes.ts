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
export interface List {
  [index: string]: Attribute;
  phy: Attribute; // physical
  mag: Attribute; // magic
  end: Attribute; // endurance
  agl: Attribute; // agility
  ldr: Attribute; // leadership
  lck: Attribute; // luck
}

// Same as AttributeList but with numerical values only
export interface ValueList {
  [index: string]: number | undefined;
  phy?: number;
  mag?: number;
  end?: number;
  agl?: number;
  ldr?: number;
  lck?: number;
}

// Attribute short names
export type Name = 'phy' | 'mag' | 'end' | 'agl' | 'ldr' | 'lck';
