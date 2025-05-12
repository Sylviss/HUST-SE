// ./backend/src/controllers/billingController.js
import * as billingService from '../services/billingService.js';

export const generateBillHandler = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const staffId = req.staff.id;
    const bill = await billingService.generateBillForSession(sessionId, staffId);
    res.status(200).json(bill); // 200 if updating existing, 201 if creating new might be better
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('No billable orders')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Cannot generate bill') || error.message.includes('already paid')) {
      return res.status(400).json({ message: error.message });
    }
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