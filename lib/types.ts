export type SaleStatus = "unsold" | "sold"
export type Occupancy = "owner_stay" | "rented"

export type PublicFlat = {
  id: number
  flatNumber: string
  wing: string
  floor: number
  unit: number
  type: string
  facing: string
  areaSqft: number | null
  saleStatus: SaleStatus
  occupancy: Occupancy | null
  openForRent: boolean
  openForResale: boolean
  ownerName: string
  ownerPhotoUrl: string | null
  ownerEmail: string
  phoneMasked: string
  tenantName: string
  tenantPhoneMasked: string
  registration: string
  interior: string
  ceremony: string
  moving: string
  registrationDate: string | null
  interiorStartDate: string | null
  interiorDate: string | null
  ceremonyDate: string | null
  movingDate: string | null
  updatedAt: string
}

export type FlatMember = {
  id: number
  flatId: number
  name: string
  relation: string
  phone: string | null
  photoUrl: string | null
  sortOrder: number
}

export type FlatRenter = {
  id: number
  flatId: number
  name: string
  phone: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  sortOrder: number
}

export type OwnedFlat = PublicFlat & {
  phone: string
  tenantPhone: string
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
    sold: number
    unsold: number
    ownerStay: number
    rented: number
    openForRent: number
    openForResale: number
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
