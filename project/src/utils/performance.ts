export const performanceMonitor = {
  startTime: 0,
  
  start: (operation: string) => {
    performanceMonitor.startTime = Date.now();
    console.log(`🚀 Starting: ${operation}`);
  },
  
  end: (operation: string) => {
    const endTime = Date.now();
    const duration = endTime - performanceMonitor.startTime;
    console.log(`✅ Completed: ${operation} in ${duration}ms`);
    return duration;
  },
  
  log: (message: string, data?: any) => {
    console.log(`📊 ${message}`, data);
  }
};

export const measureDashboardLoad = async (dashboardType: string, loadFunction: () => Promise<any>) => {
  performanceMonitor.start(`${dashboardType} Dashboard Load`);
  
  try {
    const result = await loadFunction();
    const duration = performanceMonitor.end(`${dashboardType} Dashboard Load`);
    
    if (duration > 5000) {
      console.warn(`⚠️ Slow dashboard load: ${dashboardType} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    performanceMonitor.end(`${dashboardType} Dashboard Load (Failed)`);
    throw error;
  }
}; 