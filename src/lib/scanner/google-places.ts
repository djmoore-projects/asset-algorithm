export interface PlaceResult {
  id: string;
  displayName: { text: string; languageCode?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  businessStatus?: string;
  editorialSummary?: { text: string };
  googleMapsUri?: string;
}

export interface ScanCriteria {
  query: string;
  location: string;
  radius_miles?: number;
  max_results?: number;
  min_rating?: number;
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.types",
  "places.businessStatus",
  "places.editorialSummary",
  "places.googleMapsUri",
].join(",");

export async function searchPlaces(criteria: ScanCriteria): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY not configured");

  const textQuery = `${criteria.query} in ${criteria.location}`;
  const maxResults = Math.min(criteria.max_results || 20, 20);

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: maxResults,
      languageCode: "en",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Places API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  let places: PlaceResult[] = data.places || [];

  if (criteria.min_rating) {
    places = places.filter((p) => (p.rating || 0) >= criteria.min_rating!);
  }

  return places;
}

export function mapPlaceToBusinessData(place: PlaceResult): Record<string, any> {
  return {
    place_id: place.id,
    name: place.displayName?.text || "Unknown",
    formatted_address: place.formattedAddress || "",
    phone: place.nationalPhoneNumber || null,
    website: place.websiteUri || null,
    rating: place.rating || null,
    review_count: place.userRatingCount || 0,
    types: place.types || [],
    business_status: place.businessStatus || null,
    description: place.editorialSummary?.text || null,
    google_maps_url: place.googleMapsUri || null,
  };
}

export function parseCityFromAddress(address: string): string | null {
  if (!address) return null;
  const parts = address.split(",").map((s) => s.trim());
  // Typical: "123 Main St, Austin, TX 78701, USA"
  if (parts.length >= 3) return parts[parts.length - 3] || parts[0];
  if (parts.length >= 2) return parts[0];
  return null;
}

export function parseStateFromAddress(address: string): string | null {
  if (!address) return null;
  const match = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  return match ? match[1] : null;
}

const TYPE_TO_INDUSTRY: Record<string, string> = {
  plumber: "Plumbing",
  electrician: "Electrical Services",
  general_contractor: "General Contracting",
  roofing_contractor: "Roofing",
  hvac_contractor: "HVAC",
  accounting: "Accounting",
  auto_repair: "Auto Services",
  car_dealer: "Auto Dealership",
  restaurant: "Food & Beverage",
  dentist: "Dental Practice",
  doctor: "Medical Practice",
  veterinary_care: "Veterinary",
  real_estate_agency: "Real Estate",
  insurance_agency: "Insurance",
  lawyer: "Legal Services",
  moving_company: "Moving & Storage",
  painter: "Painting Services",
  locksmith: "Locksmith Services",
  pet_store: "Pet Services",
  gym: "Fitness",
  spa: "Health & Wellness",
  beauty_salon: "Beauty Services",
  hair_care: "Hair Care",
  laundry: "Laundry Services",
  car_wash: "Car Wash",
  storage: "Storage",
  funeral_home: "Funeral Services",
  pharmacy: "Pharmacy",
  florist: "Floral Services",
  bakery: "Bakery",
  cafe: "Cafe",
  bar: "Bar & Nightlife",
  lodging: "Hospitality",
  campground: "Outdoor Recreation",
  travel_agency: "Travel",
  clothing_store: "Retail - Apparel",
  hardware_store: "Retail - Hardware",
  home_goods_store: "Retail - Home Goods",
  electronics_store: "Retail - Electronics",
  book_store: "Retail - Books",
  convenience_store: "Retail - Convenience",
  supermarket: "Grocery",
};

export function inferIndustryFromTypes(types: string[]): string | null {
  if (!types?.length) return null;
  for (const type of types) {
    if (TYPE_TO_INDUSTRY[type]) return TYPE_TO_INDUSTRY[type];
  }
  // Fall back to first non-generic type
  const generic = new Set(["point_of_interest", "establishment", "store", "food", "health", "finance"]);
  const specific = types.find((t) => !generic.has(t));
  return specific ? specific.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;
}
