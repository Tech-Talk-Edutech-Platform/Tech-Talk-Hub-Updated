export const enableNotifications = async () => {
  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    // Register the service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered');
    
    // In a full setup, you would grab the 'subscription' object here 
    // and save it to your Supabase 'profiles' table.
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'PUBLIC_VAPID_KEY'
    });
    
    return subscription;
  }
};