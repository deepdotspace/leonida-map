/** The index of location lists: every category, grouped as in the map's sidebar. */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { categoryIcon } from '../map/category-icons'
import { IconBadge } from '../map/IconBadge'
import { readableOn } from '../map/pin-images'
import { groups, listedCategories, pinCountByCategory, pins } from '../map/pins'
import { seo } from '../seo'
import { categoryPath } from './CategoryPage'
import { LocationsShell } from './LocationsShell'

export function LocationsIndex() {
  return (
    <>
      <Seo
        {...seo}
        title="GTA 6 locations: every list | Leonida Map"
        description={`Lists of all ${pins.length.toLocaleString('en-US')} GTA 6 locations by type: robberies, collectibles, vehicles, weapons, shops and more, each pinned on the interactive map.`}
        path="/locations"
      />
      <LocationsShell
        back={{ to: '/', label: 'Back to the map' }}
        title="GTA 6 location lists"
        intro={`All ${pins.length.toLocaleString('en-US')} places on the Leonida map, as ${listedCategories.length} lists you can read through.`}
      >
        {groups.map((group) => {
          const groupCategories = listedCategories.filter((category) => category.group === group.id)
          if (groupCategories.length === 0) return null
          return (
            <section key={group.id} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {groupCategories.map((category) => {
                  const Icon = categoryIcon(category)
                  return (
                    <li key={category.id}>
                      <Link
                        to={categoryPath(category.id)}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent/60"
                      >
                        <IconBadge size="md" color={category.color} iconColor={readableOn(category.color)}>
                          <Icon size={14} strokeWidth={2.25} />
                        </IconBadge>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{category.name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{pinCountByCategory.get(category.id)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </LocationsShell>
    </>
  )
}
