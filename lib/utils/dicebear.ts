// lib/utils/dicebear.ts
import { createAvatar } from "@dicebear/core";
import {
  avataaars,
  adventurer,
  bottts,
  funEmoji,
  pixelArt,
  thumbs,
} from "@dicebear/collection";

// ─── Style Mapping ───────────────────────────────────────────────────────────
export const styleMap: Record<string, any> = {
  avataaars,
  adventurer,
  bottts,
  funEmoji,
  pixelArt,
  thumbs,
};

export const STYLE_OPTIONS = [
  { id: "avataaars", label: "Humano (Moderno)", desc: "Estilo moderno con barbas, cabello y ropa" },
  { id: "adventurer", label: "Humano (Aventura)", desc: "Estilo anime/fantasía con detalles detallados" },
  { id: "bottts", label: "Robot", desc: "Robots de hojalata con antenas y engranajes" },
  { id: "funEmoji", label: "Emoji / Marciano", desc: "Rostros de emojis, extraterrestres y divertidos" },
  { id: "pixelArt", label: "Pixel (Retro)", desc: "Estilo de 8 bits clásico de videojuegos" },
];

export interface AvatarConfig {
  seed: string;
  style: "avataaars" | "adventurer" | "bottts" | "funEmoji" | "pixelArt";
  backgroundColor?: string;
  
  // Customization Options (will map dynamically based on style)
  hair?: string;
  hairColor?: string;
  eyes?: string;
  eyebrows?: string;
  mouth?: string;
  skinColor?: string;
  
  // Avataaars specific
  top?: string;
  facialHair?: string;
  facialHairColor?: string;
  accessories?: string;
  clothing?: string;
  clothesColor?: string;
  hatColor?: string;
  
  // Adventurer specific
  glasses?: string;
  earrings?: string;
  features?: string;
  beard?: string;
  
  // Bottts specific
  baseColor?: string;
  texture?: string;
  sides?: string;
  
  // Pixel specific
  face?: string;
  glassesColor?: string;
  clothingColor?: string;
  
  // Probability toggles
  hasGlasses?: boolean;
  hasBeard?: boolean;
  hasEarrings?: boolean;
  hasFeatures?: boolean;
}

// ─── Background Colors ────────────────────────────────────────────────────────
export const BG_COLORS = [
  { label: "Cielo",      value: "b6e3f4", hex: "#b6e3f4" },
  { label: "Rosa",       value: "ffd5dc", hex: "#ffd5dc" },
  { label: "Menta",      value: "d1f4d0", hex: "#d1f4d0" },
  { label: "Lavanda",    value: "e8d5f4", hex: "#e8d5f4" },
  { label: "Amarillo",   value: "fdf4c8", hex: "#fdf4c8" },
  { label: "Azul",       value: "c0dffd", hex: "#c0dffd" },
  { label: "Naranja",    value: "ffe4c4", hex: "#ffe4c4" },
  { label: "Violeta",    value: "7c3aed", hex: "#7c3aed" },
  { label: "Cyan",       value: "06b6d4", hex: "#06b6d4" },
  { label: "Verde neón", value: "22d3a5", hex: "#22d3a5" },
  { label: "Oscuro",     value: "1a1a2e", hex: "#1a1a2e" },
  { label: "Negro",      value: "0a0a0f", hex: "#0a0a0f" },
];

