import { useParams } from 'react-router-dom'
import { CategoryPage } from '../../locations/CategoryPage'
import { listedCategories } from '../../map/pins'
import NotFound from '../[...all]'

export default function CategoryRoute() {
  const { category: categoryId } = useParams()
  const category = listedCategories.find((candidate) => candidate.id === categoryId)
  return category ? <CategoryPage category={category} /> : <NotFound />
}
