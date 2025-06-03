// Update the back navigation in UserProfileScreen
// Inside the component, update the Header component:

<Header
  title="Profil"
  showBackButton={true}
  onBackPress={() => {
    // Get the previous route from navigation state
    const segments = router.pathname.split('/');
    if (segments.includes('directory')) {
      router.push('/directory');
    } else {
      router.back();
    }
  }}
  // ... rest of the header props
/>