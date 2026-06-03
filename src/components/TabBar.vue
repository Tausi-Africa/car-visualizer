<script setup>
/**
 * TabBar — small, presentational, accessible tab strip. Reusable anywhere:
 *   <TabBar :tabs="[{id:'a',label:'A'}]" v-model="active" />
 * Carries no viewer logic, so it can be restyled per client without touching
 * the viewers.
 */
defineProps({
  tabs: { type: Array, required: true }, // [{ id, label, icon? }] — icon is a component
  modelValue: { type: String, required: true },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="tabbar" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.id"
      :class="['tabbar__tab', { 'tabbar__tab--active': modelValue === tab.id }]"
      @click="$emit('update:modelValue', tab.id)"
    >
      <component :is="tab.icon" v-if="tab.icon" :size="17" :stroke-width="2.25" />
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabbar {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}
.tabbar__tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.92rem;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.tabbar__tab:hover {
  color: #fff;
}
.tabbar__tab--active {
  background: #fff;
  color: #14161c;
}
</style>
