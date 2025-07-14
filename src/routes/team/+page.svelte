<script lang="ts">
	import type { PageData } from './$types';
	import { FolderKanban, ClipboardCheck } from '@lucide/svelte'; // 1. Impor ikon yang dibutuhkan

	let { data } = $props<PageData>();
</script>

<div class="p-8 bg-gray-50 min-h-screen">
	<h1 class="text-4xl font-bold text-gray-800 mb-8">Statistik Tim</h1>

	{#if !data.teamMembers || data.teamMembers.length === 0}
		<div class="text-center py-20">
			<p class="text-gray-500 text-lg">Tidak ada anggota tim yang ditemukan.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
			{#each data.teamMembers as member (member.id)}
				<!-- Kartu dibuat sebagai link block -->
				<a
					href="/profile/{member.id}"
					class="group bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 flex flex-col"
				>
					<!-- 2. Aksen warna di bagian atas kartu -->
					<div class="h-2 bg-purple-500"></div>

					<div class="p-6 flex-grow flex flex-col">
						<!-- Bagian Profil Pengguna -->
						<div class="flex items-center space-x-4 mb-5">
							{#if member.avatar_url}
								<img
									src={member.avatar_url}
									alt="avatar"
									class="w-16 h-16 rounded-full object-cover ring-4 ring-purple-200 transition-all group-hover:ring-purple-400"
								/>
							{:else}
								<!-- 3. Avatar placeholder yang lebih menarik -->
								<div
									class="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-3xl font-bold text-purple-600 ring-4 ring-purple-200 transition-all group-hover:ring-purple-400"
								>
									{member.username?.charAt(0)?.toUpperCase() || 'U'}
								</div>
							{/if}
							<div class="flex-1">
								<h2 class="text-xl font-bold text-gray-900 truncate" title={member.username}>
									{member.username || 'Tanpa Nama'}
								</h2>
								<p class="text-sm text-gray-500 italic">
									{member.job_title || 'Belum ada jabatan'}
								</p>
							</div>
						</div>

						<!-- Bagian Statistik dengan Ikon -->
						<div class="space-y-4 bg-gray-50 p-4 rounded-lg flex-grow">
							<div class="flex items-center justify-between">
								<div class="flex items-center text-gray-600">
									<FolderKanban class="w-5 h-5 mr-2 text-blue-500" />
									<span class="text-sm">Total Proyek</span>
								</div>
								<span class="font-bold text-lg text-gray-800">{member.projectCount}</span>
							</div>
							<div class="flex items-center justify-between">
								<div class="flex items-center text-gray-600">
									<ClipboardCheck class="w-5 h-5 mr-2 text-green-500" />
									<span class="text-sm">Tugas Selesai</span>
								</div>
								<!-- 4. Visualisasi data dengan warna -->
								<span class="font-bold text-lg text-green-600">{member.doneTaskCount}</span>
							</div>
						</div>

						<!-- 5. Call to Action (CTA) yang lebih jelas -->
						<div
							class="mt-6 pt-4 border-t border-gray-200 text-center text-sm font-semibold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							Lihat Detail Profil
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
