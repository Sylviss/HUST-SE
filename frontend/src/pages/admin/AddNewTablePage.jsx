// ./frontend/src/pages/admin/AddNewTablePage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import TableForm from '../../components/forms/TableForm';
import { createTable, clearTableSubmitError } from '../../store/slices/tableSlice';

function AddNewTablePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isSubmitting, submitError } = useSelector((state) => state.tables);

  useEffect(() => {
    return () => { dispatch(clearTableSubmitError()); };
  }, [dispatch]);

  const handleCreateTable = async (data) => {
    const resultAction = await dispatch(createTable(data));
    if (createTable.fulfilled.match(resultAction)) {
      navigate('/admin/tables');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">Add New Table</h1>
      <TableForm
        onSubmit={handleCreateTable}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}
export default AddNewTablePage;