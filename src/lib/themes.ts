export interface ThemePreset {
  key: string;
  name: string;
  description: string;
  swatches: string[];
}

export const FANPAGE_THEMES: ThemePreset[] = [
  {
    key: "CLASSIC",
    name: "Classic Krem",
    description: "Tampilan klasik krem dengan aksen beige lembut.",
    swatches: ["#C0B29E", "#FAF8F5", "#E5DDD0"],
  },
  {
    key: "PEARL",
    name: "Pearl Ivory",
    description: "Ivory mutiara yang bersih, elegan, dan timeless.",
    swatches: ["#C9B8A6", "#FBF9F6", "#E8DFD1"],
  },
  {
    key: "FROST",
    name: "Frost Mist",
    description: "Kabut biru sejuk, jernih seperti udara pagi.",
    swatches: ["#9DB8C9", "#F6F9FB", "#DAE4EB"],
  },
  {
    key: "SNOW",
    name: "Snow Paper",
    description: "Putih bersih minimalis seperti kertas foto premium.",
    swatches: ["#98A2AF", "#FBFCFC", "#E3E6EA"],
  },
  {
    key: "SAGE",
    name: "Sage Hijau",
    description: "Nuansa hijau sage yang tenang dan natural.",
    swatches: ["#A3B18A", "#F5F6EE", "#D5DBBF"],
  },
  {
    key: "MINT",
    name: "Mint Bening",
    description: "Hijau mint segar, bening, dan menenangkan.",
    swatches: ["#9FC9B5", "#F6FAF8", "#D7E9DF"],
  },
  {
    key: "OLIVE",
    name: "Olive Film",
    description: "Hijau olive dengan kesan film grain fotografer.",
    swatches: ["#94A16D", "#F8F8F2", "#DADEC7"],
  },
  {
    key: "NAVY",
    name: "Navy Biru",
    description: "Aksen biru navy elegan berpadu abu lembut.",
    swatches: ["#5B7DA3", "#F3F5F8", "#C9D3DF"],
  },
  {
    key: "POWDER",
    name: "Powder Sky",
    description: "Biru baby yang lembut, bersih, dan romantis.",
    swatches: ["#A9C0D9", "#F8FAFD", "#E0EAF3"],
  },
  {
    key: "LILAC",
    name: "Lilac Linen",
    description: "Lavender lembut untuk kesan dreamy dan intimate.",
    swatches: ["#B3A7D6", "#FAFAFC", "#E6E0F6"],
  },
  {
    key: "ROSE",
    name: "Rose Mawar",
    description: "Aksen rose lembut yang manis dan hangat.",
    swatches: ["#C08A8A", "#FAF5F4", "#E0CCCB"],
  },
  {
    key: "BLUSH",
    name: "Blush Nude",
    description: "Rose nude yang halus, classy seperti foto film.",
    swatches: ["#D7A9A1", "#FCF9F7", "#ECD9D4"],
  },
  {
    key: "CHAMPAGNE",
    name: "Champagne Gold",
    description: "Emas champagne mewah untuk kesan wedding premium.",
    swatches: ["#CCAE6D", "#FCFBF6", "#EAE1C8"],
  },
  {
    key: "SUNSET",
    name: "Sunset Gold",
    description: "Peach keemasan seperti golden hour photography.",
    swatches: ["#DA9F6A", "#FCF9F3", "#ECD6BE"],
  },
  {
    key: "TERRA",
    name: "Terra Clay",
    description: "Tanah liat hangat dengan nuansa portrait yang dalam.",
    swatches: ["#C98F76", "#FBF8F5", "#E9D5C7"],
  },
  {
    key: "MOCHA",
    name: "Mocha Coffee",
    description: "Kopi susu hangat, nyaman seperti cafe photography.",
    swatches: ["#A78B75", "#FAF8F4", "#E4D5C6"],
  },
  {
    key: "VANILLA",
    name: "Vanilla Cream",
    description: "Cream vanilla yang lembut dan menyenangkan.",
    swatches: ["#CDB28A", "#FDFBF6", "#EAE1C9"],
  },
  {
    key: "STONE",
    name: "Stone Greige",
    description: "Grey-beige netral, tenang seperti pahatan batu.",
    swatches: ["#ADA69A", "#FAFAF8", "#E3E0D9"],
  },
];

