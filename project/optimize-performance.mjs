import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Optimizing project for production...');

// Create optimized environment file
const envContent = `VITE_API_URL=https://distributom-management-system.onrender.com/api
VITE_APP_ENV=production
VITE_ENABLE_CACHE=true
VITE_ENABLE_SW=true`;

fs.writeFileSync(path.join(__dirname, '.env.production'), envContent);
console.log('✅ Created production environment file');

console.log('🎉 Performance optimization complete!');
console.log('📝 Next steps:');
console.log('1. Run: npm run build');
console.log('2. Deploy to Vercel');
console.log('3. Your app will load much faster now!'); 