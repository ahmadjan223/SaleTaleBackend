const Sale = require('../models/sale.model');

exports.getSalesStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    
    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // --- Franchise total sales aggregation ---
    const franchiseTotalsPromise = Sale.aggregate([
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
          totalSaleAmount: { $sum: '$amount' }
        }
      }
    ]);

    // --- Global total sales aggregation ---
    const globalTotalPromise = Sale.aggregate([
      { $match: match },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);

    // --- Product-wise and franchise-wise stats (without totalSaleAmount) ---
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
          productSales: { $sum: '$productsArray.v.total' }
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
          count: { $count: {} }  // Count unique sales containing this product
        }
      },
      // Group for franchise-wise stats
      {
        $group: {
          _id: '$_id.franchise',
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

    // Calculate franchise total counts
    const franchiseCountsPromise = Sale.aggregate([
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

    // Run all in parallel
    const [mainStats, productStats, franchiseCounts, franchiseTotals, globalTotal] = await Promise.all([
      Sale.aggregate(pipeline),
      Sale.aggregate(productPipeline),
      franchiseCountsPromise,
      franchiseTotalsPromise,
      globalTotalPromise
    ]);

    const franchiseCountMap = franchiseCounts.reduce((acc, f) => {
      acc[f._id] = f.count;
      return acc;
    }, {});

    const franchiseTotalMap = franchiseTotals.reduce((acc, f) => {
      acc[f._id] = f.totalSaleAmount;
      return acc;
    }, {});

    const response = {
      totalAmount: globalTotal[0]?.totalAmount || 0,
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
        totalSaleAmount: franchiseTotalMap[f._id] || 0,
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
    if (!startDate || !endDate) {
      // Default: last 7 days, 24h windows
      const latestSale = await Sale.findOne({}).sort({ createdAt: -1 }).select('createdAt');
      const end = latestSale ? new Date(latestSale.createdAt) : new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      startDate = start.toISOString();
      endDate = end.toISOString();
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Fetch all sales in the range
    const sales = await Sale.find({
      createdAt: { $gte: start, $lte: end }
    }).select('amount createdAt');

    // Calculate number of 24h windows
    const MS_PER_WINDOW = 24 * 60 * 60 * 1000;
    const numWindows = Math.ceil((end - start) / MS_PER_WINDOW);
    // Prepare window buckets
    const windows = Array.from({ length: numWindows }, (_, i) => ({
      date: new Date(start.getTime() + i * MS_PER_WINDOW).toISOString(),
      totalAmount: 0,
      count: 0
    }));
    // Aggregate sales into windows
    sales.forEach(sale => {
      const idx = Math.floor((new Date(sale.createdAt) - start) / MS_PER_WINDOW);
      if (idx >= 0 && idx < windows.length) {
        windows[idx].totalAmount += sale.amount;
        windows[idx].count += 1;
      }
    });
    res.json(windows);
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
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
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