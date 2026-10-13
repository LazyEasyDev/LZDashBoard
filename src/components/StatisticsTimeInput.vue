<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StatisticsInterval } from './easyStatisticsRecords'
import { currentStatisticsBucket, formatStatisticsBucket, statisticsBucketDate } from './easyStatisticsRecords'

const props = defineProps<{ interval: StatisticsInterval, label: string, min?: string, disabled?: boolean }>()
const model = defineModel<string>({ required: true })
const { locale } = useI18n()
const open = ref(false)
const selectedDate = computed(() => statisticsBucketDate(props.interval, model.value))
const minimum = computed(() => statisticsBucketDate(props.interval, props.min ?? '') ?? new CalendarDate(1, 1, 1))
const maximum = new CalendarDate(9999, 12, 31)
const calendarType = computed(() => props.interval === 'MONTH' ? 'month' : props.interval === 'YEAR' ? 'year' : 'date')
const displayValue = computed(() => formatStatisticsBucket(props.interval, model.value, locale.value) || props.label)

function selectDate(value: DateValue | null | undefined) {
  if (!value) return
  model.value = currentStatisticsBucket(props.interval, value.toDate('UTC'))
  open.value = false
}

watch(() => props.disabled, disabled => {
  if (disabled) open.value = false
})
</script>

<template>
  <UPopover v-model:open="open" :content="{ align: 'start' }">
    <UButton
      type="button"
      color="neutral"
      variant="outline"
      trailing-icon="i-lucide-calendar"
      :label="displayValue"
      :aria-label="`${label}: ${displayValue}`"
      :disabled="disabled"
      class="h-8 min-w-0 w-full justify-between font-normal text-default"
      :ui="{ label: 'truncate' }"
    />
    <template #content>
      <UCalendar
        :key="`${interval}:${locale}`"
        :model-value="selectedDate"
        variant="soft"
        :type="calendarType"
        :range="false"
        :multiple="false"
        :locale="locale"
        :min-value="minimum"
        :max-value="maximum"
        :week-starts-on="1"
        :week-numbers="interval === 'WEEK'"
        :disabled="disabled"
        prevent-deselect
        class="p-2"
        @update:model-value="selectDate"
      />
    </template>
  </UPopover>
</template>