<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<PageData>();
</script>

<div class="p-8 bg-gray-50 min-h-screen">
	<h1 class="text-4xl font-bold text-gray-800 mb-8">Anggota Tim</h1>

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
					class="group bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-purple-200 hover:-translate-y-2 flex flex-col text-center"
				>
					<div class="p-8 flex-grow flex flex-col items-center justify-center">
						<!-- Bagian Profil Pengguna -->
						{#if member.avatar_url}
							<img
								src={member.avatar_url}
								alt="avatar"
								class="w-24 h-24 rounded-full object-cover ring-4 ring-purple-300 transition-all group-hover:ring-purple-500"
							/>
						{:else}
							<!-- Avatar placeholder yang lebih menarik -->
							<div
								class="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center text-4xl font-bold text-purple-600 ring-4 ring-purple-300 transition-all group-hover:ring-purple-500"
							>
								{member.username?.charAt(0)?.toUpperCase() || 'U'}
							</div>
						{/if}

						<h2 class="mt-5 text-xl font-bold text-gray-900 truncate" title={member.username}>
							{member.username || 'Tanpa Nama'}
						</h2>
						<p class="text-sm text-gray-500 italic">
							{member.job_title || 'Belum ada jabatan'}
						</p>
					</div>

					<!-- Call to Action (CTA) yang muncul saat hover -->
					<div
						class="w-full bg-purple-600 text-white py-3 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300"
					>
						Lihat statistik kinerja
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
