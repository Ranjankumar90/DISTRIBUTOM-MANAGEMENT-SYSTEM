import { healthAPI } from '../services/api';

export const debugBackendConnection = async () => {
  try {
    console.log('🔍 Testing backend connectivity...');
    const startTime = Date.now();
    
    const response = await healthAPI.check();
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('✅ Backend is accessible');
    console.log(`⏱️ Response time: ${responseTime}ms`);
    console.log('📊 Backend status:', response);
    
    return {
      success: true,
      responseTime,
      data: response
    };
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const clearAllCaches = () => {
  // Clear localStorage
  localStorage.clear();
  console.log('🗑️ Cleared localStorage');
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('🗑️ Cleared sessionStorage');
  
  // Reload the page to clear all caches
  window.location.reload();
};

export const getSystemInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    timestamp: new Date().toISOString()
  };
}; 