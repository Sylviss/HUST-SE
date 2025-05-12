// ./frontend/src/pages/admin/AddNewMenuItemPage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import MenuItemForm from '../../components/forms/MenuItemForm';
import { createMenuItem, clearMenuItemSubmitError } from '../../store/slices/menuItemSlice';

function AddNewMenuItemPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isSubmitting, submitError } = useSelector((state) => state.menuItems);

  useEffect(() => {
    return () => { // Cleanup on unmount
      dispatch(clearMenuItemSubmitError());
    };
  }, [dispatch]);

  const handleCreateItem = async (data) => {
    // Price is already a number from react-hook-form with Zod
    const resultAction = await dispatch(createMenuItem(data));
    if (createMenuItem.fulfilled.match(resultAction)) {
      navigate('/menu'); // Or to an admin menu list page
    }
    // Error is handled by the form via submitError prop
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">Add New Menu Item</h1>
      <MenuItemForm
        onSubmit={handleCreateItem}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}

export default AddNewMenuItemPage;