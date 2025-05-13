// ./frontend/src/components/forms/StaffForm.jsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StaffRole } from '../../utils/constants'; // Your StaffRole enum

const staffSchemaBase = {
  name: z.string().min(2, "Name must be at least 2 characters."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  role: z.nativeEnum(StaffRole),
  isActive: z.boolean().default(true),
};

const createStaffSchema = z.object({
  ...staffSchemaBase,
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().min(6, "Please confirm password."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

const updateStaffSchema = z.object({ ...staffSchemaBase }); // Password update handled separately

function StaffForm({ onSubmit, initialData = {}, isEditMode = false, isSubmitting = false, submitError = null }) {
  const schema = isEditMode ? updateStaffSchema : createStaffSchema;
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    // Set defaultValues directly in useForm.
    // This is the primary way to initialize the form.
    defaultValues: isEditMode && initialData.id ?
      { // For Edit Mode
        name: initialData.name || '',
        username: initialData.username || '',
        role: initialData.role || StaffRole.WAITER,
        isActive: initialData.isActive === undefined ? true : initialData.isActive,
        // Password fields are intentionally not pre-filled for edit
      } :
      { // For Add New Mode
        name: '',
        username: '',
        role: StaffRole.WAITER,
        isActive: true,
        password: '',
        confirmPassword: '',
      },
  });

  useEffect(() => {
    // This useEffect is now *only* for re-populating the form if you are in EDIT MODE
    // and the specific 'initialData' for an existing item changes (e.g., user navigates from editing one staff to another).
    if (isEditMode && initialData && initialData.id) {
      console.log("StaffForm: Resetting for EDIT mode with initialData:", initialData); // DEBUG
      reset({
        name: initialData.name || '',
        username: initialData.username || '', // Username is disabled but good to reset its underlying value
        role: initialData.role || StaffRole.WAITER,
        isActive: initialData.isActive === undefined ? true : initialData.isActive,
        // DO NOT reset password fields here for edit mode
      });
    }
    // NO 'else if (!isEditMode)' for reset. The `defaultValues` in `useForm` handles the "Add New" case.
    // If you specifically need to clear the "Add New" form programmatically (e.g., after successful submission),
    // you would call `reset()` from the onSubmit handler in the parent, or here based on a prop.
  }, [
    isEditMode,
    initialData?.id, // Only depend on the ID for edit mode triggering
    initialData?.name,
    initialData?.username,
    initialData?.role,
    initialData?.isActive,
    reset // reset function from useForm is stable
  ]);


  return (
    // ... Your form JSX as before ...
    // Make sure the 'username' input field is correctly disabled in edit mode:
    // <input id="username" type="text" {...register("username")} disabled={isEditMode} ... />
    // And password fields are only rendered if !isEditMode:
    // {!isEditMode && ( <> ... password fields ... </> )}
    // ...
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
        <input id="name" type="text" {...register("name")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white" />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
        <input id="username" type="text" {...register("username")} disabled={isEditMode}
          className={`mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white ${isEditMode ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}`} />
        {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
      </div>
      {!isEditMode && (
        <>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input id="password" type="password" {...register("password")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white" />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
            <input id="confirmPassword" type="password" {...register("confirmPassword")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white" />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>
        </>
      )}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
        <select id="role" {...register("role")}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white">
          {Object.values(StaffRole).map(roleValue => (
            <option key={roleValue} value={roleValue}>{roleValue}</option>
          ))}
        </select>
        {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
      </div>
      {isEditMode && (
        <div className="flex items-center">
          <input id="isActive" type="checkbox" {...register("isActive")}
            className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-700 focus:ring-offset-gray-800" />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Active Account</label>
        </div>
      )}
      {submitError && <p className="text-sm text-red-600 py-2 px-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded">{submitError}</p>}
      <button type="submit" disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
        {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Staff Member' : 'Add Staff Member')}
      </button>
    </form>
  );
}
export default StaffForm;
