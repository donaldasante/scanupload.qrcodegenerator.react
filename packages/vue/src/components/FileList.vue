<script setup lang="ts">
import { FileText } from 'lucide-vue-next';
import type { UploadedFile } from '@scanupload/qr-code-generator-core';

const props = defineProps<{
    files: UploadedFile[];
}>();
</script>

<template>
    <!--
      Render nothing when the list is empty. The container's
      `border: 1px solid #e5e7eb` would otherwise collapse to a
      1px-tall empty bordered strip, showing up as a stray horizontal
      line between the reload section and the download button.
    -->
    <div v-if="props.files.length > 0" class="sqg-file-list">
        <div class="sqg-file-list-inner">
            <div v-for="file in props.files" :key="file.id" class="sqg-file-row">
                <div class="sqg-list-thumb">
                    <img v-if="file.thumbnailBase64" :src="`data:${file.type};base64,${file.thumbnailBase64}`" :alt="file.name" />
                    <FileText v-else :size="24" />
                </div>
                <div class="sqg-list-info">
                    <span class="sqg-list-name">{{ file.name }}</span>
                    <span class="sqg-list-size">{{ (file.size / 1024).toFixed(1) }} KB</span>
                </div>
            </div>
        </div>
    </div>
</template>
