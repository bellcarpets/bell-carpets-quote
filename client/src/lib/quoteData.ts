/**
 * Bell Carpets — Quote Data
 * "Velvet Night" design — moody sophistication, champagne gold accents
 * Real product photos for hero images and colour swatches
 */

export interface ColourOption {
  id: string;
  name: string;
  code?: string; // e.g. "506" for Lemar Twist colours
  /** CDN URL to real carpet swatch photo */
  swatchImage: string;
}

export interface Tier {
  id: string;
  name: string;
  label: string;
  productName: string;
  manufacturer: string;
  fibre: string;
  pileType: string;
  badges: string[];
  price: number;
  priceFormatted: string;
  deposit: string;
  color: string;
  colorAccent: string;
  image: string;
  productUrl: string;
  colours: ColourOption[];
  /** Admin-set carpet colour name shown on quote (e.g. "Charcoal", "Silver Birch") */
  colourName?: string;
  /** Pile weight in oz — shown on customer-facing page for Better and Best tiers */
  pileWeight?: string;
}

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449952732/a29pcHdf6xRSErj7q2ehpL";

export const QUOTE_DATA = {
  quoteNumber: "11691",
  issueDate: "01 Apr 2026",
  validUntil: "01 May 2026",
  validDays: 10,

  client: {
    name: "Coronis",
    type: "Real Estate Agency",
  },

  property: {
    address: "9/33-35 Ward Street, Southport",
    fullAddress: "9/33-35 Ward Street, Southport QLD 4215",
  },

  scope: "Supply and Installation to lounge, stairs, 3 bedrooms, robes",

  scopeOfWorks: [
    {
      title: "New Underlay",
      description: "10mm Dunlop Super Green underlay",
    },
    {
      title: "Removal & Disposal",
      description: "Removal and disposal of existing floor coverings",
    },
    {
      title: "Preparation",
      description: "Sub-floor inspection and smooth-edge check",
    },
    {
      title: "Installation",
      description:
        "Professional installation compliant with Australian Standards (AS/NZS 2455.1)",
    },
    {
      title: "Site Clean",
      description: "Vacuum on completion, scraps and packaging removed",
    },
  ],

  addons: [
    {
      id: "furniture",
      title: "Remove & Reinstate Heavy Furniture",
      description: "Move heavy items of furniture out and back into position",
      price: 250,
      priceFormatted: "$250",
    },
    {
      id: "underlay-upgrade",
      title: "Underlay Upgrade",
      description: "Premium underlay upgrade for enhanced comfort and longevity",
      price: 250,
      priceFormatted: "$250",
    },
  ],

  tiers: [
    {
      id: "bronze",
      name: "Good",
      label: "GOOD",
      productName: "Enforcer",
      manufacturer: "Godfrey Hirst",
      fibre: "Polypropylene",
      pileType: "Textured Loop Pile",
      badges: [],
      price: 4367,
      priceFormatted: "$4,367",
      deposit: "$2,183.50",
      color: "#A67C52",
      colorAccent: "#C4956A",
      image: `${CDN}/carpet-bronze_7e298111.jpg`,
      productUrl: "",
      colours: [
        {
          id: "warmstone",
          name: "Warmstone",
          code: "5160",
          swatchImage: "/manus-storage/5160_Warmstone_hires_2109a005.jpg",
        },
        {
          id: "windspray",
          name: "Windspray",
          code: "7108",
          swatchImage: "/manus-storage/7108_Windspray_hires_e33d1ccc.jpg",
        },
        {
          id: "smoke",
          name: "Smoke",
          code: "7250",
          swatchImage: "/manus-storage/7250_Smoke_hires_f6864823.jpg",
        },
        {
          id: "lava",
          name: "Lava",
          code: "7350",
          swatchImage: "/manus-storage/7350_Lava_hires_dae6639a.jpg",
        },
        {
           id: "mineral",
          name: "Mineral",
          code: "7600",
          swatchImage: "/manus-storage/7600_Mineral_hires_585eb929.jpg",
        },
      ],
    },
    {
      id: "silver",
      name: "Better",
      label: "BETTER",
      productName: "Lemar Twist",
      manufacturer: "Victoria Carpets",
      fibre: "100% Solution Dyed Nylon",
      pileType: "Twist Pile",
      pileWeight: "26oz",
      badges: [
        "7 Year Premium Warranty",
        "Australian Made",
        "Red List Free",
      ],
      price: 4830,
      priceFormatted: "$4,830",
      deposit: "$2,415",
      color: "#B8BCC4",
      colorAccent: "#D0D4DC",
      image: `${CDN}/carpet-silver_a104e31a.jpg`,
      productUrl: "",
      colours: [
        {
          id: "smokey-canvas",
          name: "Smokey Canvas",
          swatchImage: "/manus-storage/lemar_smokey_canvas_f5db828b.jpg",
        },
        {
          id: "alicante",
          name: "Alicante",
          swatchImage: "/manus-storage/lemar_alicante_b0886e73.jpg",
        },
        {
          id: "platinum-grey",
          name: "Platinum Grey",
          swatchImage: "/manus-storage/lemar_platinum_grey_4873e30b.jpg",
        },
        {
          id: "black-finestone",
          name: "Black Finestone",
          swatchImage: "/manus-storage/lemar_black_finestone_f78ec584.jpg",
        },
        {
          id: "belleville",
          name: "Belleville",
          swatchImage: "/manus-storage/lemar_belleville_9bd21b8a.jpg",
        },
      ],
    },
    {
      id: "gold",
      name: "Best",
      label: "BEST",
      productName: "Antico Twist",
      manufacturer: "Victoria Carpets",
      fibre: "100% Solution Dyed Nylon",
      pileType: "Twist Pile",
      pileWeight: "34oz",
      badges: [
        "15 Year Limited Residential Wear",
        "15 Year Stain Resistance",
        "Lifetime Anti-Static",
      ],
      price: 5250,
      priceFormatted: "$5,250",
      deposit: "$2,625",
      color: "#D4AF37",
      colorAccent: "#E8C84D",
      image: `${CDN}/carpet-gold_acdbbbe3.jpg`,
      productUrl: "",
      colours: [
        {
          id: "stone-crop",
          name: "Stone Crop",
          swatchImage: "/manus-storage/lemar_smokey_canvas_f5db828b.jpg",
        },
        {
          id: "arctic-seal",
          name: "Arctic Seal",
          swatchImage: "/manus-storage/lemar_alicante_b0886e73.jpg",
        },
        {
          id: "covert-grey",
          name: "Covert Grey",
          swatchImage: "/manus-storage/lemar_platinum_grey_4873e30b.jpg",
        },
        {
          id: "cuban-wood",
          name: "Cuban Wood",
          swatchImage: "/manus-storage/lemar_black_finestone_f78ec584.jpg",
        },
        {
          id: "ashwood-moss",
          name: "Ashwood Moss",
          swatchImage: "/manus-storage/lemar_belleville_9bd21b8a.jpg",
        },
      ],
    },
  ] as Tier[],

  terms: [
    "50% non-refundable deposit to secure booking",
    "Remaining 50% due upon practical completion",
    "Quote valid for 10 days from issue date",
  ],

  business: {
    name: "Bell Carpets",
    established: "1987",
    tagline: "RESIDENTIAL | COMMERCIAL | PROJECTS",
    address: "1/39-41 Olympic Circuit, Southport QLD 4215",
    phone: "07 5571 1177",
    website: "www.bellcarpets.com.au",
    abn: "74 613 299 773",
  },

  assets: {
    heroBg: `${CDN}/hero-bg-Y7n5ReNHPbCPtACMDR4LkL.webp`,
    confidenceBadge: `${CDN}/confidence-badge-WrfnG972QD8cfzR6tQfEEt.webp`,
  },
};
