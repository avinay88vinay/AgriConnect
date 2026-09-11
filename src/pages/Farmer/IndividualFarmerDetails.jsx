import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  FileText,
  Leaf,
  LoaderCircle,
  MapPin,
  Upload,
} from "lucide-react";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase";

import "./IndividualFarmerDetails.css";

/* =========================================================
   INDIAN STATES + UNION TERRITORIES
========================================================= */

const INDIAN_STATES = {
  "Andhra Pradesh": {
    districts: [
      "Alluri Sitharama Raju",
      "Anakapalli",
      "Ananthapuramu",
      "Annamayya",
      "Bapatla",
      "Chittoor",
      "Dr. B. R. Ambedkar Konaseema",
      "East Godavari",
      "Eluru",
      "Guntur",
      "Kakinada",
      "Krishna",
      "Kurnool",
      "Nandyal",
      "NTR",
      "Palnadu",
      "Parvathipuram Manyam",
      "Prakasam",
      "Srikakulam",
      "Sri Potti Sriramulu Nellore",
      "Sri Sathya Sai",
      "Tirupati",
      "Visakhapatnam",
      "Vizianagaram",
      "West Godavari",
      "YSR Kadapa",
    ],
  },

  "Arunachal Pradesh": {
    districts: [
      "Anjaw",
      "Bichom",
      "Changlang",
      "Dibang Valley",
      "East Kameng",
      "East Siang",
      "Itanagar Capital Region",
      "Kamle",
      "Keyi Panyor",
      "Kra Daadi",
      "Kurung Kumey",
      "Lepa Rada",
      "Lohit",
      "Longding",
      "Lower Dibang Valley",
      "Lower Siang",
      "Lower Subansiri",
      "Namsai",
      "Pakke Kessang",
      "Papum Pare",
      "Shi Yomi",
      "Siang",
      "Tawang",
      "Tirap",
      "Upper Siang",
      "Upper Subansiri",
      "West Kameng",
      "West Siang",
    ],
  },

  Assam: {
    districts: [
      "Baksa",
      "Barpeta",
      "Biswanath",
      "Bongaigaon",
      "Cachar",
      "Charaideo",
      "Chirang",
      "Darrang",
      "Dhemaji",
      "Dhubri",
      "Dibrugarh",
      "Dima Hasao",
      "Goalpara",
      "Golaghat",
      "Hailakandi",
      "Hojai",
      "Jorhat",
      "Kamrup",
      "Kamrup Metropolitan",
      "Karbi Anglong",
      "Karimganj",
      "Kokrajhar",
      "Lakhimpur",
      "Majuli",
      "Morigaon",
      "Nagaon",
      "Nalbari",
      "Sivasagar",
      "Sonitpur",
      "South Salmara-Mankachar",
      "Tamulpur",
      "Tinsukia",
      "Udalguri",
      "West Karbi Anglong",
    ],
  },

  Bihar: {
    districts: [
      "Araria",
      "Arwal",
      "Aurangabad",
      "Banka",
      "Begusarai",
      "Bhagalpur",
      "Bhojpur",
      "Buxar",
      "Darbhanga",
      "East Champaran",
      "Gaya",
      "Gopalganj",
      "Jamui",
      "Jehanabad",
      "Kaimur",
      "Katihar",
      "Khagaria",
      "Kishanganj",
      "Lakhisarai",
      "Madhepura",
      "Madhubani",
      "Munger",
      "Muzaffarpur",
      "Nalanda",
      "Nawada",
      "Patna",
      "Purnia",
      "Rohtas",
      "Saharsa",
      "Samastipur",
      "Saran",
      "Sheikhpura",
      "Sheohar",
      "Sitamarhi",
      "Siwan",
      "Supaul",
      "Vaishali",
      "West Champaran",
    ],
  },

  Chhattisgarh: {
    districts: [
      "Balod",
      "Baloda Bazar",
      "Balrampur-Ramanujganj",
      "Bastar",
      "Bemetara",
      "Bijapur",
      "Bilaspur",
      "Dantewada",
      "Dhamtari",
      "Durg",
      "Gariaband",
      "Gaurela-Pendra-Marwahi",
      "Janjgir-Champa",
      "Jashpur",
      "Kabirdham",
      "Kanker",
      "Khairagarh-Chhuikhadan-Gandai",
      "Kondagaon",
      "Korba",
      "Koriya",
      "Mahasamund",
      "Manendragarh-Chirmiri-Bharatpur",
      "Mohla-Manpur-Ambagarh Chowki",
      "Mungeli",
      "Narayanpur",
      "Raigarh",
      "Raipur",
      "Rajnandgaon",
      "Sakti",
      "Sarangarh-Bilaigarh",
      "Sukma",
      "Surajpur",
      "Surguja",
    ],
  },

  Goa: {
    districts: ["North Goa", "South Goa"],
  },

  Gujarat: {
    districts: [
      "Ahmedabad",
      "Amreli",
      "Anand",
      "Aravalli",
      "Banaskantha",
      "Bharuch",
      "Bhavnagar",
      "Botad",
      "Chhota Udaipur",
      "Dahod",
      "Dang",
      "Devbhumi Dwarka",
      "Gandhinagar",
      "Gir Somnath",
      "Jamnagar",
      "Junagadh",
      "Kheda",
      "Kutch",
      "Mahisagar",
      "Mehsana",
      "Morbi",
      "Narmada",
      "Navsari",
      "Panchmahal",
      "Patan",
      "Porbandar",
      "Rajkot",
      "Sabarkantha",
      "Surat",
      "Surendranagar",
      "Tapi",
      "Vadodara",
      "Valsad",
    ],
  },

  Haryana: {
    districts: [
      "Ambala",
      "Bhiwani",
      "Charkhi Dadri",
      "Faridabad",
      "Fatehabad",
      "Gurugram",
      "Hisar",
      "Jhajjar",
      "Jind",
      "Kaithal",
      "Karnal",
      "Kurukshetra",
      "Mahendragarh",
      "Nuh",
      "Palwal",
      "Panchkula",
      "Panipat",
      "Rewari",
      "Rohtak",
      "Sirsa",
      "Sonipat",
      "Yamunanagar",
    ],
  },

  "Himachal Pradesh": {
    districts: [
      "Bilaspur",
      "Chamba",
      "Hamirpur",
      "Kangra",
      "Kinnaur",
      "Kullu",
      "Lahaul and Spiti",
      "Mandi",
      "Shimla",
      "Sirmaur",
      "Solan",
      "Una",
    ],
  },

  Jharkhand: {
    districts: [
      "Bokaro",
      "Chatra",
      "Deoghar",
      "Dhanbad",
      "Dumka",
      "East Singhbhum",
      "Garhwa",
      "Giridih",
      "Godda",
      "Gumla",
      "Hazaribag",
      "Jamtara",
      "Khunti",
      "Koderma",
      "Latehar",
      "Lohardaga",
      "Pakur",
      "Palamu",
      "Ramgarh",
      "Ranchi",
      "Sahebganj",
      "Seraikela Kharsawan",
      "Simdega",
      "West Singhbhum",
    ],
  },

  Karnataka: {
    districts: [
      "Bagalkot",
      "Ballari",
      "Belagavi",
      "Bengaluru Rural",
      "Bengaluru Urban",
      "Bidar",
      "Chamarajanagar",
      "Chikkaballapur",
      "Chikkamagaluru",
      "Chitradurga",
      "Dakshina Kannada",
      "Davanagere",
      "Dharwad",
      "Gadag",
      "Hassan",
      "Haveri",
      "Kalaburagi",
      "Kodagu",
      "Kolar",
      "Koppal",
      "Mandya",
      "Mysuru",
      "Raichur",
      "Ramanagara",
      "Shivamogga",
      "Tumakuru",
      "Udupi",
      "Uttara Kannada",
      "Vijayapura",
      "Yadgir",
    ],
  },

  Kerala: {
    districts: [
      "Alappuzha",
      "Ernakulam",
      "Idukki",
      "Kannur",
      "Kasaragod",
      "Kollam",
      "Kottayam",
      "Kozhikode",
      "Malappuram",
      "Palakkad",
      "Pathanamthitta",
      "Thiruvananthapuram",
      "Thrissur",
      "Wayanad",
    ],
  },

  "Madhya Pradesh": {
    districts: [
      "Agar Malwa",
      "Alirajpur",
      "Anuppur",
      "Ashoknagar",
      "Balaghat",
      "Barwani",
      "Betul",
      "Bhind",
      "Bhopal",
      "Burhanpur",
      "Chhatarpur",
      "Chhindwara",
      "Damoh",
      "Datia",
      "Dewas",
      "Dhar",
      "Dindori",
      "Guna",
      "Gwalior",
      "Harda",
      "Indore",
      "Jabalpur",
      "Jhabua",
      "Katni",
      "Khandwa",
      "Khargone",
      "Maihar",
      "Mandla",
      "Mandsaur",
      "Mauganj",
      "Morena",
      "Narmadapuram",
      "Narsinghpur",
      "Neemuch",
      "Niwari",
      "Panna",
      "Raisen",
      "Rajgarh",
      "Ratlam",
      "Rewa",
      "Sagar",
      "Satna",
      "Sehore",
      "Seoni",
      "Shahdol",
      "Shajapur",
      "Sheopur",
      "Shivpuri",
      "Sidhi",
      "Singrauli",
      "Tikamgarh",
      "Ujjain",
      "Umaria",
      "Vidisha",
    ],
  },

  Maharashtra: {
    districts: [
      "Ahmednagar",
      "Akola",
      "Amravati",
      "Aurangabad",
      "Beed",
      "Bhandara",
      "Buldhana",
      "Chandrapur",
      "Dhule",
      "Gadchiroli",
      "Gondia",
      "Hingoli",
      "Jalgaon",
      "Jalna",
      "Kolhapur",
      "Latur",
      "Mumbai City",
      "Mumbai Suburban",
      "Nagpur",
      "Nanded",
      "Nandurbar",
      "Nashik",
      "Osmanabad",
      "Palghar",
      "Parbhani",
      "Pune",
      "Raigad",
      "Ratnagiri",
      "Sangli",
      "Satara",
      "Sindhudurg",
      "Solapur",
      "Thane",
      "Wardha",
      "Washim",
      "Yavatmal",
    ],
  },

  Manipur: {
    districts: [
      "Bishnupur",
      "Chandel",
      "Churachandpur",
      "Imphal East",
      "Imphal West",
      "Jiribam",
      "Kakching",
      "Kamjong",
      "Kangpokpi",
      "Noney",
      "Pherzawl",
      "Senapati",
      "Tamenglong",
      "Tengnoupal",
      "Thoubal",
      "Ukhrul",
    ],
  },

  Meghalaya: {
    districts: [
      "East Garo Hills",
      "East Jaintia Hills",
      "East Khasi Hills",
      "Eastern West Khasi Hills",
      "North Garo Hills",
      "Ri Bhoi",
      "South Garo Hills",
      "South West Garo Hills",
      "South West Khasi Hills",
      "West Garo Hills",
      "West Jaintia Hills",
      "West Khasi Hills",
    ],
  },

  Mizoram: {
    districts: [
      "Aizawl",
      "Champhai",
      "Hnahthial",
      "Khawzawl",
      "Kolasib",
      "Lawngtlai",
      "Lunglei",
      "Mamit",
      "Saitual",
      "Serchhip",
      "Siaha",
    ],
  },

  Nagaland: {
    districts: [
      "Chumoukedima",
      "Dimapur",
      "Kiphire",
      "Kohima",
      "Longleng",
      "Mokokchung",
      "Mon",
      "Niuland",
      "Noklak",
      "Peren",
      "Phek",
      "Shamator",
      "Tseminyu",
      "Tuensang",
      "Wokha",
      "Zunheboto",
    ],
  },

  Odisha: {
    districts: [
      "Angul",
      "Balangir",
      "Balasore",
      "Bargarh",
      "Bhadrak",
      "Boudh",
      "Cuttack",
      "Deogarh",
      "Dhenkanal",
      "Gajapati",
      "Ganjam",
      "Jagatsinghpur",
      "Jajpur",
      "Jharsuguda",
      "Kalahandi",
      "Kandhamal",
      "Kendrapara",
      "Kendujhar",
      "Khordha",
      "Koraput",
      "Malkangiri",
      "Mayurbhanj",
      "Nabarangpur",
      "Nayagarh",
      "Nuapada",
      "Puri",
      "Rayagada",
      "Sambalpur",
      "Subarnapur",
      "Sundargarh",
    ],
  },

  Punjab: {
    districts: [
      "Amritsar",
      "Barnala",
      "Bathinda",
      "Faridkot",
      "Fatehgarh Sahib",
      "Fazilka",
      "Ferozepur",
      "Gurdaspur",
      "Hoshiarpur",
      "Jalandhar",
      "Kapurthala",
      "Ludhiana",
      "Malerkotla",
      "Mansa",
      "Moga",
      "Pathankot",
      "Patiala",
      "Rupnagar",
      "Sahibzada Ajit Singh Nagar",
      "Sangrur",
      "Shaheed Bhagat Singh Nagar",
      "Sri Muktsar Sahib",
      "Tarn Taran",
    ],
  },

  Rajasthan: {
    districts: [
      "Ajmer",
      "Alwar",
      "Anupgarh",
      "Balotra",
      "Banswara",
      "Baran",
      "Barmer",
      "Beawar",
      "Bharatpur",
      "Bhilwara",
      "Bikaner",
      "Bundi",
      "Chittorgarh",
      "Churu",
      "Dausa",
      "Deeg",
      "Dholpur",
      "Didwana-Kuchamana",
      "Dudu",
      "Dungarpur",
      "Ganganagar",
      "Gangapur City",
      "Hanumangarh",
      "Jaipur",
      "Jaipur Rural",
      "Jaisalmer",
      "Jalore",
      "Jhalawar",
      "Jhunjhunu",
      "Jodhpur",
      "Jodhpur Rural",
      "Karauli",
      "Kekri",
      "Khairthal-Tijara",
      "Kota",
      "Kotputli-Behror",
      "Nagaur",
      "Neem Ka Thana",
      "Pali",
      "Phalodi",
      "Pratapgarh",
      "Rajsamand",
      "Salumbar",
      "Sawai Madhopur",
      "Shahpura",
      "Sikar",
      "Sirohi",
      "Tonk",
      "Udaipur",
    ],
  },

  Sikkim: {
    districts: [
      "Gangtok",
      "Gyalshing",
      "Mangan",
      "Namchi",
      "Pakyong",
      "Soreng",
    ],
  },

  "Tamil Nadu": {
    districts: [
      "Ariyalur",
      "Chengalpattu",
      "Chennai",
      "Coimbatore",
      "Cuddalore",
      "Dharmapuri",
      "Dindigul",
      "Erode",
      "Kallakurichi",
      "Kancheepuram",
      "Karur",
      "Krishnagiri",
      "Madurai",
      "Mayiladuthurai",
      "Nagapattinam",
      "Namakkal",
      "Nilgiris",
      "Perambalur",
      "Pudukkottai",
      "Ramanathapuram",
      "Ranipet",
      "Salem",
      "Sivaganga",
      "Tenkasi",
      "Thanjavur",
      "Theni",
      "Thoothukudi",
      "Tiruchirappalli",
      "Tirunelveli",
      "Tirupathur",
      "Tiruppur",
      "Tiruvallur",
      "Tiruvannamalai",
      "Tiruvarur",
      "Vellore",
      "Viluppuram",
      "Virudhunagar",
    ],
  },

  Telangana: {
    districts: [
      "Adilabad",
      "Bhadradri Kothagudem",
      "Hanamkonda",
      "Hyderabad",
      "Jagtial",
      "Jangaon",
      "Jayashankar Bhupalpally",
      "Jogulamba Gadwal",
      "Kamareddy",
      "Karimnagar",
      "Khammam",
      "Komaram Bheem Asifabad",
      "Mahabubabad",
      "Mahbubnagar",
      "Mancherial",
      "Medak",
      "Medchal-Malkajgiri",
      "Mulugu",
      "Nagarkurnool",
      "Nalgonda",
      "Narayanpet",
      "Nirmal",
      "Nizamabad",
      "Peddapalli",
      "Rajanna Sircilla",
      "Rangareddy",
      "Sangareddy",
      "Siddipet",
      "Suryapet",
      "Vikarabad",
      "Wanaparthy",
      "Warangal",
      "Yadadri Bhuvanagiri",
    ],
  },

  Tripura: {
    districts: [
      "Dhalai",
      "Gomati",
      "Khowai",
      "North Tripura",
      "Sepahijala",
      "South Tripura",
      "Unakoti",
      "West Tripura",
    ],
  },

  "Uttar Pradesh": {
    districts: [
      "Agra",
      "Aligarh",
      "Ambedkar Nagar",
      "Amethi",
      "Amroha",
      "Auraiya",
      "Ayodhya",
      "Azamgarh",
      "Baghpat",
      "Bahraich",
      "Ballia",
      "Balrampur",
      "Banda",
      "Barabanki",
      "Bareilly",
      "Basti",
      "Bhadohi",
      "Bijnor",
      "Budaun",
      "Bulandshahr",
      "Chandauli",
      "Chitrakoot",
      "Deoria",
      "Etah",
      "Etawah",
      "Farrukhabad",
      "Fatehpur",
      "Firozabad",
      "Gautam Buddha Nagar",
      "Ghaziabad",
      "Ghazipur",
      "Gonda",
      "Gorakhpur",
      "Hamirpur",
      "Hapur",
      "Hardoi",
      "Hathras",
      "Jalaun",
      "Jaunpur",
      "Jhansi",
      "Kannauj",
      "Kanpur Dehat",
      "Kanpur Nagar",
      "Kasganj",
      "Kaushambi",
      "Kushinagar",
      "Lakhimpur Kheri",
      "Lalitpur",
      "Lucknow",
      "Maharajganj",
      "Mahoba",
      "Mainpuri",
      "Mathura",
      "Mau",
      "Meerut",
      "Mirzapur",
      "Moradabad",
      "Muzaffarnagar",
      "Pilibhit",
      "Pratapgarh",
      "Prayagraj",
      "Raebareli",
      "Rampur",
      "Saharanpur",
      "Sambhal",
      "Sant Kabir Nagar",
      "Shahjahanpur",
      "Shamli",
      "Shravasti",
      "Siddharthnagar",
      "Sitapur",
      "Sonbhadra",
      "Sultanpur",
      "Unnao",
      "Varanasi",
    ],
  },

  Uttarakhand: {
    districts: [
      "Almora",
      "Bageshwar",
      "Chamoli",
      "Champawat",
      "Dehradun",
      "Haridwar",
      "Nainital",
      "Pauri Garhwal",
      "Pithoragarh",
      "Rudraprayag",
      "Tehri Garhwal",
      "Udham Singh Nagar",
      "Uttarkashi",
    ],
  },

  "West Bengal": {
    districts: [
      "Alipurduar",
      "Bankura",
      "Paschim Bardhaman",
      "Purba Bardhaman",
      "Birbhum",
      "Cooch Behar",
      "Darjeeling",
      "Hooghly",
      "Howrah",
      "Jalpaiguri",
      "Jhargram",
      "Kalimpong",
      "Kolkata",
      "Maldah",
      "Murshidabad",
      "Nadia",
      "North 24 Parganas",
      "South 24 Parganas",
      "Uttar Dinajpur",
      "Dakshin Dinajpur",
      "Paschim Medinipur",
      "Purba Medinipur",
    ],
  },

  Delhi: {
    districts: [
      "Central Delhi",
      "East Delhi",
      "New Delhi",
      "North Delhi",
      "North East Delhi",
      "North West Delhi",
      "Shahdara",
      "South Delhi",
      "South East Delhi",
      "South West Delhi",
      "West Delhi",
    ],
  },

  "Jammu and Kashmir": {
    districts: [
      "Anantnag",
      "Bandipora",
      "Baramulla",
      "Budgam",
      "Doda",
      "Ganderbal",
      "Jammu",
      "Kathua",
      "Kishtwar",
      "Kulgam",
      "Kupwara",
      "Poonch",
      "Pulwama",
      "Rajouri",
      "Ramban",
      "Reasi",
      "Samba",
      "Shopian",
      "Srinagar",
      "Udhampur",
    ],
  },

  Ladakh: {
    districts: ["Kargil", "Leh"],
  },

  Puducherry: {
    districts: [
      "Karaikal",
      "Mahe",
      "Puducherry",
      "Yanam",
    ],
  },

  Chandigarh: {
    districts: ["Chandigarh"],
  },

  "Dadra and Nagar Haveli and Daman and Diu": {
    districts: [
      "Dadra and Nagar Haveli",
      "Daman",
      "Diu",
    ],
  },

  Lakshadweep: {
    districts: ["Lakshadweep"],
  },

  "Andaman and Nicobar Islands": {
    districts: [
      "Nicobar",
      "North and Middle Andaman",
      "South Andaman",
    ],
  },
};

