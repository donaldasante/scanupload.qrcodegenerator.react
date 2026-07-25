<script setup lang="ts">
import { ref } from 'vue';
import { QrCodeGenerator } from '@scanupload/qr-code-generator-vue';

// Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
const sessionUrl = import.meta.env.VITE_SESSION_URL;
const clientId = import.meta.env.VITE_CLIENT_ID;

const showQrCodeLogo = ref(true);
const clickQrcodeReload = ref(true);
const showHeader = ref(true);
const filePreviewMode = ref<'list' | 'grid'>('list');
const headerText = ref('Scan to upload');
const qrCodeSize = ref<'small' | 'medium' | 'large' | 'xlarge'>('large');

const sizeOptions = [
    { value: 'small' as const, label: 'Small' },
    { value: 'medium' as const, label: 'Medium' },
    { value: 'large' as const, label: 'Large' },
    { value: 'xlarge' as const, label: 'X-Large' }
];
</script>

<template>
    <h2 class="demo-title">Example Form</h2>
    <div class="demo-card">
        <div class="mb-6">
            <div class="flex flex-col">
                <div class="checkbox-row">
                    <input
                        id="checkQrCodeLogo"
                        v-model="showQrCodeLogo"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                    />
                    <label for="checkQrCodeLogo" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                        Show Logo
                    </label>
                </div>

                <div class="checkbox-row">
                    <input
                        id="checkClickReload"
                        v-model="clickQrcodeReload"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                    />
                    <label for="checkClickReload" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                        Click QR code to reload
                    </label>
                </div>

                <div class="checkbox-row">
                    <input
                        id="checkHeader"
                        v-model="showHeader"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                    />
                    <label for="checkHeader" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                        Show header
                    </label>
                </div>

                <div class="flex items-center mt-2">
                    <label for="headerText" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-25 text-left">
                        Header text
                    </label>
                    <input
                        id="headerText"
                        v-model="headerText"
                        type="text"
                        class="w-60 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-400"
                        placeholder="Enter header text"
                    />
                </div>

                <div class="flex flex-col gap-0 mt-2">
                    <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">
                        File preview mode
                    </div>
                    <div class="flex flex-row items-start mt-2 space-x-4">
                        <label class="flex items-center cursor-pointer group">
                            <input
                                v-model="filePreviewMode"
                                type="radio"
                                value="list"
                                name="file-preview-mode"
                                class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                List
                            </span>
                        </label>
                        <label class="flex items-center cursor-pointer group">
                            <input
                                v-model="filePreviewMode"
                                type="radio"
                                value="grid"
                                name="file-preview-mode"
                                class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                Grid
                            </span>
                        </label>
                    </div>
                </div>

                <div class="flex flex-col gap-0 mt-2">
                    <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">
                        Qr Code size
                    </div>
                    <div class="flex flex-row items-start mt-2 space-x-4">
                        <!-- items-start (not items-center) so the
                             radio stays aligned at the top of the
                             label, even when the label text wraps
                             to two lines like "Extra Large". -->
                        <label
                            v-for="size in sizeOptions"
                            :key="size.value"
                            class="flex items-start cursor-pointer group"
                        >
                            <input
                                v-model="qrCodeSize"
                                type="radio"
                                :value="size.value"
                                name="qr-code-size"
                                class="h-4 w-4 mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                {{ size.label }}
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <div class="mb-6">
            <QrCodeGenerator
                :session-url="sessionUrl"
                :client-id="clientId"
                :show-header="showHeader"
                :header="headerText"
                :size="qrCodeSize"
                :show-logo="showQrCodeLogo"
                :click-qr-code-to-reload="clickQrcodeReload"
                :file-preview-mode="filePreviewMode"
                :show-download-button="true"
            />
        </div>
    </div>
    <p class="demo-back-link">
        <a href="https://app.scanupload.net/" class="text-blue-600 hover:text-blue-800 underline">
            Back to ScanUpload
        </a>
    </p>
</template>
