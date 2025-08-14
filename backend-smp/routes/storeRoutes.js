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

// Create new item
router.post('/items', async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: item
    });
  } catch (error) {
    console.error('Item creation error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create item',
      error: error.message
    });
  }
});

// Update item
router.put('/items/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: item
    });
  } catch (error) {
    console.error('Item update error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update item',
      error: error.message
    });
  }
});

// Get all transactions with pagination and filtering
router.get('/transactions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      itemId,
      startDate,
      endDate,
      sortBy = 'transactionDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (type && type !== 'all') {
      filter.transactionType = type;
    }
    if (itemId) {
      filter.itemId = itemId;
    }
    if (startDate && endDate) {
      filter.transactionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(filter)
      .populate('itemId', 'itemName category unit')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

// Create new transaction
router.post('/transactions', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      itemId,
      transactionType,
      quantity,
      unitPrice,
      department,
      reason,
      remarks,
      invoiceDetails,
      createdBy
    } = req.body;

    // Get the item
    const item = await Item.findById(itemId).session(session);
    if (!item) {
      throw new Error('Item not found');
    }

    const previousStock = item.currentStock;
    let newStock;

    // Calculate new stock based on transaction type
    switch (transactionType) {
      case 'inward':
        newStock = previousStock + quantity;
        break;
      case 'outward':
        if (previousStock < quantity) {
          throw new Error('Insufficient stock');
        }
        newStock = previousStock - quantity;
        break;
      case 'adjustment':
        newStock = quantity; // Direct stock setting
        break;
      case 'return':
        newStock = previousStock + quantity;
        break;
      default:
        throw new Error('Invalid transaction type');
    }

    // Create transaction
    const transaction = new Transaction({
      itemId,
      transactionType,
      quantity,
      unitPrice: unitPrice || item.unitPrice,
      previousStock,
      newStock,
      department,
      reason,
      remarks,
      invoiceDetails,
      createdBy
    });

    await transaction.save({ session });

    // Update item stock
    item.currentStock = newStock;
    await item.save({ session });

    await session.commitTransaction();

    // Populate item details for response
    await transaction.populate('itemId', 'itemName category unit');

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Transaction creation error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

// Get all requests with pagination and filtering
router.get('/requests', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      department,
      requestedBy,
      sortBy = 'requestDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (department) {
      filter.department = department;
    }
    if (requestedBy) {
      filter.requestedBy = { $regex: requestedBy, $options: 'i' };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await Request.find(filter)
      .populate('items.itemId', 'itemName category unit')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Request.countDocuments(filter);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Requests fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
});

// Create new request
router.post('/requests', async (req, res) => {
  try {
    const request = new Request(req.body);
    await request.save();

    await request.populate('items.itemId', 'itemName category unit');

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      data: request
    });
  } catch (error) {
    console.error('Request creation error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create request',
      error: error.message
    });
  }
});

// Update request status
router.patch('/requests/:id/status', async (req, res) => {
  try {
    const { status, approvedBy, approvalRemarks, items } = req.body;

    const updateData = { 
      status,
      approvalDate: new Date()
    };

    if (approvedBy) updateData.approvedBy = approvedBy;
    if (approvalRemarks) updateData.approvalRemarks = approvalRemarks;
    if (items) updateData.items = items;

    const request = await Request.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('items.itemId', 'itemName category unit');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      message: 'Request status updated successfully',
      data: request
    });
  } catch (error) {
    console.error('Request status update error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update request status',
      error: error.message
    });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Item.distinct('category', { status: 'active' });
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

export default router;
