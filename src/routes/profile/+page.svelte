<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import { get } from 'svelte/store';
	import {
		Clock,
		Download,
		TrendingUp,
		BrainCircuit,
		ClipboardList,
		ClipboardCheck,
		ClipboardX,
		Folder,
		FolderPlus,
		PieChart,
		ListChecks,
		Target
	} from '@lucide/svelte';

	let { data } = $props<PageData>();
	const supabase = get(supabaseClientStore);

	// State untuk UI Analitik
	let timelineChartCanvas: HTMLCanvasElement;
	let projectChartCanvas: HTMLCanvasElement;
	let taskChartCanvas: HTMLCanvasElement;
	let timelineChartInstance: any = null;
	let projectChartInstance: any = null;
	let taskChartInstance: any = null;

	let activeFilter = $state<'day' | 'week' | 'month'>('week');
	let projectBreakdown = $state(data.initialAnalytics.projectBreakdown || []);
	let taskBreakdown = $state(data.initialAnalytics.taskBreakdown || []);
	let productivityTimeline = $state(data.initialAnalytics.productivityTimeline || []);
	let isLoading = $state(false);
	let isChartReady = $state(false);

	// Statistik ringkasan dihitung dari productivityTimeline agar sinkron dengan bar chart
	let summaryStats = $state({ totalSeconds: 0, totalSessions: 0 });
	$effect(() => {
		if (!productivityTimeline || productivityTimeline.length === 0) {
			summaryStats = { totalSeconds: 0, totalSessions: 0 };
		} else {
			summaryStats = productivityTimeline.reduce(
				(acc, curr) => {
					// Kalkulasi dalam detik
					acc.totalSeconds += (Number(curr.total_focus_minutes) || 0) * 60;
					acc.totalSessions += Number(curr.total_sessions) || 0;
					return acc;
				},
				{ totalSeconds: 0, totalSessions: 0 }
			);
		}
	});

	// PERBAIKAN: Fungsi format durasi yang lebih sederhana dan bekerja dengan detik
	function formatDuration(totalSeconds: number) {
		if (isNaN(totalSeconds) || totalSeconds < 0) {
			return '00:00:00';
		}
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = Math.floor(totalSeconds % 60);

		const paddedHours = String(hours).padStart(2, '0');
		const paddedMinutes = String(minutes).padStart(2, '0');
		const paddedSeconds = String(seconds).padStart(2, '0');

		return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
	}

	// --- Fungsi-fungsi Chart ---
	async function initCharts() {
		if (!isChartReady) {
			await new Promise((resolve) => {
				if (typeof (window as any).Chart !== 'undefined') return resolve(true);
				const script = document.createElement('script');
				script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
				script.onload = () => resolve(true);
				document.head.appendChild(script);
			});
			isChartReady = true;
		}
		createOrUpdateTimelineChart();
		createOrUpdateProjectChart();
		createOrUpdateTaskChart();
	}

	// 1. Stacked Bar Chart untuk Linimasa Produktivitas
	function createOrUpdateTimelineChart() {
		if (!timelineChartCanvas || !productivityTimeline || !isChartReady) return;

		const timeBuckets = [...new Set(productivityTimeline.map((d) => d.time_bucket))].sort();
		const projects = [...new Set(productivityTimeline.map((d) => d.project_name))];
		const projectColors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

		const datasets = projects.map((projectName, index) => {
			return {
				label: projectName,
				data: timeBuckets.map((bucket) => {
					const entry = productivityTimeline.find(
						(d) => d.time_bucket === bucket && d.project_name === projectName
					);
					return entry ? entry.total_focus_minutes : 0;
				}),
				backgroundColor: projectColors[index % projectColors.length]
			};
		});

		const labels = timeBuckets.map((bucket) =>
			new Date(bucket).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
		);

		if (timelineChartInstance) {
			timelineChartInstance.data.labels = labels;
			timelineChartInstance.data.datasets = datasets;
			timelineChartInstance.update();
		} else {
			timelineChartInstance = new (window as any).Chart(timelineChartCanvas, {
				type: 'bar',
				data: { labels, datasets },
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						x: { stacked: true },
						y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Menit Fokus' } }
					},
					plugins: { legend: { position: 'bottom', labels: { padding: 15 } } }
				}
			});
		}
	}

	// 2. Donut Chart untuk Distribusi Proyek
	function createOrUpdateProjectChart() {
		if (!projectChartCanvas || !isChartReady) return;

		// PERBAIKAN: Kosongkan data chart, jangan dihancurkan
		if (projectBreakdown.length === 0) {
			if (projectChartInstance) {
				projectChartInstance.data.labels = [];
				projectChartInstance.data.datasets[0].data = [];
				projectChartInstance.update();
			}
			return;
		}

		const labels = projectBreakdown.map((p) => p.project_name);
		const data = projectBreakdown.map((p) => Number(p.total_focus_minutes) || 0);

		if (projectChartInstance) {
			projectChartInstance.data.labels = labels;
			projectChartInstance.data.datasets[0].data = data;
			projectChartInstance.update();
		} else {
			projectChartInstance = new (window as any).Chart(projectChartCanvas, {
				type: 'doughnut',
				data: {
					labels,
					datasets: [
						{
							data,
							backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
							borderWidth: 2,
							borderColor: '#f9fafb'
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					cutout: '60%',
					plugins: { legend: { display: false } }
				}
			});
		}
	}

	// 3. Horizontal Bar Chart untuk Peringkat Tugas
	function createOrUpdateTaskChart() {
		if (!taskChartCanvas || !isChartReady) return;

		if (taskBreakdown.length === 0) {
			if (taskChartInstance) {
				taskChartInstance.destroy();
				taskChartInstance = null;
			}
			return;
		}

		const topTasks = taskBreakdown.slice(0, 7);
		const labels = topTasks.map((t) =>
			t.task_title.length > 25 ? t.task_title.substring(0, 25) + '...' : t.task_title
		);
		const data = topTasks.map((t) => Number(t.total_focus_minutes) || 0);

		if (taskChartInstance) {
			taskChartInstance.data.labels = labels;
			taskChartInstance.data.datasets[0].data = data;
			taskChartInstance.update();
		} else {
			taskChartInstance = new (window as any).Chart(taskChartCanvas, {
				type: 'bar',
				data: {
					labels,
					datasets: [
						{
							data,
							backgroundColor: 'rgba(16, 185, 129, 0.2)',
							borderColor: 'rgba(16, 185, 129, 1)',
							borderWidth: 2,
							borderRadius: 6
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					indexAxis: 'y',
					scales: {
						x: { beginAtZero: true, title: { display: true, text: 'Menit' } },
						y: { grid: { display: false } }
					},
					plugins: { legend: { display: false } }
				}
			});
		}
	}

	async function handleFilterChange(newFilter: 'day' | 'week' | 'month') {
		if (isLoading) return;
		isLoading = true;
		activeFilter = newFilter;

		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (!user) {
			isLoading = false;
			return;
		}

		const days = newFilter === 'day' ? 1 : newFilter === 'week' ? 7 : 30;
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - (days - 1));
		startDate.setHours(0, 0, 0, 0);

		const timeRangeParams = {
			p_user_id: user.id,
			p_start_date: startDate.toISOString(),
			p_end_date: endDate.toISOString(),
			p_timezone: 'Asia/Jakarta'
		};

		const [projectResult, taskResult, timelineResult] = await Promise.all([
			supabase.rpc('get_project_pomodoro_breakdown', timeRangeParams),
			supabase.rpc('get_task_pomodoro_breakdown', { ...timeRangeParams, p_project_id: null }),
			supabase.rpc('get_project_productivity_timeline', {
				...timeRangeParams,
				p_group_by_unit: newFilter === 'day' ? 'hour' : 'day'
			})
		]);

		projectBreakdown = projectResult.data || [];
		taskBreakdown = taskResult.data || [];
		productivityTimeline = timelineResult.data || [];

		isLoading = false;
	}

	onMount(initCharts);

	$effect(() => {
		if (isChartReady) {
			createOrUpdateTimelineChart();
			createOrUpdateProjectChart();
			createOrUpdateTaskChart();
		}
	});

	onDestroy(() => {
		timelineChartInstance?.destroy();
		projectChartInstance?.destroy();
		taskChartInstance?.destroy();
	});
</script>

<div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
	<!-- Header Profil -->
	<div class="flex flex-col sm:flex-row items-center gap-6">
		<img
			src={data.profile.avatar_url ||
				`https://api.dicebear.com/8.x/initials/svg?seed=${data.profile.username}`}
			alt="Avatar"
			class="w-24 h-24 rounded-full border-4 border-purple-200 shadow-lg"
		/>
		<div>
			<h1 class="text-3xl sm:text-4xl font-bold text-gray-800 text-center sm:text-left">
				{data.profile.username || 'Pengguna'}
			</h1>
			<p class="text-gray-500 text-center sm:text-left">
				{data.session.user.email || 'Email tidak tersedia'}
			</p>
		</div>
	</div>

	<!-- Dashboard Produktivitas -->
	<div class="bg-white p-6 rounded-2xl shadow-lg">
		<div
			class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-6 border-gray-200"
		>
			<div>
				<h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
					<BrainCircuit class="text-purple-600" />Dashboard Produktivitas
				</h2>
				<p class="text-gray-500">Analisis kebiasaan fokus dan progres pekerjaan Anda.</p>
			</div>
			<div
				class="flex items-center bg-gray-100 p-1 rounded-lg mt-4 md:mt-0 self-start md:self-center"
			>
				{#each [{ label: 'Harian', value: 'day' }, { label: 'Mingguan', value: 'week' }, { label: 'Bulanan', value: 'month' }] as filter}
					<button
						onclick={() => handleFilterChange(filter.value)}
						class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors {activeFilter ===
						filter.value
							? 'bg-purple-600 text-white shadow'
							: 'text-gray-600 hover:bg-gray-200'}">{filter.label}</button
					>
				{/each}
			</div>
		</div>

		<!-- Grid Statistik -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Kolom Kiri: Statistik Tugas & Proyek -->
			<div class="lg:col-span-1 space-y-6">
				<div class="bg-gray-50 p-4 rounded-lg">
					<h3 class="font-bold text-gray-700 mb-3">Tugas Bulan Ini</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><ClipboardList class="text-blue-500" />Rencana</span
							> <span class="font-bold text-lg">{data.monthlyStats.toDo}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><ClipboardX class="text-yellow-500" />Dikerjakan</span
							> <span class="font-bold text-lg">{data.monthlyStats.inProgress}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><ClipboardCheck class="text-green-500" />Selesai</span
							> <span class="font-bold text-lg">{data.monthlyStats.done}</span>
						</div>
					</div>
				</div>
				<div class="bg-gray-50 p-4 rounded-lg">
					<h3 class="font-bold text-gray-700 mb-3">Proyek Anda</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><FolderPlus class="text-purple-500" />Diinisiasi</span
							> <span class="font-bold text-lg">{data.projectStats.initiated}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><Folder class="text-teal-500" />Diundang</span
							> <span class="font-bold text-lg">{data.projectStats.invited}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Kolom Kanan: Analitik Fokus -->
			<div class="lg:col-span-2 bg-gray-50 p-4 rounded-lg">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
					<div class="bg-white p-3 rounded-lg flex items-center gap-3">
						<Clock class="w-8 h-8 text-purple-600" />
						<div>
							<p class="text-xs text-gray-500">Waktu Fokus</p>
							<p class="text-xl font-bold text-gray-800 tabular-nums">
								{formatDuration(summaryStats.totalSeconds)}
							</p>
						</div>
					</div>
					<div class="bg-white p-3 rounded-lg flex items-center gap-3">
						<Target class="w-8 h-8 text-green-600" />
						<div>
							<p class="text-xs text-gray-500">Total Sesi</p>
							<p class="text-xl font-bold text-gray-800">{summaryStats.totalSessions}</p>
						</div>
					</div>
				</div>
				<div class="h-64 md:h-72 relative mb-6">
					<h4 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
						<TrendingUp size={20} />Linimasa Produktivitas
					</h4>
					<canvas bind:this={timelineChartCanvas}></canvas>
				</div>

				<!-- UI Analitik Tugas & Proyek BARU -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
					<!-- Donut Chart Proyek -->
					<div>
						<h4 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
							<PieChart size={20} />Distribusi Proyek
						</h4>
						<div class="h-64 relative">
							{#if isLoading}
								<div
									class="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg"
								>
									<p class="text-purple-600 font-semibold animate-pulse">Memuat...</p>
								</div>
							{:else if projectBreakdown.length > 0}
								<canvas bind:this={projectChartCanvas}></canvas>
							{:else}
								<div class="flex items-center justify-center h-full text-gray-500">
									Tidak ada data proyek.
								</div>
							{/if}
						</div>
					</div>
					<!-- Daftar Top Tugas -->
					<div>
						<h4 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
							<ListChecks size={20} />Tugas Paling Fokus
						</h4>
						<div class="h-64 space-y-2 overflow-y-auto">
							{#if isLoading}
								<div class="text-center text-gray-500 pt-16">Memuat...</div>
							{:else if taskBreakdown.length > 0}
								{#each taskBreakdown.slice(0, 7) as task}
									<div class="bg-white p-3 rounded-lg text-sm">
										<p class="font-semibold text-gray-800 truncate" title={task.task_title}>
											{task.task_title}
										</p>
										<div class="flex justify-between items-center text-gray-500">
											<span class="truncate pr-2" title={task.project_name}
												>{task.project_name}</span
											>
											<span class="font-bold text-purple-600 whitespace-nowrap"
												>{Math.round(Number(task.total_focus_minutes) || 0)} mnt</span
											>
										</div>
									</div>
								{/each}
							{:else}
								<div class="flex items-center justify-center h-full text-gray-500 pt-16">
									Tidak ada data tugas.
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
