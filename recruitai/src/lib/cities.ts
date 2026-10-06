// Cities a candidate can pick as "home" for "jobs near me", with
// coordinates for straight-line distances. Offline on purpose: no map
// service, no API key, no candidate address leaves the app.

export interface City {
  key: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  // Other spellings found in job locations ("Bombay", "NYC").
  aliases?: string[];
}

// prettier-ignore
export const CITIES: City[] = [
  // United Arab Emirates
  { key: "dubai-ae", name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708 },
  { key: "abu-dhabi-ae", name: "Abu Dhabi", country: "United Arab Emirates", lat: 24.4539, lng: 54.3773 },
  { key: "sharjah-ae", name: "Sharjah", country: "United Arab Emirates", lat: 25.3463, lng: 55.4209 },
  { key: "ajman-ae", name: "Ajman", country: "United Arab Emirates", lat: 25.4052, lng: 55.5136 },
  { key: "umm-al-quwain-ae", name: "Umm Al Quwain", country: "United Arab Emirates", lat: 25.5647, lng: 55.5552 },
  { key: "ras-al-khaimah-ae", name: "Ras Al Khaimah", country: "United Arab Emirates", lat: 25.8007, lng: 55.9762, aliases: ["RAK"] },
  { key: "fujairah-ae", name: "Fujairah", country: "United Arab Emirates", lat: 25.1288, lng: 56.3265 },
  { key: "al-ain-ae", name: "Al Ain", country: "United Arab Emirates", lat: 24.2075, lng: 55.7447 },
  // Gulf & Middle East
  { key: "doha-qa", name: "Doha", country: "Qatar", lat: 25.2854, lng: 51.531 },
  { key: "manama-bh", name: "Manama", country: "Bahrain", lat: 26.2285, lng: 50.586 },
  { key: "kuwait-city-kw", name: "Kuwait City", country: "Kuwait", lat: 29.3759, lng: 47.9774 },
  { key: "muscat-om", name: "Muscat", country: "Oman", lat: 23.588, lng: 58.3829 },
  { key: "riyadh-sa", name: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lng: 46.6753 },
  { key: "jeddah-sa", name: "Jeddah", country: "Saudi Arabia", lat: 21.4858, lng: 39.1925 },
  { key: "dammam-sa", name: "Dammam", country: "Saudi Arabia", lat: 26.4207, lng: 50.0888 },
  { key: "khobar-sa", name: "Al Khobar", country: "Saudi Arabia", lat: 26.2172, lng: 50.1971, aliases: ["Khobar"] },
  { key: "mecca-sa", name: "Mecca", country: "Saudi Arabia", lat: 21.3891, lng: 39.8579, aliases: ["Makkah"] },
  { key: "medina-sa", name: "Medina", country: "Saudi Arabia", lat: 24.5247, lng: 39.5692, aliases: ["Madinah"] },
  { key: "amman-jo", name: "Amman", country: "Jordan", lat: 31.9454, lng: 35.9284 },
  { key: "beirut-lb", name: "Beirut", country: "Lebanon", lat: 33.8938, lng: 35.5018 },
  { key: "cairo-eg", name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357 },
  { key: "alexandria-eg", name: "Alexandria", country: "Egypt", lat: 31.2001, lng: 29.9187 },
  { key: "giza-eg", name: "Giza", country: "Egypt", lat: 30.0131, lng: 31.2089 },
  { key: "baghdad-iq", name: "Baghdad", country: "Iraq", lat: 33.3152, lng: 44.3661 },
  { key: "erbil-iq", name: "Erbil", country: "Iraq", lat: 36.1911, lng: 44.0092 },
  { key: "istanbul-tr", name: "Istanbul", country: "Türkiye", lat: 41.0082, lng: 28.9784 },
  { key: "ankara-tr", name: "Ankara", country: "Türkiye", lat: 39.9334, lng: 32.8597 },
  { key: "tel-aviv-il", name: "Tel Aviv", country: "Israel", lat: 32.0853, lng: 34.7818 },
  { key: "ramallah-ps", name: "Ramallah", country: "Palestine", lat: 31.9038, lng: 35.2034 },
  { key: "tehran-ir", name: "Tehran", country: "Iran", lat: 35.6892, lng: 51.389 },
  { key: "casablanca-ma", name: "Casablanca", country: "Morocco", lat: 33.5731, lng: -7.5898 },
  { key: "rabat-ma", name: "Rabat", country: "Morocco", lat: 34.0209, lng: -6.8416 },
  { key: "tunis-tn", name: "Tunis", country: "Tunisia", lat: 36.8065, lng: 10.1815 },
  { key: "algiers-dz", name: "Algiers", country: "Algeria", lat: 36.7538, lng: 3.0588 },
  // South Asia
  { key: "karachi-pk", name: "Karachi", country: "Pakistan", lat: 24.8607, lng: 67.0011 },
  { key: "lahore-pk", name: "Lahore", country: "Pakistan", lat: 31.5204, lng: 74.3587 },
  { key: "islamabad-pk", name: "Islamabad", country: "Pakistan", lat: 33.6844, lng: 73.0479 },
  { key: "rawalpindi-pk", name: "Rawalpindi", country: "Pakistan", lat: 33.5651, lng: 73.0169 },
  { key: "faisalabad-pk", name: "Faisalabad", country: "Pakistan", lat: 31.4504, lng: 73.135 },
  { key: "multan-pk", name: "Multan", country: "Pakistan", lat: 30.1575, lng: 71.5249 },
  { key: "peshawar-pk", name: "Peshawar", country: "Pakistan", lat: 34.0151, lng: 71.5249 },
  { key: "quetta-pk", name: "Quetta", country: "Pakistan", lat: 30.1798, lng: 66.975 },
  { key: "hyderabad-pk", name: "Hyderabad (Sindh)", country: "Pakistan", lat: 25.396, lng: 68.3578 },
  { key: "sialkot-pk", name: "Sialkot", country: "Pakistan", lat: 32.4945, lng: 74.5229 },
  { key: "mumbai-in", name: "Mumbai", country: "India", lat: 19.076, lng: 72.8777, aliases: ["Bombay"] },
  { key: "delhi-in", name: "Delhi", country: "India", lat: 28.6139, lng: 77.209, aliases: ["New Delhi"] },
  { key: "gurugram-in", name: "Gurugram", country: "India", lat: 28.4595, lng: 77.0266, aliases: ["Gurgaon"] },
  { key: "noida-in", name: "Noida", country: "India", lat: 28.5355, lng: 77.391 },
  { key: "bengaluru-in", name: "Bengaluru", country: "India", lat: 12.9716, lng: 77.5946, aliases: ["Bangalore"] },
  { key: "hyderabad-in", name: "Hyderabad", country: "India", lat: 17.385, lng: 78.4867 },
  { key: "chennai-in", name: "Chennai", country: "India", lat: 13.0827, lng: 80.2707, aliases: ["Madras"] },
  { key: "kolkata-in", name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639, aliases: ["Calcutta"] },
  { key: "pune-in", name: "Pune", country: "India", lat: 18.5204, lng: 73.8567 },
  { key: "ahmedabad-in", name: "Ahmedabad", country: "India", lat: 23.0225, lng: 72.5714 },
  { key: "jaipur-in", name: "Jaipur", country: "India", lat: 26.9124, lng: 75.7873 },
  { key: "kochi-in", name: "Kochi", country: "India", lat: 9.9312, lng: 76.2673, aliases: ["Cochin"] },
  { key: "thiruvananthapuram-in", name: "Thiruvananthapuram", country: "India", lat: 8.5241, lng: 76.9366, aliases: ["Trivandrum"] },
  { key: "chandigarh-in", name: "Chandigarh", country: "India", lat: 30.7333, lng: 76.7794 },
  { key: "dhaka-bd", name: "Dhaka", country: "Bangladesh", lat: 23.8103, lng: 90.4125 },
  { key: "chittagong-bd", name: "Chattogram", country: "Bangladesh", lat: 22.3569, lng: 91.7832, aliases: ["Chittagong"] },
  { key: "colombo-lk", name: "Colombo", country: "Sri Lanka", lat: 6.9271, lng: 79.8612 },
  { key: "kathmandu-np", name: "Kathmandu", country: "Nepal", lat: 27.7172, lng: 85.324 },
  { key: "kabul-af", name: "Kabul", country: "Afghanistan", lat: 34.5553, lng: 69.2075 },
  // East & Southeast Asia, Oceania
  { key: "singapore-sg", name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  { key: "kuala-lumpur-my", name: "Kuala Lumpur", country: "Malaysia", lat: 3.139, lng: 101.6869 },
  { key: "jakarta-id", name: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456 },
  { key: "bangkok-th", name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018 },
  { key: "manila-ph", name: "Manila", country: "Philippines", lat: 14.5995, lng: 120.9842 },
  { key: "ho-chi-minh-vn", name: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lng: 106.6297, aliases: ["Saigon"] },
  { key: "hanoi-vn", name: "Hanoi", country: "Vietnam", lat: 21.0278, lng: 105.8342 },
  { key: "hong-kong-hk", name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { key: "shanghai-cn", name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737 },
  { key: "beijing-cn", name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074 },
  { key: "shenzhen-cn", name: "Shenzhen", country: "China", lat: 22.5431, lng: 114.0579 },
  { key: "tokyo-jp", name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { key: "seoul-kr", name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.978 },
  { key: "sydney-au", name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { key: "melbourne-au", name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631 },
  { key: "auckland-nz", name: "Auckland", country: "New Zealand", lat: -36.8485, lng: 174.7633 },
  // Africa
  { key: "lagos-ng", name: "Lagos", country: "Nigeria", lat: 6.5244, lng: 3.3792 },
  { key: "abuja-ng", name: "Abuja", country: "Nigeria", lat: 9.0765, lng: 7.3986 },
  { key: "nairobi-ke", name: "Nairobi", country: "Kenya", lat: -1.2921, lng: 36.8219 },
  { key: "accra-gh", name: "Accra", country: "Ghana", lat: 5.6037, lng: -0.187 },
  { key: "addis-ababa-et", name: "Addis Ababa", country: "Ethiopia", lat: 9.03, lng: 38.74 },
  { key: "johannesburg-za", name: "Johannesburg", country: "South Africa", lat: -26.2041, lng: 28.0473 },
  { key: "cape-town-za", name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241 },
  { key: "kigali-rw", name: "Kigali", country: "Rwanda", lat: -1.9441, lng: 30.0619 },
  // Europe
  { key: "london-gb", name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
  { key: "manchester-gb", name: "Manchester", country: "United Kingdom", lat: 53.4808, lng: -2.2426 },
  { key: "birmingham-gb", name: "Birmingham", country: "United Kingdom", lat: 52.4862, lng: -1.8904 },
  { key: "leeds-gb", name: "Leeds", country: "United Kingdom", lat: 53.8008, lng: -1.5491 },
  { key: "glasgow-gb", name: "Glasgow", country: "United Kingdom", lat: 55.8642, lng: -4.2518 },
  { key: "edinburgh-gb", name: "Edinburgh", country: "United Kingdom", lat: 55.9533, lng: -3.1883 },
  { key: "bristol-gb", name: "Bristol", country: "United Kingdom", lat: 51.4545, lng: -2.5879 },
  { key: "cambridge-gb", name: "Cambridge", country: "United Kingdom", lat: 52.2053, lng: 0.1218 },
  { key: "dublin-ie", name: "Dublin", country: "Ireland", lat: 53.3498, lng: -6.2603 },
  { key: "paris-fr", name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { key: "lyon-fr", name: "Lyon", country: "France", lat: 45.764, lng: 4.8357 },
  { key: "berlin-de", name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405 },
  { key: "munich-de", name: "Munich", country: "Germany", lat: 48.1351, lng: 11.582, aliases: ["München"] },
  { key: "hamburg-de", name: "Hamburg", country: "Germany", lat: 53.5511, lng: 9.9937 },
  { key: "frankfurt-de", name: "Frankfurt", country: "Germany", lat: 50.1109, lng: 8.6821 },
  { key: "amsterdam-nl", name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041 },
  { key: "rotterdam-nl", name: "Rotterdam", country: "Netherlands", lat: 51.9244, lng: 4.4777 },
  { key: "brussels-be", name: "Brussels", country: "Belgium", lat: 50.8503, lng: 4.3517 },
  { key: "zurich-ch", name: "Zurich", country: "Switzerland", lat: 47.3769, lng: 8.5417, aliases: ["Zürich"] },
  { key: "geneva-ch", name: "Geneva", country: "Switzerland", lat: 46.2044, lng: 6.1432 },
  { key: "vienna-at", name: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738 },
  { key: "madrid-es", name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038 },
  { key: "barcelona-es", name: "Barcelona", country: "Spain", lat: 41.3874, lng: 2.1686 },
  { key: "lisbon-pt", name: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393 },
  { key: "milan-it", name: "Milan", country: "Italy", lat: 45.4642, lng: 9.19 },
  { key: "rome-it", name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
  { key: "stockholm-se", name: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686 },
  { key: "copenhagen-dk", name: "Copenhagen", country: "Denmark", lat: 55.6761, lng: 12.5683 },
  { key: "oslo-no", name: "Oslo", country: "Norway", lat: 59.9139, lng: 10.7522 },
  { key: "helsinki-fi", name: "Helsinki", country: "Finland", lat: 60.1699, lng: 24.9384 },
  { key: "warsaw-pl", name: "Warsaw", country: "Poland", lat: 52.2297, lng: 21.0122 },
  { key: "krakow-pl", name: "Kraków", country: "Poland", lat: 50.0647, lng: 19.945, aliases: ["Krakow"] },
  { key: "prague-cz", name: "Prague", country: "Czechia", lat: 50.0755, lng: 14.4378 },
  { key: "budapest-hu", name: "Budapest", country: "Hungary", lat: 47.4979, lng: 19.0402 },
  { key: "bucharest-ro", name: "Bucharest", country: "Romania", lat: 44.4268, lng: 26.1025 },
  { key: "athens-gr", name: "Athens", country: "Greece", lat: 37.9838, lng: 23.7275 },
  { key: "kyiv-ua", name: "Kyiv", country: "Ukraine", lat: 50.4501, lng: 30.5234, aliases: ["Kiev"] },
  { key: "moscow-ru", name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173 },
  { key: "tbilisi-ge", name: "Tbilisi", country: "Georgia", lat: 41.7151, lng: 44.8271 },
  { key: "baku-az", name: "Baku", country: "Azerbaijan", lat: 40.4093, lng: 49.8671 },
  // Americas
  { key: "new-york-us", name: "New York", country: "United States", lat: 40.7128, lng: -74.006, aliases: ["NYC", "New York City"] },
  { key: "san-francisco-us", name: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194, aliases: ["SF Bay Area"] },
  { key: "los-angeles-us", name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437 },
  { key: "seattle-us", name: "Seattle", country: "United States", lat: 47.6062, lng: -122.3321 },
  { key: "austin-us", name: "Austin", country: "United States", lat: 30.2672, lng: -97.7431 },
  { key: "boston-us", name: "Boston", country: "United States", lat: 42.3601, lng: -71.0589 },
  { key: "chicago-us", name: "Chicago", country: "United States", lat: 41.8781, lng: -87.6298 },
  { key: "washington-dc-us", name: "Washington, D.C.", country: "United States", lat: 38.9072, lng: -77.0369, aliases: ["Washington DC"] },
  { key: "miami-us", name: "Miami", country: "United States", lat: 25.7617, lng: -80.1918 },
  { key: "atlanta-us", name: "Atlanta", country: "United States", lat: 33.749, lng: -84.388 },
  { key: "dallas-us", name: "Dallas", country: "United States", lat: 32.7767, lng: -96.797 },
  { key: "houston-us", name: "Houston", country: "United States", lat: 29.7604, lng: -95.3698 },
  { key: "denver-us", name: "Denver", country: "United States", lat: 39.7392, lng: -104.9903 },
  { key: "toronto-ca", name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
  { key: "vancouver-ca", name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207 },
  { key: "montreal-ca", name: "Montreal", country: "Canada", lat: 45.5017, lng: -73.5673, aliases: ["Montréal"] },
  { key: "mexico-city-mx", name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332 },
  { key: "sao-paulo-br", name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, aliases: ["Sao Paulo"] },
  { key: "buenos-aires-ar", name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816 },
  { key: "bogota-co", name: "Bogotá", country: "Colombia", lat: 4.711, lng: -74.0721, aliases: ["Bogota"] },
];

const BY_KEY = new Map(CITIES.map((c) => [c.key, c]));

export function cityByKey(key: string | null | undefined): City | null {
  return key ? BY_KEY.get(key) ?? null : null;
}

export function cityLabel(city: City): string {
  return `${city.name}, ${city.country}`;
}

// Great-circle distance in km.
export function distanceKm(a: Pick<City, "lat" | "lng">, b: Pick<City, "lat" | "lng">): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

// Names longest-first, so "Abu Dhabi" wins over a shorter name inside it.
const MATCHERS = CITIES.flatMap((c) => [c.name, ...(c.aliases ?? [])].map((n) => ({ city: c, name: n })))
  .sort((a, b) => b.name.length - a.name.length)
  .map(({ city, name }) => ({
    city,
    re: new RegExp(`(?<![\\p{L}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu"),
  }));

// The city a free-text job location refers to ("Dubai, UAE (hybrid)" →
// Dubai), or null for "Remote" and places not in the list.
export function cityFromText(text: string | null | undefined): City | null {
  if (!text) return null;
  return MATCHERS.find((m) => m.re.test(text))?.city ?? null;
}

export function isRemoteLocation(text: string | null | undefined): boolean {
  return !!text && /\bremote\b/i.test(text);
}
