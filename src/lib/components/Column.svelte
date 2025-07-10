<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import TaskCard from './TaskCard.svelte';

	// 1. TERIMA PROPS DENGAN CARA SVELTE 5
	let { column, tasks, allColumns } = $props<{
		column: any;
		tasks: any[];
		allColumns: any[];
	}>();

	const dispatch = createEventDispatcher();

	// 2. STATE UNTUK DETEKSI UKURAN LAYAR
	let isDesktop = $state(false);

	onMount(() => {
		const checkScreenSize = () => {
			isDesktop = window.innerWidth >= 768; // Anggap desktop jika >= 768px (breakpoint md)
		};

		checkScreenSize(); // Cek saat pertama kali render
		window.addEventListener('resize', checkScreenSize); // Cek saat ukuran layar berubah

		return () => {
			window.removeEventListener('resize', checkScreenSize); // Bersihkan saat komponen hilang
		};
	});

	// 3. LOGIKA UNTUK DRAG-AND-DROP (DARI KODE LAMA LO)
	function handleDndConsider(event: CustomEvent) {
		tasks = event.detail.items;
	}

	function handleDndFinalize(event: CustomEvent) {
		const { items, info } = event.detail;
		tasks = items;

		if (info.source !== info.trigger) {
			dispatch('move', { id: info.id, toColumnId: column.id });
		}
	}

	// 4. LOGIKA UNTUK TOMBOL DI DALAM KARTU
	function handleButtonClick(event: CustomEvent) {
		const { taskId, destinationColumnName } = event.detail;
		const destinationColumn = allColumns.find(
			(col) => col.name.toLowerCase() === destinationColumnName.toLowerCase()
		);
		if (destinationColumn) {
			dispatch('move', { id: taskId, toColumnId: destinationColumn.id });
		}
	}
</script>

<div class="flex-shrink-0 w-80 bg-gray-100 p-4 rounded-xl shadow-inner">
	<h3 class="font-bold text-lg mb-4 text-gray-700 uppercase tracking-wide">
		{column.name} ({tasks.length})
	</h3>

	<!-- Implementasi Drag-and-Drop yang Adaptif -->
	<div
		use:dndzone={{
			items: tasks,
			type: 'task',
			dragDisabled: !isDesktop // <-- DND dinonaktifkan jika bukan desktop
		}}
		on:consider={handleDndConsider}
		on:finalize={handleDndFinalize}
		class="space-y-4 min-h-[100px]"
	>
		{#if tasks.length === 0}
			<div class="text-center text-sm text-gray-500 py-10 border-2 border-dashed rounded-lg">
				Kosong
			</div>
		{:else}
			{#each tasks as task (task.id)}
				<TaskCard
					{task}
					columnName={column.name}
					{isDesktop}
					on:edit={(e) => dispatch('edit', e.detail)}
					on:delete={(e) => dispatch('delete', e.detail)}
					on:move={handleButtonClick}
				/>
			{/each}
		{/if}
	</div>
</div>
