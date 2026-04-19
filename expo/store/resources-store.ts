import { getSupabase } from '@/utils/supabase';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceCategory, ResourceItem } from '@/types/resource';
import { v4 as uuidv4 } from 'uuid';

const fetchCategoriesFromSupabase = async (): Promise<ResourceCategory[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('resource_categories')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

const fetchResourceItemsFromSupabase = async (): Promise<ResourceItem[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('resource_items')
    .select('*')
    .order('createdAt', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

interface ResourcesState {
  categories: ResourceCategory[];
  resourceItems: ResourceItem[];
  subscriptions: Record<string, string[]>; // userId -> categoryIds[]
  isLoading: boolean;
  error: string | null;
  getVisibleCategories: () => ResourceCategory[];
  getUserSubscriptions: (userId: string) => string[];
  isUserSubscribed: (userId: string, categoryId: string) => boolean;
  subscribeToCategory: (userId: string, categoryId: string) => void;
  unsubscribeFromCategory: (userId: string, categoryId: string) => void;
  getCategoryById: (categoryId: string) => ResourceCategory | undefined;
  getResourceItemById: (itemId: string) => Promise<ResourceItem | undefined>;
  getResourceItemsByCategory: (categoryId: string, parentId?: string | null) => ResourceItem[];
  addCategory: (category: Omit<ResourceCategory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategory: (id: string, updates: Partial<ResourceCategory>) => void;
  deleteCategory: (id: string) => void;
  addResourceItem: (item: Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateResourceItem: (id: string, updates: Partial<ResourceItem>) => void;
  deleteResourceItem: (id: string) => void;
  getCategoryMembers: (categoryId: string) => Promise<any[]>;
  addCategoryMember: (member: { userId: string; categoryId: string; role: string; }) => Promise<string>;
  updateCategoryMember: (id: string, updates: { role: string; }) => Promise<void>;
  deleteCategoryMember: (id: string) => Promise<void>;
  isUserCategoryResponsible: (userId: string, categoryId: string) => boolean;
  initializeDefaultCategories: () => void;
}

// Default categories with exact Supabase IDs
const DEFAULT_CATEGORIES: ResourceCategory[] = [
  { 
    id: 'd4edecc8-a4ba-4116-bd0c-16dd3d633cab',
    name: 'Administration', 
    description: 'Documents administratifs et procès-verbaux', 
    icon: '📋', 
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: '49f3741e-ecf6-4854-bbb5-751f8e8b742d',
    name: 'Ressource Humaine', 
    description: 'Gestion du personnel, recrutement et formation', 
    icon: '👥', 
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    name: 'Immersion & Interaction', 
    description: 'Expériences immersives et interactions avec le public', 
    icon: '🌀', 
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'a8b7c6d5-e4f3-2g1h-i0j9-k8l7m6n5o4p3',
    name: 'Marketing, Sponsorings & Partenaire', 
    description: 'Stratégies marketing, sponsors et partenariats', 
    icon: '🤝', 
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
    name: 'Réalisation & Production', 
    description: 'Mise en scène, production et réalisation', 
    icon: '🎬', 
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8',
    name: 'Conception décoration', 
    description: 'Design et décoration des espaces', 
    icon: '🎨', 
    order: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9',
    name: 'Conception Artistique', 
    description: 'Direction artistique et conception créative', 
    icon: '🖌️', 
    order: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0',
    name: 'Casting & Direction des comédiens', 
    description: 'Sélection et direction des acteurs et comédiens', 
    icon: '🎭', 
    order: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'f6g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1',
    name: 'Logistique & Technique', 
    description: 'Gestion logistique et support technique', 
    icon: '🔧', 
    order: 9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const useResourcesStore = create<ResourcesState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      resourceItems: [],
      subscriptions: {},
      isLoading: false,
      error: null,

      initializeDefaultCategories: () => {
        set(state => ({
          ...state,
          categories: DEFAULT_CATEGORIES
        }));
      },

      getVisibleCategories: () => {
        return get().categories;
      },

      getUserSubscriptions: (userId: string) => {
        try {
          return get().subscriptions[userId] || [];
        } catch (error) {
          console.error('Error getting user subscriptions:', error);
          return [];
        }
      },

      isUserSubscribed: (userId: string, categoryId: string) => {
        try {
          const userSubs = get().subscriptions[userId] || [];
          return userSubs.includes(categoryId);
        } catch (error) {
          console.error('Error checking user subscription:', error);
          return false;
        }
      },

      subscribeToCategory: (userId: string, categoryId: string) => {
        try {
          set(state => {
            const userSubs = state.subscriptions[userId] || [];
            if (!userSubs.includes(categoryId)) {
              return {
                subscriptions: {
                  ...state.subscriptions,
                  [userId]: [...userSubs, categoryId]
                }
              };
            }
            return state;
          });
        } catch (error) {
          console.error('Error subscribing to category:', error);
        }
      },

      unsubscribeFromCategory: (userId: string, categoryId: string) => {
        try {
          set(state => {
            const userSubs = state.subscriptions[userId] || [];
            return {
              subscriptions: {
                ...state.subscriptions,
                [userId]: userSubs.filter(id => id !== categoryId)
              }
            };
          });
        } catch (error) {
          console.error('Error unsubscribing from category:', error);
        }
      },

      getCategoryById: (categoryId: string) => {
        try {
          return get().categories.find(cat => cat.id === categoryId);
        } catch (error) {
          console.error('Error getting category by ID:', error);
          return undefined;
        }
      },

      getResourceItemById: async (itemId: string) => {
        try {
          return get().resourceItems.find(item => item.id === itemId);
        } catch (error) {
          console.error('Error getting resource item:', error);
          return undefined;
        }
      },

      getResourceItemsByCategory: (categoryId: string, parentId: string | null = null) => {
        try {
          return get().resourceItems.filter(
            item => item.categoryId === categoryId && item.parentId === parentId
          );
        } catch (error) {
          console.error('Error getting resource items by category:', error);
          return [];
        }
      },

      addCategory: (category) => {
        try {
          const newCategory: ResourceCategory = {
            ...category,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set(state => ({
            categories: [...state.categories, newCategory]
          }));
        } catch (error) {
          console.error('Error adding category:', error);
        }
      },

      updateCategory: (id, updates) => {
        try {
          set(state => ({
            categories: state.categories.map(category =>
              category.id === id
                ? { ...category, ...updates, updatedAt: new Date().toISOString() }
                : category
            )
          }));
        } catch (error) {
          console.error('Error updating category:', error);
        }
      },

      deleteCategory: (id) => {
        try {
          set(state => ({
            categories: state.categories.filter(category => category.id !== id),
            // Also delete all resource items in this category
            resourceItems: state.resourceItems.filter(item => item.categoryId !== id)
          }));
        } catch (error) {
          console.error('Error deleting category:', error);
        }
      },

      addResourceItem: (item) => {
        try {
          const newItemId = uuidv4();
          const newItem: ResourceItem = {
            ...item,
            id: newItemId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set(state => ({
            resourceItems: [...state.resourceItems, newItem]
          }));
          
          return newItemId;
        } catch (error) {
          console.error('Error adding resource item:', error);
          return '';
        }
      },

      updateResourceItem: (id, updates) => {
        try {
          set(state => ({
            resourceItems: state.resourceItems.map(item =>
              item.id === id
                ? { ...item, ...updates, updatedAt: new Date().toISOString() }
                : item
            )
          }));
        } catch (error) {
          console.error('Error updating resource item:', error);
        }
      },

      deleteResourceItem: (id) => {
        try {
          // First, get the item to check if it's a folder
          const itemToDelete = get().resourceItems.find(item => item.id === id);
          
          if (itemToDelete && itemToDelete.type === 'folder') {
            // If it's a folder, also delete all items inside it (recursive)
            const deleteItemsRecursively = (parentId: string) => {
              // Get all direct children
              const children = get().resourceItems.filter(item => item.parentId === parentId);
              
              // For each child folder, delete its contents recursively
              children.forEach(child => {
                if (child.type === 'folder') {
                  deleteItemsRecursively(child.id);
                }
              });
              
              // Delete all children
              set(state => ({
                resourceItems: state.resourceItems.filter(item => item.parentId !== parentId)
              }));
            };
            
            // Start recursive deletion
            deleteItemsRecursively(id);
          }
          
          // Delete the item itself
          set(state => ({
            resourceItems: state.resourceItems.filter(item => item.id !== id)
          }));
        } catch (error) {
          console.error('Error deleting resource item:', error);
        }
      },

      getCategoryMembers: async (categoryId: string) => {
        try {
          return [];
        } catch (error) {
          console.error('Error getting category members:', error);
          return [];
        }
      },

      addCategoryMember: async (member) => {
        try {
          return "member-id";
        } catch (error) {
          console.error('Error adding category member:', error);
          throw error;
        }
      },

      updateCategoryMember: async (id, updates) => {
        try {
          // Implementation will be added when we add Supabase
        } catch (error) {
          console.error('Error updating category member:', error);
          throw error;
        }
      },

      deleteCategoryMember: async (id) => {
        try {
          // Implementation will be added when we add Supabase
        } catch (error) {
          console.error('Error deleting category member:', error);
          throw error;
        }
      },

      isUserCategoryResponsible: (userId: string, categoryId: string) => {
        try {
          const category = get().getCategoryById(categoryId);
          return category?.responsibleId === userId;
        } catch (error) {
          console.error('Error checking if user is category responsible:', error);
          return false;
        }
      }
    }),
    {
      name: 'resources-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
