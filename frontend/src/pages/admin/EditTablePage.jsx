// ./frontend/src/pages/admin/EditTablePage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import TableForm from '../../components/forms/TableForm';
import { updateTable, fetchTables, clearTableSubmitError } from '../../store/slices/tableSlice';

function EditTablePage() {
  const { tableId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: tables, isLoading: isLoadingList, isSubmitting, submitError } = useSelector((state) => state.tables);
  const tableToEdit = tables.find(table => table.id === tableId);

  useEffect(() => {
    if (!tableToEdit && !isLoadingList) {
      dispatch(fetchTables());
    }
    return () => { dispatch(clearTableSubmitError()); };
  }, [dispatch, tableId, tableToEdit, isLoadingList]);

  const handleUpdateTable = async (data) => {
    const resultAction = await dispatch(updateTable({ tableId, tableData: data }));
    if (updateTable.fulfilled.match(resultAction)) {
      navigate('/admin/tables');
    }
  };

  if (isLoadingList && !tableToEdit) return <p>Loading table details...</p>;
  if (!tableToEdit) return <p className="text-red-500">Table not found.</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">Edit Table: {tableToEdit.tableNumber}</h1>
      <TableForm
        onSubmit={handleUpdateTable}
        initialData={tableToEdit}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}
export default EditTablePage;