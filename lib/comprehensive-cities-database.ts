/**
 * Comprehensive North American Cities Database
 * Top 10 most populated cities by state/province with coordinates
 * For transportation optimization and facility location modeling
 */

export interface CityData {
  name: string;
  state_province: string;
  country: 'US' | 'CA';
  population: number;
  lat: number;
  lon: number;
  metro_area?: string;
}

export const COMPREHENSIVE_CITIES: CityData[] = [
  // UNITED STATES - TOP 10 CITIES BY STATE

  // Alabama
  { name: 'Birmingham', state_province: 'AL', country: 'US', population: 200733, lat: 33.5186, lon: -86.8104 },
  { name: 'Montgomery', state_province: 'AL', country: 'US', population: 200603, lat: 32.3668, lon: -86.3000 },
  { name: 'Mobile', state_province: 'AL', country: 'US', population: 187041, lat: 30.6954, lon: -88.0399 },
  { name: 'Huntsville', state_province: 'AL', country: 'US', population: 215006, lat: 34.7304, lon: -86.5861 },
  { name: 'Tuscaloosa', state_province: 'AL', country: 'US', population: 101129, lat: 33.2098, lon: -87.5692 },
  { name: 'Hoover', state_province: 'AL', country: 'US', population: 92606, lat: 33.4054, lon: -86.8114 },
  { name: 'Dothan', state_province: 'AL', country: 'US', population: 71072, lat: 31.2232, lon: -85.3905 },
  { name: 'Auburn', state_province: 'AL', country: 'US', population: 76143, lat: 32.6099, lon: -85.4808 },
  { name: 'Decatur', state_province: 'AL', country: 'US', population: 57938, lat: 34.6059, lon: -86.9833 },
  { name: 'Madison', state_province: 'AL', country: 'US', population: 56933, lat: 34.6993, lon: -86.7483 },

  // Alaska
  { name: 'Anchorage', state_province: 'AK', country: 'US', population: 291247, lat: 61.2181, lon: -149.9003 },
  { name: 'Fairbanks', state_province: 'AK', country: 'US', population: 32515, lat: 64.8378, lon: -147.7164 },
  { name: 'Juneau', state_province: 'AK', country: 'US', population: 32255, lat: 58.3019, lon: -134.4197 },
  { name: 'Badger', state_province: 'AK', country: 'US', population: 19482, lat: 64.8000, lon: -147.5333 },
  { name: 'Knik-Fairview', state_province: 'AK', country: 'US', population: 19297, lat: 61.5139, lon: -149.6500 },
  { name: 'College', state_province: 'AK', country: 'US', population: 13400, lat: 64.8569, lon: -147.8028 },
  { name: 'Sitka', state_province: 'AK', country: 'US', population: 8458, lat: 57.0531, lon: -135.3300 },
  { name: 'Lakes', state_province: 'AK', country: 'US', population: 8364, lat: 61.6147, lon: -149.3700 },
  { name: 'Tanaina', state_province: 'AK', country: 'US', population: 8197, lat: 61.6011, lon: -149.4300 },
  { name: 'Ketchikan', state_province: 'AK', country: 'US', population: 8192, lat: 55.3422, lon: -131.6461 },

  // Arizona
  { name: 'Phoenix', state_province: 'AZ', country: 'US', population: 1608139, lat: 33.4484, lon: -112.0740 },
  { name: 'Tucson', state_province: 'AZ', country: 'US', population: 548073, lat: 32.2217, lon: -110.9265 },
  { name: 'Mesa', state_province: 'AZ', country: 'US', population: 504258, lat: 33.4152, lon: -111.8315 },
  { name: 'Chandler', state_province: 'AZ', country: 'US', population: 275987, lat: 33.3061, lon: -111.8413 },
  { name: 'Scottsdale', state_province: 'AZ', country: 'US', population: 258069, lat: 33.4942, lon: -111.9261 },
  { name: 'Glendale', state_province: 'AZ', country: 'US', population: 248325, lat: 33.5387, lon: -112.1860 },
  { name: 'Gilbert', state_province: 'AZ', country: 'US', population: 267918, lat: 33.3528, lon: -111.7890 },
  { name: 'Tempe', state_province: 'AZ', country: 'US', population: 195805, lat: 33.4255, lon: -111.9400 },
  { name: 'Peoria', state_province: 'AZ', country: 'US', population: 190985, lat: 33.5806, lon: -112.2374 },
  { name: 'Surprise', state_province: 'AZ', country: 'US', population: 143148, lat: 33.6292, lon: -112.3679 },

  // Arkansas
  { name: 'Little Rock', state_province: 'AR', country: 'US', population: 198042, lat: 34.7465, lon: -92.2896 },
  { name: 'Fayetteville', state_province: 'AR', country: 'US', population: 93949, lat: 36.0726, lon: -94.1574 },
  { name: 'Fort Smith', state_province: 'AR', country: 'US', population: 89142, lat: 35.3859, lon: -94.3985 },
  { name: 'Springdale', state_province: 'AR', country: 'US', population: 84161, lat: 36.1867, lon: -94.1288 },
  { name: 'Jonesboro', state_province: 'AR', country: 'US', population: 78576, lat: 35.8423, lon: -90.7043 },
  { name: 'North Little Rock', state_province: 'AR', country: 'US', population: 64591, lat: 34.7695, lon: -92.2671 },
  { name: 'Conway', state_province: 'AR', country: 'US', population: 64134, lat: 35.0887, lon: -92.4421 },
  { name: 'Rogers', state_province: 'AR', country: 'US', population: 69908, lat: 36.3320, lon: -94.1185 },
  { name: 'Pine Bluff', state_province: 'AR', country: 'US', population: 41253, lat: 34.2284, lon: -92.0032 },
  { name: 'Bentonville', state_province: 'AR', country: 'US', population: 54909, lat: 36.3729, lon: -94.2088 },

  // California
  { name: 'Los Angeles', state_province: 'CA', country: 'US', population: 3898747, lat: 34.0522, lon: -118.2437 },
  { name: 'San Diego', state_province: 'CA', country: 'US', population: 1386932, lat: 32.7157, lon: -117.1611 },
  { name: 'San Jose', state_province: 'CA', country: 'US', population: 1013240, lat: 37.3382, lon: -121.8863 },
  { name: 'San Francisco', state_province: 'CA', country: 'US', population: 873965, lat: 37.7749, lon: -122.4194 },
  { name: 'Fresno', state_province: 'CA', country: 'US', population: 542107, lat: 36.7378, lon: -119.7871 },
  { name: 'Sacramento', state_province: 'CA', country: 'US', population: 524943, lat: 38.5816, lon: -121.4944 },
  { name: 'Long Beach', state_province: 'CA', country: 'US', population: 466742, lat: 33.7701, lon: -118.1937 },
  { name: 'Oakland', state_province: 'CA', country: 'US', population: 440646, lat: 37.8044, lon: -122.2712 },
  { name: 'Bakersfield', state_province: 'CA', country: 'US', population: 383579, lat: 35.3733, lon: -119.0187 },
  { name: 'Anaheim', state_province: 'CA', country: 'US', population: 346824, lat: 33.8366, lon: -117.9143 },

  // Colorado
  { name: 'Denver', state_province: 'CO', country: 'US', population: 715522, lat: 39.7392, lon: -104.9903 },
  { name: 'Colorado Springs', state_province: 'CO', country: 'US', population: 478961, lat: 38.8339, lon: -104.8214 },
  { name: 'Aurora', state_province: 'CO', country: 'US', population: 379289, lat: 39.7294, lon: -104.8319 },
  { name: 'Fort Collins', state_province: 'CO', country: 'US', population: 169810, lat: 40.5853, lon: -105.0844 },
  { name: 'Lakewood', state_province: 'CO', country: 'US', population: 155984, lat: 39.7047, lon: -105.0814 },
  { name: 'Thornton', state_province: 'CO', country: 'US', population: 141867, lat: 39.8681, lon: -104.9720 },
  { name: 'Arvada', state_province: 'CO', country: 'US', population: 124402, lat: 39.8028, lon: -105.0875 },
  { name: 'Westminster', state_province: 'CO', country: 'US', population: 116317, lat: 39.8367, lon: -105.0372 },
  { name: 'Pueblo', state_province: 'CO', country: 'US', population: 111876, lat: 38.2544, lon: -104.6091 },
  { name: 'Centennial', state_province: 'CO', country: 'US', population: 108418, lat: 39.5807, lon: -104.8762 },

  // Connecticut
  { name: 'Bridgeport', state_province: 'CT', country: 'US', population: 148654, lat: 41.1865, lon: -73.1952 },
  { name: 'New Haven', state_province: 'CT', country: 'US', population: 134023, lat: 41.3083, lon: -72.9279 },
  { name: 'Hartford', state_province: 'CT', country: 'US', population: 121054, lat: 41.7658, lon: -72.6734 },
  { name: 'Stamford', state_province: 'CT', country: 'US', population: 135470, lat: 41.0534, lon: -73.5387 },
  { name: 'Waterbury', state_province: 'CT', country: 'US', population: 114403, lat: 41.5581, lon: -73.0515 },
  { name: 'Norwalk', state_province: 'CT', country: 'US', population: 91184, lat: 41.1177, lon: -73.4079 },
  { name: 'Danbury', state_province: 'CT', country: 'US', population: 86518, lat: 41.3948, lon: -73.4540 },
  { name: 'New Britain', state_province: 'CT', country: 'US', population: 72543, lat: 41.6612, lon: -72.7795 },
  { name: 'West Haven', state_province: 'CT', country: 'US', population: 55584, lat: 41.2707, lon: -72.9470 },
  { name: 'Greenwich', state_province: 'CT', country: 'US', population: 63518, lat: 41.0262, lon: -73.6282 },

  // Delaware
  { name: 'Wilmington', state_province: 'DE', country: 'US', population: 70898, lat: 39.7391, lon: -75.5398 },
  { name: 'Dover', state_province: 'DE', country: 'US', population: 38079, lat: 39.1612, lon: -75.5264 },
  { name: 'Newark', state_province: 'DE', country: 'US', population: 33822, lat: 39.6837, lon: -75.7497 },
  { name: 'Middletown', state_province: 'DE', country: 'US', population: 22350, lat: 39.4496, lon: -75.7163 },
  { name: 'Smyrna', state_province: 'DE', country: 'US', population: 12883, lat: 39.2998, lon: -75.6047 },
  { name: 'Milford', state_province: 'DE', country: 'US', population: 11190, lat: 38.9129, lon: -75.4277 },
  { name: 'Seaford', state_province: 'DE', country: 'US', population: 7897, lat: 38.6412, lon: -75.6111 },
  { name: 'Georgetown', state_province: 'DE', country: 'US', population: 7436, lat: 38.6901, lon: -75.3855 },
  { name: 'Elsmere', state_province: 'DE', country: 'US', population: 6131, lat: 39.7390, lon: -75.5882 },
  { name: 'New Castle', state_province: 'DE', country: 'US', population: 5285, lat: 39.6620, lon: -75.5660 },

  // Florida
  { name: 'Jacksonville', state_province: 'FL', country: 'US', population: 949611, lat: 30.3322, lon: -81.6557 },
  { name: 'Miami', state_province: 'FL', country: 'US', population: 442241, lat: 25.7617, lon: -80.1918 },
  { name: 'Tampa', state_province: 'FL', country: 'US', population: 384959, lat: 27.9506, lon: -82.4572 },
  { name: 'Orlando', state_province: 'FL', country: 'US', population: 307573, lat: 28.5383, lon: -81.3792 },
  { name: 'St. Petersburg', state_province: 'FL', country: 'US', population: 258308, lat: 27.7676, lon: -82.6404 },
  { name: 'Hialeah', state_province: 'FL', country: 'US', population: 223109, lat: 25.8576, lon: -80.2781 },
  { name: 'Port St. Lucie', state_province: 'FL', country: 'US', population: 204851, lat: 27.2730, lon: -80.3582 },
  { name: 'Cape Coral', state_province: 'FL', country: 'US', population: 194016, lat: 26.5629, lon: -81.9495 },
  { name: 'Tallahassee', state_province: 'FL', country: 'US', population: 194500, lat: 30.4518, lon: -84.2807 },
  { name: 'Fort Lauderdale', state_province: 'FL', country: 'US', population: 182760, lat: 26.1224, lon: -80.1373 },

  // Georgia
  { name: 'Atlanta', state_province: 'GA', country: 'US', population: 498715, lat: 33.7490, lon: -84.3880 },
  { name: 'Augusta', state_province: 'GA', country: 'US', population: 202081, lat: 33.4735, lon: -82.0105 },
  { name: 'Columbus', state_province: 'GA', country: 'US', population: 206922, lat: 32.4609, lon: -84.9877 },
  { name: 'Macon', state_province: 'GA', country: 'US', population: 157346, lat: 32.8407, lon: -83.6324 },
  { name: 'Savannah', state_province: 'GA', country: 'US', population: 147780, lat: 32.0835, lon: -81.0998 },
  { name: 'Athens', state_province: 'GA', country: 'US', population: 127315, lat: 33.9519, lon: -83.3576 },
  { name: 'Sandy Springs', state_province: 'GA', country: 'US', population: 108080, lat: 33.9304, lon: -84.3733 },
  { name: 'Roswell', state_province: 'GA', country: 'US', population: 94884, lat: 34.0232, lon: -84.3616 },
  { name: 'Johns Creek', state_province: 'GA', country: 'US', population: 84551, lat: 34.0289, lon: -84.1986 },
  { name: 'Albany', state_province: 'GA', country: 'US', population: 72634, lat: 31.5804, lon: -84.1557 },

  // Hawaii
  { name: 'Honolulu', state_province: 'HI', country: 'US', population: 345064, lat: 21.3099, lon: -157.8581 },
  { name: 'East Honolulu', state_province: 'HI', country: 'US', population: 50922, lat: 21.2777, lon: -157.7181 },
  { name: 'Pearl City', state_province: 'HI', country: 'US', population: 45295, lat: 21.3972, lon: -157.9742 },
  { name: 'Hilo', state_province: 'HI', country: 'US', population: 45248, lat: 19.7297, lon: -155.0900 },
  { name: 'Kailua', state_province: 'HI', country: 'US', population: 37653, lat: 21.4022, lon: -157.7394 },
  { name: 'Waipahu', state_province: 'HI', country: 'US', population: 43485, lat: 21.3861, lon: -158.0092 },
  { name: 'Kaneohe', state_province: 'HI', country: 'US', population: 34970, lat: 21.4180, lon: -157.8025 },
  { name: 'Mililani Town', state_province: 'HI', country: 'US', population: 27629, lat: 21.4511, lon: -158.0133 },
  { name: 'Kahului', state_province: 'HI', country: 'US', population: 26337, lat: 20.8947, lon: -156.4700 },
  { name: 'Ewa Gentry', state_province: 'HI', country: 'US', population: 25671, lat: 21.3356, lon: -158.0242 },

  // Idaho
  { name: 'Boise', state_province: 'ID', country: 'US', population: 235684, lat: 43.6150, lon: -116.2023 },
  { name: 'Meridian', state_province: 'ID', country: 'US', population: 117635, lat: 43.6121, lon: -116.3915 },
  { name: 'Nampa', state_province: 'ID', country: 'US', population: 100200, lat: 43.5407, lon: -116.5635 },
  { name: 'Idaho Falls', state_province: 'ID', country: 'US', population: 64818, lat: 43.4666, lon: -112.0340 },
  { name: 'Pocatello', state_province: 'ID', country: 'US', population: 56637, lat: 42.8713, lon: -112.4455 },
  { name: 'Caldwell', state_province: 'ID', country: 'US', population: 59996, lat: 43.6629, lon: -116.6874 },
  { name: 'Coeur d\'Alene', state_province: 'ID', country: 'US', population: 54628, lat: 47.6777, lon: -116.7804 },
  { name: 'Twin Falls', state_province: 'ID', country: 'US', population: 51807, lat: 42.5680, lon: -114.4609 },
  { name: 'Lewiston', state_province: 'ID', country: 'US', population: 34203, lat: 46.4165, lon: -117.0177 },
  { name: 'Post Falls', state_province: 'ID', country: 'US', population: 37777, lat: 47.7179, lon: -116.9515 },

  // Illinois
  { name: 'Chicago', state_province: 'IL', country: 'US', population: 2693976, lat: 41.8781, lon: -87.6298 },
  { name: 'Aurora', state_province: 'IL', country: 'US', population: 180542, lat: 41.7606, lon: -88.3201 },
  { name: 'Rockford', state_province: 'IL', country: 'US', population: 148655, lat: 42.2711, lon: -89.0940 },
  { name: 'Joliet', state_province: 'IL', country: 'US', population: 150362, lat: 41.5250, lon: -88.0817 },
  { name: 'Naperville', state_province: 'IL', country: 'US', population: 149104, lat: 41.7508, lon: -88.1535 },
  { name: 'Springfield', state_province: 'IL', country: 'US', population: 114394, lat: 39.7817, lon: -89.6501 },
  { name: 'Peoria', state_province: 'IL', country: 'US', population: 113150, lat: 40.6936, lon: -89.5890 },
  { name: 'Elgin', state_province: 'IL', country: 'US', population: 114797, lat: 42.0354, lon: -88.2826 },
  { name: 'Waukegan', state_province: 'IL', country: 'US', population: 89321, lat: 42.3636, lon: -87.8448 },
  { name: 'Cicero', state_province: 'IL', country: 'US', population: 85616, lat: 41.8456, lon: -87.7539 },

  // Indiana
  { name: 'Indianapolis', state_province: 'IN', country: 'US', population: 887642, lat: 39.7684, lon: -86.1581 },
  { name: 'Fort Wayne', state_province: 'IN', country: 'US', population: 270402, lat: 41.0793, lon: -85.1394 },
  { name: 'Evansville', state_province: 'IN', country: 'US', population: 118414, lat: 37.9716, lon: -87.5711 },
  { name: 'South Bend', state_province: 'IN', country: 'US', population: 103395, lat: 41.6764, lon: -86.2520 },
  { name: 'Carmel', state_province: 'IN', country: 'US', population: 99757, lat: 39.9784, lon: -86.1180 },
  { name: 'Fishers', state_province: 'IN', country: 'US', population: 95310, lat: 39.9568, lon: -86.0139 },
  { name: 'Bloomington', state_province: 'IN', country: 'US', population: 85755, lat: 39.1653, lon: -86.5264 },
  { name: 'Hammond', state_province: 'IN', country: 'US', population: 77879, lat: 41.5834, lon: -87.5000 },
  { name: 'Gary', state_province: 'IN', country: 'US', population: 69093, lat: 41.5934, lon: -87.3464 },
  { name: 'Lafayette', state_province: 'IN', country: 'US', population: 70783, lat: 40.4167, lon: -86.8753 },

  // Iowa
  { name: 'Des Moines', state_province: 'IA', country: 'US', population: 214133, lat: 41.5868, lon: -93.6250 },
  { name: 'Cedar Rapids', state_province: 'IA', country: 'US', population: 137710, lat: 41.9778, lon: -91.6656 },
  { name: 'Davenport', state_province: 'IA', country: 'US', population: 101724, lat: 41.5236, lon: -90.5776 },
  { name: 'Sioux City', state_province: 'IA', country: 'US', population: 85797, lat: 42.4959, lon: -96.4003 },
  { name: 'Iowa City', state_province: 'IA', country: 'US', population: 74828, lat: 41.6611, lon: -91.5302 },
  { name: 'Waterloo', state_province: 'IA', country: 'US', population: 67314, lat: 42.4928, lon: -92.3426 },
  { name: 'Council Bluffs', state_province: 'IA', country: 'US', population: 62230, lat: 41.2619, lon: -95.8608 },
  { name: 'Ames', state_province: 'IA', country: 'US', population: 66258, lat: 42.0308, lon: -93.6319 },
  { name: 'Dubuque', state_province: 'IA', country: 'US', population: 58155, lat: 42.5006, lon: -90.6648 },
  { name: 'West Des Moines', state_province: 'IA', country: 'US', population: 68723, lat: 41.5772, lon: -93.7112 },

  // Kansas
  { name: 'Wichita', state_province: 'KS', country: 'US', population: 397532, lat: 37.6872, lon: -97.3301 },
  { name: 'Overland Park', state_province: 'KS', country: 'US', population: 195494, lat: 38.9822, lon: -94.6708 },
  { name: 'Kansas City', state_province: 'KS', country: 'US', population: 156607, lat: 39.1142, lon: -94.6275 },
  { name: 'Olathe', state_province: 'KS', country: 'US', population: 140545, lat: 38.8814, lon: -94.8191 },
  { name: 'Topeka', state_province: 'KS', country: 'US', population: 125904, lat: 39.0473, lon: -95.6890 },
  { name: 'Lawrence', state_province: 'KS', country: 'US', population: 98193, lat: 38.9717, lon: -95.2353 },
  { name: 'Shawnee', state_province: 'KS', country: 'US', population: 65513, lat: 39.0228, lon: -94.7200 },
  { name: 'Manhattan', state_province: 'KS', country: 'US', population: 54100, lat: 39.1836, lon: -96.5717 },
  { name: 'Lenexa', state_province: 'KS', country: 'US', population: 57434, lat: 38.9536, lon: -94.7336 },
  { name: 'Salina', state_province: 'KS', country: 'US', population: 46889, lat: 38.8403, lon: -97.6114 },

  // Kentucky
  { name: 'Louisville', state_province: 'KY', country: 'US', population: 633045, lat: 38.2527, lon: -85.7585 },
  { name: 'Lexington', state_province: 'KY', country: 'US', population: 322570, lat: 38.0406, lon: -84.5037 },
  { name: 'Bowling Green', state_province: 'KY', country: 'US', population: 72294, lat: 36.9685, lon: -86.4808 },
  { name: 'Owensboro', state_province: 'KY', country: 'US', population: 60183, lat: 37.7719, lon: -87.1111 },
  { name: 'Covington', state_province: 'KY', country: 'US', population: 40981, lat: 39.0837, lon: -84.5086 },
  { name: 'Richmond', state_province: 'KY', country: 'US', population: 34585, lat: 37.7476, lon: -84.2941 },
  { name: 'Georgetown', state_province: 'KY', country: 'US', population: 34395, lat: 38.2098, lon: -84.5588 },
  { name: 'Florence', state_province: 'KY', country: 'US', population: 32721, lat: 38.9989, lon: -84.6266 },
  { name: 'Hopkinsville', state_province: 'KY', country: 'US', population: 31180, lat: 36.8656, lon: -87.4886 },
  { name: 'Nicholasville', state_province: 'KY', country: 'US', population: 31709, lat: 37.8803, lon: -84.5730 },

  // Louisiana
  { name: 'New Orleans', state_province: 'LA', country: 'US', population: 383997, lat: 29.9511, lon: -90.0715 },
  { name: 'Baton Rouge', state_province: 'LA', country: 'US', population: 227470, lat: 30.4515, lon: -91.1871 },
  { name: 'Shreveport', state_province: 'LA', country: 'US', population: 187593, lat: 32.5252, lon: -93.7502 },
  { name: 'Metairie', state_province: 'LA', country: 'US', population: 138481, lat: 29.9840, lon: -90.1534 },
  { name: 'Lafayette', state_province: 'LA', country: 'US', population: 121374, lat: 30.2241, lon: -92.0198 },
  { name: 'Lake Charles', state_province: 'LA', country: 'US', population: 84872, lat: 30.2266, lon: -93.2174 },
  { name: 'Kenner', state_province: 'LA', country: 'US', population: 66975, lat: 29.9941, lon: -90.2417 },
  { name: 'Bossier City', state_province: 'LA', country: 'US', population: 62701, lat: 32.5160, lon: -93.7321 },
  { name: 'Monroe', state_province: 'LA', country: 'US', population: 47702, lat: 32.5093, lon: -92.1193 },
  { name: 'Alexandria', state_province: 'LA', country: 'US', population: 45275, lat: 31.3112, lon: -92.4426 },

  // Maine
  { name: 'Portland', state_province: 'ME', country: 'US', population: 68408, lat: 43.6591, lon: -70.2568 },
  { name: 'Lewiston', state_province: 'ME', country: 'US', population: 36221, lat: 44.1009, lon: -70.2148 },
  { name: 'Bangor', state_province: 'ME', country: 'US', population: 31753, lat: 44.8016, lon: -68.7712 },
  { name: 'South Portland', state_province: 'ME', country: 'US', population: 25665, lat: 43.6414, lon: -70.2409 },
  { name: 'Auburn', state_province: 'ME', country: 'US', population: 24061, lat: 44.0979, lon: -70.2311 },
  { name: 'Biddeford', state_province: 'ME', country: 'US', population: 22552, lat: 43.4926, lon: -70.4533 },
  { name: 'Sanford', state_province: 'ME', country: 'US', population: 21982, lat: 43.4395, lon: -70.7740 },
  { name: 'Saco', state_province: 'ME', country: 'US', population: 19497, lat: 43.5009, lon: -70.4428 },
  { name: 'Westbrook', state_province: 'ME', country: 'US', population: 18494, lat: 43.6770, lon: -70.3713 },
  { name: 'Augusta', state_province: 'ME', country: 'US', population: 18899, lat: 44.3106, lon: -69.7795 },

  // Maryland
  { name: 'Baltimore', state_province: 'MD', country: 'US', population: 585708, lat: 39.2904, lon: -76.6122 },
  { name: 'Frederick', state_province: 'MD', country: 'US', population: 78171, lat: 39.4143, lon: -77.4105 },
  { name: 'Rockville', state_province: 'MD', country: 'US', population: 67117, lat: 39.0840, lon: -77.1528 },
  { name: 'Gaithersburg', state_province: 'MD', country: 'US', population: 69657, lat: 39.1434, lon: -77.2014 },
  { name: 'Bowie', state_province: 'MD', country: 'US', population: 58329, lat: 38.9426, lon: -76.7302 },
  { name: 'Hagerstown', state_province: 'MD', country: 'US', population: 43527, lat: 39.6418, lon: -77.7200 },
  { name: 'Annapolis', state_province: 'MD', country: 'US', population: 40812, lat: 38.9784, lon: -76.4951 },
  { name: 'College Park', state_province: 'MD', country: 'US', population: 32303, lat: 38.9807, lon: -76.9369 },
  { name: 'Salisbury', state_province: 'MD', country: 'US', population: 33050, lat: 38.3607, lon: -75.5994 },
  { name: 'Laurel', state_province: 'MD', country: 'US', population: 25346, lat: 39.0993, lon: -76.8483 },

  // Massachusetts
  { name: 'Boston', state_province: 'MA', country: 'US', population: 695506, lat: 42.3601, lon: -71.0589 },
  { name: 'Worcester', state_province: 'MA', country: 'US', population: 206518, lat: 42.2626, lon: -71.8023 },
  { name: 'Springfield', state_province: 'MA', country: 'US', population: 155929, lat: 42.1015, lon: -72.5898 },
  { name: 'Cambridge', state_province: 'MA', country: 'US', population: 118403, lat: 42.3736, lon: -71.1097 },
  { name: 'Lowell', state_province: 'MA', country: 'US', population: 115554, lat: 42.6334, lon: -71.3162 },
  { name: 'Brockton', state_province: 'MA', country: 'US', population: 105643, lat: 42.0834, lon: -71.0184 },
  { name: 'New Bedford', state_province: 'MA', country: 'US', population: 101079, lat: 41.6362, lon: -70.9342 },
  { name: 'Quincy', state_province: 'MA', country: 'US', population: 101636, lat: 42.2529, lon: -71.0023 },
  { name: 'Lynn', state_province: 'MA', country: 'US', population: 101253, lat: 42.4668, lon: -70.9495 },
  { name: 'Fall River', state_province: 'MA', country: 'US', population: 94000, lat: 41.7015, lon: -71.1550 },

  // Michigan
  { name: 'Detroit', state_province: 'MI', country: 'US', population: 639111, lat: 42.3314, lon: -83.0458 },
  { name: 'Grand Rapids', state_province: 'MI', country: 'US', population: 198917, lat: 42.9634, lon: -85.6681 },
  { name: 'Warren', state_province: 'MI', country: 'US', population: 139387, lat: 42.5144, lon: -83.0146 },
  { name: 'Sterling Heights', state_province: 'MI', country: 'US', population: 134346, lat: 42.5803, lon: -83.0302 },
  { name: 'Ann Arbor', state_province: 'MI', country: 'US', population: 123851, lat: 42.2808, lon: -83.7430 },
  { name: 'Lansing', state_province: 'MI', country: 'US', population: 118427, lat: 42.3314, lon: -84.5467 },
  { name: 'Flint', state_province: 'MI', country: 'US', population: 102434, lat: 43.0125, lon: -83.6875 },
  { name: 'Dearborn', state_province: 'MI', country: 'US', population: 109976, lat: 42.3223, lon: -83.1763 },
  { name: 'Livonia', state_province: 'MI', country: 'US', population: 95535, lat: 42.3684, lon: -83.3527 },
  { name: 'Westland', state_province: 'MI', country: 'US', population: 84094, lat: 42.3242, lon: -83.4002 },

  // Minnesota
  { name: 'Minneapolis', state_province: 'MN', country: 'US', population: 429954, lat: 44.9778, lon: -93.2650 },
  { name: 'Saint Paul', state_province: 'MN', country: 'US', population: 311527, lat: 44.9537, lon: -93.0900 },
  { name: 'Rochester', state_province: 'MN', country: 'US', population: 121395, lat: 44.0121, lon: -92.4802 },
  { name: 'Duluth', state_province: 'MN', country: 'US', population: 86697, lat: 46.7867, lon: -92.1005 },
  { name: 'Bloomington', state_province: 'MN', country: 'US', population: 89987, lat: 44.8408, lon: -93.2982 },
  { name: 'Brooklyn Park', state_province: 'MN', country: 'US', population: 86478, lat: 45.0941, lon: -93.3563 },
  { name: 'Plymouth', state_province: 'MN', country: 'US', population: 81026, lat: 45.0105, lon: -93.4555 },
  { name: 'Woodbury', state_province: 'MN', country: 'US', population: 75102, lat: 44.9239, lon: -92.9594 },
  { name: 'Lakeville', state_province: 'MN', country: 'US', population: 71436, lat: 44.6496, lon: -93.2428 },
  { name: 'Maple Grove', state_province: 'MN', country: 'US', population: 70253, lat: 45.0725, lon: -93.4557 },

  // Mississippi
  { name: 'Jackson', state_province: 'MS', country: 'US', population: 153701, lat: 32.2988, lon: -90.1848 },
  { name: 'Gulfport', state_province: 'MS', country: 'US', population: 72926, lat: 30.3674, lon: -89.0928 },
  { name: 'Southaven', state_province: 'MS', country: 'US', population: 54648, lat: 34.9890, lon: -90.0126 },
  { name: 'Hattiesburg', state_province: 'MS', country: 'US', population: 48730, lat: 31.3271, lon: -89.2903 },
  { name: 'Biloxi', state_province: 'MS', country: 'US', population: 49449, lat: 30.3960, lon: -88.8853 },
  { name: 'Meridian', state_province: 'MS', country: 'US', population: 37314, lat: 32.3643, lon: -88.7034 },
  { name: 'Tupelo', state_province: 'MS', country: 'US', population: 37923, lat: 34.2576, lon: -88.7034 },
  { name: 'Greenville', state_province: 'MS', country: 'US', population: 29670, lat: 33.4151, lon: -91.0618 },
  { name: 'Olive Branch', state_province: 'MS', country: 'US', population: 39711, lat: 34.9618, lon: -89.8295 },
  { name: 'Horn Lake', state_province: 'MS', country: 'US', population: 27096, lat: 34.9551, lon: -90.0376 },

  // Missouri  
  { name: 'Kansas City', state_province: 'MO', country: 'US', population: 508090, lat: 39.0997, lon: -94.5786 },
  { name: 'St. Louis', state_province: 'MO', country: 'US', population: 301578, lat: 38.6270, lon: -90.1994 },
  { name: 'Springfield', state_province: 'MO', country: 'US', population: 169176, lat: 37.2153, lon: -93.2982 },
  { name: 'Columbia', state_province: 'MO', country: 'US', population: 126254, lat: 38.9517, lon: -92.3341 },
  { name: 'Independence', state_province: 'MO', country: 'US', population: 123011, lat: 39.0911, lon: -94.4155 },
  { name: 'Lee\'s Summit', state_province: 'MO', country: 'US', population: 101108, lat: 38.9109, lon: -94.3822 },
  { name: 'O\'Fallon', state_province: 'MO', country: 'US', population: 91316, lat: 38.8106, lon: -90.6998 },
  { name: 'St. Joseph', state_province: 'MO', country: 'US', population: 72473, lat: 39.7391, lon: -94.8469 },
  { name: 'St. Charles', state_province: 'MO', country: 'US', population: 70493, lat: 38.7881, lon: -90.4974 },
  { name: 'St. Peters', state_province: 'MO', country: 'US', population: 57732, lat: 38.7875, lon: -90.6298 },

  // Montana
  { name: 'Billings', state_province: 'MT', country: 'US', population: 117116, lat: 45.7833, lon: -108.5007 },
  { name: 'Missoula', state_province: 'MT', country: 'US', population: 75516, lat: 46.8721, lon: -113.9940 },
  { name: 'Great Falls', state_province: 'MT', country: 'US', population: 60442, lat: 47.4941, lon: -111.2833 },
  { name: 'Bozeman', state_province: 'MT', country: 'US', population: 53293, lat: 45.6770, lon: -111.0429 },
  { name: 'Butte', state_province: 'MT', country: 'US', population: 34494, lat: 46.0038, lon: -112.5348 },
  { name: 'Helena', state_province: 'MT', country: 'US', population: 33124, lat: 46.5965, lon: -112.0362 },
  { name: 'Kalispell', state_province: 'MT', country: 'US', population: 26225, lat: 48.1958, lon: -114.3129 },
  { name: 'Havre', state_province: 'MT', country: 'US', population: 9362, lat: 48.5500, lon: -109.6841 },
  { name: 'Anaconda', state_province: 'MT', country: 'US', population: 9421, lat: 46.1282, lon: -112.9422 },
  { name: 'Miles City', state_province: 'MT', country: 'US', population: 8354, lat: 46.4083, lon: -105.8400 },

  // Nebraska
  { name: 'Omaha', state_province: 'NE', country: 'US', population: 486051, lat: 41.2524, lon: -95.9980 },
  { name: 'Lincoln', state_province: 'NE', country: 'US', population: 295178, lat: 40.8136, lon: -96.7026 },
  { name: 'Bellevue', state_province: 'NE', country: 'US', population: 64176, lat: 41.1370, lon: -95.8906 },
  { name: 'Grand Island', state_province: 'NE', country: 'US', population: 53131, lat: 40.9264, lon: -98.3420 },
  { name: 'Kearney', state_province: 'NE', country: 'US', population: 33790, lat: 40.6994, lon: -99.0817 },
  { name: 'Fremont', state_province: 'NE', country: 'US', population: 27141, lat: 41.4333, lon: -96.4981 },
  { name: 'Hastings', state_province: 'NE', country: 'US', population: 25152, lat: 40.5861, lon: -98.3887 },
  { name: 'Norfolk', state_province: 'NE', country: 'US', population: 24210, lat: 42.0281, lon: -97.4170 },
  { name: 'North Platte', state_province: 'NE', country: 'US', population: 23390, lat: 41.1239, lon: -100.7654 },
  { name: 'Papillion', state_province: 'NE', country: 'US', population: 25318, lat: 41.1544, lon: -96.0422 },

  // Nevada
  { name: 'Las Vegas', state_province: 'NV', country: 'US', population: 641903, lat: 36.1699, lon: -115.1398 },
  { name: 'Henderson', state_province: 'NV', country: 'US', population: 320189, lat: 36.0395, lon: -114.9817 },
  { name: 'Reno', state_province: 'NV', country: 'US', population: 264165, lat: 39.5296, lon: -119.8138 },
  { name: 'North Las Vegas', state_province: 'NV', country: 'US', population: 262527, lat: 36.1989, lon: -115.1175 },
  { name: 'Sparks', state_province: 'NV', country: 'US', population: 108445, lat: 39.5349, lon: -119.7527 },
  { name: 'Carson City', state_province: 'NV', country: 'US', population: 58639, lat: 39.1638, lon: -119.7674 },
  { name: 'Fernley', state_province: 'NV', country: 'US', population: 22895, lat: 39.6077, lon: -119.2518 },
  { name: 'Elko', state_province: 'NV', country: 'US', population: 20564, lat: 40.8324, lon: -115.7631 },
  { name: 'Mesquite', state_province: 'NV', country: 'US', population: 20471, lat: 36.8055, lon: -114.0672 },
  { name: 'Boulder City', state_province: 'NV', country: 'US', population: 14885, lat: 35.9728, lon: -114.8324 },

  // New Hampshire
  { name: 'Manchester', state_province: 'NH', country: 'US', population: 115644, lat: 42.9956, lon: -71.4548 },
  { name: 'Nashua', state_province: 'NH', country: 'US', population: 91322, lat: 42.7654, lon: -71.4676 },
  { name: 'Concord', state_province: 'NH', country: 'US', population: 43976, lat: 43.2081, lon: -71.5376 },
  { name: 'Derry', state_province: 'NH', country: 'US', population: 34317, lat: 42.8801, lon: -71.3273 },
  { name: 'Rochester', state_province: 'NH', country: 'US', population: 32492, lat: 43.3042, lon: -70.9759 },
  { name: 'Salem', state_province: 'NH', country: 'US', population: 30089, lat: 42.7881, lon: -71.2009 },
  { name: 'Dover', state_province: 'NH', country: 'US', population: 32741, lat: 43.1979, lon: -70.8737 },
  { name: 'Merrimack', state_province: 'NH', country: 'US', population: 26632, lat: 42.8653, lon: -71.4912 },
  { name: 'Londonderry', state_province: 'NH', country: 'US', population: 25826, lat: 42.8653, lon: -71.3739 },
  { name: 'Hudson', state_province: 'NH', country: 'US', population: 25394, lat: 42.7653, lon: -71.4340 },

  // New Jersey
  { name: 'Newark', state_province: 'NJ', country: 'US', population: 311549, lat: 40.7357, lon: -74.1724 },
  { name: 'Jersey City', state_province: 'NJ', country: 'US', population: 292449, lat: 40.7282, lon: -74.0776 },
  { name: 'Paterson', state_province: 'NJ', country: 'US', population: 159732, lat: 40.9168, lon: -74.1718 },
  { name: 'Elizabeth', state_province: 'NJ', country: 'US', population: 137298, lat: 40.6640, lon: -74.2107 },
  { name: 'Edison', state_province: 'NJ', country: 'US', population: 107588, lat: 40.5187, lon: -74.4121 },
  { name: 'Woodbridge', state_province: 'NJ', country: 'US', population: 103639, lat: 40.5576, lon: -74.2846 },
  { name: 'Lakewood', state_province: 'NJ', country: 'US', population: 135158, lat: 40.0979, lon: -74.2179 },
  { name: 'Toms River', state_province: 'NJ', country: 'US', population: 95438, lat: 39.9537, lon: -74.1979 },
  { name: 'Hamilton', state_province: 'NJ', country: 'US', population: 92297, lat: 40.2298, lon: -74.6990 },
  { name: 'Trenton', state_province: 'NJ', country: 'US', population: 90871, lat: 40.2206, lon: -74.7565 },

  // New Mexico
  { name: 'Albuquerque', state_province: 'NM', country: 'US', population: 564559, lat: 35.0844, lon: -106.6504 },
  { name: 'Las Cruces', state_province: 'NM', country: 'US', population: 111385, lat: 32.3199, lon: -106.7637 },
  { name: 'Rio Rancho', state_province: 'NM', country: 'US', population: 104046, lat: 35.2327, lon: -106.6630 },
  { name: 'Santa Fe', state_province: 'NM', country: 'US', population: 87505, lat: 35.6870, lon: -105.9378 },
  { name: 'Roswell', state_province: 'NM', country: 'US', population: 48422, lat: 33.3943, lon: -104.5230 },
  { name: 'Farmington', state_province: 'NM', country: 'US', population: 44790, lat: 36.7281, lon: -108.2187 },
  { name: 'Clovis', state_province: 'NM', country: 'US', population: 38701, lat: 34.4048, lon: -103.2052 },
  { name: 'Hobbs', state_province: 'NM', country: 'US', population: 40508, lat: 32.7026, lon: -103.1360 },
  { name: 'Alamogordo', state_province: 'NM', country: 'US', population: 31384, lat: 32.8995, lon: -105.9603 },
  { name: 'Carlsbad', state_province: 'NM', country: 'US', population: 32238, lat: 32.4206, lon: -104.2288 },

  // New York
  { name: 'New York City', state_province: 'NY', country: 'US', population: 8336817, lat: 40.7128, lon: -74.0060 },
  { name: 'Buffalo', state_province: 'NY', country: 'US', population: 278349, lat: 42.8864, lon: -78.8784 },
  { name: 'Rochester', state_province: 'NY', country: 'US', population: 211328, lat: 43.1566, lon: -77.6088 },
  { name: 'Yonkers', state_province: 'NY', country: 'US', population: 211569, lat: 40.9312, lon: -73.8988 },
  { name: 'Syracuse', state_province: 'NY', country: 'US', population: 148620, lat: 43.0481, lon: -76.1474 },
  { name: 'Albany', state_province: 'NY', country: 'US', population: 99224, lat: 42.6526, lon: -73.7562 },
  { name: 'New Rochelle', state_province: 'NY', country: 'US', population: 79726, lat: 40.9115, lon: -73.7832 },
  { name: 'Mount Vernon', state_province: 'NY', country: 'US', population: 67292, lat: 40.9126, lon: -73.8370 },
  { name: 'Schenectady', state_province: 'NY', country: 'US', population: 65273, lat: 42.8142, lon: -73.9396 },
  { name: 'Utica', state_province: 'NY', country: 'US', population: 60651, lat: 43.1009, lon: -75.2327 },

  // North Carolina
  { name: 'Charlotte', state_province: 'NC', country: 'US', population: 874579, lat: 35.2271, lon: -80.8431 },
  { name: 'Raleigh', state_province: 'NC', country: 'US', population: 474069, lat: 35.7796, lon: -78.6382 },
  { name: 'Greensboro', state_province: 'NC', country: 'US', population: 296710, lat: 36.0726, lon: -79.7920 },
  { name: 'Durham', state_province: 'NC', country: 'US', population: 283506, lat: 35.9940, lon: -78.8986 },
  { name: 'Winston-Salem', state_province: 'NC', country: 'US', population: 249545, lat: 36.0999, lon: -80.2442 },
  { name: 'Fayetteville', state_province: 'NC', country: 'US', population: 208501, lat: 35.0527, lon: -78.8784 },
  { name: 'Cary', state_province: 'NC', country: 'US', population: 174721, lat: 35.7915, lon: -78.7811 },
  { name: 'Wilmington', state_province: 'NC', country: 'US', population: 123744, lat: 34.2257, lon: -77.9447 },
  { name: 'High Point', state_province: 'NC', country: 'US', population: 114059, lat: 35.9557, lon: -80.0053 },
  { name: 'Asheville', state_province: 'NC', country: 'US', population: 94589, lat: 35.5951, lon: -82.5515 },

  // North Dakota
  { name: 'Fargo', state_province: 'ND', country: 'US', population: 125990, lat: 46.8772, lon: -96.7898 },
  { name: 'Bismarck', state_province: 'ND', country: 'US', population: 73622, lat: 46.8083, lon: -100.7837 },
  { name: 'Grand Forks', state_province: 'ND', country: 'US', population: 59166, lat: 47.9253, lon: -97.0329 },
  { name: 'Minot', state_province: 'ND', country: 'US', population: 48377, lat: 48.2330, lon: -101.2957 },
  { name: 'West Fargo', state_province: 'ND', country: 'US', population: 38626, lat: 46.8747, lon: -96.9040 },
  { name: 'Williston', state_province: 'ND', country: 'US', population: 29160, lat: 48.1470, lon: -103.6183 },
  { name: 'Dickinson', state_province: 'ND', country: 'US', population: 25679, lat: 46.8783, lon: -102.7895 },
  { name: 'Mandan', state_province: 'ND', country: 'US', population: 24206, lat: 46.8266, lon: -100.8896 },
  { name: 'Jamestown', state_province: 'ND', country: 'US', population: 15849, lat: 46.9108, lon: -98.7084 },
  { name: 'Wahpeton', state_province: 'ND', country: 'US', population: 7766, lat: 46.2652, lon: -96.6059 },

  // Ohio
  { name: 'Columbus', state_province: 'OH', country: 'US', population: 905748, lat: 39.9612, lon: -82.9988 },
  { name: 'Cleveland', state_province: 'OH', country: 'US', population: 383793, lat: 41.4993, lon: -81.6944 },
  { name: 'Cincinnati', state_province: 'OH', country: 'US', population: 309317, lat: 39.1031, lon: -84.5120 },
  { name: 'Toledo', state_province: 'OH', country: 'US', population: 270871, lat: 41.6528, lon: -83.5379 },
  { name: 'Akron', state_province: 'OH', country: 'US', population: 190469, lat: 41.0814, lon: -81.5190 },
  { name: 'Dayton', state_province: 'OH', country: 'US', population: 137644, lat: 39.7589, lon: -84.1916 },
  { name: 'Parma', state_province: 'OH', country: 'US', population: 81146, lat: 41.4047, lon: -81.7229 },
  { name: 'Canton', state_province: 'OH', country: 'US', population: 70872, lat: 40.7989, lon: -81.3784 },
  { name: 'Youngstown', state_province: 'OH', country: 'US', population: 60068, lat: 41.0998, lon: -80.6495 },
  { name: 'Lorain', state_province: 'OH', country: 'US', population: 65211, lat: 41.4528, lon: -82.1824 },

  // Oklahoma
  { name: 'Oklahoma City', state_province: 'OK', country: 'US', population: 695077, lat: 35.4676, lon: -97.5164 },
  { name: 'Tulsa', state_province: 'OK', country: 'US', population: 413066, lat: 36.1540, lon: -95.9928 },
  { name: 'Norman', state_province: 'OK', country: 'US', population: 128026, lat: 35.2226, lon: -97.4395 },
  { name: 'Broken Arrow', state_province: 'OK', country: 'US', population: 113540, lat: 36.0365, lon: -95.7908 },
  { name: 'Lawton', state_province: 'OK', country: 'US', population: 93535, lat: 34.6036, lon: -98.3959 },
  { name: 'Edmond', state_province: 'OK', country: 'US', population: 94428, lat: 35.6528, lon: -97.4781 },
  { name: 'Moore', state_province: 'OK', country: 'US', population: 62793, lat: 35.3395, lon: -97.4867 },
  { name: 'Midwest City', state_province: 'OK', country: 'US', population: 58409, lat: 35.4495, lon: -97.3967 },
  { name: 'Enid', state_province: 'OK', country: 'US', population: 47045, lat: 36.3956, lon: -97.8784 },
  { name: 'Stillwater', state_province: 'OK', country: 'US', population: 51126, lat: 36.1156, lon: -97.0584 },

  // Oregon
  { name: 'Portland', state_province: 'OR', country: 'US', population: 652503, lat: 45.5152, lon: -122.6784 },
  { name: 'Eugene', state_province: 'OR', country: 'US', population: 176654, lat: 44.0521, lon: -123.0868 },
  { name: 'Salem', state_province: 'OR', country: 'US', population: 175535, lat: 44.9429, lon: -123.0351 },
  { name: 'Gresham', state_province: 'OR', country: 'US', population: 114247, lat: 45.5001, lon: -122.4302 },
  { name: 'Hillsboro', state_province: 'OR', country: 'US', population: 106447, lat: 45.5228, lon: -122.9698 },
  { name: 'Bend', state_province: 'OR', country: 'US', population: 99178, lat: 44.0582, lon: -121.3153 },
  { name: 'Beaverton', state_province: 'OR', country: 'US', population: 97494, lat: 45.4871, lon: -122.8037 },
  { name: 'Medford', state_province: 'OR', country: 'US', population: 85824, lat: 42.3265, lon: -122.8756 },
  { name: 'Springfield', state_province: 'OR', country: 'US', population: 63471, lat: 44.0462, lon: -123.0220 },
  { name: 'Corvallis', state_province: 'OR', country: 'US', population: 58856, lat: 44.5646, lon: -123.2620 },

  // Pennsylvania
  { name: 'Philadelphia', state_province: 'PA', country: 'US', population: 1603797, lat: 39.9526, lon: -75.1652 },
  { name: 'Pittsburgh', state_province: 'PA', country: 'US', population: 302971, lat: 40.4406, lon: -79.9959 },
  { name: 'Allentown', state_province: 'PA', country: 'US', population: 125845, lat: 40.6023, lon: -75.4714 },
  { name: 'Erie', state_province: 'PA', country: 'US', population: 94831, lat: 42.1292, lon: -80.0851 },
  { name: 'Reading', state_province: 'PA', country: 'US', population: 95112, lat: 40.3356, lon: -75.9269 },
  { name: 'Scranton', state_province: 'PA', country: 'US', population: 76328, lat: 41.4090, lon: -75.6624 },
  { name: 'Bethlehem', state_province: 'PA', country: 'US', population: 75781, lat: 40.6259, lon: -75.3705 },
  { name: 'Lancaster', state_province: 'PA', country: 'US', population: 58039, lat: 40.0379, lon: -76.3055 },
  { name: 'Levittown', state_province: 'PA', country: 'US', population: 51982, lat: 40.1551, lon: -74.8288 },
  { name: 'Harrisburg', state_province: 'PA', country: 'US', population: 50135, lat: 40.2732, lon: -76.8839 },

  // Rhode Island
  { name: 'Providence', state_province: 'RI', country: 'US', population: 190934, lat: 41.8240, lon: -71.4128 },
  { name: 'Warwick', state_province: 'RI', country: 'US', population: 82823, lat: 41.7001, lon: -71.4162 },
  { name: 'Cranston', state_province: 'RI', country: 'US', population: 82934, lat: 41.7798, lon: -71.4371 },
  { name: 'Pawtucket', state_province: 'RI', country: 'US', population: 75604, lat: 41.8787, lon: -71.3826 },
  { name: 'East Providence', state_province: 'RI', country: 'US', population: 47139, lat: 41.8137, lon: -71.3700 },
  { name: 'Woonsocket', state_province: 'RI', country: 'US', population: 43240, lat: 42.0029, lon: -71.5145 },
  { name: 'Newport', state_province: 'RI', country: 'US', population: 25441, lat: 41.4901, lon: -71.3128 },
  { name: 'Central Falls', state_province: 'RI', country: 'US', population: 22583, lat: 41.8904, lon: -71.3925 },
  { name: 'Westerly', state_province: 'RI', country: 'US', population: 23359, lat: 41.3776, lon: -71.8270 },
  { name: 'North Providence', state_province: 'RI', country: 'US', population: 34114, lat: 41.8515, lon: -71.4370 },

  // South Carolina
  { name: 'Charleston', state_province: 'SC', country: 'US', population: 150227, lat: 32.7767, lon: -79.9311 },
  { name: 'Columbia', state_province: 'SC', country: 'US', population: 137300, lat: 34.0007, lon: -81.0348 },
  { name: 'North Charleston', state_province: 'SC', country: 'US', population: 114852, lat: 32.8546, lon: -79.9748 },
  { name: 'Mount Pleasant', state_province: 'SC', country: 'US', population: 90801, lat: 32.8323, lon: -79.8284 },
  { name: 'Rock Hill', state_province: 'SC', country: 'US', population: 74410, lat: 34.9249, lon: -81.0251 },
  { name: 'Greenville', state_province: 'SC', country: 'US', population: 70720, lat: 34.8526, lon: -82.3940 },
  { name: 'Summerville', state_province: 'SC', country: 'US', population: 50915, lat: 33.0185, lon: -80.1756 },
  { name: 'Sumter', state_province: 'SC', country: 'US', population: 43463, lat: 33.9204, lon: -80.3414 },
  { name: 'Goose Creek', state_province: 'SC', country: 'US', population: 45946, lat: 32.9810, lon: -80.0326 },
  { name: 'Hilton Head Island', state_province: 'SC', country: 'US', population: 39412, lat: 32.2163, lon: -80.7526 },

  // South Dakota
  { name: 'Sioux Falls', state_province: 'SD', country: 'US', population: 192517, lat: 43.5446, lon: -96.7311 },
  { name: 'Rapid City', state_province: 'SD', country: 'US', population: 74703, lat: 44.0805, lon: -103.2310 },
  { name: 'Aberdeen', state_province: 'SD', country: 'US', population: 28495, lat: 45.4647, lon: -98.4865 },
  { name: 'Brookings', state_province: 'SD', country: 'US', population: 23377, lat: 44.3114, lon: -96.7984 },
  { name: 'Watertown', state_province: 'SD', country: 'US', population: 22655, lat: 44.8996, lon: -97.1192 },
  { name: 'Mitchell', state_province: 'SD', country: 'US', population: 15660, lat: 43.7094, lon: -98.0298 },
  { name: 'Yankton', state_province: 'SD', country: 'US', population: 14454, lat: 42.8711, lon: -97.3967 },
  { name: 'Pierre', state_province: 'SD', country: 'US', population: 14091, lat: 44.3683, lon: -100.3510 },
  { name: 'Huron', state_province: 'SD', country: 'US', population: 13646, lat: 44.3635, lon: -98.2142 },
  { name: 'Spearfish', state_province: 'SD', country: 'US', population: 12193, lat: 44.4906, lon: -103.8593 },

  // Tennessee
  { name: 'Nashville', state_province: 'TN', country: 'US', population: 689447, lat: 36.1627, lon: -86.7816 },
  { name: 'Memphis', state_province: 'TN', country: 'US', population: 633104, lat: 35.1495, lon: -90.0490 },
  { name: 'Knoxville', state_province: 'TN', country: 'US', population: 190740, lat: 35.9606, lon: -83.9207 },
  { name: 'Chattanooga', state_province: 'TN', country: 'US', population: 181099, lat: 35.0456, lon: -85.2672 },
  { name: 'Clarksville', state_province: 'TN', country: 'US', population: 166722, lat: 36.5298, lon: -87.3595 },
  { name: 'Murfreesboro', state_province: 'TN', country: 'US', population: 152769, lat: 35.8456, lon: -86.3903 },
  { name: 'Franklin', state_province: 'TN', country: 'US', population: 83454, lat: 35.9251, lon: -86.8689 },
  { name: 'Jackson', state_province: 'TN', country: 'US', population: 68205, lat: 35.6145, lon: -88.8139 },
  { name: 'Johnson City', state_province: 'TN', country: 'US', population: 71046, lat: 36.3134, lon: -82.3535 },
  { name: 'Bartlett', state_province: 'TN', country: 'US', population: 59252, lat: 35.2045, lon: -89.8740 },

  // Texas
  { name: 'Houston', state_province: 'TX', country: 'US', population: 2304580, lat: 29.7604, lon: -95.3698 },
  { name: 'San Antonio', state_province: 'TX', country: 'US', population: 1547253, lat: 29.4241, lon: -98.4936 },
  { name: 'Dallas', state_province: 'TX', country: 'US', population: 1304379, lat: 32.7767, lon: -96.7970 },
  { name: 'Austin', state_province: 'TX', country: 'US', population: 978908, lat: 30.2672, lon: -97.7431 },
  { name: 'Fort Worth', state_province: 'TX', country: 'US', population: 918915, lat: 32.7555, lon: -97.3308 },
  { name: 'El Paso', state_province: 'TX', country: 'US', population: 695044, lat: 31.7619, lon: -106.4850 },
  { name: 'Arlington', state_province: 'TX', country: 'US', population: 394266, lat: 32.7357, lon: -97.1081 },
  { name: 'Corpus Christi', state_province: 'TX', country: 'US', population: 326586, lat: 27.8006, lon: -97.3964 },
  { name: 'Plano', state_province: 'TX', country: 'US', population: 285494, lat: 33.0198, lon: -96.6989 },
  { name: 'Lubbock', state_province: 'TX', country: 'US', population: 257141, lat: 33.5779, lon: -101.8552 },

  // Utah
  { name: 'Salt Lake City', state_province: 'UT', country: 'US', population: 199723, lat: 40.7608, lon: -111.8910 },
  { name: 'West Valley City', state_province: 'UT', country: 'US', population: 140230, lat: 40.6916, lon: -112.0011 },
  { name: 'Provo', state_province: 'UT', country: 'US', population: 115162, lat: 40.2338, lon: -111.6585 },
  { name: 'West Jordan', state_province: 'UT', country: 'US', population: 116961, lat: 40.6097, lon: -111.9391 },
  { name: 'Orem', state_province: 'UT', country: 'US', population: 98129, lat: 40.2969, lon: -111.6946 },
  { name: 'Sandy', state_province: 'UT', country: 'US', population: 96904, lat: 40.5649, lon: -111.8389 },
  { name: 'Ogden', state_province: 'UT', country: 'US', population: 87321, lat: 41.2230, lon: -111.9738 },
  { name: 'St. George', state_province: 'UT', country: 'US', population: 95342, lat: 37.1041, lon: -113.5841 },
  { name: 'Layton', state_province: 'UT', country: 'US', population: 81773, lat: 41.0602, lon: -111.9711 },
  { name: 'Millcreek', state_province: 'UT', country: 'US', population: 63380, lat: 40.6869, lon: -111.8147 },

  // Vermont
  { name: 'Burlington', state_province: 'VT', country: 'US', population: 44743, lat: 44.4759, lon: -73.2121 },
  { name: 'Essex', state_province: 'VT', country: 'US', population: 22498, lat: 44.4906, lon: -73.1129 },
  { name: 'South Burlington', state_province: 'VT', country: 'US', population: 19359, lat: 44.4669, lon: -73.2121 },
  { name: 'Colchester', state_province: 'VT', country: 'US', population: 17524, lat: 44.5431, lon: -73.1812 },
  { name: 'Rutland', state_province: 'VT', country: 'US', population: 15807, lat: 43.6106, lon: -72.9726 },
  { name: 'Montpelier', state_province: 'VT', country: 'US', population: 8074, lat: 44.2601, lon: -72.5806 },
  { name: 'Winooski', state_province: 'VT', country: 'US', population: 7997, lat: 44.4906, lon: -73.1812 },
  { name: 'St. Albans', state_province: 'VT', country: 'US', population: 6918, lat: 44.8106, lon: -73.0812 },
  { name: 'Newport', state_province: 'VT', country: 'US', population: 4589, lat: 44.9356, lon: -72.2012 },
  { name: 'Vergennes', state_province: 'VT', country: 'US', population: 2553, lat: 44.1695, lon: -73.2540 },

  // Virginia
  { name: 'Virginia Beach', state_province: 'VA', country: 'US', population: 459470, lat: 36.8529, lon: -75.9780 },
  { name: 'Chesapeake', state_province: 'VA', country: 'US', population: 249422, lat: 36.7682, lon: -76.2875 },
  { name: 'Norfolk', state_province: 'VA', country: 'US', population: 238005, lat: 36.8468, lon: -76.2852 },
  { name: 'Richmond', state_province: 'VA', country: 'US', population: 230436, lat: 37.5407, lon: -77.4360 },
  { name: 'Newport News', state_province: 'VA', country: 'US', population: 186247, lat: 37.0871, lon: -76.4730 },
  { name: 'Alexandria', state_province: 'VA', country: 'US', population: 159467, lat: 38.8048, lon: -77.0469 },
  { name: 'Hampton', state_province: 'VA', country: 'US', population: 137148, lat: 37.0299, lon: -76.3452 },
  { name: 'Portsmouth', state_province: 'VA', country: 'US', population: 97915, lat: 36.8354, lon: -76.2983 },
  { name: 'Suffolk', state_province: 'VA', country: 'US', population: 94324, lat: 36.7282, lon: -76.5836 },
  { name: 'Roanoke', state_province: 'VA', country: 'US', population: 100011, lat: 37.2710, lon: -79.9414 },

  // Washington
  { name: 'Seattle', state_province: 'WA', country: 'US', population: 737015, lat: 47.6062, lon: -122.3321 },
  { name: 'Spokane', state_province: 'WA', country: 'US', population: 228989, lat: 47.6587, lon: -117.4260 },
  { name: 'Tacoma', state_province: 'WA', country: 'US', population: 219346, lat: 47.2529, lon: -122.4443 },
  { name: 'Vancouver', state_province: 'WA', country: 'US', population: 190915, lat: 45.6387, lon: -122.6615 },
  { name: 'Bellevue', state_province: 'WA', country: 'US', population: 151854, lat: 47.6101, lon: -122.2015 },
  { name: 'Kent', state_province: 'WA', country: 'US', population: 136588, lat: 47.3809, lon: -122.2348 },
  { name: 'Everett', state_province: 'WA', country: 'US', population: 113834, lat: 47.9790, lon: -122.2021 },
  { name: 'Renton', state_province: 'WA', country: 'US', population: 106785, lat: 47.4829, lon: -122.2171 },
  { name: 'Spokane Valley', state_province: 'WA', country: 'US', population: 102976, lat: 47.6732, lon: -117.2394 },
  { name: 'Federal Way', state_province: 'WA', country: 'US', population: 101030, lat: 47.3223, lon: -122.3126 },

  // West Virginia
  { name: 'Charleston', state_province: 'WV', country: 'US', population: 46536, lat: 38.3498, lon: -81.6326 },
  { name: 'Huntington', state_province: 'WV', country: 'US', population: 45841, lat: 38.4192, lon: -82.4452 },
  { name: 'Morgantown', state_province: 'WV', country: 'US', population: 30347, lat: 39.6295, lon: -79.9553 },
  { name: 'Parkersburg', state_province: 'WV', country: 'US', population: 29738, lat: 39.2667, lon: -81.5615 },
  { name: 'Wheeling', state_province: 'WV', country: 'US', population: 27062, lat: 40.0640, lon: -80.7209 },
  { name: 'Martinsburg', state_province: 'WV', country: 'US', population: 18773, lat: 39.4562, lon: -77.9636 },
  { name: 'Fairmont', state_province: 'WV', country: 'US', population: 18313, lat: 39.4851, lon: -80.1426 },
  { name: 'Beckley', state_province: 'WV', country: 'US', population: 16240, lat: 37.7782, lon: -81.1882 },
  { name: 'Clarksburg', state_province: 'WV', country: 'US', population: 15743, lat: 39.2806, lon: -80.3445 },
  { name: 'Lewisburg', state_province: 'WV', country: 'US', population: 3930, lat: 37.8018, lon: -80.4459 },

  // Wisconsin
  { name: 'Milwaukee', state_province: 'WI', country: 'US', population: 577222, lat: 43.0389, lon: -87.9065 },
  { name: 'Madison', state_province: 'WI', country: 'US', population: 269840, lat: 43.0731, lon: -89.4012 },
  { name: 'Green Bay', state_province: 'WI', country: 'US', population: 107395, lat: 44.5133, lon: -88.0133 },
  { name: 'Kenosha', state_province: 'WI', country: 'US', population: 99986, lat: 42.5847, lon: -87.8212 },
  { name: 'Racine', state_province: 'WI', country: 'US', population: 77816, lat: 42.7261, lon: -87.7829 },
  { name: 'Appleton', state_province: 'WI', country: 'US', population: 75644, lat: 44.2619, lon: -88.4154 },
  { name: 'Waukesha', state_province: 'WI', country: 'US', population: 72419, lat: 43.0117, lon: -88.2315 },
  { name: 'Eau Claire', state_province: 'WI', country: 'US', population: 69421, lat: 44.8113, lon: -91.4985 },
  { name: 'Oshkosh', state_province: 'WI', country: 'US', population: 66816, lat: 44.0247, lon: -88.5426 },
  { name: 'Janesville', state_province: 'WI', country: 'US', population: 65615, lat: 42.6828, lon: -89.0187 },

  // Wyoming
  { name: 'Cheyenne', state_province: 'WY', country: 'US', population: 65132, lat: 41.1400, lon: -104.8197 },
  { name: 'Casper', state_province: 'WY', country: 'US', population: 59038, lat: 42.8666, lon: -106.3131 },
  { name: 'Laramie', state_province: 'WY', country: 'US', population: 31407, lat: 41.3114, lon: -105.5911 },
  { name: 'Gillette', state_province: 'WY', country: 'US', population: 33403, lat: 44.2911, lon: -105.5022 },
  { name: 'Rock Springs', state_province: 'WY', country: 'US', population: 23526, lat: 41.5875, lon: -109.2029 },
  { name: 'Sheridan', state_province: 'WY', country: 'US', population: 18737, lat: 44.7975, lon: -106.9561 },
  { name: 'Green River', state_province: 'WY', country: 'US', population: 12515, lat: 41.5286, lon: -109.4662 },
  { name: 'Evanston', state_province: 'WY', country: 'US', population: 11747, lat: 41.2683, lon: -110.9632 },
  { name: 'Riverton', state_province: 'WY', country: 'US', population: 11129, lat: 43.0642, lon: -108.3901 },
  { name: 'Jackson', state_province: 'WY', country: 'US', population: 10760, lat: 43.4799, lon: -110.7624 },

  // CANADA - TOP 10 CITIES BY PROVINCE

  // Alberta
  { name: 'Calgary', state_province: 'AB', country: 'CA', population: 1336000, lat: 51.0486, lon: -114.0708 },
  { name: 'Edmonton', state_province: 'AB', country: 'CA', population: 1010899, lat: 53.5461, lon: -113.4938 },
  { name: 'Red Deer', state_province: 'AB', country: 'CA', population: 100418, lat: 52.2681, lon: -113.8112 },
  { name: 'Lethbridge', state_province: 'AB', country: 'CA', population: 98406, lat: 49.6999, lon: -112.8451 },
  { name: 'St. Albert', state_province: 'AB', country: 'CA', population: 68146, lat: 53.6316, lon: -113.6256 },
  { name: 'Medicine Hat', state_province: 'AB', country: 'CA', population: 63260, lat: 50.0405, lon: -110.6764 },
  { name: 'Grande Prairie', state_province: 'AB', country: 'CA', population: 71868, lat: 55.1708, lon: -118.7979 },
  { name: 'Airdrie', state_province: 'AB', country: 'CA', population: 74100, lat: 51.2917, lon: -114.0144 },
  { name: 'Spruce Grove', state_province: 'AB', country: 'CA', population: 40742, lat: 53.5451, lon: -113.9109 },
  { name: 'Okotoks', state_province: 'AB', country: 'CA', population: 31316, lat: 50.7243, lon: -113.9781 },

  // British Columbia
  { name: 'Vancouver', state_province: 'BC', country: 'CA', population: 695263, lat: 49.2827, lon: -123.1207 },
  { name: 'Surrey', state_province: 'BC', country: 'CA', population: 568322, lat: 49.1913, lon: -122.8490 },
  { name: 'Burnaby', state_province: 'BC', country: 'CA', population: 249125, lat: 49.2488, lon: -122.9805 },
  { name: 'Richmond', state_province: 'BC', country: 'CA', population: 230923, lat: 49.1666, lon: -123.1336 },
  { name: 'Abbotsford', state_province: 'BC', country: 'CA', population: 153524, lat: 49.0504, lon: -122.3045 },
  { name: 'Coquitlam', state_province: 'BC', country: 'CA', population: 148625, lat: 49.2838, lon: -122.7932 },
  { name: 'Kelowna', state_province: 'BC', country: 'CA', population: 144576, lat: 49.8880, lon: -119.4960 },
  { name: 'Victoria', state_province: 'BC', country: 'CA', population: 91867, lat: 48.4284, lon: -123.3656 },
  { name: 'Saanich', state_province: 'BC', country: 'CA', population: 117735, lat: 48.4758, lon: -123.3650 },
  { name: 'Delta', state_province: 'BC', country: 'CA', population: 108455, lat: 49.1469, lon: -123.0890 },

  // Manitoba
  { name: 'Winnipeg', state_province: 'MB', country: 'CA', population: 749534, lat: 49.8951, lon: -97.1384 },
  { name: 'Brandon', state_province: 'MB', country: 'CA', population: 51313, lat: 49.8481, lon: -99.9515 },
  { name: 'Steinbach', state_province: 'MB', country: 'CA', population: 17806, lat: 49.5255, lon: -96.6841 },
  { name: 'Thompson', state_province: 'MB', country: 'CA', population: 13035, lat: 55.7435, lon: -97.8551 },
  { name: 'Portage la Prairie', state_province: 'MB', country: 'CA', population: 13270, lat: 49.9729, lon: -98.2914 },
  { name: 'Winkler', state_province: 'MB', country: 'CA', population: 12660, lat: 49.1828, lon: -97.9394 },
  { name: 'Selkirk', state_province: 'MB', country: 'CA', population: 10504, lat: 50.1436, lon: -96.8842 },
  { name: 'Morden', state_province: 'MB', country: 'CA', population: 9929, lat: 49.1914, lon: -98.1006 },
  { name: 'Dauphin', state_province: 'MB', country: 'CA', population: 8378, lat: 51.1436, lon: -100.0478 },
  { name: 'Flin Flon', state_province: 'MB', country: 'CA', population: 4991, lat: 54.7687, lon: -101.8650 },

  // New Brunswick
  { name: 'Saint John', state_province: 'NB', country: 'CA', population: 67575, lat: 45.2734, lon: -66.0633 },
  { name: 'Moncton', state_province: 'NB', country: 'CA', population: 79470, lat: 46.0878, lon: -64.7782 },
  { name: 'Fredericton', state_province: 'NB', country: 'CA', population: 63116, lat: 45.9636, lon: -66.6431 },
  { name: 'Dieppe', state_province: 'NB', country: 'CA', population: 28114, lat: 46.0767, lon: -64.6890 },
  { name: 'Riverview', state_province: 'NB', country: 'CA', population: 20584, lat: 46.0531, lon: -64.8075 },
  { name: 'Miramichi', state_province: 'NB', country: 'CA', population: 17537, lat: 47.0379, lon: -65.5036 },
  { name: 'Campbellton', state_province: 'NB', country: 'CA', population: 6883, lat: 48.0103, lon: -66.6731 },
  { name: 'Edmundston', state_province: 'NB', country: 'CA', population: 16580, lat: 47.3735, lon: -68.3248 },
  { name: 'Bathurst', state_province: 'NB', country: 'CA', population: 12275, lat: 47.6266, lon: -65.6481 },
  { name: 'Sackville', state_province: 'NB', country: 'CA', population: 5331, lat: 45.9059, lon: -64.3748 },

  // Newfoundland and Labrador
  { name: 'St. John\'s', state_province: 'NL', country: 'CA', population: 114434, lat: 47.5615, lon: -52.7126 },
  { name: 'Mount Pearl', state_province: 'NL', country: 'CA', population: 24671, lat: 47.5189, lon: -52.8048 },
  { name: 'Corner Brook', state_province: 'NL', country: 'CA', population: 19806, lat: 48.9507, lon: -57.9520 },
  { name: 'Conception Bay South', state_province: 'NL', country: 'CA', population: 26199, lat: 47.5036, lon: -53.0133 },
  { name: 'Paradise', state_province: 'NL', country: 'CA', population: 21389, lat: 47.5294, lon: -52.8614 },
  { name: 'Grand Falls-Windsor', state_province: 'NL', country: 'CA', population: 14171, lat: 48.9324, lon: -55.6612 },
  { name: 'Gander', state_province: 'NL', country: 'CA', population: 11688, lat: 48.9540, lon: -54.6036 },
  { name: 'Happy Valley-Goose Bay', state_province: 'NL', country: 'CA', population: 8109, lat: 53.3168, lon: -60.3315 },
  { name: 'Stephenville', state_province: 'NL', country: 'CA', population: 6623, lat: 48.5490, lon: -58.5513 },
  { name: 'Labrador City', state_province: 'NL', country: 'CA', population: 7220, lat: 52.9463, lon: -66.9114 },

  // Northwest Territories
  { name: 'Yellowknife', state_province: 'NT', country: 'CA', population: 20340, lat: 62.4540, lon: -114.3718 },
  { name: 'Hay River', state_province: 'NT', country: 'CA', population: 3124, lat: 60.8156, lon: -115.7999 },
  { name: 'Inuvik', state_province: 'NT', country: 'CA', population: 3243, lat: 68.3607, lon: -133.7218 },
  { name: 'Fort Smith', state_province: 'NT', country: 'CA', population: 2542, lat: 60.0042, lon: -111.8933 },
  { name: 'Behchokǫ̀', state_province: 'NT', country: 'CA', population: 1874, lat: 62.7998, lon: -116.0489 },
  { name: 'Fort Simpson', state_province: 'NT', country: 'CA', population: 1202, lat: 61.8519, lon: -121.2369 },
  { name: 'Norman Wells', state_province: 'NT', country: 'CA', population: 789, lat: 65.2820, lon: -126.8329 },
  { name: 'Tuktoyaktuk', state_province: 'NT', country: 'CA', population: 898, lat: 69.4541, lon: -133.0374 },
  { name: 'Aklavik', state_province: 'NT', country: 'CA', population: 633, lat: 68.2191, lon: -135.0107 },
  { name: 'Fort Good Hope', state_province: 'NT', country: 'CA', population: 560, lat: 66.2413, lon: -128.6417 },

  // Nova Scotia
  { name: 'Halifax', state_province: 'NS', country: 'CA', population: 439819, lat: 44.6488, lon: -63.5752 },
  { name: 'Sydney', state_province: 'NS', country: 'CA', population: 29743, lat: 46.1351, lon: -60.1831 },
  { name: 'Dartmouth', state_province: 'NS', country: 'CA', population: 101343, lat: 44.6710, lon: -63.5808 },
  { name: 'Truro', state_province: 'NS', country: 'CA', population: 12826, lat: 45.3675, lon: -63.2653 },
  { name: 'New Glasgow', state_province: 'NS', country: 'CA', population: 9075, lat: 45.5947, lon: -62.6486 },
  { name: 'Glace Bay', state_province: 'NS', country: 'CA', population: 15699, lat: 46.1969, lon: -59.9569 },
  { name: 'Yarmouth', state_province: 'NS', country: 'CA', population: 6518, lat: 43.8374, lon: -66.1175 },
  { name: 'Kentville', state_province: 'NS', country: 'CA', population: 6630, lat: 45.0776, lon: -64.4989 },
  { name: 'Amherst', state_province: 'NS', country: 'CA', population: 9717, lat: 45.8161, lon: -64.2011 },
  { name: 'Bridgewater', state_province: 'NS', country: 'CA', population: 8790, lat: 44.3779, lon: -64.5228 },

  // Nunavut
  { name: 'Iqaluit', state_province: 'NU', country: 'CA', population: 7429, lat: 63.7467, lon: -68.5170 },
  { name: 'Rankin Inlet', state_province: 'NU', country: 'CA', population: 2842, lat: 62.8097, lon: -92.0896 },
  { name: 'Arviat', state_province: 'NU', country: 'CA', population: 2657, lat: 61.1072, lon: -94.0581 },
  { name: 'Baker Lake', state_province: 'NU', country: 'CA', population: 2061, lat: 64.3188, lon: -96.0768 },
  { name: 'Igloolik', state_province: 'NU', country: 'CA', population: 1696, lat: 69.3014, lon: -81.7982 },
  { name: 'Pangnirtung', state_province: 'NU', country: 'CA', population: 1504, lat: 66.1451, lon: -65.7125 },
  { name: 'Pond Inlet', state_province: 'NU', country: 'CA', population: 1617, lat: 72.6987, lon: -77.9650 },
  { name: 'Kugluktuk', state_province: 'NU', country: 'CA', population: 1491, lat: 67.8269, lon: -115.0988 },
  { name: 'Cape Dorset', state_province: 'NU', country: 'CA', population: 1441, lat: 64.2307, lon: -76.5269 },
  { name: 'Gjoa Haven', state_province: 'NU', country: 'CA', population: 1324, lat: 68.6362, lon: -95.8797 },

  // Ontario
  { name: 'Toronto', state_province: 'ON', country: 'CA', population: 2794356, lat: 43.6532, lon: -79.3832 },
  { name: 'Ottawa', state_province: 'ON', country: 'CA', population: 1017449, lat: 45.4215, lon: -75.6972 },
  { name: 'Mississauga', state_province: 'ON', country: 'CA', population: 717961, lat: 43.5890, lon: -79.6441 },
  { name: 'Brampton', state_province: 'ON', country: 'CA', population: 656480, lat: 43.7315, lon: -79.7624 },
  { name: 'Hamilton', state_province: 'ON', country: 'CA', population: 569353, lat: 43.2557, lon: -79.8711 },
  { name: 'London', state_province: 'ON', country: 'CA', population: 422324, lat: 42.9849, lon: -81.2453 },
  { name: 'Markham', state_province: 'ON', country: 'CA', population: 338503, lat: 43.8561, lon: -79.3370 },
  { name: 'Vaughan', state_province: 'ON', country: 'CA', population: 323103, lat: 43.8361, lon: -79.4985 },
  { name: 'Kitchener', state_province: 'ON', country: 'CA', population: 256885, lat: 43.4516, lon: -80.4925 },
  { name: 'Windsor', state_province: 'ON', country: 'CA', population: 229660, lat: 42.3149, lon: -83.0364 },

  // Prince Edward Island
  { name: 'Charlottetown', state_province: 'PE', country: 'CA', population: 38809, lat: 46.2382, lon: -63.1311 },
  { name: 'Summerside', state_province: 'PE', country: 'CA', population: 16001, lat: 46.3950, lon: -63.7989 },
  { name: 'Stratford', state_province: 'PE', country: 'CA', population: 10064, lat: 46.2134, lon: -63.0859 },
  { name: 'Cornwall', state_province: 'PE', country: 'CA', population: 5348, lat: 46.2240, lon: -63.2186 },
  { name: 'Montague', state_province: 'PE', country: 'CA', population: 1973, lat: 46.1651, lon: -62.6459 },
  { name: 'Kensington', state_province: 'PE', country: 'CA', population: 1723, lat: 46.4276, lon: -63.6420 },
  { name: 'Souris', state_province: 'PE', country: 'CA', population: 1173, lat: 46.3534, lon: -62.2492 },
  { name: 'Alberton', state_province: 'PE', country: 'CA', population: 1145, lat: 46.8134, lon: -64.0653 },
  { name: 'Georgetown', state_province: 'PE', country: 'CA', population: 693, lat: 46.1881, lon: -62.5359 },
  { name: 'Tignish', state_province: 'PE', country: 'CA', population: 798, lat: 46.9574, lon: -64.0420 },

  // Quebec
  { name: 'Montreal', state_province: 'QC', country: 'CA', population: 1762949, lat: 45.5017, lon: -73.5673 },
  { name: 'Quebec City', state_province: 'QC', country: 'CA', population: 542298, lat: 46.8139, lon: -71.2080 },
  { name: 'Laval', state_province: 'QC', country: 'CA', population: 438366, lat: 45.6066, lon: -73.7124 },
  { name: 'Gatineau', state_province: 'QC', country: 'CA', population: 295438, lat: 45.4215, lon: -75.6919 },
  { name: 'Longueuil', state_province: 'QC', country: 'CA', population: 254483, lat: 45.5312, lon: -73.5182 },
  { name: 'Sherbrooke', state_province: 'QC', country: 'CA', population: 172950, lat: 45.4042, lon: -71.8929 },
  { name: 'Saguenay', state_province: 'QC', country: 'CA', population: 144746, lat: 48.3150, lon: -71.0669 },
  { name: 'Lévis', state_province: 'QC', country: 'CA', population: 149956, lat: 46.8037, lon: -71.1978 },
  { name: 'Trois-Rivières', state_province: 'QC', country: 'CA', population: 139163, lat: 46.3432, lon: -72.5432 },
  { name: 'Terrebonne', state_province: 'QC', country: 'CA', population: 119944, lat: 45.7000, lon: -73.6333 },

  // Saskatchewan
  { name: 'Saskatoon', state_province: 'SK', country: 'CA', population: 317480, lat: 52.1579, lon: -106.6702 },
  { name: 'Regina', state_province: 'SK', country: 'CA', population: 230139, lat: 50.4452, lon: -104.6189 },
  { name: 'Prince Albert', state_province: 'SK', country: 'CA', population: 37756, lat: 53.2034, lon: -105.7531 },
  { name: 'Moose Jaw', state_province: 'SK', country: 'CA', population: 35073, lat: 50.3927, lon: -105.5336 },
  { name: 'Swift Current', state_province: 'SK', country: 'CA', population: 17105, lat: 50.2881, lon: -107.7941 },
  { name: 'Yorkton', state_province: 'SK', country: 'CA', population: 19643, lat: 51.2139, lon: -102.4681 },
  { name: 'North Battleford', state_province: 'SK', country: 'CA', population: 14315, lat: 52.7755, lon: -108.2861 },
  { name: 'Estevan', state_province: 'SK', country: 'CA', population: 11483, lat: 49.1361, lon: -102.9876 },
  { name: 'Weyburn', state_province: 'SK', country: 'CA', population: 10870, lat: 49.6617, lon: -103.8517 },
  { name: 'Lloydminster', state_province: 'SK', country: 'CA', population: 19645, lat: 53.2917, lon: -110.0056 },

  // Yukon
  { name: 'Whitehorse', state_province: 'YT', country: 'CA', population: 28201, lat: 60.7212, lon: -135.0568 },
  { name: 'Dawson City', state_province: 'YT', country: 'CA', population: 1375, lat: 64.0607, lon: -139.4303 },
  { name: 'Watson Lake', state_province: 'YT', country: 'CA', population: 802, lat: 60.0633, lon: -128.8039 },
  { name: 'Haines Junction', state_province: 'YT', country: 'CA', population: 613, lat: 60.7525, lon: -137.5111 },
  { name: 'Carmacks', state_province: 'YT', country: 'CA', population: 503, lat: 62.0961, lon: -136.2939 },
  { name: 'Mayo', state_province: 'YT', country: 'CA', population: 200, lat: 63.5953, lon: -135.8969 },
  { name: 'Teslin', state_province: 'YT', country: 'CA', population: 122, lat: 60.1728, lon: -132.7394 },
  { name: 'Faro', state_province: 'YT', country: 'CA', population: 344, lat: 62.2394, lon: -133.3269 },
  { name: 'Ross River', state_province: 'YT', country: 'CA', population: 302, lat: 61.9703, lon: -132.4464 },
  { name: 'Beaver Creek', state_province: 'YT', country: 'CA', population: 108, lat: 62.4069, lon: -140.8647 },
];

