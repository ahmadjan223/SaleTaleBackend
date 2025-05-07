const mongoose = require('mongoose');
const Sale = require('./models/sale.model');
const Salesman = require('./models/salesman.model');
require('dotenv').config();


const MONGODB_URI = process.env.MONGODB_URI;

console.log('Connecting to DB...');
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('MongoDB connection error:', err));

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.once('open', async () => {
  console.log('::[STARTED] Migrating addedBy field in sales...');

  try {
    const sales = await Sale.find();
    let convertedCount = 0;

    for (const sale of sales) {
      const addedByType = typeof sale.addedBy;
      const saleId = sale._id.toString();

      console.log(`fetched ID: [${saleId}] type: ${addedByType}`);

      if (addedByType === 'object') {
        console.log('::ignored');
        continue;
      }

      if (addedByType === 'undefined') {
        console.log('::converting...');
        const salesman = await Salesman.findOne({ googleId: sale.addedBy });

        if (!salesman) {
          console.log(`::no match found in Salesman for googleId: ${sale.addedBy}`);
          continue;
        }

        sale.addedBy = salesman._id;
        await sale.save();
        console.log('::converted');
        convertedCount++;
      }
    }

    console.log(`::[DONE] Total converted: ${convertedCount}`);
  } catch (err) {
    console.error('::[ERROR]', err.message);
  } finally {
    mongoose.disconnect();
  }
});
