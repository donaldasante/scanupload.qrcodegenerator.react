<script lang="ts">
    import { QR_SCANNER_SVG } from '../icons';

    interface Props {
        isConnected?: boolean;
    }

    let { isConnected = false }: Props = $props();
</script>

<span class={isConnected ? 'sqg-logo sqg-logo--connected' : 'sqg-logo sqg-logo--disconnected'}>
    {@html QR_SCANNER_SVG}
</span>
