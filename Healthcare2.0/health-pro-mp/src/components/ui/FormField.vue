<template>
  <div :class="containerClass">
    <label
      v-if="label"
      class="block text-xs font-bold text-slate-500 uppercase mb-2"
    >
      {{ label }}
      <span v-if="required" class="text-rose-500">*</span>
    </label>
    <slot />
    <p v-if="error" class="mt-1 text-xs text-rose-500">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-slate-400">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  required?: boolean
  error?: string
  hint?: string
  containerClass?: string
}>()
</script>
