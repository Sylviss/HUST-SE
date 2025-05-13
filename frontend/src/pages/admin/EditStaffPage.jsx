// ./frontend/src/pages/admin/EditStaffPage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import StaffForm from '../../components/forms/StaffForm';
import { updateStaffMember, fetchStaffMembers, clearStaffSubmitError } from '../../store/slices/staffSlice';

function EditStaffPage() {
  const { staffId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { members, isLoading, isSubmitting, submitError } = useSelector((state) => state.staff);
  const staffToEdit = members.find(mem => mem.id === staffId);

  useEffect(() => {
    if (!staffToEdit && !isLoading) {
      dispatch(fetchStaffMembers());
    }
    return () => { dispatch(clearStaffSubmitError()); };
  }, [dispatch, staffId, staffToEdit, isLoading]);

  const handleUpdateStaff = async (data) => {
    const resultAction = await dispatch(updateStaffMember({ staffId, staffData: data }));
    if (updateStaffMember.fulfilled.match(resultAction)) {
      navigate('/admin/staff');
    }
  };

  if (isLoading && !staffToEdit) return <p>Loading staff details...</p>;
  if (!staffToEdit) return <p className="text-red-500">Staff member not found.</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Staff: {staffToEdit.name}</h1>
      <StaffForm
        onSubmit={handleUpdateStaff}
        initialData={staffToEdit}
        isEditMode={true}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}
export default EditStaffPage;