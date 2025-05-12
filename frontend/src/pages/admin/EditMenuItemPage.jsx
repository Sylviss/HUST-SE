// ./frontend/src/pages/admin/EditMenuItemPage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import MenuItemForm from '../../components/forms/MenuItemForm';
import { updateMenuItem, fetchMenuItems, clearMenuItemSubmitError } from '../../store/slices/menuItemSlice';

function EditMenuItemPage() {
  const { itemId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    items: menuItems,
    isLoading: isLoadingList,
    isSubmitting,
    submitError
  } = useSelector((state) => state.menuItems);

  // Find the item to edit, or fetch if not available
  const menuItemToEdit = menuItems.find(item => item.id === itemId);

  useEffect(() => {
    if (!menuItemToEdit && !isLoadingList) { // If items are loaded but target not found, or list not loaded
      dispatch(fetchMenuItems({ allForManager: true })); // Fetch all items if not present
    }
    return () => { // Cleanup on unmount
      dispatch(clearMenuItemSubmitError());
    };
  }, [dispatch, itemId, menuItemToEdit, isLoadingList]);

  const handleUpdateItem = async (data) => {
    const resultAction = await dispatch(updateMenuItem({ itemId, menuItemData: data }));
    if (updateMenuItem.fulfilled.match(resultAction)) {
      navigate('/menu'); // Or to an admin menu list page
    }
  };

  if (isLoadingList && !menuItemToEdit) {
    return <p className="text-center text-lg">Loading menu item details...</p>;
  }

  if (!menuItemToEdit) {
    return <p className="text-center text-lg text-red-500">Menu item not found.</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">Edit Menu Item: {menuItemToEdit.name}</h1>
      <MenuItemForm
        onSubmit={handleUpdateItem}
        initialData={menuItemToEdit}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}

export default EditMenuItemPage;