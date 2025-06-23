const Sale = require('../models/sale.model');

exports.getSalesStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate && endDate && startDate === endDate) {
      // If both dates are the same, filter for the entire day
      const dayStart = new Date(startDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(startDate);
      dayEnd.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: dayStart, $lte: dayEnd };
    } else if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

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
      start.setDate(start.getDate() - 6);
      startDate = start.toISOString().slice(0, 10);
    }

    if (startDate) {
      match.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      if (!match.createdAt) match.createdAt = {};
      match.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

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