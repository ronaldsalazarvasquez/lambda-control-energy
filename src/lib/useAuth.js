import { useStore, currentUser } from '../store'
import { can as canFn, planOf, hasFeature } from './saas'

export function useAuth() {
  const user = useStore(currentUser)
  const plant = useStore((s) => s.plant)
  return {
    user,
    plant,
    plan: planOf(plant),
    can: (perm) => canFn(user, perm),
    feature: (f) => hasFeature(plant, f),
  }
}
