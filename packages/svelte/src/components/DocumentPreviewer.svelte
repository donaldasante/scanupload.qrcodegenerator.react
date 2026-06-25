<script lang="ts">
    import type { UploadedFile } from '@scanupload/qr-code-generator-core';
    import { getFileExtension, getFileIconSvg } from '../file-icons';
    import { REMOVE_SVG } from '../icons';
    import ProgressBar from './ProgressBar.svelte';

    interface Props {
        file: UploadedFile;
        showExtension?: boolean;
        showRemoveButton?: boolean;
        onRemove?: (fileId: string) => void;
    }

    let { file, showExtension = true, showRemoveButton = false, onRemove = () => {} }: Props = $props();

    let extension = $derived(getFileExtension(file.name));
    let iconSvg = $derived(getFileIconSvg(extension, 40));
</script>

<div class="sqg-file-card">
    <div class="sqg-file-inner">
        {#if file.thumbnailBase64}
            <div class="sqg-thumb-wrap">
                <img src={`data:${file.type};base64,${file.thumbnailBase64}`} class="sqg-thumb-img" alt={file.name} />
            </div>
        {:else}
            <div class="sqg-icon-wrap" data-filetype={extension}>{@html iconSvg}</div>
            {#if showExtension && extension}
                <div class="sqg-ext-badge"><span>{extension.toUpperCase()}</span></div>
            {/if}
        {/if}
        <div class="sqg-file-info">
            <div class="sqg-file-meta">
                <p class="sqg-file-name" title={file.name}>{file.name}</p>
                <p class="sqg-file-size">({(file.size / 1024).toFixed(1)} KB)</p>
            </div>
            {#if showRemoveButton}
                <button class="sqg-remove-btn" aria-label="Remove File" onclick={() => onRemove(file.id)}>
                    {@html REMOVE_SVG}
                </button>
            {/if}
        </div>
        <ProgressBar progress={file.progress} />
    </div>
</div>
