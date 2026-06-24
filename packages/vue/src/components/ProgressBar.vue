<script setup lang="ts">
withDefaults(
    defineProps<{
        progress?: number;
    }>(),
    {
        progress: 0
    }
);
</script>

<template>
    <div class="sqg-progress-wrap">
        <div class="sqg-progress-labels">
            <span class="sqg-progress-label">Uploading...</span>
            <span class="sqg-progress-label">{{ Math.round(progress || 0) }}%</span>
        </div>
        <div class="sqg-progress-track">
            <div class="sqg-progress-fill" :style="{ width: `${progress || 0}%` }" />
        </div>
    </div>
</template>
