<template>
  <!-- Backdrop -->
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50"
  >
    <div
      class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
      @click="$emit('update:modelValue', false)"
    />

    <!-- Drawer -->
    <div
      class="fixed right-0 top-0 w-[480px] bg-white h-full shadow-2xl flex flex-col font-sans transform transition-transform duration-300 ease-out"
      :class="[sizeClasses[size], animClass]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
        <slot name="header">
          <h2 class="text-xl font-bold text-slate-900">{{ title }}</h2>
        </slot>
        <button
          @click="$emit('update:modelValue', false)"
          class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        >
          <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Tabs (Optional) -->
      <div v-if="tabs && tabs.length" class="flex border-b border-slate-100">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="$emit('update:activeTab', tab.key)"
          class="flex-1 py-4 text-sm font-bold relative transition-colors"
          :class="activeTab === tab.key ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'"
        >
          {{ tab.label }}
          <div
            v-if="activeTab === tab.key"
            class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full"
          />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto bg-slate-50 p-6 relative custom-scrollbar">
        <slot />
      </div>

      <!-- Footer -->
      <div v-if="showFooter" class="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
        <button
          @click="$emit('cancel')"
          class="flex-1 h-11 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          {{ cancelText }}
        </button>
        <button
          @click="$emit('confirm')"
          :disabled="loading"
          class="flex-1 h-11 bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            {{ loadingText }}
          </span>
          <span v-else>{{ confirmText }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
  showFooter?: boolean
  confirmText?: string
  cancelText?: string
  loading?: boolean
  loadingText?: string
  tabs?: Array<{ key: string; label: string }>
  activeTab?: string
}>(), {
  size: 'md',
  showFooter: false,
  confirmText: '保存',
  cancelText: '取消',
  loading: false,
  loadingText: '保存中...'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:activeTab': [key: string]
  'confirm': []
  'cancel': []
}>()

const animClass = ref('translate-x-full')

watch(() => props.modelValue, (val) => {
  if (val) {
    setTimeout(() => animClass.value = 'translate-x-0', 10)
  } else {
    animClass.value = 'translate-x-full'
  }
}, { immediate: true })

const sizeClasses = {
  sm: 'w-[360px]',
  md: 'w-[480px]',
  lg: 'w-[600px]'
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
