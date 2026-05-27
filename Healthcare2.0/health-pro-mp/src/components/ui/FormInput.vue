<template>
  <FormField :label="label" :required="required" :error="error" :hint="hint">
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
      :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    />
  </FormField>
</template>

<script setup lang="ts">
import FormField from './FormField.vue'

defineProps<{
  modelValue: string | number
  label?: string
  type?: 'text' | 'number' | 'email' | 'tel' | 'password'
  placeholder?: string
  required?: boolean
  error?: string
  hint?: string
  disabled?: boolean
  readonly?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
