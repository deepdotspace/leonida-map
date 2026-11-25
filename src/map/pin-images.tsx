/**
 * Draws the images the map's pin layers use: one round badge per pin category
 * (category colour, white rim, icon) and one per colour a visitor can give
 * their own markers.
 */

import type { ComponentType } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { categories } from './pins'
import { MapPin, type LucideProps } from 'lucide-react'
import { categoryIcon } from './category-icons'

/** Images are drawn at twice their display size so they stay sharp on high-density screens. */
export const IMAGE_PIXEL_RATIO = 2

const PIN_SIZE = 30
const ICON_SIZE = 16

function createCanvas(displaySize: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = displaySize * IMAGE_PIXEL_RATIO
  const context = canvas.getContext('2d')!
  context.scale(IMAGE_PIXEL_RATIO, IMAGE_PIXEL_RATIO)
  return { canvas, context }
}

function drawBadge(context: CanvasRenderingContext2D, size: number, fill: string) {
  const centre = size / 2
  context.beginPath()
  context.arc(centre, centre + 0.5, centre - 2, 0, Math.PI * 2)
  context.fillStyle = 'rgba(0, 0, 0, 0.35)'
  context.fill()
  context.beginPath()
  context.arc(centre, centre, centre - 2.5, 0, Math.PI * 2)
  context.fillStyle = fill
  context.fill()
  context.lineWidth = 2
  context.strokeStyle = '#ffffff'
  context.stroke()
}

/** Dark icons on light badges (the yellow collectibles), white on the rest. */
export function readableOn(hexColor: string): string {
  const value = parseInt(hexColor.slice(1), 16)
  const luminance = (0.299 * (value >> 16) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255
  return luminance > 0.62 ? '#1f2937' : '#ffffff'
}

/** Colours a visitor can give their own markers; the first is the default. */
export const MARKER_COLORS = ['#ff5fa2', '#f59e0b', '#10b981', '#38bdf8', '#a78bfa', '#ef4444']

export function pinImageId(categoryId: string): string {
  return `pin-${categoryId}`
}

export function markerImageId(color: string): string {
  return `marker-${color}`
}

interface Badge {
  id: string
  color: string
  Icon: ComponentType<LucideProps>
}

const badges: Badge[] = [
  ...categories.map((category) => ({ id: pinImageId(category.id), color: category.color, Icon: categoryIcon(category) })),
  ...MARKER_COLORS.map((color) => ({ id: markerImageId(color), color, Icon: MapPin })),
]

/** Render every badge icon once and return each one's SVG markup. */
function iconMarkup(): Map<string, string> {
  const host = document.createElement('div')
  const root = createRoot(host)
  flushSync(() => {
    root.render(
      <>
        {badges.map(({ id, color, Icon }) => (
          <span key={id} data-badge={id}>
            <Icon size={ICON_SIZE} color={readableOn(color)} strokeWidth={2.25} xmlns="http://www.w3.org/2000/svg" />
          </span>
        ))}
      </>,
    )
  })
  const markup = new Map<string, string>()
  for (const element of host.querySelectorAll<HTMLElement>('[data-badge]')) {
    markup.set(element.dataset.badge!, element.innerHTML)
  }
  root.unmount()
  return markup
}

function loadSvg(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load a pin icon'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  })
}

export async function renderPinImages(): Promise<Array<{ id: string; data: ImageData }>> {
  const markup = iconMarkup()
  return Promise.all(
    badges.map(async ({ id, color }) => {
      const icon = await loadSvg(markup.get(id)!)
      const { canvas, context } = createCanvas(PIN_SIZE)
      drawBadge(context, PIN_SIZE, color)
      const offset = (PIN_SIZE - ICON_SIZE) / 2
      context.drawImage(icon, offset, offset, ICON_SIZE, ICON_SIZE)
      return { id, data: context.getImageData(0, 0, canvas.width, canvas.height) }
    }),
  )
}
