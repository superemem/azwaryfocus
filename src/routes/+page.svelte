<script lang="ts">
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';
	import { selectedProjectId } from '$lib/stores/projectStore';
</script>

{#if $selectedProjectId}
	<KanbanBoard projectId={$selectedProjectId} />
{:else}
	<div class="flex flex-col items-center justify-center h-full space-y-4">
		<p class="text-gray-600 text-lg">
			Silakan buat project baru atau pilih project yang sudah ada dari sidebar.
		</p>
	</div>
{/if}
