<template>
  <NuxtPage />
  <FeedbackWidget v-if="showFeedbackWidget" />
</template>

<script setup lang="ts">
const route = useRoute()
const showFeedbackWidget = computed(() => route.path !== '/login')
</script>
