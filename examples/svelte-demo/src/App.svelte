<script lang="ts">
    import { QrCodeGenerator } from '@scanupload/qr-code-generator-svelte';

    // Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
    function readSessionUrl(): string {
        const value = import.meta.env.VITE_SESSION_URL;
        if (!value) {
            throw new Error('VITE_SESSION_URL is not set. Copy .env.example to .env.local or provide it as a Docker build argument.');
        }
        return value;
    }

    function readClientId(): string {
        const value = import.meta.env.VITE_CLIENT_ID;
        if (!value) {
            throw new Error('VITE_CLIENT_ID is not set. Copy .env.example to .env.local or provide it as a Docker build argument.');
        }
        return value;
    }

    const sessionUrl = readSessionUrl();
    const clientId = readClientId();

    let showQrCodeLogo = $state(true);
    let clickQrcodeReload = $state(true);
    let showHeader = $state(true);
    let showDownloadButton = $state(true);
    let filePreviewMode = $state<'list' | 'grid'>('list');
    let headerText = $state('Scan to upload');
    let qrCodeSize = $state<'small' | 'medium' | 'large' | 'xlarge'>('large');

    const sizeOptions = [
        { value: 'small' as const, label: 'Small' },
        { value: 'medium' as const, label: 'Medium' },
        { value: 'large' as const, label: 'Large' },
        { value: 'xlarge' as const, label: 'X-Large' }
    ];
</script>

<h2 class="demo-title">Example Form</h2>
<div class="demo-card">
    <div class="mb-6">
        <div class="flex flex-col">
            <div class="checkbox-row">
                <input
                    id="checkQrCodeLogo"
                    type="checkbox"
                    bind:checked={showQrCodeLogo}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label for="checkQrCodeLogo" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                    Show Logo
                </label>
            </div>

            <div class="checkbox-row">
                <input
                    id="checkClickReload"
                    type="checkbox"
                    bind:checked={clickQrcodeReload}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label for="checkClickReload" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                    Click QR code to reload
                </label>
            </div>

            <div class="checkbox-row">
                <input
                    id="checkHeader"
                    type="checkbox"
                    bind:checked={showHeader}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label for="checkHeader" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                    Show header
                </label>
            </div>

            <div class="checkbox-row">
                <input
                    id="checkDownloadButton"
                    type="checkbox"
                    bind:checked={showDownloadButton}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label for="checkDownloadButton" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                    Show download button
                </label>
            </div>

            <div class="flex items-center mt-2">
                <label for="headerText" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-25 text-left">
                    Header text
                </label>
                <input
                    id="headerText"
                    type="text"
                    bind:value={headerText}
                    class="w-60 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-400"
                    placeholder="Enter header text"
                />
            </div>

            <div class="flex flex-col gap-0 mt-2">
                <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">File preview mode</div>
                <div class="flex flex-row items-start mt-2 space-x-4">
                    <label class="flex items-center cursor-pointer group">
                        <input
                            type="radio"
                            bind:group={filePreviewMode}
                            value="list"
                            name="file-preview-mode"
                            class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors"> List </span>
                    </label>
                    <label class="flex items-center cursor-pointer group">
                        <input
                            type="radio"
                            bind:group={filePreviewMode}
                            value="grid"
                            name="file-preview-mode"
                            class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors"> Grid </span>
                    </label>
                </div>
            </div>

            <div class="flex flex-col gap-0 mt-2">
                <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">Qr Code size</div>
                <div class="flex flex-row items-start mt-2 space-x-4">
                    {#each sizeOptions as size (size.value)}
                        <!-- items-start keeps the radio at the top of
                             the label regardless of whether the text
                             wraps ("Extra Large" wraps to two lines).
                             We pin the radio with `self-start` and
                             use `m-0` to override any user-agent
                             margin that could shift it down on
                             taller labels. `shrink-0` keeps the
                             radio at its natural 16×16 size even if
                             the surrounding flex row gets tight. -->
                        <label class="flex items-start cursor-pointer group">
                            <input
                                type="radio"
                                bind:group={qrCodeSize}
                                value={size.value}
                                name="qr-code-size"
                                class="h-4 w-4 shrink-0 self-start m-0 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                {size.label}
                            </span>
                        </label>
                    {/each}
                </div>
            </div>
        </div>
    </div>

    <div class="mb-6">
        <QrCodeGenerator
            {sessionUrl}
            {clientId}
            {showHeader}
            header={headerText}
            size={qrCodeSize}
            showLogo={showQrCodeLogo}
            clickQrCodeToReload={clickQrcodeReload}
            {filePreviewMode}
            {showDownloadButton}
        />
    </div>
</div>
<p class="demo-back-link">
    <a href="https://app.scanupload.net/" class="text-blue-600 hover:text-blue-800 underline"> Back to ScanUpload </a>
</p>
