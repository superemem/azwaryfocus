<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import TaskCard from './TaskCard.svelte';

	export let column: any;
	export let tasks: any[] = [];
	export let allColumns: any[] = []; // Add this to pass column data

	const dispatch = createEventDispatcher();

	function toDndItems(tasks: any[]) {
		return tasks.map((t) => ({ id: t.id, ...t }));
	}

	function findColumnIdByName(columnName: string) {
		const foundColumn = allColumns.find(
			(col) => col.name.toLowerCase() === columnName.toLowerCase()
		);
		return foundColumn ? foundColumn.id : null;
	}

	function handleConsider(event: CustomEvent) {
		// Update local tasks during drag
		tasks = event.detail.items;
	}

	function handleFinalize(event: CustomEvent) {
		const { items, info } = event.detail;

		// Update local tasks
		tasks = items;

		// If item was moved to a different zone
		if (info.source !== info.trigger) {
			const movedItem = items.find((item) => item.id === info.id);
			if (movedItem) {
				dispatch('move', {
					id: movedItem.id,
					toColumnId: column.id
				});
			}
		}
	}

	function handleTaskMove(event: CustomEvent) {
		const { taskId, destinationColumn } = event.detail;
		const destinationColumnId = findColumnIdByName(destinationColumn);

		if (destinationColumnId) {
			dispatch('move', {
				id: taskId,
				toColumnId: destinationColumnId
			});
		}
	}
</script>

<div class="flex-shrink-0 min-w-72 w-80 bg-gray-200 p-4 rounded-xl shadow-inner">
	<h3 class="font-bold text-xl mb-4 text-gray-700 uppercase tracking-wide">
		{column.name} ({tasks.length})
	</h3>

	<div
		use:dndzone={{
			items: toDndItems(tasks),
			flipDurationMs: 200,
			type: 'task',
			dropTargetStyle: {},
			dragDisabled: false
		}}
		on:consider={handleConsider}
		on:finalize={handleFinalize}
		class="space-y-4 min-h-[100px] flex flex-col"
		data-zone-id={column.id}
	>
		{#each tasks as task (task.id)}
			<TaskCard
				{task}
				columnName={column.name}
				on:edit={(e) => dispatch('edit', e.detail)}
				on:delete={(e) => dispatch('delete', e.detail)}
				on:move={handleTaskMove}
			/>
		{/each}
	</div>
</div>
