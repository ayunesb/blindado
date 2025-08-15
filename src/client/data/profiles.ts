// src/client/data/profiles.ts
export type Protector = {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
};

export const PROTECTORS: Protector[] = [
  {
    id: 'chris',
    name: 'Chris',
    subtitle: 'Former NYPD • Executive Protection',
    imageUrl: '/assets/brand/ic-car-suv.svg',
  },
  {
    id: 'sophia',
    name: 'Sophia',
    subtitle: 'USMC Veteran • Advanced Driver',
    imageUrl: '/assets/brand/ic-car-suv.svg',
  },
  {
    id: 'darius',
    name: 'Darius',
    subtitle: 'DoD Cleared • Close Protection',
    imageUrl: '/assets/brand/ic-car-suv.svg',
  },
];
