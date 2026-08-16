export interface MenuItem {
  id: string;
  name: string;
  price?: number;
  description?: string;
  portion?: string;
  dietary?: string;
}

export interface MenuCategorySection {
  id: string;
  title: string;
  featuredImage?: string | null;
  items: MenuItem[];
}

export interface TastingMenuItem {
  id: string;
  title: string;
  price?: number;
  description?: string;
  subnotes?: string;
}

// Data wadah (container) menu — dibiarkan kosong / siap diisi
export const TASTING_MENUS: TastingMenuItem[] = [];

export const MENU_CATEGORIES: MenuCategorySection[] = [];
