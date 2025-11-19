import express from 'express';
import { Item, Transaction, Request } from '../models/Store.js';
import mongoose from 'mongoose';

const router = express.Router();

// Dashboard endpoint
router.get('/dashboard', async (req, res) => {
  try {
    // Get total items
    const totalItems = await Item.countDocuments({ status: 'active' });
    
    // Get total transactions this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalTransactions = await Transaction.countDocuments({
      transactionDate: { $gte: startOfMonth }
    });
    
    // Get low stock items
    const lowStockItems = await Item.countDocuments({
      $expr: { $lte: ['$currentStock', '$reorderLevel'] },
      status: 'active'
    });
    
    // Get pending requests
    const pendingRequests = await Request.countDocuments({ status: 'pending' });
    
    // Get total value (sum of current stock * unit price)
    const totalValueResult = await Item.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, totalValue: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } } } }
    ]);
    const totalValue = totalValueResult.length > 0 ? totalValueResult[0].totalValue : 0;
    
    // Get recent transactions (last 5)
    const recentTransactions = await Transaction.find()
      .populate('itemId', 'itemName category')
      .sort({ transactionDate: -1 })
      .limit(5)
      .select('transactionId transactionType quantity itemId transactionDate createdBy');
    
    // Get category distribution
    const categoryDistribution = await Item.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get monthly transaction trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrends = await Transaction.aggregate([
      { $match: { transactionDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' }
          },
          inward: {
            $sum: {
              $cond: [{ $eq: ['$transactionType', 'inward'] }, '$quantity', 0]
            }
          },
          outward: {
            $sum: {
              $cond: [{ $eq: ['$transactionType', 'outward'] }, '$quantity', 0]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalItems,
        totalTransactions,
        lowStockItems,
        pendingRequests,
        totalValue: Math.round(totalValue * 100) / 100,
        recentTransactions,
        categoryDistribution,
        monthlyTrends
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// Get all items with pagination and filtering
router.get('/items', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status = 'active',
      search,
      sortBy = 'itemName',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = { status };
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await Item.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Item.countDocuments(filter);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Items fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error.message
    });
  }
});

// Get items count
router.get('/items/count', async (req, res) => {
  try {
    const count = await Item.countDocuments({ status: 'active' });
    res.json({ count });
  } catch (error) {
    console.error('Items count error:', error);
    res.status(500).json({ count: 0 });
  }
});

// Get single item by ID
router.get('/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Item fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item',
      error: error.message
    });
  }
});

export default router;
