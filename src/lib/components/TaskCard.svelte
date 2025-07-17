<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	// <<< BARU: Impor ikon-ikon yang kita butuhkan untuk menu
	import { ChevronDown, MoreHorizontal, Play, CheckCircle2, Pencil, Trash2 } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	let { task, columnName, isDesktop } = $props<{
		task: any;
		columnName: string;
		isDesktop: boolean;
	}>();

	const dispatch = createEventDispatcher();
	let isExpanded = $state(false);
	let isMenuOpen = $state(false);

	// --- LOGIKA PEWARNAAN (Tidak Berubah) ---
	const assignee = $derived(task.profiles || task.assignee_profile);
	const colorPalette = [
		'border-blue-500',
		'border-green-500',
		'border-yellow-500',
		'border-pink-500',
		'border-indigo-500',
		'border-teal-500',
		'border-red-500',
		'border-orange-500',
		'border-purple-500',
		'border-cyan-500',
		'border-lime-500',
		'border-fuchsia-500'
	];
	function getColorFromString(inputString: string | null): string {
		if (!inputString) {
			return 'border-gray-400';
		}
		const charCodeSum = inputString.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
		const index = charCodeSum % colorPalette.length;
		return colorPalette[index];
	}
	const cardColorClass = $derived(getColorFromString(assignee?.username));
	// -----------------------------------------

	function handleMove(destinationColumnName: string) {
		dispatch('move', {
			taskId: task.id,
			destinationColumnName: destinationColumnName
		});
		isMenuOpen = false;
	}

	function handleEdit() {
		dispatch('edit', task);
		isMenuOpen = false;
	}

	function handleDelete() {
		dispatch('delete', task);
		isMenuOpen = false;
	}
</script>

<!-- Terapkan warna HANYA pada border kiri -->
<div
	class="bg-white p-4 rounded-lg shadow-md border-l-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 {cardColorClass} relative"
	class:z-10={isMenuOpen}
	class:cursor-grab={isDesktop}
	class:active:cursor-grabbing={isDesktop}
	role="button"
	tabindex="0"
>
	<div class="flex justify-between items-start gap-2">
		<div class="flex-1">
			<h4 class="font-bold text-gray-800 leading-tight">{task.title}</h4>
			<!-- <<< PERBAIKAN: Menambahkan Avatar di sebelah nama >>> -->
			<div class="flex items-center gap-2 mt-2">
				{#if assignee?.avatar_url}
					<img
						src={assignee.avatar_url}
						alt={assignee.username}
						class="w-5 h-5 rounded-full object-cover"
					/>
				{:else}
					<div
						class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600"
					>
						{assignee?.username?.charAt(0).toUpperCase() || '?'}
					</div>
				{/if}
				<p class="text-xs text-gray-500">
					{assignee?.username || 'Belum ditugaskan'}
				</p>
			</div>
		</div>

		<div class="flex items-center flex-shrink-0 relative">
			<!-- Tombol Tiga Titik -->
			<button
				onclick={(e) => {
					e.stopPropagation();
					isMenuOpen = !isMenuOpen;
				}}
				class="p-2 rounded-full text-gray-500 hover:bg-gray-200"
				title="Aksi Lainnya"
			>
				<MoreHorizontal size={16} />
			</button>

			<!-- Menu Dropdown Aksi -->
			{#if isMenuOpen}
				<div
					class="absolute top-full right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-10"
					transition:fly={{ y: -5, duration: 150 }}
				>
					<div class="py-1">
						{#if columnName.toLowerCase() === 'to do'}
							<button
								onclick={() => handleMove('In Progress')}
								class="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							>
								<Play class="w-4 h-4 mr-3 text-blue-600" />
								<span>Kerjakan</span>
							</button>
						{:else if columnName.toLowerCase() === 'in progress'}
							<button
								onclick={() => handleMove('Done')}
								class="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							>
								<CheckCircle2 class="w-4 h-4 mr-3 text-green-600" />
								<span>Tandai Selesai</span>
							</button>
						{/if}
						<button
							onclick={handleEdit}
							class="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
						>
							<Pencil class="w-4 h-4 mr-3 text-yellow-600" />
							<span>Edit Tugas</span>
						</button>
						<div class="border-t my-1"></div>
						<button
							onclick={handleDelete}
							class="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
						>
							<Trash2 class="w-4 h-4 mr-3" />
							<span>Hapus Tugas</span>
						</button>
					</div>
				</div>
			{/if}

			<!-- Tombol Accordion -->
			<button
				onclick={(e) => {
					e.stopPropagation();
					isExpanded = !isExpanded;
				}}
				class="p-1 text-gray-500 hover:bg-gray-200 rounded-full ml-1"
				aria-label="Tampilkan detail"
			>
				<span class="transition-transform duration-200 block" class:rotate-180={isExpanded}>
					<ChevronDown size={20} />
				</span>
			</button>
		</div>
	</div>

	<!-- Bagian Accordion -->
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
</div>
