<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';

	// Komponen ini menerima satu tugas dan nama kolomnya
	let { task, columnName, isDesktop } = $props<{
		task: any;
		columnName: string;
		isDesktop: boolean;
	}>();

	const dispatch = createEventDispatcher();

	// State lokal untuk mengontrol accordion
	let isExpanded = $state(false);

	// Fungsi untuk memindahkan tugas (tidak berubah)
	function handleMove(destinationColumnName: string) {
		dispatch('move', {
			taskId: task.id,
			destinationColumnName: destinationColumnName
		});
	}
</script>

<div
	class="bg-white p-4 rounded-lg shadow-md border-t-4 border-purple-500 transition-shadow hover:shadow-lg"
	class:cursor-grab={isDesktop}
	class:active:cursor-grabbing={isDesktop}
	role="button"
	tabindex="0"
>
	<!-- Bagian Atas: Judul, Pemilik & Tombol Accordion -->
	<div class="flex justify-between items-start gap-2">
		<div class="flex-1">
			<h4 class="font-bold text-gray-800 leading-tight">{task.title}</h4>
			<p class="text-xs text-gray-500 mt-1">
				Untuk: {task.assignee_profile?.username || 'Belum ditugaskan'}
			</p>
		</div>
		<button
			on:click|stopPropagation={() => (isExpanded = !isExpanded)}
			class="p-1 flex-shrink-0 text-gray-500 hover:bg-gray-200 rounded-full"
			aria-label="Tampilkan detail"
		>
			<!-- ======================================================= -->
			<!-- BAGIAN YANG DIPERBAIKI: IKON DIBUNGKUS SPAN -->
			<!-- ======================================================= -->
			<span class="transition-transform duration-200 block" class:rotate-180={isExpanded}>
				<ChevronDown size={20} />
			</span>
		</button>
	</div>

	<!-- Bagian Accordion: Detail yang tersembunyi -->
	{#if isExpanded}
		<div class="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm">
			{#if task.description}
				<p class="text-gray-600">{task.description}</p>
			{/if}
			<div class="text-xs text-gray-500 space-y-1">
				<p><span class="font-medium">Prioritas:</span> {task.priority || 'Normal'}</p>
				<p>
					<span class="font-medium">Tenggat:</span>
					{task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : 'N/A'}
				</p>
			</div>
		</div>
	{/if}

	<!-- Tombol Aksi Utama (selalu terlihat) -->
	<div class="flex flex-wrap gap-2 mt-4">
		{#if columnName.toLowerCase() === 'to do'}
			<button
				on:click|stopPropagation={() => handleMove('In Progress')}
				class="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-blue-600"
			>
				Kerjakan
			</button>
		{:else if columnName.toLowerCase() === 'in progress'}
			<button
				on:click|stopPropagation={() => handleMove('Done')}
				class="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-green-600"
			>
				Selesai
			</button>
		{/if}

		<button
			on:click|stopPropagation={() => dispatch('edit', task)}
			class="bg-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-yellow-600"
		>
			Edit
		</button>
		<button
			on:click|stopPropagation={() => dispatch('delete', task)}
			class="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-red-600"
		>
			Hapus
		</button>
	</div>
</div>
