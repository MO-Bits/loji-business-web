export type PropertyType = "hotel" | "lodge" | "apartment" | "guesthouse";

export type PropertyAddress = {
  placeId: string;
  formattedAddress: string;
  country: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  latitude: number;
  longitude: number;
};

export type PlacePrediction = {
  placeId: string;
  text: string;
  primaryText: string;
  secondaryText: string;
};

export type PlaceDetails = PropertyAddress & { name: string };
