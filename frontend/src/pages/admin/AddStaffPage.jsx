// ./frontend/src/pages/admin/AddStaffPage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import StaffForm from '../../components/forms/StaffForm';
import { createStaffMember, clearStaffSubmitError } from '../../store/slices/staffSlice';

function AddStaffPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isSubmitting, submitError } = useSelector((state) => state.staff);

  useEffect(() => {
    return () => { dispatch(clearStaffSubmitError()); };
  }, [dispatch]);

  const handleCreateStaff = async (data) => {
    // Don't send confirmPassword to backend
    const { confirmPassword, ...staffData } = data;
    const resultAction = await dispatch(createStaffMember(staffData));
    if (createStaffMember.fulfilled.match(resultAction)) {
      navigate('/admin/staff');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Add New Staff Member</h1>
      <StaffForm onSubmit={handleCreateStaff} isSubmitting={isSubmitting} submitError={submitError} />
    </div>
  );
}
export default AddStaffPage;