export const ADMIN_THEMES: ThemePreset[] = [
  {
    key: "CLASSIC",
    name: "Classic Krem",
    description: "Tema default dengan beige lembut.",
    swatches: ["#C0B29E", "#FAF8F5", "#E5DDD0"],
  },
  {
    key: "PEARL",
    name: "Pearl Ivory",
    description: "Ivory mutiara bersih dan elegan.",
    swatches: ["#C9B8A6", "#FBF9F6", "#E8DFD1"],
  },
  {
    key: "FROST",
    name: "Frost Mist",
    description: "Biru sejuk jernih untuk tampilan admin.",
    swatches: ["#9DB8C9", "#F6F9FB", "#DAE4EB"],
  },
  {
    key: "SNOW",
    name: "Snow Paper",
    description: "Putih minimalis yang bersih dan fokus.",
    swatches: ["#98A2AF", "#FBFCFC", "#E3E6EA"],
  },
  {
    key: "SAGE",
    name: "Sage Hijau",
    description: "Nuansa hijau sage yang tenang.",
    swatches: ["#A3B18A", "#F5F6EE", "#D5DBBF"],
  },
  {
    key: "MINT",
    name: "Mint Bening",
    description: "Hijau mint segar untuk dashboard yang menyegarkan.",
    swatches: ["#9FC9B5", "#F6FAF8", "#D7E9DF"],
  },
  {
    key: "NAVY",
    name: "Navy Biru",
    description: "Aksen biru navy untuk tampilan admin yang tegas.",
    swatches: ["#5B7DA3", "#F3F5F8", "#C9D3DF"],
  },
  {
    key: "LILAC",
    name: "Lilac Linen",
    description: "Lavender lembut untuk tampilan admin yang tenang.",
    swatches: ["#B3A7D6", "#FAFAFC", "#E6E0F6"],
  },
  {
    key: "ROSE",
    name: "Rose Mawar",
    description: "Aksen rose lembut untuk tampilan admin.",
    swatches: ["#C08A8A", "#FAF5F4", "#E0CCCB"],
  },
  {
    key: "BLUSH",
    name: "Blush Nude",
    description: "Rose nude yang halus dan classy.",
    swatches: ["#D7A9A1", "#FCF9F7", "#ECD9D4"],
  },
  {
    key: "CHAMPAGNE",
    name: "Champagne Gold",
    description: "Emas champagne premium untuk admin mewah.",
    swatches: ["#CCAE6D", "#FCFBF6", "#EAE1C8"],
  },
  {
    key: "SUNSET",
    name: "Sunset Gold",
    description: "Peach keemasan hangat untuk tampilan admin.",
    swatches: ["#DA9F6A", "#FCF9F3", "#ECD6BE"],
  },
  {
    key: "TERRA",
    name: "Terra Clay",
    description: "Tanah liat hangat yang berkarakter.",
    swatches: ["#C98F76", "#FBF8F5", "#E9D5C7"],
  },
  {
    key: "MOCHA",
    name: "Mocha Coffee",
    description: "Kopi susu hangat yang nyaman.",
    swatches: ["#A78B75", "#FAF8F4", "#E4D5C6"],
  },
  {
    key: "STONE",
    name: "Stone Greige",
    description: "Grey-beige netral dan profesional.",
    swatches: ["#ADA69A", "#FAFAF8", "#E3E0D9"],
  },
];

export function findTheme(
  presetList: ThemePreset[],
  key: string | null | undefined,
): ThemePreset {
  return (
    presetList.find((t) => t.key === key) ?? {
      key: "CLASSIC",
      name: "Classic Krem",
      description: "Tema default.",
      swatches: ["#C0B29E", "#FAF8F5", "#E5DDD0"],
    }
  );
}