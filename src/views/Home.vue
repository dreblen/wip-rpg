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
      </v-card-text>
      <v-card-actions>
        <v-row>
          <v-col>
            <v-btn
              @click="startEncounter(false)"
              :disabled="selectedParty.length === 0"
            >
              Start Encounter
            </v-btn>
          </v-col>
          <v-col>
            <v-btn
              @click="startEncounter(true)"
              :disabled="selectedParty.length === 0"
            >
              Simulate Encounter
            </v-btn>
          </v-col>
          <v-col>
            <v-btn
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
    enemies: [] as Array<RPG.EnemyCombatant>,
    enemyTypes: {} as RPG.EnemyCombatantTypeList,
    encounterSets: [] as Array<RPG.EncounterSet>
  }),
  computed: {
    ...mapState([
      'party',
      'encounter'
    ])
  },
  methods: {
    generateEncounter () {
      // Pick a set
      const i = Math.floor((Math.random() * this.encounterSets.length))
      const set = this.encounterSets[i]

      // Populate the correct number of enemies
      this.enemies = []
      for (const group of set.enemies) {
        // Get our type for convenience
        const t = this.enemyTypes[group.type]

        // Get a number between our min and max if they're different
        let num = group.min
        if (group.min < group.max) {
          num = Math.floor((Math.random() * (group.max - group.min + 1)) + group.min)
        }

        // Generate the right number
        for (let i = 0; i < num; i++) {
          this.enemies.push(new RPG.EnemyCombatant(group.type, group.name || t.name, 1, t.attributes))
        }
      }

      // Randomize the order that our enemies appear
      this.enemies.sort(() => {
        return Math.random() - 0.5
      })
    },
    startEncounter (isSimulated: boolean) {
      // Set our encounter combatants and begin
      this.$store.dispatch('startEncounter', { enemies: this.enemies, party: this.selectedParty, isSimulated })
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
      this.$store.commit('addPartyMember', new RPG.PartyCombatant('Hero', { phy: 1, end: 1 }))
    }

    // Load in / Generate possible enemy types
    this.enemyTypes = {
      DragonEnemy: { name: 'Dragon', attributes: { phy: 1, end: 1 } },
      SnakeEnemy: { name: 'Snake', attributes: { mag: 1, end: 1 } }
    }

    // Load in / Generate possible encounter descriptions
    this.encounterSets = [
      {
        enemies: [
          { type: 'DragonEnemy', min: 2, max: 3 }
        ]
      },
      {
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
