// ./backend/src/controllers/billingController.js
import * as billingService from '../services/billingService.js';

export const generateBillHandler = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const staffId = req.staff.id;
    const bill = await billingService.generateBillForSession(sessionId, staffId);
    res.status(200).json(bill);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('No billable orders')) {
      // "No billable orders" might be a 404 if a bill cannot be generated at all,
      // or a 400 if it's considered a bad request to try. Let's stick to 404 for "not found" type issues.
      return res.status(404).json({ message: error.message });
    }
    // NEW: Handle the specific error for unfinished orders
    if (error.message.startsWith('Cannot generate bill. The following orders are not yet SERVED or CANCELLED:')) {
      return res.status(400).json({ message: error.message }); // Bad Request, as the state is invalid for billing
    }
    // Existing checks
    if (error.message.includes('Cannot generate/regenerate bill for a closed session.') ||
        error.message.includes('Bill for this session is already paid')) {
      return res.status(400).json({ message: error.message });
    }
    // Default to next error handler
    next(error);
  }
};

export const getBillByIdHandler = async (req, res, next) => {
  try {
    const bill = await billingService.getBillById(req.params.billId);
    res.status(200).json(bill);
  } catch (error) {
    if (error.message === 'Bill not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const getBillBySessionIdHandler = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const bill = await billingService.getBillBySessionId(sessionId);
        if (!bill) { // If service returns null when no bill exists yet
            return res.status(404).json({ message: 'No bill found for this session yet.' });
        }
        res.status(200).json(bill);
    } catch (error) {
        // if (error.message === 'Bill not found for this session') { // If service throws error
        //     return res.status(404).json({ message: error.message });
        // }
        next(error);
    }
};

export const confirmPaymentHandler = async (req, res, next) => {
  try {
    const { billId } = req.params;
    const staffId = req.staff.id;
    const paymentDetails = req.body; // e.g., { paymentMethod: 'Credit Card' }
    const bill = await billingService.confirmPaymentForBill(billId, paymentDetails, staffId);
    res.status(200).json(bill);
  } catch (error) {
    if (error.message === 'Bill not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('already marked as paid') || error.message.includes('voided bill') || error.message.includes('session must be in BILLED')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};