// ─── URL/DataURI Generator ───────────────────────────────────────────────────
export function getAvatarUrlFromConfig(
  config: AvatarConfig,
  size = 160
): string {
  const selectedStyle = styleMap[config.style] || avataaars;
  const options: any = {
    seed: config.seed || "default",
    size: size,
  };

  // Set background color
  if (config.backgroundColor) {
    options.backgroundColor = [config.backgroundColor];
  }

  // Map settings based on selected style
  if (config.style === "avataaars") {
    if (config.top) options.top = [config.top];
    if (config.hairColor) options.hairColor = [config.hairColor];
    if (config.eyes) options.eyes = [config.eyes];
    if (config.eyebrows) options.eyebrows = [config.eyebrows];
    if (config.mouth) options.mouth = [config.mouth];
    if (config.skinColor) options.skinColor = [config.skinColor];
    
    if (config.hasBeard && config.facialHair) {
      options.facialHair = [config.facialHair];
      options.facialHairProbability = 100;
      if (config.facialHairColor) options.facialHairColor = [config.facialHairColor];
    } else {
      options.facialHairProbability = 0;
    }

    if (config.hasGlasses && config.accessories) {
      options.accessories = [config.accessories];
      options.accessoriesProbability = 100;
    } else {
      options.accessoriesProbability = 0;
    }

    if (config.clothing) options.clothing = [config.clothing];
    if (config.clothesColor) options.clothesColor = [config.clothesColor];
    if (config.hatColor) options.hatColor = [config.hatColor];
  }
  
  else if (config.style === "adventurer") {
    if (config.hair) options.hair = [config.hair];
    if (config.hairColor) options.hairColor = [config.hairColor];
    if (config.eyes) options.eyes = [config.eyes];
    if (config.eyebrows) options.eyebrows = [config.eyebrows];
    if (config.mouth) options.mouth = [config.mouth];
    if (config.skinColor) options.skinColor = [config.skinColor];

    if (config.hasGlasses && config.glasses) {
      options.glasses = [config.glasses];
      options.glassesProbability = 100;
    } else {
      options.glassesProbability = 0;
    }

    if (config.hasEarrings && config.earrings) {
      options.earrings = [config.earrings];
      options.earringsProbability = 100;
    } else {
      options.earringsProbability = 0;
    }

    if (config.hasFeatures && config.features) {
      options.features = [config.features];
      options.featuresProbability = 100;
    } else {
      options.featuresProbability = 0;
    }
  }
  
  else if (config.style === "bottts") {
    if (config.top) options.top = [config.top];
    if (config.sides) options.sides = [config.sides];
    if (config.eyes) options.eyes = [config.eyes];
    if (config.mouth) options.mouth = [config.mouth];
    if (config.texture) options.texture = [config.texture];
    if (config.baseColor) options.baseColor = [config.baseColor];
  }
  
  else if (config.style === "funEmoji") {
    if (config.eyes) options.eyes = [config.eyes];
    if (config.mouth) options.mouth = [config.mouth];
  }
  
  else if (config.style === "pixelArt") {
    if (config.face) options.face = [config.face];
    if (config.hair) options.hair = [config.hair];
    if (config.eyes) options.eyes = [config.eyes];
    if (config.mouth) options.mouth = [config.mouth];
    if (config.clothing) options.clothing = [config.clothing];
    if (config.clothingColor) options.clothingColor = [config.clothingColor];
    
    if (config.hasBeard && config.beard) {
      options.beard = [config.beard];
      options.beardProbability = 100;
    } else {
      options.beardProbability = 0;
    }
    
    if (config.hasGlasses && config.glasses) {
      options.glasses = [config.glasses];
      options.glassesProbability = 100;
      if (config.glassesColor) options.glassesColor = [config.glassesColor];
    } else {
      options.glassesProbability = 0;
    }
  }

  const avatar = createAvatar(selectedStyle, options);
  return avatar.toDataUri();
}

// ─── Default starter config ───────────────────────────────────────────────────
export function defaultAvatarConfig(
  seed: string,
  style: AvatarConfig["style"] = "avataaars"
): AvatarConfig {
  const config: AvatarConfig = {
    seed,
    style,
    backgroundColor: "b6e3f4",
  };

  if (style === "avataaars") {
    config.top = "shortHair";
    config.hairColor = "2c1b18";
    config.eyes = "default";
    config.eyebrows = "default";
    config.mouth = "default";
    config.skinColor = "f8d2b4";
    config.hasBeard = false;
    config.facialHair = "beardLight";
    config.facialHairColor = "2c1b18";
    config.hasGlasses = false;
    config.accessories = "round";
    config.clothing = "collarAndTshirt";
    config.clothesColor = "3c4f76";
  } else if (style === "adventurer") {
    config.hair = "short01";
    config.hairColor = "0e0e0e";
    config.eyes = "variant01";
    config.eyebrows = "variant01";
    config.mouth = "variant04";
    config.skinColor = "ecad80";
    config.hasGlasses = false;
    config.glasses = "variant01";
    config.hasEarrings = false;
    config.hasFeatures = false;
    config.features = "freckles";
  } else if (style === "bottts") {
    config.top = "antenna";
    config.sides = "antennaIdiot";
    config.eyes = "eyes";
    config.mouth = "bite";
    config.texture = "fabric";
    config.baseColor = "cyan";
  } else if (style === "funEmoji") {
    config.eyes = "normal";
    config.mouth = "smile";
  } else if (style === "pixelArt") {
    config.face = "human01";
    config.hair = "short01";
    config.eyes = "variant01";
    config.mouth = "variant01";
    config.clothing = "tshirt";
    config.clothingColor = "056a3f";
    config.hasGlasses = false;
    config.glasses = "variant01";
    config.glassesColor = "000000";
  }

  return config;
}

