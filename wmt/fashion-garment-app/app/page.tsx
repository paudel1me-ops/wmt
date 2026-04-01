import { redirect } from 'next/navigation'

export default async function Home() {
  // Skip auth check for POC; directly redirect to dashboard
  redirect('/dashboard')
}