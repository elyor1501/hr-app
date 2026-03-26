'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLoggedInUser } from '@/lib/users/data'

export default function RouteProtection({ children }: { children?: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const user = await getLoggedInUser()

      if (!user) {
        router.replace('/login')
      }
    }

    checkUser()
  }, [router])

  return <>{children}</>
}