<template>
  <v-container>
    <party-selection-cards v-model="selectedParty" />
    <v-card v-if="enemies.length > 0">
      <v-card-title>
        TBD% Chance of {{ enemies.length }} Enemies
      </v-card-title>
      <v-card-text>
        <p>There is probably a {{ enemies[0].name }}</p>
        <p>TBD% chance of victory</p>
        <p v-if="encounterRewards.length > 0">TBD% chance of other rewards</p>
      </v-card-text>
      <v-card-actions>
        <v-row>
          <v-col>
            <v-btn
              block
              @click="startEncounter(false)"
              :disabled="selectedParty.length === 0"
            >
              Start Encounter
            </v-btn>
          </v-col>
          <v-col>
            <v-btn
              block
              @click="startEncounter(true)"
              :disabled="selectedParty.length === 0"
            >
              Simulate Encounter
            </v-btn>
          </v-col>
          <v-col>
            <v-btn
              block
              @click="skipEncounter"
            >
              Skip Encounter
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'
import PartySelectionCards from '@/components/PartySelectionCards.vue'

import * as RPG from '@/types'

export default Vue.extend({
  name: 'Home',
  data: () => ({
    selectedParty: [],
    enemies: [] as Array<RPG.Combatants.EnemyCombatant>,
    encounterRewards: [] as Array<RPG.Encounters.Reward>,
    enemyTypes: {} as RPG.Combatants.EnemyCombatantTypeList,
    encounterSets: [] as Array<RPG.Encounters.Set>
  }),
  computed: {
    ...mapState([
      'party',
      'encounter'
    ])
  },
  methods: {
    generateEncounter () {
      // Filter our sets to those that are allowed based on the number of
      // previous encounters
      const sets = this.encounterSets.filter((s: RPG.Encounters.Set) => {
        return s.ranges.reduce((c: boolean, r: RPG.Encounters.AppearanceRange) => {
          // If we've already found a match, don't keep checking
          if (c === true) {
            return true
          }

          // See if our current encounter index falls within the range
          let min = 0
          if (r.min !== null) {
            min = r.min
          }
          let max = Number.MAX_SAFE_INTEGER
          if (r.max !== null) {
            max = r.max
          }
          if (this.encounter.index >= min && this.encounter.index <= max) {
            return true
          }

          return false
        }, false)
      })

      // Pick a set
      const i = Math.floor((Math.random() * sets.length))
      const set = sets[i]

      // Populate the rewards for this encounter
      this.encounterRewards = set.rewards || []

      // Populate the correct number of enemies
      this.enemies = []
      for (const group of set.enemies) {
        // Get our type for convenience
        const t = this.enemyTypes[group.type]

        // Get a number between our min and max if they're different
        let num = group.min
        if (group.min < group.max) {
          num = RPG.getRandomIntBetween(group.min, group.max)
        }

        // Generate the right number
        for (let i = 0; i < num; i++) {
          this.enemies.push(new RPG.Combatants.EnemyCombatant(group.type, group.name || t.name, Math.max(1, this.encounter.index / 5), t.attributes))
        }
      }

      // Randomize the order that our enemies appear
      this.enemies.sort(() => {
        return Math.random() - 0.5
      })
    },
    startEncounter (isSimulated: boolean) {
      // Set our encounter combatants and begin
      this.$store.dispatch('startEncounter', { enemies: this.enemies, party: this.selectedParty, rewards: this.encounterRewards, isSimulated })
      this.$router.push('/encounter')
    },
    skipEncounter () {
      // "Start" a new encounter with no party members, then finish it immediately
      this.$store.dispatch('startEncounter', { enemies: this.enemies, party: [] })
      this.$store.dispatch('finishEncounter')
      this.generateEncounter()
    }
  },
  mounted (): void {
    // We shouldn't be here if we're in an encounter
    if (this.encounter.isActive) {
      this.$router.push('/encounter')
      return
    }

    // Generate a player character
    if (this.party.length === 0) {
      // TODO: This should be a selection process on a character creation route
      this.$store.commit('addPartyMember', new RPG.Combatants.PartyCombatant('Hero', { phy: 6, end: 3, ldr: 1 }))
    }

    // Load in / Generate possible enemy types
    this.enemyTypes = {
      DragonEnemy: { name: 'Dragon', attributes: { phy: 1, end: 2 } },
      SnakeEnemy: { name: 'Snake', attributes: { mag: 1, end: 1 } }
    }

    // Load in / Generate possible encounter descriptions
    this.encounterSets = [
      {
        ranges: [
          { min: 0, max: 0 }
        ],
        rewards: [
          { chance: 1.0, type: RPG.Encounters.RewardType.PartyMember, value: { name: 'Friend', attributes: { phy: 3, end: 6, lck: 1 } } }
        ],
        enemies: [
          { type: 'DragonEnemy', min: 1, max: 1 }
        ]
      },
      {
        ranges: [
          { min: 1, max: 5 }
        ],
        enemies: [
          { type: 'DragonEnemy', min: 2, max: 3 }
        ]
      },
      {
        ranges: [
          { min: 3, max: null }
        ],
        enemies: [
          { type: 'DragonEnemy', min: 1, max: 2 },
          { type: 'SnakeEnemy', name: 'Serpentia', min: 1, max: 1 }
        ]
      }
    ]

    // Generate our first encounter
    this.generateEncounter()
  },
  components: {
    PartySelectionCards
  }
})
</script>