const STATE_OPTIONS =
  Object.keys(INDIAN_STATES).sort();

/* =========================================================
   DOCUMENTS
========================================================= */

const documentFields = [
  {
    key: "identityProof",
    label: "Identity Proof",
    required: true,
  },
  {
    key: "addressProof",
    label: "Address Proof",
    required: true,
  },
  {
    key: "landProof",
    label: "Land / Farm Proof",
    required: true,
  },
];

/* =========================================================
   EMPTY FORM
========================================================= */

const initialForm = {
  fullName: "",
  email: "",
  dob: "",
  gender: "",

  address: "",

  state: "",
  district: "",
  mandal: "",
  village: "",

  pincode: "",

  farmName: "",
  farmType: "",
  landArea: "",
  landUnit: "acres",
  crops: "",
  irrigation: "",
};

/* =========================================================
   LOCATION HELPERS
========================================================= */

const normaliseLocationName = (
  value = ""
) => {
  return String(value)
    .toLowerCase()
    .replace(
      /\bdistrict\b/g,
      ""
    )
    .replace(
      /\bdivision\b/g,
      ""
    )
    .replace(
      /\bmandal\b/g,
      ""
    )
    .replace(
      /\btaluk\b/g,
      ""
    )
    .replace(
      /\btahsil\b/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
};

const findBestMatch = (
  value,
  options
) => {
  if (!value) {
    return "";
  }

  const normalizedValue =
    normaliseLocationName(value);

  const exactMatch =
    options.find(
      (option) =>
        normaliseLocationName(option) ===
        normalizedValue
    );

  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch =
    options.find((option) => {
      const normalizedOption =
        normaliseLocationName(option);

      return (
        normalizedOption.includes(
          normalizedValue
        ) ||
        normalizedValue.includes(
          normalizedOption
        )
      );
    });

  return partialMatch || value;
};

const findDetectedState = (
  data
) => {
  const possibleValues = [
    data.principalSubdivision,
    data.state,
    data.state_district,
  ].filter(Boolean);

  for (
    const value of possibleValues
  ) {
    const match = findBestMatch(
      value,
      STATE_OPTIONS
    );

    if (
      STATE_OPTIONS.includes(match)
    ) {
      return match;
    }
  }

  return "";
};

const findDetectedDistrict = (
  data,
  state
) => {
  const districtOptions =
    INDIAN_STATES[state]
      ?.districts || [];

  if (!districtOptions.length) {
    return (
      data.district ||
      data.county ||
      ""
    );
  }

  const possibleValues = [
    data.district,
    data.county,
    data.state_district,
  ];

  for (
    const value of possibleValues
  ) {
    if (!value) {
      continue;
    }

    const match =
      findBestMatch(
        value,
        districtOptions
      );

    if (match) {
      return match;
    }
  }

  /*
    BigDataCloud also provides
    administrative hierarchy.
  */

  const administrative =
    data.localityInfo
      ?.administrative || [];

  for (
    const item of administrative
  ) {
    const match =
      findBestMatch(
        item.name,
        districtOptions
      );

    if (
      match &&
      districtOptions.includes(match)
    ) {
      return match;
    }
  }

  return "";
};

const buildDetectedAddress = (
  data
) => {
  const parts = [
    data.locality,
    data.city,
    data.town,
    data.village,
    data.district,
    data.principalSubdivision,
    data.postcode,
  ];

  return [
    ...new Set(
      parts.filter(Boolean)
    ),
  ].join(", ");
};

/* =========================================================
   COMPONENT
========================================================= */

function IndividualFarmerDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  const stateData =
    location.state || {};

  const mobile =
    stateData.mobile ||
    localStorage.getItem(
      "farmer_mobile"
    ) ||
    "";

  const passedApplicationId =
    stateData.applicationId || "";

  const passedUid =
    stateData.uid || "";

  const isRejected =
    Boolean(stateData.rejected);

  const existingUser =
    Boolean(stateData.existingUser);

  /* =======================================================
     FORM
  ======================================================= */

  const [form, setForm] =
    useState(initialForm);

  /* =======================================================
     DOCUMENTS
  ======================================================= */

  const [documents, setDocuments] =
    useState({});

  /* =======================================================
     EXISTING APPLICATION
  ======================================================= */

  const [
    applicationId,
    setApplicationId,
  ] = useState(
    passedApplicationId
  );

  const [
    applicationOwnerUid,
    setApplicationOwnerUid,
  ] = useState(
    passedUid
  );

  /* =======================================================
     GPS
  ======================================================= */

  const [
    currentLocation,
    setCurrentLocation,
  ] = useState(null);

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  /* =======================================================
     UI
  ======================================================= */

  const [loading, setLoading] =
    useState(false);

  const [
    loadingExisting,
    setLoadingExisting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /* =======================================================
     DISTRICTS
  ======================================================= */

  const districts = useMemo(() => {
    if (!form.state) {
      return [];
    }

    return (
      INDIAN_STATES[
        form.state
      ]?.districts || []
    );
  }, [form.state]);

  /* =======================================================
     LOAD EXISTING APPLICATION
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadExistingApplication =
      async () => {
        let targetApplicationId =
          passedApplicationId;

        try {
          if (
            targetApplicationId
          ) {
            setLoadingExisting(true);

            const applicationRef =
              doc(
                db,
                "farmerApplications",
                targetApplicationId
              );

            const snapshot =
              await getDoc(
                applicationRef
              );

            if (
              snapshot.exists()
            ) {
              const data =
                snapshot.data();

              if (!cancelled) {
                setApplicationId(
                  targetApplicationId
                );

                setApplicationOwnerUid(
                  data.uid ||
                    passedUid ||
                    ""
                );

                populateForm(data);

                setDocuments(
                  data.documents ||
                    {}
                );

                if (
                  data.location
                    ?.latitude &&
                  data.location
                    ?.longitude
                ) {
                  setCurrentLocation(
                    data.location
                  );
                }
              }
            }

            setLoadingExisting(false);
            return;
          }

          if (
            existingUser &&
            mobile
          ) {
            setLoadingExisting(true);

            const indexRef =
              doc(
                db,
                "farmerLoginIndex",
                mobile
              );

            const indexSnapshot =
              await getDoc(
                indexRef
              );

            if (
              indexSnapshot.exists()
            ) {
              const indexData =
                indexSnapshot.data();

              if (
                indexData.applicationId
              ) {
                targetApplicationId =
                  indexData.applicationId;

                const applicationRef =
                  doc(
                    db,
                    "farmerApplications",
                    targetApplicationId
                  );

                const applicationSnapshot =
                  await getDoc(
                    applicationRef
                  );

                if (
                  applicationSnapshot.exists()
                ) {
                  const data =
                    applicationSnapshot.data();

                  if (
                    !cancelled
                  ) {
                    setApplicationId(
                      targetApplicationId
                    );

                    setApplicationOwnerUid(
                      data.uid ||
                        indexData.uid ||
                        ""
                    );

                    populateForm(data);

                    setDocuments(
                      data.documents ||
                        {}
                    );

                    if (
                      data.location
                        ?.latitude &&
                      data.location
                        ?.longitude
                    ) {
                      setCurrentLocation(
                        data.location
                      );
                    }
                  }
                }
              }
            }

            setLoadingExisting(false);
          }
        } catch (firebaseError) {
          console.error(
            "Existing farmer load error:",
            firebaseError
          );

          if (!cancelled) {
            setError(
              "Unable to load your registered details."
            );

            setLoadingExisting(false);
          }
        }
      };

    loadExistingApplication();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     POPULATE FORM
  ======================================================= */

  const populateForm = (
    data
  ) => {
    const personal =
      data.personalDetails ||
      {};

    const farm =
      data.farmDetails ||
      {};

    setForm({
      fullName:
        personal.fullName ||
        data.fullName ||
        "",

      email:
        personal.email ||
        data.email ||
        "",

      dob:
        personal.dob ||
        data.dob ||
        "",

      gender:
        personal.gender ||
        data.gender ||
        "",

      address:
        personal.address ||
        data.address ||
        "",

      state:
        personal.state ||
        data.state ||
        "",

      district:
        personal.district ||
        data.district ||
        "",

      mandal:
        personal.mandal ||
        data.mandal ||
        "",

      village:
        personal.village ||
        data.village ||
        "",

      pincode:
        personal.pincode ||
        data.pincode ||
        "",

      farmName:
        farm.farmName ||
        data.farmName ||
        "",

      farmType:
        farm.farmType ||
        data.farmType ||
        "",

      landArea:
        farm.landArea ||
        data.landArea ||
        "",

      landUnit:
        farm.landUnit ||
        data.landUnit ||
        "acres",

      crops:
        farm.crops ||
        data.crops ||
        "",

      irrigation:
        farm.irrigation ||
        data.irrigation ||
        "",
    });
  };

  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setError("");
    setSuccess("");
  };

  /* =======================================================
     STATE CHANGE
  ======================================================= */

  const handleStateChange = (
    event
  ) => {
    const value =
      event.target.value;

    setForm(
      (previous) => ({
        ...previous,
        state: value,
        district: "",
      })
    );

    setError("");
    setSuccess("");
  };

  /* =======================================================
     DOCUMENT CHANGE
  ======================================================= */

  const handleDocumentChange = (
    key,
    file
  ) => {
    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    const maxSize =
      5 * 1024 * 1024;

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "Only PDF, JPG and PNG files are allowed."
      );
      return;
    }

    if (
      file.size > maxSize
    ) {
      setError(
        "Each document must be below 5 MB."
      );
      return;
    }

    setDocuments(
      (previous) => ({
        ...previous,

        [key]: {
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt:
            new Date().toISOString(),
        },
      })
    );

    setError("");
    setSuccess("");
  };

  /* =======================================================
     CURRENT LOCATION
  ======================================================= */

  const useCurrentLocation = () => {
    setError("");
    setSuccess("");

    if (
      !navigator.geolocation
    ) {
      setError(
        "Location is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          /*
            Save exact GPS coordinates.
          */

          const gpsLocation = {
            latitude,
            longitude,
          };

          setCurrentLocation(
            gpsLocation
          );

          /*
            Reverse geocode:
            GPS → address
          */

          const response =
            await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );

          if (!response.ok) {
            throw new Error(
              "Address lookup failed."
            );
          }

          const data =
            await response.json();

          console.log(
            "Location lookup:",
            data
          );

          /*
            State
          */

          const detectedState =
            findDetectedState(
              data
            );

          /*
            District
          */

          const detectedDistrict =
            findDetectedDistrict(
              data,
              detectedState
            );

          /*
            Mandal / Taluk
          */

          const detectedMandal =
            data.locality ||
            data.city_district ||
            data.city ||
            data.town ||
            data.suburb ||
            "";

          /*
            Village / Area
          */

          const detectedVillage =
            data.village ||
            data.suburb ||
            data.locality ||
            data.city ||
            data.town ||
            "";

          /*
            Pincode
          */

          const detectedPincode =
            data.postcode ||
            "";

          /*
            Full address
          */

          const detectedAddress =
            buildDetectedAddress(
              data
            );

          /*
            Fill all fields.
          */

          setForm(
            (previous) => ({
              ...previous,

              state:
                detectedState ||
                previous.state,

              district:
                detectedDistrict ||
                previous.district,

              mandal:
                detectedMandal ||
                previous.mandal,

              village:
                detectedVillage ||
                previous.village,

              pincode:
                detectedPincode ||
                previous.pincode,

              address:
                detectedAddress ||
                previous.address,
            })
          );

          setSuccess(
            "Current location detected. Your address fields have been filled automatically. Please verify them before submitting."
          );
        } catch (geocodeError) {
          console.error(
            "Reverse geocoding error:",
            geocodeError
          );

          /*
            GPS worked even if
            address lookup failed.
          */

          setSuccess(
            "GPS location captured. Please complete or verify the address fields manually."
          );
        } finally {
          setLocationLoading(false);
        }
      },

      (locationError) => {
        console.error(
          "Location error:",
          locationError
        );

        setLocationLoading(false);

        switch (
          locationError.code
        ) {
          case 1:
            setError(
              "Location permission was denied. Please allow location access in your browser."
            );
            break;

          case 2:
            setError(
              "Your location could not be determined. Please try again."
            );
            break;

          case 3:
            setError(
              "Location request timed out. Please try again."
            );
            break;

          default:
            setError(
              "Unable to access your current location. Please try again."
            );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm = () => {
    if (
      !form.fullName.trim()
    ) {
      return "Please enter your full name.";
    }

    if (!mobile) {
      return "Mobile number is missing. Please login again.";
    }

    if (!form.dob) {
      return "Please select your date of birth.";
    }

    if (!form.gender) {
      return "Please select your gender.";
    }

    if (!form.state.trim()) {
      return "Please enter your state.";
    }

    if (
      !form.district.trim()
    ) {
      return "Please enter your district.";
    }

    if (
      !form.mandal.trim()
    ) {
      return "Please enter your mandal / taluk.";
    }

    if (
      !form.village.trim()
    ) {
      return "Please enter your village.";
    }

    if (
      !/^\d{6}$/.test(
        form.pincode.trim()
      )
    ) {
      return "Please enter a valid 6-digit pincode.";
    }

    if (
      !form.farmName.trim()
    ) {
      return "Please enter your farm name.";
    }

    if (
      !form.landArea ||
      Number(form.landArea) <= 0
    ) {
      return "Please enter valid land area.";
    }

    if (!form.crops.trim()) {
      return "Please enter your main crops.";
    }

    for (
      const field of documentFields
    ) {
      if (
        field.required &&
        !documents[field.key]
      ) {
        return `Please upload ${field.label}.`;
      }
    }

    return "";
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      const validationError =
        validateForm();

      if (validationError) {
        setError(
          validationError
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      const firebaseUser =
        auth.currentUser;

      if (!firebaseUser) {
        setError(
          "Your login session has expired. Please login again."
        );

        return;
      }

      setLoading(true);

      try {
        const profileId =
          `farmer_${mobile}`;

        const applicationData = {
          uid:
            applicationOwnerUid ||
            firebaseUser.uid,

          mobile,

          profileId,

          role:
            "individual_farmer",

          status: "pending",

          personalDetails: {
            fullName:
              form.fullName.trim(),

            email:
              form.email.trim(),

            dob:
              form.dob,

            gender:
              form.gender,

            mobile,

            address:
              form.address.trim(),

            state:
              form.state.trim(),

            district:
              form.district.trim(),

            mandal:
              form.mandal.trim(),

            village:
              form.village.trim(),

            pincode:
              form.pincode.trim(),
          },

          farmDetails: {
            farmName:
              form.farmName.trim(),

            farmType:
              form.farmType,

            landArea:
              Number(
                form.landArea
              ),

            landUnit:
              form.landUnit,

            crops:
              form.crops.trim(),

            irrigation:
              form.irrigation,
          },

          documents,

          location:
            currentLocation ||
            null,

          updatedAt:
            serverTimestamp(),
        };

        /* =====================================
           EXISTING / REJECTED APPLICATION
        ===================================== */

        if (
          applicationId
        ) {
          const applicationRef =
            doc(
              db,
              "farmerApplications",
              applicationId
            );

          await updateDoc(
            applicationRef,
            applicationData
          );

          localStorage.setItem(
            "farmer_application_id",
            applicationId
          );

          localStorage.setItem(
            "farmer_mobile",
            mobile
          );

          localStorage.setItem(
            "farmer_profile_id",
            profileId
          );

          setSuccess(
            "Your application has been resubmitted successfully."
          );

          setTimeout(() => {
            navigate(
              "/waiting-approval",
              {
                state: {
                  mobile,
                  applicationId,
                  profileId,
                },
              }
            );
          }, 1200);

          return;
        }

        /* =====================================
           NEW APPLICATION
        ===================================== */

        const newApplication =
          await addDoc(
            collection(
              db,
              "farmerApplications"
            ),
            {
              ...applicationData,

              uid:
                firebaseUser.uid,

              createdAt:
                serverTimestamp(),
            }
          );

        setApplicationId(
          newApplication.id
        );

        setApplicationOwnerUid(
          firebaseUser.uid
        );

        localStorage.setItem(
          "farmer_application_id",
          newApplication.id
        );

        localStorage.setItem(
          "farmer_mobile",
          mobile
        );

        localStorage.setItem(
          "farmer_profile_id",
          profileId
        );

        setSuccess(
          "Your farmer application has been submitted successfully."
        );

        setTimeout(() => {
          navigate(
            "/waiting-approval",
            {
              state: {
                mobile,
                applicationId:
                  newApplication.id,
                profileId,
              },
            }
          );
        }, 1200);
      } catch (firebaseError) {
        console.error(
          "Farmer application submit error:",
          firebaseError
        );

        if (
          firebaseError.code ===
          "permission-denied"
        ) {
          setError(
            "Firebase permission denied. Please check your farmer application rules."
          );
        } else {
          setError(
            firebaseError.message ||
              "Unable to submit your application."
          );
        }
      } finally {
        setLoading(false);
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loadingExisting) {
    return (
      <div className="farmer-details-loading">
        <div className="details-loading-logo">
          <Leaf size={26} />
        </div>

        <h2>
          AgriConnect
        </h2>

        <p>
          Loading your registered details...
        </p>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="farmer-details-page">

      {/* HEADER */}

      <header className="farmer-details-header">

        <button
          type="button"
          className="details-back-button"
          onClick={() =>
            navigate(
              "/login/farmer/individual"
            )
          }
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="details-brand">
          <div className="details-brand-mark">
            <Leaf
              size={22}
              strokeWidth={1.5}
            />
          </div>

          <span>
            AgriConnect
          </span>
        </div>

        <div className="details-role">
          INDIVIDUAL FARMER
        </div>
      </header>

      {/* MAIN */}

      <main className="farmer-details-container">

        <div className="farmer-details-intro">
          <p className="details-eyebrow">
            FARMER REGISTRATION
          </p>

          <h1>
            Tell us about your farm
          </h1>

          <p>
            Complete your details to create your
            verified farmer profile on AgriConnect.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div className="details-alert error">
            <span>!</span>

            <p>
              {error}
            </p>
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="details-alert success">
            <CheckCircle2 size={18} />

            <p>
              {success}
            </p>
          </div>
        )}

        <form
          className="farmer-details-form"
          onSubmit={handleSubmit}
        >

          {/* =================================
              PERSONAL
          ================================= */}

          <section className="details-form-section">

            <div className="form-section-heading">
              <div className="form-section-number">
                01
              </div>

              <div>
                <p>
                  PERSONAL INFORMATION
                </p>

                <h2>
                  Your details
                </h2>
              </div>
            </div>

            <div className="details-form-grid">

              <div className="details-field full">
                <label>
                  Full Name
                  <span>*</span>
                </label>

                <input
                  name="fullName"
                  value={
                    form.fullName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter your full name"
                />
              </div>

              <div className="details-field">
                <label>
                  Mobile Number
                </label>

                <input
                  value={
                    mobile
                      ? `+91 ${mobile}`
                      : ""
                  }
                  disabled
                />

                <small>
                  Verified through farmer login
                </small>
              </div>

              <div className="details-field">
                <label>
                  Email Address
                </label>

                <input
                  name="email"
                  type="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="name@example.com"
                />
              </div>

              <div className="details-field">
                <label>
                  Date of Birth
                  <span>*</span>
                </label>

                <input
                  name="dob"
                  type="date"
                  value={
                    form.dob
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="details-field">
                <label>
                  Gender
                  <span>*</span>
                </label>

                <div className="select-wrapper">
                  <select
                    name="gender"
                    value={
                      form.gender
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="">
                      Select gender
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                  <ChevronDown size={16} />
                </div>
              </div>

            </div>
          </section>

          {/* =================================
              LOCATION
          ================================= */}

          <section className="details-form-section">

            <div className="form-section-heading">
              <div className="form-section-number">
                02
              </div>

              <div>
                <p>
                  FARM LOCATION
                </p>

                <h2>
                  Where is your farm?
                </h2>
              </div>
            </div>

            {/* CURRENT LOCATION */}

            <div
              className={
                currentLocation
                  ? "location-method-card detected"
                  : "location-method-card"
              }
            >

              <div className="location-method-icon">
                <Crosshair size={20} />
              </div>

              <div className="location-method-content">

                <strong>
                  Use my current location
                </strong>

                <p>
                  Automatically detect your State,
                  District, Mandal, Village, Pincode
                  and address using your current GPS location.
                </p>

                {currentLocation && (
                  <span className="gps-success">
                    <CheckCircle2 size={14} />
                    Location captured
                  </span>
                )}

              </div>

              <button
                type="button"
                onClick={
                  useCurrentLocation
                }
                disabled={
                  locationLoading
                }
              >
                {locationLoading ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="details-spin"
                    />
                    Detecting...
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Use Current Location
                  </>
                )}
              </button>

            </div>

            <div className="location-note">
              <MapPin size={15} />
              <span>
                After detection, please verify the
                automatically filled address before submitting.
              </span>
            </div>

            <div className="location-divider">
              <span>
                OR ENTER MANUALLY
              </span>
            </div>

            <div className="details-form-grid">

              {/* STATE */}

              <div className="details-field">
                <label>
                  State
                  <span>*</span>
                </label>

                <input
                  name="state"
                  value={
                    form.state
                  }
                  onChange={
                    handleStateChange
                  }
                  list="state-options"
                  placeholder="Select or enter state"
                />

                <datalist id="state-options">
                  {STATE_OPTIONS.map(
                    (state) => (
                      <option
                        key={state}
                        value={state}
                      />
                    )
                  )}
                </datalist>
              </div>

              {/* DISTRICT */}

              <div className="details-field">
                <label>
                  District
                  <span>*</span>
                </label>

                <input
                  name="district"
                  value={
                    form.district
                  }
                  onChange={
                    handleChange
                  }
                  list="district-options"
                  placeholder={
                    form.state
                      ? "Select or enter district"
                      : "Enter state first"
                  }
                />

                <datalist id="district-options">
                  {districts.map(
                    (district) => (
                      <option
                        key={district}
                        value={district}
                      />
                    )
                  )}
                </datalist>
              </div>

              {/* MANDAL */}

              <div className="details-field">
                <label>
                  Mandal / Taluk
                  <span>*</span>
                </label>

                <input
                  name="mandal"
                  value={
                    form.mandal
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter mandal / taluk"
                />

                <small>
                  Verify the detected local administrative area.
                </small>
              </div>

              {/* VILLAGE */}

              <div className="details-field">
                <label>
                  Village / Area
                  <span>*</span>
                </label>

                <input
                  name="village"
                  value={
                    form.village
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter village / area"
                />
              </div>

              {/* PINCODE */}

              <div className="details-field">
                <label>
                  Pincode
                  <span>*</span>
                </label>

                <input
                  name="pincode"
                  inputMode="numeric"
                  maxLength={6}
                  value={
                    form.pincode
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="6-digit pincode"
                />
              </div>

              {/* ADDRESS */}

              <div className="details-field full">
                <label>
                  Address / Farm Landmark
                </label>

                <textarea
                  name="address"
                  value={
                    form.address
                  }
                  onChange={
                    handleChange
                  }
                  rows={3}
                  placeholder="House number, street, farm landmark..."
                />
              </div>

            </div>

            {/* COORDINATES */}

            {currentLocation && (
              <div className="coordinates-card">
                <MapPin size={17} />

                <div>
                  <strong>
                    GPS coordinates saved
                  </strong>

                  <span>
                    {currentLocation.latitude.toFixed(
                      6
                    )}
                    ,{" "}
                    {currentLocation.longitude.toFixed(
                      6
                    )}
                  </span>
                </div>
              </div>
            )}

          </section>

          {/* =================================
              FARM DETAILS
          ================================= */}

          <section className="details-form-section">

            <div className="form-section-heading">
              <div className="form-section-number">
                03
              </div>

              <div>
                <p>
                  FARM INFORMATION
                </p>

                <h2>
                  Tell us about your farm
                </h2>
              </div>
            </div>

            <div className="details-form-grid">

              <div className="details-field">
                <label>
                  Farm Name
                  <span>*</span>
                </label>

                <input
                  name="farmName"
                  value={
                    form.farmName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Green Valley Farm"
                />
              </div>

              <div className="details-field">
                <label>
                  Farm Type
                </label>

                <div className="select-wrapper">
                  <select
                    name="farmType"
                    value={
                      form.farmType
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="">
                      Select farm type
                    </option>

                    <option value="Organic">
                      Organic
                    </option>

                    <option value="Conventional">
                      Conventional
                    </option>

                    <option value="Mixed">
                      Mixed
                    </option>

                    <option value="Natural Farming">
                      Natural Farming
                    </option>
                  </select>

                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="details-field">
                <label>
                  Land Area
                  <span>*</span>
                </label>

                <input
                  name="landArea"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.landArea
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. 3.5"
                />
              </div>

              <div className="details-field">
                <label>
                  Land Unit
                </label>

                <div className="select-wrapper">
                  <select
                    name="landUnit"
                    value={
                      form.landUnit
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="acres">
                      Acres
                    </option>

                    <option value="hectares">
                      Hectares
                    </option>

                    <option value="guntas">
                      Guntas
                    </option>
                  </select>

                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="details-field full">
                <label>
                  Main Crops
                  <span>*</span>
                </label>

                <input
                  name="crops"
                  value={
                    form.crops
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Tomato, Rice, Mango..."
                />
              </div>

              <div className="details-field full">
                <label>
                  Irrigation Method
                </label>

                <div className="select-wrapper">
                  <select
                    name="irrigation"
                    value={
                      form.irrigation
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="">
                      Select irrigation method
                    </option>

                    <option value="Drip Irrigation">
                      Drip Irrigation
                    </option>

                    <option value="Sprinkler">
                      Sprinkler
                    </option>

                    <option value="Borewell">
                      Borewell
                    </option>

                    <option value="Canal">
                      Canal
                    </option>

                    <option value="Rainfed">
                      Rainfed
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                  <ChevronDown size={16} />
                </div>
              </div>

            </div>
          </section>

          {/* =================================
              DOCUMENTS
          ================================= */}

          <section className="details-form-section">

            <div className="form-section-heading">
              <div className="form-section-number">
                04
              </div>

              <div>
                <p>
                  VERIFICATION
                </p>

                <h2>
                  Supporting documents
                </h2>
              </div>
            </div>

            <div className="documents-info">
              <FileText size={18} />

              <p>
                Upload clear PDF, JPG or PNG files.
                Each file should be under 5 MB.
              </p>
            </div>

            <div className="documents-grid">

              {documentFields.map(
                (field) => {
                  const uploaded =
                    documents[
                      field.key
                    ];

                  return (
                    <label
                      className={
                        uploaded
                          ? "document-upload uploaded"
                          : "document-upload"
                      }
                      key={
                        field.key
                      }
                    >
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(
                          event
                        ) =>
                          handleDocumentChange(
                            field.key,
                            event.target
                              .files?.[0]
                          )
                        }
                      />

                      <div className="document-upload-icon">
                        {uploaded ? (
                          <CheckCircle2
                            size={22}
                          />
                        ) : (
                          <Upload
                            size={22}
                          />
                        )}
                      </div>

                      <strong>
                        {field.label}

                        {field.required && (
                          <span>*</span>
                        )}
                      </strong>

                      <span>
                        {uploaded
                          ? uploaded.name
                          : "Click to upload"}
                      </span>
                    </label>
                  );
                }
              )}

            </div>
          </section>

          {/* =================================
              SUBMIT
          ================================= */}

          <div className="details-submit-area">

            <div>
              <p>
                Your information will be reviewed by
                the AgriConnect admin team.
              </p>
            </div>

            <button
              type="submit"
              className="details-submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="details-spin"
                  />

                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />

                  {isRejected
                    ? "Resubmit Application"
                    : "Submit Application"}
                </>
              )}
            </button>

          </div>

        </form>
      </main>

      {/* FOOTER */}

      <footer className="farmer-details-footer">

        <div className="footer-brand">
          <Leaf size={17} />

          <span>
            AgriConnect
          </span>
        </div>

        <p>
          Connecting farmers directly with consumers.
        </p>

      </footer>

    </div>
  );
}

export default IndividualFarmerDetails;