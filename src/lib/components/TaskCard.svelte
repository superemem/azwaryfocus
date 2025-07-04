<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let task;
	export let columnName: string;

	const dispatch = createEventDispatcher();

	function handleEdit() {
		dispatch('edit', task);
	}

	function handleDelete() {
		dispatch('delete', task.id);
	}

	function handleMove(destinationColumn: string) {
		dispatch('move', {
			taskId: task.id,
			destinationColumn
		});
	}
</script>

<div
	data-task-id={task.id}
	class="bg-white p-4 rounded-lg shadow-md border-t-4 border-blue-500 cursor-grab active:cursor-grabbing"
	on:click={handleEdit}
	role="button"
	tabindex="0"
	on:keydown={(e) => e.key === 'Enter' && handleEdit()}
>
	<h4 class="font-semibold text-gray-900 mb-1">{task.title}</h4>
	<p class="text-sm text-gray-600 mb-2">{task.description}</p>
	<div class="text-xs text-gray-500 space-y-1">
		<p><span class="font-medium">Prioritas:</span> {task.priority || 'Normal'}</p>
		<p>
			<span class="font-medium">Tenggat:</span>
			{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
		</p>
		<p>
			<span class="font-medium">Ditugaskan ke:</span>
			{task.assignee_profile?.username || 'Belum ditugaskan'}
		</p>
		<p>
			<span class="font-medium">Dibuat oleh:</span>
			{task.created_by_profile?.username || 'Unknown'}
		</p>
	</div>

	<div class="flex flex-wrap gap-2 mt-4">
		{#if columnName.toLowerCase() === 'to do'}
			<button
				on:click|stopPropagation={() => handleMove('In Progress')}
				class="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-blue-600"
			>
				Kerjakan Tugas
			</button>
		{:else if columnName.toLowerCase() === 'in progress'}
			<button
				on:click|stopPropagation={() => handleMove('Done')}
				class="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-green-600"
			>
				Tandai Selesai
			</button>
		{/if}

		<button
			on:click|stopPropagation={handleEdit}
			class="bg-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-yellow-600"
		>
			Edit
		</button>
		<button
			on:click|stopPropagation={() => handleDelete()}
			class="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-red-600"
		>
			Hapus
		</button>
	</div>
</div>
