import slugify from "slugify";

export const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

export const toSlug = (s: string) =>
  slugify(normalize(s).toLowerCase(), { strict: true, remove: /[*+~.()'"!:@]/g });
