require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const Salesman = require('./models/Salesman');
const Customer = require('./models/Customer');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/distribution')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get all orders without salesmanId
    const orders = await Order.find({ salesmanId: { $exists: false } })
      .populate('customerId', 'territory')
      .populate('createdBy', 'name');
    
    if (orders.length === 0) {
      console.log('All orders already have salesmen assigned');
      process.exit(0);
    }
    
    console.log(`Found ${orders.length} orders without salesmen:`);
    orders.forEach(o => {
      console.log(`- Order ${o._id}: Customer territory = ${o.customerId?.territory || 'None'}, Created by = ${o.createdBy?.name || 'Unknown'}`);
    });
    
    // Get all salesmen
    const salesmen = await Salesman.find().populate('userId', 'name');
    console.log(`\nAvailable salesmen:`);
    salesmen.forEach(s => {
      console.log(`- ${s.userId?.name || 'Unknown'}: Territory = ${s.territory}`);
    });
    
    // Assign salesmen based on territory
    for (const order of orders) {
      const customerTerritory = order.customerId?.territory;
      const salesman = salesmen.find(s => s.territory === customerTerritory);
      
      if (salesman) {
        order.salesmanId = salesman._id;
        await order.save();
        console.log(`Assigned order ${order._id} to salesman ${salesman.userId?.name} (territory: ${customerTerritory})`);
      } else {
        console.log(`No salesman found for territory: ${customerTerritory} (order: ${order._id})`);
      }
    }
    
    console.log('\nSalesman assignment completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  }); 