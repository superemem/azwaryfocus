<script lang="ts">
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';
	import type { PageData } from './$types';

	// 1. TERIMA DATA DARI SERVER & LAYOUT
	// data.project & data.projectId datang dari +page.server.ts di atas.
	// data.session datang dari root +layout.server.ts.
	let { data } = $props<PageData>();
</script>

<svelte:head>
	<title>{data.project?.name || 'Proyek'} - Papan Kanban</title>
</svelte:head>

<!-- 
  Tidak perlu lagi #if loading atau #if error di sini.
  Jika ada error di server, SvelteKit akan otomatis menampilkan halaman error.
  Jika berhasil, kita langsung render KanbanBoard.
  KanbanBoard sendiri sudah punya state loading/error internal dari kanbanLogic.
-->
<div class="p-6">
	{#if data.session}
		<!-- ======================================================= -->
		<!-- BAGIAN YANG DIPERBAIKI: OPER `profile` KE KANBANBOARD -->
		<!-- ======================================================= -->
		<KanbanBoard projectId={data.projectId} session={data.session} profile={data.profile} />
	{:else}
		<p class="text-center text-gray-500">Memuat sesi...</p>
	{/if}
</div>
