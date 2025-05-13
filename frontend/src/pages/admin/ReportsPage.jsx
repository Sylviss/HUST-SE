// ./frontend/src/pages/admin/ReportsPage.jsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchRevenueReport,
  fetchPopularItemsReport,
  clearReportError,
  clearReports
} from '../../store/slices/reportSlice';

function ReportsPage() {
  const dispatch = useDispatch();
  const { revenueReport, popularItemsReport, isLoading, error } = useSelector((state) => state.reports);

  const today = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [popularItemLimit, setPopularItemLimit] = useState(5);

  useEffect(() => {
    // Clear reports when component unmounts or params change before new fetch
    return () => {
        dispatch(clearReports());
    }
  }, [dispatch]);

  const handleFetchRevenue = () => {
    dispatch(clearReports()); // Clear previous before fetching new
    dispatch(fetchRevenueReport({ startDate, endDate }));
  };

  const handleFetchPopularItems = () => {
    dispatch(clearReports()); // Clear previous before fetching new
    dispatch(fetchPopularItemsReport({ startDate, endDate, limit: popularItemLimit }));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Reports</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium">Start Date</label>
            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                   className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium">End Date</label>
            <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                   min={startDate} className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-blue-500">Loading report...</p>}
      {error && <p className="text-red-500 bg-red-100 dark:bg-red-900 p-3 rounded-md">Error: {error}</p>}

      {/* Revenue Report Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Revenue Report</h2>
        <button onClick={handleFetchRevenue} disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 mb-4">
          Generate Revenue Report
        </button>
        {revenueReport && !isLoading && (
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p>Date Range: <span className="font-semibold">{revenueReport.startDate}</span> to <span className="font-semibold">{revenueReport.endDate}</span></p>
            <p>Total Revenue: <span className="font-semibold text-green-600 dark:text-green-400">${parseFloat(revenueReport.totalRevenue).toFixed(2)}</span></p>
            <p>Number of Paid Bills: <span className="font-semibold">{revenueReport.numberOfPaidBills}</span></p>
            <p>Average Bill Value: <span className="font-semibold">${parseFloat(revenueReport.averageBillValue).toFixed(2)}</span></p>
          </div>
        )}
      </div>

      {/* Popular Items Report Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Popular Items Report</h2>
        <div className="flex items-end gap-4 mb-4">
            <div>
                <label htmlFor="popularItemLimit" className="block text-sm font-medium">Top # Items:</label>
                <input type="number" id="popularItemLimit" value={popularItemLimit} min="1" max="20"
                       onChange={(e) => setPopularItemLimit(parseInt(e.target.value))}
                       className="mt-1 w-24 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
            </div>
            <button onClick={handleFetchPopularItems} disabled={isLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50">
            Generate Popular Items
            </button>
        </div>
        {popularItemsReport && popularItemsReport.length > 0 && !isLoading && (
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            {popularItemsReport.map(item => (
              <li key={item.menuItemId} className="p-2 border-b dark:border-gray-700 last:border-b-0">
                <span className="font-semibold">{item.name || 'Unknown Item'}</span> - Sold: {item.totalQuantitySold} times (Current Price: ${parseFloat(item.currentPrice || 0).toFixed(2)})
              </li>
            ))}
          </ul>
        )}
        {popularItemsReport && popularItemsReport.length === 0 && !isLoading && !error && (
            <p>No item sales data for this period or no items sold.</p>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;