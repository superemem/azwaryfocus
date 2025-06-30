// src/lib/stores/focusStore.ts
import { writable } from 'svelte/store';

// Ini adalah store yang akan menyimpan data task yang sedang difokuskan
// Nilainya bisa berupa object task atau null jika belum ada yang dipilih
export const currentFocusTask = writable<any | null>(null);

// Fungsi untuk mengubah nilai store
export function setFocusTask(task: any) {
	currentFocusTask.set(task);
}

// Fungsi untuk mengosongkan store
export function clearFocusTask() {
	currentFocusTask.set(null);
}
