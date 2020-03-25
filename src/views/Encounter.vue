<template>
  <v-container>
    <template v-if="encounter.isSimulated">
      <v-row class="text-center">
        <v-col>
          <h1 class="mb-3">Simulating...</h1>
          <v-progress-circular
            indeterminate
            size="75"
          />
        </v-col>
      </v-row>
    </template>
    <template v-else>
      <combatant-cards v-model="encounter.enemies" @click="onTargetSelected" />
      <template v-if="currentCombatant && currentCombatant.isSimulated == false">
        <v-btn
          v-for="action in currentCombatant.actions"
          @click="onActionSelected(action)"
          :key="action.name"
          :disabled="action.cost !== null && currentCombatant[action.cost.pool] < action.cost.value"
        >
          {{ action.name }}
        </v-btn>
      </template>
      <combatant-cards v-model="encounter.party" @click="onTargetSelected" />
    </template>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'
import CombatantCards from '@/components/CombatantCards.vue'

import * as RPG from '@/types'

export default Vue.extend({
  name: 'Encounter',
  data: () => ({
    combatants: [] as Array<RPG.Combatant>,

    simulationDelay: 750,

    pendingUserAction: null as RPG.EncounterAction | null,
    userAction: null as Promise<RPG.ActionSelection> | null,
    resolveUserAction: null as ((value: RPG.ActionSelection) => void) | null,
    turnIndex: 0
  }),
  computed: {
    ...mapState([
      'encounter'
    ]),
    ...mapGetters([
      'winningTeam'
    ]),
    currentCombatant (): RPG.Combatant | null {
      if (this.combatants.length === 0) {
        return null
      } else {
        return this.combatants[this.turnIndex]
      }
    }
  },
  methods: {
    onTargetSelected (target: RPG.Combatant): void {
      // XXX: Double-clicking makes the action run twice?
      // We shouldn't be here if we don't already have an action pending
      if (this.pendingUserAction === null || this.resolveUserAction === null) {
        return
      }

      this.resolveUserAction([this.pendingUserAction, [target]])
    },
    onActionSelected (action: RPG.EncounterAction): void {
      this.pendingUserAction = action
    },
    async takeTurn () {
      // Make sure we aren't in an invalid state
      if (this.currentCombatant === null) {
        return
      }

      // Check if the encounter is finished
      if (this.winningTeam !== RPG.CombatantTeam.None) {
        this.$store.dispatch('finishEncounter')
        this.$router.push('/')
        return
      }

      // Make sure we're allowed to take a turn
      let canTakeTurn = true
      if (this.currentCombatant.hp <= 0) {
        canTakeTurn = false
      }

      if (canTakeTurn) {
        // Show selection UI or simulate action selection
        let selection: RPG.ActionSelection
        if (this.currentCombatant.isSimulated || this.encounter.isSimulated) {
          // Get the simulated selection on a delay so the user has time to see
          // what's happening
          selection = await new Promise((resolve) => {
            setTimeout(() => {
              resolve((this.currentCombatant as RPG.Combatant).getSelectedAction(this.combatants))
            }, this.simulationDelay)
          })
        } else {
          // Set up a promise that will resolve once the user has selected both
          // an action and a target
          this.userAction = new Promise((resolve) => { this.resolveUserAction = resolve })
          selection = await this.userAction

          // Reset our promise so it can't be resolved again
          this.userAction = this.resolveUserAction = null

          // Reset our selection information
          this.pendingUserAction = null
        }

        // Execute selected action
        console.log(this.currentCombatant.name, 'performs', selection[0].name, 'on', selection[1].map((a) => { return a.name }))
        const r = this.currentCombatant.takeAction(...selection)
        console.log('--> ', r.map((r) => { return RPG.EncounterActionResult[r] }))
      }

      // Pass to next combatant
      this.turnIndex++
      if (this.turnIndex === this.combatants.length) {
        this.turnIndex = 0
      }
      this.takeTurn()
    }
  },
  mounted (): void {
    // We shouldn't be here if we're not actually in an encounter
    if (!this.encounter.isActive) {
      this.$router.push('/')
      return
    }

    // Build a combatant list in turn order
    this.combatants = this.encounter.party.concat(this.encounter.enemies)
    this.combatants.sort((a, b) => {
      if (a.attributes.agl.value > b.attributes.agl.value) {
        return -1
      }

      if (b.attributes.agl.value > a.attributes.agl.value) {
        return 1
      }

      return Math.random() - 0.5
    })

    // Remove our simulation delay if everything is simulated
    if (this.encounter.isSimulated) {
      this.simulationDelay = 50
    }

    // Start our turn loop
    this.takeTurn()
  },
  components: {
    CombatantCards
  }
})
</script>
