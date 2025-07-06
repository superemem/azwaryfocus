<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/authStore';
	import { selectedProjectId, selectedProject } from '$lib/stores/projectStore';
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';

	// Terima data dari +page.server.ts
	// Sekarang data juga mengandung projectCreator & teamMembers
	export let data: {
		projectId: string;
		project: any;
		columnsData: any[];
		tasksData: any[];
		profiles: any[];
		projectCreator: string;
		teamMembers: string[];
	};

	let loading = true;
	let error: string | null = null;

	// Set selectedProjectId & selectedProject segera
	$: {
		if (data.projectId) {
			selectedProjectId.set(data.projectId);
			selectedProject.set(data.project);
		}
	}

	onMount(() => {
		if (!data.project || (data as any).error) {
			error = (data as any).error || 'Failed to load project.';
			loading = false;
			return;
		}
		loading = false;
	});

	function goBackToProjects() {
		goto('/projects');
	}
</script>

<svelte:head>
	<title>{$selectedProject?.name || 'Project'} - Kanban Board</title>
</svelte:head>

{#if loading}
	<!-- loading state -->
{:else if error}
	<!-- error state -->
{:else if data.projectId}
	<div class="min-h-screen bg-gray-50">
		<!-- breadcrumb / header -->
		<div class="p-6">
			<!-- Pass kedua prop baru ke KanbanBoard -->
			<KanbanBoard
				projectId={data.projectId}
				projectLead={data.projectLead}
				teamMembers={data.teamMembers}
			/>
		</div>
	</div>
{:else}
	<!-- not found state -->
{/if}
