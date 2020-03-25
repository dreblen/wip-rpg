<template>
  <v-dialog v-model="showDialog" max-width="400">
    <v-card v-if="partyMember !== undefined">
      <v-card-title class="text-center">
        {{ partyMember.name }}
      </v-card-title>
      <v-card-subtitle>
        Points Available: {{ availablePoints }}
      </v-card-subtitle>
      <v-card-text>
        <v-row v-for="(a, i) in baseAttributes" :key="a.name">
          <v-col class="text-right">{{ a.name }}</v-col>
          <v-col class="flex-grow-0 flex-shrink-1">
            <v-btn
              :disabled="tempAttributes[i].value <= a.value"
              @click="removeAttribute(i)"
            >
              -
            </v-btn>
          </v-col>
          <v-col class="flex-grow-0 flex-shrink-1">
            <span style="width: 2em; display: block;">{{ tempAttributes[i].value }}</span>
          </v-col>
          <v-col class="flex-grow-0 flex-shrink-1">
            <v-btn
              :disabled="availablePoints === 0"
              @click="assignAttribute(i)"
            >
              +
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="finalize">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue'
import * as Attributes from '@/types/attributes'

export default Vue.extend({
  name: 'LevelUpDialog',
  data: () => ({
    availablePoints: 0,
    baseAttributes: undefined as Attributes.List | undefined,
    tempAttributes: undefined as Attributes.List | undefined,
    showDialog: false
  }),
  props: {
    value: {
      type: Boolean,
      default: false
    },
    partyMember: {
      type: Object
    }
  },
  model: {
    prop: 'value',
    event: 'change'
  },
  watch: {
    showDialog: function () {
      this.$emit('change', this.showDialog)
    },
    value: function () {
      this.showDialog = this.value

      // If the user requested to see the dialog, make sure we have up-to-date
      // attribute values for the selected party member
      if (this.showDialog === true) {
        this.baseAttributes = JSON.parse(JSON.stringify(this.partyMember.attributes))
        this.tempAttributes = JSON.parse(JSON.stringify(this.baseAttributes))
        this.availablePoints = this.partyMember.attributePointsAvailable
      }
    }
  },
  methods: {
    assignAttribute (i: Attributes.Name): void {
      if (this.tempAttributes === undefined) {
        return
      }

      this.tempAttributes[i].value++
      this.availablePoints--
    },
    removeAttribute (i: Attributes.Name): void {
      if (this.tempAttributes === undefined) {
        return
      }

      this.tempAttributes[i].value--
      this.availablePoints++
    },
    finalize (): void {
      // Update our attribute values
      for (const i in this.tempAttributes) {
        const increase = this.tempAttributes[i].value - this.partyMember.attributes[i].value
        if (increase > 0) {
          this.partyMember.increaseAttribute(i, increase)
        }
      }

      // Update our attribute points available
      this.partyMember.attributePointsAvailable = this.availablePoints

      // Reset
      this.showDialog = false
      this.baseAttributes = this.tempAttributes = undefined
    }
  }
})
</script>
