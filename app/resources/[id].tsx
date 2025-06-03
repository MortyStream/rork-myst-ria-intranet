// Update the back navigation in ResourceCategoryScreen
// Inside the component, update the navigateBack function:

const navigateBack = () => {
  if (folderPath.length > 0) {
    const newPath = [...folderPath];
    const lastFolder = newPath.pop();
    setFolderPath(newPath);
    setCurrentFolder(lastFolder?.id || null);
  } else {
    router.push('/resources');
  }
};