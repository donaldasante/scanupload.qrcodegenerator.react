<script setup lang="ts">
import { QrCode } from 'lucide-vue-next';

withDefaults(
    defineProps<{
        isConnected?: boolean;
    }>(),
    {
        isConnected: false
    }
);
</script>

<template>
    <QrCode :class="isConnected ? 'sqg-logo sqg-logo--connected' : 'sqg-logo sqg-logo--disconnected'" />
</template>
