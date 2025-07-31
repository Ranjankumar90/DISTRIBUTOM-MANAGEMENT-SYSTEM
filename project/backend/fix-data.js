require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./models/Customer');
const Order = require('./models/Order');
const Salesman = require('./models/Salesman');
const User = require('./models/User');
const Product = require('./models/product');
const Company = require('./models/Company');

// Use the same connection string as the server
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/distribution';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    try {
      // Step 1: Assign territories to customers
      console.log('\n🔧 Step 1: Assigning territories to customers...');
      const customers = await Customer.find({ territory: { $exists: false } }).populate('userId', 'name');
      
      if (customers.length === 0) {
        console.log('✅ All customers already have territories assigned');
      } else {
        console.log(`📋 Found ${customers.length} customers without territories:`);
        customers.forEach(c => {
          console.log(`   - ${c.userId?.name || 'Unknown'}`);
        });
        
        // Assign territories
        const territories = ['chhauradano', 'other_territory'];
        
        for (let i = 0; i < customers.length; i++) {
          const customer = customers[i];
          const territory = territories[i % territories.length];
          
          customer.territory = territory;
          await customer.save();
          console.log(`✅ Assigned ${customer.userId?.name || 'Unknown'} to territory: ${territory}`);
        }
        
        console.log('✅ Territory assignment completed!');
      }
      
      // Step 2: Assign salesmen to orders
      console.log('\n🔧 Step 2: Assigning salesmen to orders...');
      const orders = await Order.find({ salesmanId: { $exists: false } })
        .populate('customerId', 'territory')
        .populate('createdBy', 'name');
      
      if (orders.length === 0) {
        console.log('✅ All orders already have salesmen assigned');
      } else {
        console.log(`📋 Found ${orders.length} orders without salesmen:`);
        orders.forEach(o => {
          console.log(`   - Order ${o._id}: Customer territory = ${o.customerId?.territory || 'None'}, Created by = ${o.createdBy?.name || 'Unknown'}`);
        });
        
        // Get all salesmen
        const salesmen = await Salesman.find().populate('userId', 'name');
        console.log(`\n👥 Available salesmen:`);
        salesmen.forEach(s => {
          console.log(`   - ${s.userId?.name || 'Unknown'}: Territory = ${s.territory}`);
        });
        
        // Assign salesmen based on territory
        for (const order of orders) {
          const customerTerritory = order.customerId?.territory;
          const salesman = salesmen.find(s => s.territory === customerTerritory);
          
          if (salesman) {
            order.salesmanId = salesman._id;
            await order.save();
            console.log(`✅ Assigned order ${order._id} to salesman ${salesman.userId?.name} (territory: ${customerTerritory})`);
          } else {
            console.log(`❌ No salesman found for territory: ${customerTerritory} (order: ${order._id})`);
          }
        }
        
        console.log('✅ Salesman assignment completed!');
      }
      
      // Step 3: Show summary
      console.log('\n📊 Summary:');
      const totalCustomers = await Customer.countDocuments();
      const customersWithTerritory = await Customer.countDocuments({ territory: { $exists: true } });
      const totalOrders = await Order.countDocuments();
      const ordersWithSalesman = await Order.countDocuments({ salesmanId: { $exists: true } });
      
      console.log(`   - Customers: ${customersWithTerritory}/${totalCustomers} have territories`);
      console.log(`   - Orders: ${ordersWithSalesman}/${totalOrders} have salesmen assigned`);
      
      console.log('\n🎉 Data fix completed! The salesman dashboard should now show proper data.');
      
    } catch (error) {
      console.error('❌ Error during data fix:', error);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }); 