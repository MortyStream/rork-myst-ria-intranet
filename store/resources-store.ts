import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceCategory, ResourceItem, ResourceItemType } from '@/types/resource';

interface ResourcesState {
  categories: ResourceCategory[];
  resourceItems: ResourceItem[];
  isLoading: boolean;
  error: string | null;
  
  // Category actions
  addCategory: (category: Omit<ResourceCategory, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<ResourceCategory>) => void;
  deleteCategory: (id: string) => void;
  getCategoryById: (id: string) => ResourceCategory | undefined;
  getVisibleCategories: () => Promise<ResourceCategory[]>;
  
  // Resource item actions
  addResourceItem: (item: Omit<ResourceItem, 'id'>) => void;
  updateResourceItem: (id: string, updates: Partial<ResourceItem>) => void;
  deleteResourceItem: (id: string) => void;
  getResourceItemById: (id: string) => ResourceItem | undefined;
  getResourceItemsByCategory: (categoryId: string, parentId?: string | null) => ResourceItem[];
  
  // User subscription actions
  subscribeToCategory: (userId: string, categoryId: string) => void;
  unsubscribeFromCategory: (userId: string, categoryId: string) => void;
  isUserSubscribed: (userId: string, categoryId: string) => boolean;
  isUserCategoryResponsible: (userId: string, categoryId: string) => boolean;
  
  // Initialization
  initializeCategories: () => void;
}

const defaultCategories: ResourceCategory[] = [
  {
    id: '1',
    name: 'Administration',
    icon: '📋',
    description: 'Documents administratifs et procédures',
    visible: true,
    order: 1,
    responsibleUsers: [],
    subscribedUsers: [],
  },
  {
    id: '2',
    name: 'Ressource Humaine',
    icon: '👥',
    description: 'Gestion des ressources humaines',
    visible: true,
    order: 2,
    responsibleUsers: [],
    subscribedUsers: [],
  },
  {
    id: '3',
    name: 'Immersion & Interaction',
    icon: '🎭',
    description: 'Techniques d\'immersion et d\'interaction',
    visible: true,
    order: 3,
    responsibleUsers: [],
    subscribedUsers: [],
  },
  {
    id: '4',
    name: 'Marketing, Sponsorings & Partenaire',
    icon: '📢',
    description: 'Marketing, sponsoring et partenariats',
    visible: true,
    order: 4,
    responsibleUsers: [],
    subscribedUsers: [],
  },
  {
    id: '5',
    name: 'Réalisation & Production',
    icon: '🎬',
    description: 'Réalisation et production',
    visible: true,
    order: 5,
    responsibleUsers: [],
    subscribedUsers: [],
  },
  {
    id: '6',
    name: 'Conception décoration',
    icon: '🎨',
    description: 'Conception et décoration',
    visible: true,
    order: 6,
    responsibleUsers: [],
    subscribedUsers: [],
  },
  {
    id: '7',
    name: 'Conception Artistique',
    icon: '🎪',
    description: 'Conception artistique',
    visible: true,
    order: 7,
    responsibleUsers: [],
    subscribedUsers: [],
  },
  {
    id: '8',
    name: 'Carting & Direction des comédiens',
    icon: '🎯',
    description: 'Casting et direction des comédiens',
    visible: true,
    order: 8,
    responsibleUsers: [],
    subscribedUsers: [],
  },
  {
    id: '9',
    name: 'Logistique & Technique',
    icon: '⚙️',
    description: 'Logistique et technique',
    visible: true,
    order: 9,
    responsibleUsers: [],
    subscribedUsers: [],
  },
];

export const useResourcesStore = create<ResourcesState>()(
  persist(
    (set, get) => ({
      categories: [],
      resourceItems: [],
      isLoading: false,
      error: null,

      // Category actions
      addCategory: (category) => {
        const newCategory: ResourceCategory = {
          ...category,
          id: Date.now().toString(),
        };
        set((state) => ({
          categories: [...state.categories, newCategory],
        }));
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === id ? { ...category, ...updates } : category
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id),
          resourceItems: state.resourceItems.filter((item) => item.categoryId !== id),
        }));
      },

      getCategoryById: (id) => {
        return get().categories.find((category) => category.id === id);
      },

      getVisibleCategories: async () => {
        const { categories } = get();
        return categories
          .filter((category) => category.visible)
          .sort((a, b) => a.order - b.order);
      },

      // Resource item actions
      addResourceItem: (item) => {
        const newItem: ResourceItem = {
          ...item,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          resourceItems: [...state.resourceItems, newItem],
        }));
      },

      updateResourceItem: (id, updates) => {
        set((state) => ({
          resourceItems: state.resourceItems.map((item) =>
            item.id === id 
              ? { ...item, ...updates, updatedAt: new Date().toISOString() } 
              : item
          ),
        }));
      },

      deleteResourceItem: (id) => {
        const { resourceItems } = get();
        const itemToDelete = resourceItems.find(item => item.id === id);
        
        if (itemToDelete?.type === 'folder') {
          // Delete all items in this folder recursively
          const deleteItemsInFolder = (folderId: string) => {
            const itemsInFolder = resourceItems.filter(item => item.parentId === folderId);
            itemsInFolder.forEach(item => {
              if (item.type === 'folder') {
                deleteItemsInFolder(item.id);
              }
            });
          };
          deleteItemsInFolder(id);
        }
        
        set((state) => ({
          resourceItems: state.resourceItems.filter((item) => 
            item.id !== id && item.parentId !== id
          ),
        }));
      },

      getResourceItemById: (id) => {
        return get().resourceItems.find((item) => item.id === id);
      },

      getResourceItemsByCategory: (categoryId, parentId = null) => {
        const { resourceItems } = get();
        return resourceItems
          .filter((item) => 
            item.categoryId === categoryId && 
            item.parentId === parentId
          )
          .sort((a, b) => {
            // Folders first, then by title
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.title.localeCompare(b.title);
          });
      },

      // User subscription actions
      subscribeToCategory: (userId, categoryId) => {
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === categoryId
              ? {
                  ...category,
                  subscribedUsers: category.subscribedUsers.includes(userId)
                    ? category.subscribedUsers
                    : [...category.subscribedUsers, userId],
                }
              : category
          ),
        }));
      },

      unsubscribeFromCategory: (userId, categoryId) => {
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === categoryId
              ? {
                  ...category,
                  subscribedUsers: category.subscribedUsers.filter((id) => id !== userId),
                }
              : category
          ),
        }));
      },

      isUserSubscribed: (userId, categoryId) => {
        const category = get().getCategoryById(categoryId);
        return category?.subscribedUsers.includes(userId) || false;
      },

      isUserCategoryResponsible: (userId, categoryId) => {
        const category = get().getCategoryById(categoryId);
        return category?.responsibleUsers.includes(userId) || false;
      },

      // Initialization
      initializeCategories: () => {
        const { categories } = get();
        if (categories.length === 0) {
          set({ categories: defaultCategories });
        }
      },
    }),
    {
      name: 'resources-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        categories: state.categories,
        resourceItems: state.resourceItems,
      }),
    }
  )
);