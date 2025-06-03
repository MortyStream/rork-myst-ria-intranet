// Previous content remains the same, just update the navigateTo function

const navigateTo = (path: string) => {
  // Keep the current path segments to maintain tab context
  const segments = router.pathname.split('/');
  const currentTab = segments[1]; // Get the current tab name
  
  // If navigating to a different tab, use the new path
  if (path.startsWith('/home') || 
      path.startsWith('/directory') || 
      path.startsWith('/resources') || 
      path.startsWith('/calendar') || 
      path.startsWith('/tasks') || 
      path.startsWith('/notifications') || 
      path.startsWith('/settings')) {
    router.push(path);
  } else {
    // For other routes, maintain the current tab context
    router.push(path);
  }
  
  if (onClose) onClose();
};