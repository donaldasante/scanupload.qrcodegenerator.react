<script lang="ts">
    import type { UploadedFile } from '@scanupload/qr-code-generator-core';
    import { getGenericDocIconSvg } from '../file-icons';

    interface Props {
        files: UploadedFile[];
    }

    let { files }: Props = $props();

    const docIcon = getGenericDocIconSvg(24);
</script>

<div class="sqg-file-list">
    <div class="sqg-file-list-inner">
        {#each files as file (file.id)}
            <div class="sqg-file-row">
                <div class="sqg-list-thumb">
                    {#if file.thumbnailBase64}
                        <img src={`data:${file.type};base64,${file.thumbnailBase64}`} alt={file.name} />
                    {:else}
                        <span>{@html docIcon}</span>
                    {/if}
                </div>
                <div class="sqg-list-info">
                    <span class="sqg-list-name" title={file.name}>{file.name}</span>
                    <span class="sqg-list-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
            </div>
        {/each}
    </div>
</div>
