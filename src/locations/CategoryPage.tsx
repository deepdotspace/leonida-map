/** A plain, readable list of every location in one category, for people (and search engines) who want the list rather than the map. */

import { Link } from 'react-router-dom'
import { Map as MapIcon } from 'lucide-react'
import { Seo } from '../components/Seo'
import { buttonVariants } from '@/components/ui/Button'
import { categoryIcon } from '../map/category-icons'
import { IconBadge } from '../map/IconBadge'
import { categoryOnlyLink, pinLink } from '../map/links'
import { readableOn } from '../map/pin-images'
import { parseDescription, pinsByCategory, type Category } from '../map/pins'
import { seo } from '../seo'
import { LocationsShell } from './LocationsShell'

export function categoryPath(categoryId: string): string {
  return `/locations/${categoryId}`
}

export function CategoryPage({ category }: { category: Category }) {
  const places = pinsByCategory.get(category.id) ?? []
  const Icon = categoryIcon(category)
  const title = `All ${places.length} ${category.name} locations in GTA 6`

  return (
    <>
      <Seo
        {...seo}
        title={`GTA 6 ${category.name} locations (${places.length}) | Leonida Map`}
        description={`Where to find every ${category.name} in GTA 6: all ${places.length} locations listed and pinned on the interactive Leonida map.`}
        path={categoryPath(category.id)}
      />
      <LocationsShell
        back={{ to: '/locations', label: 'All location lists' }}
        title={title}
        intro={`Every ${category.name} location in Leonida. Open one to see it on the interactive map, where you can tick it as found and track your progress.`}
      >
        <Link to={categoryOnlyLink(category.id)} className={buttonVariants({ className: 'w-fit' })}>
          <MapIcon />
          Show all {places.length} on the map
        </Link>
        <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {places.map((pin, index) => {
            const { prose } = parseDescription(pin.description)
            return (
              <li key={pin.id}>
                <Link to={pinLink(pin.id)} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/60">
                  <IconBadge size="sm" color={category.color} iconColor={readableOn(category.color)} className="mt-0.5">
                    <Icon size={14} strokeWidth={2.25} />
                  </IconBadge>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{pin.name}</span>
                    {prose && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{prose}</span>}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </LocationsShell>
    </>
  )
}
