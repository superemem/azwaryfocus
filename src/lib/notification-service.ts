// $lib/services/notification-service.ts
import { toast } from '$lib/toast';
import confetti from 'canvas-confetti';
import { browser } from '$app/environment';

export interface NotificationOptions {
	duration?: number;
	type?: 'success' | 'error' | 'info' | 'warning';
}

export class NotificationService {
	private static instance: NotificationService;
	private audioCache: Map<string, HTMLAudioElement> = new Map();

	private constructor() {}

	static getInstance(): NotificationService {
		if (!NotificationService.instance) {
			NotificationService.instance = new NotificationService();
		}
		return NotificationService.instance;
	}

	// Preload audio files - only in browser
	preloadAudio(audioFiles: Record<string, string>) {
		if (!browser) return;

		Object.entries(audioFiles).forEach(([key, url]) => {
			try {
				const audio = new Audio(url);
				audio.preload = 'auto';
				this.audioCache.set(key, audio);
			} catch (error) {
				console.warn(`Failed to preload audio ${key}:`, error);
			}
		});
	}

	// Play audio by key - only in browser
	private playAudio(key: string): void {
		if (!browser) return;

		try {
			const audio = this.audioCache.get(key);
			if (audio) {
				audio.currentTime = 0;
				audio.play().catch((error) => {
					console.warn('Audio play failed:', error);
				});
			}
		} catch (error) {
			console.warn('Audio play error:', error);
		}
	}

	// Basic toast notification
	showToast(message: string, options: NotificationOptions = {}): void {
		const { duration = 3000, type = 'info' } = options;

		switch (type) {
			case 'success':
				toast.success(message, { duration });
				break;
			case 'error':
				toast.error(message, { duration });
				break;
			case 'warning':
				toast.warning(message, { duration });
				break;
			default:
				toast(message, { duration });
		}
	}

	// Celebration with confetti - only in browser
	celebrate(message: string, options: NotificationOptions = {}): void {
		if (browser) {
			try {
				// Confetti effect
				confetti({
					particleCount: 200,
					spread: 360,
					origin: { y: 0.6 }
				});
			} catch (error) {
				console.warn('Confetti failed:', error);
			}
		}

		// Play celebration sound
		this.playAudio('celebration');

		// Show toast
		this.showToast(message, { ...options, type: 'success', duration: 4000 });
	}

	// Task-specific notifications
	taskCreated(taskTitle: string): void {
		this.showToast(`Tugas "${taskTitle}" berhasil dibuat!`, { type: 'success' });
		this.playAudio('notification');
	}

	taskUpdated(taskTitle: string): void {
		this.showToast(`📝 Tugas "${taskTitle}" berhasil diperbarui!`, { type: 'success' });
		this.playAudio('notification');
	}

	taskDeleted(taskTitle: string): void {
		this.showToast(`🗑️ Tugas "${taskTitle}" berhasil dihapus!`, { type: 'success' });
		this.playAudio('notification');
	}

	taskMovedToInProgress(taskTitle: string): void {
		this.celebrate(`🚀 Semangat mengerjakan "${taskTitle}"!`);
	}

	taskCompleted(taskTitle: string): void {
		this.celebrate(`🎉 Yeay, "${taskTitle}" selesai!`);
	}

	taskMoved(taskTitle: string, columnName: string): void {
		this.showToast(`📋 "${taskTitle}" dipindah ke ${columnName}`, { type: 'info' });
		this.playAudio('notification');
	}

	// Project-specific notifications
	projectArchived(projectName: string): void {
		this.showToast(`📦 Proyek "${projectName}" berhasil diarsipkan`, { type: 'success' });
		this.playAudio('notification');
	}

	projectUpdated(projectName: string): void {
		this.showToast(`📋 Proyek "${projectName}" berhasil diperbarui`, { type: 'success' });
		this.playAudio('notification');
	}

	// Error notifications
	showError(message: string, context?: string): void {
		const errorMsg = context ? `${context}: ${message}` : message;
		this.showToast(errorMsg, { type: 'error', duration: 5000 });
		this.playAudio('error');
	}

	// Custom confetti effects - only in browser
	customConfetti(options: {
		particleCount?: number;
		spread?: number;
		origin?: { x?: number; y?: number };
		colors?: string[];
	}): void {
		if (!browser) return;

		const {
			particleCount = 100,
			spread = 70,
			origin = { y: 0.6 },
			colors = ['#ff0000', '#00ff00', '#0000ff']
		} = options;

		try {
			confetti({
				particleCount,
				spread,
				origin,
				colors
			});
		} catch (error) {
			console.warn('Custom confetti failed:', error);
		}
	}

	// Milestone celebration - only in browser
	milestoneCelebration(message: string): void {
		if (browser) {
			try {
				// Multi-burst confetti
				const duration = 15 * 1000;
				const animationEnd = Date.now() + duration;
				const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

				function randomInRange(min: number, max: number) {
					return Math.random() * (max - min) + min;
				}

				const interval = setInterval(() => {
					const timeLeft = animationEnd - Date.now();

					if (timeLeft <= 0) {
						clearInterval(interval);
						return;
					}

					const particleCount = 50 * (timeLeft / duration);
					confetti({
						...defaults,
						particleCount,
						origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
					});
					confetti({
						...defaults,
						particleCount,
						origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
					});
				}, 250);
			} catch (error) {
				console.warn('Milestone celebration failed:', error);
			}
		}

		this.showToast(message, { type: 'success', duration: 6000 });
		this.playAudio('celebration');
	}
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Initialize with default audio files - only in browser
if (browser) {
	notificationService.preloadAudio({
		notification: '/notification.mp3',
		celebration: '/celebration.mp3',
		error: '/error.mp3'
	});
}