// Helper functions for data access
export function getCitiesByStateProvince(stateProvince: string): CityData[] {
  return COMPREHENSIVE_CITIES.filter(city => city.state_province === stateProvince);
}

export function getCitiesByCountry(country: 'US' | 'CA'): CityData[] {
  return COMPREHENSIVE_CITIES.filter(city => city.country === country);
}

export function getAllUSCities(): CityData[] {
  return getCitiesByCountry('US');
}

export function getAllCanadianCities(): CityData[] {
  return getCitiesByCountry('CA');
}

export function getCityCoordinates(cityName: string): { lat: number, lon: number } | null {
  if (!cityName) return null;
  const raw = String(cityName).trim();

  // If input contains state like 'City, ST', try direct lookup in CITY_COORDINATES_LOOKUP
  const parts = raw.split(',').map(p => p.trim());
  if (parts.length === 2) {
    const key = `${parts[0]}, ${parts[1]}`;
    if (CITY_COORDINATES_LOOKUP[key]) return CITY_COORDINATES_LOOKUP[key];
  }

  // Try exact name match (case-insensitive)
  const exact = COMPREHENSIVE_CITIES.find(c => c.name.toLowerCase() === raw.toLowerCase());
  if (exact) return { lat: exact.lat, lon: exact.lon };

  // Common variant: 'New York' -> 'New York City'
  const withCity = COMPREHENSIVE_CITIES.find(c => `${c.name.toLowerCase()} city` === raw.toLowerCase() || `${raw.toLowerCase()} city` === c.name.toLowerCase());
  if (withCity) return { lat: withCity.lat, lon: withCity.lon };

  // If provided a state code (second part), try to find the city name within that state
  if (parts.length === 2) {
    const [namePart, statePart] = parts;
    const matchInState = COMPREHENSIVE_CITIES.find(c =>
      c.state_province.toLowerCase() === statePart.toLowerCase() && c.name.toLowerCase() === namePart.toLowerCase()
    );
    if (matchInState) return { lat: matchInState.lat, lon: matchInState.lon };
  }

  // Fallback: search by partial match and pick the largest population match
  const term = raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const partialMatches = COMPREHENSIVE_CITIES.filter(c => c.name.toLowerCase().includes(term) || (c.metro_area || '').toLowerCase().includes(term));
  if (partialMatches.length > 0) {
    const best = partialMatches.sort((a, b) => b.population - a.population)[0];
    return { lat: best.lat, lon: best.lon };
  }

  return null;
}

