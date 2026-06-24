<script setup lang="ts">
import { computed, type Component } from 'vue';
import {
    FileText,
    FileImage,
    File,
    FileVideo,
    FileAudio,
    FileArchive,
    FileCode,
    FileSpreadsheet,
    FileType,
    FileDigit,
    FileJson,
    Presentation,
    SquareX
} from 'lucide-vue-next';
import ProgressBar from './ProgressBar.vue';
import type { UploadedFile } from '@scanupload/qr-code-generator-core';

const props = withDefaults(
    defineProps<{
        file: UploadedFile;
        className?: string;
        showExtension?: boolean;
        showRemoveButton?: boolean;
        removeFileMethod?: (fileId: string) => void;
    }>(),
    {
        className: '',
        showExtension: true,
        showRemoveButton: false,
        removeFileMethod: () => {}
    }
);

const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
};

const getIconByExtension = (extension: string): Component => {
    switch (extension) {
        case 'pdf':
            return File;
        case 'doc':
        case 'docx':
            return FileText;
        case 'xls':
        case 'xlsx':
            return FileSpreadsheet;
        case 'csv':
            return FileSpreadsheet;
        case 'ppt':
        case 'pptx':
            return Presentation;
        case 'txt':
        case 'rtf':
            return FileText;
        case 'md':
            return FileDigit;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'svg':
        case 'bmp':
        case 'webp':
        case 'ico':
            return FileImage;
        case 'mp4':
        case 'avi':
        case 'mov':
        case 'wmv':
        case 'flv':
        case 'webm':
        case 'mkv':
            return FileVideo;
        case 'mp3':
        case 'wav':
        case 'ogg':
        case 'flac':
        case 'm4a':
        case 'aac':
            return FileAudio;
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz':
        case 'bz2':
            return FileArchive;
        case 'js':
        case 'jsx':
        case 'html':
        case 'htm':
        case 'css':
        case 'xml':
        case 'yml':
        case 'yaml':
            return FileCode;
        case 'ts':
        case 'tsx':
            return FileType;
        case 'json':
            return FileJson;
        default:
            return File;
    }
};

const extension = computed(() => getFileExtension(props.file.name));
const IconComponent = computed(() => getIconByExtension(extension.value));
</script>

<template>
    <div :class="`sqg-file-card ${className}`">
        <div class="sqg-file-inner">
            <div v-if="file.thumbnailBase64" class="sqg-thumb-wrap">
                <img :src="`data:${file.type};base64,${file.thumbnailBase64}`" class="sqg-thumb-img" :alt="file.name" />
            </div>
            <template v-else>
                <div class="sqg-icon-wrap" :data-filetype="extension">
                    <component :is="IconComponent" :size="40" />
                </div>
                <div v-if="showExtension && extension" class="sqg-ext-badge">
                    <span>{{ extension.toUpperCase() }}</span>
                </div>
            </template>
            <div class="sqg-file-info">
                <div class="sqg-file-meta">
                    <p class="sqg-file-name">{{ file.name }}</p>
                    <p class="sqg-file-size">({{ (file.size / 1024).toFixed(1) }} KB)</p>
                </div>
                <button v-if="showRemoveButton" class="sqg-remove-btn" aria-label="Remove File" @click="removeFileMethod(file.id)">
                    <SquareX class="sqg-remove-icon" />
                </button>
            </div>
            <ProgressBar :progress="file.progress" />
        </div>
    </div>
</template>
