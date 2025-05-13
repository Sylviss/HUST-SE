// ./frontend/src/pages/admin/StaffManagementPage.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchStaffMembers,
  toggleStaffActiveStatus,
  clearStaffError,
  clearStaffSubmitError
} from '../../store/slices/staffSlice';
import { StaffRole } from '../../utils/constants'; // Your StaffRole enum

function StaffManagementPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { members: staffList, isLoading, error, isSubmitting, submitError } = useSelector((state) => state.staff);
  const { staff: currentUserManager } = useSelector((state) => state.auth);


  useEffect(() => {
    dispatch(fetchStaffMembers());
    return () => {
        dispatch(clearStaffError());
        dispatch(clearStaffSubmitError());
    }
  }, [dispatch]);

  const handleToggleActive = (staffMember) => {
    if (staffMember.id === currentUserManager.id && staffMember.isActive) {
        alert("You cannot deactivate your own account.");
        return;
    }
    const newStatus = !staffMember.isActive;
    const action = newStatus ? "activate" : "deactivate";
    if (window.confirm(`Are you sure you want to ${action} ${staffMember.name}?`)) {
      dispatch(toggleStaffActiveStatus({ staffId: staffMember.id, isActive: newStatus }));
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Staff Account Management</h1>
        <button
          onClick={() => navigate('/admin/staff/new')}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
          disabled={isSubmitting}
        >
          Add New Staff
        </button>
      </div>

      {isLoading && <p>Loading staff members...</p>}
      {error && <p className="text-red-500">Error fetching staff: {error}</p>}
      {submitError && <p className="text-red-500 mt-2">Operation Error: {submitError}</p>}

      {!isLoading && !error && staffList.length === 0 && <p>No staff members found.</p>}

      {!isLoading && !error && staffList.length > 0 && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {staffList.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{member.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{member.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{member.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.isActive ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'
                    }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => navigate(`/admin/staff/edit/${member.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      disabled={isSubmitting}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(member)}
                      className={`${member.isActive ? 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300' : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'}`}
                      disabled={isSubmitting || (member.id === currentUserManager.id && member.isActive)} // Prevent deactivating self
                    >
                      {isSubmitting ? '...' : (member.isActive ? 'Deactivate' : 'Activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default StaffManagementPage;