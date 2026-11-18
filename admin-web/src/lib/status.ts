import type { MotionStatus } from '@/types/api'

export const MOTION_STATUS_LABEL: Record<MotionStatus, string> = {
  moving: 'Moving',
  stopped: 'Stopped',
  offline: 'Offline',
  speeding: 'Speeding',
  engine: 'Engine on',
}

export const MOTION_STATUS_CLASS: Record<MotionStatus, string> = {
  moving: 'bg-[var(--color-status-moving)]/15 text-[var(--color-status-moving)] border-[var(--color-status-moving)]/30',
  stopped: 'bg-[var(--color-status-stopped)]/15 text-[var(--color-status-stopped)] border-[var(--color-status-stopped)]/30',
  offline: 'bg-[var(--color-status-offline)]/15 text-[var(--color-status-offline)] border-[var(--color-status-offline)]/30',
  speeding: 'bg-[var(--color-status-speeding)]/15 text-[var(--color-status-speeding)] border-[var(--color-status-speeding)]/30',
  engine: 'bg-[var(--color-status-engine)]/15 text-[var(--color-status-engine)] border-[var(--color-status-engine)]/30',
}

export const MOTION_MARKER_COLOR: Record<MotionStatus, string> = {
  moving: '#16A34A',
  stopped: '#2563EB',
  offline: '#F59E0B',
  speeding: '#E11D48',
  engine: '#7C3AED',
}