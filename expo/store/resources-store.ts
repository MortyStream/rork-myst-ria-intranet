import { getSupabase } from '@/utils/supabase';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceCategory, ResourceItem, ExternalLink } from '@/types/resource';
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
  externalLinks: ExternalLink[];
  subscriptions: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  initializeExternalLinks: () => Promise<void>;
  addExternalLink: (link: Omit<ExternalLink, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExternalLink: (id: string, updates: Partial<ExternalLink>) => Promise<void>;
  deleteExternalLink: (id: string) => Promise<void>;
  getExternalLinkById: (id: string) => ExternalLink | undefined;
  getVisibleCategories: () => ResourceCategory[];
  getUserSubscriptions: (userId: string) => string[];
  isUserSubscribed: (userId: string, categoryId: string) => boolean;
  subscribeToCategory: (userId: string, categoryId: string) => void;
  unsubscribeFromCategory: (userId: string, categoryId: string) => void;
  getCategoryById: (categoryId: string) => ResourceCategory | undefined;
  getResourceItemById: (itemId: string) => Promise<ResourceItem | undefined>;
  getResourceItemsByCategory: (categoryId: string, parentId?: string | null) => ResourceItem[];
  addCategory: (category: Omit<ResourceCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<ResourceCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addResourceItem: (item: Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateResourceItem: (id: string, updates: Partial<ResourceItem>) => Promise<void>;
  deleteResourceItem: (id: string) => Promise<void>;
  getCategoryMembers: (categoryId: string) => Promise<any[]>;
  addCategoryMember: (member: { userId: string; categoryId: string; role: string; }) => Promise<string>;
  updateCategoryMember: (id: string, updates: { role: string; }) => Promise<void>;
  deleteCategoryMember: (id: string) => Promise<void>;
  isUserCategoryResponsible: (userId: string, categoryId: string) => boolean;
  initializeDefaultCategories: () => void;
}

export const useResourcesStore = create<ResourcesState>()(
  persist(
    (set, get) => ({
      categories: [],
      resourceItems: [],
      externalLinks: [],
      subscriptions: {},
      isLoading: false,
      error: null,

      initializeExternalLinks: async () => {
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('external_links')
            .select('*')
            .order('createdAt', { ascending: true });
          if (error) throw error;
          set({ externalLinks: data ?? [] });
        } catch (error) {
          console.log('Erreur chargement liens:', error);
        }
      },

      addExternalLink: async (linkData) => {
        const supabase = getSupabase();
        const now = new Date().toISOString();
        const newLink = { ...linkData, id: uuidv4(), createdAt: now, updatedAt: now };
        // Insert d'abord dans Supabase — si ça échoue, on ne met pas à jour le store
        const { data, error } = await supabase
          .from('external_links')
          .insert(newLink)
          .select()
          .single();
        if (error) throw error;
        set(state => ({ externalLinks: [...state.externalLinks, data] }));
      },

      updateExternalLink: async (id, updates) => {
        const now = new Date().toISOString();
        set(state => ({
          externalLinks: state.externalLinks.map(l =>
            l.id === id ? { ...l, ...updates, updatedAt: now } : l
          ),
        }));
        try {
          await getSupabase()
            .from('external_links')
            .update({ ...updates, updatedAt: now })
            .eq('id', id);
        } catch (error) {
          console.log('Erreur update lien Supabase:', error);
        }
      },

      deleteExternalLink: async (id) => {
        set(state => ({ externalLinks: state.externalLinks.filter(l => l.id !== id) }));
        try {
          await getSupabase().from('external_links').delete().eq('id', id);
        } catch (error) {
          console.log('Erreur suppression lien Supabase:', error);
        }
      },

      getExternalLinkById: (id) => get().externalLinks.find(l => l.id === id),

      initializeDefaultCategories: async () => {
        set({ isLoading: true, error: null });
        try {
          const categories = await fetchCategoriesFromSupabase();
          const resourceItems = await fetchResourceItemsFromSupabase();
          if (categories.length > 0) {
            set({ categories, resourceItems, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.log('Erreur chargement ressources:', error);
          set({ isLoading: false });
        }
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

      addCategory: async (category) => {
        try {
          const now = new Date().toISOString();
          const newCategory: ResourceCategory = {
            ...category,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
          };
          const supabase = getSupabase();
          const { error } = await supabase
            .from('resource_categories')
            .insert(newCategory);
          if (error) {
            console.error('addCategory Supabase error:', error);
            return;
          }
          set(state => ({
            categories: [...state.categories, newCategory]
          }));
        } catch (error) {
          console.error('Error adding category:', error);
        }
      },

      updateCategory: async (id, updates) => {
        try {
          const now = new Date().toISOString();
          const supabase = getSupabase();
          const { error } = await supabase
            .from('resource_categories')
            .update({ ...updates, updatedAt: now })
            .eq('id', id);
          if (error) {
            console.error('updateCategory Supabase error:', error);
            return;
          }
          set(state => ({
            categories: state.categories.map(category =>
              category.id === id
                ? { ...category, ...updates, updatedAt: now }
                : category
            )
          }));
        } catch (error) {
          console.error('Error updating category:', error);
        }
      },

      deleteCategory: async (id) => {
        try {
          const supabase = getSupabase();
          const { error: err1 } = await supabase
            .from('resource_items')
            .delete()
            .eq('categoryId', id);
          if (err1) console.error('deleteCategory items Supabase error:', err1);
          const { error: err2 } = await supabase
            .from('resource_categories')
            .delete()
            .eq('id', id);
          if (err2) {
            console.error('deleteCategory Supabase error:', err2);
            return;
          }
          set(state => ({
            categories: state.categories.filter(category => category.id !== id),
            resourceItems: state.resourceItems.filter(item => item.categoryId !== id)
          }));
        } catch (error) {
          console.error('Error deleting category:', error);
        }
      },

      addResourceItem: async (item) => {
        try {
          const now = new Date().toISOString();
          const newItemId = uuidv4();
          const newItem: ResourceItem = {
            ...item,
            id: newItemId,
            createdAt: now,
            updatedAt: now,
          };
          const supabase = getSupabase();
          const { error } = await supabase
            .from('resource_items')
            .insert(newItem);
          if (error) {
            console.error('addResourceItem Supabase error:', error);
            return '';
          }
          set(state => ({
            resourceItems: [...state.resourceItems, newItem]
          }));
          return newItemId;
        } catch (error) {
          console.error('Error adding resource item:', error);
          return '';
        }
      },

      updateResourceItem: async (id, updates) => {
        try {
          const now = new Date().toISOString();
          const supabase = getSupabase();
          const { error } = await supabase
            .from('resource_items')
            .update({ ...updates, updatedAt: now })
            .eq('id', id);
          if (error) {
            console.error('updateResourceItem Supabase error:', error);
            return;
          }
          set(state => ({
            resourceItems: state.resourceItems.map(item =>
              item.id === id
                ? { ...item, ...updates, updatedAt: now }
                : item
            )
          }));
        } catch (error) {
          console.error('Error updating resource item:', error);
        }
      },

      deleteResourceItem: async (id) => {
        try {
          const supabase = getSupabase();
          const itemToDelete = get().resourceItems.find(item => item.id === id);
          const idsToDelete: string[] = [id];

          if (itemToDelete && itemToDelete.type === 'folder') {
            const collectDescendants = (parentId: string) => {
              const children = get().resourceItems.filter(item => item.parentId === parentId);
              children.forEach(child => {
                idsToDelete.push(child.id);
                if (child.type === 'folder') collectDescendants(child.id);
              });
            };
            collectDescendants(id);
          }

          const { error } = await supabase
            .from('resource_items')
            .delete()
            .in('id', idsToDelete);
          if (error) {
            console.error('deleteResourceItem Supabase error:', error);
            return;
          }
          set(state => ({
            resourceItems: state.resourceItems.filter(item => !idsToDelete.includes(item.id))
          }));
        } catch (error) {
          console.error('Error deleting resource item:', error);
        }
      },

      getCategoryMembers: async (categoryId: string) => {
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('category_members')
            .select('*')
            .eq('categoryId', categoryId);
          if (error) {
            console.error('getCategoryMembers Supabase error:', error);
            return [];
          }
          return data ?? [];
        } catch (error) {
          console.error('Error getting category members:', error);
          return [];
        }
      },

      addCategoryMember: async (member) => {
        try {
          const id = uuidv4();
          const now = new Date().toISOString();
          const supabase = getSupabase();
          const { error } = await supabase
            .from('category_members')
            .insert({ id, ...member, createdAt: now, updatedAt: now });
          if (error) {
            console.error('addCategoryMember Supabase error:', error);
            throw error;
          }
          return id;
        } catch (error) {
          console.error('Error adding category member:', error);
          throw error;
        }
      },

      updateCategoryMember: async (id, updates) => {
        try {
          const supabase = getSupabase();
          const { error } = await supabase
            .from('category_members')
            .update({ ...updates, updatedAt: new Date().toISOString() })
            .eq('id', id);
          if (error) {
            console.error('updateCategoryMember Supabase error:', error);
            throw error;
          }
        } catch (error) {
          console.error('Error updating category member:', error);
          throw error;
        }
      },

      deleteCategoryMember: async (id) => {
        try {
          const supabase = getSupabase();
          const { error } = await supabase
            .from('category_members')
            .delete()
            .eq('id', id);
          if (error) {
            console.error('deleteCategoryMember Supabase error:', error);
            throw error;
          }
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
      name: 'resources-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        subscriptions: state.subscriptions,
        externalLinks: state.externalLinks,
      }),
    }
  )
);