export function searchCitiesByName(searchTerm: string): CityData[] {
  const term = searchTerm.toLowerCase();
  return COMPREHENSIVE_CITIES.filter(city => 
    city.name.toLowerCase().includes(term) || 
    city.metro_area?.toLowerCase().includes(term)
  );
}

export function getTopCitiesByPopulation(limit: number = 50): CityData[] {
  return COMPREHENSIVE_CITIES
    .sort((a, b) => b.population - a.population)
    .slice(0, limit);
}

// Helper: normalize a city key for robust lookup
function normalizeCityKey(raw: string) {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .replace(/\./g, '')           // remove periods
    .replace(/\s+/g, ' ')         // collapse whitespace
    .replace(/\s*,\s*/g, ', ')   // normalize comma+space
    .trim();
}

// Create coordinate lookup for existing function compatibility with multiple key variants
export const CITY_COORDINATES_LOOKUP: { [key: string]: { lat: number, lon: number } } = (() => {
  const map: { [key: string]: { lat: number, lon: number } } = {};
  for (const city of COMPREHENSIVE_CITIES) {
    const key = `${city.name}, ${city.state_province}`;
    map[key] = { lat: city.lat, lon: city.lon };
    // add normalized key
    map[normalizeCityKey(key)] = { lat: city.lat, lon: city.lon };
    // add variants: city name only, normalized
    map[city.name] = { lat: city.lat, lon: city.lon };
    map[normalizeCityKey(city.name)] = { lat: city.lat, lon: city.lon };
    // add metro area if present
    if (city.metro_area) {
      map[city.metro_area] = { lat: city.lat, lon: city.lon };
      map[normalizeCityKey(city.metro_area)] = { lat: city.lat, lon: city.lon };
    }
  }
  // common alias: Washington, D.C. -> Washington, DC
  if (!map['washington, dc'] && map['washington, d c']) {
    map['washington, dc'] = map['washington, d c'];
  }
  return map;
})();

// expose normalizer for use elsewhere
export { normalizeCityKey };
