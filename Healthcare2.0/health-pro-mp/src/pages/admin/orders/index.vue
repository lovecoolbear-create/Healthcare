<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Sidebar -->
    <Sidebar activeTab="orders" />
    
    <!-- Main Content -->
    <div class="flex-1 p-8 overflow-y-auto">
      <OrderManager />
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '@/components/Sidebar.vue';
import OrderManager from './components/OrderManager.vue';
</script>
