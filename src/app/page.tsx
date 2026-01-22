import { redirect } from 'next/navigation'

export default function HomePage() {
  // Ana sayfa doğrudan admin panele yönlendirir
  redirect('/admin')
}
