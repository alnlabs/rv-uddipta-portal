export type PublicFlat = {
  id: number
  flatNumber: string
  wing: string
  floor: number
  unit: number
  type: string
  facing: string
  areaSqft: number | null
  ownerName: string
  phoneMasked: string
  registration: string
  interior: string
  ceremony: string
  moving: string
  updatedAt: string
}

export type OwnedFlat = PublicFlat & {
  phone: string
}

export type FloorGroup = {
  floor: number
  flats: PublicFlat[]
}

export type BoardData = {
  total: number
  floors: FloorGroup[]
  flats: PublicFlat[]
  summary: {
    registrationCompleted: number
    interiorInProgress: number
    interiorCompleted: number
    ceremonyCompleted: number
    movedIn: number
  }
}

export type LoginHint = {
  status?: "ready" | "pending" | "rejected" | "unknown"
  ok?: boolean
  message?: string
  phoneMasked?: string
  flatNumber?: string
  ownerName?: string
}
