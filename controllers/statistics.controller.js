const Sale = require('../models/sale.model');

exports.getSalesStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    
    if (startDate && endDate) {
      if (startDate === endDate) {
        // If both dates are the same, add 24 hours to endDate
        const start = new Date(startDate + 'T00:00:00.000Z');
        const end = new Date(startDate + 'T23:59:59.999Z');
        match.createdAt = { $gte: start, $lte: end };
      } else {
        // Different dates
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }
    } else if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    console.log('Filtering sales with createdAt:', match.createdAt);

    const pipeline = [
      { $match: match },
      // Join with Salesman
      {
        $lookup: {
          from: 'salesmen',
          localField: 'addedBy',
          foreignField: '_id',
          as: 'salesman'
        }
      },
      { $unwind: '$salesman' },
      // Join with Franchise
      {
        $lookup: {
          from: 'franchises',
          localField: 'salesman.franchise',
          foreignField: '_id',
          as: 'franchise'
        }
      },
      { $unwind: '$franchise' },
      // Convert products map to array and add sale ID
      {
        $project: {
          _id: 1,
          amount: 1,
          franchiseName: '$franchise.name',
          productsArray: { $objectToArray: '$products' }
        }
      },
      { $unwind: '$productsArray' },
      // Group for product-wise stats (global)
      {
        $group: {
          _id: {
            product: '$productsArray.k',
            franchise: '$franchiseName',
            saleId: '$_id'
          },
          productQuantity: { $sum: '$productsArray.v.quantity' },
          productSales: { $sum: '$productsArray.v.total' },
          franchiseSales: { $sum: '$amount' }
        }
      },
      // Group by product and franchise to get counts
      {
        $group: {
          _id: {
            product: '$_id.product',
            franchise: '$_id.franchise'
          },
          productQuantity: { $sum: '$productQuantity' },
          productSales: { $sum: '$productSales' },
          franchiseSales: { $first: '$franchiseSales' },
          count: { $count: {} }  // Count unique sales containing this product
        }
      },
      // Group for franchise-wise stats
      {
        $group: {
          _id: '$_id.franchise',
          totalSaleAmount: { $first: '$franchiseSales' },
          productwiseSales: {
            $push: {
              product: '$_id.product',
              quantity: '$productQuantity',
              salesAmount: '$productSales',
              count: '$count'
            }
          }
        }
      }
    ];

    // For global product stats and total sales count
    const productPipeline = [
      { $match: match },
      {
        $facet: {
          products: [
            {
              $project: {
                _id: 1,
                productsArray: { $objectToArray: '$products' }
              }
            },
            { $unwind: '$productsArray' },
            {
              $group: {
                _id: {
                  product: '$productsArray.k',
                  saleId: '$_id'
                },
                quantity: { $sum: '$productsArray.v.quantity' },
                salesAmount: { $sum: '$productsArray.v.total' }
              }
            },
            {
              $group: {
                _id: '$_id.product',
                quantity: { $sum: '$quantity' },
                salesAmount: { $sum: '$salesAmount' },
                count: { $count: {} }  // Count unique sales containing this product
              }
            }
          ],
          totalCount: [
            {
              $count: 'count'  // Count total unique sales
            }
          ]
        }
      }
    ];

    const [mainStats, productStats] = await Promise.all([
      Sale.aggregate(pipeline),
      Sale.aggregate(productPipeline)
    ]);

    // Calculate franchise total counts
    const franchiseCounts = await Sale.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'salesmen',
          localField: 'addedBy',
          foreignField: '_id',
          as: 'salesman'
        }
      },
      { $unwind: '$salesman' },
      {
        $lookup: {
          from: 'franchises',
          localField: 'salesman.franchise',
          foreignField: '_id',
          as: 'franchise'
        }
      },
      { $unwind: '$franchise' },
      {
        $group: {
          _id: '$franchise.name',
          count: { $count: {} }
        }
      }
    ]);

    const franchiseCountMap = franchiseCounts.reduce((acc, f) => {
      acc[f._id] = f.count;
      return acc;
    }, {});

    const response = {
      totalAmount: mainStats.reduce((sum, f) => sum + f.totalSaleAmount, 0),
      totalCount: productStats[0]?.totalCount[0]?.count || 0,
      products: productStats[0]?.products.reduce((acc, p) => {
        acc[p._id] = {
          quantity: p.quantity,
          salesAmount: p.salesAmount,
          count: p.count
        };
        return acc;
      }, {}),
      franchises: mainStats.map(f => ({
        franchise: f._id,
        totalSaleAmount: f.totalSaleAmount,
        totalCount: franchiseCountMap[f._id] || 0,
        productwiseSales: f.productwiseSales
      }))
    };
    res.json(response);
  } catch (error) {
    console.error('::[ERROR] Get sales statistics:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.graphDataStatistics = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;
    const match = {};

    // Find the latest sale date if needed
    let latestDate;
    if (!endDate || !startDate) {
      const latestSale = await Sale.findOne({}).sort({ createdAt: -1 }).select('createdAt');
      if (latestSale) {
        latestDate = latestSale.createdAt;
      }
    }

    // If no endDate, use latest sale date
    if (!endDate && latestDate) {
      endDate = latestDate.toISOString().slice(0, 10);
    }

    // If no startDate, use 6 days before latestDate (7 days total)
    if (!startDate && latestDate) {
      const start = new Date(latestDate);
      start.setUTCDate(start.getUTCDate() - 6);
      startDate = start.toISOString().slice(0, 10);
    }

    if (startDate) {
      match.createdAt = { $gte: new Date(startDate + 'T00:00:00.000Z') };
    }
    if (endDate) {
      if (!match.createdAt) match.createdAt = {};
      match.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    console.log('Filtering sales with createdAt:', match.createdAt);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    const results = await Sale.aggregate(pipeline);
    const data = results.map(r => ({ 
      date: r._id, 
      totalAmount: r.totalAmount,
      count: r.count 
    }));
    res.json(data);
  } catch (error) {
    console.error('::[ERROR] Get graph data statistics:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getSalesmanStatistics = async (req, res) => {
  try {
    const { startDate, endDate, retailerId } = req.query;
    const match = { addedBy: req.salesman._id };
    if (retailerId) {
      match.retailer = retailerId;
    }
    
    if (startDate && endDate) {
      if (startDate === endDate) {
        // If both dates are the same, add 24 hours to endDate
        const start = new Date(startDate + 'T00:00:00.000Z');
        const end = new Date(startDate + 'T23:59:59.999Z');
        console.log("date duration", start, "-", end);
        match.createdAt = { $gte: start, $lte: end };
      } else {
        // Different dates
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }
    } else if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    console.log('Filtering sales with createdAt:', match.createdAt);

    // Product-wise stats and total sales count/amount (no retailer breakdown)
    const productPipeline = [
      { $match: match },
      { $project: {
          amount: 1,
          productsArray: { $objectToArray: '$products' }
        }
      },
      { $unwind: '$productsArray' },
      { $group: {
          _id: '$productsArray.k',
          quantity: { $sum: '$productsArray.v.quantity' },
          salesAmount: { $sum: '$productsArray.v.total' },
          count: { $sum: 1 }
        }
      }
    ];

    const productStats = await Sale.aggregate(productPipeline);

    // Total sales amount and count
    const totalStats = await Sale.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalAmount: totalStats[0]?.totalAmount || 0,
      totalCount: totalStats[0]?.totalCount || 0,
      products: productStats.reduce((acc, p) => {
        acc[p._id] = {
          quantity: p.quantity,
          salesAmount: p.salesAmount,
          count: p.count
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('::[ERROR] Get salesman statistics:', error);
    res.status(500).json({ message: error.message });
  }
}; 