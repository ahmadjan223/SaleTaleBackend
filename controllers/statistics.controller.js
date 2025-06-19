const Sale = require('../models/sale.model');

exports.getSalesStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) {
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
      // Convert products map to array
      {
        $project: {
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
            franchise: '$franchiseName'
          },
          productQuantity: { $sum: '$productsArray.v.quantity' },
          productSales: { $sum: '$productsArray.v.total' },
          franchiseSales: { $sum: '$amount' }
        }
      },
      // Group for franchise-wise stats
      {
        $group: {
          _id: '$_id.franchise',
          totalSaleAmount: { $sum: '$franchiseSales' },
          productwiseSales: {
            $push: {
              product: '$_id.product',
              quantity: '$productQuantity',
              salesAmount: '$productSales'
            }
          }
        }
      },
      // Group for global stats
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalSaleAmount' },
          franchises: {
            $push: {
              franchise: '$_id',
              totalSaleAmount: '$totalSaleAmount',
              productwiseSales: '$productwiseSales'
            }
          }
        }
      }
    ];

    // For global product stats
    const productPipeline = [
      { $match: match },
      {
        $project: {
          productsArray: { $objectToArray: '$products' }
        }
      },
      { $unwind: '$productsArray' },
      {
        $group: {
          _id: '$productsArray.k',
          quantity: { $sum: '$productsArray.v.quantity' },
          salesAmount: { $sum: '$productsArray.v.total' }
        }
      }
    ];

    const [mainStats, productStats] = await Promise.all([
      Sale.aggregate(pipeline),
      Sale.aggregate(productPipeline)
    ]);

    const response = {
      totalAmount: mainStats[0]?.totalAmount || 0,
      products: productStats.reduce((acc, p) => {
        acc[p._id] = { quantity: p.quantity, salesAmount: p.salesAmount };
        return acc;
      }, {}),
      franchises: mainStats[0]?.franchises || []
    };
    res.json(response);
  } catch (error) {
    console.error('::[ERROR] Get sales statistics:', error);
    res.status(500).json({ message: error.message });
  }
}; 