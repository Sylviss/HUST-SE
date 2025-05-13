// ./backend/src/controllers/reportController.js
import * as reportService from '../services/reportService.js';

export const getRevenueReportHandler = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate query parameters are required.' });
    }
    const report = await reportService.getRevenueReport(startDate, endDate);
    res.status(200).json(report);
  } catch (error) {
    if (error.message.includes('required')) {
        return res.status(400).json({message: error.message});
    }
    next(error);
  }
};

export const getPopularItemsReportHandler = async (req, res, next) => {
  try {
    const { startDate, endDate, limit } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate query parameters are required.' });
    }
    const report = await reportService.getPopularItemsReport(startDate, endDate, limit ? parseInt(limit) : undefined);
    res.status(200).json(report);
  } catch (error) {
    if (error.message.includes('required')) {
        return res.status(400).json({message: error.message});
    }
    next(error);
  }
};