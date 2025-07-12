<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import { get } from 'svelte/store';
	import {
		Clock,
		Download,
		BarChart2,
		BrainCircuit,
		ClipboardList,
		ClipboardCheck,
		ClipboardX,
		Folder,
		FolderPlus
	} from '@lucide/svelte';

	let { data } = $props<PageData>();
	const supabase = get(supabaseClientStore);

	// State untuk UI Analitik Fokus
	let chartCanvas: HTMLCanvasElement;
	let chartInstance: any = null;
	let activeFilter = $state<'day' | 'week' | 'month'>('week');
	let analyticsData = $state(data.initialAnalytics || []);
	let isLoading = $state(false);
	let isChartReady = $state(false);

	// PERBAIKAN: Menggunakan $state dan $effect untuk kalkulasi yang lebih robust
	let summaryStats = $state({ totalMinutes: 0, totalSessions: 0 });

	// Debug: Log data yang diterima
	console.log('Initial analytics data:', data.initialAnalytics);

	$effect(() => {
		if (!analyticsData || analyticsData.length === 0) {
			summaryStats = { totalMinutes: 0, totalSessions: 0 };
		} else {
			summaryStats = analyticsData.reduce(
				(acc, curr) => {
					acc.totalMinutes += Number(curr.total_focus_minutes) || 0;
					acc.totalSessions += Number(curr.session_count) || 0;
					return acc;
				},
				{ totalMinutes: 0, totalSessions: 0 }
			);
		}
	});

	// PERBAIKAN: Fungsi untuk memuat Chart.js secara dinamis
	function loadChartJS() {
		return new Promise((resolve) => {
			if (typeof (window as any).Chart !== 'undefined') {
				resolve(true);
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
			script.onload = () => resolve(true);
			document.head.appendChild(script);
		});
	}

	// PERBAIKAN: Fungsi untuk membuat atau memperbarui chart
	async function createOrUpdateChart() {
		if (!chartCanvas || !analyticsData) return;

		// Pastikan Chart.js sudah dimuat
		if (!isChartReady) {
			await loadChartJS();
			isChartReady = true;
		}

		// Debug: Log data yang akan digunakan untuk chart
		console.log('Chart data:', analyticsData);

		const labels = analyticsData.map((d) => {
			const date = new Date(d.time_bucket);
			if (activeFilter === 'day') {
				return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
			}
			return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
		});

		const minutesData = analyticsData.map((d) => Number(d.total_focus_minutes) || 0);

		// Debug: Log labels dan data
		console.log('Chart labels:', labels);
		console.log('Chart minutes data:', minutesData);

		if (chartInstance) {
			chartInstance.data.labels = labels;
			chartInstance.data.datasets[0].data = minutesData;
			chartInstance.update();
		} else {
			chartInstance = new (window as any).Chart(chartCanvas, {
				type: 'bar',
				data: {
					labels: labels,
					datasets: [
						{
							label: 'Menit Fokus',
							data: minutesData,
							backgroundColor: 'rgba(139, 92, 246, 0.2)',
							borderColor: 'rgba(139, 92, 246, 1)',
							borderWidth: 2,
							borderRadius: 8,
							barThickness: 20
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true,
							title: { display: true, text: 'Menit' }
						},
						x: {
							grid: { display: false }
						}
					},
					plugins: {
						legend: { display: false }
					}
				}
			});
		}
	}

	async function handleFilterChange(newFilter: 'day' | 'week' | 'month') {
		if (isLoading) return;
		isLoading = true;
		activeFilter = newFilter;

		const userTimezone = 'Asia/Jakarta';
		let days = 7;
		let groupBy = 'day';

		if (newFilter === 'day') {
			days = 1;
			groupBy = 'hour';
		} else if (newFilter === 'month') {
			days = 30;
		}

		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - (days - 1));

		if (days > 1) {
			startDate.setHours(0, 0, 0, 0);
		} else {
			startDate.setHours(0, 0, 0, 0);
		}

		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (!user) {
			isLoading = false;
			return;
		}

		// Debug: Log parameters yang dikirim
		console.log('RPC Parameters:', {
			p_user_id: user.id,
			p_start_date: startDate.toISOString(),
			p_end_date: endDate.toISOString(),
			p_group_by_unit: groupBy,
			p_timezone: userTimezone
		});

		const { data: newData, error } = await supabase.rpc('get_personal_analytics', {
			p_user_id: user.id,
			p_start_date: startDate.toISOString(),
			p_end_date: endDate.toISOString(),
			p_group_by_unit: groupBy,
			p_timezone: userTimezone
		});

		if (error) {
			console.error('Failed to fetch new analytics data:', error);
			analyticsData = [];
		} else {
			console.log('New analytics data:', newData);
			analyticsData = newData || [];
		}

		isLoading = false;
	}

	function downloadCSV() {
		if (!analyticsData || analyticsData.length === 0) {
			console.log('No data to download');
			return;
		}

		const headers = ['Waktu', 'Total Menit Fokus', 'Jumlah Sesi'];
		const rows = analyticsData.map((d) => [
			`"${new Date(d.time_bucket).toLocaleString('id-ID')}"`,
			d.total_focus_minutes,
			d.session_count
		]);

		let csvContent =
			'data:text/csv;charset=utf-8,' +
			headers.join(',') +
			'\n' +
			rows.map((e) => e.join(',')).join('\n');

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `laporan_fokus_${activeFilter}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	onMount(async () => {
		// Tunggu Chart.js dimuat sebelum membuat chart
		await loadChartJS();
		isChartReady = true;
		createOrUpdateChart();
	});

	$effect(() => {
		// Efek ini akan berjalan setiap kali analyticsData berubah
		if (analyticsData && isChartReady) {
			createOrUpdateChart();
		}
	});

	onDestroy(() => {
		if (chartInstance) {
			chartInstance.destroy();
		}
	});
</script>

<svelte:head>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</svelte:head>

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
					<BrainCircuit class="text-purple-600" />
					Dashboard Produktivitas
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
							: 'text-gray-600 hover:bg-gray-200'}"
					>
						{filter.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Debug Information -->
		{#if analyticsData && analyticsData.length > 0}
			<div class="mb-4 p-2 bg-green-50 rounded text-sm text-green-700">
				Data ditemukan: {analyticsData.length} entries
			</div>
		{:else}
			<div class="mb-4 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
				Tidak ada data analytics yang ditemukan
			</div>
		{/if}

		<!-- Grid Statistik -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Kolom Kiri: Statistik Tugas & Proyek -->
			<div class="lg:col-span-1 space-y-6">
				<!-- Kartu Tugas -->
				<div class="bg-gray-50 p-4 rounded-lg">
					<h3 class="font-bold text-gray-700 mb-3">Tugas Bulan Ini</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><ClipboardList class="text-blue-500" />Rencana</span
							>
							<span class="font-bold text-lg">{data.monthlyStats.toDo}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><ClipboardX class="text-yellow-500" />Dikerjakan</span
							>
							<span class="font-bold text-lg">{data.monthlyStats.inProgress}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><ClipboardCheck class="text-green-500" />Selesai</span
							>
							<span class="font-bold text-lg">{data.monthlyStats.done}</span>
						</div>
					</div>
				</div>
				<!-- Kartu Proyek -->
				<div class="bg-gray-50 p-4 rounded-lg">
					<h3 class="font-bold text-gray-700 mb-3">Proyek Anda</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><FolderPlus class="text-purple-500" />Diinisiasi</span
							>
							<span class="font-bold text-lg">{data.projectStats.initiated}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm text-gray-600"
								><Folder class="text-teal-500" />Diundang</span
							>
							<span class="font-bold text-lg">{data.projectStats.invited}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Kolom Kanan: Analitik Fokus -->
			<div class="lg:col-span-2 bg-gray-50 p-4 rounded-lg">
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
					<div class="bg-white p-3 rounded-lg flex items-center gap-3">
						<Clock class="w-8 h-8 text-purple-600" />
						<div>
							<p class="text-xs text-gray-500">Waktu Fokus</p>
							<p class="text-xl font-bold text-gray-800">
								{Math.floor(summaryStats.totalMinutes / 60)}j {summaryStats.totalMinutes % 60}m
							</p>
						</div>
					</div>
					<div class="bg-white p-3 rounded-lg flex items-center gap-3">
						<BarChart2 class="w-8 h-8 text-green-600" />
						<div>
							<p class="text-xs text-gray-500">Sesi Selesai</p>
							<p class="text-xl font-bold text-gray-800">{summaryStats.totalSessions}</p>
						</div>
					</div>
					<div class="bg-white p-3 rounded-lg flex items-center">
						<button
							onclick={downloadCSV}
							class="w-full flex items-center justify-center gap-2 text-sm text-gray-600 font-semibold hover:text-purple-600"
						>
							<Download class="w-5 h-5" />
							<span>Unduh</span>
						</button>
					</div>
				</div>
				<div class="h-64 md:h-72 relative">
					{#if isLoading}
						<div class="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
							<p class="text-purple-600 font-semibold animate-pulse">Memuat data...</p>
						</div>
					{/if}
					<canvas bind:this={chartCanvas}></canvas>
				</div>
			</div>
		</div>
	</div>
</div>
