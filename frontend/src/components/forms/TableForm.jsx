// ./frontend/src/components/forms/TableForm.jsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StaffRole, TableStatusEnum } from '../../utils/constants'; // Create/use constants for enums

// Define Zod schema for validation
const tableSchema = z.object({
  tableNumber: z.string().min(1, { message: "Table number is required" }),
  capacity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number({ invalid_type_error: "Capacity must be a number"}).positive({ message: "Capacity must be a positive integer" })
  ),
  status: z.nativeEnum(TableStatusEnum).default(TableStatusEnum.AVAILABLE),
});

function TableForm({ onSubmit, initialData = {}, isSubmitting = false, submitError = null }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      tableNumber: initialData.tableNumber || '',
      capacity: initialData.capacity || '',
      status: initialData.status || TableStatusEnum.AVAILABLE,
    },
  });

  useEffect(() => {
    // Only reset if initialData represents an actual item being edited (has an ID)
    if (initialData && initialData.id) {
      reset({
        tableNumber: initialData.tableNumber || '',
        capacity: initialData.capacity || '',
        status: initialData.status || TableStatusEnum.AVAILABLE,
      });
    }
    // No 'else if (!initialData.id)' block needed here for reset,
    // as defaultValues in useForm already sets up the initial state for a new form.
    // If the form was empty and initialData changed from {} to another {}, no reset should occur.
  }, [initialData.id, initialData.tableNumber, initialData.capacity, initialData.status, reset]); // More specific dependencies


  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
      <div>
        <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Table Number</label>
        <input
          type="text"
          id="tableNumber"
          {...register("tableNumber")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
          placeholder="e.g., T1, A5, P12"
        />
        {errors.tableNumber && <p className="mt-1 text-xs text-red-500">{errors.tableNumber.message}</p>}
      </div>

      <div>
        <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</label>
        <input
          type="number"
          id="capacity"
          {...register("capacity")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
        />
        {errors.capacity && <p className="mt-1 text-xs text-red-500">{errors.capacity.message}</p>}
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
        <select
          id="status"
          {...register("status")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
        >
          {Object.values(TableStatusEnum).map(statusValue => (
            <option key={statusValue} value={statusValue}>{statusValue}</option>
          ))}
        </select>
        {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status.message}</p>}
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : (initialData.id ? 'Update Table' : 'Add Table')}
      </button>
    </form>
  );
}

export default TableForm;