// ─── Random Config Generator ──────────────────────────────────────────────────
export function randomAvatarConfig(
  seed: string,
  style: AvatarConfig["style"] = "avataaars"
): AvatarConfig {
  const selectedStyle = styleMap[style] || avataaars;
  const props = selectedStyle.schema.properties;
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  const config: AvatarConfig = {
    seed,
    style,
    backgroundColor: pick(BG_COLORS.filter((c) => c.value !== "")).value,
  };

  if (style === "avataaars") {
    config.top = pick(props.top.default || []);
    config.hairColor = pick(props.hairColor.default || []);
    config.eyes = pick(props.eyes.default || []);
    config.eyebrows = pick(props.eyebrows.default || []);
    config.mouth = pick(props.mouth.default || []);
    config.skinColor = pick(props.skinColor.default || []);
    config.hasBeard = Math.random() > 0.7;
    config.facialHair = pick(props.facialHair.default || []);
    config.facialHairColor = pick(props.facialHairColor.default || []);
    config.hasGlasses = Math.random() > 0.8;
    config.accessories = pick(props.accessories.default || []);
    config.clothing = pick(props.clothing.default || []);
    config.clothesColor = pick(props.clothesColor.default || []);
  } else if (style === "adventurer") {
    config.hair = pick(props.hair.default || []);
    config.hairColor = pick(props.hairColor.default || []);
    config.eyes = pick(props.eyes.default || []);
    config.eyebrows = pick(props.eyebrows.default || []);
    config.mouth = pick(props.mouth.default || []);
    config.skinColor = pick(props.skinColor.default || []);
    config.hasGlasses = Math.random() > 0.8;
    config.glasses = pick(props.glasses.default || []);
    config.hasEarrings = Math.random() > 0.8;
    config.earrings = pick(props.earrings.default || []);
    config.hasFeatures = Math.random() > 0.8;
    config.features = pick(props.features.default || []);
  } else if (style === "bottts") {
    config.top = pick(props.top.default || []);
    config.sides = pick(props.sides.default || []);
    config.eyes = pick(props.eyes.default || []);
    config.mouth = pick(props.mouth.default || []);
    config.texture = pick(props.texture.default || []);
    config.baseColor = pick(props.baseColor.default || []);
  } else if (style === "funEmoji") {
    config.eyes = pick(props.eyes.default || []);
    config.mouth = pick(props.mouth.default || []);
  } else if (style === "pixelArt") {
    config.face = pick(props.face.default || []);
    config.hair = pick(props.hair.default || []);
    config.eyes = pick(props.eyes.default || []);
    config.mouth = pick(props.mouth.default || []);
    config.clothing = pick(props.clothing.default || []);
    config.clothingColor = pick(props.clothingColor.default || []);
    config.hasGlasses = Math.random() > 0.8;
    config.glasses = pick(props.glasses.default || []);
    config.glassesColor = pick(props.glassesColor.default || []);
  }

  return config;
}

// ─── Legacy helpers (kept for backwards compat) ───────────────────────────────
export type AvatarStyle = "adventurer" | "bottts" | "lorelei" | "fun-emoji" | "pixel-art" | "thumbs";

export function getAvatarUrl(seed: string, style?: AvatarStyle, size = 128): string {
  const normalizedStyle = style === "fun-emoji" ? "funEmoji" : style === "pixel-art" ? "pixelArt" : (style || "avataaars");
  const selectedStyle = styleMap[normalizedStyle] ? styleMap[normalizedStyle] : avataaars;
  const avatar = createAvatar(selectedStyle, {
    seed: seed || "default",
    size: size,
  });
  return avatar.toDataUri();
}
