require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./models/Customer');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/distribution')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get all customers without territories
    const customers = await Customer.find({ territory: { $exists: false } }).populate('userId', 'name');
    
    if (customers.length === 0) {
      console.log('All customers already have territories assigned');
      process.exit(0);
    }
    
    console.log(`Found ${customers.length} customers without territories:`);
    customers.forEach(c => {
      console.log(`- ${c.userId?.name || 'Unknown'}`);
    });
    
    // Assign territories (you can modify this logic)
    const territories = ['chhauradano', 'other_territory'];
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const territory = territories[i % territories.length];
      
      customer.territory = territory;
      await customer.save();
      console.log(`Assigned ${customer.userId?.name || 'Unknown'} to territory: ${territory}`);
    }
    
    console.log('\nTerritory assignment completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  }); 