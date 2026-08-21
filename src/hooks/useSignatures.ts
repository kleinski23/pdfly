import { useCallback, useEffect, useState } from 'react'
import { dbAddSignature, dbDeleteSignature, dbListSignatures, type SignatureRecord } from '../lib/db'

export function useSignatures() {
  const [signatures, setSignatures] = useState<SignatureRecord[]>([])

  useEffect(() => {
    let cancelled = false
    void dbListSignatures().then((list) => {
      if (!cancelled) setSignatures(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const addSignature = useCallback(async (sig: SignatureRecord) => {
    await dbAddSignature(sig)
    setSignatures((prev) => [...prev, sig])
  }, [])

  const deleteSignature = useCallback(async (id: string) => {
    await dbDeleteSignature(id)
    setSignatures((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return { signatures, addSignature, deleteSignature }
}
